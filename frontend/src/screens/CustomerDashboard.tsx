import React, { useState } from 'react';
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
  Info,
} from 'lucide-react';
import { StatCard } from '../components/StatCard';
import { DashboardCard } from '../components/DashboardCard';
import { TransactionRow } from '../components/TransactionRow';
import { StatusBadge } from '../components/StatusBadge';
import { PrimaryButton } from '../components/PrimaryButton';
import { SecondaryButton } from '../components/SecondaryButton';
import { DEMO_ACCOUNTS, DEMO_TRANSACTIONS, DEMO_USER } from '../data/mockData';
import type { Screen } from '../types';

interface CustomerDashboardProps {
  onNavigate: (screen: Screen) => void;
  onSelectAccount?: (id: string) => void;
  onShowToast: (title: string, message?: string, type?: 'success' | 'info') => void;
}

export const CustomerDashboard: React.FC<CustomerDashboardProps> = ({
  onNavigate,
  onShowToast,
}) => {
  const [showFullAccount, setShowFullAccount] = useState(false);
  const [copied, setCopied] = useState(false);
  const primaryAccount = DEMO_ACCOUNTS[0];

  const handleCopy = () => {
    navigator.clipboard.writeText(primaryAccount.accountNumber);
    setCopied(true);
    onShowToast('Account Number Copied', 'Account number saved to clipboard', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const monthlyActivity = [
    { month: 'Jun', inflows: 42, outflows: 28 },
    { month: 'Jul', inflows: 55, outflows: 32 },
    { month: 'Aug', inflows: 48, outflows: 40 },
    { month: 'Sep', inflows: 72, outflows: 45 },
    { month: 'Oct', inflows: 64, outflows: 38 },
    { month: 'Nov', inflows: 85, outflows: 31 },
  ];

  return (
    <div className="space-y-6">
      {/* Synthetic Demo Disclaimer Banner */}
      <div className="p-3.5 rounded-2xl bg-pastel-lavender/40 border border-secondary-lilac flex items-center justify-between text-xs text-deep-purple">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-deep-purple shrink-0" />
          <span>
            <strong>Demonstration Environment:</strong> Displaying synthetic client data. Real money movement is strictly isolated to backend ledger verification.
          </span>
        </div>
        <span className="hidden sm:inline font-mono text-[11px] bg-white/80 px-2 py-0.5 rounded border border-secondary-lilac font-medium">
          Flyway Validated
        </span>
      </div>

      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-deep-purple">Overview</span>
          <h2 className="text-2xl lg:text-3xl font-extrabold text-primary-text tracking-tight mt-0.5">
            Welcome back, {DEMO_USER.fullName}
          </h2>
          <p className="text-xs text-secondary-text mt-1">
            All accounts are secured under append-only audit protocols.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <SecondaryButton
            size="sm"
            onClick={() => onShowToast('Export Started', 'Encrypted ledger statement is downloading', 'info')}
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
          value="$712,171.25"
          subtitle="Across 3 segregated accounts"
          change="+4.2%"
          trend="up"
          timeframe="vs last month"
          icon={<Wallet className="w-5 h-5" />}
        />
        <StatCard
          title="Monthly Inflows"
          value="$70,000.00"
          subtitle="2 Institutional Wires"
          change="+18.5%"
          trend="up"
          timeframe="this month"
          icon={<ArrowDownLeft className="w-5 h-5 text-app-success" />}
        />
        <StatCard
          title="Monthly Outflows"
          value="$8,920.50"
          subtitle="Vendor disbursements"
          change="-2.1%"
          trend="down"
          timeframe="this month"
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

      {/* Account Balance Showcase & Activity Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Vault Balance Card */}
        <div className="lg:col-span-1 rounded-2xl bg-gradient-to-br from-deep-purple via-[#423758] to-[#30283d] text-white p-6 shadow-card flex flex-col justify-between relative overflow-hidden">
          {/* Subtle background ornamentation */}
          <div className="absolute -right-8 -bottom-8 w-40 h-40 rounded-full bg-white/5 pointer-events-none" />
          <div className="absolute right-12 top-4 w-20 h-20 rounded-full bg-pastel-lavender/10 pointer-events-none" />

          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-secondary-lilac">
                {primaryAccount.accountName}
              </span>
              <StatusBadge status={primaryAccount.status} size="sm" className="bg-white/20 text-white border-white/30" />
            </div>

            <div className="mt-4">
              <span className="text-xs text-secondary-lilac block">Available Vault Balance</span>
              <div className="text-3xl font-extrabold tracking-tight mt-1">
                ${primaryAccount.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
              </div>
              <span className="text-[11px] text-secondary-lilac/80 font-mono mt-0.5 block">
                Standard: NUMERIC(19,4) Precision
              </span>
            </div>
          </div>

          <div className="mt-8 pt-5 border-t border-white/15">
            <div className="flex items-center justify-between text-xs mb-2">
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
              {showFullAccount ? primaryAccount.accountNumber : primaryAccount.maskedAccountNumber}
            </p>
          </div>

          <div className="mt-6 flex items-center gap-2">
            <button
              onClick={() => onNavigate('transfer')}
              className="flex-1 py-2 px-3 bg-white text-deep-purple font-bold text-xs rounded-xl hover:bg-pastel-lavender transition-colors text-center"
            >
              Transfer
            </button>
            <button
              onClick={() => onNavigate('accounts')}
              className="flex-1 py-2 px-3 bg-white/15 hover:bg-white/25 text-white font-medium text-xs rounded-xl transition-colors text-center border border-white/20"
            >
              Vault Details
            </button>
          </div>
        </div>

        {/* Monthly Activity Visualization */}
        <div className="lg:col-span-2">
          <DashboardCard
            title="Monthly Financial Flow"
            subtitle="Cash in vs Cash out comparison (in thousands USD)"
            action={
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-deep-purple" />
                  <span className="text-secondary-text">Inflows</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-secondary-lilac" />
                  <span className="text-secondary-text">Outflows</span>
                </div>
              </div>
            }
          >
            {/* SVG Visualized Bar Chart */}
            <div className="h-56 flex items-end justify-between gap-3 pt-6 pb-2 px-2">
              {monthlyActivity.map((item) => (
                <div key={item.month} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                  <div className="w-full flex items-end justify-center gap-1.5 h-44">
                    {/* Inflows Bar */}
                    <div
                      style={{ height: `${(item.inflows / 100) * 100}%` }}
                      className="w-full max-w-[20px] bg-deep-purple rounded-t-lg transition-all duration-500 hover:brightness-110 relative group"
                    >
                      <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-primary-text text-white text-[10px] py-0.5 px-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                        ${item.inflows}k
                      </div>
                    </div>
                    {/* Outflows Bar */}
                    <div
                      style={{ height: `${(item.outflows / 100) * 100}%` }}
                      className="w-full max-w-[20px] bg-secondary-lilac rounded-t-lg transition-all duration-500 hover:brightness-95 relative group"
                    >
                      <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-primary-text text-white text-[10px] py-0.5 px-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                        ${item.outflows}k
                      </div>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-secondary-text">{item.month}</span>
                </div>
              ))}
            </div>
          </DashboardCard>
        </div>
      </div>

      {/* Recent Transactions List */}
      <DashboardCard
        title="Recent Ledger Entries"
        subtitle="Chronological transaction trail with balance verification"
        action={
          <SecondaryButton size="sm" onClick={() => onNavigate('transactions')}>
            View All Entries
          </SecondaryButton>
        }
      >
        <div className="divide-y divide-app-border/60 -mx-3">
          {DEMO_TRANSACTIONS.slice(0, 4).map((tx) => (
            <TransactionRow
              key={tx.id}
              transaction={tx}
              onClick={() => onNavigate('transactions')}
            />
          ))}
        </div>
      </DashboardCard>
    </div>
  );
};

