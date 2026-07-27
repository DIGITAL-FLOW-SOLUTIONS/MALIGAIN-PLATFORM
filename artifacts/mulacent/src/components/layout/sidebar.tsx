import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  ArrowDownCircle,
  CreditCard,
  Award,
  Wallet,
  History,
  Users,
  UserCheck,
  UserX,
  Gift,
  ShoppingBag,
  Dices,
  ClipboardList,
  MessageCircle,
  HelpCircle,
  BookOpen,
  Music2,
  Youtube,
  Film,
  Clapperboard,
  Megaphone,
  UserCircle,
  Phone,
  LogOut,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";

/* ─── types ──────────────────────────────────────────────────── */
type NavItem = {
  icon: React.ElementType;
  label: string;
  href?: string;
  color: string;
};

type TeamLevel = { level: number; activeHref?: string; inactiveHref?: string };

/* ─── nav data ────────────────────────────────────────────────── */
const MAIN_ITEMS: NavItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard", color: "bg-primary" },
];

const ACCOUNT_ITEMS: NavItem[] = [
  { icon: ArrowDownCircle,  label: "Deposit",       href: "/recharge",  color: "bg-emerald-500" },
  { icon: CreditCard,       label: "PayForClient",                      color: "bg-sky-500"     },
  { icon: Award,            label: "Ranks",                             color: "bg-amber-500"   },
  { icon: Wallet,           label: "Withdraw",      href: "/withdraw",  color: "bg-rose-500"    },
  { icon: History,          label: "History",       href: "/history",   color: "bg-indigo-500"  },
];

const TEAM_LEVELS: TeamLevel[] = [
  { level: 1 },
  { level: 2 },
  { level: 3 },
];

const TEAM_BOTTOM: NavItem[] = [
  { icon: Gift, label: "Bonuses", href: "/bonus", color: "bg-amber-500" },
];

const PRODUCT_ITEMS: NavItem[] = [
  { icon: ShoppingBag,   label: "Easy Shop",           color: "bg-orange-500"  },
  { icon: Dices,         label: "Spin & Win",          color: "bg-pink-500"    },
  { icon: ClipboardList, label: "Survey",              color: "bg-teal-500"    },
  { icon: MessageCircle, label: "Chat with Foreigners", href: "/chat-foreigners", color: "bg-violet-500" },
  { icon: HelpCircle,    label: "Trivia",              href: "/trivia",  color: "bg-secondary" },
  { icon: BookOpen,      label: "Blogs",               color: "bg-primary"     },
];

const EARN_ITEMS: NavItem[] = [
  { icon: Music2,       label: "TikTok Earn",   color: "bg-rose-500"    },
  { icon: Youtube,      label: "Youtube Earn",  color: "bg-red-600"     },
  { icon: Film,         label: "Movies",        color: "bg-purple-500"  },
  { icon: Clapperboard, label: "Reals",         color: "bg-pink-600"    },
  { icon: Megaphone,    label: "Ads Earnings",  color: "bg-amber-600"   },
];

const SETTINGS_ITEMS: NavItem[] = [
  { icon: UserCircle, label: "Profile",    href: "/profile", color: "bg-secondary"  },
  { icon: Phone,      label: "Contact us",                   color: "bg-slate-500"  },
];

/* ─── shared row ──────────────────────────────────────────────── */
function NavRow({ item, indent = false }: { item: NavItem; indent?: boolean }) {
  const [location] = useLocation();
  const isActive = !!item.href && location === item.href;

  const inner = (
    <div className={cn(
      "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all cursor-pointer group text-sm",
      indent && "pl-10",
      isActive ? "bg-primary/10 border border-primary/20" : "hover:bg-muted"
    )}>
      {!indent && (
        <div className={cn(
          "w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-all",
          item.color,
          isActive ? "opacity-100 shadow-sm" : "opacity-75 group-hover:opacity-90"
        )}>
          <item.icon className="w-3.5 h-3.5 text-white" />
        </div>
      )}
      {indent && (
        <div className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0 mt-0.5",
          isActive ? "bg-primary" : "bg-muted-foreground/40"
        )} />
      )}
      <span className={cn(
        "flex-1 truncate transition-colors",
        isActive ? "text-primary font-semibold" : "text-muted-foreground group-hover:text-foreground"
      )}>{item.label}</span>
      {isActive && !indent && (
        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 bg-primary" />
      )}
    </div>
  );

  if (item.href) return <Link href={item.href}>{inner}</Link>;
  return <div>{inner}</div>;
}

