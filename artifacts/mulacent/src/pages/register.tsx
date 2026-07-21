import { useState, useEffect, useRef } from "react";
import { Link, useSearch } from "wouter";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, CheckCircle2, XCircle, Loader2, X } from "lucide-react";

function TermsDialog({ open, onClose, onAccept }: { open: boolean; onClose: () => void; onAccept: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-[#1a0508] border border-red-900/30 rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-red-900/30 flex-shrink-0">
          <h2 className="text-yellow-400 font-bold text-base">Terms of Service &amp; Refund Policy</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto px-6 py-4 space-y-4 flex-1 text-sm text-gray-300">
          <div>
            <p className="text-yellow-400 font-bold text-xs uppercase tracking-wide mb-1">1. Nature of Service</p>
            <p>MALIGAIN provides a digital subscription service. The registration fee grants immediate access to our Digital Marketing Hub and affiliate portal.</p>
          </div>
          <div>
            <p className="text-yellow-400 font-bold text-xs uppercase tracking-wide mb-1">2. No-Refund Policy</p>
            <p>Due to the digital nature of our products, the registration fee is strictly <strong className="text-white">non-refundable</strong> once the account is activated.</p>
          </div>
          <div>
            <p className="text-yellow-400 font-bold text-xs uppercase tracking-wide mb-1">3. Anti-Fraud &amp; Reversals</p>
            <p>Unauthorized payment reversals are a breach of contract and are reported to the relevant payment providers and authorities.</p>
          </div>
          <div>
            <p className="text-yellow-400 font-bold text-xs uppercase tracking-wide mb-1">4. Affiliate Disclaimer</p>
            <p>We provide links to third-party platforms. We do not own these platforms and are not responsible for their independent terms.</p>
          </div>
          <div>
            <p className="text-yellow-400 font-bold text-xs uppercase tracking-wide mb-1">5. Data Privacy</p>
            <p>We comply with applicable data protection laws. Your information is used solely for account management and service delivery.</p>
          </div>
          <div>
            <p className="text-yellow-400 font-bold text-xs uppercase tracking-wide mb-1">6. Earnings Disclaimer</p>
            <p>Earnings are based on your referral activity. MALIGAIN does not guarantee any specific income. Results vary by individual effort.</p>
          </div>
          <div className="bg-red-900/30 border border-red-500/30 rounded-xl p-4">
            <p className="text-yellow-400 font-bold text-xs uppercase tracking-wide mb-1">Refund Policy Summary</p>
            <p>The registration fee is a <strong className="text-white">non-refundable payment</strong> for immediate access to digital training materials and affiliate tools.</p>
          </div>
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-red-900/30 flex-shrink-0">
          <button
            onClick={onAccept}
            className="flex-1 py-2.5 rounded-xl font-semibold text-white text-sm transition-all"
            style={{ background: "linear-gradient(135deg, #dc2626 0%, #991b1b 100%)" }}
          >
            I Agree &amp; Accept
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl font-semibold text-gray-300 text-sm bg-white/10 hover:bg-white/15 transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

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
  if (status === "checking") return <Loader2 className="w-4 h-4 text-red-400 animate-spin" />;
  if (status === "available" || status === "valid")
    return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
  if (status === "taken" || status === "invalid")
    return <XCircle className="w-4 h-4 text-red-400" />;
  return null;
}

function fieldBorder(status: FieldStatus | "valid" | "error" | "idle") {
  if (status === "available" || status === "valid")
    return "border-emerald-500 ring-1 ring-emerald-500/30";
  if (status === "taken" || status === "invalid" || status === "error")
    return "border-red-500 ring-1 ring-red-500/30";
  return "border-red-900/30 focus-within:border-red-500 focus-within:ring-1 focus-within:ring-red-500/30";
}

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
    formState: { errors, isSubmitted },
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

  // Inject referral code into form and resolve referrer username
  useEffect(() => {
    if (!refCode) return;
    setValue("referralCode", refCode);
    fetch(`${BASE}api/auth/referrer?code=${encodeURIComponent(refCode)}`, { credentials: "include" })
      .then(r => r.json())
      .then((d: { username: string | null }) => setReferrerName(d.username))
      .catch(() => {});
  }, [refCode]);

  useEffect(() => {
    const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(debouncedEmail);
    if (!debouncedEmail || !isValidEmail) {
      setEmailStatus("idle");
      setEmailMsg("");
      return;
    }
    setEmailStatus("checking");
    fetch(`${BASE}api/auth/check-email?email=${encodeURIComponent(debouncedEmail)}`, { credentials: "include" })
      .then((r) => r.json())
      .then((d: { available: boolean; message: string }) => {
        setEmailStatus(d.available ? "available" : "taken");
        setEmailMsg(d.message);
      })
      .catch(() => {
        setEmailStatus("idle");
        setEmailMsg("");
      });
  }, [debouncedEmail]);

  useEffect(() => {
    if (!debouncedPhone || debouncedPhone.trim().length < 7) {
      setPhoneStatus("idle");
      setPhoneMsg("");
      return;
    }
    setPhoneStatus("checking");
    fetch(`${BASE}api/auth/check-phone?phone=${encodeURIComponent(debouncedPhone.trim())}`, { credentials: "include" })
      .then((r) => r.json())
      .then((d: { available: boolean; message: string }) => {
        setPhoneStatus(d.available ? "available" : "taken");
        setPhoneMsg(d.message);
      })
      .catch(() => {
        setPhoneStatus("idle");
        setPhoneMsg("");
      });
  }, [debouncedPhone]);

  const canSubmit = emailStatus !== "taken" && phoneStatus !== "taken" && !isRegistering;

  const onSubmit = (data: RegisterForm) => {
    if (emailStatus === "taken") {
      toast({ title: "Email Taken", description: "That email is already registered.", variant: "destructive" });
      return;
    }
    if (phoneStatus === "taken") {
      toast({ title: "Phone Taken", description: "That phone number is already registered.", variant: "destructive" });
      return;
    }
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

  return (
    <>
    <TermsDialog
      open={termsOpen}
      onClose={() => setTermsOpen(false)}
      onAccept={() => {
        setValue("agreeTerms", true, { shouldValidate: true });
        setTermsOpen(false);
      }}
    />
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-[#0d0518]">
      <div className="absolute inset-0 z-0 overflow-hidden">
        <img
          src={`${BASE}images/auth-bg.png`}
          alt="Background"
          className="w-full h-full object-cover opacity-70"
        />
        <div className="absolute inset-0 bg-[#0d0518]/60" />
      </div>

      <div className="w-full max-w-md z-10 my-6">
        <div className="bg-[#1a0508]/90 border border-red-900/30 rounded-2xl p-7 shadow-2xl backdrop-blur-sm">

          <div className="flex items-center gap-3 mb-5">
            <img src={`${BASE}images/logo.png`} alt="Logo" className="w-12 h-12 rounded-full object-cover border-2 border-red-600/50" />
            <div>
              <h1 className="text-white font-bold text-lg leading-tight">MALIGAIN</h1>
              <p className="text-gray-400 text-xs">Create account — start earning today</p>
            </div>
          </div>

          {refCode && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-2.5 mb-5">
              <span className="text-red-400 text-sm">🎫</span>
              <p className="text-red-200 text-xs">
                Invited by{" "}
                <span className="text-red-300 font-bold">
                  {referrerName ?? refCode}
                </span>
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5">

            {/* Username */}
            <div>
              <label className="text-gray-300 text-sm mb-1.5 block">Username <span className="text-gray-500">(display name)</span></label>
              <div className={`relative flex items-center bg-[#0d0508]/80 border rounded-xl transition-all ${fieldBorder(errors.username ? "error" : usernameValid ? "valid" : "idle")}`}>
                <input
                  {...register("username")}
                  type="text"
                  placeholder="Your display name"
                  className="flex-1 bg-transparent py-3 px-4 text-white text-sm focus:outline-none placeholder:text-gray-500"
                />
                <span className="pr-3 flex-shrink-0">
                  <FieldIcon status={errors.username ? "invalid" : usernameValid ? "valid" : "idle"} />
                </span>
              </div>
              {errors.username && (
                <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                  <XCircle className="w-3 h-3" /> {errors.username.message}
                </p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="text-gray-300 text-sm mb-1.5 block">Email</label>
              <div className={`relative flex items-center bg-[#0d0508]/80 border rounded-xl transition-all ${fieldBorder(errors.email ? "error" : emailStatus === "available" ? "available" : emailStatus === "taken" ? "taken" : "idle")}`}>
                <input
                  {...register("email")}
                  type="email"
                  placeholder="you@email.com"
                  className="flex-1 bg-transparent py-3 px-4 text-white text-sm focus:outline-none placeholder:text-gray-500"
                />
                <span className="pr-3 flex-shrink-0">
                  <FieldIcon status={errors.email ? "invalid" : emailStatus === "idle" ? "idle" : emailStatus} />
                </span>
              </div>
              {errors.email && (
                <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                  <XCircle className="w-3 h-3" /> {errors.email.message}
                </p>
              )}
              {!errors.email && emailStatus === "available" && (
                <p className="text-emerald-400 text-xs mt-1 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> {emailMsg}
                </p>
              )}
              {!errors.email && emailStatus === "taken" && (
                <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                  <XCircle className="w-3 h-3" /> {emailMsg}
                </p>
              )}
            </div>

            {/* Phone */}
            <div>
              <label className="text-gray-300 text-sm mb-1.5 block">Phone</label>
              <div className={`relative flex items-center bg-[#0d0508]/80 border rounded-xl transition-all ${fieldBorder(errors.phone ? "error" : phoneStatus === "available" ? "available" : phoneStatus === "taken" ? "taken" : "idle")}`}>
                <input
                  {...register("phone")}
                  type="tel"
                  placeholder="07XXXXXXXX"
                  className="flex-1 bg-transparent py-3 px-4 text-white text-sm focus:outline-none placeholder:text-gray-500"
                />
                <span className="pr-3 flex-shrink-0">
                  <FieldIcon status={errors.phone ? "invalid" : phoneStatus === "idle" ? "idle" : phoneStatus} />
                </span>
              </div>
              {errors.phone && (
                <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                  <XCircle className="w-3 h-3" /> {errors.phone.message}
                </p>
              )}
              {!errors.phone && phoneStatus === "available" && (
                <p className="text-emerald-400 text-xs mt-1 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> {phoneMsg}
                </p>
              )}
              {!errors.phone && phoneStatus === "taken" && (
                <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                  <XCircle className="w-3 h-3" /> {phoneMsg}
                </p>
              )}
            </div>

            {/* Country */}
            <div>
              <label className="text-gray-300 text-sm mb-1.5 block">Country</label>
              <div className={`relative bg-[#0d0508]/80 border rounded-xl transition-all ${fieldBorder(errors.country ? "error" : "idle")}`}>
                <select
                  {...register("country")}
                  className="w-full bg-transparent py-3 px-4 text-white text-sm focus:outline-none appearance-none cursor-pointer"
                  style={{ colorScheme: "dark" }}
                >
                  {COUNTRIES.map((c) => (
                    <option key={c.value} value={c.value} className="bg-[#1a0508] text-white">{c.label}</option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                  <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              {errors.country && (
                <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                  <XCircle className="w-3 h-3" /> {errors.country.message}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="text-gray-300 text-sm mb-1.5 block">Password</label>
              <div className={`relative flex items-center bg-[#0d0508]/80 border rounded-xl transition-all ${fieldBorder(errors.password ? "error" : passwordValid ? "valid" : "idle")}`}>
                <input
                  {...register("password")}
                  type={showPassword ? "text" : "password"}
                  placeholder="Min. 6 characters"
                  className="flex-1 bg-transparent py-3 px-4 text-white text-sm focus:outline-none placeholder:text-gray-500"
                />
                <div className="flex items-center gap-1.5 pr-3 flex-shrink-0">
                  <FieldIcon status={errors.password ? "invalid" : passwordValid ? "valid" : "idle"} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-gray-400 hover:text-gray-300 transition-colors">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              {errors.password && (
                <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
                  <XCircle className="w-3 h-3" /> {errors.password.message}
                </p>
              )}
            </div>

            {/* Terms */}
            <div>
              <label className="flex items-start gap-2 cursor-pointer mt-1">
                <input
                  type="checkbox"
                  {...register("agreeTerms")}
                  className="w-4 h-4 mt-0.5 rounded border-red-900/30 bg-[#0d0508]/80 accent-red-600 flex-shrink-0"
                />
                <span className="text-gray-300 text-xs leading-relaxed">
                  I agree to the{" "}
                  <button type="button" onClick={() => setTermsOpen(true)} className="text-yellow-400 font-semibold hover:text-yellow-300 transition-colors underline-offset-2 hover:underline">Terms of Service</button>
                  {" "}and{" "}
                  <button type="button" onClick={() => setTermsOpen(true)} className="text-yellow-400 font-semibold hover:text-yellow-300 transition-colors underline-offset-2 hover:underline">No-Refund Policy</button>
                </span>
              </label>
              {errors.agreeTerms && (
                <p className="text-red-400 text-xs mt-1 ml-6 flex items-center gap-1">
                  <XCircle className="w-3 h-3" /> {errors.agreeTerms.message}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={!canSubmit}
              className="w-full py-3 rounded-xl font-semibold text-white text-sm transition-all flex items-center justify-center gap-2 mt-1"
              style={{
                background: !canSubmit
                  ? "rgba(180,0,0,0.5)"
                  : "linear-gradient(135deg, #dc2626 0%, #991b1b 100%)",
              }}
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

          <p className="text-center mt-5 text-xs text-gray-400">
            Already have an account?{" "}
            <Link href="/login" className="text-red-400 hover:text-red-300 font-semibold transition-colors">Sign In</Link>
          </p>
          <p className="text-center mt-4 text-xs text-gray-600">© 2026 MALIGAIN. All rights reserved.</p>
        </div>
      </div>
    </div>
    </>
  );
}
