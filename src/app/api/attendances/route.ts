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
  const month = url.searchParams.get("month"); // YYYY-MM
  
  const where: any = { tenantId };
  if (employeeId) where.employeeId = employeeId;
  if (month) {
    const start = new Date(`${month}-01`);
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 0);
    where.date = { gte: start, lte: end };
  }
  
  const items = await db.attendance.findMany({
    where,
    include: {
      employee: { select: { id: true, firstName: true, lastName: true } },
    },
    orderBy: { date: "desc" },
  });
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const g = await requirePermission(req, "rh:create");
  if (g instanceof NextResponse) return g;
  const { tenantId } = g.user;
  const body = await req.json();
  
  try {
    const date = new Date(body.date);
    date.setHours(0, 0, 0, 0);

    const upserted = await db.attendance.upsert({
      where: {
        tenantId_employeeId_date: {
          tenantId,
          employeeId: body.employeeId,
          date,
        },
      },
      update: {
        status: body.status,
        delayMinutes: body.status === "DELAY" ? Number(body.delayMinutes || 0) : 0,
        punchIn: body.punchIn ? new Date(body.punchIn) : undefined,
        punchOut: body.punchOut ? new Date(body.punchOut) : undefined,
        notes: body.notes || null,
        recordedById: g.user.id,
      },
      create: {
        tenantId,
        employeeId: body.employeeId,
        date,
        status: body.status,
        delayMinutes: body.status === "DELAY" ? Number(body.delayMinutes || 0) : 0,
        punchIn: body.punchIn ? new Date(body.punchIn) : undefined,
        punchOut: body.punchOut ? new Date(body.punchOut) : undefined,
        notes: body.notes || null,
        recordedById: g.user.id,
      },
    });

    return NextResponse.json(upserted);
  } catch (e: any) {
    return NextResponse.json({ error: safeError(e) }, { status: 400 });
  }
}
