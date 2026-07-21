import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const COUNTRY_CURRENCY_MAP: Record<string, { code: string; symbol: string }> = {
  KE: { code: "KES", symbol: "KES" },
  GH: { code: "GHS", symbol: "GHS" },
  CM: { code: "XAF", symbol: "XAF" },
  UG: { code: "UGX", symbol: "UGX" },
  TZ: { code: "TZS", symbol: "TZS" },
  ZM: { code: "ZK",  symbol: "ZK"  },
};

export const DEFAULT_CURRENCY = COUNTRY_CURRENCY_MAP["KE"];

export function getCurrencyInfo(countryCode?: string | null) {
  if (!countryCode) return DEFAULT_CURRENCY;
  return COUNTRY_CURRENCY_MAP[countryCode.toUpperCase()] ?? DEFAULT_CURRENCY;
}

export function formatCurrency(amount: number, countryCode?: string | null): string {
  const { code } = getCurrencyInfo(countryCode);
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(amount));
  return `${code} ${formatted}`;
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
