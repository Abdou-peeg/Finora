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
      { supplier: { name: { contains: search, mode: "insensitive" } } },
    ];
  }
  const items = await db.purchaseOrder.findMany({
    where,
    include: { supplier: true, items: { include: { product: true } }, purchase: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const g = await requirePermission(req, "bons:create");
  if (g instanceof NextResponse) return g;
  const { tenantId } = g.user;
  const body = await req.json();
  if (!body.supplierId || !Array.isArray(body.items) || body.items.length === 0) {
    return NextResponse.json({ error: "Fournisseur et lignes requis" }, { status: 400 });
  }
  const supplier = await db.supplier.findFirst({ where: { id: body.supplierId, tenantId } });
  if (!supplier) return NextResponse.json({ error: "Fournisseur introuvable" }, { status: 404 });

  let subtotal = 0, taxTotal = 0;
  const lineItems: any[] = [];
  for (const li of body.items) {
    const product = await db.product.findFirst({ where: { id: li.productId, tenantId } });
    if (!product) return NextResponse.json({ error: `Produit ${li.productId} introuvable` }, { status: 400 });
    const qty = Number(li.qty);
    const unitPrice = Number(li.unitPrice);
    const taxRate = li.taxRate !== undefined ? Number(li.taxRate) : Number(product.taxRate);
    const lineHT = round2(qty * unitPrice);
    const lineTax = round2(lineHT * taxRate / 100);
    subtotal = round2(subtotal + lineHT);
    taxTotal = round2(taxTotal + lineTax);
    lineItems.push({
      productId: product.id, qty, unitPrice, taxRate,
      lineTotal: round2(lineHT + lineTax),
    });
  }
  const total = round2(subtotal + taxTotal);
  const year = new Date().getFullYear();
  const count = await db.purchaseOrder.count({ where: { tenantId, number: { startsWith: `BC-${year}-` } } });
  const number = `BC-${year}-${String(count + 1).padStart(4, "0")}`;

  try {
    const created = await db.purchaseOrder.create({
      data: {
        tenantId, number,
        supplierId: supplier.id, userId: g.user.id,
        date: new Date(),
        expectedDate: body.expectedDate ? new Date(body.expectedDate) : null,
        status: "DRAFT",
        subtotal, taxTotal, total,
        notes: body.notes || null,
        items: { create: lineItems },
      },
      include: { items: true, supplier: true },
    });
    await db.auditLog.create({
      data: {
        tenantId, userId: g.user.id, userName: g.user.name,
        action: "PURCHASE_ORDER_CREATED", entity: "PurchaseOrder", entityId: created.id,
        details: `Bon de commande ${number} créé pour ${supplier.name} — total ${total} FCFA.`,
      },
    });
    void notify({
      tenantId, type: "generic",
      title: "Bon de commande créé",
      message: `${number} — ${supplier.name} — ${total} FCFA`,
      level: "info",
      meta: { purchaseOrderId: created.id, number },
    });
    return NextResponse.json(created);
  } catch (e: any) {
    return NextResponse.json({ error: safeError(e) }, { status: 400 });
  }
}
