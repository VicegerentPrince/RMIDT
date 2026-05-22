import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(value: number | null | undefined, currency = "USD"): string {
  if (value == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatPct(value: number | null | undefined): string {
  if (value == null) return "—";
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

export function formatLargeNumber(value: number | null | undefined): string {
  if (value == null) return "—";
  if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  return value.toFixed(0);
}

export const REGIME_COLORS: Record<string, string> = {
  Expansion: "#10b981",
  Peak: "#f59e0b",
  Contraction: "#f97316",
  Crisis: "#ef4444",
  Recovery: "#3b82f6",
};

export const REGIME_BG: Record<string, string> = {
  Expansion: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  Peak: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  Contraction: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  Crisis: "bg-red-500/15 text-red-400 border-red-500/30",
  Recovery: "bg-blue-500/15 text-blue-400 border-blue-500/30",
};
