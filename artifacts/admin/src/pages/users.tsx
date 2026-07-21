import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, UserItem, WalletBalance } from "@/lib/api";
import { Search, ChevronLeft, ChevronRight, Eye, EyeOff, X, UserCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

const COUNTRIES = [
  { value: "KE", label: "🇰🇪 Kenya" },
  { value: "UG", label: "🇺🇬 Uganda" },
  { value: "TZ", label: "🇹🇿 Tanzania" },
  { value: "GH", label: "🇬🇭 Ghana" },
  { value: "ZM", label: "🇿🇲 Zambia" },
  { value: "CM", label: "🇨🇲 Cameroon" },
];

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: "bg-green-100 text-green-700",
    inactive: "bg-amber-100 text-amber-700",
    suspended: "bg-red-100 text-red-700",
  };
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${colors[status] ?? "bg-gray-100 text-gray-600"}`}>
      {status}
    </span>
  );
}

function UserDetailModal({ userId, onClose, onDeleted }: { userId: number; onClose: () => void; onDeleted: () => void }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [walletField, setWalletField] = useState("main_wallet");
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustReason, setAdjustReason] = useState("");
  const [tab, setTab] = useState<"info" | "edit" | "wallet" | "referrals" | "password">("info");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Edit tab state
  const [editUsername, setEditUsername] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editCountry, setEditCountry] = useState("");

  // Upline (referred_by) state
  const [uplineQuery, setUplineQuery] = useState("");
  const [selectedUpline, setSelectedUpline] = useState<{ id: number; username: string } | null>(null);
  const [showUplineDrop, setShowUplineDrop] = useState(false);
  const uplineRef = useRef<HTMLDivElement>(null);
  const debouncedUplineQuery = useDebounce(uplineQuery, 350);

  // Password tab state
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-user", userId],
    queryFn: () => api.getUser(userId),
  });

  // Seed edit fields once data loads
  useEffect(() => {
    if (data) {
      setEditUsername(data.user.username);
      setEditEmail(data.user.email);
      setEditPhone(data.user.phone ?? "");
      setEditCountry(data.user.country ?? "");
      if (data.user.referredBy && data.user.referredByUsername) {
        setSelectedUpline({ id: data.user.referredBy, username: data.user.referredByUsername });
        setUplineQuery(data.user.referredByUsername);
      } else {
        setSelectedUpline(null);
        setUplineQuery("");
      }
    }
  }, [data]);

  // Search for upline users
  const { data: uplineResults } = useQuery({
    queryKey: ["upline-search", debouncedUplineQuery],
    queryFn: () => api.listUsers({ search: debouncedUplineQuery, limit: 6 }),
    enabled: debouncedUplineQuery.length >= 2 && !selectedUpline,
  });

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (uplineRef.current && !uplineRef.current.contains(e.target as Node)) {
        setShowUplineDrop(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const { data: referralData } = useQuery({
    queryKey: ["admin-user-referrals", userId],
    queryFn: () => api.getUserReferrals(userId),
    enabled: tab === "referrals",
  });

  const statusMut = useMutation({
    mutationFn: ({ status, reason }: { status: string; reason?: string }) => api.setUserStatus(userId, status, reason),
    onSuccess: () => { toast({ title: "Status updated" }); qc.invalidateQueries({ queryKey: ["admin-users"] }); qc.invalidateQueries({ queryKey: ["admin-user", userId] }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateMut = useMutation({
    mutationFn: () => api.updateUser(userId, {
      username: editUsername,
      email: editEmail,
      phone: editPhone,
      country: editCountry,
      referredById: selectedUpline ? selectedUpline.id : (uplineQuery === "" ? null : undefined),
    }),
    onSuccess: () => { toast({ title: "User updated successfully" }); qc.invalidateQueries({ queryKey: ["admin-users"] }); qc.invalidateQueries({ queryKey: ["admin-user", userId] }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const passwordMut = useMutation({
    mutationFn: () => api.resetUserPassword(userId, newPassword),
    onSuccess: () => { toast({ title: "Password reset successfully" }); setNewPassword(""); setConfirmPassword(""); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMut = useMutation({
    mutationFn: () => api.deleteUser(userId),
    onSuccess: () => {
      toast({ title: "User deleted successfully" });
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      onDeleted();
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const creditMut = useMutation({
    mutationFn: () => api.creditWallet(userId, walletField, Number(adjustAmount), adjustReason),
    onSuccess: () => { toast({ title: "Credited successfully" }); setAdjustAmount(""); setAdjustReason(""); qc.invalidateQueries({ queryKey: ["admin-user", userId] }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const debitMut = useMutation({
    mutationFn: () => api.debitWallet(userId, walletField, Number(adjustAmount), adjustReason),
    onSuccess: () => { toast({ title: "Debited successfully" }); setAdjustAmount(""); setAdjustReason(""); qc.invalidateQueries({ queryKey: ["admin-user", userId] }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  if (isLoading) return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
      <div className="bg-white rounded-xl p-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto" /></div>
    </div>
  );

  const { user, wallet, totalReferrals, taskCompletions } = data!;
  const WALLET_FIELDS = [
    { value: "main_wallet", label: "Main Wallet" },
    { value: "team_earnings", label: "Team Earnings" },
    { value: "affiliate_balance", label: "Affiliate Balance" },
    { value: "commissions", label: "Commissions" },
  ];

  const passwordsMatch = newPassword === confirmPassword;
  const passwordValid = newPassword.length >= 6 && passwordsMatch;

  const TABS = [
    { key: "info", label: "Info" },
    { key: "edit", label: "Edit" },
    { key: "wallet", label: "Wallet" },
    { key: "referrals", label: "Referrals" },
    { key: "password", label: "Password" },
  ] as const;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="font-bold text-gray-900 text-lg">{user.username}</h2>
            <p className="text-sm text-gray-500">{user.email}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="h-5 w-5" /></button>
        </div>

        <div className="flex border-b px-2 overflow-x-auto">
          {TABS.map(({ key, label }) => (
            <button key={key} onClick={() => setTab(key)} className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${tab === key ? "border-indigo-600 text-indigo-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
              {label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6">

          {/* ── INFO ── */}
          {tab === "info" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-gray-500">ID</span><p className="font-medium mt-0.5">#{user.id}</p></div>
                <div><span className="text-gray-500">Status</span><div className="mt-0.5"><StatusBadge status={user.status} /></div></div>
                <div><span className="text-gray-500">Username</span><p className="font-medium mt-0.5">{user.username}</p></div>
                <div><span className="text-gray-500">Email</span><p className="font-medium mt-0.5">{user.email}</p></div>
                <div><span className="text-gray-500">Phone</span><p className="font-medium mt-0.5">{user.phone ?? "—"}</p></div>
                <div><span className="text-gray-500">Country</span><p className="font-medium mt-0.5">{user.country ?? "—"}</p></div>
                <div><span className="text-gray-500">Referral Code</span><p className="font-mono text-xs bg-gray-100 px-2 py-1 rounded mt-0.5 inline-block">{user.referralCode}</p></div>
                <div><span className="text-gray-500">Joined</span><p className="font-medium mt-0.5">{new Date(user.createdAt).toLocaleDateString()}</p></div>
                <div><span className="text-gray-500">Total Referrals</span><p className="font-medium mt-0.5">{totalReferrals}</p></div>
                <div><span className="text-gray-500">Tasks Done</span><p className="font-medium mt-0.5">{taskCompletions}</p></div>
              </div>

              <div className="pt-2">
                <p className="text-sm font-medium text-gray-700 mb-2">Change Status</p>
                <div className="flex gap-2 flex-wrap">
                  {["active", "inactive", "suspended"].map(s => (
                    <button key={s} onClick={() => statusMut.mutate({ status: s })} disabled={user.status === s || statusMut.isPending}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${user.status === s ? "bg-gray-100 text-gray-400 border-gray-200 cursor-default" : "border-gray-300 hover:bg-gray-50 text-gray-700"}`}>
                      Set {s}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t">
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-full py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors">
                  Delete User
                </button>
              </div>
            </div>
          )}

          {showDeleteConfirm && (
            <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl w-full max-w-sm shadow-2xl p-6 space-y-4">
                <div className="text-center">
                  <div className="mx-auto mb-3 h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                    <X className="h-6 w-6 text-red-600" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">Delete User</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Are you sure you want to permanently delete <span className="font-semibold text-gray-800">{user.username}</span>? This will remove all their data including wallet, transactions, and task history. This action cannot be undone.
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={deleteMut.isPending}
                    className="flex-1 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50">
                    Cancel
                  </button>
                  <button
                    onClick={() => deleteMut.mutate()}
                    disabled={deleteMut.isPending}
                    className="flex-1 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors">
                    {deleteMut.isPending ? "Deleting…" : "Yes, Delete"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── EDIT ── */}
          {tab === "edit" && (
            <div className="space-y-4">
              <p className="text-xs text-gray-400 mb-2">ID, Joined date, Tasks Done and Referral Code cannot be edited.</p>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Username</label>
                  <input value={editUsername} onChange={e => setEditUsername(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                  <input type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Phone Number</label>
                  <input type="tel" value={editPhone} onChange={e => setEditPhone(e.target.value)}
                    placeholder="+254700000000"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Country</label>
                  <select value={editCountry} onChange={e => setEditCountry(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    <option value="">— Select country —</option>
                    {COUNTRIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>

                {/* Referred By (Upline) */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Referred By (Upline)</label>
                  <div ref={uplineRef} className="relative">
                    {selectedUpline ? (
                      <div className="flex items-center justify-between px-3 py-2 border border-emerald-400 bg-emerald-50 rounded-lg text-sm">
                        <div className="flex items-center gap-2">
                          <UserCheck className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                          <span className="font-medium text-emerald-800">{selectedUpline.username}</span>
                          <span className="text-emerald-500 text-xs">· ID #{selectedUpline.id}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => { setSelectedUpline(null); setUplineQuery(""); }}
                          className="text-emerald-500 hover:text-red-500 transition-colors">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <input
                          value={uplineQuery}
                          onChange={e => { setUplineQuery(e.target.value); setShowUplineDrop(true); }}
                          onFocus={() => uplineQuery.length >= 2 && setShowUplineDrop(true)}
                          placeholder="Search by username…"
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        {uplineQuery.length >= 2 && showUplineDrop && (
                          <div className="absolute z-10 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
                            {(uplineResults?.users ?? []).filter(u => u.id !== userId).length === 0 ? (
                              <p className="px-3 py-2.5 text-xs text-gray-400">No users found</p>
                            ) : (
                              (uplineResults?.users ?? []).filter(u => u.id !== userId).map(u => (
                                <button
                                  key={u.id}
                                  type="button"
                                  onClick={() => { setSelectedUpline({ id: u.id, username: u.username }); setUplineQuery(u.username); setShowUplineDrop(false); }}
                                  className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-indigo-50 transition-colors text-left"
                                >
                                  <span className="text-sm font-medium text-gray-800">{u.username}</span>
                                  <span className="text-xs text-gray-400">{u.email}</span>
                                </button>
                              ))
                            )}
                          </div>
                        )}
                      </>
                    )}
                    {!selectedUpline && (
                      <p className="text-xs text-gray-400 mt-1">
                        {data?.user.referredBy ? `Current upline: ${data.user.referredByUsername ?? `#${data.user.referredBy}`}` : "No upline set"}
                        {" · "}
                        <button type="button" onClick={() => { setUplineQuery(""); setSelectedUpline(null); }} className="text-red-400 hover:text-red-600 underline">Clear upline</button>
                      </p>
                    )}
                  </div>
                </div>
              </div>
              <button onClick={() => updateMut.mutate()} disabled={updateMut.isPending}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors mt-2">
                {updateMut.isPending ? "Saving…" : "Save Changes"}
              </button>
            </div>
          )}

          {/* ── WALLET ── */}
          {tab === "wallet" && wallet && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Main Wallet", val: wallet.mainWallet },
                  { label: "Team Earnings", val: wallet.teamEarnings },
                  { label: "Affiliate Balance", val: wallet.affiliateBalance },
                  { label: "Commissions", val: wallet.commissions },
                  { label: "Total Earned", val: wallet.totalEarned },
                  { label: "Total Withdrawn", val: wallet.totalWithdrawn },
                ].map(({ label, val }) => (
                  <div key={label} className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500">{label}</p>
                    <p className="font-bold text-gray-900 mt-0.5">KES {val.toFixed(2)}</p>
                  </div>
                ))}
              </div>

              <div className="border-t pt-4">
                <p className="text-sm font-medium text-gray-700 mb-3">Adjust Wallet</p>
                <div className="space-y-3">
                  <select value={walletField} onChange={e => setWalletField(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    {WALLET_FIELDS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                  </select>
                  <input type="number" min="0" step="0.01" placeholder="Amount (KES)" value={adjustAmount}
                    onChange={e => setAdjustAmount(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  <input type="text" placeholder="Reason (required)" value={adjustReason}
                    onChange={e => setAdjustReason(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  <div className="flex gap-2">
                    <button onClick={() => creditMut.mutate()} disabled={!adjustAmount || !adjustReason || creditMut.isPending}
                      className="flex-1 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors">
                      Credit
                    </button>
                    <button onClick={() => debitMut.mutate()} disabled={!adjustAmount || !adjustReason || debitMut.isPending}
                      className="flex-1 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors">
                      Debit
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── REFERRALS ── */}
          {tab === "referrals" && (
            <div className="space-y-4">
              {!referralData ? <div className="text-center py-8 text-gray-400 text-sm">Loading…</div> : (
                <>
                  <div className="text-sm text-gray-500">Total: <span className="font-bold text-gray-800">{referralData.totalCount}</span> referrals across 3 levels</div>
                  {([1, 2, 3] as const).map(lvl => {
                    const list = lvl === 1 ? referralData.level1 : lvl === 2 ? referralData.level2 : referralData.level3;
                    return (
                      <div key={lvl}>
                        <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Level {lvl} ({list.length})</p>
                        <div className="space-y-1.5">
                          {list.length === 0 ? <p className="text-xs text-gray-400">None</p> : list.map(u => (
                            <div key={u.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 text-sm">
                              <span className="font-medium text-gray-800">{u.username}</span>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-400">{u.phone ?? "—"}</span>
                                <StatusBadge status={u.status} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          )}

          {/* ── PASSWORD ── */}
          {tab === "password" && (
            <div className="space-y-4 max-w-sm mx-auto">
              <p className="text-sm text-gray-500">Set a new password for <span className="font-semibold text-gray-800">{user.username}</span>. Minimum 6 characters.</p>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">New Password</label>
                <div className="relative">
                  <input
                    type={showNew ? "text" : "password"}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="w-full px-3 py-2 pr-10 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button type="button" onClick={() => setShowNew(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showNew ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Confirm Password</label>
                <div className="relative">
                  <input
                    type={showConfirm ? "text" : "password"}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    className={`w-full px-3 py-2 pr-10 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${confirmPassword && !passwordsMatch ? "border-red-400 bg-red-50" : "border-gray-200"}`}
                  />
                  <button type="button" onClick={() => setShowConfirm(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {confirmPassword && !passwordsMatch && (
                  <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
                )}
                {confirmPassword && passwordsMatch && newPassword.length >= 6 && (
                  <p className="text-xs text-green-600 mt-1">Passwords match ✓</p>
                )}
              </div>

              <button
                onClick={() => passwordMut.mutate()}
                disabled={!passwordValid || passwordMut.isPending}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-sm font-semibold transition-colors mt-2">
                {passwordMut.isPending ? "Resetting…" : "Reset Password"}
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

export default function Users() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<number | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-users", search, status, page],
    queryFn: () => api.listUsers({ search: search || undefined, status: status !== "all" ? status : undefined, page }),
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Users</h1>
        <p className="text-gray-500 text-sm mt-1">{data?.total ?? 0} total users</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search username, email, phone…"
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>

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
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Phone</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Country</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Joined</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {(data?.users ?? []).map((u: UserItem) => (
                  <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{u.username}</div>
                      <div className="text-xs text-gray-400">{u.email}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{u.phone ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-600">{u.country ?? "—"}</td>
                    <td className="px-4 py-3"><StatusBadge status={u.status} /></td>
                    <td className="px-4 py-3 text-gray-500">{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => setSelectedUser(u.id)} className="text-indigo-600 hover:text-indigo-800 p-1.5 rounded hover:bg-indigo-50 transition-colors">
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {data?.users.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-400">No users found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {(data?.totalPages ?? 0) > 1 && (
          <div className="px-4 py-3 border-t flex items-center justify-between text-sm">
            <span className="text-gray-500">Page {page} of {data?.totalPages}</span>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="p-1.5 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-40">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button onClick={() => setPage(p => Math.min(data!.totalPages, p + 1))} disabled={page === data?.totalPages}
                className="p-1.5 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-40">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {selectedUser !== null && <UserDetailModal userId={selectedUser} onClose={() => setSelectedUser(null)} onDeleted={() => setSelectedUser(null)} />}
    </div>
  );
}
