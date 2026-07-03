"use client";

import { useState } from "react";
import { useCash, useManualCash } from "@/hooks/use-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Wallet, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { KpiCard } from "@/components/kpi-card";
import { currency, dateTimeShort, StatusBadge } from "@/lib/format";

export function CashView() {
  const { data, isLoading, refetch } = useCash();
  const manualM = useManualCash();
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<"IN" | "OUT">("IN");
  const [amount, setAmount] = useState(0);
  const [label, setLabel] = useState("");

  async function submit() {
    if (!amount || amount <= 0) return;
    await manualM.mutateAsync({ type, amount, label });
    setOpen(false);
    setAmount(0);
    setLabel("");
    refetch();
  }

  const items = data?.items ?? [];
  const balance = data?.balance ?? 0;
  const totalIn = data?.totalIn ?? 0;
  const totalOut = data?.totalOut ?? 0;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Caisse</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Mouvements de caisse — toutes les opérations (ventes, achats, règlements) alimentent ce journal.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-2" /> Mouvement manuel</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle>Nouveau mouvement de caisse</DialogTitle></DialogHeader>
            <div className="space-y-3 py-2">
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={type} onValueChange={(v: any) => setType(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="IN">Entrée (encaissement)</SelectItem>
                    <SelectItem value="OUT">Sortie (décaissement)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Montant (FCFA)</Label>
                <Input type="number" step="0.01" value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
              </div>
              <div className="space-y-1.5">
                <Label>Libellé</Label>
                <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Description du mouvement" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)}>Annuler</Button>
              <Button onClick={submit} disabled={manualM.isPending}>Enregistrer</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <KpiCard label="Solde caisse actuel" value={balance} icon={<Wallet className="h-4 w-4" />} variant={balance >= 0 ? "success" : "danger"} />
        <KpiCard label="Total entrées" value={totalIn} icon={<TrendingUp className="h-4 w-4" />} variant="success" />
        <KpiCard label="Total sorties" value={totalOut} icon={<TrendingDown className="h-4 w-4" />} variant="warning" />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Journal des mouvements</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
          ) : items.length === 0 ? (
            <div className="py-16 text-center"><Wallet className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" /><p className="text-sm text-muted-foreground">Aucun mouvement de caisse.</p></div>
          ) : (
            <div className="rounded-md border overflow-hidden max-h-[600px] overflow-y-auto scroll-fade">
              <Table>
                <TableHeader className="sticky top-0 bg-card">
                  <TableRow>
                    <TableHead>Référence</TableHead><TableHead>Date</TableHead><TableHead>Libellé</TableHead>
                    <TableHead>Source</TableHead><TableHead>Type</TableHead>
                    <TableHead className="text-right">Montant</TableHead><TableHead className="text-right">Solde</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((e: any) => (
                    <TableRow key={e.id}>
                      <TableCell className="font-mono text-xs">{e.reference}</TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{dateTimeShort(e.date)}</TableCell>
                      <TableCell className="font-medium">{e.label}</TableCell>
                      <TableCell><span className="text-xs text-muted-foreground">{e.source}</span></TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded font-medium ${e.type === "IN" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"}`}>
                          {e.type === "IN" ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                          {e.type === "IN" ? "Entrée" : "Sortie"}
                        </span>
                      </TableCell>
                      <TableCell className={`text-right tabular-nums font-medium ${e.type === "IN" ? "text-emerald-600" : "text-rose-600"}`}>
                        {e.type === "IN" ? "+" : "−"} {currency(e.amount)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">{e.balanceAfter != null ? currency(e.balanceAfter) : "—"}</TableCell>
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
