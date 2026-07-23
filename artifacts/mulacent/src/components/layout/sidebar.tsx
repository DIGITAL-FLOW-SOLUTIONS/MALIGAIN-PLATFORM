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
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard", color: "bg-primary", text: "text-primary" },
  { icon: Users, label: "Team Members", href: "/downlines", color: "bg-secondary", text: "text-secondary" },
  { icon: Trophy, label: "Tournament", href: "/tournament", color: "bg-amber-500", text: "text-amber-600" },
  { icon: MessageCircle, label: "Chat Foreigners", href: "/chat-foreigners", color: "bg-violet-500", text: "text-violet-600" },
];

const FINANCE_ITEMS = [
  { icon: Wallet, label: "Withdraw", href: "/withdraw", color: "bg-rose-500", text: "text-rose-600" },
  { icon: ArrowUpCircle, label: "Recharge", href: "/recharge", color: "bg-orange-500", text: "text-orange-600" },
  { icon: History, label: "History", href: "/history", color: "bg-indigo-500", text: "text-indigo-600" },
  { icon: Gift, label: "Bonuses", href: "/bonus", color: "bg-amber-500", text: "text-amber-600" },
];

const LIVE_TASKS = [
  { icon: ClipboardList, label: "SURVEYS", href: "/surveys", badge: 18, color: "bg-teal-500", text: "text-teal-600" },
  { icon: PenLine, label: "BLOGGING", href: "/blogging", badge: 20, color: "bg-primary", text: "text-primary" },
  { icon: Play, label: "Watch and earn", href: "/watch", badge: 5, color: "bg-pink-500", text: "text-pink-600" },
  { icon: Puzzle, label: "Trivia", href: "/trivia", badge: 18, color: "bg-secondary", text: "text-secondary" },
  { icon: HeartHandshake, label: "Chat with lonely pe...", href: "/chat-lonely", badge: 500, color: "bg-rose-500", text: "text-rose-600" },
];

const ACCOUNT_ITEMS = [
  { icon: CreditCard, label: "Pay for Client", href: "/pay-client", color: "bg-sky-500", text: "text-sky-600" },
  { icon: UserCircle, label: "Profile", href: "/profile", color: "bg-secondary", text: "text-secondary" },
];

type NavItem = { icon: React.ElementType; label: string; href: string; color: string; text: string; badge?: number };

function NavSection({ title, items }: { title: string; items: NavItem[] }) {
  const [location] = useLocation();
  return (
    <div>
      <p className="px-3 text-[10px] font-bold tracking-widest text-muted-foreground/60 uppercase mb-2">{title}</p>
      <div className="space-y-0.5">
        {items.map((item) => {
          const isActive = location === item.href;
          return (
            <Link key={item.href} href={item.href}>
              <div className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all cursor-pointer group text-sm",
                isActive
                  ? "bg-primary/10 border border-primary/20"
                  : "hover:bg-muted"
              )}>
                <div className={cn(
                  "w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all",
                  item.color,
                  isActive ? "opacity-100 shadow-sm" : "opacity-75 group-hover:opacity-90"
                )}>
                  <item.icon className="w-3.5 h-3.5 text-white" />
                </div>
                <span className={cn(
                  "flex-1 truncate transition-colors text-sm",
                  isActive ? "text-primary font-semibold" : "text-muted-foreground group-hover:text-foreground"
                )}>{item.label}</span>
                {("badge" in item) && (item as any).badge && (
                  <span className="flex-shrink-0 text-[10px] font-bold bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full min-w-[22px] text-center">
                    {(item as any).badge}
                  </span>
                )}
                {isActive && !("badge" in item) && (
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 bg-primary" />
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
          className="fixed inset-0 bg-foreground/30 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside className={cn(
        "fixed lg:sticky top-0 left-0 z-50 h-screen w-64 flex-shrink-0 flex flex-col transition-transform duration-300 ease-out lg:translate-x-0",
        "bg-sidebar border-r border-sidebar-border",
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* User Profile */}
        <Link href="/profile">
          <div className="p-4 border-b border-sidebar-border hover:bg-muted/50 transition-colors cursor-pointer group">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-secondary to-primary flex items-center justify-center text-white font-bold text-sm shadow-md">
                  {user?.avatarInitials || "U"}
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-sidebar shadow-sm" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-foreground font-semibold text-sm truncate group-hover:text-primary transition-colors">{user?.username || "User"}</p>
                <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground font-medium group-hover:text-primary/70 transition-colors">
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
            <p className="px-3 text-[10px] font-bold tracking-widest text-muted-foreground/60 uppercase mb-2">Account</p>
            <div className="space-y-0.5">
              {ACCOUNT_ITEMS.map((item) => (
                <Link key={item.href} href={item.href}>
                  <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all cursor-pointer text-sm group hover:bg-muted">
                    <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 opacity-75 group-hover:opacity-90 transition-opacity", item.color)}>
                      <item.icon className="w-3.5 h-3.5 text-white" />
                    </div>
                    <span className="text-muted-foreground group-hover:text-foreground transition-colors">{item.label}</span>
                  </div>
                </Link>
              ))}
              <button
                onClick={logout}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all cursor-pointer text-sm text-destructive/70 hover:text-destructive hover:bg-destructive/10 group"
              >
                <div className="w-7 h-7 rounded-lg bg-destructive/10 border border-destructive/20 flex items-center justify-center flex-shrink-0 group-hover:bg-destructive/20 transition-colors">
                  <LogOut className="w-3.5 h-3.5 text-destructive" />
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
