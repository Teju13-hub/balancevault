import React, { useState, useEffect, useMemo } from 'react';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  Copy,
  Eye,
  EyeOff,
  Check,
  ShieldCheck,
  Download,
  Send,
  PlusCircle,
  MinusCircle,
  RefreshCw,
  Building2,
} from 'lucide-react';
import { StatCard } from '../components/StatCard';
import { DashboardCard } from '../components/DashboardCard';
import { StatusBadge } from '../components/StatusBadge';
import { PrimaryButton } from '../components/PrimaryButton';
import { SecondaryButton } from '../components/SecondaryButton';
import { Modal } from '../components/Modal';
import { api, AccountData, LedgerTransactionData } from '../services/api';
import { formatINR, formatIndianNumber } from '../utils/currency';
import type { Screen, UserProfile } from '../types';

interface CustomerDashboardProps {
  onNavigate: (screen: Screen) => void;
  onSelectAccount?: (id: string) => void;
  onShowToast: (title: string, message?: string, type?: 'success' | 'info' | 'warning') => void;
  currentUser?: UserProfile | null;
}

export const CustomerDashboard: React.FC<CustomerDashboardProps> = ({
  onNavigate,
  onShowToast,
  currentUser,
}) => {
  const [accounts, setAccounts] = useState<AccountData[]>([]);
  const [activeAccount, setActiveAccount] = useState<AccountData | null>(null);
  const [transactions, setTransactions] = useState<LedgerTransactionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFullAccount, setShowFullAccount] = useState(false);
  const [copied, setCopied] = useState(false);

  // Modals for Deposit & Withdrawal
  const [depositOpen, setDepositOpen] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [depositDescription, setDepositDescription] = useState('Customer Funds Deposit');
  const [actionLoading, setActionLoading] = useState(false);

  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawDescription, setWithdrawDescription] = useState('Customer Funds Withdrawal');

  // Load user accounts and transactions from backend
  const loadData = async () => {
    try {
      setLoading(true);
      const userAccounts = await api.getMyAccounts();
      setAccounts(userAccounts);

      if (userAccounts.length > 0) {
        const current = activeAccount
          ? userAccounts.find((a) => a.id === activeAccount.id) || userAccounts[0]
          : userAccounts[0];
        setActiveAccount(current);

        const txList = await api.getAccountTransactions(current.id);
        setTransactions(txList);
      } else {
        setActiveAccount(null);
        setTransactions([]);
      }
    } catch (err: any) {
      onShowToast('Error', err.message || 'Failed to load vault data', 'warning');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // When active account changes, fetch its ledger transactions
  const handleSelectAccount = async (acc: AccountData) => {
    setActiveAccount(acc);
    try {
      const txList = await api.getAccountTransactions(acc.id);
      setTransactions(txList);
    } catch {
      setTransactions([]);
    }
  };

  // Copy account number
  const handleCopy = () => {
    if (!activeAccount) return;
    navigator.clipboard.writeText(activeAccount.accountNumber);
    setCopied(true);
    onShowToast('Account Copied', `${activeAccount.accountNumber} saved to clipboard`, 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  // Deposit funds execution
  const handleExecuteDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAccount) return;
    const num = parseFloat(depositAmount);
    if (isNaN(num) || num <= 0) {
      onShowToast('Invalid Amount', 'Please specify a deposit amount greater than zero', 'warning');
      return;
    }

    setActionLoading(true);
    try {
      const updated = await api.deposit(activeAccount.id, {
        amount: num,
        description: depositDescription,
      });
      onShowToast('Deposit Successful', `${formatINR(num)} deposited into ${updated.accountNumber}`, 'success');
      setDepositOpen(false);
      setDepositAmount('');
      await loadData();
    } catch (err: any) {
      onShowToast('Deposit Failed', err.message || 'Transaction could not be completed', 'warning');
    } finally {
      setActionLoading(false);
    }
  };

  // Withdraw funds execution
  const handleExecuteWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAccount) return;
    const num = parseFloat(withdrawAmount);
    if (isNaN(num) || num <= 0) {
      onShowToast('Invalid Amount', 'Please specify a withdrawal amount greater than zero', 'warning');
      return;
    }
    if (num > activeAccount.balance) {
      onShowToast('Insufficient Balance', `Available balance is ${formatINR(activeAccount.balance)}`, 'warning');
      return;
    }

    setActionLoading(true);
    try {
      const updated = await api.withdraw(activeAccount.id, {
        amount: num,
        description: withdrawDescription,
      });
      onShowToast('Withdrawal Successful', `${formatINR(num)} withdrawn from ${updated.accountNumber}`, 'success');
      setWithdrawOpen(false);
      setWithdrawAmount('');
      await loadData();
    } catch (err: any) {
      onShowToast('Withdrawal Failed', err.message || 'Transaction could not be completed', 'warning');
    } finally {
      setActionLoading(false);
    }
  };

  // Download real CSV statement
  const handleDownloadStatement = () => {
    if (!activeAccount || transactions.length === 0) {
      onShowToast('No Statement Records', 'No transactions found for this account', 'info');
      return;
    }

    const headers = 'Date,Reference ID,Entry Type,Amount,Balance After,Description\n';
    const rows = transactions
      .map((t) => `"${t.createdAt}","${t.referenceId}","${t.entryType}","${t.amount}","${t.balanceAfter}","${t.description.replace(/"/g, '""')}"`)
      .join('\n');
    const csvContent = 'data:text/csv;charset=utf-8,' + encodeURIComponent(headers + rows);
    const link = document.createElement('a');
    link.setAttribute('href', csvContent);
    link.setAttribute('download', `balancevault-statement-${activeAccount.accountNumber}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onShowToast('Statement Exported', `Statement for ${activeAccount.accountNumber} downloaded successfully`, 'success');
  };

  // Portfolio calculations
  const totalPortfolioValue = useMemo(() => {
    return accounts.reduce((sum, acc) => sum + (Number(acc.balance) || 0), 0);
  }, [accounts]);

  const totalInflows = useMemo(() => {
    return transactions
      .filter((t) => t.entryType === 'CREDIT')
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  }, [transactions]);

  const totalOutflows = useMemo(() => {
    return transactions
      .filter((t) => t.entryType === 'DEBIT')
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  }, [transactions]);

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl lg:text-3xl font-extrabold text-primary-text tracking-tight">
            Welcome back, {currentUser?.fullName || currentUser?.username || 'Customer'}
          </h2>
          <p className="text-xs text-secondary-text mt-1">
            All accounts are secured under append-only cryptographic double-entry ledger verification.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <SecondaryButton
            size="sm"
            onClick={handleDownloadStatement}
            icon={<Download className="w-4 h-4" />}
          >
            Statement
          </SecondaryButton>
          <PrimaryButton
            size="sm"
            onClick={() => onNavigate('transfer')}
            icon={<Send className="w-4 h-4" />}
          >
            Move Money
          </PrimaryButton>
        </div>
      </div>

      {/* Stat Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Portfolio Value"
          value={formatINR(totalPortfolioValue)}
          subtitle={`Across ${accounts.length} active account${accounts.length === 1 ? '' : 's'}`}
          change="Real-time"
          trend="up"
          timeframe="Live Vault Total"
          icon={<Wallet className="w-5 h-5 text-deep-purple" />}
        />
        <StatCard
          title="Total Inflows"
          value={formatINR(totalInflows)}
          subtitle="Credits to selected vault"
          change="Double-Entry"
          trend="up"
          timeframe="Account History"
          icon={<ArrowDownLeft className="w-5 h-5 text-app-success" />}
        />
        <StatCard
          title="Total Outflows"
          value={formatINR(totalOutflows)}
          subtitle="Debits from selected vault"
          change="Protected"
          trend="down"
          timeframe="Account History"
          icon={<ArrowUpRight className="w-5 h-5 text-secondary-text" />}
        />
        <StatCard
          title="Security Health"
          value="100% OK"
          subtitle="Append-only verification active"
          change="Protected"
          trend="up"
          timeframe="Continuous"
          icon={<ShieldCheck className="w-5 h-5 text-deep-purple" />}
        />
      </div>

      {/* Main Account Balance Showcase & Transaction Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Vault Balance Card */}
        <div className="lg:col-span-1 rounded-2xl bg-gradient-to-br from-deep-purple via-[#423758] to-[#30283d] text-white p-6 shadow-card flex flex-col justify-between relative overflow-hidden">
          <div className="absolute -right-8 -bottom-8 w-40 h-40 rounded-full bg-white/5 pointer-events-none" />
          <div className="absolute right-12 top-4 w-20 h-20 rounded-full bg-pastel-lavender/10 pointer-events-none" />

          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-secondary-lilac">
                {activeAccount ? `Customer Vault (${activeAccount.currency})` : 'Primary Vault'}
              </span>
              <StatusBadge
                status={activeAccount?.status === 'ACTIVE' ? 'COMPLETED' : 'PENDING'}
                size="sm"
                className="bg-white/20 text-white border-white/30"
              />
            </div>

            <div className="mt-4">
              <span className="text-xs text-secondary-lilac block">Available Vault Balance</span>
              <div className="text-3xl font-extrabold tracking-tight mt-1 font-mono">
                {activeAccount ? formatINR(activeAccount.balance) : '₹0.00'}
              </div>
              <span className="text-[11px] text-secondary-lilac/80 font-mono mt-0.5 block">
                PostgreSQL Standard: NUMERIC(19,4) Precision
              </span>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-white/15">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-secondary-lilac">Account Number</span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setShowFullAccount(!showFullAccount)}
                  className="p-1 rounded hover:bg-white/10 text-secondary-lilac hover:text-white transition-colors"
                  aria-label={showFullAccount ? 'Mask account number' : 'Show account number'}
                >
                  {showFullAccount ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={handleCopy}
                  className="p-1 rounded hover:bg-white/10 text-secondary-lilac hover:text-white transition-colors"
                  aria-label="Copy account number"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-pastel-lavender" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
            <p className="font-mono text-sm tracking-wider font-semibold text-pastel-lavender">
              {activeAccount
                ? showFullAccount
                  ? activeAccount.accountNumber
                  : `•••• ${activeAccount.accountNumber.slice(-4)}`
                : 'No Account'}
            </p>
          </div>

          {/* Quick Action Buttons: Deposit, Withdraw, Transfer */}
          <div className="mt-5 grid grid-cols-3 gap-2">
            <button
              onClick={() => setDepositOpen(true)}
              className="py-2 px-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl transition-colors flex items-center justify-center gap-1 cursor-pointer shadow-sm"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Deposit</span>
            </button>
            <button
              onClick={() => setWithdrawOpen(true)}
              className="py-2 px-2 bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs rounded-xl transition-colors flex items-center justify-center gap-1 cursor-pointer shadow-sm"
            >
              <MinusCircle className="w-3.5 h-3.5" />
              <span>Withdraw</span>
            </button>
            <button
              onClick={() => onNavigate('transfer')}
              className="py-2 px-2 bg-white text-deep-purple font-bold text-xs rounded-xl hover:bg-pastel-lavender transition-colors flex items-center justify-center gap-1 cursor-pointer shadow-sm"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Transfer</span>
            </button>
          </div>
        </div>

        {/* Account Selector & Activity Overview */}
        <div className="lg:col-span-2 space-y-4">
          <DashboardCard
            title="My Segregated Accounts"
            subtitle="Click an account to switch view and transaction history"
            action={
              <button
                onClick={loadData}
                className="p-1.5 rounded-lg text-secondary-text hover:text-deep-purple hover:bg-pastel-lavender/40 transition-colors"
                title="Refresh Accounts"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            }
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {accounts.map((acc) => {
                const isSelected = activeAccount?.id === acc.id;
                return (
                  <div
                    key={acc.id}
                    onClick={() => handleSelectAccount(acc)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'border-deep-purple bg-pastel-lavender/30 ring-2 ring-deep-purple/10'
                        : 'border-app-border bg-white hover:border-secondary-lilac'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${isSelected ? 'bg-deep-purple text-white' : 'bg-pastel-lavender text-deep-purple'}`}>
                        <Building2 className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-mono text-xs font-bold text-primary-text">
                          {acc.accountNumber}
                        </div>
                        <div className="text-[11px] text-secondary-text">
                          Standard Checking ({acc.currency})
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-bold text-sm text-primary-text">
                        {formatINR(acc.balance)}
                      </div>
                      <span className="text-[10px] text-emerald-600 font-semibold uppercase">
                        {acc.status || 'ACTIVE'}
                      </span>
                    </div>
                  </div>
                );
              })}

              {accounts.length === 0 && !loading && (
                <div className="col-span-2 text-center py-6 text-secondary-text text-xs">
                  No vault accounts found. An initial checking account is created automatically upon registration.
                </div>
              )}
            </div>
          </DashboardCard>
        </div>
      </div>

      {/* Recent Ledger Entries Table */}
      <DashboardCard
        title="Recent Ledger Entries"
        subtitle="Chronological transaction trail with balance verification"
        action={
          <SecondaryButton size="sm" onClick={() => onNavigate('transactions')}>
            View All Entries
          </SecondaryButton>
        }
      >
        <div className="overflow-x-auto -mx-4 sm:-mx-6">
          <table className="w-full text-left text-xs">
            <thead className="bg-light-bg/50 border-b border-app-border text-secondary-text uppercase text-[10px] tracking-wider font-semibold">
              <tr>
                <th className="py-2.5 px-4">Date & Time</th>
                <th className="py-2.5 px-4">Reference ID</th>
                <th className="py-2.5 px-4">Description</th>
                <th className="py-2.5 px-4">Type</th>
                <th className="py-2.5 px-4 text-right">Amount</th>
                <th className="py-2.5 px-4 text-right">Balance After</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-app-border/60">
              {transactions.slice(0, 6).map((tx) => (
                <tr key={tx.id} className="hover:bg-pastel-lavender/10 transition-colors">
                  <td className="py-3 px-4 text-secondary-text font-mono text-[11px] whitespace-nowrap">
                    {new Date(tx.createdAt).toLocaleString('en-IN', {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })}
                  </td>
                  <td className="py-3 px-4 font-mono font-bold text-primary-text text-[11px] whitespace-nowrap">
                    {tx.referenceId}
                  </td>
                  <td className="py-3 px-4 text-primary-text font-medium">
                    {tx.description}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        tx.entryType === 'CREDIT'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      {tx.entryType === 'CREDIT' ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                      {tx.entryType}
                    </span>
                  </td>
                  <td className={`py-3 px-4 text-right font-mono font-bold text-xs ${tx.entryType === 'CREDIT' ? 'text-emerald-600' : 'text-primary-text'}`}>
                    {tx.entryType === 'CREDIT' ? '+' : '-'}{formatINR(tx.amount)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-xs text-secondary-text">
                    {formatINR(tx.balanceAfter)}
                  </td>
                </tr>
              ))}

              {transactions.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-secondary-text text-xs">
                    No transactions recorded for this account yet. Use Deposit or Move Money to initiate transactions.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </DashboardCard>

      {/* ======================================================== */}
      {/* DEPOSIT MODAL                                            */}
      {/* ======================================================== */}
      <Modal
        isOpen={depositOpen}
        onClose={() => setDepositOpen(false)}
        title="Deposit Funds into Vault"
        subtitle={`Credit funds to account ${activeAccount?.accountNumber} via double-entry system cash rail.`}
      >
        <form onSubmit={handleExecuteDeposit} className="space-y-4 pt-2">
          <div>
            <label className="block text-xs font-semibold text-primary-text mb-1">
              Deposit Amount (INR ₹)
            </label>
            <div className="relative flex items-center bg-light-bg border border-app-border rounded-xl px-3 py-2.5 focus-within:border-deep-purple focus-within:ring-2 focus-within:ring-pastel-lavender transition-all">
              <span className="font-bold text-deep-purple pr-2 text-sm">₹</span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                placeholder="5000.00"
                className="w-full bg-transparent border-0 text-primary-text text-sm font-mono focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-primary-text mb-1">
              Description / Memo
            </label>
            <input
              type="text"
              value={depositDescription}
              onChange={(e) => setDepositDescription(e.target.value)}
              placeholder="e.g. Salary Deposit, Client Settlement"
              className="w-full bg-light-bg border border-app-border rounded-xl px-3 py-2 text-xs text-primary-text focus:outline-none focus:border-deep-purple"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <SecondaryButton type="button" onClick={() => setDepositOpen(false)}>
              Cancel
            </SecondaryButton>
            <PrimaryButton type="submit" disabled={actionLoading}>
              {actionLoading ? 'Processing...' : 'Confirm Deposit'}
            </PrimaryButton>
          </div>
        </form>
      </Modal>

      {/* ======================================================== */}
      {/* WITHDRAWAL MODAL                                         */}
      {/* ======================================================== */}
      <Modal
        isOpen={withdrawOpen}
        onClose={() => setWithdrawOpen(false)}
        title="Withdraw Funds from Vault"
        subtitle={`Debit funds from ${activeAccount?.accountNumber}. Strict overdraft prevention is enforced.`}
      >
        <form onSubmit={handleExecuteWithdraw} className="space-y-4 pt-2">
          <div>
            <label className="block text-xs font-semibold text-primary-text mb-1">
              Withdrawal Amount (INR ₹)
            </label>
            <div className="relative flex items-center bg-light-bg border border-app-border rounded-xl px-3 py-2.5 focus-within:border-deep-purple focus-within:ring-2 focus-within:ring-pastel-lavender transition-all">
              <span className="font-bold text-deep-purple pr-2 text-sm">₹</span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder="1000.00"
                className="w-full bg-transparent border-0 text-primary-text text-sm font-mono focus:outline-none"
              />
            </div>
            {activeAccount && (
              <p className="text-[11px] text-secondary-text mt-1">
                Available to withdraw: <strong className="text-primary-text font-mono">{formatINR(activeAccount.balance)}</strong>
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-primary-text mb-1">
              Description / Memo
            </label>
            <input
              type="text"
              value={withdrawDescription}
              onChange={(e) => setWithdrawDescription(e.target.value)}
              placeholder="e.g. Vendor Payment, ATM Cash Out"
              className="w-full bg-light-bg border border-app-border rounded-xl px-3 py-2 text-xs text-primary-text focus:outline-none focus:border-deep-purple"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <SecondaryButton type="button" onClick={() => setWithdrawOpen(false)}>
              Cancel
            </SecondaryButton>
            <PrimaryButton type="submit" disabled={actionLoading}>
              {actionLoading ? 'Processing...' : 'Confirm Withdrawal'}
            </PrimaryButton>
          </div>
        </form>
      </Modal>

    </div>
  );
};
