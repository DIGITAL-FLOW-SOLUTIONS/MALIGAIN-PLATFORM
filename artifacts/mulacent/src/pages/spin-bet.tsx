/**
 * Bet Spin page — users deposit to spin balance, then spend spinCost per spin.
 * Handles Kenya (STK), manual (screenshot), and mobile-money (text) deposits.
 */
import { useState, useCallback } from "react";
import { useLocation } from "wouter";
import {
  ArrowLeft, Coins, Loader2, ExternalLink, Phone,
  PlusCircle, ChevronDown, ChevronUp, Zap,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useSpinBalance } from "@/hooks/use-spin-balance";
import { SpinWheel, SPIN_SEGMENTS, getTargetRotation } from "@/components/spin/spin-wheel";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";

// ── Helpers ────────────────────────────────────────────────────────────────────
const KES_TO_LOCAL: Record<string, number> = {
  KE:1, UG:28, TZ:23, GH:0.068, ZM:0.7,
  CM:16, NG:5, RW:14, BI:36, MW:17, BW:0.14, SS:13, CG:16,
};

function kesToLocal(kes: number, country: string): number {
  return Math.round(kes * (KES_TO_LOCAL[(country ?? "KE").toUpperCase()] ?? 1));
}

const EVERSEND_COUNTRIES = new Set(["CM", "GH", "NG", "BI"]);
const MOBILE_COUNTRIES   = new Set(["UG", "ZM", "TZ", "CG", "MW", "BW", "SS", "RW"]);

function getPayType(country: string): "kenya" | "mobile" | "eversend" {
  if (country === "KE") return "kenya";
  if (MOBILE_COUNTRIES.has(country)) return "mobile";
  return "eversend";
}

const MOBILE_HINTS: Record<string, { methods: string[]; hint: string }> = {
  UG: { methods: ["MTN Mobile Money", "Airtel Money"],    hint: "Send to number provided by admin" },
  ZM: { methods: ["MTN MoMo", "Airtel Money"],            hint: "Send to number provided by admin" },
  TZ: { methods: ["Vodacom M-Pesa", "Tigo Pesa", "Airtel"], hint: "Send to number provided by admin" },
  CG: { methods: ["M-Pesa (*1122#)"],                     hint: "Dial *1122# to send" },
  MW: { methods: ["Airtel Money (*211#)"],                 hint: "Dial *211# to send" },
  BW: { methods: ["Orange Money (*145#)"],                 hint: "Dial *145# to send" },
  SS: { methods: ["MTN MoMo"],                             hint: "Send to MTN number provided" },
  RW: { methods: ["MTN MoMo (*182*1*3#)"],                 hint: "Dial *182*1*3# to send" },
};

// ── Result overlay ─────────────────────────────────────────────────────────────
function ResultOverlay({
  won, spinCost, currency, label, newBalance, onClose,
}: { won: number; spinCost: number; currency: string; label: string; newBalance: number; onClose: () => void }) {
  const profit = won - spinCost;
  const isWin  = won >= spinCost;
  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className={cn(
          "bg-card rounded-3xl p-8 text-center max-w-xs w-full shadow-2xl border-2",
          isWin ? "border-amber-400" : "border-border",
        )}
        onClick={e => e.stopPropagation()}
      >
        <div className="text-6xl mb-4">{isWin ? "🏆" : won > 0 ? "😐" : "😔"}</div>
        <h2 className="text-2xl font-extrabold text-foreground mb-1">
          {isWin ? "You Won!" : won > 0 ? "Partial Win" : "No Win"}
        </h2>
        <p className="text-4xl font-black my-3" style={{ color: isWin ? "#f59e0b" : won > 0 ? "#6b7280" : "#ef4444" }}>
          {currency} {won.toLocaleString()}
        </p>
        {profit !== 0 && (
          <p className={cn("text-sm font-semibold", profit > 0 ? "text-emerald-500" : "text-rose-500")}>
            {profit > 0 ? `+${currency} ${profit.toLocaleString()} profit` : `${currency} ${Math.abs(profit).toLocaleString()} loss`}
          </p>
        )}
        <p className="text-xs text-muted-foreground mt-2">Segment: <strong className="text-foreground">{label}</strong></p>
        <p className="text-xs text-muted-foreground mt-1">New balance: {currency} {newBalance.toLocaleString()}</p>
        <button
          onClick={onClose}
          className={cn(
            "mt-6 w-full py-3 rounded-xl font-bold text-sm transition-all",
            isWin ? "bg-amber-500 hover:bg-amber-600 text-white" : "bg-muted hover:bg-muted/80 text-foreground",
          )}
        >
          {isWin ? "Collect Winnings" : "Try Again"}
        </button>
      </div>
    </div>
  );
}

