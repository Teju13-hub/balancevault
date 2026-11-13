export type UserRole = 'ACCOUNT_HOLDER' | 'ADMIN' | 'AUDITOR';

export type AccountStatus = 'ACTIVE' | 'PENDING_VERIFICATION' | 'RESTRICTED' | 'FROZEN';

export type TransactionType = 'CREDIT' | 'DEBIT' | 'TRANSFER';

export type TransactionStatus = 'COMPLETED' | 'PENDING' | 'FLAGGED' | 'CANCELLED';

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  fullName: string;
  role: UserRole;
  phone: string;
  avatarUrl?: string;
  tier: 'Standard' | 'Premium Tier' | 'Enterprise Vault';
  kycStatus: 'VERIFIED' | 'PENDING' | 'REJECTED';
  joinedDate: string;
  twoFactorEnabled: boolean;
}

export interface BankAccount {
  id: string;
  accountNumber: string;
  maskedAccountNumber: string;
  accountName: string;
  currency: 'USD' | 'EUR' | 'GBP';
  balance: number; // For demo visualization, display as formatted BigDecimal
  availableBalance: number;
  status: AccountStatus;
  type: 'Primary Checking' | 'High-Yield Vault' | 'Treasury Reserve';
  routingNumber: string;
  createdAt: string;
}

export interface Transaction {
  id: string;
  referenceId: string;
  title: string;
  category: string;
  type: TransactionType;
  amount: number;
  currency: string;
  status: TransactionStatus;
  timestamp: string;
  senderAccount: string;
  recipientAccount: string;
  recipientName: string;
  memo?: string;
  balanceAfter: number;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  userId: string;
  username: string;
  action: string;
  entityType: string;
  entityId: string;
  ipAddress: string;
  status: 'SUCCESS' | 'FLAGGED' | 'FAILED';
  details: string;
}

export interface OnboardingRequest {
  id: string;
  applicantName: string;
  email: string;
  submissionDate: string;
  status: 'PENDING_REVIEW' | 'DOCUMENTS_REQUESTED' | 'APPROVED' | 'REJECTED';
  documentType: 'Passport' | 'Drivers License' | 'National ID';
  riskScore: 'LOW' | 'MEDIUM' | 'HIGH';
  notes?: string;
}

export type Screen =
  | 'landing'
  | 'login'
  | 'register'
  | 'forgot-password'
  | 'reset-password'
  | 'dashboard'
  | 'accounts'
  | 'transfer'
  | 'transactions'
  | 'profile'
  | 'settings'
  | 'admin-dashboard'
  | 'admin-users'
  | 'admin-accounts'
  | 'admin-transactions'
  | 'admin-security'
  | 'admin-reports'
  | 'admin-audit';

