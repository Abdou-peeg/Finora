import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/guard";
import { db } from "@/lib/db";
import { generatePdfDoc } from "@/lib/pdf-generator";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const g = await requirePermission(req, "devis:view");
  if (g instanceof NextResponse) return g;
  const { tenantId } = g.user;

  const quote = await db.quote.findFirst({
    where: { id, tenantId },
    include: {
      customer: true,
      items: { include: { product: true } },
      tenant: true,
    },
  });
  if (!quote) return NextResponse.json({ error: "Devis introuvable" }, { status: 404 });

  const settings = await db.companySettings.findUnique({ where: { tenantId } });

  const lines = quote.items.map((it: any) => ({
    sku: it.product?.sku,
    name: it.product?.name || "—",
    qty: Number(it.qty),
    unitPrice: Number(it.unitPrice),
    taxRate: Number(it.taxRate),
    lineTotal: Number(it.lineTotal),
  }));

  const pdf = await generatePdfDoc({
    tenant: quote.tenant,
    settings,
    documentType: "DEVIS",
    documentNumber: quote.number,
    documentDate: quote.date,
    validUntil: quote.validUntil,
    party: {
      name: quote.customer.name,
      address: quote.customer.address,
      city: quote.customer.city,
      country: quote.customer.country,
      phone: quote.customer.phone,
      email: quote.customer.email,
      taxId: quote.customer.taxId,
    },
    lines,
    subtotal: Number(quote.subtotal),
    taxTotal: Number(quote.taxTotal),
    total: Number(quote.total),
    notes: quote.notes,
    status: quote.status,
  });

  return new NextResponse(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${quote.number}.pdf"`,
      "Content-Length": String(pdf.length),
    },
  });
}
