import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useCurrency } from "@/hooks/use-currency";
import {
  useUpdateProfile,
  useChangePassword,
  useGetWalletBalances,
  useGetReferralStats,
  useGetTransactions,
  getGetCurrentUserQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { Copy, Eye, EyeOff, Phone, Globe, Lock, Save, Users, ArrowDownCircle, Activity, Hash, Mail, Calendar, CheckCircle } from "lucide-react";
import { formatDate } from "@/lib/utils";

const COUNTRIES = [
  { value: "KE", label: "Kenya" },
  { value: "GH", label: "Ghana" },
  { value: "CM", label: "Cameroon" },
  { value: "UG", label: "Uganda" },
  { value: "TZ", label: "Tanzania" },
  { value: "ZM", label: "Zambia" },
];

const countryLabel = (code?: string | null) =>
  COUNTRIES.find((c) => c.value === code)?.label ?? code ?? "—";

const profileSchema = z.object({
  phone: z.string().optional(),
  country: z.string().optional(),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Required"),
    newPassword: z.string().min(6, "Min. 6 characters"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type ProfileForm = z.infer<typeof profileSchema>;
type PasswordForm = z.infer<typeof passwordSchema>;

function inputCls() {
  return "w-full bg-background border border-input rounded-xl py-3 px-4 text-foreground text-sm focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-muted-foreground";
}

function labelCls() {
  return "text-[10px] font-bold tracking-widest uppercase text-muted-foreground mb-1.5 block";
}

export default function Profile() {
  const { user } = useAuth();
  const { fmt } = useCurrency();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const { data: balances } = useGetWalletBalances();
  const { data: stats } = useGetReferralStats();
  const { data: txData } = useGetTransactions({ limit: 5 });

  const updateMutation = useUpdateProfile();
  const changePasswordMutation = useChangePassword();

  const { register: regProfile, handleSubmit: handleProfileSubmit } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: { phone: user?.phone || "", country: user?.country || "KE" },
  });

  const {
    register: regPass,
    handleSubmit: handlePassSubmit,
    reset: resetPass,
    formState: { errors: passErrors },
  } = useForm<PasswordForm>({ resolver: zodResolver(passwordSchema) });

  const onProfileSave = (data: ProfileForm) => {
    updateMutation.mutate(
      { data: { country: data.country } },
      {
        onSuccess: (updatedUser) => {
          queryClient.setQueryData(getGetCurrentUserQueryKey(), updatedUser);
          toast({ title: "Profile updated successfully" });
        },
        onError: () => toast({ title: "Update failed", variant: "destructive" }),
      }
    );
  };

  const onPassSave = (data: PasswordForm) => {
    changePasswordMutation.mutate(
      { data },
      {
        onSuccess: () => {
          toast({ title: "Password changed successfully" });
          resetPass();
        },
        onError: (err: any) =>
          toast({ title: "Failed", description: err.message, variant: "destructive" }),
      }
    );
  };

  const handleCopyLink = () => {
    if (stats?.inviteLink) {
      navigator.clipboard.writeText(stats.inviteLink);
      toast({ title: "Copied!", description: "Referral link copied to clipboard." });
    }
  };

  const STAT_CARDS = [
    {
      icon: Users,
      value: stats?.totalActivated ?? 0,
      label: "Active Refs",
      gradient: "from-primary to-accent",
      bg: "bg-primary/10",
    },
    {
      icon: ArrowDownCircle,
      value: fmt(balances?.totalWithdrawn || 0),
      label: "Withdrawn",
      gradient: "from-emerald-500 to-teal-500",
      bg: "bg-emerald-50",
    },
    {
      icon: Activity,
      value: txData?.transactions?.length ?? 0,
      label: "Transactions",
      gradient: "from-amber-500 to-orange-500",
      bg: "bg-amber-50",
    },
    {
      icon: Hash,
      value: user?.referralCode ?? "—",
      label: "Ref Code",
      gradient: "from-secondary to-violet-500",
      bg: "bg-secondary/10",
      mono: true,
    },
  ];

  return (
    <div className="space-y-5">
      {/* Header Banner */}
      <div
        className="relative rounded-2xl p-6 border border-primary/20 overflow-hidden"
        style={{ background: "linear-gradient(135deg, #5b8dee 0%, #8b6ff5 100%)" }}
      >
        <div className="absolute inset-0 opacity-20 pointer-events-none"
          style={{ background: "radial-gradient(ellipse at 60% 0%, rgba(255,255,255,0.4) 0%, transparent 60%)" }} />
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div
            className="min-w-[4.5rem] min-h-[4.5rem] rounded-full bg-white/20 border-2 border-white/40 flex items-center justify-center text-white text-xl font-black shadow-xl"
            style={{ width: "4.5rem", height: "4.5rem" }}
          >
            {user?.avatarInitials || "U"}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-white break-words">{user?.username}</h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
              {user?.email && (
                <span className="flex items-center gap-1.5 text-white/70 text-xs">
                  <Mail className="w-3 h-3" /> {user.email}
                </span>
              )}
              {user?.createdAt && (
                <span className="flex items-center gap-1.5 text-white/70 text-xs">
                  <Calendar className="w-3 h-3" /> Joined {new Date(user.createdAt as string).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </span>
              )}
              {user?.country && (
                <span className="flex items-center gap-1.5 text-white/70 text-xs">
                  <Globe className="w-3 h-3" /> {countryLabel(user.country)}
                </span>
              )}
            </div>
            <div className="mt-2">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-white border border-white/30 bg-white/15 px-2.5 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 bg-emerald-300 rounded-full animate-pulse" />
                Active
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {STAT_CARDS.map(({ icon: Icon, value, label, gradient, bg, mono }) => (
          <div key={label} className={`${bg} border border-border rounded-2xl p-4 flex items-center gap-3 bg-card shadow-sm`}>
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center flex-shrink-0`}>
              <Icon className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <p className={`text-base font-bold text-foreground truncate ${mono ? "font-mono text-sm" : ""}`}>{String(value)}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Left Column */}
        <div className="space-y-5">
          {/* Profile Information */}
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 bg-primary/10 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-3.5 h-3.5 text-primary" />
              </div>
              <h3 className="text-foreground font-semibold text-sm">Profile Information</h3>
            </div>
            <div className="space-y-4">
              <div>
                <p className={labelCls()}>Username</p>
                <p className="text-foreground font-semibold text-base">{user?.username}</p>
              </div>
              <div>
                <p className={labelCls()}>Email</p>
                <p className="text-foreground font-semibold text-base">{user?.email}</p>
              </div>
              <div>
                <p className={labelCls()}>Phone</p>
                <p className="text-foreground font-semibold text-base">{user?.phone || "—"}</p>
              </div>
              <div>
                <p className={labelCls()}>Country</p>
                <p className="text-foreground font-semibold text-base">{countryLabel(user?.country)}</p>
              </div>
              <div>
                <p className={labelCls()}>Status</p>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-600 border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                  {user?.status || "Active"}
                </span>
              </div>
              <div>
                <p className={labelCls()}>Referral Link</p>
                <div className="flex items-center gap-2 bg-muted border border-border rounded-xl px-3 py-2.5">
                  <p className="text-muted-foreground text-xs font-mono truncate flex-1">
                    {stats?.inviteLink || "—"}
                  </p>
                  <button
                    onClick={handleCopyLink}
                    className="flex-shrink-0 flex items-center gap-1 text-[11px] font-bold bg-primary/10 text-primary px-2.5 py-1 rounded-lg hover:bg-primary/20 transition-colors"
                  >
                    <Copy className="w-3 h-3" /> Copy
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* My Upline */}
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 bg-secondary/10 rounded-lg flex items-center justify-center">
                <Users className="w-3.5 h-3.5 text-secondary" />
              </div>
              <h3 className="text-foreground font-semibold text-sm">My Upline</h3>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-secondary to-primary flex items-center justify-center text-white font-bold text-sm">
                ML
              </div>
              <div>
                <p className="text-foreground font-semibold">MALIGAIN</p>
                <p className="flex items-center gap-1 text-muted-foreground text-xs mt-0.5">
                  <Globe className="w-3 h-3" /> {countryLabel(user?.country)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-5">
          {/* Update Profile */}
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 bg-primary/10 rounded-lg flex items-center justify-center">
                <Save className="w-3.5 h-3.5 text-primary" />
              </div>
              <h3 className="text-foreground font-semibold text-sm">Update Profile</h3>
            </div>
            <form onSubmit={handleProfileSubmit(onProfileSave)} className="space-y-4">
              <div>
                <label className={`${labelCls()} flex items-center gap-1`}>
                  <Phone className="w-3 h-3" /> Phone Number
                </label>
                <input
                  {...regProfile("phone")}
                  type="tel"
                  placeholder="07XXXXXXXX"
                  className={inputCls()}
                />
              </div>
              <div>
                <label className={`${labelCls()} flex items-center gap-1`}>
                  <Globe className="w-3 h-3" /> Country
                </label>
                <div className="relative">
                  <select
                    {...regProfile("country")}
                    className={`${inputCls()} appearance-none cursor-pointer`}
                  >
                    {COUNTRIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
                    <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              </div>
              <button
                type="submit"
                disabled={updateMutation.isPending}
                className="w-full py-3 rounded-xl font-semibold text-primary-foreground text-sm flex items-center justify-center gap-2 transition-all hover:opacity-90 bg-primary disabled:opacity-60"
              >
                {updateMutation.isPending ? (
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Save Changes
              </button>
            </form>
          </div>

          {/* Change Password */}
          <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 bg-amber-500/10 rounded-lg flex items-center justify-center">
                <Lock className="w-3.5 h-3.5 text-amber-600" />
              </div>
              <h3 className="text-foreground font-semibold text-sm">Change Password</h3>
            </div>
            <form onSubmit={handlePassSubmit(onPassSave)} className="space-y-4">
              <div>
                <label className={`${labelCls()} flex items-center gap-1`}>
                  <Lock className="w-3 h-3" /> Current Password
                </label>
                <div className="relative">
                  <input
                    {...regPass("currentPassword")}
                    type={showCurrent ? "text" : "password"}
                    placeholder="••••••••"
                    className={`${inputCls()} pr-11`}
                  />
                  <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                    {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className={`${labelCls()} flex items-center gap-1`}>
                  <Lock className="w-3 h-3" /> New Password
                </label>
                <div className="relative">
                  <input
                    {...regPass("newPassword")}
                    type={showNew ? "text" : "password"}
                    placeholder="••••••••"
                    className={`${inputCls()} pr-11`}
                  />
                  <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                    {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">Minimum 6 characters</p>
              </div>
              <div>
                <label className={labelCls()}>Confirm Password</label>
                <div className="relative">
                  <input
                    {...regPass("confirmPassword")}
                    type={showConfirm ? "text" : "password"}
                    placeholder="••••••••"
                    className={`${inputCls()} pr-11`}
                  />
                  <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {passErrors.confirmPassword && (
                  <p className="text-destructive text-xs mt-1">{passErrors.confirmPassword.message}</p>
                )}
              </div>
              <button
                type="submit"
                disabled={changePasswordMutation.isPending}
                className="w-full py-3 rounded-xl font-semibold text-amber-50 text-sm flex items-center justify-center gap-2 transition-all hover:opacity-90 bg-amber-500 disabled:opacity-60"
              >
                {changePasswordMutation.isPending ? (
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                ) : (
                  <Lock className="w-4 h-4" />
                )}
                Update Password
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 bg-primary/10 rounded-lg flex items-center justify-center">
            <Activity className="w-3.5 h-3.5 text-primary" />
          </div>
          <h3 className="text-foreground font-semibold text-sm">Recent Activity</h3>
        </div>
        <div className="space-y-1">
          {txData?.transactions && txData.transactions.length > 0 ? (
            txData.transactions.map((tx: any) => {
              const isPositive = ["recharge", "bonus", "commission", "referral"].includes(tx.type);
              return (
                <div key={tx.id} className="flex items-center justify-between py-3 border-b border-border last:border-0">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${isPositive ? "bg-emerald-50" : "bg-destructive/10"}`}>
                      <Activity className={`w-4 h-4 ${isPositive ? "text-emerald-600" : "text-destructive"}`} />
                    </div>
                    <div>
                      <p className="text-foreground text-sm font-medium">{tx.description}</p>
                      <p className="text-muted-foreground text-xs mt-0.5">{formatDate(tx.createdAt)}</p>
                    </div>
                  </div>
                  <span className={`text-sm font-bold ${isPositive ? "text-emerald-600" : "text-destructive"}`}>
                    {isPositive ? "+" : "-"}{fmt(tx.amount)}
                  </span>
                </div>
              );
            })
          ) : (
            <p className="text-muted-foreground text-sm text-center py-6">No recent activity</p>
          )}
        </div>
      </div>
    </div>
  );
}
