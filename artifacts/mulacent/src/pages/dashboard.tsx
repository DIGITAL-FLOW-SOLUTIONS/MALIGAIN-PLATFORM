import { useGetWalletBalances, useGetReferralStats } from "@workspace/api-client-react";
import { formatCurrency, getCurrencyInfo } from "@/lib/utils";
import { Copy, Users, Wallet, TrendingUp, ArrowDownCircle, Clock, Share2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { ReferralNotificationBanner } from "@/components/ReferralNotificationBanner";

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
        <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
          <Icon className="w-4 h-4 text-white" />
        </div>
        <span className="text-[9px] font-bold tracking-wider text-white/80 uppercase bg-white/15 px-1.5 py-0.5 rounded-full whitespace-nowrap">
          {badge}
        </span>
      </div>
      <div>
        <p className="text-[10px] text-white/70 uppercase tracking-wide mb-0.5 leading-tight">{label}</p>
        <p className="text-lg font-black text-white leading-tight break-all">{value}</p>
        <p className="text-[10px] text-white/60 mt-0.5 leading-tight">{sub}</p>
      </div>
    </div>
  );
}

function QuickStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex-1 bg-white/10 border border-white/20 rounded-xl px-3 py-3 text-center min-w-0">
      <p className="text-base font-black text-white leading-tight truncate">{value}</p>
      <p className="text-[10px] text-white/60 uppercase tracking-wide mt-0.5">{label}</p>
    </div>
  );
}

function Ticker() {
  return (
    <div className="overflow-hidden bg-primary/5 border border-primary/15 rounded-xl py-3 px-4">
      <div style={{ animation: "ticker 28s linear infinite", display: "inline-block", whiteSpace: "nowrap" }}>
        <style>{`@keyframes ticker { 0% { transform: translateX(100%); } 100% { transform: translateX(-100%); } }`}</style>
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
      gradient: "linear-gradient(135deg, #5b8dee 0%, #6366f1 100%)",
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
      gradient: "linear-gradient(135deg, #8b6ff5 0%, #4338ca 100%)",
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
      gradient: "linear-gradient(135deg, #5b8dee 0%, #8b6ff5 100%)",
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
    <div className="space-y-4">
      {/* Hero Section */}
      <div
        className="relative rounded-2xl overflow-hidden border border-primary/20"
        style={{ background: "linear-gradient(135deg, #3b5bdb 0%, #5b8dee 50%, #8b6ff5 100%)" }}
      >
        {/* Soft ambient orbs */}
        <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
          <div className="absolute w-[55%] h-[130%] top-[-20%] left-[-10%] opacity-30"
            style={{ background: "radial-gradient(ellipse, rgba(255,255,255,0.4) 0%, transparent 65%)" }} />
          <div className="absolute w-[50%] h-[120%] top-[-15%] right-[-5%] opacity-20"
            style={{ background: "radial-gradient(ellipse, rgba(255,255,255,0.3) 0%, transparent 65%)" }} />
        </div>

        {/* User row */}
        <div className="relative z-10 flex items-center gap-3 px-4 pt-4 pb-0">
          <div className="w-11 h-11 rounded-full bg-white/20 border border-white/30 flex items-center justify-center text-white font-bold text-sm shadow-lg flex-shrink-0">
            {user?.avatarInitials || "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white/70 text-[11px] font-medium">{getGreeting()},</p>
            <p className="text-white font-bold text-base leading-tight truncate">{user?.username || "User"}</p>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className="text-[10px] font-bold text-white border border-white/30 bg-white/15 px-2 py-0.5 rounded-full uppercase tracking-wide">
              Active
            </span>
            <span className="text-[10px] font-bold text-white bg-white/20 px-2 py-0.5 rounded-full">{currencyInfo.code}</span>
          </div>
        </div>

        {/* Balance */}
        <div className="relative z-10 px-4 pt-5 pb-4 text-center">
          <p className="text-xs text-white/60 uppercase tracking-widest mb-1">Account Balance</p>
          <p className="text-4xl sm:text-5xl font-black text-white drop-shadow-lg leading-none">
            {fmt(totalIncome)}
          </p>
          <p className="text-xs text-white/50 mt-1.5">Main wallet balance</p>
        </div>

        {/* Quick Stats Row */}
        <div className="relative z-10 flex gap-2 px-4 pb-4">
          <QuickStat label="Affiliate" value={fmt(balances?.teamEarnings || 0)} />
          <QuickStat label="Withdrawn" value={fmt(balances?.totalWithdrawn || 0)} />
          <QuickStat label="Today" value={fmt(balances?.todayEarnings || 0)} />
        </div>
      </div>

      {/* Referral notification */}
      <ReferralNotificationBanner count={stats?.todayReferrals ?? 0} />

      {/* Wallet Cards */}
      <div>
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2.5">Your Wallets</p>
        <div className="grid grid-cols-2 gap-3">
          {WALLET_CARDS.map((card) => (
            <WalletCard key={card.label} {...card} />
          ))}
        </div>
      </div>

      {/* Ticker */}
      <Ticker />

      {/* Referral Link */}
      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Share2 className="w-4 h-4 text-primary" />
            </div>
            <h3 className="text-foreground font-semibold text-sm">Your Invite Link</h3>
          </div>
          <span className="text-[10px] font-medium text-primary bg-primary/10 border border-primary/20 px-2.5 py-1 rounded-full whitespace-nowrap">
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
            <div key={s.label} className="bg-muted border border-border rounded-xl p-2.5 text-center">
              <p className="text-foreground font-black text-base leading-none truncate">{s.value}</p>
              <p className="text-muted-foreground text-[10px] mt-1 uppercase tracking-wide">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 bg-muted border border-border rounded-xl px-3 py-3 mb-3">
          <span className="text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded uppercase tracking-wider flex-shrink-0">
            Invite
          </span>
          <p className="text-xs text-muted-foreground font-mono truncate flex-1">
            {inviteLink || "Loading invite link..."}
          </p>
        </div>

        <button
          onClick={handleCopy}
          className="w-full py-3.5 rounded-xl font-semibold text-primary-foreground text-sm flex items-center justify-center gap-2 transition-all hover:opacity-90 active:scale-[0.99] bg-primary"
        >
          <Copy className="w-4 h-4" />
          Copy Invite Link
        </button>
      </div>

      <p className="text-center text-xs text-muted-foreground pb-2">
        © 2026 MALIGAIN. All rights reserved.
      </p>
    </div>
  );
}
