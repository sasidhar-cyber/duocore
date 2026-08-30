import React, { useState } from 'react';
import { useMusic } from '../context/MusicContext';
import { useRoom } from '../context/RoomContext';
import api from '../services/api';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  RotateCw,
  Shuffle,
  Repeat,
  Heart,
  Mic2,
  Download,
  Share2,
  Volume2,
  VolumeX,
  ChevronDown,
  Clock,
  Sliders,
  ListMusic,
  Plus,
  Send,
  Sparkles,
  Check
} from 'lucide-react';
import { playSound } from '../utils/soundEffects';

const SLEEP_OPTIONS = [
  { label: '10 Minutes', value: 10 },
  { label: '20 Minutes', value: 20 },
  { label: '30 Minutes', value: 30 },
  { label: '45 Minutes', value: 45 },
  { label: '60 Minutes', value: 60 },
  { label: 'End of Current Song', value: 'end_of_song' }
];

export function NowPlayingModal({ isOpen, onClose }) {
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
    skipTime,
    isShuffle,
    setIsShuffle,
    isLoop,
    setIsLoop,
    favorites,
    toggleFavorite,
    isFavorite,
    setIsLyricsOpen,
    openQueue,
    openPlaylistModal,
    activeEqPreset,
    applyEqPreset,
    EQ_PRESETS,
    sleepTimerOption,
    sleepTimeRemaining,
    setSleepTimer,
    cancelSleepTimer
  } = useMusic();

  const { hasRoom, roomData, sendMessage } = useRoom();

  const [sleepMenuOpen, setSleepMenuOpen] = useState(false);
  const [eqMenuOpen, setEqMenuOpen] = useState(false);
  const [sharedToast, setSharedToast] = useState(false);

  if (!isOpen || !currentTrack) return null;

  const liked = isFavorite(currentTrack.id);

  const formatTime = (secs) => {
    if (isNaN(secs) || secs === Infinity) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleSeek = (e) => {
    const newTime = parseFloat(e.target.value);
    seekTo(newTime);
  };

  const handleDownload = () => {
    const downloadUrl = api.getMusicDownloadUrl(currentTrack.id, `${currentTrack.artist} - ${currentTrack.title}`);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `${currentTrack.title}.mp3`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Native Web Share API
  const handleNativeShare = async () => {
    const shareUrl = `${window.location.origin}/?song=${encodeURIComponent(currentTrack.id)}`;
    const shareData = {
      title: `${currentTrack.title} — SoundWave`,
      text: `Listen to "${currentTrack.title}" by ${currentTrack.artist} on SoundWave!`,
      url: shareUrl
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        if (err.name !== 'AbortError') console.warn('Share error:', err);
      }
    } else {
      navigator.clipboard.writeText(shareUrl);
      alert('Song link copied to clipboard!');
    }
  };

  // Share to Duo
  const handleShareToDuo = () => {
    if (!hasRoom || !roomData?.id) {
      alert('Connect with your Duo friend first to share songs directly to chat!');
      return;
    }

    sendMessage({
      text: `🎵 Shared Song: ${currentTrack.title} - ${currentTrack.artist}`,
      channel: 'normal',
      metadata: {
        song: {
          id: currentTrack.id,
          title: currentTrack.title,
          artist: currentTrack.artist,
          thumbnail: currentTrack.thumbnail,
          duration: currentTrack.duration,
          album: currentTrack.album || ''
        }
      }
    });

    setSharedToast(true);
    playSound('quiz_correct');
    setTimeout(() => setSharedToast(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-40 bg-slate-950/98 backdrop-blur-xl flex flex-col justify-between p-3 sm:p-6 animate-in slide-in-from-bottom duration-300 select-none overflow-y-auto h-[100dvh]">
      {/* Top Header */}
      <div className="flex items-center justify-between max-w-2xl mx-auto w-full shrink-0 pt-1">
        <button
          onClick={onClose}
          className="p-2 rounded-2xl bg-slate-900/90 text-slate-300 hover:text-white border border-slate-800 transition-all active:scale-95"
          title="Minimize Player"
        >
          <ChevronDown className="w-5 h-5" />
        </button>

        <div className="text-center min-w-0 px-2">
          <span className="text-[9px] sm:text-[10px] font-mono tracking-widest uppercase text-emerald-400 font-bold block truncate">
            PLAYING FROM SOUNDWAVE
          </span>
          <h4 className="text-xs text-slate-300 font-medium truncate max-w-[200px] sm:max-w-md">
            {currentTrack.album || 'Official Studio Audio'}
          </h4>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Equalizer Preset Toggle */}
          <div className="relative">
            <button
              onClick={() => setEqMenuOpen(!eqMenuOpen)}
              className={`p-2 rounded-2xl border transition-all ${
                activeEqPreset !== 'Flat'
                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400'
                  : 'bg-slate-900/90 border-slate-800 text-slate-400 hover:text-white'
              }`}
              title="Audio Equalizer"
            >
              <Sliders className="w-4 h-4" />
            </button>

            {eqMenuOpen && (
              <div className="absolute right-0 mt-2 w-44 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-2 z-50 animate-in fade-in space-y-1">
                <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500 font-bold px-2 block py-1">
                  EQUALIZER PRESETS
                </span>
                {Object.keys(EQ_PRESETS).map((preset) => (
                  <button
                    key={preset}
                    onClick={() => { applyEqPreset(preset); setEqMenuOpen(false); }}
                    className={`w-full px-3 py-1.5 rounded-xl text-left text-xs font-bold transition-all flex items-center justify-between ${
                      activeEqPreset === preset
                        ? 'bg-emerald-500 text-slate-950'
                        : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span>{preset}</span>
                    {activeEqPreset === preset && <Check className="w-3.5 h-3.5 stroke-[2.5]" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Sleep Timer Toggle */}
          <div className="relative">
            <button
              onClick={() => setSleepMenuOpen(!sleepMenuOpen)}
              className={`p-2 rounded-2xl border transition-all flex items-center gap-1 ${
                sleepTimerOption
                  ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300'
                  : 'bg-slate-900/90 border-slate-800 text-slate-400 hover:text-white'
              }`}
              title="Sleep Timer"
            >
              <Clock className="w-4 h-4" />
              {sleepTimeRemaining && (
                <span className="text-[10px] font-mono font-bold">{sleepTimeRemaining}</span>
              )}
            </button>

            {sleepMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-2 z-50 animate-in fade-in space-y-1">
                <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500 font-bold px-2 block py-1">
                  SLEEP TIMER
                </span>
                {SLEEP_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => { setSleepTimer(opt.value); setSleepMenuOpen(false); }}
                    className={`w-full px-3 py-2 rounded-xl text-left text-xs font-bold transition-all flex items-center justify-between ${
                      sleepTimerOption === opt.value
                        ? 'bg-cyan-500 text-slate-950'
                        : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span>{opt.label}</span>
                    {sleepTimerOption === opt.value && <Check className="w-3.5 h-3.5" />}
                  </button>
                ))}
                {sleepTimerOption && (
                  <button
                    onClick={() => { cancelSleepTimer(); setSleepMenuOpen(false); }}
                    className="w-full px-3 py-1.5 rounded-xl text-left text-xs font-bold text-red-400 hover:bg-red-950/40 border-t border-slate-800 mt-1"
                  >
                    Turn Off Timer
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Shared to Duo Toast */}
      {sharedToast && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-2xl bg-emerald-500 text-slate-950 font-bold text-xs shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <Send className="w-4 h-4" />
          <span>Shared song to your Duo Partner!</span>
        </div>
      )}

      {/* Center Artwork & Info (Adaptive for mobile screens) */}
      <div className="flex flex-col items-center justify-center max-w-sm sm:max-w-md mx-auto w-full my-auto py-2 space-y-4 sm:space-y-6">
        <div className="relative aspect-square w-48 h-48 sm:w-64 sm:h-64 rounded-3xl overflow-hidden shadow-2xl ring-2 sm:ring-4 ring-emerald-500/20 group">
          <img
            src={currentTrack.thumbnail}
            alt={currentTrack.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
          />
        </div>

        {/* Title & Artist & Like Button */}
        <div className="flex items-center justify-between w-full px-2">
          <div className="min-w-0 pr-2">
            <h2 className="text-base sm:text-2xl font-black text-white truncate">
              {currentTrack.title}
            </h2>
            <p className="text-xs sm:text-sm text-emerald-400 font-semibold truncate mt-0.5">
              {currentTrack.artist}
            </p>
          </div>

          <button
            onClick={() => toggleFavorite(currentTrack)}
            className={`p-2.5 sm:p-3 rounded-2xl border transition-transform active:scale-90 ${
              liked
                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
            }`}
            title={liked ? 'Unlike' : 'Like'}
          >
            <Heart className={`w-5 h-5 ${liked ? 'fill-emerald-400' : ''}`} />
          </button>
        </div>

        {/* Audio Scrubber Timeline */}
        <div className="w-full space-y-1 px-2">
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
          />
          <div className="flex justify-between text-[10px] sm:text-[11px] font-mono text-slate-400">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Main Controls (-10s, Prev, Play/Pause, Next, +10s) */}
        <div className="flex items-center justify-center gap-3 sm:gap-6 w-full">
          <button
            onClick={() => skipTime(-10)}
            className="p-2 sm:p-2.5 rounded-2xl text-slate-400 hover:text-white hover:bg-slate-900 transition-all active:scale-95"
            title="Rewind 10s"
          >
            <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>

          <button
            onClick={prevTrack}
            className="p-2.5 sm:p-3 rounded-2xl text-slate-300 hover:text-white hover:bg-slate-900 transition-all active:scale-95"
            title="Previous Track"
          >
            <SkipBack className="w-5 h-5 sm:w-6 sm:h-6 fill-current" />
          </button>

          <button
            onClick={togglePlay}
            className="w-14 h-14 sm:w-16 sm:h-16 rounded-3xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center justify-center font-black shadow-xl shadow-emerald-500/40 transition-transform active:scale-90"
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isBuffering ? (
              <div className="w-6 h-6 border-3 border-slate-950 border-t-transparent rounded-full animate-spin" />
            ) : isPlaying ? (
              <Pause className="w-6 h-6 sm:w-7 sm:h-7 fill-current" />
            ) : (
              <Play className="w-6 h-6 sm:w-7 sm:h-7 fill-current ml-1" />
            )}
          </button>

          <button
            onClick={nextTrack}
            className="p-2.5 sm:p-3 rounded-2xl text-slate-300 hover:text-white hover:bg-slate-900 transition-all active:scale-95"
            title="Next Track"
          >
            <SkipForward className="w-5 h-5 sm:w-6 sm:h-6 fill-current" />
          </button>

          <button
            onClick={() => skipTime(10)}
            className="p-2 sm:p-2.5 rounded-2xl text-slate-400 hover:text-white hover:bg-slate-900 transition-all active:scale-95"
            title="Forward 10s"
          >
            <RotateCw className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </div>

      {/* Bottom Action Strip (Queue, Lyrics, Share to Duo, Add to Playlist, Download, Shuffle, Repeat) */}
      <div className="max-w-2xl mx-auto w-full pt-3 pb-2 border-t border-slate-800/80 flex items-center justify-between gap-1.5 sm:gap-2 px-1 shrink-0">
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Shuffle */}
          <button
            onClick={() => setIsShuffle(!isShuffle)}
            className={`p-2 sm:p-2.5 rounded-xl transition-all ${
              isShuffle ? 'text-emerald-400 bg-emerald-950/60' : 'text-slate-500 hover:text-white'
            }`}
            title="Shuffle Queue"
          >
            <Shuffle className="w-4 h-4" />
          </button>

          {/* Repeat */}
          <button
            onClick={() => setIsLoop(!isLoop)}
            className={`p-2 sm:p-2.5 rounded-xl transition-all ${
              isLoop ? 'text-emerald-400 bg-emerald-950/60' : 'text-slate-500 hover:text-white'
            }`}
            title="Loop Track"
          >
            <Repeat className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-3">
          {/* Add to Playlist */}
          <button
            onClick={() => openPlaylistModal(currentTrack)}
            className="px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 hover:text-white text-xs font-bold flex items-center gap-1 transition-all"
            title="Add to Custom Playlist"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Playlist</span>
          </button>

          {/* Lyrics Modal */}
          <button
            onClick={() => setIsLyricsOpen(true)}
            className="px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 text-emerald-400 text-xs font-bold flex items-center gap-1 transition-all"
            title="View Synchronized Lyrics"
          >
            <Mic2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Lyrics</span>
          </button>

          {/* Playing Queue Drawer */}
          <button
            onClick={openQueue}
            className="px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 hover:text-white text-xs font-bold flex items-center gap-1 transition-all"
            title="Open Playing Queue"
          >
            <ListMusic className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Queue</span>
          </button>

          {/* Share to Duo Partner */}
          <button
            onClick={handleShareToDuo}
            className="px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-1 transition-all active:scale-95"
            title="Share Song Card directly to Duo Chat"
          >
            <Send className="w-3 h-3" />
            <span className="text-[11px] sm:text-xs">Duo</span>
          </button>

          {/* Native Share Sheet */}
          <button
            onClick={handleNativeShare}
            className="p-2 sm:p-2.5 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-400 hover:text-emerald-400 transition-all"
            title="Share Song via Android / Browser Sheet"
          >
            <Share2 className="w-4 h-4" />
          </button>

          {/* Download MP3 */}
          <button
            onClick={handleDownload}
            className="p-2 sm:p-2.5 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-400 hover:text-cyan-400 transition-all"
            title="Download MP3 Audio"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
