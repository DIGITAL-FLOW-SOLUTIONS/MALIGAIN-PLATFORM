import { useState } from "react";
import { useAdmin } from "@/hooks/useAdmin";
import { Shield } from "lucide-react";

const BG = `linear-gradient(145deg, #1e1650 0%, #2d2096 25%, #1e3a8a 60%, #1e40af 100%)`;

export default function Login() {
  const { login } = useAdmin();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(username, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex" style={{ background: "#f0f4ff" }}>

      {/* ── Decorative left panel ─────────────────────────────────────── */}
      <div
        className="hidden lg:flex lg:w-[46%] xl:w-[42%] flex-col items-center justify-center px-10 relative overflow-hidden"
        style={{ background: BG }}
      >
        {/* Topo lines */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='600'%3E%3Cg fill='none' stroke='rgba(255,255,255,0.07)' stroke-width='1'%3E%3Cellipse cx='300' cy='300' rx='280' ry='140'/%3E%3Cellipse cx='300' cy='300' rx='240' ry='110'/%3E%3Cellipse cx='300' cy='300' rx='200' ry='82'/%3E%3Cellipse cx='300' cy='300' rx='160' ry='56'/%3E%3Cellipse cx='140' cy='460' rx='200' ry='100'/%3E%3Cellipse cx='460' cy='140' rx='220' ry='110'/%3E%3C/g%3E%3C/svg%3E")`,
            backgroundSize: "600px 600px",
            backgroundPosition: "center",
          }}
        />
        <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(ellipse 70% 50% at 50% 0%, rgba(91,141,238,0.18) 0%, transparent 65%)" }} />

        <div className="relative z-10 text-center max-w-xs">
          <div
            className="mx-auto mb-6 flex items-center justify-center rounded-2xl"
            style={{ width: 80, height: 80, background: "rgba(91,141,238,0.15)", border: "1px solid rgba(255,255,255,0.25)", boxShadow: "0 0 40px rgba(91,141,238,0.4)" }}
          >
            <Shield className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-white font-black tracking-widest mb-2" style={{ fontSize: 28, letterSpacing: "0.18em" }}>MALIGAIN</h1>
          <p className="text-blue-200/70 font-semibold mb-1" style={{ fontSize: 13 }}>Admin Panel</p>
          <p className="text-blue-200/50 mb-8" style={{ fontSize: 11, letterSpacing: "0.08em" }}>Platform Management System</p>

          <div className="space-y-3 text-left">
            {[
              { icon: "👥", title: "User Management", desc: "View and manage all platform users" },
              { icon: "💳", title: "Transactions", desc: "Monitor deposits, withdrawals & bonuses" },
              { icon: "⚙️", title: "Platform Control", desc: "Configure fees, rates, and settings" },
            ].map((item) => (
              <div key={item.title} className="flex items-center gap-3 px-4 py-2.5 rounded-xl" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}>
                <span style={{ fontSize: 18 }}>{item.icon}</span>
                <div>
                  <p className="text-white font-semibold text-sm">{item.title}</p>
                  <p className="text-blue-200/60 text-xs">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right form panel ─────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm">

          {/* Mobile header */}
          <div className="flex lg:hidden flex-col items-center gap-3 mb-8">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <div className="text-center">
              <h1 className="text-foreground font-bold text-xl">Admin Panel</h1>
              <p className="text-muted-foreground text-sm">MALIGAIN Platform</p>
            </div>
          </div>

          <div className="bg-card rounded-2xl border border-border shadow-xl p-8">
            <div className="mb-6">
              <h2 className="text-foreground font-bold text-xl mb-1">Sign in</h2>
              <p className="text-muted-foreground text-sm">Enter your admin credentials to continue.</p>
            </div>

            {error && (
              <div className="bg-destructive/10 border border-destructive/30 text-destructive rounded-lg px-4 py-3 text-sm mb-4">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4" autoComplete="on">
              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-1.5">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-muted/30 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary transition-all text-sm"
                  placeholder="admin"
                  required
                  autoFocus
                  autoComplete="username"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground/80 mb-1.5">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-muted/30 border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary transition-all text-sm"
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl font-semibold text-primary-foreground text-sm transition-all disabled:opacity-60 mt-1"
                style={{ background: "linear-gradient(135deg, #5b8dee 0%, #3b6fd4 100%)", boxShadow: "0 4px 16px rgba(91,141,238,0.4)" }}
              >
                {loading ? "Signing in…" : "Sign In"}
              </button>
            </form>
          </div>

          <p className="text-center mt-5 text-xs text-muted-foreground">© 2026 MALIGAIN. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
