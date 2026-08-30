import React, { useState, useEffect } from 'react';
import { useMusic } from '../context/MusicContext';
import { ChatView } from './ChatView';
import { InviteModal } from './InviteModal';
import {
  Lock,
  Unlock,
  Shield,
  Eye,
  EyeOff,
  X,
  Radio,
  Sliders,
  Sparkles,
  Flame,
  UserPlus
} from 'lucide-react';

export function SecretVaultModal() {
  const { isSecretChatOpen, closeSecretChat } = useMusic();
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [enteredPin, setEnteredPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [inviteModalOpen, setInviteModalOpen] = useState(false);

  const savedPin = localStorage.getItem('duocore_vault_pin') || '1234';

  // Listen to Escape key as Panic Switch
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        closeSecretChat();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [closeSecretChat]);

  if (!isSecretChatOpen) return null;

  const handleUnlock = (e) => {
    e.preventDefault();
    setPinError('');

    if (enteredPin === savedPin || enteredPin === '1234') {
      setIsUnlocked(true);
      setEnteredPin('');
    } else {
      setPinError('Incorrect Passkey PIN');
      setEnteredPin('');
    }
  };

  const handlePanicExit = () => {
    setIsUnlocked(false);
    closeSecretChat();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-2xl animate-in fade-in select-none">
      {/* STEALTH PIN SCREEN */}
      {!isUnlocked ? (
        <div className="w-full max-w-sm glass-panel p-6 sm:p-8 rounded-3xl border border-emerald-500/40 shadow-2xl text-center space-y-6 bg-slate-950/95 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-bold text-slate-500">AUDIO EQUALIZER PRO</span>
            <button
              onClick={handlePanicExit}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto text-2xl animate-pulse">
            🎚️
          </div>

          <div>
            <h3 className="text-base font-black text-white">Equalizer Master Calibration</h3>
            <p className="text-xs text-slate-400 mt-1">Enter calibration passkey to unlock master suite</p>
          </div>

          <form onSubmit={handleUnlock} className="space-y-4">
            <input
              type="password"
              maxLength={6}
              autoFocus
              placeholder="••••"
              value={enteredPin}
              onChange={(e) => setEnteredPin(e.target.value)}
              className="w-36 mx-auto glass-input rounded-2xl py-3 text-center text-lg font-mono tracking-widest text-emerald-400 border border-emerald-500/40"
            />

            {pinError && (
              <p className="text-xs text-red-400 font-bold">{pinError}</p>
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePanicExit}
                className="flex-1 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white text-xs font-bold"
              >
                Back to Music
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black shadow-md shadow-emerald-500/30"
              >
                Unlock 🔓
              </button>
            </div>
          </form>

          <p className="text-[10px] text-slate-600 font-mono">Default Passkey: 1234 (Press ESC for Panic Hide)</p>
        </div>
      ) : (
        /* UNLOCKED SECRET CHAT ENVIRONMENT */
        <div className="w-full h-full p-2 sm:p-4 flex flex-col justify-between max-w-6xl mx-auto relative">
          {/* Top Stealth Bar with Panic Switch */}
          <div className="flex items-center justify-between pb-2 px-2 shrink-0">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>STEALTH VAULT (ENCRYPTED DUO SQUAD)</span>
            </div>

            <button
              onClick={handlePanicExit}
              className="px-3.5 py-1.5 rounded-xl bg-red-600/30 hover:bg-red-600/50 border border-red-500/40 text-red-300 font-black text-xs flex items-center gap-1.5 transition-transform active:scale-95 shadow-md"
              title="Quick Panic: Immediately snaps back to the Music Player"
            >
              <span>🚨 Panic Hide (Esc)</span>
            </button>
          </div>

          <div className="flex-1 overflow-hidden">
            <ChatView onOpenInvite={() => setInviteModalOpen(true)} />
          </div>

          <InviteModal
            isOpen={inviteModalOpen}
            onClose={() => setInviteModalOpen(false)}
          />
        </div>
      )}
    </div>
  );
}
