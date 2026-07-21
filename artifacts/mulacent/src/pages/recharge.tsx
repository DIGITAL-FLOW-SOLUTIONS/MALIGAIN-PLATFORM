import { useState, useEffect } from "react";
import { useGetWalletBalances } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { useCurrency } from "@/hooks/use-currency";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Wallet, Zap, Phone, ChevronLeft, ExternalLink, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

const PRESET_AMOUNTS = [50, 100, 200, 500, 1000, 2000];

const PRESET_COLORS = [
  "from-cyan-500/30 to-cyan-600/20 border-cyan-500/40 text-cyan-300 hover:border-cyan-400/60",
  "from-emerald-500/30 to-emerald-600/20 border-emerald-500/40 text-emerald-300 hover:border-emerald-400/60",
  "from-violet-500/30 to-violet-600/20 border-violet-500/40 text-violet-300 hover:border-violet-400/60",
  "from-rose-500/30 to-rose-600/20 border-rose-500/40 text-rose-300 hover:border-rose-400/60",
  "from-amber-500/30 to-amber-600/20 border-amber-500/40 text-amber-300 hover:border-amber-400/60",
  "from-fuchsia-500/30 to-fuchsia-600/20 border-fuchsia-500/40 text-fuchsia-300 hover:border-fuchsia-400/60",
];

const PRESET_COLORS_ACTIVE = [
  "from-cyan-500/60 to-cyan-600/50 border-cyan-400 text-white shadow-cyan-500/30",
  "from-emerald-500/60 to-emerald-600/50 border-emerald-400 text-white shadow-emerald-500/30",
  "from-violet-500/60 to-violet-600/50 border-violet-400 text-white shadow-violet-500/30",
  "from-rose-500/60 to-rose-600/50 border-rose-400 text-white shadow-rose-500/30",
  "from-amber-500/60 to-amber-600/50 border-amber-400 text-white shadow-amber-500/30",
  "from-fuchsia-500/60 to-fuchsia-600/50 border-fuchsia-400 text-white shadow-fuchsia-500/30",
];

const FALLBACK_EVERSEND_LINK = "https://eversend.me/kantolah";

