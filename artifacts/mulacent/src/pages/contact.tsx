import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { MessageCircle, Phone, User, ChevronRight, HelpCircle, Shield, Sparkles } from "lucide-react";

const FALLBACK_PHONE = "256767744755";
const FALLBACK_NAME = "Support Team";

function cleanPhone(raw: string): string {
  // Strip +, spaces, dashes — WhatsApp needs digits only
  return raw.replace(/[\s\-\+]/g, "");
}

function buildWhatsAppUrl(phone: string, username: string, senderName: string): string {
  const cleaned = cleanPhone(phone);
  const msg = encodeURIComponent(
    `Hi ${username}, I'm ${senderName} and I need some help. Could you please assist me?`
  );
  return `https://wa.me/${cleaned}?text=${msg}`;
}

export default function Contact() {
  const { user } = useAuth();
  const [upline, setUpline] = useState<{ phone: string | null; username: string | null } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/users/upline")
      .then((r) => r.json())
      .then((data) => setUpline(data))
      .catch(() => setUpline({ phone: null, username: null }))
      .finally(() => setLoading(false));
  }, []);

  const hasUpline = upline?.phone && upline.phone.trim().length > 0;
  const contactPhone = hasUpline ? upline!.phone! : FALLBACK_PHONE;
  const contactName = hasUpline ? (upline!.username ?? "Your Upline") : FALLBACK_NAME;
  const whatsappUrl = buildWhatsAppUrl(contactPhone, contactName, user?.username ?? "a member");

  return (
    <div className="min-h-screen bg-background px-4 py-8 flex flex-col items-center">
      {/* Hero card */}
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-emerald-500 via-green-500 to-teal-600 p-8 mb-6 shadow-2xl shadow-emerald-500/30">
          {/* Decorative blobs */}
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-16 translate-x-16" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-black/10 rounded-full translate-y-12 -translate-x-12" />

          <div className="relative">
            {/* Icon */}
            <div className="w-16 h-16 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center mb-4 shadow-inner">
              <MessageCircle className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-1">Contact Us</h1>
            <p className="text-white/80 text-sm leading-relaxed">
              Got a question or issue? Reach out directly on WhatsApp and get help fast.
            </p>
          </div>
        </div>

        {/* Contact card */}
        <div className="bg-card border border-border rounded-3xl p-6 shadow-sm mb-4">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-4 h-4 text-emerald-500" />
            <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {hasUpline ? "Your Upline" : "Support Contact"}
            </span>
          </div>

          {loading ? (
            <div className="flex items-center gap-4 animate-pulse">
              <div className="w-14 h-14 rounded-2xl bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-muted rounded w-32" />
                <div className="h-3 bg-muted rounded w-24" />
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-4 mb-6">
              {/* Avatar */}
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-md ${hasUpline ? "bg-gradient-to-br from-violet-500 to-purple-600" : "bg-gradient-to-br from-emerald-500 to-teal-600"}`}>
                {hasUpline
                  ? (upline?.username?.substring(0, 2).toUpperCase() ?? "UP")
                  : <Shield className="w-7 h-7" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground truncate">{contactName}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Phone className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                  <span className="text-sm text-muted-foreground truncate">+{cleanPhone(contactPhone)}</span>
                </div>
              </div>
              {hasUpline && (
                <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400 flex-shrink-0">
                  L1 Upline
                </span>
              )}
            </div>
          )}

          {/* WhatsApp button */}
          <a
            href={loading ? undefined : whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center justify-between w-full px-5 py-4 rounded-2xl font-semibold text-white transition-all shadow-lg
              ${loading
                ? "bg-muted cursor-not-allowed pointer-events-none"
                : "bg-gradient-to-r from-[#25D366] to-[#128C7E] hover:brightness-110 hover:shadow-green-500/40 active:scale-[.98]"
              }`}
          >
            <div className="flex items-center gap-3">
              {/* WhatsApp SVG icon */}
              <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white flex-shrink-0">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              <span>Chat on WhatsApp</span>
            </div>
            <ChevronRight className="w-5 h-5 opacity-80" />
          </a>
        </div>

        {/* Info note */}
        <div className="flex items-start gap-3 bg-muted/50 rounded-2xl p-4 border border-border/50">
          <HelpCircle className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            {hasUpline
              ? "You'll be connected directly to your upline. They can help resolve issues, guide you on tasks, and answer questions about the platform."
              : "You don't have an upline yet. Our support team is ready to help you with any questions or issues you encounter on the platform."}
          </p>
        </div>

        {/* User info chip */}
        {user && (
          <div className="mt-4 flex items-center justify-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center">
              <User className="w-3.5 h-3.5 text-primary" />
            </div>
            <span className="text-xs text-muted-foreground">
              Messaging as <span className="font-semibold text-foreground">{user.username}</span>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
