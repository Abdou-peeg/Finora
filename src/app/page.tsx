"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { LoginScreen } from "@/components/login-screen";
import { AppShell } from "@/components/app-shell";
import { DashboardView } from "@/components/views/dashboard";
import { ProductsView } from "@/components/views/products";
import { CustomersView } from "@/components/views/customers";
import { SuppliersView } from "@/components/views/suppliers";
import { SalesView } from "@/components/views/sales";
import { PurchasesView } from "@/components/views/purchases";
import { InvoicesView } from "@/components/views/invoices";
import { CashView } from "@/components/views/cash";
import { TreasuryView } from "@/components/views/treasury";
import { AccountingView } from "@/components/views/accounting";
import { ReportsView } from "@/components/views/reports";
import { AdminView } from "@/components/views/admin";
import { AuditView } from "@/components/views/audit";
import { CompanySettingsView } from "@/components/views/company-settings";
import { QuotesView } from "@/components/views/quotes";
import { PurchaseOrdersView } from "@/components/views/purchase-orders";
import { DeliveryNotesView } from "@/components/views/delivery-notes";
import { Skeleton } from "@/components/ui/skeleton";
import { PaywallScreen } from "@/components/paywall-screen";
export default function Home() {
  const { data: session, status } = useSession();
  const [view, setView] = useState<string>("dashboard");

if (status === "loading") {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-white">
      <img
        src="/logo-icon.png"
        alt="Finora"
        className="h-20 w-20 animate-pulse-scale"
      />
      <div className="text-[#0d5d4a]/70 text-sm tracking-wide">Chargement…</div>
    </div>
  );
}

  if (!session?.user) {
  return <LoginScreen />;
}

const user = session.user as any;
if (user.subscriptionExpiresAt && new Date(user.subscriptionExpiresAt) < new Date()) {
  return <PaywallScreen />;
}

  function render() {
    switch (view) {
      case "dashboard": return <DashboardView />;
      case "produits": return <ProductsView />;
      case "clients": return <CustomersView />;
      case "fournisseurs": return <SuppliersView />;
      case "ventes": return <SalesView />;
      case "achats": return <PurchasesView />;
      case "factures": return <InvoicesView />;
      case "caisse": return <CashView />;
      case "tresorerie": return <TreasuryView />;
      case "comptabilite": return <AccountingView />;
      case "rapports": return <ReportsView />;
      case "admin": return <AdminView />;
      case "audit": return <AuditView />;
      case "entreprise": return <CompanySettingsView />;
      case "devis": return <QuotesView />;
      case "bons-commande": return <PurchaseOrdersView />;
      case "bons-livraison": return <DeliveryNotesView />;
      default: return <DashboardView />;
    }
  }

  return (
    <AppShell current={view} onNavigate={setView}>
      {render()}
    </AppShell>
  );
}
