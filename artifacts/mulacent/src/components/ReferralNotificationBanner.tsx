import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { Users, X } from "lucide-react";

const THRESHOLD = 7;
const AUTO_DISMISS_MS = 7000;

interface Props {
  count: number;
}

export function ReferralNotificationBanner({ count }: Props) {
  const [visible, setVisible] = useState(false);
  const lastShownCount = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [, navigate] = useLocation();

  useEffect(() => {
    if (count >= THRESHOLD && count > lastShownCount.current) {
      lastShownCount.current = count;
      setVisible(true);

      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setVisible(false), AUTO_DISMISS_MS);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [count]);

  const dismiss = () => {
    setVisible(false);
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  if (!visible) return null;

  return (
    <div
      className="relative rounded-2xl overflow-hidden flex items-center gap-3 px-4 py-4 shadow-lg"
      style={{
        background: "linear-gradient(135deg, #f97316 0%, #ef4444 30%, #a855f7 65%, #22c55e 100%)",
      }}
    >
      <div className="absolute inset-0 opacity-20"
        style={{ background: "radial-gradient(ellipse at 30% 50%, #fff 0%, transparent 60%)" }} />

      <div className="relative z-10 flex-shrink-0 text-3xl leading-none select-none">🏆</div>

      <div className="relative z-10 flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-0.5">
          <span className="text-white font-black text-sm leading-tight">Congratulations!</span>
          <span className="bg-black/30 text-white text-xs font-black px-2 py-0.5 rounded-lg">
            +{count}
          </span>
        </div>
        <p className="text-white/90 text-xs leading-snug">
          You brought <span className="font-black text-white">{count} new referral{count !== 1 ? "s" : ""}</span> today! 🎉 Keep sharing your link and grow your team.
        </p>
      </div>

      <button
        onClick={() => navigate("/downlines")}
        className="relative z-10 flex-shrink-0 flex items-center gap-1.5 bg-white/20 hover:bg-white/30 border border-white/30 text-white text-xs font-black px-3 py-2.5 rounded-xl transition-all active:scale-95 backdrop-blur-sm"
      >
        <Users className="w-3.5 h-3.5" />
        <span className="hidden xs:inline">View Team</span>
        <span className="xs:hidden">Team</span>
      </button>

      <button
        onClick={dismiss}
        className="relative z-10 flex-shrink-0 w-7 h-7 flex items-center justify-center bg-black/20 hover:bg-black/35 rounded-lg text-white/70 hover:text-white transition-all"
        aria-label="Dismiss"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
