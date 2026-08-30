import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRoom } from '../context/RoomContext';
import { getHackerRank } from '../utils/hackerTitles';
import { InviteModal } from './InviteModal';
import { ProfileEditModal } from './ProfileEditModal';
import {
  Home,
  Shield,
  Terminal,
  MessageSquare,
  Swords,
  UserPlus,
  Volume2,
  VolumeX,
  LogOut,
  User,
  Users,
  Edit3,
  Sparkles
} from 'lucide-react';
import { playSound } from '../utils/soundEffects';

export function Navbar({ activeTab, setActiveTab }) {
  const { user, logout, soundEnabled, toggleSound } = useAuth();
  const { hasPartner, partner, members } = useRoom();
  const [profileOpen, setProfileOpen] = useState(false);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [profileEditModalOpen, setProfileEditModalOpen] = useState(false);

  const rank = getHackerRank(user?.level || 1, user?.xp || 0);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'cyber', label: 'Cybersecurity 🛡️', icon: Shield },
    { id: 'linux', label: 'Linux 🐧', icon: Terminal },
    { id: 'room', label: 'Squad Chat 💬', icon: MessageSquare },
    { id: 'quiz', label: 'Quiz Arena ⚔️', icon: Swords }
  ];

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/85 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-500 via-indigo-600 to-cyan-500 p-[1.5px] shadow-lg shadow-pink-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-lg font-black text-pink-400">
                🛡️
              </div>
            </div>
            <div className="hidden sm:block">
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-white via-pink-200 to-cyan-300">
                  DUOCORE
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-pink-500/20 text-pink-300 font-black border border-pink-500/30">
                  SQUAD
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-semibold -mt-0.5">
                Learn. Practice. Challenge. Together.
              </p>
            </div>
          </div>

          <nav className="hidden lg:flex items-center gap-1.5 overflow-x-auto py-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    playSound('click');
                  }}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-pink-600/30 to-indigo-600/30 text-white border border-pink-500/50 shadow-sm shadow-pink-500/20 scale-[1.02]'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-pink-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="flex items-center gap-2.5">
            {/* Squad Status / Add Friends Button */}
            <button
              onClick={() => {
                setInviteModalOpen(true);
                playSound('click');
              }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-mono group shadow-sm transition-all ${
                members.length > 1
                  ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-300 hover:border-emerald-400 shadow-emerald-500/10'
                  : 'bg-indigo-950/70 border-indigo-500/40 text-pink-300 hover:border-pink-400 shadow-pink-500/10'
              }`}
              title={members.length > 1 ? `${members.length} Squad Members Connected` : 'Invite Friends to Your Room'}
            >
              <div className={`w-2 h-2 rounded-full ${members.length > 1 ? 'bg-emerald-400 animate-pulse' : 'bg-pink-400 animate-ping'}`} />
              <span className="font-bold">
                {members.length > 1 ? `Squad (${members.length})` : '+ Add Friends'}
              </span>
            </button>

            <button
              onClick={toggleSound}
              className={`p-2 rounded-xl border transition-all ${
                soundEnabled
                  ? 'bg-slate-900/80 border-slate-800 text-pink-400'
                  : 'bg-slate-900/40 border-slate-800/40 text-slate-500'
              }`}
              title={soundEnabled ? 'Sound Effects Enabled' : 'Sound Effects Muted'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {user ? (
              <div className="relative">
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="flex items-center gap-2 p-1 pl-2 pr-2.5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-pink-500/40 transition-all"
                >
                  <img
                    src={user.avatar_url || 'https://api.dicebear.com/7.x/bottts/svg?seed=duocore'}
                    alt={user.username}
                    className="w-7 h-7 rounded-lg bg-slate-800 object-cover ring-1 ring-pink-500/40"
                  />
                  <div className="text-left hidden md:block">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-200">{user.username}</span>
                      <span className={`text-[9px] px-1 rounded font-bold border ${rank.badgeColor}`}>
                        {rank.icon} {rank.title.split(' ')[0]}
                      </span>
                    </div>
                  </div>
                </button>

                {profileOpen && (
                  <div className="absolute right-0 mt-2 w-64 rounded-2xl glass-panel p-3 shadow-2xl border border-slate-700/80 z-50 animate-in fade-in zoom-in-95 duration-150 bg-slate-950/95">
                    <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 mb-3">
                      <img
                        src={user.avatar_url || 'https://api.dicebear.com/7.x/bottts/svg?seed=duocore'}
                        alt={user.username}
                        className="w-10 h-10 rounded-xl bg-slate-800 object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <h4 className="text-sm font-bold text-white truncate">{user.username}</h4>
                        <p className={`text-[10px] font-bold mt-0.5 truncate ${rank.color}`}>
                          {rank.icon} {rank.title}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-cyan-300 font-mono font-semibold">
                            ⚡ {user.xp || 0} XP
                          </span>
                          <span className="text-[10px] text-amber-300 font-mono font-semibold">
                            🔥 {user.streak || 1}d Streak
                          </span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setProfileOpen(false);
                        setProfileEditModalOpen(true);
                        playSound('click');
                      }}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-indigo-300 bg-indigo-950/50 border border-indigo-800/40 hover:bg-indigo-900/60 transition-all mb-2"
                    >
                      <span className="flex items-center gap-1.5">
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>✏️ Rename / Edit Profile</span>
                      </span>
                    </button>

                    <button
                      onClick={() => { logout(); setProfileOpen(false); }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-red-400 hover:bg-red-950/40 transition-all text-left"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Log Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => setActiveTab('auth')}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-pink-600 to-indigo-600 text-white text-xs font-bold hover:shadow-lg hover:shadow-pink-500/25 transition-all"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </header>

      <InviteModal
        isOpen={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
      />

      <ProfileEditModal
        isOpen={profileEditModalOpen}
        onClose={() => setProfileEditModalOpen(false)}
      />
    </>
  );
}
