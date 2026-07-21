import { useState } from "react";
import { useGetProducts, usePurchaseProduct } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { useCurrency } from "@/hooks/use-currency";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Search, BookOpen, Library, X, ShieldCheck, Zap, CheckCircle2, Phone, Pencil, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Product } from "@workspace/api-client-react";

const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "popular", label: "Popular" },
  { value: "price_asc", label: "Price: Low→High" },
  { value: "price_desc", label: "Price: High→Low" },
];

const CATEGORY_ICONS: Record<string, string> = {
  eBooks: "📚",
  "Source Code": "</>",
  Templates: "🗂️",
  Software: "💻",
  Courses: "🎓",
  Other: "📦",
};

/* ─── Purchase Dialog ─────────────────────────────────────── */
function PurchaseDialog({
  product,
  onClose,
  onConfirm,
  isPending,
}: {
  product: Product;
  onClose: () => void;
  onConfirm: () => void;
  isPending: boolean;
}) {
  const { user } = useAuth();
  const { fmt } = useCurrency();
  const commission = Math.round((product.commissionPercent / 100) * product.price);

  const bullets = product.description
    .split(/[.\n]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 6)
    .slice(0, 4);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="relative w-full max-w-sm bg-[#1a0508] border border-red-900/30 rounded-2xl overflow-hidden shadow-2xl">
        {/* Header image */}
        <div className="relative h-36 bg-gradient-to-br from-[#2a0508] to-[#1a0508]">
          {product.imageUrl ? (
            <img src={product.imageUrl} alt={product.title} className="w-full h-full object-cover opacity-70" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-6xl opacity-30">{CATEGORY_ICONS[product.category] || "📦"}</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#1a0508] via-transparent to-transparent" />
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-7 h-7 rounded-lg bg-black/50 border border-white/10 flex items-center justify-center text-white/70 hover:text-white transition-all"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="absolute bottom-3 left-4">
            <span className="text-[10px] font-bold bg-violet-600/80 text-white px-2 py-0.5 rounded-full uppercase tracking-wide border border-violet-400/30">
              {product.category}
            </span>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {/* Title */}
          <h3 className="text-white font-black text-base leading-snug">{product.title}</h3>

          {/* Price */}
          <div className="bg-white/5 border border-white/8 rounded-xl p-3.5">
            <p className="text-slate-400 text-[10px] uppercase tracking-widest mb-1.5">Price</p>
            <div className="flex items-center justify-between gap-3">
              <div>
                <span className="text-white font-black text-xl">{fmt(product.price)}</span>
                {product.originalPrice && (
                  <span className="text-slate-500 text-sm line-through ml-2">{fmt(product.originalPrice)}</span>
                )}
              </div>
              <span className="flex items-center gap-1 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold px-2.5 py-1 rounded-full whitespace-nowrap">
                <Zap className="w-3 h-3" />
                {product.commissionPercent}% — earn {fmt(commission)}
              </span>
            </div>
          </div>

          {/* M-PESA number */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <div className="w-2 h-2 rounded-full bg-violet-400" />
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">M-Pesa Payment Number</p>
            </div>
            <div className="bg-emerald-900/20 border border-emerald-600/30 rounded-xl p-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center flex-shrink-0 shadow-md shadow-emerald-600/30">
                <Phone className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-400 text-[9px] font-bold uppercase tracking-wider">M-Pesa Number Saved</span>
                </div>
                <p className="text-white font-black text-base leading-none">{user?.phone || "Not set"}</p>
                <p className="text-slate-400 text-[10px] mt-0.5">STK push goes to this number</p>
              </div>
              <button className="flex items-center gap-1 bg-violet-600/20 border border-violet-500/30 text-violet-300 text-xs font-bold px-2.5 py-1.5 rounded-lg hover:bg-violet-600/30 transition-all flex-shrink-0">
                <Pencil className="w-3 h-3" />
                Change
              </button>
            </div>
            <div className="flex items-start gap-2 mt-2 px-1">
              <div className="w-3.5 h-3.5 rounded border border-white/20 flex-shrink-0 mt-0.5" />
              <p className="text-slate-400 text-xs">An M-Pesa STK push will pop up on your phone. Enter your PIN to complete.</p>
            </div>
          </div>

          {/* What's included */}
          {bullets.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <div className="w-2 h-2 rounded-full bg-violet-400" />
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">What's Included</p>
              </div>
              <ul className="space-y-1.5">
                {bullets.map((b, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <span className="text-slate-300 text-xs">{b}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* CTA */}
          <button
            onClick={onConfirm}
            disabled={isPending}
            className="w-full py-3.5 rounded-xl font-black text-sm text-white flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-emerald-600/25 disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ background: isPending ? "rgba(16,185,129,0.5)" : "linear-gradient(135deg, #059669 0%, #047857 100%)" }}
          >
            {isPending ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <ShieldCheck className="w-4 h-4" />
            )}
            Pay & Get Instant Access
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Page ───────────────────────────────────────────── */
export default function Products() {
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("newest");
  const [activeCategory, setActiveCategory] = useState("all");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const { data, isLoading } = useGetProducts({ search, sort: sort as any });
  const purchaseMutation = usePurchaseProduct();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { fmt } = useCurrency();

  const categories = ["all", ...(data?.categories || [])];

  const filtered =
    activeCategory === "all"
      ? data?.products || []
      : (data?.products || []).filter((p) => p.category === activeCategory);

  const handleConfirmPurchase = () => {
    if (!selectedProduct) return;
    purchaseMutation.mutate(
      { id: selectedProduct.id },
      {
        onSuccess: () => {
          toast({ title: "Purchase Successful!", description: `You now own "${selectedProduct.title}".` });
          setSelectedProduct(null);
          queryClient.invalidateQueries({ queryKey: ["/api/products"] });
          queryClient.invalidateQueries({ queryKey: ["/api/wallet/balances"] });
        },
        onError: (err: any) => {
          const message = err?.data?.message || err?.message?.replace(/^HTTP \d+ [^:]+:\s*/i, "") || "Insufficient funds.";
          toast({ title: "Purchase Failed", description: message, variant: "destructive" });
        },
      }
    );
  };

  return (
    <>
      {selectedProduct && (
        <PurchaseDialog
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onConfirm={handleConfirmPurchase}
          isPending={purchaseMutation.isPending}
        />
      )}

      <div className="space-y-5">
        {/* Header */}
        <div className="bg-[#1a0508] border border-red-900/30 rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 right-0 w-64 h-64 bg-violet-600/15 blur-3xl rounded-full" />
            <div className="absolute bottom-0 left-0 w-48 h-40 bg-cyan-600/10 blur-3xl rounded-full" />
          </div>
          <div className="relative z-10 flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-5 h-5 rounded bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
                  <BookOpen className="w-3 h-3 text-violet-400" />
                </div>
                <span className="text-violet-400 text-[10px] font-bold uppercase tracking-widest">Digital Store</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-display font-black text-white leading-tight mb-1">
                Buy once,<br />access instantly.
              </h1>
              <p className="text-slate-400 text-sm">Premium products. Earn commissions every time someone buys through your link.</p>
            </div>
            <button className="flex items-center gap-2 bg-violet-600/20 border border-violet-500/30 rounded-xl px-4 py-2.5 text-violet-300 text-sm font-bold hover:bg-violet-600/30 transition-all flex-shrink-0">
              <Library className="w-4 h-4" />
              My Library
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 relative z-10">
            {[
              { label: "Products", value: data?.total ?? 0 },
              { label: "Owned", value: data?.owned ?? 0 },
              { label: "Categories", value: data?.categories?.length ?? 0 },
              { label: "Sellers", value: data?.sellers ?? 0 },
            ].map((stat) => (
              <div key={stat.label} className="bg-black/30 border border-white/8 rounded-xl px-4 py-3 text-center">
                <p className="text-white font-black text-xl leading-none">{stat.value}</p>
                <p className="text-slate-500 text-[10px] uppercase tracking-widest mt-1.5">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Search + Sort */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#1a0508] border border-red-900/30 rounded-xl py-2.5 pl-9 pr-4 text-white text-sm focus:outline-none focus:border-red-500 placeholder:text-slate-500 transition-colors"
            />
          </div>
          <div className="relative">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="bg-[#1a0508] border border-red-900/30 rounded-xl py-2.5 pl-3 pr-8 text-white text-sm focus:outline-none focus:border-red-500 appearance-none cursor-pointer transition-colors"
              style={{ colorScheme: "dark" }}
            >
              {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          </div>
          <button className="bg-violet-600 hover:bg-violet-500 text-white px-4 rounded-xl transition-all active:scale-95">
            <Search className="w-4 h-4" />
          </button>
        </div>

        {/* Category tabs */}
        <div className="flex gap-2 flex-wrap">
          {categories.map((cat) => {
            const count = cat === "all"
              ? (data?.total ?? 0)
              : (data?.products?.filter((p) => p.category === cat).length ?? 0);
            const isActive = activeCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={cn(
                  "flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold border transition-all",
                  isActive
                    ? "bg-violet-600 border-violet-500 text-white shadow-lg shadow-violet-500/20"
                    : "bg-[#1a0508] border-red-900/30 text-slate-400 hover:text-white hover:border-red-600/50"
                )}
              >
                {cat === "all" ? "All" : cat}
                <span className={cn(
                  "text-[10px] px-1.5 py-0.5 rounded-full font-black",
                  isActive ? "bg-white/20 text-white" : "bg-white/5 text-slate-400"
                )}>{count}</span>
              </button>
            );
          })}
        </div>

        {/* Count */}
        {!isLoading && (
          <p className="text-slate-400 text-xs">
            <span className="text-white font-bold">{filtered.length}</span> of <span className="text-white font-bold">{data?.total ?? 0}</span> products
          </p>
        )}

        {/* Product Grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[1,2,3,4,5,6,7,8].map(i => <div key={i} className="h-72 bg-white/5 rounded-2xl animate-pulse" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filtered.map((product, idx) => {
              const discount = product.originalPrice
                ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
                : null;

              return (
                <div key={product.id} className="bg-[#1a0508] border border-red-900/30 rounded-2xl overflow-hidden flex flex-col hover:border-red-600/50 transition-all group">
                  {/* Image */}
                  <div className="relative h-40 bg-gradient-to-br from-[#2a0508] to-[#1a0508] overflow-hidden">
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-4xl opacity-40">{CATEGORY_ICONS[product.category] || "📦"}</span>
                      </div>
                    )}
                    {/* HOT badge for top sellers */}
                    {idx < 4 && (
                      <div className="absolute top-2 left-2 bg-orange-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wide shadow-md shadow-orange-500/30">
                        Hot
                      </div>
                    )}
                    {discount && (
                      <div className="absolute top-2 right-2 bg-red-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-md">
                        -{discount}%
                      </div>
                    )}
                    {product.isOwned && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <span className="bg-emerald-500 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wide">Owned</span>
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 p-3 flex flex-col gap-2">
                    <span className="inline-flex items-center gap-1 text-[9px] font-bold bg-violet-500/15 text-violet-300 border border-violet-500/20 px-2 py-0.5 rounded-full self-start uppercase tracking-wide">
                      {product.category}
                    </span>
                    <h3 className="text-white font-bold text-sm leading-tight line-clamp-2">{product.title}</h3>

                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white font-black text-base">{fmt(product.price)}</span>
                      {product.originalPrice && (
                        <span className="text-slate-500 text-xs line-through">{fmt(product.originalPrice)}</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-[10px] text-slate-500">
                      <span>{product.soldCount} sold</span>
                      <span className="w-1 h-1 rounded-full bg-slate-600" />
                      <span className="uppercase">{product.category}</span>
                      {product.commissionPercent === 100 && (
                        <span className="ml-auto text-emerald-400 font-bold">💯 {product.commissionPercent}%</span>
                      )}
                    </div>
                  </div>

                  {/* CTA */}
                  <div className="px-3 pb-3">
                    {product.isOwned ? (
                      <button
                        disabled
                        className="w-full py-2.5 rounded-xl text-xs font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center gap-1.5"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" /> Owned
                      </button>
                    ) : (
                      <button
                        onClick={() => setSelectedProduct(product)}
                        className="w-full py-2.5 rounded-xl text-xs font-black text-white flex items-center justify-center gap-1.5 transition-all active:scale-95 shadow-md shadow-violet-500/20"
                        style={{ background: "linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)" }}
                      >
                        <Zap className="w-3.5 h-3.5" /> Access Now
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {filtered.length === 0 && !isLoading && (
              <div className="col-span-full py-14 flex flex-col items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/8 flex items-center justify-center">
                  <BookOpen className="w-7 h-7 text-slate-500" />
                </div>
                <p className="text-white font-semibold text-sm">No products found</p>
                <p className="text-slate-400 text-xs">Try a different category or search term.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
