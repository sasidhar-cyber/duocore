import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useMusic } from '../context/MusicContext';
import api from '../services/api';
import {
  X,
  User,
  Lock,
  Key,
  Shield,
  Palette,
  Phone,
  Bell,
  Check,
  Smartphone,
  Sparkles,
  Music,
  Sliders,
  Radio,
  Eye,
  VolumeX,
  Volume2
} from 'lucide-react';
import { playSound } from '../utils/soundEffects';

const MUSIC_THEMES = [
  { id: 'spotify', name: 'Spotify Green', color: 'from-emerald-500 to-green-600', border: 'border-emerald-500' },
  { id: 'neon_pink', name: 'Neon Pink Glow', color: 'from-pink-500 to-rose-600', border: 'border-pink-500' },
  { id: 'cyber_cyan', name: 'Cyber Cyan', color: 'from-cyan-500 to-blue-600', border: 'border-cyan-500' },
  { id: 'purple_twilight', name: 'Purple Twilight', color: 'from-purple-500 to-indigo-600', border: 'border-purple-500' },
  { id: 'amoled', name: 'Pure AMOLED Black', color: 'from-slate-800 to-black', border: 'border-slate-400' }
];

const DISGUISE_NAMES = [
  'SoundWave',
  'Spotify Pro',
  'TuneFlow',
  'Beats Studio',
  'Music Player',
  'Apple Music'
];

