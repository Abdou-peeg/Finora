import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/guard";
import { db } from "@/lib/db";
import { safeError } from "@/lib/errors";
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
if (action === "delivery-note") {
  if (sale.status !== "CONFIRMED") {
    return NextResponse.json({ error: "La vente doit être confirmée" }, { status: 400 });
  }
  const year = new Date().getFullYear();
  const count = await db.deliveryNote.count({ where: { tenantId, number: { startsWith: `BL-${year}-` } } });
  const number = `BL-${year}-${String(count + 1).padStart(4, "0")}`;
  const saleWithItems = await db.sale.findUnique({ where: { id }, include: { items: true } });
  const dn = await db.deliveryNote.create({
    data: {
      tenantId,
      number,
      customerId: sale.customerId,
      saleId: sale.id,
      userId: g.user.id,
      date: new Date(),
      status: "DRAFT",
      items: {
        create: saleWithItems!.items.map((it) => ({ productId: it.productId, qty: it.qty })),
      },
    },
  });
  await db.auditLog.create({
    data: {
      tenantId, userId: g.user.id, userName: g.user.name,
      action: "DELIVERY_NOTE_CREATED", entity: "DeliveryNote", entityId: dn.id,
      details: `Bon de livraison ${number} créé depuis la vente ${sale.reference}.`,
    },
  });
  return NextResponse.json(dn);
}
    return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: safeError(e) }, { status: 400 });
  }
}
