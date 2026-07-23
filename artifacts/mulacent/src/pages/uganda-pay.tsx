import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useLocation, useSearch } from "wouter";
import { Copy, Check } from "lucide-react";

const FALLBACK_UGX_AMOUNT = "10000";

export default function UgandaPay() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const method = params.get("method") === "airtel" ? "airtel" : "mtn";
  const ugxAmount = params.get("amount") ?? FALLBACK_UGX_AMOUNT;

  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [paymentId, setPaymentId] = useState<string>("...");
  const [businessName, setBusinessName] = useState<string>("");

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}api/settings/uganda`, {
      credentials: "include",
    })
      .then((r) => r.json())
      .then((data) => {
        const id = method === "mtn" ? data.mtnUgId : data.airtelUgId;
        const name = method === "mtn" ? data.mtnUgBusinessName : data.airtelUgBusinessName;
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
      const res = await fetch(`${import.meta.env.BASE_URL}api/verify/uganda`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          phone: phone.trim(),
          paymentMethod: method === "mtn" ? "MTN Uganda" : "Airtel Uganda",
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
    ? "PAY WITH MTN UGANDA (AUTOMATIC PAYMENT)"
    : "PAY WITH AIRTEL UGANDA (AUTOMATIC PAYMENT)";
  const dialCode = isMtn ? "*165*3#" : "*185*9#";

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-sm">
        <div className="bg-card rounded-2xl p-6 shadow-sm border border-border">
          <div className="flex items-center gap-3 mb-5">
            <img
              src={`${import.meta.env.BASE_URL}images/logo.png`}
              alt="Logo"
              className="w-10 h-10 rounded-full object-cover"
            />
            <span className="text-primary font-black text-xl tracking-wide">
              MALICENT
            </span>
          </div>

          <h2 className="text-primary font-bold text-center text-base underline mb-5 leading-snug">
            {title}
          </h2>

          <div className="space-y-2 text-sm text-foreground mb-5">
            <p>
              1. Dial <span className="font-black">{dialCode}</span> on your{" "}
              <span className="font-black">
                {isMtn ? "MTN" : "Airtel"} Sim.
              </span>
            </p>
            <div className="flex items-center gap-2">
              <p>2. Put ID</p>
              <span className="font-bold text-foreground bg-gray-100 px-2 py-0.5 rounded">
                {paymentId}
              </span>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 bg-primary hover:bg-primary/90 text-primary-foreground text-xs px-3 py-1 rounded transition-colors"
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
              3. Enter Amount{" "}
              <span className="font-black">UGX {ugxAmount}</span>
            </p>
            <p>4. Select Pay Using Mobile Money</p>
            <p>
              5. CONFIRM it is{" "}
              <span className="font-black">
                {businessName || user?.username?.toUpperCase() || "..."}
              </span>
            </p>
            <p>6. Enter PIN</p>
          </div>

          <div className="bg-muted/30 rounded-xl p-3 mb-4">
            <p className="text-sm text-foreground/80 mb-2">
              Enter number you used to pay. Enter it below and press confirm
            </p>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Enter number 256.. us"
              className="w-full border border-input rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary placeholder:text-muted-foreground"
            />
          </div>

          <button
            onClick={handleConfirm}
            disabled={loading}
            className="w-full py-3.5 rounded-xl font-bold text-sm text-primary-foreground bg-primary hover:bg-primary/90 flex items-center justify-center gap-2 transition-all mb-3 shadow-sm disabled:opacity-50"
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
              className="text-xs text-muted-foreground hover:text-muted-foreground transition-colors"
            >
              ← Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