export function SettingsModal({ isOpen, onClose, deferredPrompt }) {
  const { user, updateUser } = useAuth();
  const { appTitle, changeAppTitle, activeTheme, changeTheme, openSecretChat } = useMusic();

  const [activeTab, setActiveTab] = useState('app'); // 'app', 'account', 'security', 'vault'
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // App Disguise Name
  const [customTitle, setCustomTitle] = useState(appTitle);

  // Account form state
  const [username, setUsername] = useState(user?.username || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [phoneNumber, setPhoneNumber] = useState(user?.phone_number || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || '');

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Vault PIN state
  const [vaultPin, setVaultPin] = useState(localStorage.getItem('duocore_vault_pin') || '1234');
  const [newVaultPin, setNewVaultPin] = useState('');

  if (!isOpen) return null;

  const handleSaveAppDisguise = (e) => {
    e.preventDefault();
    if (!customTitle.trim()) return;
    changeAppTitle(customTitle.trim());
    setMessage(`App name updated to "${customTitle.trim()}"!`);
    playSound('quiz_correct');
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const res = await api.updateProfile({
        username,
        bio,
        avatar_url: avatarUrl,
        phone_number: phoneNumber
      });

      if (res.user) {
        updateUser(res.user);
      }
      setMessage('Profile updated successfully!');
      playSound('quiz_correct');
    } catch (err) {
      setError(err.message || 'Failed to update profile.');
      playSound('quiz_wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('New password and confirm password do not match.');
      return;
    }
    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    try {
      const res = await api.changePassword({ currentPassword, newPassword });
      setMessage(res.message || 'Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      playSound('quiz_correct');
    } catch (err) {
      setError(err.message || 'Failed to change password.');
      playSound('quiz_wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveVaultPin = (e) => {
    e.preventDefault();
    if (newVaultPin.length < 4) {
      setError('Vault Passkey PIN must be at least 4 digits.');
      return;
    }
    localStorage.setItem('duocore_vault_pin', newVaultPin);
    setVaultPin(newVaultPin);
    setNewVaultPin('');
    setMessage('Stealth Vault Passkey PIN updated successfully!');
    playSound('quiz_correct');
  };

  const handleInstallPWA = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
    } else {
      alert('To install as an App on Phone/PC:\n• Chrome: Tap 3 dots -> "Install App" / "Add to Home Screen".\n• Safari: Tap Share -> "Add to Home Screen".');
    }
  };

  const randomizeAvatar = () => {
    const seed = 'user_' + Math.random().toString(36).substring(2, 8);
    setAvatarUrl(`https://api.dicebear.com/7.x/bottts/svg?seed=${seed}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in select-none">
      <div className="w-full max-w-xl glass-panel p-5 sm:p-7 rounded-3xl border border-emerald-500/40 shadow-2xl space-y-5 bg-slate-950/95 max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 p-[1.5px]">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-emerald-400">
                ⚙️
              </div>
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-white">{appTitle} Settings & Privacy</h3>
              <p className="text-[11px] text-slate-400">Customize theme, disguise name, passwords & stealth vault</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Messages */}
        {message && (
          <div className="p-3 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs shrink-0">
            {message}
          </div>
        )}
        {error && (
          <div className="p-3 rounded-2xl bg-red-950/60 border border-red-500/40 text-red-300 text-xs shrink-0">
            {error}
          </div>
        )}

        {/* Tabs Header */}
        <div className="grid grid-cols-4 p-1 rounded-2xl bg-slate-900 border border-slate-800 text-[10px] sm:text-[11px] font-bold shrink-0">
          <button
            onClick={() => { setActiveTab('app'); setError(''); setMessage(''); }}
            className={`py-2 rounded-xl transition-all ${
              activeTab === 'app' ? 'bg-emerald-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'
            }`}
          >
            🎨 Theme
          </button>
          <button
            onClick={() => { setActiveTab('account'); setError(''); setMessage(''); }}
            className={`py-2 rounded-xl transition-all ${
              activeTab === 'account' ? 'bg-emerald-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'
            }`}
          >
            👤 Profile
          </button>
          <button
            onClick={() => { setActiveTab('security'); setError(''); setMessage(''); }}
            className={`py-2 rounded-xl transition-all ${
              activeTab === 'security' ? 'bg-emerald-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'
            }`}
          >
            🔑 Pass
          </button>
          <button
            onClick={() => { setActiveTab('vault'); setError(''); setMessage(''); }}
            className={`py-2 rounded-xl transition-all ${
              activeTab === 'vault' ? 'bg-emerald-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'
            }`}
          >
            🔒 Stealth
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-4">
          {/* TAB 1: APP DISGUISE & THEMES */}
          {activeTab === 'app' && (
            <div className="space-y-4 animate-in fade-in">
              {/* App Disguise Name Customization */}
              <form onSubmit={handleSaveAppDisguise} className="space-y-3 p-4 rounded-2xl bg-slate-900/70 border border-slate-800">
                <label className="text-xs font-bold text-slate-300 block">
                  Disguise App Title (Choose Name or Type Custom)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {DISGUISE_NAMES.map((name) => (
                    <button
                      key={name}
                      type="button"
                      onClick={() => setCustomTitle(name)}
                      className={`p-2 rounded-xl text-[11px] font-bold border transition-all ${
                        customTitle === name
                          ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-sm'
                          : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      {name}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    placeholder="Custom App Name"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    className="flex-1 glass-input rounded-xl px-3.5 py-2 text-xs text-white"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black shrink-0"
                  >
                    Save Name
                  </button>
                </div>
              </form>

              {/* Music Player Theme */}
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-2">Music Player Color Theme</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {MUSIC_THEMES.map((th) => (
                    <button
                      key={th.id}
                      type="button"
                      onClick={() => changeTheme(th.id)}
                      className={`p-3 rounded-2xl border text-left flex flex-col justify-between h-18 bg-slate-900 transition-all ${
                        activeTheme === th.id
                          ? `${th.border} ring-2 ring-emerald-500/40 shadow-lg`
                          : 'border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white">{th.name}</span>
                        {activeTheme === th.id && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                      </div>
                      <div className={`w-full h-1.5 rounded-full bg-gradient-to-r ${th.color}`} />
                    </button>
                  ))}
                </div>
              </div>

              {/* PWA Install Button */}
              <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-white">Install Music App on Mobile / PC</h4>
                  <p className="text-[10px] text-slate-400">Add to Phone Home Screen for standalone offline player</p>
                </div>
                <button
                  type="button"
                  onClick={handleInstallPWA}
                  className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shrink-0"
                >
                  📱 Install App
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: PROFILE & PHONE NUMBER */}
          {activeTab === 'account' && (
            <form onSubmit={handleUpdateProfile} className="space-y-3.5 animate-in fade-in">
              <div className="flex items-center gap-4 p-3 rounded-2xl bg-slate-900/60 border border-slate-800">
                <img
                  src={avatarUrl || user?.avatar_url}
                  alt={username}
                  className="w-14 h-14 rounded-2xl object-cover ring-2 ring-emerald-500/50 shrink-0"
                />
                <div className="space-y-1">
                  <h4 className="text-xs font-black text-white">{username}</h4>
                  <button
                    type="button"
                    onClick={randomizeAvatar}
                    className="px-3 py-1 rounded-xl bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 text-[11px] font-bold border border-emerald-500/30"
                  >
                    🎲 Change Avatar
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Username</label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full glass-input rounded-xl px-3.5 py-2.5 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Phone Number</label>
                <input
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full glass-input rounded-xl px-3.5 py-2.5 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Bio / Status</label>
                <input
                  type="text"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Vibing to good music"
                  className="w-full glass-input rounded-xl px-3.5 py-2.5 text-xs text-white"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/30 transition-transform active:scale-95 disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save Profile Changes 💾'}
              </button>
            </form>
          )}

          {/* TAB 3: CHANGE PASSWORD */}
          {activeTab === 'security' && (
            <form onSubmit={handleChangePassword} className="space-y-3.5 animate-in fade-in">
              <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 text-xs text-slate-300">
                🔒 Update your account password anytime.
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Current Password</label>
                <input
                  type="password"
                  required
                  placeholder="Enter current password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full glass-input rounded-xl px-3.5 py-2.5 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">New Password (Min 6 chars)</label>
                <input
                  type="password"
                  required
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full glass-input rounded-xl px-3.5 py-2.5 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Confirm New Password</label>
                <input
                  type="password"
                  required
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full glass-input rounded-xl px-3.5 py-2.5 text-xs text-white"
                />
              </div>

              <button
                type="submit"
                disabled={loading || !currentPassword || !newPassword}
                className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/30 transition-transform active:scale-95 disabled:opacity-50"
              >
                {loading ? 'Changing Password...' : 'Update Password 🔑'}
              </button>
            </form>
          )}

          {/* TAB 4: STEALTH VAULT PIN */}
          {activeTab === 'vault' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/40 space-y-2">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                  <Shield className="w-4 h-4" />
                  <span>How to open Stealth 1v1 Duo Chat:</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  1. <strong>Triple-tap (3 clicks)</strong> on the <strong>🎵 SoundWave Logo</strong> in the top-left.<br />
                  2. Or type <strong>//chat</strong> in the song search bar.<br />
                  3. Enter your 4-digit PIN.<br />
                  4. Press <strong>Esc</strong> anytime for instant panic hide!
                </p>
              </div>

              {/* Change Vault PIN */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!newVaultPin.trim() || newVaultPin.trim().length !== 4) {
                    setError('PIN must be exactly 4 digits (e.g. 1234)');
                    return;
                  }
                  localStorage.setItem('soundwave_vault_pin', newVaultPin.trim());
                  localStorage.setItem('duocore_vault_pin', newVaultPin.trim());
                  setVaultPin(newVaultPin.trim());
                  setNewVaultPin('');
                  setMessage(`Stealth PIN updated to "${newVaultPin.trim()}"!`);
                  setError('');
                  try { playSound('quiz_correct'); } catch {}
                }}
                className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3"
              >
                <div className="flex items-center gap-2 text-slate-200 font-bold text-xs">
                  <Lock className="w-4 h-4 text-emerald-400" />
                  <span>Stealth Vault PIN (Current: {vaultPin})</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="password"
                    maxLength={4}
                    placeholder="Enter new 4-digit PIN"
                    value={newVaultPin}
                    onChange={(e) => setNewVaultPin(e.target.value)}
                    className="flex-1 glass-input rounded-xl px-3 py-2 text-center text-xs font-mono text-emerald-400"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shrink-0"
                  >
                    Update PIN
                  </button>
                </div>
              </form>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
