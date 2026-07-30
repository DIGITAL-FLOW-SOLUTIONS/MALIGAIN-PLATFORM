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
  NG: { code: "NGN", symbol: "NGN" },
  RW: { code: "RWF", symbol: "RWF" },
  BI: { code: "BIF", symbol: "BIF" },
  MW: { code: "MWK", symbol: "MWK" },
  BW: { code: "BWP", symbol: "BWP" },
  SS: { code: "SSP", symbol: "SSP" },
  CG: { code: "XAF", symbol: "XAF" },
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

/**
 * Returns a Tailwind font-size class that shrinks as the formatted amount
 * string grows longer, so large numbers never overflow their container.
 *
 * base "lg"  – hero / large balance displays   (3xl → base)
 * base "md"  – stat cards / medium displays     (2xl → sm)
 * base "sm"  – inline / compact displays        (xl  → xs)
 */
export function amountFontClass(
  formattedAmount: string,
  base: "lg" | "md" | "sm" = "md",
): string {
  const len = formattedAmount.length;
  if (base === "lg") {
    if (len <= 7)  return "text-3xl";
    if (len <= 10) return "text-2xl";
    if (len <= 13) return "text-xl";
    if (len <= 15) return "text-lg";
    return "text-base";
  }
  if (base === "md") {
    if (len <= 7)  return "text-2xl";
    if (len <= 10) return "text-xl";
    if (len <= 13) return "text-lg";
    if (len <= 15) return "text-base";
    return "text-sm";
  }
  // sm
  if (len <= 7)  return "text-xl";
  if (len <= 10) return "text-lg";
  if (len <= 13) return "text-base";
  if (len <= 15) return "text-sm";
  return "text-xs";
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
