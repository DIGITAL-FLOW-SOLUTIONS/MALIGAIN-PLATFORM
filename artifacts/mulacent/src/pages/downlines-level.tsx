import { useState } from "react";
import { useGetDownlines, useGetReferralStats } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { formatDate, amountFontClass } from "@/lib/utils";
import {
  Search, Copy, Phone, MapPin, Calendar, Users,
  UserCheck, UserX, TrendingUp, Award, Share2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocation } from "wouter";

const AVATAR_GRADIENTS = [
  "from-primary to-blue-600",
  "from-violet-500 to-purple-600",
  "from-orange-500 to-amber-500",
  "from-pink-500 to-rose-500",
  "from-emerald-500 to-teal-500",
  "from-cyan-500 to-blue-500",
  "from-fuchsia-500 to-pink-600",
  "from-lime-500 to-green-600",
];

const LEVEL_LABELS: Record<number, string> = {
  1: "Direct Referrals",
  2: "Level 2 Referrals",
  3: "Level 3 Referrals",
};

const LEVEL_DESCRIPTIONS: Record<number, string> = {
  1: "People you personally invited",
  2: "Referrals made by your direct team",
  3: "Referrals from your Level 2 members",
};

interface Props {
  level: 1 | 2 | 3;
  status: "active" | "inactive";
}

