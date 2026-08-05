import { useState, useEffect } from "react";
import {
  useGetWalletBalances,
  useGetReferralStats,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { formatCurrency, getCurrencyInfo, amountFontClass } from "@/lib/utils";
import {
  Copy,
  Users,
  Wallet,
  TrendingUp,
  ArrowDownCircle,
  Gift,
  ClipboardList,
  PenLine,
  Play,
  Puzzle,
  HeartHandshake,
  ChevronDown,
  ChevronUp,
  Share2,
  Mail,
  Facebook,
  Twitter,
  MessageCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { ReferralNotificationBanner } from "@/components/ReferralNotificationBanner";
import { Link, useLocation } from "wouter";

// ── Task timetable data ──────────────────────────────────────────────────────
const TIMETABLE = [
  { id: 1, name: "Youtube", day1: "Saturday", day2: "Sunday" },
  { id: 2, name: "Trivia", day1: "Tuesday", day2: "Thursday" },
  { id: 3, name: "TikTok", day1: "Tuesday", day2: "Wednesday" },
  { id: 4, name: "Whatsapp", day1: "Monday", day2: "Wednesday" },
  { id: 5, name: "Surveys", day1: "Tuesday", day2: "Thursday" },
  { id: 6, name: "Ads", day1: "Monday", day2: "Thursday" },
  { id: 7, name: "Blogs", day1: "Monday", day2: "Friday" },
];

export default function Dashboard() {
  const { data: balances, isLoading: loadingBalances } = useGetWalletBalances();
  const { data: stats, isLoading: loadingStats } = useGetReferralStats();
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [userDetailsOpen, setUserDetailsOpen] = useState(false);
  const [investBalance, setInvestBalance] = useState(0);
  const [activationFee, setActivationFee] = useState<number | null>(null);
  const [welcomeBonus, setWelcomeBonus] = useState<{
    country: string;
    currency: string;
    amount: number;
    requiredReferrals: number;
    currentReferrals: number;
    claimed: boolean;
    canClaim: boolean;
    claimedAt: string | null;
  } | null>(null);
  const [welcomeBonusLoading, setWelcomeBonusLoading] = useState(true);
  const [claimingWelcomeBonus, setClaimingWelcomeBonus] = useState(false);
  const queryClient = useQueryClient();

  // Fetch investment balance
  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}api/investments/my`, {
      credentials: "include",
    })
      .then((r) => r.json())
      .then((d) => setInvestBalance(d.totalEarned ?? 0))
      .catch(() => {});
  }, []);

  // Fetch activation fee for the user's country
  useEffect(() => {
    if (!user?.country) return;
    fetch(`${import.meta.env.BASE_URL}api/settings/activation-fees`, {
      credentials: "include",
    })
      .then((r) => r.json())
      .then((d: { fees?: Record<string, number> }) => {
        const fee = d.fees?.[user.country!.toUpperCase()];
        if (fee != null) setActivationFee(fee);
      })
      .catch(() => {});
  }, [user?.country]);

  const loadWelcomeBonus = () => {
    setWelcomeBonusLoading(true);
    fetch(`${import.meta.env.BASE_URL}api/bonuses/welcome`, {
      credentials: "include",
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Unable to load welcome bonus");
        return response.json();
      })
      .then(setWelcomeBonus)
      .catch(() => setWelcomeBonus(null))
      .finally(() => setWelcomeBonusLoading(false));
  };

  useEffect(() => {
    if (user) loadWelcomeBonus();
  }, [user?.id]);

  const claimWelcomeBonus = async () => {
    setClaimingWelcomeBonus(true);
    try {
      const response = await fetch(
        `${import.meta.env.BASE_URL}api/bonuses/welcome/claim`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        },
      );
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.message ?? "Unable to claim welcome bonus");
      setWelcomeBonus(result);
      queryClient.invalidateQueries({ queryKey: ["/api/wallet/balances"] });
      toast({ title: "Welcome bonus claimed!", description: result.message });
    } catch (error) {
      toast({
        title: "Unable to claim bonus",
        description:
          error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
      loadWelcomeBonus();
    } finally {
      setClaimingWelcomeBonus(false);
    }
  };

  const country = user?.country ?? null;
  const currencyInfo = getCurrencyInfo(country);
  const fmt = (n: number) => formatCurrency(n, country);

  const mainBal = balances?.mainWallet ?? 0;
  const affiliate = balances?.teamEarnings ?? 0;
  const withdrawn = balances?.totalWithdrawn ?? 0;
  const todayEarn = balances?.todayEarnings ?? 0;
  const totalEarned = balances?.totalEarned ?? 0;

  const inviteLink =
    stats?.inviteLink ||
    (user?.username
      ? `https://www.maligain.com/register?ref=${encodeURIComponent(user.username)}`
      : "https://www.maligain.com/register");

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteLink);
    toast({
      title: "Copied!",
      description: "Invite link copied to clipboard.",
    });
  };

  const shareUrl = encodeURIComponent(inviteLink);
  const shareText = encodeURIComponent(
    "Join MALIGAIN and start earning today! 💰",
  );

  const STAT_CARDS = [
    {
      label: "Balance",
      value: fmt(mainBal),
      badge: "+42%",
      icon: Wallet,
      href: "/recharge",
      color: "bg-amber-400",
    },
    {
      label: "Withdrawals",
      value: fmt(withdrawn),
      badge: "+10%",
      icon: ArrowDownCircle,
      href: "/withdraw",
      color: "bg-indigo-600",
    },
    {
      label: "Affiliate Earnings",
      value: fmt(affiliate),
      badge: "+27%",
      icon: Users,
      href: "/downlines",
      color: "bg-emerald-500",
    },
    {
      label: "Investments",
      value: fmt(investBalance),
      badge: "daily",
      icon: TrendingUp,
      href: "/investments/current",
      color: "bg-pink-500",
    },
  ];

  const SERVICE_ROWS = [
    {
      label: "Ads Earnings",
      icon: ClipboardList,
      color: "bg-blue-500",
      value: fmt(balances?.adsEarnings ?? 0),
    },
    {
      label: "TikTok Earnings",
      icon: Play,
      color: "bg-pink-500",
      value: fmt(balances?.tiktokEarnings ?? 0),
    },
    {
      label: "Youtube Earnings",
      icon: Play,
      color: "bg-red-500",
      value: fmt(balances?.youtubeEarnings ?? 0),
    },
    {
      label: "Survey Earnings",
      icon: Puzzle,
      color: "bg-amber-500",
      value: fmt(balances?.surveyEarnings ?? 0),
    },
    {
      label: "Blog Earnings",
      icon: PenLine,
      color: "bg-violet-500",
      value: fmt(balances?.blogsEarnings ?? 0),
    },
    {
      label: "Chat with Foreigners",
      icon: HeartHandshake,
      color: "bg-emerald-500",
      value: fmt(balances?.chatWithForeignersEarnings ?? 0),
    },
    {
      label: "Reels Earnings",
      icon: Play,
      color: "bg-orange-500",
      value: fmt(balances?.reelEarnings ?? 0),
    },
    {
      label: "Movies Earnings",
      icon: Play,
      color: "bg-cyan-600",
      value: fmt(balances?.movieEarnings ?? 0),
    },
    {
      label: "Watch & Earn",
      icon: Play,
      color: "bg-indigo-500",
      value: fmt(balances?.videoEarnings ?? 0),
    },
    {
      label: "Trivia Earnings",
      icon: Puzzle,
      color: "bg-rose-500",
      value: fmt(balances?.triviaEarnings ?? 0),
    },
  ];

  if (loadingBalances || loadingStats) {
    return (
      <div className="space-y-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-32 bg-muted rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Referral notification banner */}
      <ReferralNotificationBanner count={stats?.todayReferrals ?? 0} />

      {/* ── 1. HERO BANNER ─────────────────────────────────────────────────── */}
      <div
        className="relative rounded-2xl overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, #3b5bdb 0%, #5b8dee 50%, #8b6ff5 100%)",
        }}
      >
        {/* Dot-grid pattern overlay */}
        <div
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            backgroundImage:
              "radial-gradient(rgba(255,255,255,0.4) 1px, transparent 1px)",
            backgroundSize: "18px 18px",
          }}
        />

        {/* Ambient glow orbs */}
        <div className="absolute inset-0 pointer-events-none">
          <div
            className="absolute w-56 h-56 -top-16 -left-10 rounded-full opacity-25"
            style={{
              background:
                "radial-gradient(circle, rgba(255,255,255,0.5) 0%, transparent 70%)",
            }}
          />
        </div>

        <div className="relative z-10 px-5 pt-4 pb-5">
          {/* Welcome pill */}
          <div className="inline-flex items-center gap-1.5 bg-emerald-500 text-white text-xs font-bold px-3 py-1.5 rounded-full mb-3 shadow-sm">
            <span>Welcome: {user?.username || "User"}</span>
            <span>👋</span>
          </div>

          {/* Promo text */}
          <p className="text-white/75 text-[11px] leading-relaxed mb-5 max-w-xs">
            Boost your digital journey with MALIGAIN' smart tools! Ads, YouTube,
            trivia, and more — designed to help you{" "}
            <span className="font-bold text-white">succeed online.</span>
          </p>

          {/* Two stats with divider */}
          <div className="flex items-center">
            {/* Left: Expense (activation fee for user's country) */}
            <div className="flex-1">
              <p className="text-amber-300 text-[11px] font-semibold mb-0.5">
                Expense
              </p>
              <p
                className={`text-white font-black leading-none ${amountFontClass(fmt(activationFee ?? 0), "lg")}`}
              >
                {activationFee != null ? fmt(activationFee) : "—"}
              </p>
            </div>

            {/* Divider */}
            <div className="w-px h-14 bg-white/30 mx-5 flex-shrink-0" />

            {/* Right: Total Earnings */}
            <div className="flex-1">
              <div className="flex items-center gap-1 mb-0.5">
                <TrendingUp className="w-3 h-3 text-emerald-300" />
                <p className="text-emerald-300 text-[11px] font-semibold">
                  Total Earnings
                </p>
              </div>
              <p
                className={`text-white font-black leading-none ${amountFontClass(fmt(totalEarned), "lg")}`}
              >
                {fmt(totalEarned)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. FOUR STAT CARDS ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        {STAT_CARDS.map(({ label, value, badge, icon: Icon, href, color }) => (
          <div
            key={label}
            className={`${color} rounded-2xl p-3.5 text-white shadow-sm flex flex-col gap-3 cursor-pointer hover:-translate-y-0.5 hover:shadow-lg transition-all`}
            onClick={() => navigate(href)}
          >
            {/* top row: label + badge */}
            <div className="flex items-start justify-between gap-1">
              <p className="text-white/90 text-[11px] font-bold leading-tight">
                {label}
              </p>
              <span className="text-[9px] font-bold text-white bg-white/20 border border-white/25 px-1.5 py-0.5 rounded-full whitespace-nowrap flex-shrink-0">
                {badge}
              </span>
            </div>

            {/* value */}
            <p
              className={`text-white font-black leading-none ${amountFontClass(value, "md")}`}
            >
              {value}
            </p>

            {/* bottom row: ALL TIME + icon */}
            <div className="flex items-end justify-between">
              <div>
                <p className="text-[9px] text-white/70 uppercase tracking-wider">
                  All Time
                </p>
                <button className="text-white/90 text-[10px] font-semibold mt-0.5 hover:text-white hover:underline">
                  Show full stats &rsaquo;
                </button>
              </div>
              <div className="w-8 h-8 rounded-xl bg-white/20 border border-white/20 flex items-center justify-center flex-shrink-0">
                <Icon className="w-4 h-4 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── 3. WELCOME BONUS ───────────────────────────────────────────────── */}
      <div className="w-full relative overflow-hidden rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 via-card to-orange-50 shadow-sm dark:border-amber-900/40 dark:from-amber-950/30 dark:to-orange-950/20">
        <div className="absolute -right-8 -top-10 h-32 w-32 rounded-full bg-amber-300/20 blur-2xl pointer-events-none" />
        <div className="relative flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-amber-400 text-white shadow-sm">
              <Gift className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                Welcome Bonus
              </p>
              {welcomeBonusLoading ? (
                <div className="mt-2 h-5 w-48 animate-pulse rounded bg-amber-200/60" />
              ) : welcomeBonus ? (
                <>
                  <p className="mt-0.5 text-lg font-black text-foreground">
                    {welcomeBonus.currency}{" "}
                    {welcomeBonus.amount.toLocaleString()}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {welcomeBonus.claimed
                      ? "This one-time bonus has already been credited to your main wallet."
                      : `${welcomeBonus.currentReferrals} of ${welcomeBonus.requiredReferrals} active Level 1 referrals`}
                  </p>
                </>
              ) : (
                <p className="mt-1 text-xs text-muted-foreground">
                  Welcome bonus details are unavailable.
                </p>
              )}
            </div>
          </div>
              {welcomeBonus && !welcomeBonus.claimed && (
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <Link
                    href="/welcome-bonus"
                    className="rounded-xl px-3 py-2 text-xs font-bold text-amber-700 transition hover:bg-amber-100 dark:text-amber-300 dark:hover:bg-amber-950/40"
                  >
                    View details
                  </Link>
                  <button
                    type="button"
                    onClick={claimWelcomeBonus}
                    disabled={!welcomeBonus.canClaim || claimingWelcomeBonus}
                    className="flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Gift className="h-4 w-4" />
                    {claimingWelcomeBonus
                      ? "Claiming..."
                      : welcomeBonus.canClaim
                        ? "Claim bonus"
                        : "Keep referring"}
                  </button>
                </div>
              )}
              {welcomeBonus && welcomeBonus.claimed && (
                <Link
                  href="/welcome-bonus"
                  className="rounded-xl px-3 py-2 text-xs font-bold text-amber-700 transition hover:bg-amber-100 dark:text-amber-300 dark:hover:bg-amber-950/40"
                >
                  View details
                </Link>
              )}
        </div>
        {welcomeBonus && !welcomeBonus.claimed && !welcomeBonusLoading && (
          <div className="h-1.5 bg-amber-100 dark:bg-amber-950/50">
            <div
              className="h-full bg-amber-500 transition-all"
              style={{
                width: `${Math.min(100, (welcomeBonus.currentReferrals / Math.max(1, welcomeBonus.requiredReferrals)) * 100)}%`,
              }}
            />
          </div>
        )}
      </div>

      {/* ── 4. SERVICE BALANCE ─────────────────────────────────────────────── */}
      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3.5 border-b border-border">
          <div className="w-1 h-4 rounded-full bg-primary flex-shrink-0" />
          <h2 className="text-foreground text-sm font-bold uppercase tracking-wider">
            Service Balance
          </h2>
        </div>
        <div className="divide-y divide-border">
          {SERVICE_ROWS.map(({ label, icon: Icon, color, value }) => (
            <div key={label} className="flex items-center gap-3 px-4 py-3.5">
              <div
                className={`w-8 h-8 rounded-xl ${color} flex items-center justify-center flex-shrink-0`}
              >
                <Icon className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="flex-1 text-foreground text-sm font-medium">
                {label}
              </span>
              <span className="text-primary text-sm font-bold">{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── 5. INVITE LINK + TIMETABLE (side by side on sm+) ──────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* INVITE LINK */}
        <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-border">
            <div className="flex items-center gap-2">
              <div className="w-1 h-4 rounded-full bg-primary flex-shrink-0" />
              <h2 className="text-foreground text-sm font-bold uppercase tracking-wider">
                Invite Link
              </h2>
            </div>
            <Share2 className="w-4 h-4 text-muted-foreground" />
          </div>

          <div className="p-4 space-y-3">
            {/* Stats row */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Invited", value: String(stats?.totalInvited ?? 0) },
                {
                  label: "Activated",
                  value: String(stats?.totalActivated ?? 0),
                },
                { label: "Affiliate", value: fmt(affiliate) },
              ].map((s) => (
                <div
                  key={s.label}
                  className="bg-muted border border-border rounded-xl p-2 text-center"
                >
                  <p
                    className={`text-foreground font-black leading-none ${amountFontClass(s.value, "sm")}`}
                  >
                    {s.value}
                  </p>
                  <p className="text-muted-foreground text-[9px] uppercase tracking-wide mt-1">
                    {s.label}
                  </p>
                </div>
              ))}
            </div>

            {/* Link box */}
            <div className="bg-muted border border-border rounded-xl px-3 py-2.5">
              <p className="text-[9px] text-muted-foreground uppercase tracking-wide mb-1">
                Invite link
              </p>
              <p className="text-xs text-primary font-mono truncate">
                {inviteLink}
              </p>
            </div>

            {/* Copy button */}
            <button
              onClick={handleCopy}
              className="w-full py-2.5 rounded-xl font-bold text-primary-foreground text-sm flex items-center justify-center gap-2 bg-primary hover:opacity-90 transition-opacity active:scale-[0.98]"
            >
              <Copy className="w-4 h-4" /> Copy link
            </button>

            {/* Share icons */}
            <div>
              <p className="text-muted-foreground text-[10px] mb-2">
                Or Click on the Icons to Share
              </p>
              <div className="flex items-center gap-3">
                <a
                  href={`https://wa.me/?text=${shareText}%20${shareUrl}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-white hover:scale-110 transition-transform"
                >
                  <MessageCircle className="w-4 h-4" />
                </a>
                <a
                  href={`https://twitter.com/intent/tweet?text=${shareText}&url=${shareUrl}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 rounded-lg bg-sky-500 flex items-center justify-center text-white hover:scale-110 transition-transform"
                >
                  <Twitter className="w-4 h-4" />
                </a>
                <a
                  href={`https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white hover:scale-110 transition-transform"
                >
                  <Facebook className="w-4 h-4" />
                </a>
                <a
                  href={`mailto:?subject=Join+Maligain+Agencies&body=${shareText}%20${shareUrl}`}
                  className="w-8 h-8 rounded-lg bg-red-500 flex items-center justify-center text-white hover:scale-110 transition-transform"
                >
                  <Mail className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* TIMETABLE */}
        <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3.5 border-b border-border">
            <div className="w-1 h-4 rounded-full bg-primary flex-shrink-0" />
            <h2 className="text-foreground text-sm font-bold uppercase tracking-wider">
              Timetable
            </h2>
          </div>
          <div className="p-4 overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="text-muted-foreground text-[10px] uppercase tracking-wide">
                  <th className="text-left py-2 pr-2 font-semibold">ID</th>
                  <th className="text-left py-2 pr-2 font-semibold">Name</th>
                  <th className="text-left py-2 pr-2 font-semibold">Day 1</th>
                  <th className="text-left py-2 font-semibold">Day 2</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {TIMETABLE.map((row) => (
                  <tr key={row.id} className="text-foreground">
                    <td className="py-2 pr-2 text-muted-foreground">
                      {row.id}
                    </td>
                    <td className="py-2 pr-2 font-medium">{row.name}</td>
                    <td className="py-2 pr-2 text-muted-foreground">
                      {row.day1}
                    </td>
                    <td className="py-2 text-muted-foreground">{row.day2}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── 5. USER DETAILS (collapsible) ──────────────────────────────────── */}
      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3.5 border-b border-border">
          <div className="w-1 h-4 rounded-full bg-primary flex-shrink-0" />
          <h2 className="text-foreground text-sm font-bold uppercase tracking-wider">
            User Details
          </h2>
        </div>
        <button
          type="button"
          onClick={() => setUserDetailsOpen((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-4 text-left hover:bg-muted/50 transition-colors"
        >
          <span className="text-muted-foreground text-sm font-medium uppercase tracking-wide">
            Click to View
          </span>
          {userDetailsOpen ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </button>
        {userDetailsOpen && (
          <div className="border-t border-border divide-y divide-border">
            {[
              { label: "Username", value: user?.username || "—" },
              { label: "Email", value: user?.email || "—" },
              { label: "Phone", value: user?.phone || "—" },
              { label: "Country", value: user?.country || "—" },
              { label: "Currency", value: currencyInfo.code },
              { label: "Status", value: user?.status || "—" },
              { label: "Referral Code", value: user?.referralCode || "—" },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="flex items-center justify-between px-4 py-3"
              >
                <span className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                  {label}
                </span>
                <span className="text-foreground text-sm font-semibold">
                  {value}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Footer ───────────────────────────────────────────────────────────── */}
      <p className="text-center text-xs text-muted-foreground pb-2">
        © 2026 <span className="font-semibold text-foreground">MALIGAIN</span>.
        All rights reserved.
      </p>
    </div>
  );
}
