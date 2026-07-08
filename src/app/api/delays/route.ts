import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/guard";
import { db } from "@/lib/db";
import { safeError } from "@/lib/errors";

export async function GET(req: Request) {
  const g = await requirePermission(req, "rh:view");
  if (g instanceof NextResponse) return g;
  const { tenantId } = g.user;
  const url = new URL(req.url);
  const employeeId = url.searchParams.get("employeeId");
  const dateFrom = url.searchParams.get("dateFrom");
  const dateTo = url.searchParams.get("dateTo");
  
  const where: any = { tenantId };
  if (employeeId) where.employeeId = employeeId;
  if (dateFrom || dateTo) {
    where.date = {};
    if (dateFrom) where.date.gte = new Date(dateFrom);
    if (dateTo) where.date.lte = new Date(dateTo);
  }
  
  const items = await db.delay.findMany({
    where,
    include: {
      employee: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
      recordedBy: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: { date: "desc" },
  });
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const g = await requirePermission(req, "rh:create");
  if (g instanceof NextResponse) return g;
  const { tenantId } = g.user;
  const body = await req.json();
  try {
    const created = await db.delay.create({
      data: {
        tenantId,
        employeeId: body.employeeId,
        date: new Date(body.date),
        timeInMinutes: Number(body.timeInMinutes),
        reason: body.reason || null,
        recordedById: body.recordedById || g.user.id,
      },
      include: {
        employee: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        recordedBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });
    await db.auditLog.create({
      data: {
        tenantId,
        userId: g.user.id,
        userName: g.user.name,
        action: "CREATE",
        entity: "Delay",
        entityId: created.id,
        details: `Retard enregistré pour ${created.employee.firstName} ${created.employee.lastName} : ${created.timeInMinutes} minutes.`,
      },
    });
    return NextResponse.json(created);
  } catch (e: any) {
    return NextResponse.json({ error: safeError(e) }, { status: 400 });
  }
}

export async function PATCH(req: Request) {
  const g = await requirePermission(req, "rh:update");
  if (g instanceof NextResponse) return g;
  const { tenantId } = g.user;
  const body = await req.json();
  const { id, ...data } = body;
  const existing = await db.delay.findFirst({ where: { id, tenantId } });
  if (!existing) return NextResponse.json({ error: "Retard introuvable" }, { status: 404 });
  
  const updateData: any = { ...data };
  if (data.date !== undefined) updateData.date = new Date(data.date);
  if (data.timeInMinutes !== undefined) updateData.timeInMinutes = Number(data.timeInMinutes);
  
  const updated = await db.delay.update({
    where: { id },
    data: updateData,
    include: {
      employee: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
      recordedBy: {
        select: { id: true, name: true, email: true },
      },
    },
  });
  await db.auditLog.create({
    data: {
      tenantId,
      userId: g.user.id,
      userName: g.user.name,
      action: "UPDATE",
      entity: "Delay",
      entityId: id,
      details: `Retard modifié : ${updated.timeInMinutes} minutes.`,
    },
  });
  return NextResponse.json(updated);
}

export async function DELETE(req: Request) {
  const g = await requirePermission(req, "rh:delete");
  if (g instanceof NextResponse) return g;
  const { tenantId } = g.user;
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id requis" }, { status: 400 });
  const existing = await db.delay.findFirst({ where: { id, tenantId } });
  if (!existing) return NextResponse.json({ error: "Retard introuvable" }, { status: 404 });
  await db.delay.delete({ where: { id } });
  await db.auditLog.create({
    data: {
      tenantId,
      userId: g.user.id,
      userName: g.user.name,
      action: "DELETE",
      entity: "Delay",
      entityId: id,
      details: `Retard supprimé.`,
    },
  });
  return NextResponse.json({ ok: true });
}
