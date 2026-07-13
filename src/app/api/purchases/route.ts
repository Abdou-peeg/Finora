import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/guard";
import { db } from "@/lib/db";
import { safeError } from "@/lib/errors";
import { confirmPurchase, nextReference } from "@/lib/transactions";
import { notify } from "@/lib/realtime-server";

function round2(v: number) {
  return Math.round((v + Number.EPSILON) * 100) / 100;
}

export async function GET(req: Request) {
  const g = await requirePermission(req, "achats:view");
  if (g instanceof NextResponse) return g;
  const { tenantId } = g.user;
  const url = new URL(req.url);
  const search = url.searchParams.get("search") || "";
  const where: any = { tenantId };
  if (search) {
    where.OR = [
      { reference: { contains: search } },
      { supplier: { name: { contains: search } } },
    ];
  }
  const items = await db.purchase.findMany({
    where,
    include: { supplier: true, items: { include: { product: true } }, invoice: true },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const g = await requirePermission(req, "achats:create");
  if (g instanceof NextResponse) return g;
  const { tenantId } = g.user;
  const body = await req.json();
  if ((!body.supplierId || !body.supplierId.trim()) && (!body.supplierName || !body.supplierName.trim())) {
    return NextResponse.json({ error: "Fournisseur ou nom du fournisseur requis" }, { status: 400 });
  }
  if (!Array.isArray(body.items) || body.items.length === 0) {
    return NextResponse.json({ error: "Lignes d'achat requises" }, { status: 400 });
  }

  let supplier = null;
  if (body.supplierId) {
    supplier = await db.supplier.findFirst({ where: { id: body.supplierId, tenantId } });
    if (!supplier) return NextResponse.json({ error: "Fournisseur introuvable" }, { status: 404 });
  } else {
    const count = await db.supplier.count({ where: { tenantId } });
    supplier = await db.supplier.create({
      data: {
        tenantId,
        code: `F-${String(count + 1).padStart(3, "0")}`,
        name: body.supplierName.trim(),
      },
    });
    await db.auditLog.create({
      data: {
        tenantId,
        userId: g.user.id,
        userName: g.user.name,
        action: "CREATE",
        entity: "Supplier",
        entityId: supplier.id,
        details: `Fournisseur ${supplier.code} - ${supplier.name} créé automatiquement pour l'achat.`,
      },
    });
  }

  let subtotal = 0;
  let taxTotal = 0;
  const lineItems: any[] = [];
  for (const li of body.items) {
    const product = await db.product.findFirst({ where: { id: li.productId, tenantId } });
    if (!product) return NextResponse.json({ error: `Produit ${li.productId} introuvable` }, { status: 400 });
    const qty = Number(li.qty);
    if (qty <= 0) return NextResponse.json({ error: "Quantité invalide" }, { status: 400 });
    const unitPrice = Number(li.unitPrice);
    const taxRate = li.taxRate !== undefined ? Number(li.taxRate) : product.taxRate;
    const lineTotal = round2(qty * unitPrice);
    const lineTax = round2(lineTotal * taxRate / 100);
    subtotal = round2(subtotal + lineTotal);
    taxTotal = round2(taxTotal + lineTax);
    lineItems.push({
      productId: product.id,
      qty,
      unitPrice,
      taxRate,
      lineTotal: round2(lineTotal + lineTax),
    });
  }
  const total = round2(subtotal + taxTotal);
  const reference = await nextReference(tenantId, "ACH", db.purchase);

  try {
    const created = await db.purchase.create({
      data: {
        tenantId,
        reference,
        supplierId: supplier.id,
        userId: g.user.id,
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
        action: "CREATE", entity: "Purchase", entityId: created.id,
        details: `Achat brouillon ${reference} créé pour ${supplier.name} — total ${total}.`,
      },
    });

    void notify({
      tenantId,
      type: "purchase.created",
      title: "Achat créé (brouillon)",
      message: `${reference} — ${supplier.name} — ${total} EUR`,
      level: "info",
      meta: { purchaseId: created.id, reference },
    });

    if (body.confirm) {
      const { confirmPurchase } = await import("@/lib/transactions");
      await confirmPurchase(created.id, g.user);
      return NextResponse.json(
        await db.purchase.findUnique({
          where: { id: created.id },
          include: { items: { include: { product: true } }, supplier: true, invoice: true },
        })
      );
    }
    return NextResponse.json(created);
  } catch (e: any) {
    return NextResponse.json({ error: safeError(e) }, { status: 400 });
  }
}
