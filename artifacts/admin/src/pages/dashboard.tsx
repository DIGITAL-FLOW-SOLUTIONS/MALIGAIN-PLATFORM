import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Users, UserCheck, UserX, AlertCircle, TrendingUp, TrendingDown, Clock, CheckCircle, Wallet, Terminal } from "lucide-react";

function StatCard({ label, value, icon: Icon, colorClass, sub }: {
  label: string; value: string | number; icon: React.FC<{ className?: string }>;
  colorClass: string; sub?: string;
}) {
  return (
    <div className="bg-card border border-border p-4 relative group hover:border-primary/40 transition-colors">
      <div className={`absolute top-0 left-0 w-1 h-full ${colorClass}`} />
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-mono font-bold text-muted-foreground uppercase tracking-widest mb-1">{label}</p>
          <p className="text-2xl font-mono font-bold text-foreground tracking-tight">{value}</p>
          {sub && <p className="text-[10px] font-mono text-muted-foreground mt-1.5 tracking-wider uppercase flex items-center gap-1.5">
            <span className={`w-1 h-1 inline-block rounded-full ${colorClass}`} />
            {sub}
          </p>}
        </div>
        <Icon className={`h-5 w-5 opacity-40 ${colorClass.replace('bg-', 'text-')}`} />
      </div>
    </div>
  );
}

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

