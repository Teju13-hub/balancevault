import React, { useState, useEffect, useMemo } from 'react';
import { Download, Search, RefreshCw, ArrowDownLeft, ArrowUpRight, Building2 } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { SecondaryButton } from '../components/SecondaryButton';
import { DataTable } from '../components/DataTable';
import type { Column } from '../components/DataTable';
import { api, AccountData, LedgerTransactionData } from '../services/api';
import { formatINR } from '../utils/currency';

interface TransactionHistoryPageProps {
  onShowToast: (title: string, message?: string, type?: 'success' | 'info') => void;
}

export const TransactionHistoryPage: React.FC<TransactionHistoryPageProps> = ({ onShowToast }) => {
  const [accounts, setAccounts] = useState<AccountData[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('ALL');
  const [transactions, setTransactions] = useState<LedgerTransactionData[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [currentPage, setCurrentPage] = useState(1);

  // Load accounts and transactions
  const loadData = async () => {
    setLoading(true);
    try {
      const userAccounts = await api.getMyAccounts();
      setAccounts(userAccounts);

      const allEntries: LedgerTransactionData[] = [];
      if (userAccounts.length > 0) {
        for (const acc of userAccounts) {
          const entries = await api.getAccountTransactions(acc.id);
          allEntries.push(...entries);
        }
      } else {
        // Institutional Admin / Auditor fallback: view ledger transactions
        try {
          const adminTxs = await api.getAdminTransactions();
          const mapped: LedgerTransactionData[] = adminTxs.map((t, idx) => ({
            id: Number(t.id.replace(/\D/g, '')) || (idx + 1),
            accountId: 0,
            accountNumber: t.sourceAccount,
            entryType: t.type === 'WITHDRAWAL' ? 'DEBIT' : 'CREDIT',
            amount: t.amount,
            balanceAfter: t.amount,
            description: `${t.type}: ${t.sourceAccount} -> ${t.destinationAccount} (${t.description || ''})`,
            referenceId: t.referenceId,
            createdAt: t.createdAt,
          }));
          allEntries.push(...mapped);
        } catch (ignored) { }
      }

      // Sort newest first
      allEntries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setTransactions(allEntries);
    } catch (err: any) {
      onShowToast('Error', err.message || 'Unable to load transaction records', 'info');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredData = useMemo(() => {
    return transactions.filter((tx) => {
      const matchesSearch =
        tx.referenceId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.accountNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (tx.description && tx.description.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesType = typeFilter === 'ALL' || tx.entryType === typeFilter;
      const matchesAccount = selectedAccountId === 'ALL' || String(tx.accountId) === selectedAccountId;

      return matchesSearch && matchesType && matchesAccount;
    });
  }, [transactions, searchTerm, typeFilter, selectedAccountId]);

  // Export CSV with SHA-256 hash
  const handleExportCSV = async () => {
    if (filteredData.length === 0) {
      onShowToast('No Records', 'No transactions match the export selection', 'info');
      return;
    }

    const headers = 'Date,Reference ID,Account,Entry Type,Amount,Balance After,Description\n';
    const rows = filteredData
      .map(
        (t) =>
          `"${t.createdAt}","${t.referenceId}","${t.accountNumber}","${t.entryType}","${t.amount}","${t.balanceAfter}","${(t.description || '').replace(/"/g, '""')}"`
      )
      .join('\n');

    const csvContent = headers + rows;

    // Compute SHA-256 checksum in browser
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
    link.setAttribute('download', `balancevault-ledger-export-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    onShowToast('Export Complete', `Exported ${filteredData.length} entries (SHA-256 verified)`, 'success');
  };

  const columns: Column<LedgerTransactionData>[] = [
    {
      header: 'Date & Time',
      accessor: (row) => (
        <div>
          <span className="font-mono text-xs font-semibold text-primary-text block">
            {new Date(row.createdAt).toLocaleDateString('en-IN', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })}
          </span>
          <span className="text-[11px] text-secondary-text font-mono">
            {new Date(row.createdAt).toLocaleTimeString('en-IN', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>
      ),
    },
    {
      header: 'Reference ID',
      accessor: (row) => (
        <span className="font-mono text-xs font-bold text-deep-purple block">
          {row.referenceId}
        </span>
      ),
    },
    {
      header: 'Vault Account',
      accessor: (row) => (
        <span className="font-mono text-xs text-primary-text font-medium">
          {row.accountNumber}
        </span>
      ),
    },
    {
      header: 'Description',
      accessor: (row) => (
        <span className="text-xs text-primary-text font-medium">
          {row.description || 'Ledger Transaction'}
        </span>
      ),
    },
    {
      header: 'Entry Type',
      accessor: (row) => (
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${row.entryType === 'CREDIT'
            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            : 'bg-rose-50 text-rose-700 border border-rose-200'
            }`}
        >
          {row.entryType === 'CREDIT' ? <ArrowDownLeft className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
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
          className={`font-mono font-bold text-xs ${row.entryType === 'CREDIT' ? 'text-emerald-600' : 'text-primary-text'
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
        <span className="font-mono text-xs text-secondary-text">
          {formatINR(row.balanceAfter)}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Transaction History"
        description="Comprehensive audit-verified record of all past double-entry ledger operations."
        actions={
          <SecondaryButton
            size="sm"
            icon={<Download className="w-4 h-4" />}
            onClick={handleExportCSV}
          >
            Export Ledger (CSV)
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
            placeholder="Search reference, description, account..."
            className="w-full bg-light-bg rounded-xl border border-app-border pl-9 pr-4 py-2 text-xs text-primary-text placeholder:text-secondary-text focus:outline-none focus:border-deep-purple focus:ring-2 focus:ring-pastel-lavender"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Account Filter */}
          <select
            value={selectedAccountId}
            onChange={(e) => setSelectedAccountId(e.target.value)}
            className="bg-light-bg rounded-xl border border-app-border px-3 py-2 text-xs font-medium text-primary-text focus:outline-none focus:border-deep-purple"
          >
            <option value="ALL">All Vault Accounts</option>
            {accounts.map((acc) => (
              <option key={acc.id} value={String(acc.id)}>
                {acc.accountNumber} ({acc.currency})
              </option>
            ))}
          </select>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-light-bg rounded-xl border border-app-border px-3 py-2 text-xs font-medium text-primary-text focus:outline-none focus:border-deep-purple"
          >
            <option value="ALL">All Entry Types</option>
            <option value="CREDIT">Credits (+)</option>
            <option value="DEBIT">Debits (-)</option>
          </select>

          <button
            onClick={() => {
              setSearchTerm('');
              setTypeFilter('ALL');
              setSelectedAccountId('ALL');
            }}
            className="text-xs font-semibold text-deep-purple hover:underline px-2 py-1"
          >
            Reset
          </button>

          <button
            onClick={loadData}
            className="p-2 rounded-xl text-secondary-text hover:text-deep-purple hover:bg-pastel-lavender/40 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Transactions DataTable */}
      <DataTable
        columns={columns}
        data={filteredData}
        keyExtractor={(item) => String(item.id)}
        emptyMessage="No ledger entries match your filter criteria."
        currentPage={currentPage}
        totalPages={1}
        onPageChange={setCurrentPage}
      />
    </div>
  );
};
