import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/guard";
import { db } from "@/lib/db";
import { safeError } from "@/lib/errors";
import { confirmSale, nextReference } from "@/lib/transactions";
import { notify } from "@/lib/realtime-server";
import type { Customer } from "@prisma/client";

function round2(v: number) {
  return Math.round((v + Number.EPSILON) * 100) / 100;
}

export async function GET(req: Request) {
  const g = await requirePermission(req, "ventes:view");
  if (g instanceof NextResponse) return g;
  const { tenantId } = g.user;
  const url = new URL(req.url);
  const search = url.searchParams.get("search") || "";
  const where: any = { tenantId };
  if (search) {
    where.OR = [
      { reference: { contains: search } },
      { customer: { name: { contains: search } } },
    ];
  }
  const items = await db.sale.findMany({
    where,
    include: {
      customer: true,
      items: { include: { product: true } },
      invoice: true,
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ items });
}

// Create a DRAFT sale (no stock/compta effects yet)
export async function POST(req: Request) {
  const g = await requirePermission(req, "ventes:create");
  if (g instanceof NextResponse) return g;
  const { tenantId } = g.user;
  const body = await req.json();

  if ((!body.customerId || !body.customerId.trim()) && (!body.customerName || !body.customerName.trim())) {
    return NextResponse.json({ error: "Client ou nom du client requis" }, { status: 400 });
  }
  if (!Array.isArray(body.items) || body.items.length === 0) {
    return NextResponse.json({ error: "Lignes de vente requises" }, { status: 400 });
  }

  let customer: Customer | null = null;
  if (body.customerId) {
    customer = await db.customer.findFirst({ where: { id: body.customerId, tenantId } });
    if (!customer) return NextResponse.json({ error: "Client introuvable" }, { status: 404 });
  } else {
    const customerName = body.customerName.trim();
    // The POS reuses one shared walk-in customer instead of creating a
    // duplicate "Comptant" record for every sale.
    if (body.posDefaultCustomer && customerName.toLocaleLowerCase() === "comptant") {
      customer = await db.customer.findFirst({
        where: { tenantId, name: { equals: "Comptant", mode: "insensitive" } },
      });
    }
    if (!customer) {
      const count = await db.customer.count({ where: { tenantId } });
      customer = await db.customer.create({
        data: {
          tenantId,
          code: `C-${String(count + 1).padStart(3, "0")}`,
          name: body.customerName.trim(),
        },
      });
      await db.auditLog.create({
        data: {
          tenantId,
          userId: g.user.id,
          userName: g.user.name,
          action: "CREATE",
          entity: "Customer",
          entityId: customer.id,
          details: `Client ${customer.code} - ${customer.name} créé automatiquement pour la vente.`,
        },
      });
    }
  }

  // Compute totals
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
  const reference = await nextReference(tenantId, "VTE", db.sale);
  if (!customer) return NextResponse.json({ error: "Client introuvable" }, { status: 400 });

  try {
    const created = await db.sale.create({
      data: {
        tenantId,
        reference,
        customerId: customer.id,
        userId: g.user.id,
        status: "DRAFT",
        subtotal,
        taxTotal,
        total,
        notes: body.notes || null,
        items: { create: lineItems },
      },
      include: { items: true, customer: true },
    });

    await db.auditLog.create({
      data: {
        tenantId, userId: g.user.id, userName: g.user.name,
        action: "CREATE", entity: "Sale", entityId: created.id,
        details: `Vente brouillon ${reference} créée pour ${customer.name} — total ${total}.`,
      },
    });

    void notify({
      tenantId,
      type: "sale.created",
      title: "Vente créée (brouillon)",
      message: `${reference} — ${customer.name} — ${total} EUR`,
      level: "info",
      meta: { saleId: created.id, reference },
    });

    // Auto-confirm if requested
    if (body.confirm) {
      await confirmSale(created.id, g.user);
      return NextResponse.json(
        await db.sale.findUnique({
          where: { id: created.id },
          include: { items: { include: { product: true } }, customer: true, invoice: true },
        })
      );
    }
    return NextResponse.json(created);
  } catch (e: any) {
    return NextResponse.json({ error: safeError(e) }, { status: 400 });
  }
}