export default function DownlinesLevelPage({ level, status }: Props) {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [copied, setCopied] = useState(false);
  const [, navigate] = useLocation();

  const levelKey = `level${level}`;
  const isActive = status === "active";

  const { data, isLoading } = useGetDownlines({
    level: levelKey,
    status,
    search,
  });
  const { data: stats } = useGetReferralStats();

  const inviteLink =
    stats?.inviteLink ||
    (user?.referralCode
      ? `https://www.maligain.com/register?ref=${user.referralCode}`
      : null);

  const handleCopy = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const members = data?.downlines ?? [];
  const totalActive   = data?.active   ?? 0;
  const totalInactive = data?.inactive ?? 0;
  const totalCount    = data?.total    ?? 0;
  const activeRate    = totalCount > 0 ? Math.round((totalActive / totalCount) * 100) : 0;
  const totalRefs     = members.reduce((acc, m) => acc + (m.referralCount ?? 0), 0);

  /* ── Sister page href ─────────────────────────────────── */
  const sisterHref = `/team/level-${level}/${isActive ? "inactive" : "active"}`;

  return (
    <div className="space-y-5">

      {/* ── HERO BANNER ─────────────────────────────────────────── */}
      <div
        className="relative rounded-2xl overflow-hidden"
        style={{
          background: isActive
            ? "linear-gradient(135deg, #3b5bdb 0%, #5b8dee 50%, #10b981 100%)"
            : "linear-gradient(135deg, #6d28d9 0%, #7c3aed 50%, #dc2626 100%)",
        }}
      >
        {/* Dot grid */}
        <div
          className="absolute inset-0 pointer-events-none opacity-20"
          style={{
            backgroundImage: "radial-gradient(rgba(255,255,255,0.4) 1px, transparent 1px)",
            backgroundSize: "18px 18px",
          }}
        />
        {/* Glow orbs */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute w-56 h-56 -top-12 -right-12 rounded-full opacity-20"
            style={{ background: "radial-gradient(circle, rgba(255,255,255,0.6) 0%, transparent 70%)" }} />
          <div className="absolute w-40 h-40 -bottom-8 -left-8 rounded-full opacity-15"
            style={{ background: "radial-gradient(circle, rgba(255,255,255,0.5) 0%, transparent 70%)" }} />
        </div>

        <div className="relative z-10 px-5 pt-5 pb-5">
          {/* Level + status badges */}
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <span className="inline-flex items-center gap-1.5 bg-white/20 border border-white/30 text-white text-xs font-bold px-3 py-1.5 rounded-full">
              <Users className="w-3 h-3" />
              Level {level}
            </span>
            <span className={cn(
              "inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full border",
              isActive
                ? "bg-emerald-500 border-emerald-400 text-white"
                : "bg-rose-500 border-rose-400 text-white"
            )}>
              {isActive ? <UserCheck className="w-3 h-3" /> : <UserX className="w-3 h-3" />}
              {isActive ? "Active" : "Inactive"}
            </span>
          </div>

          <h1 className="text-2xl font-black text-white leading-tight mb-0.5">
            {LEVEL_LABELS[level]}
          </h1>
          <p className="text-white/70 text-sm mb-5">{LEVEL_DESCRIPTIONS[level]}</p>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-black/20 border border-white/20 rounded-xl px-3 py-3 text-center">
              <p className={cn("text-white font-black leading-none", amountFontClass(String(isLoading ? "—" : (isActive ? totalActive : totalInactive)), "md"))}>
                {isLoading ? "—" : (isActive ? totalActive : totalInactive)}
              </p>
              <p className="text-white/50 text-[10px] uppercase tracking-widest mt-1.5">
                {isActive ? "Active" : "Inactive"}
              </p>
            </div>
            <div className="bg-black/20 border border-white/20 rounded-xl px-3 py-3 text-center">
              <p className={cn("text-white font-black leading-none", amountFontClass(String(isLoading ? "—" : totalCount), "md"))}>
                {isLoading ? "—" : totalCount}
              </p>
              <p className="text-white/50 text-[10px] uppercase tracking-widest mt-1.5">Total L{level}</p>
            </div>
            <div className="bg-black/20 border border-white/20 rounded-xl px-3 py-3 text-center">
              <p className={cn("text-white font-black leading-none", amountFontClass(isLoading ? "—" : `${activeRate}%`, "md"))}>
                {isLoading ? "—" : `${activeRate}%`}
              </p>
              <p className="text-white/50 text-[10px] uppercase tracking-widest mt-1.5">Active Rate</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── ANALYTICS STRIP ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Total shown */}
        <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wide leading-tight">
              {isActive ? "Active" : "Inactive"}
            </p>
            <div className={cn(
              "w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0",
              isActive ? "bg-emerald-50 border border-emerald-200" : "bg-rose-50 border border-rose-200"
            )}>
              {isActive
                ? <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                : <UserX     className="w-3.5 h-3.5 text-rose-500"    />
              }
            </div>
          </div>
          <p className={cn(
            "font-black leading-none",
            isActive ? "text-emerald-600" : "text-rose-500",
            amountFontClass(String(isLoading ? "—" : (isActive ? totalActive : totalInactive)), "md")
          )}>
            {isLoading ? "—" : (isActive ? totalActive : totalInactive)}
          </p>
          <p className="text-muted-foreground text-[10px] mt-1.5">members</p>
        </div>

        {/* Total level */}
        <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wide leading-tight">Total L{level}</p>
            <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
              <Users className="w-3.5 h-3.5 text-primary" />
            </div>
          </div>
          <p className={cn("text-foreground font-black leading-none", amountFontClass(String(isLoading ? "—" : totalCount), "md"))}>
            {isLoading ? "—" : totalCount}
          </p>
          <p className="text-muted-foreground text-[10px] mt-1.5">in this level</p>
        </div>

        {/* Active rate */}
        <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wide leading-tight">Active Rate</p>
            <div className="w-7 h-7 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-3.5 h-3.5 text-amber-600" />
            </div>
          </div>
          <p className={cn("text-amber-600 font-black leading-none", amountFontClass(isLoading ? "—" : `${activeRate}%`, "md"))}>
            {isLoading ? "—" : `${activeRate}%`}
          </p>
          <p className="text-muted-foreground text-[10px] mt-1.5">activation</p>
        </div>

        {/* Sub-referrals */}
        <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-muted-foreground text-[11px] font-semibold uppercase tracking-wide leading-tight">Sub-Refs</p>
            <div className="w-7 h-7 rounded-lg bg-violet-50 border border-violet-200 flex items-center justify-center flex-shrink-0">
              <Award className="w-3.5 h-3.5 text-violet-600" />
            </div>
          </div>
          <p className={cn("text-violet-600 font-black leading-none", amountFontClass(String(isLoading ? "—" : totalRefs), "md"))}>
            {isLoading ? "—" : totalRefs}
          </p>
          <p className="text-muted-foreground text-[10px] mt-1.5">by this group</p>
        </div>
      </div>

      {/* ── SWITCH + INVITE ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Toggle to sister status */}
        <button
          onClick={() => navigate(sisterHref)}
          className={cn(
            "flex items-center gap-3 p-4 rounded-2xl border transition-all text-left group hover:shadow-md active:scale-[0.99]",
            isActive
              ? "bg-rose-50 border-rose-200 hover:bg-rose-100 dark:bg-rose-500/10 dark:border-rose-500/30 dark:hover:bg-rose-500/20"
              : "bg-emerald-50 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-500/10 dark:border-emerald-500/30 dark:hover:bg-emerald-500/20"
          )}
        >
          <div className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
            isActive
              ? "bg-rose-100 border border-rose-300 dark:bg-rose-500/20 dark:border-rose-500/40"
              : "bg-emerald-100 border border-emerald-300 dark:bg-emerald-500/20 dark:border-emerald-500/40"
          )}>
            {isActive
              ? <UserX      className="w-5 h-5 text-rose-500"    />
              : <UserCheck  className="w-5 h-5 text-emerald-600" />
            }
          </div>
          <div>
            <p className={cn(
              "font-bold text-sm",
              isActive ? "text-rose-700 dark:text-rose-400" : "text-emerald-700 dark:text-emerald-400"
            )}>
              View {isActive ? "Inactive" : "Active"} Members
            </p>
            <p className="text-muted-foreground text-xs mt-0.5">
              <span className={cn("font-bold", amountFontClass(String(isActive ? totalInactive : totalActive), "sm"))}>
                {isActive ? totalInactive : totalActive}
              </span>{" "}
              {isActive ? "inactive" : "active"} in Level {level}
            </p>
          </div>
          <span className={cn(
            "ml-auto text-lg font-black",
            isActive ? "text-rose-400" : "text-emerald-500"
          )}>›</span>
        </button>

        {/* Invite link */}
        <div className="bg-card border border-border rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2.5">
            <Share2 className="w-3.5 h-3.5 text-primary" />
            <p className="text-primary text-xs font-bold uppercase tracking-widest">Invite Link</p>
          </div>
          <div className="flex gap-2">
            <div className="flex-1 bg-muted border border-border rounded-xl px-3 py-2 text-xs text-muted-foreground truncate min-w-0 font-mono">
              {inviteLink || "Loading..."}
            </div>
            <button
              onClick={handleCopy}
              className="font-bold text-xs px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap bg-primary text-primary-foreground shadow-sm active:scale-95 hover:opacity-90"
            >
              <Copy className="w-3.5 h-3.5" />
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>
      </div>

      {/* ── MEMBER LIST ─────────────────────────────────────────── */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
        {/* Header + search */}
        <div className="px-5 py-4 border-b border-border space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-1 h-4 rounded-full bg-primary flex-shrink-0" />
              <span className="text-foreground font-bold text-sm uppercase tracking-wider">
                {isActive ? "Active" : "Inactive"} Members
              </span>
            </div>
            <span className={cn(
              "text-xs font-bold px-2.5 py-1 rounded-full border",
              isActive
                ? "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/25"
                : "bg-rose-50 text-rose-500 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/25"
            )}>
              {members.length} found
            </span>
          </div>

          {/* Search */}
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Search name or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-background border border-input rounded-xl py-2.5 px-4 text-foreground text-sm focus:outline-none focus:border-primary placeholder:text-muted-foreground transition-colors"
            />
            <button className="px-4 rounded-xl bg-primary text-primary-foreground shadow-sm active:scale-95 transition-all hover:opacity-90">
              <Search className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* List body */}
        {isLoading ? (
          <div className="p-14 flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-[3px] border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-muted-foreground text-sm">Loading members...</p>
          </div>
        ) : members.length === 0 ? (
          <div className="px-5 py-16 flex flex-col items-center gap-3 text-center">
            <div className={cn(
              "w-16 h-16 rounded-2xl border flex items-center justify-center",
              isActive ? "bg-muted border-border" : "bg-muted border-border"
            )}>
              {isActive
                ? <UserCheck className="w-7 h-7 text-muted-foreground" />
                : <UserX     className="w-7 h-7 text-muted-foreground" />
              }
            </div>
            <p className="text-foreground font-semibold text-sm">
              No {isActive ? "active" : "inactive"} members in Level {level}
            </p>
            <p className="text-muted-foreground text-xs max-w-xs">
              {isActive
                ? "None of your Level " + level + " referrals are active yet. Encourage them to activate their accounts."
                : "Great news — all your Level " + level + " members are active!"}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {members.map((member, idx) => (
              <div
                key={member.id}
                className="flex items-center gap-3 px-5 py-4 hover:bg-muted/50 transition-colors"
              >
                {/* Avatar */}
                <div className={cn(
                  "w-10 h-10 rounded-full bg-gradient-to-br flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-sm",
                  AVATAR_GRADIENTS[idx % AVATAR_GRADIENTS.length]
                )}>
                  {member.avatarInitials}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-foreground font-semibold text-sm">{member.username}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    {member.phone && (
                      <span className="flex items-center gap-1 text-muted-foreground text-xs">
                        <Phone className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate max-w-[100px]">{member.phone}</span>
                      </span>
                    )}
                    {member.country && (
                      <span className="flex items-center gap-1 text-muted-foreground text-xs">
                        <MapPin className="w-3 h-3 flex-shrink-0" /> {member.country}
                      </span>
                    )}
                    <span className="flex items-center gap-1 text-muted-foreground text-xs">
                      <Calendar className="w-3 h-3 flex-shrink-0" /> {formatDate(member.joinedAt)}
                    </span>
                  </div>
                </div>

                {/* Right */}
                <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                  <span className={cn(
                    "text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase border tracking-wide",
                    member.status === "active"
                      ? "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/25"
                      : "bg-rose-50 text-rose-500 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/25"
                  )}>
                    {member.status}
                  </span>
                  {member.referralCount > 0 && (
                    <span className="text-muted-foreground text-[10px] font-medium">
                      {member.referralCount} refs
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <p className="text-center text-xs text-muted-foreground pb-2">
        © 2026 <span className="font-semibold text-foreground">MALIGAIN</span>. All rights reserved.
      </p>
    </div>
  );
}
