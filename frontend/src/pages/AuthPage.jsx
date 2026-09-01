import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useMusic } from '../context/MusicContext';
import { Lock, Mail, User, Eye, EyeOff, ArrowRight, X, Sparkles, Headphones, Zap } from 'lucide-react';
import { playSound } from '../utils/soundEffects';

export function AuthPage({ onAuthenticated }) {
  const { login, register, guestLogin } = useAuth();
  const { appTitle } = useMusic();
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);

  const EMAIL_REGEX = /^[^s@]+@[^s@]+.[^s@]+$/;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (isRegister) {
      if (!username.trim() || !email.trim() || !password) {
        setError('All fields are required.');
        playSound('quiz_wrong');
        return;
      }
      if (!EMAIL_REGEX.test(email.trim())) {
        setError('Please enter a valid email address.');
        playSound('quiz_wrong');
        return;
      }
      if (username.trim().length < 2) {
        setError('Username must be at least 2 characters.');
        playSound('quiz_wrong');
        return;
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters long.');
        playSound('quiz_wrong');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        playSound('quiz_wrong');
        return;
      }
    } else {
      if (!username.trim() || !password) {
        setError('Please enter your username/email and password.');
        playSound('quiz_wrong');
        return;
      }
    }

    setLoading(true);

    try {
      if (isRegister) {
        await register({
          username: username.trim(),
          email: email.trim().toLowerCase(),
          password
        });
      } else {
        await login({
          username: username.trim(),
          password
        });
      }
      playSound('quiz_correct');
      if (onAuthenticated) onAuthenticated();
    } catch (err) {
      setError(err.message || 'Authentication failed. Please check credentials and try again.');
      playSound('quiz_wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleGuestEntry = async () => {
    setGuestLoading(true);
    try {
      if (guestLogin) {
        await guestLogin();
      }
      playSound('quiz_correct');
      if (onAuthenticated) onAuthenticated();
    } catch (err) {
      setError('Guest login failed. Please try signing up.');
    } finally {
      setGuestLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-3 sm:p-6 select-none relative overflow-hidden">
      {/* Ambient Background Glow */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-teal-500/15 rounded-full blur-3xl pointer-events-none" />

      {/* Auth Card */}
      <div className="w-full max-w-md glass-panel p-6 sm:p-8 rounded-3xl border border-emerald-500/40 shadow-2xl bg-slate-950/90 relative z-10 space-y-6 animate-in zoom-in-95 duration-200">
        {/* Top Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 p-[1.5px] shadow-lg shadow-emerald-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-lg text-emerald-400">
                ⚡
              </div>
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white">DuoCore</h2>
              <p className="text-[10px] text-emerald-400 font-semibold font-mono">Music & 1v1 Stealth Duo Chat</p>
            </div>
          </div>
        </div>

        {/* Tab Switcher: Sign In vs Create Account */}
        <div className="grid grid-cols-2 p-1 rounded-2xl bg-slate-900 border border-slate-800 text-xs font-bold">
          <button
            type="button"
            onClick={() => { setIsRegister(false); setError(''); }}
            className={`py-2.5 rounded-xl transition-all ${
              !isRegister ? 'bg-emerald-500 text-slate-950 font-black shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setIsRegister(true); setError(''); }}
            className={`py-2.5 rounded-xl transition-all ${
              isRegister ? 'bg-emerald-500 text-slate-950 font-black shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            Create Account
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-2xl bg-red-950/60 border border-red-500/40 text-red-300 text-xs text-center font-semibold animate-in fade-in">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1">Username or Email</label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
              <input
                type="text"
                required
                placeholder={isRegister ? 'Choose a unique username' : 'Enter username or email'}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full glass-input rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-slate-500"
              />
            </div>
          </div>

          {isRegister && (
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full glass-input rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-slate-500"
                />
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full glass-input rounded-xl pl-10 pr-10 py-2.5 text-xs text-white placeholder:text-slate-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 text-slate-500 hover:text-white"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {isRegister && (
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Confirm Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Re-type password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full glass-input rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-slate-500"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/30 transition-transform active:scale-95 disabled:opacity-50 mt-2"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>{isRegister ? 'Create DuoCore Account' : 'Sign In to DuoCore'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* 1-Click Fast Guest Entry */}
        <div className="pt-3 border-t border-slate-800/80 text-center space-y-2">
          <button
            type="button"
            onClick={handleGuestEntry}
            disabled={guestLoading}
            className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-700 text-xs font-bold text-slate-200 hover:text-emerald-400 transition-all flex items-center justify-center gap-2 shadow-sm active:scale-95 disabled:opacity-50"
          >
            <Zap className="w-3.5 h-3.5 text-yellow-400 fill-current" />
            <span>{guestLoading ? 'Starting Session...' : '⚡ Continue as Quick Guest (Fast Duo)'}</span>
          </button>
          <p className="text-[10px] text-slate-500">No registration required • Instant temporary session</p>
        </div>
      </div>
    </div>
  );
}
