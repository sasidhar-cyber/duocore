import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useRoom } from '../context/RoomContext';
import { getHackerRank } from '../utils/hackerTitles';
import { Shield, Terminal, Users, Sparkles, UserPlus } from 'lucide-react';
import { playSound } from '../utils/soundEffects';

export function DualPresenceBar({ onOpenInvite }) {
  const { user } = useAuth();
  const { hasRoom, members, partner, roomData } = useRoom();

  const myRank = getHackerRank(user?.level || 1, user?.xp || 0);
  const otherMembers = members.filter((m) => m.id !== user?.id);

  return (
    <div className="glass-panel p-4 rounded-3xl border border-slate-800 shadow-xl bg-slate-950/80">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
        {/* Current User Presence */}
        <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-slate-900/80 border border-slate-800/80">
          <div className="relative">
            <img
              src={user?.avatar_url || 'https://api.dicebear.com/7.x/bottts/svg?seed=duocore'}
              alt={user?.username}
              className="w-11 h-11 rounded-2xl object-cover ring-2 ring-pink-500/60 shadow-md"
            />
            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-slate-950" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-xs font-black text-white truncate">{user?.username} (You)</h4>
              <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-bold border ${myRank.badgeColor}`}>
                {myRank.icon} {myRank.title}
              </span>
            </div>
            <p className="text-[11px] text-pink-300 font-medium truncate mt-0.5 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-pink-400 animate-pulse" />
              <span>Studying: Cybersecurity & Linux</span>
            </p>
          </div>
        </div>

        {/* Squad Members Presence or Connect Prompt */}
        <div className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-slate-900/80 border border-slate-800/80">
          {otherMembers.length > 0 ? (
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex items-center -space-x-3 shrink-0">
                {otherMembers.slice(0, 4).map((m) => (
                  <div key={m.id} className="relative group/squad" title={`${m.username} (Lv.${m.level || 1})`}>
                    <img
                      src={m.avatar_url || 'https://api.dicebear.com/7.x/bottts/svg?seed=squad'}
                      alt={m.username}
                      className="w-10 h-10 rounded-2xl object-cover ring-2 ring-indigo-500/60 shadow-md bg-slate-900"
                    />
                    <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-slate-950" />
                  </div>
                ))}
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h4 className="text-xs font-black text-white truncate">
                    {otherMembers.length === 1
                      ? otherMembers[0].username
                      : `${otherMembers[0].username} +${otherMembers.length - 1} friends`}
                  </h4>
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                    SQUAD ({otherMembers.length + 1})
                  </span>
                </div>
                <p className="text-[11px] text-cyan-300 font-medium truncate mt-0.5 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                  <span>{otherMembers[0]?.current_topic || 'Linux & Cybersecurity Labs'}</span>
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400">
                <Users className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-bold text-slate-300 truncate">No Squad Friends Yet</h4>
                <p className="text-[10px] text-slate-500">Invite friends with your room code</p>
              </div>
            </div>
          )}

          <button
            onClick={() => {
              if (onOpenInvite) onOpenInvite();
              playSound('click');
            }}
            className={`px-3 py-1.5 rounded-xl text-[11px] font-bold whitespace-nowrap shadow-sm flex items-center gap-1.5 transition-all ${
              otherMembers.length > 0
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                : 'bg-pink-600/30 hover:bg-pink-600/50 text-pink-300 border border-pink-500/40'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>{otherMembers.length > 0 ? '+ Add Friends' : 'Invite Friends'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
