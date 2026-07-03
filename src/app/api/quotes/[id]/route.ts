import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/guard";
import { db } from "@/lib/db";
import { notify } from "@/lib/realtime-server";

function round2(v: number) { return Math.round((v + Number.EPSILON) * 100) / 100; }

// Convert a quote into a confirmed SALE (atomic transaction)
async function convertQuoteToSale(quoteId: string, user: any) {
  return db.$transaction(async (tx) => {
    const quote = await tx.quote.findUnique({
      where: { id: quoteId },
      include: { items: { include: { product: true } }, customer: true, tenant: true },
    });
    if (!quote) throw new Error("Devis introuvable");
    if (!["DRAFT", "SENT", "ACCEPTED"].includes(quote.status))
      throw new Error(`Devis déjà dans l'état ${quote.status}`);

    // Generate sale reference
    const year = new Date().getFullYear();
    const count = await tx.sale.count({ where: { tenantId: quote.tenantId, reference: { startsWith: `VTE-${year}-` } } });
    const reference = `VTE-${year}-${String(count + 1).padStart(4, "0")}`;

    // Build sale items (no DB calls inside the loop — use the products already fetched)
    let subtotal = 0;
    let taxTotal = 0;
    const saleItems: any[] = [];
    const stockUpdates: { product: any; qty: number }[] = [];
    for (const it of quote.items) {
      const product = it.product;
      if (!product) continue;
      const qty = Number(it.qty);
      if (Number(product.stockQty) < qty) {
        throw new Error(`Stock insuffisant pour ${product.name} (disponible: ${product.stockQty})`);
      }
      const unitPrice = Number(it.unitPrice);
      const taxRate = Number(it.taxRate);
      const lineHT = round2(qty * unitPrice);
      const lineTax = round2(lineHT * taxRate / 100);
      subtotal = round2(subtotal + lineHT);
      taxTotal = round2(taxTotal + lineTax);
      saleItems.push({
        productId: it.productId, qty, unitPrice, taxRate,
        lineTotal: round2(lineHT + lineTax),
      });
      stockUpdates.push({ product, qty });
    }
    const total = round2(subtotal + taxTotal);

    const sale = await tx.sale.create({
      data: {
        tenantId: quote.tenantId,
        reference,
        customerId: quote.customerId,
        userId: user.id,
        quoteId: quote.id,
        date: new Date(),
        status: "CONFIRMED",
        subtotal, taxTotal, total,
        items: { create: saleItems },
      },
    });

    // Stock decrement + movements (batched)
    const movementCreates: any[] = [];
    for (const { product, qty } of stockUpdates) {
      const newQty = round2(Number(product.stockQty) - qty);
      await tx.product.update({ where: { id: product.id }, data: { stockQty: newQty } });
      movementCreates.push({
        tenantId: quote.tenantId, productId: product.id, type: "OUT" as const,
        qty, reference: sale.reference,
      });
    }
    if (movementCreates.length > 0) {
      await tx.stockMovement.createMany({ data: movementCreates });
    }

    // Cash entry (IN)
    const lastCash = await tx.cashEntry.findFirst({ where: { tenantId: quote.tenantId }, orderBy: { date: "desc" } });
    const balanceAfter = round2((lastCash?.balanceAfter ? Number(lastCash.balanceAfter) : 0) + total);
    await tx.cashEntry.create({
      data: {
        tenantId: quote.tenantId,
        reference: `CAISSE-${sale.reference}`,
        type: "IN",
        amount: total,
        label: `Vente ${sale.reference} (depuis devis ${quote.number})`,
        source: "SALE",
        sourceId: sale.id,
        date: new Date(),
        balanceAfter,
      },
    });

    // Accounting entry — fetch existing accounts in one query
    const ACCOUNT_CODES = {
      VENTES: "701000", TVA_COLLECTEE: "443000", CAISSE: "570000",
    };
    const existingAccounts = await tx.account.findMany({
      where: { tenantId: quote.tenantId, code: { in: [ACCOUNT_CODES.VENTES, ACCOUNT_CODES.TVA_COLLECTEE, ACCOUNT_CODES.CAISSE] } },
    });
    async function getOrCreateAccount(code: string, label: string, type: any) {
      const existing = existingAccounts.find((a) => a.code === code);
      if (existing) return existing;
      return tx.account.create({ data: { tenantId: quote.tenantId, code, label, type } });
    }
    const [accVentes, accTVA, accCaisse] = await Promise.all([
      getOrCreateAccount(ACCOUNT_CODES.VENTES, "Ventes de marchandises", "REVENUE"),
      getOrCreateAccount(ACCOUNT_CODES.TVA_COLLECTEE, "TVA collectée", "LIABILITY"),
      getOrCreateAccount(ACCOUNT_CODES.CAISSE, "Caisse", "ASSET"),
    ]);
    await tx.journalEntry.create({
      data: {
        tenantId: quote.tenantId,
        reference: `VTE-${sale.reference}`,
        description: `Vente ${sale.reference} (devis ${quote.number})`,
        source: "SALE",
        sourceId: sale.id,
        date: new Date(),
        lines: {
          create: [
            { accountId: accCaisse.id, debit: total, credit: 0 },
            { accountId: accVentes.id, debit: 0, credit: subtotal },
            { accountId: accTVA.id, debit: 0, credit: taxTotal },
          ],
        },
      },
    });

    // Mark quote as converted
    await tx.quote.update({ where: { id: quoteId }, data: { status: "CONVERTED" } });

    // Audit log
    await tx.auditLog.create({
      data: {
        tenantId: quote.tenantId, userId: user.id, userName: user.name,
        action: "QUOTE_CONVERTED_TO_SALE", entity: "Quote", entityId: quote.id,
        details: `Devis ${quote.number} converti en vente ${sale.reference} — total ${total} FCFA. Stock décrémenté, caisse alimentée, écriture comptable créée.`,
      },
    });

    void notify({
      tenantId: quote.tenantId, type: "generic",
      title: "Devis converti en vente",
      message: `${quote.number} → ${sale.reference} — ${total} FCFA (stock + caisse + compta à jour)`,
      level: "success",
      meta: { saleId: sale.id, reference: sale.reference },
    });

    return { sale, quote: { ...quote, status: "CONVERTED" } };
  }, { timeout: 30000, maxWait: 10000 });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await requirePermission(req, "devis:update");
  if (g instanceof NextResponse) return g;
  const { tenantId } = g.user;
  const body = await req.json();
  const { id } = await params;
  const quote = await db.quote.findFirst({ where: { id, tenantId } });
  if (!quote) return NextResponse.json({ error: "Devis introuvable" }, { status: 404 });

  try {
    if (body.action === "convert") {
      const result = await convertQuoteToSale(id, g.user);
      return NextResponse.json(result);
    }
    if (body.action === "status") {
      const updated = await db.quote.update({ where: { id }, data: { status: body.status } });
      await db.auditLog.create({
        data: {
          tenantId, userId: g.user.id, userName: g.user.name,
          action: "QUOTE_STATUS_CHANGED", entity: "Quote", entityId: id,
          details: `Devis ${quote.number} → statut ${body.status}.`,
        },
      });
      return NextResponse.json(updated);
    }
    return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await requirePermission(req, "devis:delete");
  if (g instanceof NextResponse) return g;
  const { tenantId } = g.user;
  const { id } = await params;
  const quote = await db.quote.findFirst({ where: { id, tenantId } });
  if (!quote) return NextResponse.json({ error: "Devis introuvable" }, { status: 404 });
  if (quote.status === "CONVERTED") return NextResponse.json({ error: "Devis déjà converti" }, { status: 400 });
  await db.quote.delete({ where: { id } });
  await db.auditLog.create({
    data: {
      tenantId, userId: g.user.id, userName: g.user.name,
      action: "DELETE", entity: "Quote", entityId: id,
      details: `Devis ${quote.number} supprimé.`,
    },
  });
  return NextResponse.json({ ok: true });
}
