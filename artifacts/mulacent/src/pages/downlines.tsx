import { useState } from "react";
import { useGetDownlines, useGetReferralStats } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { formatDate } from "@/lib/utils";
import { Search, Copy, Phone, MapPin, Calendar, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const LEVEL_TABS = [
  { key: "all", label: "ALL" },
  { key: "level1", label: "DIRECT" },
  { key: "level2", label: "LEVEL 2" },
  { key: "level3", label: "LEVEL 3" },
  { key: "level4", label: "LEVEL 4" },
  { key: "level5", label: "LEVEL 5" },
];

const LEVEL_COLORS = [
  "text-white",
  "text-cyan-400",
  "text-red-400",
  "text-orange-400",
  "text-yellow-400",
  "text-pink-400",
];

const AVATAR_GRADIENTS = [
  "from-teal-500 to-cyan-500",
  "from-violet-500 to-purple-600",
  "from-orange-500 to-amber-500",
  "from-pink-500 to-rose-600",
  "from-green-500 to-emerald-600",
  "from-blue-500 to-indigo-600",
];

export default function Downlines() {
  const { user } = useAuth();
  const [level, setLevel] = useState("all");
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [copied, setCopied] = useState(false);

  const { data, isLoading } = useGetDownlines({ level, status: status as any, search });
  const { data: stats } = useGetReferralStats();

  const activePercent = data?.total ? Math.round((data.active / data.total) * 100) : 0;

  // Use stats inviteLink when available; fall back to user.referralCode already
  // in memory from auth so the link always shows even if the stats API is slow.
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

  return (
    <div className="space-y-4">
      {/* Header card */}
      <div className="bg-[#1a0508] border border-red-900/30 rounded-2xl p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold">
              <span className="text-white">Your </span>
              <span className="text-cyan-400">Network</span>
            </h1>
            <p className="text-slate-400 text-sm mt-0.5">{user?.username || "Your"}'s affiliate tree</p>
          </div>
          <div className="bg-[#0a1a2e] border border-cyan-500/30 rounded-xl px-4 py-2.5 text-center flex-shrink-0">
            <p className="text-cyan-400 font-bold text-xl leading-none">{activePercent}%</p>
            <p className="text-slate-400 text-[10px] uppercase tracking-widest mt-1">Active</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mt-4">
          <div className="bg-[#0d0518]/70 border border-white/8 rounded-xl p-4 relative overflow-hidden">
            <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-slate-400/50" />
            <p className="text-white font-bold text-2xl leading-none">{data?.total ?? 0}</p>
            <p className="text-slate-400 text-[10px] uppercase tracking-widest mt-1.5">Total</p>
          </div>
          <div className="bg-[#0d0518]/70 border border-cyan-900/40 rounded-xl p-4 relative overflow-hidden">
            <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-cyan-400/60" />
            <p className="text-cyan-400 font-bold text-2xl leading-none">{data?.active ?? 0}</p>
            <p className="text-slate-400 text-[10px] uppercase tracking-widest mt-1.5">Active</p>
          </div>
          <div className="bg-[#0d0518]/70 border border-red-900/30 rounded-xl p-4 relative overflow-hidden">
            <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-red-400/60" />
            <p className="text-red-400 font-bold text-2xl leading-none">{data?.inactive ?? 0}</p>
            <p className="text-slate-400 text-[10px] uppercase tracking-widest mt-1.5">Inactive</p>
          </div>
        </div>
      </div>

      {/* Invite link */}
      <div className="bg-[#1a0508] border border-red-900/30 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-5 h-5 rounded-full bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center">
            <svg className="w-3 h-3 text-cyan-400" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101" />
              <path d="M14.828 14.828a4 4 0 015.656 0l4-4a4 4 0 01-5.656-5.656l-1.102 1.1" strokeLinecap="round" />
            </svg>
          </div>
          <p className="text-cyan-400 text-xs font-bold uppercase tracking-widest">Your Invite Link</p>
        </div>
        <div className="flex gap-2">
          <div className="flex-1 bg-[#0d0518]/70 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-300 truncate min-w-0">
            {inviteLink || "Loading invite link..."}
          </div>
          <button
            onClick={handleCopy}
            className="font-bold text-sm px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 whitespace-nowrap shadow-lg shadow-red-500/30 text-white active:scale-95"
            style={{ background: "linear-gradient(135deg, #dc2626 0%, #991b1b 100%)" }}
          >
            <Copy className="w-4 h-4" />
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      </div>

      {/* Tabs + Filters */}
      <div className="bg-[#1a0508] border border-red-900/30 rounded-2xl p-5 space-y-4">
        {/* Level tabs */}
        <div className="flex gap-2 flex-wrap">
          {LEVEL_TABS.map((tab, i) => {
            const count = tab.key === "all"
              ? (data?.total ?? 0)
              : (data?.levelCounts?.[tab.key] ?? 0);
            const activeCount = tab.key === "all"
              ? (data?.active ?? 0)
              : 0;
            const isActive = level === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setLevel(tab.key)}
                className={cn(
                  "flex flex-col items-center px-3.5 py-2 rounded-xl border transition-all min-w-[58px]",
                  isActive
                    ? "bg-white/10 border-white/20 shadow-inner"
                    : "bg-[#0d0518]/50 border-white/5 hover:border-white/15"
                )}
              >
                <span className={cn("font-bold text-lg leading-none", LEVEL_COLORS[i])}>{count}</span>
                <span className="text-[9px] text-slate-400 uppercase tracking-wider mt-1 font-semibold">{tab.label}</span>
                <span className="text-[9px] text-slate-600 mt-0.5">{activeCount} active</span>
              </button>
            );
          })}
        </div>

        {/* Filter row */}
        <div className="flex gap-2 flex-wrap">
          <div className="relative">
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              className="bg-[#0d0518]/80 border border-white/10 rounded-xl py-2.5 pl-3 pr-8 text-white text-sm focus:outline-none focus:border-red-500 appearance-none cursor-pointer transition-colors hover:border-white/20"
              style={{ colorScheme: "dark" }}
            >
              <option value="all">All Levels</option>
              <option value="level1">Direct</option>
              <option value="level2">Level 2</option>
              <option value="level3">Level 3</option>
              <option value="level4">Level 4</option>
              <option value="level5">Level 5</option>
            </select>
            <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="relative">
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="bg-[#0d0518]/80 border border-white/10 rounded-xl py-2.5 pl-3 pr-8 text-white text-sm focus:outline-none focus:border-red-500 appearance-none cursor-pointer transition-colors hover:border-white/20"
              style={{ colorScheme: "dark" }}
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="flex flex-1 gap-2 min-w-[160px]">
            <input
              type="text"
              placeholder="Search name or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-[#0d0518]/80 border border-white/10 rounded-xl py-2.5 px-4 text-white text-sm focus:outline-none focus:border-red-500 placeholder:text-slate-500 transition-colors"
            />
            <button className="px-4 rounded-xl transition-all shadow-lg shadow-red-500/30 active:scale-95 text-white" style={{ background: "linear-gradient(135deg, #dc2626 0%, #991b1b 100%)" }}>
              <Search className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Members list */}
      <div className="bg-[#1a0508] border border-red-900/30 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/5">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center">
              <Users className="w-3.5 h-3.5 text-cyan-400" />
            </div>
            <span className="text-white font-semibold text-sm">All Members</span>
          </div>
          <span className="text-slate-400 text-xs bg-white/5 border border-white/8 px-2.5 py-1 rounded-full">
            {data?.downlines?.length ?? 0} found
          </span>
        </div>

        {isLoading ? (
          <div className="p-12 flex justify-center">
            <div className="w-8 h-8 border-[3px] border-cyan-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !data?.downlines?.length ? (
          <div className="px-5 py-14 flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/8 flex items-center justify-center">
              <Users className="w-7 h-7 text-slate-500" />
            </div>
            <p className="text-slate-400 text-sm">No team members found yet.</p>
            <p className="text-slate-500 text-xs">Share your invite link to start building your network!</p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {data.downlines.map((member, idx) => (
              <div key={member.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-white/[0.02] transition-colors">
                <div className={cn(
                  "w-10 h-10 rounded-full bg-gradient-to-br flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-lg",
                  AVATAR_GRADIENTS[idx % AVATAR_GRADIENTS.length]
                )}>
                  {member.avatarInitials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white font-semibold text-sm">{member.username}</span>
                    <span className="text-[10px] font-bold bg-cyan-500/15 text-cyan-400 border border-cyan-500/25 px-2 py-0.5 rounded-full uppercase tracking-wide">
                      {member.level === "level1" ? "Direct" : member.level.replace("level", "Level ")}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    {member.phone && (
                      <span className="flex items-center gap-1 text-slate-400 text-xs">
                        <Phone className="w-3 h-3 text-slate-500" />
                        {member.phone}
                      </span>
                    )}
                    {member.country && (
                      <span className="flex items-center gap-1 text-slate-400 text-xs">
                        <MapPin className="w-3 h-3 text-slate-500" />
                        {member.country}
                      </span>
                    )}
                    <span className="flex items-center gap-1 text-slate-500 text-xs">
                      <Calendar className="w-3 h-3" />
                      {formatDate(member.joinedAt)}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                  <span className={cn(
                    "text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase border tracking-wide",
                    member.status === "active"
                      ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/25"
                      : "bg-pink-500/15 text-pink-400 border-pink-500/25"
                  )}>
                    {member.status}
                  </span>
                  <span className="text-slate-500 text-[10px] font-medium">{member.referralCount} refs</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
