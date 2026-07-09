import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/guard";
import { db } from "@/lib/db";
import { safeError } from "@/lib/errors";

export async function POST(req: Request) {
  const g = await requirePermission(req, "rh:create");
  if (g instanceof NextResponse) return g;
  const { tenantId, id: recordedById } = g.user;
  const body = await req.json();

  try {
    const date = new Date(body.date);
    date.setHours(0, 0, 0, 0);

    const existingAttendance = await db.attendance.findUnique({
      where: {
        tenantId_employeeId_date: {
          tenantId,
          employeeId: body.employeeId,
          date,
        },
      },
    });

    let attendance;
    if (existingAttendance) {
      attendance = await db.attendance.update({
        where: { id: existingAttendance.id },
        data: {
          status: body.status,
          delayMinutes: body.status === "DELAY" ? Number(body.delayMinutes || 0) : 0,
          punchIn: body.punchIn ? new Date(body.punchIn) : undefined,
          punchOut: body.punchOut ? new Date(body.punchOut) : undefined,
          notes: body.notes || null,
          recordedById,
        },
      });
    } else {
      attendance = await db.attendance.create({
        data: {
          tenantId,
          employeeId: body.employeeId,
          date,
          status: body.status,
          delayMinutes: body.status === "DELAY" ? Number(body.delayMinutes || 0) : 0,
          punchIn: body.punchIn ? new Date(body.punchIn) : undefined,
          punchOut: body.punchOut ? new Date(body.punchOut) : undefined,
          notes: body.notes || null,
          recordedById,
        },
      });
    }

    return NextResponse.json(attendance);
  } catch (e: any) {
    return NextResponse.json({ error: safeError(e) }, { status: 400 });
  }
}
