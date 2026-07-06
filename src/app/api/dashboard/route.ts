import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/guard";
import { db } from "@/lib/db";
import { safeError } from "@/lib/errors";

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export async function GET(req: Request) {
  const g = await requirePermission(req, "dashboard:view");
  if (g instanceof NextResponse) return g;
  const { tenantId } = g.user;

  const [
    productsCount,
    customersCount,
    suppliersCount,
    salesCount,
    purchasesCount,
    invoicesUnpaid,
    lowStockProducts,
    cashBalance,
    salesLast30,
    purchasesLast30,
  ] = await Promise.all([
    db.product.count({ where: { tenantId } }),
    db.customer.count({ where: { tenantId } }),
    db.supplier.count({ where: { tenantId } }),
    db.sale.count({ where: { tenantId, status: { in: ["CONFIRMED", "INVOICED", "PAID"] } } }),
    db.purchase.count({ where: { tenantId, status: { in: ["CONFIRMED", "INVOICED", "PAID"] } } }),
    db.invoice.findMany({ where: { tenantId, status: { in: ["UNPAID", "PARTIAL"] } } }),
    db.product.findMany({ where: { tenantId, stockQty: { lte: db.product.fields.minStock } } }),
    db.cashEntry.findFirst({ where: { tenantId }, orderBy: { date: "desc" } }),
    db.sale.findMany({
      where: { tenantId, status: { not: "DRAFT" }, date: { gte: new Date(Date.now() - 30 * 86400000) } },
      orderBy: { date: "asc" },
    }),
    db.purchase.findMany({
      where: { tenantId, status: { not: "DRAFT" }, date: { gte: new Date(Date.now() - 30 * 86400000) } },
      orderBy: { date: "asc" },
    }),
  ]);

  // Group sales by day for the 30-day trend
  const trend = new Map<string, { sales: number; purchases: number }>();
  const today = startOfDay(new Date());
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 86400000);
    const key = d.toISOString().slice(0, 10);
    trend.set(key, { sales: 0, purchases: 0 });
  }
  for (const s of salesLast30) {
    const key = startOfDay(s.date).toISOString().slice(0, 10);
    if (trend.has(key)) trend.get(key)!.sales += s.total;
  }
  for (const p of purchasesLast30) {
    const key = startOfDay(p.date).toISOString().slice(0, 10);
    if (trend.has(key)) trend.get(key)!.purchases += p.total;
  }
  const trendArray = Array.from(trend.entries()).map(([date, v]) => ({ date, ...v }));

  const totalReceivable = invoicesUnpaid
    .filter((i) => i.type === "CUSTOMER")
    .reduce((s, i) => s + (Number(i.total) - Number(i.paidAmount)), 0);
  const totalPayable = invoicesUnpaid
    .filter((i) => i.type === "SUPPLIER")
    .reduce((s, i) => s + (Number(i.total) - Number(i.paidAmount)), 0);

  return NextResponse.json({
    kpis: {
      products: productsCount,
      customers: customersCount,
      suppliers: suppliersCount,
      sales: salesCount,
      purchases: purchasesCount,
      cashBalance: cashBalance?.balanceAfter ?? 0,
      receivable: totalReceivable,
      payable: totalPayable,
      lowStock: lowStockProducts.length,
      unpaidInvoices: invoicesUnpaid.length,
    },
    trend: trendArray,
    lowStockProducts,
    unpaidInvoices: invoicesUnpaid.slice(0, 10),
  });
}
