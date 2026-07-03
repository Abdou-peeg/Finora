import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/guard";
import { db } from "@/lib/db";
import { notify } from "@/lib/realtime-server";

function round2(v: number) { return Math.round((v + Number.EPSILON) * 100) / 100; }

export async function GET(req: Request) {
  const g = await requirePermission(req, "devis:view");
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
  const items = await db.quote.findMany({
    where,
    include: { customer: true, items: { include: { product: true } }, sale: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const g = await requirePermission(req, "devis:create");
  if (g instanceof NextResponse) return g;
  const { tenantId } = g.user;
  const body = await req.json();
  if (!body.customerId || !Array.isArray(body.items) || body.items.length === 0) {
    return NextResponse.json({ error: "Client et lignes requis" }, { status: 400 });
  }
  const customer = await db.customer.findFirst({ where: { id: body.customerId, tenantId } });
  if (!customer) return NextResponse.json({ error: "Client introuvable" }, { status: 404 });

  let subtotal = 0;
  let taxTotal = 0;
  const lineItems: any[] = [];
  for (const li of body.items) {
    const product = await db.product.findFirst({ where: { id: li.productId, tenantId } });
    if (!product) return NextResponse.json({ error: `Produit ${li.productId} introuvable` }, { status: 400 });
    const qty = Number(li.qty);
    if (qty <= 0) return NextResponse.json({ error: "Quantité invalide" }, { status: 400 });
    const unitPrice = li.unitPrice !== undefined ? Number(li.unitPrice) : Number(product.salePrice);
    const taxRate = li.taxRate !== undefined ? Number(li.taxRate) : Number(product.taxRate);
    const lineHT = round2(qty * unitPrice);
    const lineTax = round2(lineHT * taxRate / 100);
    subtotal = round2(subtotal + lineHT);
    taxTotal = round2(taxTotal + lineTax);
    lineItems.push({
      productId: product.id,
      qty,
      unitPrice,
      taxRate,
      lineTotal: round2(lineHT + lineTax),
    });
  }
  const total = round2(subtotal + taxTotal);

  const year = new Date().getFullYear();
  const count = await db.quote.count({ where: { tenantId, number: { startsWith: `DEV-${year}-` } } });
  const number = `DEV-${year}-${String(count + 1).padStart(4, "0")}`;

  try {
    const created = await db.quote.create({
      data: {
        tenantId,
        number,
        customerId: customer.id,
        userId: g.user.id,
        date: new Date(),
        validUntil: body.validUntil ? new Date(body.validUntil) : new Date(Date.now() + 30 * 86400000),
        status: "DRAFT",
        subtotal, taxTotal, total,
        notes: body.notes || null,
        items: { create: lineItems },
      },
      include: { items: true, customer: true },
    });
    await db.auditLog.create({
      data: {
        tenantId, userId: g.user.id, userName: g.user.name,
        action: "QUOTE_CREATED", entity: "Quote", entityId: created.id,
        details: `Devis ${number} créé pour ${customer.name} — total ${total}.`,
      },
    });
    void notify({
      tenantId, type: "generic",
      title: "Devis créé",
      message: `${number} — ${customer.name} — ${total} FCFA`,
      level: "info",
      meta: { quoteId: created.id, number },
    });
    return NextResponse.json(created);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
