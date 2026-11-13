import React from 'react';
import {
  ShieldCheck,
  Lock,
  Database,
  ArrowRight,
  FileCheck,
  ChevronRight,
} from 'lucide-react';
import { PrimaryButton } from '../components/PrimaryButton';
import { SecondaryButton } from '../components/SecondaryButton';
import type { Screen } from '../types';

interface LandingPageProps {
  onNavigate: (screen: Screen) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigate }) => {
  return (
    <div className="min-h-screen bg-light-bg text-primary-text flex flex-col">
      {/* Top Navigation */}
      <header className="border-b border-app-border bg-white/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-deep-purple flex items-center justify-center text-white shadow-sm">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <span className="font-extrabold text-lg tracking-tight text-primary-text block">
                BALANCE<span className="text-deep-purple">VAULT</span>
              </span>
              <span className="text-[10px] uppercase font-bold tracking-widest text-secondary-text block">
                Trust in Every Transaction
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <SecondaryButton onClick={() => onNavigate('login')}>
              Sign In
            </SecondaryButton>
            <PrimaryButton onClick={() => onNavigate('register')} icon={<ArrowRight className="w-4 h-4" />} iconPosition="right">
              Open Account
            </PrimaryButton>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="relative overflow-hidden pt-16 pb-20 lg:pt-24 lg:pb-32 px-6">
          <div className="max-w-5xl mx-auto text-center relative z-10">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-primary-text leading-[1.15]">
              Institutional-Grade Money Movement with{' '}
              <span className="text-deep-purple underline decoration-secondary-lilac decoration-wavy decoration-2">
                Absolute Proof
              </span>
            </h1>

            <p className="mt-6 text-base sm:text-lg text-secondary-text max-w-2xl mx-auto leading-relaxed">
              BalanceVault delivers high-assurance ledgering with strict server-side authorization,
              immutable append-only database triggers, and 256-bit cryptographic verification.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <PrimaryButton
                size="lg"
                onClick={() => onNavigate('dashboard')}
                icon={<ChevronRight className="w-5 h-5" />}
                iconPosition="right"
                className="w-full sm:w-auto"
              >
                Explore Customer Dashboard
              </PrimaryButton>
              <SecondaryButton
                size="lg"
                onClick={() => onNavigate('admin-dashboard')}
                icon={<ShieldCheck className="w-5 h-5" />}
                className="w-full sm:w-auto"
              >
                Enter Admin Portal
              </SecondaryButton>
            </div>

            {/* Metrics Band */}
            <div className="mt-16 pt-12 border-t border-app-border grid grid-cols-2 md:grid-cols-4 gap-6 text-left">
              <div className="p-4 rounded-xl bg-white border border-app-border shadow-subtle">
                <span className="text-xs uppercase font-semibold text-secondary-text tracking-wider">Precision</span>
                <p className="text-2xl font-bold text-deep-purple mt-1">NUMERIC(19,4)</p>
                <p className="text-[11px] text-secondary-text mt-0.5">Zero floating-point rounding errors</p>
              </div>
              <div className="p-4 rounded-xl bg-white border border-app-border shadow-subtle">
                <span className="text-xs uppercase font-semibold text-secondary-text tracking-wider">Integrity</span>
                <p className="text-2xl font-bold text-deep-purple mt-1">Append-Only</p>
                <p className="text-[11px] text-secondary-text mt-0.5">Enforced via DB triggers</p>
              </div>
              <div className="p-4 rounded-xl bg-white border border-app-border shadow-subtle">
                <span className="text-xs uppercase font-semibold text-secondary-text tracking-wider">Access Control</span>
                <p className="text-2xl font-bold text-deep-purple mt-1">Zero Leakage</p>
                <p className="text-[11px] text-secondary-text mt-0.5">404 on cross-account probes</p>
              </div>
              <div className="p-4 rounded-xl bg-white border border-app-border shadow-subtle">
                <span className="text-xs uppercase font-semibold text-secondary-text tracking-wider">Security</span>
                <p className="text-2xl font-bold text-deep-purple mt-1">BCrypt + JWT</p>
                <p className="text-[11px] text-secondary-text mt-0.5">Stateless role-verified sessions</p>
              </div>
            </div>
          </div>
        </section>

        {/* Feature Cards Section */}
        <section className="py-20 bg-white border-y border-app-border px-6">
          <div className="max-w-7xl mx-auto">
            <div className="text-center max-w-2xl mx-auto mb-16">
              <span className="text-xs font-bold uppercase tracking-widest text-deep-purple">Core Architecture</span>
              <h2 className="text-3xl font-extrabold tracking-tight text-primary-text mt-2">
                Engineered for High-Reliability Finance
              </h2>
              <p className="text-sm text-secondary-text mt-3">
                Built strictly to financial specifications: no arbitrary mutations, no unauthorized account access, and comprehensive audit trails.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-light-bg rounded-2xl p-8 border border-app-border shadow-subtle hover:shadow-card transition-all">
                <div className="w-12 h-12 rounded-xl bg-pastel-lavender border border-secondary-lilac flex items-center justify-center text-deep-purple mb-6">
                  <Database className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-primary-text mb-2">Immutable Double-Entry Ledger</h3>
                <p className="text-xs text-secondary-text leading-relaxed">
                  Every monetary event creates corresponding debit and credit records. PostgreSQL triggers actively prohibit UPDATE and DELETE operations at the engine level.
                </p>
              </div>

              <div className="bg-light-bg rounded-2xl p-8 border border-app-border shadow-subtle hover:shadow-card transition-all">
                <div className="w-12 h-12 rounded-xl bg-pastel-lavender border border-secondary-lilac flex items-center justify-center text-deep-purple mb-6">
                  <Lock className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-primary-text mb-2">Server-Side Ownership Verification</h3>
                <p className="text-xs text-secondary-text leading-relaxed">
                  Every API request validating account balances checks cryptographic ownership on the backend. Requests targeting foreign account IDs return 404 to avoid ID enumeration.
                </p>
              </div>

              <div className="bg-light-bg rounded-2xl p-8 border border-app-border shadow-subtle hover:shadow-card transition-all">
                <div className="w-12 h-12 rounded-xl bg-pastel-lavender border border-secondary-lilac flex items-center justify-center text-deep-purple mb-6">
                  <FileCheck className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-primary-text mb-2">Continuous Audit Traceability</h3>
                <p className="text-xs text-secondary-text leading-relaxed">
                  Dedicated auditor roles with full visibility into chronological event streams, system migrations, and security event logs without mutational rights.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-app-border py-8 px-6 text-center text-xs text-secondary-text">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 BalanceVault. Trust in Every Transaction. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <span className="hover:text-deep-purple cursor-pointer">Security Protocol</span>
            <span className="hover:text-deep-purple cursor-pointer">Flyway Validated</span>
            <span className="hover:text-deep-purple cursor-pointer">Privacy Notice</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

