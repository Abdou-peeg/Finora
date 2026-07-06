"use client";

import { toast } from "sonner";

/**
 * Récupère un PDF depuis une route protégée de l'app, puis :
 * - sur mobile (navigateur supportant le partage de fichiers) : ouvre le sélecteur
 *   de partage natif (WhatsApp, Mail, Bluetooth...) avec le vrai fichier PDF joint.
 * - sur desktop (pas de support fichier) : télécharge/ouvre le PDF, et ouvre WhatsApp
 *   Web dans un nouvel onglet avec un message pré-rempli invitant à joindre le fichier.
 */
export async function sharePdf(opts: {
  url: string;
  filename: string;
  title?: string;
  message?: string;
}) {
  try {
    const res = await fetch(opts.url);
    if (!res.ok) throw new Error("Impossible de générer le document");
    const blob = await res.blob();
    const file = new File([blob], opts.filename, { type: "application/pdf" });

    const canShareFiles =
      typeof navigator !== "undefined" &&
      (navigator as any).canShare &&
      (navigator as any).canShare({ files: [file] });

    if (canShareFiles) {
      await (navigator as any).share({
        files: [file],
        title: opts.title || "Document Finora",
        text: opts.message || "",
      });
      return;
    }

    // Fallback desktop : télécharge le PDF et ouvre WhatsApp Web avec un message prêt à envoyer
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = opts.filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(blobUrl);

    const text = encodeURIComponent(
      (opts.message || "Voici votre document.") + " (fichier téléchargé — à joindre manuellement ici)"
    );
    window.open(`https://wa.me/?text=${text}`, "_blank");
    toast.info("PDF téléchargé — joignez-le dans la conversation WhatsApp qui s'est ouverte.");
  } catch (e: any) {
    if (e?.name === "AbortError") return; // utilisateur a annulé le partage, pas une vraie erreur
    toast.error(e.message || "Impossible de partager le document");
  }
}