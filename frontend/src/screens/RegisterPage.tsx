import React, { useState, useEffect } from 'react';
import {
  Shield,
  Lock,
  User,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  KeyRound,
  ArrowLeft,
} from 'lucide-react';
import vaultIllustration from '../assets/vault-illustration.png';
import { api, authStorage } from '../services/api';
import type { Screen, UserProfile } from '../types';

interface RegisterPageProps {
  onNavigate: (screen: Screen) => void;
  onRegisterSuccess: (user: UserProfile) => void;
}

export const RegisterPage: React.FC<RegisterPageProps> = ({ onNavigate, onRegisterSuccess }) => {
  // Step: 'details' | 'otp'
  const [step, setStep] = useState<'details' | 'otp'>('details');

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  // OTP Fields
  const [otp, setOtp] = useState('');
  const [cooldown, setCooldown] = useState(60);
  const [canResend, setCanResend] = useState(false);

  // Status & Feedback
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Countdown timer for OTP resend
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (step === 'otp' && cooldown > 0) {
      setCanResend(false);
      timer = setInterval(() => {
        setCooldown((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (cooldown === 0) {
      setCanResend(true);
    }
    return () => clearInterval(timer);
  }, [step, cooldown]);

  // Step 1: Initiate Registration
  const handleInitiate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessNotice(null);
    setLoading(true);

    try {
      const resp = await api.initiateRegistration({
        fullName: fullName.trim(),
        username: username.trim(),
        email: email.trim(),
        password,
      });

      setSuccessNotice(resp.message || 'Verification code dispatched to your email.');
      setCooldown(resp.resendCooldownSeconds || 60);
      setStep('otp');
    } catch (err: any) {
      // Fallback: If SMTP server is unconfigured, provide clear message
      setErrorMessage(err.message || 'Failed to initiate customer registration. Please verify details.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP and Activate Account
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    try {
      const authData = await api.verifyOtp({
        email: email.trim(),
        otp: otp.trim(),
      });

      const userProfile: UserProfile = {
        id: authData.username,
        username: authData.username,
        email: authData.email,
        fullName: authData.fullName,
        role: 'ACCOUNT_HOLDER',
        phone: '+91 98765 43210',
        tier: 'Standard',
        kycStatus: 'VERIFIED',
        joinedDate: 'November 2026',
        twoFactorEnabled: true,
      };

      authStorage.setSession(authData.token, userProfile);
      onRegisterSuccess(userProfile);
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid or expired verification code.');
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP
  const handleResendOtp = async () => {
    if (!canResend || loading) return;
    setErrorMessage(null);
    setSuccessNotice(null);
    setLoading(true);

    try {
      const resp = await api.resendOtp({ email: email.trim() });
      setSuccessNotice('A fresh verification code has been dispatched to your email.');
      setCooldown(resp.resendCooldownSeconds || 60);
      setCanResend(false);
    } catch (err: any) {
      setErrorMessage(err.message || 'Unable to resend verification code. Please wait.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#080414] text-white flex items-center justify-center p-4 sm:p-6 lg:p-12 relative overflow-hidden font-sans">
      {/* Ambient background glows */}
      <div className="absolute top-[-10%] left-[-5%] w-[700px] h-[700px] bg-purple-700/20 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[650px] h-[650px] bg-violet-600/15 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/3 -translate-y-1/2 w-[500px] h-[500px] bg-fuchsia-600/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Main 2-Column Responsive Grid */}
      <div className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-center relative z-10">
        
        {/* ============================================================ */}
        {/* LEFT COLUMN: Seamless illustration                          */}
        {/* ============================================================ */}
        <div className="hidden lg:flex lg:col-span-7 justify-center items-center relative select-none">
          <div className="relative w-full max-w-[580px]">
            <img
              src={vaultIllustration}
              alt="BalanceVault Safe, Mascot and Financial Assets"
              className="w-full h-auto object-contain block drop-shadow-[0_0_40px_rgba(168,85,247,0.3)]"
            />
          </div>
        </div>

        {/* ============================================================ */}
        {/* RIGHT COLUMN: Customer Registration & OTP Card              */}
        {/* ============================================================ */}
        <div className="w-full lg:col-span-5 flex justify-center items-center">
          <div className="w-full max-w-[460px] bg-[#120D22]/95 backdrop-blur-2xl border border-purple-500/25 rounded-[32px] p-7 sm:p-9 shadow-[0_24px_64px_rgba(10,5,25,0.85)] relative z-20">
            
            {/* Top Brand Logo & Tagline */}
            <div
              onClick={() => onNavigate('landing')}
              className="flex items-center gap-3.5 cursor-pointer group"
            >
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 via-purple-600 to-purple-800 p-0.5 shadow-[0_0_20px_rgba(168,85,247,0.4)] group-hover:shadow-[0_0_28px_rgba(168,85,247,0.6)] transition-all">
                <div className="w-full h-full bg-[#181130] rounded-[14px] flex items-center justify-center">
                  <Shield className="w-6 h-6 text-purple-300 fill-purple-500/30" />
                </div>
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center">
                  Balance<span className="text-purple-400">Vault</span>
                </div>
                <div className="text-xs text-purple-300/70 font-normal">
                  Secure. Smart. Trusted.
                </div>
              </div>
            </div>

            {/* Header Titles */}
            <div className="mt-6 mb-4">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                {step === 'details' ? 'Open Customer Vault' : 'Verify Email Address'}
              </h1>
              <p className="text-xs sm:text-sm text-gray-400 mt-1 font-normal">
                {step === 'details'
                  ? 'Start safeguarding your capital with immutable ledger tracking'
                  : `Enter the 6-digit security code dispatched to ${email}`}
              </p>
            </div>

            {/* Error Message Banner */}
            {errorMessage && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Success Message Banner */}
            {successNotice && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>{successNotice}</span>
              </div>
            )}

            {/* ======================================================== */}
            {/* STEP 1: Registration Form                                */}
            {/* ======================================================== */}
            {step === 'details' ? (
              <form onSubmit={handleInitiate} className="space-y-3.5">
                {/* Field 1: Full Legal Name */}
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">
                    Customer Full Legal Name
                  </label>
                  <div className="relative flex items-center bg-[#17112B] border border-purple-900/60 rounded-xl px-3.5 py-2.5 focus-within:border-purple-400 focus-within:ring-1 focus-within:ring-purple-400 transition-all">
                    <User className="w-4 h-4 text-gray-400 shrink-0" />
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Ramesh Kumar"
                      required
                      className="w-full bg-transparent border-0 text-white placeholder-gray-500 text-xs sm:text-sm focus:outline-none pl-3"
                    />
                  </div>
                </div>

                {/* Field 2: Chosen Username */}
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">
                    Customer Username
                  </label>
                  <div className="relative flex items-center bg-[#17112B] border border-purple-900/60 rounded-xl px-3.5 py-2.5 focus-within:border-purple-400 focus-within:ring-1 focus-within:ring-purple-400 transition-all">
                    <User className="w-4 h-4 text-gray-400 shrink-0" />
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="e.g. ramesh.kumar"
                      required
                      className="w-full bg-transparent border-0 text-white placeholder-gray-500 text-xs sm:text-sm focus:outline-none pl-3"
                    />
                  </div>
                </div>

                {/* Field 3: Verified Email */}
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">
                    Email Address (OTP Verification Required)
                  </label>
                  <div className="relative flex items-center bg-[#17112B] border border-purple-900/60 rounded-xl px-3.5 py-2.5 focus-within:border-purple-400 focus-within:ring-1 focus-within:ring-purple-400 transition-all">
                    <Mail className="w-4 h-4 text-gray-400 shrink-0" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@domain.com"
                      required
                      className="w-full bg-transparent border-0 text-white placeholder-gray-500 text-xs sm:text-sm focus:outline-none pl-3"
                    />
                  </div>
                </div>

                {/* Field 4: Password */}
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">
                    Secure Password
                  </label>
                  <div className="relative flex items-center bg-[#17112B] border border-purple-900/60 rounded-xl px-3.5 py-2.5 focus-within:border-purple-400 focus-within:ring-1 focus-within:ring-purple-400 transition-all">
                    <Lock className="w-4 h-4 text-gray-400 shrink-0" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Must be at least 8 characters"
                      required
                      minLength={8}
                      className="w-full bg-transparent border-0 text-white placeholder-gray-500 text-xs sm:text-sm focus:outline-none pl-3 pr-7"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-gray-400 hover:text-white transition-colors focus:outline-none"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Terms Checkbox */}
                <div className="pt-1">
                  <label className="flex items-start gap-2.5 cursor-pointer text-xs text-gray-300">
                    <input
                      type="checkbox"
                      checked={termsAccepted}
                      onChange={(e) => setTermsAccepted(e.target.checked)}
                      required
                      className="mt-0.5 w-4 h-4 rounded bg-[#17112B] border-purple-900/60 text-purple-600 focus:ring-purple-500 focus:ring-offset-0 cursor-pointer accent-purple-600"
                    />
                    <span className="text-[11px] sm:text-xs text-gray-300 leading-snug">
                      I accept the <span className="text-purple-400 font-semibold hover:underline">Vault Customer Terms</span> and confirm identity verification.
                    </span>
                  </label>
                </div>

                {/* Submit Button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading || !termsAccepted}
                    className="w-full bg-gradient-to-r from-[#8B5CF6] via-[#A855F7] to-[#9333EA] hover:from-[#9333EA] hover:to-[#7C3AED] text-white font-semibold py-3.5 px-6 rounded-xl shadow-[0_8px_24px_rgba(168,85,247,0.35)] hover:shadow-[0_12px_28px_rgba(168,85,247,0.5)] flex items-center justify-center gap-2 transition-all transform active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed text-sm cursor-pointer"
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <span>Continue to Email Verification</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            ) : (
              /* ======================================================== */
              /* STEP 2: OTP Verification Form                            */
              /* ======================================================== */
              <form onSubmit={handleVerifyOtp} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1.5">
                    6-Digit Verification Code
                  </label>
                  <div className="relative flex items-center bg-[#17112B] border border-purple-900/60 rounded-xl px-4 py-3 focus-within:border-purple-400 focus-within:ring-2 focus-within:ring-purple-500/40 transition-all">
                    <KeyRound className="w-5 h-5 text-purple-400 shrink-0" />
                    <input
                      type="text"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                      placeholder="• • • • • •"
                      required
                      autoFocus
                      className="w-full bg-transparent border-0 text-white placeholder-gray-600 text-xl font-mono tracking-[0.4em] text-center focus:outline-none"
                    />
                  </div>
                  <p className="text-[11px] text-gray-400 mt-2 text-center">
                    Check your inbox and spam folder for the BalanceVault security code.
                  </p>
                </div>

                {/* Resend Cooldown Counter */}
                <div className="flex items-center justify-between text-xs pt-1 border-t border-purple-900/30">
                  <button
                    type="button"
                    onClick={() => setStep('details')}
                    className="text-gray-400 hover:text-white flex items-center gap-1 transition-colors"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Change details</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={!canResend || loading}
                    className={`flex items-center gap-1.5 font-medium transition-colors ${
                      canResend && !loading
                        ? 'text-purple-400 hover:text-purple-300 cursor-pointer'
                        : 'text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                    <span>{canResend ? 'Resend Code' : `Resend in ${cooldown}s`}</span>
                  </button>
                </div>

                {/* Verify Button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading || otp.length !== 6}
                    className="w-full bg-gradient-to-r from-[#8B5CF6] via-[#A855F7] to-[#9333EA] hover:from-[#9333EA] hover:to-[#7C3AED] text-white font-semibold py-3.5 px-6 rounded-xl shadow-[0_8px_24px_rgba(168,85,247,0.35)] flex items-center justify-center gap-2 transition-all transform active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed text-sm cursor-pointer"
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        <span>Verify & Activate Customer Vault</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* Bottom Login Link */}
            <div className="mt-5 text-center text-xs text-gray-400">
              Already have an active Customer Vault?{' '}
              <button
                type="button"
                onClick={() => onNavigate('login')}
                className="text-purple-400 hover:text-purple-300 font-semibold cursor-pointer ml-1 hover:underline focus:outline-none"
              >
                Customer Sign In
              </button>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};
