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
      weekday: "long", year: "numeric", month: "long", day: "numeric",
    });
  } catch { return ""; }
}

function formatLaunchTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString(undefined, {
      hour: "2-digit", minute: "2-digit", timeZoneName: "short",
    });
  } catch { return ""; }
}

// ── Palette (WealthEarn blue/purple) ────────────────────────────────────────
const P = {
  blue:       "#5b8dee",
  blueDark:   "#2563eb",
  blueDeep:   "#1d4ed8",
  purple:     "#8b6ff5",
  purpleDark: "#6d28d9",
  indigo:     "#6366f1",
  indigoDark: "#4338ca",
} as const;

// Background gradient matches WealthEarn's deep purple-to-blue left panel
const BG = `linear-gradient(145deg, #1e1650 0%, #2d2096 25%, #1e3a8a 60%, #1e40af 100%)`;

// Topographic contour lines (SVG pattern baked in)
const TOPO_SVG = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='600'%3E%3Cg fill='none' stroke='rgba(255,255,255,0.06)' stroke-width='1'%3E%3Cellipse cx='300' cy='300' rx='280' ry='140'/%3E%3Cellipse cx='300' cy='300' rx='240' ry='110'/%3E%3Cellipse cx='300' cy='300' rx='200' ry='82'/%3E%3Cellipse cx='300' cy='300' rx='160' ry='56'/%3E%3Cellipse cx='300' cy='300' rx='120' ry='34'/%3E%3Cellipse cx='300' cy='300' rx='80' ry='16'/%3E%3Cellipse cx='140' cy='460' rx='200' ry='100'/%3E%3Cellipse cx='140' cy='460' rx='160' ry='74'/%3E%3Cellipse cx='140' cy='460' rx='120' ry='50'/%3E%3Cellipse cx='460' cy='140' rx='220' ry='110'/%3E%3Cellipse cx='460' cy='140' rx='180' ry='82'/%3E%3Cellipse cx='460' cy='140' rx='140' ry='58'/%3E%3C/g%3E%3C/svg%3E")`;

function CountdownUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="relative flex items-center justify-center rounded-2xl"
        style={{
          width: 72,
          height: 72,
          background: "rgba(255,255,255,0.12)",
          border: "1px solid rgba(255,255,255,0.25)",
          boxShadow: `0 0 24px ${P.blue}33, inset 0 1px 0 rgba(255,255,255,0.15)`,
          backdropFilter: "blur(8px)",
        }}
      >
        <span className="tabular-nums font-black text-white" style={{ fontSize: 34, lineHeight: 1, letterSpacing: "-0.02em" }}>
          {String(value).padStart(2, "0")}
        </span>
      </div>
      <span className="font-bold uppercase text-blue-200/70" style={{ fontSize: 9, letterSpacing: "0.22em" }}>
        {label}
      </span>
    </div>
  );
}

interface LaunchingPageProps {
  launchDate: string;
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
      className="min-h-screen w-full flex flex-col items-center justify-start px-4 py-10 relative overflow-x-hidden"
      style={{ background: BG }}
    >
      {/* Topographic lines */}
      <div
        className="pointer-events-none absolute inset-0 opacity-100"
        style={{ backgroundImage: TOPO_SVG, backgroundSize: "600px 600px", backgroundPosition: "center" }}
      />

