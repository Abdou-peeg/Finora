import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/guard";
import { db } from "@/lib/db";
import { safeError } from "@/lib/errors";

export async function GET(req: Request) {
  const g = await requirePermission(req, "rh:view");
  if (g instanceof NextResponse) return g;
  const { tenantId } = g.user;
  const url = new URL(req.url);
  const search = url.searchParams.get("search") || "";
  const where: any = { tenantId };
  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: "insensitive" } },
      { lastName: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { jobTitle: { contains: search, mode: "insensitive" } },
    ];
  }
  const items = await db.employee.findMany({
    where,
    include: {
      user: {
        select: { id: true, email: true, name: true, role: true },
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
    const created = await db.employee.create({
      data: {
        tenantId,
        firstName: body.firstName,
        lastName: body.lastName,
        email: body.email || null,
        phone: body.phone || null,
        address: body.address || null,
        dateOfBirth: body.dateOfBirth ? new Date(body.dateOfBirth) : null,
        hireDate: new Date(body.hireDate),
        jobTitle: body.jobTitle || null,
        department: body.department || null,
        baseSalary: Number(body.baseSalary),
        bankAccount: body.bankAccount || null,
        socialSecurityNum: body.socialSecurityNum || null,
        isActive: body.isActive !== false,
      },
      include: {
        user: {
          select: { id: true, email: true, name: true, role: true },
        },
      },
    });
    await db.auditLog.create({
      data: {
        tenantId,
        userId: g.user.id,
        userName: g.user.name,
        action: "CREATE",
        entity: "Employee",
        entityId: created.id,
        details: `Employé ${created.firstName} ${created.lastName} créé.`,
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
  const existing = await db.employee.findFirst({ where: { id, tenantId } });
  if (!existing) return NextResponse.json({ error: "Employé introuvable" }, { status: 404 });
  
  const updateData: any = {
    ...data,
  };
  if (data.baseSalary !== undefined) updateData.baseSalary = Number(data.baseSalary);
  if (data.dateOfBirth !== undefined) updateData.dateOfBirth = data.dateOfBirth ? new Date(data.dateOfBirth) : null;
  if (data.hireDate !== undefined) updateData.hireDate = new Date(data.hireDate);
  
  const updated = await db.employee.update({
    where: { id },
    data: updateData,
    include: {
      user: {
        select: { id: true, email: true, name: true, role: true },
      },
    },
  });
  await db.auditLog.create({
    data: {
      tenantId,
      userId: g.user.id,
      userName: g.user.name,
      action: "UPDATE",
      entity: "Employee",
      entityId: id,
      details: `Employé ${updated.firstName} ${updated.lastName} modifié.`,
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
  const existing = await db.employee.findFirst({ where: { id, tenantId } });
  if (!existing) return NextResponse.json({ error: "Employé introuvable" }, { status: 404 });
  await db.employee.delete({ where: { id } });
  await db.auditLog.create({
    data: {
      tenantId,
      userId: g.user.id,
      userName: g.user.name,
      action: "DELETE",
      entity: "Employee",
      entityId: id,
      details: `Employé ${existing.firstName} ${existing.lastName} supprimé.`,
    },
  });
  return NextResponse.json({ ok: true });
}
