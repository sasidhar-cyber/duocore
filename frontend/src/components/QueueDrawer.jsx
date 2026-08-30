import React from 'react';
import { useMusic } from '../context/MusicContext';
import {
  ListMusic,
  Trash2,
  Play,
  Pause,
  X,
  Sparkles,
  Music,
  Disc3
} from 'lucide-react';

export function QueueDrawer() {
  const {
    isQueueOpen,
    closeQueue,
    queue,
    currentIndex,
    currentTrack,
    isPlaying,
    playTrack,
    togglePlay,
    removeFromQueue,
    clearQueue
  } = useMusic();

  if (!isQueueOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-md animate-in fade-in select-none">
      <div className="w-full max-w-md bg-slate-950/95 border-l border-emerald-500/30 h-full flex flex-col p-4 sm:p-6 shadow-2xl animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <ListMusic className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-black text-white">Playing Queue</h3>
            <span className="px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/30 text-[10px] font-mono text-emerald-300">
              {queue.length} Tracks
            </span>
          </div>

          <div className="flex items-center gap-1">
            {queue.length > 1 && (
              <button
                onClick={clearQueue}
                className="px-2.5 py-1 rounded-xl text-[11px] font-bold text-slate-400 hover:text-red-400 hover:bg-slate-900 border border-slate-800 transition-all flex items-center gap-1"
                title="Clear Queue"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>
            )}

            <button
              onClick={closeQueue}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Currently Playing Section */}
        {currentTrack && (
          <div className="py-4 border-b border-slate-800/80 shrink-0 space-y-2">
            <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 font-bold">
              NOW PLAYING
            </span>

            <div className="p-3 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 flex items-center justify-between gap-3 shadow-lg">
              <div className="flex items-center gap-3 min-w-0">
                <img
                  src={currentTrack.thumbnail}
                  alt={currentTrack.title}
                  className="w-12 h-12 rounded-xl object-cover ring-1 ring-emerald-500/40 shrink-0"
                />
                <div className="min-w-0">
                  <h4 className="text-xs sm:text-sm font-bold text-emerald-400 truncate">
                    {currentTrack.title}
                  </h4>
                  <p className="text-[11px] text-slate-300 truncate">{currentTrack.artist}</p>
                </div>
              </div>

              <button
                onClick={togglePlay}
                className="w-9 h-9 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center justify-center font-bold text-sm shrink-0 transition-transform active:scale-95 shadow-md shadow-emerald-500/30"
              >
                {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
              </button>
            </div>
          </div>
        )}

        {/* Up Next List */}
        <div className="flex-1 overflow-y-auto py-3 space-y-2">
          <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500 font-bold block px-1">
            UP NEXT ({Math.max(0, queue.length - 1)})
          </span>

          {queue.length <= 1 ? (
            <div className="py-12 text-center text-slate-500 space-y-2">
              <Disc3 className="w-10 h-10 mx-auto text-slate-700 animate-spin" />
              <p className="text-xs">No upcoming tracks in queue.</p>
              <p className="text-[10px] text-slate-600">Select any song from home or playlists to keep the vibes going!</p>
            </div>
          ) : (
            queue.map((track, idx) => {
              if (idx === currentIndex) return null;
              return (
                <div
                  key={`${track.id}-${idx}`}
                  onClick={() => playTrack(track)}
                  className="p-2.5 rounded-2xl bg-slate-900/60 hover:bg-slate-850 border border-slate-800/80 hover:border-slate-700 flex items-center justify-between gap-2.5 cursor-pointer group transition-all"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-[10px] font-mono text-slate-500 w-4 text-center">{idx + 1}</span>
                    <img
                      src={track.thumbnail}
                      alt={track.title}
                      className="w-10 h-10 rounded-xl object-cover shrink-0"
                    />
                    <div className="min-w-0">
                      <h5 className="text-xs font-bold text-white truncate group-hover:text-emerald-400 transition-colors">
                        {track.title}
                      </h5>
                      <p className="text-[10px] text-slate-400 truncate">{track.artist}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-[10px] font-mono text-slate-500">{track.duration}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFromQueue(idx);
                      }}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Remove from queue"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
