"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ShieldCheck, Zap, Layers, Building2, UserPlus, LogIn } from "lucide-react";
import { SENEGAL_CITIES } from "@/lib/format";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";

type Mode = "login" | "signup";

export function LoginScreen() {
  const [mode, setMode] = useState<Mode>("login");

  // Login state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showSuPassword, setShowSuPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Signup state
  const [su, setSu] = useState({
    companyName: "",
    legalName: "",
    email: "",
    password: "",
    name: "",
    phone: "",
    city: "Dakar",
    currency: "XOF",
  });
  const [signupLoading, setSignupLoading] = useState(false);
  const [signupError, setSignupError] = useState<string | null>(null);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginError(null);
    setLoginLoading(true);
    const res = await signIn("credentials", { email, password, redirect: false });
    setLoginLoading(false);
    if (res?.error) {
      setLoginError("Identifiants incorrects. Vérifiez votre email et mot de passe.");
      return;
    }
    window.location.reload();
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setSignupError(null);
    setSignupLoading(true);
    try {
      const r = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(su),
      });
      const data = await r.json();
      if (!r.ok) {
        setSignupError(data.error || "Inscription impossible");
        return;
      }
      // Auto-login after signup
      const res = await signIn("credentials", {
        email: su.email,
        password: su.password,
        redirect: false,
      });
      if (res?.error) {
        toast.error("Compte créé. Connectez-vous avec vos identifiants.");
        setMode("login");
        setEmail(su.email);
      } else {
        toast.success(`Bienvenue ! Entreprise "${su.companyName}" créée.`);
        window.location.reload();
      }
    } catch (e: any) {
      setSignupError("Erreur réseau. Réessayez.");
    } finally {
      setSignupLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left — Hero */}
      <div className="relative hidden lg:flex flex-col justify-between bg-gradient-to-br from-emerald-700 via-teal-700 to-cyan-800 text-white p-12 overflow-hidden">
        <div className="absolute inset-0 opacity-10" aria-hidden>
          <svg width="100%" height="100%">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>
        <div className="relative inline-block bg-white/95 backdrop-blur rounded-xl px-5 py-3 shadow-lg">
  <img src="/logo-sidebar.png" alt="Finora" className="h-12 w-auto" />
</div>
        <div className="relative space-y-6 max-w-md">
          <h1 className="text-4xl font-bold leading-tight">
            Gérez votre entreprise en FCFA, en temps réel.
          </h1>
          <p className="text-white/85 text-lg">
            Finora centralise comptabilité, ventes, achats, stocks, facturation et trésorerie.
            Conforme au plan comptable OHADA, taillé pour les PME sénégalaises.
          </p>
          <div className="space-y-3 pt-4">
            <div className="flex items-start gap-3">
              <Zap className="h-5 w-5 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-white/90">
                <strong>Temps réel Supabase</strong> — chaque vente, achat ou règlement est synchronisé
                instantanément entre tous les utilisateurs connectés via Supabase Realtime.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <ShieldCheck className="h-5 w-5 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-white/90">
                <strong>Intégrité atomique</strong> — chaque vente décrémente le stock, alimente la caisse
                et écrit le journal OHADA dans une seule transaction.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <Layers className="h-5 w-5 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-white/90">
                <strong>Multi-tenant SaaS</strong> — chaque entreprise est isolée avec son propre plan
                comptable, ses utilisateurs et ses rôles.
              </p>
            </div>
          </div>
        </div>
        <div className="relative text-xs text-white/60">
          © 2026 Finora — Architecture SaaS multi-tenant, API-first, audit log complet.
        </div>
      </div>

      {/* Right — Auth forms */}
      <div className="flex items-center justify-center p-6 sm:p-12 bg-background">
  <div className="w-full max-w-md space-y-6">
    <div className="lg:hidden flex justify-center mb-8">
      <div className="inline-block bg-white rounded-xl px-4 py-2 shadow-sm">
        <img src="/logo-sidebar.png" alt="Finora" className="h-16 w-auto" />
      </div>
    </div>

          <Tabs value={mode} onValueChange={(v) => { setMode(v as Mode); setLoginError(null); setSignupError(null); }}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login"><LogIn className="h-4 w-4 mr-2" /> Connexion</TabsTrigger>
              <TabsTrigger value="signup"><UserPlus className="h-4 w-4 mr-2" /> Créer un compte</TabsTrigger>
            </TabsList>

            {/* LOGIN */}
            <TabsContent value="login" className="space-y-4 mt-4">
              <div>
                <h2 className="text-2xl font-bold">Connexion</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Accédez à votre espace de gestion d'entreprise.
                </p>
              </div>
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email professionnel</Label>
                  <Input id="email" type="email" placeholder="vous@entreprise.sn" value={email}
                    onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Mot de passe</Label>
                  <div className="relative">
  <Input id="password" type={showPassword ? "text" : "password"} placeholder="••••••••" value={password}
    onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" className="pr-9" />
  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground">
    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
  </button>
