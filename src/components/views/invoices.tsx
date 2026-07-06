"use client";

import { useState } from "react";
import { useList, useInvoiceAction } from "@/hooks/use-data";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, FileText, Wallet, XCircle, Download } from "lucide-react";
import { currency, dateTimeShort, dateShort, StatusBadge } from "@/lib/format";
import { toast } from "sonner";
import { sharePdf } from "@/lib/share-pdf";
import { Share2 } from "lucide-react";

export function InvoicesView() {
  const [search, setSearch] = useState("");
  const { data, isLoading, refetch } = useList("invoices", search);
  const actionM = useInvoiceAction();
  const [payInv, setPayInv] = useState<any>(null);
  const [payAmount, setPayAmount] = useState(0);

  function openPay(inv: any) {
    setPayInv(inv);
    setPayAmount(Math.round((inv.total - inv.paidAmount) * 100) / 100);
  }
  async function submitPay() {
    if (!payInv) return;
    if (!payAmount || payAmount <= 0) { toast.error("Montant invalide"); return; }
    try {
      await actionM.mutateAsync({ id: payInv.id, action: "pay", amount: payAmount });
      setPayInv(null);
      refetch();
    } catch {}
  }
  async function cancel(id: string) {
    if (!confirm("Annuler cette facture ?")) return;
    await actionM.mutateAsync({ id, action: "cancel" });
    refetch();
  }

  const items = data?.items ?? [];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Facturation</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Factures clients (FAC) et fournisseurs (FF). Le règlement met à jour la caisse et le journal en une transaction.
        </p>
      </div>

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="relative max-w-md">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Rechercher par numéro, tiers…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          {isLoading ? (
            <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
          ) : items.length === 0 ? (
            <div className="py-16 text-center"><FileText className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" /><p className="text-sm text-muted-foreground">Aucune facture. Générez-en depuis une vente ou un achat confirmé.</p></div>
          ) : (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Numéro</TableHead><TableHead>Type</TableHead><TableHead>Tiers</TableHead>
                    <TableHead>Émission</TableHead><TableHead>Échéance</TableHead>
                    <TableHead className="text-right">Total</TableHead><TableHead className="text-right">Réglé</TableHead>
                    <TableHead className="text-right">Reste</TableHead><TableHead>Statut</TableHead><TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((inv: any) => {
                    const remaining = Math.round((inv.total - inv.paidAmount) * 100) / 100;
                    return (
                      <TableRow key={inv.id}>
                        <TableCell className="font-mono text-xs">{inv.number}</TableCell>
                        <TableCell>
                          <span className={`text-xs px-1.5 py-0.5 rounded ${inv.type === "CUSTOMER" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"}`}>
                            {inv.type === "CUSTOMER" ? "Client" : "Fournisseur"}
                          </span>
                        </TableCell>
                        <TableCell className="font-medium">{inv.partyName}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{dateShort(inv.issueDate)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{inv.dueDate ? dateShort(inv.dueDate) : "—"}</TableCell>
                        <TableCell className="text-right tabular-nums">{currency(inv.total)}</TableCell>
                        <TableCell className="text-right tabular-nums text-emerald-600">{currency(inv.paidAmount)}</TableCell>
                        <TableCell className="text-right tabular-nums font-medium">{currency(remaining)}</TableCell>
                        <TableCell><StatusBadge status={inv.status} /></TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button size="sm" variant="ghost" onClick={() => window.open(`/api/invoices/${inv.id}/pdf`, "_blank")} title="Télécharger PDF">
                              <Download className="h-3.5 w-3.5" />
                            </Button>
                            <Button
  size="sm"
  variant="ghost"
  title="Envoyer via WhatsApp"
  onClick={() =>
    sharePdf({
      url: `/api/invoices/${inv.id}/pdf`,
      filename: `${inv.number}.pdf`,
      title: `Facture ${inv.number}`,
      message: `Bonjour, voici votre facture ${inv.number} d'un montant de ${inv.total} FCFA. Merci pour votre confiance.`,
    })
  }
>
  <Share2 className="h-3.5 w-3.5" />
</Button>
                            {["UNPAID", "PARTIAL"].includes(inv.status) && (
                              <Button size="sm" variant="outline" onClick={() => openPay(inv)}><Wallet className="h-3.5 w-3.5 mr-1" /> Régler</Button>
                            )}
                            {["UNPAID", "PARTIAL"].includes(inv.status) && (
                              <Button size="sm" variant="ghost" className="text-rose-600" onClick={() => cancel(inv.id)}><XCircle className="h-3.5 w-3.5" /></Button>
                            )}
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

      <Dialog open={!!payInv} onOpenChange={(v) => !v && setPayInv(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Régler la facture {payInv?.number}</DialogTitle></DialogHeader>
          {payInv && (
            <div className="space-y-3">
              <div className="rounded-md bg-muted/50 p-3 text-sm space-y-1">
                <div className="flex justify-between"><span className="text-muted-foreground">Tiers</span><span className="font-medium">{payInv.partyName}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Total</span><span>{currency(payInv.total)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Déjà réglé</span><span className="text-emerald-600">{currency(payInv.paidAmount)}</span></div>
                <div className="flex justify-between border-t mt-1 pt-1"><span className="text-muted-foreground">Reste à payer</span><span className="font-bold">{currency(payInv.total - payInv.paidAmount)}</span></div>
              </div>
              <div className="space-y-1.5">
                <Label>Montant du règlement (FCFA)</Label>
                <Input type="number" step="0.01" value={payAmount} onChange={(e) => setPayAmount(Number(e.target.value))} />
              </div>
              <p className="text-xs text-muted-foreground">
                Cette opération : enregistre une entrée/sortie caisse + écrit le journal comptable + met à jour le statut de la facture — le tout dans une seule transaction atomique.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPayInv(null)}>Annuler</Button>
            <Button onClick={submitPay} disabled={actionM.isPending}><Wallet className="h-4 w-4 mr-2" /> Enregistrer le règlement</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
