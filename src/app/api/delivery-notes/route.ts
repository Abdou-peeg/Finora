import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/guard";
import { db } from "@/lib/db";
import { safeError } from "@/lib/errors";
import { notify } from "@/lib/realtime-server";

function round2(v: number) { return Math.round((v + Number.EPSILON) * 100) / 100; }

export async function GET(req: Request) {
  const g = await requirePermission(req, "bons:view");
  if (g instanceof NextResponse) return g;
  const { tenantId } = g.user;
  const url = new URL(req.url);
  const search = url.searchParams.get("search") || "";
  const where: any = { tenantId };
  if (search) {
    where.OR = [
      { number: { contains: search, mode: "insensitive" } },
      { customer: { name: { contains: search, mode: "insensitive" } } },
    ];
  }
  const items = await db.deliveryNote.findMany({
    where,
    include: { customer: true, items: { include: { product: true } }, sale: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const g = await requirePermission(req, "bons:create");
  if (g instanceof NextResponse) return g;
  const { tenantId } = g.user;
  const body = await req.json();
  if (!body.customerId || !Array.isArray(body.items) || body.items.length === 0) {
    return NextResponse.json({ error: "Client et lignes requis" }, { status: 400 });
  }
  const customer = await db.customer.findFirst({ where: { id: body.customerId, tenantId } });
  if (!customer) return NextResponse.json({ error: "Client introuvable" }, { status: 404 });

  const year = new Date().getFullYear();
  const count = await db.deliveryNote.count({ where: { tenantId, number: { startsWith: `BL-${year}-` } } });
  const number = `BL-${year}-${String(count + 1).padStart(4, "0")}`;

  const lineItems: any[] = [];
  for (const li of body.items) {
    const product = await db.product.findFirst({ where: { id: li.productId, tenantId } });
    if (!product) return NextResponse.json({ error: `Produit ${li.productId} introuvable` }, { status: 400 });
    const qty = Number(li.qty);
    if (qty <= 0) return NextResponse.json({ error: "Quantité invalide" }, { status: 400 });
    lineItems.push({
      productId: product.id,
      qty,
      description: li.description || null,
    });
  }

  try {
    const created = await db.deliveryNote.create({
      data: {
        tenantId, number,
        customerId: customer.id,
        saleId: body.saleId || null,
        userId: g.user.id,
        date: new Date(),
        status: "DRAFT",
        notes: body.notes || null,
        receivedBy: body.receivedBy || null,
        items: { create: lineItems },
      },
      include: { items: { include: { product: true } }, customer: true },
    });
    await db.auditLog.create({
      data: {
        tenantId, userId: g.user.id, userName: g.user.name,
        action: "DELIVERY_NOTE_CREATED", entity: "DeliveryNote", entityId: created.id,
        details: `Bon de livraison ${number} créé pour ${customer.name}.`,
      },
    });
    void notify({
      tenantId, type: "generic",
      title: "Bon de livraison créé",
      message: `${number} — ${customer.name}`,
      level: "info",
      meta: { deliveryNoteId: created.id, number },
    });
    return NextResponse.json(created);
  } catch (e: any) {
    return NextResponse.json({ error: safeError(e) }, { status: 400 });
  }
}
