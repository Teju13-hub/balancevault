import React, { useState, useEffect } from 'react';
import {
  Copy,
  Eye,
  EyeOff,
  Check,
  Download,
  Send,
  ShieldCheck,
  Building2,
  Lock,
  RefreshCw,
} from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { DashboardCard } from '../components/DashboardCard';
import { StatusBadge } from '../components/StatusBadge';
import { PrimaryButton } from '../components/PrimaryButton';
import { SecondaryButton } from '../components/SecondaryButton';
import { DataTable } from '../components/DataTable';
import type { Column } from '../components/DataTable';
import { api, AccountData, LedgerTransactionData } from '../services/api';
import { formatINR } from '../utils/currency';
import type { Screen } from '../types';

interface AccountDetailsPageProps {
  onNavigate: (screen: Screen) => void;
  onShowToast: (title: string, message?: string, type?: 'success' | 'info') => void;
}

export const AccountDetailsPage: React.FC<AccountDetailsPageProps> = ({
  onNavigate,
  onShowToast,
}) => {
  const [accounts, setAccounts] = useState<AccountData[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  const [transactions, setTransactions] = useState<LedgerTransactionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFullAccount, setShowFullAccount] = useState(false);
  const [copied, setCopied] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const userAccounts = await api.getMyAccounts();
      setAccounts(userAccounts);

      if (userAccounts.length > 0) {
        const active = selectedAccountId
          ? userAccounts.find((a) => a.id === selectedAccountId) || userAccounts[0]
          : userAccounts[0];
        setSelectedAccountId(active.id);

        const txList = await api.getAccountTransactions(active.id);
        setTransactions(txList);
      }
    } catch (err: any) {
      onShowToast('Error', err.message || 'Unable to retrieve vault accounts', 'info');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSelectAccount = async (id: number) => {
    setSelectedAccountId(id);
    try {
      const txList = await api.getAccountTransactions(id);
      setTransactions(txList);
    } catch {
      setTransactions([]);
    }
  };

  const account = accounts.find((a) => a.id === selectedAccountId) || accounts[0];

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    onShowToast('Copied to clipboard', text, 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportStatement = () => {
    if (!account || transactions.length === 0) {
      onShowToast('No Records', 'No transactions found to export', 'info');
      return;
    }

    const headers = 'Date,Reference ID,Entry Type,Amount,Balance After,Description\n';
    const rows = transactions
      .map(
        (t) =>
          `"${t.createdAt}","${t.referenceId}","${t.entryType}","${t.amount}","${t.balanceAfter}","${(t.description || '').replace(/"/g, '""')}"`
      )
      .join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `statement-${account.accountNumber}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    onShowToast('Statement Exported', `Statement for ${account.accountNumber} downloaded`, 'success');
  };

  const columns: Column<LedgerTransactionData>[] = [
    {
      header: 'Timestamp',
      accessor: (row) => (
        <span className="font-mono text-xs text-secondary-text">
          {new Date(row.createdAt).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          })}{' '}
          {new Date(row.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
        </span>
      ),
    },
    {
      header: 'Reference & Description',
      accessor: (row) => (
        <div>
          <span className="font-semibold block text-primary-text text-xs">{row.description || 'Ledger Entry'}</span>
          <span className="text-[11px] text-deep-purple font-mono">Ref: {row.referenceId}</span>
        </div>
      ),
    },
    {
      header: 'Entry Type',
      accessor: (row) => (
        <span
          className={`px-2 py-0.5 rounded text-[11px] font-bold ${
            row.entryType === 'CREDIT' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
          }`}
        >
          {row.entryType}
        </span>
      ),
    },
    {
      header: 'Amount',
      className: 'text-right',
      headerClassName: 'text-right',
      accessor: (row) => (
        <span
          className={`font-mono font-bold text-xs ${
            row.entryType === 'CREDIT' ? 'text-emerald-600' : 'text-primary-text'
          }`}
        >
          {row.entryType === 'CREDIT' ? '+' : '-'}{formatINR(row.amount)}
        </span>
      ),
    },
    {
      header: 'Balance After',
      className: 'text-right',
      headerClassName: 'text-right',
      accessor: (row) => (
        <span className="font-mono text-secondary-text text-xs">
          {formatINR(row.balanceAfter)}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Vault Account Details"
        description="Comprehensive double-entry statement and real-time ledger balance verification."
        actions={
          <div className="flex items-center gap-2">
            <SecondaryButton
              size="sm"
              icon={<Download className="w-4 h-4" />}
              onClick={handleExportStatement}
            >
              Export Statement
            </SecondaryButton>
            <PrimaryButton
              size="sm"
              icon={<Send className="w-4 h-4" />}
              onClick={() => onNavigate('transfer')}
            >
              Transfer Funds
            </PrimaryButton>
          </div>
        }
      />

      {/* Account Selector Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {accounts.map((acc) => (
          <button
            key={acc.id}
            onClick={() => handleSelectAccount(acc.id)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
              selectedAccountId === acc.id
                ? 'bg-deep-purple text-white shadow-sm'
                : 'bg-white text-secondary-text border border-app-border hover:bg-pastel-lavender/30'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>{acc.accountNumber}</span>
            <span className="font-mono font-bold">({formatINR(acc.balance)})</span>
          </button>
        ))}
      </div>

      {account && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main Balance Info */}
          <div className="md:col-span-2 p-6 rounded-2xl bg-white border border-app-border shadow-card space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs uppercase font-bold tracking-wider text-secondary-text">
                  Vault Account Overview
                </span>
                <div className="font-mono text-2xl font-extrabold text-primary-text mt-1">
                  {formatINR(account.balance)}
                </div>
                <span className="text-xs text-secondary-text font-mono">
                  Currency: {account.currency} • Precision: NUMERIC(19,4)
                </span>
              </div>
              <StatusBadge status={account.status || 'ACTIVE'} />
            </div>

            <div className="pt-4 border-t border-app-border grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-secondary-text block">Account Number</span>
                <div className="flex items-center gap-2 mt-1">
                  <span className="font-mono font-bold text-primary-text text-sm">
                    {showFullAccount ? account.accountNumber : `•••• ${account.accountNumber.slice(-4)}`}
                  </span>
                  <button
                    onClick={() => setShowFullAccount(!showFullAccount)}
                    className="p-1 rounded text-secondary-text hover:text-deep-purple"
                  >
                    {showFullAccount ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={() => handleCopy(account.accountNumber)}
                    className="p-1 rounded text-secondary-text hover:text-deep-purple"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <span className="text-secondary-text block">Account Created</span>
                <span className="font-mono font-semibold text-primary-text text-xs block mt-1">
                  {new Date(account.createdAt).toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Security Checklist */}
          <div className="p-5 rounded-2xl bg-white border border-app-border shadow-card space-y-3 text-xs">
            <h4 className="font-bold text-deep-purple flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
              <ShieldCheck className="w-4 h-4 text-deep-purple" />
              <span>Vault Protections</span>
            </h4>
            <p className="text-secondary-text leading-relaxed">
              • <strong>Append-Only:</strong> Ledger entries cannot be modified or purged once written.
            </p>
            <p className="text-secondary-text leading-relaxed">
              • <strong>Zero Overdraft:</strong> Table check constraint guarantees non-negative balance at the database layer.
            </p>
          </div>
        </div>
      )}

      {/* Ledger Entries Table */}
      <DashboardCard
        title="Account Ledger Trail"
        subtitle="Chronological list of all double-entry debits and credits for this account"
      >
        <DataTable
          columns={columns}
          data={transactions}
          keyExtractor={(item) => String(item.id)}
          emptyMessage="No ledger entries recorded for this account."
        />
      </DashboardCard>
    </div>
  );
};
