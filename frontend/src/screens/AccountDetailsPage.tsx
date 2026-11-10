import React, { useState } from 'react';
import {
  Copy,
  Eye,
  EyeOff,
  Check,
  Download,
  Send,
  ShieldCheck,
  Calendar,
  Lock,
} from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { DashboardCard } from '../components/DashboardCard';
import { StatusBadge } from '../components/StatusBadge';
import { PrimaryButton } from '../components/PrimaryButton';
import { SecondaryButton } from '../components/SecondaryButton';
import { DataTable } from '../components/DataTable';
import type { Column } from '../components/DataTable';
import { DEMO_ACCOUNTS, DEMO_TRANSACTIONS } from '../data/mockData';
import type { Transaction, Screen } from '../types';

interface AccountDetailsPageProps {
  onNavigate: (screen: Screen) => void;
  onShowToast: (title: string, message?: string, type?: 'success' | 'info') => void;
}

export const AccountDetailsPage: React.FC<AccountDetailsPageProps> = ({
  onNavigate,
  onShowToast,
}) => {
  const [selectedAccountId, setSelectedAccountId] = useState(DEMO_ACCOUNTS[0].id);
  const [showFullAccount, setShowFullAccount] = useState(false);
  const [copied, setCopied] = useState(false);

  const account = DEMO_ACCOUNTS.find((a) => a.id === selectedAccountId) || DEMO_ACCOUNTS[0];

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    onShowToast('Copied to clipboard', text, 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const columns: Column<Transaction>[] = [
    {
      header: 'Timestamp',
      accessor: (row) => <span className="font-medium text-xs">{row.timestamp}</span>,
    },
    {
      header: 'Description',
      accessor: (row) => (
        <div>
          <span className="font-semibold block text-primary-text">{row.title}</span>
          <span className="text-xs text-secondary-text font-mono">Ref: {row.referenceId}</span>
        </div>
      ),
    },
    {
      header: 'Type',
      accessor: (row) => (
        <span
          className={`px-2 py-0.5 rounded text-[11px] font-bold ${
            row.type === 'CREDIT' ? 'bg-pastel-mint text-app-success' : 'bg-gray-100 text-secondary-text'
          }`}
        >
          {row.type}
        </span>
      ),
    },
    {
      header: 'Status',
      accessor: (row) => <StatusBadge status={row.status} size="sm" />,
    },
    {
      header: 'Amount',
      className: 'text-right',
      headerClassName: 'text-right',
      accessor: (row) => (
        <span
          className={`font-mono font-semibold ${
            row.type === 'CREDIT' ? 'text-app-success' : 'text-primary-text'
          }`}
        >
          {row.type === 'CREDIT' ? '+' : '-'}${row.amount.toFixed(4)}
        </span>
      ),
    },
    {
      header: 'Balance After',
      className: 'text-right',
      headerClassName: 'text-right',
      accessor: (row) => (
        <span className="font-mono text-secondary-text text-xs">
          ${row.balanceAfter.toFixed(4)}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Account Details"
        description="Comprehensive ledger statement and vault management."
        badge={<StatusBadge status={account.status} />}
        actions={
          <div className="flex items-center gap-2">
            <SecondaryButton
              size="sm"
              icon={<Download className="w-4 h-4" />}
              onClick={() => onShowToast('Exporting Statement', 'Official signed statement is generating', 'info')}
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
        {DEMO_ACCOUNTS.map((acc) => (
          <button
            key={acc.id}
            onClick={() => setSelectedAccountId(acc.id)}
            className={`px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
              selectedAccountId === acc.id
                ? 'bg-deep-sage text-white border-deep-sage shadow-sm'
                : 'bg-white text-secondary-text border-app-border hover:bg-pastel-mint/20 hover:text-primary-text'
            }`}
          >
            {acc.accountName} • {acc.currency}
          </button>
        ))}
      </div>

      {/* Account Details Specs Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl bg-white border border-app-border shadow-subtle flex flex-col justify-between">
          <div>
            <span className="text-xs uppercase font-semibold text-secondary-text tracking-wider">
              Available Vault Balance
            </span>
            <div className="text-3xl font-extrabold text-primary-text mt-2 font-mono">
              ${account.balance.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}
            </div>
            <p className="text-[11px] text-secondary-text mt-1">
              Hold balance: $0.0000 • Currency: {account.currency}
            </p>
          </div>
          <div className="mt-6 pt-4 border-t border-app-border flex items-center justify-between text-xs text-secondary-text">
            <span>Tier Level</span>
            <span className="font-semibold text-deep-sage">{account.type}</span>
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-app-border shadow-subtle space-y-4">
          <span className="text-xs uppercase font-semibold text-secondary-text tracking-wider block">
            Banking Identifiers
          </span>
          <div>
            <span className="text-[11px] text-secondary-text block">Account Number</span>
            <div className="flex items-center justify-between mt-1">
              <span className="font-mono text-sm font-semibold text-primary-text">
                {showFullAccount ? account.accountNumber : account.maskedAccountNumber}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setShowFullAccount(!showFullAccount)}
                  className="p-1 text-secondary-text hover:text-deep-sage"
                  aria-label="Toggle account masking"
                >
                  {showFullAccount ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => handleCopy(account.accountNumber)}
                  className="p-1 text-secondary-text hover:text-deep-sage"
                  aria-label="Copy account number"
                >
                  {copied ? <Check className="w-4 h-4 text-app-success" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-app-border/70 flex items-center justify-between">
            <span className="text-[11px] text-secondary-text">Routing Number</span>
            <span className="font-mono text-xs font-semibold text-primary-text">{account.routingNumber}</span>
          </div>
        </div>

        <div className="p-6 rounded-2xl bg-white border border-app-border shadow-subtle space-y-4">
          <span className="text-xs uppercase font-semibold text-secondary-text tracking-wider block">
            Security &amp; Compliance
          </span>
          <div className="flex items-center gap-2.5 text-xs text-primary-text">
            <ShieldCheck className="w-4 h-4 text-deep-sage shrink-0" />
            <span>Append-only DB triggers active</span>
          </div>
          <div className="flex items-center gap-2.5 text-xs text-primary-text">
            <Lock className="w-4 h-4 text-deep-sage shrink-0" />
            <span>Strict tenant boundary verified</span>
          </div>
          <div className="flex items-center gap-2.5 text-xs text-primary-text">
            <Calendar className="w-4 h-4 text-deep-sage shrink-0" />
            <span>Created on {account.createdAt}</span>
          </div>
        </div>
      </div>

      {/* Account Transactions Statement */}
      <DashboardCard
        title="Account Statement &amp; Ledger Entries"
        subtitle="Immutable transaction events recorded for this account"
      >
        <DataTable
          columns={columns}
          data={DEMO_TRANSACTIONS}
          keyExtractor={(row) => row.id}
        />
      </DashboardCard>
    </div>
  );
};

