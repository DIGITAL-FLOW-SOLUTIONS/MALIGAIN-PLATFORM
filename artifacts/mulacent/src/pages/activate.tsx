import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { ExternalLink, ShieldCheck, Phone } from "lucide-react";

declare global {
  interface Window {
    HashPay?: {
      setup: (options: {
        account: string;
        amount: number;
        reference: string;
        onSuccess: (transaction: { amount?: number; receipt?: string; status?: string }) => void;
        onCancel: () => void;
        onError: (error: unknown) => void;
      }) => { openIframe: () => void };
    };
  }
}

const COUNTRY_FEES: Record<
  string,
  { label: string; amount: string; currency: string; hint: string }
> = {
  KE: { label: "Kenya",       amount: "350",   currency: "KES", hint: "Accepts: 07XX..., 254XX..., +254XX..." },
  CM: { label: "Cameroon",    amount: "60",    currency: "USD", hint: "Pay via Eversend link below" },
  GH: { label: "Ghana",       amount: "60",    currency: "GHS", hint: "Pay via Eversend link below" },
  NG: { label: "Nigeria",     amount: "7500",  currency: "NGN", hint: "Pay via Eversend link below" },
  UG: { label: "Uganda",      amount: "12000", currency: "UGX", hint: "Pay via MTN or Airtel Uganda" },
  ZM: { label: "Zambia",      amount: "115",   currency: "ZK",  hint: "Pay via MTN or Airtel Zambia" },
  TZ: { label: "Tanzania",    amount: "7500",  currency: "TZS", hint: "Pay via Vodacom Tanzania" },
  CG: { label: "Congo",       amount: "15000", currency: "CDF", hint: "Pay via M-Pesa Congo (*1122#)" },
  MW: { label: "Malawi",      amount: "12000", currency: "MWK", hint: "Pay via Airtel Malawi (*211#)" },
  BW: { label: "Botswana",    amount: "75",    currency: "BWP", hint: "Pay via Orange Money (*145#)" },
  SS: { label: "South Sudan", amount: "20000", currency: "SSP", hint: "Pay via MTN South Sudan MoMo" },
  RW: { label: "Rwanda",      amount: "5500",  currency: "RWF", hint: "Pay via MTN Rwanda MoMo (*182*1*3#)" },
  BI: { label: "Burundi",     amount: "25000", currency: "BIF", hint: "Pay via Eversend link below" },
};

function randomUgxAmount(base = 10000): number {
  return Math.floor(Math.random() * 11) + (base - 4);
}

const FALLBACK_EVERSEND_LINK = "https://eversend.me/kantolah";

