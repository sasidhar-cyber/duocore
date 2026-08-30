import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRoom } from '../context/RoomContext';
import { InviteModal } from '../components/InviteModal';
import {
  Shield,
  Terminal,
  Swords,
  Users,
  Flame,
  Zap,
  ArrowRight,
  Sparkles,
  MessageSquare,
  UserPlus
} from 'lucide-react';
import { playSound } from '../utils/soundEffects';

export function DashboardPage({ onSelectTrack, onOpenRoom, onChallengeQuiz }) {
  const { user } = useAuth();
  const {
    hasPartner,
    partner,
    roomData,
    pendingInvite,
    setActiveChannel
  } = useRoom();

  const [inviteModalOpen, setInviteModalOpen] = useState(false);

  const handleOpenChat = () => {
    setActiveChannel('normal');
    onOpenRoom();
    playSound('click');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-in fade-in duration-200">
      {/* Top Welcome & Partner Banner */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-pink-500/30 shadow-2xl relative overflow-hidden bg-slate-950/90">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Left: User Welcome & Level (7 cols) */}
          <div className="lg:col-span-7 space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-500/10 border border-pink-500/30 text-pink-300 text-xs font-bold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>DUOCORE Arena • Pair Learning</span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-cyan-300">{user?.username || 'Hacker'}</span>!
            </h1>

            <p className="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed max-w-xl">
              Master Cybersecurity & Linux alongside your study partner with real-time synchronized labs, focus timers, and 1v1 quiz battles.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <div className="px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-2 text-xs font-mono">
                <Zap className="w-3.5 h-3.5 text-cyan-400" />
                <span className="font-bold text-white">{user?.xp || 0} XP</span>
              </div>

              <div className="px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-2 text-xs font-mono">
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                <span className="font-bold text-white">{user?.streak || 1}d Streak</span>
              </div>

              <div className="px-3.5 py-1.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-2 text-xs font-mono">
                <Shield className="w-3.5 h-3.5 text-pink-400" />
                <span className="font-bold text-white">Level {user?.level || 1}</span>
              </div>
            </div>
          </div>

          {/* Right: DUO PARTNER STATUS (5 cols) */}
          <div className="lg:col-span-5">
            {hasPartner ? (
              <div className="p-5 rounded-2xl bg-slate-900/90 border border-emerald-500/30 space-y-4 shadow-xl">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono font-bold uppercase text-emerald-400 tracking-wider flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>DUO PARTNER CONNECTED</span>
                  </span>
                  <span className="text-xs font-mono text-slate-400">
                    Room: {roomData?.code}
                  </span>
                </div>

                <div className="flex items-center gap-3.5 p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <img
                    src={partner?.avatar_url || 'https://api.dicebear.com/7.x/bottts/svg?seed=partner'}
                    alt={partner?.username}
                    className="w-12 h-12 rounded-xl object-cover ring-2 ring-emerald-500/50"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-black text-white truncate">{partner?.username}</h4>
                    <p className="text-xs text-cyan-300 truncate">{partner?.current_topic || 'Studying Linux & Cyber'}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Lv.{partner?.level || 1} • {partner?.xp || 0} XP
                    </p>
                  </div>
                </div>

                {/* Partner Action Grid */}
                <div className="grid grid-cols-3 gap-2 pt-1">
                  <button
                    onClick={handleOpenChat}
                    className="py-2.5 px-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-indigo-600/20"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Chat</span>
                  </button>

                  <button
                    onClick={() => { onChallengeQuiz(); playSound('click'); }}
                    className="py-2.5 px-2 rounded-xl bg-pink-600 hover:bg-pink-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-pink-600/20"
                  >
                    <Swords className="w-3.5 h-3.5" />
                    <span>1v1 Quiz</span>
                  </button>

                  <button
                    onClick={() => setInviteModalOpen(true)}
                    className="py-2.5 px-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>Manage</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-5 rounded-2xl bg-slate-900/90 border border-pink-500/30 space-y-3 shadow-xl">
                <div className="flex items-center gap-2 text-pink-300 font-bold text-xs uppercase tracking-wider">
                  <UserPlus className="w-4 h-4" />
                  <span>Connect with Study Partner</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Pair up with your friend once. You'll permanently share real-time chat, focus clocks, and 1v1 quizzes.
                </p>

                {pendingInvite ? (
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-mono">Your Invite Code:</span>
                      <span className="text-xl font-black font-mono text-cyan-300">{pendingInvite.code}</span>
                    </div>
                    <button
                      onClick={() => setInviteModalOpen(true)}
                      className="px-3 py-1.5 rounded-lg bg-pink-600 hover:bg-pink-500 text-white font-bold text-xs"
                    >
                      View Details
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setInviteModalOpen(true)}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 hover:from-pink-500 hover:to-indigo-500 text-white font-black text-xs shadow-lg shadow-pink-600/30 transition-all flex items-center justify-center gap-2"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Invite Friend / Enter Code 🚀</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2 Master Learning Tracks */}
      <div className="space-y-4">
        <h3 className="text-lg font-black text-white flex items-center gap-2">
          <span>🎯 Dual Learning Tracks</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Cybersecurity Track Card */}
          <div
            onClick={() => { onSelectTrack('cyber'); playSound('click'); }}
            className="glass-card p-6 rounded-3xl border border-pink-500/30 hover:border-pink-500/70 cursor-pointer group transition-all space-y-4 relative overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-pink-500/20 border border-pink-500/30 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                🛡️
              </div>
              <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/30">
                30 Levels
              </span>
            </div>

            <div>
              <h4 className="text-lg font-black text-white group-hover:text-pink-300 transition-colors">
                Cybersecurity Roadmap
              </h4>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                From the CIA Triad and Cryptography to SQL Injection, Cross-Site Scripting, and SIEM monitoring with interactive labs.
              </p>
            </div>

            <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs text-pink-400 font-bold">
              <span>Open 30-Level Game Map</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>

          {/* Linux Track Card */}
          <div
            onClick={() => { onSelectTrack('linux'); playSound('click'); }}
            className="glass-card p-6 rounded-3xl border border-emerald-500/30 hover:border-emerald-500/70 cursor-pointer group transition-all space-y-4 relative overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                🐧
              </div>
              <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                16 Levels
              </span>
            </div>

            <div>
              <h4 className="text-lg font-black text-white group-hover:text-emerald-300 transition-colors">
                Linux Terminal Labs
              </h4>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Hands-on POSIX virtual terminal with auto-validation for navigation, permissions, processes, networking, and system hardening.
              </p>
            </div>

            <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs text-emerald-400 font-bold">
              <span>Launch Virtual Terminal Lab</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </div>
      </div>

      <InviteModal
        isOpen={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
      />
    </div>
  );
}
