import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { ExternalLink, ShieldCheck, Phone } from "lucide-react";

const COUNTRY_FEES: Record<
  string,
  { label: string; amount: string; currency: string; hint: string }
> = {
  KE: {
    label: "Kenya",
    amount: "100",
    currency: "KES",
    hint: "Accepts: 07XX..., 254XX..., +254XX...",
  },
  CM: {
    label: "Cameroon",
    amount: "2500",
    currency: "XAF",
    hint: "Pay via Eversend link below",
  },
  GH: {
    label: "Ghana",
    amount: "55",
    currency: "GHS",
    hint: "Pay via Eversend link below",
  },
  UG: {
    label: "Uganda",
    amount: "10000",
    currency: "UGX",
    hint: "Pay via Eversend link below",
  },
  ZM: {
    label: "Zambia",
    amount: "100",
    currency: "ZK",
    hint: "Pay via Eversend link below",
  },
  TZ: {
    label: "Tanzania",
    amount: "7500",
    currency: "TZS",
    hint: "Pay via Eversend link below",
  },
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
  const [eversendLink, setEversendLink] = useState(FALLBACK_EVERSEND_LINK);
  const [dbFees, setDbFees] = useState<Record<string, number>>({});
  const ugxSetRef = useRef(false);
  const [ugxAmount, setUgxAmount] = useState<number>(() => randomUgxAmount());

  const country = user?.country ?? "KE";
  const isKenya = country === "KE";
  const isUganda = country === "UG";
  const isZambia = country === "ZM";
  const isTanzania = country === "TZ";
  const isCameroon = country === "CM";
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
    if (!isKenya && !isUganda && !isZambia && !isTanzania && !isCameroon) {
      fetch(`${import.meta.env.BASE_URL}api/settings/eversend-link`, {
        credentials: "include",
      })
        .then((r) => r.json())
        .then((d) => {
          if (d.eversendLink) setEversendLink(d.eversendLink);
        })
        .catch(() => {});
    }
  }, [isKenya, isUganda, isZambia, isTanzania, isCameroon]);

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) {
      toast({
        title: "Phone Required",
        description: "Please enter your M-Pesa number.",
        variant: "destructive",
      });
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
      if (!res.ok) {
        throw new Error(data.message || "Activation failed");
      }
      navigate(
        `/payment-status?type=activate&txn_id=${data.transactionId ?? ""}&checkout_id=${encodeURIComponent(data.checkoutRequestId ?? "")}`,
      );
    } catch (err: any) {
      toast({
        title: "Activation Failed",
        description: err.message || "Something went wrong. Try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-[#0d0518]">
      <div className="absolute inset-0 z-0 overflow-hidden">
        <img
          src={`${import.meta.env.BASE_URL}images/auth-bg.png`}
          alt="Background"
          className="w-full h-full object-cover opacity-70"
        />
        <div className="absolute inset-0 bg-[#0d0518]/60" />
      </div>

      <div className="w-full max-w-sm z-10">
        <div className="bg-[#1a0508]/90 border border-red-900/30 rounded-2xl p-7 shadow-2xl backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-6">
            <img
              src={`${import.meta.env.BASE_URL}images/logo.png`}
              alt="Logo"
              className="w-11 h-11 rounded-full object-cover border-2 border-red-600/50"
            />
            <div>
              <h1 className="text-white font-bold text-base leading-tight tracking-wide">
                MALIGAIN
              </h1>
              <p className="text-red-400 text-xs tracking-widest uppercase">
                Account Verification
              </p>
            </div>
          </div>

          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-5">
            <p className="text-red-400 text-xs font-semibold mb-1 uppercase tracking-widest">
              Activation Fee
            </p>
            <p className="text-3xl font-black text-white">
              {fee.currency} {displayAmount}
            </p>
            <p className="text-red-300/70 text-xs mt-1">
              One-time payment · Instant activation
            </p>
          </div>

          {isKenya ? (
            <form onSubmit={handleActivate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  M-PESA Phone Number
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="07XXXXXXXX"
                  className="w-full text-center text-white text-sm py-3 px-4 rounded-xl outline-none transition-all bg-[#0d0508]/80 border border-red-900/30 focus:border-red-500 focus:ring-1 focus:ring-red-500/30 placeholder:text-gray-500"
                />
                <p className="text-xs mt-1.5 text-center text-red-400/70">
                  {fee.hint}
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-all"
                style={{
                  background: loading
                    ? "rgba(180,0,0,0.4)"
                    : "linear-gradient(135deg, #dc2626 0%, #991b1b 100%)",
                  boxShadow: loading
                    ? "none"
                    : "0 4px 24px rgba(220,38,38,0.25)",
                }}
              >
                {loading ? (
                  <svg
                    className="animate-spin w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v8z"
                    />
                  </svg>
                ) : (
                  <svg
                    className="w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                )}
                {loading ? "Processing..." : "Pay & Activate Account"}
              </button>
            </form>
          ) : isUganda ? (
            <div className="space-y-3">
              <div className="bg-[#0d0508]/80 border border-red-900/30 rounded-xl p-4 text-center">
                <p className="text-gray-400 text-sm mb-1">
                  Activate your account for{" "}
                  <span className="text-white font-bold">
                    {fee.currency} {displayAmount}
                  </span>
                </p>
                <p className="text-red-400/70 text-xs">
                  Choose your mobile money provider below
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  navigate(`/uganda-pay?method=airtel&amount=${ugxAmount}`)
                }
                className="w-full py-3.5 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-all"
                style={{
                  background:
                    "linear-gradient(135deg, #dc2626 0%, #991b1b 100%)",
                  boxShadow: "0 4px 24px rgba(220,38,38,0.25)",
                }}
              >
                <Phone className="w-4 h-4" />
                Pay with AIRTEL
              </button>

              <button
                type="button"
                onClick={() =>
                  navigate(`/uganda-pay?method=mtn&amount=${ugxAmount}`)
                }
                className="w-full py-3.5 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-all"
                style={{
                  background:
                    "linear-gradient(135deg, #dc2626 0%, #991b1b 100%)",
                  boxShadow: "0 4px 24px rgba(220,38,38,0.25)",
                }}
              >
                <Phone className="w-4 h-4" />
                Pay with MTN
              </button>

              <button
                type="button"
                onClick={() => navigate("/dashboard")}
                className="w-full py-3 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-all border border-red-700/40 bg-red-900/20 hover:bg-red-900/30"
              >
                Go To Dashboard
              </button>
            </div>
          ) : isCameroon ? (
            <div className="space-y-3">
              <div className="bg-[#0d0508]/80 border border-red-900/30 rounded-xl p-4 text-center">
                <p className="text-gray-400 text-sm mb-1">
                  Activate your account for{" "}
                  <span className="text-white font-bold">
                    {fee.currency} {fee.amount}
                  </span>
                </p>
                <p className="text-red-400/70 text-xs">
                  Pay via MTN International Transfer
                </p>
              </div>

              <button
                type="button"
                onClick={() => navigate(`/cameroon-pay?amount=${baseFee}`)}
                className="w-full py-3.5 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-all"
                style={{
                  background:
                    "linear-gradient(135deg, #dc2626 0%, #991b1b 100%)",
                  boxShadow: "0 4px 24px rgba(220,38,38,0.25)",
                }}
              >
                <Phone className="w-4 h-4" />
                Pay with MTN Cameroon
              </button>

              <button
                type="button"
                onClick={() => navigate("/dashboard")}
                className="w-full py-3 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-all border border-red-700/40 bg-red-900/20 hover:bg-red-900/30"
              >
                Go To Dashboard
              </button>
            </div>
          ) : isTanzania ? (
            <div className="space-y-3">
              <div className="bg-[#0d0508]/80 border border-red-900/30 rounded-xl p-4 text-center">
                <p className="text-gray-400 text-sm mb-1">
                  Activate your account for{" "}
                  <span className="text-white font-bold">
                    {fee.currency} {displayAmount}
                  </span>
                </p>
                <p className="text-red-400/70 text-xs">
                  Pay via Vodacom International Transfer
                </p>
              </div>

              <button
                type="button"
                onClick={() => navigate(`/tanzania-pay?amount=${baseFee}`)}
                className="w-full py-3.5 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-all"
                style={{
                  background:
                    "linear-gradient(135deg, #dc2626 0%, #991b1b 100%)",
                  boxShadow: "0 4px 24px rgba(220,38,38,0.25)",
                }}
              >
                <Phone className="w-4 h-4" />
                Pay with Vodacom
              </button>

              <button
                type="button"
                onClick={() => navigate("/dashboard")}
                className="w-full py-3 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-all border border-red-700/40 bg-red-900/20 hover:bg-red-900/30"
              >
                Go To Dashboard
              </button>
            </div>
          ) : isZambia ? (
            <div className="space-y-3">
              <div className="bg-[#0d0508]/80 border border-red-900/30 rounded-xl p-4 text-center">
                <p className="text-gray-400 text-sm mb-1">
                  Activate your account for{" "}
                  <span className="text-white font-bold">
                    {fee.currency} {displayAmount}
                  </span>
                </p>
                <p className="text-red-400/70 text-xs">
                  Choose your mobile money provider below
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  navigate(`/zambia-pay?method=airtel&amount=${baseFee}`)
                }
                className="w-full py-3.5 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-all"
                style={{
                  background:
                    "linear-gradient(135deg, #dc2626 0%, #991b1b 100%)",
                  boxShadow: "0 4px 24px rgba(220,38,38,0.25)",
                }}
              >
                <Phone className="w-4 h-4" />
                Pay with Airtel
              </button>

              <button
                type="button"
                onClick={() =>
                  navigate(`/zambia-pay?method=mtn&amount=${baseFee}`)
                }
                className="w-full py-3.5 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-all"
                style={{
                  background:
                    "linear-gradient(135deg, #dc2626 0%, #991b1b 100%)",
                  boxShadow: "0 4px 24px rgba(220,38,38,0.25)",
                }}
              >
                <Phone className="w-4 h-4" />
                Pay with MTN
              </button>

              <button
                type="button"
                onClick={() => navigate("/dashboard")}
                className="w-full py-3 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-all border border-red-700/40 bg-red-900/20 hover:bg-red-900/30"
              >
                Go To Dashboard
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-[#0d0508]/80 border border-red-900/30 rounded-xl p-4 text-center">
                <p className="text-gray-400 text-sm mb-1">
                  Pay{" "}
                  <span className="text-white font-bold">
                    {fee.currency} {fee.amount}
                  </span>{" "}
                  to the link below
                </p>
                <p className="text-red-400/70 text-xs">
                  Include your registered phone number as the reference
                </p>
              </div>

              <a
                href={eversendLink}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3.5 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-all"
                style={{
                  background:
                    "linear-gradient(135deg, #dc2626 0%, #991b1b 100%)",
                  boxShadow: "0 4px 24px rgba(220,38,38,0.25)",
                }}
              >
                <ExternalLink className="w-4 h-4" />
                Pay via Eversend
              </a>

              <div className="text-center">
                <p className="text-xs text-red-400/50 mb-2">Already paid?</p>
                <button
                  type="button"
                  onClick={() => navigate("/verify")}
                  className="w-full py-3 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-all border border-red-700/40 bg-red-900/20 hover:bg-red-900/30"
                >
                  <ShieldCheck className="w-4 h-4" />
                  Verify Payment
                </button>
              </div>
            </div>
          )}

          <div className="mt-5 text-center">
            <div className="h-px mb-4 bg-white/[0.06]" />
            <button
              onClick={logout}
              className="text-xs text-red-400/60 hover:text-red-300 transition-colors"
            >
              ← Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
