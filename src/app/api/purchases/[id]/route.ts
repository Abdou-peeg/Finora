import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/guard";
import { db } from "@/lib/db";
import { safeError } from "@/lib/errors";
import { confirmPurchase, generateInvoiceFromPurchase } from "@/lib/transactions";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const g = await requirePermission(req, "achats:update");
  if (g instanceof NextResponse) return g;
  const { tenantId } = g.user;
  const body = await req.json();
  const { action } = body;
  const purchase = await db.purchase.findFirst({ where: { id, tenantId }, include: { tenant: true } });
  if (!purchase) return NextResponse.json({ error: "Achat introuvable" }, { status: 404 });

  try {
    if (action === "confirm") {
      const updated = await confirmPurchase(id, g.user);
      return NextResponse.json(updated);
    }
    if (action === "cancel") {
      const updated = await db.purchase.update({ where: { id }, data: { status: "CANCELLED" } });
      await db.auditLog.create({
        data: {
          tenantId, userId: g.user.id, userName: g.user.name,
          action: "PURCHASE_CANCELLED", entity: "Purchase", entityId: id,
          details: `Achat ${purchase.reference} annulée.`,
        },
      });
      return NextResponse.json(updated);
    }
    if (action === "invoice") {
      const inv = await generateInvoiceFromPurchase(id, g.user);
      return NextResponse.json(inv);
    }
    return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: safeError(e) }, { status: 400 });
  }
}
