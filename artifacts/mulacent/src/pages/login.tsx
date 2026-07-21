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

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-[#0d0518]">
      <div className="absolute inset-0 z-0 overflow-hidden">
        <img
          src={`${import.meta.env.BASE_URL}images/auth-bg.png`}
          alt="Background"
          className="w-full h-full object-cover opacity-70"
        />
        <div className="absolute inset-0 bg-[#0d0518]/60" />
      </div>

      <div className="w-full max-w-md z-10">
        <div className="bg-[#1a0508]/90 border border-red-900/30 rounded-2xl p-7 shadow-2xl backdrop-blur-sm">
          <div className="flex items-center gap-3 mb-6">
            <img
              src={`${import.meta.env.BASE_URL}images/logo.png`}
              alt="Logo"
              className="w-12 h-12 rounded-full object-cover border-2 border-red-600/50"
            />
            <div>
              <h1 className="text-white font-bold text-lg leading-tight">MALIGAIN</h1>
              <p className="text-gray-400 text-xs">Sign in to your account</p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-2.5 mb-5">
            <span className="text-red-400 text-sm">⚠</span>
            <p className="text-red-200 text-xs">
              Use your <span className="text-red-300 font-semibold">phone number or email</span> to sign in
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="text-gray-300 text-sm mb-1.5 block">Phone Number or Email</label>
              <input
                {...register("identifier")}
                type="text"
                placeholder="07XXXXXXXX or you@email.com"
                className="w-full bg-[#0d0508]/80 border border-red-900/30 rounded-xl py-3 px-4 text-white text-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/30 transition-all placeholder:text-gray-500"
              />
              {errors.identifier && <p className="text-red-400 text-xs mt-1">{errors.identifier.message}</p>}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-gray-300 text-sm">Password</label>
                <a href="#" className="text-red-400 text-xs hover:text-red-300 transition-colors font-medium">
                  Forgot password?
                </a>
              </div>
              <div className="relative">
                <input
                  {...register("password")}
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="w-full bg-[#0d0508]/80 border border-red-900/30 rounded-xl py-3 px-4 pr-11 text-white text-sm focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/30 transition-all placeholder:text-gray-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>}
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                {...register("rememberMe")}
                className="w-4 h-4 rounded border-red-900/30 bg-[#0d0508]/80 accent-red-600"
              />
              <span className="text-gray-300 text-sm">Remember me</span>
            </label>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-3 rounded-xl font-semibold text-white text-sm transition-all flex items-center justify-center gap-2 mt-1"
              style={{
                background: isLoggingIn
                  ? "rgba(180,0,0,0.5)"
                  : "linear-gradient(135deg, #dc2626 0%, #991b1b 100%)",
              }}
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
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-gray-500 text-xs">or continue with</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          <div className="flex gap-3 justify-center">
            <button className="flex-1 py-2.5 bg-[#0d0508]/80 border border-red-900/30 rounded-xl text-white text-sm hover:border-red-500/50 transition-all flex items-center justify-center">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
            </button>
            <button className="flex-1 py-2.5 bg-[#0d0508]/80 border border-red-900/30 rounded-xl text-white text-sm hover:border-red-500/50 transition-all flex items-center justify-center">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.28 8.28 0 004.84 1.55V6.79a4.85 4.85 0 01-1.07-.1z" />
              </svg>
            </button>
            <button className="flex-1 py-2.5 bg-[#0d0508]/80 border border-red-900/30 rounded-xl text-white text-sm hover:border-red-500/50 transition-all flex items-center justify-center">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
              </svg>
            </button>
          </div>

          <p className="text-center mt-5 text-xs text-gray-400">
            Don't have an account?{" "}
            <Link href="/register" className="text-red-400 hover:text-red-300 font-semibold transition-colors">
              Sign Up
            </Link>
          </p>

          <p className="text-center mt-4 text-xs text-gray-600">
            © 2026 MALIGAIN. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
