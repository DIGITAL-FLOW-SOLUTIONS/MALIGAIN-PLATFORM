import { useGetMyPurchases } from "@workspace/api-client-react";
import { useCurrency } from "@/hooks/use-currency";
import { useLocation } from "wouter";
import {
  Library,
  Store,
  Download,
  ShoppingBag,
  ExternalLink,
  Calendar,
  BookOpen,
  Code2,
  LayoutTemplate,
  MonitorSmartphone,
  GraduationCap,
  Package,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

const CATEGORY_META: Record<string, { icon: React.ElementType; color: string; bg: string; border: string }> = {
  eBooks:       { icon: BookOpen,        color: "text-violet-300",  bg: "bg-violet-600/15",  border: "border-violet-500/25" },
  "Source Code":{ icon: Code2,           color: "text-cyan-300",    bg: "bg-cyan-600/15",    border: "border-cyan-500/25" },
  Templates:    { icon: LayoutTemplate,  color: "text-amber-300",   bg: "bg-amber-600/15",   border: "border-amber-500/25" },
  Software:     { icon: MonitorSmartphone,color: "text-blue-300",   bg: "bg-blue-600/15",    border: "border-blue-500/25" },
  Courses:      { icon: GraduationCap,   color: "text-fuchsia-300", bg: "bg-fuchsia-600/15", border: "border-fuchsia-500/25" },
  Other:        { icon: Package,         color: "text-emerald-300", bg: "bg-emerald-600/15", border: "border-emerald-500/25" },
};

const getCategoryMeta = (cat: string) =>
  CATEGORY_META[cat] ?? { icon: Package, color: "text-slate-300", bg: "bg-white/8", border: "border-white/10" };

export default function Downloads() {
  const { data, isLoading } = useGetMyPurchases();
  const { fmt } = useCurrency();
  const [, navigate] = useLocation();

  const purchases = data?.purchases ?? [];

  return (
    <div className="space-y-5">
      {/* Header Banner */}
      <div
        className="border border-purple-700/30 rounded-2xl p-6 relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #2d0a5e 0%, #0e2050 50%, #0a3a2a 100%)" }}
      >
        {/* Glow blobs */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-72 h-56 bg-violet-600/20 blur-3xl rounded-full" />
          <div className="absolute bottom-0 left-0 w-56 h-44 bg-cyan-600/15 blur-3xl rounded-full" />
          <div className="absolute top-1/2 left-1/3 w-40 h-40 bg-fuchsia-600/12 blur-3xl rounded-full" />
        </div>

        <div className="relative z-10 flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-5 h-5 rounded bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
                <Library className="w-3 h-3 text-amber-400" />
              </div>
              <span className="text-amber-400 text-[10px] font-bold uppercase tracking-widest">My Library</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-display font-black text-white leading-tight mb-1">
              Your digital<br />collection.
            </h1>
            <p className="text-slate-400 text-sm">All your purchased products in one place. Download, access and share.</p>
          </div>
          <button
            onClick={() => navigate("/products")}
            className="flex items-center gap-2 bg-black/30 border border-white/15 rounded-xl px-4 py-2.5 text-slate-300 text-sm font-bold hover:bg-white/10 transition-all flex-shrink-0"
          >
            <Store className="w-4 h-4" />
            Browse Store
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 relative z-10">
          {[
            { label: "Owned",   value: data?.totalOwned   ?? 0, isMoney: false, color: "text-violet-300" },
            { label: "Spent",   value: data?.totalSpent   ?? 0, isMoney: true,  color: "text-cyan-300" },
            { label: "Pending", value: data?.totalPending ?? 0, isMoney: false, color: "text-amber-300" },
            { label: "Comms",   value: data?.totalCommissions ?? 0, isMoney: true, color: "text-emerald-300" },
          ].map((s) => (
            <div key={s.label} className="bg-black/30 border border-white/8 rounded-xl px-4 py-3 text-center">
              <p className={cn("font-black text-xl leading-none", s.color)}>
                {s.isMoney ? fmt(s.value) : s.value}
              </p>
              <p className="text-slate-500 text-[10px] uppercase tracking-widest mt-1.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* My Products Section */}
      <div className="bg-[#12082a] border border-purple-900/40 rounded-2xl overflow-hidden">
        {/* Section header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-white/5">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-gradient-to-br from-violet-500 to-fuchsia-500" />
            <span className="text-white font-bold text-sm">My Products</span>
            {!isLoading && purchases.length > 0 && (
              <span className="text-xs bg-violet-600/20 border border-violet-500/25 text-violet-300 px-2 py-0.5 rounded-full font-bold">
                {purchases.length}
              </span>
            )}
          </div>
          <button
            onClick={() => navigate("/products")}
            className="flex items-center gap-1 text-violet-400 text-xs font-bold hover:text-violet-300 transition-colors"
          >
            <ArrowRight className="w-3.5 h-3.5" /> Browse More
          </button>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="p-5 space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-white/5 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : purchases.length === 0 ? (
          /* Empty state */
          <div className="py-16 flex flex-col items-center gap-4 px-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600/20 to-fuchsia-600/10 border border-violet-500/20 flex items-center justify-center">
              <ShoppingBag className="w-8 h-8 text-violet-400/60" />
            </div>
            <div className="text-center">
              <p className="text-white font-bold text-base">No purchases yet</p>
              <p className="text-slate-400 text-sm mt-1 max-w-xs">Visit the store to find eBooks, source codes, templates and more.</p>
            </div>
            <button
              onClick={() => navigate("/products")}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl font-black text-sm text-white transition-all active:scale-95 shadow-lg shadow-violet-500/20 mt-1"
              style={{ background: "linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)" }}
            >
              <Store className="w-4 h-4" />
              Go to Store
            </button>
          </div>
        ) : (
          /* Purchase list */
          <div className="divide-y divide-white/[0.04]">
            {purchases.map((purchase, idx) => {
              const meta = getCategoryMeta(purchase.product.category);
              const Icon = meta.icon;
              const colors = [
                "from-violet-600 to-purple-700",
                "from-cyan-600 to-blue-700",
                "from-fuchsia-600 to-pink-700",
                "from-amber-500 to-orange-600",
                "from-emerald-600 to-teal-700",
                "from-indigo-600 to-violet-700",
              ];
              const gradient = colors[idx % colors.length];

              return (
                <div
                  key={purchase.id}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-white/[0.02] transition-colors"
                >
                  {/* Thumbnail */}
                  <div className="flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border border-white/8 relative">
                    {purchase.product.imageUrl ? (
                      <img
                        src={purchase.product.imageUrl}
                        alt={purchase.product.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className={cn("w-full h-full flex items-center justify-center bg-gradient-to-br", gradient)}>
                        <Icon className="w-7 h-7 text-white/80" />
                      </div>
                    )}
                    {/* Owned checkmark overlay */}
                    <div className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center shadow-md">
                      <CheckCircle2 className="w-3 h-3 text-white" />
                    </div>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-bold text-sm leading-tight truncate">{purchase.product.title}</h3>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <span className={cn("text-[9px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wide", meta.color, meta.bg, meta.border)}>
                        {purchase.product.category}
                      </span>
                      <span className="flex items-center gap-1 text-[10px] text-slate-500">
                        <Calendar className="w-2.5 h-2.5" />
                        {formatDate(purchase.purchasedAt)}
                      </span>
                    </div>
                  </div>

                  {/* Amount + Access */}
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <span className="text-yellow-400 font-black text-sm">{fmt(purchase.amountPaid)}</span>
                    <button className="flex items-center gap-1.5 bg-violet-600/20 border border-violet-500/30 text-violet-300 text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-violet-600/35 transition-all active:scale-95">
                      <Download className="w-3 h-3" />
                      Access
                      <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
