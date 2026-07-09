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
  
  const items = await db.salaryLoan.findMany({
    where,
    include: {
      employee: {
        select: { id: true, firstName: true, lastName: true, email: true },
      },
      approvedBy: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const g = await requirePermission(req, "rh:create");
  if (g instanceof NextResponse) return g;
  const { tenantId } = g.user;
  const body = await req.json();
  try {
    const created = await db.salaryLoan.create({
      data: {
        tenantId,
        employeeId: body.employeeId,
        amount: Number(body.amount),
        interestRate: body.interestRate ? Number(body.interestRate) : 0,
        repaymentDate: body.repaymentDate ? new Date(body.repaymentDate) : null,
        monthlyDeduction: body.monthlyDeduction ? Number(body.monthlyDeduction) : null,
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
        entity: "SalaryLoan",
        entityId: created.id,
        details: `Prêt sur salaire créé pour ${created.employee.firstName} ${created.employee.lastName} : ${created.amount} XOF.`,
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
  const existing = await db.salaryLoan.findFirst({ where: { id, tenantId } });
  if (!existing) return NextResponse.json({ error: "Prêt introuvable" }, { status: 404 });
  
  const updateData: any = { ...data };
  if (data.amount !== undefined) updateData.amount = Number(data.amount);
  if (data.interestRate !== undefined) updateData.interestRate = Number(data.interestRate);
  if (data.monthlyDeduction !== undefined) updateData.monthlyDeduction = data.monthlyDeduction ? Number(data.monthlyDeduction) : null;
  if (data.repaymentDate !== undefined) updateData.repaymentDate = data.repaymentDate ? new Date(data.repaymentDate) : null;
  
  const updated = await db.salaryLoan.update({
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
      entity: "SalaryLoan",
      entityId: id,
      details: `Prêt sur salaire modifié : statut ${updated.status}.`,
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
  const existing = await db.salaryLoan.findFirst({ where: { id, tenantId } });
  if (!existing) return NextResponse.json({ error: "Prêt introuvable" }, { status: 404 });
  await db.salaryLoan.delete({ where: { id } });
  await db.auditLog.create({
    data: {
      tenantId,
      userId: g.user.id,
      userName: g.user.name,
      action: "DELETE",
      entity: "SalaryLoan",
      entityId: id,
      details: `Prêt sur salaire supprimé.`,
    },
  });
  return NextResponse.json({ ok: true });
}
