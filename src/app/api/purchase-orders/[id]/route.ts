import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/guard";
import { db } from "@/lib/db";
import { safeError } from "@/lib/errors";
import { notify } from "@/lib/realtime-server";

function round2(v: number) { return Math.round((v + Number.EPSILON) * 100) / 100; }

// Convert a purchase order into a confirmed PURCHASE (atomic transaction)
async function convertPOToPurchase(poId: string, user: any) {
  return db.$transaction(async (tx) => {
    const po = await tx.purchaseOrder.findUnique({
      where: { id: poId },
      include: { items: { include: { product: true } }, supplier: true, tenant: true },
    });
    if (!po) throw new Error("Bon de commande introuvable");
    if (!["DRAFT", "SENT", "CONFIRMED"].includes(po.status))
      throw new Error(`Bon déjà dans l'état ${po.status}`);

    const year = new Date().getFullYear();
    const count = await tx.purchase.count({ where: { tenantId: po.tenantId, reference: { startsWith: `ACH-${year}-` } } });
    const reference = `ACH-${year}-${String(count + 1).padStart(4, "0")}`;

    const purchase = await tx.purchase.create({
      data: {
        tenantId: po.tenantId,
        reference,
        supplierId: po.supplierId,
        userId: user.id,
        purchaseOrderId: po.id,
        date: new Date(),
        status: "CONFIRMED",
        subtotal: po.subtotal, taxTotal: po.taxTotal, total: po.total,
        items: {
          create: po.items.map((it: any) => ({
            productId: it.productId,
            qty: it.qty,
            unitPrice: it.unitPrice,
            taxRate: it.taxRate,
            lineTotal: it.lineTotal,
          })),
        },
      },
    });

    // Stock increment
    for (const it of po.items) {
      const product = await tx.product.findUnique({ where: { id: it.productId } });
      if (!product) continue;
      const newQty = round2(Number(product.stockQty) + Number(it.qty));
      await tx.product.update({ where: { id: product.id }, data: { stockQty: newQty } });
      await tx.stockMovement.create({
        data: {
          tenantId: po.tenantId,
          productId: product.id,
          type: "IN",
          qty: Number(it.qty),
          reference: purchase.reference,
        },
      });
    }

    // Cash OUT
    const lastCash = await tx.cashEntry.findFirst({ where: { tenantId: po.tenantId }, orderBy: { date: "desc" } });
    const balanceAfter = round2((lastCash?.balanceAfter ? Number(lastCash.balanceAfter) : 0) - Number(po.total));
    await tx.cashEntry.create({
      data: {
        tenantId: po.tenantId,
        reference: `CAISSE-${purchase.reference}`,
        type: "OUT",
        amount: Number(po.total),
        label: `Achat ${purchase.reference} (depuis BC ${po.number})`,
        source: "PURCHASE",
        sourceId: purchase.id,
        date: new Date(),
        balanceAfter,
      },
    });

    // Accounting entry
    async function getOrCreateAccount(code: string, label: string, type: any) {
      const existing = await tx.account.findUnique({ where: { tenantId_code: { tenantId: po.tenantId, code } } });
      if (existing) return existing;
      return tx.account.create({ data: { tenantId: po.tenantId, code, label, type } });
    }
    const [accAchats, accTVA, accCaisse] = await Promise.all([
      getOrCreateAccount("601000", "Achats de marchandises", "EXPENSE"),
      getOrCreateAccount("445000", "TVA déductible", "ASSET"),
      getOrCreateAccount("570000", "Caisse", "ASSET"),
    ]);
    await tx.journalEntry.create({
      data: {
        tenantId: po.tenantId,
        reference: `ACH-${purchase.reference}`,
        description: `Achat ${purchase.reference} (BC ${po.number})`,
        source: "PURCHASE",
        sourceId: purchase.id,
        date: new Date(),
        lines: {
          create: [
            { accountId: accAchats.id, debit: po.subtotal, credit: 0 },
            { accountId: accTVA.id, debit: po.taxTotal, credit: 0 },
            { accountId: accCaisse.id, debit: 0, credit: po.total },
          ],
        },
      },
    });

    await tx.purchaseOrder.update({ where: { id: poId }, data: { status: "RECEIVED" } });
    await tx.auditLog.create({
      data: {
        tenantId: po.tenantId, userId: user.id, userName: user.name,
        action: "PO_CONVERTED_TO_PURCHASE", entity: "PurchaseOrder", entityId: po.id,
        details: `Bon de commande ${po.number} converti en achat ${purchase.reference} — total ${po.total} FCFA. Stock incrémenté, caisse débitée, écriture comptable créée.`,
      },
    });

    void notify({
      tenantId: po.tenantId, type: "generic",
      title: "Bon de commande converti en achat",
      message: `${po.number} → ${purchase.reference} — ${po.total} FCFA`,
      level: "success",
      meta: { purchaseId: purchase.id, reference: purchase.reference },
    });

    return { purchase, purchaseOrder: { ...po, status: "RECEIVED" } };
  });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await requirePermission(req, "bons:update");
  if (g instanceof NextResponse) return g;
  const { tenantId } = g.user;
  const body = await req.json();
  const { id } = await params;
  const po = await db.purchaseOrder.findFirst({ where: { id, tenantId } });
  if (!po) return NextResponse.json({ error: "Bon de commande introuvable" }, { status: 404 });

  try {
    if (body.action === "convert") {
      const result = await convertPOToPurchase(id, g.user);
      return NextResponse.json(result);
    }
    if (body.action === "status") {
      const updated = await db.purchaseOrder.update({ where: { id }, data: { status: body.status } });
      await db.auditLog.create({
        data: {
          tenantId, userId: g.user.id, userName: g.user.name,
          action: "PO_STATUS_CHANGED", entity: "PurchaseOrder", entityId: id,
          details: `Bon de commande ${po.number} → statut ${body.status}.`,
        },
      });
      return NextResponse.json(updated);
    }
    return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: safeError(e) }, { status: 400 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await requirePermission(req, "bons:delete");
  if (g instanceof NextResponse) return g;
  const { tenantId } = g.user;
  const { id } = await params;
  const po = await db.purchaseOrder.findFirst({ where: { id, tenantId } });
  if (!po) return NextResponse.json({ error: "Bon de commande introuvable" }, { status: 404 });
  if (po.status === "RECEIVED") return NextResponse.json({ error: "Bon déjà reçu" }, { status: 400 });
  await db.purchaseOrder.delete({ where: { id } });
  await db.auditLog.create({
    data: {
      tenantId, userId: g.user.id, userName: g.user.name,
      action: "DELETE", entity: "PurchaseOrder", entityId: id,
      details: `Bon de commande ${po.number} supprimé.`,
    },
  });
  return NextResponse.json({ ok: true });
}
