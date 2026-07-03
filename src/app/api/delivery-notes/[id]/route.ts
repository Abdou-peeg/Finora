import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/guard";
import { db } from "@/lib/db";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const g = await requirePermission(req, "bons:update");
  if (g instanceof NextResponse) return g;
  const { tenantId } = g.user;
  const body = await req.json();
  const { id } = await params;
  const dn = await db.deliveryNote.findFirst({ where: { id, tenantId } });
  if (!dn) return NextResponse.json({ error: "Bon de livraison introuvable" }, { status: 404 });

  try {
    if (body.action === "status") {
      const updated = await db.deliveryNote.update({ where: { id }, data: { status: body.status, receivedBy: body.receivedBy ?? dn.receivedBy } });
      await db.auditLog.create({
        data: {
          tenantId, userId: g.user.id, userName: g.user.name,
          action: "DN_STATUS_CHANGED", entity: "DeliveryNote", entityId: id,
          details: `Bon de livraison ${dn.number} → statut ${body.status}.`,
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
  const g = await requirePermission(req, "bons:delete");
  if (g instanceof NextResponse) return g;
  const { tenantId } = g.user;
  const { id } = await params;
  const dn = await db.deliveryNote.findFirst({ where: { id, tenantId } });
  if (!dn) return NextResponse.json({ error: "Bon de livraison introuvable" }, { status: 404 });
  await db.deliveryNote.delete({ where: { id } });
  await db.auditLog.create({
    data: {
      tenantId, userId: g.user.id, userName: g.user.name,
      action: "DELETE", entity: "DeliveryNote", entityId: id,
      details: `Bon de livraison ${dn.number} supprimé.`,
    },
  });
  return NextResponse.json({ ok: true });
}
