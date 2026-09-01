import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRoom } from '../context/RoomContext';
import { ChatView } from './ChatView';
import { InviteModal } from './InviteModal';
import {
  Key,
  Copy,
  Check,
  X,
  Share2,
  UserPlus,
  ArrowLeft,
  Music,
  Shield,
  MessageSquare
} from 'lucide-react';
import { playSound } from '../utils/soundEffects';

export function DuoChatScreen({ isOpen, onClose }) {
  const { user } = useAuth();
  const { roomData, refreshPartnerState } = useRoom();

  const [isPinUnlocked, setIsPinUnlocked] = useState(false);
  const [enteredPin, setEnteredPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);

  // Default master PIN is 1234
  const savedPin = localStorage.getItem('soundwave_vault_pin') || '1234';

  useEffect(() => {
    if (isOpen) {
      refreshPartnerState();
    }
  }, [isOpen, refreshPartnerState]);

  // Panic Switch: Escape key snaps back to music
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handlePinSubmit = (e) => {
    e?.preventDefault();
    setPinError('');

    const clean = String(enteredPin || '').trim();
    if (clean === savedPin) {
      setIsPinUnlocked(true);
      setEnteredPin('');
      try { playSound('quiz_correct'); } catch (err) {}
      refreshPartnerState();
    } else {
      setPinError('Incorrect PIN. Please try again.');
      setEnteredPin('');
      try { playSound('quiz_wrong'); } catch (err) {}
    }
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
    <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col p-1 sm:p-4 h-[100dvh] max-h-[100dvh] overflow-hidden select-none animate-in fade-in">
      {!isPinUnlocked ? (
        /* 🔒 STEP 1: PIN UNLOCK PROMPT */
        <div className="m-auto w-full max-w-sm glass-panel p-6 sm:p-8 rounded-3xl border border-emerald-500/40 shadow-2xl bg-slate-950/95 text-center space-y-6">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono font-bold text-slate-500">DUO CHAT SECURITY</span>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto text-2xl animate-pulse">
            💬
          </div>

          <div>
            <h3 className="text-base font-black text-white">Unlock 1v1 Duo Chat</h3>
            <p className="text-xs text-slate-400 mt-1">Enter your 4-digit PIN to access private chat</p>
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
                onClick={onClose}
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

          <p className="text-[10px] text-slate-500 font-mono">Master PIN: 1234 (Press ESC for Panic Exit)</p>
        </div>
      ) : (
        /* 💬 STEP 2: FULL CHAT VIEW */
        <div className="w-full h-full flex flex-col justify-between max-w-6xl mx-auto relative overflow-hidden">
          {/* Top Bar with Room Code, Copy Code, Share Link, and Back Button */}
          <div className="flex items-center justify-between pb-2 px-2 shrink-0">
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                onClick={onClose}
                className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-emerald-500/40 text-xs font-bold text-slate-300 hover:text-white flex items-center gap-1.5 transition-all"
              >
                <ArrowLeft className="w-4 h-4 text-emerald-400" />
                <span>Music</span>
              </button>

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
                title="Share WhatsApp Invite Link"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
                <span>{copiedLink ? 'Link Copied!' : 'Share Link'}</span>
              </button>

              <button
                onClick={() => setInviteModalOpen(true)}
                className="px-2.5 py-1 rounded-lg bg-cyan-950/60 border border-cyan-500/40 text-[11px] font-bold text-cyan-300 hover:bg-cyan-900/60 flex items-center gap-1 transition-all"
                title="Connect to Friend's Code"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">+ Connect</span>
              </button>
            </div>

            {/* Panic Exit Button */}
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-xl bg-red-600/30 hover:bg-red-600/50 border border-red-500/40 text-red-300 font-black text-xs flex items-center gap-1.5 shadow-md"
              title="Quick Panic: Return to Music"
            >
              <span>🚨 Panic (Esc)</span>
            </button>
          </div>

          {/* Full Screen Chat Area */}
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
