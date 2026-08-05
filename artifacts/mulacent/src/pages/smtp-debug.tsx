import { useState, useEffect, useRef } from "react";
import { Send, Terminal, Wifi, WifiOff, Loader2, Copy, Trash2, Mail, MessageSquare, CheckCircle2, XCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface LogEntry {
  ts: string;
  level: "INFO" | "SUCCESS" | "ERROR" | "SMTP";
  msg: string;
}

interface Config {
  provider: string;
  from: string;
  apiKeySet: boolean;
  apiKeySource: string | null;
  appUrl: string;
}

const LEVEL_STYLE: Record<string, { color: string; icon: typeof Info }> = {
  INFO:    { color: "text-slate-400",   icon: Info },
  SUCCESS: { color: "text-emerald-400", icon: CheckCircle2 },
  ERROR:   { color: "text-red-400",     icon: XCircle },
  SMTP:    { color: "text-cyan-400",    icon: Terminal },
};

function LogLine({ entry }: { entry: LogEntry }) {
  const { color, icon: Icon } = LEVEL_STYLE[entry.level] ?? LEVEL_STYLE.INFO;
  const time = new Date(entry.ts).toLocaleTimeString("en-US", { hour12: false });
  return (
    <div className="flex items-start gap-2 py-0.5">
      <span className="text-slate-600 text-[11px] font-mono flex-shrink-0 mt-0.5">{time}</span>
      <Icon className={cn("w-3 h-3 flex-shrink-0 mt-0.5", color)} />
      <span className={cn("text-[12px] font-mono break-all leading-snug", color)}>{entry.msg}</span>
    </div>
  );
}

export default function SmtpDebug() {
  const [to, setTo] = useState("");
  const [message, setMessage] = useState("Hello from MALIGAIN SMTP Debug Tool! This is a test email to verify the SMTP configuration is working correctly.");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState<Config | null>(null);
  const [configLoading, setConfigLoading] = useState(true);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? "";

  useEffect(() => {
    fetch(`${BASE}/api/smtp/config`)
      .then((r) => r.json())
      .then(setConfig)
      .catch(() => setConfig(null))
      .finally(() => setConfigLoading(false));
  }, [BASE]);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const pushLog = (level: LogEntry["level"], msg: string) =>
    setLogs((prev) => [...prev, { ts: new Date().toISOString(), level, msg }]);

  const handleSend = async () => {
    if (!to.trim() || loading) return;
    setLoading(true);
    pushLog("INFO", `Initiating SMTP test → ${to}`);

    try {
      const res = await fetch(`${BASE}/api/smtp/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: to.trim(), message: message.trim() }),
      });
      const data = await res.json();
      const serverLogs: LogEntry[] = data.logs ?? [];
      setLogs((prev) => [...prev, ...serverLogs]);
    } catch (err: any) {
      pushLog("ERROR", `Request failed: ${err?.message ?? err}`);
    } finally {
      setLoading(false);
    }
  };

  const copyLogs = () => {
    const text = logs.map((l) => `[${l.ts}] [${l.level}] ${l.msg}`).join("\n");
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="min-h-screen bg-[#0d0518] p-4 sm:p-6" style={{ fontFamily: "system-ui, sans-serif" }}>
      <div className="max-w-2xl mx-auto space-y-4">

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-600 flex items-center justify-center flex-shrink-0 shadow-lg shadow-violet-500/30">
            <Terminal className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-white font-black text-lg leading-none">SMTP Debug</h1>
            <p className="text-slate-500 text-xs mt-0.5">Test email delivery · MALIGAIN</p>
          </div>
          <div className="ml-auto">
            <span className="text-[10px] font-bold text-amber-400 bg-amber-500/15 border border-amber-500/25 px-2.5 py-1 rounded-full uppercase tracking-wide">
              Dev Tool
            </span>
          </div>
        </div>

        {/* SMTP Config Card */}
        <div className="bg-[#1a0508] border border-red-900/20 rounded-2xl overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5">
            <div className="w-2 h-2 rounded-full bg-blue-400" />
            <span className="text-white font-bold text-xs uppercase tracking-wider">Live SMTP Configuration</span>
          </div>
          {configLoading ? (
            <div className="px-4 py-4 flex items-center gap-2 text-slate-500 text-xs">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading config from server…
            </div>
          ) : config ? (
            <div className="px-4 py-3 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
              {[
                { key: "Provider",   val: config.provider },
                { key: "From",       val: config.from },
                { key: "API Key",    val: config.apiKeySet ? `✓ Set${config.apiKeySource ? ` (${config.apiKeySource})` : ""}` : "✗ NOT SET — emails will fail" },
                { key: "APP URL",    val: config.appUrl },
              ].map(({ key, val }) => (
                <div key={key} className="flex items-center gap-2">
                  <span className="text-slate-600 text-[11px] font-mono w-20 flex-shrink-0">{key}</span>
                  <span className={cn(
                    "text-[12px] font-mono truncate",
                    key === "API Key" && !config.apiKeySet ? "text-red-400 font-bold" :
                    key === "API Key" ? "text-emerald-400" : "text-slate-300"
                  )}>{val}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="px-4 py-3 flex items-center gap-2 text-red-400 text-xs">
              <WifiOff className="w-3.5 h-3.5" /> Could not load config from server
            </div>
          )}
          {config && (
            <div className={cn(
              "flex items-center gap-2 px-4 py-2.5 border-t border-white/5 text-xs font-semibold",
              config.apiKeySet ? "text-emerald-400" : "text-red-400"
            )}>
              {config.apiKeySet ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
              {config.apiKeySet ? "Resend configuration looks complete — ready to test" : "Resend API key is not set — set RESEND_API_KEY or SMTP_PASS in environment variables"}
            </div>
          )}
        </div>

        {/* Test Form */}
        <div className="bg-[#1a0508] border border-red-900/20 rounded-2xl overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-white/5">
            <div className="w-2 h-2 rounded-full bg-violet-400" />
            <span className="text-white font-bold text-xs uppercase tracking-wider">Send Test Email</span>
          </div>
          <div className="p-4 space-y-3">
            {/* Recipient */}
            <div>
              <label className="flex items-center gap-1.5 text-[10px] font-bold text-red-400/70 uppercase tracking-widest mb-1.5">
                <Mail className="w-3 h-3" /> Recipient Email
              </label>
              <input
                type="email"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="recipient@example.com"
                className="w-full bg-[#0d0508] border border-red-900/30 rounded-xl py-3 px-4 text-white text-sm focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 transition-all placeholder:text-slate-600"
              />
            </div>

            {/* Message */}
            <div>
              <label className="flex items-center gap-1.5 text-[10px] font-bold text-red-400/70 uppercase tracking-widest mb-1.5">
                <MessageSquare className="w-3 h-3" /> Message
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                className="w-full bg-[#0d0508] border border-red-900/30 rounded-xl py-3 px-4 text-white text-sm focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 transition-all placeholder:text-slate-600 resize-none"
              />
            </div>

            <button
              onClick={handleSend}
              disabled={loading || !to.trim()}
              className={cn(
                "w-full py-3.5 rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98]",
                loading || !to.trim()
                  ? "bg-white/5 border border-white/8 text-slate-500 cursor-not-allowed"
                  : "text-white shadow-lg shadow-violet-500/25"
              )}
              style={loading || !to.trim() ? {} : { background: "linear-gradient(135deg, #7c3aed 0%, #2563eb 100%)" }}
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
              {loading ? "Sending…" : "Send Test Email"}
            </button>
          </div>
        </div>

        {/* Logs Terminal */}
        <div className="bg-[#0a0212] border border-white/8 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/8">
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
              </div>
              <span className="text-slate-500 text-[11px] font-mono ml-1">smtp-debug.log</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-600 text-[10px] font-mono">{logs.length} lines</span>
              <button
                onClick={copyLogs}
                disabled={logs.length === 0}
                className="flex items-center gap-1 text-slate-500 hover:text-slate-300 disabled:opacity-30 transition-colors text-[10px] font-bold uppercase tracking-wide"
              >
                <Copy className="w-3 h-3" /> Copy
              </button>
              <button
                onClick={() => setLogs([])}
                disabled={logs.length === 0}
                className="flex items-center gap-1 text-slate-500 hover:text-red-400 disabled:opacity-30 transition-colors text-[10px] font-bold uppercase tracking-wide"
              >
                <Trash2 className="w-3 h-3" /> Clear
              </button>
            </div>
          </div>

          <div className="h-80 overflow-y-auto px-4 py-3 space-y-0.5" style={{ scrollbarWidth: "thin", scrollbarColor: "#3f3f5a #0a0212" }}>
            {logs.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center gap-3 text-center">
                <Terminal className="w-8 h-8 text-slate-700" />
                <p className="text-slate-600 text-xs font-mono">No logs yet — send a test email to see output here</p>
              </div>
            ) : (
              logs.map((entry, i) => <LogLine key={i} entry={entry} />)
            )}
            <div ref={logsEndRef} />
          </div>

          {logs.length > 0 && (
            <div className="px-4 py-2 border-t border-white/5 flex items-center gap-2">
              <span className="text-[10px] font-mono text-emerald-500/60 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/60 animate-pulse inline-block" />
                {logs.filter(l => l.level === "SUCCESS").length} success ·{" "}
                {logs.filter(l => l.level === "ERROR").length} error ·{" "}
                {logs.filter(l => l.level === "INFO").length} info
              </span>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-slate-700 pb-2">
          MALIGAIN Debug Tool · Not visible to users
        </p>
      </div>
    </div>
  );
}
