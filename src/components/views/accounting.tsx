"use client";

import { useJournal } from "@/hooks/use-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Scale } from "lucide-react";
import { currency, dateTimeShort } from "@/lib/format";

export function AccountingView() {
  const { data, isLoading } = useJournal();

  if (isLoading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-80" />
        <Skeleton className="h-80" />
      </div>
    );
  }

  const entries = data?.entries ?? [];
  const accounts = (data?.accounts ?? []) as any[];
  const totalDebit = accounts.reduce((s, a) => s + a.debit, 0);
  const totalCredit = accounts.reduce((s, a) => s + a.credit, 0);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Comptabilité</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Journal comptable en partie double — chaque vente, achat et règlement génère une écriture équilibrée automatiquement.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Scale className="h-4 w-4" />
            Balance équilibre : <span className={Math.abs(totalDebit - totalCredit) < 0.01 ? "text-emerald-600" : "text-rose-600"}>{currency(totalDebit)} / {currency(totalCredit)}</span>
            <Badge variant={Math.abs(totalDebit - totalCredit) < 0.01 ? "default" : "destructive"} className="ml-1">
              {Math.abs(totalDebit - totalCredit) < 0.01 ? "Équilibré" : "Déséquilibré"}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Compte</TableHead><TableHead>Libellé</TableHead><TableHead>Type</TableHead>
                  <TableHead className="text-right">Débit</TableHead><TableHead className="text-right">Crédit</TableHead><TableHead className="text-right">Solde</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts.filter((a) => a.debit !== 0 || a.credit !== 0).map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-mono text-xs">{a.code}</TableCell>
                    <TableCell className="font-medium">{a.label}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">{a.type}</Badge></TableCell>
                    <TableCell className="text-right tabular-nums">{a.debit ? currency(a.debit) : "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">{a.credit ? currency(a.credit) : "—"}</TableCell>
                    <TableCell className={`text-right tabular-nums font-medium ${a.balance >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{currency(a.balance)}</TableCell>
                  </TableRow>
                ))}
                <TableRow className="bg-muted/30 font-semibold">
                  <TableCell colSpan={3}>Totaux</TableCell>
                  <TableCell className="text-right tabular-nums">{currency(totalDebit)}</TableCell>
                  <TableCell className="text-right tabular-nums">{currency(totalCredit)}</TableCell>
                  <TableCell />
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><BookOpen className="h-4 w-4" /> Journal des écritures ({entries.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="max-h-[600px]">
            <div className="space-y-3 pr-2">
              {entries.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">Aucune écriture. Les ventes et achats confirmés apparaîtront ici.</p>
              ) : (
                entries.map((je: any) => {
                  const totalDebit = je.lines.reduce((s: number, l: any) => s + l.debit, 0);
                  return (
                    <div key={je.id} className="rounded-md border p-3">
                      <div className="flex items-start justify-between mb-2 gap-2">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-xs font-semibold">{je.reference}</span>
                            <Badge variant="outline" className="text-[10px]">{je.source}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-0.5">{je.description}</p>
                          <p className="text-[10px] text-muted-foreground">{dateTimeShort(je.date)}</p>
                        </div>
                        <span className="font-bold tabular-nums">{currency(totalDebit)}</span>
                      </div>
                      <div className="rounded border overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="h-7 text-[10px]">Compte</TableHead>
                              <TableHead className="h-7 text-[10px]">Libellé</TableHead>
                              <TableHead className="h-7 text-[10px] text-right">Débit</TableHead>
                              <TableHead className="h-7 text-[10px] text-right">Crédit</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {je.lines.map((l: any) => (
                              <TableRow key={l.id}>
                                <TableCell className="py-1 font-mono text-[10px]">{l.account?.code}</TableCell>
                                <TableCell className="py-1 text-xs">{l.account?.label}</TableCell>
                                <TableCell className="py-1 text-right tabular-nums text-xs">{l.debit ? currency(l.debit) : "—"}</TableCell>
                                <TableCell className="py-1 text-right tabular-nums text-xs">{l.credit ? currency(l.credit) : "—"}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
