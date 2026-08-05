import { ReactNode, useState, useEffect } from "react";
import { Link, useRoute, useLocation } from "wouter";
import { useAdmin } from "@/hooks/useAdmin";
import {
  LayoutDashboard, Users, CreditCard, CheckSquare, ClipboardList,
  ListOrdered, LogOut, TerminalSquare, Menu, X, UserCog, ArrowDownToLine, Gift, Settings, Sliders,
  TrendingUp, BarChart2, PanelLeftClose, PanelLeftOpen, PlaySquare,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/users", label: "Users", icon: Users },
  { href: "/verifications", label: "Verifications", icon: CheckSquare },
  { href: "/transactions", label: "Transactions", icon: CreditCard },
  { href: "/tasks", label: "Tasks", icon: ClipboardList },
  { href: "/task-assets", label: "Task Assets", icon: PlaySquare },
  { href: "/withdrawals", label: "Withdrawals", icon: ArrowDownToLine },
  { href: "/investment-plans", label: "Investment Plans", icon: TrendingUp },
  { href: "/investment-accounts", label: "Investments", icon: BarChart2 },
  { href: "/referral-bonuses", label: "Referral Bonuses", icon: Gift },
  { href: "/admins", label: "Admins", icon: UserCog },
  { href: "/control", label: "Control Panel", icon: Sliders },
  { href: "/audit", label: "Audit Log", icon: ListOrdered },
  { href: "/settings", label: "Settings", icon: Settings },
];

function NavItem({ href, label, icon: Icon, collapsed, onNavigate }: { href: string; label: string; icon: React.FC<{ className?: string }>; collapsed: boolean; onNavigate?: () => void }) {
  const [active] = useRoute(href === "/" ? "/" : `${href}*`);
  
  const content = (
    <Link href={href} onClick={onNavigate} className={`
      relative mx-2 flex items-center h-10 px-3 rounded-md transition-colors group cursor-pointer
      ${active ? "bg-[#4f39f6] text-white shadow-sm" : "text-slate-300 hover:bg-[#1d2638] hover:text-white"}
      ${collapsed ? "justify-center" : "gap-3"}
    `}>
      <Icon className={`h-[18px] w-[18px] shrink-0 ${active ? "text-white" : "text-slate-400 group-hover:text-white"}`} />
      {!collapsed && <span className="text-xs font-mono tracking-wide uppercase truncate mt-0.5">{label}</span>}
    </Link>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          {content}
        </TooltipTrigger>
        <TooltipContent side="right" className="font-mono text-[10px] uppercase tracking-widest bg-[#111827] border-[#293449] text-slate-200 rounded-md px-2 py-1 ml-1">
          {label}
        </TooltipContent>
      </Tooltip>
    );
  }

  return content;
}

export default function Layout({ children }: { children: ReactNode }) {
  const { admin, logout } = useAdmin();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [location] = useLocation();

  useEffect(() => {
    const saved = localStorage.getItem("sidebar-collapsed");
    if (saved === "true") setCollapsed(true);
  }, []);

  const toggleCollapse = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem("sidebar-collapsed", String(next));
  };

  const currentPage = NAV.find(n => location === n.href || (n.href !== "/" && location.startsWith(n.href)))?.label || "Terminal";

  return (
    <div className="flex h-screen bg-background overflow-hidden selection:bg-primary/30 text-foreground">
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/80 lg:hidden backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 bg-[#111827] border-r border-[#1f2937] flex flex-col transition-all duration-200 ease-in-out
        lg:relative lg:translate-x-0
        ${mobileOpen ? "translate-x-0 w-64" : "-translate-x-full lg:translate-x-0"}
        ${collapsed && !mobileOpen ? "lg:w-[56px]" : "lg:w-[220px]"}
      `}>
        {/* Brand */}
        <div className={`flex items-center h-12 border-b border-[#1f2937] shrink-0 ${collapsed && !mobileOpen ? "justify-center px-0" : "px-4 gap-3"}`}>
          <div className="h-7 w-7 bg-[#4f39f6]/20 border border-[#6d5dfc]/60 flex items-center justify-center shrink-0 overflow-hidden">
            <img src={`${import.meta.env.BASE_URL}images/logo.png`} alt="MALIGAIN" className="h-full w-full object-contain" />
          </div>
          {(!collapsed || mobileOpen) && (
            <span className="text-white font-bold font-mono tracking-widest text-xs uppercase mt-0.5">MALIGAIN</span>
          )}
          <button className="ml-auto lg:hidden text-slate-400 hover:text-white" onClick={() => setMobileOpen(false)}>
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 overflow-y-auto py-3 space-y-[1px] custom-scrollbar">
          {NAV.map(n => <NavItem key={n.href} {...n} collapsed={collapsed && !mobileOpen} onNavigate={() => setMobileOpen(false)} />)}
        </nav>

        {/* Sidebar Footer */}
        <div className="border-t border-[#1f2937] p-2 shrink-0">
          {!mobileOpen && (
            <button 
              onClick={toggleCollapse}
              className="hidden lg:flex w-full items-center justify-center h-8 text-slate-400 hover:bg-[#1d2638] hover:text-white transition-colors rounded-md"
            >
              {collapsed ? <PanelLeftOpen className="h-[18px] w-[18px]" /> : <PanelLeftClose className="h-[18px] w-[18px]" />}
            </button>
          )}
        </div>
      </aside>

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Decorative scanline background */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.02] z-0" 
             style={{ backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 2px, #00e5ff 2px, #00e5ff 4px)`, backgroundSize: '100% 4px' }} />

        {/* Topbar */}
        <header className="h-12 bg-card border-b border-border flex items-center justify-between px-4 shrink-0 relative z-10">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileOpen(true)} className="text-muted-foreground hover:text-foreground lg:hidden">
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2">
              <span className="text-primary font-mono text-[10px] uppercase tracking-widest hidden sm:inline-block">SYS.PATH</span>
              <span className="text-muted-foreground font-mono text-[10px] hidden sm:inline-block">/</span>
              <span className="text-foreground font-mono text-xs font-bold tracking-widest uppercase mt-0.5">{currentPage}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-right">
              <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest hidden sm:inline-block">OP:</span>
              <span className="text-xs font-mono font-bold text-primary tracking-widest uppercase mt-0.5">{admin?.username}</span>
            </div>
            <div className="h-4 w-[1px] bg-border hidden sm:block" />
            <button
              onClick={logout}
              className="text-muted-foreground hover:text-destructive transition-colors flex items-center gap-2"
              title="Terminate Session"
            >
              <LogOut className="h-[18px] w-[18px]" />
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 relative z-10 custom-scrollbar">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
