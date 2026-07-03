import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/guard";
import { db } from "@/lib/db";
import { generatePdfDoc } from "@/lib/pdf-generator";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const g = await requirePermission(req, "bons:view");
  if (g instanceof NextResponse) return g;
  const { tenantId } = g.user;
  const po = await db.purchaseOrder.findFirst({
    where: { id, tenantId },
    include: { supplier: true, items: { include: { product: true } }, tenant: true },
  });
  if (!po) return NextResponse.json({ error: "Bon de commande introuvable" }, { status: 404 });
  const settings = await db.companySettings.findUnique({ where: { tenantId } });

  const lines = po.items.map((it: any) => ({
    sku: it.product?.sku,
    name: it.product?.name || "—",
    qty: Number(it.qty),
    unitPrice: Number(it.unitPrice),
    taxRate: Number(it.taxRate),
    lineTotal: Number(it.lineTotal),
  }));

  const pdf = await generatePdfDoc({
    tenant: po.tenant,
    settings,
    documentType: "BON_COMMANDE",
    documentNumber: po.number,
    documentDate: po.date,
    expectedDate: po.expectedDate,
    party: {
      name: po.supplier.name,
      address: po.supplier.address,
      city: po.supplier.city,
      country: po.supplier.country,
      phone: po.supplier.phone,
      email: po.supplier.email,
      taxId: po.supplier.taxId,
    },
    lines,
    subtotal: Number(po.subtotal),
    taxTotal: Number(po.taxTotal),
    total: Number(po.total),
    notes: po.notes,
    status: po.status,
  });

  return new NextResponse(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${po.number}.pdf"`,
      "Content-Length": String(pdf.length),
    },
  });
}
