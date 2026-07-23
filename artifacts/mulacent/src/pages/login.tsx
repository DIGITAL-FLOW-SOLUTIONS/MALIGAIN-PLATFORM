import { useState } from "react";
import { Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff } from "lucide-react";

const loginSchema = z.object({
  identifier: z.string().min(1, "Username, phone number, or email is required"),
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
              <h2 className="text-slate-800 font-bold text-xl mb-1">LOGIN</h2>
              <p className="text-slate-500 text-sm">Welcome back! Use your username, phone, or email to continue.</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" autoComplete="on">
              <div>
                <label className="text-slate-600 text-sm font-medium mb-1.5 block">Username, Phone Number or Email</label>
                <input
                  {...register("identifier")}
                  type="text"
                  placeholder="username, 07XXXXXXXX or you@email.com"
                  autoComplete="username"
                  className="w-full border border-slate-200 bg-slate-50 py-3 px-4 text-slate-800 text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 transition-all placeholder:text-slate-400"
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
                    className="w-full border border-slate-200 bg-slate-50 py-3 px-4 pr-11 text-slate-800 text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 transition-all placeholder:text-slate-400"
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
                className="w-full py-3 font-semibold text-white text-sm transition-all flex items-center justify-center gap-2 mt-1 disabled:opacity-60"
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
