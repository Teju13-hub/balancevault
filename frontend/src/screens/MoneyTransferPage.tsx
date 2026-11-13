import React, { useState, useEffect } from 'react';
import {
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Building2,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { DashboardCard } from '../components/DashboardCard';
import { PrimaryButton } from '../components/PrimaryButton';
import { SecondaryButton } from '../components/SecondaryButton';
import { ConfirmationDialog } from '../components/ConfirmationDialog';
import { api, AccountData, TransferResponseData } from '../services/api';
import { formatINR } from '../utils/currency';
import type { Screen } from '../types';

interface MoneyTransferPageProps {
  onNavigate: (screen: Screen) => void;
  onShowToast: (title: string, message?: string, type?: 'success' | 'info' | 'warning') => void;
}

export const MoneyTransferPage: React.FC<MoneyTransferPageProps> = ({
  onNavigate,
  onShowToast,
}) => {
  const [accounts, setAccounts] = useState<AccountData[]>([]);
  const [sourceAccountId, setSourceAccountId] = useState<number | null>(null);
  const [recipientAccount, setRecipientAccount] = useState('');
  const [amount, setAmount] = useState('');
  const [memo, setMemo] = useState('Vault Account Transfer');

  // Lookup state
  const [lookupLoading, setLookupLoading] = useState(false);
  const [verifiedRecipient, setVerifiedRecipient] = useState<AccountData | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);

  // Transfer execution & receipt state
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [transferLoading, setTransferLoading] = useState(false);
  const [transferReceipt, setTransferReceipt] = useState<TransferResponseData | null>(null);

  // Load user source accounts
  useEffect(() => {
    api.getMyAccounts()
      .then((accs) => {
        setAccounts(accs);
        if (accs.length > 0) {
          setSourceAccountId(accs[0].id);
        }
      })
      .catch((err) => {
        onShowToast('Error', err.message || 'Unable to load source accounts', 'warning');
      });
  }, []);

  const sourceAccount = accounts.find((a) => a.id === sourceAccountId) || accounts[0];
  const parsedAmount = parseFloat(amount) || 0;
  const isOverBalance = sourceAccount ? parsedAmount > Number(sourceAccount.balance) : false;

  // Re-validate recipient compatibility whenever selected source account changes
  useEffect(() => {
    if (verifiedRecipient && sourceAccount) {
      const srcCurr = (sourceAccount.currency || 'INR').toUpperCase();
      const destCurr = (verifiedRecipient.currency || 'INR').toUpperCase();
      if (srcCurr !== destCurr) {
        setVerifiedRecipient(null);
        setLookupError('Currency mismatch. Transfers are only supported between accounts with the same currency.');
      }
    }
  }, [sourceAccountId, sourceAccount]);

  // Recipient Account Lookup
  const handleVerifyRecipient = async () => {
    if (!recipientAccount.trim()) {
      setLookupError('Please enter a destination account number');
      setVerifiedRecipient(null);
      return;
    }

    if (sourceAccount && recipientAccount.trim().toUpperCase() === sourceAccount.accountNumber) {
      setLookupError('Source and destination accounts must be distinct');
      setVerifiedRecipient(null);
      return;
    }

    setLookupLoading(true);
    setLookupError(null);
    try {
      const acc = await api.lookupAccount(recipientAccount.trim().toUpperCase());
      const sourceCurrency = (sourceAccount?.currency || 'INR').toUpperCase();
      const destCurrency = (acc.currency || 'INR').toUpperCase();

      if (sourceCurrency !== destCurrency) {
        setVerifiedRecipient(null);
        setLookupError('Currency mismatch. Transfers are only supported between accounts with the same currency.');
        return;
      }

      setVerifiedRecipient(acc);
      onShowToast('Account Verified', `Destination vault ${acc.accountNumber} verified (${acc.currency})`, 'success');
    } catch (err: any) {
      setVerifiedRecipient(null);
      setLookupError(err.message || 'Destination account not found in vault registry');
    } finally {
      setLookupLoading(false);
    }
  };

  const handleInitiate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifiedRecipient) {
      onShowToast('Recipient Required', 'Please verify a compatible destination vault before proceeding', 'warning');
      return;
    }
    const sourceCurrency = (sourceAccount?.currency || 'INR').toUpperCase();
    const destCurrency = (verifiedRecipient.currency || 'INR').toUpperCase();
    if (sourceCurrency !== destCurrency) {
      onShowToast('Currency Mismatch', 'Currency mismatch. Transfers are only supported between accounts with the same currency.', 'warning');
      return;
    }
    if (parsedAmount <= 0) {
      onShowToast('Invalid Amount', 'Please specify a transfer amount greater than zero', 'warning');
      return;
    }
    if (isOverBalance) {
      onShowToast('Insufficient Funds', 'Transfer amount exceeds available vault balance', 'warning');
      return;
    }
    setIsConfirmOpen(true);
  };

  // Real transfer execution with Idempotency Key
  const handleConfirmTransfer = async () => {
    if (!sourceAccount) return;
    setIsConfirmOpen(false);
    setTransferLoading(true);

    const idempotencyKey = crypto.randomUUID();

    try {
      const resp = await api.createTransfer(
        {
          sourceAccountId: sourceAccount.id,
          destinationAccountNumber: recipientAccount.trim().toUpperCase(),
          amount: parsedAmount,
          currency: sourceAccount.currency || 'INR',
          description: memo.trim() || 'Internal Vault Transfer',
        },
        idempotencyKey
      );

      setTransferReceipt(resp);
      onShowToast(
        'Transfer Completed',
        `Successfully transferred ${formatINR(parsedAmount)} to ${recipientAccount}`,
        'success'
      );
    } catch (err: any) {
      onShowToast('Transfer Failed', err.message || 'Transaction could not be completed', 'warning');
    } finally {
      setTransferLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title="Money Movement"
        description="Transfer capital securely between internal accounts with cryptographic double-entry integrity."
      />

      {/* Security Banner */}
      <div className="p-4 rounded-2xl bg-pastel-lavender/40 border border-secondary-lilac/60 flex items-start gap-3 text-xs text-deep-purple leading-relaxed shadow-subtle">
        <ShieldCheck className="w-5 h-5 text-deep-purple shrink-0 mt-0.5" />
        <div>
          <strong className="font-bold block text-sm mb-0.5 text-primary-text">
            Double-Entry Idempotency Guaranteed
          </strong>
          Every transfer atomically debits the source vault and credits the destination vault in a single isolated transaction.
          Duplicate submissions are prevented via cryptographic idempotency tokens.
        </div>
      </div>

      {/* Success Receipt Card */}
      {transferReceipt && (
        <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 shadow-md text-emerald-950 space-y-4">
          <div className="flex items-center gap-2.5 text-emerald-700 font-bold text-lg">
            <CheckCircle2 className="w-6 h-6 text-emerald-600" />
            <span>Transfer Executed & Ledger Verified</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 pt-2 text-xs">
            <div>
              <span className="text-emerald-700/80 block">Transaction Reference</span>
              <strong className="font-mono text-xs block mt-0.5 text-emerald-900">{transferReceipt.referenceId}</strong>
            </div>
            <div>
              <span className="text-emerald-700/80 block">Amount Transferred</span>
              <strong className="font-mono text-sm block mt-0.5 text-emerald-900">{formatINR(transferReceipt.amount)}</strong>
            </div>
            <div>
              <span className="text-emerald-700/80 block">Destination Vault</span>
              <strong className="font-mono text-xs block mt-0.5 text-emerald-900">{recipientAccount.toUpperCase()}</strong>
            </div>
            <div>
              <span className="text-emerald-700/80 block">Ledger Status</span>
              <span className="inline-block mt-0.5 px-2 py-0.5 rounded bg-emerald-200 text-emerald-800 font-bold font-mono text-[10px]">
                {transferReceipt.status}
              </span>
            </div>
          </div>

          <div className="pt-2 flex items-center gap-3">
            <PrimaryButton
              size="sm"
              onClick={() => {
                setTransferReceipt(null);
                setAmount('');
                setRecipientAccount('');
                setVerifiedRecipient(null);
              }}
            >
              Make Another Transfer
            </PrimaryButton>
            <SecondaryButton size="sm" onClick={() => onNavigate('transactions')}>
              View Ledger Trail
            </SecondaryButton>
          </div>
        </div>
      )}

      {/* Transfer Form Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <DashboardCard title="Initiate Transaction" subtitle="Enter recipient details and amount below">
            <form onSubmit={handleInitiate} className="space-y-5">
              
              {/* Source Account Selector */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-primary-text mb-2">
                  Source Vault Account
                </label>
                <select
                  value={sourceAccountId ?? ''}
                  onChange={(e) => setSourceAccountId(Number(e.target.value))}
                  className="w-full bg-light-bg rounded-xl border border-app-border px-3.5 py-2.5 text-xs font-mono font-medium text-primary-text focus:outline-none focus:border-deep-purple"
                >
                  {accounts.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.accountNumber} — Available: {formatINR(acc.balance)} ({acc.currency})
                    </option>
                  ))}
                </select>
              </div>

              {/* Destination Account Number */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-primary-text mb-2">
                  Destination Account Number
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Building2 className="w-4 h-4 text-secondary-text absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={recipientAccount}
                      onChange={(e) => {
                        setRecipientAccount(e.target.value);
                        setVerifiedRecipient(null);
                        setLookupError(null);
                      }}
                      placeholder="e.g. AC6763938984"
                      className="w-full bg-light-bg rounded-xl border border-app-border pl-10 pr-4 py-2.5 text-xs font-mono font-semibold text-primary-text placeholder:text-secondary-text focus:outline-none focus:border-deep-purple uppercase"
                    />
                  </div>
                  <SecondaryButton
                    type="button"
                    size="sm"
                    disabled={lookupLoading || !recipientAccount.trim()}
                    onClick={handleVerifyRecipient}
                  >
                    {lookupLoading ? 'Verifying...' : 'Verify'}
                  </SecondaryButton>
                </div>

                {/* Recipient Verification Status Feedback */}
                {verifiedRecipient && (
                  <div className="mt-2 p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>
                      Verified: <strong>{verifiedRecipient.accountNumber}</strong> ({verifiedRecipient.currency} Standard Vault)
                    </span>
                  </div>
                )}
                {lookupError && (
                  <div className="mt-2 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                    <span>{lookupError}</span>
                  </div>
                )}
              </div>

              {/* Transfer Amount */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-primary-text mb-2">
                  Amount (INR ₹)
                </label>
                <div className="relative flex items-center bg-light-bg rounded-xl border border-app-border px-3.5 py-2.5 focus-within:border-deep-purple focus-within:ring-2 focus-within:ring-pastel-lavender transition-all">
                  <span className="font-bold text-deep-purple pr-2 text-sm">₹</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-transparent border-0 text-primary-text font-mono font-bold text-sm focus:outline-none"
                  />
                </div>
                {sourceAccount && (
                  <div className="flex items-center justify-between text-[11px] text-secondary-text mt-1.5">
                    <span>Available Balance: <strong className="font-mono text-primary-text">{formatINR(sourceAccount.balance)}</strong></span>
                    {isOverBalance && (
                      <span className="text-rose-600 font-semibold flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" /> Insufficient funds
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Memo */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-primary-text mb-2">
                  Transfer Memo / Reference
                </label>
                <input
                  type="text"
                  value={memo}
                  onChange={(e) => setMemo(e.target.value)}
                  placeholder="e.g. Monthly Settlement, Project Milestone"
                  className="w-full bg-light-bg rounded-xl border border-app-border px-3.5 py-2.5 text-xs text-primary-text focus:outline-none focus:border-deep-purple"
                />
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <PrimaryButton
                  type="submit"
                  disabled={transferLoading || parsedAmount <= 0 || isOverBalance || !verifiedRecipient}
                  className="w-full py-3 text-sm flex items-center justify-center gap-2"
                >
                  {transferLoading ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Review & Confirm Transfer</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </PrimaryButton>
              </div>

            </form>
          </DashboardCard>
        </div>

        {/* Sidebar Info Card */}
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-white border border-app-border shadow-card space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-deep-purple flex items-center gap-1.5">
              <Lock className="w-4 h-4 text-deep-purple" />
              <span>Transaction Safeguards</span>
            </h4>
            <div className="space-y-3 text-xs text-secondary-text leading-relaxed">
              <p>
                • <strong>Pessimistic Row Locking:</strong> Locks both accounts in ascending order to prevent deadlocks and race conditions.
              </p>
              <p>
                • <strong>Strict Overdraft Prevention:</strong> Enforced by both service logic and PostgreSQL table constraints.
              </p>
              <p>
                • <strong>Double-Entry Ledger:</strong> Exact symmetric debit and credit entries guarantee zero financial variance.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={isConfirmOpen && !!verifiedRecipient}
        title="Confirm Double-Entry Money Transfer"
        message={`You are about to transfer ${formatINR(parsedAmount)} from ${sourceAccount?.accountNumber} to ${recipientAccount.toUpperCase()}.`}
        confirmLabel={transferLoading ? 'Executing...' : 'Authorize Transfer'}
        cancelLabel="Cancel"
        loading={transferLoading}
        onConfirm={handleConfirmTransfer}
        onClose={() => setIsConfirmOpen(false)}
      />
    </div>
  );
};
