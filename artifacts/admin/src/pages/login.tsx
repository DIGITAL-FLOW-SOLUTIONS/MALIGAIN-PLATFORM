import { useState } from "react";
import { useAdmin } from "@/hooks/useAdmin";
import { ShieldAlert } from "lucide-react";

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
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative font-mono overflow-hidden">
      {/* Decorative Grid */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: `linear-gradient(to right, #27272a 1px, transparent 1px), linear-gradient(to bottom, #27272a 1px, transparent 1px)`,
          backgroundSize: '40px 40px'
        }}
      />
      
      <div className="w-full max-w-sm relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex flex-col items-center mb-8">
          <div className="h-14 w-14 bg-primary/10 border border-primary flex items-center justify-center mb-5 shadow-[0_0_15px_rgba(0,229,255,0.2)] overflow-hidden">
            <img src={`${import.meta.env.BASE_URL}images/logo.png`} alt="MALIGAIN" className="h-full w-full object-contain" />
          </div>
          <h1 className="text-foreground font-bold text-xl tracking-widest uppercase flex items-center gap-2">
            <span className="w-2 h-2 bg-primary animate-pulse" />
            MALIGAIN_ADMIN_SYS
          </h1>
          <p className="text-muted-foreground text-[10px] tracking-widest mt-1.5 uppercase border border-border px-2 py-0.5 bg-muted/20">
            AUTHORIZED PERSONNEL ONLY
          </p>
        </div>

        <div className="bg-card border border-border p-6 shadow-2xl relative">
          {/* Corner accents */}
          <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-primary" />
          <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-primary" />
          <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-primary" />
          <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-primary" />

          {error && (
            <div className="bg-destructive/10 border border-destructive text-destructive px-4 py-3 text-xs mb-6 flex items-start gap-3">
              <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
              <span className="uppercase tracking-wide leading-relaxed">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6" autoComplete="on">
            <div className="space-y-2">
              <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                Admin ID
              </label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full px-3 py-2.5 bg-background border border-border text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors text-sm font-mono"
                placeholder="root"
                required
                autoFocus
                autoComplete="username"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                Passkey
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-3 py-2.5 bg-background border border-border text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors text-sm font-mono"
                placeholder="********"
                required
                autoComplete="current-password"
              />
            </div>
            
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-primary text-primary-foreground font-bold text-[11px] uppercase tracking-widest hover:bg-primary/90 transition-colors disabled:opacity-50 mt-2 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="h-3 w-3 border-2 border-primary-foreground border-t-transparent animate-spin" />
                  AUTHENTICATING...
                </>
              ) : (
                "INITIATE_SESSION"
              )}
            </button>
          </form>
        </div>
        
        <div className="mt-8 text-center flex flex-col items-center gap-1">
          <p className="text-[10px] text-muted-foreground/50 tracking-widest font-mono">
            SYS.VER 4.2.9 // NODE_ACTIVE
          </p>
          <div className="h-0.5 w-8 bg-muted-foreground/20" />
        </div>
      </div>
    </div>
  );
}
