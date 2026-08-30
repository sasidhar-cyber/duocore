import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRoom } from '../context/RoomContext';
import { useMusic } from '../context/MusicContext';
import { SettingsModal } from './SettingsModal';
import {
  Music,
  Compass,
  Radio,
  Sliders,
  Sparkles,
  Heart,
  Settings,
  LogOut,
  User,
  Volume2,
  VolumeX
} from 'lucide-react';

export function Navbar({ onOpenAuth }) {
  const { user, logout } = useAuth();
  const { members } = useRoom();
  const { appTitle, openSecretChat, changeTheme, activeTheme, THEMES } = useMusic();
  const [profileOpen, setProfileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [secretCounter, setSecretCounter] = useState(0);

  // Stealth Secret Vault Trigger in Logo or Equalizer (Triple click)
  const handleStealthClick = () => {
    setSecretCounter((prev) => {
      const next = prev + 1;
      if (next >= 3) {
        openSecretChat();
        return 0;
      }
      return next;
    });

    setTimeout(() => {
      setSecretCounter(0);
    }, 2000);
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-xl select-none">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-4">
          {/* Logo & Stealth Trigger */}
          <div
            className="flex items-center gap-2 sm:gap-3 cursor-pointer group"
            onClick={handleStealthClick}
            title={appTitle}
          >
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-emerald-500 via-teal-500 to-cyan-500 p-[1.5px] shadow-lg shadow-emerald-500/20 shrink-0 group-hover:scale-105 transition-transform">
              <div className="w-full h-full bg-slate-950 rounded-[10px] sm:rounded-[14px] flex items-center justify-center text-sm sm:text-lg font-black text-emerald-400">
                🎵
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base sm:text-lg tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-white via-emerald-200 to-cyan-300">
                  {appTitle}
                </span>
                <span className="text-[9px] sm:text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                  PRO
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-semibold -mt-0.5 hidden sm:block">
                Unlimited Music & Audio Streaming
              </p>
            </div>
          </div>

          {/* Right Action Tools: Equalizer (Secret Trigger), Theme, Settings, Profile */}
          <div className="flex items-center gap-1.5 sm:gap-2.5">
            {/* Stealth Equalizer Button */}
            <button
              onClick={handleStealthClick}
              className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-emerald-400 transition-colors"
              title="Audio Equalizer (Triple-tap unlocks secret vault)"
            >
              <div className="flex items-end gap-0.5 h-3.5 w-3.5 justify-center">
                <div className="w-0.5 h-full bg-emerald-400 rounded-full animate-pulse" />
                <div className="w-0.5 h-2/3 bg-emerald-400 rounded-full animate-pulse delay-75" />
                <div className="w-0.5 h-4/5 bg-emerald-400 rounded-full animate-pulse delay-150" />
              </div>
            </button>

            {/* Settings Button */}
            <button
              onClick={() => setSettingsOpen(true)}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-emerald-500/40 text-slate-400 hover:text-white transition-all"
              title="Player Settings & App Name"
            >
              <Settings className="w-4 h-4" />
            </button>

            {user ? (
              <div className="relative">
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="flex items-center gap-1.5 sm:gap-2 p-1 pl-1.5 pr-2 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-emerald-500/40 transition-all"
                >
                  <img
                    src={user.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(user.username || 'user')}`}
                    alt={user.username}
                    className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-slate-800 object-cover ring-1 ring-emerald-500/40"
                  />
                  <span className="text-xs font-bold text-slate-200 hidden sm:inline">{user.username}</span>
                </button>

                {profileOpen && (
                  <div className="absolute right-0 mt-2 w-56 rounded-2xl glass-panel p-3 shadow-2xl border border-slate-700/80 z-50 animate-in fade-in bg-slate-950/95">
                    <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 mb-2">
                      <h4 className="text-xs font-bold text-white truncate">{user.username}</h4>
                      <p className="text-[10px] text-emerald-400 font-mono">Premium Music Member</p>
                    </div>

                    <button
                      onClick={() => { setProfileOpen(false); setSettingsOpen(true); }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-slate-300 hover:bg-slate-900 transition-all mb-1 text-left"
                    >
                      <Settings className="w-3.5 h-3.5 text-slate-400" />
                      <span>Settings & Password</span>
                    </button>

                    <button
                      onClick={() => { logout(); setProfileOpen(false); }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-red-400 hover:bg-red-950/40 transition-all text-left"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Log Out</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => onOpenAuth && onOpenAuth()}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black shadow-md shadow-emerald-500/30 transition-transform active:scale-95"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </header>

      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </>
  );
}
