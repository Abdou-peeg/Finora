import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/guard";
import { db } from "@/lib/db";

const BACKUP_VERSION = 1;

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

  try {
    await db.$transaction(
      async (tx) => {
        // ── 1. WIPE — enfants vers parents, dans l'ordre imposé par les FK non-cascadées ──
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

        // ── 2. RESTORE — parents vers enfants, en forçant tenantId = tenant courant ──
        // On conserve les IDs d'origine du fichier pour que toutes les relations
        // internes (customerId, productId, accountId, saleId, etc.) restent valides.

        if (d.companySettings) {
          const { id, tenantId: _t, ...rest } = d.companySettings;
          await tx.companySettings.create({ data: { ...rest, id, tenantId } });
        }

        if (d.accounts?.length) {
          await tx.account.createMany({
            data: d.accounts.map((a: any) => ({ ...a, tenantId })),
            skipDuplicates: true,
          });
        }

        if (d.products?.length) {
          await tx.product.createMany({
            data: d.products.map((p: any) => ({ ...p, tenantId })),
            skipDuplicates: true,
          });
        }

        if (d.customers?.length) {
          await tx.customer.createMany({
            data: d.customers.map((c: any) => ({ ...c, tenantId })),
            skipDuplicates: true,
          });
        }

        if (d.suppliers?.length) {
          await tx.supplier.createMany({
            data: d.suppliers.map((s: any) => ({ ...s, tenantId })),
            skipDuplicates: true,
          });
        }

        if (d.quotes?.length) {
          await tx.quote.createMany({
            data: d.quotes.map((q: any) => ({ ...q, tenantId })),
            skipDuplicates: true,
          });
        }
        if (d.quoteItems?.length) {
          await tx.quoteItem.createMany({ data: d.quoteItems, skipDuplicates: true });
        }

        if (d.purchaseOrders?.length) {
          await tx.purchaseOrder.createMany({
            data: d.purchaseOrders.map((po: any) => ({ ...po, tenantId })),
            skipDuplicates: true,
          });
        }
        if (d.purchaseOrderItems?.length) {
          await tx.purchaseOrderItem.createMany({ data: d.purchaseOrderItems, skipDuplicates: true });
        }

        if (d.sales?.length) {
          await tx.sale.createMany({
            data: d.sales.map((s: any) => ({ ...s, tenantId })),
            skipDuplicates: true,
          });
        }
        if (d.saleItems?.length) {
          await tx.saleItem.createMany({ data: d.saleItems, skipDuplicates: true });
        }

        if (d.purchases?.length) {
          await tx.purchase.createMany({
            data: d.purchases.map((p: any) => ({ ...p, tenantId })),
            skipDuplicates: true,
          });
        }
        if (d.purchaseItems?.length) {
          await tx.purchaseItem.createMany({ data: d.purchaseItems, skipDuplicates: true });
        }

        if (d.deliveryNotes?.length) {
          await tx.deliveryNote.createMany({
            data: d.deliveryNotes.map((dn: any) => ({ ...dn, tenantId })),
            skipDuplicates: true,
          });
        }
        if (d.deliveryNoteItems?.length) {
          await tx.deliveryNoteItem.createMany({ data: d.deliveryNoteItems, skipDuplicates: true });
        }

        if (d.invoices?.length) {
          await tx.invoice.createMany({
            data: d.invoices.map((i: any) => ({ ...i, tenantId })),
            skipDuplicates: true,
          });
        }

        if (d.cashEntries?.length) {
          await tx.cashEntry.createMany({
            data: d.cashEntries.map((c: any) => ({ ...c, tenantId })),
            skipDuplicates: true,
          });
        }

        if (d.journalEntries?.length) {
          await tx.journalEntry.createMany({
            data: d.journalEntries.map((j: any) => ({ ...j, tenantId })),
            skipDuplicates: true,
          });
        }
        if (d.journalEntryLines?.length) {
          await tx.journalEntryLine.createMany({ data: d.journalEntryLines, skipDuplicates: true });
        }

        // Les logs d'audit historiques sont restaurés mais rattachés à aucun
        // utilisateur précis (les comptes User ne font pas partie de la sauvegarde,
        // pour éviter les conflits d'email uniques entre comptes).
        if (d.auditLogs?.length) {
          await tx.auditLog.createMany({
            data: d.auditLogs.map((a: any) => ({ ...a, tenantId, userId: null })),
            skipDuplicates: true,
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
            details: `Restauration complète effectuée par ${name} depuis une sauvegarde du ${d ? body.exportedAt : "?"}.`,
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