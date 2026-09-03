import React, { useState, useEffect } from 'react';
import {
  X,
  Play,
  ListPlus,
  ArrowRight,
  Heart,
  Plus,
  Download,
  Check,
  Disc3,
  User,
  Sparkles,
  Share2,
  Radio
} from 'lucide-react';
import { useMusic } from '../context/MusicContext';
import { downloadTrack, isTrackDownloaded, isTrackDownloading } from '../utils/downloadManager';

export function TrackActionMenu({ track, isOpen, onClose, onOpenAlbum, onOpenArtist, onShowToast }) {
  const {
    currentTrack,
    isPlaying,
    playTrack,
    addToQueue,
    playNext,
    startRadio,
    isFavorite,
    toggleFavorite,
    openPlaylistModal
  } = useMusic();

  const [isDownloading, setIsDownloading] = useState(false);
  const [isDownloaded, setIsDownloaded] = useState(false);

  useEffect(() => {
    if (track?.id) {
      setIsDownloaded(isTrackDownloaded(track.id));
      setIsDownloading(isTrackDownloading(track.id));
    }
  }, [track, isOpen]);

  if (!isOpen || !track) return null;

  const liked = isFavorite(track.id);

  const handleDownload = async () => {
    if (isDownloading) return;
    setIsDownloading(true);
    if (onShowToast) onShowToast(`⬇ Downloading "${track.title}"...`);

    try {
      await downloadTrack(track);
      setIsDownloaded(true);
      if (onShowToast) onShowToast(`✓ "${track.title}" saved to Downloads!`);
      onClose();
    } catch (err) {
      if (onShowToast) onShowToast(`❌ Download failed: ${err.message || 'Stream error'}`);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl animate-in slide-in-from-bottom-4 duration-200">
        
        {/* Track Preview Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between gap-3 bg-slate-950/40">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={track.thumbnail || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=150&h=150&fit=crop'}
              alt={track.title}
              onError={(e) => {
                e.target.src = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=150&h=150&fit=crop';
              }}
              className="w-12 h-12 rounded-xl object-cover shrink-0 border border-white/10"
            />
            <div className="min-w-0">
              <h4 className="text-sm font-bold text-white truncate">{track.title}</h4>
              <p className="text-xs text-slate-400 truncate">{track.artist}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action List */}
        <div className="p-2 space-y-1">
          <button
            onClick={() => {
              playTrack(track);
              onClose();
            }}
            className="w-full p-2.5 rounded-2xl hover:bg-slate-800/80 text-left flex items-center gap-3 text-xs font-bold text-white transition-colors"
          >
            <Play className="w-4 h-4 text-emerald-400 fill-current ml-0.5" />
            <span>Play Now</span>
          </button>

          <button
            onClick={() => {
              startRadio(track);
              if (onShowToast) onShowToast(`📻 Starting ${track.title} Radio...`);
              onClose();
            }}
            className="w-full p-2.5 rounded-2xl hover:bg-slate-800/80 text-left flex items-center gap-3 text-xs font-bold text-slate-200 transition-colors"
          >
            <Radio className="w-4 h-4 text-purple-400" />
            <span>Start Song Radio</span>
          </button>

          <button
            onClick={() => {
              addToQueue(track);
              if (onShowToast) onShowToast(`Added "${track.title}" to Queue`);
              onClose();
            }}
            className="w-full p-2.5 rounded-2xl hover:bg-slate-800/80 text-left flex items-center gap-3 text-xs font-bold text-slate-200 transition-colors"
          >
            <ListPlus className="w-4 h-4 text-cyan-400" />
            <span>Add to Queue</span>
          </button>

          <button
            onClick={() => {
              if (playNext) playNext(track);
              else addToQueue(track);
              if (onShowToast) onShowToast(`"${track.title}" will play next`);
              onClose();
            }}
            className="w-full p-2.5 rounded-2xl hover:bg-slate-800/80 text-left flex items-center gap-3 text-xs font-bold text-slate-200 transition-colors"
          >
            <ArrowRight className="w-4 h-4 text-amber-400" />
            <span>Play Next</span>
          </button>

          <button
            onClick={() => {
              toggleFavorite(track);
              if (onShowToast) onShowToast(liked ? `Removed from Favorites` : `Added to Favorites ❤️`);
              onClose();
            }}
            className="w-full p-2.5 rounded-2xl hover:bg-slate-800/80 text-left flex items-center gap-3 text-xs font-bold text-slate-200 transition-colors"
          >
            <Heart className={`w-4 h-4 ${liked ? 'text-rose-500 fill-current' : 'text-rose-400'}`} />
            <span>{liked ? 'Liked Song (Remove)' : 'Like Song'}</span>
          </button>

          <button
            onClick={() => {
              openPlaylistModal(track);
              onClose();
            }}
            className="w-full p-2.5 rounded-2xl hover:bg-slate-800/80 text-left flex items-center gap-3 text-xs font-bold text-slate-200 transition-colors"
          >
            <Plus className="w-4 h-4 text-indigo-400" />
            <span>Add to Playlist</span>
          </button>

          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className="w-full p-2.5 rounded-2xl hover:bg-slate-800/80 text-left flex items-center gap-3 text-xs font-bold text-slate-200 transition-colors"
          >
            {isDownloading ? (
              <Sparkles className="w-4 h-4 text-emerald-400 animate-spin" />
            ) : isDownloaded ? (
              <Check className="w-4 h-4 text-emerald-400" />
            ) : (
              <Download className="w-4 h-4 text-emerald-400" />
            )}
            <span>{isDownloading ? 'Downloading...' : isDownloaded ? 'Downloaded (Offline Ready)' : 'Download Audio Track'}</span>
          </button>

          {track.album && onOpenAlbum && (
            <button
              onClick={() => {
                onOpenAlbum(track.album);
                onClose();
              }}
              className="w-full p-2.5 rounded-2xl hover:bg-slate-800/80 text-left flex items-center gap-3 text-xs font-bold text-slate-200 transition-colors"
            >
              <Disc3 className="w-4 h-4 text-fuchsia-400" />
              <span>View Album ({track.album})</span>
            </button>
          )}

          {track.artist && onOpenArtist && (
            <button
              onClick={() => {
                onOpenArtist(track.artist);
                onClose();
              }}
              className="w-full p-2.5 rounded-2xl hover:bg-slate-800/80 text-left flex items-center gap-3 text-xs font-bold text-slate-200 transition-colors"
            >
              <User className="w-4 h-4 text-sky-400" />
              <span>View Artist ({track.artist})</span>
            </button>
          )}

          <button
            onClick={() => {
              if (navigator.share) {
                navigator.share({
                  title: `${track.title} - SoundWave`,
                  text: `Listen to "${track.title}" by ${track.artist} on SoundWave!`,
                  url: window.location.href
                }).catch(() => {});
              } else {
                navigator.clipboard?.writeText(`${track.title} - ${track.artist}`);
                if (onShowToast) onShowToast('📋 Song title copied to clipboard!');
              }
              onClose();
            }}
            className="w-full p-2.5 rounded-2xl hover:bg-slate-800/80 text-left flex items-center gap-3 text-xs font-bold text-slate-200 transition-colors"
          >
            <Share2 className="w-4 h-4 text-emerald-400" />
            <span>Share Song</span>
          </button>
        </div>
      </div>
    </div>
  );
}
