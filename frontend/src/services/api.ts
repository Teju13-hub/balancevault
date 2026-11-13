import { UserProfile, UserRole } from '../types';

const TOKEN_KEY = 'bv_auth_token';
const USER_KEY = 'bv_auth_user';

export interface LoginPayload {
  email?: string;
  username?: string;
  password?: string;
}

export interface RegisterPayload {
  fullName: string;
  username: string;
  email: string;
  password: string;
}

export interface OtpInitiateResponse {
  status: string;
  message: string;
  email: string;
  expiresInSeconds: number;
  resendCooldownSeconds: number;
}

export interface VerifyOtpPayload {
  email: string;
  otp: string;
}

export interface ResendOtpPayload {
  email: string;
}

export interface AuthResponseData {
  token: string;
  tokenType: string;
  username: string;
  email: string;
  fullName: string;
  role: UserRole;
}

export interface AccountData {
  id: number;
  accountNumber: string;
  currency: string;
  balance: number;
  status?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface LedgerTransactionData {
  id: number;
  accountId: number;
  accountNumber: string;
  entryType: 'DEBIT' | 'CREDIT';
  amount: number;
  balanceAfter: number;
  description: string;
  referenceId: string;
  createdAt: string;
}

export interface CreateTransferPayload {
  sourceAccountId: number;
  destinationAccountId?: number;
  destinationAccountNumber?: string;
  amount: number;
  currency?: string;
  description?: string;
}

export interface TransferResponseData {
  id: number;
  referenceId: string;
  sourceAccountId: number;
  destinationAccountId: number;
  amount: number;
  currency: string;
  status: string;
  description?: string;
  createdAt: string;
}

export interface AdminMetricsData {
  totalCustomers: number;
  activeUsers: number;
  suspendedUsers: number;
  totalAccounts: number;
  totalTransfers: number;
  systemHealth: string;
  activeVaultEngine: string;
}

export interface AdminUserData {
  id: number;
  username: string;
  email: string;
  fullName: string;
  role: string;
  status: string;
  createdAt: string;
  isLocked?: boolean;
  failedLoginAttempts?: number;
  lockedUntil?: string;
  accountCount?: number;
  totalBalance?: number;
  accounts?: AccountData[];
}

export interface AdminAccountData {
  id: number;
  accountNumber: string;
  userId: number | null;
  username: string;
  customerName: string;
  customerEmail: string;
  currency: string;
  balance: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  isSystemAccount: boolean;
}

export interface AdminTransactionData {
  id: string;
  referenceId: string;
  type: 'TRANSFER' | 'DEPOSIT' | 'WITHDRAWAL' | string;
  sourceAccount: string;
  sourceUser: string;
  destinationAccount: string;
  destinationUser: string;
  amount: number;
  currency: string;
  status: string;
  description?: string;
  createdAt: string;
  isSuspicious: boolean;
  suspicionReason?: string;
}

export interface SecurityTelemetryData {
  totalFailedAttempts: number;
  lockedAccountsCount: number;
  bruteForceDefenseStatus: string;
  failedLoginUsers: Array<{
    id: number;
    username: string;
    email: string;
    failedLoginAttempts: number;
    isLocked: boolean;
    lockedUntil?: string;
  }>;
  lockedUsers: Array<{
    id: number;
    username: string;
    email: string;
    status: string;
    failedLoginAttempts: number;
    lockedUntil?: string;
  }>;
  recentAuthEvents: any[];
  suspiciousTransactions: AdminTransactionData[];
  securitySummary: Record<string, any>;
}

export interface AdminReportData {
  period: string;
  startDate: string;
  endDate: string;
  totalDepositsCount: number;
  totalDepositsVolume: number;
  totalWithdrawalsCount: number;
  totalWithdrawalsVolume: number;
  totalTransfersCount: number;
  totalTransfersVolume: number;
  netVolume: number;
  newRegistrations: number;
  currencyBreakdown: Record<string, number>;
  dailySummaries: Array<{
    date: string;
    deposits: number;
    withdrawals: number;
    transfers: number;
    registrations: number;
  }>;
}

export interface AdminOverviewData {
  totalCustomers: number;
  activeUsers: number;
  suspendedUsers: number;
  lockedUsers: number;
  totalAccounts: number;
  activeAccounts: number;
  frozenAccounts: number;
  totalDepositsCount: number;
  totalDepositsVolume: number;
  totalWithdrawalsCount: number;
  totalWithdrawalsVolume: number;
  totalTransfersCount: number;
  totalTransfersVolume: number;
  totalVolume: number;
  systemHealth: string;
  activeVaultEngine: string;
  recentTransactions: AdminTransactionData[];
  recentRegistrations: AdminUserData[];
  activityOverTime: Array<{
    date: string;
    deposits: number;
    withdrawals: number;
    transfers: number;
    totalVolume: number;
  }>;
  typeDistribution: Array<{
    type: string;
    count: number;
    volume: number;
  }>;
  customerGrowth: Array<{
    date: string;
    newCustomers: number;
    totalCustomers: number;
  }>;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface ReconciliationReportData {
  status: string;
  totalDebits: number;
  totalCredits: number;
  variance: number;
  totalAccounts: number;
  verifiedAccounts: number;
  discrepancyCount: number;
  discrepancies: string[];
  timestamp: string;
}

export const authStorage = {
  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  },