export default function Recharge() {
  const [amount, setAmount] = useState<number | "">("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [eversendLink, setEversendLink] = useState(FALLBACK_EVERSEND_LINK);
  const { data: balances } = useGetWalletBalances();
  const { user } = useAuth();
  const { fmt, currencyInfo } = useCurrency();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const country = user?.country ?? "KE";
  const isKenya = country === "KE";
  const isUganda = country === "UG";
  const isZambia = country === "ZM";
  const isCameroon = country === "CM";
  const mainBal = balances?.mainWallet ?? 0;
  const selectedAmount = typeof amount === "number" ? amount : 0;

  useEffect(() => {
    if (!isKenya && !isUganda && !isZambia && !isCameroon) {
      fetch(`${import.meta.env.BASE_URL}api/settings/eversend-link`, { credentials: "include" })
        .then((r) => r.json())
        .then((d) => { if (d.eversendLink) setEversendLink(d.eversendLink); })
        .catch(() => {});
    }
  }, [isKenya, isUganda, isZambia, isCameroon]);

  const handleRecharge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) < 50) {
      toast({ title: "Invalid Amount", description: `Minimum deposit is ${fmt(50)}`, variant: "destructive" });
      return;
    }
    if (!phone || phone.length < 9) {
      toast({ title: "Invalid Phone", description: "Enter a valid phone number", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}api/wallet/recharge`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: Number(amount), phoneNumber: phone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to initiate.");
      navigate(
        `/payment-status?type=recharge&txn_id=${data.transactionId ?? ""}&checkout_id=${encodeURIComponent(data.checkoutRequestId ?? "")}`
      );
    } catch (err: any) {
      const message = err?.message?.replace(/^HTTP \d+ [^:]+:\s*/i, "") || "Failed to initiate.";
      toast({ title: "Request Failed", description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <div className="rounded-2xl overflow-hidden border border-red-900/20" style={{ background: "#1a0508" }}>

        <div
          className="relative px-5 py-5 overflow-hidden"
          style={{ background: "linear-gradient(135deg, #0d3d2e 0%, #0a1f3d 60%, #1a0a2e 100%)" }}
        >
          <div className="absolute inset-0 opacity-30"
            style={{ background: "radial-gradient(ellipse at top right, #10b98133 0%, transparent 60%)" }} />
          <div className="relative z-10 flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Wallet className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400 text-[10px] font-black uppercase tracking-widest">Main Wallet</span>
              </div>
              <p className="text-4xl font-black leading-none" style={{ color: "#34d399" }}>
                {Math.round(mainBal)}
              </p>
              <p className="text-slate-400 text-xs mt-1.5">
                Current balance
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "linear-gradient(135deg, #10b981 0%, #059669 100%)" }}>
              <Wallet className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>

        {isKenya ? (
          <form onSubmit={handleRecharge} className="p-5 space-y-5">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">Deposit Amount</span>
              </div>
              <div className="grid grid-cols-3 gap-2 mb-3">
                {PRESET_AMOUNTS.map((preset, i) => {
                  const isActive = amount === preset;
                  return (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setAmount(preset)}
                      className={cn(
                        "py-2.5 rounded-xl border text-sm font-black transition-all bg-gradient-to-br shadow-lg",
                        isActive ? cn(PRESET_COLORS_ACTIVE[i], "shadow-lg") : PRESET_COLORS[i]
                      )}
                    >
                      {fmt(preset)}
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center bg-white/5 border border-white/10 rounded-xl overflow-hidden focus-within:border-emerald-500/50 focus-within:ring-1 focus-within:ring-emerald-500/30 transition-all">
                <span className="text-slate-400 text-sm font-black px-3 border-r border-white/10 py-3 flex-shrink-0 bg-white/3">
                  {currencyInfo.symbol}
                </span>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="Enter amount"
                  min={50}
                  className="flex-1 bg-transparent py-3 px-3 text-white text-sm font-semibold placeholder:text-slate-600 focus:outline-none"
                />
              </div>
              <p className="text-slate-600 text-[10px] mt-1.5 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-600 inline-block" />
                Min {fmt(50)} · Max {fmt(50000)}
              </p>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <Phone className="w-3.5 h-3.5 text-fuchsia-400" />
                <span className="text-[10px] font-black uppercase tracking-widest text-fuchsia-400">M-Pesa Number</span>
              </div>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2">
                  <Phone className="w-3.5 h-3.5 text-slate-500" />
                </div>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0712345678"
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-9 pr-4 text-white text-sm font-semibold placeholder:text-slate-600 focus:outline-none focus:border-fuchsia-500/50 focus:ring-1 focus:ring-fuchsia-500/30 transition-all"
                />
              </div>
              <div className="mt-2.5 flex items-start gap-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-3 py-2.5">
                <div className="w-7 h-7 rounded-lg bg-emerald-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-white text-[10px] font-black">M</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  <span className="text-emerald-300 font-bold">M-Pesa STK Push</span> — you'll get a payment prompt on your phone. Enter your{" "}
                  <span className="text-emerald-300 font-bold">M-Pesa PIN</span> to confirm.
                </p>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !amount || !phone}
              className={cn(
                "w-full py-3.5 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] border border-transparent",
                loading || !amount || !phone
                  ? "bg-white/5 border-white/8 text-slate-500 cursor-not-allowed"
                  : "text-white shadow-lg"
              )}
              style={
                loading || !amount || !phone
                  ? {}
                  : { background: "linear-gradient(135deg, #ec4899 0%, #8b5cf6 50%, #06b6d4 100%)" }
              }
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Zap className="w-4 h-4" />
              )}
              {loading
                ? "Sending STK Push..."
                : selectedAmount
                  ? `Deposit ${fmt(selectedAmount)} via M-Pesa`
                  : "Deposit to Main Wallet"}
            </button>

            <button
              type="button"
              onClick={() => navigate("/dashboard")}
              className="w-full flex items-center justify-center gap-1.5 text-slate-500 text-xs hover:text-slate-400 transition-colors py-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Back to Dashboard
            </button>
          </form>
        ) : isUganda ? (
          <div className="p-5 space-y-4">
            <div className="rounded-xl p-4 border border-white/10 bg-white/3 text-center">
              <p className="text-slate-400 text-sm mb-1">
                Choose your mobile money provider to deposit
              </p>
              <p className="text-slate-500 text-xs">Pay via MTN or Airtel Uganda</p>
            </div>
            <button
              type="button"
              onClick={() => navigate("/uganda-pay?method=mtn")}
              className="w-full py-3.5 rounded-xl font-black text-sm text-white flex items-center justify-center gap-2 shadow-lg"
              style={{ background: "linear-gradient(135deg, #ec4899 0%, #8b5cf6 50%, #06b6d4 100%)" }}
            >
              <Phone className="w-4 h-4" />
              Pay with MTN Uganda
            </button>
            <button
              type="button"
              onClick={() => navigate("/uganda-pay?method=airtel")}
              className="w-full py-3.5 rounded-xl font-black text-sm text-white flex items-center justify-center gap-2 shadow-lg"
              style={{ background: "linear-gradient(135deg, #ec4899 0%, #8b5cf6 50%, #06b6d4 100%)" }}
            >
              <Phone className="w-4 h-4" />
              Pay with Airtel Uganda
            </button>
            <button
              type="button"
              onClick={() => navigate("/dashboard")}
              className="w-full flex items-center justify-center gap-1.5 text-slate-500 text-xs hover:text-slate-400 transition-colors py-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Back to Dashboard
            </button>
          </div>
        ) : isCameroon ? (
          <div className="p-5 space-y-4">
            <div className="rounded-xl p-4 border border-white/10 bg-white/3 text-center">
              <p className="text-slate-400 text-sm mb-1">
                Deposit via MTN International Transfer
              </p>
              <p className="text-slate-500 text-xs">Follow the payment steps on the next page</p>
            </div>
            <button
              type="button"
              onClick={() => navigate("/cameroon-pay?amount=2510")}
              className="w-full py-3.5 rounded-xl font-black text-sm text-white flex items-center justify-center gap-2 shadow-lg"
              style={{ background: "linear-gradient(135deg, #ec4899 0%, #8b5cf6 50%, #06b6d4 100%)" }}
            >
              <Phone className="w-4 h-4" />
              Pay with MTN Cameroon
            </button>
            <button
              type="button"
              onClick={() => navigate("/dashboard")}
              className="w-full flex items-center justify-center gap-1.5 text-slate-500 text-xs hover:text-slate-400 transition-colors py-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Back to Dashboard
            </button>
          </div>
        ) : isZambia ? (
          <div className="p-5 space-y-4">
            <div className="rounded-xl p-4 border border-white/10 bg-white/3 text-center">
              <p className="text-slate-400 text-sm mb-1">
                Choose your mobile money provider to deposit
              </p>
              <p className="text-slate-500 text-xs">Pay via MTN or Airtel Zambia</p>
            </div>
            <button
              type="button"
              onClick={() => navigate("/zambia-pay?method=mtn")}
              className="w-full py-3.5 rounded-xl font-black text-sm text-white flex items-center justify-center gap-2 shadow-lg"
              style={{ background: "linear-gradient(135deg, #ec4899 0%, #8b5cf6 50%, #06b6d4 100%)" }}
            >
              <Phone className="w-4 h-4" />
              Pay with MTN Zambia
            </button>
            <button
              type="button"
              onClick={() => navigate("/zambia-pay?method=airtel")}
              className="w-full py-3.5 rounded-xl font-black text-sm text-white flex items-center justify-center gap-2 shadow-lg"
              style={{ background: "linear-gradient(135deg, #ec4899 0%, #8b5cf6 50%, #06b6d4 100%)" }}
            >
              <Phone className="w-4 h-4" />
              Pay with Airtel Zambia
            </button>
            <button
              type="button"
              onClick={() => navigate("/dashboard")}
              className="w-full flex items-center justify-center gap-1.5 text-slate-500 text-xs hover:text-slate-400 transition-colors py-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Back to Dashboard
            </button>
          </div>
        ) : (
          <div className="p-5 space-y-4">
            <div className="rounded-xl p-4 border border-white/10 bg-white/3 text-center">
              <p className="text-slate-400 text-sm mb-1">
                To deposit funds, use the payment link below
              </p>
              <p className="text-slate-500 text-xs">Include your registered phone number as the reference</p>
            </div>
            <a
              href={eversendLink}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3.5 rounded-xl font-black text-sm text-white flex items-center justify-center gap-2 shadow-lg"
              style={{ background: "linear-gradient(135deg, #ec4899 0%, #8b5cf6 50%, #06b6d4 100%)" }}
            >
              <ExternalLink className="w-4 h-4" />
              Pay via Eversend
            </a>
            <div className="text-center">
              <p className="text-xs text-slate-500 mb-2">Already paid?</p>
              <button
                type="button"
                onClick={() => navigate("/verify")}
                className="w-full py-3.5 rounded-xl font-black text-sm text-white flex items-center justify-center gap-2 border border-white/10 bg-white/5 hover:bg-white/8 transition-all"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Verify Payment
              </button>
            </div>
            <button
              type="button"
              onClick={() => navigate("/dashboard")}
              className="w-full flex items-center justify-center gap-1.5 text-slate-500 text-xs hover:text-slate-400 transition-colors py-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Back to Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
