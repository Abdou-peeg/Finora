"use client";

import { useState } from "react";
import { useAudit } from "@/hooks/use-data";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ScrollText, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { dateTimeShort } from "@/lib/format";

const ACTION_COLORS: Record<string, string> = {
  CREATE: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  UPDATE: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
  DELETE: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
  SALE_CONFIRMED: "bg-emerald-600 text-white",
  SALE_CANCELLED: "bg-rose-600 text-white",
  PURCHASE_CONFIRMED: "bg-teal-600 text-white",
  PURCHASE_CANCELLED: "bg-rose-600 text-white",
  INVOICE_CREATED: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
  INVOICE_PAID: "bg-emerald-600 text-white",
  INVOICE_CANCELLED: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
  USER_CREATED: "bg-violet-100 text-violet-700 dark:bg-violet-950 dark:text-violet-300",
  USER_UPDATED: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  USER_DELETED: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
  CASH_IN_MANUAL: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  CASH_OUT_MANUAL: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
};

export function AuditView() {
  const { data, isLoading } = useAudit(200);
  const [search, setSearch] = useState("");

  const items = (data?.items ?? []).filter((i: any) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (i.userName || "").toLowerCase().includes(q) ||
      (i.action || "").toLowerCase().includes(q) ||
      (i.entity || "").toLowerCase().includes(q) ||
      (i.details || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Journal d'audit</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Traçabilité complète de toutes les actions sensibles — chaque vente confirmée, règlement, modification ou suppression est historisé.
        </p>
      </div>

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="relative max-w-md">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Rechercher dans l'audit (utilisateur, action, entité)…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          {isLoading ? (
            <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
          ) : items.length === 0 ? (
            <div className="py-16 text-center"><ScrollText className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" /><p className="text-sm text-muted-foreground">Aucune entrée d'audit.</p></div>
          ) : (
            <div className="rounded-md border overflow-hidden max-h-[700px] overflow-y-auto scroll-fade">
              <Table>
                <TableHeader className="sticky top-0 bg-card">
                  <TableRow>
                    <TableHead>Horodatage</TableHead><TableHead>Utilisateur</TableHead>
                    <TableHead>Action</TableHead><TableHead>Entité</TableHead>
                    <TableHead>Détails</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((a: any) => (
                    <TableRow key={a.id}>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{dateTimeShort(a.createdAt)}</TableCell>
                      <TableCell className="font-medium text-sm">{a.userName || <span className="text-muted-foreground italic">Système</span>}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium ${ACTION_COLORS[a.action] || "bg-slate-100 text-slate-700"}`}>
                          {a.action}
                        </span>
                      </TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px]">{a.entity}</Badge></TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-md">{a.details}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
