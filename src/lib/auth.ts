import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 },
  secret: process.env.NEXTAUTH_SECRET,
  pages: { signIn: "/" },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const user = await db.user.findUnique({
          where: { email: credentials.email.toLowerCase() },
          include: { tenant: true },
        });
        if (!user || !user.active) return null;
        const ok = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!ok) return null;
        return {
  id: user.id,
  email: user.email,
  name: user.name,
  role: user.role,
  tenantId: user.tenantId,
  tenantName: user.tenant.name,
  subscriptionExpiresAt: user.tenant.subscriptionExpiresAt,
} as any;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
  if (user) {
    token.id = (user as any).id;
    token.role = (user as any).role;
    token.tenantId = (user as any).tenantId;
    token.tenantName = (user as any).tenantName;
    token.subscriptionExpiresAt = (user as any).subscriptionExpiresAt;
  }
  return token;
},
    async session({ session, token }) {
  if (session.user) {
    (session.user as any).id = token.id;
    (session.user as any).role = token.role;
    (session.user as any).tenantId = token.tenantId;
    (session.user as any).tenantName = token.tenantName;
    (session.user as any).subscriptionExpiresAt = token.subscriptionExpiresAt;
  }
  return session;
},
  },
};

export type AppRole = "ADMIN" | "COMPTABLE" | "VENDEUR" | "STOCK_MANAGER";

// Permission matrix — single source of truth.
// Each role maps to a set of allowed module actions.
const PERMISSIONS: Record<AppRole, string[]> = {
  ADMIN: ["*"],
  COMPTABLE: [
    "dashboard:view",
    "comptabilite:*",
    "facturation:*",
    "tresorerie:*",
    "caisse:*",
    "rapports:*",
    "audit:view",
    "clients:view",
    "fournisseurs:view",
    "produits:view",
    "ventes:view",
    "achats:view",
    "devis:view",
    "bons:view",
    "admin:company",
  ],
  VENDEUR: [
    "dashboard:view",
    "ventes:*",
    "clients:*",
    "facturation:view",
    "produits:view",
    "caisse:view",
    "devis:*",
    "bons:view",
  ],
  STOCK_MANAGER: [
    "dashboard:view",
    "produits:*",
    "stock:*",
    "achats:*",
    "fournisseurs:*",
    "ventes:view",
    "bons:*",
  ],
};

export function can(role: string | undefined, permission: string): boolean {
  if (!role) return false;
  const perms = PERMISSIONS[role as AppRole];
  if (!perms) return false;
  if (perms.includes("*")) return true;
  // wildcard module-level match e.g. "ventes:*"
  const moduleWildcard = permission.split(":")[0] + ":*";
  if (perms.includes(moduleWildcard)) return true;
  return perms.includes(permission);
}
