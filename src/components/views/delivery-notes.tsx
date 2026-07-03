"use client";

import { useState } from "react";
import { useList, useCreateDeliveryNote, useDeliveryNoteAction, useDeleteDeliveryNote } from "@/hooks/use-data";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Truck, Trash2, Download, ChevronRight, CheckCircle2 } from "lucide-react";
import { dateTimeShort } from "@/lib/format";
import { toast } from "sonner";

interface LineItem { productId: string; qty: number; description?: string; }

const DN_STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  DELIVERED: "bg-emerald-600 text-white",
  CANCELLED: "bg-rose-100 text-rose-700",
};

export function DeliveryNotesView() {
  const [search, setSearch] = useState("");
  const { data, isLoading, refetch } = useList("delivery-notes", search);
  const createM = useCreateDeliveryNote();
  const actionM = useDeliveryNoteAction();
  const deleteM = useDeleteDeliveryNote();
  const [open, setOpen] = useState(false);
  const [details, setDetails] = useState<any>(null);

  const [customerId, setCustomerId] = useState("");
  const [lines, setLines] = useState<LineItem[]>([{ productId: "", qty: 1 }]);
  const [notes, setNotes] = useState("");
  const [receivedBy, setReceivedBy] = useState("");

  const { data: customersData } = useList("customers", "");
  const { data: productsData } = useList("products", "");
  const customers = customersData?.items ?? [];
  const products = productsData?.items ?? [];

  function addLine() { setLines([...lines, { productId: products[0]?.id || "", qty: 1 }]); }
  function removeLine(idx: number) { setLines(lines.filter((_, i) => i !== idx)); }
  function updateLine(idx: number, patch: Partial<LineItem>) {
    setLines(lines.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  }

  async function submit() {
    if (!customerId) { toast.error("Sélectionnez un client"); return; }
    if (lines.length === 0 || lines.some((l) => !l.productId)) { toast.error("Ajoutez au moins une ligne valide"); return; }
    await createM.mutateAsync({
      customerId,
      items: lines.map((l) => ({ productId: l.productId, qty: l.qty, description: l.description })),
      notes,
      receivedBy: receivedBy || undefined,
    });
    setOpen(false);
    setCustomerId("");
    setLines([{ productId: products[0]?.id || "", qty: 1 }]);
    setNotes("");
    setReceivedBy("");
    refetch();
  }

  async function doAction(id: string, action: string, status?: string, receivedBy?: string) {
    try { await actionM.mutateAsync({ id, action, status, receivedBy }); refetch(); } catch {}
  }
  async function downloadPdf(dn: any) { window.open(`/api/delivery-notes/${dn.id}/pdf`, "_blank"); }
  async function del(dn: any) {
    if (!confirm(`Supprimer le bon de livraison ${dn.number} ?`)) return;
    await deleteM.mutateAsync(dn.id);
    refetch();
  }

  const items = data?.items ?? [];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Bons de livraison</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Document accompagnant la livraison des marchandises. À faire signer par le client lors de la réception.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { setLines([{ productId: products[0]?.id || "", qty: 1 }]); setOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" /> Nouveau bon
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Nouveau bon de livraison</DialogTitle></DialogHeader>
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
                  <Label>Réceptionné par (optionnel)</Label>
                  <Input value={receivedBy} onChange={(e) => setReceivedBy(e.target.value)} placeholder="Nom de la personne chez le client" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Articles livrés</Label>
                  <Button variant="outline" size="sm" onClick={addLine}><Plus className="h-3.5 w-3.5 mr-1" /> Ajouter une ligne</Button>
                </div>
                <div className="rounded-md border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Produit</TableHead>
                        <TableHead className="w-24">Qté</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="w-10" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lines.map((l, idx) => (
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
                          <TableCell><Input value={l.description || ""} onChange={(e) => updateLine(idx, { description: e.target.value })} className="h-8" placeholder="Optionnel" /></TableCell>
                          <TableCell><Button variant="ghost" size="icon" className="h-8 w-8 text-rose-600" onClick={() => removeLine(idx)}><Trash2 className="h-3.5 w-3.5" /></Button></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Notes</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Instructions de livraison, etc." />
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
            <Input placeholder="Rechercher par numéro, client…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          {isLoading ? (
            <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
          ) : items.length === 0 ? (
            <div className="py-16 text-center"><Truck className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" /><p className="text-sm text-muted-foreground">Aucun bon de livraison.</p></div>
          ) : (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Numéro</TableHead><TableHead>Client</TableHead><TableHead>Date</TableHead>
                    <TableHead>Articles</TableHead><TableHead>Statut</TableHead><TableHead>Réception</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((dn: any) => (
                    <TableRow key={dn.id} className="cursor-pointer hover:bg-accent/30" onClick={() => setDetails(dn)}>
                      <TableCell className="font-mono text-xs">{dn.number}</TableCell>
                      <TableCell className="font-medium">{dn.customer?.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{dateTimeShort(dn.date)}</TableCell>
                      <TableCell className="text-sm">{dn.items?.length || 0} ligne(s)</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${DN_STATUS_COLORS[dn.status]}`}>{dn.status}</span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">{dn.receivedBy || "—"}</TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end gap-1">
                          {dn.status === "DRAFT" && (
                            <Button size="sm" variant="outline" onClick={() => doAction(dn.id, "status", "DELIVERED")}><CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Livré</Button>
                          )}
                          <Button size="sm" variant="ghost" onClick={() => downloadPdf(dn)}><Download className="h-3.5 w-3.5" /></Button>
                          {dn.status !== "DELIVERED" && <Button size="sm" variant="ghost" className="text-rose-600" onClick={() => del(dn)}><Trash2 className="h-3.5 w-3.5" /></Button>}
                          <Button size="sm" variant="ghost" onClick={() => setDetails(dn)}><ChevronRight className="h-3.5 w-3.5" /></Button>
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
                  <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${DN_STATUS_COLORS[details.status]}`}>{details.status}</span>
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><span className="text-muted-foreground">Client : </span><span className="font-medium">{details.customer?.name}</span></div>
                  <div><span className="text-muted-foreground">Date : </span>{dateTimeShort(details.date)}</div>
                  {details.receivedBy && <div><span className="text-muted-foreground">Réceptionné par : </span><span className="font-medium">{details.receivedBy}</span></div>}
                </div>
                {details.notes && <div className="rounded-md bg-muted/50 p-3 text-sm"><span className="text-muted-foreground">Notes : </span>{details.notes}</div>}
                <div className="rounded-md border overflow-hidden">
                  <Table>
                    <TableHeader><TableRow><TableHead>Produit</TableHead><TableHead className="text-right">Qté</TableHead><TableHead>Description</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {details.items?.map((it: any) => (
                        <TableRow key={it.id}>
                          <TableCell>{it.product?.name}</TableCell>
                          <TableCell className="text-right tabular-nums">{Number(it.qty)}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{it.description || "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
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
