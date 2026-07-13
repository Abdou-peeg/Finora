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
  const dateFrom = url.searchParams.get("dateFrom");
  const dateTo = url.searchParams.get("dateTo");
  
  const where: any = { tenantId };
  if (employeeId) where.employeeId = employeeId;
  if (status) where.status = status;
  if (dateFrom || dateTo) {
    where.payPeriodStart = {};
    if (dateFrom) where.payPeriodStart.gte = new Date(dateFrom);
    if (dateTo) where.payPeriodStart.lte = new Date(dateTo);
  }
  
  const items = await db.payroll.findMany({
    where,
    include: {
      employee: {
        select: { id: true, firstName: true, lastName: true, email: true, baseSalary: true },
      },
      generatedBy: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: { payPeriodStart: "desc" },
  });
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const g = await requirePermission(req, "rh:create");
  if (g instanceof NextResponse) return g;
  const { tenantId } = g.user;
  const body = await req.json();
  try {
    // Vérifier si une paie existe déjà pour cette période
    const existing = await db.payroll.findFirst({
      where: {
        tenantId,
        employeeId: body.employeeId,
        payPeriodStart: new Date(body.payPeriodStart),
        payPeriodEnd: new Date(body.payPeriodEnd),
      },
    });
    if (existing) {
      return NextResponse.json({ error: "Une paie existe déjà pour cette période" }, { status: 400 });
    }

    const created = await db.payroll.create({
      data: {
        tenantId,
        employeeId: body.employeeId,
        payPeriodStart: new Date(body.payPeriodStart),
        payPeriodEnd: new Date(body.payPeriodEnd),
        baseSalary: Number(body.baseSalary || body.grossSalary),
        grossSalary: Number(body.grossSalary),
        netSalary: Number(body.netSalary),
        absencesDeduction: Number(body.absencesDeduction || 0),
        delaysDeduction: Number(body.delaysDeduction || 0),
        loansDeduction: Number(body.loansDeduction || 0),
        bonuses: Number(body.bonuses || 0),
        taxes: Number(body.taxes || 0),
        status: body.status || "DRAFT",
        generatedById: g.user.id,
      },
      include: {
        employee: {
          select: { id: true, firstName: true, lastName: true, email: true, baseSalary: true },
        },
        generatedBy: {
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
        entity: "Payroll",
        entityId: created.id,
        details: `Fiche de paie créée pour ${created.employee.firstName} ${created.employee.lastName} : ${created.netSalary} XOF net.`,
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
  const existing = await db.payroll.findFirst({ where: { id, tenantId } });
  if (!existing) return NextResponse.json({ error: "Fiche de paie introuvable" }, { status: 404 });
  
  const updateData: any = { ...data };
  if (data.grossSalary !== undefined) updateData.grossSalary = Number(data.grossSalary);
  if (data.netSalary !== undefined) updateData.netSalary = Number(data.netSalary);
  if (data.absencesDeduction !== undefined) updateData.absencesDeduction = Number(data.absencesDeduction);
  if (data.delaysDeduction !== undefined) updateData.delaysDeduction = Number(data.delaysDeduction);
  if (data.loansDeduction !== undefined) updateData.loansDeduction = Number(data.loansDeduction);
  if (data.bonuses !== undefined) updateData.bonuses = Number(data.bonuses);
  if (data.taxes !== undefined) updateData.taxes = Number(data.taxes);
  if (data.payPeriodStart !== undefined) updateData.payPeriodStart = new Date(data.payPeriodStart);
  if (data.payPeriodEnd !== undefined) updateData.payPeriodEnd = new Date(data.payPeriodEnd);
  
  const updated = await db.payroll.update({
    where: { id },
    data: updateData,
    include: {
      employee: {
        select: { id: true, firstName: true, lastName: true, email: true, baseSalary: true },
      },
      generatedBy: {
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
      entity: "Payroll",
      entityId: id,
      details: `Fiche de paie modifiée : statut ${updated.status}.`,
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
  const existing = await db.payroll.findFirst({ where: { id, tenantId } });
  if (!existing) return NextResponse.json({ error: "Fiche de paie introuvable" }, { status: 404 });
  await db.payroll.delete({ where: { id } });
  await db.auditLog.create({
    data: {
      tenantId,
      userId: g.user.id,
      userName: g.user.name,
      action: "DELETE",
      entity: "Payroll",
      entityId: id,
      details: `Fiche de paie supprimée.`,
    },
  });
  return NextResponse.json({ ok: true });
}
