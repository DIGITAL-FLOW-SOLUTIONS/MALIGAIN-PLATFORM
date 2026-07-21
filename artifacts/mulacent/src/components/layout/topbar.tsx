import { Menu, ShoppingCart } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { getCurrencyInfo } from "@/lib/utils";
import { Link } from "wouter";

export function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  const { user } = useAuth();
  const currencyInfo = getCurrencyInfo(user?.country);

  return (
    <header className="sticky top-0 z-30 h-16 flex items-center justify-between px-4 md:px-6 bg-[#1a0508]/90 backdrop-blur-md border-b border-red-900/20">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 lg:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>

        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="font-bold text-white tracking-wide text-sm lg:text-base">MALIGAIN</span>
        </Link>
      </div>

      <div className="flex items-center gap-2">
        {/* Cart */}
        <button className="relative w-9 h-9 rounded-xl bg-emerald-600 shadow-md shadow-emerald-500/40 flex items-center justify-center transition-all hover:scale-105 hover:shadow-emerald-500/60 active:scale-95 icon-glow-emerald">
          <ShoppingCart className="w-4 h-4 text-white" />
        </button>

        {/* User */}
        <Link href="/profile" className="flex items-center gap-2 ml-1 pl-3 border-l border-white/10 cursor-pointer hover:opacity-80 transition-opacity">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-purple-700 flex items-center justify-center text-white font-bold text-xs shadow-lg shadow-violet-500/40 icon-glow-violet">
            {user?.avatarInitials || "U"}
          </div>
          <span className="hidden md:block text-sm font-semibold text-white">{user?.username || "User"}</span>
        </Link>
      </div>
    </header>
  );
}
