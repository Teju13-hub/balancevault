import React, { useState } from 'react';
import {
  ShieldCheck,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';
import balancevaultBackdrop from '../assets/balancevault-clean-backdrop.jpg';
import balancevaultIllustration from '../assets/balancevault-illustration.png';
import { api, authStorage } from '../services/api';
import type { Screen, UserProfile } from '../types';

interface LoginPageProps {
  onNavigate: (screen: Screen) => void;
  onLoginSuccess: (user: UserProfile) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onNavigate, onLoginSuccess }) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);

    try {
      const isEmail = identifier.includes('@');
      const authData = await api.login({
        email: isEmail ? identifier.trim() : undefined,
        username: !isEmail ? identifier.trim() : undefined,
        password,
      });

      const userProfile: UserProfile = {
        id: authData.username,
        username: authData.username,
        email: authData.email,
        fullName: authData.fullName,
        role: authData.role,
        phone: '+1 (555) 019-2834',
        tier: authData.role === 'ADMIN' ? 'Enterprise Vault' : 'Premium Tier',
        kycStatus: 'VERIFIED',
        joinedDate: 'November 2026',
        twoFactorEnabled: true,
      };

      authStorage.setSession(authData.token, userProfile);
      onLoginSuccess(userProfile);
    } catch (err: any) {
      setErrorMessage(err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#140A28] relative select-none font-sans m-0 p-0">
      
      {/* ============================================================ */}
      {/* FULL-BLEED DESKTOP VIEW (Edge-to-Edge, NO black borders, NO cutoff) */}
      {/* ============================================================ */}
      <div className="hidden lg:block absolute inset-0 w-full h-full overflow-hidden">
        
        {/* Fullscreen Edge-to-Edge Clean Backdrop (Left 3D hero scene + Purple atmosphere) */}
        <img
          src={balancevaultBackdrop}
          alt="BalanceVault Financial Ecosystem"
          className="absolute inset-0 w-full h-full object-cover object-left xl:object-center pointer-events-none"
        />

        {/* Floating White Login Card - Perfectly Vertically Centered & Never Cut Off */}
        <div className="absolute right-[4%] xl:right-[6%] top-1/2 -translate-y-1/2 w-full max-w-[390px] xl:max-w-[410px] z-20">
          <div className="w-full bg-white text-[#1F1635] rounded-[26px] p-6 xl:p-7 shadow-[0_20px_50px_rgba(0,0,0,0.55),0_0_40px_rgba(124,58,237,0.18)] border border-purple-100/90 flex flex-col my-auto">
            
            {/* Top Brand Logo & Tagline */}
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
            <div className="mb-3.5">
              <h1 className="text-xl font-extrabold tracking-tight text-[#1F1635] flex items-center gap-1.5 leading-tight">
                <span>Hello, Welcome Back!</span>
                <span className="text-lg">👋</span>
              </h1>
              <p className="text-[11px] text-[#6B5E87] mt-0.5">
                Sign in to access your secure financial vault
              </p>
            </div>

            {/* Error Banner */}
            {errorMessage && (
              <div className="mb-3 p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-[11px] flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-500" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleLogin} className="space-y-3">
              {/* Email Address */}
              <div>
                <label className="block text-[11px] font-bold text-[#1F1635] mb-1">
                  Email Address
                </label>
                <div className="relative flex items-center bg-[#F9F7FC] border border-[#E4DEF0] rounded-xl px-3 py-2 focus-within:border-[#8B5CF6] focus-within:ring-2 focus-within:ring-[#DDD6FE] focus-within:bg-white transition-all">
                  <Mail className="w-3.5 h-3.5 text-[#7C6E96] shrink-0" />
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="Enter your email or username"
                    required
                    className="w-full bg-transparent border-0 text-[#1F1635] placeholder-[#9C92B3] text-xs focus:outline-none pl-2"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-[11px] font-bold text-[#1F1635] mb-1">
                  Password
                </label>
                <div className="relative flex items-center bg-[#F9F7FC] border border-[#E4DEF0] rounded-xl px-3 py-2 focus-within:border-[#8B5CF6] focus-within:ring-2 focus-within:ring-[#DDD6FE] focus-within:bg-white transition-all">
                  <Lock className="w-3.5 h-3.5 text-[#7C6E96] shrink-0" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    className="w-full bg-transparent border-0 text-[#1F1635] placeholder-[#9C92B3] text-xs focus:outline-none pl-2 pr-6"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 text-[#7C6E96] hover:text-[#1F1635] transition-colors focus:outline-none"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeOff className="w-3.5 h-3.5" />
                    ) : (
                      <Eye className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Options */}
              <div className="flex items-center justify-between text-[11px] pt-0.5">
                <label className="flex items-center gap-1.5 cursor-pointer select-none text-[#6B5E87]">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-3.5 h-3.5 rounded bg-[#F9F7FC] border-[#E4DEF0] text-[#7C3AED] focus:ring-[#8B5CF6] focus:ring-offset-0 cursor-pointer accent-[#7C3AED]"
                  />
                  <span className="text-[10px] text-[#6B5E87]">
                    Remember me for 30 days
                  </span>
                </label>

                <button
                  type="button"
                  onClick={() => onNavigate('forgot-password')}
                  className="text-[10px] text-[#7C3AED] hover:text-[#6D28D9] font-semibold cursor-pointer transition-colors focus:outline-none"
                >
                  Forgot password?
                </button>
              </div>

              {/* Sign In Button */}
              <div className="pt-1">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-[#7C3AED] via-[#8B5CF6] to-[#A855F7] hover:from-[#6D28D9] hover:to-[#9333EA] text-white font-semibold py-2.5 px-4 rounded-xl shadow-[0_6px_16px_rgba(124,58,237,0.35)] flex items-center justify-center gap-1.5 transition-all transform active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed text-xs cursor-pointer"
                >
                  {loading ? (
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Sign In</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* OR Divider */}
            <div className="relative my-3 text-center">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#E4DEF0]" />
              </div>
              <span className="relative bg-white px-2.5 text-[9px] font-bold tracking-wider text-[#9C92B3] uppercase">
                OR
              </span>
            </div>

            {/* Bottom Link */}
            <div className="text-center text-[11px] text-[#6B5E87]">
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => onNavigate('register')}
                className="text-[#7C3AED] hover:text-[#6D28D9] font-bold cursor-pointer ml-1 hover:underline focus:outline-none"
              >
                Create Account
              </button>
            </div>
          </div>
        </div>



      </div>

      {/* ============================================================ */}
      {/* MOBILE & TABLET RESPONSIVE VIEW                              */}
      {/* ============================================================ */}
      <div className="block lg:hidden w-full min-h-screen overflow-y-auto p-4 flex flex-col justify-between">
        
        {/* Top Hero Card for mobile */}
        <div className="mb-4 rounded-2xl overflow-hidden shadow-lg border border-purple-500/20 bg-[#140A28] max-w-md mx-auto">
          <img
            src={balancevaultIllustration}
            alt="BalanceVault Banking Vault and Mascot"
            className="w-full h-auto object-contain block"
          />
        </div>

        {/* Mobile White Login Card */}
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
            Hello, Welcome Back! 👋
          </h1>
          <p className="text-xs text-[#6B5E87] mb-4">
            Sign in to access your secure financial vault
          </p>

          {errorMessage && (
            <div className="mb-4 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-[#1F1635] mb-1">
                Email Address
              </label>
              <div className="relative flex items-center bg-[#F9F7FC] border border-[#E4DEF0] rounded-xl px-3 py-2.5">
                <Mail className="w-4 h-4 text-[#7C6E96] shrink-0" />
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Enter your email or username"
                  required
                  className="w-full bg-transparent border-0 text-[#1F1635] placeholder-[#9C92B3] text-xs pl-2 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1F1635] mb-1">
                Password
              </label>
              <div className="relative flex items-center bg-[#F9F7FC] border border-[#E4DEF0] rounded-xl px-3 py-2.5">
                <Lock className="w-4 h-4 text-[#7C6E96] shrink-0" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="w-full bg-transparent border-0 text-[#1F1635] placeholder-[#9C92B3] text-xs pl-2 pr-7 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 text-[#7C6E96]"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={() => onNavigate('forgot-password')}
                  className="text-[11px] text-[#7C3AED] hover:text-[#6D28D9] font-medium"
                >
                  Forgot password?
                </button>
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
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-4 text-center text-xs text-[#6B5E87]">
            Don't have an account?{' '}
            <button
              type="button"
              onClick={() => onNavigate('register')}
              className="text-[#7C3AED] font-bold hover:underline"
            >
              Create Account
            </button>
          </div>
        </div>

        {/* Mobile footer */}
        <div className="mt-4 text-center text-[11px] text-purple-300/50">
          Your Security. Our Priority. • © 2026 BalanceVault.
        </div>
      </div>

    </div>
  );
};
