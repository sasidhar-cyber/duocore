import React, { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
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
  VolumeX,
  Lock
} from 'lucide-react';
import { playSound } from '../utils/soundEffects';

export function Navbar({ onOpenAuth, onOpenPinPrompt }) {
  const { user, logout, soundEnabled, toggleSound } = useAuth();
  const { appTitle, isPlaying, openNowPlaying } = useMusic();
  const [profileOpen, setProfileOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Stealth Triple-Tap Trigger on 🎵 Logo
  const [tapCount, setTapCount] = useState(0);
  const tapTimerRef = useRef(null);

  const handleLogoTap = () => {
    setTapCount((prev) => {
      const next = prev + 1;
      if (next >= 3) {
        if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
        try { playSound('quiz_correct'); } catch (e) {}
        onOpenPinPrompt();
        return 0;
      }

      if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
      tapTimerRef.current = setTimeout(() => {
        setTapCount(0);
      }, 1200);
      return next;
    });
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-xl select-none">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-4">
          {/* SoundWave Stealth Logo (Triple-tap to open PIN prompt) */}
          <div
            className="flex items-center gap-2 sm:gap-3 cursor-pointer group"
            onClick={handleLogoTap}
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

          {/* Right Tools: Equalizer Indicator, Sound Toggle, Settings, Profile */}
          <div className="flex items-center gap-1.5 sm:gap-2.5">
            {/* Audio Equalizer Indicator (Opens Player) */}
            <button
              onClick={openNowPlaying}
              className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-emerald-400 transition-colors"
              title="Now Playing Equalizer"
            >
              <div className="flex items-end gap-0.5 h-3.5 w-3.5 justify-center">
                <div className={`w-0.5 h-full bg-emerald-400 rounded-full ${isPlaying ? 'animate-pulse' : ''}`} />
                <div className={`w-0.5 h-2/3 bg-emerald-400 rounded-full ${isPlaying ? 'animate-pulse delay-75' : ''}`} />
                <div className={`w-0.5 h-4/5 bg-emerald-400 rounded-full ${isPlaying ? 'animate-pulse delay-150' : ''}`} />
              </div>
            </button>

            {/* Sound Effects Toggle */}
            <button
              onClick={toggleSound}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-emerald-500/40 text-slate-400 hover:text-white transition-all hidden sm:block"
              title={soundEnabled ? 'Mute Sound Effects' : 'Unmute Sound Effects'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Settings Button */}
            <button
              onClick={() => setSettingsOpen(true)}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-emerald-500/40 text-slate-400 hover:text-white transition-all"
              title="Player Settings"
            >
              <Settings className="w-4 h-4" />
            </button>

            {user ? (
              <div className="relative">
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="flex items-center gap-2 p-1.5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-emerald-500/40 transition-all"
                >
                  <img
                    src={user.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.username}`}
                    alt={user.username}
                    className="w-7 h-7 rounded-xl object-cover ring-1 ring-emerald-500/40"
                  />
                  <span className="text-xs font-bold text-slate-200 hidden md:block max-w-[90px] truncate">
                    {user.username}
                  </span>
                </button>

                {profileOpen && (
                  <div className="absolute right-0 mt-2 w-52 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95">
                    <div className="p-3 border-b border-slate-800/80">
                      <p className="text-xs font-extrabold text-white truncate">{user.username}</p>
                      <p className="text-[10px] text-slate-400 font-mono truncate">{user.email}</p>
                    </div>

                    <div className="p-1.5 space-y-1">
                      <button
                        onClick={() => {
                          setProfileOpen(false);
                          setSettingsOpen(true);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-slate-300 hover:bg-slate-800 transition-colors"
                      >
                        <Settings className="w-4 h-4" />
                        <span>Settings</span>
                      </button>

                      <button
                        onClick={() => {
                          setProfileOpen(false);
                          logout();
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-red-400 hover:bg-red-500/10 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={onOpenAuth}
                className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black transition-all shadow-md shadow-emerald-500/20 active:scale-95"
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