/* ─── simple section ──────────────────────────────────────────── */
function NavSection({ title, items }: { title: string; items: NavItem[] }) {
  return (
    <div>
      <p className="px-3 text-[10px] font-bold tracking-widest text-muted-foreground/60 uppercase mb-2">{title}</p>
      <div className="space-y-0.5">
        {items.map((item) => <NavRow key={item.label} item={item} />)}
      </div>
    </div>
  );
}

/* ─── team section with collapsible levels ────────────────────── */
function TeamSection() {
  const [open, setOpen] = useState<Record<number, boolean>>({});
  const toggle = (lvl: number) => setOpen((o) => ({ ...o, [lvl]: !o[lvl] }));

  return (
    <div>
      <p className="px-3 text-[10px] font-bold tracking-widest text-muted-foreground/60 uppercase mb-2">Team</p>
      <div className="space-y-0.5">
        {TEAM_LEVELS.map(({ level, activeHref, inactiveHref }) => (
          <div key={level}>
            {/* Level row — toggles expand */}
            <button
              onClick={() => toggle(level)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-muted transition-all group text-sm"
            >
              <div className="w-7 h-7 rounded-lg bg-secondary/80 flex items-center justify-center flex-shrink-0 opacity-75 group-hover:opacity-90 transition-opacity">
                <Users className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="flex-1 text-left text-muted-foreground group-hover:text-foreground transition-colors truncate">
                Level {level}
              </span>
              {open[level]
                ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground/50 flex-shrink-0" />
                : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50 flex-shrink-0" />
              }
            </button>

            {open[level] && (
              <div className="space-y-0.5 mt-0.5">
                <NavRow
                  item={{ icon: UserCheck, label: "Active",   href: activeHref,   color: "bg-emerald-500" }}
                  indent
                />
                <NavRow
                  item={{ icon: UserX,     label: "Inactive", href: inactiveHref, color: "bg-rose-500" }}
                  indent
                />
              </div>
            )}
          </div>
        ))}

        {/* Bonuses at bottom of team */}
        {TEAM_BOTTOM.map((item) => <NavRow key={item.label} item={item} />)}
      </div>
    </div>
  );
}

/* ─── main export ─────────────────────────────────────────────── */
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
        {/* User profile header */}
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

        {/* Scrollable nav */}
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-5" style={{ scrollbarWidth: "none" }}>
          <NavSection title="Main"         items={MAIN_ITEMS}     />
          <NavSection title="Accounts"     items={ACCOUNT_ITEMS}  />
          <TeamSection />
          <NavSection title="Products"     items={PRODUCT_ITEMS}  />
          <NavSection title="Earn with Fun" items={EARN_ITEMS}    />

          {/* Settings */}
          <div>
            <p className="px-3 text-[10px] font-bold tracking-widest text-muted-foreground/60 uppercase mb-2">Settings</p>
            <div className="space-y-0.5">
              {SETTINGS_ITEMS.map((item) => <NavRow key={item.label} item={item} />)}

              {/* Logout */}
              <button
                onClick={logout}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all cursor-pointer text-sm text-destructive/70 hover:text-destructive hover:bg-destructive/10 group"
              >
                <div className="w-7 h-7 rounded-lg bg-destructive/10 border border-destructive/20 flex items-center justify-center flex-shrink-0 group-hover:bg-destructive/20 transition-colors">
                  <LogOut className="w-3.5 h-3.5 text-destructive" />
                </div>
                <span className="font-semibold uppercase tracking-wide text-xs">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
