import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { useGetTasks, useCompleteTask } from "@workspace/api-client-react";
import { useCurrency } from "@/hooks/use-currency";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import {
  Music2, Youtube, Film, Clapperboard, Megaphone,
  Clock, Trophy, CheckCircle2, Send, X, AlertCircle,
  Play, ChevronLeft, ChevronRight, Tv2, WifiOff, Image as ImageIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Asset types ──────────────────────────────────────────────────────────────
interface EarnAsset {
  id: number;
  title: string;
  url: string;
  thumbnail_url: string | null;
  asset_type: "video_link" | "image_url";
  sort_order: number;
}

// ─── YouTube URL → ID ─────────────────────────────────────────────────────────
function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m?.[1]) return m[1];
  }
  return null;
}

// ─── TikTok URL → video ID ────────────────────────────────────────────────────
function extractTikTokId(url: string): string | null {
  if (!url) return null;
  const m = url.match(/video\/(\d+)/);
  return m?.[1] ?? null;
}

// ─── Instagram URL → shortcode ────────────────────────────────────────────────
function extractInstagramShortcode(url: string): string | null {
  if (!url) return null;
  const m = url.match(/\/(reel|p|tv)\/([A-Za-z0-9_-]+)/);
  return m?.[2] ?? null;
}

// ─── Detect video platform ────────────────────────────────────────────────────
type VideoPlatform = "youtube" | "tiktok" | "instagram" | "direct" | "generic";

function detectVideoPlatform(url: string): VideoPlatform {
  if (!url) return "generic";
  if (/youtube\.com|youtu\.be/.test(url)) return "youtube";
  if (/tiktok\.com/.test(url)) return "tiktok";
  if (/instagram\.com/.test(url)) return "instagram";
  if (/\.(mp4|webm|ogg|mov)(\?|$)/i.test(url)) return "direct";
  return "generic";
}

function thumbnailFor(asset: EarnAsset): string {
  if (asset.thumbnail_url) return asset.thumbnail_url;
  if (asset.asset_type === "video_link") {
    const id = extractYouTubeId(asset.url);
    return id ? `https://img.youtube.com/vi/${id}/mqdefault.jpg` : "";
  }
  return asset.url; // image_url — use directly as thumbnail too
}

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
  aspectClass: string;
  playerNote: string;
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
    requiredSeconds: 10,
    emoji: "🎵",
    taskType: "tiktok",
    aspectClass: "aspect-[9/16] max-h-[480px]",
    playerNote: "Watch any video for 10 seconds",
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
    requiredSeconds: 10,
    emoji: "🎞️",
    taskType: "reals",
    aspectClass: "aspect-[9/16] max-h-[480px]",
    playerNote: "Watch any reel for 10 seconds",
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

