import { useState } from "react";
import { Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff } from "lucide-react";

const loginSchema = z.object({
  identifier: z.string().min(1, "Phone number or email is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  rememberMe: z.boolean().default(false),
});

type LoginForm = z.infer<typeof loginSchema>;

// WealthEarn palette
const BG = `linear-gradient(145deg, #1e1650 0%, #2d2096 25%, #1e3a8a 60%, #1e40af 100%)`;

export default function Login() {
  const { login, isLoggingIn } = useAuth();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { rememberMe: false },
  });

  const onSubmit = (data: LoginForm) => {
    login(
      { email: data.identifier, password: data.password } as any,
      () => { toast({ title: "Welcome back!", description: "Successfully logged in." }); },
      (err) => {
        const message = err?.data?.message || err?.message?.replace(/^HTTP \d+ [^:]+:\s*/i, "") || "Invalid credentials";
        toast({ title: "Login Failed", description: message, variant: "destructive" });
      }
    );
  };

  const BASE = import.meta.env.BASE_URL;

  return (
    <div className="min-h-screen flex" style={{ background: "#f0f4ff" }}>

      {/* ── Left decorative panel (hidden on mobile) ─────────────────────── */}
      <div
        className="hidden lg:flex lg:w-[46%] xl:w-[42%] flex-col items-center justify-center px-10 relative overflow-hidden"
        style={{ background: BG }}
      >
        {/* Topo lines */}
        <div
          className="pointer-events-none absolute inset-0 opacity-100"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='600'%3E%3Cg fill='none' stroke='rgba(255,255,255,0.07)' stroke-width='1'%3E%3Cellipse cx='300' cy='300' rx='280' ry='140'/%3E%3Cellipse cx='300' cy='300' rx='240' ry='110'/%3E%3Cellipse cx='300' cy='300' rx='200' ry='82'/%3E%3Cellipse cx='300' cy='300' rx='160' ry='56'/%3E%3Cellipse cx='300' cy='300' rx='120' ry='34'/%3E%3Cellipse cx='140' cy='460' rx='200' ry='100'/%3E%3Cellipse cx='140' cy='460' rx='160' ry='74'/%3E%3Cellipse cx='460' cy='140' rx='220' ry='110'/%3E%3Cellipse cx='460' cy='140' rx='180' ry='82'/%3E%3C/g%3E%3C/svg%3E")`,
            backgroundSize: "600px 600px",
            backgroundPosition: "center",
          }}
        />
        {/* Glow */}
        <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(ellipse 70% 50% at 50% 0%, rgba(91,141,238,0.18) 0%, transparent 65%)" }} />

        <div className="relative z-10 text-center max-w-xs">
          {/* Logo */}
          <div
            className="mx-auto mb-6 flex items-center justify-center rounded-2xl overflow-hidden"
            style={{ width: 88, height: 88, boxShadow: "0 0 40px rgba(91,141,238,0.55), 0 4px 24px rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.25)" }}
          >
            <img src={`${BASE}images/logo.png`} alt="MALIGAIN" style={{ width: 88, height: 88, objectFit: "cover" }} />
          </div>

          <h1 className="text-white font-black tracking-widest mb-2" style={{ fontSize: 32, letterSpacing: "0.18em" }}>MALIGAIN</h1>
          <p className="text-blue-200/70 font-medium mb-8" style={{ fontSize: 11, letterSpacing: "0.12em" }}>DIGITAL AGENCY PLATFORM</p>

          <div className="space-y-4">
            {[
              { icon: "💰", title: "Daily Earnings", desc: "Complete tasks & earn every day" },
              { icon: "👥", title: "Referral Bonuses", desc: "Earn from your network's activity" },
              { icon: "🏆", title: "Tournaments", desc: "Compete and win big rewards" },
            ].map((item) => (
              <div key={item.title} className="flex items-center gap-3 text-left px-4 py-3 rounded-xl" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}>
                <span style={{ fontSize: 22 }}>{item.icon}</span>
                <div>
                  <p className="text-white font-semibold text-sm">{item.title}</p>
                  <p className="text-blue-200/60 text-xs">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right form panel ──────────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">

          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-3 mb-7 justify-center">
            <img src={`${BASE}images/logo.png`} alt="Logo" className="w-12 h-12 rounded-xl object-cover" style={{ boxShadow: "0 2px 12px rgba(91,141,238,0.4)" }} />
            <div>
              <h1 className="font-black tracking-widest text-slate-800" style={{ fontSize: 22, letterSpacing: "0.15em" }}>MALIGAIN</h1>
              <p className="text-slate-400 text-xs">Digital Agency Platform</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8">
            <div className="mb-6">
              <h2 className="text-slate-800 font-bold text-xl mb-1">Sign in</h2>
              <p className="text-slate-500 text-sm">Welcome back! Use your phone or email to continue.</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" autoComplete="on">
              <div>
                <label className="text-slate-600 text-sm font-medium mb-1.5 block">Phone Number or Email</label>
                <input
                  {...register("identifier")}
                  type="text"
                  placeholder="07XXXXXXXX or you@email.com"
                  autoComplete="username"
                  className="w-full border border-slate-200 bg-slate-50 rounded-xl py-3 px-4 text-slate-800 text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 transition-all placeholder:text-slate-400"
                />
                {errors.identifier && <p className="text-red-500 text-xs mt-1">{errors.identifier.message}</p>}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-slate-600 text-sm font-medium">Password</label>
                  <a href="#" className="text-blue-500 text-xs hover:text-blue-600 transition-colors font-medium">Forgot password?</a>
                </div>
                <div className="relative">
                  <input
                    {...register("password")}
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className="w-full border border-slate-200 bg-slate-50 rounded-xl py-3 px-4 pr-11 text-slate-800 text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 transition-all placeholder:text-slate-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  {...register("rememberMe")}
                  className="w-4 h-4 rounded border-slate-300 accent-blue-500"
                />
                <span className="text-slate-600 text-sm">Remember me</span>
              </label>

              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full py-3 rounded-xl font-semibold text-white text-sm transition-all flex items-center justify-center gap-2 mt-1 disabled:opacity-60"
                style={{ background: "linear-gradient(135deg, #5b8dee 0%, #3b6fd4 100%)", boxShadow: "0 4px 16px rgba(91,141,238,0.4)" }}
              >
                {isLoggingIn ? (
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                ) : (
                  <span>→</span>
                )}
                {isLoggingIn ? "Signing In..." : "Sign In"}
              </button>
            </form>

            <div className="flex items-center gap-3 my-5">
              <div className="flex-1 h-px bg-slate-200" />
              <span className="text-slate-400 text-xs">or continue with</span>
              <div className="flex-1 h-px bg-slate-200" />
            </div>

            <div className="flex gap-3 justify-center">
              {/* Facebook */}
              <button className="flex-1 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 text-sm hover:bg-slate-100 hover:border-slate-300 transition-all flex items-center justify-center">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              </button>
              {/* TikTok */}
              <button className="flex-1 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 text-sm hover:bg-slate-100 hover:border-slate-300 transition-all flex items-center justify-center">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.28 8.28 0 004.84 1.55V6.79a4.85 4.85 0 01-1.07-.1z" />
                </svg>
              </button>
              {/* Instagram */}
              <button className="flex-1 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 text-sm hover:bg-slate-100 hover:border-slate-300 transition-all flex items-center justify-center">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                </svg>
              </button>
            </div>

            <p className="text-center mt-5 text-sm text-slate-500">
              Don't have an account?{" "}
              <Link href="/register" className="text-blue-500 hover:text-blue-600 font-semibold transition-colors">
                Sign Up
              </Link>
            </p>
          </div>

          <p className="text-center mt-5 text-xs text-slate-400">© 2026 MALIGAIN. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