function CurrencyTable({
  title, rows, colorClass, emptyText,
}: {
  title: string;
  rows: CurrencyRow[];
  colorClass: string;
  emptyText: string;
}) {
  const totalAll = rows.reduce((s, r) => s + r.total, 0);

  return (
    <div className="bg-card border border-border flex flex-col h-full relative">
      {/* Corner accent */}
      <div className="absolute top-0 right-0 w-4 h-4 border-t border-r border-muted-foreground/30 pointer-events-none" />
      
      <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-muted/10">
        <h2 className="text-[11px] font-mono font-bold text-foreground uppercase tracking-widest">{title}</h2>
        <span className="text-[10px] font-mono text-muted-foreground border border-border px-1.5 py-0.5 bg-background">
          {rows.length} RECORD{rows.length !== 1 ? 'S' : ''}
        </span>
      </div>

      <div className="flex-1 p-4">
        {rows.length === 0 ? (
          <div className="h-full flex items-center justify-center text-muted-foreground font-mono text-[10px] tracking-widest uppercase">
            [ {emptyText} ]
          </div>
        ) : (
          <div className="space-y-4">
            {rows.map((row) => {
              const pct = totalAll > 0 ? (row.total / totalAll) * 100 : 0;
              return (
                <div key={row.currency} className="group">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
                      {row.label} <span className="text-foreground/70">[{row.currency}]</span>
                    </span>
                    <span className="text-xs font-mono font-bold text-foreground tracking-wider">
                      {fmtAmount(row.total)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-[3px] bg-muted overflow-hidden relative">
                      <div
                        className={`absolute top-0 left-0 h-full transition-all duration-1000 ${colorClass}`}
                        style={{ width: `${Math.max(1, pct)}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-mono text-muted-foreground w-8 text-right shrink-0 tracking-wider">
                      {pct.toFixed(0)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
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
    <div className="flex items-center justify-center h-[60vh]">
      <div className="flex flex-col items-center gap-4">
        <Terminal className="h-6 w-6 text-primary animate-pulse" />
        <div className="text-[10px] text-primary font-mono tracking-widest uppercase">FETCHING_TELEMETRY_</div>
      </div>
    </div>
  );

  if (error) return (
    <div className="bg-destructive/10 border border-destructive p-4 text-destructive font-mono text-xs uppercase flex items-start gap-3">
      <AlertCircle className="h-4 w-4 shrink-0" />
      <div>
        <p className="font-bold tracking-widest mb-1">ERR_DATA_FETCH_FAILED</p>
        <p className="opacity-80 tracking-wider">{error instanceof Error ? error.message : "UNKNOWN_ERROR"}</p>
      </div>
    </div>
  );

  const fmt = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n);
  const wallets = stats!.walletsByCountry ?? [];
  const deposits = stats!.depositsByCurrency ?? [];
  const withdrawals = stats!.withdrawalsByCurrency ?? [];

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-border">
        <div>
          <h1 className="text-lg font-mono font-bold text-foreground tracking-widest uppercase mb-1.5 flex items-center gap-2.5">
            <div className="w-2 h-2 bg-primary animate-pulse shadow-[0_0_8px_rgba(0,229,255,0.8)]" />
            Global Overview
          </h1>
          <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
            REAL-TIME PLATFORM TELEMETRY
          </p>
        </div>
        <div className="text-[10px] font-mono font-bold text-primary tracking-widest bg-primary/5 px-2.5 py-1 border border-primary/20 inline-block shadow-[0_0_10px_rgba(0,229,255,0.05)_inset]">
          STATUS: ONLINE // SYNCED
        </div>
      </div>

      {/* Grid 1: Users */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Users"    value={fmt(stats!.totalUsers)}      icon={Users}      colorClass="bg-primary"   sub={`+${stats!.recentSignups} NEW THIS WEEK`} />
        <StatCard label="Active"         value={fmt(stats!.activeUsers)}     icon={UserCheck}  colorClass="bg-green-500" sub="VERIFIED & ACTIVE" />
        <StatCard label="Inactive"       value={fmt(stats!.inactiveUsers)}   icon={UserX}      colorClass="bg-orange-500" sub="REQUIRES ATTENTION" />
        <StatCard label="Suspended"      value={fmt(stats!.suspendedUsers)}  icon={AlertCircle} colorClass="bg-destructive" sub="ACCOUNT LOCKED" />
      </div>

      {/* Grid 2: Actionable */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard label="Pending KYC"    value={stats!.pendingVerifications} icon={Clock}        colorClass="bg-orange-500" sub="ACTION REQUIRED" />
        <StatCard label="Pending Withdraw" value={stats!.pendingWithdrawals}   icon={CheckCircle}  colorClass="bg-blue-500" sub="ACTION REQUIRED" />
        <StatCard label="Total Txns"     value={stats!.totalTransactions.toLocaleString()} icon={TrendingUp} colorClass="bg-purple-500" sub="ALL-TIME LEDGER" />
      </div>

      {/* Grid 3: Currencies */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <CurrencyTable
          title="Inflow by Currency"
          colorClass="bg-primary"
          rows={deposits}
          emptyText="NO INFLOW DATA"
        />
        <CurrencyTable
          title="Outflow by Currency"
          colorClass="bg-purple-500"
          rows={withdrawals}
          emptyText="NO OUTFLOW DATA"
        />
      </div>

      {/* Main Wallet Balances */}
      <div className="bg-card border border-border relative mt-6">
        <div className="px-4 py-3 border-b border-border bg-muted/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Wallet className="h-[18px] w-[18px] text-primary" />
            <h2 className="text-[11px] font-mono font-bold text-foreground uppercase tracking-widest mt-0.5">Reserves by Region</h2>
          </div>
          <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest hidden sm:inline-block">
            TEAM_EARNINGS LIABILITY
          </span>
        </div>

        {wallets.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground font-mono text-[10px] tracking-widest uppercase">
            [ NO RESERVE DATA FOUND ]
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 divide-y sm:divide-y-0 sm:gap-px bg-border">
            {wallets.map((c) => {
              const currency = COUNTRY_CURRENCY[c.code] ?? c.code;
              return (
                <div key={c.code} className="bg-card p-4 hover:bg-muted/20 transition-colors group relative">
                  <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                  
                  <div className="flex items-center justify-between mb-3 relative z-10">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold bg-background border border-border px-1.5 py-0.5 text-foreground tracking-widest">
                        {c.code}
                      </span>
                      <span className="text-[11px] font-mono text-muted-foreground uppercase tracking-widest">{c.name}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-baseline gap-2 relative z-10">
                    <span className="text-[10px] font-mono text-primary font-bold tracking-widest">{currency}</span>
                    <span className="text-xl font-mono font-bold text-foreground tracking-tight">
                      {c.total.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
