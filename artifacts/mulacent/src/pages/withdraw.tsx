import { useState } from "react";
import {
  useGetWalletBalances,
  useRequestWithdrawal,
} from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { useCurrency } from "@/hooks/use-currency";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  AlertTriangle,
  Wallet,
  Users,
  Lock,
  Phone,
  ArrowRight,
  Maximize2,
  ShieldCheck,
  TrendingUp,
  Coins,
  BadgeDollarSign,
} from "lucide-react";
import { cn } from "@/lib/utils";

const COUNTRY_RULES: Record<string, { min: number; charge: number }> = {
  KE: { min: 300, charge: 45 },
  TZ: { min: 10000, charge: 1250 },
  UG: { min: 10000, charge: 1500 },
  ZM: { min: 100, charge: 10 },
  GH: { min: 60, charge: 5 },
  CM: { min: 2500, charge: 250 },
};
const DEFAULT_RULES = { min: 300, charge: 45 };

const COUNTRY_DIAL: Record<string, { code: string; dial: string; prefix: RegExp }> = {
  KE: { code: "KE", dial: "+254", prefix: /^\+?254/ },
  CM: { code: "CM", dial: "+237", prefix: /^\+?237/ },
  TZ: { code: "TZ", dial: "+255", prefix: /^\+?255/ },
  UG: { code: "UG", dial: "+256", prefix: /^\+?256/ },
  ZM: { code: "ZM", dial: "+260", prefix: /^\+?260/ },
  GH: { code: "GH", dial: "+233", prefix: /^\+?233/ },
};

