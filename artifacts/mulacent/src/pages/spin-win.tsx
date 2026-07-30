/**
 * Spin & Win landing page — lets the user choose between Free Spin and Bet Spin.
 */
import { useLocation } from "wouter";
import { Zap, Coins, ChevronRight, Gift, TrendingUp } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useSpinBalance } from "@/hooks/use-spin-balance";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

export default function SpinWin() {
  const [, navigate] = useLocation();
  const { user }     = useAuth();
  const spin         = useSpinBalance();

  const country = user?.country ?? "KE";
  const fmt     = (n: number) => formatCurrency(n, country);

  return (
    <div className="max-w-lg mx-auto pb-10">
      {/* Header */}
      <div className="text-center py-8">
        <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center shadow-xl shadow-pink-500/30">
          <span className="text-4xl">🎰</span>
        </div>
        <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Spin & Win</h1>
        <p className="text-sm text-muted-foreground mt-2">
          Try your luck — spin the wheel and win amazing prizes!
        </p>
      </div>

      {/* Spin Balance summary */}
      {!spin.loading && (
        <div className="mx-4 mb-6 p-4 rounded-2xl bg-gradient-to-r from-violet-500/10 to-pink-500/10 border border-violet-200 dark:border-violet-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Spin Balance</p>
              <p className="text-xl font-black text-foreground">{fmt(spin.spinBalance)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Earned</p>
              <p className="text-xl font-black text-emerald-600">{fmt(spin.spinEarnings)}</p>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-violet-200/50 dark:border-violet-800/50">
            <p className="text-xs text-muted-foreground text-center">
              Bet spin cost: <span className="font-bold text-foreground">{fmt(spin.spinCost)} per spin</span>
            </p>
          </div>
        </div>
      )}

      {/* Mode cards */}
      <div className="px-4 space-y-4">
        {/* Free Spin card */}
        <button
          onClick={() => navigate("/spin/free")}
          className="w-full text-left"
        >
          <div className={cn(
            "relative overflow-hidden rounded-2xl p-5 shadow-lg transition-all active:scale-[0.98]",
            "bg-gradient-to-br from-emerald-500 to-teal-600",
          )}>
            {/* Decorative circles */}
            <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/10" />
            <div className="absolute -right-2 -bottom-6 w-20 h-20 rounded-full bg-white/10" />

            <div className="relative z-10">
              <div className="flex items-start justify-between mb-3">
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                  <Gift className="w-6 h-6 text-white" />
                </div>
                <div className="flex items-center gap-1 bg-white/20 rounded-full px-3 py-1">
                  <span className="text-xs font-bold text-white">FREE</span>
                </div>
              </div>
              <h2 className="text-xl font-extrabold text-white leading-tight">Free Spin</h2>
              <p className="text-sm text-white/80 mt-1">
                1 free spin every day — no deposit needed!
              </p>

              <div className="mt-4 flex items-center justify-between">
                <div className="flex flex-col gap-0.5">
                  {spin.canFreeSpin ? (
                    <span className="text-sm font-bold text-emerald-100 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-200 animate-pulse" />
                      Free spin available now!
                    </span>
                  ) : (
                    <span className="text-sm font-medium text-white/60">
                      Come back tomorrow
                    </span>
                  )}
                </div>
                <ChevronRight className="w-6 h-6 text-white/70" />
              </div>
            </div>
          </div>
        </button>

        {/* Bet Spin card */}
        <button
          onClick={() => navigate("/spin/bet")}
          className="w-full text-left"
        >
          <div className={cn(
            "relative overflow-hidden rounded-2xl p-5 shadow-lg transition-all active:scale-[0.98]",
            "bg-gradient-to-br from-violet-600 to-purple-700",
          )}>
            <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-white/10" />
            <div className="absolute -right-2 -bottom-6 w-20 h-20 rounded-full bg-white/10" />

            <div className="relative z-10">
              <div className="flex items-start justify-between mb-3">
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                  <Coins className="w-6 h-6 text-white" />
                </div>
                <div className="flex items-center gap-1 bg-amber-400/30 border border-amber-400/50 rounded-full px-3 py-1">
                  <Zap className="w-3 h-3 text-amber-300" />
                  <span className="text-xs font-bold text-amber-200">PAID</span>
                </div>
              </div>
              <h2 className="text-xl font-extrabold text-white leading-tight">Bet Spin</h2>
              <p className="text-sm text-white/80 mt-1">
                Deposit to your spin balance and bet {spin.loading ? "…" : fmt(spin.spinCost)} per spin.
              </p>

              <div className="mt-4 flex items-center justify-between">
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium text-white/80">
                    Balance: <span className="font-bold text-white">{spin.loading ? "…" : fmt(spin.spinBalance)}</span>
                  </span>
                  {!spin.loading && spin.spinBalance >= spin.spinCost && (
                    <span className="text-xs text-purple-200 flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      {Math.floor(spin.spinBalance / spin.spinCost)} spin{Math.floor(spin.spinBalance / spin.spinCost) !== 1 ? "s" : ""} available
                    </span>
                  )}
                </div>
                <ChevronRight className="w-6 h-6 text-white/70" />
              </div>
            </div>
          </div>
        </button>
      </div>

      {/* How it works */}
      <div className="mx-4 mt-6 p-4 rounded-2xl bg-muted/50 border border-border">
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">How it works</p>
        <div className="space-y-2 text-xs text-muted-foreground">
          <div className="flex items-start gap-2">
            <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-600 font-bold flex items-center justify-center flex-shrink-0 text-[10px]">1</span>
            <p><strong className="text-foreground">Free Spin:</strong> One free spin every 24 hours. Winnings go directly to your main wallet.</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="w-5 h-5 rounded-full bg-violet-500/20 text-violet-600 font-bold flex items-center justify-center flex-shrink-0 text-[10px]">2</span>
            <p><strong className="text-foreground">Bet Spin:</strong> Top up your spin balance, then bet {spin.loading ? "…" : fmt(spin.spinCost)} per spin. Winnings go to your main wallet.</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-600 font-bold flex items-center justify-center flex-shrink-0 text-[10px]">3</span>
            <p><strong className="text-foreground">Withdraw:</strong> Winnings credited to main wallet can be withdrawn any time.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
