import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/guard";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  const g = await requirePermission(req, "produits:view");
  if (g instanceof NextResponse) return g;
  const { tenantId } = g.user;
  const url = new URL(req.url);
  const search = url.searchParams.get("search") || "";
  const where: any = { tenantId };
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { sku: { contains: search } },
      { category: { contains: search } },
    ];
  }
  const items = await db.product.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const g = await requirePermission(req, "produits:create");
  if (g instanceof NextResponse) return g;
  const { tenantId } = g.user;
  const body = await req.json();
  try {
    const created = await db.product.create({
      data: {
        tenantId,
        sku: body.sku,
        name: body.name,
        description: body.description || null,
        category: body.category || null,
        unit: body.unit || "pièce",
        salePrice: Number(body.salePrice),
        costPrice: Number(body.costPrice),
        taxRate: Number(body.taxRate ?? 20),
        stockQty: Number(body.stockQty ?? 0),
        minStock: Number(body.minStock ?? 0),
      },
    });
    await db.auditLog.create({
      data: {
        tenantId,
        userId: g.user.id,
        userName: g.user.name,
        action: "CREATE",
        entity: "Product",
        entityId: created.id,
        details: `Produit ${created.sku} - ${created.name} créé.`,
      },
    });
    return NextResponse.json(created);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}

export async function PATCH(req: Request) {
  const g = await requirePermission(req, "produits:update");
  if (g instanceof NextResponse) return g;
  const { tenantId } = g.user;
  const body = await req.json();
  const { id, ...data } = body;
  const existing = await db.product.findFirst({ where: { id, tenantId } });
  if (!existing) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  const updated = await db.product.update({
    where: { id },
    data: {
      ...data,
      salePrice: data.salePrice !== undefined ? Number(data.salePrice) : undefined,
      costPrice: data.costPrice !== undefined ? Number(data.costPrice) : undefined,
      taxRate: data.taxRate !== undefined ? Number(data.taxRate) : undefined,
      stockQty: data.stockQty !== undefined ? Number(data.stockQty) : undefined,
      minStock: data.minStock !== undefined ? Number(data.minStock) : undefined,
    },
  });
  await db.auditLog.create({
    data: {
      tenantId,
      userId: g.user.id,
      userName: g.user.name,
      action: "UPDATE",
      entity: "Product",
      entityId: id,
      details: `Produit ${updated.sku} modifié.`,
    },
  });
  return NextResponse.json(updated);
}

export async function DELETE(req: Request) {
  const g = await requirePermission(req, "produits:delete");
  if (g instanceof NextResponse) return g;
  const { tenantId } = g.user;
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id requis" }, { status: 400 });
  const existing = await db.product.findFirst({ where: { id, tenantId } });
  if (!existing) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  await db.product.delete({ where: { id } });
  await db.auditLog.create({
    data: {
      tenantId,
      userId: g.user.id,
      userName: g.user.name,
      action: "DELETE",
      entity: "Product",
      entityId: id,
      details: `Produit ${existing.sku} supprimé.`,
    },
  });
  return NextResponse.json({ ok: true });
}
