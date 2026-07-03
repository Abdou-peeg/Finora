import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/guard";
import { db } from "@/lib/db";

export async function GET(req: Request) {
  const g = await requirePermission(req, "admin:company");
  if (g instanceof NextResponse) return g;
  const { tenantId } = g.user;
  const settings = await db.companySettings.findUnique({ where: { tenantId } });
  const tenant = await db.tenant.findUnique({ where: { id: tenantId } });
  return NextResponse.json({ settings, tenant });
}

export async function PUT(req: Request) {
  const g = await requirePermission(req, "admin:company");
  if (g instanceof NextResponse) return g;
  const { tenantId } = g.user;
  const body = await req.json();

  // Sanitize: limit logo & signature size to ~2MB
  if (body.logo && body.logo.length > 3_000_000) {
    return NextResponse.json({ error: "Logo trop volumineux (max 2 Mo). Compressez l'image." }, { status: 400 });
  }
  if (body.signature && body.signature.length > 2_000_000) {
    return NextResponse.json({ error: "Signature trop volumineuse (max 1.5 Mo)." }, { status: 400 });
  }

  try {
    const data: any = {
      legalName: body.legalName,
      legalForm: body.legalForm || null,
      rc: body.rc || null,
      ninea: body.ninea || null,
      nCompte: body.nCompte || null,
      capital: body.capital ? Number(body.capital) : null,
      address: body.address || null,
      city: body.city || null,
      postalCode: body.postalCode || null,
      country: body.country || "Sénégal",
      phone: body.phone || null,
      email: body.email || null,
      website: body.website || null,
      logo: body.logo ?? undefined,
      signature: body.signature ?? undefined,
      footerNote: body.footerNote || null,
      bankName: body.bankName || null,
      bankIban: body.bankIban || null,
      bankBic: body.bankBic || null,
    };

    // Remove undefined to avoid erasing with null
    Object.keys(data).forEach((k) => data[k] === undefined && delete data[k]);

    const existing = await db.companySettings.findUnique({ where: { tenantId } });
    let settings;
    if (existing) {
      settings = await db.companySettings.update({ where: { tenantId }, data });
    } else {
      settings = await db.companySettings.create({ data: { tenantId, ...data } });
    }

    // Also update tenant name if legalName changed
    if (body.legalName && body.legalName !== (await db.tenant.findUnique({ where: { id: tenantId } }))?.name) {
      await db.tenant.update({ where: { id: tenantId }, data: { name: body.legalName, legalName: body.legalName } });
    }

    await db.auditLog.create({
      data: {
        tenantId, userId: g.user.id, userName: g.user.name,
        action: "COMPANY_SETTINGS_UPDATED", entity: "CompanySettings", entityId: settings.id,
        details: `Paramètres entreprise mis à jour (${settings.legalName}).`,
      },
    });

    return NextResponse.json(settings);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
