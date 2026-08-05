import { useCallback, useEffect, useState } from "react";
import { Link } from "wouter";
import {
  ArrowLeft,
  CheckCircle2,
  Gift,
  Info,
  LockKeyhole,
  Sparkles,
  Users,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { getCurrencyInfo } from "@/lib/utils";

type WelcomeBonus = {
  country: string;
  currency: string;
  amount: number;
  requiredReferrals: number;
  currentReferrals: number;
  claimed: boolean;
  canClaim: boolean;
  claimedAt: string | null;
};

function progressFor(bonus: WelcomeBonus) {
  return Math.min(
    100,
    Math.max(
      0,
      (bonus.currentReferrals / Math.max(1, bonus.requiredReferrals)) * 100,
    ),
  );
}

export default function WelcomeBonus() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [bonus, setBonus] = useState<WelcomeBonus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isClaiming, setIsClaiming] = useState(false);

  const loadBonus = useCallback(() => {
    setIsLoading(true);
    fetch(`${import.meta.env.BASE_URL}api/bonuses/welcome`, {
      credentials: "include",
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to load welcome bonus");
        return response.json() as Promise<WelcomeBonus>;
      })
      .then(setBonus)
      .catch(() => setBonus(null))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    if (user) loadBonus();
  }, [loadBonus, user]);

  const claimBonus = async () => {
    setIsClaiming(true);
    try {
      const response = await fetch(
        `${import.meta.env.BASE_URL}api/bonuses/welcome/claim`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        },
      );
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message ?? "Unable to claim welcome bonus");
      }
      setBonus(result);
      queryClient.invalidateQueries({ queryKey: ["/api/wallet/balances"] });
      toast({
        title: "Welcome bonus claimed!",
        description: result.message,
      });
    } catch (error) {
      toast({
        title: "Unable to claim bonus",
        description:
          error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
      loadBonus();
    } finally {
      setIsClaiming(false);
    }
  };

  const currency = getCurrencyInfo(bonus?.country ?? user?.country);
  const progress = bonus ? progressFor(bonus) : 0;
  const remaining = bonus
    ? Math.max(0, bonus.requiredReferrals - bonus.currentReferrals)
    : 0;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard"
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition hover:border-primary/30 hover:text-primary"
          aria-label="Back to dashboard"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-600">
            Rewards
          </p>
          <h1 className="text-2xl font-black tracking-tight text-foreground">
            Welcome Bonus
          </h1>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-5 animate-pulse">
          <div className="h-52 rounded-3xl bg-muted" />
          <div className="h-56 rounded-3xl bg-muted" />
        </div>
      ) : bonus ? (
        <>
          <section className="relative overflow-hidden rounded-3xl bg-amber-400 p-5 text-white shadow-lg shadow-amber-500/20 sm:p-7">
            <div className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-white/15" />
            <div className="pointer-events-none absolute -bottom-16 left-1/3 h-36 w-36 rounded-full bg-amber-500/25" />

            <div className="relative flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-white/20 ring-1 ring-white/30">
                  <Gift className="h-7 w-7" />
                </div>
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-amber-950/70">
                    Welcome Bonus
                  </p>
                  <h2 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">
                    {bonus.currency} {bonus.amount.toLocaleString()}
                  </h2>
                  <p className="mt-1 text-sm font-medium text-amber-950/70">
                    Your reward for building an active Level 1 team
                  </p>
                </div>
              </div>

              {bonus.claimed ? (
                <div className="inline-flex items-center gap-2 self-start rounded-xl bg-white/20 px-4 py-2.5 text-sm font-bold ring-1 ring-white/30">
                  <CheckCircle2 className="h-4 w-4" />
                  Claimed
                </div>
              ) : (
                <button
                  type="button"
                  onClick={claimBonus}
                  disabled={!bonus.canClaim || isClaiming}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-black text-amber-700 shadow-md transition hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {bonus.canClaim ? (
                    <Sparkles className="h-4 w-4" />
                  ) : (
                    <LockKeyhole className="h-4 w-4" />
                  )}
                  {isClaiming
                    ? "Claiming..."
                    : bonus.canClaim
                      ? "Claim bonus"
                      : "Keep referring"}
                </button>
              )}
            </div>
          </section>

          <section className="rounded-3xl border border-border bg-card p-5 shadow-sm sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
                  Claim your bonus
                </p>
                <h2 className="mt-1 text-xl font-black text-foreground">
                  Reach the referral target
                </h2>
              </div>
              <div className="rounded-2xl bg-amber-100 p-3 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300">
                <Users className="h-5 w-5" />
              </div>
            </div>

            <div className="mt-6 space-y-5">
              <div>
                <div className="mb-2 flex items-end justify-between gap-3">
                  <span className="text-sm font-semibold text-muted-foreground">
                    Active Level 1 referrals
                  </span>
                  <span className="text-lg font-black text-foreground">
                    {bonus.currentReferrals}{" "}
                    <span className="text-sm font-semibold text-muted-foreground">
                      / {bonus.requiredReferrals}
                    </span>
                  </span>
                </div>
                <div className="h-4 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all duration-700"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                  <span>{Math.round(progress)}% complete</span>
                  {bonus.claimed ? (
                    <span className="font-bold text-emerald-600">
                      Bonus credited
                    </span>
                  ) : remaining > 0 ? (
                    <span>{remaining} more to go</span>
                  ) : (
                    <span className="font-bold text-emerald-600">
                      Ready to claim
                    </span>
                  )}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-emerald-50 p-4 dark:bg-emerald-950/25">
                  <p className="text-xs font-semibold text-emerald-700/70 dark:text-emerald-300/70">
                    Current referrals
                  </p>
                  <p className="mt-1 text-2xl font-black text-emerald-700 dark:text-emerald-300">
                    {bonus.currentReferrals}
                  </p>
                </div>
                <div className="rounded-2xl bg-cyan-50 p-4 dark:bg-cyan-950/25">
                  <p className="text-xs font-semibold text-cyan-700/70 dark:text-cyan-300/70">
                    Required referrals
                  </p>
                  <p className="mt-1 text-2xl font-black text-cyan-700 dark:text-cyan-300">
                    {bonus.requiredReferrals}
                  </p>
                </div>
              </div>
            </div>
          </section>

          <div className="flex items-start gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-blue-800 dark:border-blue-900/50 dark:bg-blue-950/20 dark:text-blue-200">
            <Info className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <p className="text-xs leading-relaxed">
              {bonus.claimed
                ? `Your ${bonus.currency} ${bonus.amount.toLocaleString()} welcome bonus has been credited to your main wallet.`
                : bonus.canClaim
                  ? "You have reached the target. Claim your one-time welcome bonus using the button above."
                  : `Refer and activate ${remaining} more Level 1 member${remaining === 1 ? "" : "s"} to unlock your welcome bonus.`}
            </p>
          </div>

          <div className="text-center">
            <Link
              href="/downlines"
              className="text-sm font-bold text-primary hover:underline"
            >
              View my Level 1 referrals
            </Link>
          </div>
        </>
      ) : (
        <div className="rounded-3xl border border-border bg-card p-8 text-center shadow-sm">
          <Gift className="mx-auto h-10 w-10 text-muted-foreground" />
          <h2 className="mt-4 text-lg font-black text-foreground">
            Welcome bonus unavailable
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            A welcome bonus is not configured for your country yet.
          </p>
          <Link
            href="/dashboard"
            className="mt-5 inline-flex rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground"
          >
            Back to dashboard
          </Link>
        </div>
      )}

      <p className="text-center text-xs text-muted-foreground">
        {currency.code} rewards are subject to the active bonus settings for
        your country.
      </p>
    </div>
  );
}