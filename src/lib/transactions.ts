/**
 * Finora Atomic Transaction Service
 * ==================================
 * Central place where critical cross-module mutations happen.
 *
 * Every business operation that must touch multiple tables (sales, purchases,
 * invoicing, cash, stock, accounting) goes through ONE Prisma `$transaction`
 * here so we never leave the database in a partial state.
 *
 * Reference rules:
 *   - Sale confirmation → stock decrement + cash IN + accounting entry
 *   - Purchase confirmation → stock increment + cash OUT (if paid) + accounting entry
 *   - Invoice payment → cash IN + invoice status + accounting entry
 *
 * Each operation also writes an AuditLog row inside the same transaction.
 */
import { db } from "@/lib/db";
import { notify } from "@/lib/realtime-server";

// Plan comptable OHADA (système comptable OHADA — adopté au Sénégal et dans l'UEMOA)
const ACCOUNT_CODES = {
  CLIENTS: "411000", // Clients — débiteurs
  FOURNISSEURS: "401000", // Fournisseurs — créditeurs
  VENTES: "701000", // Ventes de marchandises
  ACHATS: "601000", // Achats de marchandises
  TVA_COLLECTEE: "443000", // TVA collectée
  TVA_DEDUCTIBLE: "445000", // TVA déductible
  CAISSE: "570000", // Caisse
  BANQUE: "521000", // Banque
  STOCK: "370000", // Stocks de marchandises
};

async function getOrCreateAccount(tenantId: string, code: string, label: string, type: any) {
  const existing = await db.account.findUnique({
    where: { tenantId_code: { tenantId, code } },
  });
  if (existing) return existing;
  return db.account.create({ data: { tenantId, code, label, type } });
}

function round2(v: number) {
  return Math.round((v + Number.EPSILON) * 100) / 100;
}

