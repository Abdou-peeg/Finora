import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/guard";
import { db } from "@/lib/db";
import { safeError } from "@/lib/errors";
import { payPayroll } from "@/lib/transactions";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const g = await requirePermission(req, "rh:update");
  if (g instanceof NextResponse) return g;
  const { tenantId } = g.user;

  try {
    const payroll = await db.payroll.findFirst({
      where: { id, tenantId },
    });
    if (!payroll) {
      return NextResponse.json(
        { error: "Fiche de paie introuvable" },
        { status: 404 }
      );
    }

    const paid = await payPayroll(id, g.user);
    return NextResponse.json(paid);
  } catch (e: any) {
    return NextResponse.json({ error: safeError(e) }, { status: 400 });
  }
}