</div>
                </div>
                {loginError && (
                  <div className="rounded-md bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 px-3 py-2 text-sm text-rose-700 dark:text-rose-300">
                    {loginError}
                  </div>
                )}
                <Button type="submit" className="w-full" disabled={loginLoading}>
                  {loginLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Se connecter
                </Button>
              </form>
              <p className="text-xs text-center text-muted-foreground">
                Pas encore de compte ?{" "}
                <button onClick={() => setMode("signup")} className="text-primary font-medium hover:underline">
                  Créez votre entreprise en 1 minute
                </button>
              </p>
            </TabsContent>

            {/* SIGNUP */}
            <TabsContent value="signup" className="space-y-4 mt-4">
              <div>
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <Building2 className="h-6 w-6 text-primary" /> Créer mon entreprise
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Vous serez l'administrateur de votre espace. Ajoutez ensuite vos collaborateurs.
                </p>
              </div>
              <form onSubmit={handleSignup} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="su-company">Nom de l'entreprise *</Label>
                  <Input id="su-company" placeholder="Ex. Boutique Téranga SARL" value={su.companyName}
                    onChange={(e) => setSu({ ...su, companyName: e.target.value })} required />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="su-name">Votre nom *</Label>
                    <Input id="su-name" placeholder="Awa Ndiaye" value={su.name}
                      onChange={(e) => setSu({ ...su, name: e.target.value })} required />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="su-phone">Téléphone</Label>
                    <Input id="su-phone" placeholder="+221 77 000 00 00" value={su.phone}
                      onChange={(e) => setSu({ ...su, phone: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="su-email">Email *</Label>
                  <Input id="su-email" type="email" placeholder="awa@teranga.sn" value={su.email}
                    onChange={(e) => setSu({ ...su, email: e.target.value })} required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="su-password">Mot de passe * <span className="text-xs text-muted-foreground">(min. 8 caractères)</span></Label>
                  <Input id="su-password" type="password" placeholder="••••••••" value={su.password}
                    onChange={(e) => setSu({ ...su, password: e.target.value })} required minLength={8} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="su-city">Ville</Label>
                    <Select value={su.city} onValueChange={(v) => setSu({ ...su, city: v })}>
                      <SelectTrigger id="su-city"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {SENEGAL_CITIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="su-currency">Devise</Label>
                    <Select value={su.currency} onValueChange={(v) => setSu({ ...su, currency: v })}>
                      <SelectTrigger id="su-currency"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="XOF">FCFA (XOF)</SelectItem>
                        <SelectItem value="XAF">FCFA (XAF)</SelectItem>
                        <SelectItem value="EUR">Euro (EUR)</SelectItem>
                        <SelectItem value="USD">Dollar US (USD)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {signupError && (
                  <div className="rounded-md bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 px-3 py-2 text-sm text-rose-700 dark:text-rose-300">
                    {signupError}
                  </div>
                )}
                <Button type="submit" className="w-full" disabled={signupLoading}>
                  {signupLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Création…</> : <><Building2 className="h-4 w-4 mr-2" /> Créer mon entreprise</>}
                </Button>
                <p className="text-[10px] text-muted-foreground text-center">
                  En créant un compte, vous acceptez d'utiliser Finora pour la gestion de votre entreprise.
                  Vos données sont isolées et sécurisées.
                </p>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
