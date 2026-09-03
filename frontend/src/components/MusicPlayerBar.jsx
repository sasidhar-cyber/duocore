import React from 'react';
import { useMusic } from '../context/MusicContext';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Heart,
  Maximize2,
  Mic2,
  Clock,
  ListMusic
} from 'lucide-react';

export function MusicPlayerBar() {
  const {
    currentTrack,
    isPlaying,
    isBuffering,
    togglePlay,
    nextTrack,
    prevTrack,
    currentTime,
    duration,
    seekTo,
    toggleFavorite,
    isFavorite,
    openNowPlaying,
    setIsLyricsOpen,
    openQueue,
    sleepTimeRemaining
  } = useMusic();

  if (!currentTrack) return null;

  const liked = isFavorite(currentTrack.id);
  const progressPercent = duration ? (currentTime / duration) * 100 : 0;

  return (
    <div
      onClick={openNowPlaying}
      className="fixed bottom-0 left-0 right-0 z-30 bg-slate-950/95 backdrop-blur-xl border-t border-emerald-500/30 shadow-[0_-10px_30px_rgba(0,0,0,0.8)] select-none pb-[max(0.25rem,env(safe-area-inset-bottom))] cursor-pointer group"
    >
      {/* Top Scrub Progress Bar */}
      <div
        onClick={(e) => {
          e.stopPropagation();
          const rect = e.currentTarget.getBoundingClientRect();
          const clickX = e.clientX - rect.left;
          const newTime = (clickX / rect.width) * (duration || 1);
          seekTo(newTime);
        }}
        className="w-full h-1 bg-slate-800 hover:h-2 transition-all cursor-pointer relative group"
      >
        <div
          className="h-full bg-emerald-500 rounded-r-full relative"
          style={{ width: `${progressPercent}%` }}
        >
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-white rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2 flex items-center justify-between gap-2 sm:gap-3">
        {/* Track Info (Click to Expand to Full Screen Player) */}
        <div
          className="flex items-center gap-2.5 sm:gap-3 min-w-0 max-w-[55%] sm:max-w-[40%] flex-1"
        >
          <div className="relative w-10 h-10 sm:w-12 sm:h-12 rounded-xl overflow-hidden shrink-0 ring-1 ring-emerald-500/30 group-hover:ring-emerald-400 transition-all shadow-md">
            <img
              src={currentTrack.thumbnail || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&h=300&fit=crop'}
              alt={currentTrack.title}
              onError={(e) => {
                e.target.src = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&h=300&fit=crop';
              }}
              className="w-full h-full object-cover"
            />
            {isPlaying && (
              <div className="absolute bottom-1 right-1 flex items-end gap-0.5 h-2.5 sm:h-3">
                <div className="w-0.5 h-full bg-emerald-400 animate-pulse" />
                <div className="w-0.5 h-2/3 bg-emerald-400 animate-pulse delay-75" />
                <div className="w-0.5 h-4/5 bg-emerald-400 animate-pulse delay-150" />
              </div>
            )}
          </div>

          <div className="min-w-0">
            <h4 className="text-xs sm:text-sm font-black text-white truncate group-hover:text-emerald-400 transition-colors">
              {currentTrack.title}
            </h4>
            <p className="text-[10px] sm:text-[11px] text-slate-400 font-medium truncate mt-0.5">
              {currentTrack.artist}
            </p>
          </div>
        </div>

        {/* Center Playback Controls */}
        <div
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-1.5 sm:gap-3 shrink-0"
        >
          <button
            onClick={prevTrack}
            className="p-1.5 sm:p-2 text-slate-400 hover:text-white transition-all active:scale-95 hidden xs:block"
            title="Previous"
          >
            <SkipBack className="w-4 h-4 fill-current" />
          </button>

          <button
            onClick={togglePlay}
            className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-emerald-500/30 transition-transform active:scale-90"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isBuffering ? (
              <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
            ) : isPlaying ? (
              <Pause className="w-5 h-5 fill-current" />
            ) : (
              <Play className="w-5 h-5 fill-current ml-0.5" />
            )}
          </button>

          <button
            onClick={nextTrack}
            className="p-1.5 sm:p-2 text-slate-400 hover:text-white transition-all active:scale-95"
            title="Next"
          >
            <SkipForward className="w-4 h-4 fill-current" />
          </button>
        </div>

        {/* Right Tools: Like, Lyrics, Queue, Sleep Timer & Expand */}
        <div
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-1 sm:gap-2 shrink-0"
        >
          {/* Sleep Timer Indicator */}
          {sleepTimeRemaining && (
            <span className="hidden md:inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-900 border border-slate-800 text-[10px] font-mono text-cyan-300">
              <Clock className="w-3 h-3" />
              <span>{sleepTimeRemaining}</span>
            </span>
          )}

          {/* Like */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleFavorite(currentTrack);
            }}
            className={`p-1.5 sm:p-2 rounded-xl transition-transform active:scale-90 ${
              liked ? 'text-emerald-400' : 'text-slate-500 hover:text-white'
            }`}
            title={liked ? 'Unlike' : 'Like'}
          >
            <Heart className={`w-4 h-4 ${liked ? 'fill-emerald-400' : ''}`} />
          </button>

          {/* Lyrics */}
          <button
            onClick={() => setIsLyricsOpen(true)}
            className="p-2 rounded-xl text-slate-400 hover:text-emerald-400 hover:bg-slate-900 transition-all hidden sm:block"
            title="Lyrics"
          >
            <Mic2 className="w-4 h-4" />
          </button>

          {/* Queue */}
          <button
            onClick={openQueue}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900 transition-all hidden sm:block"
            title="Queue"
          >
            <ListMusic className="w-4 h-4" />
          </button>

          {/* Expand to Full Screen Now Playing */}
          <button
            onClick={openNowPlaying}
            className="p-1.5 sm:p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900 transition-all"
            title="Expand Full Player"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
