import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, Sparkles, Lock, Mail, User, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { playSound } from '../utils/soundEffects';

export function AuthPage({ onAuthenticated }) {
  const { login, register } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
        setError('Please enter a valid email address (e.g. name@domain.com).');
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
        await register(username.trim(), email.trim(), password);
      } else {
        await login(username.trim() || email.trim(), password);
      }
      playSound('quiz_correct');
      onAuthenticated();
    } catch (err) {
      setError(err.message || 'Authentication failed.');
      playSound('quiz_wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="w-full max-w-md glass-panel p-8 rounded-3xl border border-pink-500/30 shadow-2xl relative z-10 bg-slate-950/95">
        <div className="text-center mb-6">
          <div className="inline-flex w-12 h-12 rounded-2xl bg-gradient-to-tr from-pink-500 to-indigo-600 p-[1.5px] mb-3 shadow-lg shadow-pink-500/25">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-xl">
              🛡️
            </div>
          </div>
          <h2 className="text-2xl font-black text-white">DUOCORE Vault</h2>
          <p className="text-xs text-pink-300 font-bold mt-1">Learn. Practice. Challenge. Together.</p>
        </div>

        {/* Auth Mode Toggle */}
        <div className="grid grid-cols-2 p-1 rounded-2xl bg-slate-900 border border-slate-800 mb-6 text-xs font-bold">
          <button
            type="button"
            onClick={() => { setIsRegister(false); setError(''); playSound('click'); }}
            className={`py-2 rounded-xl transition-all ${
              !isRegister ? 'bg-gradient-to-r from-pink-600 to-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setIsRegister(true); setError(''); playSound('click'); }}
            className={`py-2 rounded-xl transition-all ${
              isRegister ? 'bg-gradient-to-r from-pink-600 to-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            Create Account
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-2xl bg-red-950/60 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-[11px] font-semibold text-slate-400 block mb-1">
              {isRegister ? 'Choose Username' : 'Username or Email'}
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type="text"
                required
                placeholder={isRegister ? 'e.g. Sasi' : 'Enter username or email'}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full glass-input rounded-xl pl-10 pr-3 py-2.5 text-xs"
              />
            </div>
          </div>

          {isRegister && (
            <div>
              <label className="text-[11px] font-semibold text-slate-400 block mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full glass-input rounded-xl pl-10 pr-3 py-2.5 text-xs"
                />
              </div>
            </div>
          )}

          <div>
            <label className="text-[11px] font-semibold text-slate-400 block mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="Minimum 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full glass-input rounded-xl pl-10 pr-10 py-2.5 text-xs"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {isRegister && (
            <div>
              <label className="text-[11px] font-semibold text-slate-400 block mb-1">Confirm Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Repeat your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full glass-input rounded-xl pl-10 pr-3 py-2.5 text-xs"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 hover:from-pink-500 hover:to-indigo-500 text-white font-black text-xs transition-all shadow-lg shadow-pink-600/30 mt-2 disabled:opacity-50"
          >
            {loading ? 'Verifying...' : isRegister ? 'Create Account & Start' : 'Sign In 🔑'}
          </button>
        </form>
      </div>
    </div>
  );
}
