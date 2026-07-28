import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useGetTasks, useCompleteTask } from "@workspace/api-client-react";
import { useCurrency } from "@/hooks/use-currency";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import {
  Music2, Youtube, Film, Clapperboard, Megaphone,
  Clock, Trophy, CheckCircle2, Send, X, AlertCircle,
  Play, ChevronLeft, ChevronRight, Tv2,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Video libraries ──────────────────────────────────────────────────────────
type VideoItem = { id: string; title: string; channel?: string };

// All embed as standard YouTube iframes (YouTube supports Shorts, trailers, ads)
const VIDEO_LIBRARY: Record<string, VideoItem[]> = {
  tiktok: [
    // YouTube Shorts — same vertical short-form format as TikTok
    { id: "QH2-TGUlwu4", title: "Nyan Cat — Original 🌈", channel: "saraj00n" },
    { id: "StTqXEQ2l-Y", title: "Charlie Bit My Finger 😂", channel: "HDCYT" },
    { id: "jNQXAC9IVRw", title: "Me at the Zoo 🎬", channel: "jawed" },
    { id: "7ytELs3omCI", title: "Funny Moment Compilation", channel: "Trending" },
    { id: "2vjPBrBU-TM", title: "Viral Dance Challenge 💃", channel: "Dance Crew" },
  ],
  youtube: [
    { id: "dQw4w9WgXcQ", title: "Never Gonna Give You Up 🎵", channel: "Rick Astley" },
    { id: "9bZkp7q19f0", title: "GANGNAM STYLE 🐴", channel: "PSY" },
    { id: "kJQP7kiw5Fk", title: "Despacito ft. Daddy Yankee", channel: "Luis Fonsi" },
    { id: "JGwWNGJdvx8", title: "Shape of You 🎶", channel: "Ed Sheeran" },
    { id: "OPf0YbXqDm0", title: "Uptown Funk 🎸", channel: "Mark Ronson ft. Bruno Mars" },
  ],
  movies: [
    { id: "sGbxmsDFVnE", title: "Interstellar — Official Trailer", channel: "Warner Bros." },
    { id: "EXeTwQWrcwY", title: "The Dark Knight — Trailer", channel: "Warner Bros." },
    { id: "66TuSJo4dZM", title: "Inception — Official Trailer", channel: "Warner Bros." },
    { id: "hA6hldpSTF8", title: "Avatar: The Way of Water", channel: "20th Century Studios" },
    { id: "d9MyW72ELq0", title: "The Lion King — Official Trailer", channel: "Disney" },
  ],
  reals: [
    // Short vertical-style content — YouTube Shorts
    { id: "7ytELs3omCI", title: "Funny Moments Reel 😂", channel: "Fun Clips" },
    { id: "2vjPBrBU-TM", title: "Dance Reel ✨", channel: "Dance World" },
    { id: "HPDzCOMiQ70", title: "Nyan Cat 10 Hours 🌟", channel: "Viral" },
    { id: "StTqXEQ2l-Y", title: "Classic Viral Reel", channel: "Top Reals" },
    { id: "jNQXAC9IVRw", title: "OG Reel 🎬", channel: "Classics" },
  ],
  ads: [
    { id: "kffacxfA7G4", title: "Old Spice: The Man Your Man Could Smell Like", channel: "Old Spice" },
    { id: "PPtBe-A5gXM", title: "Apple — Think Different", channel: "Apple" },
    { id: "iqJgFTOAQQI", title: "Nike — You Can't Stop Us", channel: "Nike" },
    { id: "8bCB3tbAqmA", title: "Coca-Cola Holiday Commercial 🎅", channel: "Coca-Cola" },
    { id: "wqBiRNphXZM", title: "Samsung Galaxy Launch Ad", channel: "Samsung" },
  ],
};

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
  emoji: string;
  taskType: string;
  aspectClass: string;   // CSS aspect ratio for the player
  playerNote: string;    // shown below the player
}

