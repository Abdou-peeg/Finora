import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions, can } from "./auth";
import { db } from "@/lib/db";

export async function getSessionUser() {
  return await getServerSession(authOptions);
}

type Permission = string;

/**
 * Auth guard for API routes. Returns the session user on success or a NextResponse on failure.
 * Usage:
 *   const guard = await requirePermission(req, "ventes:create");
 *   if (guard instanceof NextResponse) return guard;
 *   const { user } = guard;
 */
export async function requirePermission(
  _req: Request,
  permission?: Permission
): Promise<{ user: any; session: any } | NextResponse> {
  const session = await getSessionUser();
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }
  const user = session.user as any;

  if (permission && !can(user.role, permission)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }

  // Vérification stricte de l'abonnement à CHAQUE requête (pas seulement au
  // moment de la connexion), pour que le blocage prenne effet immédiatement
  // dès qu'un admin change la date d'expiration côté base de données,
  // sans attendre que l'utilisateur se reconnecte.
  const tenant = await db.tenant.findUnique({
    where: { id: user.tenantId },
    select: { subscriptionExpiresAt: true },
  });
  if (tenant?.subscriptionExpiresAt && new Date(tenant.subscriptionExpiresAt) < new Date()) {
    return NextResponse.json({ error: "Abonnement expiré", code: "SUBSCRIPTION_EXPIRED" }, { status: 402 });
  }

  return { user, session };
}

export function tenantScoped(user: any) {
  return { tenantId: user.tenantId };
}