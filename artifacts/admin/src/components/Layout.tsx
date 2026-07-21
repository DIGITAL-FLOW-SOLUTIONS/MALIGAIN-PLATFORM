import { ReactNode } from "react";
import { Link, useRoute } from "wouter";
import { useAdmin } from "@/hooks/useAdmin";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard, Users, CreditCard, CheckSquare, ClipboardList,
  ListOrdered, LogOut, Shield, Menu, X, UserCog, ArrowDownToLine, Gift, Settings, Sliders,
} from "lucide-react";
import { useState } from "react";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/users", label: "Users", icon: Users },
  { href: "/verifications", label: "Verifications", icon: CheckSquare },
  { href: "/transactions", label: "Transactions", icon: CreditCard },
  { href: "/tasks", label: "Tasks", icon: ClipboardList },
  { href: "/audit", label: "Audit Log", icon: ListOrdered },
  { href: "/withdrawals", label: "Withdrawals", icon: ArrowDownToLine },
  { href: "/referral-bonuses", label: "Referral Bonuses", icon: Gift },
  { href: "/admins", label: "Admins", icon: UserCog },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/control", label: "Control Panel", icon: Sliders },
];

function NavItem({ href, label, icon: Icon }: { href: string; label: string; icon: React.FC<{ className?: string }> }) {
  const [active] = useRoute(href === "/" ? "/" : `${href}*`);
  return (
    <Link href={href}>
      <span className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium cursor-pointer transition-colors ${
        active ? "bg-indigo-600 text-white" : "text-gray-300 hover:bg-gray-700 hover:text-white"
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
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {open && (
        <div className="fixed inset-0 z-20 bg-black/50 lg:hidden" onClick={() => setOpen(false)} />
      )}

      <aside className={`
        fixed inset-y-0 left-0 z-30 w-64 bg-gray-900 flex flex-col transition-transform duration-200
        lg:relative lg:translate-x-0
        ${open ? "translate-x-0" : "-translate-x-full"}
      `}>
        <div className="flex items-center gap-2 px-4 py-5 border-b border-gray-700">
          <Shield className="h-6 w-6 text-indigo-400" />
          <span className="text-white font-bold text-lg">MALIGAIN Admin</span>
          <button className="ml-auto lg:hidden text-gray-400" onClick={() => setOpen(false)}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {NAV.map(n => <NavItem key={n.href} {...n} />)}
        </nav>

        <div className="px-3 py-4 border-t border-gray-700">
          <div className="flex items-center gap-3 px-4 py-2 mb-2">
            <div className="h-8 w-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold">
              {admin?.username?.substring(0, 2).toUpperCase()}
            </div>
            <span className="text-gray-300 text-sm font-medium truncate">{admin?.username}</span>
          </div>
          <button
            onClick={logout}
            className="flex items-center gap-3 w-full px-4 py-2 rounded-lg text-sm text-gray-400 hover:bg-gray-700 hover:text-white transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center lg:hidden">
          <button onClick={() => setOpen(true)} className="text-gray-500 hover:text-gray-700">
            <Menu className="h-5 w-5" />
          </button>
          <span className="ml-3 font-semibold text-gray-800">MALIGAIN Admin</span>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
