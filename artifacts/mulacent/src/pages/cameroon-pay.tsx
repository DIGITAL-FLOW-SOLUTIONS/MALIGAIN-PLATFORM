import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useLocation, useSearch } from "wouter";
import { Copy, Check } from "lucide-react";

export default function CameroonPay() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const xafAmount = params.get("amount") ?? "2510";

  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [copiedAmount, setCopiedAmount] = useState(false);
  const [recipientPhone, setRecipientPhone] = useState<string>("+254757574729");
  const [businessName, setBusinessName] = useState<string>("Charles Nzive");

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}api/settings/cameroon`, {
      credentials: "include",
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.cmMtnPhone) setRecipientPhone(data.cmMtnPhone);
        if (data.cmMtnBusinessName) setBusinessName(data.cmMtnBusinessName);
      })
      .catch(() => {});
  }, []);

  const copyText = (text: string, setter: (v: boolean) => void) => {
    navigator.clipboard.writeText(text).then(() => {
      setter(true);
      setTimeout(() => setter(false), 2000);
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
      const res = await fetch(`${import.meta.env.BASE_URL}api/verify/cameroon`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          phone: phone.trim(),
          paymentMethod: "MTN Cameroon",
          amount: xafAmount,
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

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-sm">
        <div className="bg-card rounded-2xl p-6 shadow-sm border border-border">
          <div className="flex items-center gap-3 mb-5">
            <img
              src={`${import.meta.env.BASE_URL}images/logo.png`}
              alt="MALIGAIN"
              className="w-10 h-10 rounded-xl object-contain"
            />
            <span className="text-primary font-black text-xl tracking-wide">
              MALIGAIN
            </span>
          </div>

          <h2 className="text-primary font-bold text-center text-base underline mb-1 leading-snug">
            🚀 MALIGAIN – PAYMENT PROCEDURE 💰
          </h2>
          <p className="text-center text-muted-foreground text-xs mb-5">📌 Follow these steps carefully:</p>

          <div className="space-y-2.5 text-sm text-foreground mb-5">
            <p>
              1. Dial <span className="font-black">*126*</span> on your{" "}
              <span className="font-black">MTN Sim</span>
            </p>
            <p>
              2. Select <span className="font-black">Option 5 – International Transfer</span>
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              <p>
                3. Enter Amount{" "}
                <span className="font-bold text-foreground bg-gray-100 px-2 py-0.5 rounded">
                  XAF {xafAmount}
                </span>
              </p>
              <button
                onClick={() => copyText(xafAmount, setCopiedAmount)}
                className="flex items-center gap-1 bg-primary hover:bg-primary/90 text-primary-foreground text-xs px-3 py-1 rounded transition-colors"
              >
                {copiedAmount ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copiedAmount ? "Copied" : "Copy"}
              </button>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <p>
                4. Enter recipient's Number{" "}
                <span className="font-bold text-foreground bg-gray-100 px-2 py-0.5 rounded">
                  {recipientPhone}
                </span>{" "}
                <span className="text-muted-foreground text-xs">(Mpesa)</span>
              </p>
              <button
                onClick={() => copyText(recipientPhone, setCopiedPhone)}
                className="flex items-center gap-1 bg-primary hover:bg-primary/90 text-primary-foreground text-xs px-3 py-1 rounded transition-colors"
              >
                {copiedPhone ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copiedPhone ? "Copied" : "Copy"}
              </button>
            </div>
            <p>
              5. CONFIRM it is{" "}
              <span className="font-black">
                {businessName || user?.username?.toUpperCase() || "..."}
              </span>
            </p>
            <p>6. Input your PIN &amp; Confirm</p>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
            <p className="text-xs font-bold text-amber-800">
              ✅ NOTE: Send your MTN confirmation message for Activation
            </p>
          </div>

          <div className="bg-muted/30 rounded-xl p-3 mb-4">
            <p className="text-sm text-foreground/80 mb-2">
              Enter the number you used to pay, then press confirm
            </p>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Enter your MTN number (e.g. 237...)"
              className="w-full border border-input rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary placeholder:text-muted-foreground"
            />
          </div>

          <button
            onClick={handleConfirm}
            disabled={loading}
            className="w-full py-3.5 rounded-xl font-bold text-sm text-primary-foreground bg-primary hover:bg-primary/90 flex items-center justify-center gap-2 transition-all mb-3 shadow-sm disabled:opacity-50"
          >
            {loading ? (
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
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
