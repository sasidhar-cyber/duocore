import React, { useState } from 'react';
import { useMusic } from '../context/MusicContext';
import {
  ListMusic,
  Trash2,
  Play,
  Pause,
  X,
  Sparkles,
  Music,
  Disc3,
  FolderPlus,
  ArrowUp,
  ArrowDown,
  Radio,
  Check
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
    clearQueue,
    reorderQueue,
    isAutoplay,
    setIsAutoplay,
    createPlaylist,
    addSongToPlaylist
  } = useMusic();

  const [savingPlaylist, setSavingPlaylist] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  React.useEffect(() => {
    if (!isQueueOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        closeQueue();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isQueueOpen, closeQueue]);

  if (!isQueueOpen) return null;

  // Calculate total duration
  const totalSeconds = queue.reduce((acc, track) => {
    if (track.seconds) return acc + track.seconds;
    if (track.duration && track.duration.includes(':')) {
      const [m, s] = track.duration.split(':').map(Number);
      return acc + (m * 60 + (s || 0));
    }
    return acc + 210; // Default 3.5 min
  }, 0);

  const totalMinutes = Math.round(totalSeconds / 60);

  const handleSaveQueueAsPlaylist = async () => {
    if (queue.length === 0 || savingPlaylist) return;
    setSavingPlaylist(true);
    try {
      const title = `Queue (${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`;
      const pl = await createPlaylist(title, `Saved queue with ${queue.length} tracks`);
      if (pl?.id) {
        for (const track of queue) {
          await addSongToPlaylist(pl.id, track).catch(() => {});
        }
      }
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (e) {
      console.warn('Save queue error:', e);
    } finally {
      setSavingPlaylist(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-md animate-in fade-in select-none">
      <div className="w-full max-w-md bg-slate-950/95 border-l border-emerald-500/30 h-full flex flex-col p-4 sm:p-6 shadow-2xl animate-in slide-in-from-right duration-300">

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <ListMusic className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-black text-white">Playing Queue</h3>
            <span className="px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-500/30 text-[10px] font-mono text-emerald-300">
              {queue.length} Tracks • {totalMinutes}m
            </span>
          </div>

          <div className="flex items-center gap-1.5">
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

        {/* Quick Toolbar (Autoplay toggle & Save Queue) */}
        <div className="py-2.5 border-b border-slate-800/80 flex items-center justify-between gap-2 shrink-0">
          <button
            onClick={() => setIsAutoplay(!isAutoplay)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
              isAutoplay
                ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                : 'bg-slate-900 text-slate-400 border-slate-800'
            }`}
            title="Automatically queue similar songs when playlist ends"
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Autoplay: {isAutoplay ? 'ON' : 'OFF'}</span>
          </button>

          {queue.length > 0 && (
            <button
              onClick={handleSaveQueueAsPlaylist}
              disabled={savingPlaylist || savedSuccess}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-cyan-300 bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 transition-all"
            >
              {savedSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Saved!</span>
                </>
              ) : (
                <>
                  <FolderPlus className="w-3.5 h-3.5" />
                  <span>{savingPlaylist ? 'Saving...' : 'Save as Playlist'}</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Currently Playing Section */}
        {currentTrack && (
          <div className="py-3 border-b border-slate-800/80 shrink-0 space-y-1.5">
            <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 font-bold">
              NOW PLAYING
            </span>

            <div className="p-3 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 flex items-center justify-between gap-3 shadow-lg">
              <div className="flex items-center gap-3 min-w-0">
                <img
                  src={currentTrack.thumbnail || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=150&h=150&fit=crop'}
                  alt={currentTrack.title}
                  onError={(e) => {
                    e.target.src = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=150&h=150&fit=crop';
                  }}
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
              <p className="text-[10px] text-slate-600">Autoplay is active and will find similar tracks when playback ends!</p>
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
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <span className="text-[10px] font-mono text-slate-500 w-4 text-center">{idx + 1}</span>
                    <img
                      src={track.thumbnail || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=150&h=150&fit=crop'}
                      alt={track.title}
                      onError={(e) => {
                        e.target.src = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=150&h=150&fit=crop';
                      }}
                      className="w-10 h-10 rounded-xl object-cover shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <h5 className="text-xs font-bold text-white truncate group-hover:text-emerald-400 transition-colors">
                        {track.title}
                      </h5>
                      <p className="text-[10px] text-slate-400 truncate">{track.artist}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-[10px] font-mono text-slate-500 mr-1">{track.duration || '3:45'}</span>

                    {/* Reorder Up/Down */}
                    {idx > 0 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          reorderQueue(idx, idx - 1);
                        }}
                        className="p-1 rounded text-slate-500 hover:text-white hover:bg-slate-800 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Move Up"
                      >
                        <ArrowUp className="w-3 h-3" />
                      </button>
                    )}
                    {idx < queue.length - 1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          reorderQueue(idx, idx + 1);
                        }}
                        className="p-1 rounded text-slate-500 hover:text-white hover:bg-slate-800 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Move Down"
                      >
                        <ArrowDown className="w-3 h-3" />
                      </button>
                    )}

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
