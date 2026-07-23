import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, ReferralBonusItem } from "@/lib/api";
import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";

const LEVEL_COLORS: Record<number, string> = {
  1: "bg-primary/10 text-primary",
  2: "bg-secondary/10 text-secondary",
  3: "bg-pink-100 text-pink-700",
};

function LevelBadge({ level }: { level: number | null }) {
  if (!level) return <span className="text-muted-foreground text-xs">—</span>;
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${LEVEL_COLORS[level] ?? "bg-muted text-muted-foreground"}`}>
      L{level}
    </span>
  );
}

function highlightMatch(text: string, query: string) {
  if (!query || !text) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-primary/10 text-primary rounded px-0.5 font-semibold not-italic">
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
}

export default function ReferralBonuses() {
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput.trim()); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-referral-bonuses", page, search],
    queryFn: () => api.listReferralBonuses({ page, search: search || undefined }),
    refetchInterval: 30000,
  });

  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 0;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Referral Bonuses</h1>
        <p className="text-muted-foreground text-sm mt-1">{total} total bonus records</p>
      </div>

      <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
        <div className="p-4 border-b border-border flex items-center gap-3">
          <div className="relative flex-1 max-w-xs sm:ml-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="Search by username, email or phone…"
              className="w-full pl-8 pr-8 py-1.5 text-sm border border-border rounded-lg bg-muted/20 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary"
            />
            {searchInput && (
              <button onClick={() => setSearchInput("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label="Clear search">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {search && !isLoading && (
          <div className="px-4 py-2 bg-primary/10 border-b border-primary/20 text-xs text-primary">
            {total === 0 ? `No results for "${search}"` : `${total} result${total !== 1 ? "s" : ""} for "${search}"`}
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 border-b border-border">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Level</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Recipient</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Description</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Amount</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(data?.bonuses ?? []).map((b: ReferralBonusItem) => (
                  <tr key={b.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3"><LevelBadge level={b.level} /></td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground">{search ? highlightMatch(b.username, search) : b.username}</div>
                      {b.email && <div className="text-xs text-muted-foreground">{search ? highlightMatch(b.email, search) : b.email}</div>}
                      {b.phone && <div className="text-xs text-muted-foreground">{search ? highlightMatch(b.phone, search) : b.phone}</div>}
                    </td>
                    <td className="px-4 py-3 text-foreground/70 max-w-xs truncate">{b.description}</td>
                    <td className="px-4 py-3 font-semibold text-emerald-600">{b.amount.toLocaleString()}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">{new Date(b.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
                {(data?.bonuses ?? []).length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center">
                      <p className="text-muted-foreground text-sm">{search ? `No referral bonuses match "${search}"` : "No referral bonus records yet"}</p>
                      {search && <button onClick={() => setSearchInput("")} className="mt-2 text-primary text-xs hover:underline">Clear search</button>}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-border flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Page {page} of {totalPages}</span>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 rounded border border-border hover:bg-muted/40 disabled:opacity-40">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1.5 rounded border border-border hover:bg-muted/40 disabled:opacity-40">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
