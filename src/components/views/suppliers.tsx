"use client";

import { useState } from "react";
import { useList, useCreateSupplier, useUpdateSupplier, useDeleteSupplier } from "@/hooks/use-data";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Search, Pencil, Trash2, Truck, Mail, Phone, MapPin } from "lucide-react";
import { toast } from "sonner";

const EMPTY = { code: "", name: "", email: "", phone: "+221 ", address: "", city: "Dakar", country: "Sénégal", taxId: "" };

export function SuppliersView() {
  const [search, setSearch] = useState("");
  const { data, isLoading } = useList("suppliers", search);
  const createM = useCreateSupplier();
  const updateM = useUpdateSupplier();
  const deleteM = useDeleteSupplier();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>(EMPTY);

  function openCreate() { setEditing(null); setForm(EMPTY); setOpen(true); }
  function openEdit(s: any) { setEditing(s); setForm({ ...s }); setOpen(true); }
  async function submit() {
    if (!form.name) { toast.error("Nom requis"); return; }
    if (editing) await updateM.mutateAsync({ id: editing.id, ...form });
    else await createM.mutateAsync(form);
    setOpen(false);
  }
  async function del(s: any) {
    if (!confirm(`Supprimer le fournisseur "${s.name}" ?`)) return;
    await deleteM.mutateAsync(s.id);
  }

  const items = data?.items ?? [];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Fournisseurs</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Annuaire fournisseurs pour les achats et factures associées.</p>
        </div>
        <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" /> Nouveau fournisseur</Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader><DialogTitle>{editing ? "Modifier le fournisseur" : "Nouveau fournisseur"}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="space-y-1.5"><Label>Code (auto)</Label><Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="F-004" /></div>
            <div className="space-y-1.5"><Label>Nom *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Email</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Téléphone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            <div className="space-y-1.5 col-span-2"><Label>Adresse</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Ville</Label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Pays</Label><Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} /></div>
            <div className="space-y-1.5 col-span-2"><Label>N° fiscal</Label><Input value={form.taxId} onChange={(e) => setForm({ ...form, taxId: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Annuler</Button>
            <Button onClick={submit} disabled={createM.isPending || updateM.isPending}>{editing ? "Mettre à jour" : "Créer"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="relative max-w-md">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Rechercher par nom, code…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          {isLoading ? (
            <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
          ) : items.length === 0 ? (
            <div className="py-16 text-center"><Truck className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" /><p className="text-sm text-muted-foreground">Aucun fournisseur trouvé.</p></div>
          ) : (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead><TableHead>Nom</TableHead><TableHead>Contact</TableHead>
                    <TableHead>Ville / Pays</TableHead><TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((s: any) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-mono text-xs">{s.code}</TableCell>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      <TableCell>
                        <div className="text-xs space-y-0.5">
                          {s.email && <div className="flex items-center gap-1.5"><Mail className="h-3 w-3 text-muted-foreground" />{s.email}</div>}
                          {s.phone && <div className="flex items-center gap-1.5"><Phone className="h-3 w-3 text-muted-foreground" />{s.phone}</div>}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {(s.city || s.country) && <span className="inline-flex items-center gap-1.5"><MapPin className="h-3 w-3 text-muted-foreground" />{[s.city, s.country].filter(Boolean).join(", ")}</span>}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(s)}><Pencil className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-600" onClick={() => del(s)}><Trash2 className="h-3.5 w-3.5" /></Button>
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
    </div>
  );
}
