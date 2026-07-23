import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Users, UserCheck, UserX, AlertCircle, TrendingUp, TrendingDown, Clock, CheckCircle, Wallet } from "lucide-react";

function StatCard({ label, value, icon: Icon, color, sub }: {
  label: string; value: string | number; icon: React.FC<{ className?: string }>;
  color: string; sub?: string;
}) {
  return (
    <div className="bg-card rounded-xl p-5 shadow-sm border border-border">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
          <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
          {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
        </div>
        <div className={`p-2.5 rounded-lg ${color.replace("text-", "bg-").replace("-600", "-50").replace("-700", "-50")}`}>
          <Icon className={`h-5 w-5 ${color}`} />
        </div>
      </div>
    </div>
  );
}

const COUNTRY_FLAGS: Record<string, string> = {
  KE: "🇰🇪", TZ: "🇹🇿", UG: "🇺🇬",
  GH: "🇬🇭", ZM: "🇿🇲", CM: "🇨🇲",
};

const COUNTRY_CURRENCY: Record<string, string> = {
  KE: "KES", TZ: "TZS", UG: "UGX",
  GH: "GHS", ZM: "ZMW", CM: "XAF",
};

function fmtAmount(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

type CurrencyRow = { currency: string; label: string; total: number };

function CurrencyBreakdownCard({
  title, icon: Icon, color, rows, emptyText,
}: {
  title: string;
  icon: React.FC<{ className?: string }>;
  color: string;
  rows: CurrencyRow[];
  emptyText: string;
}) {
  const iconBg = color.replace("text-", "bg-").replace("-600", "-50").replace("-700", "-50");
  const totalAll = rows.reduce((s, r) => s + r.total, 0);

  return (
    <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center gap-3">
        <div className={`p-2 rounded-lg ${iconBg}`}>
          <Icon className={`h-4 w-4 ${color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {rows.length} {rows.length === 1 ? "currency" : "currencies"} · all-time
          </p>
        </div>
        {rows.length > 0 && (
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${iconBg} ${color}`}>
            {rows.length} records
          </span>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="px-5 py-8 text-center text-muted-foreground text-sm">{emptyText}</div>
      ) : (
        <div className="divide-y divide-border">
          {rows.map((row) => {
            const pct = totalAll > 0 ? (row.total / totalAll) * 100 : 0;
            return (
              <div key={row.currency} className="px-5 py-3.5">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium text-foreground">{row.label}</span>
                  <span className="text-sm font-bold text-foreground">
                    {row.currency} {fmtAmount(row.total)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${color.replace("text-", "bg-")}`}
                      style={{ width: `${Math.max(2, pct)}%` }}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground w-10 text-right shrink-0">
                    {pct.toFixed(0)}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const { data: stats, isLoading, error } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: api.stats,
    refetchInterval: 30000,
  });

  if (isLoading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  );

  if (error) return (
    <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 text-destructive text-sm">
      Failed to load stats: {error instanceof Error ? error.message : "Unknown error"}
    </div>
  );

  const fmt = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n);
  const wallets = stats!.walletsByCountry ?? [];
  const deposits = stats!.depositsByCurrency ?? [];
  const withdrawals = stats!.withdrawalsByCurrency ?? [];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Platform overview</p>
      </div>

      {/* User stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Users"    value={fmt(stats!.totalUsers)}      icon={Users}      color="text-foreground"   sub={`+${stats!.recentSignups} this week`} />
        <StatCard label="Active Users"   value={fmt(stats!.activeUsers)}     icon={UserCheck}  color="text-green-600" />
        <StatCard label="Inactive Users" value={fmt(stats!.inactiveUsers)}   icon={UserX}      color="text-amber-600" />
        <StatCard label="Suspended"      value={fmt(stats!.suspendedUsers)}  icon={AlertCircle} color="text-red-600" />
      </div>

      {/* Pending actions row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatCard label="Pending Verifications" value={stats!.pendingVerifications} icon={Clock}        color="text-orange-600" />
        <StatCard label="Pending Withdrawals"   value={stats!.pendingWithdrawals}   icon={CheckCircle}  color="text-blue-600"   />
        <StatCard label="Total Transactions"    value={stats!.totalTransactions.toLocaleString()} icon={TrendingUp} color="text-foreground" sub="all-time" />
      </div>

      {/* Deposits & Withdrawals by currency */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <CurrencyBreakdownCard
          title="Total Deposits by Currency"
          icon={TrendingUp}
          color="text-primary"
          rows={deposits}
          emptyText="No completed deposits yet"
        />
        <CurrencyBreakdownCard
          title="Total Withdrawals by Currency"
          icon={TrendingDown}
          color="text-secondary"
          rows={withdrawals}
          emptyText="No completed withdrawals yet"
        />
      </div>

      {/* Main Wallet Balances by Country */}
      <div className="bg-card rounded-xl shadow-sm border border-border">
        <div className="px-5 py-4 border-b border-border flex items-center gap-2">
          <Wallet className="h-5 w-5 text-primary" />
          <div>
            <h2 className="text-sm font-semibold text-foreground">Team Earnings Balance by Country</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Total team_earnings balance across all user wallets, grouped by country</p>
          </div>
        </div>

        {wallets.length === 0 ? (
          <div className="px-5 py-8 text-center text-muted-foreground text-sm">No wallet data available</div>
        ) : (
          <div className="divide-y divide-border">
            {wallets.map((c) => {
              const currency = COUNTRY_CURRENCY[c.code] ?? c.code;
              return (
                <div key={c.code} className="px-5 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl leading-none">{COUNTRY_FLAGS[c.code] ?? "🌍"}</span>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{c.name}</p>
                      <p className="text-xs text-muted-foreground">{c.code}</p>
                    </div>
                  </div>
                  <p className="text-sm font-bold text-foreground">
                    {currency} {c.total.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
