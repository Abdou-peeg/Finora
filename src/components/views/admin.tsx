"use client";

import { useState } from "react";
import { useUsers, useCreateUser, useUpdateUser, useDeleteUser } from "@/hooks/use-data";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Shield, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Administrateur",
  COMPTABLE: "Comptable",
  VENDEUR: "Vendeur",
  STOCK_MANAGER: "Gestionnaire de stock",
};
const ROLE_COLORS: Record<string, string> = {
  ADMIN: "bg-emerald-500",
  COMPTABLE: "bg-teal-500",
  VENDEUR: "bg-lime-500",
  STOCK_MANAGER: "bg-cyan-500",
};
const EMPTY = { email: "", name: "", password: "", role: "VENDEUR", active: true };

export function AdminView() {
  const { data, isLoading } = useUsers();
  const createM = useCreateUser();
  const updateM = useUpdateUser();
  const deleteM = useDeleteUser();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<any>(EMPTY);

  function openCreate() { setEditing(null); setForm(EMPTY); setOpen(true); }
  function openEdit(u: any) {
    setEditing(u);
    setForm({ ...u, password: "" });
    setOpen(true);
  }
  async function submit() {
    if (!form.email || !form.name) { toast.error("Email et nom requis"); return; }
    if (editing) await updateM.mutateAsync(form);
    else {
      if (!form.password) { toast.error("Mot de passe requis"); return; }
      await createM.mutateAsync(form);
    }
    setOpen(false);
  }
  async function del(u: any) {
    if (!confirm(`Supprimer l'utilisateur ${u.email} ?`)) return;
    await deleteM.mutateAsync(u.id);
  }

  const items = data?.items ?? [];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Administration</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Gestion des utilisateurs, rôles et permissions. Quatre rôles prédéfinis avec permissions granulaires par module.
          </p>
        </div>
        <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" /> Nouvel utilisateur</Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{editing ? "Modifier l'utilisateur" : "Nouvel utilisateur"}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5"><Label>Nom complet *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="space-y-1.5"><Label>Email *</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div className="space-y-1.5">
              <Label>Rôle</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(ROLE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>{editing ? "Nouveau mot de passe (laisser vide pour ne pas changer)" : "Mot de passe *"}</Label><Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
            <div className="flex items-center gap-2">
              <Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} id="active" />
              <Label htmlFor="active">Compte actif</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Annuler</Button>
            <Button onClick={submit} disabled={createM.isPending || updateM.isPending}>{editing ? "Mettre à jour" : "Créer"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardContent className="p-4 space-y-3">
          {isLoading ? (
            <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
          ) : items.length === 0 ? (
            <div className="py-16 text-center"><Shield className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" /><p className="text-sm text-muted-foreground">Aucun utilisateur.</p></div>
          ) : (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Utilisateur</TableHead><TableHead>Email</TableHead><TableHead>Rôle</TableHead>
                    <TableHead>Statut</TableHead><TableHead>Créé le</TableHead><TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((u: any) => (
                    <TableRow key={u.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className={`h-7 w-7 rounded-full ${ROLE_COLORS[u.role]} text-white text-xs font-semibold flex items-center justify-center`}>
                            {u.name.split(" ").map((s: string) => s[0]).slice(0, 2).join("")}
                          </div>
                          <span className="font-medium">{u.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{u.email}</TableCell>
                      <TableCell><Badge variant="outline">{ROLE_LABELS[u.role]}</Badge></TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center gap-1 text-xs ${u.active ? "text-emerald-600" : "text-muted-foreground"}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${u.active ? "bg-emerald-500" : "bg-slate-400"}`} />
                          {u.active ? "Actif" : "Inactif"}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{new Date(u.createdAt).toLocaleDateString("fr-FR")}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(u)}><Pencil className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-rose-600" onClick={() => del(u)}><Trash2 className="h-3.5 w-3.5" /></Button>
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

      <Card>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
            <div className="text-sm space-y-2">
              <p className="font-medium">Matrice des permissions par rôle</p>
              <ul className="text-xs text-muted-foreground space-y-1 list-disc pl-4">
                <li><strong>Administrateur</strong> — accès complet à tous les modules</li>
                <li><strong>Comptable</strong> — comptabilité, facturation, trésorerie, caisse, rapports, audit (lecture sur ventes/achats)</li>
                <li><strong>Vendeur</strong> — ventes (CRUD), clients (CRUD), lecture produits et caisse</li>
                <li><strong>Gestionnaire de stock</strong> — produits (CRUD), achats (CRUD), fournisseurs (CRUD), lecture ventes</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
