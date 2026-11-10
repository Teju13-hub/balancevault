import React, { useState } from 'react';
import { ShieldCheck, ArrowRight, ShieldAlert } from 'lucide-react';
import { InputField } from '../components/InputField';
import { PasswordInput } from '../components/PasswordInput';
import { PrimaryButton } from '../components/PrimaryButton';
import type { Screen, UserRole } from '../types';

interface RegisterPageProps {
  onNavigate: (screen: Screen) => void;
  onRegisterSuccess: (role: UserRole) => void;
}

export const RegisterPage: React.FC<RegisterPageProps> = ({ onNavigate, onRegisterSuccess }) => {
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onRegisterSuccess('ACCOUNT_HOLDER');
    }, 600);
  };

  return (
    <div className="min-h-screen bg-light-bg flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div
          onClick={() => onNavigate('landing')}
          className="inline-flex items-center gap-3 cursor-pointer group"
        >
          <div className="w-12 h-12 rounded-2xl bg-deep-sage flex items-center justify-center text-white shadow-sm group-hover:bg-deep-sage-hover transition-colors">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <div className="text-left">
            <span className="font-extrabold text-xl tracking-tight text-primary-text block">
              BALANCE<span className="text-deep-sage">VAULT</span>
            </span>
            <span className="text-[10px] uppercase font-bold tracking-widest text-secondary-text block">
              Trust in Every Transaction
            </span>
          </div>
        </div>
        <h2 className="mt-6 text-2xl font-bold tracking-tight text-primary-text">
          Open a Verified Account
        </h2>
        <p className="mt-1 text-xs text-secondary-text">
          Start safeguarding your capital with immutable ledger tracking.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 sm:px-10 rounded-2xl border border-app-border shadow-card">
          {/* Policy Notice Box */}
          <div className="mb-6 p-3.5 rounded-xl bg-pastel-mint/40 border border-soft-sage text-deep-sage flex items-start gap-3 text-xs leading-relaxed">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <strong className="font-semibold block">Strict Security Policy</strong>
              Public registration strictly provisions accounts with the <strong className="font-bold underline">ACCOUNT_HOLDER</strong> role. Administrative and auditor credentials require cryptographic seed authorization.
            </div>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <InputField
              label="Full Legal Name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Eleanor Vance"
              required
            />

            <InputField
              label="Chosen Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. eleanor.vance"
              required
            />

            <InputField
              label="Corporate / Personal Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              required
            />

            <PasswordInput
              label="Secure Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              helperText="Must be at least 8 characters with numbers and symbols."
              required
            />

            <div className="pt-2">
              <label className="flex items-start gap-2.5 cursor-pointer text-xs">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  required
                  className="mt-0.5 rounded border-app-border text-deep-sage focus:ring-sage-green w-4 h-4"
                />
                <span className="text-secondary-text leading-snug">
                  I agree to the <span className="font-bold text-deep-sage hover:underline">Vault Terms of Service</span> and understand all ledger actions are cryptographically append-only.
                </span>
              </label>
            </div>

            <PrimaryButton
              type="submit"
              className="w-full mt-4"
              size="lg"
              loading={loading}
              disabled={!termsAccepted}
              icon={<ArrowRight className="w-4 h-4" />}
              iconPosition="right"
            >
              Complete Registration
            </PrimaryButton>
          </form>

          <div className="mt-6 text-center text-xs text-secondary-text">
            Already have an active account?{' '}
            <span
              onClick={() => onNavigate('login')}
              className="font-bold text-deep-sage hover:underline cursor-pointer"
            >
              Sign In
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

