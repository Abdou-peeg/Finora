"use client";

import { useCash } from "@/hooks/use-data";
import { KpiCard } from "@/components/kpi-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend, Cell } from "recharts";
import { Wallet, TrendingUp, TrendingDown, Banknote } from "lucide-react";
import { currency } from "@/lib/format";

export function TreasuryView() {
  const { data, isLoading } = useCash();

  if (isLoading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-10 w-72" />
        <div className="grid sm:grid-cols-4 gap-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
        <Skeleton className="h-80" />
      </div>
    );
  }

  const balance = data?.balance ?? 0;
  const totalIn = data?.totalIn ?? 0;
  const totalOut = data?.totalOut ?? 0;
  const net = totalIn - totalOut;

  // Last 14 days cash flow
  const byDay = new Map<string, { date: string; in: number; out: number }>();
  for (let i = 13; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    const key = d.toISOString().slice(5, 10);
    byDay.set(key, { date: key, in: 0, out: 0 });
  }
  for (const e of data?.items ?? []) {
    const key = new Date(e.date).toISOString().slice(5, 10);
    if (byDay.has(key)) {
      if (e.type === "IN") byDay.get(key)!.in += e.amount;
      else byDay.get(key)!.out += e.amount;
    }
  }
  const trend = Array.from(byDay.values()).map((d) => ({ ...d, net: Math.round((d.in - d.out) * 100) / 100 }));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Trésorerie</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Vue consolidée des flux financiers — encaissements, décaissements et position nette sur 14 jours.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Solde actuel" value={balance} icon={<Wallet className="h-4 w-4" />} variant={balance >= 0 ? "success" : "danger"} />
        <KpiCard label="Total encaissé" value={totalIn} icon={<TrendingUp className="h-4 w-4" />} variant="success" hint={`${data?.count ?? 0} mouvements`} />
        <KpiCard label="Total décaissé" value={totalOut} icon={<TrendingDown className="h-4 w-4" />} variant="warning" />
        <KpiCard label="Flux net" value={net} icon={<Banknote className="h-4 w-4" />} variant={net >= 0 ? "success" : "danger"} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Flux de trésorerie — 14 derniers jours</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trend}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="currentColor" opacity={0.5} />
                <YAxis tick={{ fontSize: 11 }} stroke="currentColor" opacity={0.5} width={50} />
                <Tooltip formatter={(v: any) => currency(v)} contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="in" name="Encaissements" fill="oklch(0.55 0.15 160)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="out" name="Décaissements" fill="oklch(0.6 0.18 30)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Synthèse par type de flux</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="rounded-lg border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-950/20 p-4">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 mb-1">
                <TrendingUp className="h-4 w-4" />
                <span className="text-xs font-medium uppercase">Encaissements</span>
              </div>
              <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{currency(totalIn)}</p>
              <p className="text-xs text-muted-foreground mt-1">Ventes, règlements clients, entrées manuelles</p>
            </div>
            <div className="rounded-lg border border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/20 p-4">
              <div className="flex items-center gap-2 text-rose-700 dark:text-rose-300 mb-1">
                <TrendingDown className="h-4 w-4" />
                <span className="text-xs font-medium uppercase">Décaissements</span>
              </div>
              <p className="text-2xl font-bold text-rose-700 dark:text-rose-300">{currency(totalOut)}</p>
              <p className="text-xs text-muted-foreground mt-1">Achats, règlements fournisseurs, sorties manuelles</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
