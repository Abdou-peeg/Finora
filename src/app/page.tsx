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
import { Skeleton } from "@/components/ui/skeleton";

export default function Home() {
  const { data: session, status } = useSession();
  const [view, setView] = useState<string>("dashboard");

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="space-y-3 w-72">
          <Skeleton className="h-10" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
    );
  }

  if (!session?.user) {
    return <LoginScreen />;
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
      default: return <DashboardView />;
    }
  }

  return (
    <AppShell current={view} onNavigate={setView}>
      {render()}
    </AppShell>
  );
}
