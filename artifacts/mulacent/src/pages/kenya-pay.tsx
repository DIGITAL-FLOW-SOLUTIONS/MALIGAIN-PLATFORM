import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation, useSearch } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Check, Copy, ShieldCheck } from "lucide-react";

const FALLBACK_KES_AMOUNT = "350";

export default function KenyaPay() {
  const { logout } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const kesAmount = params.get("amount") ?? FALLBACK_KES_AMOUNT;

  const [tillNumber, setTillNumber] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}api/settings/kenya`, {
      credentials: "include",
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.tillNumber) setTillNumber(data.tillNumber);
        if (data.businessName) setBusinessName(data.businessName);
      })
      .catch(() => {});
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(tillNumber).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
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

          <h2 className="text-primary font-bold text-center text-base underline mb-5 leading-snug">
            MANUAL PAYMENT (M-PESA TILL)
          </h2>

          <div className="bg-muted/50 border border-border rounded-xl p-4 mb-5 text-center">
            <p className="text-foreground text-sm mb-1">
              Pay <span className="font-black">KES {kesAmount}</span> to the Till below
            </p>
            <p className="text-muted-foreground text-xs">
              Complete the payment, then upload your proof for verification.
            </p>
          </div>

          <div className="space-y-2 text-sm text-foreground mb-5">
            <p>1. Go to the <span className="font-black">M-Pesa</span> menu.</p>
            <p>2. Select <span className="font-black">Lipa na M-Pesa</span>.</p>
            <p>3. Select <span className="font-black">Buy Goods and Services</span>.</p>
            <div className="flex items-center gap-2 flex-wrap">
              <p>4. Enter Till number</p>
              <span className="font-black bg-amber-100 text-amber-900 px-2 py-0.5 rounded">
                {tillNumber || "..."}
              </span>
              <button
                type="button"
                onClick={handleCopy}
                disabled={!tillNumber}
                className="flex items-center gap-1 bg-primary hover:bg-primary/90 text-primary-foreground text-xs px-3 py-1 rounded transition-colors disabled:opacity-50"
              >
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <p>5. Enter amount <span className="font-black">KES {kesAmount}</span>.</p>
            <p>6. Enter your M-Pesa PIN.</p>
            <p>
              7. Confirm the business name is{" "}
              <span className="font-black">{businessName || "..."}</span>.
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate(`/verify?amount=${encodeURIComponent(kesAmount)}`)}
            className="w-full py-3.5 rounded-xl font-bold text-sm text-primary-foreground bg-primary hover:bg-primary/90 flex items-center justify-center gap-2 transition-all mb-3 shadow-sm"
          >
            <ShieldCheck className="w-4 h-4" />
            Verify Payment
          </button>

          <p className="text-center text-xs text-muted-foreground mb-4">
            Upload your M-Pesa payment screenshot so our team can verify and activate your account.
          </p>

          <div className="text-center">
            <button
              type="button"
              onClick={logout}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Logout
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}