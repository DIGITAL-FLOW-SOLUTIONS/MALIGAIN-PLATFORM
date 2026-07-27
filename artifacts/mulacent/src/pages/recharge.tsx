import { useState, useEffect } from "react";
import { useGetWalletBalances } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { useCurrency } from "@/hooks/use-currency";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import {
  Wallet,
  Phone,
  Zap,
  ExternalLink,
  ShieldCheck,
  ChevronRight,
  Send,
} from "lucide-react";
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
    <div className="min-h-full" style={{ background: "#f0f4ff" }}>
      <div className="max-w-md mx-auto px-4 py-6 space-y-5">
        {/* ── Title ─────────────────────────────────────────────────────── */}
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800">
            Recharge Wallet
          </h1>
          <p className="text-slate-500 text-sm mt-1 leading-relaxed">
            Deposit funds into{" "}
            <span className="text-secondary font-semibold">your wallet</span> to
            start earning.
          </p>
        </div>

        {/* ── Balance Card ──────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl p-5 shadow-[0_2px_12px_rgba(0,0,0,0.06)] border border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Wallet className="w-3.5 h-3.5 text-secondary" />
                <span className="text-slate-400 text-[10px] font-semibold uppercase tracking-wider">
                  Main Wallet Balance
                </span>
              </div>
              <p className="text-slate-800 text-3xl font-extrabold leading-none">
                {fmt(mainBal)}
              </p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-secondary/10 flex items-center justify-center flex-shrink-0">
              <Wallet className="w-5.5 h-5.5 text-secondary" />
            </div>
          </div>
        </div>

        {/* ── KENYA: M-Pesa Flow ────────────────────────────────────────── */}
        {isKenya ? (
          <form onSubmit={handleRecharge} className="space-y-5">
            {/* Amount card */}
            <div className="bg-white rounded-2xl p-5 shadow-[0_2px_12px_rgba(0,0,0,0.06)] border border-slate-100 space-y-4">
              <p className="text-slate-700 text-sm font-medium">
                Deposit Amount
              </p>

              {/* Custom input */}
              <div className="flex items-center border border-secondary/40 rounded-xl overflow-hidden ring-0 transition-all duration-200 focus-within:ring-2 focus-within:ring-secondary/25 focus-within:border-secondary">
                <div className="bg-secondary text-white text-xs font-bold px-4 py-3.5 flex items-center justify-center flex-shrink-0 select-none">
                  {currencyInfo.symbol}
                </div>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) =>
                    setAmount(e.target.value === "" ? "" : Number(e.target.value))
                  }
                  placeholder="Enter amount"
                  min={50}
                  className="flex-1 bg-transparent px-4 py-3 text-slate-800 text-sm font-semibold placeholder:text-slate-300 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-1.5 bg-violet-50 rounded-lg px-3 py-2">
                <span className="w-1.5 h-1.5 rounded-full bg-secondary inline-block flex-shrink-0" />
                <span className="text-secondary text-xs font-medium">
                  Min {fmt(50)} · Max {fmt(50000)}
                </span>
              </div>
            </div>

            {/* Phone number card */}
            <div className="bg-white rounded-2xl p-5 shadow-[0_2px_12px_rgba(0,0,0,0.06)] border border-slate-100 space-y-4">
              <p className="text-slate-700 text-sm font-medium">
                M-Pesa Number
              </p>

              <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-secondary/25 focus-within:border-secondary/40 transition-all">
                <div className="flex items-center justify-center px-3.5 py-3 bg-slate-50 border-r border-slate-200">
                  <Phone className="w-4 h-4 text-slate-400" />
                </div>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0712345678"
                  className="flex-1 bg-transparent px-3.5 py-3 text-slate-800 text-sm font-semibold placeholder:text-slate-300 focus:outline-none"
                />
              </div>

              {/* M-Pesa info banner */}
              <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-3">
                <div className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-white text-[10px] font-black">M</span>
                </div>
                <p className="text-xs text-emerald-800 leading-relaxed">
                  <span className="font-bold text-emerald-700">
                    M-Pesa STK Push
                  </span>{" "}
                  — you'll get a payment prompt on your phone. Enter your{" "}
                  <span className="font-bold text-emerald-700">M-Pesa PIN</span>{" "}
                  to confirm.
                </p>
              </div>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading || !amount || !phone}
              className={cn(
                "w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98]",
                loading || !amount || !phone
                  ? "text-slate-400 bg-slate-100 cursor-not-allowed"
                  : "text-white shadow-md hover:shadow-lg",
              )}
              style={
                !loading && amount && phone
                  ? {
                      background:
                        "linear-gradient(180deg, #7c3aed 0%, #9333ea 100%)",
                    }
                  : undefined
              }
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              {loading
                ? "Sending STK Push..."
                : selectedAmount
                  ? `Deposit ${fmt(selectedAmount)} via M-Pesa`
                  : "Deposit to Main Wallet"}
            </button>
          </form>
        ) : isUganda ? (
          /* ── UGANDA: MTN / Airtel ────────────────────────────────────── */
          <div className="space-y-5">
            <div className="bg-white rounded-2xl p-5 shadow-[0_2px_12px_rgba(0,0,0,0.06)] border border-slate-100 space-y-3">
              <p className="text-slate-700 text-sm font-medium">
                Choose Payment Method
              </p>
              <p className="text-slate-400 text-xs">
                Select your mobile money provider to deposit
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate("/uganda-pay?method=mtn")}
              className="w-full py-3.5 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all active:scale-[0.98]"
              style={{
                background: "linear-gradient(180deg, #7c3aed 0%, #9333ea 100%)",
              }}
            >
              <Phone className="w-4 h-4" /> Pay with MTN Uganda
            </button>
            <button
              type="button"
              onClick={() => navigate("/uganda-pay?method=airtel")}
              className="w-full py-3.5 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all active:scale-[0.98]"
              style={{
                background: "linear-gradient(180deg, #7c3aed 0%, #9333ea 100%)",
              }}
            >
              <Phone className="w-4 h-4" /> Pay with Airtel Uganda
            </button>
          </div>
        ) : isCameroon ? (
          /* ── CAMEROON: MTN International ─────────────────────────────── */
          <div className="space-y-5">
            <div className="bg-white rounded-2xl p-5 shadow-[0_2px_12px_rgba(0,0,0,0.06)] border border-slate-100 space-y-3">
              <p className="text-slate-700 text-sm font-medium">
                Deposit via MTN International Transfer
              </p>
              <p className="text-slate-400 text-xs">
                Follow the payment steps on the next page
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate("/cameroon-pay?amount=2510")}
              className="w-full py-3.5 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all active:scale-[0.98]"
              style={{
                background: "linear-gradient(180deg, #7c3aed 0%, #9333ea 100%)",
              }}
            >
              <Phone className="w-4 h-4" /> Pay with MTN Cameroon
            </button>
          </div>
        ) : isZambia ? (
          /* ── ZAMBIA: MTN / Airtel ────────────────────────────────────── */
          <div className="space-y-5">
            <div className="bg-white rounded-2xl p-5 shadow-[0_2px_12px_rgba(0,0,0,0.06)] border border-slate-100 space-y-3">
              <p className="text-slate-700 text-sm font-medium">
                Choose Payment Method
              </p>
              <p className="text-slate-400 text-xs">
                Select your mobile money provider to deposit
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate("/zambia-pay?method=mtn")}
              className="w-full py-3.5 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all active:scale-[0.98]"
              style={{
                background: "linear-gradient(180deg, #7c3aed 0%, #9333ea 100%)",
              }}
            >
              <Phone className="w-4 h-4" /> Pay with MTN Zambia
            </button>
            <button
              type="button"
              onClick={() => navigate("/zambia-pay?method=airtel")}
              className="w-full py-3.5 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all active:scale-[0.98]"
              style={{
                background: "linear-gradient(180deg, #7c3aed 0%, #9333ea 100%)",
              }}
            >
              <Phone className="w-4 h-4" /> Pay with Airtel Zambia
            </button>
          </div>
        ) : (
          /* ── OTHER COUNTRIES: Eversend link ──────────────────────────── */
          <div className="space-y-5">
            <div className="bg-white rounded-2xl p-5 shadow-[0_2px_12px_rgba(0,0,0,0.06)] border border-slate-100 space-y-3">
              <p className="text-slate-700 text-sm font-medium">
                Deposit via Eversend
              </p>
              <p className="text-slate-400 text-xs">
                Use the payment link below. Include your registered phone number
                as the reference.
              </p>
            </div>

            <a
              href={eversendLink}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3.5 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all active:scale-[0.98]"
              style={{
                background: "linear-gradient(180deg, #7c3aed 0%, #9333ea 100%)",
              }}
            >
              <ExternalLink className="w-4 h-4" /> Pay via Eversend
            </a>

            <div className="bg-white rounded-2xl p-5 shadow-[0_2px_12px_rgba(0,0,0,0.06)] border border-slate-100">
              <p className="text-slate-500 text-xs text-center mb-3">
                Already paid?
              </p>
              <button
                type="button"
                onClick={() => navigate("/verify")}
                className="w-full py-3 rounded-xl font-semibold text-sm text-slate-700 flex items-center justify-center gap-2 border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-all"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-500" /> Verify
                Payment
              </button>
            </div>
          </div>
        )}

        {/* ── Footer ──────────────────────────────────────────────────── */}
        <div className="flex items-center justify-center gap-1.5 text-slate-400 text-xs text-center pt-1">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>
            Deposits are processed{" "}
            <span className="text-secondary font-medium">securely</span> via
            mobile money.
          </span>
        </div>
      </div>
    </div>
  );
}
