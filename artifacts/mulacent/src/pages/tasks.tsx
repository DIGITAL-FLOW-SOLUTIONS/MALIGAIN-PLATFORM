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
  color: string; bg: string; border: string; glow: string;
  badge: string; icon: typeof BarChart3; label: string;
}> = {
  survey:   { color: "text-cyan-400",    bg: "bg-cyan-500/15",    border: "border-cyan-500/30",    glow: "shadow-cyan-500/30",    badge: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",    icon: BarChart3,    label: "SURVEY"  },
  blogging: { color: "text-emerald-400", bg: "bg-emerald-500/15", border: "border-emerald-500/30", glow: "shadow-emerald-500/30", badge: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30", icon: PenSquare, label: "BLOG"    },
  video:    { color: "text-orange-400",  bg: "bg-orange-500/15",  border: "border-orange-500/30",  glow: "shadow-orange-500/30",  badge: "bg-orange-500/20 text-orange-300 border-orange-500/30",  icon: Play,      label: "VIDEO"   },
  trivia:   { color: "text-violet-400",  bg: "bg-violet-500/15",  border: "border-violet-500/30",  glow: "shadow-violet-500/30",  badge: "bg-violet-500/20 text-violet-300 border-violet-500/30",  icon: Brain,     label: "TRIVIA"  },
  chat:     { color: "text-rose-400",    bg: "bg-rose-500/15",    border: "border-rose-500/30",    glow: "shadow-rose-500/30",    badge: "bg-rose-500/20 text-rose-300 border-rose-500/30",        icon: MessageCircle, label: "CHAT" },
};

// ─── Survey questions ─────────────────────────────────────────────────────────
const SURVEY_QUESTIONS = [
  { id: 0, text: "Do you earn money online?", type: "choice" as const, options: ["Yes", "No"] },
  { id: 1, text: "Which online earning method do you prefer?", type: "text" as const },
  { id: 2, text: "Are you satisfied with your current income?", type: "choice" as const, options: ["Yes", "No"] },
];

// ─── Trivia questions (client shows these; server validates answers) ──────────
const TRIVIA_QUESTIONS = [
  {
    id: 0, text: "What is the largest continent by area?",
    options: [{ key: "A", text: "Asia" }, { key: "B", text: "Africa" }, { key: "C", text: "Europe" }, { key: "D", text: "Antarctica" }],
    correct: "A",
  },
  {
    id: 1, text: "Which planet is known as the Red Planet?",
    options: [{ key: "A", text: "Venus" }, { key: "B", text: "Mars" }, { key: "C", text: "Jupiter" }, { key: "D", text: "Saturn" }],
    correct: "B",
  },
  {
    id: 2, text: "How many continents are there on Earth?",
    options: [{ key: "A", text: "5" }, { key: "B", text: "6" }, { key: "C", text: "7" }, { key: "D", text: "8" }],
    correct: "C",
  },
];

// ─── Filter tabs ──────────────────────────────────────────────────────────────
const FILTER_OPTIONS = [
  { key: "all", label: "All" },
  { key: "video", label: "Video" },
  { key: "survey", label: "Survey" },
  { key: "trivia", label: "Trivia" },
  { key: "blogging", label: "Blog" },
  { key: "chat", label: "Chat" },
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

  // Survey state
  const [surveyAnswers, setSurveyAnswers] = useState<Record<number, string>>({});

  // Blog state
  const [blogTitle, setBlogTitle] = useState("");
  const [blogContent, setBlogContent] = useState("");
  const wordCount = blogContent.trim().split(/\s+/).filter(Boolean).length;

  // Video state
  const [videoTime, setVideoTime] = useState(60);
  const [videoStarted, setVideoStarted] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Chat session timer — starts when user clicks the external link
  const [chatStartedAt, setChatStartedAt] = useState<number | null>(null);
  const [chatElapsed, setChatElapsed] = useState(0);
  const chatTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Trivia state
  const [triviaAnswers, setTriviaAnswers] = useState<Record<number, string>>({});

  // Start video countdown
  const startVideo = () => {
    setVideoStarted(true);
    timerRef.current = setInterval(() => {
      setVideoTime(t => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  };

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);
  useEffect(() => () => { if (chatTimerRef.current) clearInterval(chatTimerRef.current); }, []);

  const startChatTimer = () => {
    if (chatStartedAt !== null) return; // already started
    const startTime = Date.now();
    setChatStartedAt(startTime);
    chatTimerRef.current = setInterval(() => {
      setChatElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
  };

  const meta = TASK_META[task.type] ?? TASK_META.survey!;
  const Icon = meta.icon;

  const handleSubmit = () => {
    let body: Record<string, unknown> = {};

    if (task.type === "survey") {
      if (Object.keys(surveyAnswers).length < SURVEY_QUESTIONS.length) {
        toast({ title: "Incomplete", description: "Please answer all questions.", variant: "destructive" });
        return;
      }
      body = { answers: Object.values(surveyAnswers) };
    } else if (task.type === "blogging") {
      if (!blogTitle.trim()) {
        toast({ title: "Missing title", description: "Please add a blog title.", variant: "destructive" });
        return;
      }
      if (wordCount < 200) {
        toast({ title: "Too short", description: `Write at least 200 words. (${wordCount}/200)`, variant: "destructive" });
        return;
      }
      body = { title: blogTitle, content: blogContent };
    } else if (task.type === "video") {
      if (videoTime > 0) {
        toast({ title: "Keep watching", description: "Wait for the countdown to finish.", variant: "destructive" });
        return;
      }
      body = { watchedSeconds: 60 };
    } else if (task.type === "chat") {
      if (chatElapsed < 300) {
        const remaining = 300 - chatElapsed;
        const mins = Math.floor(remaining / 60);
        const secs = remaining % 60;
        toast({
          title: "Session too short",
          description: `Please complete at least 5 minutes on the platform. ${mins}m ${secs}s remaining.`,
          variant: "destructive",
        });
        return;
      }
      body = { sessionDuration: chatElapsed };
    } else if (task.type === "trivia") {
      if (Object.keys(triviaAnswers).length < TRIVIA_QUESTIONS.length) {
        toast({ title: "Incomplete", description: "Please answer all questions.", variant: "destructive" });
        return;
      }
      body = { answers: TRIVIA_QUESTIONS.map((_, i) => triviaAnswers[i] ?? "") };
    }

    completeMutation.mutate(
      { id: task.id, data: body as { answers?: string[]; title?: string; content?: string; watchedSeconds?: number; sessionDuration?: number } },
      {
        onSuccess: (res) => {
          toast({ title: `🎉 Task Complete!`, description: res.message });
          onSuccess();
          onClose();
        },
        onError: (err: any) => {
          const message = err?.data?.message || err?.message?.replace(/^HTTP \d+ [^:]+:\s*/i, "") || "Failed to complete task.";
          toast({ title: "Task Failed", description: message, variant: "destructive" });
        },
      }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-md bg-[#1a0508] border border-red-900/20 rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[92vh]">

        {/* Dialog header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-white/8 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", meta.bg, meta.border, "border")}>
              <Icon className={cn("w-5 h-5", meta.color)} />
            </div>
            <div>
              <p className="text-white font-black text-sm leading-tight">{task.name}</p>
              <p className="text-slate-500 text-[10px] uppercase tracking-widest">{meta.label} TASK · EASY</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-white/8 hover:bg-white/15 flex items-center justify-center text-slate-400 hover:text-white transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Reward bar */}
        <div className="flex items-center justify-between px-5 py-3 bg-white/3 border-b border-white/5 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
              <Trophy className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <p className="text-white font-black text-base leading-none">{fmt(task.reward)}</p>
              <p className="text-slate-600 text-[9px] uppercase tracking-wide">Reward</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5">
            <Clock className="w-3 h-3 text-slate-500" />
            <span className="text-slate-400 text-[10px] font-bold">0/1 today</span>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

          {/* ── SURVEY ── */}
          {task.type === "survey" && SURVEY_QUESTIONS.map((q, i) => (
            <div key={q.id} className="bg-white/4 border border-white/8 rounded-xl p-4">
              <p className="text-slate-300 text-xs font-bold mb-3">
                {i + 1}. {q.text} <span className="text-rose-400">*</span>
              </p>
              {q.type === "choice" ? (
                <div className="space-y-2">
                  {q.options!.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setSurveyAnswers(p => ({ ...p, [q.id]: opt }))}
                      className={cn(
                        "w-full text-left px-4 py-2.5 rounded-lg border text-sm font-semibold transition-all",
                        surveyAnswers[q.id] === opt
                          ? "bg-cyan-500/20 border-cyan-500/50 text-cyan-300"
                          : "bg-white/4 border-white/10 text-slate-300 hover:border-white/20"
                      )}
                    >{opt}</button>
                  ))}
                </div>
              ) : (
                <input
                  type="text"
                  placeholder="Your answer..."
                  value={surveyAnswers[q.id] ?? ""}
                  onChange={(e) => setSurveyAnswers(p => ({ ...p, [q.id]: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50 transition-all"
                />
              )}
            </div>
          ))}

          {/* ── BLOG ── */}
          {task.type === "blogging" && (
            <>
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <PenSquare className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400 text-[10px] font-black uppercase tracking-widest">Writing Brief</span>
                </div>
                <p className="text-white text-xs font-bold">Topic: WRITE A BLOG ABOUT TECHNOLOGY</p>
                <p className="text-slate-400 text-xs mt-1">Write a well-structured and informative blog post.</p>
                <p className="text-slate-400 text-xs"><span className="text-white font-bold">Keywords:</span> Technology, Innovation</p>
                <p className="text-slate-400 text-xs"><span className="text-white font-bold">Min:</span> 200 words</p>
              </div>
              <input
                type="text"
                placeholder="Your blog title..."
                value={blogTitle}
                onChange={(e) => setBlogTitle(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/50 transition-all"
              />
              <div className="relative">
                <textarea
                  placeholder="Write your post here…"
                  value={blogContent}
                  onChange={(e) => setBlogContent(e.target.value)}
                  rows={7}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-emerald-500/50 transition-all resize-none"
                />
                <p className={cn("text-right text-[10px] mt-1", wordCount >= 200 ? "text-emerald-400" : "text-slate-500")}>
                  Words: {wordCount} / min 200
                </p>
              </div>
            </>
          )}

          {/* ── VIDEO ── */}
          {task.type === "video" && (
            <>
              <div className="rounded-xl overflow-hidden border border-white/10">
                <iframe
                  className="w-full aspect-video"
                  src="https://www.youtube.com/embed/inpok4MKVLM?autoplay=0"
                  title="Watch and Earn"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
              {!videoStarted ? (
                <button
                  onClick={startVideo}
                  className="w-full py-3 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2"
                  style={{ background: "linear-gradient(135deg, #ea580c 0%, #f59e0b 100%)" }}
                >
                  <Play className="w-4 h-4" /> Start Watching (60s)
                </button>
              ) : (
                <div className={cn(
                  "flex items-center gap-2.5 px-4 py-3 rounded-xl border text-sm font-bold",
                  videoTime > 0
                    ? "bg-blue-500/10 border-blue-500/30 text-blue-400"
                    : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                )}>
                  <Clock className="w-4 h-4 animate-pulse" />
                  {videoTime > 0
                    ? `Watching… ${String(Math.floor(videoTime / 60)).padStart(2, "0")}:${String(videoTime % 60).padStart(2, "0")} remaining`
                    : "✓ Viewing complete! Submit now."}
                </div>
              )}
              {videoStarted && videoTime > 0 && (
                <div className="flex items-start gap-2 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2.5">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <p className="text-amber-300 text-xs">Stay on this screen until the video completes.</p>
                </div>
              )}
            </>
          )}

          {/* ── TRIVIA ── */}
          {task.type === "trivia" && TRIVIA_QUESTIONS.map((q, i) => (
            <div key={q.id} className="bg-white/4 border border-white/8 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[9px] font-black bg-violet-500/30 text-violet-300 border border-violet-500/40 px-2 py-0.5 rounded-full uppercase">
                  Q{i + 1} of {TRIVIA_QUESTIONS.length}
                </span>
              </div>
              <p className="text-white text-sm font-bold mb-3">{q.text}</p>
              <div className="space-y-2">
                {q.options.map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setTriviaAnswers(p => ({ ...p, [q.id]: opt.key }))}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-2.5 rounded-lg border text-sm font-semibold text-left transition-all",
                      triviaAnswers[q.id] === opt.key
                        ? "bg-violet-500/20 border-violet-500/50 text-violet-300"
                        : "bg-white/4 border-white/10 text-slate-300 hover:border-white/20"
                    )}
                  >
                    <span className={cn(
                      "w-6 h-6 rounded-md flex items-center justify-center text-[10px] font-black flex-shrink-0",
                      triviaAnswers[q.id] === opt.key
                        ? "bg-violet-500/40 text-violet-200"
                        : "bg-white/8 text-slate-500"
                    )}>{opt.key}</span>
                    {opt.text}
                  </button>
                ))}
              </div>
            </div>
          ))}

          {/* ── CHAT ── */}
          {task.type === "chat" && (
            <div className="bg-white/4 border border-white/8 rounded-xl p-5 text-center space-y-3">
              <MessageCircle className="w-10 h-10 text-rose-400 mx-auto" />
              <p className="text-slate-300 text-sm leading-relaxed">
                Open the external platform, complete a full chat session (minimum 5 minutes), then submit.
              </p>
              {chatStartedAt !== null && (
                <div className={cn(
                  "rounded-lg px-4 py-2 text-sm font-bold",
                  chatElapsed >= 300
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                    : "bg-amber-500/15 text-amber-300 border border-amber-500/30"
                )}>
                  {chatElapsed >= 300
                    ? `✓ Session complete — ${Math.floor(chatElapsed / 60)}m ${chatElapsed % 60}s`
                    : `Timer: ${Math.floor(chatElapsed / 60)}m ${chatElapsed % 60}s / 5m 00s`}
                </div>
              )}
              <a
                href="https://chat254.com/register.php"
                target="_blank"
                rel="noopener noreferrer"
                onClick={startChatTimer}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-white transition-all active:scale-95"
                style={{ background: "linear-gradient(135deg, #e11d48 0%, #9333ea 100%)" }}
              >
                <ExternalLink className="w-4 h-4" />
                {chatStartedAt === null ? "Open Task Link" : "Open Again"}
              </a>
              {chatStartedAt === null && (
                <p className="text-slate-500 text-xs">Timer starts when you open the link</p>
              )}
            </div>
          )}
        </div>

        {/* Footer buttons */}
        <div className="flex gap-3 px-5 py-4 border-t border-white/8 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1.5 px-4 py-3 rounded-xl font-bold text-sm text-slate-400 bg-white/5 border border-white/10 hover:bg-white/10 transition-all"
          >
            <X className="w-3.5 h-3.5" /> Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={
              completeMutation.isPending ||
              (task.type === "video" && videoTime > 0) ||
              (task.type === "chat" && chatElapsed < 300)
            }
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-black text-sm text-white transition-all active:scale-[0.98]",
              completeMutation.isPending ||
              (task.type === "video" && videoTime > 0) ||
              (task.type === "chat" && chatElapsed < 300)
                ? "bg-white/10 text-slate-500 cursor-not-allowed"
                : ""
            )}
            style={
              completeMutation.isPending ||
              (task.type === "video" && videoTime > 0) ||
              (task.type === "chat" && chatElapsed < 300)
                ? {}
                : { background: "linear-gradient(135deg, #a21caf 0%, #7c3aed 100%)" }
            }
          >
            {completeMutation.isPending ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
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
  const pendingCount = 0;
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
        <TaskDialog
          task={activeTask}
          onClose={() => setActiveTask(null)}
          onSuccess={handleSuccess}
        />
      )}

      <div className="max-w-2xl mx-auto space-y-4">

        {/* Hero banner */}
        <div
          className="rounded-2xl p-5 relative overflow-hidden border border-white/8"
          style={{ background: "linear-gradient(135deg, #0a1f35 0%, #0e0a1f 50%, #1a0a0f 100%)" }}
        >
          <div className="absolute top-0 right-0 w-48 h-48 bg-cyan-500/10 blur-3xl rounded-full pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-rose-500/10 blur-3xl rounded-full pointer-events-none" />

          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xl">💸</span>
              <h1 className="text-white font-black text-xl">Earn Now</h1>
            </div>
            <p className="text-slate-500 text-xs mb-4">Complete tasks and get paid instantly</p>

            {/* Stats grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { label: "Done",      value: doneTodayCount,          color: "text-emerald-400" },
                { label: "Earned",    value: fmt(totalEarned),         color: "text-cyan-400"    },
                { label: "Pending",   value: pendingCount,             color: "text-amber-400"   },
                { label: "Available", value: availableCount,           color: "text-violet-400"  },
              ].map(s => (
                <div key={s.label} className="bg-black/30 border border-white/6 rounded-xl p-2.5 text-center">
                  <p className={cn("font-black text-xs sm:text-sm leading-none truncate", s.color)}>{s.value}</p>
                  <p className="text-slate-600 text-[9px] uppercase tracking-wide mt-1">{s.label}</p>
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
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold transition-all",
                  filter === key
                    ? "bg-cyan-500/20 border-cyan-500/40 text-cyan-300 shadow-sm shadow-cyan-500/20"
                    : "bg-white/5 border-white/10 text-slate-400 hover:border-white/20 hover:text-slate-300"
                )}
              >
                {key !== "all" && (() => {
                  const m = TASK_META[key];
                  if (!m) return null;
                  const Ic = m.icon;
                  return <Ic className={cn("w-3 h-3", filter === key ? "text-cyan-400" : m.color)} />;
                })()}
                {label} {count}
              </button>
            );
          })}
        </div>

        {/* Task list */}
        <div className="bg-[#0e0a1f] border border-purple-900/40 rounded-2xl overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3.5 border-b border-white/5">
            <span className="w-2 h-2 rounded-sm bg-orange-500" />
            <span className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Featured</span>
          </div>

          {isLoading ? (
            <div className="py-12 flex justify-center">
              <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : isError ? (
            <div className="py-12 flex flex-col items-center gap-3 text-center px-6">
              <AlertCircle className="w-8 h-8 text-red-400/60" />
              <p className="text-slate-400 text-sm font-semibold">Could not load tasks</p>
              <p className="text-slate-600 text-xs">Your session may have expired. Please log out and log back in.</p>
              <button
                onClick={() => refetch()}
                className="mt-1 px-4 py-2 text-xs font-bold text-cyan-300 border border-cyan-500/30 bg-cyan-500/10 rounded-xl hover:bg-cyan-500/20 transition-colors"
              >
                Retry
              </button>
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-sm">No tasks available</div>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {filteredTasks.map(task => {
                const meta = TASK_META[task.type] ?? TASK_META.survey!;
                const Icon = meta.icon;
                const done = task.doneToday ?? false;

                return (
                  <div
                    key={task.id}
                    className={cn(
                      "flex items-center gap-3 px-5 py-4 transition-colors",
                      done ? "opacity-50" : "hover:bg-white/[0.02]"
                    )}
                  >
                    {/* Icon */}
                    <div className={cn(
                      "w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 border shadow-md",
                      meta.bg, meta.border, meta.glow
                    )}>
                      {done
                        ? <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        : <Icon className={cn("w-5 h-5", meta.color)} />}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-black text-sm leading-tight">{task.name}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className={cn("text-[10px] font-black px-2 py-0.5 rounded-md border uppercase", meta.badge)}>
                          {meta.label}
                        </span>
                        <span className="text-slate-500 text-[10px]">Easy</span>
                        <span className="flex items-center gap-1 text-slate-500 text-[10px]">
                          <Users className="w-2.5 h-2.5" />
                          {task.availableCount.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* Reward + button */}
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <div className="text-right relative">
                        <span className="absolute -top-1.5 -right-1 text-[8px] font-black bg-orange-500 text-white px-1 rounded uppercase">Hot</span>
                        <p className="text-white font-black text-base leading-none pr-2">{fmt(task.reward)}</p>
                        <p className="text-slate-600 text-[9px] uppercase tracking-wide pr-2">Reward</p>
                      </div>
                      {done ? (
                        <div className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400 text-[10px] font-bold">Done</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => setActiveTask({ id: task.id, name: task.name, type: task.type, reward: task.reward })}
                          className={cn(
                            "flex items-center gap-1 px-4 py-1.5 rounded-lg font-black text-xs text-white transition-all active:scale-95 shadow-md",
                            meta.bg.replace("/15", "/30"), "border", meta.border
                          )}
                          style={{ background: "none" }}
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
