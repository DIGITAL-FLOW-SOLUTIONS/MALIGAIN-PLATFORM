import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useLocation, useSearch } from "wouter";
import { Copy, Check } from "lucide-react";

const FALLBACK_AMOUNT = "12000";

export default function MalawiPay() {
  const { logout } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const mwkAmount = params.get("amount") ?? FALLBACK_AMOUNT;

  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [recipientPhone, setRecipientPhone] = useState<string>("254757574729");
  const [businessName, setBusinessName] = useState<string>("CHARLES");

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}api/settings/malawi`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (data.malawiPhone) setRecipientPhone(data.malawiPhone);
        if (data.malawiBusinessName) setBusinessName(data.malawiBusinessName);
      })
      .catch(() => {});
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(recipientPhone).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleConfirm = async () => {
    if (!phone.trim()) {
      toast({ title: "Phone Required", description: "Please enter the number you used to pay.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}api/verify/malawi`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ phone: phone.trim(), paymentMethod: "Airtel Malawi" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Submission failed");
      toast({ title: "Submitted!", description: "Your payment has been submitted for verification." });
      navigate("/dashboard");
    } catch (err: any) {
      toast({ title: "Failed", description: err.message || "Something went wrong. Try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-sm">
        <div className="bg-card rounded-2xl p-6 shadow-sm border border-border">
          <div className="flex items-center gap-3 mb-5">
            <img src={`${import.meta.env.BASE_URL}images/logo.png`} alt="Tripple Earn Agencies" className="w-10 h-10 rounded-xl object-contain" />
            <span className="text-primary font-black text-xl tracking-wide">TRIPPLE EARN</span>
          </div>

          <h2 className="text-primary font-bold text-center text-base underline mb-5 leading-snug">
            PAY WITH AIRTEL MALAWI (AUTOMATIC PAYMENT)
          </h2>

          <div className="space-y-2.5 text-sm text-foreground mb-5">
            <p>1. Dial <span className="font-black">*211#</span> on your Airtel SIM.</p>
            <p>2. Select <span className="font-black">Send Money</span>.</p>
            <p>3. Select <span className="font-black">Other Countries</span>.</p>
            <p>4. Select <span className="font-black">Kenya</span>.</p>
            <p>5. Select <span className="font-black">Safaricom Network</span>.</p>
            <div className="flex items-center gap-2 flex-wrap">
              <p>6. Recipient Number:</p>
              <span className="font-bold text-foreground bg-gray-100 px-2 py-0.5 rounded">
                {recipientPhone}
              </span>
              <span className="text-muted-foreground text-xs">({businessName})</span>
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 bg-primary hover:bg-primary/90 text-primary-foreground text-xs px-3 py-1 rounded transition-colors"
              >
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <p>7. Amount: <span className="font-black">MWK {mwkAmount}</span>.</p>
            <p>8. Reason: <span className="font-black">Business / Investment</span>.</p>
            <p>9. Send details and confirm.</p>
          </div>

          <div className="bg-muted/30 rounded-xl p-3 mb-4">
            <p className="text-sm text-foreground/80 mb-2">
              Enter the number you used to pay, then press confirm
            </p>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Enter your Airtel Malawi number"
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
            <button onClick={logout} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              ← Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
