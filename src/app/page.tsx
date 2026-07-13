"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Wallet, ShoppingCart, Package, FileText, Users2, Calculator,
  Zap, ShieldCheck, Sparkles, Smartphone, ArrowRight, CheckCircle2, TrendingUp,
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
    <div className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(13,93,74,0.12),transparent_30%),linear-gradient(135deg,#f8fffc_0%,#f4fbf8_45%,#eef8f2_100%)] text-[#0d1b3d]">
      <div className="relative isolate">
        <div className="hero-orb hero-orb-delay absolute left-[-8%] top-[-8%] h-72 w-72 rounded-full bg-emerald-400/25 blur-3xl" />
        <div className="hero-orb absolute right-[-4%] top-16 h-80 w-80 rounded-full bg-[#c8933f]/20 blur-3xl" />

        <header className="sticky top-0 z-20 border-b border-white/70 bg-white/70 backdrop-blur-xl">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
            <img src="/logo-sidebar.png" alt="Finora" className="h-8 w-auto" />
            <div className="flex items-center gap-3">
              <Link href="/connexion">
                <Button variant="ghost">Connexion</Button>
              </Link>
              <Link href="/connexion">
                <Button className="bg-[#0d5d4a] text-white hover:bg-[#0a4a3b]">
                  Créer mon compte
                </Button>
              </Link>
            </div>
          </div>
        </header>

      <section className="relative px-6 py-24 sm:py-28 lg:py-32">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-80"
          style={{
            backgroundImage:
              "linear-gradient(120deg, rgba(3, 19, 30, 0.94) 0%, rgba(12, 72, 58, 0.78) 48%, rgba(5, 36, 31, 0.95) 100%), url('https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=1800&q=80')",
          }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(200,147,63,0.2),transparent_35%)]" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="max-w-2xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-200/70 bg-white/80 px-3 py-1.5 text-sm font-medium text-emerald-700 shadow-sm backdrop-blur">
              <Zap className="h-3.5 w-3.5" /> Conçu pour les PME sénégalaises
            </div>
            <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl">
              La gestion d'entreprise, <span className="text-emerald-300">unifiée</span> et simplifiée.
            </h1>
            <p className="mt-6 text-lg leading-8 text-slate-200 sm:text-xl">
              Finora centralise votre comptabilité, vos ventes, vos stocks, votre trésorerie et vos
              ressources humaines dans une seule expérience fluide, sécurisée et pensée pour le Sénégal.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/connexion">
                <Button size="lg" className="w-full gap-2 bg-[#0d5d4a] text-white hover:bg-[#0a4a3b] sm:w-auto">
                  Créer mon entreprise <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/connexion">
                <Button size="lg" variant="outline" className="w-full border-white/30 bg-white/10 text-white hover:bg-white/20 sm:w-auto">
                  J'ai déjà un compte
                </Button>
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap gap-4 text-sm text-slate-300">
              <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-300" /> OHADA & FCFA</span>
              <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-300" /> Mobile-first</span>
              <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-300" /> Automatisations IA</span>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.7, delay: 0.1 }} className="relative">
            <div className="absolute inset-0 rounded-4xl bg-linear-to-br from-emerald-400/30 to-transparent blur-3xl" />
            <div className="relative rounded-4xl border border-white/20 bg-slate-950/80 p-4 shadow-[0_30px_100px_rgba(2,13,28,0.35)] backdrop-blur-xl">
              <div className="rounded-[1.4rem] border border-white/10 bg-white/10 p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-300">Tableau de bord</p>
                    <p className="text-lg font-semibold text-white">Vision en temps réel</p>
                  </div>
                  <div className="rounded-full bg-emerald-500/20 px-3 py-1 text-sm font-medium text-emerald-300">Live</div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20">
                      <FileText className="h-5 w-5 text-emerald-300" />
                    </div>
                    <p className="text-sm font-semibold text-white">Devis & factures</p>
                    <p className="mt-1 text-sm text-slate-300">Génération instantanée</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-[#c8933f]/20">
                      <TrendingUp className="h-5 w-5 text-[#f4c46d]" />
                    </div>
                    <p className="text-sm font-semibold text-white">Caisse & trésorerie</p>
                    <p className="mt-1 text-sm text-slate-300">Suivi précis</p>
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-300">Tendance du mois</p>
                      <p className="text-xl font-semibold text-white">+18,4%</p>
                    </div>
                    <div className="rounded-full bg-white/10 px-3 py-1 text-sm text-emerald-200">Croissance stable</div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-bold text-[#0d1b3d]">Tout ce qu'il faut, dans une seule app</h2>
          <p className="mx-auto mt-3 max-w-2xl text-lg text-muted-foreground">Chaque module communique avec les autres, automatiquement, pour gagner du temps au quotidien.</p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, index) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.4, delay: index * 0.05 }}
              className="group rounded-2xl border border-emerald-100 bg-white/80 p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e8f3ef]">
                <f.icon className="h-5 w-5 text-[#0d5d4a]" />
              </div>
              <h3 className="mt-5 font-semibold text-[#0d1b3d]">{f.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="relative overflow-hidden bg-[#072d24] text-white">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1800&q=80')] bg-cover bg-center opacity-20" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-6 py-20 lg:grid-cols-2">
          <div className="space-y-5">
            <h2 className="text-3xl font-bold sm:text-4xl">Pensée pour la réalité locale</h2>
            <ul className="space-y-3">
              {BENEFITS.map((b) => (
                <li key={b} className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#c8933f]" />
                  <span className="text-white/90">{b}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/10 p-6 text-center shadow-lg backdrop-blur">
              <ShieldCheck className="mx-auto h-8 w-8 text-[#c8933f]" />
              <p className="mt-3 text-sm font-medium">Données isolées et sécurisées par entreprise</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/10 p-6 text-center shadow-lg backdrop-blur">
              <Smartphone className="mx-auto h-8 w-8 text-[#c8933f]" />
              <p className="mt-3 text-sm font-medium">Fonctionne sur mobile, tablette et ordinateur</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-6 py-20 text-center">
        <h2 className="text-3xl font-bold text-[#0d1b3d]">Un tarif simple, sans surprise</h2>
        <div className="mt-8 rounded-4xl border border-emerald-200 bg-white/80 p-10 shadow-lg shadow-emerald-100/60">
          <p className="text-5xl font-bold text-[#0d5d4a]">14 900 FCFA</p>
          <p className="mt-3 text-lg text-muted-foreground">Accès complet à tous les modules Finora</p>
          <Link href="/connexion">
            <Button size="lg" className="mt-6 bg-[#0d5d4a] text-white hover:bg-[#0a4a3b]">
              Commencer maintenant
            </Button>
          </Link>
        </div>
      </section>

      <footer className="border-t border-emerald-100/80 bg-white/70 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-6 py-8 text-sm text-muted-foreground sm:flex-row">
          <span>© {new Date().getFullYear()} Finora — Dakar, Sénégal</span>
          <span>La gestion unifiée</span>
        </div>
      </footer>
      </div>
    </div>
  );
}