import { useState } from "react";
import { useGetTasks, useStartTask, useGetWalletBalances } from "@workspace/api-client-react";
import { MessageCircle, Search, Clock, Gift, RefreshCw, ArrowLeft, Users, Lightbulb, X } from "lucide-react";
import { useCurrency } from "@/hooks/use-currency";
import { cn } from "@/lib/utils";

const STEPS = [
  { icon: MessageCircle, label: "Tap a task slot" },
  { icon: Search, label: "System finds a foreigner" },
  { icon: Clock, label: "Chat for the duration" },
  { icon: Gift, label: "Earn your reward" },
];

function BusyDialog({ onRetry, onClose }: { onRetry: () => void; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-sm bg-card border border-border rounded-2xl p-7 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-7 h-7 rounded-lg bg-muted hover:bg-muted/80 flex items-center justify-center text-muted-foreground hover:text-foreground transition-all"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex flex-col items-center text-center gap-4">
          <div className="text-5xl">😔</div>

          <div>
            <h3 className="text-foreground font-black text-xl mb-2">Everyone's Busy!</h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              All available foreigners are currently chatting with other members. Please check again in a few minutes.
            </p>
          </div>

          <div className="w-full bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-2.5 text-left dark:bg-amber-500/10 dark:border-amber-500/25">
            <Lightbulb className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-amber-700 dark:text-amber-300 text-sm">
              <span className="font-bold">Tip:</span> You can do other tasks and come back later. Stay active in the group for quick updates.
            </p>
          </div>

          <button
            onClick={onRetry}
            className="w-full py-3 rounded-xl font-bold text-primary-foreground text-sm flex items-center justify-center gap-2 transition-all active:scale-95 bg-primary hover:opacity-90 shadow-sm"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>

          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl font-bold text-muted-foreground text-sm flex items-center justify-center gap-2 bg-muted border border-border hover:bg-muted/80 transition-all active:scale-95"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Tasks
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ChatForeigners() {
  const { data: taskData, isLoading } = useGetTasks();
  const { data: wallet } = useGetWalletBalances();
  const startTaskMutation = useStartTask();
  const { fmt } = useCurrency();

  const [showBusy, setShowBusy] = useState(false);
  const [startingId, setStartingId] = useState<number | null>(null);

  const chatTasks = taskData?.tasks?.filter((t) => t.type === "chat") || [];
  const totalEarned = wallet?.todayEarnings ?? 0;

  const handleStart = (id: number) => {
    setStartingId(id);
    startTaskMutation.mutate(
      { id },
      {
        onSuccess: () => {
          setStartingId(null);
          setShowBusy(true);
        },
        onError: () => {
          setStartingId(null);
          setShowBusy(true);
        },
      }
    );
  };

  const handleRetry = () => {
    setShowBusy(false);
    if (chatTasks[0]) handleStart(chatTasks[0].id);
  };

  return (
    <>
      {showBusy && (
        <BusyDialog onRetry={handleRetry} onClose={() => setShowBusy(false)} />
      )}

      <div className="space-y-5">
        {/* Header Banner */}
        <div
          className="rounded-2xl p-6 relative overflow-hidden"
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
            <div className="absolute top-0 right-0 w-72 h-72 bg-white/10 blur-3xl rounded-full" />
            <div className="absolute bottom-0 left-0 w-56 h-48 bg-indigo-300/20 blur-3xl rounded-full" />
          </div>

          <div className="relative z-10">
            {/* Globe icon */}
            <div className="w-16 h-16 rounded-2xl bg-white/20 border border-white/30 flex items-center justify-center mb-4 shadow-lg">
              <span className="text-3xl">🌐</span>
            </div>

            <h1 className="text-2xl font-display font-black text-white mb-1.5">Chat with Foreigners</h1>
            <p className="text-white/70 text-sm mb-6 max-w-xl">
              Connect with lonely foreigners around the world, have a friendly conversation and earn rewards for every completed chat session.
            </p>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-black/20 border border-white/20 rounded-xl px-2 py-3 text-center">
                <p className="text-white font-black text-xl leading-none">{chatTasks.length}</p>
                <p className="text-white/50 text-[10px] uppercase tracking-widest mt-1.5">Tasks</p>
              </div>
              <div className="bg-black/20 border border-white/20 rounded-xl px-2 py-3 text-center">
                <p className="text-white font-black text-xl leading-none">0</p>
                <p className="text-white/50 text-[10px] uppercase tracking-widest mt-1.5">Done</p>
              </div>
              <div className="bg-black/20 border border-white/20 rounded-xl px-2 py-3 text-center overflow-hidden">
                <p className="text-yellow-300 font-black text-sm sm:text-lg leading-none truncate">{fmt(totalEarned)}</p>
                <p className="text-white/50 text-[10px] uppercase tracking-widest mt-1.5">Earned</p>
              </div>
            </div>
          </div>
        </div>

        {/* Steps */}
        <div className="flex gap-2 flex-wrap">
          {STEPS.map((step, i) => (
            <div
              key={i}
              className="flex items-center gap-2 bg-muted border border-border rounded-full px-3.5 py-2"
            >
              <div className="w-5 h-5 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                <step.icon className="w-3 h-3 text-primary" />
              </div>
              <span className="text-muted-foreground text-xs font-medium">{step.label}</span>
            </div>
          ))}
        </div>

        {/* Available Sessions */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
          <div className="px-5 py-3.5 border-b border-border">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/80 animate-pulse" />
              <span className="text-muted-foreground text-[10px] font-bold uppercase tracking-widest">Available Sessions</span>
            </div>
          </div>

          {isLoading ? (
            <div className="p-10 flex justify-center">
              <div className="w-8 h-8 border-[3px] border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : chatTasks.length === 0 ? (
            <div className="px-5 py-14 flex flex-col items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-muted border border-border flex items-center justify-center">
                <MessageCircle className="w-7 h-7 text-muted-foreground" />
              </div>
              <p className="text-foreground font-semibold text-sm">No sessions available</p>
              <p className="text-muted-foreground text-xs">Check back later for new chat opportunities.</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {chatTasks.map((task, idx) => (
                <div key={task.id} className="flex items-center gap-4 px-5 py-4 hover:bg-muted/50 transition-colors">
                  {/* Status dot + number */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/60" />
                    <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                      <span className="text-primary font-bold text-sm">{String(idx + 1).padStart(2, "0")}</span>
                    </div>
                  </div>

                  {/* Task info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-foreground font-semibold text-sm">{task.name}</p>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className="flex items-center gap-1 text-[10px] font-bold bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full uppercase tracking-wide">
                        <MessageCircle className="w-2.5 h-2.5" /> Chat
                      </span>
                      <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Users className="w-3 h-3" />
                        {task.availableCount.toLocaleString()} sessions
                      </span>
                    </div>
                  </div>

                  {/* Price + Start */}
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <div className="text-right">
                      <p className="text-[9px] text-muted-foreground uppercase tracking-widest">Client Pays</p>
                      <p className="text-amber-500 font-black text-base leading-none">{fmt(task.reward)}</p>
                      <p className="text-muted-foreground text-[9px] uppercase tracking-widest">Per session</p>
                    </div>
                    <button
                      onClick={() => handleStart(task.id)}
                      disabled={startingId === task.id}
                      className={cn(
                        "flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-sm transition-all active:scale-95",
                        startingId === task.id
                          ? "bg-primary/30 text-primary cursor-not-allowed"
                          : "bg-primary hover:opacity-90 text-primary-foreground shadow-sm"
                      )}
                    >
                      {startingId === task.id ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <span>▶</span>
                      )}
                      Start
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* How it works note */}
        <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
            </div>
            <span className="text-foreground font-bold text-sm">How Chat Sessions Work</span>
          </div>
          <ul className="space-y-2 text-sm">
            {[
              "Tap Start on any available session to let the system find you a foreigner.",
              "Be polite, friendly and engaging — the foreigner rates your conversation.",
              "You earn the session reward once the chat is completed and verified.",
              "Sessions are 15–30 minutes long. Stay online for the full duration.",
            ].map((note, i) => (
              <li key={i} className="flex items-start gap-2.5 text-muted-foreground">
                <span className="w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0 mt-1.5" />
                {note}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}
