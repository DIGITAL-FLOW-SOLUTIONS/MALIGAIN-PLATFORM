import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useLocation, useSearch } from "wouter";
import { Copy, Check } from "lucide-react";

const FALLBACK_ZMW_AMOUNT = "100";

export default function ZambiaPay() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const method = params.get("method") === "airtel" ? "airtel" : "mtn";
  const zmwAmount = params.get("amount") ?? FALLBACK_ZMW_AMOUNT;

  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [paymentId, setPaymentId] = useState<string>("...");
  const [businessName, setBusinessName] = useState<string>("");

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}api/settings/zambia`, {
      credentials: "include",
    })
      .then((r) => r.json())
      .then((data) => {
        const id = method === "mtn" ? data.mtnZmId : data.airtelZmId;
        const name = method === "mtn" ? data.mtnZmBusinessName : data.airtelZmBusinessName;
        if (id) setPaymentId(id);
        if (name) setBusinessName(name);
      })
      .catch(() => {});
  }, [method]);

  const handleCopy = () => {
    navigator.clipboard.writeText(paymentId).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleConfirm = async () => {
    if (!phone.trim()) {
      toast({
        title: "Phone Required",
        description: "Please enter the number you used to pay.",
        variant: "destructive",
      });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}api/verify/zambia`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          phone: phone.trim(),
          paymentMethod: method === "mtn" ? "MTN Zambia" : "Airtel Zambia",
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Submission failed");
      toast({
        title: "Submitted!",
        description: "Your payment has been submitted for verification.",
      });
      navigate("/dashboard");
    } catch (err: any) {
      toast({
        title: "Failed",
        description: err.message || "Something went wrong. Try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const isMtn = method === "mtn";
  const title = isMtn
    ? "PAY WITH MTN ZAMBIA (AUTOMATIC PAYMENT)"
    : "PAY WITH AIRTEL ZAMBIA (AUTOMATIC PAYMENT)";

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
        <div className="bg-white rounded-2xl p-6 shadow-2xl">
          <div className="flex items-center gap-3 mb-5">
            <img
              src={`${import.meta.env.BASE_URL}images/logo.png`}
              alt="Logo"
              className="w-10 h-10 rounded-full object-cover"
            />
            <span className="text-[#3b1fa8] font-black text-xl tracking-wide">
              MALIGAIN
            </span>
          </div>

          <h2 className="text-[#3b1fa8] font-bold text-center text-base underline mb-5 leading-snug">
            {title}
          </h2>

          <div className="space-y-2 text-sm text-gray-800 mb-5">
            <p>
              1. Dial <span className="font-black">*115#</span> on your{" "}
              <span className="font-black">
                {isMtn ? "MTN" : "Airtel"} Sim.
              </span>
            </p>
            <p>2. Select Send Money</p>
            <p>3. Select International Transfer</p>
            <p>4. Select Kenya</p>
            <div className="flex items-center gap-2">
              <p>5. Enter Number</p>
              <span className="font-bold text-gray-900 bg-gray-100 px-2 py-0.5 rounded">
                {paymentId}
              </span>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1 rounded transition-colors"
              >
                {copied ? (
                  <Check className="w-3 h-3" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <p>
              6. Enter Amount{" "}
              <span className="font-black">ZMW {zmwAmount}</span>
            </p>
            <p>
              7. CONFIRM it is{" "}
              <span className="font-black">
                {businessName || user?.username?.toUpperCase() || "..."}
              </span>
            </p>
            <p>8. Enter PIN</p>
          </div>

          <div className="bg-gray-50 rounded-xl p-3 mb-4">
            <p className="text-sm text-gray-700 mb-2">
              Enter number you used to pay. Enter it below and press confirm
            </p>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Enter mobile 260.. user"
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#3b1fa8]/30 focus:border-[#3b1fa8] placeholder:text-gray-400"
            />
          </div>

          <button
            onClick={handleConfirm}
            disabled={loading}
            className="w-full py-3.5 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-all mb-3"
            style={{
              background: loading
                ? "rgba(34,197,94,0.4)"
                : "linear-gradient(135deg, #16a34a 0%, #15803d 100%)",
              boxShadow: loading ? "none" : "0 4px 18px rgba(22,163,74,0.3)",
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
            ) : null}
            {loading ? "Submitting..." : "Confirm and Go to Dashboard"}
          </button>

          <div className="text-center">
            <button
              onClick={logout}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              ← Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
