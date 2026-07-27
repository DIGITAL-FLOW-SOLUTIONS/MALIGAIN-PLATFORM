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
  Phone,
  ShieldCheck,
  Send,
  ChevronRight,
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

const COUNTRY_CURRENCY: Record<string, string> = {
  KE: "KES",
  UG: "UGX",
  TZ: "TZS",
  ZM: "ZK",
  GH: "GHS",
  CM: "XAF",
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
  const currencyCode = COUNTRY_CURRENCY[countryCode] ?? "KES";

  const affiliateBal = balances?.teamEarnings ?? 0;
  const minRequired = rules.min;
  const charge = rules.charge;
  const amountNum = parseFloat(amount) || 0;
  const netAmount = Math.max(0, amountNum - charge);
  const canWithdraw =
    amountNum >= minRequired && amountNum <= affiliateBal && !!user?.phone;

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
    <div className="min-h-full" style={{ background: "#f0f4ff" }}>
      <div className="max-w-md mx-auto px-4 py-6 space-y-5">
        {/* ── Title ─────────────────────────────────────────────────────── */}
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800">
            Withdraw Funds
          </h1>
          <p className="text-slate-500 text-sm mt-1 leading-relaxed">
            Withdraw{" "}
            <span className="text-secondary font-semibold">your earnings</span>{" "}
            to your registered phone number.
          </p>
        </div>

        {/* ── Amount to Withdraw Card ────────────────────────────────────── */}
        <div className="bg-white rounded-2xl p-5 shadow-[0_2px_12px_rgba(0,0,0,0.06)] border border-slate-100 space-y-4">
          <p className="text-slate-700 text-sm font-medium">
            Amount to Withdraw
          </p>

          {/* Input row */}
          <div className="flex items-center border border-secondary/40 rounded-xl overflow-hidden ring-0 transition-all duration-200 focus-within:ring-2 focus-within:ring-secondary/25 focus-within:border-secondary">
            <div className="bg-secondary text-white text-xs font-bold px-4 py-3.5 flex items-center justify-center flex-shrink-0 select-none">
              {currencyCode}
            </div>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount"
              min={0}
              step="0.01"
              className="flex-1 bg-transparent px-4 py-3 text-slate-800 text-sm font-semibold placeholder:text-slate-300 focus:outline-none"
            />
          </div>

          {/* Minimum withdrawal pill */}
          <div className="flex items-center gap-1.5 bg-violet-50 rounded-lg px-3 py-2">
            <ShieldCheck className="w-3.5 h-3.5 text-secondary flex-shrink-0" />
            <span className="text-secondary text-xs font-medium">
              Minimum withdrawal:{" "}
              <span className="font-bold">
                {currencyCode} {minRequired.toLocaleString()}
              </span>
            </span>
          </div>
        </div>

        {/* ── Breakdown Card ─────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl p-5 shadow-[0_2px_12px_rgba(0,0,0,0.06)] border border-slate-100 space-y-3">
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-500">Withdrawal Amount</span>
            <span className="text-slate-800 font-semibold">
              {fmt(amountNum)}
            </span>
          </div>
          <div className="h-px bg-slate-100" />
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-500">
              Transaction Fee ({fmt(charge)})
            </span>
            <span className="text-red-500 font-semibold">
              - {fmt(amountNum > 0 ? charge : 0)}
            </span>
          </div>
          <div className="h-px bg-slate-100" />
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-700 font-semibold">
              You Will Receive
            </span>
            <span className="text-emerald-500 font-bold">
              {fmt(netAmount)}
            </span>
          </div>
        </div>

        {/* ── Phone Number Card ──────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl p-5 shadow-[0_2px_12px_rgba(0,0,0,0.06)] border border-slate-100 space-y-3">
          <p className="text-slate-700 text-sm font-medium">Phone Number</p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0">
                <Phone className="w-5 h-5 text-white" />
              </div>
              <span className="text-slate-800 font-semibold text-sm">
                {user?.phone || "Not set"}
              </span>
            </div>
            <button
              type="button"
              onClick={() => navigate("/profile")}
              className="flex items-center gap-1 text-secondary text-sm font-medium hover:text-secondary/80 transition-colors"
            >
              Change <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── Withdraw Now Button ────────────────────────────────────────── */}
        <button
          type="button"
          disabled={!canWithdraw || withdrawMutation.isPending}
          onClick={handleSubmit}
          className={cn(
            "w-full py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98]",
            canWithdraw && !withdrawMutation.isPending
              ? "text-white shadow-md hover:shadow-lg"
              : "text-slate-400 bg-slate-100 cursor-not-allowed",
          )}
          style={
            canWithdraw && !withdrawMutation.isPending
              ? {
                  background:
                    "linear-gradient(180deg, #7c3aed 0%, #9333ea 100%)",
                }
              : undefined
          }
        >
          {withdrawMutation.isPending ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
          {withdrawMutation.isPending ? "Processing..." : "Withdraw Now"}
        </button>

        {/* ── Footer ──────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-center gap-1.5 text-slate-400 text-xs text-center pt-1">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>
            Withdrawals are processed{" "}
            <span className="text-secondary font-medium">securely</span> to your
            phone number.
          </span>
        </div>
      </div>
    </div>
  );
}
