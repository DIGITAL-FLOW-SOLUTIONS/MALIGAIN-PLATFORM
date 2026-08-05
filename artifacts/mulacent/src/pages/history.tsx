import { useState } from "react";
import { useGetTransactions } from "@workspace/api-client-react";
import { useCurrency } from "@/hooks/use-currency";
import { useLocation } from "wouter";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  XCircle,
  Receipt,
  Plus,
  Zap,
  TrendingUp,
  Hourglass,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Filter = "all" | "withdrawal" | "recharge";

const TYPE_META: Record<string, { label: string; color: string; icon: typeof ArrowDownLeft }> = {
  recharge:   { label: "Deposit",     color: "bg-primary/10 text-primary",         icon: ArrowDownLeft },
  withdrawal: { label: "Withdrawal",  color: "bg-destructive/10 text-destructive",  icon: ArrowUpRight },
  bonus:      { label: "Bonus",       color: "bg-amber-100 text-amber-600",         icon: TrendingUp },
  commission: { label: "Commission",  color: "bg-secondary/10 text-secondary",      icon: TrendingUp },
};

const STATUS_META = {
  completed: { color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200", icon: CheckCircle2, label: "Paid" },
  pending:   { color: "text-amber-600",   bg: "bg-amber-50 border-amber-200",     icon: Hourglass,    label: "Pending" },
  failed:    { color: "text-destructive", bg: "bg-destructive/5 border-destructive/20", icon: XCircle, label: "Declined" },
};

export default function History() {
  const [filter, setFilter] = useState<Filter>("all");
  const { data, isLoading } = useGetTransactions({ type: filter, limit: 50 }, { query: { queryKey: ["transactions", filter], refetchInterval: 10_000 } });
  const { fmt } = useCurrency();
  const [, navigate] = useLocation();

  const txs = data?.transactions ?? [];

  const paidOut = txs
    .filter((t) => t.type === "withdrawal" && t.status === "completed")
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const pending = txs.filter((t) => t.status === "pending").length;
  const total = txs.length;

  const FILTERS: { key: Filter; label: string }[] = [
    { key: "all",        label: "All" },
    { key: "withdrawal", label: "Withdrawals" },
    { key: "recharge",   label: "Deposits" },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-4">

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-foreground leading-tight">
            Withdrawal <span className="text-primary">History</span>
          </h1>
          <p className="text-muted-foreground text-xs mt-0.5">Track all your transactions</p>
        </div>
        <button
          onClick={() => navigate("/withdraw")}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold text-xs text-primary-foreground bg-primary transition-all active:scale-95 shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" /> New Request
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3">
        {/* Paid out */}
        <div className="rounded-2xl p-4 relative overflow-hidden border border-primary/20 bg-card shadow-sm">
          <div className="absolute top-0 right-0 w-20 h-20 bg-primary/5 blur-2xl rounded-full pointer-events-none" />
          <div className="relative z-10 flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
              <CheckCircle2 className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-foreground font-black text-xl leading-none">{fmt(paidOut)}</p>
              <p className="text-primary text-[10px] font-bold uppercase tracking-widest mt-1">Paid Out</p>
            </div>
          </div>
        </div>

        {/* Pending */}
        <div className="rounded-2xl p-4 relative overflow-hidden border border-secondary/20 bg-card shadow-sm">
          <div className="absolute top-0 right-0 w-20 h-20 bg-secondary/5 blur-2xl rounded-full pointer-events-none" />
          <div className="relative z-10 flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-secondary/10 border border-secondary/20 flex items-center justify-center flex-shrink-0">
              <Hourglass className="w-4 h-4 text-secondary" />
            </div>
            <div>
              <p className="text-foreground font-black text-xl leading-none">{pending}</p>
              <p className="text-secondary text-[10px] font-bold uppercase tracking-widest mt-1">
                Pending · {total} Total
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Transactions card */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">

        {/* Card header */}
        <div className="px-4 pt-4 pb-3 border-b border-border space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-sm bg-primary flex-shrink-0" />
              <span className="text-foreground font-black text-sm">Transactions</span>
            </div>
            <span className="text-muted-foreground text-[10px] font-bold">{total} records</span>
          </div>
          {/* Filter tabs */}
          <div className="flex bg-muted border border-border rounded-lg p-0.5">
            {FILTERS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={cn(
                  "flex-1 py-1.5 rounded-md text-[11px] font-bold capitalize transition-all",
                  filter === key
                    ? "bg-primary text-primary-foreground shadow"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div className="divide-y divide-border">
          {isLoading ? (
            <div className="py-12 flex flex-col items-center gap-3">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span className="text-muted-foreground text-xs">Loading transactions…</span>
            </div>
          ) : txs.length === 0 ? (
            <div className="py-14 flex flex-col items-center gap-4 px-6 text-center">
              <div className="w-14 h-14 rounded-2xl bg-muted border border-border flex items-center justify-center">
                <Receipt className="w-6 h-6 text-muted-foreground" />
              </div>
              <div>
                <p className="text-foreground font-black text-base">No Withdrawals Yet</p>
                <p className="text-muted-foreground text-xs mt-1 max-w-xs">
                  Your withdrawal history will appear here once you make your first request.
                </p>
              </div>
              <button
                onClick={() => navigate("/withdraw")}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl font-black text-sm text-primary-foreground bg-primary shadow-sm transition-all active:scale-95"
              >
                <Zap className="w-3.5 h-3.5" /> Make First Withdrawal
              </button>
            </div>
          ) : (
            txs.map((tx) => {
              const isPositive = tx.type === "recharge" || tx.type === "bonus" || tx.type === "commission";
              const typeMeta = TYPE_META[tx.type] ?? { label: tx.type, color: "bg-muted text-muted-foreground", icon: Receipt };
              const statusMeta = STATUS_META[tx.status as keyof typeof STATUS_META] ?? STATUS_META.pending;
              const TypeIcon = typeMeta.icon;
              const StatusIcon = statusMeta.icon;

              return (
                <div key={tx.id} className="flex items-center gap-3 px-4 py-4 hover:bg-muted/50 transition-colors">
                  {/* Icon */}
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0", typeMeta.color)}>
                    <TypeIcon className="w-4 h-4" />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-foreground font-bold text-sm capitalize leading-tight">{typeMeta.label}</p>
                  </div>

                  {/* Status + Amount */}
                  <div className="text-right flex-shrink-0">
                    <p className={cn("font-black text-sm leading-tight", isPositive ? "text-emerald-600" : "text-foreground")}>
                      {isPositive ? "+" : "-"}{fmt(tx.amount)}
                    </p>
                    <div className={cn("inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border mt-1", statusMeta.bg)}>
                      <StatusIcon className={cn("w-2.5 h-2.5", statusMeta.color)} />
                      <span className={cn("text-[9px] font-bold", statusMeta.color)}>{statusMeta.label}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
