import { useAuth } from "@/hooks/use-auth";
import { formatCurrency, getCurrencyInfo } from "@/lib/utils";

export function useCurrency() {
  const { user } = useAuth();
  const country = user?.country ?? null;
  const currencyInfo = getCurrencyInfo(country);

  const fmt = (amount: number) => formatCurrency(amount, country);

  return { fmt, currencyInfo, country };
}
