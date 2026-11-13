import React, { useState } from 'react';
import { ShieldCheck, Mail, ArrowRight, AlertCircle, CheckCircle2, KeyRound } from 'lucide-react';
import balancevaultBackdrop from '../assets/balancevault-clean-backdrop.jpg';
import balancevaultIllustration from '../assets/balancevault-illustration.png';
import { api } from '../services/api';
import type { Screen } from '../types';

interface ForgotPasswordPageProps {
  onNavigate: (screen: Screen) => void;
}

export const ForgotPasswordPage: React.FC<ForgotPasswordPageProps> = ({ onNavigate }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    try {
      await api.forgotPassword(email);
      setSubmitted(true);
    } catch (err: any) {
      setErrorMessage(err.message || 'Unable to process password reset request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#140A28] relative select-none font-sans m-0 p-0">
      {/* FULL-BLEED DESKTOP VIEW */}
      <div className="hidden lg:block absolute inset-0 w-full h-full overflow-hidden">
        <img
          src={balancevaultBackdrop}
          alt="BalanceVault Financial Ecosystem"
          className="absolute inset-0 w-full h-full object-cover object-left xl:object-center pointer-events-none"
        />

        <div className="absolute right-[4%] xl:right-[6%] top-1/2 -translate-y-1/2 w-full max-w-[390px] xl:max-w-[410px] z-20">
          <div className="w-full bg-white text-[#1F1635] rounded-[26px] p-6 xl:p-7 shadow-[0_20px_50px_rgba(0,0,0,0.55),0_0_40px_rgba(124,58,237,0.18)] border border-purple-100/90 flex flex-col my-auto max-h-[calc(100vh-2rem)] overflow-y-auto">
            {/* Top Brand Logo */}
            <div
              onClick={() => onNavigate('landing')}
              className="flex items-center gap-3 cursor-pointer group mb-4"
            >
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#7C3AED] via-[#8B5CF6] to-[#9333EA] flex items-center justify-center text-white shadow-md group-hover:shadow-lg transition-all">
                <ShieldCheck className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="text-xl font-extrabold tracking-tight text-[#1F1635] leading-tight">
                  Balance<span className="text-[#7C3AED]">Vault</span>
                </div>
                <div className="text-[10px] text-[#6B5E87] font-medium tracking-wide">
                  Secure. Smart. Trusted.
                </div>
              </div>
            </div>

            {/* Heading */}
            <div className="mb-4">
              <h1 className="text-xl font-extrabold tracking-tight text-[#1F1635] flex items-center gap-1.5 leading-tight">
                <span>Account Recovery</span>
                <span className="text-lg">🔐</span>
              </h1>
              <p className="text-[11px] text-[#6B5E87] mt-0.5">
                Enter your registered email address to receive secure reset instructions.
              </p>
            </div>

            {/* Error Banner */}
            {errorMessage && (
              <div className="mb-3 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-[11px] flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{errorMessage}</span>
              </div>
            )}

            {!submitted ? (
              <form onSubmit={handleSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-[#1F1635] mb-1">
                    Registered Email Address
                  </label>
                  <div className="relative flex items-center bg-[#F9F7FC] border border-[#E4DEF0] rounded-xl px-3 py-2.5 focus-within:border-[#8B5CF6] focus-within:ring-2 focus-within:ring-[#DDD6FE] focus-within:bg-white transition-all">
                    <Mail className="w-4 h-4 text-[#7C6E96] shrink-0" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. your.email@example.com"
                      required
                      autoFocus
                      className="w-full bg-transparent border-0 text-[#1F1635] placeholder-[#9C92B3] text-xs focus:outline-none pl-2"
                    />
                  </div>
                </div>

                <div className="pt-1">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-[#7C3AED] via-[#8B5CF6] to-[#A855F7] hover:from-[#6D28D9] hover:to-[#9333EA] text-white font-semibold py-2.5 px-4 rounded-xl shadow-[0_6px_16px_rgba(124,58,237,0.35)] flex items-center justify-center gap-1.5 transition-all transform active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed text-xs cursor-pointer"
                  >
                    {loading ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <span>Send Reset Instructions</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-emerald-900 mb-1">Instructions Dispatched</p>
                      <p className="text-[11px] leading-relaxed text-emerald-700">
                        If an active account exists for <strong>{email}</strong>, a single-use authorization token valid for <strong>15 minutes</strong> has been sent.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 pt-1">
                  <button
                    type="button"
                    onClick={() => onNavigate('reset-password')}
                    className="w-full bg-[#8B5CF6] hover:bg-[#7C3AED] text-white font-semibold py-2.5 px-4 rounded-xl shadow text-xs flex items-center justify-center gap-1.5 transition-all"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>Enter Reset Token</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => onNavigate('login')}
                    className="w-full bg-[#F3EEFA] hover:bg-[#E9DFFA] text-[#6B5E87] hover:text-[#1F1635] font-semibold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center transition-all"
                  >
                    Back to Sign In
                  </button>
                </div>
              </div>
            )}

            {/* Footer Navigation */}
            <div className="mt-5 text-center text-[11px] text-[#6B5E87] border-t border-[#E4DEF0] pt-3">
              Remember your password?{' '}
              <button
                type="button"
                onClick={() => onNavigate('login')}
                className="text-[#7C3AED] hover:text-[#6D28D9] font-bold cursor-pointer ml-0.5 hover:underline focus:outline-none"
              >
                Sign In
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* MOBILE RESPONSIVE VIEW */}
      <div className="block lg:hidden w-full min-h-screen overflow-y-auto p-4 flex flex-col justify-between">
        <div className="mb-4 rounded-2xl overflow-hidden shadow-lg border border-purple-500/20 bg-[#140A28] max-w-md mx-auto">
          <img
            src={balancevaultIllustration}
            alt="BalanceVault Banking"
            className="w-full h-auto object-contain block"
          />
        </div>

        <div className="w-full max-w-md mx-auto bg-white text-[#1F1635] rounded-3xl p-6 sm:p-8 shadow-2xl border border-purple-100">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#7C3AED] to-[#9333EA] flex items-center justify-center text-white shadow-md">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="text-xl font-bold tracking-tight text-[#1F1635]">
                Balance<span className="text-[#7C3AED]">Vault</span>
              </div>
              <div className="text-[10px] text-[#6B5E87]">Secure. Smart. Trusted.</div>
            </div>
          </div>

          <h1 className="text-xl font-bold text-[#1F1635] mb-1">
            Account Recovery 🔐
          </h1>
          <p className="text-xs text-[#6B5E87] mb-4">
            Enter your registered email address to receive password reset instructions.
          </p>

          {errorMessage && (
            <div className="mb-4 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{errorMessage}</span>
            </div>
          )}

          {!submitted ? (
            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#1F1635] mb-1">
                  Email Address
                </label>
                <div className="relative flex items-center bg-[#F9F7FC] border border-[#E4DEF0] rounded-xl px-3 py-2.5">
                  <Mail className="w-4 h-4 text-[#7C6E96] shrink-0" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your registered email"
                    required
                    className="w-full bg-transparent border-0 text-[#1F1635] placeholder-[#9C92B3] text-xs pl-2 focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-[#7C3AED] to-[#9333EA] text-white font-semibold py-3 rounded-xl shadow-md text-xs flex items-center justify-center gap-2 mt-2"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Send Reset Instructions</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs">
                <p className="font-bold text-emerald-900 mb-1">Instructions Dispatched</p>
                <p className="text-xs text-emerald-700">
                  If an active account exists for <strong>{email}</strong>, a single-use authorization token valid for 15 minutes has been sent.
                </p>
              </div>

              <button
                type="button"
                onClick={() => onNavigate('reset-password')}
                className="w-full bg-[#8B5CF6] text-white font-semibold py-3 rounded-xl shadow-md text-xs flex items-center justify-center gap-2"
              >
                <KeyRound className="w-4 h-4" />
                <span>Enter Reset Token</span>
              </button>
            </div>
          )}

          <div className="mt-5 text-center text-xs text-[#6B5E87]">
            Remember your password?{' '}
            <button
              type="button"
              onClick={() => onNavigate('login')}
              className="text-[#7C3AED] font-bold hover:underline"
            >
              Sign In
            </button>
          </div>
        </div>

        <div className="mt-4 text-center text-[11px] text-purple-300/50">
          Your Security. Our Priority. • © 2026 BalanceVault.
        </div>
      </div>
    </div>
  );
};

