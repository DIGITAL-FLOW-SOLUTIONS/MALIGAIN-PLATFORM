import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { formatCurrency } from "@/lib/utils";
import { useLocation } from "wouter";
import {
  TrendingUp, BarChart2, Clock, DollarSign, CheckCircle2,
  Star, Trophy, Calendar, ChevronRight, Loader2, ArrowLeft
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Investment {
  id: number;
  planName: string;
  brandName: string;
  category: string;
  depositAmount: number;
  dailyProfitAmount: number;
  totalDays: number;
  totalProfit: number;
  imageUrl: string | null;
  totalEarned: number;
  daysElapsed: number;
  status: "pending" | "active" | "completed" | "cancelled";
  startDate: string | null;
  nextCreditAt: string | null;
  createdAt: string;
}

export default function InvestmentsCurrent() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const country = user?.country ?? "KE";
  const fmt = (n: number) => formatCurrency(n, country);

  const [investments, setInvestments]     = useState<Investment[]>([]);
  const [loading, setLoading]             = useState(true);
  const [totalInvested, setTotalInvested] = useState(0);
  const [totalEarned, setTotalEarned]     = useState(0);
  const [activeCount, setActiveCount]     = useState(0);

  function load() {
    fetch(`${import.meta.env.BASE_URL}api/investments/my`, { credentials: "include" })
      .then(r => r.json())
      .then(d => {
        setInvestments(d.investments ?? []);
        setTotalInvested(d.totalInvested ?? 0);
        setTotalEarned(d.totalEarned ?? 0);
        setActiveCount(d.activeCount ?? 0);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  const active    = investments.filter(i => i.status === "active");
  const pending   = investments.filter(i => i.status === "pending");
  const completed = investments.filter(i => i.status === "completed");

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto pb-10">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-5 pb-4">
        <button onClick={() => navigate("/investments")} className="p-2 rounded-xl hover:bg-muted transition-colors">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <div>
          <h1 className="text-xl font-extrabold text-foreground">My Investments</h1>
          <p className="text-xs text-muted-foreground">Track your earnings in real-time</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3 px-4 mb-5">
        <SummaryCard icon={DollarSign} label="Invested" value={fmt(totalInvested)} color="bg-blue-500" />
        <SummaryCard icon={TrendingUp} label="Earned"   value={fmt(totalEarned)}   color="bg-emerald-500" />
        <SummaryCard icon={BarChart2}  label="Active"   value={String(activeCount)} color="bg-primary" />
      </div>

      {/* Invest More CTA */}
      <button
        onClick={() => navigate("/investments")}
        className="flex items-center justify-between w-full mx-auto max-w-[calc(100%-2rem)] mb-5 px-4 py-3 rounded-xl bg-primary/5 border border-primary/20 text-sm text-primary font-medium hover:bg-primary/10 transition-all"
      >
        <span className="flex items-center gap-2"><Star className="w-4 h-4" />Browse More Plans</span>
        <ChevronRight className="w-4 h-4" />
      </button>

      {investments.length === 0 ? (
        <EmptyState onBrowse={() => navigate("/investments")} />
      ) : (
        <div className="space-y-4 px-4">
          {/* Active investments */}
          {active.length > 0 && (
            <Section title="Active Investments" count={active.length}>
              {active.map(inv => <InvestmentCard key={inv.id} inv={inv} fmt={fmt} />)}
            </Section>
          )}

          {/* Pending */}
          {pending.length > 0 && (
            <Section title="Pending Verification" count={pending.length}>
              {pending.map(inv => <InvestmentCard key={inv.id} inv={inv} fmt={fmt} pending />)}
            </Section>
          )}

          {/* Completed */}
          {completed.length > 0 && (
            <Section title="Completed" count={completed.length}>
              {completed.map(inv => <InvestmentCard key={inv.id} inv={inv} fmt={fmt} completed />)}
            </Section>
          )}
        </div>
      )}
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: string; color: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-3 text-center">
      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center mx-auto mb-1.5", color)}>
        <Icon className="w-4 h-4 text-white" />
      </div>
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className="text-xs font-bold text-foreground truncate">{value}</p>
    </div>
  );
}

function Section({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <h2 className="text-sm font-bold text-foreground">{title}</h2>
        <span className="bg-primary/10 text-primary text-[10px] font-bold px-1.5 py-0.5 rounded-full">{count}</span>
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function InvestmentCard({ inv, fmt, pending = false, completed = false }: {
  inv: Investment; fmt: (n: number) => string; pending?: boolean; completed?: boolean;
}) {
  const progress      = inv.totalProfit > 0 ? Math.min(100, (inv.totalEarned / inv.totalProfit) * 100) : 0;
  const daysRemaining = Math.max(0, inv.totalDays - inv.daysElapsed);

  const nextCreditStr = inv.nextCreditAt
    ? formatTimeUntil(new Date(inv.nextCreditAt))
    : null;

  return (
    <div className={cn(
      "bg-card border rounded-2xl overflow-hidden shadow-sm",
      completed ? "border-emerald-200 dark:border-emerald-800" : "border-border",
      pending   ? "opacity-80" : ""
    )}>
      {/* Top row */}
      <div className="flex gap-3 p-4 pb-3">
        <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-muted flex items-center justify-center">
          {inv.imageUrl
            ? <img src={inv.imageUrl} alt={inv.planName} className="w-full h-full object-cover" />
            : <BarChart2 className="w-6 h-6 text-muted-foreground opacity-40" />
          }
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{inv.brandName}</p>
              <h3 className="text-sm font-bold text-foreground leading-tight">{inv.planName}</h3>
            </div>
            <StatusBadge status={inv.status} />
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 capitalize">{inv.category} Plan</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 px-4 pb-3 text-center">
        <StatCell label="Deposited"    value={fmt(inv.depositAmount)} />
        <StatCell label="Daily Profit" value={fmt(inv.dailyProfitAmount)} highlight />
        <StatCell label="Total Earned" value={fmt(inv.totalEarned)} />
      </div>

      {/* Progress bar — only for active */}
      {inv.status === "active" && (
        <div className="px-4 pb-3">
          <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
            <span>Progress: Day {inv.daysElapsed}/{inv.totalDays}</span>
            <span>{daysRemaining} days left</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          {nextCreditStr && (
            <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
              <Clock className="w-3 h-3" />Next profit in {nextCreditStr}
            </p>
          )}
        </div>
      )}

      {/* Completed achievement */}
      {completed && (
        <div className="mx-4 mb-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-xl p-3 flex items-center gap-3">
          <Trophy className="w-8 h-8 text-amber-500 flex-shrink-0" />
          <div>
            <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400">🎉 Investment Complete!</p>
            <p className="text-[10px] text-emerald-600 dark:text-emerald-500">You earned {fmt(inv.totalEarned)} from this plan. Excellent work!</p>
          </div>
        </div>
      )}

      {/* Pending */}
      {pending && (
        <div className="mx-4 mb-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-3">
          <p className="text-[10px] text-amber-700 dark:text-amber-400 font-medium">⏳ Payment under review — usually activated within a few hours</p>
        </div>
      )}
    </div>
  );
}

function StatCell({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className={cn("text-xs font-bold", highlight ? "text-rose-500" : "text-foreground")}>{value}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active:    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400",
    pending:   "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400",
    completed: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400",
    cancelled: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
  };
  return (
    <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full capitalize", map[status] ?? "bg-muted text-muted-foreground")}>
      {status}
    </span>
  );
}

function EmptyState({ onBrowse }: { onBrowse: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
        <TrendingUp className="w-10 h-10 text-primary" />
      </div>
      <h2 className="text-base font-bold text-foreground mb-2">No Active Investments</h2>
      <p className="text-sm text-muted-foreground mb-6">Start investing today and earn daily profits automatically</p>
      <button
        onClick={onBrowse}
        className="px-6 py-3 bg-primary text-primary-foreground text-sm font-bold rounded-xl hover:bg-primary/90 transition-colors"
      >
        Browse Investment Plans
      </button>
    </div>
  );
}

function formatTimeUntil(target: Date): string {
  const ms = target.getTime() - Date.now();
  if (ms <= 0) return "soon";
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}
