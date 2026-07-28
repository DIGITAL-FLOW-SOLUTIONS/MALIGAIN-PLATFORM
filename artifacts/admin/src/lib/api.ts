const API = "/api/admin";

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method,
    credentials: "include",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { message?: string }).message ?? `HTTP ${res.status}`);
  return json as T;
}

export const api = {
  // Auth
  login: (username: string, password: string) =>
    request<{ admin: { id: number; username: string }; message: string }>("POST", "/auth/login", { username, password }),
  logout: () => request<{ message: string }>("POST", "/auth/logout"),
  me: () => request<{ id: number; username: string }>("GET", "/auth/me"),

  // Stats
  stats: () => request<{
    totalUsers: number; activeUsers: number; inactiveUsers: number; suspendedUsers: number;
    depositsByCurrency: { currency: string; label: string; total: number }[];
    withdrawalsByCurrency: { currency: string; label: string; total: number }[];
    pendingVerifications: number; pendingWithdrawals: number;
    totalTransactions: number; recentSignups: number;
    walletsByCountry: { code: string; name: string; total: number }[];
  }>("GET", "/stats"),

  // Users
  listUsers: (params: { search?: string; status?: string; country?: string; page?: number; limit?: number }) => {
    const q = new URLSearchParams();
    if (params.search) q.set("search", params.search);
    if (params.status) q.set("status", params.status);
    if (params.country) q.set("country", params.country);
    if (params.page) q.set("page", String(params.page));
    if (params.limit) q.set("limit", String(params.limit));
    return request<{ users: UserItem[]; total: number; page: number; totalPages: number }>("GET", `/users?${q}`);
  },
  getUser: (id: number) => request<{ user: UserItem; wallet: WalletBalance | null; totalReferrals: number; taskCompletions: number }>("GET", `/users/${id}`),
  updateUser: (id: number, data: Partial<{ username: string; email: string; phone: string; country: string; referredById: number | null }>) =>
    request<{ message: string }>("PUT", `/users/${id}`, data),
  setUserStatus: (id: number, status: string, reason?: string) =>
    request<{ message: string }>("POST", `/users/${id}/status`, { status, reason }),
  getUserWallet: (id: number) => request<WalletBalance>("GET", `/users/${id}/wallet`),
  creditWallet: (id: number, field: string, amount: number, reason: string) =>
    request<{ message: string }>("POST", `/users/${id}/wallet/credit`, { field, amount, reason }),
  debitWallet: (id: number, field: string, amount: number, reason: string) =>
    request<{ message: string }>("POST", `/users/${id}/wallet/debit`, { field, amount, reason }),
  getUserReferrals: (id: number) => request<{ level1: ReferralNode[]; level2: ReferralNode[]; level3: ReferralNode[]; totalCount: number }>("GET", `/users/${id}/referrals`),
  resetUserPassword: (id: number, password: string) =>
    request<{ message: string }>("POST", `/users/${id}/reset-password`, { password }),
  deleteUser: (id: number) =>
    request<{ message: string }>("DELETE", `/users/${id}`),
  addReferralBonus: (data: { userId: number; amount: number; walletField: string; reason: string }) =>
    request<{ message: string }>("POST", "/referrals/bonus", data),

  // Referral Bonuses
  listReferralBonuses: (params: { page?: number; search?: string }) => {
    const q = new URLSearchParams();
    if (params.page) q.set("page", String(params.page));
    if (params.search) q.set("search", params.search);
    return request<{ bonuses: ReferralBonusItem[]; total: number; page: number; totalPages: number }>("GET", `/referrals/bonuses?${q}`);
  },

  // Verifications
  listVerifications: (params: { status?: string; page?: number; search?: string }) => {
    const q = new URLSearchParams();
    if (params.status) q.set("status", params.status);
    if (params.page) q.set("page", String(params.page));
    if (params.search) q.set("search", params.search);
    return request<{ verifications: VerificationItem[]; total: number; page: number; totalPages: number }>("GET", `/verifications?${q}`);
  },
  approveVerification: (id: number, note?: string) =>
    request<{ message: string }>("POST", `/verifications/${id}/approve`, { note }),
  rejectVerification: (id: number, note: string) =>
    request<{ message: string }>("POST", `/verifications/${id}/reject`, { note }),

  // Transactions
  listTransactions: (params: { userId?: number; type?: string; status?: string; page?: number }) => {
    const q = new URLSearchParams();
    if (params.userId) q.set("userId", String(params.userId));
    if (params.type) q.set("type", params.type);
    if (params.status) q.set("status", params.status);
    if (params.page) q.set("page", String(params.page));
    return request<{ transactions: TransactionItem[]; total: number; page: number; totalPages: number }>("GET", `/transactions?${q}`);
  },

  // Tasks
  listTasks: () => request<{ tasks: TaskItem[] }>("GET", "/tasks"),
  updateTask: (id: number, data: Partial<{ name: string; reward: number; availableCount: number; description: string; difficulty: string }>) =>
    request<{ message: string }>("PUT", `/tasks/${id}`, data),

  // Withdrawals
  listWithdrawals: (params: { status?: string; page?: number; search?: string }) => {
    const q = new URLSearchParams();
    if (params.status) q.set("status", params.status);
    if (params.page) q.set("page", String(params.page));
    if (params.search) q.set("search", params.search);
    return request<{ withdrawals: WithdrawalItem[]; total: number; page: number; totalPages: number }>("GET", `/withdrawals?${q}`);
  },
  approveWithdrawal: (id: number) => request<{ message: string }>("POST", `/withdrawals/${id}/approve`),
  declineWithdrawal: (id: number) => request<{ message: string }>("POST", `/withdrawals/${id}/decline`),
  resetWithdrawal: (id: number) => request<{ message: string }>("POST", `/withdrawals/${id}/reset`),

  // Admins
  listAdmins: () => request<{ admins: AdminItem[] }>("GET", "/admins"),
  createAdmin: (username: string, password: string) =>
    request<{ message: string; admin: AdminItem }>("POST", "/admins", { username, password }),
  updateAdminPassword: (id: number, password: string) =>
    request<{ message: string }>("PUT", `/admins/${id}/password`, { password }),
  deleteAdmin: (id: number) =>
    request<{ message: string }>("DELETE", `/admins/${id}`),

  // Settings
  getSettings: () => request<{ settings: Record<string, string> }>("GET", "/settings"),
  updateSettings: (data: Record<string, string>) => request<{ message: string }>("PUT", "/settings", data),
  updateLaunchSettings: (data: { enabled: boolean; launchDate: string }) =>
    request<{ message: string }>("PUT", "/settings/launch", data),

  // Control Panel
  getControl: () => request<{ activationFees: Record<string, number>; bonusTable: Record<string, Record<string, [number, number, number]>> }>("GET", "/control"),
  updateActivationFees: (fees: Record<string, number>) => request<{ message: string }>("PUT", "/control/activation-fees", fees),
  updateBonusTable: (bonusTable: Record<string, Record<string, [number, number, number]>>) => request<{ message: string }>("PUT", "/control/bonus-table", bonusTable),

  // Audit
  auditLog: (page?: number) => {
    const q = page ? `?page=${page}` : "";
    return request<{ entries: AuditEntry[]; total: number; page: number; totalPages: number }>("GET", `/audit-log${q}`);
  },

  // Investment Plans
  investmentListPlans: () =>
    request<{ plans: Record<string, unknown>[] }>("GET", "/investments/plans"),
  investmentCreatePlan: (data: {
    brandName: string; name: string; category: string;
    depositAmount: number; dailyProfit: number; totalDays: number; totalProfit: number;
    imageUrl: string | null; country: string; sortOrder: number;
  }) => request<{ message: string; plan: Record<string, unknown> }>("POST", "/investments/plans", data),
  investmentUpdatePlan: (id: number, data: {
    brandName?: string; name?: string; category?: string;
    depositAmount?: number; dailyProfit?: number; totalDays?: number; totalProfit?: number;
    imageUrl?: string | null; country?: string; sortOrder?: number; isActive?: boolean;
  }) => request<{ message: string }>("PUT", `/investments/plans/${id}`, data),
  investmentDeletePlan: (id: number) =>
    request<{ message: string }>("DELETE", `/investments/plans/${id}`),

  // Investment Payments
  investmentListPayments: (params: { page?: number; status?: string }) => {
    const q = new URLSearchParams();
    if (params.page) q.set("page", String(params.page));
    if (params.status) q.set("status", params.status);
    return request<{ payments: Record<string, unknown>[]; total: number; page: number; totalPages: number }>("GET", `/investments/payments?${q}`);
  },
  investmentApprovePayment: (id: number, note?: string) =>
    request<{ message: string }>("POST", `/investments/payments/${id}/approve`, { note }),
  investmentRejectPayment: (id: number, note?: string) =>
    request<{ message: string }>("POST", `/investments/payments/${id}/reject`, { note }),

  // Investment Accounts
  investmentListAccounts: (params: { page?: number; status?: string; search?: string }) => {
    const q = new URLSearchParams();
    if (params.page) q.set("page", String(params.page));
    if (params.status) q.set("status", params.status);
    if (params.search) q.set("search", params.search);
    return request<{ accounts: Record<string, unknown>[]; total: number; page: number; totalPages: number }>("GET", `/investments/accounts?${q}`);
  },
  investmentUpdateAccount: (id: number, data: { action: string; amount?: number; reason?: string; status?: string }) =>
    request<{ message: string }>("PATCH", `/investments/accounts/${id}`, data),
};

