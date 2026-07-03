import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/guard";
import { db } from "@/lib/db";
import { generatePdfDoc } from "@/lib/pdf-generator";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const g = await requirePermission(req, "facturation:view");
  if (g instanceof NextResponse) return g;
  const { tenantId } = g.user;
  const inv = await db.invoice.findFirst({
    where: { id, tenantId },
    include: {
      tenant: true,
      sale: { include: { items: { include: { product: true } } } },
      purchase: { include: { items: { include: { product: true } } } },
    },
  });
  if (!inv) return NextResponse.json({ error: "Facture introuvable" }, { status: 404 });
  const settings = await db.companySettings.findUnique({ where: { tenantId } });

  // For supplier invoice, party = supplier; for customer invoice, party = customer
  let party: any;
  if (inv.type === "CUSTOMER") {
    const customer = await db.customer.findFirst({ where: { id: inv.partyId, tenantId } });
    party = customer || { name: inv.partyName };
  } else {
    const supplier = await db.supplier.findFirst({ where: { id: inv.partyId, tenantId } });
    party = supplier || { name: inv.partyName };
  }

  const linesSource = inv.sale?.items || inv.purchase?.items || [];
  const lines = linesSource.map((it: any) => ({
    sku: it.product?.sku,
    name: it.product?.name || "—",
    qty: Number(it.qty),
    unitPrice: Number(it.unitPrice),
    taxRate: Number(it.taxRate),
    lineTotal: Number(it.lineTotal),
  }));

  const pdf = await generatePdfDoc({
    tenant: inv.tenant,
    settings,
    documentType: "FACTURE",
    documentNumber: inv.number,
    documentDate: inv.issueDate,
    dueDate: inv.dueDate,
    party: {
      name: party.name,
      address: party.address,
      city: party.city,
      country: party.country,
      phone: party.phone,
      email: party.email,
      taxId: party.taxId,
    },
    lines,
    subtotal: Number(inv.subtotal),
    taxTotal: Number(inv.taxTotal),
    total: Number(inv.total),
    notes: inv.sale?.notes || inv.purchase?.notes,
    status: inv.status,
  });

  return new NextResponse(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${inv.number}.pdf"`,
      "Content-Length": String(pdf.length),
    },
  });
}
