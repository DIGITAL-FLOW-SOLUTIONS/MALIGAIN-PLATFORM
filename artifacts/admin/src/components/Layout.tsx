import { ReactNode } from "react";
import { Link, useRoute } from "wouter";
import { useAdmin } from "@/hooks/useAdmin";
import {
  LayoutDashboard, Users, CreditCard, CheckSquare, ClipboardList,
  ListOrdered, LogOut, Shield, Menu, X, UserCog, ArrowDownToLine, Gift, Settings, Sliders,
  TrendingUp, BarChart2,
} from "lucide-react";
import { useState } from "react";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/users", label: "Users", icon: Users },
  { href: "/verifications", label: "Verifications", icon: CheckSquare },
  { href: "/transactions", label: "Transactions", icon: CreditCard },
  { href: "/tasks", label: "Tasks", icon: ClipboardList },
  { href: "/withdrawals", label: "Withdrawals", icon: ArrowDownToLine },
  { href: "/investment-plans", label: "Investment Plans", icon: TrendingUp },
  { href: "/investment-accounts", label: "Investments", icon: BarChart2 },
  { href: "/referral-bonuses", label: "Referral Bonuses", icon: Gift },
  { href: "/admins", label: "Admins", icon: UserCog },
  { href: "/control", label: "Control Panel", icon: Sliders },
  { href: "/audit", label: "Audit Log", icon: ListOrdered },
  { href: "/settings", label: "Settings", icon: Settings },
];

function NavItem({ href, label, icon: Icon }: { href: string; label: string; icon: React.FC<{ className?: string }> }) {
  const [active] = useRoute(href === "/" ? "/" : `${href}*`);
  return (
    <Link href={href}>
      <span className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium cursor-pointer transition-colors ${
        active
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      }`}>
        <Icon className="h-4 w-4 shrink-0" />
        {label}
      </span>
    </Link>
  );
}

export default function Layout({ children }: { children: ReactNode }) {
  const { admin, logout } = useAdmin();
  const [open, setOpen] = useState(false);

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {open && (
        <div className="fixed inset-0 z-20 bg-black/50 lg:hidden" onClick={() => setOpen(false)} />
      )}

      <aside className={`
        fixed inset-y-0 left-0 z-30 w-64 bg-sidebar border-r border-sidebar-border flex flex-col transition-transform duration-200
        lg:relative lg:translate-x-0
        ${open ? "translate-x-0" : "-translate-x-full"}
      `}>
        <div className="flex items-center gap-2.5 px-4 py-5 border-b border-sidebar-border">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Shield className="h-4 w-4 text-primary" />
          </div>
          <span className="text-foreground font-bold text-base">MALIGAIN Admin</span>
          <button className="ml-auto lg:hidden text-muted-foreground hover:text-foreground" onClick={() => setOpen(false)}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
          {NAV.map(n => <NavItem key={n.href} {...n} />)}
        </nav>

        <div className="px-3 py-4 border-t border-sidebar-border">
          <div className="flex items-center gap-3 px-3 py-2 mb-1">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold shrink-0">
              {admin?.username?.substring(0, 2).toUpperCase()}
            </div>
            <span className="text-foreground text-sm font-medium truncate">{admin?.username}</span>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-card border-b border-border px-4 py-3 flex items-center lg:hidden">
          <button onClick={() => setOpen(true)} className="text-muted-foreground hover:text-foreground">
            <Menu className="h-5 w-5" />
          </button>
          <span className="ml-3 font-semibold text-foreground">MALIGAIN Admin</span>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
