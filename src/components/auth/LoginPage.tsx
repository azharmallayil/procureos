import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Shield,
  Lock,
  Mail,
  Eye,
  EyeOff,
  AlertTriangle,
  Clock,
  CheckCircle2,
  LogIn,
  ShieldAlert,
  Sun,
  Moon,
  Palette,
} from 'lucide-react';
import { useAuth, validatePasswordPolicy } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function msToCountdown(ms: number): string {
  if (ms <= 0) return '';
  const secs = Math.ceil(ms / 1000);
  if (secs < 60) return `${secs}s`;
  const mins = Math.ceil(secs / 60);
  return `${mins} min`;
}

// ─── PasswordStrengthMeter ────────────────────────────────────────────────────

function PasswordStrengthMeter({ password }: { password: string }) {
  const checks = [
    { label: '12+ characters', ok: password.length >= 12 },
    { label: 'Uppercase (A-Z)', ok: /[A-Z]/.test(password) },
    { label: 'Lowercase (a-z)', ok: /[a-z]/.test(password) },
    { label: 'Number (0-9)', ok: /[0-9]/.test(password) },
    { label: 'Special char (!@#…)', ok: /[^A-Za-z0-9]/.test(password) },
  ];
  const score = checks.filter((c) => c.ok).length;
  const colors = ['bg-red-500', 'bg-red-400', 'bg-amber-400', 'bg-yellow-400', 'bg-emerald-400'];
  const labels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
  return (
    <div className="space-y-2 mt-2">
      <div className="flex gap-1">
        {colors.map((c, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
              i < score ? c : 'bg-slate-700'
            }`}
          />
        ))}
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-slate-400">{labels[Math.max(0, score - 1)] ?? ''}</span>
        <div className="flex gap-3 flex-wrap justify-end">
          {checks.map((c) => (
            <span
              key={c.label}
              className={`text-[10px] flex items-center gap-1 ${
                c.ok ? 'text-emerald-400' : 'text-slate-500'
              }`}
            >
              <CheckCircle2 className={`w-3 h-3 ${c.ok ? 'text-emerald-400' : 'text-slate-600'}`} />
              {c.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main LoginPage ───────────────────────────────────────────────────────────

export const LoginPage: React.FC = () => {
  const { login, mustChangePassword, changePassword, isAuthenticated } = useAuth();
  const { themeMode, themeStyle, toggleThemeMode, setThemeStyle } = useTheme();

  // ── Login form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lockoutMs, setLockoutMs] = useState(0);
  const lockTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Change-password form state
  const [oldPass, setOldPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [changeError, setChangeError] = useState('');
  const [changeSuccess, setChangeSuccess] = useState(false);
  const [isChanging, setIsChanging] = useState(false);

  // ── Lockout countdown
  useEffect(() => {
    if (lockoutMs <= 0) return;
    lockTimerRef.current = setInterval(() => {
      setLockoutMs((prev) => {
        const next = prev - 1000;
        if (next <= 0) {
          clearInterval(lockTimerRef.current!);
          return 0;
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(lockTimerRef.current!);
  }, [lockoutMs]);

  // ── Prevent autocomplete injection after lock
  const emailRef = useRef<HTMLInputElement>(null);
  const passRef = useRef<HTMLInputElement>(null);

  const handleLogin = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (isSubmitting || lockoutMs > 0) return;
      setError('');
      setIsSubmitting(true);

      // XSS / injection guard on email field
      if (/<|>|script/i.test(email)) {
        setError('Invalid input detected.');
        setIsSubmitting(false);
        return;
      }

      const result = await login(email.trim(), password);
      setIsSubmitting(false);

      if (!result.ok) {
        setError(result.error);
        if (result.lockoutMs) setLockoutMs(result.lockoutMs);
        setPassword('');
        passRef.current?.focus();
      }
    },
    [email, password, isSubmitting, lockoutMs, login]
  );

  const handleChangePassword = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (isChanging) return;
      setChangeError('');

      if (newPass !== confirmPass) {
        setChangeError('New passwords do not match.');
        return;
      }
      const policyErr = validatePasswordPolicy(newPass);
      if (policyErr) {
        setChangeError(policyErr);
        return;
      }

      setIsChanging(true);
      const result = await changePassword(oldPass, newPass);
      setIsChanging(false);

      if (result.ok) {
        setChangeSuccess(true);
      } else {
        setChangeError(result.error ?? 'An error occurred.');
      }
    },
    [oldPass, newPass, confirmPass, isChanging, changePassword]
  );

  // ── Render: Force-change-password screen ─────────────────────────────────
  if (isAuthenticated && mustChangePassword) {
    return (
      <div className="min-h-screen bg-app flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="flex flex-col items-center mb-8">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mb-4">
              <ShieldAlert className="w-7 h-7 text-amber-400" />
            </div>
            <h1 className="text-xl font-bold text-slate-100">Change Your Password</h1>
            <p className="text-sm text-slate-400 mt-1 text-center">
              You must set a new password before continuing. Choose a strong, unique password.
            </p>
          </div>

          <div className="bg-slate-900/80 border border-slate-700/60 rounded-2xl p-6 shadow-2xl backdrop-blur-sm">
            {changeSuccess ? (
              <div className="text-center py-6">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                <p className="text-emerald-300 font-semibold">Password changed successfully!</p>
                <p className="text-slate-400 text-sm mt-1">You can now access the system.</p>
                <button
                  onClick={() => window.location.reload()}
                  className="mt-4 px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition-colors"
                >
                  Continue to Dashboard
                </button>
              </div>
            ) : (
              <form onSubmit={handleChangePassword} noValidate autoComplete="off" className="space-y-4">
                {/* Current password */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Current (Temporary) Password
                  </label>
                  <div className="relative">
                    <input
                      type={showOld ? 'text' : 'password'}
                      value={oldPass}
                      onChange={(e) => setOldPass(e.target.value)}
                      required
                      autoComplete="current-password"
                      className="w-full px-4 py-2.5 pr-10 bg-slate-800/70 border border-slate-700 rounded-xl text-slate-100 text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/60 transition-all"
                      placeholder="Enter current password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowOld((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                      tabIndex={-1}
                    >
                      {showOld ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* New password */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showNew ? 'text' : 'password'}
                      value={newPass}
                      onChange={(e) => setNewPass(e.target.value)}
                      required
                      autoComplete="new-password"
                      className="w-full px-4 py-2.5 pr-10 bg-slate-800/70 border border-slate-700 rounded-xl text-slate-100 text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/60 transition-all"
                      placeholder="Create a strong new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                      tabIndex={-1}
                    >
                      {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {newPass && <PasswordStrengthMeter password={newPass} />}
                </div>

                {/* Confirm new password */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    value={confirmPass}
                    onChange={(e) => setConfirmPass(e.target.value)}
                    required
                    autoComplete="new-password"
                    className={`w-full px-4 py-2.5 bg-slate-800/70 border rounded-xl text-slate-100 text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all ${
                      confirmPass && newPass !== confirmPass
                        ? 'border-rose-500/70 focus:ring-rose-500/40'
                        : 'border-slate-700 focus:border-cyan-500/60'
                    }`}
                    placeholder="Repeat new password"
                  />
                  {confirmPass && newPass !== confirmPass && (
                    <p className="text-xs text-rose-400 mt-1">Passwords do not match.</p>
                  )}
                </div>

                {changeError && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-rose-950/50 border border-rose-700/40 text-rose-300 text-xs">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    {changeError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isChanging || !oldPass || !newPass || !confirmPass}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-emerald-600 text-white font-semibold text-sm hover:from-cyan-500 hover:to-emerald-500 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isChanging ? 'Updating...' : 'Set New Password & Continue'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Render: Standard Login ────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-app flex items-center justify-center p-4 relative overflow-hidden">
      {/* Top right theme controls */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
        <select
          value={themeStyle}
          onChange={(e) => setThemeStyle(e.target.value as any)}
          className="px-2.5 py-1.5 bg-slate-900/80 border border-slate-700/80 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-cyan-500 cursor-pointer shadow-sm"
          title="Choose workspace theme"
        >
          <option value="default">Default Industrial</option>
          <option value="glass">Glassmorphism</option>
          <option value="clean">Clean & Ergonomic</option>
        </select>
        <button
          type="button"
          onClick={toggleThemeMode}
          className="p-2 rounded-xl bg-slate-900/80 border border-slate-700/80 text-slate-300 hover:text-white transition-all shadow-sm cursor-pointer hover:scale-105 active:scale-95"
          title={`Switch to ${themeMode === 'dark' ? 'White' : 'Dark'} Mode`}
        >
          {themeMode === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-cyan-400" />}
        </button>
      </div>

      {/* Background glow effects */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-cyan-900/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-emerald-900/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo + Branding */}
        <div className="flex flex-col items-center mb-6">
          <div className="px-6 py-4 rounded-2xl bg-slate-900/90 border border-amber-500/30 flex items-center justify-center shadow-2xl shadow-amber-950/60 mb-3 backdrop-blur-md">
            <img
              src="/arabitra-logo.png"
              alt="Arabitra"
              className="h-12 sm:h-14 w-auto object-contain"
            />
          </div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-slate-100 tracking-tight">
              Arabitra <span className="text-amber-400">ProcureOS</span>
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-500/30">
              Enterprise
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">Fleet & Industrial Procurement Operations • Powered by Fitco</p>
        </div>

        {/* Login Card */}
        <div className="bg-slate-900/80 border border-slate-700/60 rounded-2xl p-8 shadow-2xl backdrop-blur-sm">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-slate-100">Secure Sign In</h2>
            <p className="text-xs text-slate-400 mt-1">
              Enter your corporate credentials. Access is logged and monitored.
            </p>
          </div>

          <form onSubmit={handleLogin} noValidate autoComplete="off" className="space-y-5">
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-slate-300 mb-1.5">
                Corporate Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                <input
                  id="email"
                  ref={emailRef}
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(''); }}
                  required
                  autoComplete="email"
                  disabled={lockoutMs > 0 || isSubmitting}
                  inputMode="email"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-800/70 border border-slate-700 rounded-xl text-slate-100 text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/60 transition-all disabled:opacity-50"
                  placeholder="you@arabitra.com"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                <input
                  id="password"
                  ref={passRef}
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(''); }}
                  required
                  autoComplete="current-password"
                  disabled={lockoutMs > 0 || isSubmitting}
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-800/70 border border-slate-700 rounded-xl text-slate-100 text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/60 transition-all disabled:opacity-50"
                  placeholder="••••••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  tabIndex={-1}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error / Lockout banner */}
            {lockoutMs > 0 && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-950/50 border border-rose-700/40 text-rose-300 text-xs">
                <Clock className="w-4 h-4 shrink-0" />
                <span>
                  Account temporarily locked. Retry in{' '}
                  <span className="font-bold tabular-nums">{msToCountdown(lockoutMs)}</span>.
                </span>
              </div>
            )}

            {error && lockoutMs <= 0 && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-rose-950/50 border border-rose-700/40 text-rose-300 text-xs">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting || lockoutMs > 0 || !email || !password}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-emerald-600 text-white font-semibold text-sm hover:from-cyan-500 hover:to-emerald-500 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-cyan-900/30 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Authenticating…
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  Sign In
                </>
              )}
            </button>
          </form>

          {/* Quick Access Account Shortcuts */}
          <div className="mt-5 pt-4 border-t border-slate-800 space-y-2">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Production Super Admin Access
            </p>
            <button
              type="button"
              onClick={() => {
                setEmail('admin@procureos.com');
                setPassword('admin@251');
                setError('');
              }}
              className="w-full px-3.5 py-2.5 rounded-xl bg-cyan-950/40 hover:bg-cyan-900/50 border border-cyan-500/40 text-cyan-300 text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer text-left shadow-sm"
            >
              <span>⚡ Admin Console (admin@procureos.com)</span>
              <span className="text-[10px] text-cyan-400 font-mono">Fill & Sign In</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setEmail('muhammed.azhar@arabitra.com');
                setPassword('admin@251');
                setError('');
              }}
              className="w-full px-3.5 py-2.5 rounded-xl bg-amber-950/40 hover:bg-amber-900/50 border border-amber-500/40 text-amber-300 text-xs font-semibold flex items-center justify-between transition-colors cursor-pointer text-left shadow-sm"
            >
              <span>⚡ Executive Admin (muhammed.azhar@arabitra.com)</span>
              <span className="text-[10px] text-amber-400 font-mono">Fill & Sign In</span>
            </button>
          </div>

          {/* Security notice */}
          <div className="mt-6 pt-4 border-t border-slate-800 space-y-2">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
              <Shield className="w-3.5 h-3.5 text-cyan-600 shrink-0" />
              256-bit PBKDF2-SHA256 credentials · HTTPS enforced · Session expires in 8h
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
              <Lock className="w-3.5 h-3.5 text-cyan-600 shrink-0" />
              Brute-force protection · Idle auto-logout · Audit logging active
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-[11px] text-slate-600 mt-6">
          Unauthorized access is prohibited and punishable by law.
          All sessions are monitored and recorded.
        </p>
      </div>
    </div>
  );
};

