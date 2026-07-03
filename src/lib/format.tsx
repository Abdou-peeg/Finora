// Sénégal — FCFA (XOF), locale fr-SN
// Le FCFA n'a pas de subdivision centime, on arrondit à l'entier le plus proche.

export function currency(v: number, _currency = "XOF", _locale = "fr-SN") {
  if (Number.isNaN(v)) return "—";
  // Format Sénégal : "1 250 000 FCFA"
  const rounded = Math.round(v);
  return new Intl.NumberFormat("fr-SN", { maximumFractionDigits: 0 }).format(rounded) + " FCFA";
}

export function number(v: number, locale = "fr-SN") {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(v);
}

export function dateShort(d: string | Date) {
  return new Intl.DateTimeFormat("fr-SN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(d));
}

export function dateTimeShort(d: string | Date) {
  return new Intl.DateTimeFormat("fr-SN", {
    day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  }).format(new Date(d));
}

export const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  CONFIRMED: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  INVOICED: "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300",
  PAID: "bg-emerald-600 text-white",
  CANCELLED: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
  UNPAID: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  PARTIAL: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
  IN: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  OUT: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
};

export function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_COLORS[status] ?? "bg-slate-100 text-slate-700";
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${cls}`}>
      {status}
    </span>
  );
}

// Villes principales du Sénégal pour les formulaires
export const SENEGAL_CITIES = [
  "Dakar", "Pikine", "Guédiawaye", "Rufisque", "Bargny", "Thiès", "Mbour", "Saly",
  "Touba", "Diourbel", "Saint-Louis", "Richard-Toll", "Kaolack", "Nioro du Rip",
  "Ziguinchor", "Bignona", "Sédhiou", "Kolda", "Vélingara", "Tambacounda",
  "Louga", "Linguère", "Matam", "Kédougou", "Tambao",
];

// Taux de TVA standards au Sénégal (CGI Sénégal)
export const SENEGAL_TVA_RATES = [
  { label: "TVA standard 18%", value: 18 },
  { label: "TVA réduite 10% (certains produits)", value: 10 },
  { label: "Exonéré 0%", value: 0 },
];
