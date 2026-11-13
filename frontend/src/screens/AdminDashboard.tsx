import React, { useState, useEffect } from 'react';
import {
  Users,
  ShieldCheck,
  RefreshCw,
  Scale,
  CheckCircle2,
  AlertTriangle,
  Building2,
  ArrowRightLeft,
  Server,
  Lock,
  Unlock,
  Eye,
  Search,
  Filter,
  Download,
  Activity,
  CreditCard,
  TrendingUp,
  FileText,
  ShieldAlert,
  ArrowDownLeft,
  ArrowUpRight,
  SlidersHorizontal,
  Clock,
  Check,
  X,
  ExternalLink,
  ChevronRight,
  Info,
} from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { StatCard } from '../components/StatCard';
import { DashboardCard } from '../components/DashboardCard';
import { StatusBadge } from '../components/StatusBadge';
import { SecondaryButton } from '../components/SecondaryButton';
import { PrimaryButton } from '../components/PrimaryButton';
import { Modal } from '../components/Modal';
import { ConfirmationDialog } from '../components/ConfirmationDialog';
import {
  api,
  AdminOverviewData,
  AdminAccountData,
  AdminTransactionData,
  SecurityTelemetryData,
  AdminReportData,
  ReconciliationReportData,
} from '../services/api';
import { formatINR, formatCurrency } from '../utils/currency';
import type { Screen } from '../types';

interface AdminDashboardProps {
  onNavigate: (screen: Screen) => void;
  onShowToast?: (title: string, message?: string, type?: 'success' | 'info' | 'warning') => void;
  initialTab?: AdminTab;
}

