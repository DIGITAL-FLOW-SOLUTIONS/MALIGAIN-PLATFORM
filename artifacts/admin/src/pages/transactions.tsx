import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, TransactionItem } from "@/lib/api";
import { ChevronLeft, ChevronRight } from "lucide-react";

function TypeBadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
    recharge: "bg-blue-100 text-blue-700",
    withdrawal: "bg-purple-100 text-purple-700",
    credit: "bg-green-100 text-green-700",
    debit: "bg-red-100 text-red-700",
    referral_bonus: "bg-primary/10 text-primary",
    commission: "bg-amber-100 text-amber-700",
  };
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${colors[type] ?? "bg-muted text-muted-foreground"}`}>
      {type.replace("_", " ")}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    completed: "bg-green-100 text-green-700",
    pending: "bg-amber-100 text-amber-700",
    failed: "bg-red-100 text-red-700",
  };
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${colors[status] ?? "bg-muted text-muted-foreground"}`}>
      {status}
    </span>
  );
}

const selectCls = "px-3 py-2 border border-border rounded-lg text-sm text-foreground bg-card focus:outline-none focus:ring-2 focus:ring-ring";

export default function Transactions() {
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-transactions", typeFilter, statusFilter, page],
    queryFn: () => api.listTransactions({
      type: typeFilter !== "all" ? typeFilter : undefined,
      status: statusFilter !== "all" ? statusFilter : undefined,
      page,
    }),
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Transactions</h1>
        <p className="text-muted-foreground text-sm mt-1">{data?.total ?? 0} total transactions</p>
      </div>

      <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
        <div className="p-4 border-b border-border flex gap-3 flex-wrap">
          <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1); }} className={selectCls}>
            <option value="all">All Types</option>
            <option value="recharge">Recharge</option>
            <option value="withdrawal">Withdrawal</option>
            <option value="credit">Credit</option>
            <option value="debit">Debit</option>
            <option value="referral_bonus">Referral Bonus</option>
          </select>
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} className={selectCls}>
            <option value="all">All Status</option>
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
          </select>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 border-b border-border">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">ID</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">User</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Type</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Amount</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Description</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(data?.transactions ?? []).map((t: TransactionItem) => (
                  <tr key={t.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 text-muted-foreground font-mono text-xs">#{t.id}</td>
                    <td className="px-4 py-3 font-medium text-foreground">{t.username}</td>
                    <td className="px-4 py-3"><TypeBadge type={t.type} /></td>
                    <td className="px-4 py-3 text-right font-semibold text-foreground">KES {t.amount.toFixed(2)}</td>
                    <td className="px-4 py-3"><StatusBadge status={t.status} /></td>
                    <td className="px-4 py-3 text-muted-foreground max-w-xs truncate">{t.description ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{new Date(t.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
                {data?.transactions.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">No transactions found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {(data?.totalPages ?? 0) > 1 && (
          <div className="px-4 py-3 border-t border-border flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Page {page} of {data?.totalPages}</span>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="p-1.5 rounded border border-border hover:bg-muted/40 disabled:opacity-40">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button onClick={() => setPage(p => Math.min(data!.totalPages, p + 1))} disabled={page === data?.totalPages}
                className="p-1.5 rounded border border-border hover:bg-muted/40 disabled:opacity-40">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