export interface UserItem {
  id: number; username: string; email: string; phone?: string; country?: string;
  status: string; referralCode: string; createdAt: string; referredBy?: number | null;
  referredByUsername?: string | null;
}

export interface WalletBalance {
  mainWallet: number; teamEarnings: number; affiliateBalance: number; commissions: number;
  totalEarned: number; totalWithdrawn: number; todayEarnings: number;
}

export interface ReferralNode {
  id: number; username: string; phone?: string; status: string; joinedAt: string; level: number;
}

export interface ReferralBonusItem {
  id: number; userId: number; username: string; email: string; phone: string;
  amount: number; level: number | null; fromUserId: number | null;
  description: string; createdAt: string;
}

export interface VerificationItem {
  id: number; userId: number; username: string; email: string; phone: string;
  screenshotUrl: string; amountPaid: number; currency: string; status: string; adminNote?: string; createdAt: string;
}

export interface TransactionItem {
  id: number; userId: number; username: string; type: string; amount: number;
  status: string; description?: string; phoneNumber?: string; createdAt: string;
}

export interface TaskItem {
  id: number; name: string; type: string; reward: number; availableCount: number;
  description: string; difficulty?: string; completionsToday: number; totalCompletions: number;
}

export interface WithdrawalItem {
  id: number; userId: number; username: string; userPhone?: string;
  amount: number; status: string; phoneNumber?: string; description?: string; createdAt: string;
}

export interface AdminItem {
  id: number; username: string; createdAt: string;
}

export interface AuditEntry {
  id: number; adminUsername: string; action: string; targetType?: string;
  targetId?: string; details?: Record<string, unknown>; createdAt: string;
}
