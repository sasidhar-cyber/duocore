import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRoom } from '../context/RoomContext';
import { useMusic } from '../context/MusicContext';
import { ChatView } from './ChatView';
import { InviteModal } from './InviteModal';
import api from '../services/api';
import {
  Users,
  UserPlus,
  Key,
  Copy,
  Check,
  X,
  Sparkles,
  ArrowRight,
  Shield,
  Radio,
  Share2,
  Lock,
  Unlock,
  Link,
  Zap,
  MessageSquare
} from 'lucide-react';
import { playSound } from '../utils/soundEffects';

export function SecretRoomModal() {
  const { user, register } = useAuth();
  const { roomData, refreshPartnerState } = useRoom();
  const { isSecretChatOpen, closeSecretChat } = useMusic();

  const [isPinUnlocked, setIsPinUnlocked] = useState(false);
  const [enteredPin, setEnteredPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);

  const savedPin = localStorage.getItem('soundwave_vault_pin') || localStorage.getItem('duocore_vault_pin') || '1234';

  // Panic Switch: Escape key snaps back to music player
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsPinUnlocked(false);
        closeSecretChat();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [closeSecretChat]);

  if (!isSecretChatOpen) return null;

  // Handle PIN Unlock (default: 1234)
  const handlePinSubmit = async (e) => {
    e?.preventDefault();
    setPinError('');

    if (enteredPin === savedPin || enteredPin === '1234') {
      setIsPinUnlocked(true);
      setEnteredPin('');
      playSound('quiz_correct');

      // Auto-assign guest session if not logged in
      if (!user) {
        try {
          const guestName = 'User_' + Math.floor(1000 + Math.random() * 9000);
          await register({
            username: guestName,
            email: `${guestName.toLowerCase()}@soundwave.local`,
            password: 'secret_guest_pass'
          });
        } catch (err) {
          console.warn('[Auto Session] Error:', err);
        }
      }

      await refreshPartnerState();
    } else {
      setPinError('Incorrect PIN. Try 1234');
      setEnteredPin('');
      playSound('quiz_wrong');
    }
  };

  const handlePanicExit = () => {
    setIsPinUnlocked(false);
    closeSecretChat();
  };

  const handleCopyCode = () => {
    const code = roomData?.code;
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyLink = () => {
    const code = roomData?.code;
    if (!code) return;
    const url = `${window.location.origin}/?invite=${code}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md animate-in fade-in select-none flex flex-col p-1 sm:p-4 h-[100dvh] max-h-[100dvh] overflow-hidden">
      {/* 🔒 STEP 1: SECRET PIN ENTRY GATE */}
      {!isPinUnlocked ? (
        <div className="m-auto w-full max-w-sm glass-panel p-6 sm:p-8 rounded-3xl border border-emerald-500/40 shadow-2xl bg-slate-950/95 text-center space-y-6 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-bold text-slate-500">SOUND EQUALIZER MASTER</span>
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

          <form onSubmit={handlePinSubmit} className="space-y-4">
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

          <p className="text-[10px] text-slate-500 font-mono">Default PIN: 1234 (Press ESC for Panic Hide)</p>
        </div>
      ) : (
        /* 💬 STEP 2: UNLOCKED -> DIRECT 1v1 DUO CHAT SCREEN */
        <div className="w-full h-full flex flex-col justify-between max-w-6xl mx-auto relative overflow-hidden">
          {/* Top Bar with Room Code, Copy Code, Invite Friend, and Panic Button */}
          <div className="flex items-center justify-between pb-2 px-2 shrink-0">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>CODE: {roomData?.code || 'DUO-ROOM'}</span>
              </div>

              <button
                onClick={handleCopyCode}
                className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 hover:border-emerald-500/50 text-[11px] font-mono text-slate-300 hover:text-white flex items-center gap-1 transition-all"
                title="Copy Invite Code"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span className="hidden xs:inline">{copiedCode ? 'Copied!' : 'Copy Code'}</span>
              </button>

              <button
                onClick={handleCopyLink}
                className="px-2.5 py-1 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-[11px] font-bold text-emerald-300 hover:bg-emerald-900/60 flex items-center gap-1 transition-all"
                title="Share 1-Click WhatsApp Link"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
                <span>{copiedLink ? 'Link Copied!' : 'Share Link'}</span>
              </button>

              <button
                onClick={() => setInviteModalOpen(true)}
                className="px-2.5 py-1 rounded-lg bg-cyan-950/60 border border-cyan-500/40 text-[11px] font-bold text-cyan-300 hover:bg-cyan-900/60 flex items-center gap-1 transition-all"
                title="Enter Friend's Code"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">+ Connect Friend</span>
              </button>
            </div>

            {/* Panic Switch */}
            <button
              onClick={handlePanicExit}
              className="px-3 py-1.5 rounded-xl bg-red-600/30 hover:bg-red-600/50 border border-red-500/40 text-red-300 font-black text-xs flex items-center gap-1.5 transition-transform active:scale-95 shadow-md"
              title="Quick Panic: Immediately snaps back to Music Player"
            >
              <span>🚨 Panic Hide (Esc)</span>
            </button>
          </div>

          {/* Full Chat Screen */}
          <div className="flex-1 min-h-0 overflow-hidden">
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
