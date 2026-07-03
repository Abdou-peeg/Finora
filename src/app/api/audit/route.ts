import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/guard";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  const g = await requirePermission(req, "audit:view");
  if (g instanceof NextResponse) return g;
  const { tenantId } = g.user;
  const url = new URL(req.url);
  const limit = Number(url.searchParams.get("limit") || 100);
  const entity = url.searchParams.get("entity");
  const where: any = { tenantId };
  if (entity) where.entity = entity;
  const items = await db.auditLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return NextResponse.json({ items });
}
