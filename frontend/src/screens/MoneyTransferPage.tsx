import React, { useState } from 'react';
import {
  ArrowRight,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { DashboardCard } from '../components/DashboardCard';
import { InputField } from '../components/InputField';
import { PrimaryButton } from '../components/PrimaryButton';
import { ConfirmationDialog } from '../components/ConfirmationDialog';
import { DEMO_ACCOUNTS } from '../data/mockData';
import type { Screen } from '../types';

interface MoneyTransferPageProps {
  onNavigate: (screen: Screen) => void;
  onShowToast: (title: string, message?: string, type?: 'success' | 'info' | 'warning') => void;
}

export const MoneyTransferPage: React.FC<MoneyTransferPageProps> = ({
  onNavigate,
  onShowToast,
}) => {
  const [sourceAccountId, setSourceAccountId] = useState(DEMO_ACCOUNTS[0].id);
  const [recipientAccount, setRecipientAccount] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [amount, setAmount] = useState('');
  const [memo, setMemo] = useState('');
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [transferType, setTransferType] = useState<'INTERNAL' | 'WIRE'>('INTERNAL');

  const sourceAccount = DEMO_ACCOUNTS.find((a) => a.id === sourceAccountId) || DEMO_ACCOUNTS[0];
  const parsedAmount = parseFloat(amount) || 0;
  const isOverBalance = parsedAmount > sourceAccount.availableBalance;

  const handleInitiate = (e: React.FormEvent) => {
    e.preventDefault();
    if (parsedAmount <= 0) {
      onShowToast('Invalid Amount', 'Please specify a transfer amount greater than zero', 'warning');
      return;
    }
    if (isOverBalance) {
      onShowToast('Insufficient Funds', 'Transfer amount exceeds available balance', 'warning');
      return;
    }
    setIsConfirmOpen(true);
  };

  const handleConfirmSimulation = () => {
    setIsConfirmOpen(false);
    onShowToast(
      'Demo Simulation Handled',
      'Phase 2 UI Demonstration completed. No actual money moved (Phase 3 backend handoff required).',
      'info'
    );
    onNavigate('transactions');
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title="Money Movement"
        description="Transfer capital between internal vaults or institutional counterparties."
      />

      {/* Mandatory Phase 2 Disclaimer Banner */}
      <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3 text-xs text-amber-900 leading-relaxed shadow-subtle">
        <AlertCircle className="w-5 h-5 text-app-warning shrink-0 mt-0.5" />
        <div>
          <strong className="font-bold block text-sm mb-0.5">Phase 2 Design System Simulation Notice</strong>
          This form is an interactive UI demonstration. In strict compliance with development guidelines,
          <strong> no real financial transfer logic is executed and no money is moved in this phase</strong>.
          Real transfers execute through validated Flyway-backed database triggers in Phase 3.
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Transfer Form Card */}
        <div className="md:col-span-2">
          <DashboardCard title="Initiate Transaction" subtitle="Enter transaction details below">
            <form onSubmit={handleInitiate} className="space-y-5">
              {/* Transfer Type Selector */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-primary-text mb-2">
                  Transfer Rail
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setTransferType('INTERNAL')}
                    className={`p-3 rounded-xl border text-xs font-semibold text-center transition-all ${
                      transferType === 'INTERNAL'
                        ? 'bg-deep-sage text-white border-deep-sage shadow-sm'
                        : 'bg-white text-secondary-text border-app-border hover:bg-pastel-mint/30'
                    }`}
                  >
                    Internal Vault Sweep (Instant)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTransferType('WIRE')}
                    className={`p-3 rounded-xl border text-xs font-semibold text-center transition-all ${
                      transferType === 'WIRE'
                        ? 'bg-deep-sage text-white border-deep-sage shadow-sm'
                        : 'bg-white text-secondary-text border-app-border hover:bg-pastel-mint/30'
                    }`}
                  >
                    External FedWire / SWIFT
                  </button>
                </div>
              </div>

              {/* Source Account Selection */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-primary-text mb-1.5">
                  Debited Account (Source)
                </label>
                <select
                  value={sourceAccountId}
                  onChange={(e) => setSourceAccountId(e.target.value)}
                  className="w-full bg-white rounded-xl border border-app-border px-3.5 py-2.5 text-sm font-medium text-primary-text focus:outline-none focus:border-sage-green focus:ring-2 focus:ring-sage-green/20"
                >
                  {DEMO_ACCOUNTS.map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.accountName} ({acc.currency}) — Available: ${acc.availableBalance.toFixed(2)}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-secondary-text mt-1">
                  Source account ownership validated server-side.
                </p>
              </div>

              {/* Recipient Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InputField
                  label="Recipient Full Name / Entity"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="e.g. Apex Global Corp"
                  required
                />
                <InputField
                  label="Recipient Account / IBAN"
                  value={recipientAccount}
                  onChange={(e) => setRecipientAccount(e.target.value)}
                  placeholder="e.g. US77CHASE001928"
                  required
                />
              </div>

              {/* Amount Input */}
              <div>
                <InputField
                  label="Transfer Amount (USD)"
                  type="number"
                  step="0.0001"
                  min="0.0001"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.0000"
                  error={isOverBalance ? 'Amount exceeds available vault balance' : undefined}
                  helperText="Precision enforced: BigDecimal / NUMERIC(19,4)"
                  required
                />
              </div>

              {/* Memo */}
              <InputField
                label="Transaction Memo / Reference"
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                placeholder="e.g. Invoice #9910 Q4 settlement"
              />

              <PrimaryButton
                type="submit"
                size="lg"
                className="w-full mt-2"
                disabled={isOverBalance || parsedAmount <= 0}
                icon={<ArrowRight className="w-4 h-4" />}
                iconPosition="right"
              >
                Review &amp; Verify Transfer
              </PrimaryButton>
            </form>
          </DashboardCard>
        </div>

        {/* Transfer Security Summary Sidecard */}
        <div className="space-y-4">
          <div className="p-6 rounded-2xl bg-white border border-app-border shadow-subtle space-y-4">
            <h4 className="text-xs uppercase font-bold tracking-wider text-primary-text">
              Transaction Breakdown
            </h4>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between text-secondary-text">
                <span>Transfer Amount:</span>
                <span className="font-semibold text-primary-text font-mono">
                  ${parsedAmount ? parsedAmount.toFixed(4) : '0.0000'}
                </span>
              </div>
              <div className="flex justify-between text-secondary-text">
                <span>Network Protocol Fee:</span>
                <span className="font-semibold text-app-success font-mono">$0.0000 (Waived)</span>
              </div>
              <div className="pt-3 border-t border-app-border flex justify-between font-bold text-sm text-primary-text">
                <span>Total Debit:</span>
                <span className="font-mono">${parsedAmount ? parsedAmount.toFixed(4) : '0.0000'}</span>
              </div>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-pastel-mint/30 border border-soft-sage text-xs space-y-3">
            <div className="flex items-center gap-2 font-bold text-deep-sage">
              <ShieldCheck className="w-4 h-4" />
              <span>Immutable Ledger Guard</span>
            </div>
            <p className="text-secondary-text leading-relaxed text-[11px]">
              Every confirmed transaction writes two append-only records (DEBIT on source, CREDIT on destination). Once logged, records cannot be modified or deleted.
            </p>
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleConfirmSimulation}
        title="Confirm Transfer Review"
        message={`Are you sure you want to review the transfer of $${parsedAmount.toFixed(2)} to ${
          recipientName || 'Recipient'
        }? (Simulation Mode: no funds moved)`}
        confirmLabel="Confirm Simulation"
        cancelLabel="Edit Details"
      />
    </div>
  );
};

