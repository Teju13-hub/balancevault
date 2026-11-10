import React from 'react';
import {
  Users,
  FileCheck2,
  Wallet,
  ArrowRight,
  ShieldCheck,
  Database,
} from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { StatCard } from '../components/StatCard';
import { DashboardCard } from '../components/DashboardCard';
import { StatusBadge } from '../components/StatusBadge';
import { SecondaryButton } from '../components/SecondaryButton';
import { PrimaryButton } from '../components/PrimaryButton';
import { DEMO_AUDIT_LOGS, DEMO_ONBOARDING } from '../data/mockData';
import type { Screen } from '../types';

interface AdminDashboardProps {
  onNavigate: (screen: Screen) => void;
  onShowToast?: (title: string, message?: string, type?: 'success' | 'info') => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onNavigate }) => {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Administrative Command Center"
        description="System health, onboarding approvals, and cryptographic audit monitoring."
        badge={
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-pastel-mint border border-soft-sage text-deep-sage flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-app-success animate-pulse" />
            <span>Master Node Active</span>
          </span>
        }
        actions={
          <div className="flex items-center gap-2">
            <SecondaryButton
              size="sm"
              icon={<FileCheck2 className="w-4 h-4" />}
              onClick={() => onNavigate('admin-onboarding')}
            >
              Review KYC ({DEMO_ONBOARDING.filter((o) => o.status === 'PENDING_REVIEW').length})
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

      {/* Admin Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Registered Customers"
          value="1,429"
          subtitle="98.2% Identity Verified"
          change="+12"
          trend="up"
          timeframe="this week"
          icon={<Users className="w-5 h-5" />}
        />
        <StatCard
          title="Pending Onboarding"
          value="7"
          subtitle="Awaiting compliance review"
          change="-3"
          trend="down"
          timeframe="vs yesterday"
          icon={<FileCheck2 className="w-5 h-5 text-app-warning" />}
        />
        <StatCard
          title="Active Vault Accounts"
          value="3,842"
          subtitle="Flyway DDL Validated"
          change="+24"
          trend="up"
          timeframe="this month"
          icon={<Wallet className="w-5 h-5 text-deep-sage" />}
        />
        <StatCard
          title="System Security Grade"
          value="A+"
          subtitle="Append-only triggers verified"
          change="Zero Drift"
          trend="up"
          timeframe="Strict Flyway"
          icon={<Database className="w-5 h-5 text-deep-sage" />}
        />
      </div>

      {/* System Integrity & Fast Action Shortcuts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Action Hub */}
        <div className="p-6 rounded-2xl bg-white border border-app-border shadow-subtle space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-primary-text">
            Administrative Shortcuts
          </h3>
          <p className="text-xs text-secondary-text">
            Rapid access to core administrative governance tools:
          </p>

          <div className="space-y-2 pt-2">
            <button
              onClick={() => onNavigate('admin-users')}
              className="w-full p-3 rounded-xl border border-app-border hover:border-soft-sage hover:bg-pastel-mint/20 text-left transition-colors flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <Users className="w-4 h-4 text-deep-sage" />
                <span className="text-xs font-semibold text-primary-text">User &amp; Role Management</span>
              </div>
              <ArrowRight className="w-4 h-4 text-secondary-text group-hover:translate-x-0.5 transition-transform" />
            </button>

            <button
              onClick={() => onNavigate('admin-onboarding')}
              className="w-full p-3 rounded-xl border border-app-border hover:border-soft-sage hover:bg-pastel-mint/20 text-left transition-colors flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <FileCheck2 className="w-4 h-4 text-deep-sage" />
                <span className="text-xs font-semibold text-primary-text">Onboarding (KYC Verification)</span>
              </div>
              <ArrowRight className="w-4 h-4 text-secondary-text group-hover:translate-x-0.5 transition-transform" />
            </button>

            <button
              onClick={() => onNavigate('admin-audit')}
              className="w-full p-3 rounded-xl border border-app-border hover:border-soft-sage hover:bg-pastel-mint/20 text-left transition-colors flex items-center justify-between group"
            >
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-4 h-4 text-deep-sage" />
                <span className="text-xs font-semibold text-primary-text">System Audit Trail</span>
              </div>
              <ArrowRight className="w-4 h-4 text-secondary-text group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>

        {/* Database & Trigger Architecture Status */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-white border border-app-border shadow-subtle space-y-4">
          <div className="flex items-center justify-between border-b border-app-border pb-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-primary-text flex items-center gap-2">
              <Database className="w-4 h-4 text-deep-sage" />
              <span>Database Engine &amp; Flyway Schema Diagnostics</span>
            </h3>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-pastel-mint text-deep-sage font-bold">
              ddl-auto=validate
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-3.5 rounded-xl bg-light-bg/70 border border-app-border space-y-1.5">
              <span className="font-semibold text-primary-text block">trg_ledger_entries_append_only</span>
              <p className="text-secondary-text text-[11px]">
                PostgreSQL BEFORE UPDATE OR DELETE trigger actively blocks table mutations.
              </p>
              <span className="inline-block mt-1 text-[10px] font-bold text-app-success bg-pastel-mint/80 px-2 py-0.5 rounded">
                ENFORCED (PL/PGSQL)
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-light-bg/70 border border-app-border space-y-1.5">
              <span className="font-semibold text-primary-text block">trg_audit_log_append_only</span>
              <p className="text-secondary-text text-[11px]">
                Cryptographic audit trail entries are strictly append-only.
              </p>
              <span className="inline-block mt-1 text-[10px] font-bold text-app-success bg-pastel-mint/80 px-2 py-0.5 rounded">
                ENFORCED (PL/PGSQL)
              </span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-pastel-mint/30 border border-soft-sage text-xs text-deep-sage flex items-center justify-between">
            <span className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" />
              <span>Cross-Tenant ID Disclosure Prevention: All foreign queries yield HTTP 404</span>
            </span>
            <span className="font-bold text-app-success">Verified</span>
          </div>
        </div>
      </div>

      {/* Recent Administrative Audit Events */}
      <DashboardCard
        title="Recent Security &amp; Administrative Activities"
        subtitle="Chronological audit records captured by backend audit_log trigger"
        action={
          <SecondaryButton size="sm" onClick={() => onNavigate('admin-audit')}>
            View Full Audit Trail
          </SecondaryButton>
        }
      >
        <div className="space-y-3">
          {DEMO_AUDIT_LOGS.map((log) => (
            <div
              key={log.id}
              className="p-3.5 rounded-xl border border-app-border bg-light-bg/50 hover:bg-pastel-mint/10 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
            >
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-primary-text">{log.action}</span>
                  <StatusBadge status={log.status} size="sm" />
                </div>
                <p className="text-secondary-text text-[11px]">{log.details}</p>
              </div>

              <div className="text-right shrink-0 text-secondary-text text-[11px]">
                <p className="font-mono">{log.timestamp}</p>
                <p className="text-[10px]">IP: {log.ipAddress}</p>
              </div>
            </div>
          ))}
        </div>
      </DashboardCard>
    </div>
  );
};

