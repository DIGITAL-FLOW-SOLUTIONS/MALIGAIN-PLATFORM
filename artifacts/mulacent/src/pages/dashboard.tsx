import { useState } from "react";
import { useGetWalletBalances, useGetReferralStats } from "@workspace/api-client-react";
import { formatCurrency, getCurrencyInfo } from "@/lib/utils";
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
import { useLocation } from "wouter";

// ── Task timetable data ──────────────────────────────────────────────────────
const TIMETABLE = [
  { id: 1, name: "Youtube",  day1: "Saturday", day2: "Sunday"    },
  { id: 2, name: "Trivia",   day1: "Tuesday",  day2: "Thursday"  },
  { id: 3, name: "TikTok",   day1: "Tuesday",  day2: "Wednesday" },
  { id: 4, name: "Whatsapp", day1: "Monday",   day2: "Wednesday" },
  { id: 5, name: "Surveys",  day1: "Tuesday",  day2: "Thursday"  },
  { id: 6, name: "Ads",      day1: "Monday",   day2: "Thursday"  },
  { id: 7, name: "Blogs",    day1: "Monday",   day2: "Friday"    },
];

export default function Dashboard() {
  const { data: balances, isLoading: loadingBalances } = useGetWalletBalances();
  const { data: stats, isLoading: loadingStats } = useGetReferralStats();
  const { user } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [userDetailsOpen, setUserDetailsOpen] = useState(false);

  const country = user?.country ?? null;
  const currencyInfo = getCurrencyInfo(country);
  const fmt = (n: number) => formatCurrency(n, country);

  const mainBal   = balances?.mainWallet    ?? 0;
  const affiliate = balances?.teamEarnings  ?? 0;
  const withdrawn = balances?.totalWithdrawn ?? 0;
  const todayEarn = balances?.todayEarnings  ?? 0;
  const totalEarned = balances?.totalEarned ?? 0;

  const inviteLink =
    stats?.inviteLink ||
    (user?.referralCode
      ? `https://www.maligain.com/register?ref=${user.referralCode}`
      : "https://www.maligain.com/register");

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteLink);
    toast({ title: "Copied!", description: "Invite link copied to clipboard." });
  };

  const shareUrl = encodeURIComponent(inviteLink);
  const shareText = encodeURIComponent("Join MALIGAIN and start earning today! 💰");

  const STAT_CARDS = [
    {
      label: "Balance",
      value: fmt(mainBal),
      badge: "+42%",
      icon: Wallet,
      href: "/recharge",
    },
    {
      label: "Withdrawn",
      value: fmt(withdrawn),
      badge: "+10%",
      icon: ArrowDownCircle,
      href: "/withdraw",
    },
    {
      label: "Affiliate Earnings",
      value: fmt(affiliate),
      badge: "+27%",
      icon: Users,
      href: "/downlines",
    },
    {
      label: "Agent Bonus",
      value: fmt(todayEarn),
      badge: "+32.5%",
      icon: Gift,
      href: "/bonus",
    },
  ];

  const SERVICE_ROWS = [
    { label: "Ads Earnings",      icon: ClipboardList, color: "bg-blue-500",    value: fmt(0) },
    { label: "TikTok Earnings",   icon: Play,          color: "bg-pink-500",    value: fmt(0) },
    { label: "Youtube Earnings",  icon: Play,          color: "bg-red-500",     value: fmt(0) },
    { label: "Survey Earnings",   icon: Puzzle,        color: "bg-amber-500",   value: fmt(0) },
    { label: "Blog Earnings",     icon: PenLine,       color: "bg-violet-500",  value: fmt(0) },
    { label: "Chat Earnings",     icon: HeartHandshake, color: "bg-emerald-500",value: fmt(0) },
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
        style={{ background: "linear-gradient(135deg, #3b5bdb 0%, #5b8dee 50%, #8b6ff5 100%)" }}
      >
        {/* ambient glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute w-64 h-64 -top-16 -left-16 rounded-full opacity-20"
            style={{ background: "radial-gradient(circle, rgba(255,255,255,0.5) 0%, transparent 70%)" }} />
          <div className="absolute w-48 h-48 -bottom-10 -right-10 rounded-full opacity-15"
            style={{ background: "radial-gradient(circle, rgba(255,255,255,0.4) 0%, transparent 70%)" }} />
        </div>

        <div className="relative z-10 px-5 py-5">
          {/* greeting */}
          <p className="text-white/60 text-xs mb-4">
            👋 Welcome back,{" "}
            <span className="text-white font-semibold">{user?.username || "User"}</span>
          </p>

          {/* two stats divided */}
          <div className="flex items-center">
            {/* Left: expense/spent */}
            <div className="flex-1 text-center">
              <p className="text-white/60 text-[11px] font-medium mb-1">Account Balance</p>
              <p className="text-white text-2xl font-black">{fmt(mainBal)}</p>
            </div>

            {/* Divider */}
            <div className="w-px h-14 bg-white/25 mx-4 flex-shrink-0" />

            {/* Right: total earnings */}
            <div className="flex-1 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <TrendingUp className="w-3 h-3 text-emerald-300" />
                <p className="text-emerald-300 text-[11px] font-medium">Total Earnings</p>
              </div>
              <p className="text-white text-2xl font-black">{fmt(totalEarned)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. FOUR STAT CARDS ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {STAT_CARDS.map(({ label, value, badge, icon: Icon, href }) => (
          <div
            key={label}
            className="bg-card border border-border rounded-2xl p-3.5 shadow-sm flex flex-col gap-3 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => navigate(href)}
          >
            {/* top row: label + badge */}
            <div className="flex items-start justify-between gap-1">
              <p className="text-muted-foreground text-[11px] font-semibold leading-tight">{label}</p>
              <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded-full whitespace-nowrap flex-shrink-0">
                {badge}
              </span>
            </div>

            {/* value */}
            <p className="text-foreground text-base font-black leading-none break-all">{value}</p>

            {/* bottom row: ALL TIME + icon */}
            <div className="flex items-end justify-between">
              <div>
                <p className="text-[9px] text-muted-foreground uppercase tracking-wider">All Time</p>
                <button className="text-primary text-[10px] font-semibold mt-0.5 hover:underline">
                  Show full stats &rsaquo;
                </button>
              </div>
              <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Icon className="w-4 h-4 text-primary" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── 3. SERVICE BALANCE ─────────────────────────────────────────────── */}
      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3.5 border-b border-border">
          <div className="w-1 h-4 rounded-full bg-primary flex-shrink-0" />
          <h2 className="text-foreground text-sm font-bold uppercase tracking-wider">Service Balance</h2>
        </div>
        <div className="divide-y divide-border">
          {SERVICE_ROWS.map(({ label, icon: Icon, color, value }) => (
            <div key={label} className="flex items-center gap-3 px-4 py-3.5">
              <div className={`w-8 h-8 rounded-xl ${color} flex items-center justify-center flex-shrink-0`}>
                <Icon className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="flex-1 text-foreground text-sm font-medium">{label}</span>
              <span className="text-primary text-sm font-bold">{value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── 4. INVITE LINK + TIMETABLE (side by side on sm+) ──────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* INVITE LINK */}
        <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-border">
            <div className="flex items-center gap-2">
              <div className="w-1 h-4 rounded-full bg-primary flex-shrink-0" />
              <h2 className="text-foreground text-sm font-bold uppercase tracking-wider">Invite Link</h2>
            </div>
            <Share2 className="w-4 h-4 text-muted-foreground" />
          </div>

          <div className="p-4 space-y-3">
            {/* Stats row */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Invited",   value: String(stats?.totalInvited   ?? 0) },
                { label: "Activated", value: String(stats?.totalActivated ?? 0) },
                { label: "Affiliate", value: fmt(affiliate) },
              ].map((s) => (
                <div key={s.label} className="bg-muted border border-border rounded-xl p-2 text-center">
                  <p className="text-foreground font-black text-sm leading-none truncate">{s.value}</p>
                  <p className="text-muted-foreground text-[9px] uppercase tracking-wide mt-1">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Link box */}
            <div className="bg-muted border border-border rounded-xl px-3 py-2.5">
              <p className="text-[9px] text-muted-foreground uppercase tracking-wide mb-1">Invite link</p>
              <p className="text-xs text-primary font-mono truncate">{inviteLink}</p>
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
              <p className="text-muted-foreground text-[10px] mb-2">Or Click on the Icons to Share</p>
              <div className="flex items-center gap-3">
                <a
                  href={`https://wa.me/?text=${shareText}%20${shareUrl}`}
                  target="_blank" rel="noopener noreferrer"
                  className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-white hover:scale-110 transition-transform"
                >
                  <MessageCircle className="w-4 h-4" />
                </a>
                <a
                  href={`https://twitter.com/intent/tweet?text=${shareText}&url=${shareUrl}`}
                  target="_blank" rel="noopener noreferrer"
                  className="w-8 h-8 rounded-lg bg-sky-500 flex items-center justify-center text-white hover:scale-110 transition-transform"
                >
                  <Twitter className="w-4 h-4" />
                </a>
                <a
                  href={`https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`}
                  target="_blank" rel="noopener noreferrer"
                  className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white hover:scale-110 transition-transform"
                >
                  <Facebook className="w-4 h-4" />
                </a>
                <a
                  href={`mailto:?subject=Join+MALIGAIN&body=${shareText}%20${shareUrl}`}
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
            <h2 className="text-foreground text-sm font-bold uppercase tracking-wider">Timetable</h2>
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
                    <td className="py-2 pr-2 text-muted-foreground">{row.id}</td>
                    <td className="py-2 pr-2 font-medium">{row.name}</td>
                    <td className="py-2 pr-2 text-muted-foreground">{row.day1}</td>
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
          <h2 className="text-foreground text-sm font-bold uppercase tracking-wider">User Details</h2>
        </div>
        <button
          type="button"
          onClick={() => setUserDetailsOpen((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-4 text-left hover:bg-muted/50 transition-colors"
        >
          <span className="text-muted-foreground text-sm font-medium uppercase tracking-wide">
            Click to View
          </span>
          {userDetailsOpen
            ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
            : <ChevronDown className="w-4 h-4 text-muted-foreground" />
          }
        </button>
        {userDetailsOpen && (
          <div className="border-t border-border divide-y divide-border">
            {[
              { label: "Username",   value: user?.username   || "—" },
              { label: "Email",      value: user?.email      || "—" },
              { label: "Phone",      value: user?.phone      || "—" },
              { label: "Country",    value: user?.country    || "—" },
              { label: "Currency",   value: currencyInfo.code },
              { label: "Status",     value: user?.status     || "—" },
              { label: "Referral Code", value: user?.referralCode || "—" },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between px-4 py-3">
                <span className="text-muted-foreground text-xs font-medium uppercase tracking-wide">{label}</span>
                <span className="text-foreground text-sm font-semibold">{value}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Footer ───────────────────────────────────────────────────────────── */}
      <p className="text-center text-xs text-muted-foreground pb-2">
        © 2026 <span className="font-semibold text-foreground">MALIGAIN</span>. All rights reserved.
      </p>
    </div>
  );
}