// ── Deposit panel ─────────────────────────────────────────────────────────────
function DepositPanel({
  country, currency, spinCost, onDone,
}: { country: string; currency: string; spinCost: number; onDone: () => void }) {
  const { user }     = useAuth();
  const { toast }    = useToast();
  const payType      = getPayType(country);
  const mobileHints  = MOBILE_HINTS[country];

  const [phone, setPhone]               = useState(user?.phone ?? "");
  const [amount, setAmount]             = useState(String(spinCost * 10)); // default 10 spins
  const [payMethod, setPayMethod]       = useState("");
  const [screenshot, setScreenshot]     = useState<string | null>(null);
  const [screenshotMime, setMime]       = useState("image/png");
  const [eversendLink, setEversendLink] = useState("https://eversend.me/kantolah");
  const [submitting, setSubmitting]     = useState(false);

  // Fetch eversend link if needed
  useState(() => {
    if (payType === "eversend") {
      fetch(`${import.meta.env.BASE_URL}api/settings/eversend-link`, { credentials: "include" })
        .then(r => r.json())
        .then((d: Record<string, unknown>) => { if (d["eversendLink"]) setEversendLink(String(d["eversendLink"])); })
        .catch(() => {});
    }
  });

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setMime(file.type);
    const reader = new FileReader();
    reader.onload = ev => setScreenshot(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  async function submit() {
    if (!amount || Number(amount) < 1) { toast({ title: "Enter a valid amount", variant: "destructive" }); return; }
    setSubmitting(true);
    try {
      let res: Response;
      if (payType === "kenya") {
        if (!phone.trim()) { toast({ title: "Enter your phone number", variant: "destructive" }); return; }
        res = await fetch(`${import.meta.env.BASE_URL}api/spin/deposit/kenya`, {
          method: "POST", credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phoneNumber: phone.trim(), amount: Number(amount) }),
        });
        const data = await res.json() as { transactionId?: string; checkoutRequestId?: string; message?: string };
        if (!res.ok) throw new Error(data.message);
        // Redirect to payment status page
        window.location.href = `${import.meta.env.BASE_URL}payment-status?type=spin&txn_id=${data.transactionId ?? ""}&checkout_id=${encodeURIComponent(data.checkoutRequestId ?? "")}`;
        return;
      } else if (payType === "mobile") {
        if (!phone.trim() || !payMethod) { toast({ title: "Enter phone and select payment method", variant: "destructive" }); return; }
        res = await fetch(`${import.meta.env.BASE_URL}api/spin/deposit/mobile`, {
          method: "POST", credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: phone.trim(), paymentMethod: payMethod, amount }),
        });
      } else {
        if (!screenshot) { toast({ title: "Upload payment screenshot", variant: "destructive" }); return; }
        if (!phone.trim()) { toast({ title: "Enter your phone number", variant: "destructive" }); return; }
        res = await fetch(`${import.meta.env.BASE_URL}api/spin/deposit/manual`, {
          method: "POST", credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: phone.trim(), screenshotBase64: screenshot, screenshotMime, amountPaid: amount }),
        });
      }
      const data = await res.json() as { message?: string };
      if (!res.ok) throw new Error(data.message);
      toast({ title: "Submitted!", description: data.message });
      onDone();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Submission failed";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-semibold text-muted-foreground mb-1.5">
          Amount to deposit ({currency})
        </label>
        <input
          type="number" value={amount} onChange={e => setAmount(e.target.value)}
          placeholder={`Min ${spinCost * 4}`}
          className="w-full text-sm py-3 px-4 rounded-xl outline-none bg-muted/40 border border-input focus:border-primary focus:ring-2 focus:ring-primary/20 text-foreground"
        />
        {Number(amount) > 0 && (
          <p className="text-xs text-muted-foreground mt-1">
            ≈ {Math.floor(Number(amount) / spinCost)} spins @ {currency} {spinCost} each
          </p>
        )}
      </div>

      {payType === "kenya" && (
        <>
          <p className="text-sm font-semibold text-foreground">Pay via M-PESA</p>
          <p className="text-xs text-muted-foreground -mt-2">An STK push will be sent to your phone</p>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5">M-PESA Phone Number</label>
            <input
              type="tel" value={phone} onChange={e => setPhone(e.target.value)}
              placeholder="07XXXXXXXX"
              className="w-full text-sm py-3 px-4 rounded-xl outline-none bg-muted/40 border border-input focus:border-primary text-foreground"
            />
          </div>
        </>
      )}

      {payType === "mobile" && mobileHints && (
        <>
          <p className="text-sm font-semibold text-foreground">Manual Mobile Money</p>
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-3 text-xs text-amber-800 dark:text-amber-300">
            <p className="font-bold mb-1">Instructions</p>
            <p>Send the amount above to the admin number, then submit this form. {mobileHints.hint}</p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Your Phone Number</label>
            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="Your phone"
              className="w-full text-sm py-3 px-4 rounded-xl outline-none bg-muted/40 border border-input focus:border-primary text-foreground" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Payment Method</label>
            <select value={payMethod} onChange={e => setPayMethod(e.target.value)}
              className="w-full text-sm py-3 px-4 rounded-xl outline-none bg-muted/40 border border-input focus:border-primary text-foreground">
              <option value="">Select method</option>
              {mobileHints.methods.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </>
      )}

      {payType === "eversend" && (
        <>
          <p className="text-sm font-semibold text-foreground">Pay via Eversend</p>
          <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl p-3 text-xs text-blue-800 dark:text-blue-300">
            <p>Send the amount above via Eversend, screenshot the confirmation, then upload below.</p>
          </div>
          <a href={eversendLink} target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-colors">
            <ExternalLink className="w-4 h-4" /> Open Eversend
          </a>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Your Phone Number</label>
            <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="Your phone"
              className="w-full text-sm py-3 px-4 rounded-xl outline-none bg-muted/40 border border-input focus:border-primary text-foreground" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Screenshot</label>
            <label className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border-2 border-dashed border-border cursor-pointer hover:border-primary/50 transition-colors">
              <Phone className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{screenshot ? "✓ Screenshot selected" : "Tap to upload screenshot"}</span>
              <input type="file" accept="image/*" onChange={handleFile} className="hidden" />
            </label>
          </div>
        </>
      )}

      <button
        onClick={submit}
        disabled={submitting}
        className="w-full py-3.5 rounded-xl font-bold text-sm text-white bg-violet-600 hover:bg-violet-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-all"
      >
        {submitting ? <><Loader2 className="w-4 h-4 animate-spin" />Processing…</> : <><PlusCircle className="w-4 h-4" />Deposit Spin Balance</>}
      </button>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function SpinBet() {
  const [, navigate]    = useLocation();
  const { user }        = useAuth();
  const { toast }       = useToast();
  const spin            = useSpinBalance();

  const country = user?.country ?? "KE";
  const fmt     = (n: number) => formatCurrency(n, country);

  const [rotation,     setRotation]     = useState(0);
  const [spinning,     setSpinning]     = useState(false);
  const [result,       setResult]       = useState<{ won: number; spinCost: number; currency: string; label: string; newBalance: number } | null>(null);
  const [depositOpen,  setDepositOpen]  = useState(false);

  const displayLabels = SPIN_SEGMENTS.map(seg => {
    if (seg.label.startsWith("x")) return seg.label;
    const local = kesToLocal(seg.valueKES, country);
    return local === 0 ? "0" : local.toLocaleString();
  });

  const canSpin = !spinning && spin.spinBalance >= spin.spinCost;

  const doSpin = useCallback(async () => {
    if (!canSpin) {
      if (spin.spinBalance < spin.spinCost) {
        toast({ title: "Insufficient spin balance", description: "Top up your spin balance to play.", variant: "destructive" });
        setDepositOpen(true);
      }
      return;
    }
    setSpinning(true);
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}api/spin/bet`, {
        method: "POST", credentials: "include",
      });
      const data = await res.json() as {
        segmentIndex: number; amountLocal: number; label: string;
        currency: string; spinCost: number; newBalance: number; message?: string;
      };
      if (!res.ok) throw new Error(data.message ?? "Spin failed");

      const target = getTargetRotation(rotation, data.segmentIndex);
      setRotation(target);
      setTimeout(() => {
        setResult({ won: data.amountLocal, spinCost: data.spinCost, currency: data.currency, label: data.label, newBalance: data.newBalance });
      }, 4200);
    } catch (err: unknown) {
      setSpinning(false);
      const msg = err instanceof Error ? err.message : "Spin failed";
      toast({ title: "Error", description: msg, variant: "destructive" });
    }
  }, [canSpin, spin.spinBalance, spin.spinCost, rotation, toast]);

  function handleTransitionEnd() { setSpinning(false); }

  function closeResult() {
    setResult(null);
    spin.refetch();
  }

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
        <h1 className="text-lg font-extrabold text-foreground">Bet Spin</h1>
        <div className="ml-auto flex items-center gap-1.5 bg-violet-500/10 border border-violet-500/30 rounded-full px-3 py-1">
          <Zap className="w-3.5 h-3.5 text-violet-500" />
          <span className="text-xs font-bold text-violet-600">{fmt(spin.spinCost)} / spin</span>
        </div>
      </div>

      {/* Balance card */}
      <div className="mx-4 mb-2 p-4 rounded-2xl bg-gradient-to-r from-violet-500/10 to-purple-500/10 border border-violet-200 dark:border-violet-800">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-muted-foreground">Spin Balance</p>
            <p className="text-2xl font-black text-foreground">{spin.loading ? "…" : fmt(spin.spinBalance)}</p>
          </div>
          <button
            onClick={() => setDepositOpen(o => !o)}
            className="flex items-center gap-1.5 bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold px-4 py-2 rounded-xl transition-colors"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            Top Up
          </button>
        </div>
        {!spin.loading && spin.spinBalance > 0 && (
          <p className="text-xs text-muted-foreground mt-1">
            {Math.floor(spin.spinBalance / spin.spinCost)} spin{Math.floor(spin.spinBalance / spin.spinCost) !== 1 ? "s" : ""} available
          </p>
        )}
      </div>

      {/* Deposit panel (collapsible) */}
      {depositOpen && (
        <div className="mx-4 mb-3 p-4 rounded-2xl bg-card border border-border shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-bold text-foreground">Deposit Spin Balance</p>
            <button onClick={() => setDepositOpen(false)}>
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
          <DepositPanel
            country={country}
            currency={spin.currency}
            spinCost={spin.spinCost}
            onDone={() => setDepositOpen(false)}
          />
        </div>
      )}

      {/* No-balance prompt */}
      {!spin.loading && spin.spinBalance < spin.spinCost && !depositOpen && (
        <div className="mx-4 mb-3 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-sm text-amber-700 dark:text-amber-400 flex items-center gap-2">
          <Coins className="w-4 h-4 flex-shrink-0" />
          <span>You need at least <strong>{fmt(spin.spinCost)}</strong> to spin.</span>
          <button
            onClick={() => setDepositOpen(true)}
            className="ml-auto text-xs font-bold underline"
          >
            Deposit
          </button>
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
      <div className="px-4 mt-2">
        <button
          onClick={doSpin}
          disabled={!canSpin}
          className={cn(
            "w-full py-4 rounded-2xl font-extrabold text-base tracking-wide transition-all shadow-lg",
            "flex items-center justify-center gap-2",
            canSpin
              ? "bg-gradient-to-r from-violet-600 to-purple-600 text-white hover:from-violet-700 hover:to-purple-700 shadow-violet-500/30 active:scale-[0.98]"
              : "bg-muted text-muted-foreground cursor-not-allowed",
          )}
        >
          {spinning ? (
            <><Loader2 className="w-5 h-5 animate-spin" />Spinning…</>
          ) : canSpin ? (
            <><Zap className="w-5 h-5" />Spin — {fmt(spin.spinCost)}</>
          ) : (
            <><Coins className="w-5 h-5" />Top up to spin</>
          )}
        </button>
      </div>

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

      {/* History hint */}
      {!spin.loading && spin.spinEarnings > 0 && (
        <div className="mx-4 mt-4 p-3 rounded-xl bg-muted/50 border border-border flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Total spin earnings</p>
          <p className="text-sm font-bold text-emerald-600">{fmt(spin.spinEarnings)}</p>
        </div>
      )}

      {/* Result overlay */}
      {result && (
        <ResultOverlay
          won={result.won}
          spinCost={result.spinCost}
          currency={result.currency}
          label={result.label}
          newBalance={result.newBalance}
          onClose={closeResult}
        />
      )}
    </div>
  );
}
