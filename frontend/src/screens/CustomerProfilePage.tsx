import React from 'react';
import {
  ShieldCheck,
  Mail,
  Phone,
  Calendar,
  KeyRound,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { DashboardCard } from '../components/DashboardCard';
import { StatusBadge } from '../components/StatusBadge';
import { SecondaryButton } from '../components/SecondaryButton';
import { DEMO_USER } from '../data/mockData';

interface CustomerProfilePageProps {
  onShowToast: (title: string, message?: string, type?: 'success' | 'info') => void;
}

export const CustomerProfilePage: React.FC<CustomerProfilePageProps> = ({ onShowToast }) => {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <PageHeader
        title="Customer Profile"
        description="Verified identity credentials and vault membership parameters."
        badge={<StatusBadge status={DEMO_USER.kycStatus} />}
      />

      {/* Main Profile Header Card */}
      <div className="bg-white rounded-2xl border border-app-border p-6 shadow-subtle flex flex-col sm:flex-row items-center sm:items-start gap-6">
        <div className="w-20 h-20 rounded-2xl bg-deep-sage text-white text-2xl font-bold flex items-center justify-center shrink-0 shadow-sm">
          EV
        </div>

        <div className="flex-1 text-center sm:text-left">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-xl font-bold text-primary-text">{DEMO_USER.fullName}</h3>
              <p className="text-xs text-secondary-text mt-0.5 font-mono">ID: {DEMO_USER.id}</p>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pastel-mint border border-soft-sage text-deep-sage text-xs font-bold self-center sm:self-auto">
              <ShieldCheck className="w-4 h-4" />
              <span>{DEMO_USER.tier}</span>
            </span>
          </div>

          <div className="mt-4 pt-4 border-t border-app-border grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="flex items-center gap-2 text-secondary-text">
              <Mail className="w-4 h-4 text-deep-sage shrink-0" />
              <span className="truncate">{DEMO_USER.email}</span>
            </div>
            <div className="flex items-center gap-2 text-secondary-text">
              <Phone className="w-4 h-4 text-deep-sage shrink-0" />
              <span>{DEMO_USER.phone}</span>
            </div>
            <div className="flex items-center gap-2 text-secondary-text">
              <Calendar className="w-4 h-4 text-deep-sage shrink-0" />
              <span>Member since {DEMO_USER.joinedDate}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Security Credentials Card */}
        <DashboardCard
          title="Security Protocols"
          subtitle="Cryptographic authorization settings"
        >
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-light-bg border border-app-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <KeyRound className="w-5 h-5 text-deep-sage" />
                <div>
                  <p className="text-xs font-bold text-primary-text">Two-Factor Authentication (2FA)</p>
                  <p className="text-[11px] text-secondary-text">FIDO2 / WebAuthn Hardware Security</p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-pastel-mint text-app-success">
                Enabled
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-light-bg border border-app-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Lock className="w-5 h-5 text-deep-sage" />
                <div>
                  <p className="text-xs font-bold text-primary-text">Assigned Role</p>
                  <p className="text-[11px] text-secondary-text">Enforced server-side: ACCOUNT_HOLDER</p>
                </div>
              </div>
              <span className="font-mono text-xs font-bold text-primary-text">ACCOUNT_HOLDER</span>
            </div>

            <div className="pt-2">
              <SecondaryButton
                size="sm"
                className="w-full"
                onClick={() => onShowToast('Key Rotated', 'Hardware token challenge initiated', 'info')}
              >
                Rotate Authorization Keys
              </SecondaryButton>
            </div>
          </div>
        </DashboardCard>

        {/* KYC & Identity Status Card */}
        <DashboardCard
          title="Identity Verification (KYC)"
          subtitle="Tiered regulatory compliance status"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3.5 rounded-xl bg-pastel-mint/30 border border-soft-sage space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-deep-sage">Verified Documents</span>
                <span className="text-[11px] font-semibold text-app-success flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Approved
                </span>
              </div>
              <p className="text-secondary-text text-[11px] leading-relaxed">
                Biometric passport and corporate registration documents validated under SOC2 Type II compliance.
              </p>
            </div>

            <div className="space-y-2 text-secondary-text">
              <div className="flex justify-between py-1 border-b border-app-border/70">
                <span>Daily Institutional Limit:</span>
                <strong className="text-primary-text font-mono">$1,000,000.00</strong>
              </div>
              <div className="flex justify-between py-1 border-b border-app-border/70">
                <span>Per-Transaction Limit:</span>
                <strong className="text-primary-text font-mono">$250,000.00</strong>
              </div>
              <div className="flex justify-between py-1">
                <span>Compliance Refresh Due:</span>
                <strong className="text-primary-text">November 2027</strong>
              </div>
            </div>
          </div>
        </DashboardCard>
      </div>
    </div>
  );
};

