import { useEffect, useState, useRef } from "react";
import { useLocation, useSearch } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { getGetCurrentUserQueryKey } from "@workspace/api-client-react";

type PaymentState = "pending" | "completed" | "failed" | "timeout";

export default function PaymentStatus() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const txnId = params.get("txn_id") ?? "";
  const checkoutId = params.get("checkout_id") ?? "";
  const type = params.get("type") ?? "payment";

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
      const qs = txnId
        ? `txn_id=${encodeURIComponent(txnId)}`
        : `checkout_id=${encodeURIComponent(checkoutId)}`;
      const res = await fetch(`${import.meta.env.BASE_URL}api/mpesa/status?${qs}`, {
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
    if (!txnId && !checkoutId) {
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
    <div
      className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
      style={{ background: "#0d0518" }}
    >
      <div className="absolute inset-0 z-0">
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at 30% 40%, rgba(120,0,200,0.25) 0%, transparent 55%), radial-gradient(ellipse at 70% 70%, rgba(180,0,120,0.15) 0%, transparent 50%)",
          }}
        />
        {[...Array(24)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              width: Math.random() * 3 + 1 + "px",
              height: Math.random() * 3 + 1 + "px",
              background:
                i % 4 === 0
                  ? "#f5c518"
                  : i % 4 === 1
                  ? "#c800e0"
                  : i % 4 === 2
                  ? "#ffffff"
                  : "#e040fb",
              opacity: Math.random() * 0.6 + 0.15,
              left: Math.random() * 100 + "%",
              top: Math.random() * 100 + "%",
            }}
          />
        ))}
      </div>

      <div className="w-full max-w-sm z-10">
        <div
          className="rounded-2xl p-7 border shadow-2xl backdrop-blur-sm"
          style={{
            background: "rgba(20, 10, 35, 0.92)",
            borderColor: "rgba(180,0,200,0.2)",
          }}
        >
          <div className="flex items-center gap-3 mb-6">
            <img
              src={`${import.meta.env.BASE_URL}images/logo.png`}
              alt="Logo"
              className="w-10 h-10 rounded-full object-cover border-2 border-purple-500/40"
            />
            <div>
              <h1 className="text-white font-bold text-sm leading-tight">MALIGAIN</h1>
              <p className="text-xs tracking-widest uppercase" style={{ color: "rgba(200,0,224,0.8)" }}>
                Payment Status
              </p>
            </div>
          </div>

          <div className="flex flex-col items-center py-6 text-center">
            {isPending ? (
              <>
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center mb-5"
                  style={{ background: "rgba(180,0,200,0.15)", border: "2px solid rgba(180,0,200,0.3)" }}
                >
                  <div
                    className="w-9 h-9 border-4 rounded-full animate-spin"
                    style={{ borderColor: "rgba(180,0,200,0.3)", borderTopColor: "#c800e0" }}
                  />
                </div>
                <h2 className="text-white font-bold text-lg mb-2">Awaiting Payment</h2>
                <p className="text-gray-400 text-sm leading-relaxed mb-4">{message}</p>
                <p className="text-xs" style={{ color: "rgba(180,0,200,0.7)" }}>
                  {MAX_WAIT - elapsed}s remaining
                </p>
                <div
                  className="w-full h-1 rounded-full mt-4 overflow-hidden"
                  style={{ background: "rgba(255,255,255,0.08)" }}
                >
                  <div
                    className="h-full rounded-full transition-all duration-1000"
                    style={{
                      width: `${Math.min((elapsed / MAX_WAIT) * 100, 100)}%`,
                      background: "linear-gradient(90deg, #c800e0, #ff6de0)",
                    }}
                  />
                </div>
              </>
            ) : isSuccess ? (
              <>
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center mb-5"
                  style={{ background: "rgba(16,185,129,0.15)", border: "2px solid rgba(16,185,129,0.4)" }}
                >
                  <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5">
                    <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <h2 className="font-bold text-lg mb-2" style={{ color: "#10b981" }}>
                  Payment Successful
                </h2>
                <p className="text-gray-400 text-sm leading-relaxed mb-6">{message}</p>
                <div className="w-full h-px mb-5" style={{ background: "rgba(255,255,255,0.07)" }} />
                <button
                  onClick={() => navigate("/dashboard")}
                  className="w-full py-3.5 rounded-xl font-bold text-sm text-white"
                  style={{ background: "linear-gradient(135deg, #10b981 0%, #059669 100%)" }}
                >
                  Go to Dashboard
                </button>
              </>
            ) : (
              <>
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center mb-5"
                  style={{ background: "rgba(239,68,68,0.12)", border: "2px solid rgba(239,68,68,0.35)" }}
                >
                  <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5">
                    <line x1="18" y1="6" x2="6" y2="18" strokeLinecap="round" />
                    <line x1="6" y1="6" x2="18" y2="18" strokeLinecap="round" />
                  </svg>
                </div>
                <h2 className="font-bold text-lg mb-2" style={{ color: "#ef4444" }}>
                  Payment Failed
                </h2>
                <p className="text-gray-400 text-sm leading-relaxed mb-6">{message}</p>
                <div className="w-full h-px mb-5" style={{ background: "rgba(255,255,255,0.07)" }} />
                <button
                  onClick={() => navigate(backPath)}
                  className="w-full py-3.5 rounded-xl font-bold text-sm text-white"
                  style={{ background: "linear-gradient(135deg, #c800e0 0%, #a000c0 100%)" }}
                >
                  Try Again
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
