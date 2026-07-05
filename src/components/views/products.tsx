"use client";

import { useState, useRef } from "react";
import { useList, useCreateProduct, useUpdateProduct, useDeleteProduct } from "@/hooks/use-data";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Pencil, Trash2, Package, AlertTriangle, ImagePlus, X } from "lucide-react";
import { currency, number } from "@/lib/format";
import { toast } from "sonner";

const EMPTY = {
  sku: "", name: "", description: "", category: "", unit: "pièce",
  salePrice: 0, costPrice: 0, taxRate: 18, stockQty: 0, minStock: 0,
  imageUrl: "",
};

const MAX_IMAGE_BYTES = 1_500_000; // ~1.5MB avant encodage base64, marge raisonnable pour la colonne DB

function ProductThumb({ src, name, size = "h-9 w-9" }: { src?: string | null; name: string; size?: string }) {
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={`${size} rounded-md object-cover border flex-shrink-0`}
      />
    );
  }
  return (
    <div className={`${size} rounded-md border bg-muted flex items-center justify-center flex-shrink-0`}>
      <Package className="h-4 w-4 text-muted-foreground/50" />
    </div>
  );
}

export function ProductsView() {
  const [search, setSearch] = useState("");
  const { data, isLoading } = useList("products", search);
  const createM = useCreateProduct();
  const updateM = useUpdateProduct();
  const deleteM = useDeleteProduct();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>(EMPTY);
  const [imageUploading, setImageUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY);
    setOpen(true);
  }
  function openEdit(p: any) {
    setEditing(p);
    setForm({ ...p });
    setOpen(true);
  }
  async function submit() {
    if (!form.sku || !form.name) {
      toast.error("SKU et nom requis");
      return;
    }
    if (editing) {
      await updateM.mutateAsync({ id: editing.id, ...form });
    } else {
      await createM.mutateAsync(form);
    }
    setOpen(false);
  }
  async function del(p: any) {
    if (!confirm(`Supprimer le produit "${p.name}" ?`)) return;
    await deleteM.mutateAsync(p.id);
  }

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Le fichier doit être une image");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast.error("Image trop volumineuse (max ~1,5 Mo). Compressez-la d'abord.");
      return;
    }
    setImageUploading(true);
    const reader = new FileReader();
    reader.onload = () => {
      setForm((f: any) => ({ ...f, imageUrl: reader.result as string }));
      setImageUploading(false);
    };
    reader.onerror = () => {
      toast.error("Impossible de lire l'image");
      setImageUploading(false);
    };
    reader.readAsDataURL(file);
  }

  function removeImage() {
    setForm((f: any) => ({ ...f, imageUrl: "" }));
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const items = data?.items ?? [];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Produits</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Catalogue produits avec stock, prix d'achat/vente et alertes minimum.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4 mr-2" /> Nouveau produit
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editing ? "Modifier le produit" : "Nouveau produit"}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-2">
              <div className="space-y-1.5 col-span-2">
                <Label>Photo du produit</Label>
                <div className="flex items-center gap-3">
                  <ProductThumb src={form.imageUrl} name={form.name || "produit"} size="h-16 w-16" />
                  <div className="flex flex-col gap-1.5">
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={imageUploading}
                      >
                        <ImagePlus className="h-3.5 w-3.5 mr-1.5" />
                        {form.imageUrl ? "Changer" : "Ajouter une photo"}
                      </Button>
                      {form.imageUrl && (
                        <Button type="button" variant="ghost" size="sm" className="text-rose-600" onClick={removeImage}>
                          <X className="h-3.5 w-3.5 mr-1" /> Retirer
                        </Button>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground">JPG, PNG — 1,5 Mo max</p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageSelect}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>SKU</Label>
                <Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} placeholder="SKU-009" />
              </div>
              <div className="space-y-1.5">
                <Label>Nom</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nom du produit" />
              </div>
              <div className="space-y-1.5 col-span-2">
                <Label>Description</Label>
                <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Catégorie</Label>
                <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Unité</Label>
                <Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Prix vente HT (FCFA)</Label>
                <Input type="number" step="0.01" value={form.salePrice} onChange={(e) => setForm({ ...form, salePrice: Number(e.target.value) })} />
              </div>
              <div className="space-y-1.5">
                <Label>Prix achat HT (FCFA)</Label>
                <Input type="number" step="0.01" value={form.costPrice} onChange={(e) => setForm({ ...form, costPrice: Number(e.target.value) })} />
              </div>
              <div className="space-y-1.5">
                <Label>TVA (%)</Label>
                <Input type="number" step="0.1" value={form.taxRate} onChange={(e) => setForm({ ...form, taxRate: Number(e.target.value) })} />
              </div>
              <div className="space-y-1.5">
                <Label>Stock initial</Label>
                <Input type="number" step="0.01" value={form.stockQty} onChange={(e) => setForm({ ...form, stockQty: Number(e.target.value) })} />
              </div>
              <div className="space-y-1.5">
                <Label>Stock minimum (alerte)</Label>
                <Input type="number" step="0.01" value={form.minStock} onChange={(e) => setForm({ ...form, minStock: Number(e.target.value) })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)}>Annuler</Button>
              <Button onClick={submit} disabled={createM.isPending || updateM.isPending || imageUploading}>
                {editing ? "Mettre à jour" : "Créer"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="relative max-w-md">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par nom, SKU, catégorie…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
            </div>
          ) : items.length === 0 ? (
            <div className="py-16 text-center">
              <Package className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">Aucun produit trouvé.</p>
            </div>
          ) : (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Nom</TableHead>
                    <TableHead>Catégorie</TableHead>
                    <TableHead className="text-right">Prix vente</TableHead>
                    <TableHead className="text-right">Prix achat</TableHead>
                    <TableHead className="text-right">TVA</TableHead>
                    <TableHead className="text-right">Stock</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((p: any) => {
                    const low = Number(p.stockQty) <= Number(p.minStock);
                    return (
                      <TableRow key={p.id}>
                        <TableCell>
                          <ProductThumb src={p.imageUrl} name={p.name} />
                        </TableCell>
                        <TableCell className="font-mono text-xs">{p.sku}</TableCell>
                        <TableCell className="font-medium">{p.name}</TableCell>
                        <TableCell><Badge variant="outline">{p.category || "—"}</Badge></TableCell>
                        <TableCell className="text-right tabular-nums">{currency(p.salePrice)}</TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground">{currency(p.costPrice)}</TableCell>
                        <TableCell className="text-right tabular-nums">{p.taxRate}%</TableCell>
                        <TableCell className="text-right">
                          <span className={`inline-flex items-center gap-1.5 tabular-nums font-medium ${low ? "text-amber-600" : ""}`}>
                            {low && <AlertTriangle className="h-3 w-3" />}
                            {number(p.stockQty)} {p.unit}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(p)}>
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-600" onClick={() => del(p)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}