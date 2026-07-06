import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/guard";
import { db } from "@/lib/db";
import { safeError } from "@/lib/errors";
import { randomUUID } from "crypto";

const BACKUP_VERSION = 1;

// Génère un nouvel id unique et mémorise la correspondance old -> new
// pour pouvoir remapper les clés étrangères des enregistrements enfants.
function makeRemapper() {
  const map = new Map<string, string>();
  return {
    get(oldId: string | null | undefined): string | null {
      if (!oldId) return null as any;
      if (!map.has(oldId)) map.set(oldId, randomUUID());
      return map.get(oldId)!;
    },
  };
}

export async function POST(req: Request) {
  const g = await requirePermission(req, "admin:users");
  if (g instanceof NextResponse) return g;
  const { tenantId, name } = g.user;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Fichier JSON invalide" }, { status: 400 });
  }

  if (!body?.data || body?.backupVersion !== BACKUP_VERSION) {
    return NextResponse.json(
      { error: "Format de sauvegarde non reconnu ou version incompatible" },
      { status: 400 }
    );
  }

  const d = body.data;

  // Une table de correspondance old-id -> new-id par type d'entité, pour que
  // toutes les relations (customerId, saleId, accountId, etc.) restent cohérentes
  // même si les IDs d'origine existent déjà ailleurs en base (autre tenant).
  const accountIds = makeRemapper();
  const productIds = makeRemapper();
  const customerIds = makeRemapper();
  const supplierIds = makeRemapper();
  const quoteIds = makeRemapper();
  const purchaseOrderIds = makeRemapper();
  const saleIds = makeRemapper();
  const purchaseIds = makeRemapper();
  const deliveryNoteIds = makeRemapper();
  const invoiceIds = makeRemapper();
  const journalEntryIds = makeRemapper();

  try {
    await db.$transaction(
      async (tx) => {
        // ── 1. WIPE — données actuelles du tenant cible uniquement ──
        await tx.journalEntryLine.deleteMany({ where: { journalEntry: { tenantId } } });
        await tx.journalEntry.deleteMany({ where: { tenantId } });
        await tx.cashEntry.deleteMany({ where: { tenantId } });
        await tx.invoice.deleteMany({ where: { tenantId } });
        await tx.deliveryNoteItem.deleteMany({ where: { deliveryNote: { tenantId } } });
        await tx.deliveryNote.deleteMany({ where: { tenantId } });
        await tx.saleItem.deleteMany({ where: { sale: { tenantId } } });
        await tx.sale.deleteMany({ where: { tenantId } });
        await tx.purchaseItem.deleteMany({ where: { purchase: { tenantId } } });
        await tx.purchase.deleteMany({ where: { tenantId } });
        await tx.quoteItem.deleteMany({ where: { quote: { tenantId } } });
        await tx.quote.deleteMany({ where: { tenantId } });
        await tx.purchaseOrderItem.deleteMany({ where: { purchaseOrder: { tenantId } } });
        await tx.purchaseOrder.deleteMany({ where: { tenantId } });
        await tx.stockMovement.deleteMany({ where: { tenantId } });
        await tx.product.deleteMany({ where: { tenantId } });
        await tx.customer.deleteMany({ where: { tenantId } });
        await tx.supplier.deleteMany({ where: { tenantId } });
        await tx.account.deleteMany({ where: { tenantId } });
        await tx.auditLog.deleteMany({ where: { tenantId } });
        await tx.companySettings.deleteMany({ where: { tenantId } });

        // ── 2. RESTORE — avec IDs régénérés et relations remappées ──

        if (d.companySettings) {
          const { id, tenantId: _t, createdAt, updatedAt, ...rest } = d.companySettings;
          await tx.companySettings.create({ data: { ...rest, tenantId } });
        }

        if (d.accounts?.length) {
          await tx.account.createMany({
            data: d.accounts.map((a: any) => ({
              ...a,
              id: accountIds.get(a.id),
              tenantId,
            })),
          });
        }

        if (d.products?.length) {
          await tx.product.createMany({
            data: d.products.map((p: any) => ({
              ...p,
              id: productIds.get(p.id),
              tenantId,
            })),
          });
        }

        if (d.customers?.length) {
          await tx.customer.createMany({
            data: d.customers.map((c: any) => ({
              ...c,
              id: customerIds.get(c.id),
              tenantId,
            })),
          });
        }

        if (d.suppliers?.length) {
          await tx.supplier.createMany({
            data: d.suppliers.map((s: any) => ({
              ...s,
              id: supplierIds.get(s.id),
              tenantId,
            })),
          });
        }

        if (d.quotes?.length) {
          await tx.quote.createMany({
            data: d.quotes.map((q: any) => ({
              ...q,
              id: quoteIds.get(q.id),
              tenantId,
              customerId: customerIds.get(q.customerId),
              userId: null,
            })),
          });
        }
        if (d.quoteItems?.length) {
          await tx.quoteItem.createMany({
            data: d.quoteItems.map((qi: any) => ({
              ...qi,
              id: undefined,
              quoteId: quoteIds.get(qi.quoteId),
              productId: productIds.get(qi.productId),
            })),
          });
        }

        if (d.purchaseOrders?.length) {
          await tx.purchaseOrder.createMany({
            data: d.purchaseOrders.map((po: any) => ({
              ...po,
              id: purchaseOrderIds.get(po.id),
              tenantId,
              supplierId: supplierIds.get(po.supplierId),
              userId: null,
            })),
          });
        }
        if (d.purchaseOrderItems?.length) {
          await tx.purchaseOrderItem.createMany({
            data: d.purchaseOrderItems.map((poi: any) => ({
              ...poi,
              id: undefined,
              purchaseOrderId: purchaseOrderIds.get(poi.purchaseOrderId),
              productId: productIds.get(poi.productId),
            })),
          });
        }

        if (d.sales?.length) {
          await tx.sale.createMany({
            data: d.sales.map((s: any) => ({
              ...s,
              id: saleIds.get(s.id),
              tenantId,
              customerId: customerIds.get(s.customerId),
              quoteId: s.quoteId ? quoteIds.get(s.quoteId) : null,
              userId: null,
            })),
          });
        }
        if (d.saleItems?.length) {
          await tx.saleItem.createMany({
            data: d.saleItems.map((si: any) => ({
              ...si,
              id: undefined,
              saleId: saleIds.get(si.saleId),
              productId: productIds.get(si.productId),
            })),
          });
        }

        if (d.purchases?.length) {
          await tx.purchase.createMany({
            data: d.purchases.map((p: any) => ({
              ...p,
              id: purchaseIds.get(p.id),
              tenantId,
              supplierId: supplierIds.get(p.supplierId),
              purchaseOrderId: p.purchaseOrderId ? purchaseOrderIds.get(p.purchaseOrderId) : null,
              userId: null,
            })),
          });
        }
        if (d.purchaseItems?.length) {
          await tx.purchaseItem.createMany({
            data: d.purchaseItems.map((pi: any) => ({
              ...pi,
              id: undefined,
              purchaseId: purchaseIds.get(pi.purchaseId),
              productId: productIds.get(pi.productId),
            })),
          });
        }

        if (d.deliveryNotes?.length) {
          await tx.deliveryNote.createMany({
            data: d.deliveryNotes.map((dn: any) => ({
              ...dn,
              id: deliveryNoteIds.get(dn.id),
              tenantId,
              customerId: customerIds.get(dn.customerId),
              saleId: dn.saleId ? saleIds.get(dn.saleId) : null,
              userId: null,
            })),
          });
        }
        if (d.deliveryNoteItems?.length) {
          await tx.deliveryNoteItem.createMany({
            data: d.deliveryNoteItems.map((dni: any) => ({
              ...dni,
              id: undefined,
              deliveryNoteId: deliveryNoteIds.get(dni.deliveryNoteId),
              productId: productIds.get(dni.productId),
            })),
          });
        }

        if (d.invoices?.length) {
          await tx.invoice.createMany({
            data: d.invoices.map((i: any) => ({
              ...i,
              id: invoiceIds.get(i.id),
              tenantId,
              saleId: i.saleId ? saleIds.get(i.saleId) : null,
              purchaseId: i.purchaseId ? purchaseIds.get(i.purchaseId) : null,
            })),
          });
        }

        if (d.cashEntries?.length) {
          await tx.cashEntry.createMany({
            data: d.cashEntries.map((c: any) => ({
              ...c,
              id: undefined,
              tenantId,
              invoiceId: c.invoiceId ? invoiceIds.get(c.invoiceId) : null,
              // sourceId pointe vers une vente/achat/facture selon `source` ;
              // on ne le remappe pas finement (champ informatif, non contraint par FK).
            })),
          });
        }

        if (d.journalEntries?.length) {
          await tx.journalEntry.createMany({
            data: d.journalEntries.map((j: any) => ({
              ...j,
              id: journalEntryIds.get(j.id),
              tenantId,
            })),
          });
        }
        if (d.journalEntryLines?.length) {
          await tx.journalEntryLine.createMany({
            data: d.journalEntryLines.map((jl: any) => ({
              ...jl,
              id: undefined,
              journalEntryId: journalEntryIds.get(jl.journalEntryId),
              accountId: accountIds.get(jl.accountId),
            })),
          });
        }

        // Logs d'audit historiques : conservés à titre informatif, sans lien
        // vers un utilisateur précis (les comptes User ne sont jamais restaurés).
        if (d.auditLogs?.length) {
          await tx.auditLog.createMany({
            data: d.auditLogs.map((a: any) => ({
              ...a,
              id: undefined,
              tenantId,
              userId: null,
            })),
          });
        }

        await tx.auditLog.create({
          data: {
            tenantId,
            userId: g.user.id,
            userName: name,
            action: "BACKUP_IMPORTED",
            entity: "Tenant",
            entityId: tenantId,
            details: `Restauration complète effectuée par ${name} depuis une sauvegarde du ${body.exportedAt || "?"}.`,
          },
        });
      },
      { timeout: 60000, maxWait: 15000 }
    );

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Échec de la restauration" }, { status: 400 });
  }
}