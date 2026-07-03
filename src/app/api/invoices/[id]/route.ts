import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/guard";
import { db } from "@/lib/db";
import { payInvoice } from "@/lib/transactions";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const g = await requirePermission(req, "facturation:view");
  if (g instanceof NextResponse) return g;
  const { tenantId } = g.user;
  const inv = await db.invoice.findFirst({
    where: { id, tenantId },
    include: { sale: { include: { items: { include: { product: true } }, customer: true } }, purchase: { include: { items: { include: { product: true } }, supplier: true } } },
  });
  if (!inv) return NextResponse.json({ error: "Facture introuvable" }, { status: 404 });
  return NextResponse.json(inv);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const g = await requirePermission(req, "facturation:update");
  if (g instanceof NextResponse) return g;
  const { tenantId } = g.user;
  const body = await req.json();
  const inv = await db.invoice.findFirst({ where: { id, tenantId } });
  if (!inv) return NextResponse.json({ error: "Facture introuvable" }, { status: 404 });

  try {
    if (body.action === "pay") {
      const amount = Number(body.amount);
      if (!amount || amount <= 0) return NextResponse.json({ error: "Montant invalide" }, { status: 400 });
      const updated = await payInvoice(id, amount, g.user);
      return NextResponse.json(updated);
    }
    if (body.action === "cancel") {
      const updated = await db.invoice.update({ where: { id }, data: { status: "CANCELLED" } });
      await db.auditLog.create({
        data: {
          tenantId, userId: g.user.id, userName: g.user.name,
          action: "INVOICE_CANCELLED", entity: "Invoice", entityId: id,
          details: `Facture ${inv.number} annulée.`,
        },
      });
      return NextResponse.json(updated);
    }
    return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