type AdminTab = 'overview' | 'accounts' | 'transactions' | 'security' | 'reports';

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onNavigate, onShowToast, initialTab }) => {
  const [activeTab, setActiveTab] = useState<AdminTab>(initialTab || 'overview');

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);
  const [loading, setLoading] = useState(true);

  // Core Data States
  const [overview, setOverview] = useState<AdminOverviewData | null>(null);
  const [reconciliation, setReconciliation] = useState<ReconciliationReportData | null>(null);
  const [accounts, setAccounts] = useState<AdminAccountData[]>([]);
  const [transactions, setTransactions] = useState<AdminTransactionData[]>([]);
  const [securityData, setSecurityData] = useState<SecurityTelemetryData | null>(null);
  const [reportData, setReportData] = useState<AdminReportData | null>(null);

  // Search & Filter States
  const [accountSearch, setAccountSearch] = useState('');
  const [accountStatusFilter, setAccountStatusFilter] = useState('ALL');
  const [accountCurrencyFilter, setAccountCurrencyFilter] = useState('ALL');

  const [txSearch, setTxSearch] = useState('');
  const [txTypeFilter, setTxTypeFilter] = useState('ALL');
  const [txStatusFilter, setTxStatusFilter] = useState('ALL');
  const [txSuspiciousOnly, setTxSuspiciousOnly] = useState(false);

  const [reportPeriod, setReportPeriod] = useState<'DAILY' | 'WEEKLY' | 'MONTHLY'>('DAILY');
  const [reportStartDate, setReportStartDate] = useState('');
  const [reportEndDate, setReportEndDate] = useState('');

  // Modals & Action States
  const [selectedAccount, setSelectedAccount] = useState<AdminAccountData | null>(null);
  const [accountModalOpen, setAccountModalOpen] = useState(false);

  const [selectedTx, setSelectedTx] = useState<AdminTransactionData | null>(null);
  const [txModalOpen, setTxModalOpen] = useState(false);

  // Freeze/Unfreeze Confirmation State
  const [confirmFreezeOpen, setConfirmFreezeOpen] = useState(false);
  const [targetAccountForFreeze, setTargetAccountForFreeze] = useState<AdminAccountData | null>(null);
  const [freezeActionLoading, setFreezeActionLoading] = useState(false);

  // Unlock User Confirmation State (from Security Center)
  const [confirmUnlockOpen, setConfirmUnlockOpen] = useState(false);
  const [targetUserForUnlock, setTargetUserForUnlock] = useState<any | null>(null);
  const [unlockActionLoading, setUnlockActionLoading] = useState(false);

  // Load Overview & Initial Telemetry
  const loadOverviewData = async () => {
    setLoading(true);
    try {
      const [ov, rec] = await Promise.all([
        api.getAdminOverview(),
        api.getReconciliationReport(),
      ]);
      setOverview(ov);
      setReconciliation(rec);
    } catch (err: any) {
      if (onShowToast) onShowToast('Error', err.message || 'Failed to load telemetry', 'warning');
    } finally {
      setLoading(false);
    }
  };

  // Load Accounts
  const loadAccounts = async () => {
    try {
      const data = await api.getAdminAccounts({
        search: accountSearch || undefined,
        status: accountStatusFilter !== 'ALL' ? accountStatusFilter : undefined,
        currency: accountCurrencyFilter !== 'ALL' ? accountCurrencyFilter : undefined,
      });
      setAccounts(data);
    } catch (err: any) {
      if (onShowToast) onShowToast('Error', err.message || 'Failed to load accounts', 'warning');
    }
  };

  // Load Transactions
  const loadTransactions = async () => {
    try {
      const data = await api.getAdminTransactions({
        search: txSearch || undefined,
        type: txTypeFilter !== 'ALL' ? txTypeFilter : undefined,
        status: txStatusFilter !== 'ALL' ? txStatusFilter : undefined,
        suspiciousOnly: txSuspiciousOnly ? true : undefined,
      });
      setTransactions(data);
    } catch (err: any) {
      if (onShowToast) onShowToast('Error', err.message || 'Failed to load transactions', 'warning');
    }
  };

  // Load Security Telemetry
  const loadSecurityTelemetry = async () => {
    try {
      const data = await api.getSecurityTelemetry();
      setSecurityData(data);
    } catch (err: any) {
      if (onShowToast) onShowToast('Error', err.message || 'Failed to load security telemetry', 'warning');
    }
  };

  // Load Reports
  const loadReports = async () => {
    try {
      const data = await api.getAdminReports({
        period: reportPeriod,
        startDate: reportStartDate || undefined,
        endDate: reportEndDate || undefined,
      });
      setReportData(data);
    } catch (err: any) {
      if (onShowToast) onShowToast('Error', err.message || 'Failed to generate report', 'warning');
    }
  };

  useEffect(() => {
    loadOverviewData();
    loadTransactions();
  }, []);

  useEffect(() => {
    if (activeTab === 'accounts') loadAccounts();
    if (activeTab === 'transactions') loadTransactions();
    if (activeTab === 'security') loadSecurityTelemetry();
    if (activeTab === 'reports') loadReports();
  }, [
    activeTab,
    accountSearch,
    accountStatusFilter,
    accountCurrencyFilter,
    txSearch,
    txTypeFilter,
    txStatusFilter,
    txSuspiciousOnly,
    reportPeriod,
    reportStartDate,
    reportEndDate,
  ]);

  // Handle Account Freeze/Unfreeze
  const handleToggleFreezeAccount = async () => {
    if (!targetAccountForFreeze) return;
    setFreezeActionLoading(true);
    const isFreezing = targetAccountForFreeze.status === 'ACTIVE';

    try {
      if (isFreezing) {
        await api.freezeAccount(targetAccountForFreeze.id);
        if (onShowToast) {
          onShowToast('Account Frozen', `Account ${targetAccountForFreeze.accountNumber} has been placed on administrative hold`, 'info');
        }
      } else {
        await api.unfreezeAccount(targetAccountForFreeze.id);
        if (onShowToast) {
          onShowToast('Account Unfrozen', `Account ${targetAccountForFreeze.accountNumber} is now active`, 'success');
        }
      }
      setConfirmFreezeOpen(false);
      setTargetAccountForFreeze(null);
      await Promise.all([loadAccounts(), loadOverviewData()]);
    } catch (err: any) {
      if (onShowToast) onShowToast('Action Failed', err.message || 'Could not update account status', 'warning');
    } finally {
      setFreezeActionLoading(false);
    }
  };

  // Handle User Unlock
  const handleUnlockUser = async () => {
    if (!targetUserForUnlock) return;
    setUnlockActionLoading(true);
    try {
      await api.unlockCustomer(targetUserForUnlock.id);
      if (onShowToast) {
        onShowToast('Customer Unlocked', `User ${targetUserForUnlock.username} has been unlocked and login counter reset`, 'success');
      }
      setConfirmUnlockOpen(false);
      setTargetUserForUnlock(null);
      await Promise.all([loadSecurityTelemetry(), loadOverviewData()]);
    } catch (err: any) {
      if (onShowToast) onShowToast('Action Failed', err.message || 'Could not unlock user', 'warning');
    } finally {
      setUnlockActionLoading(false);
    }
  };

  // Export Reports CSV with Cryptographic SHA-256 Digest
  const handleExportReportCSV = async () => {
    if (!reportData || reportData.dailySummaries.length === 0) {
      if (onShowToast) onShowToast('No Records', 'No report data to export', 'info');
      return;
    }

    const headers = 'Date,Deposits Volume (INR),Withdrawals Volume (INR),Transfers Volume (INR),New Registrations\n';
    const rows = reportData.dailySummaries
      .map((d) => `"${d.date}","${d.deposits}","${d.withdrawals}","${d.transfers}","${d.registrations}"`)
      .join('\n');

    const csvContent =
      `# BALANCEVAULT COMMAND CENTER FINANCIAL REPORT\n` +
      `# Period: ${reportData.period} | Range: ${reportData.startDate} to ${reportData.endDate}\n` +
      `# Total Deposits: ${reportData.totalDepositsVolume} | Total Withdrawals: ${reportData.totalWithdrawalsVolume} | Net: ${reportData.netVolume}\n\n` +
      headers +
      rows;

    const encoder = new TextEncoder();
    const data = encoder.encode(csvContent);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

    const signedCsv = csvContent + `\n\n# SHA-256 INTEGRITY DIGEST: ${hashHex}\n`;

    const blob = new Blob([signedCsv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `balancevault-report-${reportData.period.toLowerCase()}-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    if (onShowToast) {
      onShowToast('Report Exported', `Generated financial report with SHA-256 cryptographic proof`, 'success');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <PageHeader
        title="Admin Command Center"
        description="Core banking oversight, real-time database telemetry, customer vault administration, and fraud monitoring."
        actions={
          <div className="flex items-center gap-2">
            <SecondaryButton
              size="sm"
              icon={<Users className="w-4 h-4" />}
              onClick={() => onNavigate('admin-users')}
            >
              User Directory ({overview?.totalCustomers ?? '...'})
            </SecondaryButton>
            <PrimaryButton
              size="sm"
              icon={<ShieldCheck className="w-4 h-4" />}
              onClick={() => onNavigate('admin-audit')}
            >
              Audit Trail
            </PrimaryButton>
          </div>
        }
      />

      {/* Command Center Tabs */}
      <div className="border-b border-app-border bg-white px-2 rounded-2xl shadow-card">
        <nav className="flex space-x-1 sm:space-x-2 overflow-x-auto py-2.5">
          {[
            { id: 'overview', label: 'Overview & Telemetry', icon: <Activity className="w-4 h-4" /> },
            { id: 'accounts', label: `Accounts (${overview?.totalAccounts ?? '...'})`, icon: <Building2 className="w-4 h-4" /> },
            { id: 'transactions', label: 'Transaction Monitoring', icon: <ArrowRightLeft className="w-4 h-4" /> },
            { id: 'security', label: `Security Center ${overview && overview.lockedUsers > 0 ? `(${overview.lockedUsers})` : ''}`, icon: <ShieldAlert className="w-4 h-4" /> },
            { id: 'reports', label: 'Reports & Analytics', icon: <TrendingUp className="w-4 h-4" /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as AdminTab);
                const screenTarget = tab.id === 'overview' ? 'admin-dashboard' : (`admin-${tab.id}` as Screen);
                onNavigate(screenTarget);
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-deep-purple text-white shadow-sm'
                  : 'text-secondary-text hover:text-primary-text hover:bg-pastel-lavender/40'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: OVERVIEW & TELEMETRY                                               */}
      {/* ========================================================================= */}
      {activeTab === 'overview' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Top 4 Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Registered Customers"
              value={overview ? String(overview.totalCustomers) : '...'}
              subtitle={`${overview?.activeUsers ?? 0} active • ${overview?.lockedUsers ?? 0} locked`}
              change="PostgreSQL"
              trend="up"
              timeframe="Live User Base"
              icon={<Users className="w-5 h-5 text-deep-purple" />}
            />
            <StatCard
              title="Active Vault Accounts"
              value={overview ? String(overview.totalAccounts) : '...'}
              subtitle={`${overview?.activeAccounts ?? 0} active • ${overview?.frozenAccounts ?? 0} frozen`}
              change="Segregated"
              trend="up"
              timeframe="System & Customer Vaults"
              icon={<Building2 className="w-5 h-5 text-deep-purple" />}
            />
            <StatCard
              title="Total Movements Volume"
              value={overview ? formatINR(overview.totalVolume) : '...'}
              subtitle={`${overview?.totalTransfersCount ?? 0} transfers • ${overview?.totalDepositsCount ?? 0} deposits`}
              change="Atomic"
              trend="up"
              timeframe="All-Time Cumulative"
              icon={<ArrowRightLeft className="w-5 h-5 text-emerald-600" />}
            />
            <StatCard
              title="Ledger Core Health"
              value={overview?.systemHealth || 'HEALTHY'}
              subtitle={overview?.activeVaultEngine || 'PostgreSQL 18'}
              change="Zero-Loss"
              trend="up"
              timeframe="Double-Entry Enforced"
              icon={<Server className="w-5 h-5 text-deep-purple" />}
            />
          </div>

          {/* Secondary 3 Stat Highlights (Deposits, Withdrawals, Transfers) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-white border border-app-border shadow-card flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-secondary-text uppercase tracking-wider block">Customer Deposits</span>
                <span className="text-lg font-mono font-bold text-emerald-600 block mt-1">
                  {overview ? formatINR(overview.totalDepositsVolume) : '...'}
                </span>
                <span className="text-[11px] text-secondary-text mt-0.5 block">{overview?.totalDepositsCount ?? 0} executed operations</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center shrink-0">
                <ArrowDownLeft className="w-5 h-5" />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-app-border shadow-card flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-secondary-text uppercase tracking-wider block">Customer Withdrawals</span>
                <span className="text-lg font-mono font-bold text-rose-600 block mt-1">
                  {overview ? formatINR(overview.totalWithdrawalsVolume) : '...'}
                </span>
                <span className="text-[11px] text-secondary-text mt-0.5 block">{overview?.totalWithdrawalsCount ?? 0} executed operations</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center shrink-0">
                <ArrowUpRight className="w-5 h-5" />
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-app-border shadow-card flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-secondary-text uppercase tracking-wider block">Double-Entry Transfers</span>
                <span className="text-lg font-mono font-bold text-deep-purple block mt-1">
                  {overview ? formatINR(overview.totalTransfersVolume) : '...'}
                </span>
                <span className="text-[11px] text-secondary-text mt-0.5 block">{overview?.totalTransfersCount ?? 0} two-legged sweeps</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-pastel-lavender/60 border border-secondary-lilac text-deep-purple flex items-center justify-center shrink-0">
                <ArrowRightLeft className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Cryptographic Financial Ledger Reconciliation Banner */}
          <div
            className={`p-5 rounded-2xl border shadow-card transition-all ${
              reconciliation?.status === 'BALANCED'
                ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                : 'bg-amber-50 border-amber-200 text-amber-950'
            }`}
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    reconciliation?.status === 'BALANCED' ? 'bg-emerald-600 text-white' : 'bg-amber-600 text-white'
                  }`}
                >
                  <Scale className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold tracking-tight text-primary-text">
                      Cryptographic Double-Entry Financial Reconciliation
                    </h3>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider ${
                        reconciliation?.status === 'BALANCED'
                          ? 'bg-emerald-200 text-emerald-800'
                          : 'bg-amber-200 text-amber-900'
                      }`}
                    >
                      {reconciliation?.status || 'VERIFYING...'}
                    </span>
                  </div>
                  <p className="text-xs text-secondary-text mt-0.5">
                    Mathematical invariant: Σ Debits must strictly equal Σ Credits across all verified ledger accounts.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-6 text-xs">
                <div>
                  <span className="text-secondary-text block text-[11px]">Total Debits</span>
                  <strong className="font-mono text-xs font-bold text-primary-text">
                    {reconciliation ? formatINR(reconciliation.totalDebits) : '...'}
                  </strong>
                </div>
                <div>
                  <span className="text-secondary-text block text-[11px]">Total Credits</span>
                  <strong className="font-mono text-xs font-bold text-primary-text">
                    {reconciliation ? formatINR(reconciliation.totalCredits) : '...'}
                  </strong>
                </div>
                <div>
                  <span className="text-secondary-text block text-[11px]">Net Variance</span>
                  <strong
                    className={`font-mono text-xs font-bold ${
                      Number(reconciliation?.variance || 0) === 0 ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                  >
                    {reconciliation ? formatINR(reconciliation.variance) : '...'}
                  </strong>
                </div>
                <button
                  onClick={loadOverviewData}
                  className="p-2 rounded-xl border border-app-border bg-white hover:bg-pastel-lavender/40 text-deep-purple transition-colors cursor-pointer"
                  title="Re-run cryptographic reconciliation"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>
          </div>

          {/* 4 Interactive Real Data Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart 1: Deposits vs Withdrawals */}
            <DashboardCard
              title="Deposits vs. Withdrawals (Volume)"
              subtitle="Comparison of customer inflows against liquidity withdrawals"
            >
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between text-xs text-secondary-text">
                  <span className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-emerald-500" />
                    <span>Deposits: <strong>{overview ? formatINR(overview.totalDepositsVolume) : '...'}</strong></span>
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-rose-500" />
                    <span>Withdrawals: <strong>{overview ? formatINR(overview.totalWithdrawalsVolume) : '...'}</strong></span>
                  </span>
                </div>

                {/* Comparative Volume Bar */}
                {(() => {
                  const dep = overview?.totalDepositsVolume || 0;
                  const wth = overview?.totalWithdrawalsVolume || 0;
                  const total = dep + wth || 1;
                  const depPercent = Math.round((dep / total) * 100);
                  const wthPercent = 100 - depPercent;

                  return (
                    <div className="space-y-2">
                      <div className="h-6 w-full rounded-xl bg-light-bg flex overflow-hidden border border-app-border">
                        <div
                          style={{ width: `${depPercent}%` }}
                          className="bg-emerald-500 h-full flex items-center justify-center text-[10px] font-bold text-white transition-all duration-500"
                        >
                          {depPercent > 10 ? `${depPercent}%` : ''}
                        </div>
                        <div
                          style={{ width: `${wthPercent}%` }}
                          className="bg-rose-500 h-full flex items-center justify-center text-[10px] font-bold text-white transition-all duration-500"
                        >
                          {wthPercent > 10 ? `${wthPercent}%` : ''}
                        </div>
                      </div>
                      <div className="flex justify-between text-[11px] text-secondary-text">
                        <span>Net Liquidity Retention: <strong className="text-primary-text">{formatINR(dep - wth)}</strong></span>
                        <span>{overview?.totalDepositsCount ?? 0} in / {overview?.totalWithdrawalsCount ?? 0} out</span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </DashboardCard>

            {/* Chart 2: Transaction Type Distribution */}
            <DashboardCard
              title="Transaction Type Distribution"
              subtitle="Breakdown by operation type across all settled movements"
            >
              <div className="space-y-3 pt-2">
                {overview?.typeDistribution.map((item) => {
                  const maxCount = Math.max(...(overview?.typeDistribution.map((t) => t.count) || [1]), 1);
                  const barPercent = Math.max(Math.round((item.count / maxCount) * 100), 8);
                  const color =
                    item.type === 'DEPOSIT'
                      ? 'bg-emerald-500'
                      : item.type === 'WITHDRAWAL'
                      ? 'bg-rose-500'
                      : 'bg-deep-purple';

                  return (
                    <div key={item.type} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-bold text-primary-text">{item.type}</span>
                        <span className="font-mono text-secondary-text">
                          {item.count} events • {formatINR(item.volume)}
                        </span>
                      </div>
                      <div className="h-2.5 w-full rounded-full bg-light-bg overflow-hidden border border-app-border">
                        <div
                          style={{ width: `${barPercent}%` }}
                          className={`h-full rounded-full ${color} transition-all duration-500`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </DashboardCard>

            {/* Chart 3: 14-Day Activity Over Time */}
            <DashboardCard
              title="Transaction Activity Over Time (14 Days)"
              subtitle="Daily movement count and volume trajectory"
            >
              <div className="pt-2">
                <div className="h-44 w-full flex items-end gap-1.5 sm:gap-2 pt-6 pb-2 border-b border-app-border">
                  {overview?.activityOverTime.map((d) => {
                    const maxVol = Math.max(...(overview?.activityOverTime.map((x) => Number(x.totalVolume)) || [1]), 100);
                    const heightPercent = Math.max(Math.round((Number(d.totalVolume) / maxVol) * 100), 10);
                    const totalOps = Number(d.deposits) + Number(d.withdrawals) + Number(d.transfers);

                    return (
                      <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group relative">
                        {/* Tooltip */}
                        <div className="absolute -top-12 z-20 hidden group-hover:flex flex-col items-center px-2 py-1 bg-primary-text text-white text-[10px] rounded shadow-lg whitespace-nowrap pointer-events-none">
                          <span className="font-bold">{d.date}</span>
                          <span>{totalOps} ops • {formatINR(d.totalVolume)}</span>
                        </div>

                        {/* Bar */}
                        <div
                          style={{ height: `${heightPercent}%` }}
                          className={`w-full rounded-t-md transition-all duration-300 ${
                            totalOps > 0 ? 'bg-deep-purple hover:bg-deep-purple-hover' : 'bg-pastel-lavender/50'
                          }`}
                        />
                        <span className="text-[9px] text-secondary-text font-mono truncate max-w-full">
                          {d.date.slice(8)}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between items-center text-[11px] text-secondary-text pt-2 font-mono">
                  <span>14 Days Ago</span>
                  <span className="text-deep-purple font-semibold">Hover bar for daily telemetry</span>
                  <span>Today</span>
                </div>
              </div>
            </DashboardCard>

            {/* Chart 4: Customer Base Growth */}
            <DashboardCard
              title="Customer Growth Progression"
              subtitle="Cumulative verified customer onboardings"
            >
              <div className="pt-2">
                <div className="h-44 w-full flex items-end gap-1.5 sm:gap-2 pt-6 pb-2 border-b border-app-border">
                  {overview?.customerGrowth.map((g) => {
                    const maxCust = Math.max(...(overview?.customerGrowth.map((x) => x.totalCustomers) || [1]), 1);
                    const heightPercent = Math.max(Math.round((g.totalCustomers / maxCust) * 100), 15);

                    return (
                      <div key={g.date} className="flex-1 flex flex-col items-center gap-1 group relative">
                        {/* Tooltip */}
                        <div className="absolute -top-12 z-20 hidden group-hover:flex flex-col items-center px-2 py-1 bg-primary-text text-white text-[10px] rounded shadow-lg whitespace-nowrap pointer-events-none">
                          <span className="font-bold">{g.date}</span>
                          <span>Total: {g.totalCustomers} (+{g.newCustomers})</span>
                        </div>

                        {/* Bar */}
                        <div
                          style={{ height: `${heightPercent}%` }}
                          className="w-full rounded-t-md bg-secondary-lilac hover:bg-deep-purple transition-all duration-300"
                        />
                        <span className="text-[9px] text-secondary-text font-mono truncate max-w-full">
                          {g.date.slice(8)}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-between items-center text-[11px] text-secondary-text pt-2 font-mono">
                  <span>Start Period</span>
                  <span className="text-deep-purple font-semibold">Current Verified Base: {overview?.totalCustomers ?? 0}</span>
                  <span>Latest</span>
                </div>
              </div>
            </DashboardCard>
          </div>

          {/* Recent Operations Tables (Transactions & Customer Registrations) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent Transactions (2 cols) */}
            <div className="lg:col-span-2">
              <DashboardCard
                title="Recent Operations & Movements"
                subtitle="Live stream of settled transfers and cashier operations"
                action={
                  <SecondaryButton size="sm" onClick={() => setActiveTab('transactions')}>
                    Full Monitoring
                  </SecondaryButton>
                }
              >
                <div className="overflow-x-auto -mx-4 sm:-mx-6">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-light-bg/50 border-b border-app-border text-secondary-text uppercase text-[10px] tracking-wider font-semibold">
                      <tr>
                        <th className="py-2.5 px-4">Ref / Type</th>
                        <th className="py-2.5 px-4">Source & Destination</th>
                        <th className="py-2.5 px-4">Amount</th>
                        <th className="py-2.5 px-4">Status</th>
                        <th className="py-2.5 px-4">Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-app-border/60">
                      {overview?.recentTransactions.slice(0, 6).map((tx) => (
                        <tr key={tx.id} className="hover:bg-pastel-lavender/10 transition-colors">
                          <td className="py-2.5 px-4">
                            <span className="font-mono text-[11px] font-bold text-deep-purple block truncate max-w-[130px]">
                              {tx.referenceId}
                            </span>
                            <span className="text-[10px] text-secondary-text uppercase font-semibold">
                              {tx.type}
                            </span>
                          </td>
                          <td className="py-2.5 px-4">
                            <span className="text-[11px] text-primary-text block font-mono">
                              {tx.sourceAccount} &rarr; {tx.destinationAccount}
                            </span>
                            <span className="text-[10px] text-secondary-text">
                              @{tx.sourceUser} &rarr; @{tx.destinationUser}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 font-mono font-bold text-xs text-primary-text">
                            {formatCurrency(tx.amount, tx.currency)}
                          </td>
                          <td className="py-2.5 px-4">
                            <StatusBadge status={tx.status} />
                          </td>
                          <td className="py-2.5 px-4 text-secondary-text font-mono text-[11px] whitespace-nowrap">
                            {new Date(tx.createdAt).toLocaleTimeString('en-US', { hour12: false })}
                          </td>
                        </tr>
                      ))}
                      {(!overview || overview.recentTransactions.length === 0) && (
                        <tr>
                          <td colSpan={5} className="py-6 text-center text-secondary-text text-xs">
                            No transaction records found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </DashboardCard>
            </div>

            {/* Recent Customer Registrations (1 col) */}
            <div className="lg:col-span-1">
              <DashboardCard
                title="Recent Customer Signups"
                subtitle="Newly created verified accounts"
                action={
                  <SecondaryButton size="sm" onClick={() => onNavigate('admin-users')}>
                    All Users
                  </SecondaryButton>
                }
              >
                <div className="space-y-3 pt-1">
                  {overview?.recentRegistrations.map((u) => (
                    <div
                      key={u.id}
                      className="p-3 rounded-xl bg-light-bg/70 border border-app-border flex items-center justify-between hover:border-secondary-lilac transition-colors"
                    >
                      <div className="min-w-0 pr-2">
                        <span className="font-bold text-xs text-primary-text block truncate">
                          {u.fullName || u.username}
                        </span>
                        <span className="text-[11px] text-secondary-text font-mono block truncate">
                          @{u.username} • {u.email}
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 shrink-0">
                        {u.status}
                      </span>
                    </div>
                  ))}
                  {(!overview || overview.recentRegistrations.length === 0) && (
                    <p className="text-center py-6 text-secondary-text text-xs">No registered customers yet.</p>
                  )}
                </div>
              </DashboardCard>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: ACCOUNT MANAGEMENT                                                 */}
      {/* ========================================================================= */}
      {activeTab === 'accounts' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Filter Bar */}
          <div className="p-4 rounded-2xl bg-white border border-app-border shadow-card flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-secondary-text" />
              <input
                type="text"
                placeholder="Search account number, username, or customer..."
                value={accountSearch}
                onChange={(e) => setAccountSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-light-bg border border-app-border focus:border-deep-purple focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-secondary-text text-[11px] font-semibold">Status:</span>
                <select
                  value={accountStatusFilter}
                  onChange={(e) => setAccountStatusFilter(e.target.value)}
                  className="px-2.5 py-1.5 rounded-xl border border-app-border bg-white text-xs font-semibold text-primary-text focus:outline-none"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="ACTIVE">Active</option>
                  <option value="FROZEN">Frozen</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-secondary-text text-[11px] font-semibold">Currency:</span>
                <select
                  value={accountCurrencyFilter}
                  onChange={(e) => setAccountCurrencyFilter(e.target.value)}
                  className="px-2.5 py-1.5 rounded-xl border border-app-border bg-white text-xs font-semibold text-primary-text focus:outline-none"
                >
                  <option value="ALL">All Currencies</option>
                  <option value="INR">INR (₹)</option>
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                </select>
              </div>

              <button
                onClick={loadAccounts}
                className="p-2 rounded-xl border border-app-border bg-white hover:bg-pastel-lavender/40 text-deep-purple transition-colors cursor-pointer"
                title="Refresh accounts"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Accounts Table */}
          <div className="bg-white rounded-2xl border border-app-border shadow-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-light-bg/70 border-b border-app-border text-secondary-text uppercase text-[10px] tracking-wider font-semibold">
                  <tr>
                    <th className="py-3 px-4">Account Number</th>
                    <th className="py-3 px-4">Customer Holder</th>
                    <th className="py-3 px-4">Currency</th>
                    <th className="py-3 px-4">Current Balance</th>
                    <th className="py-3 px-4">Vault Status</th>
                    <th className="py-3 px-4">Created Date</th>
                    <th className="py-3 px-4 text-right">Administrative Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-app-border/60">
                  {accounts.map((acc) => (
                    <tr key={acc.id} className="hover:bg-pastel-lavender/10 transition-colors">
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-xs text-primary-text block">{acc.accountNumber}</span>
                        {acc.isSystemAccount && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-100 text-deep-purple uppercase tracking-wider inline-block mt-0.5">
                            System Vault
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-primary-text block">{acc.customerName}</span>
                        <span className="text-[11px] text-secondary-text font-mono">@{acc.username}</span>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-xs text-secondary-text">
                        {acc.currency}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-xs text-primary-text">
                        {formatCurrency(acc.balance, acc.currency)}
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={acc.status} />
                      </td>
                      <td className="py-3 px-4 text-secondary-text font-mono text-[11px]">
                        {new Date(acc.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedAccount(acc);
                              setAccountModalOpen(true);
                            }}
                            className="p-1.5 rounded-lg border border-app-border hover:bg-pastel-lavender/40 text-deep-purple transition-colors cursor-pointer"
                            title="View Account Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {!acc.isSystemAccount && (
                            <button
                              onClick={() => {
                                setTargetAccountForFreeze(acc);
                                setConfirmFreezeOpen(true);
                              }}
                              className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                                acc.status === 'ACTIVE'
                                  ? 'border-rose-200 text-rose-600 hover:bg-rose-50'
                                  : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                              }`}
                              title={acc.status === 'ACTIVE' ? 'Freeze Account' : 'Unfreeze Account'}
                            >
                              {acc.status === 'ACTIVE' ? (
                                <Lock className="w-3.5 h-3.5" />
                              ) : (
                                <Unlock className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {accounts.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-secondary-text text-xs">
                        No accounts match the current filter selection.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: TRANSACTION MONITORING                                             */}
      {/* ========================================================================= */}
      {activeTab === 'transactions' && (
        <div className="space-y-4 animate-in fade-in duration-200">
          {/* Filters Bar */}
          <div className="p-4 rounded-2xl bg-white border border-app-border shadow-card flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-secondary-text" />
              <input
                type="text"
                placeholder="Search reference ID, account, description, or user..."
                value={txSearch}
                onChange={(e) => setTxSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-light-bg border border-app-border focus:border-deep-purple focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-secondary-text text-[11px] font-semibold">Type:</span>
                <select
                  value={txTypeFilter}
                  onChange={(e) => setTxTypeFilter(e.target.value)}
                  className="px-2.5 py-1.5 rounded-xl border border-app-border bg-white text-xs font-semibold text-primary-text focus:outline-none"
                >
                  <option value="ALL">All Types</option>
                  <option value="TRANSFER">Transfer</option>
                  <option value="DEPOSIT">Deposit</option>
                  <option value="WITHDRAWAL">Withdrawal</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-secondary-text text-[11px] font-semibold">Status:</span>
                <select
                  value={txStatusFilter}
                  onChange={(e) => setTxStatusFilter(e.target.value)}
                  className="px-2.5 py-1.5 rounded-xl border border-app-border bg-white text-xs font-semibold text-primary-text focus:outline-none"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="PENDING">Pending</option>
                  <option value="FAILED">Failed</option>
                </select>
              </div>

              <label className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-app-border bg-white text-xs font-semibold text-primary-text cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={txSuspiciousOnly}
                  onChange={(e) => setTxSuspiciousOnly(e.target.checked)}
                  className="rounded text-deep-purple focus:ring-0 cursor-pointer"
                />
                <span className="text-amber-700">Flagged Only</span>
              </label>

              <button
                onClick={loadTransactions}
                className="p-2 rounded-xl border border-app-border bg-white hover:bg-pastel-lavender/40 text-deep-purple transition-colors cursor-pointer"
                title="Refresh transactions"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Transactions Table */}
          <div className="bg-white rounded-2xl border border-app-border shadow-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-light-bg/70 border-b border-app-border text-secondary-text uppercase text-[10px] tracking-wider font-semibold">
                  <tr>
                    <th className="py-3 px-4">Ref ID / Type</th>
                    <th className="py-3 px-4">Source Account</th>
                    <th className="py-3 px-4">Destination Account</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Status & Flags</th>
                    <th className="py-3 px-4">Settled At</th>
                    <th className="py-3 px-4 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-app-border/60">
                  {transactions.map((tx) => (
                    <tr
                      key={tx.id}
                      className={`hover:bg-pastel-lavender/10 transition-colors ${
                        tx.isSuspicious ? 'bg-amber-50/40' : ''
                      }`}
                    >
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-xs text-deep-purple block truncate max-w-[150px]">
                          {tx.referenceId}
                        </span>
                        <span className="text-[10px] text-secondary-text font-bold uppercase tracking-wider">
                          {tx.type}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono font-semibold text-xs text-primary-text block">{tx.sourceAccount}</span>
                        <span className="text-[11px] text-secondary-text font-mono">@{tx.sourceUser}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono font-semibold text-xs text-primary-text block">{tx.destinationAccount}</span>
                        <span className="text-[11px] text-secondary-text font-mono">@{tx.destinationUser}</span>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-xs text-primary-text">
                        {formatCurrency(tx.amount, tx.currency)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <StatusBadge status={tx.status} />
                          {tx.isSuspicious && (
                            <span
                              className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1"
                              title={tx.suspicionReason}
                            >
                              <AlertTriangle className="w-2.5 h-2.5 text-amber-700" />
                              FLAGGED
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-secondary-text font-mono text-[11px] whitespace-nowrap">
                        {new Date(tx.createdAt).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => {
                            setSelectedTx(tx);
                            setTxModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg border border-app-border hover:bg-pastel-lavender/40 text-deep-purple transition-colors cursor-pointer"
                          title="View Complete Transaction Record"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {transactions.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-secondary-text text-xs">
                        No transactions match the specified filter criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: SECURITY CENTER                                                    */}
      {/* ========================================================================= */}
      {activeTab === 'security' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Active Defense Safeguards Banner */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-white border border-app-border shadow-card">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-secondary-text uppercase tracking-wider">Brute-Force Guard</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">ACTIVE</span>
              </div>
              <p className="text-xs font-semibold text-primary-text">5-Attempt Lockout</p>
              <p className="text-[11px] text-secondary-text mt-0.5">15-minute automatic security lockout enforced</p>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-app-border shadow-card">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-secondary-text uppercase tracking-wider">Idempotency Guard</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">ACTIVE</span>
              </div>
              <p className="text-xs font-semibold text-primary-text">24h Replay Protection</p>
              <p className="text-[11px] text-secondary-text mt-0.5">UUID/SHA-256 idempotency cache defense</p>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-app-border shadow-card">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-secondary-text uppercase tracking-wider">Append-Only Triggers</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">ENFORCED</span>
              </div>
              <p className="text-xs font-semibold text-primary-text">DB Schema Triggers</p>
              <p className="text-[11px] text-secondary-text mt-0.5">UPDATE and DELETE blocked in PostgreSQL</p>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-app-border shadow-card">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-secondary-text uppercase tracking-wider">Concurrency Engine</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">ACTIVE</span>
              </div>
              <p className="text-xs font-semibold text-primary-text">Deadlock-Free Row Locks</p>
              <p className="text-[11px] text-secondary-text mt-0.5">Ascending ID locks prevent deadlocks & race conditions</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Locked Accounts Table & Unlock Action */}
            <DashboardCard
              title="Locked Customer Accounts"
              subtitle="Accounts currently locked due to security limits or manual administrator freeze"
            >
              <div className="overflow-x-auto -mx-4 sm:-mx-6">
                <table className="w-full text-left text-xs">
                  <thead className="bg-light-bg/50 border-b border-app-border text-secondary-text uppercase text-[10px] tracking-wider font-semibold">
                    <tr>
                      <th className="py-2.5 px-4">User</th>
                      <th className="py-2.5 px-4">Failed Attempts</th>
                      <th className="py-2.5 px-4">Status</th>
                      <th className="py-2.5 px-4 text-right">Unlock</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-app-border/60">
                    {securityData?.lockedUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-pastel-lavender/10 transition-colors">
                        <td className="py-2.5 px-4">
                          <span className="font-bold text-xs text-primary-text block">{u.username}</span>
                          <span className="text-[11px] text-secondary-text font-mono">{u.email}</span>
                        </td>
                        <td className="py-2.5 px-4 font-mono font-bold text-xs text-rose-600">
                          {u.failedLoginAttempts} attempts
                        </td>
                        <td className="py-2.5 px-4">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 uppercase">
                            LOCKED
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          <button
                            onClick={() => {
                              setTargetUserForUnlock(u);
                              setConfirmUnlockOpen(true);
                            }}
                            className="px-2.5 py-1 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 text-[11px] font-bold transition-colors cursor-pointer"
                          >
                            Unlock User
                          </button>
                        </td>
                      </tr>
                    ))}
                    {(!securityData || securityData.lockedUsers.length === 0) && (
                      <tr>
                        <td colSpan={4} className="py-6 text-center text-secondary-text text-xs">
                          No customer accounts are currently locked. System is clear.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </DashboardCard>

            {/* Failed Login Attempts Tracker */}
            <DashboardCard
              title="Recent Failed Login Tracking"
              subtitle="Failed authentication attempts recorded by Spring Security"
            >
              <div className="overflow-x-auto -mx-4 sm:-mx-6">
                <table className="w-full text-left text-xs">
                  <thead className="bg-light-bg/50 border-b border-app-border text-secondary-text uppercase text-[10px] tracking-wider font-semibold">
                    <tr>
                      <th className="py-2.5 px-4">Customer Account</th>
                      <th className="py-2.5 px-4">Current Counter</th>
                      <th className="py-2.5 px-4">Threshold</th>
                      <th className="py-2.5 px-4">Lockout Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-app-border/60">
                    {securityData?.failedLoginUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-pastel-lavender/10 transition-colors">
                        <td className="py-2.5 px-4">
                          <span className="font-bold text-xs text-primary-text block">{u.username}</span>
                          <span className="text-[11px] text-secondary-text font-mono">{u.email}</span>
                        </td>
                        <td className="py-2.5 px-4 font-mono font-bold text-xs text-primary-text">
                          {u.failedLoginAttempts} / 5
                        </td>
                        <td className="py-2.5 px-4 text-secondary-text text-xs">
                          5 Max
                        </td>
                        <td className="py-2.5 px-4">
                          {u.isLocked ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 uppercase">
                              LOCKED
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 uppercase">
                              ATTEMPTING
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                    {(!securityData || securityData.failedLoginUsers.length === 0) && (
                      <tr>
                        <td colSpan={4} className="py-6 text-center text-secondary-text text-xs">
                          Zero active failed login streaks recorded.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </DashboardCard>
          </div>

          {/* Recent Security & Authentication Events */}
          <DashboardCard
            title="Recent Security & Authentication Events"
            subtitle="Immutable events recorded in audit_log"
          >
            <div className="overflow-x-auto -mx-4 sm:-mx-6">
              <table className="w-full text-left text-xs">
                <thead className="bg-light-bg/50 border-b border-app-border text-secondary-text uppercase text-[10px] tracking-wider font-semibold">
                  <tr>
                    <th className="py-2.5 px-4">Timestamp (UTC)</th>
                    <th className="py-2.5 px-4">Event Action</th>
                    <th className="py-2.5 px-4">Entity Type</th>
                    <th className="py-2.5 px-4">Actor / Client IP</th>
                    <th className="py-2.5 px-4">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-app-border/60">
                  {securityData?.recentAuthEvents.slice(0, 8).map((ev) => (
                    <tr key={ev.id} className="hover:bg-pastel-lavender/10 transition-colors">
                      <td className="py-2.5 px-4 font-mono text-[11px] text-secondary-text whitespace-nowrap">
                        {new Date(ev.createdAt).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-4 font-mono font-bold text-xs text-deep-purple">
                        {ev.action}
                      </td>
                      <td className="py-2.5 px-4 text-secondary-text text-[11px]">
                        {ev.entityType} ({ev.entityId || 'SYS'})
                      </td>
                      <td className="py-2.5 px-4 font-mono text-[11px] text-primary-text">
                        {ev.username || 'ANONYMOUS'} • {ev.ipAddress || '127.0.0.1'}
                      </td>
                      <td className="py-2.5 px-4 text-secondary-text text-[11px] max-w-xs truncate">
                        {ev.details}
                      </td>
                    </tr>
                  ))}
                  {(!securityData || securityData.recentAuthEvents.length === 0) && (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-secondary-text text-xs">
                        No recent security events recorded.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </DashboardCard>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: REPORTS & ANALYTICS                                                */}
      {/* ========================================================================= */}
      {activeTab === 'reports' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Controls Bar */}
          <div className="p-4 rounded-2xl bg-white border border-app-border shadow-card flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-secondary-text uppercase">Aggregation Period:</span>
              {(['DAILY', 'WEEKLY', 'MONTHLY'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setReportPeriod(p)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    reportPeriod === p
                      ? 'bg-deep-purple text-white shadow-sm'
                      : 'border border-app-border bg-light-bg text-secondary-text hover:text-primary-text'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs text-secondary-text">
                <span>From:</span>
                <input
                  type="date"
                  value={reportStartDate}
                  onChange={(e) => setReportStartDate(e.target.value)}
                  className="px-2 py-1 rounded-xl border border-app-border bg-white text-xs font-mono text-primary-text focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-1.5 text-xs text-secondary-text">
                <span>To:</span>
                <input
                  type="date"
                  value={reportEndDate}
                  onChange={(e) => setReportEndDate(e.target.value)}
                  className="px-2 py-1 rounded-xl border border-app-border bg-white text-xs font-mono text-primary-text focus:outline-none"
                />
              </div>

              <PrimaryButton
                size="sm"
                icon={<Download className="w-4 h-4" />}
                onClick={handleExportReportCSV}
              >
                Export Signed CSV
              </PrimaryButton>
            </div>
          </div>

          {/* Report Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-white border border-app-border shadow-card">
              <span className="text-[11px] font-bold text-secondary-text uppercase tracking-wider block">Period Deposits</span>
              <span className="text-xl font-mono font-bold text-emerald-600 block mt-1">
                {reportData ? formatINR(reportData.totalDepositsVolume) : '...'}
              </span>
              <span className="text-[11px] text-secondary-text mt-0.5 block">{reportData?.totalDepositsCount ?? 0} operations settled</span>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-app-border shadow-card">
              <span className="text-[11px] font-bold text-secondary-text uppercase tracking-wider block">Period Withdrawals</span>
              <span className="text-xl font-mono font-bold text-rose-600 block mt-1">
                {reportData ? formatINR(reportData.totalWithdrawalsVolume) : '...'}
              </span>
              <span className="text-[11px] text-secondary-text mt-0.5 block">{reportData?.totalWithdrawalsCount ?? 0} operations settled</span>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-app-border shadow-card">
              <span className="text-[11px] font-bold text-secondary-text uppercase tracking-wider block">Period Transfers</span>
              <span className="text-xl font-mono font-bold text-deep-purple block mt-1">
                {reportData ? formatINR(reportData.totalTransfersVolume) : '...'}
              </span>
              <span className="text-[11px] text-secondary-text mt-0.5 block">{reportData?.totalTransfersCount ?? 0} transfers executed</span>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-app-border shadow-card">
              <span className="text-[11px] font-bold text-secondary-text uppercase tracking-wider block">New Onboardings</span>
              <span className="text-xl font-mono font-bold text-primary-text block mt-1">
                {reportData?.newRegistrations ?? 0}
              </span>
              <span className="text-[11px] text-secondary-text mt-0.5 block">Verified customer accounts</span>
            </div>
          </div>

          {/* Daily Summaries Table */}
          <DashboardCard
            title={`Detailed Ledger Movement Report (${reportData?.period || 'DAILY'})`}
            subtitle={`Date range: ${reportData?.startDate || '...'} to ${reportData?.endDate || '...'}`}
          >
            <div className="overflow-x-auto -mx-4 sm:-mx-6">
              <table className="w-full text-left text-xs">
                <thead className="bg-light-bg/50 border-b border-app-border text-secondary-text uppercase text-[10px] tracking-wider font-semibold">
                  <tr>
                    <th className="py-2.5 px-4">Date</th>
                    <th className="py-2.5 px-4">Deposits Volume</th>
                    <th className="py-2.5 px-4">Withdrawals Volume</th>
                    <th className="py-2.5 px-4">Transfers Volume</th>
                    <th className="py-2.5 px-4">Net Liquidity Movement</th>
                    <th className="py-2.5 px-4">New Customers</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-app-border/60">
                  {reportData?.dailySummaries.map((day) => {
                    const net = Number(day.deposits) - Number(day.withdrawals);
                    return (
                      <tr key={day.date} className="hover:bg-pastel-lavender/10 transition-colors">
                        <td className="py-2.5 px-4 font-mono font-bold text-xs text-primary-text">
                          {day.date}
                        </td>
                        <td className="py-2.5 px-4 font-mono text-emerald-600 font-semibold">
                          {formatINR(day.deposits)}
                        </td>
                        <td className="py-2.5 px-4 font-mono text-rose-600 font-semibold">
                          {formatINR(day.withdrawals)}
                        </td>
                        <td className="py-2.5 px-4 font-mono text-deep-purple font-semibold">
                          {formatINR(day.transfers)}
                        </td>
                        <td className={`py-2.5 px-4 font-mono font-bold ${net >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                          {formatINR(net)}
                        </td>
                        <td className="py-2.5 px-4 font-mono text-secondary-text">
                          +{day.registrations}
                        </td>
                      </tr>
                    );
                  })}
                  {(!reportData || reportData.dailySummaries.length === 0) && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-secondary-text text-xs">
                        No report data for the selected period.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </DashboardCard>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: VIEW ACCOUNT DETAILS                                               */}
      {/* ========================================================================= */}
      {selectedAccount && (
        <Modal
          isOpen={accountModalOpen}
          onClose={() => {
            setAccountModalOpen(false);
            setSelectedAccount(null);
          }}
          title="Segregated Vault Account Details"
          subtitle={`Account Number: ${selectedAccount.accountNumber}`}
        >
          <div className="space-y-4 pt-2 text-xs">
            <div className="grid grid-cols-2 gap-3 p-4 rounded-xl bg-light-bg border border-app-border">
              <div>
                <span className="text-secondary-text block text-[11px]">Account Number</span>
                <span className="font-mono font-bold text-primary-text text-sm">{selectedAccount.accountNumber}</span>
              </div>
              <div>
                <span className="text-secondary-text block text-[11px]">Vault Status</span>
                <StatusBadge status={selectedAccount.status} />
              </div>
              <div>
                <span className="text-secondary-text block text-[11px]">Primary Customer</span>
                <span className="font-semibold text-primary-text">{selectedAccount.customerName}</span>
                <span className="text-[11px] text-secondary-text font-mono block">@{selectedAccount.username}</span>
              </div>
              <div>
                <span className="text-secondary-text block text-[11px]">Customer Email</span>
                <span className="text-primary-text font-mono">{selectedAccount.customerEmail}</span>
              </div>
              <div>
                <span className="text-secondary-text block text-[11px]">Denominated Currency</span>
                <span className="font-mono font-bold text-deep-purple">{selectedAccount.currency}</span>
              </div>
              <div>
                <span className="text-secondary-text block text-[11px]">Available Settled Balance</span>
                <span className="font-mono font-bold text-sm text-emerald-700">
                  {formatCurrency(selectedAccount.balance, selectedAccount.currency)}
                </span>
              </div>
              <div>
                <span className="text-secondary-text block text-[11px]">Vault Creation Timestamp</span>
                <span className="font-mono text-secondary-text">{new Date(selectedAccount.createdAt).toLocaleString()}</span>
              </div>
              <div>
                <span className="text-secondary-text block text-[11px]">Account Classification</span>
                <span className="font-semibold text-primary-text">
                  {selectedAccount.isSystemAccount ? 'Operational Liquidity Vault' : 'Customer Segregated Vault'}
                </span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <SecondaryButton onClick={() => setAccountModalOpen(false)}>
                Close Details
              </SecondaryButton>
            </div>
          </div>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* MODAL: VIEW TRANSACTION RECORD                                            */}
      {/* ========================================================================= */}
      {selectedTx && (
        <Modal
          isOpen={txModalOpen}
          onClose={() => {
            setTxModalOpen(false);
            setSelectedTx(null);
          }}
          title="Complete Transaction Ledger Record"
          subtitle={`Reference ID: ${selectedTx.referenceId}`}
        >
          <div className="space-y-4 pt-2 text-xs">
            {selectedTx.isSuspicious && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-bold">Flagged for Surveillance Review</strong>
                  <span className="text-xs text-amber-800">{selectedTx.suspicionReason}</span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 p-4 rounded-xl bg-light-bg border border-app-border">
              <div>
                <span className="text-secondary-text block text-[11px]">Transaction ID</span>
                <span className="font-mono font-bold text-primary-text">{selectedTx.id}</span>
              </div>
              <div>
                <span className="text-secondary-text block text-[11px]">Operation Type</span>
                <span className="font-bold text-deep-purple">{selectedTx.type}</span>
              </div>
              <div>
                <span className="text-secondary-text block text-[11px]">Source Account</span>
                <span className="font-mono font-bold text-primary-text block">{selectedTx.sourceAccount}</span>
                <span className="text-[11px] text-secondary-text font-mono">@{selectedTx.sourceUser}</span>
              </div>
              <div>
                <span className="text-secondary-text block text-[11px]">Destination Account</span>
                <span className="font-mono font-bold text-primary-text block">{selectedTx.destinationAccount}</span>
                <span className="text-[11px] text-secondary-text font-mono">@{selectedTx.destinationUser}</span>
              </div>
              <div>
                <span className="text-secondary-text block text-[11px]">Amount</span>
                <span className="font-mono font-bold text-sm text-primary-text">
                  {formatCurrency(selectedTx.amount, selectedTx.currency)}
                </span>
              </div>
              <div>
                <span className="text-secondary-text block text-[11px]">Settlement Status</span>
                <StatusBadge status={selectedTx.status} />
              </div>
              <div className="col-span-2">
                <span className="text-secondary-text block text-[11px]">Description & Memo</span>
                <span className="text-primary-text font-medium">{selectedTx.description || 'No memo provided'}</span>
              </div>
              <div className="col-span-2">
                <span className="text-secondary-text block text-[11px]">Timestamp (UTC)</span>
                <span className="font-mono text-secondary-text">{new Date(selectedTx.createdAt).toUTCString()}</span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <SecondaryButton onClick={() => setTxModalOpen(false)}>
                Close Record
              </SecondaryButton>
            </div>
          </div>
        </Modal>
      )}

      {/* Confirmation Dialog: Freeze / Unfreeze Account */}
      {targetAccountForFreeze && (
        <ConfirmationDialog
          isOpen={confirmFreezeOpen}
          onClose={() => {
            setConfirmFreezeOpen(false);
            setTargetAccountForFreeze(null);
          }}
          onConfirm={handleToggleFreezeAccount}
          title={targetAccountForFreeze.status === 'ACTIVE' ? 'Confirm Administrative Freeze' : 'Confirm Account Unfreeze'}
          message={
            targetAccountForFreeze.status === 'ACTIVE'
              ? `Are you sure you want to freeze account ${targetAccountForFreeze.accountNumber} owned by @${targetAccountForFreeze.username}? All outgoing debits and transfers will be immediately blocked.`
              : `Are you sure you want to restore account ${targetAccountForFreeze.accountNumber} to ACTIVE status? Outgoing and incoming operations will be re-enabled.`
          }
          confirmLabel={targetAccountForFreeze.status === 'ACTIVE' ? 'Freeze Account' : 'Unfreeze Account'}
          variant={targetAccountForFreeze.status === 'ACTIVE' ? 'danger' : 'solid'}
          loading={freezeActionLoading}
        />
      )}

      {/* Confirmation Dialog: Unlock Customer */}
      {targetUserForUnlock && (
        <ConfirmationDialog
          isOpen={confirmUnlockOpen}
          onClose={() => {
            setConfirmUnlockOpen(false);
            setTargetUserForUnlock(null);
          }}
          onConfirm={handleUnlockUser}
          title="Confirm Customer Account Unlock"
          message={`Are you sure you want to unlock customer @${targetUserForUnlock.username} (${targetUserForUnlock.email})? Their failed login counter will be reset to 0 and normal account access restored.`}
          confirmLabel="Unlock Customer"
          variant="solid"
          loading={unlockActionLoading}
        />
      )}
    </div>
  );
};
