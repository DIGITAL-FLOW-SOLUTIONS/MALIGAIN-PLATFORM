import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useLocation, useSearch } from "wouter";
import { Copy, Check } from "lucide-react";

const FALLBACK_AMOUNT = "15000";

export default function CongoPay() {
  const { logout } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const cdfAmount = params.get("amount") ?? FALLBACK_AMOUNT;

  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [copiedAgent, setCopiedAgent] = useState(false);
  const [agentNumber, setAgentNumber] = useState<string>("03317296");
  const [agentName, setAgentName] = useState<string>("ADEZILA");

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}api/settings/congo`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        if (data.congoAgentNumber) setAgentNumber(data.congoAgentNumber);
        if (data.congoAgentName) setAgentName(data.congoAgentName);
      })
      .catch(() => {});
  }, []);

  const handleCopy = (text: string, setter: (v: boolean) => void) => {
    navigator.clipboard.writeText(text).then(() => {
      setter(true);
      setTimeout(() => setter(false), 2000);
    });
  };

  const handleConfirm = async () => {
    if (!phone.trim()) {
      toast({ title: "Phone Required", description: "Please enter the number you used to pay.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}api/verify/congo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ phone: phone.trim(), paymentMethod: "M-Pesa Congo" }),
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
            <img src={`${import.meta.env.BASE_URL}images/logo.png`} alt="MALIGAIN" className="w-10 h-10 rounded-xl object-contain" />
            <span className="text-primary font-black text-xl tracking-wide">MALIGAIN</span>
          </div>

          <h2 className="text-primary font-bold text-center text-base underline mb-5 leading-snug">
            PAIEMENT M-PESA CONGO (CDF {cdfAmount})
          </h2>

          <div className="space-y-2.5 text-sm text-foreground mb-5">
            <p>1. Composez <span className="font-black">*1122#</span> sur votre SIM.</p>
            <p>2. Veuillez sélectionner <span className="font-black">l'option 1</span>.</p>
            <p>3. Compte M-Pesa USD : <span className="font-black">option 3</span>.</p>
            <p>4. Retirer du cash : <span className="font-black">option 1</span>.</p>
            <div className="flex items-center gap-2 flex-wrap">
              <p>5. Entrez le numéro de l'agent :</p>
              <span className="font-bold text-foreground bg-gray-100 px-2 py-0.5 rounded">
                {agentNumber}
              </span>
              <span className="text-muted-foreground text-xs">{agentName}</span>
              <button
                onClick={() => handleCopy(agentNumber, setCopiedAgent)}
                className="flex items-center gap-1 bg-primary hover:bg-primary/90 text-primary-foreground text-xs px-3 py-1 rounded transition-colors"
              >
                {copiedAgent ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copiedAgent ? "Copié" : "Copier"}
              </button>
            </div>
            <p>6. Montant : <span className="font-black">CDF {cdfAmount}</span>.</p>
            <p>7. Insérez votre <span className="font-black">code PIN M-Pesa</span>.</p>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
            <p className="text-xs font-bold text-amber-800">
              ✅ Envoyez votre message de confirmation M-Pesa pour l'activation
            </p>
          </div>

          <div className="bg-muted/30 rounded-xl p-3 mb-4">
            <p className="text-sm text-foreground/80 mb-2">
              Entrez le numéro que vous avez utilisé pour payer, puis appuyez sur confirmer
            </p>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Entrez votre numéro M-Pesa"
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
            {loading ? "Envoi..." : "Confirmer et aller au tableau de bord"}
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
