import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/guard";
import { db } from "@/lib/db";
import { safeError } from "@/lib/errors";

export async function GET(req: Request) {
  const g = await requirePermission(req, "clients:view");
  if (g instanceof NextResponse) return g;
  const { tenantId } = g.user;
  const url = new URL(req.url);
  const search = url.searchParams.get("search") || "";
  const where: any = { tenantId };
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { code: { contains: search } },
      { email: { contains: search } },
    ];
  }
  const items = await db.customer.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const g = await requirePermission(req, "clients:create");
  if (g instanceof NextResponse) return g;
  const { tenantId } = g.user;
  const body = await req.json();
  const count = await db.customer.count({ where: { tenantId } });
  const code = body.code || `C-${String(count + 1).padStart(3, "0")}`;
  try {
    const created = await db.customer.create({
      data: {
        tenantId,
        code,
        name: body.name,
        email: body.email || null,
        phone: body.phone || null,
        address: body.address || null,
        city: body.city || null,
        country: body.country || null,
        taxId: body.taxId || null,
        creditLimit: body.creditLimit ? Number(body.creditLimit) : null,
      },
    });
    await db.auditLog.create({
      data: {
        tenantId,
        userId: g.user.id,
        userName: g.user.name,
        action: "CREATE",
        entity: "Customer",
        entityId: created.id,
        details: `Client ${created.code} - ${created.name} créé.`,
      },
    });
    return NextResponse.json(created);
  } catch (e: any) {
    return NextResponse.json({ error: safeError(e) }, { status: 400 });
  }
}

export async function PATCH(req: Request) {
  const g = await requirePermission(req, "clients:update");
  if (g instanceof NextResponse) return g;
  const { tenantId } = g.user;
  const body = await req.json();
  const { id, ...data } = body;
  const existing = await db.customer.findFirst({ where: { id, tenantId } });
  if (!existing) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  const updated = await db.customer.update({
    where: { id },
    data: {
      ...data,
      creditLimit: data.creditLimit !== undefined ? Number(data.creditLimit) : undefined,
    },
  });
  await db.auditLog.create({
    data: {
      tenantId,
      userId: g.user.id,
      userName: g.user.name,
      action: "UPDATE",
      entity: "Customer",
      entityId: id,
      details: `Client ${updated.code} modifié.`,
    },
  });
  return NextResponse.json(updated);
}

export async function DELETE(req: Request) {
  const g = await requirePermission(req, "clients:delete");
  if (g instanceof NextResponse) return g;
  const { tenantId } = g.user;
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id requis" }, { status: 400 });
  const existing = await db.customer.findFirst({ where: { id, tenantId } });
  if (!existing) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  await db.customer.delete({ where: { id } });
  await db.auditLog.create({
    data: {
      tenantId,
      userId: g.user.id,
      userName: g.user.name,
      action: "DELETE",
      entity: "Customer",
      entityId: id,
      details: `Client ${existing.code} supprimé.`,
    },
  });
  return NextResponse.json({ ok: true });
}
