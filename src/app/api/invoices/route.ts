import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/guard";
import { db } from "@/lib/db";
import { safeError } from "@/lib/errors";

export async function GET(req: Request) {
  const g = await requirePermission(req, "facturation:view");
  if (g instanceof NextResponse) return g;
  const { tenantId } = g.user;
  const url = new URL(req.url);
  const search = url.searchParams.get("search") || "";
  const where: any = { tenantId };
  if (search) {
    where.OR = [
      { number: { contains: search } },
      { partyName: { contains: search } },
    ];
  }
  const items = await db.invoice.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ items });
}
