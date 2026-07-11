import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/guard";
import { db } from "@/lib/db";

async function requireSuperAdmin() {
  const session = await getSessionUser();
  if (!session?.user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const user = session.user as any;
  if (!user.isSuperAdmin) return NextResponse.json({ error: "Accès réservé" }, { status: 403 });
  return { user };
}

function n(v: any): number {
  return Number(v ?? 0);
}

/**
 * Identifie les CashEntry en double : des paiements de facture (INVOICE_PAYMENT)
 * pour des factures générées depuis une vente/achat déjà encaissé à la confirmation
 * (saleId ou purchaseId renseigné). L'argent a alors été compté deux fois.
 */
async function findDuplicates() {
  const suspectInvoices = await db.invoice.findMany({
    where: {
      OR: [{ saleId: { not: null } }, { purchaseId: { not: null } }],
    },
    select: { id: true, number: true, tenantId: true, total: true, saleId: true, purchaseId: true },
  });
  const invoiceIds = suspectInvoices.map((i) => i.id);
  if (invoiceIds.length === 0) return { duplicateCashEntries: [], affectedInvoiceMap: new Map() };

  const duplicateCashEntries = await db.cashEntry.findMany({
    where: {
      source: "INVOICE_PAYMENT",
      invoiceId: { in: invoiceIds },
    },
  });

  const affectedInvoiceMap = new Map(suspectInvoices.map((i) => [i.id, i]));
  return { duplicateCashEntries, affectedInvoiceMap };
}

// GET — aperçu, ne modifie rien.
export async function GET(req: Request) {
  const g = await requireSuperAdmin();
  if (g instanceof NextResponse) return g;

  const { duplicateCashEntries, affectedInvoiceMap } = await findDuplicates();

  const preview = duplicateCashEntries.map((c) => {
    const inv = affectedInvoiceMap.get(c.invoiceId!);
    return {
      cashEntryId: c.id,
      tenantId: c.tenantId,
      reference: c.reference,
      amount: n(c.amount),
      invoiceNumber: inv?.number,
      date: c.date,
    };
  });

  const totalAmount = preview.reduce((s, p) => s + p.amount, 0);
  const tenantsAffected = new Set(preview.map((p) => p.tenantId)).size;

  return NextResponse.json({
    count: preview.length,
    tenantsAffected,
    totalAmount,
    items: preview,
  });
}

// POST — exécute réellement le nettoyage (idempotent : relancer ne fait rien de plus si déjà nettoyé).
export async function POST(req: Request) {
  const g = await requireSuperAdmin();
  if (g instanceof NextResponse) return g;

  const { duplicateCashEntries } = await findDuplicates();

  if (duplicateCashEntries.length === 0) {
    return NextResponse.json({ ok: true, removed: 0, message: "Aucun doublon trouvé." });
  }

  const tenantIds = Array.from(new Set(duplicateCashEntries.map((c) => c.tenantId)));
  let totalRemoved = 0;

  for (const tenantId of tenantIds) {
    const tenantDuplicates = duplicateCashEntries.filter((c) => c.tenantId === tenantId);
    const duplicateInvoiceIds = tenantDuplicates.map((c) => c.invoiceId!).filter(Boolean);
    const duplicateIds = tenantDuplicates.map((c) => c.id);

    await db.$transaction(
      async (tx) => {
        // 1. Supprime les écritures comptables liées à ces paiements en double
        await tx.journalEntryLine.deleteMany({
          where: { journalEntry: { tenantId, source: "INVOICE", sourceId: { in: duplicateInvoiceIds } } },
        });
        await tx.journalEntry.deleteMany({
          where: { tenantId, source: "INVOICE", sourceId: { in: duplicateInvoiceIds } },
        });

        // 2. Supprime les entrées de caisse en double
        await tx.cashEntry.deleteMany({ where: { id: { in: duplicateIds } } });

        // 3. Recalcule le solde courant (balanceAfter) de toute la caisse du tenant,
        //    puisque la suppression a cassé la chaîne des soldes cumulés.
        const remaining = await tx.cashEntry.findMany({
          where: { tenantId },
          orderBy: [{ date: "asc" }, { createdAt: "asc" }],
        });
        let running = 0;
        for (const entry of remaining) {
          running += entry.type === "IN" ? n(entry.amount) : -n(entry.amount);
          await tx.cashEntry.update({
            where: { id: entry.id },
            data: { balanceAfter: Math.round(running * 100) / 100 },
          });
        }

        await tx.auditLog.create({
          data: {
            tenantId,
            userId: null,
            userName: "Système",
            action: "CASH_DUPLICATES_CLEANED",
            entity: "CashEntry",
            details: `${tenantDuplicates.length} entrée(s) de caisse en double supprimée(s) suite à correction du bug facture auto-payée. Solde recalculé.`,
          },
        });
      },
      { timeout: 30000, maxWait: 15000 }
    );

    totalRemoved += tenantDuplicates.length;
  }

  return NextResponse.json({ ok: true, removed: totalRemoved, tenantsAffected: tenantIds.length });
}