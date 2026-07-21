import { useState, useEffect, useCallback } from "react";

interface CountdownTime {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  expired: boolean;
}

function getCountdown(launchDate: string): CountdownTime {
  const diff = Math.max(0, new Date(launchDate).getTime() - Date.now());
  if (diff === 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
  return {
    days: Math.floor(diff / 86_400_000),
    hours: Math.floor((diff % 86_400_000) / 3_600_000),
    minutes: Math.floor((diff % 3_600_000) / 60_000),
    seconds: Math.floor((diff % 60_000) / 1_000),
    expired: false,
  };
}

function formatLaunchDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return "";
  }
}

function formatLaunchTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      timeZoneName: "short",
    });
  } catch {
    return "";
  }
}

function CountdownUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center gap-2.5">
      <div
        className="relative flex items-center justify-center rounded-2xl"
        style={{
          width: 72,
          height: 72,
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(220,38,38,0.3)",
          boxShadow: "0 0 24px rgba(220,38,38,0.10), inset 0 1px 0 rgba(255,255,255,0.06)",
        }}
      >
        <span
          className="tabular-nums font-black text-white"
          style={{ fontSize: 34, lineHeight: 1, letterSpacing: "-0.02em" }}
        >
          {String(value).padStart(2, "0")}
        </span>
      </div>
      <span
        className="font-bold uppercase text-red-400/70"
        style={{ fontSize: 9, letterSpacing: "0.22em" }}
      >
        {label}
      </span>
    </div>
  );
}

interface LaunchingPageProps {
  launchDate: string;
  /** Called when the countdown expires so the parent can re-check status */
  onExpired?: () => void;
}

export default function LaunchingPage({ launchDate, onExpired }: LaunchingPageProps) {
  const [countdown, setCountdown] = useState<CountdownTime>(() => getCountdown(launchDate));

  const tick = useCallback(() => {
    const next = getCountdown(launchDate);
    setCountdown(next);
    if (next.expired) onExpired?.();
  }, [launchDate, onExpired]);

  useEffect(() => {
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [tick]);

  return (
    <div
      className="min-h-screen w-full flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden"
      style={{ background: "radial-gradient(ellipse 120% 80% at 50% 0%, #1a0310 0%, #0a000f 50%, #040008 100%)" }}
    >
      {/* Ambient glow layers */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 60% 40% at 50% 5%, rgba(220,38,38,0.12) 0%, transparent 70%)",
        }}
      />
      <div
        className="pointer-events-none absolute bottom-0 left-0 right-0"
        style={{
          height: "40%",
          background:
            "radial-gradient(ellipse 80% 60% at 50% 100%, rgba(139,0,30,0.08) 0%, transparent 70%)",
        }}
      />

      {/* Decorative top border */}
      <div
        className="absolute top-0 left-0 right-0"
        style={{
          height: 2,
          background: "linear-gradient(90deg, transparent 0%, #dc2626 30%, #ef4444 50%, #dc2626 70%, transparent 100%)",
          opacity: 0.6,
        }}
      />

      <div className="relative z-10 flex flex-col items-center w-full max-w-sm mx-auto text-center">

        {/* Logo mark */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <div
            className="flex items-center justify-center rounded-2xl"
            style={{
              width: 64,
              height: 64,
              background: "linear-gradient(135deg, #991b1b 0%, #7f1d1d 100%)",
              boxShadow: "0 0 40px rgba(220,38,38,0.35), 0 4px 24px rgba(0,0,0,0.5)",
              border: "1px solid rgba(220,38,38,0.4)",
            }}
          >
            <span className="text-white font-black text-3xl" style={{ letterSpacing: "-0.02em" }}>M</span>
          </div>

          <div>
            <h1
              className="text-white font-black tracking-widest"
              style={{ fontSize: 28, letterSpacing: "0.18em" }}
            >
              MALIGAIN
            </h1>
            <p className="text-red-400/70 font-medium mt-0.5" style={{ fontSize: 11, letterSpacing: "0.12em" }}>
              DIGITAL AGENCY PLATFORM
            </p>
          </div>
        </div>

        {/* Badge */}
        <div
          className="mb-8 inline-flex items-center gap-2 px-4 py-1.5 rounded-full"
          style={{
            background: "rgba(220,38,38,0.12)",
            border: "1px solid rgba(220,38,38,0.3)",
          }}
        >
          <span
            className="inline-block w-1.5 h-1.5 rounded-full bg-red-500"
            style={{ animation: "pulse 1.5s ease-in-out infinite" }}
          />
          <span className="text-red-400 font-semibold uppercase" style={{ fontSize: 10, letterSpacing: "0.2em" }}>
            {countdown.expired ? "Launching Now" : "Launching Soon"}
          </span>
        </div>

        {/* Countdown */}
        {!countdown.expired ? (
          <>
            <p
              className="text-white/40 font-semibold uppercase mb-5"
              style={{ fontSize: 10, letterSpacing: "0.25em" }}
            >
              Launching In
            </p>

            <div className="flex items-end gap-3 sm:gap-4 mb-8">
              {countdown.days > 0 && (
                <>
                  <CountdownUnit value={countdown.days} label="Days" />
                  <span className="text-red-500/50 font-black mb-8" style={{ fontSize: 22 }}>:</span>
                </>
              )}
              <CountdownUnit value={countdown.hours} label="Hours" />
              <span className="text-red-500/50 font-black mb-8" style={{ fontSize: 22 }}>:</span>
              <CountdownUnit value={countdown.minutes} label="Minutes" />
              <span className="text-red-500/50 font-black mb-8" style={{ fontSize: 22 }}>:</span>
              <CountdownUnit value={countdown.seconds} label="Seconds" />
            </div>
          </>
        ) : (
          <div className="mb-8">
            <p className="text-white text-lg font-bold">🎉 We are live!</p>
            <p className="text-white/50 text-sm mt-1">Loading platform...</p>
          </div>
        )}

        {/* Launch date */}
        <div
          className="w-full rounded-2xl px-5 py-4 mb-8"
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          <p className="text-white/40 text-xs uppercase font-semibold mb-1" style={{ letterSpacing: "0.15em" }}>
            Launch Date
          </p>
          <p className="text-white font-bold" style={{ fontSize: 15 }}>
            {formatLaunchDate(launchDate)}
          </p>
          <p className="text-red-400/80 font-medium mt-0.5" style={{ fontSize: 13 }}>
            {formatLaunchTime(launchDate)}
          </p>
        </div>

        {/* Tagline */}
        <p className="text-white/25 text-sm leading-relaxed px-4">
          Something big is coming. Get ready to earn, grow, and win with your team.
        </p>

      </div>

      {/* Bottom decorative line */}
      <div
        className="absolute bottom-0 left-0 right-0"
        style={{
          height: 1,
          background: "linear-gradient(90deg, transparent 0%, rgba(220,38,38,0.3) 50%, transparent 100%)",
        }}
      />

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}
