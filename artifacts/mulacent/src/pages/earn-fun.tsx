import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useGetTasks, useCompleteTask } from "@workspace/api-client-react";
import { useCurrency } from "@/hooks/use-currency";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import {
  Music2, Youtube, Film, Clapperboard, Megaphone,
  ExternalLink, Clock, Trophy, CheckCircle2, Send,
  X, AlertCircle, Zap, Play, Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Platform config ──────────────────────────────────────────────────────────
type PlatformKey = "tiktok" | "youtube" | "movies" | "reals" | "ads";

interface PlatformConfig {
  key: PlatformKey;
  label: string;
  tagline: string;
  icon: typeof Music2;
  gradientFrom: string;
  gradientTo: string;
  accentColor: string;
  textAccent: string;
  bgAccent: string;
  borderAccent: string;
  badgeClass: string;
  requiredSeconds: number;
  externalUrl: string;
  instructions: string[];
  emoji: string;
  taskType: string;
}

const PLATFORMS: Record<string, PlatformConfig> = {
  "/tiktok-earn": {
    key: "tiktok",
    label: "TikTok Earn",
    tagline: "Watch TikToks & earn every day",
    icon: Music2,
    gradientFrom: "from-rose-500",
    gradientTo: "to-pink-600",
    accentColor: "bg-rose-500",
    textAccent: "text-rose-500",
    bgAccent: "bg-rose-50",
    borderAccent: "border-rose-200",
    badgeClass: "bg-rose-50 text-rose-600 border-rose-200",
    requiredSeconds: 60,
    externalUrl: "https://www.tiktok.com/explore",
    instructions: [
      "Tap 'Open TikTok' below",
      "Watch at least 3-4 short videos",
      "Stay on TikTok for 60 seconds",
      "Come back and submit to earn your reward",
    ],
    emoji: "🎵",
    taskType: "tiktok",
  },
  "/youtube-earn": {
    key: "youtube",
    label: "YouTube Earn",
    tagline: "Watch YouTube videos & get paid",
    icon: Youtube,
    gradientFrom: "from-red-500",
    gradientTo: "to-red-700",
    accentColor: "bg-red-600",
    textAccent: "text-red-600",
    bgAccent: "bg-red-50",
    borderAccent: "border-red-200",
    badgeClass: "bg-red-50 text-red-600 border-red-200",
    requiredSeconds: 120,
    externalUrl: "https://www.youtube.com",
    instructions: [
      "Tap 'Open YouTube' below",
      "Watch any video for at least 2 minutes",
      "Do not skip or mute the video",
      "Return here and submit to claim your reward",
    ],
    emoji: "▶️",
    taskType: "youtube",
  },
  "/movies-earn": {
    key: "movies",
    label: "Movies",
    tagline: "Watch movie clips & earn rewards",
    icon: Film,
    gradientFrom: "from-purple-600",
    gradientTo: "to-violet-700",
    accentColor: "bg-purple-600",
    textAccent: "text-purple-600",
    bgAccent: "bg-purple-50",
    borderAccent: "border-purple-200",
    badgeClass: "bg-purple-50 text-purple-600 border-purple-200",
    requiredSeconds: 180,
    externalUrl: "https://www.youtube.com/results?search_query=movie+trailer+2024",
    instructions: [
      "Tap 'Open Movies' below",
      "Watch a movie trailer or clip",
      "Watch for at least 3 minutes",
      "Return here and submit to claim your reward",
    ],
    emoji: "🎬",
    taskType: "movies",
  },
  "/reals-earn": {
    key: "reals",
    label: "Reals",
    tagline: "Watch Reels & Shorts, earn instantly",
    icon: Clapperboard,
    gradientFrom: "from-pink-500",
    gradientTo: "to-fuchsia-600",
    accentColor: "bg-pink-500",
    textAccent: "text-pink-600",
    bgAccent: "bg-pink-50",
    borderAccent: "border-pink-200",
    badgeClass: "bg-pink-50 text-pink-600 border-pink-200",
    requiredSeconds: 60,
    externalUrl: "https://www.youtube.com/shorts",
    instructions: [
      "Tap 'Open Reals' below",
      "Watch YouTube Shorts or Instagram Reels",
      "Watch for at least 60 seconds",
      "Return here and submit to earn",
    ],
    emoji: "🎞️",
    taskType: "reals",
  },
  "/ads-earn": {
    key: "ads",
    label: "Ads Earnings",
    tagline: "Watch ads & earn per view",
    icon: Megaphone,
    gradientFrom: "from-amber-500",
    gradientTo: "to-orange-600",
    accentColor: "bg-amber-500",
    textAccent: "text-amber-600",
    bgAccent: "bg-amber-50",
    borderAccent: "border-amber-200",
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
    requiredSeconds: 30,
    externalUrl: "https://www.youtube.com/ads",
    instructions: [
      "Tap 'Watch Ad' below",
      "Watch the full advertisement",
      "Do not close the tab for 30 seconds",
      "Return here and submit to earn",
    ],
    emoji: "📣",
    taskType: "ads",
  },
};

// ─── Task Dialog ──────────────────────────────────────────────────────────────
function EarnDialog({
  task,
  platform,
  onClose,
  onSuccess,
}: {
  task: { id: number; name: string; type: string; reward: number };
  platform: PlatformConfig;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { fmt } = useCurrency();
  const { toast } = useToast();
  const completeMutation = useCompleteTask();

  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  const openPlatform = () => {
    window.open(platform.externalUrl, "_blank", "noopener,noreferrer");
    if (startedAt !== null) return;
    const t = Date.now();
    setStartedAt(t);
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - t) / 1000));
    }, 1000);
  };

  const required = platform.requiredSeconds;
  const done = elapsed >= required;
  const remaining = Math.max(0, required - elapsed);
  const progress = Math.min(100, (elapsed / required) * 100);

  const handleSubmit = () => {
    if (!done) {
      toast({
        title: "Not yet!",
        description: `${remaining}s remaining. Keep watching.`,
        variant: "destructive",
      });
      return;
    }

    completeMutation.mutate(
      { id: task.id, data: { watchedSeconds: elapsed } as any },
      {
        onSuccess: (res) => {
          toast({ title: "🎉 Reward Claimed!", description: res.message });
          onSuccess();
          onClose();
        },
        onError: (err: any) => {
          const message =
            err?.data?.message ||
            err?.message?.replace(/^HTTP \d+ [^:]+:\s*/i, "") ||
            "Failed to complete task.";
          toast({ title: "Failed", description: message, variant: "destructive" });
        },
      },
    );
  };

  const Icon = platform.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md bg-card border border-border rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[92vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center",
              platform.accentColor,
            )}>
              <Icon className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-foreground font-black text-sm leading-tight">{task.name}</p>
              <p className="text-muted-foreground text-[10px] uppercase tracking-widest">
                {platform.label} · EASY
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-muted hover:bg-muted/80 flex items-center justify-center text-muted-foreground hover:text-foreground transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Reward bar */}
        <div className="flex items-center justify-between px-5 py-3 bg-muted/50 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-100 border border-amber-200 flex items-center justify-center">
              <Trophy className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <p className="text-foreground font-black text-base leading-none">{fmt(task.reward)}</p>
              <p className="text-muted-foreground text-[9px] uppercase tracking-wide">Reward</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 bg-muted border border-border rounded-lg px-2.5 py-1.5">
            <Clock className="w-3 h-3 text-muted-foreground" />
            <span className="text-muted-foreground text-[10px] font-bold">
              {required}s required
            </span>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

          {/* Instructions */}
          <div className={cn("rounded-xl p-4 border", platform.bgAccent, platform.borderAccent)}>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">{platform.emoji}</span>
              <span className={cn("text-[10px] font-black uppercase tracking-widest", platform.textAccent)}>
                How to Earn
              </span>
            </div>
            <ol className="space-y-1.5">
              {platform.instructions.map((step, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-foreground">
                  <span className={cn(
                    "w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black text-white flex-shrink-0 mt-0.5",
                    platform.accentColor,
                  )}>
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </div>

          {/* Open platform button */}
          <button
            onClick={openPlatform}
            className={cn(
              "w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl font-black text-sm text-white transition-all active:scale-[0.98]",
              `bg-gradient-to-r ${platform.gradientFrom} ${platform.gradientTo}`,
              "shadow-md",
            )}
          >
            <ExternalLink className="w-4 h-4" />
            {startedAt === null ? `Open ${platform.label}` : `Open Again`}
          </button>

          {/* Timer status */}
          {startedAt !== null && (
            <div className="space-y-2">
              {/* Progress bar */}
              <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-1000",
                    done
                      ? "bg-emerald-500"
                      : `bg-gradient-to-r ${platform.gradientFrom} ${platform.gradientTo}`,
                  )}
                  style={{ width: `${progress}%` }}
                />
              </div>

              <div className={cn(
                "flex items-center gap-2.5 px-4 py-3 rounded-xl border text-sm font-bold",
                done
                  ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                  : cn(platform.bgAccent, platform.borderAccent, platform.textAccent),
              )}>
                {done
                  ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  : <Clock className="w-4 h-4 animate-pulse flex-shrink-0" />}
                <span>
                  {done
                    ? `✓ Complete! (${elapsed}s watched) — submit now`
                    : `${elapsed}s watched · ${remaining}s remaining`}
                </span>
              </div>
            </div>
          )}

          {startedAt === null && (
            <div className="flex items-start gap-2 bg-muted border border-border rounded-xl px-3 py-2.5">
              <AlertCircle className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
              <p className="text-muted-foreground text-xs">
                Your timer starts the moment you open the platform. Don't close this tab.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-5 py-4 border-t border-border flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1.5 px-4 py-3 rounded-xl font-bold text-sm text-muted-foreground bg-muted border border-border hover:bg-muted/80 transition-all"
          >
            <X className="w-3.5 h-3.5" /> Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={completeMutation.isPending || !done}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-black text-sm transition-all active:scale-[0.98]",
              !done || completeMutation.isPending
                ? "bg-muted text-muted-foreground cursor-not-allowed"
                : "bg-primary text-primary-foreground shadow-sm",
            )}
          >
            {completeMutation.isPending
              ? <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
              : <Send className="w-4 h-4" />}
            {completeMutation.isPending ? "Submitting…" : "Claim Reward"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main EarnFun Page ────────────────────────────────────────────────────────
export default function EarnFun() {
  const [location] = useLocation();
  const { data, isLoading, isError, refetch } = useGetTasks();
  const { fmt } = useCurrency();
  const queryClient = useQueryClient();
  const [activeTask, setActiveTask] = useState<{
    id: number; name: string; type: string; reward: number;
  } | null>(null);

  const platform = PLATFORMS[location];

  // Fallback if path not matched
  if (!platform) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center text-muted-foreground">
        <AlertCircle className="w-10 h-10 mx-auto mb-3 opacity-40" />
        <p className="font-semibold">Page not found</p>
      </div>
    );
  }

  const tasks = (data?.tasks ?? []).filter(t => t.type === platform.taskType);
  const Icon = platform.icon;

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/wallet/balances"] });
    queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
    refetch();
  };

  return (
    <>
      {activeTask && (
        <EarnDialog
          task={activeTask}
          platform={platform}
          onClose={() => setActiveTask(null)}
          onSuccess={handleSuccess}
        />
      )}

      <div className="max-w-2xl mx-auto space-y-4">

        {/* Hero */}
        <div className={cn(
          "rounded-2xl p-5 relative overflow-hidden border shadow-sm",
          `bg-gradient-to-br ${platform.gradientFrom} ${platform.gradientTo}`,
          "border-white/10",
        )}>
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 blur-3xl rounded-full pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 blur-3xl rounded-full pointer-events-none" />

          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                <Icon className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="text-white/70 text-[10px] font-bold uppercase tracking-widest">
                  Earn with Fun
                </span>
                <h1 className="text-white font-black text-xl leading-tight">
                  {platform.emoji} {platform.label}
                </h1>
              </div>
            </div>
            <p className="text-white/60 text-xs mb-4">{platform.tagline}</p>

            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Available", value: tasks.filter(t => !t.doneToday).length },
                { label: "Done Today", value: tasks.filter(t => t.doneToday).length },
                { label: "Reward", value: tasks[0] ? fmt(tasks[0].reward) : "—" },
              ].map(s => (
                <div key={s.label} className="bg-white/15 border border-white/20 rounded-xl p-2.5 text-center">
                  <p className="text-white font-black text-sm leading-none truncate">{String(s.value)}</p>
                  <p className="text-white/50 text-[9px] uppercase tracking-wide mt-1">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Task list */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
          <div className="flex items-center gap-2 px-5 py-3.5 border-b border-border">
            <span className={cn("w-2 h-2 rounded-sm flex-shrink-0", platform.accentColor)} />
            <span className="text-muted-foreground text-[10px] font-black uppercase tracking-widest">
              {platform.label} Tasks
            </span>
          </div>

          {isLoading ? (
            <div className="py-12 flex justify-center">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : isError ? (
            <div className="py-12 flex flex-col items-center gap-3 text-center px-6">
              <AlertCircle className="w-8 h-8 text-destructive/60" />
              <p className="text-foreground text-sm font-semibold">Could not load tasks</p>
              <button
                onClick={() => refetch()}
                className="mt-1 px-4 py-2 text-xs font-bold text-primary border border-primary/20 bg-primary/5 rounded-xl hover:bg-primary/10 transition-colors"
              >
                Retry
              </button>
            </div>
          ) : tasks.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">
              No tasks available right now. Check back later.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {tasks.map(task => {
                const done = task.doneToday ?? false;
                return (
                  <div
                    key={task.id}
                    className={cn(
                      "flex items-center gap-3 px-5 py-4 transition-colors",
                      done ? "opacity-50" : "hover:bg-muted/50",
                    )}
                  >
                    {/* Icon */}
                    <div className={cn(
                      "w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 border",
                      platform.bgAccent, platform.borderAccent,
                    )}>
                      {done
                        ? <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        : <Icon className={cn("w-5 h-5", platform.textAccent)} />}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-foreground font-black text-sm leading-tight">{task.name}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className={cn(
                          "text-[10px] font-black px-2 py-0.5 rounded-md border uppercase",
                          platform.badgeClass,
                        )}>
                          {platform.label}
                        </span>
                        <span className="text-muted-foreground text-[10px]">Easy</span>
                        <span className="flex items-center gap-1 text-muted-foreground text-[10px]">
                          <Users className="w-2.5 h-2.5" />
                          {task.availableCount.toLocaleString()}
                        </span>
                        <span className="flex items-center gap-1 text-muted-foreground text-[10px]">
                          <Clock className="w-2.5 h-2.5" />
                          {platform.requiredSeconds}s
                        </span>
                      </div>
                    </div>

                    {/* Reward + CTA */}
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <div className="text-right relative">
                        <span className="absolute -top-1.5 -right-1 text-[8px] font-black bg-orange-500 text-white px-1 rounded uppercase">
                          Hot
                        </span>
                        <p className="text-foreground font-black text-base leading-none pr-2">
                          {fmt(task.reward)}
                        </p>
                        <p className="text-muted-foreground text-[9px] uppercase tracking-wide pr-2">
                          Reward
                        </p>
                      </div>
                      {done ? (
                        <div className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                          <span className="text-emerald-600 text-[10px] font-bold">Done</span>
                        </div>
                      ) : (
                        <button
                          onClick={() =>
                            setActiveTask({ id: task.id, name: task.name, type: task.type, reward: task.reward })
                          }
                          className={cn(
                            "flex items-center gap-1 px-4 py-1.5 rounded-lg font-black text-xs transition-all active:scale-95 border",
                            platform.bgAccent, platform.borderAccent,
                          )}
                        >
                          <Play className={cn("w-3 h-3", platform.textAccent)} />
                          <span className={platform.textAccent}>Start</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