export default function Activate() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [loading, setLoading] = useState(false);
  const [hashbackLoading, setHashbackLoading] = useState(false);
  const [kenyaPaymentProvider, setKenyaPaymentProvider] = useState<"PAYHERO" | "HASHBACK">("PAYHERO");
  const [eversendLink, setEversendLink] = useState(FALLBACK_EVERSEND_LINK);
  const [dbFees, setDbFees] = useState<Record<string, number>>({});
  const ugxSetRef = useRef(false);
  const [ugxAmount, setUgxAmount] = useState<number>(() => randomUgxAmount());

  const country = user?.country ?? "KE";
  const isKenya = country === "KE";
  const isUganda = country === "UG";
  const isZambia = country === "ZM";
  const isTanzania = country === "TZ";
  const isCongo = country === "CG";
  const isMalawi = country === "MW";
  const isBotswana = country === "BW";
  const isSouthSudan = country === "SS";
  const isRwanda = country === "RW";
  // Cameroon, Ghana, Nigeria (and any unknown country) → Eversend link
  const hasOwnPage = isKenya || isUganda || isZambia || isTanzania || isCongo || isMalawi || isBotswana || isSouthSudan || isRwanda;
  const fee = COUNTRY_FEES[country] ?? COUNTRY_FEES["KE"];
  const baseFee = dbFees[country] ?? parseFloat(fee.amount);
  const displayAmount = isUganda ? String(ugxAmount) : String(Math.round(baseFee));

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}api/settings/activation-fees`, { credentials: "include" })
      .then(r => r.json())
      .then(d => {
        if (d.fees) {
          setDbFees(d.fees);
          if (!ugxSetRef.current) {
            ugxSetRef.current = true;
            setUgxAmount(randomUgxAmount(d.fees.UG ?? 10000));
          }
        }
      })
      .catch(() => {});
    if (isKenya) {
      fetch(`${import.meta.env.BASE_URL}api/settings/kenya`, { credentials: "include" })
        .then((r) => r.json())
        .then((d) => setKenyaPaymentProvider(d.automaticProvider === "HASHBACK" ? "HASHBACK" : "PAYHERO"))
        .catch(() => setKenyaPaymentProvider("PAYHERO"));
    }
    if (!hasOwnPage) {
      fetch(`${import.meta.env.BASE_URL}api/settings/eversend-link`, { credentials: "include" })
        .then((r) => r.json())
        .then((d) => { if (d.eversendLink) setEversendLink(d.eversendLink); })
        .catch(() => {});
    }
  }, [hasOwnPage, isKenya]);

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) {
      toast({ title: "Phone Required", description: "Please enter your M-Pesa number.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}api/auth/activate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ phoneNumber: phone.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Activation failed");
      navigate(
        `/payment-status?type=activate&txn_id=${data.transactionId ?? ""}&checkout_id=${encodeURIComponent(data.checkoutRequestId ?? "")}`,
      );
    } catch (err: any) {
      toast({ title: "Activation Failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleHashbackPayment = async () => {
    setHashbackLoading(true);
    try {
      const setupResponse = await fetch(`${import.meta.env.BASE_URL}api/hashback/activate`, {
        method: "POST",
        credentials: "include",
      });
      const setup = await setupResponse.json() as {
        accountId?: string;
        amount?: number;
        reference?: string;
        message?: string;
      };
      if (!setupResponse.ok || !setup.accountId || !setup.amount || !setup.reference) {
        throw new Error(setup.message || "Hashback payment is unavailable.");
      }

      if (!window.HashPay) {
        await new Promise<void>((resolve, reject) => {
          const existing = document.querySelector<HTMLScriptElement>('script[data-hashpay="true"]');
          if (existing) {
            existing.addEventListener("load", () => resolve(), { once: true });
            existing.addEventListener("error", () => reject(new Error("Unable to load Hashback payment.")), { once: true });
            return;
          }
          const script = document.createElement("script");
          script.src = "https://pay.hashback.co.ke/hashpay.js";
          script.async = true;
          script.dataset.hashpay = "true";
          script.onload = () => resolve();
          script.onerror = () => reject(new Error("Unable to load Hashback payment."));
          document.head.appendChild(script);
        });
      }

      if (!window.HashPay) throw new Error("Hashback payment could not be initialized.");

      const handler = window.HashPay.setup({
        account: setup.accountId,
        amount: setup.amount,
        reference: setup.reference,
        onSuccess: (transaction) => {
          if (Number(transaction.amount) !== Number(setup.amount)) {
            toast({
              title: "Payment Amount Mismatch",
              description: "The payment amount could not be verified.",
              variant: "destructive",
            });
            setHashbackLoading(false);
            return;
          }
          navigate(
            `/payment-status?type=activate&provider=hashback&reference=${encodeURIComponent(setup.reference!)}`,
          );
        },
        onCancel: () => setHashbackLoading(false),
        onError: (error) => {
          console.error("Hashback payment error", error);
          toast({
            title: "Hashback Payment Failed",
            description: "Please try again or use PayHero.",
            variant: "destructive",
          });
          setHashbackLoading(false);
        },
      });

      handler.openIframe();
      setHashbackLoading(false);
    } catch (err) {
      toast({
        title: "Hashback Payment Unavailable",
        description: err instanceof Error ? err.message : "Please try again or use PayHero.",
        variant: "destructive",
      });
      setHashbackLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-sm">
        <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">

          {/* Header */}
          <div className="relative px-6 pt-6 pb-5 bg-gradient-to-br from-primary to-secondary overflow-hidden">
            <div className="absolute inset-0 opacity-20"
              style={{ background: "radial-gradient(ellipse at top right, rgba(255,255,255,0.4) 0%, transparent 60%)" }} />
            <div className="relative z-10 flex items-center gap-3">
              <img
                src={`${import.meta.env.BASE_URL}images/logo.png`}
                alt="Tripple Earn Agencies"
                className="w-11 h-11 rounded-xl object-contain border-2 border-white/30"
              />
              <div>
                <h1 className="text-white font-bold text-base leading-tight tracking-wide">TRIPPLE EARN</h1>
                <p className="text-white/70 text-xs tracking-widest uppercase">Account Activation</p>
              </div>
            </div>
            <div className="relative z-10 mt-4">
              <p className="text-white/70 text-xs font-semibold uppercase tracking-widest mb-1">Activation Fee</p>
              <p className="text-4xl font-black text-white leading-none">{fee.currency} {displayAmount}</p>
              <p className="text-white/60 text-xs mt-1">One-time payment · Instant activation</p>
            </div>
          </div>

          <div className="p-6">
            {isKenya ? (
              <div className="space-y-3">
                <div className="bg-muted/50 border border-border rounded-xl p-4 text-center">
                  <p className="text-foreground text-sm mb-1">
                    Activate your account for{" "}
                    <span className="text-foreground font-bold">{fee.currency} {displayAmount}</span>
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {kenyaPaymentProvider === "PAYHERO"
                      ? "Pay automatically with PayHero or use manual M-Pesa Till payment"
                      : "Pay automatically with Hashback or use manual M-Pesa Till payment"}
                  </p>
                </div>
                {kenyaPaymentProvider === "PAYHERO" && <form onSubmit={handleActivate} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">
                    M-PESA Phone Number
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="07XXXXXXXX"
                    className="w-full text-center text-foreground text-sm py-3 px-4 rounded-xl outline-none transition-all bg-muted/30 border border-input focus:border-primary focus:ring-2 focus:ring-primary/20 placeholder:text-muted-foreground"
                  />
                  <p className="text-xs mt-1.5 text-center text-muted-foreground">{fee.hint}</p>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 rounded-xl font-bold text-sm text-primary-foreground flex items-center justify-center gap-2 transition-all bg-primary hover:bg-primary/90 disabled:opacity-50 shadow-sm"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  ) : (
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  )}
                  {loading ? "Processing..." : "Pay & Activate Account"}
                </button>
                </form>}
                <button
                  type="button"
                  onClick={() => navigate(`/kenya-pay?amount=${displayAmount}`)}
                  className="w-full py-3.5 rounded-xl font-bold text-sm text-foreground border border-primary bg-primary/5 hover:bg-primary/10 flex items-center justify-center gap-2 transition-all"
                >
                  <ShieldCheck className="w-4 h-4 text-primary" /> Manual Payment (M-Pesa Till)
                </button>
                {kenyaPaymentProvider === "HASHBACK" && <button
                  type="button"
                  onClick={handleHashbackPayment}
                  disabled={hashbackLoading || loading}
                  className="w-full py-3 rounded-xl font-bold text-xs text-foreground border border-border bg-muted/30 hover:bg-muted/50 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  {hashbackLoading ? "Opening Hashback..." : "Pay with Hashback M-Pesa"}
                </button>}
              </div>

            ) : isUganda ? (
              <div className="space-y-3">
                <div className="bg-muted/50 border border-border rounded-xl p-4 text-center">
                  <p className="text-foreground text-sm mb-1">
                    Activate your account for{" "}
                    <span className="text-foreground font-bold">{fee.currency} {displayAmount}</span>
                  </p>
                  <p className="text-muted-foreground text-xs">Choose your mobile money provider below</p>
                </div>

                <button
                  type="button"
                  onClick={() => navigate(`/uganda-pay?method=airtel&amount=${ugxAmount}`)}
                  className="w-full py-3.5 rounded-xl font-bold text-sm text-primary-foreground bg-primary hover:bg-primary/90 flex items-center justify-center gap-2 transition-all shadow-sm"
                >
                  <Phone className="w-4 h-4" /> Pay with AIRTEL
                </button>

                <button
                  type="button"
                  onClick={() => navigate(`/uganda-pay?method=mtn&amount=${ugxAmount}`)}
                  className="w-full py-3.5 rounded-xl font-bold text-sm text-primary-foreground bg-secondary hover:bg-secondary/90 flex items-center justify-center gap-2 transition-all shadow-sm"
                >
                  <Phone className="w-4 h-4" /> Pay with MTN
                </button>

                <button
                  type="button"
                  onClick={() => navigate("/dashboard")}
                  className="w-full py-3 rounded-xl font-bold text-sm text-muted-foreground flex items-center justify-center gap-2 transition-all border border-border bg-muted/30 hover:bg-muted/50"
                >
                  Go To Dashboard
                </button>
              </div>

            ) : isCongo ? (
              <div className="space-y-3">
                <div className="bg-muted/50 border border-border rounded-xl p-4 text-center">
                  <p className="text-foreground text-sm mb-1">
                    Activate your account for{" "}
                    <span className="text-foreground font-bold">{fee.currency} {displayAmount}</span>
                  </p>
                  <p className="text-muted-foreground text-xs">Follow the M-Pesa Congo payment instructions</p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate(`/congo-pay?amount=${displayAmount}`)}
                  className="w-full py-3.5 rounded-xl font-bold text-sm text-primary-foreground bg-primary hover:bg-primary/90 flex items-center justify-center gap-2 transition-all shadow-sm"
                >
                  <Phone className="w-4 h-4" /> Payer via M-Pesa Congo
                </button>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-2">Already paid?</p>
                  <button type="button" onClick={() => navigate("/verify")}
                    className="w-full py-3 rounded-xl font-bold text-sm text-foreground flex items-center justify-center gap-2 transition-all border border-border bg-muted/30 hover:bg-muted/50">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" /> Verify Payment
                  </button>
                </div>
              </div>

            ) : isMalawi ? (
              <div className="space-y-3">
                <div className="bg-muted/50 border border-border rounded-xl p-4 text-center">
                  <p className="text-foreground text-sm mb-1">
                    Activate your account for{" "}
                    <span className="text-foreground font-bold">{fee.currency} {displayAmount}</span>
                  </p>
                  <p className="text-muted-foreground text-xs">Pay via Airtel Malawi (*211#)</p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate(`/malawi-pay?amount=${displayAmount}`)}
                  className="w-full py-3.5 rounded-xl font-bold text-sm text-primary-foreground bg-primary hover:bg-primary/90 flex items-center justify-center gap-2 transition-all shadow-sm"
                >
                  <Phone className="w-4 h-4" /> Pay via Airtel Malawi
                </button>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-2">Already paid?</p>
                  <button type="button" onClick={() => navigate("/verify")}
                    className="w-full py-3 rounded-xl font-bold text-sm text-foreground flex items-center justify-center gap-2 transition-all border border-border bg-muted/30 hover:bg-muted/50">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" /> Verify Payment
                  </button>
                </div>
              </div>

            ) : isBotswana ? (
              <div className="space-y-3">
                <div className="bg-muted/50 border border-border rounded-xl p-4 text-center">
                  <p className="text-foreground text-sm mb-1">
                    Activate your account for{" "}
                    <span className="text-foreground font-bold">{fee.currency} {displayAmount}</span>
                  </p>
                  <p className="text-muted-foreground text-xs">Pay via Orange Money (*145#)</p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate(`/botswana-pay?amount=${displayAmount}`)}
                  className="w-full py-3.5 rounded-xl font-bold text-sm text-primary-foreground bg-primary hover:bg-primary/90 flex items-center justify-center gap-2 transition-all shadow-sm"
                >
                  <Phone className="w-4 h-4" /> Pay via Orange Money Botswana
                </button>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-2">Already paid?</p>
                  <button type="button" onClick={() => navigate("/verify")}
                    className="w-full py-3 rounded-xl font-bold text-sm text-foreground flex items-center justify-center gap-2 transition-all border border-border bg-muted/30 hover:bg-muted/50">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" /> Verify Payment
                  </button>
                </div>
              </div>

            ) : isSouthSudan ? (
              <div className="space-y-3">
                <div className="bg-muted/50 border border-border rounded-xl p-4 text-center">
                  <p className="text-foreground text-sm mb-1">
                    Activate your account for{" "}
                    <span className="text-foreground font-bold">{fee.currency} {displayAmount}</span>
                  </p>
                  <p className="text-muted-foreground text-xs">Pay via MTN South Sudan MoMo</p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate(`/south-sudan-pay?amount=${displayAmount}`)}
                  className="w-full py-3.5 rounded-xl font-bold text-sm text-primary-foreground bg-primary hover:bg-primary/90 flex items-center justify-center gap-2 transition-all shadow-sm"
                >
                  <Phone className="w-4 h-4" /> Pay via MTN South Sudan
                </button>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-2">Already paid?</p>
                  <button type="button" onClick={() => navigate("/verify")}
                    className="w-full py-3 rounded-xl font-bold text-sm text-foreground flex items-center justify-center gap-2 transition-all border border-border bg-muted/30 hover:bg-muted/50">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" /> Verify Payment
                  </button>
                </div>
              </div>

            ) : isRwanda ? (
              <div className="space-y-3">
                <div className="bg-muted/50 border border-border rounded-xl p-4 text-center">
                  <p className="text-foreground text-sm mb-1">
                    Activate your account for{" "}
                    <span className="text-foreground font-bold">{fee.currency} {displayAmount}</span>
                  </p>
                  <p className="text-muted-foreground text-xs">Pay via MTN Rwanda MoMo (*182*1*3#)</p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate(`/rwanda-pay?amount=${displayAmount}`)}
                  className="w-full py-3.5 rounded-xl font-bold text-sm text-primary-foreground bg-primary hover:bg-primary/90 flex items-center justify-center gap-2 transition-all shadow-sm"
                >
                  <Phone className="w-4 h-4" /> Pay via MTN Rwanda
                </button>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-2">Already paid?</p>
                  <button type="button" onClick={() => navigate("/verify")}
                    className="w-full py-3 rounded-xl font-bold text-sm text-foreground flex items-center justify-center gap-2 transition-all border border-border bg-muted/30 hover:bg-muted/50">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" /> Verify Payment
                  </button>
                </div>
              </div>

            ) : isZambia ? (
              <div className="space-y-3">
                <div className="bg-muted/50 border border-border rounded-xl p-4 text-center">
                  <p className="text-foreground text-sm mb-1">
                    Activate your account for{" "}
                    <span className="text-foreground font-bold">{fee.currency} {displayAmount}</span>
                  </p>
                  <p className="text-muted-foreground text-xs">Choose your mobile money provider</p>
                </div>

                <button
                  type="button"
                  onClick={() => navigate(`/zambia-pay?method=mtn&amount=${displayAmount}`)}
                  className="w-full py-3.5 rounded-xl font-bold text-sm text-primary-foreground bg-primary hover:bg-primary/90 flex items-center justify-center gap-2 transition-all shadow-sm"
                >
                  <Phone className="w-4 h-4" /> Pay with MTN Zambia
                </button>

                <button
                  type="button"
                  onClick={() => navigate(`/zambia-pay?method=airtel&amount=${displayAmount}`)}
                  className="w-full py-3.5 rounded-xl font-bold text-sm text-primary-foreground bg-secondary hover:bg-secondary/90 flex items-center justify-center gap-2 transition-all shadow-sm"
                >
                  <Phone className="w-4 h-4" /> Pay with Airtel Zambia
                </button>
              </div>

            ) : isTanzania ? (
              <div className="space-y-3">
                <div className="bg-muted/50 border border-border rounded-xl p-4 text-center">
                  <p className="text-foreground text-sm mb-1">
                    Activate your account for{" "}
                    <span className="text-foreground font-bold">{fee.currency} {displayAmount}</span>
                  </p>
                  <p className="text-muted-foreground text-xs">Follow the Tanzania payment instructions</p>
                </div>

                <button
                  type="button"
                  onClick={() => navigate(`/tanzania-pay?amount=${displayAmount}`)}
                  className="w-full py-3.5 rounded-xl font-bold text-sm text-primary-foreground bg-primary hover:bg-primary/90 flex items-center justify-center gap-2 transition-all shadow-sm"
                >
                  <Phone className="w-4 h-4" /> Pay via Vodacom Tanzania
                </button>

                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-2">Already paid?</p>
                  <button
                    type="button"
                    onClick={() => navigate("/verify")}
                    className="w-full py-3 rounded-xl font-bold text-sm text-foreground flex items-center justify-center gap-2 transition-all border border-border bg-muted/30 hover:bg-muted/50"
                  >
                    <ShieldCheck className="w-4 h-4 text-emerald-500" /> Verify Payment
                  </button>
                </div>
              </div>

            ) : (
              /* Default: Eversend for other countries */
              <div className="space-y-3">
                <div className="bg-muted/50 border border-border rounded-xl p-4 text-center">
                  <p className="text-foreground text-sm mb-1">
                    To activate your account, send{" "}
                    <span className="text-foreground font-bold">{fee.currency} {displayAmount}</span>{" "}
                    to the link below
                  </p>
                  <p className="text-muted-foreground text-xs">Include your registered phone number as the reference</p>
                </div>

                <a
                  href={eversendLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3.5 rounded-xl font-bold text-sm text-primary-foreground bg-primary hover:bg-primary/90 flex items-center justify-center gap-2 transition-all shadow-sm"
                >
                  <ExternalLink className="w-4 h-4" /> Pay via Eversend
                </a>

                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-2">Already paid?</p>
                  <button
                    type="button"
                    onClick={() => navigate("/verify")}
                    className="w-full py-3 rounded-xl font-bold text-sm text-foreground flex items-center justify-center gap-2 transition-all border border-border bg-muted/30 hover:bg-muted/50"
                  >
                    <ShieldCheck className="w-4 h-4 text-emerald-500" /> Verify Payment
                  </button>
                </div>
              </div>
            )}

            <div className="mt-5 text-center">
              <div className="h-px mb-4 bg-border" />
              <button
                onClick={logout}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                ← Logout
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
