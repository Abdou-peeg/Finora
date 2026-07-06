import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/guard";
import { db } from "@/lib/db";
import { safeError } from "@/lib/errors";

export async function GET(req: Request) {
  const g = await requirePermission(req, "caisse:view");
  if (g instanceof NextResponse) return g;
  const { tenantId } = g.user;
  const items = await db.cashEntry.findMany({
    where: { tenantId },
    orderBy: { date: "desc" },
    take: 200,
  });
  const last = items[0];
  const balance = Number(last?.balanceAfter ?? 0);
  const totalIn = items.filter((e) => e.type === "IN").reduce((s, e) => s + Number(e.amount), 0);
  const totalOut = items.filter((e) => e.type === "OUT").reduce((s, e) => s + Number(e.amount), 0);
  return NextResponse.json({ items, balance, totalIn, totalOut, count: items.length });
}

// Manual cash entry (e.g. small expense or opening balance)
export async function POST(req: Request) {
  const g = await requirePermission(req, "caisse:update");
  if (g instanceof NextResponse) return g;
  const { tenantId } = g.user;
  const body = await req.json();
  const type = body.type === "OUT" ? "OUT" : "IN";
  const amount = Number(body.amount);
  if (!amount || amount <= 0) return NextResponse.json({ error: "Montant invalide" }, { status: 400 });

  const last = await db.cashEntry.findFirst({ where: { tenantId }, orderBy: { date: "desc" } });
  const balanceAfter = Math.round((Number(last?.balanceAfter ?? 0) + (type === "IN" ? amount : -amount)) * 100) / 100;
  const ref = `MAN-${Date.now()}`;
  const created = await db.cashEntry.create({
    data: {
      tenantId,
      reference: ref,
      type,
      amount,
      label: body.label || (type === "IN" ? "Entrée manuelle" : "Sortie manuelle"),
      source: "MANUAL",
      date: new Date(),
      balanceAfter,
    },
  });
  await db.auditLog.create({
    data: {
      tenantId, userId: g.user.id, userName: g.user.name,
      action: type === "IN" ? "CASH_IN_MANUAL" : "CASH_OUT_MANUAL",
      entity: "CashEntry", entityId: created.id,
      details: `${type === "IN" ? "Entrée" : "Sortie"} caisse manuelle — ${amount} EUR — ${body.label || ""}`,
    },
  });
  return NextResponse.json(created);
}