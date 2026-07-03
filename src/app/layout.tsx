import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { AppProviders } from "@/components/providers";

export const metadata: Metadata = {
  title: "Finora — ERP SaaS multi-modules",
  description:
    "Finora centralise toute la gestion d'entreprise dans une plateforme unifiée synchronisée en temps réel : comptabilité, ventes, achats, stocks, facturation, trésorerie.",
  icons: { icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className="antialiased bg-background text-foreground">
        <AppProviders>{children}</AppProviders>
        <Toaster />
        <SonnerToaster richColors closeButton position="top-right" />
      </body>
    </html>
  );
}
