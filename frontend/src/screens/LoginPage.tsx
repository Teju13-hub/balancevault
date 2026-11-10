import React, { useState } from 'react';
import { ShieldCheck, ArrowRight, UserCheck, Shield } from 'lucide-react';
import { InputField } from '../components/InputField';
import { PasswordInput } from '../components/PasswordInput';
import { PrimaryButton } from '../components/PrimaryButton';
import type { Screen, UserRole } from '../types';

interface LoginPageProps {
  onNavigate: (screen: Screen) => void;
  onLoginSuccess: (role: UserRole) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onNavigate, onLoginSuccess }) => {
  const [username, setUsername] = useState('eleanor.vance');
  const [password, setPassword] = useState('SecurePass123!');
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onLoginSuccess('ACCOUNT_HOLDER');
    }, 600);
  };

  const fillCredentials = (user: string, role: UserRole) => {
    setUsername(user);
    setPassword('SecurePass123!');
    if (role === 'ADMIN' || role === 'AUDITOR') {
      onLoginSuccess(role);
      onNavigate('admin-dashboard');
    } else {
      onLoginSuccess('ACCOUNT_HOLDER');
      onNavigate('dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-main-bg flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div
          onClick={() => onNavigate('landing')}
          className="inline-flex items-center gap-3 cursor-pointer group"
        >
          <div className="w-12 h-12 rounded-2xl bg-deep-purple flex items-center justify-center text-white shadow-sm group-hover:bg-deep-purple-hover transition-colors">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <div className="text-left">
            <span className="font-extrabold text-xl tracking-tight text-primary-text block">
              BALANCE<span className="text-deep-purple">VAULT</span>
            </span>
            <span className="text-[10px] uppercase font-bold tracking-widest text-secondary-text block">
              Trust in Every Transaction
            </span>
          </div>
        </div>
        <h2 className="mt-6 text-2xl font-bold tracking-tight text-primary-text">
          Sign In to Your Vault
        </h2>
        <p className="mt-1 text-xs text-secondary-text">
          Access your secured accounts, ledger entries, and statements.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 sm:px-10 rounded-2xl border border-app-border shadow-card">
          <form className="space-y-5" onSubmit={handleLogin}>
            <InputField
              label="Username or Email"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. eleanor.vance"
              required
            />

            <PasswordInput
              label="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-app-border text-deep-purple focus:ring-accent-purple w-4 h-4"
                />
                <span className="text-secondary-text font-medium">Remember this device</span>
              </label>

              <span className="font-semibold text-deep-purple hover:underline cursor-pointer">
                Forgot password?
              </span>
            </div>

            <PrimaryButton
              type="submit"
              className="w-full"
              size="lg"
              loading={loading}
              icon={<ArrowRight className="w-4 h-4" />}
              iconPosition="right"
            >
              Sign In
            </PrimaryButton>
          </form>

          {/* Quick Demo Role Selectors */}
          <div className="mt-6 pt-6 border-t border-app-border">
            <p className="text-[11px] uppercase font-bold tracking-wider text-secondary-text text-center mb-3">
              Fast Demo Switcher
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => fillCredentials('eleanor.vance', 'ACCOUNT_HOLDER')}
                className="p-2.5 rounded-xl border border-app-border bg-main-bg/60 hover:bg-pastel-lavender/40 hover:border-secondary-lilac text-left transition-colors flex items-center gap-2"
              >
                <UserCheck className="w-4 h-4 text-deep-purple shrink-0" />
                <div className="truncate">
                  <p className="font-semibold text-primary-text truncate">Customer</p>
                  <p className="text-[10px] text-secondary-text truncate">Account Holder</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => fillCredentials('admin', 'ADMIN')}
                className="p-2.5 rounded-xl border border-app-border bg-main-bg/60 hover:bg-pastel-lavender/40 hover:border-secondary-lilac text-left transition-colors flex items-center gap-2"
              >
                <Shield className="w-4 h-4 text-deep-purple shrink-0" />
                <div className="truncate">
                  <p className="font-semibold text-primary-text truncate">Admin</p>
                  <p className="text-[10px] text-secondary-text truncate">System Authority</p>
                </div>
              </button>
            </div>
          </div>

          <div className="mt-6 text-center text-xs text-secondary-text">
            Don't have a BalanceVault account?{' '}
            <span
              onClick={() => onNavigate('register')}
              className="font-bold text-deep-purple hover:underline cursor-pointer"
            >
              Open an Account
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
