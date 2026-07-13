"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Wallet, ShoppingCart, Package, FileText, Users2, Calculator,
  Zap, ShieldCheck, Sparkles, Smartphone, ArrowRight, CheckCircle2, TrendingUp,
  BarChart3, Cpu, Globe2, UserRound,
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

const HIGHLIGHTS = [
  { value: "24/7", label: "Pilotage en temps réel" },
  { value: "98%", label: "Données synchronisées" },
  { value: "+40%", label: "Gain de temps mensuel" },
];

const WORKFLOW = [
  { title: "Centraliser", desc: "Toutes vos opérations entrent dans un tableau de bord unique et lisible." },
  { title: "Automatiser", desc: "L’IA compose documents, clients et suivis sans friction." },
  { title: "Piloter", desc: "Chaque décision s’appuie sur des indicateurs fiables et instantanés." },
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

      <section className="relative overflow-hidden px-6 py-24 sm:py-28 lg:py-32">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-90"
          style={{
            backgroundImage:
              "linear-gradient(125deg, rgba(2, 12, 24, 0.97) 0%, rgba(7, 48, 39, 0.9) 42%, rgba(10, 55, 47, 0.95) 100%), url('https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1800&q=80')",
          }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(200,147,63,0.22),transparent_35%),radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.14),transparent_24%),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(180deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:100%_100%,100%_100%,40px_40px,40px_40px]" />
        <div className="premium-grid absolute inset-0 opacity-25" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-[1.08fr_0.92fr]">
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="max-w-3xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-200/70 bg-white/85 px-3 py-1.5 text-sm font-medium text-emerald-700 shadow-sm backdrop-blur">
              <Zap className="h-3.5 w-3.5" /> L’outil de gestion premium des entreprises qui veulent aller plus loin
            </div>
            <h1 className="text-4xl font-bold leading-tight text-white sm:text-5xl lg:text-6xl">
              Faites de votre gestion un <span className="text-emerald-300">levier de croissance</span>.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-200 sm:text-xl">
              Finora réunit comptabilité, ventes, stock, trésorerie et RH dans une expérience fluide,
              claire et pensée pour les PME sénégalaises qui veulent gagner en vitesse, en précision et en élégance.
            </p>
            <div className="mt-8 rounded-2xl border border-white/15 bg-white/10 p-4 shadow-lg backdrop-blur">
              <div className="flex flex-wrap items-center gap-3 text-sm text-slate-200">
                <span className="rounded-full bg-emerald-400/15 px-3 py-1">⚡ Créez un devis en moins de 45 secondes</span>
                <span className="rounded-full bg-white/10 px-3 py-1">📱 Interface pensée mobile</span>
              </div>
            </div>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/connexion">
                <Button size="lg" className="w-full gap-2 bg-[#0d5d4a] text-white hover:bg-[#0a4a3b] sm:w-auto">
                  Créer mon entreprise <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/connexion">
                <Button size="lg" variant="outline" className="w-full border-white/30 bg-white/10 text-white hover:bg-white/20 sm:w-auto">
                  Voir la plateforme
                </Button>
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap gap-4 text-sm text-slate-300">
              <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-300" /> OHADA & FCFA</span>
              <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-300" /> Mobile-first</span>
              <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-300" /> Automatisations IA</span>
            </div>
            <div className="mt-10 grid gap-3 sm:grid-cols-3">
              {HIGHLIGHTS.map((item) => (
                <div key={item.label} className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur">
                  <p className="text-2xl font-semibold text-white">{item.value}</p>
                  <p className="mt-1 text-sm text-slate-300">{item.label}</p>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.7, delay: 0.1 }} className="relative">
            <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-br from-emerald-400/25 via-transparent to-[#c8933f]/20 blur-3xl" />
            <div className="relative rounded-[2rem] border border-white/20 bg-slate-950/80 p-4 shadow-[0_30px_120px_rgba(2,13,28,0.45)] backdrop-blur-xl">
              <div className="rounded-[1.45rem] border border-white/10 bg-white/10 p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-300">Command center</p>
                    <p className="text-lg font-semibold text-white">Pilotage intelligent</p>
                  </div>
                  <div className="rounded-full bg-emerald-500/20 px-3 py-1 text-sm font-medium text-emerald-300">Live</div>
                </div>

                <div className="rounded-[1.35rem] border border-emerald-400/20 bg-gradient-to-br from-emerald-500/10 to-white/5 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-300">Performance du mois</p>
                      <p className="text-3xl font-semibold text-white">+18,4%</p>
                    </div>
                    <div className="rounded-full bg-white/10 px-3 py-1 text-sm text-emerald-200">Croissance stable</div>
                  </div>
                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
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
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-white/10 bg-white/10 p-3 text-center">
                    <Cpu className="mx-auto h-5 w-5 text-emerald-300" />
                    <p className="mt-2 text-xs text-slate-300">Automatisation</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/10 p-3 text-center">
                    <Globe2 className="mx-auto h-5 w-5 text-emerald-300" />
                    <p className="mt-2 text-xs text-slate-300">Accessible</p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/10 p-3 text-center">
                    <BarChart3 className="mx-auto h-5 w-5 text-emerald-300" />
                    <p className="mt-2 text-xs text-slate-300">Analytics</p>
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

      <section className="mx-auto max-w-7xl px-6 pb-20">
        <div className="grid gap-8 rounded-[2rem] border border-emerald-100/80 bg-gradient-to-br from-white via-emerald-50/50 to-white p-8 shadow-[0_20px_90px_rgba(13,93,74,0.08)] lg:grid-cols-[0.95fr_1.05fr]">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200/70 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700">
              <Sparkles className="h-3.5 w-3.5" /> Rythme premium
            </div>
            <h2 className="text-3xl font-bold text-[#0d1b3d] sm:text-4xl">Une expérience pensée pour les équipes qui veulent aller vite</h2>
            <p className="max-w-2xl text-lg text-muted-foreground">Finora simplifie la complexité du quotidien afin que chaque membre de l’entreprise puisse agir avec clarté, rapidité et confiance.</p>
            <div className="space-y-3">
              {WORKFLOW.map((step, index) => (
                <div key={step.title} className="flex items-start gap-3 rounded-2xl border border-emerald-100 bg-white/80 p-4 shadow-sm">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0d5d4a] text-sm font-semibold text-white">
                    {index + 1}
                  </div>
                  <div>
                    <h3 className="font-semibold text-[#0d1b3d]">{step.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="relative min-h-[320px]">
            <div className="premium-panel absolute inset-0 rounded-[1.8rem] bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.15),transparent_45%)]" />
            <motion.div
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.25 }}
              transition={{ duration: 0.45 }}
              className="relative h-full rounded-[1.8rem] border border-white/70 bg-slate-950/90 p-6 text-white shadow-[0_24px_80px_rgba(2,13,28,0.35)]"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-300">Vue d’ensemble</p>
                  <p className="text-lg font-semibold">Pilotage instantané</p>
                </div>
                <div className="rounded-full bg-emerald-500/20 px-3 py-1 text-sm font-medium text-emerald-200">Live</div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
                  <p className="text-sm text-slate-300">Cette semaine</p>
                  <p className="mt-2 text-2xl font-semibold">1 248</p>
                  <p className="mt-1 text-sm text-emerald-300">opérations traitées</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
                  <p className="text-sm text-slate-300">Taux de conformité</p>
                  <p className="mt-2 text-2xl font-semibold">99,2%</p>
                  <p className="mt-1 text-sm text-[#f4c46d]">Documents validés</p>
                </div>
              </div>

              <div className="mt-4 rounded-[1.25rem] border border-white/10 bg-white/10 p-4">
                <div className="flex items-center justify-between text-sm text-slate-300">
                  <span>Automatisation IA</span>
                  <span className="text-emerald-300">Actif</span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full w-[82%] rounded-full bg-gradient-to-r from-emerald-400 to-[#c8933f]" />
                </div>
                <p className="mt-3 text-sm text-slate-300">Les documents, alertes et suivis sont générés sans friction.</p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-20">
        <div className="grid gap-8 rounded-[2rem] border border-emerald-100/80 bg-gradient-to-br from-white via-emerald-50/70 to-white p-8 shadow-[0_20px_90px_rgba(13,93,74,0.08)] lg:grid-cols-[0.95fr_1.05fr]">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200/70 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-700">
              <Sparkles className="h-3.5 w-3.5" /> Démo produit
            </div>
            <h2 className="text-3xl font-bold text-[#0d1b3d] sm:text-4xl">Une expérience de gestion qui transforme le quotidien</h2>
            <p className="max-w-2xl text-lg text-muted-foreground">Chaque étape du processus métier devient plus fluide, plus claire et plus rapide à exécuter pour votre équipe.</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                { title: "Créer un devis", desc: "Génération instantanée en quelques clics" },
                { title: "Valider une facture", desc: "Suivi comptable et trésorerie en temps réel" },
                { title: "Suivre un stock", desc: "Alertes et mouvements centralisés" },
                { title: "Piloter la paie", desc: "Absences, pointages et salaires automatisés" },
              ].map((item) => (
                <div key={item.title} className="rounded-2xl border border-emerald-100 bg-white/80 p-4 shadow-sm">
                  <h3 className="font-semibold text-[#0d1b3d]">{item.title}</h3>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.45 }}
            className="relative"
          >
            <div className="absolute inset-0 rounded-[1.8rem] bg-gradient-to-br from-emerald-400/20 via-transparent to-[#c8933f]/20 blur-3xl" />
            <div className="relative rounded-[1.8rem] border border-white/70 bg-slate-950/95 p-5 text-white shadow-[0_24px_80px_rgba(2,13,28,0.35)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-300">Finora Studio</p>
                  <p className="text-lg font-semibold">Tableau de bord live</p>
                </div>
                <div className="rounded-full bg-emerald-500/20 px-3 py-1 text-sm font-medium text-emerald-200">En direct</div>
              </div>

              <div className="mt-5 rounded-[1.25rem] border border-white/10 bg-white/10 p-4">
                <div className="flex items-center justify-between text-sm text-slate-300">
                  <span>Activité du jour</span>
                  <span className="text-emerald-300">+12%</span>
                </div>
                <div className="mt-3 flex items-end gap-2">
                  {[42, 64, 54, 78, 90, 88].map((height, index) => (
                    <div key={index} className="flex-1 rounded-t-full bg-gradient-to-t from-emerald-500 to-[#c8933f]" style={{ height: `${height}px` }} />
                  ))}
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
                  <p className="text-sm text-slate-300">Devis créés</p>
                  <p className="mt-2 text-2xl font-semibold">128</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
                  <p className="text-sm text-slate-300">Paiements suivis</p>
                  <p className="mt-2 text-2xl font-semibold">94%</p>
                </div>
              </div>
            </div>
          </motion.div>
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

      <section className="mx-auto max-w-7xl px-6 pb-8 pt-4">
        <div className="rounded-[2rem] border border-emerald-100 bg-white/80 p-8 shadow-[0_20px_80px_rgba(13,93,74,0.06)]">
          <div className="mb-8 text-center">
            <h2 className="text-3xl font-bold text-[#0d1b3d]">Des entrepreneurs sénégalais qui s’y retrouvent</h2>
            <p className="mx-auto mt-3 max-w-2xl text-lg text-muted-foreground">Parce que la meilleure preuve de notre engagement reste l’expérience de nos clients, nous sommes fiers de partager leurs retours.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              { name: "Mame Diarra", role: "Gérante de boutique", quote: "Finora m’aide à suivre mes ventes et mes stocks sans perdre de temps." },
              { name: "Ibrahima Sarr", role: "Responsable logistique", quote: "Je pilote mes bons de commande et mes livraisons depuis un seul espace clair." },
              { name: "Awa Ndiaye", role: "Directrice de société", quote: "La compta et la trésorerie sont enfin synchronisées et faciles à lire." },
            ].map((person) => (
              <div key={person.name} className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-[#0d5d4a] shadow-sm">
                    <UserRound className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="font-semibold text-[#0d1b3d]">{person.name}</p>
                    <p className="text-sm text-muted-foreground">{person.role}</p>
                  </div>
                </div>
                <p className="mt-4 text-sm leading-6 text-muted-foreground">“{person.quote}”</p>
              </div>
            ))}
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