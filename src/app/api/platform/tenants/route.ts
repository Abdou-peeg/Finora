import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/guard";
import { db } from "@/lib/db";
import { safeError } from "@/lib/errors";

async function requireSuperAdmin() {
  const session = await getSessionUser();
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  const user = session.user as any;
  if (!user.isSuperAdmin) {
    return NextResponse.json({ error: "Accès réservé" }, { status: 403 });
  }
  return { user };
}

export async function GET(req: Request) {
  const g = await requireSuperAdmin();
  if (g instanceof NextResponse) return g;

  const tenants = await db.tenant.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { users: true, sales: true, invoices: true } },
      users: {
        where: { role: "ADMIN" },
        select: { email: true, name: true },
        take: 1,
      },
    },
  });

  const items = tenants.map((t) => ({
    id: t.id,
    name: t.name,
    legalName: t.legalName,
    currency: t.currency,
    createdAt: t.createdAt,
    subscriptionStatus: t.subscriptionStatus,
    subscriptionExpiresAt: t.subscriptionExpiresAt,
    usersCount: t._count.users,
    salesCount: t._count.sales,
    invoicesCount: t._count.invoices,
    adminEmail: t.users[0]?.email || null,
    adminName: t.users[0]?.name || null,
  }));

  return NextResponse.json({ items });
}

export async function PATCH(req: Request) {
  const g = await requireSuperAdmin();
  if (g instanceof NextResponse) return g;

  const body = await req.json();
  const { id, subscriptionStatus, subscriptionExpiresAt, extendDays } = body;
  if (!id) return NextResponse.json({ error: "id requis" }, { status: 400 });

  const data: any = {};
  if (subscriptionStatus !== undefined) data.subscriptionStatus = subscriptionStatus;

  if (extendDays !== undefined && Number(extendDays) > 0) {
    const current = await db.tenant.findUnique({ where: { id }, select: { subscriptionExpiresAt: true } });
    const base = current?.subscriptionExpiresAt && new Date(current.subscriptionExpiresAt) > new Date()
      ? new Date(current.subscriptionExpiresAt)
      : new Date();
    base.setDate(base.getDate() + Number(extendDays));
    data.subscriptionExpiresAt = base;
  } else if (subscriptionExpiresAt !== undefined) {
    data.subscriptionExpiresAt = subscriptionExpiresAt ? new Date(subscriptionExpiresAt) : null;
  }

  const updated = await db.tenant.update({ where: { id }, data });
  return NextResponse.json(updated);
}