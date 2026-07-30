/**
 * Free Spin page — one spin per calendar day, winnings go to main_wallet.
 */
import { useState, useCallback } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Gift, Loader2, CheckCircle2, XCircle, Clock } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useSpinBalance } from "@/hooks/use-spin-balance";
import { SpinWheel, SPIN_SEGMENTS, getTargetRotation } from "@/components/spin/spin-wheel";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

// ── KES-to-local conversion rates (mirrors API) ────────────────────────────────
const KES_TO_LOCAL: Record<string, number> = {
  KE:1, UG:28, TZ:23, GH:0.068, ZM:0.7,
  CM:16, NG:5, RW:14, BI:36, MW:17, BW:0.14, SS:13, CG:16,
};

function kesToLocal(kes: number, country: string): number {
  return Math.round(kes * (KES_TO_LOCAL[(country ?? "KE").toUpperCase()] ?? 1));
}

// ── Result overlay ─────────────────────────────────────────────────────────────
interface ResultOverlayProps {
  won:      number;
  currency: string;
  label:    string;
  onClose:  () => void;
}

function ResultOverlay({ won, currency, label, onClose }: ResultOverlayProps) {
  const isWin = won > 0;
  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className={cn(
          "bg-card rounded-3xl p-8 text-center max-w-xs w-full shadow-2xl",
          "border-2",
          isWin ? "border-emerald-400" : "border-border",
        )}
        onClick={e => e.stopPropagation()}
      >
        <div className="text-6xl mb-4">{isWin ? "🎉" : "😔"}</div>
        <h2 className="text-2xl font-extrabold text-foreground mb-1">
          {isWin ? "You Won!" : "Better Luck Tomorrow!"}
        </h2>
        {isWin ? (
          <>
            <p className="text-4xl font-black text-emerald-500 my-3">
              {currency} {won.toLocaleString()}
            </p>
            <p className="text-sm text-muted-foreground">Credited to your main wallet</p>
          </>
        ) : (
          <>
            <p className="text-lg font-bold text-muted-foreground my-2">No win this time</p>
            <p className="text-xs text-muted-foreground">Segment: <strong className="text-foreground">{label}</strong></p>
          </>
        )}
        <button
          onClick={onClose}
          className={cn(
            "mt-6 w-full py-3 rounded-xl font-bold text-sm transition-all",
            isWin
              ? "bg-emerald-500 hover:bg-emerald-600 text-white"
              : "bg-muted hover:bg-muted/80 text-foreground",
          )}
        >
          {isWin ? "Collect Winnings" : "OK"}
        </button>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function SpinFree() {
  const [, navigate]    = useLocation();
  const { user }        = useAuth();
  const { toast }       = useToast();
  const spin            = useSpinBalance();

  const country = user?.country ?? "KE";
  const fmt     = (n: number) => formatCurrency(n, country);

  // Wheel state
  const [rotation,  setRotation]  = useState(0);
  const [spinning,  setSpinning]  = useState(false);
  const [result, setResult]       = useState<{ won: number; currency: string; label: string } | null>(null);

  // Build localised display labels
  const displayLabels = SPIN_SEGMENTS.map(seg => {
    if (seg.label.startsWith("x")) return seg.label;        // keep multiplier labels as-is
    const local = kesToLocal(seg.valueKES, country);
    return local === 0 ? "0" : local.toLocaleString();
  });

  const doSpin = useCallback(async () => {
    if (spinning) return;
    if (!spin.canFreeSpin) {
      toast({ title: "Already spun today", description: "Come back tomorrow for your next free spin!", variant: "destructive" });
      return;
    }
    setSpinning(true);
    try {
      const res  = await fetch(`${import.meta.env.BASE_URL}api/spin/free`, {
        method: "POST", credentials: "include",
      });
      const data = await res.json() as { segmentIndex: number; amountLocal: number; label: string; currency: string; message?: string };
      if (!res.ok) throw new Error(data.message ?? "Spin failed");

      const target = getTargetRotation(rotation, data.segmentIndex);
      setRotation(target);   // CSS transition handles animation
      // result shown after transition ends
      setTimeout(() => {
        setResult({ won: data.amountLocal, currency: data.currency, label: data.label });
      }, 4200);
    } catch (err: unknown) {
      setSpinning(false);
      const msg = err instanceof Error ? err.message : "Spin failed";
      toast({ title: "Error", description: msg, variant: "destructive" });
    }
  }, [spinning, spin.canFreeSpin, rotation, toast]);

  function handleTransitionEnd() {
    // Spinning state cleared after transition; result overlay is already set via setTimeout
    setSpinning(false);
  }

  function closeResult() {
    setResult(null);
    spin.refetch();
  }

  // Time until midnight for "come back tomorrow"
  const msUntilMidnight = () => {
    const now = new Date();
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const ms = midnight.getTime() - now.getTime();
    const h  = Math.floor(ms / 3_600_000);
    const m  = Math.floor((ms % 3_600_000) / 60_000);
    return `${h}h ${m}m`;
  };

  return (
    <div className="max-w-lg mx-auto pb-10">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-4">
        <button
          onClick={() => navigate("/spin-win")}
          className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-muted-foreground" />
        </button>
        <h1 className="text-lg font-extrabold text-foreground">Free Spin</h1>
        <div className="ml-auto flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-full px-3 py-1">
          <Gift className="w-3.5 h-3.5 text-emerald-500" />
          <span className="text-xs font-bold text-emerald-600">FREE</span>
        </div>
      </div>

      {/* Status banner */}
      {!spin.loading && (
        <div className={cn(
          "mx-4 mb-4 px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2",
          spin.canFreeSpin
            ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400"
            : "bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400",
        )}>
          {spin.canFreeSpin ? (
            <>
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              Your free spin is ready! Press Spin to play.
            </>
          ) : (
            <>
              <Clock className="w-4 h-4 flex-shrink-0" />
              Already used today · resets in {msUntilMidnight()}
            </>
          )}
        </div>
      )}

      {/* Wheel */}
      <div className="flex justify-center px-4 my-4">
        <div style={{ width: "min(90vw, 360px)", height: "min(90vw, 360px)" }}>
          <SpinWheel
            rotation={rotation}
            spinning={spinning}
            onSpinEnd={handleTransitionEnd}
            displayLabels={displayLabels}
            size={360}
          />
        </div>
      </div>

      {/* Spin button */}
      <div className="px-4 mt-4">
        <button
          onClick={doSpin}
          disabled={spinning || !spin.canFreeSpin}
          className={cn(
            "w-full py-4 rounded-2xl font-extrabold text-base tracking-wide transition-all shadow-lg",
            "flex items-center justify-center gap-2",
            spin.canFreeSpin && !spinning
              ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white hover:from-emerald-600 hover:to-teal-600 shadow-emerald-500/30 active:scale-[0.98]"
              : "bg-muted text-muted-foreground cursor-not-allowed",
          )}
        >
          {spinning ? (
            <><Loader2 className="w-5 h-5 animate-spin" /> Spinning…</>
          ) : spin.canFreeSpin ? (
            <><Gift className="w-5 h-5" /> Spin for Free!</>
          ) : (
            <><XCircle className="w-5 h-5" /> Already spun today</>
          )}
        </button>
      </div>

      {/* Earnings summary */}
      {!spin.loading && spin.spinEarnings > 0 && (
        <div className="mx-4 mt-5 p-4 rounded-2xl bg-muted/50 border border-border">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">All-time spin earnings</p>
          <p className="text-xl font-black text-emerald-600">{fmt(spin.spinEarnings)}</p>
        </div>
      )}

      {/* Prizes legend */}
      <div className="mx-4 mt-5">
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3 px-1">Wheel prizes (in {spin.currency})</p>
        <div className="grid grid-cols-4 gap-2">
          {SPIN_SEGMENTS.map((seg, i) => {
            const localVal = kesToLocal(seg.valueKES, country);
            const label    = seg.label.startsWith("x") ? seg.label : localVal === 0 ? "0" : localVal.toLocaleString();
            return (
              <div
                key={i}
                className="flex flex-col items-center gap-1 p-2 rounded-xl"
                style={{ backgroundColor: seg.color + "22", border: `1px solid ${seg.color}55` }}
              >
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: seg.color }} />
                <span className="text-xs font-bold text-foreground">{label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Result overlay */}
      {result && (
        <ResultOverlay
          won={result.won}
          currency={result.currency}
          label={result.label}
          onClose={closeResult}
        />
      )}
    </div>
  );
}
