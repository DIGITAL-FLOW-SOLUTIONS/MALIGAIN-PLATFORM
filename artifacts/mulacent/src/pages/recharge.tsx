import { useState, useEffect } from "react";
import { useGetWalletBalances } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { useCurrency } from "@/hooks/use-currency";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { Wallet, Zap, Phone, ChevronLeft, ExternalLink, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

const PRESET_AMOUNTS = [50, 100, 200, 500, 1000, 2000];

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
      <div className="rounded-2xl overflow-hidden border border-border bg-card shadow-sm">

        {/* Balance header */}
        <div className="relative px-5 py-5 overflow-hidden bg-gradient-to-br from-primary to-secondary">
          <div className="absolute inset-0 opacity-20"
            style={{ background: "radial-gradient(ellipse at top right, rgba(255,255,255,0.4) 0%, transparent 60%)" }} />
          <div className="relative z-10 flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Wallet className="w-3.5 h-3.5 text-white/70" />
                <span className="text-white/70 text-[10px] font-black uppercase tracking-widest">Main Wallet</span>
              </div>
              <p className="text-4xl font-black leading-none text-white">
                {Math.round(mainBal)}
              </p>
              <p className="text-white/60 text-xs mt-1.5">Current balance</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
              <Wallet className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>

        {isKenya ? (
          <form onSubmit={handleRecharge} className="p-5 space-y-5">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Deposit Amount</span>
              </div>
              <div className="grid grid-cols-3 gap-2 mb-3">
                {PRESET_AMOUNTS.map((preset) => {
                  const isActive = amount === preset;
                  return (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setAmount(preset)}
                      className={cn(
                        "py-2.5 rounded-xl border text-sm font-black transition-all",
                        isActive
                          ? "bg-primary text-primary-foreground border-primary shadow-sm"
                          : "bg-muted border-border text-foreground hover:border-primary/40"
                      )}
                    >
                      {fmt(preset)}
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center bg-background border border-input rounded-xl overflow-hidden focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                <span className="text-muted-foreground text-sm font-black px-3 border-r border-border py-3 flex-shrink-0 bg-muted">
                  {currencyInfo.symbol}
                </span>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="Enter amount"
                  min={50}
                  className="flex-1 bg-transparent py-3 px-3 text-foreground text-sm font-semibold placeholder:text-muted-foreground focus:outline-none"
                />
              </div>
              <p className="text-muted-foreground text-[10px] mt-1.5 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground inline-block" />
                Min {fmt(50)} · Max {fmt(50000)}
              </p>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <Phone className="w-3.5 h-3.5 text-primary" />
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">M-Pesa Number</span>
              </div>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2">
                  <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0712345678"
                  className="w-full bg-background border border-input rounded-xl py-3 pl-9 pr-4 text-foreground text-sm font-semibold placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                />
              </div>
              <div className="mt-2.5 flex items-start gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2.5">
                <div className="w-7 h-7 rounded-lg bg-emerald-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-white text-[10px] font-black">M</span>
                </div>
                <p className="text-[11px] text-emerald-800 leading-relaxed">
                  <span className="text-emerald-700 font-bold">M-Pesa STK Push</span> — you'll get a payment prompt on your phone. Enter your{" "}
                  <span className="text-emerald-700 font-bold">M-Pesa PIN</span> to confirm.
                </p>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !amount || !phone}
              className={cn(
                "w-full py-3.5 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98]",
                loading || !amount || !phone
                  ? "bg-muted text-muted-foreground cursor-not-allowed"
                  : "bg-primary text-primary-foreground shadow-sm"
              )}
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
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
              className="w-full flex items-center justify-center gap-1.5 text-muted-foreground text-xs hover:text-foreground transition-colors py-1"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Back to Dashboard
            </button>
          </form>
        ) : isUganda ? (
          <div className="p-5 space-y-4">
            <div className="rounded-xl p-4 border border-border bg-muted/50 text-center">
              <p className="text-foreground text-sm mb-1">Choose your mobile money provider to deposit</p>
              <p className="text-muted-foreground text-xs">Pay via MTN or Airtel Uganda</p>
            </div>
            <button type="button" onClick={() => navigate("/uganda-pay?method=mtn")}
              className="w-full py-3.5 rounded-xl font-black text-sm text-primary-foreground bg-primary flex items-center justify-center gap-2 shadow-sm">
              <Phone className="w-4 h-4" /> Pay with MTN Uganda
            </button>
            <button type="button" onClick={() => navigate("/uganda-pay?method=airtel")}
              className="w-full py-3.5 rounded-xl font-black text-sm text-primary-foreground bg-secondary flex items-center justify-center gap-2 shadow-sm">
              <Phone className="w-4 h-4" /> Pay with Airtel Uganda
            </button>
            <button type="button" onClick={() => navigate("/dashboard")}
              className="w-full flex items-center justify-center gap-1.5 text-muted-foreground text-xs hover:text-foreground transition-colors py-1">
              <ChevronLeft className="w-3.5 h-3.5" /> Back to Dashboard
            </button>
          </div>
        ) : isCameroon ? (
          <div className="p-5 space-y-4">
            <div className="rounded-xl p-4 border border-border bg-muted/50 text-center">
              <p className="text-foreground text-sm mb-1">Deposit via MTN International Transfer</p>
              <p className="text-muted-foreground text-xs">Follow the payment steps on the next page</p>
            </div>
            <button type="button" onClick={() => navigate("/cameroon-pay?amount=2510")}
              className="w-full py-3.5 rounded-xl font-black text-sm text-primary-foreground bg-primary flex items-center justify-center gap-2 shadow-sm">
              <Phone className="w-4 h-4" /> Pay with MTN Cameroon
            </button>
            <button type="button" onClick={() => navigate("/dashboard")}
              className="w-full flex items-center justify-center gap-1.5 text-muted-foreground text-xs hover:text-foreground transition-colors py-1">
              <ChevronLeft className="w-3.5 h-3.5" /> Back to Dashboard
            </button>
          </div>
        ) : isZambia ? (
          <div className="p-5 space-y-4">
            <div className="rounded-xl p-4 border border-border bg-muted/50 text-center">
              <p className="text-foreground text-sm mb-1">Choose your mobile money provider to deposit</p>
              <p className="text-muted-foreground text-xs">Pay via MTN or Airtel Zambia</p>
            </div>
            <button type="button" onClick={() => navigate("/zambia-pay?method=mtn")}
              className="w-full py-3.5 rounded-xl font-black text-sm text-primary-foreground bg-primary flex items-center justify-center gap-2 shadow-sm">
              <Phone className="w-4 h-4" /> Pay with MTN Zambia
            </button>
            <button type="button" onClick={() => navigate("/zambia-pay?method=airtel")}
              className="w-full py-3.5 rounded-xl font-black text-sm text-primary-foreground bg-secondary flex items-center justify-center gap-2 shadow-sm">
              <Phone className="w-4 h-4" /> Pay with Airtel Zambia
            </button>
            <button type="button" onClick={() => navigate("/dashboard")}
              className="w-full flex items-center justify-center gap-1.5 text-muted-foreground text-xs hover:text-foreground transition-colors py-1">
              <ChevronLeft className="w-3.5 h-3.5" /> Back to Dashboard
            </button>
          </div>
        ) : (
          <div className="p-5 space-y-4">
            <div className="rounded-xl p-4 border border-border bg-muted/50 text-center">
              <p className="text-foreground text-sm mb-1">To deposit funds, use the payment link below</p>
              <p className="text-muted-foreground text-xs">Include your registered phone number as the reference</p>
            </div>
            <a href={eversendLink} target="_blank" rel="noopener noreferrer"
              className="w-full py-3.5 rounded-xl font-black text-sm text-primary-foreground bg-primary flex items-center justify-center gap-2 shadow-sm">
              <ExternalLink className="w-4 h-4" /> Pay via Eversend
            </a>
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-2">Already paid?</p>
              <button type="button" onClick={() => navigate("/verify")}
                className="w-full py-3.5 rounded-xl font-black text-sm text-foreground flex items-center justify-center gap-2 border border-border bg-muted hover:bg-muted/80 transition-all">
                <ShieldCheck className="w-4 h-4 text-emerald-500" /> Verify Payment
              </button>
            </div>
            <button type="button" onClick={() => navigate("/dashboard")}
              className="w-full flex items-center justify-center gap-1.5 text-muted-foreground text-xs hover:text-foreground transition-colors py-1">
              <ChevronLeft className="w-3.5 h-3.5" /> Back to Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
