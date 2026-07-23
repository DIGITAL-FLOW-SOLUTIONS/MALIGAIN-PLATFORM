import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, WithdrawalItem } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, ChevronRight, CheckCircle, XCircle, Search, X } from "lucide-react";

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending:   "bg-amber-100 text-amber-700",
    completed: "bg-emerald-100 text-emerald-700",
    failed:    "bg-destructive/10 text-destructive",
  };
  const labels: Record<string, string> = { pending: "Pending", completed: "Paid", failed: "Declined" };
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] ?? "bg-muted text-muted-foreground"}`}>
      {labels[status] ?? status}
    </span>
  );
}

function ConfirmModal({ title, message, confirmLabel, confirmClass, onConfirm, onCancel, loading }: {
  title: string; message: string; confirmLabel: string; confirmClass: string;
  onConfirm: () => void; onCancel: () => void; loading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-xl w-full max-w-sm shadow-2xl p-6 space-y-4">
        <h3 className="text-lg font-bold text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground">{message}</p>
        <div className="flex gap-3 pt-1">
          <button onClick={onCancel} disabled={loading}
            className="flex-1 py-2 border border-border rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted transition-colors disabled:opacity-50">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={loading}
            className={`flex-1 py-2 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50 ${confirmClass}`}>
            {loading ? "Processing…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
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

type ConfirmType = "approve" | "decline";

export default function Withdrawals() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [status, setStatus]   = useState("all");
  const [page, setPage]       = useState(1);
  const [confirm, setConfirm] = useState<{ type: ConfirmType; item: WithdrawalItem } | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch]           = useState("");

  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput.trim()); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-withdrawals", status, page, search],
    queryFn: () => api.listWithdrawals({ status: status !== "all" ? status : undefined, page, search: search || undefined }),
  });

  function makeToastMut(successMsg: string) {
    return {
      onSuccess: () => { toast({ title: successMsg }); qc.invalidateQueries({ queryKey: ["admin-withdrawals"] }); setConfirm(null); },
      onError: (e: Error) => { toast({ title: "Error", description: e.message, variant: "destructive" as const }); setConfirm(null); },
    };
  }

  const approveMut = useMutation({ mutationFn: (id: number) => api.approveWithdrawal(id), ...makeToastMut("Withdrawal marked as paid") });
  const declineMut = useMutation({ mutationFn: (id: number) => api.declineWithdrawal(id), ...makeToastMut("Withdrawal declined and funds refunded") });
  const busy = approveMut.isPending || declineMut.isPending;

  const confirmConfig: Record<ConfirmType, { title: string; msgFn: (w: WithdrawalItem) => string; label: string; cls: string; action: (id: number) => void }> = {
    approve: {
      title: "Approve Withdrawal",
      msgFn: w => `Mark the ${w.amount.toFixed(2)} withdrawal for ${w.username} to ${w.phoneNumber ?? "—"} as paid? No wallet changes will be made.`,
      label: "Mark as Paid",
      cls: "bg-emerald-600 hover:bg-emerald-700",
      action: id => approveMut.mutate(id),
    },
    decline: {
      title: "Decline Withdrawal",
      msgFn: w => `Decline this withdrawal for ${w.username}? The full amount will be refunded back to their wallet.`,
      label: "Decline & Refund",
      cls: "bg-destructive hover:opacity-90",
      action: id => declineMut.mutate(id),
    },
  };

  const total      = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 0;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Withdrawals</h1>
        <p className="text-muted-foreground text-sm mt-1">{total} total withdrawal requests</p>
      </div>

      <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
        <div className="p-4 border-b border-border flex flex-col sm:flex-row sm:items-center gap-3">
          <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-input bg-background text-foreground rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 shrink-0">
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="completed">Paid</option>
            <option value="failed">Declined</option>
          </select>

          <div className="relative flex-1 max-w-xs sm:ml-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <input type="text" value={searchInput} onChange={e => setSearchInput(e.target.value)}
              placeholder="Search by username or phone…"
              className="w-full pl-8 pr-8 py-1.5 text-sm border border-input bg-muted text-foreground rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary placeholder:text-muted-foreground" />
            {searchInput && (
              <button onClick={() => setSearchInput("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label="Clear search">
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {search && !isLoading && (
          <div className="px-4 py-2 bg-primary/5 border-b border-primary/10 text-xs text-primary">
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
              <thead className="bg-muted border-b border-border">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">User</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Amount</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Payout Phone</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Date</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(data?.withdrawals ?? []).map((w: WithdrawalItem) => (
                  <tr key={w.id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground">{search ? highlightMatch(w.username, search) : w.username}</div>
                      {w.userPhone && <div className="text-xs text-muted-foreground">{search ? highlightMatch(w.userPhone, search) : w.userPhone}</div>}
                    </td>
                    <td className="px-4 py-3 font-semibold text-foreground">{w.amount.toFixed(2)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{w.phoneNumber ?? "—"}</td>
                    <td className="px-4 py-3"><StatusBadge status={w.status} /></td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(w.createdAt).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 justify-end flex-wrap">
                        {w.status !== "completed" && (
                          <button onClick={() => setConfirm({ type: "approve", item: w })}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-50 transition-colors">
                            <CheckCircle className="h-3.5 w-3.5" /> Approve
                          </button>
                        )}
                        {w.status === "pending" && (
                          <button onClick={() => setConfirm({ type: "decline", item: w })}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-destructive border border-destructive/20 rounded-lg hover:bg-destructive/5 transition-colors">
                            <XCircle className="h-3.5 w-3.5" /> Decline
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {(data?.withdrawals ?? []).length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center">
                      <p className="text-muted-foreground text-sm">{search ? `No withdrawals match "${search}"` : "No withdrawal requests found"}</p>
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
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="p-1.5 rounded border border-border hover:bg-muted disabled:opacity-40">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="p-1.5 rounded border border-border hover:bg-muted disabled:opacity-40">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {confirm && (() => {
        const cfg = confirmConfig[confirm.type];
        return (
          <ConfirmModal title={cfg.title} message={cfg.msgFn(confirm.item)} confirmLabel={cfg.label}
            confirmClass={cfg.cls} loading={busy} onConfirm={() => cfg.action(confirm.item.id)} onCancel={() => setConfirm(null)} />
        );
      })()}
    </div>
  );
}
