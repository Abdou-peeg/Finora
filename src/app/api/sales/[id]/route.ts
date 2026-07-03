import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/guard";
import { db } from "@/lib/db";
import { confirmSale, generateInvoiceFromSale } from "@/lib/transactions";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const g = await requirePermission(req, "ventes:update");
  if (g instanceof NextResponse) return g;
  const { tenantId } = g.user;
  const body = await req.json();
  const { action } = body;
  const sale = await db.sale.findFirst({ where: { id, tenantId }, include: { tenant: true } });
  if (!sale) return NextResponse.json({ error: "Vente introuvable" }, { status: 404 });

  try {
    if (action === "confirm") {
      const updated = await confirmSale(id, g.user);
      return NextResponse.json(updated);
    }
    if (action === "cancel") {
      const updated = await db.sale.update({ where: { id }, data: { status: "CANCELLED" } });
      await db.auditLog.create({
        data: {
          tenantId, userId: g.user.id, userName: g.user.name,
          action: "SALE_CANCELLED", entity: "Sale", entityId: id,
          details: `Vente ${sale.reference} annulée.`,
        },
      });
      return NextResponse.json(updated);
    }
    if (action === "invoice") {
      const inv = await generateInvoiceFromSale(id, g.user);
      return NextResponse.json(inv);
    }
    return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