// ─── useEarnAssets: fetch + SSE live-refresh ──────────────────────────────────
function useEarnAssets(category: PlatformKey) {
  const [assets, setAssets] = useState<EarnAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [liveConnected, setLiveConnected] = useState(false);

  const fetchAssets = useCallback(async () => {
    try {
      const res = await fetch(`/api/earn-assets?category=${encodeURIComponent(category)}`);
      if (!res.ok) throw new Error("fetch failed");
      const data = await res.json() as { assets: EarnAsset[] };
      setAssets(data.assets ?? []);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [category]);

  // Initial fetch
  useEffect(() => {
    setLoading(true);
    setAssets([]);
    fetchAssets();
  }, [fetchAssets]);

  // SSE subscription for real-time updates
  useEffect(() => {
    const es = new EventSource("/api/earn-assets/stream");

    es.addEventListener("connected", () => setLiveConnected(true));
    es.addEventListener("heartbeat", () => {/* keep-alive */});
    es.addEventListener("update", (e: MessageEvent) => {
      try {
        const payload = JSON.parse(e.data) as { category: string; action: string };
        if (payload.category === category) {
          fetchAssets(); // refetch when our category changes
        }
      } catch { /* ignore parse errors */ }
    });

    es.onerror = () => setLiveConnected(false);

    return () => es.close();
  }, [category, fetchAssets]);

  return { assets, loading, error, liveConnected, refetch: fetchAssets };
}

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

// ─── Lazy iframe / image asset player ────────────────────────────────────────
function AssetPlayer({
  asset,
  platform,
  onVisible,
}: {
  asset: EarnAsset;
  platform: PlatformConfig;
  onVisible?: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  // IntersectionObserver — only render the iframe/img when in viewport (lazy)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          onVisible?.();
          obs.disconnect();
        }
      },
      { threshold: 0.1 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [onVisible]);

  if (asset.asset_type === "image_url") {
    return (
      <div ref={containerRef} className={cn("w-full relative bg-black", platform.aspectClass)}>
        {visible ? (
          <img
            src={asset.url}
            alt={asset.title}
            className="w-full h-full object-contain"
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-black">
            <ImageIcon className="w-8 h-8 text-white/30 animate-pulse" />
          </div>
        )}
      </div>
    );
  }

  // video_link — detect platform and embed accordingly
  const videoPlatform = detectVideoPlatform(asset.url);

  let embedUrl: string | null = null;
  let isDirectVideo = false;

  if (videoPlatform === "youtube") {
    const ytId = extractYouTubeId(asset.url);
    embedUrl = ytId
      ? `https://www.youtube.com/embed/${ytId}?rel=0&modestbranding=1&autoplay=0`
      : null;
  } else if (videoPlatform === "tiktok") {
    const tikId = extractTikTokId(asset.url);
    embedUrl = tikId
      ? `https://www.tiktok.com/embed/v2/${tikId}`
      : null;
  } else if (videoPlatform === "instagram") {
    const shortcode = extractInstagramShortcode(asset.url);
    // Determine if it's a reel or regular post
    const isReel = /\/reel\//.test(asset.url);
    embedUrl = shortcode
      ? `https://www.instagram.com/${isReel ? "reel" : "p"}/${shortcode}/embed/`
      : null;
  } else if (videoPlatform === "direct") {
    isDirectVideo = true;
  } else {
    // generic — try to embed directly as iframe
    embedUrl = asset.url;
  }

  return (
    <div ref={containerRef} className={cn("w-full relative bg-black", platform.aspectClass)}>
      {visible ? (
        isDirectVideo ? (
          <video
            key={`${platform.key}-${asset.id}`}
            src={asset.url}
            title={asset.title}
            className="w-full h-full"
            controls
            playsInline
          />
        ) : embedUrl ? (
          <iframe
            key={`${platform.key}-${asset.id}`}
            src={embedUrl}
            title={asset.title}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            loading="lazy"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex flex-col items-center gap-2 text-center p-4">
              <AlertCircle className="w-6 h-6 text-white/50" />
              <p className="text-white/60 text-xs">Unable to embed this video URL</p>
            </div>
          </div>
        )
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-white/40 border-t-white rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}

// ─── Empty state (no assets uploaded yet) ─────────────────────────────────────
function EmptyAssets({ platform }: { platform: PlatformConfig }) {
  const Icon = platform.icon;
  return (
    <div className={cn(
      "flex flex-col items-center justify-center py-12 rounded-2xl border text-center gap-3",
      platform.bgAccent, platform.borderAccent,
    )}>
      <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center", platform.accentColor)}>
        <Icon className="w-7 h-7 text-white" />
      </div>
      <div>
        <p className="font-black text-foreground">No content yet</p>
        <p className="text-xs text-muted-foreground mt-1">
          The admin hasn't uploaded any {platform.label} content yet.
          <br />Check back soon!
        </p>
      </div>
    </div>
  );
}

// ─── Main EarnFun Page ────────────────────────────────────────────────────────
export default function EarnFun() {
  const [location] = useLocation();
  const { data, isLoading: tasksLoading, isError: tasksError, refetch: refetchTasks } = useGetTasks();
  const { fmt } = useCurrency();
  const queryClient = useQueryClient();

  const platform = PLATFORMS[location];
  const { assets, loading: assetsLoading, error: assetsError, liveConnected, refetch: refetchAssets } = useEarnAssets(platform?.key ?? "tiktok");

  const [currentIdx, setCurrentIdx] = useState(0);
  const [isWatching, setIsWatching] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [showClaim, setShowClaim] = useState(false);
  const [claimTask, setClaimTask] = useState<{ id: number; name: string; type: string; reward: number } | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Reset on video/page change
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsWatching(false);
    setElapsed(0);
  }, [currentIdx, location]);

  // Also reset when assets change (SSE update) — keep idx in bounds
  useEffect(() => {
    setCurrentIdx(prev => (assets.length > 0 ? Math.min(prev, assets.length - 1) : 0));
  }, [assets]);

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

  const currentAsset = assets[currentIdx] ?? null;

  const startWatching = () => {
    if (isWatching) return;
    setIsWatching(true);
    setElapsed(0);
    timerRef.current = setInterval(() => {
      setElapsed(prev => prev + 1);
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
    refetchTasks();
    setIsWatching(false);
    setElapsed(0);
  };

  const prevAsset = () => setCurrentIdx(i => (i - 1 + assets.length) % assets.length);
  const nextAsset = () => setCurrentIdx(i => (i + 1) % assets.length);

  const Icon = platform.icon;

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
                <span className="text-white/70 text-[10px] font-bold uppercase tracking-widest block">Earn with Fun</span>
                <h1 className="text-white font-black text-xl leading-tight">{platform.emoji} {platform.label}</h1>
                <p className="text-white/60 text-xs">{platform.tagline}</p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              {activeTask && (
                <div className="text-right">
                  <p className="text-white font-black text-lg leading-none">{fmt(activeTask.reward)}</p>
                  <p className="text-white/60 text-[10px] uppercase tracking-wide">per task</p>
                </div>
              )}
              {/* Live indicator */}
              <div className={cn(
                "flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold border",
                liveConnected
                  ? "bg-emerald-500/20 border-emerald-400/30 text-emerald-200"
                  : "bg-white/10 border-white/20 text-white/40"
              )}>
                {liveConnected
                  ? <><span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />LIVE</>
                  : <><WifiOff className="w-2.5 h-2.5" />OFFLINE</>}
              </div>
            </div>
          </div>
        </div>

        {/* Video / Asset Player Card */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">

          {/* Card header */}
          {!assetsLoading && assets.length > 0 && currentAsset && (
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
              <div className="flex items-center gap-2 min-w-0">
                <Tv2 className={cn("w-4 h-4 flex-shrink-0", platform.textAccent)} />
                <span className="text-foreground text-sm font-black truncate">{currentAsset.title}</span>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <span className="text-muted-foreground text-[10px] mr-1">
                  {currentIdx + 1}/{assets.length}
                </span>
                <button onClick={prevAsset} className="w-7 h-7 rounded-lg bg-muted hover:bg-muted/80 flex items-center justify-center transition-all">
                  <ChevronLeft className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
                <button onClick={nextAsset} className="w-7 h-7 rounded-lg bg-muted hover:bg-muted/80 flex items-center justify-center transition-all">
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </div>
            </div>
          )}

          {/* Player area */}
          {assetsLoading ? (
            <div className={cn("w-full flex items-center justify-center bg-muted/30", platform.aspectClass)}>
              <div className="flex flex-col items-center gap-2">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-xs text-muted-foreground">Loading content…</p>
              </div>
            </div>
          ) : assetsError ? (
            <div className={cn("w-full flex items-center justify-center bg-muted/30", platform.aspectClass)}>
              <div className="flex flex-col items-center gap-2 text-center p-4">
                <AlertCircle className="w-6 h-6 text-destructive/60" />
                <p className="text-sm text-muted-foreground">Failed to load content</p>
                <button onClick={refetchAssets} className="text-xs text-primary underline">Retry</button>
              </div>
            </div>
          ) : assets.length === 0 ? (
            <div className="p-4">
              <EmptyAssets platform={platform} />
            </div>
          ) : currentAsset ? (
            <AssetPlayer
              key={`${platform.key}-${currentAsset.id}`}
              asset={currentAsset}
              platform={platform}
            />
          ) : null}

          {/* Thumbnails strip — lazy loaded */}
          {!assetsLoading && assets.length > 1 && (
            <div className="flex gap-2 px-4 py-3 overflow-x-auto border-t border-border" style={{ scrollbarWidth: "none" }}>
              {assets.map((a, i) => {
                const thumb = thumbnailFor(a);
                return (
                  <button
                    key={a.id}
                    onClick={() => setCurrentIdx(i)}
                    className={cn(
                      "flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all",
                      i === currentIdx ? platform.borderAccent : "border-transparent opacity-60 hover:opacity-80",
                    )}
                  >
                    {thumb ? (
                      <img
                        src={thumb}
                        alt={a.title}
                        loading="lazy"
                        className="w-20 h-12 object-cover"
                      />
                    ) : (
                      <div className={cn("w-20 h-12 flex items-center justify-center", platform.bgAccent)}>
                        <Icon className={cn("w-5 h-5", platform.textAccent)} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Watch & Earn Card */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
          <div className="px-5 py-4 space-y-4">

            {tasksLoading ? (
              <div className="flex justify-center py-6">
                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : tasksError ? (
              <div className="flex flex-col items-center gap-2 py-6 text-center">
                <AlertCircle className="w-6 h-6 text-destructive/60" />
                <p className="text-sm text-muted-foreground">Could not load task data.</p>
                <button onClick={() => refetchTasks()} className="text-xs text-primary underline">Retry</button>
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

                {/* Disabled state: no assets */}
                {assets.length === 0 && !assetsLoading ? (
                  <div className={cn(
                    "flex items-center gap-2.5 px-4 py-3 rounded-xl border text-sm",
                    platform.bgAccent, platform.borderAccent, platform.textAccent,
                  )}>
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span className="font-bold">No content available yet — check back soon</span>
                  </div>
                ) : !isWatching ? (
                  <button
                    onClick={startWatching}
                    disabled={assets.length === 0}
                    className={cn(
                      "w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-black text-sm text-white transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed",
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

                {!isWatching && assets.length > 0 && (
                  <p className="text-center text-muted-foreground text-xs">
                    Press play on the content above, then click Start Watching
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
