import React from 'react';
import { Music2, Heart, History, Download, ListMusic, Compass, Search } from 'lucide-react';

const ICON_MAP = {
  music: Music2,
  heart: Heart,
  history: History,
  download: Download,
  playlist: ListMusic,
  explore: Compass,
  search: Search
};

export function EmptyState({
  icon = 'music',
  title = 'No items found',
  description = 'Start exploring music to see items here.',
  actionText,
  onAction,
  className = ''
}) {
  const IconComponent = ICON_MAP[icon] || Music2;

  return (
    <div className={`flex flex-col items-center justify-center text-center p-8 sm:p-12 rounded-3xl bg-slate-900/40 border border-slate-800/80 my-4 ${className}`}>
      <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mb-4 text-cyan-400">
        <IconComponent className="w-8 h-8" />
      </div>
      <h4 className="text-base sm:text-lg font-bold text-white mb-1.5">{title}</h4>
      <p className="text-xs sm:text-sm text-slate-400 max-w-sm mb-5 leading-relaxed">{description}</p>
      {actionText && onAction && (
        <button
          onClick={onAction}
          className="px-5 py-2.5 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs sm:text-sm transition-all shadow-lg shadow-cyan-500/20 active:scale-95"
        >
          {actionText}
        </button>
      )}
    </div>
  );
}
