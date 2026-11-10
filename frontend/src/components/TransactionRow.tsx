import React from 'react';
import { ArrowDownLeft, ArrowUpRight, RefreshCw } from 'lucide-react';
import { StatusBadge } from './StatusBadge';
import { Transaction } from '../types';

interface TransactionRowProps {
  transaction: Transaction;
  onClick?: () => void;
  showStatus?: boolean;
}

export const TransactionRow: React.FC<TransactionRowProps> = ({
  transaction,
  onClick,
  showStatus = true,
}) => {
  const isCredit = transaction.type === 'CREDIT';
  const isTransfer = transaction.type === 'TRANSFER';

  const formatAmount = (amt: number, curr: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: curr || 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    }).format(amt);
  };

  return (
    <div
      onClick={onClick}
      className={`group flex items-center justify-between p-4 rounded-xl border border-transparent hover:border-app-border hover:bg-pastel-lavender/25 transition-all duration-150 cursor-pointer ${
        onClick ? 'active:scale-[0.995]' : ''
      }`}
    >
      <div className="flex items-center gap-3.5 min-w-0">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
            isCredit
              ? 'bg-pastel-lavender border-secondary-lilac text-app-success'
              : isTransfer
              ? 'bg-blue-50 border-blue-200 text-app-info'
              : 'bg-stone-50 border-stone-200 text-primary-text'
          }`}
        >
          {isCredit ? (
            <ArrowDownLeft className="w-5 h-5" />
          ) : isTransfer ? (
            <RefreshCw className="w-4 h-4" />
          ) : (
            <ArrowUpRight className="w-5 h-5 text-secondary-text" />
          )}
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-sm text-primary-text truncate group-hover:text-deep-purple transition-colors">
              {transaction.title}
            </p>
            {transaction.memo && (
              <span className="hidden sm:inline text-xs text-secondary-text truncate max-w-[150px]">
                ({transaction.memo})
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5 text-xs text-secondary-text">
            <span>{transaction.timestamp}</span>
            <span>•</span>
            <span className="capitalize">{transaction.category}</span>
            <span className="hidden md:inline font-mono text-[11px] text-secondary-text/80">
              Ref: {transaction.referenceId.slice(0, 8)}...
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0 ml-4">
        {showStatus && (
          <div className="hidden sm:block">
            <StatusBadge status={transaction.status} size="sm" />
          </div>
        )}
        <div className="text-right">
          <p
            className={`font-semibold text-sm tracking-tight ${
              isCredit ? 'text-app-success' : 'text-primary-text'
            }`}
          >
            {isCredit ? '+' : '-'}{formatAmount(transaction.amount, transaction.currency)}
          </p>
          <p className="text-[11px] text-secondary-text/80 font-mono mt-0.5">
            Bal: {formatAmount(transaction.balanceAfter, transaction.currency)}
          </p>
        </div>
      </div>
    </div>
  );
};
