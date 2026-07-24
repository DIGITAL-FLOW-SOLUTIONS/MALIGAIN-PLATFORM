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
  KE: { amount: "350",  currency: "KES" },
  CM: { amount: "2510", currency: "XAF" },
  GH: { amount: "60",   currency: "GHS" },
  UG: { amount: "12000",currency: "UGX" },
  ZM: { amount: "115",  currency: "ZK" },
  TZ: { amount: "7500", currency: "TZS" },
  CG: { amount: "15000",currency: "CDF" },
  NG: { amount: "7500", currency: "NGN" },
  MW: { amount: "12000",currency: "MWK" },
  BW: { amount: "75",   currency: "BWP" },
  SS: { amount: "20000",currency: "SSP" },
  RW: { amount: "5500", currency: "RWF" },
  BI: { amount: "25000",currency: "BIF" },
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
        <div className="rounded-2xl overflow-hidden shadow-sm border border-border bg-card">

          {/* Header */}
          <div className="relative px-6 pt-8 pb-6 text-center overflow-hidden bg-gradient-to-br from-primary to-secondary">
            <div className="absolute inset-0 opacity-20"
              style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.5) 0%, transparent 65%)" }} />
            <div className="relative z-10 flex justify-center mb-4">
              <div className="w-16 h-16 rounded-full bg-white/20 border-2 border-white/30 flex items-center justify-center shadow-xl">
                <UserPlus className="w-8 h-8 text-white" />
              </div>
            </div>
            <h1 className="relative z-10 text-2xl font-black text-white tracking-tight">Pay for Client</h1>
            <p className="relative z-10 text-white/70 text-sm mt-1">Activate your direct downline's account</p>
          </div>

          <div className="px-6 py-6 space-y-4">

            {/* Fee info */}
            <div className="flex items-center gap-4 rounded-2xl px-4 py-4 border border-border bg-muted/30">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                <Zap className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-muted-foreground text-[10px] font-black uppercase tracking-widest">Activation Fee</p>
                <p className="text-amber-600 text-xl font-black">{fee.currency} {fee.amount}</p>
              </div>
            </div>

            {/* Warning */}
            <div className="flex items-start gap-3 rounded-xl px-4 py-3 border border-amber-200 bg-amber-50">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-amber-800 text-xs leading-relaxed">
                <span className="font-bold">Direct downlines only.</span> You can only activate accounts that were directly referred by you.
              </p>
            </div>

            {/* Phone lookup */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Search className="w-3 h-3 text-primary" />
                <span className="text-[10px] font-black uppercase tracking-widest text-primary">Downline's Phone Number</span>
              </div>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <input
                    type="tel"
                    value={downlinePhone}
                    onChange={e => { setDownlinePhone(e.target.value); setLookupError(""); setFoundDownline(null); }}
                    placeholder="07XX XXX XXX"
                    className={cn(
                      "w-full pl-9 pr-3 py-3 rounded-xl text-sm text-foreground placeholder:text-muted-foreground",
                      "border focus:outline-none focus:ring-2 transition-all",
                      lookupError
                        ? "border-destructive/50 bg-destructive/5 focus:ring-destructive/20"
                        : "border-input bg-muted/30 focus:ring-primary/20 focus:border-primary"
                    )}
                  />
                </div>
                <button
                  type="button"
                  onClick={handleLookup}
                  disabled={lookupLoading}
                  className="px-4 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-1.5 flex-shrink-0 text-primary-foreground bg-primary hover:bg-primary/90 shadow-sm disabled:opacity-60"
                >
                  {lookupLoading ? (
                    <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                  ) : (
                    <><Search className="w-3.5 h-3.5" />Look Up</>
                  )}
                </button>
              </div>
              {lookupError && (
                <p className="text-destructive text-xs mt-1.5 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />{lookupError}
                </p>
              )}
              <p className="text-muted-foreground text-[10px] mt-1.5">Enter your downline's registered phone number</p>
            </div>

            {/* Found downline result */}
            {foundDownline && (
              <div className="rounded-xl px-4 py-3.5 border border-primary/20 bg-primary/5 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center flex-shrink-0 text-sm font-black text-primary-foreground">
                  {foundDownline.username.substring(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-foreground text-sm font-semibold truncate">{foundDownline.username}</p>
                  <p className="text-muted-foreground text-[10px]">{foundDownline.phone}</p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span className="text-emerald-600 text-xs font-semibold capitalize">{foundDownline.status}</span>
                </div>
              </div>
            )}

            {/* Kenya: M-Pesa STK push */}
            {isKenya ? (
              <form onSubmit={handlePay} className="space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Smartphone className="w-3 h-3 text-primary" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-primary">Your M-Pesa Number</span>
                  </div>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2">
                      <Smartphone className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <input
                      type="tel"
                      value={mpesaPhone}
                      onChange={e => setMpesaPhone(e.target.value)}
                      placeholder="07XXXXXXXX"
                      className="w-full pl-9 pr-3 py-3 rounded-xl text-sm text-foreground placeholder:text-muted-foreground border border-input bg-muted/30 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    />
                  </div>
                  <p className="text-muted-foreground text-[10px] mt-1.5">STK push will be sent to this number</p>
                </div>

                <button
                  type="submit"
                  disabled={payLoading || !foundDownline}
                  className="w-full py-3.5 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm disabled:opacity-50"
                >
                  {payLoading ? (
                    <div className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                  ) : (
                    <Zap className="w-4 h-4" />
                  )}
                  {payLoading ? "Processing..." : "Pay Activation Fee"}
                </button>
              </form>

            ) : isUganda ? (
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => navigate(`/uganda-pay?method=airtel`)}
                  disabled={!foundDownline}
                  className="w-full py-3.5 rounded-xl font-bold text-sm text-primary-foreground bg-primary hover:bg-primary/90 flex items-center justify-center gap-2 transition-all shadow-sm disabled:opacity-50"
                >
                  <Phone className="w-4 h-4" /> Pay with Airtel Uganda
                </button>
                <button
                  type="button"
                  onClick={() => navigate(`/uganda-pay?method=mtn`)}
                  disabled={!foundDownline}
                  className="w-full py-3.5 rounded-xl font-bold text-sm text-primary-foreground bg-secondary hover:bg-secondary/90 flex items-center justify-center gap-2 transition-all shadow-sm disabled:opacity-50"
                >
                  <Phone className="w-4 h-4" /> Pay with MTN Uganda
                </button>
              </div>

            ) : isZambia ? (
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={() => navigate(`/zambia-pay?method=mtn`)}
                  disabled={!foundDownline}
                  className="w-full py-3.5 rounded-xl font-bold text-sm text-primary-foreground bg-primary hover:bg-primary/90 flex items-center justify-center gap-2 transition-all shadow-sm disabled:opacity-50"
                >
                  <Phone className="w-4 h-4" /> Pay with MTN Zambia
                </button>
                <button
                  type="button"
                  onClick={() => navigate(`/zambia-pay?method=airtel`)}
                  disabled={!foundDownline}
                  className="w-full py-3.5 rounded-xl font-bold text-sm text-primary-foreground bg-secondary hover:bg-secondary/90 flex items-center justify-center gap-2 transition-all shadow-sm disabled:opacity-50"
                >
                  <Phone className="w-4 h-4" /> Pay with Airtel Zambia
                </button>
              </div>

            ) : (
              /* Default: Eversend for Ghana, Cameroon, Tanzania, and others */
              <div className="space-y-3">
                <div className="rounded-xl p-3 border border-border bg-muted/30 text-center">
                  <p className="text-foreground text-sm">Pay via the link below to activate this client</p>
                  <p className="text-muted-foreground text-xs mt-1">Once successful, send the payment screenshot to your downline for verification</p>
                </div>
                <a
                  href={eversendLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-4 rounded-2xl text-primary-foreground bg-primary hover:bg-primary/90 font-black text-sm flex items-center justify-center gap-2 shadow-sm transition-all"
                >
                  <ExternalLink className="w-4 h-4" /> Pay via Eversend
                </a>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-2">Already paid?</p>
                  <button
                    type="button"
                    onClick={() => navigate("/verify")}
                    className="w-full py-3.5 rounded-2xl text-foreground font-black text-sm flex items-center justify-center gap-2 border border-border bg-muted/30 hover:bg-muted/50 transition-all"
                  >
                    <ShieldCheck className="w-4 h-4 text-emerald-500" /> Verify Payment
                  </button>
                </div>
              </div>
            )}

            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => navigate("/dashboard")}
                className="text-muted-foreground hover:text-foreground text-sm transition-colors flex items-center gap-1.5 mx-auto"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
