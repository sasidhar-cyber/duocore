import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useMusic } from '../context/MusicContext';
import api from '../services/api';
import { Avatar } from './Avatar';
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
  Volume2,
  AlertCircle,
  Info,
  Database,
  LockKeyhole
} from 'lucide-react';
import { playSound } from '../utils/soundEffects';
import { requestNotificationPermission } from '../utils/notificationService';

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
  const { appTitle, changeAppTitle, activeTheme, changeTheme } = useMusic();

  const [activeTab, setActiveTab] = useState('app'); // 'app', 'notifications', 'account', 'vault', 'privacy', 'about'
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
  
  // Notification States
  const [notifMessages, setNotifMessages] = useState(() => localStorage.getItem('duocore_notif_messages') !== 'false');
  const [notifCalls, setNotifCalls] = useState(() => localStorage.getItem('duocore_notif_calls') !== 'false');
  const [notifInvites, setNotifInvites] = useState(() => localStorage.getItem('duocore_notif_invites') !== 'false');
  const [notifMusic, setNotifMusic] = useState(() => localStorage.getItem('duocore_notif_music') !== 'false');
  const [browserPermission, setBrowserPermission] = useState('default');

  const [panicClearEnabled, setPanicClearEnabled] = useState(() => localStorage.getItem('duocore_panic_clear_enabled') === 'true');
  const [pinFailureLimit, setPinFailureLimit] = useState(() => localStorage.getItem('duocore_pin_failure_limit') || '3');

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setBrowserPermission(Notification.permission);
    }
  }, [isOpen]);

  const handleRequestPermission = async () => {
    const perm = await requestNotificationPermission();
    setBrowserPermission(perm);
    if (perm === 'granted') {
      setMessage('Browser notification permission granted! ✅');
      try { playSound('quiz_correct'); } catch {}
    } else {
      setError('Notification permission was denied. Please enable in browser settings.');
      try { playSound('quiz_wrong'); } catch {}
    }
  };

  const handleToggleNotif = async (key, currentVal, setter) => {
    const next = !currentVal;
    setter(next);
    localStorage.setItem(key, String(next));
    localStorage.setItem('duocore_notifications_enabled', String(next));
    if (next && typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      await handleRequestPermission();
    }
  };

  const savePanicSettings = () => {
    localStorage.setItem('duocore_panic_clear_enabled', String(panicClearEnabled));
    localStorage.setItem('duocore_pin_failure_limit', pinFailureLimit);
    setMessage(panicClearEnabled ? `Chat will auto-clear after ${pinFailureLimit} incorrect PIN attempts.` : 'Failed-PIN chat clearing is off.');
  };

  if (!isOpen) return null;

  const handleSaveAppDisguise = (e) => {
    e.preventDefault();
    if (!customTitle.trim()) return;
    changeAppTitle(customTitle.trim());
    setMessage('App Title updated successfully! 🎵');
    setTimeout(() => setMessage(''), 3000);
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      await api.updateProfile({
        username: username.trim(),
        bio: bio.trim(),
        phone_number: phoneNumber.trim(),
        avatar_url: avatarUrl.trim()
      });

      if (updateUser) {
        updateUser({
          username: username.trim(),
          bio: bio.trim(),
          phone_number: phoneNumber.trim(),
          avatar_url: avatarUrl.trim()
        });
      }

      setMessage('Profile updated successfully! ✅');
      playSound('quiz_correct');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(err.message || 'Failed to update profile.');
      playSound('quiz_wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateVaultPin = (e) => {
    e.preventDefault();
    if (!newVaultPin || newVaultPin.length !== 4) {
      setError('PIN must be exactly 4 digits.');
      return;
    }
    localStorage.setItem('duocore_vault_pin', newVaultPin);
    localStorage.setItem('soundwave_vault_pin', newVaultPin);
    setVaultPin(newVaultPin);
    setNewVaultPin('');
    setMessage('Stealth PIN changed successfully! 🔑');
    playSound('quiz_correct');
    setTimeout(() => setMessage(''), 3000);
  };

  const randomizeAvatar = () => {
    const seed = 'avatar_' + Math.random().toString(36).substring(7);
    const newAv = `https://api.dicebear.com/7.x/bottts/svg?seed=${seed}`;
    setAvatarUrl(newAv);
  };

  const handleInstallPWA = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setMessage('App install initiated! 🚀');
      }
    } else {
      alert('To install on iOS / Android: Open browser menu (⋮ or Share) and tap "Add to Home Screen"!');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in select-none">
      <div className="w-full max-w-lg glass-panel p-5 sm:p-6 rounded-3xl border border-emerald-500/40 shadow-2xl space-y-4 max-h-[92vh] flex flex-col bg-slate-950/95">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-sm font-bold">
              ⚙️
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black text-white">DuoCore Settings</h3>
              <p className="text-[10px] text-emerald-400 font-mono">Preferences, Security & Information</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Message / Error banners */}
        {message && (
          <div className="p-2.5 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-bold text-center animate-in fade-in">
            {message}
          </div>
        )}
        {error && (
          <div className="p-2.5 rounded-xl bg-red-950/80 border border-red-500/40 text-red-300 text-xs font-bold text-center animate-in fade-in">
            {error}
          </div>
        )}

        {/* Tabs Bar */}
        <div className="grid grid-cols-5 p-1 rounded-2xl bg-slate-900 border border-slate-800 text-[10px] sm:text-[11px] font-bold">
          <button
            onClick={() => { setActiveTab('app'); setError(''); setMessage(''); }}
            className={`py-2 rounded-xl transition-all ${
              activeTab === 'app' ? 'bg-emerald-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'
            }`}
          >
            🎨 App
          </button>
          <button
            onClick={() => { setActiveTab('notifications'); setError(''); setMessage(''); }}
            className={`py-2 rounded-xl transition-all ${
              activeTab === 'notifications' ? 'bg-emerald-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'
            }`}
          >
            🔔 Notifs
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
            onClick={() => { setActiveTab('vault'); setError(''); setMessage(''); }}
            className={`py-2 rounded-xl transition-all ${
              activeTab === 'vault' ? 'bg-emerald-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'
            }`}
          >
            🔒 Stealth
          </button>
          <button
            onClick={() => { setActiveTab('about'); setError(''); setMessage(''); }}
            className={`py-2 rounded-xl transition-all ${
              activeTab === 'about' ? 'bg-emerald-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'
            }`}
          >
            ℹ️ About
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-4">
          {/* TAB 1: APP DISGUISE & THEMES */}
          {activeTab === 'app' && (
            <div className="space-y-4 animate-in fade-in">
              <form onSubmit={handleSaveAppDisguise} className="space-y-3 p-4 rounded-2xl bg-slate-900/70 border border-slate-800">
                <label className="text-xs font-bold text-slate-300 block">
                  Disguise App Title (Stealth Overlay Name)
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

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-2">Color Theme</label>
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

              <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-white">Install App on Mobile / Desktop</h4>
                  <p className="text-[10px] text-slate-400">Add to Home Screen for fast standalone access</p>
                </div>
                <button
                  type="button"
                  onClick={handleInstallPWA}
                  className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shrink-0"
                >
                  📱 Install
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: NOTIFICATIONS CONTROLS */}
          {activeTab === 'notifications' && (
            <div className="space-y-3.5 animate-in fade-in">
              <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-3">
                <div>
                  <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Bell className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Browser Permission:</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${
                      browserPermission === 'granted'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : browserPermission === 'denied'
                        ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                        : 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30'
                    }`}>
                      {browserPermission}
                    </span>
                  </h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {browserPermission === 'granted'
                      ? 'Push notifications are active and ready.'
                      : 'Browser requires permission to display toasts when in background.'}
                  </p>
                </div>
                {browserPermission !== 'granted' && (
                  <button
                    type="button"
                    onClick={handleRequestPermission}
                    className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black shrink-0"
                  >
                    Allow 🔔
                  </button>
                )}
              </div>

              {/* Message notifications */}
              <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-4">
                <div>
                  <h4 className="text-xs font-bold text-white">Private Chat Messages</h4>
                  <p className="text-[10px] text-slate-400">Show alerts when partner sends a secret message</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleNotif('duocore_notif_messages', notifMessages, setNotifMessages)}
                  className={`shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-black transition-all ${
                    notifMessages ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {notifMessages ? 'ON' : 'OFF'}
                </button>
              </div>

              {/* Incoming Call notifications */}
              <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-4">
                <div>
                  <h4 className="text-xs font-bold text-white">Incoming HD Calls</h4>
                  <p className="text-[10px] text-slate-400">Ring and notify when partner calls you</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleNotif('duocore_notif_calls', notifCalls, setNotifCalls)}
                  className={`shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-black transition-all ${
                    notifCalls ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {notifCalls ? 'ON' : 'OFF'}
                </button>
              </div>

              {/* Invite notifications */}
              <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-4">
                <div>
                  <h4 className="text-xs font-bold text-white">Invites & Pairing Alerts</h4>
                  <p className="text-[10px] text-slate-400">Notify when a friend enters your room code</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleNotif('duocore_notif_invites', notifInvites, setNotifInvites)}
                  className={`shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-black transition-all ${
                    notifInvites ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {notifInvites ? 'ON' : 'OFF'}
                </button>
              </div>

              {/* Music notifications */}
              <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-4">
                <div>
                  <h4 className="text-xs font-bold text-white">Shared Music Stream</h4>
                  <p className="text-[10px] text-slate-400">Show track info when partner shares a song</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleToggleNotif('duocore_notif_music', notifMusic, setNotifMusic)}
                  className={`shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-black transition-all ${
                    notifMusic ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {notifMusic ? 'ON' : 'OFF'}
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: PROFILE & PHONE NUMBER */}
          {activeTab === 'account' && (
            <form onSubmit={handleUpdateProfile} className="space-y-3.5 animate-in fade-in">
              <div className="flex items-center gap-4 p-3 rounded-2xl bg-slate-900/60 border border-slate-800">
                <Avatar
                  src={avatarUrl || user?.avatar_url}
                  name={username || user?.username}
                  className="w-14 h-14 rounded-2xl ring-2 ring-emerald-500/50"
                />
                <div className="space-y-1">
                  <h4 className="text-xs font-black text-white">{username || user?.username}</h4>
                  <button
                    type="button"
                    onClick={randomizeAvatar}
                    className="px-3 py-1 rounded-xl bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 text-[11px] font-bold border border-emerald-500/30"
                  >
                    🎲 Random Avatar
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
                  placeholder="Listening to good music on DuoCore"
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

          {/* TAB 4: STEALTH PIN & PANIC SECURITY */}
          {activeTab === 'vault' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-1.5">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                  <Key className="w-4 h-4" />
                  <span>Stealth 4-Digit Vault PIN</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Triple-tap the top logo anytime or type <span className="text-emerald-400 font-mono">//chat</span> to open the secret private room.
                </p>
                <div className="text-xs text-slate-300 font-mono pt-1">
                  Current PIN: <span className="font-bold text-emerald-400">{vaultPin}</span>
                </div>
              </div>

              <form onSubmit={handleUpdateVaultPin} className="space-y-3 p-4 rounded-2xl bg-slate-900/70 border border-slate-800">
                <label className="text-xs font-bold text-slate-300 block">
                  Change 4-Digit Stealth PIN
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="password"
                    maxLength={4}
                    placeholder="Enter new 4-digit PIN"
                    value={newVaultPin}
                    onChange={(e) => setNewVaultPin(e.target.value.replace(/\D/g, ''))}
                    className="flex-1 glass-input rounded-xl px-3.5 py-2 text-xs font-mono tracking-widest text-emerald-400 text-center"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black shrink-0"
                  >
                    Update PIN 🔑
                  </button>
                </div>
              </form>

              <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-white">Emergency Panic Clear</h4>
                    <p className="text-[10px] text-slate-400">Auto-delete chat history on repeated wrong PIN</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPanicClearEnabled(!panicClearEnabled)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
                      panicClearEnabled ? 'bg-red-500 text-white' : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {panicClearEnabled ? 'ENABLED' : 'DISABLED'}
                  </button>
                </div>

                {panicClearEnabled && (
                  <div className="space-y-2 pt-2 border-t border-slate-800">
                    <label className="text-[11px] font-bold text-slate-300 block">
                      Wipe chat after incorrect attempts:
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {['2', '3'].map((limit) => (
                        <button
                          key={limit}
                          type="button"
                          onClick={() => setPinFailureLimit(limit)}
                          className={`p-2 rounded-xl text-xs font-bold border transition-all ${
                            pinFailureLimit === limit
                              ? 'bg-red-500/20 border-red-500 text-red-300'
                              : 'bg-slate-950 border-slate-800 text-slate-400'
                          }`}
                        >
                          {limit} Wrong Attempts
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={savePanicSettings}
                  className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-white text-xs font-bold"
                >
                  Save Stealth Settings
                </button>
              </div>
            </div>
          )}

          {/* TAB 5: PRIVACY & ABOUT DUOCORE */}
          {activeTab === 'about' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                  <Shield className="w-4 h-4" />
                  <span>Privacy & Architecture Transparency</span>
                </div>
                <ul className="text-[11px] text-slate-300 space-y-1.5 leading-relaxed list-disc list-inside">
                  <li><span className="font-bold text-white">Transport Encryption:</span> All communications occur over encrypted TLS/HTTPS and Secure WebSockets (WSS).</li>
                  <li><span className="font-bold text-white">Persistence Model:</span> Private chat messages are stored server-side in SQLite with automated persistent cloud synchronization to Supabase PostgreSQL.</li>
                  <li><span className="font-bold text-white">Encryption Scope:</span> Standard server-side storage with transport encryption (not client-side E2EE).</li>
                  <li><span className="font-bold text-white">Emergency Panic Clear:</span> Instantly wipes all messages from server database and both devices.</li>
                </ul>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2 text-center">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-lg mx-auto font-black">
                  ⚡
                </div>
                <div>
                  <h4 className="text-sm font-black text-white">DuoCore v1.0.0</h4>
                  <p className="text-[10px] text-emerald-400 font-mono">1v1 Stealth Duo Chat & High-Fidelity Music</p>
                </div>
                <div className="py-2.5 my-2 border-y border-slate-800/80">
                  <span className="text-[10px] uppercase font-mono tracking-widest text-slate-400 block font-bold">Created by</span>
                  <span className="text-xs sm:text-sm font-black text-emerald-400 block mt-0.5 tracking-wide">C Sasidhar Reddy</span>
                </div>
                <p className="text-[11px] text-slate-400 pt-0.5">
                  Built for seamless music sharing, crystal-clear WebRTC calling, and private 1v1 conversations.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
