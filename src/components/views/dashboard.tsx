"use client";

import { useState } from "react";
import { useDashboard } from "@/hooks/use-data";
import { KpiCard } from "@/components/kpi-card";
import { currency, number, dateTimeShort, StatusBadge } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TrendingUp, TrendingDown, Wallet, AlertTriangle, FileWarning, Package, Users, Truck, ShoppingCart } from "lucide-react";
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend,
} from "recharts";

export function DashboardView() {
  const { data, isLoading } = useDashboard();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-72" />
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
        <Skeleton className="h-80 rounded-xl" />
      </div>
    );
  }

  const k = data?.kpis;
  const trend = (data?.trend ?? []).map((t: any) => ({
    date: t.date.slice(5),
    ventes: Math.round(t.sales),
    achats: Math.round(t.purchases),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Tableau de bord</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Vue consolidée temps réel — ventes, achats, trésorerie, stock et factures.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Solde caisse" value={k?.cashBalance ?? 0} icon={<Wallet className="h-4 w-4" />} variant="success" hint="Dernière entrée" />
        <KpiCard label="Créances clients" value={k?.receivable ?? 0} icon={<TrendingUp className="h-4 w-4" />} hint={`${k?.unpaidInvoices ?? 0} facture(s) impayée(s)`} />
        <KpiCard label="Dettes fournisseurs" value={k?.payable ?? 0} icon={<TrendingDown className="h-4 w-4" />} variant="warning" hint="À régler" />
        <KpiCard label="Alertes stock bas" value={k?.lowStock ?? 0} format="number" icon={<AlertTriangle className="h-4 w-4" />} variant={k?.lowStock > 0 ? "danger" : "default"} hint="Produits sous le minimum" />
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="Produits" value={k?.products ?? 0} format="number" icon={<Package className="h-4 w-4" />} />
        <KpiCard label="Clients" value={k?.customers ?? 0} format="number" icon={<Users className="h-4 w-4" />} />
        <KpiCard label="Fournisseurs" value={k?.suppliers ?? 0} format="number" icon={<Truck className="h-4 w-4" />} />
        <KpiCard label="Ventes confirmées" value={k?.sales ?? 0} format="number" icon={<ShoppingCart className="h-4 w-4" />} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Tendance 30 jours — ventes vs achats</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend}>
                <defs>
                  <linearGradient id="g-sales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.55 0.15 160)" stopOpacity={0.6} />
                    <stop offset="100%" stopColor="oklch(0.55 0.15 160)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="g-purchases" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.6 0.18 80)" stopOpacity={0.6} />
                    <stop offset="100%" stopColor="oklch(0.6 0.18 80)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="currentColor" opacity={0.5} />
                <YAxis tick={{ fontSize: 11 }} stroke="currentColor" opacity={0.5} width={50} />
                <Tooltip
                  formatter={(v: any, n) => [currency(v), n === "ventes" ? "Ventes" : "Achats"]}
                  contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="ventes" stroke="oklch(0.45 0.13 160)" fill="url(#g-sales)" strokeWidth={2} name="Ventes" />
                <Area type="monotone" dataKey="achats" stroke="oklch(0.6 0.18 80)" fill="url(#g-purchases)" strokeWidth={2} name="Achats" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Stock bas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-80">
              {data?.lowStockProducts?.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  Aucun produit en alerte stock. Tous les niveaux sont au-dessus du minimum.
                </p>
              ) : (
                <div className="space-y-2">
                  {data?.lowStockProducts?.map((p: any) => (
                    <div key={p.id} className="flex items-center justify-between gap-3 rounded-md border p-2.5">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{p.sku} · {p.category}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-amber-600">{number(p.stockQty)} {p.unit}</p>
                        <p className="text-[10px] text-muted-foreground">min: {number(p.minStock)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileWarning className="h-4 w-4 text-rose-500" />
              Factures impayées
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="max-h-80">
              {data?.unpaidInvoices?.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  Aucune facture impayée. Trésorerie à jour.
                </p>
              ) : (
                <div className="space-y-2">
                  {data?.unpaidInvoices?.map((inv: any) => (
                    <div key={inv.id} className="flex items-center justify-between gap-3 rounded-md border p-2.5">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{inv.number}</p>
                        <p className="text-xs text-muted-foreground truncate">{inv.partyName}</p>
                        <p className="text-[10px] text-muted-foreground">{dateTimeShort(inv.issueDate)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold">{currency(inv.total - inv.paidAmount)}</p>
                        <StatusBadge status={inv.status} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
