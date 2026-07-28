import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import {
  ChevronLeft, ChevronRight, Search, Check, X, DollarSign,
  TrendingUp, Clock, AlertCircle, Filter
} from "lucide-react";

interface Account {
  id: number; userId: number; username: string; email: string; country: string;
  planName: string; brandName: string; category: string;
  depositAmount: number; dailyProfitAmount: number; totalDays: number;
  totalProfit: number; totalEarned: number; daysElapsed: number;
  status: string; startDate: string | null; nextCreditAt: string | null; createdAt: string;
}

interface Payment {
  id: number; userId: number; username: string; email: string; phone: string;
  screenshotUrl: string; amountPaid: number; currency: string;
  status: string; adminNote: string; createdAt: string;
}

type View = "accounts" | "payments";

function StatusBadge({ status }: { status: string }) {
  const m: Record<string, string> = {
    active:    "bg-emerald-100 text-emerald-700",
    pending:   "bg-amber-100 text-amber-700",
    completed: "bg-blue-100 text-blue-700",
    cancelled: "bg-red-100 text-red-700",
    approved:  "bg-emerald-100 text-emerald-700",
    rejected:  "bg-red-100 text-red-700",
  };
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${m[status] ?? "bg-muted text-muted-foreground"}`}>
      {status}
    </span>
  );
}

function ActionModal({ account, onClose }: { account: Account; onClose: () => void }) {
  const { toast } = useToast();
  const qc        = useQueryClient();
  const [action, setAction] = useState<"credit" | "debit" | "set_status">("credit");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [status, setStatus] = useState("active");

  const mut = useMutation({
    mutationFn: () => api.investmentUpdateAccount(account.id, { action, amount: parseFloat(amount) || 0, reason, status }),
    onSuccess: () => {
      toast({ title: "Updated" });
      qc.invalidateQueries({ queryKey: ["admin-invest-accounts"] });
      onClose();
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h2 className="font-bold text-foreground">Manage Investment #{account.id}</h2>
            <p className="text-xs text-muted-foreground">{account.username} · {account.planName}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-4">
          {/* Current stats */}
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-muted/50 rounded-xl p-3">
              <p className="text-[10px] text-muted-foreground">Deposited</p>
              <p className="text-sm font-bold">{account.depositAmount.toLocaleString()}</p>
            </div>
            <div className="bg-muted/50 rounded-xl p-3">
              <p className="text-[10px] text-muted-foreground">Earned</p>
              <p className="text-sm font-bold text-emerald-600">{account.totalEarned.toLocaleString()}</p>
            </div>
            <div className="bg-muted/50 rounded-xl p-3">
              <p className="text-[10px] text-muted-foreground">Day</p>
              <p className="text-sm font-bold">{account.daysElapsed}/{account.totalDays}</p>
            </div>
          </div>

          {/* Action tabs */}
          <div className="flex bg-muted rounded-xl p-1 text-xs">
            {(["credit", "debit", "set_status"] as const).map(a => (
              <button key={a} onClick={() => setAction(a)}
                className={`flex-1 py-2 rounded-lg font-semibold transition-colors ${action === a ? "bg-background shadow-sm" : "text-muted-foreground"}`}>
                {a === "credit" ? "Credit" : a === "debit" ? "Debit" : "Set Status"}
              </button>
            ))}
          </div>

          {action !== "set_status" && (
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Amount</label>
              <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00"
                className="w-full px-3 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
            </div>
          )}
          {action === "set_status" && (
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">New Status</label>
              <select value={status} onChange={e => setStatus(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                <option value="pending">pending</option>
                <option value="active">active</option>
                <option value="completed">completed</option>
                <option value="cancelled">cancelled</option>
              </select>
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Reason (optional)</label>
            <input type="text" value={reason} onChange={e => setReason(e.target.value)} placeholder="Admin note"
              className="w-full px-3 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
          <button onClick={() => mut.mutate()} disabled={mut.isPending}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90 disabled:opacity-50 transition-colors">
            {mut.isPending ? "Saving…" : "Apply"}
          </button>
        </div>
      </div>
    </div>
  );
}

function PaymentReviewModal({ payment, onClose }: { payment: Payment; onClose: () => void }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [note, setNote] = useState("");

  const approveMut = useMutation({
    mutationFn: () => api.investmentApprovePayment(payment.id, note),
    onSuccess: () => { toast({ title: "Approved — investment activated" }); qc.invalidateQueries({ queryKey: ["admin-invest-payments"] }); qc.invalidateQueries({ queryKey: ["admin-invest-accounts"] }); onClose(); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const rejectMut = useMutation({
    mutationFn: () => api.investmentRejectPayment(payment.id, note),
    onSuccess: () => { toast({ title: "Rejected" }); qc.invalidateQueries({ queryKey: ["admin-invest-payments"] }); onClose(); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-bold text-foreground">Review Investment Payment #{payment.id}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><p className="text-xs text-muted-foreground">User</p><p className="font-semibold">{payment.username}</p></div>
            <div><p className="text-xs text-muted-foreground">Amount</p><p className="font-semibold">{payment.amountPaid} {payment.currency}</p></div>
            <div><p className="text-xs text-muted-foreground">Phone</p><p className="font-semibold">{payment.phone}</p></div>
            <div><p className="text-xs text-muted-foreground">Status</p><StatusBadge status={payment.status} /></div>
          </div>

          <div>
            <p className="text-xs text-muted-foreground mb-1">Admin Note</p>
            <p className="text-xs bg-muted rounded-lg p-2 text-foreground font-mono break-all">{payment.adminNote}</p>
          </div>

          {payment.screenshotUrl && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Screenshot</p>
              <a href={payment.screenshotUrl} target="_blank" rel="noopener noreferrer">
                <img src={payment.screenshotUrl} alt="screenshot" className="w-full max-h-64 object-contain rounded-xl border border-border" />
              </a>
            </div>
          )}

          {payment.status === "pending" && (
            <>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Note (optional)</label>
                <input type="text" value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. Confirmed receipt"
                  className="w-full px-3 py-2.5 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div className="flex gap-3">
                <button onClick={() => rejectMut.mutate()} disabled={rejectMut.isPending || approveMut.isPending}
                  className="flex-1 py-3 rounded-xl border border-border text-sm font-semibold text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                  <X className="w-4 h-4" />{rejectMut.isPending ? "Rejecting…" : "Reject"}
                </button>
                <button onClick={() => approveMut.mutate()} disabled={approveMut.isPending || rejectMut.isPending}
                  className="flex-1 py-3 rounded-xl bg-emerald-500 text-white text-sm font-bold hover:bg-emerald-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                  <Check className="w-4 h-4" />{approveMut.isPending ? "Approving…" : "Approve & Activate"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function InvestmentAccounts() {
  const [view, setView]       = useState<View>("payments");
  const [search, setSearch]   = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage]       = useState(1);
  const [selected, setSelected]       = useState<Account | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);

  const { data: accountData, isLoading: loadingAcc } = useQuery({
    queryKey: ["admin-invest-accounts", page, statusFilter, search],
    queryFn: () => api.investmentListAccounts({ page, status: statusFilter || undefined, search: search || undefined }),
    enabled: view === "accounts",
  });

  const { data: paymentData, isLoading: loadingPay } = useQuery({
    queryKey: ["admin-invest-payments", page, statusFilter],
    queryFn: () => api.investmentListPayments({ page, status: statusFilter || undefined }),
    enabled: view === "payments",
  });

  const accounts = (accountData as { accounts: Account[]; total: number; totalPages: number } | undefined);
  const payments = (paymentData as { payments: Payment[]; total: number; totalPages: number } | undefined);

  const pendingCount = payments?.payments?.filter(p => p.status === "pending").length ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Investment Management</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Review payments and manage user investment accounts</p>
      </div>

      {/* View tabs */}
      <div className="flex gap-2">
        <button onClick={() => { setView("payments"); setPage(1); setStatusFilter(""); }}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${view === "payments" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
          Payment Verifications
          {pendingCount > 0 && <span className="ml-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{pendingCount}</span>}
        </button>
        <button onClick={() => { setView("accounts"); setPage(1); setStatusFilter(""); }}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${view === "accounts" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}>
          User Investments
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        {view === "accounts" && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="Search username…"
              className="pl-9 pr-4 py-2 rounded-lg border border-input bg-background text-sm w-48 focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
        )}
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          className="px-3 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="active">Active</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
          {view === "payments" && <option value="approved">Approved</option>}
          {view === "payments" && <option value="rejected">Rejected</option>}
        </select>
      </div>

      {/* PAYMENTS TABLE */}
      {view === "payments" && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {loadingPay ? (
            <div className="p-8 text-center text-muted-foreground text-sm">Loading…</div>
          ) : !payments?.payments?.length ? (
            <div className="p-8 text-center text-muted-foreground text-sm">No payment records found</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">User</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Plan</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">Amount</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Date</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {payments.payments.map(p => (
                  <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-foreground">{p.username}</p>
                      <p className="text-[10px] text-muted-foreground">{p.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs text-muted-foreground truncate max-w-[200px]">{p.adminNote?.replace(/^INVESTMENT \| /, "")?.split("|")[2]?.replace("plan=", "")?.trim() ?? "—"}</p>
                    </td>
                    <td className="px-4 py-3 text-right font-medium">{p.amountPaid.toLocaleString()} {p.currency}</td>
                    <td className="px-4 py-3 text-center"><StatusBadge status={p.status} /></td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(p.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => setSelectedPayment(p)}
                        className="px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20 transition-colors">
                        Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ACCOUNTS TABLE */}
      {view === "accounts" && (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {loadingAcc ? (
            <div className="p-8 text-center text-muted-foreground text-sm">Loading…</div>
          ) : !accounts?.accounts?.length ? (
            <div className="p-8 text-center text-muted-foreground text-sm">No investment accounts found</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">User</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Plan</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">Deposit</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">Earned</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">Progress</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {accounts.accounts.map(a => (
                  <tr key={a.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-foreground">{a.username}</p>
                      <p className="text-[10px] text-muted-foreground">{a.country}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs font-medium text-foreground">{a.planName}</p>
                      <p className="text-[10px] text-muted-foreground capitalize">{a.category}</p>
                    </td>
                    <td className="px-4 py-3 text-right">{a.depositAmount.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-emerald-600 font-medium">{a.totalEarned.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-xs">
                      Day {a.daysElapsed}/{a.totalDays}
                      <div className="w-16 h-1 bg-muted rounded-full ml-auto mt-1">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(100, (a.daysElapsed / a.totalDays) * 100)}%` }} />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center"><StatusBadge status={a.status} /></td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => setSelected(a)}
                        className="px-3 py-1.5 rounded-lg bg-muted text-foreground text-xs font-semibold hover:bg-muted/70 transition-colors">
                        Manage
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Pagination */}
      {((view === "accounts" && (accounts?.totalPages ?? 1) > 1) ||
        (view === "payments" && (payments?.totalPages ?? 1) > 1)) && (
        <div className="flex items-center justify-center gap-4">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="p-2 rounded-lg border border-border hover:bg-muted disabled:opacity-40 transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm text-muted-foreground">Page {page}</span>
          <button onClick={() => setPage(p => p + 1)}
            disabled={page >= ((view === "accounts" ? accounts?.totalPages : payments?.totalPages) ?? 1)}
            className="p-2 rounded-lg border border-border hover:bg-muted disabled:opacity-40 transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {selected && <ActionModal account={selected} onClose={() => setSelected(null)} />}
      {selectedPayment && <PaymentReviewModal payment={selectedPayment} onClose={() => setSelectedPayment(null)} />}
    </div>
  );
}
