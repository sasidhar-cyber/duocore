import React from 'react';
import { Music, MessageSquare, Heart, Settings } from 'lucide-react';

export function BottomNav({ activeTab, onTabChange, unreadCount = 0 }) {
  return (
    <nav className="sticky bottom-0 z-40 w-full bg-slate-950/95 backdrop-blur-xl border-t border-slate-800/80 px-4 py-2 flex items-center justify-around select-none">
      {/* 🎵 Music Tab */}
      <button
        onClick={() => onTabChange('music')}
        className={`flex flex-col items-center gap-1 py-1 px-4 rounded-2xl transition-all ${
          activeTab === 'music'
            ? 'text-emerald-400 font-black scale-105'
            : 'text-slate-400 hover:text-slate-200 font-semibold'
        }`}
      >
        <div className={`p-1.5 rounded-xl ${activeTab === 'music' ? 'bg-emerald-500/20 shadow-sm' : ''}`}>
          <Music className="w-5 h-5" />
        </div>
        <span className="text-[11px] tracking-tight">Music</span>
      </button>

      {/* 💬 Duo Chat Tab */}
      <button
        onClick={() => onTabChange('chat')}
        className={`flex flex-col items-center gap-1 py-1 px-4 rounded-2xl transition-all relative ${
          activeTab === 'chat'
            ? 'text-emerald-400 font-black scale-105'
            : 'text-slate-400 hover:text-slate-200 font-semibold'
        }`}
      >
        <div className={`p-1.5 rounded-xl relative ${activeTab === 'chat' ? 'bg-emerald-500/20 shadow-sm' : ''}`}>
          <MessageSquare className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 text-slate-950 text-[9px] font-black rounded-full flex items-center justify-center animate-pulse">
              {unreadCount}
            </span>
          )}
        </div>
        <span className="text-[11px] tracking-tight">Duo Chat</span>
      </button>
    </nav>
  );
}
