import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle, ArrowLeft } from "lucide-react";

const BG = `linear-gradient(145deg, #1e1650 0%, #2d2096 25%, #1e3a8a 60%, #1e40af 100%)`;

export default function UpdatePassword() {
  const [, setLocation] = useLocation();
  const [accessToken, setAccessToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [tokenError, setTokenError] = useState(false);

  const BASE = import.meta.env.BASE_URL;

  // Extract access token from URL hash on mount
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash) {
      setTokenError(true);
      return;
    }
    try {
      const params = new URLSearchParams(hash.replace("#", ""));
      const token = params.get("access_token");
      const type = params.get("type");
      if (!token || type !== "recovery") {
        setTokenError(true);
        return;
      }
      setAccessToken(token);
    } catch {
      setTokenError(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${BASE}api/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken, password }),
        credentials: "include",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message ?? "Failed to reset password");
      }

      setSuccess(true);
      setTimeout(() => setLocation("/login"), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (tokenError) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#f0f4ff" }}>
        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8 max-w-md w-full text-center mx-4">
          <div className="mx-auto mb-4 w-14 h-14 rounded-full bg-red-100 flex items-center justify-center">
            <AlertCircle className="w-7 h-7 text-red-600" />
          </div>
          <h2 className="text-slate-800 font-bold text-xl mb-2">Invalid or Expired Link</h2>
          <p className="text-slate-500 text-sm mb-6">
            This password reset link is invalid or has expired. Please request a new one.
          </p>
          <Link
            href="/forgot-password"
            className="inline-flex items-center gap-2 text-blue-500 hover:text-blue-600 font-semibold text-sm transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Request New Link
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex" style={{ background: "#f0f4ff" }}>
      {/* ── Left decorative panel ─────────────────────────── */}
      <div
        className="hidden lg:flex lg:w-[46%] xl:w-[42%] flex-col items-center justify-center px-10 relative overflow-hidden"
        style={{ background: BG }}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-100"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='600'%3E%3Cg fill='none' stroke='rgba(255,255,255,0.07)' stroke-width='1'%3E%3Cellipse cx='300' cy='300' rx='280' ry='140'/%3E%3Cellipse cx='300' cy='300' rx='240' ry='110'/%3E%3Cellipse cx='300' cy='300' rx='200' ry='82'/%3E%3Cellipse cx='300' cy='300' rx='160' ry='56'/%3E%3Cellipse cx='300' cy='300' rx='120' ry='34'/%3E%3Cellipse cx='140' cy='460' rx='200' ry='100'/%3E%3Cellipse cx='140' cy='460' rx='160' ry='74'/%3E%3Cellipse cx='460' cy='140' rx='220' ry='110'/%3E%3Cellipse cx='460' cy='140' rx='180' ry='82'/%3E%3C/g%3E%3C/svg%3E")`,
            backgroundSize: "600px 600px",
            backgroundPosition: "center",
          }}
        />
        <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(ellipse 70% 50% at 50% 0%, rgba(91,141,238,0.18) 0%, transparent 65%)" }} />

        <div className="relative z-10 text-center max-w-xs">
          <div
            className="mx-auto mb-6 flex items-center justify-center rounded-2xl overflow-hidden"
            style={{ width: 88, height: 88, boxShadow: "0 0 40px rgba(91,141,238,0.55), 0 4px 24px rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.25)" }}
          >
            <img src={`${BASE}images/logo.png`} alt="MALIGAIN" style={{ width: 88, height: 88, objectFit: "cover" }} />
          </div>
          <h1 className="text-white font-black tracking-widest mb-2" style={{ fontSize: 32, letterSpacing: "0.18em" }}>MALIGAIN</h1>
          <p className="text-blue-200/70 font-medium mb-2" style={{ fontSize: 11, letterSpacing: "0.12em" }}>DIGITAL AGENCY PLATFORM</p>
        </div>
      </div>

      {/* ── Right form panel ──────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <div className="flex lg:hidden items-center gap-3 mb-7 justify-center">
            <img src={`${BASE}images/logo.png`} alt="Logo" className="w-12 h-12 rounded-xl object-cover" style={{ boxShadow: "0 2px 12px rgba(91,141,238,0.4)" }} />
            <div>
              <h1 className="font-black tracking-widest text-slate-800" style={{ fontSize: 22, letterSpacing: "0.15em" }}>MALIGAIN</h1>
              <p className="text-slate-400 text-xs">Digital Agency Platform</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8">
            {success ? (
              <div className="text-center py-4">
                <div className="mx-auto mb-4 w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle className="w-7 h-7 text-green-600" />
                </div>
                <h2 className="text-slate-800 font-bold text-xl mb-2">Password Updated!</h2>
                <p className="text-slate-500 text-sm mb-6">
                  Your password has been reset successfully. Redirecting you to login…
                </p>
                <div className="animate-spin mx-auto w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full" />
              </div>
            ) : (
              <>
                <div className="mb-6">
                  <Link
                    href="/login"
                    className="inline-flex items-center gap-1.5 text-slate-400 hover:text-slate-600 text-xs font-medium transition-colors mb-3"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Back to login
                  </Link>
                  <h2 className="text-slate-800 font-bold text-xl mb-1">Set New Password</h2>
                  <p className="text-slate-500 text-sm">
                    Choose a strong password for your account.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="text-slate-600 text-sm font-medium mb-1.5 block">New Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="At least 6 characters"
                        required
                        minLength={6}
                        className="w-full border border-slate-200 bg-slate-50 py-3 pl-10 pr-11 text-slate-800 text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 transition-all placeholder:text-slate-400 rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-slate-600 text-sm font-medium mb-1.5 block">Confirm New Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type={showPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter your new password"
                        required
                        minLength={6}
                        className="w-full border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-slate-800 text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 transition-all placeholder:text-slate-400 rounded-lg"
                      />
                    </div>
                  </div>

                  {error && (
                    <p className="text-red-500 text-xs bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>
                  )}

                  <button
                    type="submit"
                    disabled={loading || !password || password !== confirmPassword}
                    className="w-full py-3 font-semibold text-white text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed rounded-lg"
                    style={{ background: "linear-gradient(135deg, #5b8dee 0%, #3b6fd4 100%)", boxShadow: "0 4px 16px rgba(91,141,238,0.4)" }}
                  >
                    {loading ? (
                      <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                      </svg>
                    ) : null}
                    {loading ? "Updating…" : "Reset Password"}
                  </button>
                </form>
              </>
            )}
          </div>

          <p className="text-center mt-5 text-xs text-slate-400">© 2026 MALIGAIN. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
