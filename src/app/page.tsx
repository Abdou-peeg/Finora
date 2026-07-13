"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Wallet, ShoppingCart, Package, FileText, Users2, Calculator,
  Zap, ShieldCheck, Sparkles, Smartphone, ArrowRight, CheckCircle2,
} from "lucide-react";

const FEATURES = [
  { icon: ShoppingCart, title: "Ventes & Facturation", desc: "Devis, ventes, factures et bons de livraison générés en quelques clics." },
  { icon: Package, title: "Stock & Achats", desc: "Suivi des stocks en temps réel, bons de commande, alertes de rupture." },
  { icon: Calculator, title: "Comptabilité OHADA", desc: "Plan comptable et journal conformes, générés automatiquement à chaque opération." },
  { icon: Wallet, title: "Caisse & Trésorerie", desc: "Suivi des encaissements et décaissements, synchronisé avec chaque vente." },
  { icon: Users2, title: "Gestion RH", desc: "Pointage, absences, retards, prêts sur salaire et paie automatisée." },
  { icon: Sparkles, title: "Finora AI", desc: "Un assistant qui crée vos devis, factures et clients sur simple demande." },
];

const BENEFITS = [
  "Conforme au plan comptable OHADA dès la première utilisation",
  "Paiement mobile Wave intégré, pensé pour le Sénégal",
  "Facturation, stock et caisse synchronisés automatiquement",
  "Accessible sur mobile, tablette et ordinateur",
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-[#0d1b3d]">
      {/* Header */}
      <header className="border-b">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <img src="/logo-sidebar.png" alt="Finora" className="h-8 w-auto" />
          <div className="flex items-center gap-3">
            <Link href="/connexion">
              <Button variant="ghost">Connexion</Button>
            </Link>
            <Link href="/connexion">
              <Button className="bg-[#0d5d4a] hover:bg-[#0a4a3b] text-white">
                Créer mon compte
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 py-20 text-center space-y-6">
        <div className="inline-flex items-center gap-2 bg-[#e8f3ef] text-[#0d5d4a] text-xs font-medium px-3 py-1.5 rounded-full">
          <Zap className="h-3.5 w-3.5" /> Conçu pour les PME sénégalaises
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold leading-tight max-w-3xl mx-auto">
          La gestion d'entreprise, <span className="text-[#0d5d4a]">unifiée</span> et simplifiée.
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Finora centralise votre comptabilité, vos ventes, vos stocks, votre trésorerie et vos
          ressources humaines dans une seule application. Conforme OHADA, en FCFA, pensée pour le Sénégal.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
          <Link href="/connexion">
            <Button size="lg" className="bg-[#0d5d4a] hover:bg-[#0a4a3b] text-white gap-2 w-full sm:w-auto">
              Créer mon entreprise <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="/connexion">
            <Button size="lg" variant="outline" className="w-full sm:w-auto">
              J'ai déjà un compte
            </Button>
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <h2 className="text-2xl font-bold text-center mb-2">Tout ce qu'il faut, dans une seule app</h2>
        <p className="text-center text-muted-foreground mb-12">Chaque module communique avec les autres, automatiquement.</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-xl border p-6 space-y-3 hover:shadow-md transition-shadow">
              <div className="h-10 w-10 rounded-lg bg-[#e8f3ef] flex items-center justify-center">
                <f.icon className="h-5 w-5 text-[#0d5d4a]" />
              </div>
              <h3 className="font-semibold">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Benefits + mockup band */}
      <section className="bg-[#0d5d4a] text-white">
        <div className="max-w-6xl mx-auto px-6 py-16 grid lg:grid-cols-2 gap-10 items-center">
          <div className="space-y-5">
            <h2 className="text-2xl sm:text-3xl font-bold">Pensée pour la réalité locale</h2>
            <ul className="space-y-3">
              {BENEFITS.map((b) => (
                <li key={b} className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 flex-shrink-0 mt-0.5 text-[#c8933f]" />
                  <span className="text-white/90">{b}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex items-center justify-center gap-4">
            <div className="rounded-xl bg-white/10 p-6 text-center space-y-2">
              <ShieldCheck className="h-8 w-8 mx-auto text-[#c8933f]" />
              <p className="text-sm font-medium">Données isolées et sécurisées par entreprise</p>
            </div>
            <div className="rounded-xl bg-white/10 p-6 text-center space-y-2">
              <Smartphone className="h-8 w-8 mx-auto text-[#c8933f]" />
              <p className="text-sm font-medium">Fonctionne sur mobile, tablette et ordinateur</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="max-w-3xl mx-auto px-6 py-20 text-center space-y-6">
        <h2 className="text-2xl font-bold">Un tarif simple, sans surprise</h2>
        <div className="rounded-2xl border-2 border-[#0d5d4a] p-10 space-y-4">
          <p className="text-5xl font-bold text-[#0d5d4a]">14 900 FCFA</p>
          <p className="text-muted-foreground">Accès complet à tous les modules Finora</p>
          <Link href="/connexion">
            <Button size="lg" className="bg-[#0d5d4a] hover:bg-[#0a4a3b] text-white w-full sm:w-auto">
              Commencer maintenant
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-muted-foreground">
          <span>© {new Date().getFullYear()} Finora — Dakar, Sénégal</span>
          <span>La gestion unifiée</span>
        </div>
      </footer>
    </div>
  );
}