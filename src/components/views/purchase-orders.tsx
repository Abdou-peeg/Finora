"use client";

import { useState } from "react";
import { useList, useCreatePurchaseOrder, usePurchaseOrderAction, useDeletePurchaseOrder } from "@/hooks/use-data";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Receipt, Trash2, Download, CheckCircle2, ChevronRight, RefreshCw, Send } from "lucide-react";
import { currency, dateTimeShort } from "@/lib/format";
import { toast } from "sonner";

interface LineItem { productId: string; qty: number; unitPrice: number; taxRate?: number; }

const PO_STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  SENT: "bg-sky-100 text-sky-700",
  CONFIRMED: "bg-emerald-100 text-emerald-700",
  RECEIVED: "bg-violet-600 text-white",
  CANCELLED: "bg-rose-100 text-rose-700",
};

export function PurchaseOrdersView() {
  const [search, setSearch] = useState("");
  const { data, isLoading, refetch } = useList("purchase-orders", search);
  const createM = useCreatePurchaseOrder();
  const actionM = usePurchaseOrderAction();
  const deleteM = useDeletePurchaseOrder();
  const [open, setOpen] = useState(false);
  const [details, setDetails] = useState<any>(null);

  const [supplierId, setSupplierId] = useState("");
  const [lines, setLines] = useState<LineItem[]>([{ productId: "", qty: 1, unitPrice: 0 }]);
  const [notes, setNotes] = useState("");
  const [expectedDate, setExpectedDate] = useState("");

  const { data: suppliersData } = useList("suppliers", "");
  const { data: productsData } = useList("products", "");
  const suppliers = suppliersData?.items ?? [];
  const products = productsData?.items ?? [];

  function addLine() { setLines([...lines, { productId: products[0]?.id || "", qty: 1, unitPrice: products[0] ? Number(products[0].costPrice) : 0 }]); }
  function removeLine(idx: number) { setLines(lines.filter((_, i) => i !== idx)); }
  function updateLine(idx: number, patch: Partial<LineItem>) {
    setLines(lines.map((l, i) => {
      if (i !== idx) return l;
      const merged = { ...l, ...patch };
      if (patch.productId) {
        const p = products.find((p) => p.id === patch.productId);
        if (p && !patch.unitPrice) merged.unitPrice = Number(p.costPrice);
        if (p && !patch.taxRate) merged.taxRate = Number(p.taxRate);
      }
      return merged;
    }));
  }
  function lineTotal(l: LineItem) {
    const p = products.find((p) => p.id === l.productId);
    const tax = l.taxRate ?? Number(p?.taxRate ?? 18);
    const ht = l.qty * l.unitPrice;
    return Math.round((ht + ht * tax / 100) * 100) / 100;
  }
  function totals() {
    const subtotal = lines.reduce((s, l) => s + l.qty * l.unitPrice, 0);
    const total = lines.reduce((s, l) => s + lineTotal(l), 0);
    return { subtotal: Math.round(subtotal * 100) / 100, taxTotal: Math.round((total - subtotal) * 100) / 100, total: Math.round(total * 100) / 100 };
  }

  async function submit() {
    if (!supplierId) { toast.error("Sélectionnez un fournisseur"); return; }
    if (lines.length === 0 || lines.some((l) => !l.productId)) { toast.error("Ajoutez au moins une ligne valide"); return; }
    await createM.mutateAsync({
      supplierId,
      items: lines.map((l) => {
        const p = products.find((p) => p.id === l.productId)!;
        return { productId: l.productId, qty: l.qty, unitPrice: l.unitPrice, taxRate: l.taxRate ?? Number(p.taxRate) };
      }),
      notes,
      expectedDate: expectedDate || undefined,
    });
    setOpen(false);
    setSupplierId("");
    setLines([{ productId: products[0]?.id || "", qty: 1, unitPrice: products[0] ? Number(products[0].costPrice) : 0 }]);
    setNotes("");
    setExpectedDate("");
    refetch();
  }

  async function doAction(id: string, action: string, status?: string) {
    try { await actionM.mutateAsync({ id, action, status }); refetch(); } catch {}
  }
  async function downloadPdf(po: any) { window.open(`/api/purchase-orders/${po.id}/pdf`, "_blank"); }
  async function del(po: any) {
    if (!confirm(`Supprimer le bon de commande ${po.number} ?`)) return;
    await deleteM.mutateAsync(po.id);
    refetch();
  }

  const items = data?.items ?? [];
  const t = totals();

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Bons de commande</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Commandes fournisseurs. Un bon confirmé peut être converti en achat (stock incrémenté + caisse débitée + compta).
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { setLines([{ productId: products[0]?.id || "", qty: 1, unitPrice: products[0] ? Number(products[0].costPrice) : 0 }]); setOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" /> Nouveau bon
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Nouveau bon de commande</DialogTitle></DialogHeader>
            <div className="space-y-4 py-2">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Fournisseur *</Label>
                  <Select value={supplierId} onValueChange={setSupplierId}>
                    <SelectTrigger><SelectValue placeholder="Sélectionner un fournisseur" /></SelectTrigger>
                    <SelectContent>
                      {suppliers.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.code} — {s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Livraison prévue</Label>
                  <Input type="date" value={expectedDate} onChange={(e) => setExpectedDate(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Lignes de commande</Label>
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
                            <TableCell><Input type="number" step="0.01" value={l.unitPrice} onChange={(e) => updateLine(idx, { unitPrice: Number(e.target.value) })} className="h-8" /></TableCell>
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
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
              </div>
              <div className="rounded-lg bg-muted/50 p-3 flex justify-end items-center gap-6 text-sm">
                <div><span className="text-muted-foreground">Sous-total HT : </span><span className="font-semibold tabular-nums">{currency(t.subtotal)}</span></div>
                <div><span className="text-muted-foreground">TVA : </span><span className="font-semibold tabular-nums">{currency(t.taxTotal)}</span></div>
                <div><span className="text-muted-foreground">Total TTC : </span><span className="font-bold tabular-nums text-base text-primary">{currency(t.total)}</span></div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)}>Annuler</Button>
              <Button onClick={submit} disabled={createM.isPending}>Créer le bon</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="relative max-w-md">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Rechercher par numéro, fournisseur…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          {isLoading ? (
            <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
          ) : items.length === 0 ? (
            <div className="py-16 text-center"><Receipt className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" /><p className="text-sm text-muted-foreground">Aucun bon de commande.</p></div>
          ) : (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Numéro</TableHead><TableHead>Fournisseur</TableHead><TableHead>Date</TableHead>
                    <TableHead className="text-right">Total TTC</TableHead><TableHead>Statut</TableHead>
                    <TableHead>Achat</TableHead><TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((po: any) => (
                    <TableRow key={po.id} className="cursor-pointer hover:bg-accent/30" onClick={() => setDetails(po)}>
                      <TableCell className="font-mono text-xs">{po.number}</TableCell>
                      <TableCell className="font-medium">{po.supplier?.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{dateTimeShort(po.date)}</TableCell>
                      <TableCell className="text-right tabular-nums font-medium">{currency(Number(po.total))}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${PO_STATUS_COLORS[po.status]}`}>{po.status}</span>
                      </TableCell>
                      <TableCell>{po.purchase ? <span className="font-mono text-xs text-emerald-600">{po.purchase.reference}</span> : <span className="text-xs text-muted-foreground">—</span>}</TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end gap-1">
                          {po.status === "DRAFT" && (
                            <Button size="sm" variant="outline" onClick={() => doAction(po.id, "status", "SENT")}><Send className="h-3.5 w-3.5 mr-1" /> Envoyer</Button>
                          )}
                          {["DRAFT", "SENT"].includes(po.status) && (
                            <Button size="sm" variant="outline" onClick={() => doAction(po.id, "status", "CONFIRMED")}><CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Confirmer</Button>
                          )}
                          {["DRAFT", "SENT", "CONFIRMED"].includes(po.status) && (
                            <Button size="sm" variant="default" onClick={() => doAction(po.id, "convert")}><RefreshCw className="h-3.5 w-3.5 mr-1" /> Réceptionner</Button>
                          )}
                          <Button size="sm" variant="ghost" onClick={() => downloadPdf(po)}><Download className="h-3.5 w-3.5" /></Button>
                          {po.status !== "RECEIVED" && <Button size="sm" variant="ghost" className="text-rose-600" onClick={() => del(po)}><Trash2 className="h-3.5 w-3.5" /></Button>}
                          <Button size="sm" variant="ghost" onClick={() => setDetails(po)}><ChevronRight className="h-3.5 w-3.5" /></Button>
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
                  <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${PO_STATUS_COLORS[details.status]}`}>{details.status}</span>
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><span className="text-muted-foreground">Fournisseur : </span><span className="font-medium">{details.supplier?.name}</span></div>
                  <div><span className="text-muted-foreground">Date : </span>{dateTimeShort(details.date)}</div>
                  {details.expectedDate && <div><span className="text-muted-foreground">Livraison prévue : </span>{new Date(details.expectedDate).toLocaleDateString("fr-SN")}</div>}
                  {details.purchase && <div><span className="text-muted-foreground">Achat lié : </span><span className="font-mono text-xs text-emerald-600">{details.purchase.reference}</span></div>}
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
