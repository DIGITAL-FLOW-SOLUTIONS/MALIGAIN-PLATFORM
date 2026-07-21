import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import {
  UserPlus,
  Phone,
  Search,
  AlertTriangle,
  Zap,
  Smartphone,
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";

const COUNTRY_FEES: Record<string, { amount: string; currency: string }> = {
  KE: { amount: "100", currency: "KES" },
  CM: { amount: "2500", currency: "XAF" },
  GH: { amount: "55", currency: "GHS" },
  UG: { amount: "10000", currency: "UGX" },
  ZM: { amount: "100", currency: "ZK" },
  TZ: { amount: "7500", currency: "TZS" },
};

const FALLBACK_EVERSEND_LINK = "https://eversend.me/kantolah";

interface DownlineResult {
  id: string;
  username: string;
  phone: string;
  status: string;
  joinedAt: string;
}

export default function PayClient() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const country = user?.country ?? "KE";
  const isKenya = country === "KE";
  const isUganda = country === "UG";
  const isZambia = country === "ZM";
  const isCameroon = country === "CM";
  const fee = COUNTRY_FEES[country] ?? COUNTRY_FEES["KE"];

  const [downlinePhone, setDownlinePhone] = useState("");
  const [mpesaPhone, setMpesaPhone] = useState(user?.phone ?? "");
  const [foundDownline, setFoundDownline] = useState<DownlineResult | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [payLoading, setPayLoading] = useState(false);
  const [lookupError, setLookupError] = useState("");
  const [eversendLink, setEversendLink] = useState(FALLBACK_EVERSEND_LINK);

  useEffect(() => {
    if (!isKenya && !isUganda && !isZambia && !isCameroon) {
      fetch(`${import.meta.env.BASE_URL}api/settings/eversend-link`, { credentials: "include" })
        .then((r) => r.json())
        .then((d) => { if (d.eversendLink) setEversendLink(d.eversendLink); })
        .catch(() => {});
    }
  }, [isKenya, isUganda, isZambia, isCameroon]);

  const handleLookup = async () => {
    if (!downlinePhone || downlinePhone.trim().length < 9) {
      setLookupError("Enter a valid phone number");
      return;
    }
    setLookupError("");
    setFoundDownline(null);
    setLookupLoading(true);
    try {
      const res = await fetch(
        `${import.meta.env.BASE_URL}api/referrals/lookup?phone=${encodeURIComponent(downlinePhone.trim())}`,
        { credentials: "include" }
      );
      const data = await res.json();
      if (!res.ok) {
        setLookupError(data.message ?? "Downline not found");
      } else {
        setFoundDownline(data as DownlineResult);
      }
    } catch {
      setLookupError("Network error. Please try again.");
    } finally {
      setLookupLoading(false);
    }
  };

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!foundDownline) {
      toast({ title: "Look up a client first", variant: "destructive" });
      return;
    }
    if (!mpesaPhone || mpesaPhone.trim().length < 9) {
      toast({ title: "Enter your M-Pesa number", variant: "destructive" });
      return;
    }
    setPayLoading(true);
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}api/referrals/pay-client`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          downlineId: foundDownline.id,
          phoneNumber: mpesaPhone,
          downlinePhone: foundDownline.phone,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Payment Failed", description: data.message ?? "Something went wrong", variant: "destructive" });
      } else {
        navigate(
          `/payment-status?type=pay-client&txn_id=${data.transactionId ?? ""}&checkout_id=${encodeURIComponent(data.checkoutRequestId ?? "")}`
        );
      }
    } catch {
      toast({ title: "Network Error", description: "Please try again.", variant: "destructive" });
    } finally {
      setPayLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div
          className="rounded-3xl overflow-hidden shadow-2xl border border-red-900/20"
          style={{ background: "linear-gradient(160deg, #1a0508 0%, #120508 50%, #1a0508 100%)" }}
        >
          <div
            className="relative px-6 pt-8 pb-6 text-center overflow-hidden"
            style={{ background: "linear-gradient(180deg, #2d0508 0%, #1a0508 100%)" }}
          >
            <div className="absolute inset-0 opacity-20"
              style={{ background: "radial-gradient(ellipse at 50% 0%, #dc2626 0%, transparent 65%)" }} />
            <div className="relative z-10 flex justify-center mb-4">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center shadow-xl"
                style={{ background: "linear-gradient(135deg, #dc2626 0%, #991b1b 100%)", boxShadow: "0 0 30px #dc262640" }}
              >
                <UserPlus className="w-8 h-8 text-white" />
              </div>
            </div>
            <h1 className="relative z-10 text-2xl font-black text-white tracking-tight">Pay for Client</h1>
            <p className="relative z-10 text-red-400/70 text-sm mt-1">Activate your direct downline's account</p>
          </div>

          <div className="px-6 py-6 space-y-4">
            <div
              className="flex items-center gap-4 rounded-2xl px-4 py-4 border border-red-500/25"
              style={{ background: "linear-gradient(135deg, #3b000a22 0%, #1a050822 100%)" }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)" }}
              >
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-red-400/60 text-[10px] font-black uppercase tracking-widest">Activation Fee</p>
                <p className="text-amber-400 text-xl font-black">{fee.currency} {fee.amount}</p>
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-xl px-4 py-3 border border-amber-500/25 bg-amber-500/8">
              <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-amber-300/80 text-xs leading-relaxed">
                <span className="text-amber-400 font-bold">Direct downlines only.</span> You can only activate accounts that were directly referred by you.
              </p>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <Search className="w-3 h-3 text-red-400" />
                <span className="text-[10px] font-black uppercase tracking-widest text-red-400">Downline's Phone Number</span>
              </div>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2">
                    <Phone className="w-4 h-4 text-red-500/50" />
                  </div>
                  <input
                    type="tel"
                    value={downlinePhone}
                    onChange={e => { setDownlinePhone(e.target.value); setLookupError(""); setFoundDownline(null); }}
                    placeholder="07XX XXX XXX"
                    className={cn(
                      "w-full pl-9 pr-3 py-3 rounded-xl text-sm text-white placeholder:text-slate-500",
                      "border focus:outline-none focus:ring-2 transition-all",
                      lookupError
                        ? "border-red-500/50 bg-red-500/5 focus:ring-red-500/30"
                        : "border-red-900/30 bg-white/5 focus:ring-red-500/30 focus:border-red-500/50"
                    )}
                  />
                </div>
                <button
                  type="button"
                  onClick={handleLookup}
                  disabled={lookupLoading}
                  className={cn(
                    "px-4 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-1.5 flex-shrink-0 text-white shadow-lg",
                    lookupLoading ? "opacity-60 cursor-not-allowed" : "hover:opacity-90 active:scale-95"
                  )}
                  style={{ background: "linear-gradient(135deg, #dc2626 0%, #991b1b 100%)", boxShadow: "0 4px 14px #dc262630" }}
                >
                  {lookupLoading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <><Search className="w-3.5 h-3.5" />Look Up</>
                  )}
                </button>
              </div>
              {lookupError && (
                <p className="text-red-400 text-xs mt-1.5 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />{lookupError}
                </p>
              )}
              <p className="text-slate-500 text-[10px] mt-1.5">Enter your downline's registered phone number</p>
            </div>

            {foundDownline && (
              <div
                className="rounded-xl px-4 py-3.5 border border-red-500/30 flex items-center gap-3"
                style={{ background: "linear-gradient(135deg, #3b000a18 0%, #1a050818 100%)" }}
              >
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-black text-white"
                  style={{ background: "linear-gradient(135deg, #dc2626 0%, #991b1b 100%)" }}
                >
                  {foundDownline.username.substring(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-semibold truncate">{foundDownline.username}</p>
                  <p className="text-red-400/60 text-[10px]">{foundDownline.phone}</p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400 text-xs font-semibold capitalize">{foundDownline.status}</span>
                </div>
              </div>
            )}

            {isKenya ? (
              <form onSubmit={handlePay} className="space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Smartphone className="w-3 h-3 text-red-400" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-red-400">Your M-Pesa Number</span>
                  </div>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2">
                      <Smartphone className="w-4 h-4 text-red-500/50" />
                    </div>
                    <input
                      type="tel"
                      value={mpesaPhone}
                      onChange={e => setMpesaPhone(e.target.value)}
                      placeholder="07XXXXXXXX"
                      className="w-full pl-9 pr-3 py-3 rounded-xl text-sm text-white placeholder:text-slate-500 border border-red-900/30 bg-white/5 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-500/50 transition-all"
                    />
                  </div>
                  <p className="text-slate-500 text-[10px] mt-1.5">STK push will be sent to this number</p>
                </div>

                <button
                  type="submit"
                  disabled={payLoading || !foundDownline}
                  className={cn(
                    "w-full py-4 rounded-2xl text-white font-black text-sm transition-all flex items-center justify-center gap-2",
                    payLoading || !foundDownline
                      ? "opacity-50 cursor-not-allowed"
                      : "hover:opacity-95 active:scale-[0.98] shadow-xl"
                  )}
                  style={{
                    background: "linear-gradient(135deg, #dc2626 0%, #991b1b 100%)",
                    boxShadow: foundDownline ? "0 8px 25px #dc262630" : undefined,
                  }}
                >
                  {payLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <><Smartphone className="w-4 h-4" />Pay {fee.currency} {fee.amount} via M-Pesa</>
                  )}
                </button>
              </form>
            ) : isUganda ? (
              <div className="space-y-3">
                <div className="rounded-xl p-3 border border-red-900/20 bg-white/3 text-center">
                  <p className="text-slate-400 text-sm">Choose your mobile money provider to pay for this client</p>
                  <p className="text-slate-500 text-xs mt-1">Pay via MTN or Airtel Uganda</p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate("/uganda-pay?method=mtn")}
                  className="w-full py-4 rounded-2xl text-white font-black text-sm flex items-center justify-center gap-2 shadow-xl"
                  style={{ background: "linear-gradient(135deg, #dc2626 0%, #991b1b 100%)" }}
                >
                  <Phone className="w-4 h-4" />
                  Pay with MTN Uganda
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/uganda-pay?method=airtel")}
                  className="w-full py-4 rounded-2xl text-white font-black text-sm flex items-center justify-center gap-2 shadow-xl"
                  style={{ background: "linear-gradient(135deg, #dc2626 0%, #991b1b 100%)" }}
                >
                  <Phone className="w-4 h-4" />
                  Pay with Airtel Uganda
                </button>
              </div>
            ) : isCameroon ? (
              <div className="space-y-3">
                <div className="rounded-xl p-3 border border-red-900/20 bg-white/3 text-center">
                  <p className="text-slate-400 text-sm">Pay via MTN International Transfer to activate this client</p>
                  <p className="text-slate-500 text-xs mt-1">Follow the payment steps on the next page</p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate("/cameroon-pay?amount=2510")}
                  className="w-full py-4 rounded-2xl text-white font-black text-sm flex items-center justify-center gap-2 shadow-xl"
                  style={{ background: "linear-gradient(135deg, #dc2626 0%, #991b1b 100%)" }}
                >
                  <Phone className="w-4 h-4" />
                  Pay with MTN Cameroon
                </button>
              </div>
            ) : isZambia ? (
              <div className="space-y-3">
                <div className="rounded-xl p-3 border border-red-900/20 bg-white/3 text-center">
                  <p className="text-slate-400 text-sm">Choose your mobile money provider to pay for this client</p>
                  <p className="text-slate-500 text-xs mt-1">Pay via MTN or Airtel Zambia</p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate("/zambia-pay?method=mtn")}
                  className="w-full py-4 rounded-2xl text-white font-black text-sm flex items-center justify-center gap-2 shadow-xl"
                  style={{ background: "linear-gradient(135deg, #dc2626 0%, #991b1b 100%)" }}
                >
                  <Phone className="w-4 h-4" />
                  Pay with MTN Zambia
                </button>
                <button
                  type="button"
                  onClick={() => navigate("/zambia-pay?method=airtel")}
                  className="w-full py-4 rounded-2xl text-white font-black text-sm flex items-center justify-center gap-2 shadow-xl"
                  style={{ background: "linear-gradient(135deg, #dc2626 0%, #991b1b 100%)" }}
                >
                  <Phone className="w-4 h-4" />
                  Pay with Airtel Zambia
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="rounded-xl p-3 border border-red-900/20 bg-white/3 text-center">
                  <p className="text-slate-400 text-sm">Pay via the link below to activate this client</p>
                  <p className="text-slate-500 text-xs mt-1">Once successful send payment screenshot to your downline, they upload it for payment verification</p>
                </div>
                <a
                  href={eversendLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-4 rounded-2xl text-white font-black text-sm flex items-center justify-center gap-2 shadow-xl"
                  style={{ background: "linear-gradient(135deg, #dc2626 0%, #991b1b 100%)" }}
                >
                  <ExternalLink className="w-4 h-4" />
                  Pay via Eversend
                </a>
                <div className="text-center">
                  <p className="text-xs text-red-400/50 mb-2">Already paid?</p>
                  <button
                    type="button"
                    onClick={() => navigate("/verify")}
                    className="w-full py-3.5 rounded-2xl text-white font-black text-sm flex items-center justify-center gap-2 border border-red-700/40 bg-red-900/20 hover:bg-red-900/30 transition-all"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    Verify Payment
                  </button>
                </div>
              </div>
            )}

            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => navigate("/dashboard")}
                className="text-red-400/60 hover:text-red-400 text-sm transition-colors flex items-center gap-1.5 mx-auto"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
