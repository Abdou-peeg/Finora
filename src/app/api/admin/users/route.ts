import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/guard";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function GET(req: Request) {
  const g = await requirePermission(req, "admin:users");
  if (g instanceof NextResponse) return g;
  const { tenantId } = g.user;
  const items = await db.user.findMany({
    where: { tenantId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      active: true,
      createdAt: true,
    },
  });
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const g = await requirePermission(req, "admin:users");
  if (g instanceof NextResponse) return g;
  const { tenantId } = g.user;
  const body = await req.json();
  const passwordHash = await bcrypt.hash(body.password || "Finora2026!", 10);
  try {
    const created = await db.user.create({
      data: {
        tenantId,
        email: body.email.toLowerCase(),
        name: body.name,
        passwordHash,
        role: body.role || "VENDEUR",
        active: body.active ?? true,
      },
      select: { id: true, email: true, name: true, role: true, active: true, createdAt: true },
    });
    await db.auditLog.create({
      data: {
        tenantId, userId: g.user.id, userName: g.user.name,
        action: "USER_CREATED", entity: "User", entityId: created.id,
        details: `Utilisateur ${created.email} créé avec le rôle ${created.role}.`,
      },
    });
    return NextResponse.json(created);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}

export async function PATCH(req: Request) {
  const g = await requirePermission(req, "admin:users");
  if (g instanceof NextResponse) return g;
  const { tenantId } = g.user;
  const body = await req.json();
  const { id, ...data } = body;
  if (data.password) {
    data.passwordHash = await bcrypt.hash(data.password, 10);
    delete data.password;
  }
  const updated = await db.user.update({ where: { id }, data, select: { id: true, email: true, name: true, role: true, active: true } });
  await db.auditLog.create({
    data: {
      tenantId, userId: g.user.id, userName: g.user.name,
      action: "USER_UPDATED", entity: "User", entityId: id,
      details: `Utilisateur ${updated.email} modifié.`,
    },
  });
  return NextResponse.json(updated);
}

export async function DELETE(req: Request) {
  const g = await requirePermission(req, "admin:users");
  if (g instanceof NextResponse) return g;
  const { tenantId } = g.user;
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id requis" }, { status: 400 });
  if (id === g.user.id) return NextResponse.json({ error: "Vous ne pouvez pas vous supprimer" }, { status: 400 });
  await db.user.delete({ where: { id } });
  await db.auditLog.create({
    data: {
      tenantId, userId: g.user.id, userName: g.user.name,
      action: "USER_DELETED", entity: "User", entityId: id,
      details: `Utilisateur supprimé.`,
    },
  });
  return NextResponse.json({ ok: true });
}
