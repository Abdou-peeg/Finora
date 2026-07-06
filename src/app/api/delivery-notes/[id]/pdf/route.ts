import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/guard";
import { db } from "@/lib/db";
import { safeError } from "@/lib/errors";
import { generatePdfDoc } from "@/lib/pdf-generator";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const g = await requirePermission(req, "bons:view");
  if (g instanceof NextResponse) return g;
  const { tenantId } = g.user;
  const dn = await db.deliveryNote.findFirst({
    where: { id, tenantId },
    include: { customer: true, items: { include: { product: true } }, tenant: true },
  });
  if (!dn) return NextResponse.json({ error: "Bon de livraison introuvable" }, { status: 404 });
  const settings = await db.companySettings.findUnique({ where: { tenantId } });

  const lines = dn.items.map((it: any) => ({
    sku: it.product?.sku,
    name: it.product?.name || "—",
    description: it.description,
    qty: Number(it.qty),
    unitPrice: 0,
    taxRate: 0,
    lineTotal: 0,
  }));

  const pdf = await generatePdfDoc({
    tenant: dn.tenant,
    settings,
    documentType: "BON_LIVRAISON",
    documentNumber: dn.number,
    documentDate: dn.date,
    party: {
      name: dn.customer.name,
      address: dn.customer.address,
      city: dn.customer.city,
      country: dn.customer.country,
      phone: dn.customer.phone,
      email: dn.customer.email,
      taxId: dn.customer.taxId,
    },
    lines,
    subtotal: 0,
    taxTotal: 0,
    total: 0,
    notes: dn.notes,
    receivedBy: dn.receivedBy,
    status: dn.status,
  });

  return new NextResponse(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${dn.number}.pdf"`,
      "Content-Length": String(pdf.length),
    },
  });
}
