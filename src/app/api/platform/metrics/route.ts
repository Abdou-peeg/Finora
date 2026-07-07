import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/guard";
import { db } from "@/lib/db";

const PRICE_PER_TENANT = 14900; // FCFA, prix affiché actuellement dans l'app

function n(v: any): number {
  return Number(v ?? 0);
}

async function requireSuperAdmin() {
  const session = await getSessionUser();
  if (!session?.user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const user = session.user as any;
  if (!user.isSuperAdmin) return NextResponse.json({ error: "Accès réservé" }, { status: 403 });
  return { user };
}

export async function GET(req: Request) {
  const g = await requireSuperAdmin();
  if (g instanceof NextResponse) return g;

  const tenants = await db.tenant.findMany({
    select: { id: true, createdAt: true, subscriptionStatus: true, subscriptionExpiresAt: true },
  });

  const now = new Date();
  const activeTenants = tenants.filter((t) => {
    const expired = t.subscriptionExpiresAt && new Date(t.subscriptionExpiresAt) < now;
    const blocked = t.subscriptionStatus === "desactive";
    return !expired && !blocked;
  });
  const blockedTenants = tenants.length - activeTenants.length;

  const totalTenants = tenants.length;
  const estimatedMRR = activeTenants.length * PRICE_PER_TENANT;

  // Nouveaux clients par mois (6 derniers mois)
  const months: { label: string; count: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = d.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" });
    const count = tenants.filter((t) => {
      const c = new Date(t.createdAt);
      return c.getFullYear() === d.getFullYear() && c.getMonth() === d.getMonth();
    }).length;
    months.push({ label, count });
  }

  // GMV total : somme de toutes les ventes confirmées/facturées/payées, tous clients confondus
  const salesAgg = await db.sale.findMany({
    where: { status: { in: ["CONFIRMED", "INVOICED", "PAID"] } },
    select: { total: true },
  });
  const totalGMV = salesAgg.reduce((s, x) => s + n(x.total), 0);

  const totalInvoices = await db.invoice.count();
  const totalSales = await db.sale.count();

  return NextResponse.json({
    totalTenants,
    activeTenants: activeTenants.length,
    blockedTenants,
    estimatedMRR,
    totalGMV: Math.round(totalGMV),
    totalInvoices,
    totalSales,
    signupsByMonth: months,
  });
}