  getUser(): UserProfile | null {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as UserProfile;
    } catch {
      return null;
    }
  },

  setSession(token: string, user: UserProfile): void {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },

  clearSession(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },
};

async function handleResponse<T>(res: Response): Promise<T> {
  if (res.status === 401) {
    const errorBody = await res.json().catch(() => ({}));
    authStorage.clearSession();
    throw new Error(errorBody.message || 'Invalid email or password');
  }
  if (res.status === 409) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.message || 'Email or username is already registered');
  }
  if (res.status === 429) {
    throw new Error('Too many requests. Please wait a minute before trying again.');
  }
  if (res.status === 400) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.message || 'Invalid request parameters. Please check your inputs.');
  }
  if (res.status === 403) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.message || 'Access forbidden. You do not have permission for this action.');
  }
  if (res.status === 422) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.message || errorBody.error || 'Transaction validation failed. Please verify account and transfer details.');
  }
  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    throw new Error(errorBody.message || `Request failed with status ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  // Authentication & Registration with OTP
  async login(payload: LoginPayload): Promise<AuthResponseData> {
    const res = await fetch('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handleResponse<AuthResponseData>(res);
  },

  async forgotPassword(email: string): Promise<{ message: string }> {
    const res = await fetch('/api/v1/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim() }),
    });
    return handleResponse<{ message: string }>(res);
  },

  async resetPassword(payload: { token: string; newPassword: string; confirmPassword: string }): Promise<{ message: string }> {
    const res = await fetch('/api/v1/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handleResponse<{ message: string }>(res);
  },

  async initiateRegistration(payload: RegisterPayload): Promise<OtpInitiateResponse> {
    const res = await fetch('/api/v1/auth/register/initiate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handleResponse<OtpInitiateResponse>(res);
  },

  async verifyOtp(payload: VerifyOtpPayload): Promise<AuthResponseData> {
    const res = await fetch('/api/v1/auth/register/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handleResponse<AuthResponseData>(res);
  },

  async resendOtp(payload: ResendOtpPayload): Promise<OtpInitiateResponse> {
    const res = await fetch('/api/v1/auth/register/resend-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handleResponse<OtpInitiateResponse>(res);
  },

  async register(payload: RegisterPayload): Promise<AuthResponseData> {
    const res = await fetch('/api/v1/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return handleResponse<AuthResponseData>(res);
  },

  async getCurrentUser(): Promise<UserProfile> {
    const token = authStorage.getToken();
    if (!token) throw new Error('No authentication token found');
    const res = await fetch('/api/v1/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    return handleResponse<UserProfile>(res);
  },

  // Accounts
  async getMyAccounts(): Promise<AccountData[]> {
    const token = authStorage.getToken();
    if (!token) return [];
    const res = await fetch('/api/v1/accounts', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return [];
    return res.json();
  },

  async getAccount(id: number | string): Promise<AccountData> {
    const token = authStorage.getToken();
    if (!token) throw new Error('Authentication required');
    const res = await fetch(`/api/v1/accounts/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return handleResponse<AccountData>(res);
  },

  async createAccount(currency = 'INR'): Promise<AccountData> {
    const token = authStorage.getToken();
    if (!token) throw new Error('Authentication required');
    const res = await fetch('/api/v1/accounts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ currency }),
    });
    return handleResponse<AccountData>(res);
  },

  async lookupAccount(accountNumber: string): Promise<AccountData> {
    const token = authStorage.getToken();
    if (!token) throw new Error('Authentication required');
    const res = await fetch(`/api/v1/accounts/lookup?accountNumber=${encodeURIComponent(accountNumber)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return handleResponse<AccountData>(res);
  },

  async getAccountTransactions(accountId: number | string): Promise<LedgerTransactionData[]> {
    const token = authStorage.getToken();
    if (!token) return [];
    const res = await fetch(`/api/v1/accounts/${accountId}/transactions`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return [];
    return res.json();
  },

  async deposit(accountId: number | string, payload: { amount: number; description?: string }): Promise<AccountData> {
    const token = authStorage.getToken();
    if (!token) throw new Error('Authentication required');
    const res = await fetch(`/api/v1/accounts/${accountId}/deposits`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    return handleResponse<AccountData>(res);
  },

  async withdraw(accountId: number | string, payload: { amount: number; description?: string }): Promise<AccountData> {
    const token = authStorage.getToken();
    if (!token) throw new Error('Authentication required');
    const res = await fetch(`/api/v1/accounts/${accountId}/withdrawals`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    return handleResponse<AccountData>(res);
  },

  // Transfers
  async createTransfer(payload: CreateTransferPayload, idempotencyKey?: string): Promise<TransferResponseData> {
    const token = authStorage.getToken();
    if (!token) throw new Error('Authentication required');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };
    if (idempotencyKey) {
      headers['Idempotency-Key'] = idempotencyKey;
    }
    const res = await fetch('/api/v1/transfers', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    return handleResponse<TransferResponseData>(res);
  },

  // Change Password (All Authenticated Users including Admin)
  async changePassword(payload: ChangePasswordPayload): Promise<{ message: string }> {
    const token = authStorage.getToken();
    if (!token) throw new Error('Authentication required');
    const res = await fetch('/api/v1/auth/change-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    return handleResponse<{ message: string }>(res);
  },

  // Admin Command Center APIs
  async getAdminOverview(): Promise<AdminOverviewData> {
    const token = authStorage.getToken();
    if (!token) throw new Error('Authentication required');
    const res = await fetch('/api/v1/admin/overview', {
      headers: { Authorization: `Bearer ${token}` },
    });
    return handleResponse<AdminOverviewData>(res);
  },

  async getAdminMetrics(): Promise<AdminMetricsData> {
    const token = authStorage.getToken();
    if (!token) throw new Error('Authentication required');
    const res = await fetch('/api/v1/admin/metrics', {
      headers: { Authorization: `Bearer ${token}` },
    });
    return handleResponse<AdminMetricsData>(res);
  },

  async getAdminUsers(params?: { search?: string; role?: string; status?: string }): Promise<AdminUserData[]> {
    const token = authStorage.getToken();
    if (!token) throw new Error('Authentication required');
    const q = new URLSearchParams();
    if (params?.search) q.append('search', params.search);
    if (params?.role) q.append('role', params.role);
    if (params?.status) q.append('status', params.status);
    const qs = q.toString() ? `?${q.toString()}` : '';
    const res = await fetch(`/api/v1/admin/users${qs}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return handleResponse<AdminUserData[]>(res);
  },

  async getAdminCustomerDetails(userId: number): Promise<AdminUserData> {
    const token = authStorage.getToken();
    if (!token) throw new Error('Authentication required');
    const res = await fetch(`/api/v1/admin/users/${userId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return handleResponse<AdminUserData>(res);
  },

  async lockCustomer(userId: number): Promise<AdminUserData> {
    const token = authStorage.getToken();
    if (!token) throw new Error('Authentication required');
    const res = await fetch(`/api/v1/admin/users/${userId}/lock`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    return handleResponse<AdminUserData>(res);
  },

  async unlockCustomer(userId: number): Promise<AdminUserData> {
    const token = authStorage.getToken();
    if (!token) throw new Error('Authentication required');
    const res = await fetch(`/api/v1/admin/users/${userId}/unlock`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    return handleResponse<AdminUserData>(res);
  },

  async updateUserStatus(userId: number, status: 'ACTIVE' | 'SUSPENDED'): Promise<AdminUserData> {
    const token = authStorage.getToken();
    if (!token) throw new Error('Authentication required');
    const res = await fetch(`/api/v1/admin/users/${userId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status }),
    });
    return handleResponse<AdminUserData>(res);
  },

  async getAdminAccounts(params?: { search?: string; currency?: string; status?: string }): Promise<AdminAccountData[]> {
    const token = authStorage.getToken();
    if (!token) throw new Error('Authentication required');
    const q = new URLSearchParams();
    if (params?.search) q.append('search', params.search);
    if (params?.currency) q.append('currency', params.currency);
    if (params?.status) q.append('status', params.status);
    const qs = q.toString() ? `?${q.toString()}` : '';
    const res = await fetch(`/api/v1/admin/accounts${qs}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return handleResponse<AdminAccountData[]>(res);
  },

  async freezeAccount(accountId: number): Promise<AdminAccountData> {
    const token = authStorage.getToken();
    if (!token) throw new Error('Authentication required');
    const res = await fetch(`/api/v1/admin/accounts/${accountId}/freeze`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    return handleResponse<AdminAccountData>(res);
  },

  async unfreezeAccount(accountId: number): Promise<AdminAccountData> {
    const token = authStorage.getToken();
    if (!token) throw new Error('Authentication required');
    const res = await fetch(`/api/v1/admin/accounts/${accountId}/unfreeze`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    return handleResponse<AdminAccountData>(res);
  },

  async getAdminTransactions(params?: { search?: string; type?: string; status?: string; suspiciousOnly?: boolean }): Promise<AdminTransactionData[]> {
    const token = authStorage.getToken();
    if (!token) throw new Error('Authentication required');
    const q = new URLSearchParams();
    if (params?.search) q.append('search', params.search);
    if (params?.type) q.append('type', params.type);
    if (params?.status) q.append('status', params.status);
    if (params?.suspiciousOnly !== undefined) q.append('suspiciousOnly', String(params.suspiciousOnly));
    const qs = q.toString() ? `?${q.toString()}` : '';
    const res = await fetch(`/api/v1/admin/transactions${qs}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return handleResponse<AdminTransactionData[]>(res);
  },

  async getSecurityTelemetry(): Promise<SecurityTelemetryData> {
    const token = authStorage.getToken();
    if (!token) throw new Error('Authentication required');
    const res = await fetch('/api/v1/admin/security/telemetry', {
      headers: { Authorization: `Bearer ${token}` },
    });
    return handleResponse<SecurityTelemetryData>(res);
  },

  async getAdminReports(params?: { period?: string; startDate?: string; endDate?: string }): Promise<AdminReportData> {
    const token = authStorage.getToken();
    if (!token) throw new Error('Authentication required');
    const q = new URLSearchParams();
    if (params?.period) q.append('period', params.period);
    if (params?.startDate) q.append('startDate', params.startDate);
    if (params?.endDate) q.append('endDate', params.endDate);
    const qs = q.toString() ? `?${q.toString()}` : '';
    const res = await fetch(`/api/v1/admin/reports${qs}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return handleResponse<AdminReportData>(res);
  },

  async getReconciliationReport(): Promise<ReconciliationReportData> {
    const token = authStorage.getToken();
    if (!token) throw new Error('Authentication required');
    const res = await fetch('/api/v1/admin/reconciliation', {
      headers: { Authorization: `Bearer ${token}` },
    });
    return handleResponse<ReconciliationReportData>(res);
  },

  async getAuditLogs(params?: { search?: string; action?: string; entityType?: string; startDate?: string; endDate?: string }): Promise<any[]> {
    const token = authStorage.getToken();
    if (!token) return [];
    const q = new URLSearchParams();
    if (params?.search) q.append('search', params.search);
    if (params?.action) q.append('action', params.action);
    if (params?.entityType) q.append('entityType', params.entityType);
    if (params?.startDate) q.append('startDate', params.startDate);
    if (params?.endDate) q.append('endDate', params.endDate);
    const qs = q.toString() ? `?${q.toString()}` : '';
    const res = await fetch(`/api/v1/audit-logs${qs}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return [];
    return res.json();
  },
};
