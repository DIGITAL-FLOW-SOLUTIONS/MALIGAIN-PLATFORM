import { useState, useEffect } from "react";
import { Link, useSearch } from "wouter";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, CheckCircle2, XCircle, Loader2, X } from "lucide-react";

// ── Terms dialog ────────────────────────────────────────────────────────────
function TermsDialog({ open, onClose, onAccept }: { open: boolean; onClose: () => void; onAccept: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-slate-100 flex-shrink-0">
          <h2 className="text-slate-800 font-bold text-base">Terms of Service &amp; Refund Policy</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-4 space-y-4 flex-1 text-sm text-slate-600">
          {[
            { title: "1. Nature of Service", body: "MALIGAIN provides a digital subscription service. The registration fee grants immediate access to our Digital Marketing Hub and affiliate portal." },
            { title: "2. No-Refund Policy", body: "Due to the digital nature of our products, the registration fee is strictly non-refundable once the account is activated." },
            { title: "3. Anti-Fraud & Reversals", body: "Unauthorized payment reversals are a breach of contract and are reported to the relevant payment providers and authorities." },
            { title: "4. Affiliate Disclaimer", body: "We provide links to third-party platforms. We do not own these platforms and are not responsible for their independent terms." },
            { title: "5. Data Privacy", body: "We comply with applicable data protection laws. Your information is used solely for account management and service delivery." },
            { title: "6. Earnings Disclaimer", body: "Earnings are based on your referral activity. MALIGAIN does not guarantee any specific income. Results vary by individual effort." },
          ].map((s) => (
            <div key={s.title}>
              <p className="text-blue-600 font-bold text-xs uppercase tracking-wide mb-1">{s.title}</p>
              <p>{s.body}</p>
            </div>
          ))}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-amber-700 font-bold text-xs uppercase tracking-wide mb-1">Refund Policy Summary</p>
            <p className="text-amber-800">The registration fee is a <strong>non-refundable payment</strong> for immediate access to digital training materials and affiliate tools.</p>
          </div>
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-slate-100 flex-shrink-0">
          <button
            onClick={onAccept}
            className="flex-1 py-2.5 rounded-xl font-semibold text-white text-sm transition-all"
            style={{ background: "linear-gradient(135deg, #5b8dee 0%, #3b6fd4 100%)" }}
          >
            I Agree &amp; Accept
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl font-semibold text-slate-600 text-sm bg-slate-100 hover:bg-slate-200 transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Constants ────────────────────────────────────────────────────────────────
const COUNTRIES = [
  { value: "KE", label: "Kenya" },
  { value: "GH", label: "Ghana" },
  { value: "CM", label: "Cameroon" },
  { value: "UG", label: "Uganda" },
  { value: "TZ", label: "Tanzania" },
  { value: "ZM", label: "Zambia" },
];

const registerSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(7, "Enter a valid phone number"),
  country: z.string().min(1, "Please select a country"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  referralCode: z.string().optional(),
  agreeTerms: z.boolean().refine((v) => v === true, "You must agree to the terms"),
});

type RegisterForm = z.infer<typeof registerSchema>;
type FieldStatus = "idle" | "checking" | "available" | "taken" | "invalid";

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

function FieldIcon({ status }: { status: FieldStatus | "valid" }) {
  if (status === "checking") return <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />;
  if (status === "available" || status === "valid") return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
  if (status === "taken" || status === "invalid") return <XCircle className="w-4 h-4 text-red-500" />;
  return null;
}

function fieldCls(status: FieldStatus | "valid" | "error" | "idle") {
  const base = "border transition-all";
  if (status === "available" || status === "valid")
    return `${base} border-emerald-400 ring-2 ring-emerald-400/20`;
  if (status === "taken" || status === "invalid" || status === "error")
    return `${base} border-red-400 ring-2 ring-red-400/20`;
  return `${base} border-slate-200 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-400/20`;
}

// WealthEarn palette
const BG = `linear-gradient(145deg, #1e1650 0%, #2d2096 25%, #1e3a8a 60%, #1e40af 100%)`;

export default function Register() {
  const { register: registerUser, isRegistering } = useAuth();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  const search = useSearch();
  const params = new URLSearchParams(search);
  const refCode = params.get("ref") || "";
  const [referrerName, setReferrerName] = useState<string | null>(null);

  const [emailStatus, setEmailStatus] = useState<FieldStatus>("idle");
  const [emailMsg, setEmailMsg] = useState("");
  const [phoneStatus, setPhoneStatus] = useState<FieldStatus>("idle");
  const [phoneMsg, setPhoneMsg] = useState("");

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { country: "KE", agreeTerms: false },
    mode: "onTouched",
  });

  const emailValue = useWatch({ control, name: "email" }) ?? "";
  const phoneValue = useWatch({ control, name: "phone" }) ?? "";
  const usernameValue = useWatch({ control, name: "username" }) ?? "";
  const passwordValue = useWatch({ control, name: "password" }) ?? "";

  const debouncedEmail = useDebounce(emailValue, 600);
  const debouncedPhone = useDebounce(phoneValue, 600);

  const BASE = import.meta.env.BASE_URL;

  useEffect(() => {
    if (!refCode) return;
    setValue("referralCode", refCode);
    fetch(`${BASE}api/auth/referrer?code=${encodeURIComponent(refCode)}`, { credentials: "include" })
      .then((r) => r.json())
      .then((d: { username: string | null }) => setReferrerName(d.username))
      .catch(() => {});
  }, [refCode]);

  useEffect(() => {
    const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(debouncedEmail);
    if (!debouncedEmail || !isValidEmail) { setEmailStatus("idle"); setEmailMsg(""); return; }
    setEmailStatus("checking");
    fetch(`${BASE}api/auth/check-email?email=${encodeURIComponent(debouncedEmail)}`, { credentials: "include" })
      .then((r) => r.json())
      .then((d: { available: boolean; message: string }) => { setEmailStatus(d.available ? "available" : "taken"); setEmailMsg(d.message); })
      .catch(() => { setEmailStatus("idle"); setEmailMsg(""); });
  }, [debouncedEmail]);

  useEffect(() => {
    if (!debouncedPhone || debouncedPhone.trim().length < 7) { setPhoneStatus("idle"); setPhoneMsg(""); return; }
    setPhoneStatus("checking");
    fetch(`${BASE}api/auth/check-phone?phone=${encodeURIComponent(debouncedPhone.trim())}`, { credentials: "include" })
      .then((r) => r.json())
      .then((d: { available: boolean; message: string }) => { setPhoneStatus(d.available ? "available" : "taken"); setPhoneMsg(d.message); })
      .catch(() => { setPhoneStatus("idle"); setPhoneMsg(""); });
  }, [debouncedPhone]);

  const canSubmit = emailStatus !== "taken" && phoneStatus !== "taken" && !isRegistering;

  const onSubmit = (data: RegisterForm) => {
    if (emailStatus === "taken") { toast({ title: "Email Taken", description: "That email is already registered.", variant: "destructive" }); return; }
    if (phoneStatus === "taken") { toast({ title: "Phone Taken", description: "That phone number is already registered.", variant: "destructive" }); return; }
    registerUser(
      { username: data.username, email: data.email, phone: data.phone, country: data.country, password: data.password, referralCode: data.referralCode } as any,
      () => { toast({ title: "Account Created!", description: "Welcome to MALIGAIN." }); },
      (err) => {
        const message = err?.data?.message || err?.message?.replace(/^HTTP \d+ [^:]+:\s*/i, "") || "Something went wrong";
        toast({ title: "Registration Failed", description: message, variant: "destructive" });
      }
    );
  };

  const usernameValid = usernameValue.length >= 3 && !errors.username;
  const passwordValid = passwordValue.length >= 6 && !errors.password;

  const inputCls = "flex-1 bg-transparent py-3 px-4 text-slate-800 text-sm focus:outline-none placeholder:text-slate-400";

  return (
    <>
      <TermsDialog
        open={termsOpen}
        onClose={() => setTermsOpen(false)}
        onAccept={() => { setValue("agreeTerms", true, { shouldValidate: true }); setTermsOpen(false); }}
      />

      <div className="min-h-screen flex" style={{ background: "#f0f4ff" }}>

        {/* ── Left decorative panel ────────────────────────────────────── */}
        <div
          className="hidden lg:flex lg:w-[46%] xl:w-[42%] flex-col items-center justify-center px-10 relative overflow-hidden"
          style={{ background: BG }}
        >
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
              className="mx-auto mb-6 flex items-center justify-center rounded-2xl overflow-hidden"
              style={{ width: 88, height: 88, boxShadow: "0 0 40px rgba(91,141,238,0.55), 0 4px 24px rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.25)" }}
            >
              <img src={`${BASE}images/logo.png`} alt="MALIGAIN" style={{ width: 88, height: 88, objectFit: "cover" }} />
            </div>
            <h1 className="text-white font-black tracking-widest mb-2" style={{ fontSize: 32, letterSpacing: "0.18em" }}>MALIGAIN</h1>
            <p className="text-blue-200/70 font-medium mb-8" style={{ fontSize: 11, letterSpacing: "0.12em" }}>DIGITAL AGENCY PLATFORM</p>

            <div className="space-y-3">
              {[
                { icon: "🚀", title: "Join 10,000+ Members", desc: "Already earning across Africa" },
                { icon: "💎", title: "Multiple Income Streams", desc: "Tasks, referrals, tournaments & more" },
                { icon: "⚡", title: "Instant Withdrawals", desc: "M-Pesa, Airtel Money & more" },
              ].map((item) => (
                <div key={item.title} className="flex items-center gap-3 text-left px-4 py-3 rounded-xl" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}>
                  <span style={{ fontSize: 20 }}>{item.icon}</span>
                  <div>
                    <p className="text-white font-semibold text-sm">{item.title}</p>
                    <p className="text-blue-200/60 text-xs">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Right form panel ──────────────────────────────────────────── */}
        <div className="flex-1 flex items-center justify-center px-4 py-8">
          <div className="w-full max-w-md">

            {/* Mobile logo */}
            <div className="flex lg:hidden items-center gap-3 mb-6 justify-center">
              <img src={`${BASE}images/logo.png`} alt="Logo" className="w-12 h-12 rounded-xl object-cover" style={{ boxShadow: "0 2px 12px rgba(91,141,238,0.4)" }} />
              <div>
                <h1 className="font-black tracking-widest text-slate-800" style={{ fontSize: 22, letterSpacing: "0.15em" }}>MALIGAIN</h1>
                <p className="text-slate-400 text-xs">Digital Agency Platform</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8">
              <div className="mb-5">
                <h2 className="text-slate-800 font-bold text-xl mb-1">Create account</h2>
                <p className="text-slate-500 text-sm">Start earning today — it only takes a minute.</p>
              </div>

              {refCode && (
                <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5 mb-4">
                  <span className="text-blue-500 text-sm">🎫</span>
                  <p className="text-blue-700 text-xs">
                    Invited by{" "}
                    <span className="font-bold">{referrerName ?? refCode}</span>
                  </p>
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5" autoComplete="on">

                {/* Username */}
                <div>
                  <label className="text-slate-600 text-sm font-medium mb-1.5 block">Username <span className="text-slate-400 font-normal">(display name)</span></label>
                  <div className={`relative flex items-center bg-slate-50 rounded-xl ${fieldCls(errors.username ? "error" : usernameValid ? "valid" : "idle")}`}>
                    <input {...register("username")} type="text" placeholder="Your display name" autoComplete="username" className={inputCls} />
                    <span className="pr-3"><FieldIcon status={errors.username ? "invalid" : usernameValid ? "valid" : "idle"} /></span>
                  </div>
                  {errors.username && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><XCircle className="w-3 h-3" /> {errors.username.message}</p>}
                </div>

                {/* Email */}
                <div>
                  <label className="text-slate-600 text-sm font-medium mb-1.5 block">Email</label>
                  <div className={`relative flex items-center bg-slate-50 rounded-xl ${fieldCls(errors.email ? "error" : emailStatus === "available" ? "available" : emailStatus === "taken" ? "taken" : "idle")}`}>
                    <input {...register("email")} type="email" placeholder="you@email.com" autoComplete="email" className={inputCls} />
                    <span className="pr-3"><FieldIcon status={errors.email ? "invalid" : emailStatus === "idle" ? "idle" : emailStatus} /></span>
                  </div>
                  {errors.email && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><XCircle className="w-3 h-3" /> {errors.email.message}</p>}
                  {!errors.email && emailStatus === "available" && <p className="text-emerald-600 text-xs mt-1 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> {emailMsg}</p>}
                  {!errors.email && emailStatus === "taken" && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><XCircle className="w-3 h-3" /> {emailMsg}</p>}
                </div>

                {/* Phone */}
                <div>
                  <label className="text-slate-600 text-sm font-medium mb-1.5 block">Phone</label>
                  <div className={`relative flex items-center bg-slate-50 rounded-xl ${fieldCls(errors.phone ? "error" : phoneStatus === "available" ? "available" : phoneStatus === "taken" ? "taken" : "idle")}`}>
                    <input {...register("phone")} type="tel" placeholder="07XXXXXXXX" autoComplete="tel" className={inputCls} />
                    <span className="pr-3"><FieldIcon status={errors.phone ? "invalid" : phoneStatus === "idle" ? "idle" : phoneStatus} /></span>
                  </div>
                  {errors.phone && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><XCircle className="w-3 h-3" /> {errors.phone.message}</p>}
                  {!errors.phone && phoneStatus === "available" && <p className="text-emerald-600 text-xs mt-1 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> {phoneMsg}</p>}
                  {!errors.phone && phoneStatus === "taken" && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><XCircle className="w-3 h-3" /> {phoneMsg}</p>}
                </div>

                {/* Country */}
                <div>
                  <label className="text-slate-600 text-sm font-medium mb-1.5 block">Country</label>
                  <div className={`relative bg-slate-50 rounded-xl ${fieldCls(errors.country ? "error" : "idle")}`}>
                    <select {...register("country")} className="w-full bg-transparent py-3 px-4 text-slate-800 text-sm focus:outline-none appearance-none cursor-pointer">
                      {COUNTRIES.map((c) => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                      <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="text-slate-600 text-sm font-medium mb-1.5 block">Password</label>
                  <div className={`relative flex items-center bg-slate-50 rounded-xl ${fieldCls(errors.password ? "error" : passwordValid ? "valid" : "idle")}`}>
                    <input {...register("password")} type={showPassword ? "text" : "password"} placeholder="Min. 6 characters" autoComplete="new-password" className={inputCls} />
                    <div className="flex items-center gap-1.5 pr-3 flex-shrink-0">
                      <FieldIcon status={errors.password ? "invalid" : passwordValid ? "valid" : "idle"} />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-slate-400 hover:text-slate-600 transition-colors">
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  {errors.password && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><XCircle className="w-3 h-3" /> {errors.password.message}</p>}
                </div>

                {/* Terms */}
                <div>
                  <label className="flex items-start gap-2 cursor-pointer mt-1">
                    <input type="checkbox" {...register("agreeTerms")} className="w-4 h-4 mt-0.5 rounded border-slate-300 accent-blue-500 flex-shrink-0" />
                    <span className="text-slate-600 text-xs leading-relaxed">
                      I agree to the{" "}
                      <button type="button" onClick={() => setTermsOpen(true)} className="text-blue-500 font-semibold hover:text-blue-600 transition-colors underline-offset-2 hover:underline">Terms of Service</button>
                      {" "}and{" "}
                      <button type="button" onClick={() => setTermsOpen(true)} className="text-blue-500 font-semibold hover:text-blue-600 transition-colors underline-offset-2 hover:underline">No-Refund Policy</button>
                    </span>
                  </label>
                  {errors.agreeTerms && <p className="text-red-500 text-xs mt-1 ml-6 flex items-center gap-1"><XCircle className="w-3 h-3" /> {errors.agreeTerms.message}</p>}
                </div>

                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="w-full py-3 rounded-xl font-semibold text-white text-sm transition-all flex items-center justify-center gap-2 mt-1 disabled:opacity-60"
                  style={{ background: "linear-gradient(135deg, #5b8dee 0%, #3b6fd4 100%)", boxShadow: "0 4px 16px rgba(91,141,238,0.4)" }}
                >
                  {isRegistering ? (
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <line x1="19" y1="8" x2="19" y2="14" />
                      <line x1="22" y1="11" x2="16" y2="11" />
                    </svg>
                  )}
                  {isRegistering ? "Creating Account..." : "Create Account"}
                </button>
              </form>

              <p className="text-center mt-5 text-sm text-slate-500">
                Already have an account?{" "}
                <Link href="/login" className="text-blue-500 hover:text-blue-600 font-semibold transition-colors">Sign In</Link>
              </p>
            </div>

            <p className="text-center mt-5 text-xs text-slate-400">© 2026 MALIGAIN. All rights reserved.</p>
          </div>
        </div>
      </div>
    </>
  );
}
