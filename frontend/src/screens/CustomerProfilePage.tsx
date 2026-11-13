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
import { SecondaryButton } from '../components/SecondaryButton';
import { authStorage } from '../services/api';
import type { UserProfile } from '../types';

interface CustomerProfilePageProps {
  onShowToast: (title: string, message?: string, type?: 'success' | 'info') => void;
  currentUser?: UserProfile | null;
}

export const CustomerProfilePage: React.FC<CustomerProfilePageProps> = ({ onShowToast, currentUser }) => {
  const profile = currentUser || authStorage.getUser() || {
    id: 'unknown',
    username: 'customer',
    fullName: 'Verified Customer',
    email: 'customer@balancevault.com',
    role: 'ACCOUNT_HOLDER' as const,
    phone: '+91 98765 43210',
    tier: 'Standard Vault',
    kycStatus: 'VERIFIED' as const,
    joinedDate: 'November 2026',
    twoFactorEnabled: true,
  };
  const displayName = profile.fullName || profile.username;
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'BV';

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <PageHeader
        title="Customer Profile"
        description="Verified identity credentials and vault membership parameters."
      />

      {/* Main Profile Header Card */}
      <div className="bg-white rounded-2xl border border-app-border p-6 shadow-subtle flex flex-col sm:flex-row items-center sm:items-start gap-6">
        <div className="w-20 h-20 rounded-2xl bg-deep-purple text-white text-2xl font-bold flex items-center justify-center shrink-0 shadow-sm">
          {initials}
        </div>

        <div className="flex-1 text-center sm:text-left">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-xl font-bold text-primary-text">{displayName}</h3>
              <p className="text-xs text-secondary-text mt-0.5 font-mono">Username: @{profile.username}</p>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-app-border grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="flex items-center gap-2 text-secondary-text">
              <Mail className="w-4 h-4 text-deep-purple shrink-0" />
              <span className="truncate">{profile.email}</span>
            </div>
            <div className="flex items-center gap-2 text-secondary-text">
              <Phone className="w-4 h-4 text-deep-purple shrink-0" />
              <span>{profile.phone || '+1 (555) 019-2834'}</span>
            </div>
            <div className="flex items-center gap-2 text-secondary-text">
              <Calendar className="w-4 h-4 text-deep-purple shrink-0" />
              <span>Member since {profile.joinedDate || 'November 2026'}</span>
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
            <div className="p-3.5 rounded-xl bg-main-bg border border-app-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <KeyRound className="w-5 h-5 text-deep-purple" />
                <div>
                  <p className="text-xs font-bold text-primary-text">Two-Factor Authentication (2FA)</p>
                  <p className="text-[11px] text-secondary-text">FIDO2 / WebAuthn Hardware Security</p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-pastel-lavender text-app-success">
                Enabled
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-main-bg border border-app-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Lock className="w-5 h-5 text-deep-purple" />
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

        {/* Account Standing & Transfer Limits Card */}
        <DashboardCard
          title="Account Standing & Limits"
          subtitle="Tiered transaction and vault capability parameters"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3.5 rounded-xl bg-pastel-lavender/30 border border-secondary-lilac space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-deep-purple">Vault Status</span>
                <span className="text-[11px] font-semibold text-app-success flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Active Standing
                </span>
              </div>
              <p className="text-secondary-text text-[11px] leading-relaxed">
                Full customer privileges enabled. Internal money movements and external wire settlements fully authorized.
              </p>
            </div>

            <div className="space-y-2 text-secondary-text">
              <div className="flex justify-between py-1 border-b border-app-border/70">
                <span>Daily Transaction Limit:</span>
                <strong className="text-primary-text font-mono">₹10,00,000.00</strong>
              </div>
              <div className="flex justify-between py-1 border-b border-app-border/70">
                <span>Per-Transfer Limit:</span>
                <strong className="text-primary-text font-mono">₹2,50,000.00</strong>
              </div>
              <div className="flex justify-between py-1">
                <span>Security Standing:</span>
                <strong className="text-emerald-700 font-semibold">Good Standing</strong>
              </div>
            </div>
          </div>
        </DashboardCard>
      </div>
    </div>
  );
};
