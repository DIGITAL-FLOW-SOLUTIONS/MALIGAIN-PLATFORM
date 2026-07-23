import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, VerificationItem } from "@/lib/api";
import { Check, X, ChevronLeft, ChevronRight, ExternalLink, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending:  "bg-amber-100 text-amber-700",
    approved: "bg-green-100 text-green-700",
    rejected: "bg-red-100 text-red-700",
  };
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${colors[status] ?? "bg-muted text-muted-foreground"}`}>
      {status}
    </span>
  );
}

function ActionModal({ verification, onClose }: { verification: VerificationItem; onClose: () => void }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [note, setNote] = useState("");

  const approveMut = useMutation({
    mutationFn: () => api.approveVerification(verification.id, note),
    onSuccess: () => { toast({ title: "Verification approved" }); qc.invalidateQueries({ queryKey: ["admin-verifications"] }); onClose(); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const rejectMut = useMutation({
    mutationFn: () => api.rejectVerification(verification.id, note),
    onSuccess: () => { toast({ title: "Verification rejected" }); qc.invalidateQueries({ queryKey: ["admin-verifications"] }); onClose(); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-card rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-bold text-foreground">Review Verification #{verification.id}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-muted-foreground"><X className="h-5 w-5" /></button>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-muted-foreground">User</span><p className="font-medium mt-0.5">{verification.username}</p></div>
            <div><span className="text-muted-foreground">Email</span><p className="font-medium mt-0.5">{verification.email}</p></div>
            <div><span className="text-muted-foreground">Phone</span><p className="font-medium mt-0.5">{verification.phone}</p></div>
            <div><span className="text-muted-foreground">Amount Paid</span><p className="font-bold text-primary mt-0.5">{verification.currency} {verification.amountPaid}</p></div>
            <div><span className="text-muted-foreground">Submitted</span><p className="font-medium mt-0.5">{new Date(verification.createdAt).toLocaleString()}</p></div>
            <div><span className="text-muted-foreground">Status</span><div className="mt-0.5"><StatusBadge status={verification.status} /></div></div>
          </div>

          {verification.screenshotUrl ? (
            <a href={verification.screenshotUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 text-primary hover:text-primary text-sm font-medium">
              <ExternalLink className="h-4 w-4" />
              View Payment Screenshot
            </a>
          ) : (
            <p className="text-sm text-muted-foreground italic">No screenshot (Uganda mobile money payment)</p>
          )}

          {verification.adminNote && (
            <div className="bg-muted/30 rounded-lg p-3 text-sm">
              <span className="text-muted-foreground">Admin Note:</span>
              <p className="mt-0.5 text-foreground/80">{verification.adminNote}</p>
            </div>
          )}

          {verification.status === "pending" && (
            <>
              <textarea value={note} onChange={e => setNote(e.target.value)}
                placeholder="Admin note (optional for approve, recommended for reject)"
                rows={3} className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none" />
              <div className="flex gap-3">
                <button onClick={() => approveMut.mutate()} disabled={approveMut.isPending || rejectMut.isPending}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors">
                  <Check className="h-4 w-4" />
                  Approve & Activate User
                </button>
                <button onClick={() => rejectMut.mutate()} disabled={!note || approveMut.isPending || rejectMut.isPending}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors">
                  <X className="h-4 w-4" />
                  Reject
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Verifications() {
  const [statusFilter, setStatusFilter] = useState("pending");
  const [page, setPage]                 = useState(1);
  const [selected, setSelected]         = useState<VerificationItem | null>(null);

  // Raw input value (updates instantly)
  const [searchInput, setSearchInput] = useState("");
  // Debounced value sent to the API (waits 400 ms after the user stops typing)
  const [search, setSearch] = useState("");

  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-verifications", statusFilter, page, search],
    queryFn: () => api.listVerifications({
      status: statusFilter !== "all" ? statusFilter : undefined,
      page,
      search: search || undefined,
    }),
    refetchInterval: 15000,
  });

  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 0;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Payment Verifications</h1>
        <p className="text-muted-foreground text-sm mt-1">Review payments from Eversend (other countries) and Uganda mobile money users</p>
      </div>

      <div className="bg-card rounded-xl shadow-sm border border-gray-100 overflow-hidden">

        {/* Toolbar: status tabs + search */}
        <div className="p-4 border-b border-border flex flex-col sm:flex-row sm:items-center gap-3">
          {/* Status tabs */}
          <div className="flex gap-1 bg-muted rounded-lg p-1 w-fit shrink-0">
            {["pending", "approved", "rejected", "all"].map(s => (
              <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }}
                className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-colors ${statusFilter === s ? "bg-card shadow text-foreground" : "text-muted-foreground hover:text-foreground/80"}`}>
                {s}
              </button>
            ))}
          </div>

          {/* Search input */}
          <div className="relative flex-1 max-w-xs sm:ml-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="Search by username, email or phone…"
              className="w-full pl-8 pr-8 py-1.5 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-muted/30"
            />
            {searchInput && (
              <button
                onClick={() => setSearchInput("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-muted-foreground"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Result count when searching */}
        {search && !isLoading && (
          <div className="px-4 py-2 bg-primary/10 border-b border-border border-indigo-100 text-xs text-primary">
            {total === 0
              ? `No results for "${search}"`
              : `${total} result${total !== 1 ? "s" : ""} for "${search}"`}
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-6 w-6 border-b border-border-2 border-primary" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 border-b border-border">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">User</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Phone</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Amount</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Submitted</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(data?.verifications ?? []).map((v: VerificationItem) => (
                  <tr key={v.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground">
                        {search
                          ? highlightMatch(v.username, search)
                          : v.username}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {search
                          ? highlightMatch(v.email, search)
                          : v.email}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {search ? highlightMatch(v.phone, search) : v.phone}
                    </td>
                    <td className="px-4 py-3 font-semibold text-primary">{v.currency} {v.amountPaid}</td>
                    <td className="px-4 py-3"><StatusBadge status={v.status} /></td>
                    <td className="px-4 py-3 text-muted-foreground">{new Date(v.createdAt).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => setSelected(v)}
                        className="px-3 py-1.5 text-xs font-medium border border-border rounded-lg hover:bg-muted/30 transition-colors text-foreground/80">
                        Review
                      </button>
                    </td>
                  </tr>
                ))}
                {(data?.verifications ?? []).length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center">
                      <p className="text-muted-foreground text-sm">
                        {search ? `No verifications match "${search}"` : "No verifications found"}
                      </p>
                      {search && (
                        <button onClick={() => setSearchInput("")}
                          className="mt-2 text-primary text-xs hover:underline">
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
            <span className="text-muted-foreground">Page {page} of {totalPages}</span>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="p-1.5 rounded border border-border hover:bg-muted/30 disabled:opacity-40">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="p-1.5 rounded border border-border hover:bg-muted/30 disabled:opacity-40">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {selected && <ActionModal verification={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

// Highlights the matched portion of a string in bold indigo
function highlightMatch(text: string, query: string) {
  if (!query) return <>{text}</>;
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
