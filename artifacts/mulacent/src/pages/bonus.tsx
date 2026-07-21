import { useGetBonuses } from "@workspace/api-client-react";
import { useCurrency } from "@/hooks/use-currency";
import { formatDate } from "@/lib/utils";
import { useLocation } from "wouter";
import {
  Users,
  Gift,
  Lock,
  CheckCircle2,
  TrendingUp,
  Zap,
  Trophy,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";

const TIER_COLORS = [
  {
    circle: "from-cyan-500 to-teal-600",
    glow: "shadow-cyan-500/40",
    border: "border-cyan-500/30",
    bg: "bg-cyan-500/8",
    text: "text-cyan-400",
    bar: "from-cyan-400 to-teal-500",
    badge: "bg-cyan-500/15 border-cyan-500/30 text-cyan-300",
  },
  {
    circle: "from-violet-500 to-fuchsia-600",
    glow: "shadow-violet-500/40",
    border: "border-violet-500/30",
    bg: "bg-violet-500/8",
    text: "text-violet-400",
    bar: "from-violet-400 to-fuchsia-500",
    badge: "bg-violet-500/15 border-violet-500/30 text-violet-300",
  },
  {
    circle: "from-amber-500 to-orange-600",
    glow: "shadow-amber-500/40",
    border: "border-amber-500/30",
    bg: "bg-amber-500/8",
    text: "text-amber-400",
    bar: "from-amber-400 to-orange-500",
    badge: "bg-amber-500/15 border-amber-500/30 text-amber-300",
  },
];

const getFallbackColor = (i: number) => TIER_COLORS[i % TIER_COLORS.length];

export default function Bonus() {
  const { data, isLoading } = useGetBonuses();
  const { fmt } = useCurrency();
  const [, navigate] = useLocation();

  const referralCount = data?.tiers?.[0]?.currentReferrals ?? 0;
  const tierCount = data?.tiers?.length ?? 0;

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-4 animate-pulse">
        <div className="h-36 bg-white/5 rounded-2xl" />
        <div className="h-8 bg-white/5 rounded-xl" />
        {[1, 2, 3].map((i) => <div key={i} className="h-32 bg-white/5 rounded-2xl" />)}
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-4">

      {/* Hero header card */}
      <div
        className="rounded-2xl p-5 relative overflow-hidden border border-teal-500/20"
        style={{ background: "linear-gradient(135deg, #0a2e2a 0%, #0e1a35 50%, #1a0a2e 100%)" }}
      >
        <div className="absolute top-0 right-0 w-40 h-40 bg-teal-400/10 blur-3xl rounded-full pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-32 h-32 bg-violet-500/10 blur-3xl rounded-full pointer-events-none" />

        <div className="relative z-10 flex items-start gap-4">
          {/* Sales circle badge */}
          <div
            className="w-16 h-16 rounded-2xl flex flex-col items-center justify-center flex-shrink-0 border border-teal-400/30 shadow-lg shadow-teal-500/20"
            style={{ background: "linear-gradient(135deg, #0d9488 0%, #0891b2 100%)" }}
          >
            <span className="text-white font-black text-xl leading-none">{referralCount}</span>
            <span className="text-teal-100/70 text-[8px] font-bold uppercase tracking-widest mt-0.5">Sales</span>
          </div>

          <div className="flex-1 min-w-0">
            <h1 className="text-white font-black text-xl leading-tight">Bonus Rewards</h1>
            <p className="text-slate-400 text-xs mt-0.5">Reach sales milestones to unlock cash bonuses</p>

            {/* Stats row */}
            <div className="flex items-center gap-4 mt-3 flex-wrap">
              <div>
                <p className="text-emerald-400 font-black text-base leading-none">{fmt(data?.balance ?? 0)}</p>
                <p className="text-slate-600 text-[9px] uppercase tracking-widest mt-0.5">Balance</p>
              </div>
              <div className="w-px h-6 bg-white/10" />
              <div>
                <p className="text-fuchsia-400 font-black text-base leading-none">{fmt(data?.totalEarned ?? 0)}</p>
                <p className="text-slate-600 text-[9px] uppercase tracking-widest mt-0.5">Total Earned</p>
              </div>
              <div className="w-px h-6 bg-white/10" />
              <div>
                <p className="text-amber-400 font-black text-base leading-none">{tierCount}</p>
                <p className="text-slate-600 text-[9px] uppercase tracking-widest mt-0.5">Tiers</p>
              </div>
            </div>
          </div>
        </div>

        {/* Next tier progress bar */}
        {data?.nextTierName && (
          <div className="relative z-10 mt-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-slate-400 text-[10px] font-bold">
                Next: <span className="text-white">{data.nextTierName}</span>
              </span>
              <span className="text-teal-400 text-[10px] font-black">{Math.round(data.nextTierProgress ?? 0)}%</span>
            </div>
            <div className="h-2 bg-white/8 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-1000 bg-gradient-to-r from-teal-400 to-cyan-500 relative"
                style={{ width: `${Math.min(100, Math.max(0, data.nextTierProgress ?? 0))}%` }}
              >
                <div className="absolute inset-0 bg-white/20 animate-pulse rounded-full" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tier list */}
      <div className="space-y-3">
        {data?.tiers?.map((tier, i) => {
          const c = getFallbackColor(i);
          const progress = Math.min(100, (tier.currentReferrals / Number(tier.requiredReferrals)) * 100);
          const remaining = Math.max(0, Number(tier.requiredReferrals) - tier.currentReferrals);

          return (
            <div
              key={String(tier.id)}
              className={cn(
                "rounded-2xl border overflow-hidden transition-all",
                tier.achieved ? cn(c.border, c.bg) : "border-white/8 bg-white/3"
              )}
            >
              <div className="flex items-start gap-3 p-4">
                {/* Numbered circle */}
                <div
                  className={cn(
                    "w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 font-black text-sm text-white shadow-lg bg-gradient-to-br",
                    c.circle,
                    c.glow
                  )}
                >
                  {tier.achieved ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-white font-black text-sm leading-tight">{tier.name as string}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Users className={cn("w-3 h-3", c.text)} />
                        <span className="text-slate-500 text-[10px]">
                          {tier.requiredReferrals} active referrals required
                        </span>
                        {!tier.achieved && (
                          <span className={cn("text-[10px] font-bold", c.text)}>· {remaining} to go</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className={cn("font-black text-lg leading-none", c.text)}>{fmt(tier.bonusAmount)}</p>
                      <p className="text-slate-600 text-[9px] uppercase tracking-wide mt-0.5">Bonus</p>
                    </div>
                  </div>

                  {/* Progress */}
                  <div className="mt-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-slate-600 text-[10px]">
                        {tier.currentReferrals} / {tier.requiredReferrals} referrals
                      </span>
                      <span className={cn("text-[10px] font-bold", c.text)}>{Math.round(progress)}%</span>
                    </div>
                    <div className="h-1.5 bg-white/8 rounded-full overflow-hidden">
                      <div
                        className={cn("h-full rounded-full bg-gradient-to-r transition-all duration-1000", c.bar)}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom status bar */}
              <div className={cn(
                "flex items-center gap-2 px-4 py-2 border-t",
                tier.achieved
                  ? cn("border-emerald-500/20 bg-emerald-500/10")
                  : "border-white/5 bg-black/20"
              )}>
                {tier.achieved ? (
                  <>
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    <span className="text-emerald-400 text-[10px] font-bold">Unlocked! Bonus credited.</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-3 h-3 text-slate-600" />
                    <span className="text-slate-600 text-[10px]">Need {remaining} more referral{remaining !== 1 ? "s" : ""}</span>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Bonus History */}
      <div className="bg-[#1a0508] border border-red-900/30 rounded-2xl overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-3.5 border-b border-white/5">
          <Gift className="w-3.5 h-3.5 text-fuchsia-400" />
          <span className="text-white font-black text-sm">Bonus History</span>
        </div>

        {!data?.history || data.history.length === 0 ? (
          <div className="py-12 flex flex-col items-center gap-3 text-center px-6">
            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/8 flex items-center justify-center">
              <Gift className="w-5 h-5 text-slate-600" />
            </div>
            <div>
              <p className="text-slate-400 text-sm font-bold">No bonuses claimed yet</p>
              <p className="text-slate-600 text-xs mt-1">Start referring to unlock tier bonuses!</p>
            </div>
            <button
              onClick={() => navigate("/downlines")}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl font-black text-xs text-white transition-all active:scale-95 shadow-lg"
              style={{ background: "linear-gradient(135deg, #0d9488 0%, #7c3aed 100%)" }}
            >
              <Zap className="w-3.5 h-3.5" /> Start Referring
            </button>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {data.history.map((h) => (
              <div key={String(h.id)} className="flex items-center gap-3 px-5 py-3.5">
                <div className="w-8 h-8 rounded-xl bg-fuchsia-500/20 border border-fuchsia-500/30 flex items-center justify-center flex-shrink-0">
                  <Trophy className="w-3.5 h-3.5 text-fuchsia-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-bold text-sm leading-tight">{h.tierName as string} Bonus</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Clock className="w-2.5 h-2.5 text-slate-600" />
                    <span className="text-slate-600 text-[10px]">{formatDate(h.claimedAt as string)}</span>
                  </div>
                </div>
                <p className="text-emerald-400 font-black text-sm">+{fmt(h.amount as number)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
