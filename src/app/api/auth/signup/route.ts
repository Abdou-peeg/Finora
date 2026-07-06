/**
 * Tenant signup — creates a new company (tenant) + its first ADMIN user.
 * This is the production registration endpoint (no demo data).
 *
 * Body: { companyName, legalName?, currency?, email, password, name, phone? }
 * Returns: { ok, tenantId, userId, email }
 */
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { safeError } from "@/lib/errors";
import { z } from "zod";

const SignupSchema = z.object({
  companyName: z.string().min(2, "Nom de l'entreprise requis (min 2 caractères)"),
  legalName: z.string().optional(),
  currency: z.string().default("XOF"),
  email: z.string().email("Email invalide"),
  password: z.string().min(8, "Mot de passe : 8 caractères minimum"),
  name: z.string().min(2, "Nom de l'administrateur requis"),
  phone: z.string().optional(),
});

// Default chart of accounts (PCG OHADA — système comptable OHADA adopted in Senegal)
const DEFAULT_ACCOUNTS = [
  { code: "411000", label: "Clients", type: "ASSET" },
  { code: "401000", label: "Fournisseurs", type: "LIABILITY" },
  { code: "701000", label: "Ventes de marchandises", type: "REVENUE" },
  { code: "601000", label: "Achats de marchandises", type: "EXPENSE" },
  { code: "443000", label: "TVA collectée", type: "LIABILITY" },
  { code: "445000", label: "TVA déductible", type: "ASSET" },
  { code: "570000", label: "Caisse", type: "ASSET" },
  { code: "521000", label: "Banque", type: "ASSET" },
  { code: "370000", label: "Stocks de marchandises", type: "ASSET" },
  { code: "101000", label: "Capital social", type: "EQUITY" },
];

export async function POST(req: Request) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  }

  const parsed = SignupSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Données invalides" },
      { status: 400 }
    );
  }
  const data = parsed.data;

  // Check email uniqueness
  const existing = await db.user.findUnique({ where: { email: data.email.toLowerCase() } });
  if (existing) {
    return NextResponse.json(
      { error: "Cet email est déjà utilisé. Connectez-vous ou utilisez un autre email." },
      { status: 409 }
    );
  }

  // Atomic tenant + admin user + chart of accounts creation
  const passwordHash = await bcrypt.hash(data.password, 10);

  try {
    const result = await db.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: data.companyName,
          legalName: data.legalName || data.companyName,
          currency: data.currency,
        },
      });
      const user = await tx.user.create({
        data: {
          tenantId: tenant.id,
          email: data.email.toLowerCase(),
          name: data.name,
          passwordHash,
          role: "ADMIN",
          active: true,
        },
      });
      // Create default OHADA chart of accounts
      await tx.account.createMany({
        data: DEFAULT_ACCOUNTS.map((a) => ({ ...a, tenantId: tenant.id })),
      });
      // Opening cash balance = 0 (no demo money)
      await tx.cashEntry.create({
        data: {
          tenantId: tenant.id,
          reference: "OPENING",
          type: "IN",
          amount: 0,
          label: "Solde d'ouverture caisse",
          source: "MANUAL",
          date: new Date(),
          balanceAfter: 0,
        },
      });
      // Audit log
      await tx.auditLog.create({
        data: {
          tenantId: tenant.id,
          userId: user.id,
          userName: user.name,
          action: "TENANT_CREATED",
          entity: "Tenant",
          entityId: tenant.id,
          details: `Entreprise "${tenant.name}" créée. Administrateur : ${user.email}. Devise : ${tenant.currency}.`,
        },
      });
      return { tenant, user };
    });

    return NextResponse.json({
      ok: true,
      tenantId: result.tenant.id,
      tenantName: result.tenant.name,
      userId: result.user.id,
      email: result.user.email,
    });
  } catch (e: any) {
    console.error("[signup] failed:", e);
    return NextResponse.json(
      { error: "Erreur lors de la création du compte. Réessayez." },
      { status: 500 }
    );
  }
}
