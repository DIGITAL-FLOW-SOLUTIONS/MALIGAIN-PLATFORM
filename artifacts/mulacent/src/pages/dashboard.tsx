import { useGetWalletBalances, useGetReferralStats } from "@workspace/api-client-react";
import { formatCurrency, getCurrencyInfo } from "@/lib/utils";
import { Copy, Users, Wallet, TrendingUp, ArrowDownCircle, Clock, Share2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { ReferralNotificationBanner } from "@/components/ReferralNotificationBanner";

function AnimatedBg() {
  return (
    <div className="absolute inset-0 overflow-hidden rounded-2xl">
      <div className="absolute inset-0" style={{ background: "#1a0508" }} />
      <div
        className="absolute"
        style={{
          width: "55%", height: "130%",
          top: "-20%", left: "-10%",
          background: "radial-gradient(ellipse, rgba(139,92,246,0.55) 0%, transparent 65%)",
          animation: "orb1 9s ease-in-out infinite alternate",
        }}
      />
      <div
        className="absolute"
        style={{
          width: "50%", height: "120%",
          top: "-15%", right: "-5%",
          background: "radial-gradient(ellipse, rgba(251,146,60,0.45) 0%, transparent 65%)",
          animation: "orb2 11s ease-in-out infinite alternate",
        }}
      />
      <div
        className="absolute"
        style={{
          width: "60%", height: "100%",
          bottom: "-30%", left: "20%",
          background: "radial-gradient(ellipse, rgba(244,63,94,0.40) 0%, transparent 60%)",
          animation: "orb3 13s ease-in-out infinite alternate",
        }}
      />
      <div
        className="absolute"
        style={{
          width: "45%", height: "90%",
          top: "10%", left: "30%",
          background: "radial-gradient(ellipse, rgba(20,184,166,0.35) 0%, transparent 60%)",
          animation: "orb4 7s ease-in-out infinite alternate",
        }}
      />
      <div
        className="absolute"
        style={{
          width: "40%", height: "80%",
          bottom: "-10%", left: "0%",
          background: "radial-gradient(ellipse, rgba(99,102,241,0.35) 0%, transparent 65%)",
          animation: "orb5 10s ease-in-out infinite alternate",
        }}
      />
      <div className="absolute inset-0 opacity-[0.03]"
        style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")" }} />
      <style>{`
        @keyframes orb1 { 0% { transform: translate(0%,0%) scale(1); } 100% { transform: translate(8%,12%) scale(1.1); } }
        @keyframes orb2 { 0% { transform: translate(0%,0%) scale(1); } 100% { transform: translate(-10%,8%) scale(1.15); } }
        @keyframes orb3 { 0% { transform: translate(0%,0%) scale(1); } 100% { transform: translate(6%,-10%) scale(1.08); } }
        @keyframes orb4 { 0% { transform: translate(0%,0%) scale(1); opacity:0.8; } 100% { transform: translate(-8%,6%) scale(1.2); opacity:1; } }
        @keyframes orb5 { 0% { transform: translate(0%,0%) scale(1); } 100% { transform: translate(10%,-8%) scale(1.12); } }
        @keyframes ticker { 0% { transform: translateX(100%); } 100% { transform: translateX(-100%); } }
      `}</style>
    </div>
  );
}

interface WalletCardProps {
  label: string;
  badge: string;
  value: string;
  sub: string;
  icon: React.ElementType;
  gradient: string;
}

function WalletCard({ label, badge, value, sub, icon: Icon, gradient }: WalletCardProps) {
  return (
    <div
      className="relative rounded-2xl p-4 overflow-hidden flex flex-col justify-between min-h-[140px]"
      style={{ background: gradient }}
    >
      <div className="flex items-start justify-between gap-1">
        <div className="w-9 h-9 bg-white/15 rounded-xl flex items-center justify-center flex-shrink-0">
          <Icon className="w-4 h-4 text-white" />
        </div>
        <span className="text-[9px] font-bold tracking-wider text-white/70 uppercase bg-white/10 px-1.5 py-0.5 rounded-full whitespace-nowrap">
          {badge}
        </span>
      </div>
      <div>
        <p className="text-[10px] text-white/60 uppercase tracking-wide mb-0.5 leading-tight">{label}</p>
        <p className="text-lg font-black text-white leading-tight break-all">{value}</p>
        <p className="text-[10px] text-white/50 mt-0.5 leading-tight">{sub}</p>
      </div>
    </div>
  );
}

function QuickStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex-1 bg-white/5 border border-white/8 rounded-xl px-3 py-3 text-center min-w-0">
      <p className="text-base font-black text-white leading-tight truncate">{value}</p>
      <p className="text-[10px] text-slate-500 uppercase tracking-wide mt-0.5">{label}</p>
    </div>
  );
}

function Ticker() {
  return (
    <div className="overflow-hidden bg-gradient-to-r from-red-500/10 via-red-700/10 to-red-500/10 border border-red-500/20 rounded-xl py-3 px-4">
      <div style={{ animation: "ticker 28s linear infinite", display: "inline-block", whiteSpace: "nowrap" }}>
        📢 ⚡ 🔥 LETS CHESS THE BAG 💰 MALIGAIN! 🔥 ⚡ 📢 &nbsp;&nbsp;&nbsp; 📢 ⚡ 🔥 LETS CHESS THE BAG 💰 MALIGAIN! 🔥 ⚡ 📢
      </div>
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function Dashboard() {
  const { data: balances, isLoading: loadingBalances } = useGetWalletBalances();
  const { data: stats, isLoading: loadingStats } = useGetReferralStats();
  const { user } = useAuth();
  const { toast } = useToast();

  const country = user?.country ?? null;
  const currencyInfo = getCurrencyInfo(country);

  const totalIncome = parseFloat(String(balances?.mainWallet || 0));

  // Use stats inviteLink when available; fall back to constructing it from
  // user.referralCode (already in memory from auth) so it always shows.
  const inviteLink =
    stats?.inviteLink ||
    (user?.referralCode
      ? `https://www.maligain.com/register?ref=${user.referralCode}`
      : null);

  const handleCopy = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink);
      toast({ title: "Copied!", description: "Invite link copied to clipboard." });
    }
  };

  const fmt = (n: number) => formatCurrency(n, country);

  const WALLET_CARDS: WalletCardProps[] = [
    {
      label: "Affiliate Balance",
      badge: "Team",
      value: fmt(balances?.teamEarnings || 0),
      sub: `${balances?.activeMembers || 0} members`,
      icon: Users,
      gradient: "linear-gradient(135deg, #0ea5e9 0%, #6366f1 100%)",
    },
    {
      label: "Account Balance",
      badge: "Main",
      value: fmt(balances?.mainWallet || 0),
      sub: "Primary balance",
      icon: Wallet,
      gradient: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
    },
    {
      label: "Total Withdrawn",
      badge: "Paid",
      value: fmt(balances?.totalWithdrawn || 0),
      sub: "Lifetime payouts",
      icon: ArrowDownCircle,
      gradient: "linear-gradient(135deg, #14b8a6 0%, #0891b2 100%)",
    },
    {
      label: "Total Earned",
      badge: "Total",
      value: fmt(balances?.totalEarned || 0),
      sub: "Wallets + withdrawn",
      icon: TrendingUp,
      gradient: "linear-gradient(135deg, #6366f1 0%, #4338ca 100%)",
    },
    {
      label: "Today's Earnings",
      badge: "Today",
      value: fmt(balances?.todayEarnings || 0),
      sub: "Resets at midnight",
      icon: Clock,
      gradient: "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
    },
    {
      label: "Active Members",
      badge: "Network",
      value: String(balances?.activeMembers || 0),
      sub: "Your network size",
      icon: Users,
      gradient: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
    },
  ];

  if (loadingBalances || loadingStats) {
    return (
      <div className="space-y-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-32 bg-white/5 rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Hero Section */}
      <div className="relative rounded-2xl overflow-hidden border border-red-900/20" style={{ background: "#1a0508" }}>
        <AnimatedBg />

        {/* User row */}
        <div className="relative z-10 flex items-center gap-3 px-4 pt-4 pb-0">
          <div className="w-11 h-11 rounded-full bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-cyan-500/30 flex-shrink-0">
            {user?.avatarInitials || "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-red-400 text-[11px] font-medium">{getGreeting()},</p>
            <p className="text-white font-bold text-base leading-tight truncate">{user?.username || "User"}</p>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className="text-[10px] font-bold text-emerald-400 border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 rounded-full uppercase tracking-wide">
              Active
            </span>
            <span className="text-[10px] font-bold text-red-300 bg-red-500/20 px-2 py-0.5 rounded-full">{currencyInfo.code}</span>
          </div>
        </div>

        {/* Balance */}
        <div className="relative z-10 px-4 pt-5 pb-4 text-center">
          <p className="text-xs text-slate-400 uppercase tracking-widest mb-1">Account Balance</p>
          <p
            className="text-4xl sm:text-5xl font-black text-white drop-shadow-lg leading-none"
            style={{ textShadow: "0 0 40px rgba(220,38,38,0.4)" }}
          >
            {fmt(totalIncome)}
          </p>
          <p className="text-xs text-slate-500 mt-1.5">Main wallet balance</p>
        </div>

        {/* Quick Stats Row */}
        <div className="relative z-10 flex gap-2 px-4 pb-4">
          <QuickStat label="Affiliate" value={fmt(balances?.teamEarnings || 0)} />
          <QuickStat label="Withdrawn" value={fmt(balances?.totalWithdrawn || 0)} />
          <QuickStat label="Today" value={fmt(balances?.todayEarnings || 0)} />
        </div>
      </div>

      {/* Referral notification — triggers inside component when 7+ direct referrals made today */}
      <ReferralNotificationBanner count={stats?.todayReferrals ?? 0} />

      {/* Wallet Cards */}
      <div>
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2.5">Your Wallets</p>
        <div className="grid grid-cols-2 gap-3">
          {WALLET_CARDS.map((card) => (
            <WalletCard key={card.label} {...card} />
          ))}
        </div>
      </div>

      {/* Ticker */}
      <Ticker />

      {/* Referral Link */}
      <div className="rounded-2xl border border-red-900/20 bg-[#1a0508] p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-red-500/20 flex items-center justify-center flex-shrink-0">
              <Share2 className="w-4 h-4 text-red-400" />
            </div>
            <h3 className="text-white font-semibold text-sm">Your Invite Link</h3>
          </div>
          <span className="text-[10px] font-medium text-red-400 bg-red-500/10 border border-red-500/20 px-2.5 py-1 rounded-full whitespace-nowrap">
            Earn per activation
          </span>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[
            { value: String(stats?.totalInvited || 0), label: "Invited" },
            { value: String(stats?.totalActivated || 0), label: "Activated" },
            { value: fmt(balances?.teamEarnings || 0), label: "Affiliate Bal." },
          ].map((s) => (
            <div key={s.label} className="bg-white/5 border border-white/8 rounded-xl p-2.5 text-center">
              <p className="text-white font-black text-base leading-none truncate">{s.value}</p>
              <p className="text-slate-500 text-[10px] mt-1 uppercase tracking-wide">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 bg-white/5 border border-white/8 rounded-xl px-3 py-3 mb-3">
          <span className="text-[10px] font-bold text-red-400 bg-red-500/20 px-1.5 py-0.5 rounded uppercase tracking-wider flex-shrink-0">
            Invite
          </span>
          <p className="text-xs text-slate-300 font-mono truncate flex-1">
            {inviteLink || "Loading invite link..."}
          </p>
        </div>

        <button
          onClick={handleCopy}
          className="w-full py-3.5 rounded-xl font-semibold text-white text-sm flex items-center justify-center gap-2 transition-all hover:opacity-90 active:scale-[0.99]"
          style={{ background: "linear-gradient(135deg, #dc2626 0%, #991b1b 100%)" }}
        >
          <Copy className="w-4 h-4" />
          Copy Invite Link
        </button>
      </div>

      <p className="text-center text-xs text-slate-700 pb-2">
        © 2026 MALIGAIN. All rights reserved.
      </p>
    </div>
  );
}