const PLATFORMS: Record<string, PlatformConfig> = {
  "/tiktok-earn": {
    key: "tiktok",
    label: "TikTok Earn",
    tagline: "Watch short videos & earn every day",
    icon: Music2,
    gradientFrom: "from-rose-500",
    gradientTo: "to-pink-600",
    accentColor: "bg-rose-500",
    textAccent: "text-rose-500",
    bgAccent: "bg-rose-50",
    borderAccent: "border-rose-200",
    badgeClass: "bg-rose-50 text-rose-600 border-rose-200",
    requiredSeconds: 60,
    emoji: "🎵",
    taskType: "tiktok",
    aspectClass: "aspect-[9/16] max-h-[480px]",
    playerNote: "Watch any video for 60 seconds",
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
    emoji: "▶️",
    taskType: "youtube",
    aspectClass: "aspect-video",
    playerNote: "Watch any video for 2 minutes",
  },
  "/movies-earn": {
    key: "movies",
    label: "Movies",
    tagline: "Watch movie trailers & earn rewards",
    icon: Film,
    gradientFrom: "from-purple-600",
    gradientTo: "to-violet-700",
    accentColor: "bg-purple-600",
    textAccent: "text-purple-600",
    bgAccent: "bg-purple-50",
    borderAccent: "border-purple-200",
    badgeClass: "bg-purple-50 text-purple-600 border-purple-200",
    requiredSeconds: 180,
    emoji: "🎬",
    taskType: "movies",
    aspectClass: "aspect-video",
    playerNote: "Watch any movie trailer for 3 minutes",
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
    emoji: "🎞️",
    taskType: "reals",
    aspectClass: "aspect-[9/16] max-h-[480px]",
    playerNote: "Watch any reel for 60 seconds",
  },
  "/ads-earn": {
    key: "ads",
    label: "Ads Earnings",
    tagline: "Watch brand ads & earn per view",
    icon: Megaphone,
    gradientFrom: "from-amber-500",
    gradientTo: "to-orange-600",
    accentColor: "bg-amber-500",
    textAccent: "text-amber-600",
    bgAccent: "bg-amber-50",
    borderAccent: "border-amber-200",
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
    requiredSeconds: 30,
    emoji: "📣",
    taskType: "ads",
    aspectClass: "aspect-video",
    playerNote: "Watch any ad for 30 seconds",
  },
};

