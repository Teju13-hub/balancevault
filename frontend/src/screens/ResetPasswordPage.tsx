import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Lock,
  KeyRound,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Check,
  X,
} from 'lucide-react';
import balancevaultBackdrop from '../assets/balancevault-clean-backdrop.jpg';
import balancevaultIllustration from '../assets/balancevault-illustration.png';
import { api } from '../services/api';
import type { Screen } from '../types';

interface ResetPasswordPageProps {
  onNavigate: (screen: Screen) => void;
  initialToken?: string;
}

export const ResetPasswordPage: React.FC<ResetPasswordPageProps> = ({
  onNavigate,
  initialToken = '',
}) => {
  const [token, setToken] = useState(initialToken);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      const urlParams = new URLSearchParams(window.location.search);
      const urlToken = urlParams.get('token') || urlParams.get('resetToken');
      if (urlToken) {
        setToken(urlToken.trim());
      }
    }
  }, [token]);

  // Validation rules
  const hasMinLength = newPassword.length >= 8;
  const hasUpperCase = /[A-Z]/.test(newPassword);
  const hasLowerCase = /[a-z]/.test(newPassword);
  const hasNumber = /\d/.test(newPassword);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword);
  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword;

  const isFormValid =
    token.trim().length > 0 &&
    hasMinLength &&
    hasUpperCase &&
    hasLowerCase &&
    hasNumber &&
    hasSpecial &&
    passwordsMatch;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    setErrorMessage(null);
    setLoading(true);

    try {
      await api.resetPassword({
        token: token.trim(),
        newPassword,
        confirmPassword,
      });
      setSuccess(true);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to reset password. Please verify your token.');
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

        <div className="absolute right-[4%] xl:right-[6%] top-1/2 -translate-y-1/2 w-full max-w-[390px] xl:max-w-[420px] z-20">
          <div className="w-full bg-white text-[#1F1635] rounded-[26px] p-6 xl:p-7 shadow-[0_20px_50px_rgba(0,0,0,0.55),0_0_40px_rgba(124,58,237,0.18)] border border-purple-100/90 flex flex-col my-auto max-h-[calc(100vh-2rem)] overflow-y-auto">
            {/* Top Brand Logo */}
            <div
              onClick={() => onNavigate('landing')}
              className="flex items-center gap-3 cursor-pointer group mb-3.5"
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
            <div className="mb-3">
              <h1 className="text-xl font-extrabold tracking-tight text-[#1F1635] flex items-center gap-1.5 leading-tight">
                <span>Set New Password</span>
                <span className="text-lg">🔑</span>
              </h1>
              <p className="text-[11px] text-[#6B5E87] mt-0.5">
                Create a high-entropy password to protect your financial vault.
              </p>
            </div>

            {/* Error Banner */}
            {errorMessage && (
              <div className="mb-3 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-[11px] flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{errorMessage}</span>
              </div>
            )}

            {!success ? (
              <form onSubmit={handleSubmit} className="space-y-3">
                {/* Reset Token Input */}
                <div>
                  <label className="block text-[11px] font-bold text-[#1F1635] mb-1">
                    Reset Authorization Token
                  </label>
                  <div className="relative flex items-center bg-[#F9F7FC] border border-[#E4DEF0] rounded-xl px-3 py-2 focus-within:border-[#8B5CF6] focus-within:ring-2 focus-within:ring-[#DDD6FE] focus-within:bg-white transition-all">
                    <KeyRound className="w-3.5 h-3.5 text-[#7C6E96] shrink-0" />
                    <input
                      type="text"
                      value={token}
                      onChange={(e) => setToken(e.target.value)}
                      placeholder="Paste single-use reset token"
                      required
                      className="w-full bg-transparent border-0 text-[#1F1635] placeholder-[#9C92B3] text-xs focus:outline-none pl-2 font-mono"
                    />
                  </div>
                </div>

                {/* New Password */}
                <div>
                  <label className="block text-[11px] font-bold text-[#1F1635] mb-1">
                    New Password
                  </label>
                  <div className="relative flex items-center bg-[#F9F7FC] border border-[#E4DEF0] rounded-xl px-3 py-2 focus-within:border-[#8B5CF6] focus-within:ring-2 focus-within:ring-[#DDD6FE] focus-within:bg-white transition-all">
                    <Lock className="w-3.5 h-3.5 text-[#7C6E96] shrink-0" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      required
                      className="w-full bg-transparent border-0 text-[#1F1635] placeholder-[#9C92B3] text-xs focus:outline-none pl-2 pr-6"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 text-[#7C6E96] hover:text-[#1F1635]"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-[11px] font-bold text-[#1F1635] mb-1">
                    Confirm New Password
                  </label>
                  <div className="relative flex items-center bg-[#F9F7FC] border border-[#E4DEF0] rounded-xl px-3 py-2 focus-within:border-[#8B5CF6] focus-within:ring-2 focus-within:ring-[#DDD6FE] focus-within:bg-white transition-all">
                    <Lock className="w-3.5 h-3.5 text-[#7C6E96] shrink-0" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter new password"
                      required
                      className="w-full bg-transparent border-0 text-[#1F1635] placeholder-[#9C92B3] text-xs focus:outline-none pl-2 pr-6"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-2.5 text-[#7C6E96] hover:text-[#1F1635]"
                    >
                      {showConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Password Requirements Checklist */}
                <div className="p-2.5 bg-[#FAF8FD] rounded-xl border border-[#EAE2F2] text-[10px] space-y-1 text-[#6B5E87]">
                  <div className="flex items-center gap-1.5">
                    {hasMinLength ? <Check className="w-3 h-3 text-emerald-600 shrink-0" /> : <X className="w-3 h-3 text-gray-400 shrink-0" />}
                    <span className={hasMinLength ? 'text-emerald-700 font-medium' : ''}>8+ Characters</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {hasUpperCase && hasLowerCase ? <Check className="w-3 h-3 text-emerald-600 shrink-0" /> : <X className="w-3 h-3 text-gray-400 shrink-0" />}
                    <span className={hasUpperCase && hasLowerCase ? 'text-emerald-700 font-medium' : ''}>Uppercase & Lowercase Letters</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {hasNumber && hasSpecial ? <Check className="w-3 h-3 text-emerald-600 shrink-0" /> : <X className="w-3 h-3 text-gray-400 shrink-0" />}
                    <span className={hasNumber && hasSpecial ? 'text-emerald-700 font-medium' : ''}>Number & Special Character</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {passwordsMatch ? <Check className="w-3 h-3 text-emerald-600 shrink-0" /> : <X className="w-3 h-3 text-gray-400 shrink-0" />}
                    <span className={passwordsMatch ? 'text-emerald-700 font-medium' : ''}>Passwords Match</span>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="pt-1">
                  <button
                    type="submit"
                    disabled={loading || !isFormValid}
                    className="w-full bg-gradient-to-r from-[#7C3AED] via-[#8B5CF6] to-[#A855F7] hover:from-[#6D28D9] hover:to-[#9333EA] text-white font-semibold py-2.5 px-4 rounded-xl shadow-[0_6px_16px_rgba(124,58,237,0.35)] flex items-center justify-center gap-1.5 transition-all transform active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed text-xs cursor-pointer"
                  >
                    {loading ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <span>Update Password</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4 py-2">
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-center">
                  <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
                  <p className="font-bold text-emerald-900 text-sm mb-1">Password Successfully Reset!</p>
                  <p className="text-xs text-emerald-700 leading-relaxed">
                    Your password has been securely updated. You can now log in with your new credentials.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => onNavigate('login')}
                  className="w-full bg-gradient-to-r from-[#7C3AED] to-[#9333EA] hover:from-[#6D28D9] hover:to-[#7C3AED] text-white font-semibold py-3 px-4 rounded-xl shadow-md text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <span>Sign In to BalanceVault</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Back Link */}
            {!success && (
              <div className="mt-4 text-center text-[11px] text-[#6B5E87] border-t border-[#E4DEF0] pt-3">
                <button
                  type="button"
                  onClick={() => onNavigate('login')}
                  className="text-[#7C3AED] hover:text-[#6D28D9] font-bold cursor-pointer hover:underline focus:outline-none"
                >
                  Back to Sign In
                </button>
              </div>
            )}
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
            Set New Password 🔑
          </h1>
          <p className="text-xs text-[#6B5E87] mb-4">
            Create a secure password for your BalanceVault account.
          </p>

          {errorMessage && (
            <div className="mb-4 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{errorMessage}</span>
            </div>
          )}

          {!success ? (
            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#1F1635] mb-1">
                  Reset Token
                </label>
                <div className="relative flex items-center bg-[#F9F7FC] border border-[#E4DEF0] rounded-xl px-3 py-2.5">
                  <KeyRound className="w-4 h-4 text-[#7C6E96] shrink-0" />
                  <input
                    type="text"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="Enter reset token"
                    required
                    className="w-full bg-transparent border-0 text-[#1F1635] text-xs pl-2 font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1F1635] mb-1">
                  New Password
                </label>
                <div className="relative flex items-center bg-[#F9F7FC] border border-[#E4DEF0] rounded-xl px-3 py-2.5">
                  <Lock className="w-4 h-4 text-[#7C6E96] shrink-0" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    required
                    className="w-full bg-transparent border-0 text-[#1F1635] text-xs pl-2 pr-7 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 text-[#7C6E96]"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1F1635] mb-1">
                  Confirm Password
                </label>
                <div className="relative flex items-center bg-[#F9F7FC] border border-[#E4DEF0] rounded-xl px-3 py-2.5">
                  <Lock className="w-4 h-4 text-[#7C6E96] shrink-0" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    required
                    className="w-full bg-transparent border-0 text-[#1F1635] text-xs pl-2 pr-7 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-2.5 text-[#7C6E96]"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !isFormValid}
                className="w-full bg-gradient-to-r from-[#7C3AED] to-[#9333EA] text-white font-semibold py-3 rounded-xl shadow-md text-xs flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Update Password</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          ) : (
            <div className="space-y-4 py-2">
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-center">
                <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-2" />
                <p className="font-bold text-emerald-900 text-sm mb-1">Password Successfully Reset!</p>
                <p className="text-xs text-emerald-700">
                  Your password has been updated. You can now sign in.
                </p>
              </div>

              <button
                type="button"
                onClick={() => onNavigate('login')}
                className="w-full bg-gradient-to-r from-[#7C3AED] to-[#9333EA] text-white font-semibold py-3 rounded-xl shadow-md text-xs flex items-center justify-center gap-2"
              >
                <span>Sign In Now</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="mt-5 text-center text-xs text-[#6B5E87]">
            <button
              type="button"
              onClick={() => onNavigate('login')}
              className="text-[#7C3AED] font-bold hover:underline"
            >
              Back to Sign In
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