      {/* Blue radial glow — top */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: `radial-gradient(ellipse 70% 45% at 50% 0%, ${P.blue}22 0%, transparent 70%)` }}
      />
      {/* Purple radial glow — bottom */}
      <div
        className="pointer-events-none absolute bottom-0 left-0 right-0"
        style={{ height: "45%", background: `radial-gradient(ellipse 80% 60% at 50% 100%, ${P.purpleDark}18 0%, transparent 70%)` }}
      />

      {/* Top border stripe */}
      <div
        className="absolute top-0 left-0 right-0"
        style={{
          height: 2,
          background: `linear-gradient(90deg, transparent 0%, ${P.blue} 30%, #a5b4fc 50%, ${P.blue} 70%, transparent 100%)`,
          opacity: 0.7,
        }}
      />

      <div className="relative z-10 flex flex-col items-center w-full max-w-sm mx-auto text-center">

        {/* ── Logo ─────────────────────────────────────────────────────── */}
        <div className="mb-7 flex flex-col items-center gap-3">
          <div
            className="flex items-center justify-center rounded-2xl overflow-hidden"
            style={{
              width: 76,
              height: 76,
              boxShadow: `0 0 40px ${P.blue}55, 0 4px 24px rgba(0,0,0,0.4)`,
              border: `1px solid rgba(255,255,255,0.25)`,
            }}
          >
            <img
              src="/images/logo.png"
              alt="MALIGAIN"
              style={{ width: 76, height: 76, objectFit: "cover" }}
            />
          </div>

          <div>
            <h1 className="text-white font-black tracking-widest" style={{ fontSize: 28, letterSpacing: "0.18em" }}>
              MALIGAIN
            </h1>
            <p className="text-blue-200/70 font-medium mt-0.5" style={{ fontSize: 11, letterSpacing: "0.12em" }}>
              DIGITAL AGENCY PLATFORM
            </p>
          </div>
        </div>

        {/* ── Status badge ─────────────────────────────────────────────── */}
        <div
          className="mb-7 inline-flex items-center gap-2 px-4 py-1.5 rounded-full"
          style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.25)", backdropFilter: "blur(8px)" }}
        >
          <span
            className="inline-block w-1.5 h-1.5 rounded-full"
            style={{ background: P.blue, animation: "pulse-dot 1.5s ease-in-out infinite" }}
          />
          <span className="text-blue-100 font-semibold uppercase" style={{ fontSize: 10, letterSpacing: "0.2em" }}>
            {countdown.expired ? "Launching Now" : "Launching Soon"}
          </span>
        </div>

        {/* ── Countdown ────────────────────────────────────────────────── */}
        {!countdown.expired ? (
          <>
            <p className="text-blue-200/50 font-semibold uppercase mb-5" style={{ fontSize: 10, letterSpacing: "0.25em" }}>
              Launching In
            </p>
            <div className="flex items-end gap-3 sm:gap-4 mb-7">
              {countdown.days > 0 && (
                <>
                  <CountdownUnit value={countdown.days} label="Days" />
                  <span className="text-blue-300/50 font-black mb-8" style={{ fontSize: 22 }}>:</span>
                </>
              )}
              <CountdownUnit value={countdown.hours} label="Hours" />
              <span className="text-blue-300/50 font-black mb-8" style={{ fontSize: 22 }}>:</span>
              <CountdownUnit value={countdown.minutes} label="Minutes" />
              <span className="text-blue-300/50 font-black mb-8" style={{ fontSize: 22 }}>:</span>
              <CountdownUnit value={countdown.seconds} label="Seconds" />
            </div>
          </>
        ) : (
          <div className="mb-7">
            <p className="text-white text-lg font-bold">🎉 We are live!</p>
            <p className="text-blue-200/60 text-sm mt-1">Loading platform...</p>
          </div>
        )}

        {/* ── Launch date card ──────────────────────────────────────────── */}
        <div
          className="w-full rounded-2xl px-5 py-4 mb-7"
          style={{ background: "rgba(255,255,255,0.10)", border: "1px solid rgba(255,255,255,0.20)", backdropFilter: "blur(8px)" }}
        >
          <p className="text-blue-200/50 text-xs uppercase font-semibold mb-1" style={{ letterSpacing: "0.15em" }}>
            Launch Date
          </p>
          <p className="text-white font-bold" style={{ fontSize: 15 }}>{formatLaunchDate(launchDate)}</p>
          <p className="text-blue-300/80 font-medium mt-0.5" style={{ fontSize: 13 }}>{formatLaunchTime(launchDate)}</p>
        </div>

        {/* ── Tagline ──────────────────────────────────────────────────── */}
        <p className="text-blue-100/50 text-sm leading-relaxed px-4 mb-10">
          Something big is coming. Get ready to earn, grow, and win with your team.
        </p>

        {/* ══ WAYS TO EARN ═══════════════════════════════════════════════ */}
        <div className="w-full mb-8">
          {/* Section header */}
          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.25))" }} />
            <div
              className="flex items-center gap-2 px-4 py-1.5 rounded-full"
              style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.22)", backdropFilter: "blur(8px)" }}
            >
              <span className="text-sm">✅</span>
              <span className="text-blue-100 font-bold uppercase" style={{ fontSize: 10, letterSpacing: "0.18em" }}>
                Ways to Earn
              </span>
            </div>
            <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, rgba(255,255,255,0.25), transparent)" }} />
          </div>

          <p className="text-blue-200/60 text-xs text-center mb-5" style={{ letterSpacing: "0.04em" }}>
            📌 Your trusted platform to earn money online — anytime, anywhere!
          </p>

          {/* Earning methods */}
          <div
            className="w-full rounded-2xl p-4 mb-5"
            style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", backdropFilter: "blur(8px)" }}
          >
            <p className="text-blue-200/50 text-xs uppercase font-semibold mb-4 text-center" style={{ letterSpacing: "0.16em" }}>
              With an active account, earn daily through:
            </p>
            <div className="grid grid-cols-1 gap-2.5">
              {[
                { icon: "🎁", label: "Welcome Bonus",               sub: "Receive a bonus upon joining" },
                { icon: "💬", label: "Chat with Lonely Foreigners", sub: "Earn while you chat" },
                { icon: "💰", label: "Invest Money",                sub: "Grow your capital" },
                { icon: "▶️", label: "Watch YouTube Videos",        sub: "Earn per video watched" },
                { icon: "🎵", label: "Watch TikTok Videos",         sub: "Get paid to scroll" },
                { icon: "♟️", label: "Play Games",                  sub: "Chess & Draughts" },
                { icon: "📢", label: "Click Ads",                   sub: "Simple clicks, real earnings" },
                { icon: "❓", label: "Trivia Questions",            sub: "Answer & earn" },
                { icon: "🎰", label: "Spinning",                    sub: "Try your luck daily" },
              ].map(({ icon, label, sub }) => (
                <div
                  key={label}
                  className="flex items-center gap-3 rounded-xl px-3.5 py-2.5"
                  style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.14)" }}
                >
                  <span className="text-xl flex-shrink-0 w-8 text-center">{icon}</span>
                  <div className="text-left">
                    <p className="text-white font-semibold text-sm leading-tight">{label}</p>
                    <p className="text-blue-200/50 text-xs mt-0.5">{sub}</p>
                  </div>
                  <span className="ml-auto text-yellow-300/70 text-xs font-bold">💸</span>
                </div>
              ))}
            </div>
          </div>

          {/* Team Earnings */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.2))" }} />
            <span className="text-blue-100/60 font-bold uppercase" style={{ fontSize: 10, letterSpacing: "0.18em" }}>🎮 Team Earnings</span>
            <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, rgba(255,255,255,0.2), transparent)" }} />
          </div>

          <div className="grid grid-cols-3 gap-3 mb-2">
            {[
              { level: "L1", desc: "Direct referrals",   alpha: "0.28" },
              { level: "L2", desc: "2nd generation",     alpha: "0.18" },
              { level: "L3", desc: "3rd generation",     alpha: "0.10" },
            ].map(({ level, desc, alpha }) => (
              <div
                key={level}
                className="flex flex-col items-center justify-center rounded-2xl py-4 px-2"
                style={{
                  background: `rgba(255,255,255,${alpha})`,
                  border: "1px solid rgba(255,255,255,0.22)",
                  backdropFilter: "blur(8px)",
                }}
              >
                <span className="text-white font-black mb-1" style={{ fontSize: 22, letterSpacing: "-0.01em" }}>
                  {level}
                </span>
                <span className="text-blue-200/60 text-center" style={{ fontSize: 9, letterSpacing: "0.06em" }}>
                  {desc}
                </span>
              </div>
            ))}
          </div>
          <p className="text-blue-200/35 text-xs text-center mt-1">
            Earn from every level your team builds below you
          </p>
        </div>

        {/* ══ BENEFITS ═══════════════════════════════════════════════════ */}
        <div className="w-full mb-4">
          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.25))" }} />
            <div
              className="flex items-center gap-2 px-4 py-1.5 rounded-full"
              style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.22)", backdropFilter: "blur(8px)" }}
            >
              <span className="text-sm">⭐</span>
              <span className="text-blue-100 font-bold uppercase" style={{ fontSize: 10, letterSpacing: "0.18em" }}>
                Benefits
              </span>
            </div>
            <div className="flex-1 h-px" style={{ background: "linear-gradient(90deg, rgba(255,255,255,0.25), transparent)" }} />
          </div>

          <div
            className="w-full rounded-2xl p-4"
            style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", backdropFilter: "blur(8px)" }}
          >
            <div className="grid grid-cols-1 gap-3">
              {[
                { icon: "🔹", label: "Weekly Agent Bonus",        sub: "Rewarded every week for top performance" },
                { icon: "📱", label: "Automatic Activations",     sub: "Seamless onboarding, no manual steps" },
                { icon: "🎧", label: "Customer Care 24/7",        sub: "We're always here for you" },
                { icon: "💸", label: "Instant Withdrawals",       sub: "Get your money fast, any time" },
              ].map(({ icon, label, sub }) => (
                <div
                  key={label}
                  className="flex items-center gap-3 rounded-xl px-3.5 py-3"
                  style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.14)" }}
                >
                  <span className="text-xl flex-shrink-0 w-8 text-center">{icon}</span>
                  <div className="text-left">
                    <p className="text-white font-semibold text-sm leading-tight">{label}</p>
                    <p className="text-blue-200/50 text-xs mt-0.5">{sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-blue-200/25 text-xs text-center mt-4 mb-2 px-4">
          Join MALIGAIN today and start your earning journey 🚀
        </p>

      </div>

      {/* Bottom border stripe */}
      <div
        className="absolute bottom-0 left-0 right-0"
        style={{ height: 1, background: `linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.2) 50%, transparent 100%)` }}
      />

      <style>{`
        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.4; transform: scale(0.8); }
        }
      `}</style>
    </div>
  );
}