// ─── Claim Dialog ─────────────────────────────────────────────────────────────
function ClaimDialog({
  task,
  platform,
  watchedSeconds,
  onClose,
  onSuccess,
}: {
  task: { id: number; name: string; type: string; reward: number };
  platform: PlatformConfig;
  watchedSeconds: number;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { fmt } = useCurrency();
  const { toast } = useToast();
  const completeMutation = useCompleteTask();

  const submit = () => {
    completeMutation.mutate(
      { id: task.id, data: { watchedSeconds } as any },
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
      <div className="w-full max-w-sm bg-card border border-border rounded-t-3xl sm:rounded-2xl shadow-2xl p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", platform.accentColor)}>
              <Icon className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-black text-sm text-foreground">{task.name}</p>
              <p className="text-muted-foreground text-[10px] uppercase tracking-widest">Claim your reward</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Reward */}
        <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <Trophy className="w-6 h-6 text-amber-500 flex-shrink-0" />
          <div>
            <p className="font-black text-xl text-foreground leading-none">{fmt(task.reward)}</p>
            <p className="text-muted-foreground text-xs mt-0.5">Watched {watchedSeconds}s — eligible to claim</p>
          </div>
        </div>

        <button
          onClick={submit}
          disabled={completeMutation.isPending}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-black text-sm bg-primary text-primary-foreground shadow-sm transition-all active:scale-[0.98] disabled:opacity-60"
        >
          {completeMutation.isPending
            ? <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
            : <Send className="w-4 h-4" />}
          {completeMutation.isPending ? "Processing…" : "Claim Reward"}
        </button>
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

  const platform = PLATFORMS[location];
  const videos = VIDEO_LIBRARY[platform?.key ?? ""] ?? [];

  const [currentVideoIdx, setCurrentVideoIdx] = useState(0);
  const [isWatching, setIsWatching] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [showClaim, setShowClaim] = useState(false);
  const [claimTask, setClaimTask] = useState<{ id: number; name: string; type: string; reward: number } | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Reset timer when video changes
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsWatching(false);
    setElapsed(0);
  }, [currentVideoIdx, location]);

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  if (!platform) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center text-muted-foreground">
        <AlertCircle className="w-10 h-10 mx-auto mb-3 opacity-40" />
        <p className="font-semibold">Page not found</p>
      </div>
    );
  }

  const required = platform.requiredSeconds;
  const done = elapsed >= required;
  const progress = Math.min(100, (elapsed / required) * 100);
  const remaining = Math.max(0, required - elapsed);

  const tasks = (data?.tasks ?? []).filter(t => t.type === platform.taskType);
  const activeTask = tasks.find(t => !t.doneToday) ?? null;
  const taskDone = tasks.length > 0 && tasks.every(t => t.doneToday);

  const startWatching = () => {
    if (isWatching) return;
    setIsWatching(true);
    setElapsed(0);
    timerRef.current = setInterval(() => {
      setElapsed(prev => {
        if (prev + 1 >= required) {
          // Don't stop the timer so we can track total watch time
        }
        return prev + 1;
      });
    }, 1000);
  };

  const handleClaimClick = () => {
    if (!activeTask) return;
    if (timerRef.current) clearInterval(timerRef.current);
    setClaimTask({ id: activeTask.id, name: activeTask.name, type: activeTask.type, reward: activeTask.reward });
    setShowClaim(true);
  };

  const handleClaimSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/wallet/balances"] });
    queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
    refetch();
    setIsWatching(false);
    setElapsed(0);
  };

  const prevVideo = () => setCurrentVideoIdx(i => (i - 1 + videos.length) % videos.length);
  const nextVideo = () => setCurrentVideoIdx(i => (i + 1) % videos.length);

  const currentVideo = videos[currentVideoIdx];
  const Icon = platform.icon;

  // Embed URL — autoplay=0 so user controls when they start
  const embedUrl = currentVideo
    ? `https://www.youtube.com/embed/${currentVideo.id}?rel=0&modestbranding=1&autoplay=0`
    : null;

  return (
    <>
      {showClaim && claimTask && (
        <ClaimDialog
          task={claimTask}
          platform={platform}
          watchedSeconds={elapsed}
          onClose={() => setShowClaim(false)}
          onSuccess={handleClaimSuccess}
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
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                <Icon className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="text-white/70 text-[10px] font-bold uppercase tracking-widest block">
                  Earn with Fun
                </span>
                <h1 className="text-white font-black text-xl leading-tight">
                  {platform.emoji} {platform.label}
                </h1>
                <p className="text-white/60 text-xs">{platform.tagline}</p>
              </div>
            </div>
            {activeTask && (
              <div className="text-right">
                <p className="text-white font-black text-lg leading-none">{fmt(activeTask.reward)}</p>
                <p className="text-white/60 text-[10px] uppercase tracking-wide">per task</p>
              </div>
            )}
          </div>
        </div>

        {/* Video Player Card */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">

          {/* Card header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
            <div className="flex items-center gap-2">
              <Tv2 className={cn("w-4 h-4", platform.textAccent)} />
              <span className="text-foreground text-sm font-black">
                {currentVideo?.title ?? "Loading…"}
              </span>
            </div>
            {/* Video navigation */}
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground text-[10px] mr-1">
                {currentVideoIdx + 1}/{videos.length}
              </span>
              <button onClick={prevVideo} className="w-7 h-7 rounded-lg bg-muted hover:bg-muted/80 flex items-center justify-center transition-all">
                <ChevronLeft className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
              <button onClick={nextVideo} className="w-7 h-7 rounded-lg bg-muted hover:bg-muted/80 flex items-center justify-center transition-all">
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </div>
          </div>

          {/* Embedded video */}
          <div className={cn("w-full relative bg-black", platform.aspectClass)}>
            {embedUrl ? (
              <iframe
                key={`${platform.key}-${currentVideoIdx}`}
                src={embedUrl}
                title={currentVideo?.title}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              </div>
            )}
          </div>

          {/* Video playlist thumbnails */}
          <div className="flex gap-2 px-4 py-3 overflow-x-auto border-t border-border scrollbar-none">
            {videos.map((v, i) => (
              <button
                key={v.id}
                onClick={() => setCurrentVideoIdx(i)}
                className={cn(
                  "flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all",
                  i === currentVideoIdx ? platform.borderAccent : "border-transparent opacity-60 hover:opacity-80",
                )}
              >
                <img
                  src={`https://img.youtube.com/vi/${v.id}/mqdefault.jpg`}
                  alt={v.title}
                  className="w-20 h-12 object-cover"
                  loading="lazy"
                />
              </button>
            ))}
          </div>
        </div>

        {/* Watch & Earn Card */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
          <div className="px-5 py-4 space-y-4">

            {isLoading ? (
              <div className="flex justify-center py-6">
                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : isError ? (
              <div className="flex flex-col items-center gap-2 py-6 text-center">
                <AlertCircle className="w-6 h-6 text-destructive/60" />
                <p className="text-sm text-muted-foreground">Could not load task data.</p>
                <button onClick={() => refetch()} className="text-xs text-primary underline">Retry</button>
              </div>
            ) : taskDone ? (
              <div className="flex flex-col items-center gap-2 py-6 text-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                <p className="font-black text-foreground">Today's task complete!</p>
                <p className="text-muted-foreground text-xs">Come back tomorrow to earn again.</p>
              </div>
            ) : (
              <>
                {/* Reward + timer row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center">
                      <Trophy className="w-4 h-4 text-amber-600" />
                    </div>
                    <div>
                      <p className="font-black text-base text-foreground leading-none">
                        {activeTask ? fmt(activeTask.reward) : "—"}
                      </p>
                      <p className="text-muted-foreground text-[9px] uppercase tracking-wide">Reward</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 bg-muted border border-border rounded-lg px-2.5 py-1.5">
                    <Clock className="w-3 h-3 text-muted-foreground" />
                    <span className="text-muted-foreground text-[10px] font-bold">
                      {done
                        ? "Ready to claim!"
                        : isWatching
                          ? `${remaining}s remaining`
                          : `${required}s to watch`}
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                {isWatching && (
                  <div className="space-y-1.5">
                    <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
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
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>{elapsed}s watched</span>
                      <span>{required}s required</span>
                    </div>
                  </div>
                )}

                {/* CTA */}
                {!isWatching ? (
                  <button
                    onClick={startWatching}
                    className={cn(
                      "w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-black text-sm text-white transition-all active:scale-[0.98]",
                      `bg-gradient-to-r ${platform.gradientFrom} ${platform.gradientTo}`,
                      "shadow-md",
                    )}
                  >
                    <Play className="w-4 h-4" />
                    Start Watching · {platform.playerNote}
                  </button>
                ) : done ? (
                  <button
                    onClick={handleClaimClick}
                    className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-black text-sm bg-emerald-500 text-white shadow-md transition-all active:scale-[0.98]"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Claim {activeTask ? fmt(activeTask.reward) : ""} Reward
                  </button>
                ) : (
                  <div className={cn(
                    "flex items-center gap-2.5 px-4 py-3 rounded-xl border text-sm font-bold",
                    platform.bgAccent, platform.borderAccent, platform.textAccent,
                  )}>
                    <Clock className="w-4 h-4 animate-pulse flex-shrink-0" />
                    <span>Keep watching… {elapsed}s / {required}s</span>
                  </div>
                )}

                {!isWatching && (
                  <p className="text-center text-muted-foreground text-xs">
                    Press play on the video above, then click Start Watching
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
