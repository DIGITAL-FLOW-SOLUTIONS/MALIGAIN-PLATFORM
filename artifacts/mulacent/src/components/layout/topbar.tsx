import { Menu, TrendingUp } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { getCurrencyInfo } from "@/lib/utils";
import { Link } from "wouter";
import { UserAvatar } from "@/components/ui/user-avatar";

export function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  const { user } = useAuth();
  const currencyInfo = getCurrencyInfo(user?.country);

  return (
    <header className="sticky top-0 z-30 h-16 flex items-center justify-between px-4 md:px-6 bg-card/90 backdrop-blur-md border-b border-border">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted lg:hidden transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>

        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="font-bold text-foreground tracking-wide text-sm lg:text-base">MALIGAIN</span>
        </Link>
      </div>

      <div className="flex items-center gap-2">
        {/* Invest CTA */}
        <Link
          href="/investments"
          className="flex items-center gap-1.5 px-3 h-9 rounded-xl text-white text-xs font-bold tracking-wide transition-all hover:scale-105 active:scale-95 shadow-md select-none"
          style={{ background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 60%, #a855f7 100%)", boxShadow: "0 2px 12px rgba(139,92,246,0.45)" }}
        >
          <TrendingUp className="w-3.5 h-3.5 shrink-0" />
          <span className="hidden sm:inline">Invest</span>
        </Link>

        {/* User */}
        <Link href="/profile" className="flex items-center gap-2 ml-1 pl-3 border-l border-border cursor-pointer hover:opacity-80 transition-opacity">
          <UserAvatar initials={user?.avatarInitials} size="sm" className="shadow-md" />
          <span className="hidden md:block text-sm font-semibold text-foreground">{user?.username || "User"}</span>
        </Link>
      </div>
    </header>
  );
}
