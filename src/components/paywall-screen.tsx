"use client";

import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Wallet, LogOut } from "lucide-react";

export function PaywallScreen() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-white p-6 text-center">
      <img src="/logo-icon.png" alt="Finora" className="h-16 w-16" />
      <div className="space-y-2 max-w-sm">
        <h1 className="text-xl font-bold text-[#0d5d4a]">Abonnement expiré</h1>
        <p className="text-sm text-muted-foreground">
          Votre accès à Finora a expiré. Réglez votre abonnement pour continuer à utiliser
          l'application — vos données restent conservées en toute sécurité.
        </p>
      </div>
      <a
        href="https://pay.wave.com/m/M_sn_nMXTyMN2aAMQ/c/sn/?amount=14900"
        target="_blank"
        rel="noopener noreferrer"
        className="block w-full max-w-xs"
      >
        <Button className="w-full bg-[#0d5d4a] hover:bg-[#0a4a3b] text-white gap-2">
          <Wallet className="h-4 w-4" />
          Renouveler - 14900 FCFA
        </Button>
      </a>
      <p className="text-xs text-muted-foreground max-w-sm">
        Une fois le paiement effectué, contactez-nous pour la réactivation de votre compte.
      </p>
      <Button variant="ghost" size="sm" onClick={() => signOut({ callbackUrl: "/" })} className="text-muted-foreground">
        <LogOut className="h-3.5 w-3.5 mr-2" /> Se déconnecter
      </Button>
    </div>
  );
}