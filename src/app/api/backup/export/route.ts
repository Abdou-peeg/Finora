import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/guard";
import { db } from "@/lib/db";

// Format version — bump this if the shape of the export ever changes,
// so a future import route can detect and reject incompatible backups.
const BACKUP_VERSION = 1;

export async function GET(req: Request) {
  const g = await requirePermission(req, "admin:users");
  if (g instanceof NextResponse) return g;
  const { tenantId, name } = g.user;

  const [
    companySettings,
    accounts,
    products,
    customers,
    suppliers,
    quotes,
    quoteItems,
    purchaseOrders,
    purchaseOrderItems,
    sales,
    saleItems,
    purchases,
    purchaseItems,
    deliveryNotes,
    deliveryNoteItems,
    invoices,
    cashEntries,
    journalEntries,
    journalEntryLines,
    auditLogs,
  ] = await Promise.all([
    db.companySettings.findUnique({ where: { tenantId } }),
    db.account.findMany({ where: { tenantId } }),
    db.product.findMany({ where: { tenantId } }),
    db.customer.findMany({ where: { tenantId } }),
    db.supplier.findMany({ where: { tenantId } }),
    db.quote.findMany({ where: { tenantId } }),
    db.quoteItem.findMany({ where: { quote: { tenantId } } }),
    db.purchaseOrder.findMany({ where: { tenantId } }),
    db.purchaseOrderItem.findMany({ where: { purchaseOrder: { tenantId } } }),
    db.sale.findMany({ where: { tenantId } }),
    db.saleItem.findMany({ where: { sale: { tenantId } } }),
    db.purchase.findMany({ where: { tenantId } }),
    db.purchaseItem.findMany({ where: { purchase: { tenantId } } }),
    db.deliveryNote.findMany({ where: { tenantId } }),
    db.deliveryNoteItem.findMany({ where: { deliveryNote: { tenantId } } }),
    db.invoice.findMany({ where: { tenantId } }),
    db.cashEntry.findMany({ where: { tenantId } }),
    db.journalEntry.findMany({ where: { tenantId } }),
    db.journalEntryLine.findMany({ where: { journalEntry: { tenantId } } }),
    db.auditLog.findMany({ where: { tenantId } }),
  ]);

  const backup = {
    backupVersion: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    sourceTenantId: tenantId,
    data: {
      companySettings,
      accounts,
      products,
      customers,
      suppliers,
      quotes,
      quoteItems,
      purchaseOrders,
      purchaseOrderItems,
      sales,
      saleItems,
      purchases,
      purchaseItems,
      deliveryNotes,
      deliveryNoteItems,
      invoices,
      cashEntries,
      journalEntries,
      journalEntryLines,
      auditLogs,
    },
  };

  await db.auditLog.create({
    data: {
      tenantId,
      userId: g.user.id,
      userName: name,
      action: "BACKUP_EXPORTED",
      entity: "Tenant",
      entityId: tenantId,
      details: `Export complet des données effectué par ${name}.`,
    },
  });

  const json = JSON.stringify(backup, null, 2);
  const filename = `finora-sauvegarde-${new Date().toISOString().slice(0, 10)}.json`;

  return new NextResponse(json, {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}