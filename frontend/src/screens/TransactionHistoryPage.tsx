import React, { useState, useMemo } from 'react';
import { Download, Search, RefreshCw, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { SecondaryButton } from '../components/SecondaryButton';
import { DataTable } from '../components/DataTable';
import type { Column } from '../components/DataTable';
import { StatusBadge } from '../components/StatusBadge';
import { DEMO_TRANSACTIONS } from '../data/mockData';
import type { Transaction } from '../types';

interface TransactionHistoryPageProps {
  onShowToast: (title: string, message?: string, type?: 'success' | 'info') => void;
}

export const TransactionHistoryPage: React.FC<TransactionHistoryPageProps> = ({ onShowToast }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(1);

  const filteredData = useMemo(() => {
    return DEMO_TRANSACTIONS.filter((tx) => {
      const matchesSearch =
        tx.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.referenceId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (tx.memo && tx.memo.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesType = typeFilter === 'ALL' || tx.type === typeFilter;
      const matchesStatus = statusFilter === 'ALL' || tx.status === statusFilter;

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [searchTerm, typeFilter, statusFilter]);

  const columns: Column<Transaction>[] = [
    {
      header: 'Reference & Date',
      accessor: (row) => (
        <div>
          <span className="font-mono text-xs font-bold text-primary-text block">{row.referenceId}</span>
          <span className="text-xs text-secondary-text">{row.timestamp}</span>
        </div>
      ),
    },
    {
      header: 'Counterparty / Title',
      accessor: (row) => (
        <div>
          <span className="font-semibold text-sm text-primary-text block">{row.title}</span>
          <span className="text-xs text-secondary-text">{row.category} {row.memo && `• ${row.memo}`}</span>
        </div>
      ),
    },
    {
      header: 'Entry Type',
      accessor: (row) => (
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
            row.type === 'CREDIT'
              ? 'bg-pastel-lavender text-app-success'
              : row.type === 'TRANSFER'
              ? 'bg-blue-50 text-app-info'
              : 'bg-stone-100 text-secondary-text'
          }`}
        >
          {row.type === 'CREDIT' && <ArrowDownLeft className="w-3 h-3" />}
          {row.type === 'DEBIT' && <ArrowUpRight className="w-3 h-3" />}
          {row.type === 'TRANSFER' && <RefreshCw className="w-3 h-3" />}
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
          className={`font-mono font-bold text-sm ${
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
        <span className="font-mono text-xs text-secondary-text">
          ${row.balanceAfter.toFixed(4)}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Transaction History"
        description="Comprehensive audit-verified record of all past ledger entries."
        actions={
          <SecondaryButton
            size="sm"
            icon={<Download className="w-4 h-4" />}
            onClick={() => onShowToast('Exported CSV', 'Transaction records exported with sha256 checksum', 'success')}
          >
            Export Ledger
          </SecondaryButton>
        }
      />

      {/* Filters Bar */}
      <div className="p-4 bg-white rounded-2xl border border-app-border shadow-subtle flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-secondary-text absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by counterparty, memo, ref ID..."
            className="w-full bg-light-bg rounded-xl border border-app-border pl-9 pr-4 py-2 text-xs text-primary-text placeholder:text-secondary-text focus:outline-none focus:border-accent-purple focus:ring-2 focus:ring-accent-purple/20"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-light-bg rounded-xl border border-app-border px-3 py-2 text-xs font-medium text-primary-text focus:outline-none focus:border-accent-purple"
          >
            <option value="ALL">All Types</option>
            <option value="CREDIT">Credits (+)</option>
            <option value="DEBIT">Debits (-)</option>
            <option value="TRANSFER">Transfers</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-light-bg rounded-xl border border-app-border px-3 py-2 text-xs font-medium text-primary-text focus:outline-none focus:border-accent-purple"
          >
            <option value="ALL">All Statuses</option>
            <option value="COMPLETED">Completed</option>
            <option value="PENDING">Pending</option>
            <option value="FLAGGED">Flagged</option>
          </select>

          <button
            onClick={() => {
              setSearchTerm('');
              setTypeFilter('ALL');
              setStatusFilter('ALL');
            }}
            className="text-xs font-semibold text-deep-purple hover:underline px-2 py-1"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Transactions DataTable */}
      <DataTable
        columns={columns}
        data={filteredData}
        keyExtractor={(item) => item.id}
        emptyMessage="No ledger entries match your filter criteria."
        currentPage={currentPage}
        totalPages={1}
        onPageChange={setCurrentPage}
      />
    </div>
  );
};

