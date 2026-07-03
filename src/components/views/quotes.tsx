"use client";

import { useState } from "react";
import { useList, useCreateQuote, useQuoteAction, useDeleteQuote } from "@/hooks/use-data";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, FileText, Trash2, Download, CheckCircle2, ChevronRight, RefreshCw, Send } from "lucide-react";
import { currency, dateTimeShort, StatusBadge } from "@/lib/format";
import { toast } from "sonner";

interface LineItem { productId: string; qty: number; unitPrice?: number; taxRate?: number; }

const QUOTE_STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  SENT: "bg-sky-100 text-sky-700",
  ACCEPTED: "bg-emerald-100 text-emerald-700",
  REFUSED: "bg-rose-100 text-rose-700",
  EXPIRED: "bg-amber-100 text-amber-700",
  CONVERTED: "bg-violet-600 text-white",
};

export function QuotesView() {
  const [search, setSearch] = useState("");
  const { data, isLoading, refetch } = useList("quotes", search);
  const createM = useCreateQuote();
  const actionM = useQuoteAction();
  const deleteM = useDeleteQuote();
  const [open, setOpen] = useState(false);
  const [details, setDetails] = useState<any>(null);

  const [customerId, setCustomerId] = useState("");
  const [lines, setLines] = useState<LineItem[]>([{ productId: "", qty: 1 }]);
  const [notes, setNotes] = useState("");
  const [validUntil, setValidUntil] = useState("");

  const { data: customersData } = useList("customers", "");
  const { data: productsData } = useList("products", "");
  const customers = customersData?.items ?? [];
  const products = productsData?.items ?? [];

  function addLine() {
    if (products.length === 0) { toast.error("Créez d'abord des produits"); return; }
    setLines([...lines, { productId: products[0].id, qty: 1 }]);
  }
  function removeLine(idx: number) { setLines(lines.filter((_, i) => i !== idx)); }
  function updateLine(idx: number, patch: Partial<LineItem>) {
    setLines(lines.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  }
  function lineTotal(l: LineItem) {
    const p = products.find((p) => p.id === l.productId);
    if (!p) return 0;
    const up = l.unitPrice ?? Number(p.salePrice);
    const tax = l.taxRate ?? Number(p.taxRate);
    const ht = l.qty * up;
    return Math.round((ht + ht * tax / 100) * 100) / 100;
  }
  function totals() {
    const subtotal = lines.reduce((s, l) => {
      const p = products.find((p) => p.id === l.productId);
      return s + (l.qty * (l.unitPrice ?? Number(p?.salePrice ?? 0)));
    }, 0);
    const total = lines.reduce((s, l) => s + lineTotal(l), 0);
    return { subtotal: Math.round(subtotal * 100) / 100, taxTotal: Math.round((total - subtotal) * 100) / 100, total: Math.round(total * 100) / 100 };
  }

  async function submit() {
    if (!customerId) { toast.error("Sélectionnez un client"); return; }
    if (lines.length === 0 || lines.some((l) => !l.productId)) { toast.error("Ajoutez au moins une ligne valide"); return; }
    await createM.mutateAsync({
      customerId,
      items: lines.map((l) => {
        const p = products.find((p) => p.id === l.productId)!;
        return { productId: l.productId, qty: l.qty, unitPrice: l.unitPrice ?? Number(p.salePrice), taxRate: l.taxRate ?? Number(p.taxRate) };
      }),
      notes,
      validUntil: validUntil || undefined,
    });
    setOpen(false);
    setCustomerId("");
    setLines([{ productId: products[0]?.id || "", qty: 1 }]);
    setNotes("");
    setValidUntil("");
    refetch();
  }

  async function doAction(id: string, action: string, status?: string) {
    try { await actionM.mutateAsync({ id, action, status }); refetch(); } catch {}
  }

  async function downloadPdf(quote: any) {
    window.open(`/api/quotes/${quote.id}/pdf`, "_blank");
  }

  async function del(q: any) {
    if (!confirm(`Supprimer le devis ${q.number} ?`)) return;
    await deleteM.mutateAsync(q.id);
    refetch();
  }

  const items = data?.items ?? [];
  const t = totals();

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Devis</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Créez des devis clients. Un devis accepté peut être converti en vente confirmée (stock + caisse + compta).
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { setLines([{ productId: products[0]?.id || "", qty: 1 }]); setOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" /> Nouveau devis
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Nouveau devis</DialogTitle></DialogHeader>
            <div className="space-y-4 py-2">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Client *</Label>
                  <Select value={customerId} onValueChange={setCustomerId}>
                    <SelectTrigger><SelectValue placeholder="Sélectionner un client" /></SelectTrigger>
                    <SelectContent>
                      {customers.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.code} — {c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Valide jusqu'au</Label>
                  <Input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Lignes du devis</Label>
                  <Button variant="outline" size="sm" onClick={addLine}><Plus className="h-3.5 w-3.5 mr-1" /> Ajouter une ligne</Button>
                </div>
                <div className="rounded-md border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Produit</TableHead>
                        <TableHead className="w-24">Qté</TableHead>
                        <TableHead className="w-32">Prix unit. HT</TableHead>
                        <TableHead className="w-24">TVA %</TableHead>
                        <TableHead className="w-32 text-right">Total TTC</TableHead>
                        <TableHead className="w-10" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lines.map((l, idx) => {
                        const p = products.find((p) => p.id === l.productId);
                        return (
                          <TableRow key={idx}>
                            <TableCell>
                              <Select value={l.productId} onValueChange={(v) => updateLine(idx, { productId: v })}>
                                <SelectTrigger className="h-8"><SelectValue placeholder="Produit…" /></SelectTrigger>
                                <SelectContent>
                                  {products.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.sku} — {p.name}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell><Input type="number" min="0" step="0.01" value={l.qty} onChange={(e) => updateLine(idx, { qty: Number(e.target.value) })} className="h-8" /></TableCell>
                            <TableCell><Input type="number" step="0.01" value={l.unitPrice ?? Number(p?.salePrice ?? 0)} onChange={(e) => updateLine(idx, { unitPrice: Number(e.target.value) })} className="h-8" /></TableCell>
                            <TableCell><Input type="number" step="0.1" value={l.taxRate ?? Number(p?.taxRate ?? 18)} onChange={(e) => updateLine(idx, { taxRate: Number(e.target.value) })} className="h-8" /></TableCell>
                            <TableCell className="text-right tabular-nums font-medium">{currency(lineTotal(l))}</TableCell>
                            <TableCell><Button variant="ghost" size="icon" className="h-8 w-8 text-rose-600" onClick={() => removeLine(idx)}><Trash2 className="h-3.5 w-3.5" /></Button></TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Notes</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Conditions particulières, délai de livraison, etc." />
              </div>
              <div className="rounded-lg bg-muted/50 p-3 flex justify-end items-center gap-6 text-sm">
                <div><span className="text-muted-foreground">Sous-total HT : </span><span className="font-semibold tabular-nums">{currency(t.subtotal)}</span></div>
                <div><span className="text-muted-foreground">TVA : </span><span className="font-semibold tabular-nums">{currency(t.taxTotal)}</span></div>
                <div><span className="text-muted-foreground">Total TTC : </span><span className="font-bold tabular-nums text-base text-primary">{currency(t.total)}</span></div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)}>Annuler</Button>
              <Button onClick={submit} disabled={createM.isPending}>Créer le devis</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="relative max-w-md">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Rechercher par numéro, client…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          {isLoading ? (
            <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
          ) : items.length === 0 ? (
            <div className="py-16 text-center"><FileText className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" /><p className="text-sm text-muted-foreground">Aucun devis. Créez le premier.</p></div>
          ) : (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Numéro</TableHead><TableHead>Client</TableHead><TableHead>Date</TableHead>
                    <TableHead>Valide jusqu'au</TableHead><TableHead className="text-right">Total TTC</TableHead>
                    <TableHead>Statut</TableHead><TableHead>Vente</TableHead><TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((q: any) => (
                    <TableRow key={q.id} className="cursor-pointer hover:bg-accent/30" onClick={() => setDetails(q)}>
                      <TableCell className="font-mono text-xs">{q.number}</TableCell>
                      <TableCell className="font-medium">{q.customer?.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{dateTimeShort(q.date)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{q.validUntil ? new Date(q.validUntil).toLocaleDateString("fr-SN") : "—"}</TableCell>
                      <TableCell className="text-right tabular-nums font-medium">{currency(Number(q.total))}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${QUOTE_STATUS_COLORS[q.status]}`}>{q.status}</span>
                      </TableCell>
                      <TableCell>{q.sale ? <span className="font-mono text-xs text-emerald-600">{q.sale.reference}</span> : <span className="text-xs text-muted-foreground">—</span>}</TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end gap-1">
                          {q.status === "DRAFT" && (
                            <Button size="sm" variant="outline" onClick={() => doAction(q.id, "status", "SENT")}><Send className="h-3.5 w-3.5 mr-1" /> Envoyer</Button>
                          )}
                          {["DRAFT", "SENT"].includes(q.status) && (
                            <Button size="sm" variant="outline" onClick={() => doAction(q.id, "status", "ACCEPTED")}><CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Accepter</Button>
                          )}
                          {["DRAFT", "SENT", "ACCEPTED"].includes(q.status) && (
                            <Button size="sm" variant="default" onClick={() => doAction(q.id, "convert")}><RefreshCw className="h-3.5 w-3.5 mr-1" /> Convertir en vente</Button>
                          )}
                          <Button size="sm" variant="ghost" onClick={() => downloadPdf(q)}><Download className="h-3.5 w-3.5" /></Button>
                          {q.status !== "CONVERTED" && <Button size="sm" variant="ghost" className="text-rose-600" onClick={() => del(q)}><Trash2 className="h-3.5 w-3.5" /></Button>}
                          <Button size="sm" variant="ghost" onClick={() => setDetails(q)}><ChevronRight className="h-3.5 w-3.5" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!details} onOpenChange={(v) => !v && setDetails(null)}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          {details && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <span className="font-mono text-sm">{details.number}</span>
                  <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${QUOTE_STATUS_COLORS[details.status]}`}>{details.status}</span>
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><span className="text-muted-foreground">Client : </span><span className="font-medium">{details.customer?.name}</span></div>
                  <div><span className="text-muted-foreground">Date : </span>{dateTimeShort(details.date)}</div>
                  <div><span className="text-muted-foreground">Valide jusqu'au : </span>{details.validUntil ? new Date(details.validUntil).toLocaleDateString("fr-SN") : "—"}</div>
                  {details.sale && <div><span className="text-muted-foreground">Vente liée : </span><span className="font-mono text-xs text-emerald-600">{details.sale.reference}</span></div>}
                </div>
                {details.notes && <div className="rounded-md bg-muted/50 p-3 text-sm"><span className="text-muted-foreground">Notes : </span>{details.notes}</div>}
                <div className="rounded-md border overflow-hidden">
                  <Table>
                    <TableHeader><TableRow><TableHead>Produit</TableHead><TableHead className="text-right">Qté</TableHead><TableHead className="text-right">PU HT</TableHead><TableHead className="text-right">TVA</TableHead><TableHead className="text-right">Total TTC</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {details.items?.map((it: any) => (
                        <TableRow key={it.id}>
                          <TableCell>{it.product?.name}</TableCell>
                          <TableCell className="text-right tabular-nums">{Number(it.qty)}</TableCell>
                          <TableCell className="text-right tabular-nums">{currency(Number(it.unitPrice))}</TableCell>
                          <TableCell className="text-right tabular-nums">{Number(it.taxRate)}%</TableCell>
                          <TableCell className="text-right tabular-nums font-medium">{currency(Number(it.lineTotal))}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="flex justify-end gap-6 text-sm">
                  <div><span className="text-muted-foreground">Sous-total HT : </span><span className="font-semibold">{currency(Number(details.subtotal))}</span></div>
                  <div><span className="text-muted-foreground">TVA : </span><span className="font-semibold">{currency(Number(details.taxTotal))}</span></div>
                  <div><span className="text-muted-foreground">Total TTC : </span><span className="font-bold text-primary">{currency(Number(details.total))}</span></div>
                </div>
                <div className="flex justify-end gap-2 pt-3 border-t">
                  <Button variant="outline" onClick={() => downloadPdf(details)}><Download className="h-4 w-4 mr-2" /> Télécharger PDF</Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
