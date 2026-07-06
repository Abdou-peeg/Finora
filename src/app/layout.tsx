import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { AppProviders } from "@/components/providers";
import { TopLoadingBar } from "@/components/top-loading-bar";

export const metadata: Metadata = {
  title: "Finora",
  description:
    "Finora centralise toute la gestion d'entreprise dans une plateforme unifiée.",
  icons: { icon: "/logo-icon.png" },
  manifest: "/manifest.json",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className="antialiased bg-background text-foreground">
        <TopLoadingBar />
        <AppProviders>{children}</AppProviders>
        <Toaster />
        <SonnerToaster richColors closeButton position="top-right" />
      </body>
    </html>
  );
}
