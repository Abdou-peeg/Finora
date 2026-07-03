"use client";

import { useReports } from "@/hooks/use-data";
import { KpiCard } from "@/components/kpi-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Pie, PieChart, Cell } from "recharts";
import { TrendingUp, TrendingDown, Banknote, Percent } from "lucide-react";
import { currency } from "@/lib/format";

const PIE_COLORS = ["oklch(0.55 0.15 160)", "oklch(0.6 0.18 80)", "oklch(0.55 0.22 30)", "oklch(0.6 0.15 200)", "oklch(0.7 0.18 320)", "oklch(0.65 0.18 145)"];

export function ReportsView() {
  const { data, isLoading } = useReports();

  if (isLoading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-10 w-72" />
        <div className="grid sm:grid-cols-4 gap-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
        <Skeleton className="h-80" />
        <Skeleton className="h-80" />
      </div>
    );
  }

  const pnl = data?.pnl;
  const topProducts = (data?.topProducts ?? []).slice(0, 8);
  const topCustomers = data?.topCustomers ?? [];

  const pieData = [
    { name: "Ventes HT", value: pnl?.revenue ?? 0 },
    { name: "Achats HT", value: pnl?.cogs ?? 0 },
    { name: "TVA collectée", value: pnl?.vatCollected ?? 0 },
    { name: "TVA déductible", value: pnl?.vatDeductible ?? 0 },
  ].filter((d) => d.value > 0);

  const marginRate = pnl && pnl.revenue > 0 ? (pnl.grossMargin / pnl.revenue) * 100 : 0;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Rapports financiers</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Compte de résultat simplifié, top produits et clients, ventilation TVA.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Chiffre d'affaires HT" value={pnl?.revenue ?? 0} icon={<TrendingUp className="h-4 w-4" />} variant="success" />
        <KpiCard label="Coût des marchandises" value={pnl?.cogs ?? 0} icon={<TrendingDown className="h-4 w-4" />} variant="warning" />
        <KpiCard label="Marge brute" value={pnl?.grossMargin ?? 0} icon={<Banknote className="h-4 w-4" />} variant="success" hint={`Taux : ${marginRate.toFixed(1)}%`} />
        <KpiCard label="TVA nette à payer" value={pnl?.vatNet ?? 0} icon={<Percent className="h-4 w-4" />} hint="Collectée − déductible" />
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <Card>
          <CardHeader><CardTitle className="text-base">Ventilation — ventes vs achats vs TVA</CardTitle></CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={(e: any) => `${e.name}: ${currency(e.value)}`}>
                    {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: any) => currency(v)} contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Top produits par chiffre d'affaires</CardTitle></CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topProducts} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11 }} stroke="currentColor" opacity={0.5} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} stroke="currentColor" opacity={0.5} width={120} />
                  <Tooltip formatter={(v: any) => currency(v)} contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="revenue" name="CA" fill="oklch(0.55 0.15 160)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Top clients par chiffre d'affaires</CardTitle></CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead><TableHead>Client</TableHead>
                  <TableHead className="text-right">Nb ventes</TableHead>
                  <TableHead className="text-right">CA total</TableHead>
                  <TableHead className="text-right">Panier moyen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topCustomers.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-8">Aucune vente confirmée pour le moment.</TableCell></TableRow>
                ) : topCustomers.map((c: any, i: number) => (
                  <TableRow key={i}>
                    <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell className="text-right tabular-nums">{c.count}</TableCell>
                    <TableCell className="text-right tabular-nums font-semibold">{currency(c.total)}</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">{currency(c.total / c.count)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
