"use client";

import { useState } from "react";
import { usePlatformTenants, useUpdateTenantSubscription } from "@/hooks/use-platform";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, Plus, Ban, CheckCircle2 } from "lucide-react";

function StatusPill({ tenant }: { tenant: any }) {
  const expired = tenant.subscriptionExpiresAt && new Date(tenant.subscriptionExpiresAt) < new Date();
  const blocked = tenant.subscriptionStatus === "desactive" || expired;
  if (blocked) {
    return (
      <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 font-medium">
        <Ban className="h-3 w-3" /> Bloqué
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 font-medium">
      <CheckCircle2 className="h-3 w-3" /> Actif
    </span>
  );
}

export function PlatformView() {
  const { data, isLoading } = usePlatformTenants();
  const updateM = useUpdateTenantSubscription();
  const [editing, setEditing] = useState<any>(null);
  const [extendDays, setExtendDays] = useState(30);
  const [customDate, setCustomDate] = useState("");
  const [status, setStatus] = useState("active");

  function openEdit(t: any) {
    setEditing(t);
    setStatus(t.subscriptionStatus || "active");
    setCustomDate(t.subscriptionExpiresAt ? new Date(t.subscriptionExpiresAt).toISOString().slice(0, 10) : "");
    setExtendDays(30);
  }

  async function applyExtend() {
    await updateM.mutateAsync({ id: editing.id, extendDays, subscriptionStatus: "active" });
    setEditing(null);
  }
  async function applyCustomDate() {
    await updateM.mutateAsync({
      id: editing.id,
      subscriptionExpiresAt: customDate ? customDate : null,
      subscriptionStatus: status,
    });
    setEditing(null);
  }
  async function toggleBlock(t: any) {
    const nextStatus = t.subscriptionStatus === "desactive" ? "active" : "desactive";
    await updateM.mutateAsync({ id: t.id, subscriptionStatus: nextStatus });
  }

  const items = data?.items ?? [];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Plateforme — Clients Finora</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Vue réservée au super-administrateur. Gérez l'accès et l'abonnement de chaque entreprise cliente.
        </p>
      </div>

      <Card>
        <CardContent className="p-4 space-y-3">
          {isLoading ? (
            <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
          ) : items.length === 0 ? (
            <div className="py-16 text-center">
              <Building2 className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">Aucun client pour l'instant.</p>
            </div>
          ) : (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Entreprise</TableHead>
                    <TableHead>Administrateur</TableHead>
                    <TableHead>Inscrit le</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Expire le</TableHead>
                    <TableHead className="text-right">Ventes</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((t: any) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">{t.name}</TableCell>
                      <TableCell className="text-sm">
                        <div>{t.adminName || "—"}</div>
                        <div className="text-xs text-muted-foreground">{t.adminEmail}</div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(t.createdAt).toLocaleDateString("fr-FR")}
                      </TableCell>
                      <TableCell><StatusPill tenant={t} /></TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {t.subscriptionExpiresAt ? new Date(t.subscriptionExpiresAt).toLocaleDateString("fr-FR") : "Illimité"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-sm">{t.salesCount}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="outline" onClick={() => openEdit(t)}>
                            <Plus className="h-3.5 w-3.5 mr-1" /> Gérer
                          </Button>
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

      <Dialog open={!!editing} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Abonnement — {editing?.name}</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-5 py-2">
              <div className="rounded-lg border p-3 space-y-3">
                <p className="text-sm font-medium">Prolonger rapidement</p>
                <div className="flex items-end gap-2">
                  <div className="flex-1 space-y-1.5">
                    <Label>Nombre de jours</Label>
                    <Input type="number" value={extendDays} onChange={(e) => setExtendDays(Number(e.target.value))} />
                  </div>
                  <Button onClick={applyExtend} disabled={updateM.isPending}>Ajouter</Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  S'ajoute à la date d'expiration actuelle (ou à partir d'aujourd'hui si déjà expirée).
                </p>
              </div>

              <div className="rounded-lg border p-3 space-y-3">
                <p className="text-sm font-medium">Réglage manuel</p>
                <div className="space-y-1.5">
                  <Label>Statut</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Actif</SelectItem>
                      <SelectItem value="desactive">Désactivé (bloqué immédiatement)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Date d'expiration (laisser vide = illimité)</Label>
                  <Input type="date" value={customDate} onChange={(e) => setCustomDate(e.target.value)} />
                </div>
                <Button variant="outline" className="w-full" onClick={applyCustomDate} disabled={updateM.isPending}>
                  Enregistrer ce réglage
                </Button>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}>Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}