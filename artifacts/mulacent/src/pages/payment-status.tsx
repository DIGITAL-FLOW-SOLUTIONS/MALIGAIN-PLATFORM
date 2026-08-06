import { useCallback, useEffect, useState, useRef } from "react";
import { useLocation, useSearch } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { getGetCurrentUserQueryKey } from "@workspace/api-client-react";
import {
  ArrowLeft,
  Bug,
  CheckCircle2,
  ClipboardCopy,
  Eye,
  Radio,
  X,
  XCircle,
} from "lucide-react";

type PaymentState = "pending" | "completed" | "failed" | "timeout";

interface DebugEvent {
  at: string;
  label: string;
  details?: string;
}

function debugValue(value: unknown): string {
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export default function PaymentStatus() {
  const search = useSearch();
  const params = new URLSearchParams(search);
  const txnId = params.get("txn_id") ?? "";
  const checkoutId = params.get("checkout_id") ?? "";
  const type = params.get("type") ?? "payment";
  const provider = params.get("provider") ?? "payhero";
  const reference = params.get("reference") ?? "";
  const orderId = params.get("order_id") ?? "";
  const service = params.get("service") ?? "1";

  const [status, setStatus] = useState<PaymentState>("pending");
  const [message, setMessage] = useState(
    provider === "soleaspay"
      ? "Waiting for your Cameroon mobile-money confirmation..."
      : "Waiting for your M-Pesa confirmation...",
  );
  const [elapsed, setElapsed] = useState(0);
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [debugOpen, setDebugOpen] = useState(false);
  const [debugEvents, setDebugEvents] = useState<DebugEvent[]>([]);
  const [debugCopied, setDebugCopied] = useState(false);

  const MAX_WAIT = 90;

  const isHashbackDebug = provider === "hashback";

  const logDebug = useCallback((label: string, details?: unknown) => {
    if (!isHashbackDebug) return;
    setDebugEvents((previous) => [
      ...previous,
      {
        at: new Date().toISOString(),
        label,
        details: details === undefined ? undefined : debugValue(details).slice(0, 4000),
      },
    ].slice(-80));
  }, [isHashbackDebug]);

  const poll = useCallback(async () => {
    const endpoint = provider === "soleaspay"
      ? `${import.meta.env.BASE_URL}api/soleaspay/status?order_id=${encodeURIComponent(orderId)}&service=${encodeURIComponent(service)}`
      : provider === "hashback"
      ? `${import.meta.env.BASE_URL}api/hashback/status?reference=${encodeURIComponent(reference)}`
      : `${import.meta.env.BASE_URL}api/mpesa/status?${
          txnId
            ? `txn_id=${encodeURIComponent(txnId)}`
            : `checkout_id=${encodeURIComponent(checkoutId)}`
        }`;

    if (isHashbackDebug) {
      logDebug("Polling status endpoint", endpoint);
    }

    try {
      const res = await fetch(endpoint, {
        credentials: "include",
      });
      const rawBody = await res.text();
      let data: { status?: string; amount?: number; [key: string]: unknown } = {};
      try {
        data = JSON.parse(rawBody) as typeof data;
      } catch {
        // Keep the raw response in the debug log below.
      }

      if (isHashbackDebug) {
        logDebug(`Status response HTTP ${res.status}`, rawBody || "(empty response)");
      }

      if (!res.ok) {
        if (isHashbackDebug && res.status === 401) {
          logDebug("Status request was unauthorized", "The session cookie was not accepted by the API.");
        }
        return;
      }

      if (data.status === "completed") {
        if (isHashbackDebug) logDebug("Payment status became completed", data);
        setStatus("completed");
        setMessage("Your payment was received successfully!");
        if (pollRef.current) clearInterval(pollRef.current);
        if (intervalRef.current) clearInterval(intervalRef.current);
        if (type === "activate") {
          const meRes = await fetch(`${import.meta.env.BASE_URL}api/auth/me`, {
            credentials: "include",
          });
          const meBody = await meRes.text();
          if (isHashbackDebug) logDebug(`Auth refresh HTTP ${meRes.status}`, meBody || "(empty response)");
          if (meRes.ok) {
            const user = JSON.parse(meBody);
            queryClient.setQueryData(getGetCurrentUserQueryKey(), user);
          }
        }
      } else if (data.status === "failed") {
        if (isHashbackDebug) {
          logDebug("Payment status became failed", data);
          setDebugOpen(true);
        }
        setStatus("failed");
        setMessage("The payment was not completed. Please try again.");
        if (pollRef.current) clearInterval(pollRef.current);
        if (intervalRef.current) clearInterval(intervalRef.current);
      } else if (isHashbackDebug) {
        logDebug("Payment is still pending", data);
      }
    } catch (error) {
      if (isHashbackDebug) logDebug("Status polling threw an error", error instanceof Error ? error.message : error);
    }
  }, [
    checkoutId,
    isHashbackDebug,
    logDebug,
    orderId,
    provider,
    queryClient,
    reference,
    service,
    txnId,
    type,
  ]);

  useEffect(() => {
    if (isHashbackDebug) {
      const callbackParams = Object.fromEntries(new URLSearchParams(window.location.search).entries());
      logDebug("Hashback diagnostics started", {
        href: window.location.href,
        pathname: window.location.pathname,
        search: window.location.search,
        callbackParams,
        type,
        provider,
        reference,
        userAgent: navigator.userAgent,
      });
    }

    if (
      provider === "soleaspay"
        ? !orderId
        : provider === "hashback"
          ? !reference
          : !txnId && !checkoutId
    ) {
      if (isHashbackDebug) {
        logDebug("Payment reference validation failed", {
          type,
          provider,
          reference,
          orderId,
          txnId,
          checkoutId,
        });
        setDebugOpen(true);
      }
      setStatus("failed");
      setMessage("Invalid payment reference. Please try again.");
      return;
    }

    if (isHashbackDebug) {
      logDebug("Payment reference accepted", { reference, type, provider });
    }

    intervalRef.current = setInterval(() => {
      setElapsed((e) => {
        if (e + 1 >= MAX_WAIT) {
          if (pollRef.current) clearInterval(pollRef.current);
          if (intervalRef.current) clearInterval(intervalRef.current);
          if (isHashbackDebug) {
            logDebug("Polling timed out", { maxWaitSeconds: MAX_WAIT, reference });
            setDebugOpen(true);
          }
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
  }, [
    checkoutId,
    isHashbackDebug,
    logDebug,
    orderId,
    poll,
    provider,
    reference,
    service,
    txnId,
    type,
  ]);

  useEffect(() => {
    if (!isHashbackDebug) return;

    const onMessage = (event: MessageEvent) => {
      logDebug("Browser postMessage received", {
        origin: event.origin,
        data: event.data,
      });
    };
    const onVisibilityChange = () => {
      logDebug("Browser visibility changed", document.visibilityState);
    };
    const onWindowFocus = () => logDebug("Browser window focused");
    const onWindowBlur = () => logDebug("Browser window blurred");
    const onLocationChange = () => {
      logDebug("Browser callback URL changed", {
        href: window.location.href,
        search: window.location.search,
      });
    };

    window.addEventListener("message", onMessage);
    window.addEventListener("focus", onWindowFocus);
    window.addEventListener("blur", onWindowBlur);
    window.addEventListener("popstate", onLocationChange);
    window.addEventListener("hashchange", onLocationChange);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.removeEventListener("message", onMessage);
      window.removeEventListener("focus", onWindowFocus);
      window.removeEventListener("blur", onWindowBlur);
      window.removeEventListener("popstate", onLocationChange);
      window.removeEventListener("hashchange", onLocationChange);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [isHashbackDebug, logDebug]);

  const copyDebugLog = async () => {
    const report = [
      `URL: ${window.location.href}`,
      `Provider: ${provider}`,
      `Type: ${type}`,
      `Reference: ${reference}`,
      "",
      ...debugEvents.map((event) =>
        `[${event.at}] ${event.label}${event.details ? `\n${event.details}` : ""}`,
      ),
    ].join("\n");
    try {
      await navigator.clipboard.writeText(report);
      setDebugCopied(true);
      window.setTimeout(() => setDebugCopied(false), 2000);
    } catch {
      logDebug("Could not copy diagnostics", "Clipboard permission was unavailable.");
    }
  };

  const backPath =
    type === "activate"
      ? "/activate"
      : type === "pay-client"
      ? "/pay-client"
      : type === "investment"
      ? "/investments/current"
      : type === "spin"
      ? "/spin-bet"
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
                alt="MALIGAIN"
                className="w-10 h-10 rounded-xl object-contain border-2 border-white/30"
              />
              <div>
                <h1 className="text-white font-bold text-sm leading-tight">MALIGAIN</h1>
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

            {isHashbackDebug && (
              <button
                type="button"
                onClick={() => setDebugOpen(true)}
                className="mt-5 inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-amber-800 hover:bg-amber-100"
              >
                <Bug className="h-3.5 w-3.5" />
                Debug callback {debugEvents.length > 0 ? `(${debugEvents.length})` : ""}
              </button>
            )}
          </div>
        </div>
      </div>

      {isHashbackDebug && debugOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/70 p-3 sm:p-6">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="hashback-debug-title"
            className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-amber-300 bg-background text-left shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4 border-b border-border bg-amber-50 px-4 py-3 dark:bg-amber-950/40">
              <div>
                <div className="flex items-center gap-2">
                  <Bug className="h-4 w-4 text-amber-700 dark:text-amber-300" />
                  <h2 id="hashback-debug-title" className="text-sm font-bold text-amber-900 dark:text-amber-100">
                    Temporary Hashback callback debug
                  </h2>
                </div>
                <p className="mt-1 text-[11px] text-amber-800/80 dark:text-amber-200/80">
                  This diagnostic panel is temporary and can be removed after the callback issue is resolved.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDebugOpen(false)}
                aria-label="Close debug dialog"
                className="rounded-lg p-1 text-amber-800 hover:bg-amber-100 dark:text-amber-200 dark:hover:bg-amber-900/50"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid gap-2 border-b border-border bg-muted/30 px-4 py-3 text-[11px]">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Radio className="h-3.5 w-3.5 text-amber-600" />
                <span className="font-semibold text-foreground">Live listeners:</span>
                postMessage, focus/blur, visibility, URL changes, status polling
              </div>
              <div className="flex items-start gap-2">
                <Eye className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <code className="break-all text-muted-foreground">{window.location.href}</code>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              {debugEvents.length === 0 ? (
                <p className="py-8 text-center text-xs text-muted-foreground">Waiting for diagnostic events…</p>
              ) : (
                <div className="space-y-3">
                  {debugEvents.map((event, index) => (
                    <div key={`${event.at}-${index}`} className="rounded-xl border border-border bg-card p-3">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-xs font-bold text-foreground">{event.label}</p>
                        <time className="shrink-0 text-[10px] text-muted-foreground">
                          {new Date(event.at).toLocaleTimeString()}
                        </time>
                      </div>
                      {event.details && (
                        <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-muted/60 p-2 text-[10px] leading-relaxed text-muted-foreground">
                          {event.details}
                        </pre>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-border bg-muted/30 px-4 py-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setDebugEvents([])}
                className="rounded-xl border border-border px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-muted"
              >
                Clear log
              </button>
              <button
                type="button"
                onClick={copyDebugLog}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90"
              >
                <ClipboardCopy className="h-3.5 w-3.5" />
                {debugCopied ? "Copied" : "Copy diagnostics"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
