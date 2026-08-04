import { useEffect, useState, useRef } from "react";
import { useLocation, useSearch } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { getGetCurrentUserQueryKey } from "@workspace/api-client-react";
import { CheckCircle2, XCircle, ArrowLeft } from "lucide-react";

type PaymentState = "pending" | "completed" | "failed" | "timeout";

export default function PaymentStatus() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const txnId = params.get("txn_id") ?? "";
  const checkoutId = params.get("checkout_id") ?? "";
  const type = params.get("type") ?? "payment";
  const provider = params.get("provider") ?? "payhero";
  const reference = params.get("reference") ?? "";

  const [status, setStatus] = useState<PaymentState>("pending");
  const [message, setMessage] = useState("Waiting for your M-Pesa confirmation...");
  const [elapsed, setElapsed] = useState(0);
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const MAX_WAIT = 90;

  const poll = async () => {
    try {
      const endpoint = provider === "hashback"
        ? `${import.meta.env.BASE_URL}api/hashback/status?reference=${encodeURIComponent(reference)}`
        : `${import.meta.env.BASE_URL}api/mpesa/status?${
            txnId
              ? `txn_id=${encodeURIComponent(txnId)}`
              : `checkout_id=${encodeURIComponent(checkoutId)}`
          }`;
      const res = await fetch(endpoint, {
        credentials: "include",
      });
      if (!res.ok) return;
      const data = (await res.json()) as { status: string; amount?: number };

      if (data.status === "completed") {
        setStatus("completed");
        setMessage("Your payment was received successfully!");
        if (pollRef.current) clearInterval(pollRef.current);
        if (intervalRef.current) clearInterval(intervalRef.current);
        if (type === "activate") {
          const meRes = await fetch(`${import.meta.env.BASE_URL}api/auth/me`, {
            credentials: "include",
          });
          if (meRes.ok) {
            const user = await meRes.json();
            queryClient.setQueryData(getGetCurrentUserQueryKey(), user);
          }
        }
      } else if (data.status === "failed") {
        setStatus("failed");
        setMessage("The payment was not completed. Please try again.");
        if (pollRef.current) clearInterval(pollRef.current);
        if (intervalRef.current) clearInterval(intervalRef.current);
      }
    } catch {
    }
  };

  useEffect(() => {
    if (provider === "hashback" ? !reference : !txnId && !checkoutId) {
      setStatus("failed");
      setMessage("Invalid payment reference. Please try again.");
      return;
    }

    intervalRef.current = setInterval(() => {
      setElapsed((e) => {
        if (e + 1 >= MAX_WAIT) {
          if (pollRef.current) clearInterval(pollRef.current);
          if (intervalRef.current) clearInterval(intervalRef.current);
          setStatus("timeout");
          setMessage("Payment timed out. If you paid, please contact support.");
          return e + 1;
        }
        return e + 1;
      });
    }, 1000);

    poll();
    pollRef.current = setInterval(poll, 4000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [txnId, checkoutId]);

  const backPath =
    type === "activate"
      ? "/activate"
      : type === "pay-client"
      ? "/pay-client"
      : "/recharge";

  const isSuccess = status === "completed";
  const isError = status === "failed" || status === "timeout";
  const isPending = status === "pending";

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-sm">
        <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">

          {/* Header */}
          <div className="relative px-6 pt-6 pb-5 bg-gradient-to-br from-primary to-secondary overflow-hidden">
            <div className="absolute inset-0 opacity-20"
              style={{ background: "radial-gradient(ellipse at top right, rgba(255,255,255,0.4) 0%, transparent 60%)" }} />
            <div className="relative z-10 flex items-center gap-3">
              <img
                src={`${import.meta.env.BASE_URL}images/logo.png`}
                alt="Tripple Earn Agencies"
                className="w-10 h-10 rounded-xl object-contain border-2 border-white/30"
              />
              <div>
                <h1 className="text-white font-bold text-sm leading-tight">TRIPPLE EARN</h1>
                <p className="text-white/70 text-xs tracking-widest uppercase">Payment Status</p>
              </div>
            </div>
          </div>

          <div className="p-7 flex flex-col items-center text-center">
            {isPending ? (
              <>
                <div className="w-16 h-16 rounded-full flex items-center justify-center mb-5 bg-primary/10 border-2 border-primary/20">
                  <div className="w-9 h-9 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                </div>
                <h2 className="text-foreground font-bold text-lg mb-2">Awaiting Payment</h2>
                <p className="text-muted-foreground text-sm leading-relaxed mb-4">{message}</p>
                <p className="text-primary text-xs font-semibold">
                  {MAX_WAIT - elapsed}s remaining
                </p>
                <div className="w-full h-1.5 rounded-full mt-4 overflow-hidden bg-muted">
                  <div
                    className="h-full rounded-full transition-all duration-1000 bg-gradient-to-r from-primary to-secondary"
                    style={{ width: `${Math.min((elapsed / MAX_WAIT) * 100, 100)}%` }}
                  />
                </div>
              </>

            ) : isSuccess ? (
              <>
                <div className="w-16 h-16 rounded-full flex items-center justify-center mb-5 bg-emerald-100 border-2 border-emerald-200">
                  <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                </div>
                <h2 className="font-bold text-lg mb-2 text-emerald-600">Payment Successful</h2>
                <p className="text-muted-foreground text-sm leading-relaxed mb-6">{message}</p>
                <div className="w-full h-px mb-5 bg-border" />
                <button
                  onClick={() => navigate("/dashboard")}
                  className="w-full py-3.5 rounded-xl font-bold text-sm text-primary-foreground bg-primary hover:bg-primary/90 transition-all shadow-sm"
                >
                  Go to Dashboard
                </button>
              </>

            ) : (
              <>
                <div className="w-16 h-16 rounded-full flex items-center justify-center mb-5 bg-destructive/10 border-2 border-destructive/20">
                  <XCircle className="w-8 h-8 text-destructive" />
                </div>
                <h2 className="font-bold text-lg mb-2 text-destructive">Payment Failed</h2>
                <p className="text-muted-foreground text-sm leading-relaxed mb-6">{message}</p>
                <div className="w-full h-px mb-5 bg-border" />
                <button
                  onClick={() => navigate(backPath)}
                  className="w-full py-3.5 rounded-xl font-bold text-sm text-primary-foreground bg-primary hover:bg-primary/90 transition-all shadow-sm"
                >
                  Try Again
                </button>
              </>
            )}

            <button
              onClick={() => navigate("/dashboard")}
              className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