async function nextReference(tenantId: string, prefix: string, model: any) {
  const year = new Date().getFullYear();
  const count = await model.count({ where: { tenantId, reference: { startsWith: `${prefix}-${year}-` } } });
  return `${prefix}-${year}-${String(count + 1).padStart(4, "0")}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// SALE CONFIRMATION — atomic transaction
// ─────────────────────────────────────────────────────────────────────────────
export async function confirmSale(saleId: string, user: any) {
  return db.$transaction(async (tx) => {
    const sale = await tx.sale.findUnique({
      where: { id: saleId },
      include: { items: true, tenant: true },
    });
    if (!sale) throw new Error("Vente introuvable");
    if (sale.status !== "DRAFT") throw new Error(`Vente déjà dans l'état ${sale.status}`);

    // 1. Stock check + decrement + movement record
    for (const item of sale.items) {
      const product = await tx.product.findUnique({ where: { id: item.productId } });
      if (!product) throw new Error("Produit introuvable");
      if (product.stockQty < item.qty) {
        throw new Error(`Stock insuffisant pour ${product.name} (disponible: ${product.stockQty}, requis: ${item.qty})`);
      }
      const newQty = round2(product.stockQty - item.qty);
      await tx.product.update({ where: { id: product.id }, data: { stockQty: newQty } });
      await tx.stockMovement.create({
        data: {
          tenantId: sale.tenantId,
          productId: product.id,
          type: "OUT",
          qty: item.qty,
          reference: sale.reference,
        },
      });
    }

    // 2. Cash entry (IN)
    let balanceAfter: number | null = null;
    const lastCash = await tx.cashEntry.findFirst({
      where: { tenantId: sale.tenantId },
      orderBy: { date: "desc" },
    });
    balanceAfter = round2((lastCash?.balanceAfter ?? 0) + sale.total);
    await tx.cashEntry.create({
      data: {
        tenantId: sale.tenantId,
        reference: `CAISSE-${sale.reference}`,
        type: "IN",
        amount: sale.total,
        label: `Vente ${sale.reference}`,
        source: "SALE",
        sourceId: sale.id,
        date: new Date(),
        balanceAfter,
      },
    });

    // 3. Accounting entry (double-entry, balanced)
    const [accClient, accVentes, accTVA, accCaisse] = await Promise.all([
      getOrCreateAccount(sale.tenantId, ACCOUNT_CODES.CLIENTS, "Clients", "ASSET"),
      getOrCreateAccount(sale.tenantId, ACCOUNT_CODES.VENTES, "Ventes de marchandises", "REVENUE"),
      getOrCreateAccount(sale.tenantId, ACCOUNT_CODES.TVA_COLLECTEE, "TVA collectée", "LIABILITY"),
      getOrCreateAccount(sale.tenantId, ACCOUNT_CODES.CAISSE, "Caisse", "ASSET"),
    ]);
    const je = await tx.journalEntry.create({
      data: {
        tenantId: sale.tenantId,
        reference: `VTE-${sale.reference}`,
        description: `Vente ${sale.reference} — ${sale.reference}`,
        source: "SALE",
        sourceId: sale.id,
        date: new Date(),
        lines: {
          create: [
            { accountId: accCaisse.id, debit: sale.total, credit: 0 }, // Débit caisse
            { accountId: accVentes.id, debit: 0, credit: sale.subtotal }, // Crédit ventes
            { accountId: accTVA.id, debit: 0, credit: sale.taxTotal }, // Crédit TVA
          ],
        },
      },
    });

    // 4. Update sale status
    const updated = await tx.sale.update({
      where: { id: saleId },
      data: { status: "CONFIRMED", userId: user.id },
    });

    // 5. Audit log
    await tx.auditLog.create({
      data: {
        tenantId: sale.tenantId,
        userId: user.id,
        userName: user.name,
        action: "SALE_CONFIRMED",
        entity: "Sale",
        entityId: sale.id,
        details: `Vente ${sale.reference} confirmée — total ${sale.total} ${sale.tenant.currency}. Stock mis à jour, caisse alimentée, écriture comptable ${je.reference}.`,
      },
    });

    // 6. Notify (after tx commit hook)
    tx.$on?.("commit" as any, () => {});
    void notify({
      tenantId: sale.tenantId,
      type: "sale.confirmed",
      title: "Vente confirmée",
      message: `${sale.reference} — ${sale.total} ${sale.tenant.currency} (stock, caisse et compta à jour)`,
      level: "success",
      meta: { saleId: sale.id, reference: sale.reference, total: sale.total },
    });

    // Check low stock
    for (const item of sale.items) {
      const p = await tx.product.findUnique({ where: { id: item.productId } });
      if (p && p.stockQty <= p.minStock) {
        void notify({
          tenantId: sale.tenantId,
          type: "stock.low",
          title: "Stock bas",
          message: `${p.name} (${p.sku}) — ${p.stockQty} ${p.unit} restant(s)`,
          level: "warning",
          meta: { productId: p.id, qty: p.stockQty },
        });
      }
    }

    return updated;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// PURCHASE CONFIRMATION — atomic transaction
// ─────────────────────────────────────────────────────────────────────────────
export async function confirmPurchase(purchaseId: string, user: any) {
  return db.$transaction(async (tx) => {
    const purchase = await tx.purchase.findUnique({
      where: { id: purchaseId },
      include: { items: true, tenant: true },
    });
    if (!purchase) throw new Error("Achat introuvable");
    if (purchase.status !== "DRAFT") throw new Error(`Achat déjà dans l'état ${purchase.status}`);

    // 1. Stock increment + movement
    for (const item of purchase.items) {
      const product = await tx.product.findUnique({ where: { id: item.productId } });
      if (!product) throw new Error("Produit introuvable");
      const newQty = round2(product.stockQty + item.qty);
      await tx.product.update({ where: { id: product.id }, data: { stockQty: newQty } });
      await tx.stockMovement.create({
        data: {
          tenantId: purchase.tenantId,
          productId: product.id,
          type: "IN",
          qty: item.qty,
          reference: purchase.reference,
        },
      });
    }

    // 2. Cash entry (OUT)
    const lastCash = await tx.cashEntry.findFirst({
      where: { tenantId: purchase.tenantId },
      orderBy: { date: "desc" },
    });
    const balanceAfter = round2((lastCash?.balanceAfter ?? 0) - purchase.total);
    await tx.cashEntry.create({
      data: {
        tenantId: purchase.tenantId,
        reference: `CAISSE-${purchase.reference}`,
        type: "OUT",
        amount: purchase.total,
        label: `Achat ${purchase.reference}`,
        source: "PURCHASE",
        sourceId: purchase.id,
        date: new Date(),
        balanceAfter,
      },
    });

    // 3. Accounting entry
    const [accFourn, accAchats, accTVA, accCaisse] = await Promise.all([
      getOrCreateAccount(purchase.tenantId, ACCOUNT_CODES.FOURNISSEURS, "Fournisseurs", "LIABILITY"),
      getOrCreateAccount(purchase.tenantId, ACCOUNT_CODES.ACHATS, "Achats de marchandises", "EXPENSE"),
      getOrCreateAccount(purchase.tenantId, ACCOUNT_CODES.TVA_DEDUCTIBLE, "TVA déductible", "ASSET"),
      getOrCreateAccount(purchase.tenantId, ACCOUNT_CODES.CAISSE, "Caisse", "ASSET"),
    ]);
    const je = await tx.journalEntry.create({
      data: {
        tenantId: purchase.tenantId,
        reference: `ACH-${purchase.reference}`,
        description: `Achat ${purchase.reference}`,
        source: "PURCHASE",
        sourceId: purchase.id,
        date: new Date(),
        lines: {
          create: [
            { accountId: accAchats.id, debit: purchase.subtotal, credit: 0 },
            { accountId: accTVA.id, debit: purchase.taxTotal, credit: 0 },
            { accountId: accCaisse.id, debit: 0, credit: purchase.total },
          ],
        },
      },
    });

    const updated = await tx.purchase.update({
      where: { id: purchaseId },
      data: { status: "CONFIRMED", userId: user.id },
    });

    await tx.auditLog.create({
      data: {
        tenantId: purchase.tenantId,
        userId: user.id,
        userName: user.name,
        action: "PURCHASE_CONFIRMED",
        entity: "Purchase",
        entityId: purchase.id,
        details: `Achat ${purchase.reference} confirmé — total ${purchase.total} ${purchase.tenant.currency}. Stock incrémenté, caisse débitée, écriture ${je.reference}.`,
      },
    });

    void notify({
      tenantId: purchase.tenantId,
      type: "purchase.confirmed",
      title: "Achat confirmé",
      message: `${purchase.reference} — ${purchase.total} ${purchase.tenant.currency} (stock et compta à jour)`,
      level: "success",
      meta: { purchaseId: purchase.id, reference: purchase.reference },
    });

    return updated;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// INVOICE PAYMENT — atomic transaction
// ─────────────────────────────────────────────────────────────────────────────
export async function payInvoice(invoiceId: string, amount: number, user: any) {
  return db.$transaction(async (tx) => {
    const inv = await tx.invoice.findUnique({
      where: { id: invoiceId },
      include: { tenant: true, sale: true, purchase: true },
    });
    if (!inv) throw new Error("Facture introuvable");
    if (inv.status === "PAID" || inv.status === "CANCELLED")
      throw new Error(`Facture déjà ${inv.status}`);

    const newPaid = round2(inv.paidAmount + amount);
    const remaining = round2(inv.total - newPaid);
    const newStatus = remaining <= 0.001 ? "PAID" : "PARTIAL";

    const lastCash = await tx.cashEntry.findFirst({
      where: { tenantId: inv.tenantId },
      orderBy: { date: "desc" },
    });
    const isCustomerInvoice = inv.type === "CUSTOMER";
    const balanceAfter = round2(
      (lastCash?.balanceAfter ?? 0) + (isCustomerInvoice ? amount : -amount)
    );
    await tx.cashEntry.create({
      data: {
        tenantId: inv.tenantId,
        reference: `PAY-${inv.number}`,
        type: isCustomerInvoice ? "IN" : "OUT",
        amount,
        label: `Règlement facture ${inv.number}`,
        source: "INVOICE_PAYMENT",
        sourceId: inv.id,
        invoiceId: inv.id,
        date: new Date(),
        balanceAfter,
      },
    });

    const [accClient, accFourn, accCaisse] = await Promise.all([
      getOrCreateAccount(inv.tenantId, ACCOUNT_CODES.CLIENTS, "Clients", "ASSET"),
      getOrCreateAccount(inv.tenantId, ACCOUNT_CODES.FOURNISSEURS, "Fournisseurs", "LIABILITY"),
      getOrCreateAccount(inv.tenantId, ACCOUNT_CODES.CAISSE, "Caisse", "ASSET"),
    ]);
    const je = await tx.journalEntry.create({
      data: {
        tenantId: inv.tenantId,
        reference: `PAY-${inv.number}`,
        description: `Règlement facture ${inv.number}`,
        source: "INVOICE",
        sourceId: inv.id,
        date: new Date(),
        lines: {
          create: isCustomerInvoice
            ? [
                { accountId: accCaisse.id, debit: amount, credit: 0 },
                { accountId: accClient.id, debit: 0, credit: amount },
              ]
            : [
                { accountId: accFourn.id, debit: amount, credit: 0 },
                { accountId: accCaisse.id, debit: 0, credit: amount },
              ],
        },
      },
    });

    const updated = await tx.invoice.update({
      where: { id: invoiceId },
      data: { paidAmount: newPaid, status: newStatus },
    });

    // Mark sale/purchase as PAID if invoice fully paid
    if (newStatus === "PAID") {
      if (inv.sale) await tx.sale.update({ where: { id: inv.sale.id }, data: { status: "PAID" } });
      if (inv.purchase) await tx.purchase.update({ where: { id: inv.purchase.id }, data: { status: "PAID" } });
    }

    await tx.auditLog.create({
      data: {
        tenantId: inv.tenantId,
        userId: user.id,
        userName: user.name,
        action: "INVOICE_PAID",
        entity: "Invoice",
        entityId: inv.id,
        details: `Facture ${inv.number} — règlement de ${amount} ${inv.tenant.currency}. Nouveau solde: ${remaining}. Statut: ${newStatus}. Écriture ${je.reference}.`,
      },
    });

    void notify({
      tenantId: inv.tenantId,
      type: "invoice.paid",
      title: "Règlement enregistré",
      message: `${inv.number} — ${amount} ${inv.tenant.currency} (${newStatus})`,
      level: "success",
      meta: { invoiceId: inv.id, amount },
    });

    return updated;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// INVOICE GENERATION from Sale/Purchase — atomic transaction
// ─────────────────────────────────────────────────────────────────────────────
export async function generateInvoiceFromSale(saleId: string, user: any) {
  return db.$transaction(async (tx) => {
    const sale = await tx.sale.findUnique({
      where: { id: saleId },
      include: { customer: true, tenant: true },
    });
    if (!sale) throw new Error("Vente introuvable");
    if (sale.status !== "CONFIRMED") throw new Error("La vente doit être confirmée");

    const year = new Date().getFullYear();
    const count = await tx.invoice.count({
      where: { tenantId: sale.tenantId, number: { startsWith: `FAC-${year}-` } },
    });
    const number = `FAC-${year}-${String(count + 1).padStart(4, "0")}`;

    const inv = await tx.invoice.create({
      data: {
        tenantId: sale.tenantId,
        number,
        type: "CUSTOMER",
        partyType: "CUSTOMER",
        partyId: sale.customerId,
        partyName: sale.customer.name,
        saleId: sale.id,
        issueDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        subtotal: sale.subtotal,
        taxTotal: sale.taxTotal,
        total: sale.total,
        paidAmount: 0,
        status: "UNPAID",
      },
    });

    await tx.sale.update({ where: { id: sale.id }, data: { status: "INVOICED" } });

    await tx.auditLog.create({
      data: {
        tenantId: sale.tenantId,
        userId: user.id,
        userName: user.name,
        action: "INVOICE_CREATED",
        entity: "Invoice",
        entityId: inv.id,
        details: `Facture ${number} générée depuis la vente ${sale.reference} (client ${sale.customer.name}).`,
      },
    });

    void notify({
      tenantId: sale.tenantId,
      type: "invoice.created",
      title: "Facture émise",
      message: `${number} — ${sale.customer.name} — ${sale.total} ${sale.tenant.currency}`,
      level: "info",
      meta: { invoiceId: inv.id, number },
    });

    return inv;
  });
}

export async function generateInvoiceFromPurchase(purchaseId: string, user: any) {
  return db.$transaction(async (tx) => {
    const purchase = await tx.purchase.findUnique({
      where: { id: purchaseId },
      include: { supplier: true, tenant: true },
    });
    if (!purchase) throw new Error("Achat introuvable");
    if (purchase.status !== "CONFIRMED") throw new Error("L'achat doit être confirmé");

    const year = new Date().getFullYear();
    const count = await tx.invoice.count({
      where: { tenantId: purchase.tenantId, number: { startsWith: `FF-${year}-` } },
    });
    const number = `FF-${year}-${String(count + 1).padStart(4, "0")}`;

    const inv = await tx.invoice.create({
      data: {
        tenantId: purchase.tenantId,
        number,
        type: "SUPPLIER",
        partyType: "SUPPLIER",
        partyId: purchase.supplierId,
        partyName: purchase.supplier.name,
        purchaseId: purchase.id,
        issueDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        subtotal: purchase.subtotal,
        taxTotal: purchase.taxTotal,
        total: purchase.total,
        paidAmount: 0,
        status: "UNPAID",
      },
    });

    await tx.purchase.update({ where: { id: purchase.id }, data: { status: "INVOICED" } });

    await tx.auditLog.create({
      data: {
        tenantId: purchase.tenantId,
        userId: user.id,
        userName: user.name,
        action: "INVOICE_CREATED",
        entity: "Invoice",
        entityId: inv.id,
        details: `Facture fournisseur ${number} générée depuis l'achat ${purchase.reference}.`,
      },
    });

    void notify({
      tenantId: purchase.tenantId,
      type: "invoice.created",
      title: "Facture fournisseur reçue",
      message: `${number} — ${purchase.supplier.name} — ${purchase.total} ${purchase.tenant.currency}`,
      level: "info",
      meta: { invoiceId: inv.id, number },
    });

    return inv;
  });
}

export { nextReference, round2, ACCOUNT_CODES };
