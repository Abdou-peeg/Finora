import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/guard";
import { db } from "@/lib/db";
import { safeError } from "@/lib/errors";
import { payPayroll } from "@/lib/transactions";

export async function POST(req: Request) {
  const g = await requirePermission(req, "rh:update");
  if (g instanceof NextResponse) return g;
  const { tenantId } = g.user;
  const body = await req.json();
  const { payPeriodStart, payPeriodEnd } = body;

  try {
    const payrolls = await db.payroll.findMany({
      where: {
        tenantId,
        status: "CONFIRMED",
        payPeriodStart: new Date(payPeriodStart),
        payPeriodEnd: new Date(payPeriodEnd),
      },
    });

    const results = [];
    const errors = [];

    for (const payroll of payrolls) {
      try {
        const paid = await payPayroll(payroll.id, g.user);
        results.push({
          id: payroll.id,
          status: "success",
          data: paid,
        });
      } catch (e: any) {
        errors.push({
          id: payroll.id,
          error: safeError(e),
        });
      }
    }

    return NextResponse.json({
      totalProcessed: payrolls.length,
      successCount: results.length,
      errorCount: errors.length,
      results,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (e: any) {
    return NextResponse.json({ error: safeError(e) }, { status: 400 });
  }
}
