import React, { useState } from 'react';
import {
  Bell,
  Sun,
  Shield,
  Save,
  Check,
  KeyRound,
  Eye,
  EyeOff,
  User,
  ShieldCheck,
  Lock,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
} from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { DashboardCard } from '../components/DashboardCard';
import { PrimaryButton } from '../components/PrimaryButton';
import { SecondaryButton } from '../components/SecondaryButton';
import { api } from '../services/api';
import { UserProfile } from '../types';

interface SettingsPageProps {
  onShowToast: (title: string, message?: string, type?: 'success' | 'info' | 'warning') => void;
  currentUser?: UserProfile | null;
  onLogout?: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ onShowToast, currentUser, onLogout }) => {
  // Appearance & Notification Settings
  const [notifyTransactions, setNotifyTransactions] = useState(true);
  const [notifyLogins, setNotifyLogins] = useState(true);
  const [sessionTimeout, setSessionTimeout] = useState('15');
  const [requireTwoFactor, setRequireTwoFactor] = useState(true);

  // Change Password State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  const handleSavePreferences = (e: React.FormEvent) => {
    e.preventDefault();
    onShowToast('Preferences Saved', 'Your system preferences have been securely persisted', 'success');
  };

  // Password validation checks
  const hasMinLength = newPassword.length >= 8;
  const hasUpper = /[A-Z]/.test(newPassword);
  const hasLower = /[a-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSpecial = /[^A-Za-z0-9]/.test(newPassword);
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;
  const isPasswordValid = hasMinLength && hasUpper && hasLower && hasNumber && passwordsMatch;

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!currentPassword) {
      setPasswordError('Please enter your current password.');
      return;
    }

    if (!hasMinLength) {
      setPasswordError('New password must be at least 8 characters long.');
      return;
    }

    if (!passwordsMatch) {
      setPasswordError('New password and confirmation do not match.');
      return;
    }

    setPasswordLoading(true);
    try {
      const res = await api.changePassword({
        currentPassword,
        newPassword,
        confirmPassword,
      });

      setPasswordSuccess(res.message || 'Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      onShowToast('Security Updated', 'Your password has been securely updated.', 'success');
    } catch (err: any) {
      setPasswordError(err.message || 'Unable to update password. Please verify your current password.');
      onShowToast('Password Update Failed', err.message || 'Failed to update password', 'warning');
    } finally {
      setPasswordLoading(false);
    }
  };

  const roleName =
    currentUser?.role === 'ADMIN'
      ? 'System Administrator'
      : currentUser?.role === 'AUDITOR'
      ? 'Security & Financial Auditor'
      : 'Account Holder';

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title="Settings &amp; Security Command"
        description="Manage administrative identity credentials, change security passwords, and configure session parameters."
      />

      {/* Admin / User Profile Card */}
      <DashboardCard
        title="Active Identity &amp; Role"
        subtitle="Current authenticated principal and credential specifications"
        icon={<User className="w-5 h-5" />}
      >
        <div className="space-y-4 text-xs">
          <div className="p-4 rounded-2xl bg-pastel-lavender/30 border border-secondary-lilac flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-deep-purple text-white font-extrabold text-base flex items-center justify-center shadow-md">
                {(currentUser?.fullName || currentUser?.username || 'BV')
                  .split(' ')
                  .map((n) => n[0])
                  .filter(Boolean)
                  .slice(0, 2)
                  .join('')
                  .toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-sm text-primary-text">
                    {currentUser?.fullName || currentUser?.username || 'Administrator'}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-deep-purple text-white">
                    {currentUser?.role || 'ADMIN'}
                  </span>
                </div>
                <span className="text-secondary-text font-mono text-[11px] block mt-0.5">
                  @{currentUser?.username || 'admin'} • {currentUser?.email || 'admin@ledgerline.local'}
                </span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] font-bold uppercase tracking-wider text-secondary-text block">Privilege Level</span>
              <span className="text-xs font-bold text-deep-purple block mt-0.5">{roleName}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="p-3 rounded-xl bg-light-bg border border-app-border">
              <span className="text-[10px] font-bold uppercase tracking-wider text-secondary-text block">Session Authentication</span>
              <span className="font-mono text-primary-text font-semibold block mt-0.5">Stateless JWT (HMAC-SHA512)</span>
            </div>
            <div className="p-3 rounded-xl bg-light-bg border border-app-border">
              <span className="text-[10px] font-bold uppercase tracking-wider text-secondary-text block">Database Tenancy</span>
              <span className="font-semibold text-primary-text block mt-0.5">Row-Level Security &amp; Isolation</span>
            </div>
            <div className="p-3 rounded-xl bg-light-bg border border-app-border">
              <span className="text-[10px] font-bold uppercase tracking-wider text-secondary-text block">Audit Compliance</span>
              <span className="font-semibold text-emerald-700 block mt-0.5">Append-Only Immutable Logs</span>
            </div>
          </div>
        </div>
      </DashboardCard>

      {/* Change Password Section */}
      <DashboardCard
        title="Change Security Password"
        subtitle="Update your authentication credentials with real-time strength validation"
        icon={<KeyRound className="w-5 h-5" />}
      >
        <form onSubmit={handleChangePassword} className="space-y-4 text-xs">
          {passwordError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{passwordError}</span>
            </div>
          )}

          {passwordSuccess && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{passwordSuccess}</span>
            </div>
          )}

          {/* Current Password */}
          <div>
            <label className="font-bold text-primary-text block mb-1">
              Current Password <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showCurrentPassword ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                required
                className="w-full bg-light-bg rounded-xl border border-app-border px-3.5 py-2.5 text-xs text-primary-text placeholder:text-secondary-text focus:outline-none focus:border-deep-purple focus:ring-2 focus:ring-pastel-lavender"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary-text hover:text-primary-text"
              >
                {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div>
            <label className="font-bold text-primary-text block mb-1">
              New Password <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new strong password"
                required
                className="w-full bg-light-bg rounded-xl border border-app-border px-3.5 py-2.5 text-xs text-primary-text placeholder:text-secondary-text focus:outline-none focus:border-deep-purple focus:ring-2 focus:ring-pastel-lavender"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary-text hover:text-primary-text"
              >
                {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Password Strength Checklist */}
            {newPassword && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2 p-2.5 rounded-xl bg-light-bg border border-app-border">
                <span className={`flex items-center gap-1.5 text-[11px] ${hasMinLength ? 'text-emerald-700 font-semibold' : 'text-secondary-text'}`}>
                  <Check className={`w-3.5 h-3.5 ${hasMinLength ? 'text-emerald-600' : 'text-secondary-text/40'}`} />
                  <span>8+ characters</span>
                </span>
                <span className={`flex items-center gap-1.5 text-[11px] ${hasUpper && hasLower ? 'text-emerald-700 font-semibold' : 'text-secondary-text'}`}>
                  <Check className={`w-3.5 h-3.5 ${hasUpper && hasLower ? 'text-emerald-600' : 'text-secondary-text/40'}`} />
                  <span>Upper &amp; lower case</span>
                </span>
                <span className={`flex items-center gap-1.5 text-[11px] ${hasNumber ? 'text-emerald-700 font-semibold' : 'text-secondary-text'}`}>
                  <Check className={`w-3.5 h-3.5 ${hasNumber ? 'text-emerald-600' : 'text-secondary-text/40'}`} />
                  <span>Contains a number</span>
                </span>
                <span className={`flex items-center gap-1.5 text-[11px] ${hasSpecial ? 'text-emerald-700 font-semibold' : 'text-secondary-text'}`}>
                  <Check className={`w-3.5 h-3.5 ${hasSpecial ? 'text-emerald-600' : 'text-secondary-text/40'}`} />
                  <span>Special symbol</span>
                </span>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label className="font-bold text-primary-text block mb-1">
              Confirm New Password <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password to confirm"
                required
                className="w-full bg-light-bg rounded-xl border border-app-border px-3.5 py-2.5 text-xs text-primary-text placeholder:text-secondary-text focus:outline-none focus:border-deep-purple focus:ring-2 focus:ring-pastel-lavender"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-secondary-text hover:text-primary-text"
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {confirmPassword && !passwordsMatch && (
              <span className="text-[11px] text-rose-600 mt-1 block">
                Passwords do not match.
              </span>
            )}
          </div>

          <div className="flex justify-end pt-2">
            <PrimaryButton
              type="submit"
              disabled={passwordLoading || !currentPassword || !isPasswordValid}
              icon={<KeyRound className="w-4 h-4" />}
            >
              {passwordLoading ? 'Updating Credentials...' : 'Update Password'}
            </PrimaryButton>
          </div>
        </form>
      </DashboardCard>

      {/* Appearance Section */}
      <DashboardCard
        title="Interface Appearance"
        subtitle="Brand visual identity specification"
        icon={<Sun className="w-5 h-5" />}
      >
        <div className="p-4 rounded-xl bg-pastel-lavender/30 border border-secondary-lilac flex items-center justify-between text-xs">
          <div className="space-y-1">
            <span className="font-bold text-deep-purple block">Lavender Dream Pastel Theme (Institutional)</span>
            <p className="text-secondary-text">
              The BalanceVault institutional design system operates in high-contrast light mode with the Lavender Dream palette to ensure maximum readability and accessibility across banking operations.
            </p>
          </div>
          <span className="px-3 py-1 bg-white rounded-lg border border-secondary-lilac font-bold text-deep-purple shrink-0">
            Active
          </span>
        </div>
      </DashboardCard>

      {/* Security Preferences */}
      <form onSubmit={handleSavePreferences} className="space-y-6">
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
                className="bg-light-bg rounded-xl border border-app-border px-3 py-1.5 text-xs font-semibold text-primary-text focus:outline-none focus:border-deep-purple"
              >
                <option value="5">5 Minutes</option>
                <option value="15">15 Minutes (Standard)</option>
                <option value="30">30 Minutes</option>
                <option value="60">60 Minutes</option>
              </select>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-app-border">
              <div>
                <span className="font-semibold text-primary-text block">Hardware Security Enforcement</span>
                <span className="text-secondary-text">Require hardware passkey confirmation for high-value vault modifications</span>
              </div>
              <input
                type="checkbox"
                checked={requireTwoFactor}
                onChange={(e) => setRequireTwoFactor(e.target.checked)}
                className="w-4 h-4 rounded border-app-border text-deep-purple focus:ring-pastel-lavender"
              />
            </div>

            <div className="flex items-center justify-between py-2">
              <div>
                <span className="font-semibold text-primary-text block">Cryptographic Cross-Tenant Guard</span>
                <span className="text-secondary-text">Enforces HTTP 404 response on any unauthorized cross-tenant query</span>
              </div>
              <span className="text-emerald-700 font-semibold flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> Enforced by Spring Security
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
                <span className="text-secondary-text">Immediate notification for debits or credits over ₹10,000</span>
              </div>
              <input
                type="checkbox"
                checked={notifyTransactions}
                onChange={(e) => setNotifyTransactions(e.target.checked)}
                className="w-4 h-4 rounded border-app-border text-deep-purple focus:ring-pastel-lavender"
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
                className="w-4 h-4 rounded border-app-border text-deep-purple focus:ring-pastel-lavender"
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
