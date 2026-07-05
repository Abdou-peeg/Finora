"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard, Package, Users, Truck, ShoppingCart, Receipt, FileText,
  Wallet, BookOpen, BarChart3, Shield, ScrollText, Search,
  LogOut, ChevronDown, Menu, X, CircleDot, Building2, ClipboardList,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";
import { NotificationBell } from "@/components/notification-bell";
import { useRealtime } from "@/hooks/use-realtime";

const NAV_GROUPS = [
  {
    label: "Pilotage",
    items: [
      { id: "dashboard", label: "Tableau de bord", icon: LayoutDashboard, perm: "dashboard:view" },
      { id: "rapports", label: "Rapports financiers", icon: BarChart3, perm: "rapports:view" },
      { id: "audit", label: "Journal d'audit", icon: ScrollText, perm: "audit:view" },
    ],
  },
  {
    label: "Commercial",
    items: [
      { id: "ventes", label: "Ventes", icon: ShoppingCart, perm: "ventes:view" },
      { id: "devis", label: "Devis", icon: FileText, perm: "devis:view" },
      { id: "factures", label: "Facturation", icon: FileText, perm: "facturation:view" },
      { id: "clients", label: "Clients", icon: Users, perm: "clients:view" },
      { id: "produits", label: "Produits", icon: Package, perm: "produits:view" },
      { id: "bons-livraison", label: "Bons de livraison", icon: Truck, perm: "bons:view" },
    ],
  },
  {
    label: "Achats & Stock",
    items: [
      { id: "achats", label: "Achats", icon: Receipt, perm: "achats:view" },
      { id: "bons-commande", label: "Bons de commande", icon: ClipboardList, perm: "bons:view" },
      { id: "fournisseurs", label: "Fournisseurs", icon: Truck, perm: "fournisseurs:view" },
    ],
  },
  {
    label: "Finance",
    items: [
      { id: "caisse", label: "Caisse", icon: Wallet, perm: "caisse:view" },
      { id: "tresorerie", label: "Trésorerie", icon: Wallet, perm: "tresorerie:view" },
      { id: "comptabilite", label: "Comptabilité", icon: BookOpen, perm: "comptabilite:view" },
    ],
  },
  {
    label: "Administration",
    items: [
      { id: "entreprise", label: "Entreprise", icon: Building2, perm: "admin:company" },
      { id: "admin", label: "Utilisateurs & rôles", icon: Shield, perm: "admin:users" },
    ],
  },
];

function canAccess(role: string, perm: string): boolean {
  if (role === "ADMIN") return true;
  const ROLE_PERMS: Record<string, string[]> = {
    ADMIN: ["*"],
    COMPTABLE: [
      "dashboard:view", "comptabilite:*", "facturation:*", "tresorerie:*", "caisse:*", "rapports:*",
      "audit:view", "clients:view", "fournisseurs:view", "produits:view", "ventes:view", "achats:view",
      "devis:view", "bons:view", "admin:company",
    ],
    VENDEUR: ["dashboard:view", "ventes:*", "clients:*", "facturation:view", "produits:view", "caisse:view", "devis:*", "bons:view"],
    STOCK_MANAGER: ["dashboard:view", "produits:*", "stock:*", "achats:*", "fournisseurs:*", "ventes:view", "bons:*"],
  };
  const perms = ROLE_PERMS[role] || [];
  if (perms.includes("*")) return true;
  const mod = perm.split(":")[0] + ":*";
  return perms.includes(mod) || perms.includes(perm);
}

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Administrateur",
  COMPTABLE: "Comptable",
  VENDEUR: "Vendeur",
  STOCK_MANAGER: "Gestionnaire de stock",
};

const ROLE_COLORS: Record<string, string> = {
  ADMIN: "bg-emerald-500",
  COMPTABLE: "bg-teal-500",
  VENDEUR: "bg-lime-500",
  STOCK_MANAGER: "bg-cyan-500",
};

interface AppShellProps {
  current: string;
  onNavigate: (id: string) => void;
  children: React.ReactNode;
}

