import { useGetCurrentTournament } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { Crown, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

const AVATAR_COLORS = [
  "from-amber-400 to-yellow-500",
  "from-violet-500 to-purple-600",
  "from-cyan-400 to-teal-500",
  "from-pink-500 to-rose-500",
  "from-emerald-400 to-green-500",
  "from-blue-400 to-indigo-500",
  "from-orange-400 to-red-500",
  "from-fuchsia-400 to-purple-500",
];

function useCountdown(endsAt: string) {
  const calc = () => {
    const diff = new Date(endsAt).getTime() - Date.now();
    if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    return {
      days: Math.floor(diff / 86400000),
      hours: Math.floor((diff % 86400000) / 3600000),
      minutes: Math.floor((diff % 3600000) / 60000),
      seconds: Math.floor((diff % 60000) / 1000),
    };
  };
  const [time, setTime] = useState(calc);
  useEffect(() => {
    const id = setInterval(() => setTime(calc()), 1000);
    return () => clearInterval(id);
  }, [endsAt]);
  return time;
}

function CountdownBox({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="bg-black/30 border border-white/20 rounded-xl w-14 h-14 flex items-center justify-center">
        <span className="text-white font-bold text-2xl font-mono leading-none">
          {String(value).padStart(2, "0")}
        </span>
      </div>
      <span className="text-white/50 text-[10px] uppercase tracking-widest mt-1.5 font-semibold">{label}</span>
    </div>
  );
}

function PodiumCard({ entry, place }: { entry: { rank: number; username: string; referrals: number; avatarInitials: string; isCurrentUser: boolean }; place: 1 | 2 | 3 }) {
  const configs = {
    1: {
      crown: "text-yellow-400",
      crownBg: "bg-yellow-500/20 border-yellow-400/40",
      ring: "ring-2 ring-yellow-400/50 shadow-yellow-400/30",
      gradient: "from-yellow-400 to-amber-500",
      label: "text-yellow-500",
      valueBg: "bg-yellow-500/10 border-yellow-500/20 text-yellow-600 dark:text-yellow-300",
      size: "w-12 h-12 sm:w-16 sm:h-16 text-lg sm:text-xl",
    },
    2: {
      crown: "text-slate-400",
      crownBg: "bg-slate-400/20 border-slate-300/40",
      ring: "ring-2 ring-slate-300/40 shadow-slate-300/20",
      gradient: "from-slate-300 to-slate-400",
      label: "text-muted-foreground",
      valueBg: "bg-muted border-border text-muted-foreground",
      size: "w-10 h-10 sm:w-14 sm:h-14 text-sm sm:text-base",
    },
    3: {
      crown: "text-amber-600",
      crownBg: "bg-amber-700/20 border-amber-600/40",
      ring: "ring-2 ring-amber-600/40 shadow-amber-600/20",
      gradient: "from-amber-600 to-orange-600",
      label: "text-amber-500",
      valueBg: "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400",
      size: "w-10 h-10 sm:w-14 sm:h-14 text-sm sm:text-base",
    },
  }[place];

  return (
    <div className={cn(
      "flex flex-col items-center gap-2 sm:gap-3 bg-card border border-border rounded-2xl p-3 sm:p-5 flex-1 min-w-0 shadow-sm",
      place === 1 && "shadow-yellow-500/10"
    )}>
      <div className={cn("w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center border", configs.crownBg)}>
        <Crown className={cn("w-3.5 h-3.5 sm:w-4 sm:h-4", configs.crown)} />
      </div>
      <div className={cn(
        "rounded-full bg-gradient-to-br flex items-center justify-center text-white font-bold shadow-lg",
        configs.gradient, configs.ring, configs.size
      )}>
        {entry.avatarInitials}
      </div>
      <div className="text-center w-full">
        <p className={cn("font-bold text-xs sm:text-sm leading-tight truncate", entry.isCurrentUser ? "text-primary" : "text-foreground")}>
          {entry.username}{entry.isCurrentUser ? " (You)" : ""}
        </p>
        <p className={cn("text-[9px] sm:text-[10px] uppercase tracking-wider mt-0.5", configs.label)}>
          #{entry.rank} Place
        </p>
      </div>
      <div className={cn("w-full border rounded-xl py-1.5 sm:py-2 text-center", configs.valueBg)}>
        <p className="font-black text-base sm:text-lg leading-none">{entry.referrals}</p>
        <p className="text-[9px] uppercase tracking-widest mt-0.5 opacity-70">Refs</p>
      </div>
    </div>
  );
}

export default function Tournament() {
  const { user } = useAuth();
  const { data: tournament, isLoading } = useGetCurrentTournament();
  const countdown = useCountdown(tournament?.endsAt ?? new Date(Date.now() + 86400000 * 7).toISOString());

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-10 h-10 border-[3px] border-primary border-t-transparent rounded-full animate-spin" />
        <p className="text-muted-foreground text-sm">Loading tournament...</p>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-16 h-16 rounded-2xl bg-muted border border-border flex items-center justify-center">
          <Crown className="w-8 h-8 text-muted-foreground" />
        </div>
        <p className="text-foreground font-semibold">No Active Tournament</p>
        <p className="text-muted-foreground text-sm">Check back soon for the next competition!</p>
      </div>
    );
  }

  const top3 = tournament.leaderboard.slice(0, 3);
  const rest = tournament.leaderboard.slice(3);
  const maxReferrals = tournament.leaderboard[0]?.referrals || 1;

  const podiumOrder = top3.length >= 3
    ? [top3[1], top3[0], top3[2]]
    : top3;

  return (
    <div className="space-y-5">
      {/* Banner */}
      <div
        className="relative overflow-hidden rounded-2xl p-6 md:p-8 text-center"
        style={{ background: "linear-gradient(135deg, #3b5bdb 0%, #5b8dee 50%, #8b6ff5 100%)" }}
      >
        {/* Dot-grid pattern overlay */}
        <div
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            backgroundImage: "radial-gradient(rgba(255,255,255,0.4) 1px, transparent 1px)",
            backgroundSize: "18px 18px",
          }}
        />
        {/* Ambient glow orbs */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-40 bg-white/10 blur-3xl rounded-full" />
          <div className="absolute bottom-0 left-0 w-64 h-32 bg-indigo-400/20 blur-3xl rounded-full" />
          <div className="absolute bottom-0 right-0 w-64 h-32 bg-violet-400/20 blur-3xl rounded-full" />
        </div>

        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 bg-white/15 border border-white/25 rounded-full px-4 py-1.5 mb-4">
            <Crown className="w-3.5 h-3.5 text-yellow-300" />
            <span className="text-white text-xs font-bold uppercase tracking-widest">Live Tournament</span>
          </div>

          <h1 className="text-2xl md:text-3xl font-display font-black text-white mb-1">{tournament.name}</h1>
          <p className="text-white/60 text-sm mb-6">
            Invite the most active members — top referrers win cash prizes!
          </p>

          <div className="flex items-center justify-center gap-3 flex-wrap">
            <CountdownBox value={countdown.days} label="Days" />
            <span className="text-white/50 font-bold text-2xl mb-4">:</span>
            <CountdownBox value={countdown.hours} label="Hours" />
            <span className="text-white/50 font-bold text-2xl mb-4">:</span>
            <CountdownBox value={countdown.minutes} label="Mins" />
            <span className="text-white/50 font-bold text-2xl mb-4">:</span>
            <CountdownBox value={countdown.seconds} label="Secs" />
          </div>
        </div>
      </div>

      {/* Your Position */}
      {tournament.userPosition && (
        <div className="bg-card border border-border rounded-2xl px-5 py-4 flex items-center gap-4 shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
            <Crown className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-foreground font-semibold text-sm">Your Position This Week</p>
            <p className="text-muted-foreground text-xs mt-0.5">
              Rank <span className="text-primary font-bold">#{tournament.userPosition.rank}</span> — keep inviting to climb higher!
            </p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-primary font-black text-xl leading-none">{tournament.userPosition.referrals}</p>
            <p className="text-muted-foreground text-[10px] uppercase tracking-wide mt-0.5">Referrals</p>
          </div>
        </div>
      )}

      {/* Top 3 Podium */}
      {top3.length > 0 && (
        <div className="flex gap-3 items-end">
          {podiumOrder.map((entry, i) => {
            if (!entry) return null;
            const place = entry.rank as 1 | 2 | 3;
            return (
              <PodiumCard key={entry.rank} entry={entry} place={place} />
            );
          })}
        </div>
      )}

      {/* Full Standings */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-1 h-4 rounded-full bg-primary flex-shrink-0" />
            <span className="text-foreground font-bold text-sm uppercase tracking-wider">Full Standings</span>
          </div>
          {tournament.prizes.length > 0 && (
            <div className="flex items-center gap-1.5 bg-primary/10 border border-primary/20 rounded-lg px-3 py-1.5">
              <span className="text-primary text-xs font-bold">🏆 Prize Pool</span>
            </div>
          )}
        </div>

        <div className="divide-y divide-border">
          {tournament.leaderboard.map((entry, idx) => {
            const barWidth = Math.max(4, Math.round((entry.referrals / maxReferrals) * 100));
            const barColors = [
              "from-amber-400 to-yellow-500",
              "from-slate-300 to-slate-400",
              "from-amber-600 to-orange-500",
            ];
            const barColor = idx < 3 ? barColors[idx] : "from-primary to-violet-500";
            const rankColor =
              entry.rank === 1 ? "text-yellow-500" :
              entry.rank === 2 ? "text-slate-400" :
              entry.rank === 3 ? "text-amber-500" :
              "text-muted-foreground";

            return (
              <div
                key={entry.rank}
                className={cn(
                  "px-5 py-3.5 transition-colors",
                  entry.isCurrentUser
                    ? "bg-primary/5 border-l-2 border-primary"
                    : "hover:bg-muted/50"
                )}
              >
                <div className="flex items-center gap-3">
                  <span className={cn("w-6 text-center font-bold text-sm flex-shrink-0", rankColor)}>
                    {entry.rank <= 3 ? ["🥇","🥈","🥉"][entry.rank - 1] : entry.rank}
                  </span>

                  <div className={cn(
                    "w-9 h-9 rounded-full bg-gradient-to-br flex items-center justify-center text-white font-bold text-xs flex-shrink-0 shadow-sm",
                    AVATAR_COLORS[idx % AVATAR_COLORS.length]
                  )}>
                    {entry.avatarInitials}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "font-semibold text-sm truncate",
                        entry.isCurrentUser ? "text-primary" : "text-foreground"
                      )}>
                        {entry.username}
                        {entry.isCurrentUser && (
                          <span className="ml-1 text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full border border-primary/20 align-middle">You</span>
                        )}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className={cn("h-full rounded-full bg-gradient-to-r", barColor)}
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <span className={cn(
                    "font-black text-base flex-shrink-0 min-w-[36px] text-right",
                    entry.rank === 1 ? "text-yellow-500" :
                    entry.rank === 2 ? "text-slate-400" :
                    entry.rank === 3 ? "text-amber-500" :
                    "text-primary"
                  )}>
                    {entry.referrals}
                  </span>
                </div>
              </div>
            );
          })}

          {tournament.leaderboard.length === 0 && (
            <div className="px-5 py-12 text-center">
              <p className="text-muted-foreground text-sm">No participants yet — be the first to invite!</p>
            </div>
          )}
        </div>
      </div>

      {/* Prizes Panel */}
      {tournament.prizes.length > 0 && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
            <div className="w-1 h-4 rounded-full bg-primary flex-shrink-0" />
            <span className="text-foreground font-bold text-sm uppercase tracking-wider">Prize Breakdown</span>
          </div>
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {tournament.prizes.map((prize) => (
              <div key={prize.rank} className={cn(
                "flex items-center gap-3 rounded-xl p-3.5 border",
                prize.rank === 1 ? "bg-yellow-500/8 border-yellow-500/20" :
                prize.rank === 2 ? "bg-muted border-border" :
                prize.rank === 3 ? "bg-amber-500/8 border-amber-500/20" :
                "bg-muted border-border"
              )}>
                <span className="text-xl">
                  {prize.rank === 1 ? "🥇" : prize.rank === 2 ? "🥈" : prize.rank === 3 ? "🥉" : `#${prize.rank}`}
                </span>
                <div>
                  <p className="text-muted-foreground text-[10px] uppercase tracking-widest">Rank {prize.rank}</p>
                  <p className={cn(
                    "font-black text-base",
                    prize.rank === 1 ? "text-yellow-500" :
                    prize.rank === 2 ? "text-foreground" :
                    prize.rank === 3 ? "text-amber-500" :
                    "text-foreground"
                  )}>{prize.prize}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Previous Week Winners */}
      {(tournament as any).previousWinners?.length > 0 && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-border flex items-center gap-2">
            <div className="w-1 h-4 rounded-full bg-primary flex-shrink-0" />
            <span className="text-foreground font-bold text-sm uppercase tracking-wider">Last Week's Winners</span>
            <span className="ml-auto text-[10px] text-emerald-600 bg-emerald-50 border border-emerald-100 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wide">
              Prizes Credited ✓
            </span>
          </div>
          <div className="p-4 space-y-2.5">
            {(tournament as any).previousWinners.map((w: { rank: number; username: string; prize: string; avatarInitials: string }) => {
              const medal = w.rank === 1 ? "🥇" : w.rank === 2 ? "🥈" : "🥉";
              const nameColor =
                w.rank === 1 ? "text-yellow-500" :
                w.rank === 2 ? "text-foreground" :
                "text-amber-500";
              const prizeColor =
                w.rank === 1 ? "text-yellow-500" :
                w.rank === 2 ? "text-foreground" :
                "text-amber-500";
              return (
                <div key={w.rank} className="flex items-center gap-3 bg-muted border border-border rounded-xl px-4 py-3">
                  <span className="text-xl w-7 text-center">{medal}</span>
                  <div className={cn(
                    "w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0",
                    w.rank === 1 ? "bg-gradient-to-br from-amber-400 to-yellow-500" :
                    w.rank === 2 ? "bg-gradient-to-br from-slate-300 to-slate-400" :
                    "bg-gradient-to-br from-amber-600 to-orange-600"
                  )}>
                    {w.avatarInitials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn("font-bold text-sm", nameColor)}>{w.username}</p>
                    <p className="text-muted-foreground text-[10px] uppercase tracking-wide mt-0.5">Rank #{w.rank}</p>
                  </div>
                  <p className={cn("font-black text-base", prizeColor)}>{w.prize}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Rules */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Info className="w-3.5 h-3.5 text-primary" />
          </div>
          <span className="text-foreground font-bold text-sm">How It Works</span>
        </div>
        <ul className="space-y-2.5 text-sm">
          {[
            "Only referrals who joined and activated their account this week are counted.",
            "Activation: Having their account funded and completing their first task.",
            "A minimum of 3 active referrals is required to appear on the leaderboard.",
            "Prizes are automatically credited to the top 3 at the end of each week.",
            "Visit the Affiliates page to copy your personal link and start climbing the rankings!",
          ].map((rule, i) => (
            <li key={i} className="flex items-start gap-2.5 text-muted-foreground">
              <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0 mt-1.5" />
              {rule}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
