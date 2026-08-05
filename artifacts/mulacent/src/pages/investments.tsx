import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { formatCurrency, getCurrencyInfo } from "@/lib/utils";
import {
  TrendingUp, Star, ChevronRight, Clock, DollarSign, BarChart2,
  CheckCircle, Loader2, ExternalLink, Phone, ShieldCheck
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ── types ────────────────────────────────────────────────────────────── */
interface InvestmentPlan {
  id: number;
  brandName: string;
  name: string;
  category: "basic" | "premium";
  depositAmount: number;
  dailyProfit: number;
  totalDays: number;
  totalProfit: number;
  imageUrl: string | null;
  country: string;
}

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

/* ── country helpers (mirrors activate.tsx) ───────────────────────────── */
const MOBILE_COUNTRIES   = new Set(["UG", "ZM", "TZ", "CG", "MW", "BW", "SS", "RW"]);

type PaymentType = "payhero" | "hashback" | "soleaspay" | "mobile" | "manual";

function getPaymentType(country: string, kenyaProvider: "PAYHERO" | "HASHBACK"): PaymentType {
  if (country === "KE") return kenyaProvider === "HASHBACK" ? "hashback" : "payhero";
  if (country === "CM") return "soleaspay";
  if (MOBILE_COUNTRIES.has(country)) return "mobile";
  return "manual";
}

const MOBILE_HINTS: Record<string, { methods: string[]; hint: string }> = {
  UG: { methods: ["MTN Mobile Money", "Airtel Money"],   hint: "Send to number provided by admin" },
  ZM: { methods: ["MTN MoMo", "Airtel Money"],           hint: "Send to number provided by admin" },
  TZ: { methods: ["Vodacom M-Pesa", "Tigo Pesa", "Airtel"],hint: "Send to number provided by admin" },
  CG: { methods: ["M-Pesa (*1122#)"],                    hint: "Dial *1122# to send" },
  MW: { methods: ["Airtel Money (*211#)"],                hint: "Dial *211# to send" },
  BW: { methods: ["Orange Money (*145#)"],               hint: "Dial *145# to send" },
  SS: { methods: ["MTN MoMo"],                           hint: "Send to MTN number provided" },
  RW: { methods: ["MTN MoMo (*182*1*3#)"],               hint: "Dial *182*1*3# to send" },
};

const FALLBACK_EVERSEND = "https://eversend.me/kantolah";

/* ── main component ───────────────────────────────────────────────────── */
export default function Investments() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const country     = user?.country ?? "KE";
  const [kenyaProvider, setKenyaProvider] = useState<"PAYHERO" | "HASHBACK">("PAYHERO");
  const configuredPaymentType = getPaymentType(country, kenyaProvider);
  const [manualFallback, setManualFallback] = useState(false);
  const paymentType: PaymentType = manualFallback ? "manual" : configuredPaymentType;
  const fmt         = (n: number) => formatCurrency(n, country);

  const [plans, setPlans]           = useState<InvestmentPlan[]>([]);
  const [loading, setLoading]       = useState(true);
  const [tab, setTab]               = useState<"basic" | "premium">("basic");
  const [selected, setSelected]     = useState<InvestmentPlan | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Payment form state
  const [phone, setPhone]           = useState(user?.phone ?? "");
  const [payMethod, setPayMethod]   = useState("");
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [screenshotMime, setScreenshotMime] = useState("image/png");
  const [eversendLink, setEversendLink] = useState(FALLBACK_EVERSEND);
  const [kenyaTill, setKenyaTill] = useState("");
  const [kenyaBusiness, setKenyaBusiness] = useState("");
  const [soleasService, setSoleasService] = useState<1 | 2>(1);

  useEffect(() => {
    setManualFallback(false);
    fetch(`${import.meta.env.BASE_URL}api/investments/plans`, { credentials: "include" })
      .then(r => r.json())
      .then(d => { setPlans(d.plans ?? []); setLoading(false); })
      .catch(() => setLoading(false));

    if (country === "KE") {
      fetch(`${import.meta.env.BASE_URL}api/settings/kenya`, { credentials: "include" })
        .then(r => r.json())
        .then(d => {
          setKenyaProvider(d.automaticProvider === "HASHBACK" ? "HASHBACK" : "PAYHERO");
          setKenyaTill(d.tillNumber ?? "");
          setKenyaBusiness(d.businessName ?? "");
        })
        .catch(() => setKenyaProvider("PAYHERO"));
    }
    if (country === "CM" || paymentType === "manual") {
      fetch(`${import.meta.env.BASE_URL}api/settings/eversend-link`, { credentials: "include" })
        .then(r => r.json())
        .then(d => { if (d.eversendLink) setEversendLink(d.eversendLink); })
        .catch(() => {});
    }
  }, [configuredPaymentType, country]);

  const filtered = plans.filter(p => p.category === tab);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setScreenshotMime(file.type);
    const reader = new FileReader();
    reader.onload = ev => setScreenshot(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  async function handlePay() {
    if (!selected) return;
    setSubmitting(true);
    try {
      if (paymentType === "payhero") {
        if (!phone.trim()) { toast({ title: "Enter your M-PESA phone number", variant: "destructive" }); return; }
        const res = await fetch(`${import.meta.env.BASE_URL}api/investments/${selected.id}/pay/kenya`, {
          method: "POST", credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phoneNumber: phone.trim() }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);
        navigate(`/payment-status?type=investment&txn_id=${data.transactionId ?? ""}&checkout_id=${encodeURIComponent(data.checkoutRequestId ?? "")}`);
      } else if (paymentType === "hashback") {
        const setupResponse = await fetch(`${import.meta.env.BASE_URL}api/hashback/investment`, {
          method: "POST", credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ planId: selected.id }),
        });
        const setup = await setupResponse.json() as { accountId?: string; amount?: number; reference?: string; message?: string };
        if (!setupResponse.ok || !setup.accountId || !setup.amount || !setup.reference) {
          throw new Error(setup.message ?? "Hashback payment is unavailable.");
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
        window.HashPay.setup({
          account: setup.accountId,
          amount: setup.amount,
          reference: setup.reference,
          onSuccess: transaction => {
            if (Number(transaction.amount) !== Number(setup.amount)) {
              toast({ title: "Payment Amount Mismatch", description: "The payment amount could not be verified.", variant: "destructive" });
              setSubmitting(false);
              return;
            }
            navigate(`/payment-status?type=investment&provider=hashback&reference=${encodeURIComponent(setup.reference!)}`);
          },
          onCancel: () => setSubmitting(false),
          onError: () => {
            toast({ title: "Hashback Payment Failed", description: "Please try again or use manual payment.", variant: "destructive" });
            setSubmitting(false);
          },
        }).openIframe();
        return;
      } else if (paymentType === "soleaspay") {
        if (!phone.trim()) { toast({ title: "Enter your Cameroon mobile-money number", variant: "destructive" }); return; }
        const res = await fetch(`${import.meta.env.BASE_URL}api/soleaspay/investment`, {
          method: "POST", credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ planId: selected.id, phoneNumber: phone.trim(), service: soleasService }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);
        navigate(`/payment-status?type=investment&provider=soleaspay&order_id=${encodeURIComponent(data.orderId ?? "")}&service=${soleasService}`);
      } else if (paymentType === "mobile") {
        if (!phone.trim() || !payMethod) { toast({ title: "Enter phone and select payment method", variant: "destructive" }); return; }
        const res = await fetch(`${import.meta.env.BASE_URL}api/investments/${selected.id}/pay/mobile`, {
          method: "POST", credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: phone.trim(), paymentMethod: payMethod }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);
        toast({ title: "Payment submitted!", description: data.message });
        setSelected(null);
        navigate("/investments/current");
      } else {
        // Manual payment (Eversend or Kenya M-Pesa Till) — needs proof.
        if (!screenshot) { toast({ title: "Upload payment screenshot", variant: "destructive" }); return; }
        if (!phone.trim()) { toast({ title: "Enter your phone number", variant: "destructive" }); return; }
        const res = await fetch(`${import.meta.env.BASE_URL}api/investments/${selected.id}/pay/manual`, {
          method: "POST", credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phone: phone.trim(), screenshotBase64: screenshot,
            screenshotMime, amountPaid: String(selected.depositAmount),
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);
        toast({ title: "Payment submitted!", description: data.message });
        setSelected(null);
        navigate("/investments/current");
      }
    } catch (err: any) {
      toast({ title: "Payment failed", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-lg mx-auto pb-10">
      {/* Header */}
      <div className="text-center py-6">
        <h1 className="text-2xl font-extrabold text-foreground tracking-tight">Investment Plans</h1>
        <p className="text-sm text-muted-foreground mt-1">Choose a plan and grow your money daily</p>
      </div>

      {/* Tabs */}
      <div className="flex bg-muted rounded-2xl p-1 mx-4 mb-5">
        {(["basic", "premium"] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all",
              tab === t
                ? "bg-background text-primary shadow-sm border border-border"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t === "basic" ? "Basic Plans" : "Premium Plans"}
          </button>
        ))}
      </div>

      {/* Link to current investments */}
      <button
        onClick={() => navigate("/investments/current")}
        className="flex items-center justify-between w-full mx-auto max-w-[calc(100%-2rem)] mb-4 px-4 py-3 rounded-xl bg-primary/5 border border-primary/20 text-sm text-primary font-medium hover:bg-primary/10 transition-all"
      >
        <span className="flex items-center gap-2"><TrendingUp className="w-4 h-4" />View My Current Investments</span>
        <ChevronRight className="w-4 h-4" />
      </button>

      {/* Plan Cards */}
      <div className="space-y-4 px-4">
        {loading
          ? [1, 2, 3].map(i => <div key={i} className="h-40 bg-muted rounded-2xl animate-pulse" />)
          : filtered.length === 0
          ? (
            <div className="text-center py-16 text-muted-foreground">
              <BarChart2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No {tab} plans available yet</p>
              <p className="text-xs mt-1">Check back soon or try the other tab</p>
            </div>
          )
          : filtered.map(plan => (
            <PlanCard key={plan.id} plan={plan} fmt={fmt} onSelect={() => setSelected(plan)} />
          ))
        }
      </div>

      {/* Payment Modal */}
      {selected && (
        <PaymentModal
          plan={selected}
          fmt={fmt}
          paymentType={paymentType}
          country={country}
          phone={phone}
          setPhone={setPhone}
          payMethod={payMethod}
          setPayMethod={setPayMethod}
          screenshot={screenshot}
          handleFileChange={handleFileChange}
          eversendLink={eversendLink}
           kenyaTill={kenyaTill}
           kenyaBusiness={kenyaBusiness}
           soleasService={soleasService}
           setSoleasService={setSoleasService}
           canUseManualFallback={country === "KE" || country === "CM"}
           onUseManual={() => setManualFallback(true)}
           onUseAutomatic={() => setManualFallback(false)}
          mobileHints={MOBILE_HINTS[country]}
          submitting={submitting}
          onPay={handlePay}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

/* ── Plan Card ────────────────────────────────────────────────────────── */
function PlanCard({
  plan, fmt, onSelect,
}: {
  plan: InvestmentPlan;
  fmt: (n: number) => string;
  onSelect: () => void;
}) {
  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm flex hover:shadow-md transition-shadow">
      {/* Image */}
      <div className="w-28 flex-shrink-0 bg-muted flex items-center justify-center overflow-hidden">
        {plan.imageUrl ? (
          <img src={plan.imageUrl} alt={plan.name} className="w-full h-full object-cover" />
        ) : (
          <BarChart2 className="w-10 h-10 text-muted-foreground opacity-40" />
        )}
      </div>

      {/* Details */}
      <div className="flex-1 p-3.5 flex flex-col justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">{plan.brandName}</p>
          <h3 className="font-bold text-sm text-foreground leading-tight">{plan.name}</h3>

          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-2.5">
            <div>
              <p className="text-[10px] text-muted-foreground">Deposit</p>
              <p className="text-xs font-semibold text-foreground">{fmt(plan.depositAmount)}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">Daily Profit</p>
              <p className="text-xs font-bold text-rose-500">{fmt(plan.dailyProfit)}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">Total Days</p>
              <p className="text-xs font-semibold text-foreground">{plan.totalDays} Days</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">Total Profit</p>
              <p className="text-xs font-semibold text-foreground">{fmt(plan.totalProfit)}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mt-3">
          <span className="flex items-center gap-1 text-[10px] text-emerald-500 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            OPEN NOW
          </span>
          <button
            onClick={onSelect}
            className="px-4 py-1.5 bg-primary text-primary-foreground text-xs font-bold rounded-lg hover:bg-primary/90 transition-colors"
          >
            Start Now
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Payment Modal ────────────────────────────────────────────────────── */
function PaymentModal({
  plan, fmt, paymentType, country, phone, setPhone, payMethod, setPayMethod,
  screenshot, handleFileChange, eversendLink, kenyaTill, kenyaBusiness, soleasService,
  setSoleasService, canUseManualFallback, onUseManual, onUseAutomatic,
  mobileHints, submitting, onPay, onClose,
}: {
  plan: InvestmentPlan;
  fmt: (n: number) => string;
  paymentType: PaymentType;
  country: string;
  phone: string;
  setPhone: (v: string) => void;
  payMethod: string;
  setPayMethod: (v: string) => void;
  screenshot: string | null;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  eversendLink: string;
  kenyaTill: string;
  kenyaBusiness: string;
  soleasService: 1 | 2;
  setSoleasService: (value: 1 | 2) => void;
  canUseManualFallback: boolean;
  onUseManual: () => void;
  onUseAutomatic: () => void;
  mobileHints: { methods: string[]; hint: string } | undefined;
  submitting: boolean;
  onPay: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-background w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Plan Summary */}
        <div className="relative bg-gradient-to-br from-primary to-secondary px-5 pt-5 pb-6 overflow-hidden">
          <div className="absolute inset-0 opacity-20" style={{ background: "radial-gradient(ellipse at top right, rgba(255,255,255,0.4) 0%, transparent 60%)" }} />
          <div className="relative z-10">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest">{plan.brandName}</p>
                <h2 className="text-white font-black text-base leading-tight">{plan.name}</h2>
              </div>
              <button onClick={onClose} className="text-white/60 hover:text-white text-xl leading-none">×</button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><p className="text-white/50 text-[10px]">Deposit Required</p><p className="text-white font-black text-lg">{fmt(plan.depositAmount)}</p></div>
              <div><p className="text-white/50 text-[10px]">Daily Profit</p><p className="text-rose-300 font-black text-lg">{fmt(plan.dailyProfit)}</p></div>
              <div><p className="text-white/50 text-[10px]">Total Days</p><p className="text-white font-bold">{plan.totalDays} Days</p></div>
              <div><p className="text-white/50 text-[10px]">Total Return</p><p className="text-white font-bold">{fmt(plan.totalProfit)}</p></div>
            </div>
          </div>
        </div>

        {/* Payment Form */}
        <div className="p-5 space-y-4">
          {paymentType === "payhero" && (
            <>
              <p className="text-sm font-semibold text-foreground">Pay via M-PESA</p>
              <p className="text-xs text-muted-foreground -mt-2">An STK push will be sent to your phone</p>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">M-PESA Phone Number</label>
                <input
                  type="tel" value={phone} onChange={e => setPhone(e.target.value)}
                  placeholder="07XXXXXXXX"
                  className="w-full text-center text-foreground text-sm py-3 px-4 rounded-xl outline-none bg-muted/40 border border-input focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </>
          )}

          {paymentType === "hashback" && (
            <>
              <p className="text-sm font-semibold text-foreground">Pay via Hashback M-Pesa</p>
              <p className="text-xs text-muted-foreground -mt-2">A secure Hashback payment window will open</p>
            </>
          )}

          {paymentType === "soleaspay" && (
            <>
              <p className="text-sm font-semibold text-foreground">Pay via Cameroon Mobile Money</p>
              <p className="text-xs text-muted-foreground -mt-2">Confirm the payment request on your MTN or Orange phone</p>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Cameroon Mobile-Money Number</label>
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="6XXXXXXXX" className="w-full text-sm py-3 px-4 rounded-xl outline-none bg-muted/40 border border-input focus:border-primary" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Payment Network</label>
                <select value={soleasService} onChange={e => setSoleasService(Number(e.target.value) === 2 ? 2 : 1)} className="w-full text-sm py-3 px-4 rounded-xl outline-none bg-muted/40 border border-input focus:border-primary">
                  <option value="1">MTN Mobile Money</option>
                  <option value="2">Orange Money</option>
                </select>
              </div>
            </>
          )}

          {paymentType === "mobile" && mobileHints && (
            <>
              <p className="text-sm font-semibold text-foreground">Manual Mobile Money Payment</p>
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-3 text-xs text-amber-800 dark:text-amber-300">
                <p className="font-bold mb-1">Instructions</p>
                <p>Send <strong>{fmt(plan.depositAmount)}</strong> to the admin number, then submit this form. Your investment will be activated after verification.</p>
                <p className="mt-1 text-amber-600 dark:text-amber-400">{mobileHints.hint}</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Your Phone Number</label>
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="Your phone" className="w-full text-sm py-3 px-4 rounded-xl outline-none bg-muted/40 border border-input focus:border-primary" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Payment Method</label>
                <select value={payMethod} onChange={e => setPayMethod(e.target.value)} className="w-full text-sm py-3 px-4 rounded-xl outline-none bg-muted/40 border border-input focus:border-primary">
                  <option value="">Select method</option>
                  {mobileHints.methods.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </>
          )}

          {paymentType === "manual" && (
            <>
              <p className="text-sm font-semibold text-foreground">{country === "KE" ? "Manual M-Pesa Till Payment" : "Pay via Eversend"}</p>
              <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-xl p-3 text-xs text-blue-800 dark:text-blue-300">
                {country === "KE" ? (
                  <p>Send <strong>{fmt(plan.depositAmount)}</strong> to Till <strong>{kenyaTill || "the configured M-Pesa Till"}</strong>{kenyaBusiness ? ` (${kenyaBusiness})` : ""}, then upload your payment proof.</p>
                ) : (
                  <p>Send <strong>{fmt(plan.depositAmount)}</strong> via Eversend, take a screenshot, and upload it below.</p>
                )}
              </div>
              {country !== "KE" && (
                <a href={eversendLink} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-colors">
                  <ExternalLink className="w-4 h-4" />Open Eversend Link
                </a>
              )}
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Your Phone Number</label>
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="Your phone" className="w-full text-sm py-3 px-4 rounded-xl outline-none bg-muted/40 border border-input focus:border-primary" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Payment Screenshot</label>
                <label className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border-2 border-dashed border-border cursor-pointer hover:border-primary/50 transition-colors">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{screenshot ? "✓ Screenshot selected" : "Tap to upload screenshot"}</span>
                  <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                </label>
              </div>
            </>
          )}

          {canUseManualFallback && paymentType !== "manual" && (
            <button type="button" onClick={onUseManual} className="w-full py-2.5 rounded-xl border border-border text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/40">
              {country === "KE" ? "Use manual M-Pesa Till instead" : "Use manual Eversend instead"}
            </button>
          )}
          {canUseManualFallback && paymentType === "manual" && (
            <button type="button" onClick={onUseAutomatic} className="w-full py-2.5 rounded-xl border border-primary/30 text-xs font-semibold text-primary hover:bg-primary/5">
              Use automatic payment instead
            </button>
          )}

          <button
            onClick={onPay}
            disabled={submitting}
            className="w-full py-3.5 rounded-xl font-bold text-sm text-primary-foreground bg-primary hover:bg-primary/90 disabled:opacity-50 flex items-center justify-center gap-2 transition-all shadow-sm mt-2"
          >
            {submitting ? <><Loader2 className="w-4 h-4 animate-spin" />Processing…</> : <><CheckCircle className="w-4 h-4" />Confirm Investment</>}
          </button>
        </div>
      </div>
    </div>
  );
}
