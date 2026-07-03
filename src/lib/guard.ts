import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions, can } from "./auth";

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
  if (permission && !can((session.user as any).role, permission)) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
  }
  return { user: session.user, session };
}

export function tenantScoped(user: any) {
  return { tenantId: user.tenantId };
}