export default function Withdraw() {
  const { data: balances, isLoading } = useGetWalletBalances();
  const { user } = useAuth();
  const withdrawMutation = useRequestWithdrawal();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { fmt } = useCurrency();
  const [, navigate] = useLocation();

  const [amount, setAmount] = useState("");

  const countryCode = (user?.country ?? "KE").toUpperCase();
  const rules = COUNTRY_RULES[countryCode] ?? DEFAULT_RULES;
  const countryInfo = COUNTRY_DIAL[countryCode] ?? COUNTRY_DIAL.KE;

  const affiliateBal = balances?.teamEarnings ?? 0;
  const minRequired = rules.min;
  const charge = rules.charge;
  const amountNum = parseFloat(amount) || 0;
  const netAmount = Math.max(0, amountNum - charge);
  const canWithdraw =
    amountNum >= minRequired && amountNum <= affiliateBal && !!user?.phone;

  const handleMax = () => setAmount(String(Math.round(affiliateBal)));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canWithdraw) return;
    withdrawMutation.mutate(
      { data: { amount: amountNum, phoneNumber: user?.phone || "" } },
      {
        onSuccess: () => {
          toast({
            title: "Success!",
            description: `Your Withdrawal of ${fmt(netAmount)} Has Been Sent! Payment will be Processed After Successful Verification On Time.`,
          });
          setAmount("");
          queryClient.invalidateQueries({ queryKey: ["/api/wallet/balances"] });
          queryClient.invalidateQueries({ queryKey: ["/api/wallet/transactions"] });
        },
        onError: (err: any) => {
          const message =
            err?.data?.message ||
            err?.message?.replace(/^HTTP \d+ [^:]+:\s*/i, "") ||
            "Insufficient balance.";
          toast({ title: "Withdrawal Failed", description: message, variant: "destructive" });
        },
      },
    );
  };

  return (
    <div className="max-w-lg mx-auto space-y-4">
      {/* Min/charge banner */}
      <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
        <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-amber-800 text-xs font-semibold">
            Minimum withdrawal:{" "}
            <span className="font-black">{fmt(minRequired)}</span>
          </p>
          <p className="text-amber-700/70 text-[11px] mt-0.5">
            A withdrawal charge of{" "}
            <span className="font-bold text-amber-700">{fmt(charge)}</span>{" "}
            applies per transaction.
          </p>
        </div>
      </div>

      {/* Affiliate balance card */}
      <div className="rounded-2xl p-5 border border-primary/20 shadow-sm relative overflow-hidden bg-gradient-to-br from-primary to-accent">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-3xl rounded-full pointer-events-none" />
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-white/70 text-xs font-bold uppercase tracking-wider">Affiliate Balance</p>
              <p className="text-white font-black text-2xl leading-none mt-0.5">
                {isLoading ? "—" : fmt(affiliateBal)}
              </p>
              <p className="text-white/50 text-[10px] mt-1">Earned from referral bonuses</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-white/50 text-[10px] uppercase tracking-wide">Min</p>
            <p className="text-white text-sm font-black">{fmt(minRequired)}</p>
          </div>
        </div>
      </div>

      {/* Form card */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        {/* Available balance */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-muted-foreground text-xs font-semibold">Available Affiliate Balance</span>
          </div>
          <span className="text-foreground font-black text-lg">{fmt(affiliateBal)}</span>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Amount field */}
          <div className="bg-muted border border-border rounded-xl overflow-hidden">
            <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border">
              <div className="w-6 h-6 rounded-lg bg-emerald-500 flex items-center justify-center flex-shrink-0">
                <Coins className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-foreground font-bold text-sm">
                Withdrawal Amount — Min {fmt(minRequired)}
              </span>
            </div>
            <div className="flex items-center px-3 py-1 bg-background">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                min={0}
                step="0.01"
                className="flex-1 bg-transparent py-2.5 text-foreground text-base font-semibold placeholder:text-muted-foreground focus:outline-none"
              />
              <button
                type="button"
                onClick={handleMax}
                className="flex items-center gap-1 bg-primary/10 border border-primary/20 text-primary text-[10px] font-black px-2.5 py-1.5 rounded-lg hover:bg-primary/20 transition-all uppercase tracking-wide flex-shrink-0"
              >
                <Maximize2 className="w-2.5 h-2.5" /> Max
              </button>
            </div>
          </div>

          {/* Charge breakdown */}
          {amountNum > 0 && (
            <div className="bg-muted border border-border rounded-xl overflow-hidden">
              <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border">
                <div className="w-6 h-6 rounded-lg bg-amber-500 flex items-center justify-center flex-shrink-0">
                  <BadgeDollarSign className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="text-foreground font-bold text-sm">Breakdown</span>
              </div>
              <div className="px-3 py-3 space-y-1.5 bg-background">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Withdrawal Amount</span>
                  <span className="text-foreground font-semibold">{fmt(amountNum)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Processing Charge</span>
                  <span className="text-amber-600 font-semibold">− {fmt(charge)}</span>
                </div>
                <div className="h-px bg-border my-1" />
                <div className="flex justify-between text-xs">
                  <span className="text-foreground font-bold">You Receive</span>
                  <span className="text-emerald-600 font-black">{fmt(netAmount)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Phone number */}
          <div className="bg-muted border border-border rounded-xl overflow-hidden">
            <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border">
              <div className="w-6 h-6 rounded-lg bg-destructive flex items-center justify-center flex-shrink-0">
                <Phone className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="text-foreground font-bold text-sm">Phone Number</span>
            </div>
            <div className="flex items-center gap-3 px-3 py-3 bg-background">
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-[10px] font-black bg-muted border border-border px-2 py-1 rounded text-muted-foreground uppercase tracking-wide">
                  {countryInfo.code}
                </span>
              </div>
              <span className="text-foreground font-semibold text-sm flex-1">
                {user?.phone ? user.phone.replace(countryInfo.prefix, "") : "Not set"}
              </span>
            </div>
            <div className="flex items-center gap-1.5 px-3 pb-3">
              <Lock className="w-2.5 h-2.5 text-muted-foreground" />
              <span className="text-muted-foreground text-[10px]">Locked ·</span>
              <button
                type="button"
                onClick={() => navigate("/profile")}
                className="text-primary text-[10px] font-bold hover:text-primary/80 transition-colors flex items-center gap-0.5"
              >
                Update in Profile <ArrowRight className="w-2.5 h-2.5" />
              </button>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Total Earned", value: fmt(balances?.totalEarned ?? 0), color: "text-emerald-600", icon: TrendingUp },
              { label: "Withdrawn", value: fmt(balances?.totalWithdrawn ?? 0), color: "text-primary", icon: Wallet },
              { label: "Today", value: fmt(balances?.todayEarnings ?? 0), color: "text-secondary", icon: Coins },
            ].map((s) => (
              <div key={s.label} className="bg-muted border border-border rounded-xl p-2.5 text-center overflow-hidden">
                <p className={cn("font-black text-xs sm:text-sm leading-none truncate", s.color)}>{s.value}</p>
                <p className="text-muted-foreground text-[9px] uppercase tracking-wide mt-1 truncate">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={!canWithdraw || withdrawMutation.isPending}
            className={cn(
              "w-full py-3.5 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98]",
              canWithdraw
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground bg-muted border border-border cursor-not-allowed",
            )}
          >
            {withdrawMutation.isPending ? (
              <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
            ) : canWithdraw ? (
              <ShieldCheck className="w-4 h-4" />
            ) : (
              <Lock className="w-4 h-4" />
            )}
            {withdrawMutation.isPending
              ? "Processing..."
              : canWithdraw
                ? `Withdraw ${amount ? fmt(amountNum) : ""}`
                : amountNum > affiliateBal && affiliateBal > 0
                  ? "Insufficient Affiliate Balance"
                  : !user?.phone
                    ? "Set Phone Number First"
                    : `Min ${fmt(minRequired)} Required`}
          </button>

          {amountNum > affiliateBal && affiliateBal >= 0 && (
            <p className="text-center text-muted-foreground text-xs">
              Refer more members to grow your Affiliate Balance
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
