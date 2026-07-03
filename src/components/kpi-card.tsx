"use client";

import { currency, number } from "@/lib/format";

interface KpiCardProps {
  label: string;
  value: number | string;
  suffix?: string;
  hint?: string;
  trend?: "up" | "down" | "neutral";
  icon?: React.ReactNode;
  variant?: "default" | "success" | "warning" | "danger";
  format?: "currency" | "number";
}

export function KpiCard({ label, value, suffix, hint, trend, icon, variant = "default", format = "currency" }: KpiCardProps) {
  const variantClass = {
    default: "border-border",
    success: "border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-950/20",
    warning: "border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20",
    danger: "border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/20",
  }[variant];

  const formatted = typeof value === "number" ? (format === "number" ? number(value) : currency(value)) : value;

  return (
    <div className={`rounded-xl border p-5 ${variantClass} transition-shadow hover:shadow-md`}>
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold tabular-nums">
            {formatted}
            {suffix && <span className="ml-1 text-sm font-normal text-muted-foreground">{suffix}</span>}
          </p>
          {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        </div>
        {icon && (
          <div className="rounded-lg bg-primary/10 p-2 text-primary" aria-hidden>
            {icon}
          </div>
        )}
      </div>
      {trend && (
        <div className="mt-3 flex items-center gap-1 text-xs">
          <span
            className={
              trend === "up"
                ? "text-emerald-600"
                : trend === "down"
                ? "text-rose-600"
                : "text-muted-foreground"
            }
          >
            {trend === "up" ? "▲" : trend === "down" ? "▼" : "■"} {trend === "up" ? "Hausse" : trend === "down" ? "Baisse" : "Stable"}
          </span>
        </div>
      )}
    </div>
  );
}
