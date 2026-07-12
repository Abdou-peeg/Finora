import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/guard";
import { payPayroll } from "@/lib/transactions";
import { safeError } from "@/lib/errors";

export async function POST(req: Request) {
  const g = await requirePermission(req, "rh:create");
  if (g instanceof NextResponse) return g;
  const { tenantId } = g.user;
  const body = await req.json();
  const { payrollId } = body;

  if (!payrollId) {
    return NextResponse.json({ error: "payrollId requis" }, { status: 400 });
  }

  try {
    const result = await payPayroll(payrollId, g.user);
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: safeError(e) }, { status: 400 });
  }
}
