import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/guard";
import { db } from "@/lib/db";
import { safeError } from "@/lib/errors";

export async function GET() {
  const session = await getSessionUser();
  if (!session?.user) {
    return NextResponse.json({ user: null });
  }
  const tenant = await db.tenant.findUnique({ where: { id: (session.user as any).tenantId } });
  return NextResponse.json({
    user: session.user,
    tenant,
  });
}
