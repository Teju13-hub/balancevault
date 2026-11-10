import React, { useState } from 'react';
import {
  Bell,
  Sun,
  Shield,
  Save,
  Check,
} from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { DashboardCard } from '../components/DashboardCard';
import { PrimaryButton } from '../components/PrimaryButton';

interface SettingsPageProps {
  onShowToast: (title: string, message?: string, type?: 'success' | 'info') => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ onShowToast }) => {
  const [notifyTransactions, setNotifyTransactions] = useState(true);
  const [notifyLogins, setNotifyLogins] = useState(true);
  const [sessionTimeout, setSessionTimeout] = useState('15');
  const [requireTwoFactor, setRequireTwoFactor] = useState(true);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onShowToast('Settings Saved', 'Your system preferences have been securely persisted', 'success');
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title="Settings &amp; Preferences"
        description="Configure account preferences, notifications, and session security parameters."
      />

      <form onSubmit={handleSave} className="space-y-6">
        {/* Appearance Section */}
        <DashboardCard
          title="Interface Appearance"
          subtitle="Brand visual identity specification"
          icon={<Sun className="w-5 h-5" />}
        >
          <div className="p-4 rounded-xl bg-pastel-mint/30 border border-soft-sage flex items-center justify-between text-xs">
            <div className="space-y-1">
              <span className="font-bold text-deep-sage block">Mint &amp; Sage Light Theme (Locked)</span>
              <p className="text-secondary-text">
                The BalanceVault institutional design system operates in high-contrast light mode to ensure maximum readability and accessibility.
              </p>
            </div>
            <span className="px-3 py-1 bg-white rounded-lg border border-soft-sage font-bold text-deep-sage">
              Active
            </span>
          </div>
        </DashboardCard>

        {/* Security Preferences */}
        <DashboardCard
          title="Security &amp; Session Management"
          subtitle="Fine-tune authentication and session isolation"
          icon={<Shield className="w-5 h-5" />}
        >
          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between py-2 border-b border-app-border">
              <div>
                <span className="font-semibold text-primary-text block">Automatic Inactivity Timeout</span>
                <span className="text-secondary-text">Terminate stateless session after idle period</span>
              </div>
              <select
                value={sessionTimeout}
                onChange={(e) => setSessionTimeout(e.target.value)}
                className="bg-light-bg rounded-xl border border-app-border px-3 py-1.5 text-xs font-semibold text-primary-text focus:outline-none focus:border-sage-green"
              >
                <option value="5">5 Minutes</option>
                <option value="15">15 Minutes (Recommended)</option>
                <option value="30">30 Minutes</option>
                <option value="60">60 Minutes</option>
              </select>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-app-border">
              <div>
                <span className="font-semibold text-primary-text block">Hardware Security Enforcement</span>
                <span className="text-secondary-text">Require FIDO2 hardware passkey for all money movements</span>
              </div>
              <input
                type="checkbox"
                checked={requireTwoFactor}
                onChange={(e) => setRequireTwoFactor(e.target.checked)}
                className="w-4 h-4 rounded border-app-border text-deep-sage focus:ring-sage-green"
              />
            </div>

            <div className="flex items-center justify-between py-2">
              <div>
                <span className="font-semibold text-primary-text block">Cryptographic Cross-Tenant Guard</span>
                <span className="text-secondary-text">Enforce 404 response on any foreign account ID query</span>
              </div>
              <span className="text-app-success font-semibold flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> Enforced by Backend
              </span>
            </div>
          </div>
        </DashboardCard>

        {/* Notifications */}
        <DashboardCard
          title="Real-Time Alerts"
          subtitle="Stay informed on critical ledger activities"
          icon={<Bell className="w-5 h-5" />}
        >
          <div className="space-y-3 text-xs">
            <label className="flex items-center justify-between p-2 rounded-lg hover:bg-light-bg cursor-pointer">
              <div>
                <span className="font-semibold text-primary-text block">Ledger Mutation Alerts</span>
                <span className="text-secondary-text">Immediate notification for debits or credits over $1,000</span>
              </div>
              <input
                type="checkbox"
                checked={notifyTransactions}
                onChange={(e) => setNotifyTransactions(e.target.checked)}
                className="w-4 h-4 rounded border-app-border text-deep-sage focus:ring-sage-green"
              />
            </label>

            <label className="flex items-center justify-between p-2 rounded-lg hover:bg-light-bg cursor-pointer">
              <div>
                <span className="font-semibold text-primary-text block">Security &amp; Device Alerts</span>
                <span className="text-secondary-text">Notification when a new IP or session token is authorized</span>
              </div>
              <input
                type="checkbox"
                checked={notifyLogins}
                onChange={(e) => setNotifyLogins(e.target.checked)}
                className="w-4 h-4 rounded border-app-border text-deep-sage focus:ring-sage-green"
              />
            </label>
          </div>
        </DashboardCard>

        <div className="flex justify-end">
          <PrimaryButton type="submit" icon={<Save className="w-4 h-4" />}>
            Save Preferences
          </PrimaryButton>
        </div>
      </form>
    </div>
  );
};

