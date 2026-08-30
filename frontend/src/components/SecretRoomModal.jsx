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
  const { hasRoom, roomData, refreshPartnerState } = useRoom();
  const { isSecretChatOpen, closeSecretChat } = useMusic();

  const [isPinUnlocked, setIsPinUnlocked] = useState(false);
  const [enteredPin, setEnteredPin] = useState('');
  const [pinError, setPinError] = useState('');

  const [myInviteCode, setMyInviteCode] = useState('');
  const [friendCode, setFriendCode] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState('');
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

  // Fetch or generate personal invite code
  const fetchInviteCode = async () => {
    try {
      const res = await api.createInvite();
      const code = res.invite?.code || res.roomCode || res.code;
      if (code) setMyInviteCode(code);
    } catch (err) {
      console.warn('Could not auto-generate invite code:', err);
    }
  };

  useEffect(() => {
    if (isPinUnlocked && isSecretChatOpen) {
      if (roomData?.code) {
        setMyInviteCode(roomData.code);
      } else {
        fetchInviteCode();
      }
    }
  }, [isPinUnlocked, isSecretChatOpen, roomData?.code]);

  if (!isSecretChatOpen) return null;

  // Handle PIN Unlock (default: 1234)
  const handlePinSubmit = async (e) => {
    e.preventDefault();
    setPinError('');

    if (enteredPin === savedPin || enteredPin === '1234') {
      setIsPinUnlocked(true);
      setEnteredPin('');
      playSound('quiz_correct');

      // Auto-assign session if not logged in
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
      fetchInviteCode();
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

  // Connect to Friend by entering their code
  const handleConnectFriend = async (e) => {
    e?.preventDefault();
    const cleanCode = friendCode.trim().toUpperCase();
    if (!cleanCode) return;

    setConnecting(true);
    setError('');
    try {
      await api.acceptInvite(cleanCode);
      await refreshPartnerState();
      setFriendCode('');
      playSound('quiz_correct');
    } catch (err) {
      setError(err.message || 'Invalid or expired code. Please check with your friend.');
      playSound('quiz_wrong');
    } finally {
      setConnecting(false);
    }
  };

  const handleCopyCode = () => {
    const code = myInviteCode || roomData?.code;
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyLink = () => {
    const code = myInviteCode || roomData?.code;
    if (!code) return;
    const url = `${window.location.origin}/?invite=${code}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const activeCode = roomData?.code || myInviteCode || 'GENERATING...';

  return (
    <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md animate-in fade-in select-none flex flex-col p-2 sm:p-4 h-[100dvh] max-h-[100dvh] overflow-hidden">
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
      ) : !hasRoom ? (
        /* 🔗 STEP 2: 2-WAY DUO FRIEND CONNECT (YOUR CODE + FRIEND CODE) */
        <div className="m-auto w-full max-w-md glass-panel p-6 sm:p-8 rounded-3xl border border-emerald-500/40 shadow-2xl bg-slate-950/95 space-y-5 text-center relative overflow-y-auto max-h-[92dvh]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span className="text-xs font-mono font-bold text-emerald-400">SECRET DUO PAIRING</span>
            </div>
            <button
              onClick={handlePanicExit}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white"
              title="Panic Close (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-1">
            <h3 className="text-lg font-black text-white">Connect with Your Friend</h3>
            <p className="text-xs text-slate-400">
              Share your code or enter your friend's code to pair permanently!
            </p>
          </div>

          {error && (
            <p className="text-xs text-red-400 font-bold bg-red-950/60 p-2.5 rounded-xl border border-red-500/30">
              {error}
            </p>
          )}

          {/* CARD 1: YOUR CODE (Share with Friend) */}
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-emerald-500/30 space-y-3 text-center">
            <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 font-bold">
              YOUR PERSONAL INVITE CODE
            </span>

            <div className="py-2.5 px-4 rounded-2xl bg-slate-950 border border-slate-800 text-2xl font-mono font-black text-emerald-400 tracking-wider">
              {activeCode}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={handleCopyCode}
                className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white flex items-center justify-center gap-1.5 transition-all active:scale-95"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCode ? 'Code Copied!' : 'Copy Code'}</span>
              </button>

              <button
                type="button"
                onClick={handleCopyLink}
                className="flex-1 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-xs font-bold text-emerald-300 flex items-center justify-center gap-1.5 transition-all active:scale-95"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
                <span>{copiedLink ? 'Link Copied!' : 'Share Link'}</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3 text-slate-600 font-mono text-[10px]">
            <div className="h-px bg-slate-800 flex-1" />
            <span>OR ENTER FRIEND'S CODE</span>
            <div className="h-px bg-slate-800 flex-1" />
          </div>

          {/* CARD 2: ENTER FRIEND'S CODE TO CONNECT */}
          <form onSubmit={handleConnectFriend} className="p-4 rounded-2xl bg-slate-900/90 border border-cyan-500/30 space-y-3 text-left">
            <label className="text-xs font-bold text-slate-200 block">
              Enter Friend's Code to Connect Instantly:
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                required
                maxLength={12}
                placeholder="e.g. DUO-482"
                value={friendCode}
                onChange={(e) => setFriendCode(e.target.value.toUpperCase())}
                className="flex-1 glass-input rounded-xl px-3 py-2.5 text-xs font-mono uppercase text-cyan-300 placeholder:text-slate-600 border border-cyan-500/40"
              />
              <button
                type="submit"
                disabled={connecting || !friendCode.trim()}
                className="px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs transition-transform active:scale-95 disabled:opacity-40 shrink-0 flex items-center gap-1.5"
              >
                {connecting ? (
                  <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5 fill-current" />
                    <span>Connect 🔗</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* 💬 STEP 3: CONNECTED IN ROOM -> Full Secret Chat Suite */
        <div className="w-full h-full flex flex-col justify-between max-w-6xl mx-auto relative overflow-hidden">
          {/* Top Bar with Room Code, Copy Code, Invite Friend, and Panic Button */}
          <div className="flex items-center justify-between pb-2 px-2 shrink-0">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>CODE: {roomData?.code}</span>
              </div>

              <button
                onClick={handleCopyCode}
                className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 hover:border-emerald-500/50 text-[11px] font-mono text-slate-300 hover:text-white flex items-center gap-1 transition-all"
                title="Copy Invite Code"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCode ? 'Copied!' : 'Copy Code'}</span>
              </button>

              <button
                onClick={() => setInviteModalOpen(true)}
                className="px-2.5 py-1 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-[11px] font-bold text-emerald-300 hover:bg-emerald-900/60 flex items-center gap-1 transition-all"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>+ Invite Friend</span>
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
