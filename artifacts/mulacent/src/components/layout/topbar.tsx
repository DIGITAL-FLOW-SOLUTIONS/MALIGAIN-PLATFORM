import { Menu } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { UserAvatar } from "@/components/ui/user-avatar";

function countryCodeToFlag(countryCode?: string | null) {
  const code = countryCode?.trim().toUpperCase() || "KE";
  if (!/^[A-Z]{2}$/.test(code)) return "🌍";

  return String.fromCodePoint(
    ...code.split("").map((letter) => 127397 + letter.charCodeAt(0)),
  );
}

export function Topbar({ onMenuClick }: { onMenuClick: () => void }) {
  const { user } = useAuth();
  const countryCode = user?.country?.trim().toUpperCase() || "KE";

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
          <img src={`${import.meta.env.BASE_URL}images/logo.png`} alt="MALIGAIN" className="h-8 w-8 rounded-lg object-contain" />
          <span className="font-bold text-foreground tracking-wide text-sm lg:text-base">MALIGAIN</span>
        </Link>
      </div>

      <div className="flex items-center gap-2">
        {/* User country */}
        <span
          role="img"
          aria-label={`Country: ${countryCode}`}
          title={`Country: ${countryCode}`}
          className="flex h-9 w-9 items-center justify-center text-2xl leading-none select-none"
        >
          {countryCodeToFlag(countryCode)}
        </span>

        {/* User */}
        <Link href="/profile" className="flex items-center gap-2 ml-1 pl-3 border-l border-border cursor-pointer hover:opacity-80 transition-opacity">
          <UserAvatar initials={user?.avatarInitials} size="sm" className="shadow-md" />
          <span className="hidden md:block text-sm font-semibold text-foreground">{user?.username || "User"}</span>
        </Link>
      </div>
    </header>
  );
}
