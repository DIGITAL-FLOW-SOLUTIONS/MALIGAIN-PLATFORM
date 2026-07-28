import { useState, useEffect, useRef } from "react";
import { useGetTasks, useCompleteTask } from "@workspace/api-client-react";
import { useCurrency } from "@/hooks/use-currency";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import {
  BarChart3, PenSquare, Play, Brain, MessageCircle,
  X, Zap, Users, CheckCircle2, ExternalLink, Clock,
  AlertCircle, Send, Trophy,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Task meta ───────────────────────────────────────────────────────────────
const TASK_META: Record<string, {
  color: string; bg: string; border: string;
  badge: string; icon: typeof BarChart3; label: string;
}> = {
  survey:   { color: "text-primary",     bg: "bg-primary/10",   border: "border-primary/20",   badge: "bg-primary/10 text-primary border-primary/20",       icon: BarChart3,     label: "SURVEY"   },
  blogging: { color: "text-emerald-600", bg: "bg-emerald-50",   border: "border-emerald-200",  badge: "bg-emerald-50 text-emerald-600 border-emerald-200",  icon: PenSquare,     label: "BLOG"     },
  video:    { color: "text-orange-600",  bg: "bg-orange-50",    border: "border-orange-200",   badge: "bg-orange-50 text-orange-600 border-orange-200",     icon: Play,          label: "VIDEO"    },
  trivia:   { color: "text-secondary",   bg: "bg-secondary/10", border: "border-secondary/20", badge: "bg-secondary/10 text-secondary border-secondary/20", icon: Brain,         label: "TRIVIA"   },
  chat:     { color: "text-rose-600",    bg: "bg-rose-50",      border: "border-rose-200",     badge: "bg-rose-50 text-rose-600 border-rose-200",           icon: MessageCircle, label: "CHAT"     },
  tiktok:   { color: "text-rose-500",    bg: "bg-rose-50",      border: "border-rose-200",     badge: "bg-rose-50 text-rose-500 border-rose-200",           icon: Play,          label: "TIKTOK"   },
  youtube:  { color: "text-red-600",     bg: "bg-red-50",       border: "border-red-200",      badge: "bg-red-50 text-red-600 border-red-200",              icon: Play,          label: "YOUTUBE"  },
  movies:   { color: "text-purple-600",  bg: "bg-purple-50",    border: "border-purple-200",   badge: "bg-purple-50 text-purple-600 border-purple-200",     icon: Play,          label: "MOVIES"   },
  reals:    { color: "text-pink-600",    bg: "bg-pink-50",      border: "border-pink-200",     badge: "bg-pink-50 text-pink-600 border-pink-200",           icon: Play,          label: "REALS"    },
  ads:      { color: "text-amber-600",   bg: "bg-amber-50",     border: "border-amber-200",    badge: "bg-amber-50 text-amber-700 border-amber-200",        icon: Play,          label: "ADS"      },
};

// ─── Survey questions ─────────────────────────────────────────────────────────
const SURVEY_QUESTIONS = [
  { id: 0, text: "Do you earn money online?",                      type: "choice" as const, options: ["Yes", "No"] },
  { id: 1, text: "Which online earning method do you prefer?",      type: "text" as const },
  { id: 2, text: "Are you satisfied with your current income?",     type: "choice" as const, options: ["Yes", "No"] },
];

// ─── Trivia questions ─────────────────────────────────────────────────────────
const TRIVIA_QUESTIONS = [
  { id: 0, text: "What is the largest continent by area?",
    options: [{ key: "A", text: "Asia" }, { key: "B", text: "Africa" }, { key: "C", text: "Europe" }, { key: "D", text: "Antarctica" }], correct: "A" },
  { id: 1, text: "Which planet is known as the Red Planet?",
    options: [{ key: "A", text: "Venus" }, { key: "B", text: "Mars" }, { key: "C", text: "Jupiter" }, { key: "D", text: "Saturn" }], correct: "B" },
  { id: 2, text: "How many continents are there on Earth?",
    options: [{ key: "A", text: "5" }, { key: "B", text: "6" }, { key: "C", text: "7" }, { key: "D", text: "8" }], correct: "C" },
];

// ─── Filter tabs ──────────────────────────────────────────────────────────────
const FILTER_OPTIONS = [
  { key: "all",     label: "All"    },
  { key: "video",   label: "Video"  },
  { key: "survey",  label: "Survey" },
  { key: "trivia",  label: "Trivia" },
  { key: "blogging",label: "Blog"   },
  { key: "chat",    label: "Chat"   },
] as const;
type FilterKey = typeof FILTER_OPTIONS[number]["key"];

// ─── TaskDialog ───────────────────────────────────────────────────────────────
function TaskDialog({
  task,
  onClose,
  onSuccess,
}: {
  task: { id: number; name: string; type: string; reward: number };
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { fmt } = useCurrency();
  const { toast } = useToast();
  const completeMutation = useCompleteTask();

  const [surveyAnswers, setSurveyAnswers] = useState<Record<number, string>>({});
  const [blogTitle, setBlogTitle] = useState("");
  const [blogContent, setBlogContent] = useState("");
  const wordCount = blogContent.trim().split(/\s+/).filter(Boolean).length;
  const [videoTime, setVideoTime] = useState(60);
  const [videoStarted, setVideoStarted] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [chatStartedAt, setChatStartedAt] = useState<number | null>(null);
  const [chatElapsed, setChatElapsed] = useState(0);
  const chatTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [triviaAnswers, setTriviaAnswers] = useState<Record<number, string>>({});

  const startVideo = () => {
    setVideoStarted(true);
    timerRef.current = setInterval(() => {
      setVideoTime(t => { if (t <= 1) { clearInterval(timerRef.current!); return 0; } return t - 1; });
    }, 1000);
  };

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);
  useEffect(() => () => { if (chatTimerRef.current) clearInterval(chatTimerRef.current); }, []);

  const startChatTimer = () => {
    if (chatStartedAt !== null) return;
    const startTime = Date.now();
    setChatStartedAt(startTime);
    chatTimerRef.current = setInterval(() => { setChatElapsed(Math.floor((Date.now() - startTime) / 1000)); }, 1000);
  };

  const meta = TASK_META[task.type] ?? TASK_META.survey!;
  const Icon = meta.icon;

  const handleSubmit = () => {
    let body: Record<string, unknown> = {};
    if (task.type === "survey") {
      if (Object.keys(surveyAnswers).length < SURVEY_QUESTIONS.length) {
        toast({ title: "Incomplete", description: "Please answer all questions.", variant: "destructive" }); return;
      }
      body = { answers: Object.values(surveyAnswers) };
    } else if (task.type === "blogging") {
      if (!blogTitle.trim()) { toast({ title: "Missing title", description: "Please add a blog title.", variant: "destructive" }); return; }
      if (wordCount < 200) { toast({ title: "Too short", description: `Write at least 200 words. (${wordCount}/200)`, variant: "destructive" }); return; }
      body = { title: blogTitle, content: blogContent };
    } else if (task.type === "video") {
      if (videoTime > 0) { toast({ title: "Keep watching", description: "Wait for the countdown to finish.", variant: "destructive" }); return; }
      body = { watchedSeconds: 60 };
    } else if (task.type === "chat") {
      if (chatElapsed < 300) {
        const remaining = 300 - chatElapsed;
        toast({ title: "Session too short", description: `${Math.floor(remaining / 60)}m ${remaining % 60}s remaining.`, variant: "destructive" }); return;
      }
      body = { sessionDuration: chatElapsed };
    } else if (task.type === "trivia") {
      if (Object.keys(triviaAnswers).length < TRIVIA_QUESTIONS.length) {
        toast({ title: "Incomplete", description: "Please answer all questions.", variant: "destructive" }); return;
      }
      body = { answers: TRIVIA_QUESTIONS.map((_, i) => triviaAnswers[i] ?? "") };
    }

    completeMutation.mutate(
      { id: task.id, data: body as any },
      {
        onSuccess: (res) => { toast({ title: `🎉 Task Complete!`, description: res.message }); onSuccess(); onClose(); },
        onError: (err: any) => {
          const message = err?.data?.message || err?.message?.replace(/^HTTP \d+ [^:]+:\s*/i, "") || "Failed to complete task.";
          toast({ title: "Task Failed", description: message, variant: "destructive" });
        },
      }
    );
  };

  const isSubmitDisabled =
    completeMutation.isPending ||
    (task.type === "video" && videoTime > 0) ||
    (task.type === "chat" && chatElapsed < 300);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md bg-card border border-border rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[92vh]">

        {/* Dialog header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center border", meta.bg, meta.border)}>
              <Icon className={cn("w-5 h-5", meta.color)} />
            </div>
            <div>
              <p className="text-foreground font-black text-sm leading-tight">{task.name}</p>
              <p className="text-muted-foreground text-[10px] uppercase tracking-widest">{meta.label} TASK · EASY</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-muted hover:bg-muted/80 flex items-center justify-center text-muted-foreground hover:text-foreground transition-all">
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
            <span className="text-muted-foreground text-[10px] font-bold">0/1 today</span>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

          {/* ── SURVEY ── */}
          {task.type === "survey" && SURVEY_QUESTIONS.map((q, i) => (
            <div key={q.id} className="bg-muted border border-border rounded-xl p-4">
              <p className="text-foreground text-xs font-bold mb-3">
                {i + 1}. {q.text} <span className="text-destructive">*</span>
              </p>
              {q.type === "choice" ? (
                <div className="space-y-2">
                  {q.options!.map((opt) => (
                    <button key={opt} type="button" onClick={() => setSurveyAnswers(p => ({ ...p, [q.id]: opt }))}
                      className={cn("w-full text-left px-4 py-2.5 rounded-lg border text-sm font-semibold transition-all",
                        surveyAnswers[q.id] === opt
                          ? "bg-primary/10 border-primary/30 text-primary"
                          : "bg-background border-border text-foreground hover:border-primary/20"
                      )}
                    >{opt}</button>
                  ))}
                </div>
              ) : (
                <input type="text" placeholder="Your answer..." value={surveyAnswers[q.id] ?? ""}
                  onChange={(e) => setSurveyAnswers(p => ({ ...p, [q.id]: e.target.value }))}
                  className="w-full bg-background border border-input rounded-lg px-3 py-2.5 text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-all"
                />
              )}
            </div>
          ))}

          {/* ── BLOG ── */}
          {task.type === "blogging" && (
            <>
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <PenSquare className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700 text-[10px] font-black uppercase tracking-widest">Writing Brief</span>
                </div>
                <p className="text-foreground text-xs font-bold">Topic: WRITE A BLOG ABOUT TECHNOLOGY</p>
                <p className="text-muted-foreground text-xs mt-1">Write a well-structured and informative blog post.</p>
                <p className="text-muted-foreground text-xs"><span className="text-foreground font-bold">Keywords:</span> Technology, Innovation</p>
                <p className="text-muted-foreground text-xs"><span className="text-foreground font-bold">Min:</span> 200 words</p>
              </div>
              <input type="text" placeholder="Your blog title..." value={blogTitle} onChange={(e) => setBlogTitle(e.target.value)}
                className="w-full bg-background border border-input rounded-xl px-4 py-3 text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-all"
              />
              <div className="relative">
                <textarea placeholder="Write your post here…" value={blogContent} onChange={(e) => setBlogContent(e.target.value)} rows={7}
                  className="w-full bg-background border border-input rounded-xl px-4 py-3 text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-all resize-none"
                />
                <p className={cn("text-right text-[10px] mt-1", wordCount >= 200 ? "text-emerald-600" : "text-muted-foreground")}>
                  Words: {wordCount} / min 200
                </p>
              </div>
            </>
          )}

          {/* ── VIDEO ── */}
          {task.type === "video" && (
            <>
              <div className="rounded-xl overflow-hidden border border-border">
                <iframe className="w-full aspect-video"
                  src="https://www.youtube.com/embed/inpok4MKVLM?autoplay=0" title="Watch and Earn"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen
                />
              </div>
              {!videoStarted ? (
                <button onClick={startVideo}
                  className="w-full py-3 rounded-xl font-bold text-sm text-primary-foreground bg-primary flex items-center justify-center gap-2">
                  <Play className="w-4 h-4" /> Start Watching (60s)
                </button>
              ) : (
                <div className={cn("flex items-center gap-2.5 px-4 py-3 rounded-xl border text-sm font-bold",
                  videoTime > 0 ? "bg-primary/5 border-primary/20 text-primary" : "bg-emerald-50 border-emerald-200 text-emerald-600"
                )}>
                  <Clock className="w-4 h-4 animate-pulse" />
                  {videoTime > 0
                    ? `Watching… ${String(Math.floor(videoTime / 60)).padStart(2, "0")}:${String(videoTime % 60).padStart(2, "0")} remaining`
                    : "✓ Viewing complete! Submit now."}
                </div>
              )}
              {videoStarted && videoTime > 0 && (
                <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <p className="text-amber-800 text-xs">Stay on this screen until the video completes.</p>
                </div>
              )}
            </>
          )}

          {/* ── TRIVIA ── */}
          {task.type === "trivia" && TRIVIA_QUESTIONS.map((q, i) => (
            <div key={q.id} className="bg-muted border border-border rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[9px] font-black bg-secondary/10 text-secondary border border-secondary/20 px-2 py-0.5 rounded-full uppercase">
                  Q{i + 1} of {TRIVIA_QUESTIONS.length}
                </span>
              </div>
              <p className="text-foreground text-sm font-bold mb-3">{q.text}</p>
              <div className="space-y-2">
                {q.options.map((opt) => (
                  <button key={opt.key} type="button" onClick={() => setTriviaAnswers(p => ({ ...p, [q.id]: opt.key }))}
                    className={cn("w-full flex items-center gap-3 px-4 py-2.5 rounded-lg border text-sm font-semibold text-left transition-all",
                      triviaAnswers[q.id] === opt.key
                        ? "bg-secondary/10 border-secondary/30 text-secondary"
                        : "bg-background border-border text-foreground hover:border-secondary/20"
                    )}
                  >
                    <span className={cn("w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-black flex-shrink-0",
                      triviaAnswers[q.id] === opt.key ? "bg-secondary/20 text-secondary" : "bg-muted text-muted-foreground"
                    )}>{opt.key}</span>
                    {opt.text}
                  </button>
                ))}
              </div>
            </div>
          ))}

          {/* ── CHAT ── */}
          {task.type === "chat" && (
            <div className="bg-muted border border-border rounded-xl p-5 text-center space-y-3">
              <MessageCircle className="w-10 h-10 text-rose-500 mx-auto" />
              <p className="text-muted-foreground text-sm leading-relaxed">
                Open the external platform, complete a full chat session (minimum 5 minutes), then submit.
              </p>
              {chatStartedAt !== null && (
                <div className={cn("rounded-lg px-4 py-2 text-sm font-bold",
                  chatElapsed >= 300
                    ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                    : "bg-amber-50 text-amber-700 border border-amber-200"
                )}>
                  {chatElapsed >= 300
                    ? `✓ Session complete — ${Math.floor(chatElapsed / 60)}m ${chatElapsed % 60}s`
                    : `Timer: ${Math.floor(chatElapsed / 60)}m ${chatElapsed % 60}s / 5m 00s`}
                </div>
              )}
              <a href="https://chat254.com/register.php" target="_blank" rel="noopener noreferrer" onClick={startChatTimer}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-primary-foreground bg-rose-500 transition-all active:scale-95">
                <ExternalLink className="w-4 h-4" />
                {chatStartedAt === null ? "Open Task Link" : "Open Again"}
              </a>
              {chatStartedAt === null && <p className="text-muted-foreground text-xs">Timer starts when you open the link</p>}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-5 py-4 border-t border-border flex-shrink-0">
          <button type="button" onClick={onClose}
            className="flex items-center gap-1.5 px-4 py-3 rounded-xl font-bold text-sm text-muted-foreground bg-muted border border-border hover:bg-muted/80 transition-all">
            <X className="w-3.5 h-3.5" /> Cancel
          </button>
          <button type="button" onClick={handleSubmit} disabled={isSubmitDisabled}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-black text-sm transition-all active:scale-[0.98]",
              isSubmitDisabled
                ? "bg-muted text-muted-foreground cursor-not-allowed"
                : "bg-primary text-primary-foreground shadow-sm"
            )}
          >
            {completeMutation.isPending
              ? <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
              : <Send className="w-4 h-4" />}
            {completeMutation.isPending ? "Submitting…" : "Submit Task"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Tasks Page ──────────────────────────────────────────────────────────
export default function Tasks() {
  const { data, isLoading, isError, refetch } = useGetTasks();
  const { fmt } = useCurrency();
  const queryClient = useQueryClient();

  const [filter, setFilter] = useState<FilterKey>("all");
  const [activeTask, setActiveTask] = useState<{ id: number; name: string; type: string; reward: number } | null>(null);

  const tasks = data?.tasks ?? [];
  const doneTodayCount = data?.doneTodayCount ?? 0;
  const totalEarned = tasks.reduce((sum, t) => t.doneToday ? sum + t.reward : sum, 0);
  const availableCount = tasks.filter(t => !t.doneToday).length;

  const typeCounts: Record<string, number> = {};
  tasks.forEach(t => { typeCounts[t.type] = (typeCounts[t.type] ?? 0) + 1; });

  const filteredTasks = filter === "all" ? tasks : tasks.filter(t => t.type === filter);

  const handleSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/wallet/balances"] });
    queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
    refetch();
  };

  return (
    <>
      {activeTask && (
        <TaskDialog task={activeTask} onClose={() => setActiveTask(null)} onSuccess={handleSuccess} />
      )}

      <div className="max-w-2xl mx-auto space-y-4">

        {/* Hero banner */}
        <div className="rounded-2xl p-5 relative overflow-hidden border border-primary/20 bg-gradient-to-br from-primary to-secondary shadow-sm">
          <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 blur-3xl rounded-full pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 blur-3xl rounded-full pointer-events-none" />

          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl">💸</span>
              <h1 className="text-white font-black text-xl">Earn Now</h1>
            </div>
            <p className="text-white/60 text-xs mb-4">Complete tasks and get paid instantly</p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { label: "Done",      value: doneTodayCount,  color: "text-white" },
                { label: "Earned",    value: fmt(totalEarned), color: "text-white" },
                { label: "Pending",   value: 0,               color: "text-white" },
                { label: "Available", value: availableCount,  color: "text-white" },
              ].map(s => (
                <div key={s.label} className="bg-white/15 border border-white/20 rounded-xl p-2.5 text-center">
                  <p className={cn("font-black text-xs sm:text-sm leading-none truncate", s.color)}>{String(s.value)}</p>
                  <p className="text-white/50 text-[9px] uppercase tracking-wide mt-1">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 flex-wrap">
          {FILTER_OPTIONS.map(({ key, label }) => {
            const count = key === "all" ? tasks.length : (typeCounts[key] ?? 0);
            return (
              <button key={key} onClick={() => setFilter(key)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold transition-all",
                  filter === key
                    ? "bg-primary/10 border-primary/30 text-primary shadow-sm"
                    : "bg-muted border-border text-muted-foreground hover:border-primary/20 hover:text-foreground"
                )}
              >
                {key !== "all" && (() => {
                  const m = TASK_META[key];
                  if (!m) return null;
                  const Ic = m.icon;
                  return <Ic className={cn("w-3 h-3", filter === key ? "text-primary" : m.color)} />;
                })()}
                {label} {count}
              </button>
            );
          })}
        </div>

        {/* Task list */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
          <div className="flex items-center gap-2 px-5 py-3.5 border-b border-border">
            <span className="w-2 h-2 rounded-sm bg-primary flex-shrink-0" />
            <span className="text-muted-foreground text-[10px] font-black uppercase tracking-widest">Featured</span>
          </div>

          {isLoading ? (
            <div className="py-12 flex justify-center">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : isError ? (
            <div className="py-12 flex flex-col items-center gap-3 text-center px-6">
              <AlertCircle className="w-8 h-8 text-destructive/60" />
              <p className="text-foreground text-sm font-semibold">Could not load tasks</p>
              <p className="text-muted-foreground text-xs">Your session may have expired. Please log out and log back in.</p>
              <button onClick={() => refetch()}
                className="mt-1 px-4 py-2 text-xs font-bold text-primary border border-primary/20 bg-primary/5 rounded-xl hover:bg-primary/10 transition-colors">
                Retry
              </button>
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">No tasks available</div>
          ) : (
            <div className="divide-y divide-border">
              {filteredTasks.map(task => {
                const meta = TASK_META[task.type] ?? TASK_META.survey!;
                const Icon = meta.icon;
                const done = task.doneToday ?? false;

                return (
                  <div key={task.id}
                    className={cn("flex items-center gap-3 px-5 py-4 transition-colors", done ? "opacity-50" : "hover:bg-muted/50")}
                  >
                    {/* Icon */}
                    <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 border", meta.bg, meta.border)}>
                      {done
                        ? <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        : <Icon className={cn("w-5 h-5", meta.color)} />}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-foreground font-black text-sm leading-tight">{task.name}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className={cn("text-[10px] font-black px-2 py-0.5 rounded-md border uppercase", meta.badge)}>
                          {meta.label}
                        </span>
                        <span className="text-muted-foreground text-[10px]">Easy</span>
                        <span className="flex items-center gap-1 text-muted-foreground text-[10px]">
                          <Users className="w-2.5 h-2.5" />
                          {task.availableCount.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* Reward + button */}
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <div className="text-right relative">
                        <span className="absolute -top-1.5 -right-1 text-[8px] font-black bg-orange-500 text-white px-1 rounded uppercase">Hot</span>
                        <p className="text-foreground font-black text-base leading-none pr-2">{fmt(task.reward)}</p>
                        <p className="text-muted-foreground text-[9px] uppercase tracking-wide pr-2">Reward</p>
                      </div>
                      {done ? (
                        <div className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                          <span className="text-emerald-600 text-[10px] font-bold">Done</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => setActiveTask({ id: task.id, name: task.name, type: task.type, reward: task.reward })}
                          className={cn("flex items-center gap-1 px-4 py-1.5 rounded-lg font-black text-xs transition-all active:scale-95 border", meta.bg, meta.border)}
                        >
                          <Zap className={cn("w-3 h-3", meta.color)} />
                          <span className={meta.color}>Start</span>
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
