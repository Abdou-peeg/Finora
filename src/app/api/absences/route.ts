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
  const status = url.searchParams.get("status");
  
  const where: any = { tenantId };
  if (employeeId) where.employeeId = employeeId;
  if (status) where.status = status;
  
  const items = await db.absence.findMany({
    where,
    include: {
      employee: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
      approvedBy: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: { startDate: "desc" },
  });
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const g = await requirePermission(req, "rh:create");
  if (g instanceof NextResponse) return g;
  const { tenantId } = g.user;
  const body = await req.json();
  try {
    const created = await db.absence.create({
      data: {
        tenantId,
        employeeId: body.employeeId,
        startDate: new Date(body.startDate),
        endDate: new Date(body.endDate),
        type: body.type,
        reason: body.reason || null,
        status: body.status || "PENDING",
        approvedById: body.approvedById || null,
      },
      include: {
        employee: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        approvedBy: {
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
        entity: "Absence",
        entityId: created.id,
        details: `Absence créée pour ${created.employee.firstName} ${created.employee.lastName} du ${created.startDate.toLocaleDateString("fr-FR")} au ${created.endDate.toLocaleDateString("fr-FR")}.`,
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
  const existing = await db.absence.findFirst({ where: { id, tenantId } });
  if (!existing) return NextResponse.json({ error: "Absence introuvable" }, { status: 404 });
  
  const updateData: any = { ...data };
  if (data.startDate !== undefined) updateData.startDate = new Date(data.startDate);
  if (data.endDate !== undefined) updateData.endDate = new Date(data.endDate);
  
  const updated = await db.absence.update({
    where: { id },
    data: updateData,
    include: {
      employee: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
      approvedBy: {
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
      entity: "Absence",
      entityId: id,
      details: `Absence modifiée : statut ${updated.status}.`,
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
  const existing = await db.absence.findFirst({ where: { id, tenantId } });
  if (!existing) return NextResponse.json({ error: "Absence introuvable" }, { status: 404 });
  await db.absence.delete({ where: { id } });
  await db.auditLog.create({
    data: {
      tenantId,
      userId: g.user.id,
      userName: g.user.name,
      action: "DELETE",
      entity: "Absence",
      entityId: id,
      details: `Absence supprimée.`,
    },
  });
  return NextResponse.json({ ok: true });
}
