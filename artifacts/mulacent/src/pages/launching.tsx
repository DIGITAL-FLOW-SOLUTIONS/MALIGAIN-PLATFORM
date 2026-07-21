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
        <p className="text-white/40 text-sm leading-relaxed px-4 mb-10">
          Something big is coming. Get ready to earn, grow, and win with your team.
        </p>

        {/* ── WAYS TO EARN ─────────────────────────────────────────────── */}
        <div className="w-full mb-8">
          {/* Section header */}
          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(220,38,38,0.4))" }} />
            <div
              className="flex items-center gap-2 px-4 py-1.5 rounded-full"
              style={{ background: "rgba(220,38,38,0.12)", border: "1px solid rgba(220,38,38,0.3)" }}
            >
              <span className="text-base">✅</span>
              <span className="text-red-400 font-bold uppercase" style={{ fontSize: 10, letterSpacing: "0.18em" }}>
                Ways to Earn
              </span>
            </div>
            <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, rgba(220,38,38,0.4), transparent)" }} />
          </div>

          {/* Platform tagline */}
          <p className="text-white/50 text-xs text-center mb-5" style={{ letterSpacing: "0.04em" }}>
            📌 Your trusted platform to earn money online — anytime, anywhere!
          </p>

          {/* Earning methods grid */}
          <div
            className="w-full rounded-2xl p-4 mb-5"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
          >
            <p className="text-white/30 text-xs uppercase font-semibold mb-4 text-center" style={{ letterSpacing: "0.16em" }}>
              With an active account, earn daily through:
            </p>
            <div className="grid grid-cols-1 gap-2.5">
              {[
                { icon: "🎁", label: "Welcome Bonus", sub: "Receive a bonus upon joining" },
                { icon: "💬", label: "Chat with Lonely Foreigners", sub: "Earn while you chat" },
                { icon: "💰", label: "Invest Money", sub: "Grow your capital" },
                { icon: "▶️", label: "Watch YouTube Videos", sub: "Earn per video watched" },
                { icon: "🎵", label: "Watch TikTok Videos", sub: "Get paid to scroll" },
                { icon: "♟️", label: "Play Games", sub: "Chess & Draughts" },
                { icon: "📢", label: "Click Ads", sub: "Simple clicks, real earnings" },
                { icon: "❓", label: "Trivia Questions", sub: "Answer & earn" },
                { icon: "🎰", label: "Spinning", sub: "Try your luck daily" },
              ].map(({ icon, label, sub }) => (
                <div
                  key={label}
                  className="flex items-center gap-3 rounded-xl px-3.5 py-2.5"
                  style={{
                    background: "rgba(220,38,38,0.06)",
                    border: "1px solid rgba(220,38,38,0.15)",
                  }}
                >
                  <span className="text-xl flex-shrink-0 w-8 text-center">{icon}</span>
                  <div className="text-left">
                    <p className="text-white font-semibold text-sm leading-tight">{label}</p>
                    <p className="text-white/40 text-xs mt-0.5">{sub}</p>
                  </div>
                  <span className="ml-auto text-red-500/50 text-xs font-bold">💸</span>
                </div>
              ))}
            </div>
          </div>

          {/* Team Earnings */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(220,38,38,0.3))" }} />
            <span className="text-white/50 font-bold uppercase" style={{ fontSize: 10, letterSpacing: "0.18em" }}>
              🎮 Team Earnings
            </span>
            <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, rgba(220,38,38,0.3), transparent)" }} />
          </div>

          <div className="grid grid-cols-3 gap-3 mb-2">
            {[
              { level: "L1", desc: "Direct referrals", color: "rgba(220,38,38,0.25)" },
              { level: "L2", desc: "2nd generation", color: "rgba(220,38,38,0.15)" },
              { level: "L3", desc: "3rd generation", color: "rgba(220,38,38,0.08)" },
            ].map(({ level, desc, color }) => (
              <div
                key={level}
                className="flex flex-col items-center justify-center rounded-2xl py-4 px-2"
                style={{
                  background: color,
                  border: "1px solid rgba(220,38,38,0.25)",
                  boxShadow: "0 0 16px rgba(220,38,38,0.08)",
                }}
              >
                <span
                  className="text-white font-black mb-1"
                  style={{ fontSize: 22, letterSpacing: "-0.01em" }}
                >
                  {level}
                </span>
                <span className="text-white/40 text-center" style={{ fontSize: 9, letterSpacing: "0.06em" }}>
                  {desc}
                </span>
              </div>
            ))}
          </div>
          <p className="text-white/25 text-xs text-center mt-1">
            Earn from every level your team builds below you
          </p>
        </div>

        {/* ── BENEFITS ─────────────────────────────────────────────────── */}
        <div className="w-full mb-4">
          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(220,38,38,0.4))" }} />
            <div
              className="flex items-center gap-2 px-4 py-1.5 rounded-full"
              style={{ background: "rgba(220,38,38,0.12)", border: "1px solid rgba(220,38,38,0.3)" }}
            >
              <span className="text-base">⭐</span>
              <span className="text-red-400 font-bold uppercase" style={{ fontSize: 10, letterSpacing: "0.18em" }}>
                Benefits
              </span>
            </div>
            <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, rgba(220,38,38,0.4), transparent)" }} />
          </div>

          <div
            className="w-full rounded-2xl p-4"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
          >
            <div className="grid grid-cols-1 gap-3">
              {[
                { icon: "🔹", label: "Weekly Agent Bonus", sub: "Rewarded every week for top performance" },
                { icon: "📱", label: "Automatic Activations", sub: "Seamless onboarding, no manual steps" },
                { icon: "🎧", label: "Customer Care Support 24/7", sub: "We're always here for you" },
                { icon: "💸", label: "Instant Withdrawals", sub: "Get your money fast, any time" },
              ].map(({ icon, label, sub }) => (
                <div
                  key={label}
                  className="flex items-center gap-3 rounded-xl px-3.5 py-3"
                  style={{
                    background: "linear-gradient(135deg, rgba(220,38,38,0.08) 0%, rgba(255,255,255,0.02) 100%)",
                    border: "1px solid rgba(220,38,38,0.15)",
                  }}
                >
                  <span className="text-xl flex-shrink-0 w-8 text-center">{icon}</span>
                  <div className="text-left">
                    <p className="text-white font-semibold text-sm leading-tight">{label}</p>
                    <p className="text-white/40 text-xs mt-0.5">{sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer note */}
        <p className="text-white/20 text-xs text-center mt-4 mb-2 px-4">
          Join MALIGAIN today and start your earning journey 🚀
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
