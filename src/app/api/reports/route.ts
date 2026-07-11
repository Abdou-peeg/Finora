import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/guard";
import { db } from "@/lib/db";
import { safeError } from "@/lib/errors";

export async function GET(req: Request) {
  const g = await requirePermission(req, "rapports:view");
  if (g instanceof NextResponse) return g;
  const { tenantId } = g.user;

  const [sales, purchases, cashEntries, journalLines, accounts, products] = await Promise.all([
    db.sale.findMany({
      where: { tenantId, status: { not: "DRAFT" } },
      include: { items: true, customer: true },
    }),
    db.purchase.findMany({
      where: { tenantId, status: { not: "DRAFT" } },
      include: { items: true, supplier: true },
    }),
    db.cashEntry.findMany({ where: { tenantId }, orderBy: { date: "asc" } }),
    db.journalEntryLine.findMany({
      where: { account: { tenantId } },
      include: { account: true, journalEntry: true },
    }),
    db.account.findMany({ where: { tenantId }, orderBy: { code: "asc" } }),
    db.product.findMany({ where: { tenantId } }),
  ]);

  // Revenue & expense by account
  const accountSummary = accounts.map((acc) => {
    const lines = journalLines.filter((l) => l.accountId === acc.id);
  const debit = lines.reduce((s, l) => s + Number(l.debit), 0);
  const credit = lines.reduce((s, l) => s + Number(l.credit), 0);
    return { ...acc, debit, credit, balance: debit - credit };
  });

  const revenue = sales.reduce((s, x) => s + Number(x.subtotal), 0);
  const cogs = purchases.reduce((s, x) => s + Number(x.subtotal), 0);
  const vatCollected = accountSummary.find((a) => a.code === "443000")?.credit ?? 0;
  const vatDeductible = accountSummary.find((a) => a.code === "445000")?.debit ?? 0;
  const grossMargin = revenue - cogs;
  const vatNet = vatCollected - vatDeductible;

  // Top selling products by qty
  const productSales = new Map<string, { name: string; sku: string; qty: number; revenue: number }>();
  for (const s of sales) {
    for (const it of s.items) {
      const p = products.find((p) => p.id === it.productId);
      if (!p) continue;
      const prev = productSales.get(p.id) ?? { name: p.name, sku: p.sku, qty: 0, revenue: 0 };
      prev.qty += Number(it.qty);
      prev.revenue += Number(it.lineTotal);
      productSales.set(p.id, prev);
    }
  }
  const topProducts = Array.from(productSales.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  // Top customers
  const customerSales = new Map<string, { name: string; total: number; count: number }>();
  for (const s of sales) {
    const prev = customerSales.get(s.customerId) ?? { name: s.customer?.name ?? "—", total: 0, count: 0 };
    prev.total += Number(s.total);
    prev.count += 1;
    customerSales.set(s.customerId, prev);
  }
  const topCustomers = Array.from(customerSales.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  return NextResponse.json({
    pnl: {
      revenue,
      cogs,
      grossMargin,
      vatCollected,
      vatDeductible,
      vatNet,
      netCash: cashEntries.reduce((s, e) => s + (e.type === "IN" ? Number(e.amount) : -Number(e.amount)), 0),
    },
    accountSummary,
    topProducts,
    topCustomers,
    cashFlow: cashEntries.map((e) => ({
      date: e.date,
      label: e.label,
      type: e.type,
      amount: e.amount,
      balance: e.balanceAfter,
    })),
  });
}
