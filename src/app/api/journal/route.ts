import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/guard";
import { db } from "@/lib/db";
import { safeError } from "@/lib/errors";
export async function GET(req: Request) {
  const g = await requirePermission(req, "comptabilite:view");
  if (g instanceof NextResponse) return g;
  const { tenantId } = g.user;
  const url = new URL(req.url);
  const limit = Number(url.searchParams.get("limit") || 100);
  const [entries, accounts] = await Promise.all([
    db.journalEntry.findMany({
      where: { tenantId },
      orderBy: { date: "desc" },
      take: limit,
      include: { lines: { include: { account: true } } },
    }),
    db.account.findMany({ where: { tenantId }, orderBy: { code: "asc" } }),
  ]);
  // Trial balance computation
  const balances = await Promise.all(
    accounts.map(async (acc) => {
      const lines = await db.journalEntryLine.findMany({
        where: { account: { tenantId }, accountId: acc.id },
        include: { journalEntry: true },
      });
      const debit = lines.reduce((s, l) => s + Number(l.debit), 0);
      const credit = lines.reduce((s, l) => s + Number(l.credit), 0);
      return { ...acc, debit, credit, balance: debit - credit };
    })
  );
  return NextResponse.json({ entries, accounts: balances });
}