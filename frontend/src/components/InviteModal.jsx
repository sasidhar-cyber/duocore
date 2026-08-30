import React, { useState, useEffect } from 'react';
import { useRoom } from '../context/RoomContext';
import { useAuth } from '../context/AuthContext';
import { getHackerRank } from '../utils/hackerTitles';
import {
  Copy,
  Check,
  UserPlus,
  X,
  Shield,
  Sparkles,
  Users,
  Share2,
  Trash2,
  AlertTriangle,
  Clock,
  ArrowRight,
  Plus
} from 'lucide-react';
import { playSound } from '../utils/soundEffects';

export function InviteModal({ isOpen, onClose }) {
  const { user } = useAuth();
  const {
    hasPartner,
    hasRoom,
    members,
    partner,
    roomData,
    pendingInvite,
    createInvite,
    cancelInvite,
    acceptInvite,
    removePartner
  } = useRoom();

  const [activeTab, setActiveTab] = useState('members'); // 'members', 'invite', 'join'
  const [inviteCodeInput, setInviteCodeInput] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setError('');
      setSuccess('');
      setShowLeaveConfirm(false);
      if (!roomData && !pendingInvite) {
        createInvite().catch(() => {});
        setActiveTab('invite');
      } else if (members.length > 0) {
        setActiveTab('members');
      } else {
        setActiveTab('invite');
      }
    }
  }, [isOpen, roomData, pendingInvite, members.length]);

  if (!isOpen) return null;

  const currentCode = roomData?.code || pendingInvite?.code;

  const handleCopyCode = () => {
    if (currentCode) {
      navigator.clipboard.writeText(currentCode);
      setCopiedCode(true);
      playSound('click');
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleCopyLink = () => {
    if (currentCode) {
      const inviteUrl = `${window.location.origin}?invite=${currentCode}`;
      navigator.clipboard.writeText(inviteUrl);
      setCopiedLink(true);
      playSound('click');
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleJoinByCode = async (e) => {
    e.preventDefault();
    if (!inviteCodeInput.trim()) return;

    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const res = await acceptInvite(inviteCodeInput.trim().toUpperCase());
      setSuccess(res.message || '🎉 Joined squad successfully!');
      playSound('quiz_correct');
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err) {
      setError(err.message || 'Could not join. Please check code.');
      playSound('quiz_wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveSquad = async () => {
    setError('');
    setLoading(true);
    try {
      await removePartner();
      setShowLeaveConfirm(false);
      setSuccess('Left room successfully.');
      playSound('click');
      setTimeout(() => {
        onClose();
      }, 800);
    } catch (err) {
      setError(err.message || 'Failed to leave room.');
      playSound('quiz_wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className="w-full max-w-xl glass-panel p-6 sm:p-8 rounded-3xl border border-pink-500/40 shadow-2xl space-y-6 relative animate-in zoom-in-95 duration-150 bg-slate-950/95">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-500 to-indigo-600 p-[1.5px] shadow-md shadow-pink-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-lg font-bold text-pink-400">
                👥
              </div>
            </div>
            <div>
              <h3 className="text-base font-black text-white">Study Squad & Friends</h3>
              <p className="text-xs text-slate-400">
                Invite multiple friends to collaborate, voice chat, and challenge together
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-2xl bg-red-950/60 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-3 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs">
            {success}
          </div>
        )}

        {/* 3 Main Tabs: Members, Add / Invite Friends, Join Room */}
        <div className="grid grid-cols-3 p-1 rounded-2xl bg-slate-900 border border-slate-800 text-xs font-bold">
          <button
            onClick={() => { setActiveTab('members'); playSound('click'); }}
            className={`py-2 rounded-xl transition-all ${
              activeTab === 'members'
                ? 'bg-gradient-to-r from-pink-600 to-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            👥 Squad ({members.length || 1})
          </button>
          <button
            onClick={() => { setActiveTab('invite'); playSound('click'); }}
            className={`py-2 rounded-xl transition-all ${
              activeTab === 'invite'
                ? 'bg-gradient-to-r from-pink-600 to-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            ➕ Invite Friends
          </button>
          <button
            onClick={() => { setActiveTab('join'); playSound('click'); }}
            className={`py-2 rounded-xl transition-all ${
              activeTab === 'join'
                ? 'bg-gradient-to-r from-pink-600 to-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            📥 Join Squad
          </button>
        </div>

        {/* TAB 1: SQUAD MEMBERS LIST */}
        {activeTab === 'members' && (
          <div className="space-y-4 animate-in fade-in">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Current Room Members:
              </span>
              <span className="text-xs font-mono font-bold text-cyan-300">
                Code: {currentCode || 'N/A'}
              </span>
            </div>

            <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
              {members.length > 0 ? (
                members.map((m) => {
                  const mRank = getHackerRank(m.level || 1, m.xp || 0);
                  const isMe = m.id === user?.id;

                  return (
                    <div
                      key={m.id}
                      className={`p-3 rounded-2xl border flex items-center justify-between gap-3 ${
                        isMe
                          ? 'bg-indigo-950/40 border-indigo-500/40'
                          : 'bg-slate-900 border-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative">
                          <img
                            src={m.avatar_url || 'https://api.dicebear.com/7.x/bottts/svg?seed=user'}
                            alt={m.username}
                            className="w-10 h-10 rounded-xl object-cover ring-2 ring-indigo-500/40"
                          />
                          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-slate-950" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-black text-white truncate">
                              {m.username} {isMe && '(You)'}
                            </h4>
                            <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold border ${mRank.badgeColor}`}>
                              {mRank.icon} {mRank.title.split(' ')[0]}
                            </span>
                          </div>
                          <p className="text-[10px] text-cyan-300 truncate">
                            Lv.{m.level || 1} • {m.xp || 0} XP • {m.current_topic || 'Cybersecurity & Linux'}
                          </p>
                        </div>
                      </div>

                      <span className="text-[10px] font-mono uppercase font-bold text-slate-400">
                        {m.role || 'Member'}
                      </span>
                    </div>
                  );
                })
              ) : (
                <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 flex items-center gap-3">
                  <img
                    src={user?.avatar_url || 'https://api.dicebear.com/7.x/bottts/svg?seed=user'}
                    alt={user?.username}
                    className="w-10 h-10 rounded-xl object-cover"
                  />
                  <div>
                    <h4 className="text-xs font-bold text-white">{user?.username} (You)</h4>
                    <p className="text-[10px] text-slate-400">Invite your friends to build your squad!</p>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2 flex items-center gap-2">
              <button
                onClick={() => { setActiveTab('invite'); playSound('click'); }}
                className="flex-1 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-pink-600/30 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Invite More Friends</span>
              </button>

              {showLeaveConfirm ? (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handleLeaveSquad}
                    disabled={loading}
                    className="px-3 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold"
                  >
                    Confirm Leave
                  </button>
                  <button
                    onClick={() => setShowLeaveConfirm(false)}
                    className="px-2 py-2.5 rounded-xl bg-slate-800 text-slate-400 text-xs"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowLeaveConfirm(true)}
                  className="px-3 py-2.5 rounded-xl bg-slate-900 border border-red-900/40 hover:border-red-500 text-red-400 text-xs font-bold flex items-center gap-1.5"
                  title="Leave Room"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Leave</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: INVITE / ADD FRIENDS */}
        {activeTab === 'invite' && (
          <div className="space-y-4 animate-in fade-in">
            <div className="p-5 rounded-2xl bg-slate-900/90 border border-pink-500/30 space-y-4 shadow-xl">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono uppercase font-bold text-slate-400 block tracking-wider">
                    Squad Room Code:
                  </span>
                  <span className="text-3xl font-black font-mono text-cyan-300 tracking-wider">
                    {currentCode || 'DUO-XXX'}
                  </span>
                </div>
                <button
                  onClick={handleCopyCode}
                  className="px-4 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-bold text-xs flex items-center gap-2 transition-all shadow-md shadow-pink-600/30"
                >
                  {copiedCode ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedCode ? 'Copied!' : 'Copy Code'}</span>
                </button>
              </div>

              {/* 1-Click Direct Link */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2">
                <div className="truncate text-xs font-mono text-slate-400">
                  Invite Link: <span className="text-pink-300">{window.location.origin}?invite={currentCode}</span>
                </div>
                <button
                  onClick={handleCopyLink}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 shrink-0"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Share2 className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? 'Copied!' : 'Copy Link'}</span>
                </button>
              </div>

              <p className="text-[11px] text-slate-400 pt-1 leading-relaxed">
                🚀 <strong>Share with multiple friends</strong>: Anyone who enters this code or opens your link will immediately join your squad room. You can all talk in voice calls, chat, share files, and take quizzes together!
              </p>
            </div>
          </div>
        )}

        {/* TAB 3: JOIN ANOTHER SQUAD */}
        {activeTab === 'join' && (
          <form onSubmit={handleJoinByCode} className="space-y-4 animate-in fade-in">
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5">
                Enter Friend's Room Code (e.g. DUO-121):
              </label>
              <input
                type="text"
                required
                placeholder="DUO-XXX"
                value={inviteCodeInput}
                onChange={(e) => setInviteCodeInput(e.target.value.toUpperCase())}
                className="w-full glass-input rounded-xl px-4 py-3 text-base font-mono tracking-widest text-cyan-300 placeholder:text-slate-600 uppercase"
                autoFocus
              />
            </div>

            <button
              type="submit"
              disabled={loading || !inviteCodeInput.trim()}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs shadow-lg shadow-emerald-600/30 transition-all disabled:opacity-50"
            >
              {loading ? 'Joining Squad...' : 'Join Friend’s Squad Room 🚀'}
            </button>

            <p className="text-[11px] text-slate-400 text-center">
              You will immediately join their shared room, squad chat, and voice calls.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
