import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/guard";
import { db } from "@/lib/db";
import { safeError } from "@/lib/errors";
import { generateTextPdfDoc } from "@/lib/pdf-generator";

export async function POST(req: Request) {
  const g = await requirePermission(req);
  if (g instanceof NextResponse) return g;
  const { tenantId } = g.user;

  const body = await req.json();
  const { title, content } = body;
  if (!content) return NextResponse.json({ error: "Contenu requis" }, { status: 400 });

  const [tenant, settings] = await Promise.all([
    db.tenant.findUnique({ where: { id: tenantId } }),
    db.companySettings.findUnique({ where: { tenantId } }),
  ]);
  if (!tenant) return NextResponse.json({ error: "Tenant introuvable" }, { status: 404 });

  const pdf = await generateTextPdfDoc({
    tenant,
    settings,
    title: title || "Analyse Finora AI",
    content,
  });

  return new NextResponse(pdf.buffer.slice(pdf.byteOffset, pdf.byteOffset + pdf.byteLength) as ArrayBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="finora-ai-analyse.pdf"`,
      "Content-Length": String(pdf.length),
    },
  });
}
