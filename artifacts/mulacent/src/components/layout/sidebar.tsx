import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Users,
  Trophy,
  MessageCircle,
  Wallet,
  ArrowUpCircle,
  History,
  Gift,
  LogOut,
  ClipboardList,
  PenLine,
  Play,
  Puzzle,
  HeartHandshake,
  CreditCard,
  MessageSquare,
  UserCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";

const MAIN_ITEMS = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard", color: "bg-blue-500", glow: "shadow-blue-500/50", text: "text-blue-300" },
  { icon: Users, label: "Team Members", href: "/downlines", color: "bg-violet-500", glow: "shadow-violet-500/50", text: "text-violet-300" },
  { icon: Trophy, label: "Tournament", href: "/tournament", color: "bg-amber-500", glow: "shadow-amber-500/50", text: "text-amber-300" },
  { icon: MessageCircle, label: "Chat Foreigners", href: "/chat-foreigners", color: "bg-purple-500", glow: "shadow-purple-500/50", text: "text-purple-300" },
];


const FINANCE_ITEMS = [
  { icon: Wallet, label: "Withdraw", href: "/withdraw", color: "bg-red-500", glow: "shadow-red-500/50", text: "text-red-300" },
  { icon: ArrowUpCircle, label: "Recharge", href: "/recharge", color: "bg-orange-500", glow: "shadow-orange-500/50", text: "text-orange-300" },
  { icon: History, label: "History", href: "/history", color: "bg-indigo-500", glow: "shadow-indigo-500/50", text: "text-indigo-300" },
  { icon: Gift, label: "Bonuses", href: "/bonus", color: "bg-yellow-500", glow: "shadow-yellow-500/50", text: "text-yellow-300" },
];

const LIVE_TASKS = [
  { icon: ClipboardList, label: "SURVEYS", href: "/surveys", badge: 18, color: "bg-teal-500", glow: "shadow-teal-500/50", text: "text-teal-300" },
  { icon: PenLine, label: "BLOGGING", href: "/blogging", badge: 20, color: "bg-blue-600", glow: "shadow-blue-600/50", text: "text-blue-300" },
  { icon: Play, label: "Watch and earn", href: "/watch", badge: 5, color: "bg-pink-500", glow: "shadow-pink-500/50", text: "text-pink-300" },
  { icon: Puzzle, label: "Trivia", href: "/trivia", badge: 18, color: "bg-fuchsia-500", glow: "shadow-fuchsia-500/50", text: "text-fuchsia-300" },
  { icon: HeartHandshake, label: "Chat with lonely pe...", href: "/chat-lonely", badge: 500, color: "bg-rose-500", glow: "shadow-rose-500/50", text: "text-rose-300" },
];

const ACCOUNT_ITEMS = [
  { icon: CreditCard, label: "Pay for Client", href: "/pay-client", color: "bg-sky-500", glow: "shadow-sky-500/50", text: "text-sky-300" },
  { icon: UserCircle, label: "Profile", href: "/profile", color: "bg-violet-500", glow: "shadow-violet-500/50", text: "text-violet-300" },
];

type NavItem = { icon: React.ElementType; label: string; href: string; color: string; glow: string; text: string; badge?: number };

function NavSection({ title, items }: { title: string; items: NavItem[] }) {
  const [location] = useLocation();
  return (
    <div>
      <p className="px-3 text-[10px] font-bold tracking-widest text-red-300/50 uppercase mb-2">{title}</p>
      <div className="space-y-0.5">
        {items.map((item) => {
          const isActive = location === item.href;
          return (
            <Link key={item.href} href={item.href}>
              <div className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all cursor-pointer group text-sm",
                isActive
                  ? "bg-white/8 border border-white/10"
                  : "hover:bg-white/[0.04]"
              )}>
                <div className={cn(
                  "w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all",
                  item.color,
                  isActive ? cn("shadow-md", item.glow, "icon-glow") : "opacity-80 group-hover:opacity-100"
                )}>
                  <item.icon className="w-3.5 h-3.5 text-white" />
                </div>
                <span className={cn(
                  "flex-1 truncate transition-colors",
                  isActive ? "text-white font-semibold" : "text-slate-400 group-hover:text-slate-200"
                )}>{item.label}</span>
                {("badge" in item) && (item as any).badge && (
                  <span className="flex-shrink-0 text-[10px] font-bold bg-white/10 text-slate-300 px-1.5 py-0.5 rounded-full min-w-[22px] text-center">
                    {(item as any).badge}
                  </span>
                )}
                {isActive && !("badge" in item) && (
                  <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", item.color)} />
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export function Sidebar({ mobileOpen, setMobileOpen }: { mobileOpen: boolean; setMobileOpen: (v: boolean) => void }) {
  const { user, logout } = useAuth();

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside className={cn(
        "fixed lg:sticky top-0 left-0 z-50 h-screen w-64 flex-shrink-0 flex flex-col transition-transform duration-300 ease-out lg:translate-x-0",
        "bg-[#1a0508] border-r border-red-900/20",
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* User Profile */}
        <Link href="/profile">
          <div className="p-4 border-b border-red-900/20 hover:bg-white/[0.03] transition-colors cursor-pointer group">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-violet-500/30 icon-glow-violet">
                  {user?.avatarInitials || "U"}
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-[#1a0508] shadow-sm shadow-emerald-400/50" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-sm truncate group-hover:text-violet-300 transition-colors">{user?.username || "User"}</p>
                <span className="inline-flex items-center gap-1 text-[10px] text-violet-400/70 font-medium group-hover:text-violet-400 transition-colors">
                  <UserCircle className="w-3 h-3" />
                  Profile
                </span>
              </div>
            </div>
          </div>
        </Link>

        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-5" style={{ scrollbarWidth: "none" }}>
          <NavSection title="Main" items={MAIN_ITEMS} />
          <NavSection title="Finance" items={FINANCE_ITEMS} />
          <NavSection title="Live Tasks" items={LIVE_TASKS} />

          <div>
            <p className="px-3 text-[10px] font-bold tracking-widest text-red-300/50 uppercase mb-2">Account</p>
            <div className="space-y-0.5">
              {ACCOUNT_ITEMS.map((item) => (
                <Link key={item.href} href={item.href}>
                  <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all cursor-pointer text-sm group hover:bg-white/[0.04]">
                    <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 opacity-80 group-hover:opacity-100 transition-opacity", item.color)}>
                      <item.icon className="w-3.5 h-3.5 text-white" />
                    </div>
                    <span className="text-slate-400 group-hover:text-slate-200 transition-colors">{item.label}</span>
                  </div>
                </Link>
              ))}
              <button
                onClick={logout}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all cursor-pointer text-sm text-red-400/70 hover:text-red-400 hover:bg-red-500/10 group"
              >
                <div className="w-7 h-7 rounded-lg bg-red-500/20 border border-red-500/20 flex items-center justify-center flex-shrink-0 group-hover:bg-red-500/30 transition-colors">
                  <LogOut className="w-3.5 h-3.5 text-red-400" />
                </div>
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