export function AppShell({ current, onNavigate, children }: AppShellProps) {
  const { data: session } = useSession();
  const user = session?.user as any;
  const [mobileOpen, setMobileOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState("");
  const { connected, notifications } = useRealtime(user?.tenantId, user?.id, user?.role);

  // Auto-navigate based on hash on first load
  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash.replace("#", "");
    if (hash && NAV_GROUPS.some((g) => g.items.some((i) => i.id === hash))) {
      onNavigate(hash);
    }
  }, [onNavigate]);

  function handleNav(id: string) {
    onNavigate(id);
    setMobileOpen(false);
    if (typeof window !== "undefined") {
      history.replaceState(null, "", `#${id}`);
    }
  }

  const initials = (user?.name || "U")
    .split(" ")
    .map((s: string) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar — desktop */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 bg-sidebar border-r flex flex-col transition-transform lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
<div className="h-16 flex items-center gap-2.5 px-5 border-b">
          <div className="rounded-lg overflow-hidden h-11 w-11 flex items-center justify-center bg-white">
  <img src="/logo-icon.png" alt="Finora" className="h-9 w-9 object-contain" />
</div>
          <div>
            <div className="font-bold leading-tight text-[#0d5d4a]">Finora</div>
            <div className="text-[10px] text-muted-foreground leading-tight">Gestion d'entreprise nouvelle génération</div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto lg:hidden h-8 w-8"
            onClick={() => setMobileOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <nav className="flex-1 overflow-y-auto p-3 space-y-5 scroll-fade">
          {NAV_GROUPS.map((group) => {
            const items = group.items.filter((it) => canAccess(user?.role, it.perm));
            if (items.length === 0) return null;
            return (
              <div key={group.label}>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 px-3 mb-1.5">
                  {group.label}
                </p>
                <div className="space-y-0.5">
                  {items.map((item) => {
                    const Icon = item.icon;
                    const active = current === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => handleNav(item.id)}
                        className={cn(
                          "w-full flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                          active
                            ? "bg-primary text-primary-foreground font-medium shadow-sm"
                            : "text-sidebar-foreground hover:bg-sidebar-accent"
                        )}
                      >
                        <Icon className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        <div className="p-3 border-t space-y-2">
  
    <a href="https://pay.wave.com/m/M_sn_nMXTyMN2aAMQ/c/sn/?amount=14900"
    target="_blank"
    rel="noopener noreferrer"
    className="block"
  >
    <Button className="w-full bg-[#0d5d4a] hover:bg-[#0a4a3b] text-white gap-2">
      <Wallet className="h-4 w-4" />
      Acheter — 14 900 FCFA
    </Button>
  </a>
  <div className="rounded-lg bg-accent/50 p-3">
    <div className="flex items-center justify-between mb-1">
      <span className="text-xs font-medium">{user?.tenantName || "Tenant"}</span>
      <span className={cn(
        "flex items-center gap-1 text-[10px] font-medium",
        connected ? "text-emerald-600" : "text-muted-foreground"
      )}>
        <CircleDot className={cn("h-2.5 w-2.5", connected && "pulse-dot text-emerald-500")} />
        {connected ? "Live" : "Hors ligne"}
      </span>
    </div>
    <p className="text-[10px] text-muted-foreground">
      Synchronisation temps réel active sur tous les modules.
    </p>
  </div>
</div>
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-30 bg-black/40 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Main */}
      <div className="flex-1 lg:ml-64 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-16 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/70 sticky top-0 z-20">
          <div className="h-full px-4 sm:px-6 flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setMobileOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>

            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Recherche globale (Cmd+K)…"
                className="pl-9 bg-muted/40 border-0 h-9"
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-1.5">
              <ThemeToggle />
              <NotificationBell notifications={notifications} />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="gap-2 h-9 px-2">
                    <Avatar className="h-7 w-7">
                      <AvatarFallback className={cn("text-white text-xs font-semibold", ROLE_COLORS[user?.role])}>
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="hidden sm:flex flex-col items-start leading-tight">
                      <span className="text-xs font-medium">{user?.name}</span>
                      <span className="text-[10px] text-muted-foreground">{ROLE_LABELS[user?.role]}</span>
                    </div>
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <div className="px-2 py-1.5">
                    <p className="text-sm font-medium truncate">{user?.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                    <Badge variant="outline" className="mt-1.5 text-[10px]">{ROLE_LABELS[user?.role]}</Badge>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/" })} className="text-rose-600 focus:text-rose-700">
                    <LogOut className="h-4 w-4 mr-2" />
                    Déconnexion
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 max-w-[1600px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
