import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, WithdrawalItem } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, ChevronRight, CheckCircle, XCircle, Search, X } from "lucide-react";

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending:   "bg-amber-100 text-amber-700",
    completed: "bg-green-100 text-green-700",
    failed:    "bg-red-100 text-red-700",
  };
  const labels: Record<string, string> = {
    pending: "Pending", completed: "Paid", failed: "Declined",
  };
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${styles[status] ?? "bg-gray-100 text-gray-600"}`}>
      {labels[status] ?? status}
    </span>
  );
}

function ConfirmModal({
  title, message, confirmLabel, confirmClass, onConfirm, onCancel, loading,
}: {
  title: string; message: string; confirmLabel: string; confirmClass: string;
  onConfirm: () => void; onCancel: () => void; loading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-sm shadow-2xl p-6 space-y-4">
        <h3 className="text-lg font-bold text-gray-900">{title}</h3>
        <p className="text-sm text-gray-500">{message}</p>
        <div className="flex gap-3 pt-1">
          <button onClick={onCancel} disabled={loading}
            className="flex-1 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50">
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

// Highlights the matched portion of a string
function highlightMatch(text: string, query: string) {
  if (!query || !text) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-indigo-100 text-indigo-700 rounded px-0.5 font-semibold not-italic">
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
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-withdrawals", status, page, search],
    queryFn: () => api.listWithdrawals({
      status: status !== "all" ? status : undefined,
      page,
      search: search || undefined,
    }),
  });

  function makeToastMut(successMsg: string) {
    return {
      onSuccess: () => {
        toast({ title: successMsg });
        qc.invalidateQueries({ queryKey: ["admin-withdrawals"] });
        setConfirm(null);
      },
      onError: (e: Error) => {
        toast({ title: "Error", description: e.message, variant: "destructive" as const });
        setConfirm(null);
      },
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
      cls: "bg-green-600 hover:bg-green-700",
      action: id => approveMut.mutate(id),
    },
    decline: {
      title: "Decline Withdrawal",
      msgFn: w => `Decline this withdrawal for ${w.username}? The full amount will be refunded back to their wallet.`,
      label: "Decline & Refund",
      cls: "bg-red-600 hover:bg-red-700",
      action: id => declineMut.mutate(id),
    },
  };

  const total      = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 0;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Withdrawals</h1>
        <p className="text-gray-500 text-sm mt-1">{total} total withdrawal requests</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">

        {/* Toolbar: status filter + search */}
        <div className="p-4 border-b flex flex-col sm:flex-row sm:items-center gap-3">
          <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shrink-0">
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="completed">Paid</option>
            <option value="failed">Declined</option>
          </select>

          <div className="relative flex-1 max-w-xs sm:ml-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="Search by username or phone…"
              className="w-full pl-8 pr-8 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-gray-50"
            />
            {searchInput && (
              <button
                onClick={() => setSearchInput("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Result count when searching */}
        {search && !isLoading && (
          <div className="px-4 py-2 bg-indigo-50 border-b border-indigo-100 text-xs text-indigo-700">
            {total === 0
              ? `No results for "${search}"`
              : `${total} result${total !== 1 ? "s" : ""} for "${search}"`}
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">User</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Amount</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Payout Phone</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {(data?.withdrawals ?? []).map((w: WithdrawalItem) => (
                  <tr key={w.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">
                        {search ? highlightMatch(w.username, search) : w.username}
                      </div>
                      {w.userPhone && (
                        <div className="text-xs text-gray-400">
                          {search ? highlightMatch(w.userPhone, search) : w.userPhone}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-900">{w.amount.toFixed(2)}</td>
                    <td className="px-4 py-3 text-gray-600">{w.phoneNumber ?? "—"}</td>
                    <td className="px-4 py-3"><StatusBadge status={w.status} /></td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{new Date(w.createdAt).toLocaleString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 justify-end flex-wrap">
                        {w.status !== "completed" && (
                          <button onClick={() => setConfirm({ type: "approve", item: w })}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-green-700 border border-green-200 rounded-lg hover:bg-green-50 transition-colors">
                            <CheckCircle className="h-3.5 w-3.5" /> Approve
                          </button>
                        )}
                        {w.status === "pending" && (
                          <button onClick={() => setConfirm({ type: "decline", item: w })}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors">
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
                      <p className="text-gray-400 text-sm">
                        {search ? `No withdrawals match "${search}"` : "No withdrawal requests found"}
                      </p>
                      {search && (
                        <button onClick={() => setSearchInput("")}
                          className="mt-2 text-indigo-600 text-xs hover:underline">
                          Clear search
                        </button>
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="px-4 py-3 border-t flex items-center justify-between text-sm">
            <span className="text-gray-500">Page {page} of {totalPages}</span>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="p-1.5 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-40">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="p-1.5 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-40">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {confirm && (() => {
        const cfg = confirmConfig[confirm.type];
        return (
          <ConfirmModal
            title={cfg.title}
            message={cfg.msgFn(confirm.item)}
            confirmLabel={cfg.label}
            confirmClass={cfg.cls}
            loading={busy}
            onConfirm={() => cfg.action(confirm.item.id)}
            onCancel={() => setConfirm(null)}
          />
        );
      })()}
    </div>
  );
}
