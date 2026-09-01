import React, { useState, useEffect } from 'react';
import {
  X,
  Play,
  Pause,
  Shuffle,
  Heart,
  Plus,
  Download,
  Check,
  Disc3,
  Clock,
  Sparkles,
  Share2
} from 'lucide-react';
import { useMusic } from '../context/MusicContext';
import api from '../services/api';
import { downloadTrack, isTrackDownloaded, isTrackDownloading } from '../utils/downloadManager';

export function AlbumDetailModal({ albumId, albumData, isOpen, onClose, onOpenArtist }) {
  const {
    currentTrack,
    isPlaying,
    playTrack,
    setQueue,
    isFavorite,
    toggleFavorite,
    openPlaylistModal
  } = useMusic();

  const [album, setAlbum] = useState(albumData || null);
  const [loading, setLoading] = useState(!albumData?.tracks);
  const [downloadingMap, setDownloadingMap] = useState({});
  const [downloadedMap, setDownloadedMap] = useState({});
  const [toastMsg, setToastMsg] = useState('');

  useEffect(() => {
    if (!isOpen || !albumId) return;

    let isMounted = true;
    setLoading(true);

    api.getAlbumDetails(albumId)
      .then((res) => {
        if (isMounted && res?.album) {
          setAlbum(res.album);
          // Check download states
          const dMap = {};
          (res.album.tracks || []).forEach(t => {
            if (isTrackDownloaded(t.id)) dMap[t.id] = true;
          });
          setDownloadedMap(dMap);
        }
      })
      .catch((err) => {
        console.error('Failed to load album details:', err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, albumId]);

  if (!isOpen) return null;

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  const handlePlayAll = (shuffle = false) => {
    if (!album?.tracks || album.tracks.length === 0) return;
    let list = [...album.tracks];
    if (shuffle) {
      list = list.sort(() => Math.random() - 0.5);
    }
    playTrack(list[0], list);
    showToast(shuffle ? '🔀 Shuffling album...' : '▶ Playing album...');
  };

  const handleDownloadTrack = async (track, e) => {
    e?.stopPropagation?.();
    if (downloadingMap[track.id]) return;

    setDownloadingMap(prev => ({ ...prev, [track.id]: true }));
    showToast(`⬇ Downloading "${track.title}"...`);

    try {
      await downloadTrack(track);
      setDownloadedMap(prev => ({ ...prev, [track.id]: true }));
      showToast(`✓ Saved "${track.title}" for offline listening!`);
    } catch (err) {
      showToast(`❌ Download failed: ${err.message || 'Stream error'}`);
    } finally {
      setDownloadingMap(prev => ({ ...prev, [track.id]: false }));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[92vh] bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden flex flex-col shadow-2xl">
        
        {/* Toast Feedback */}
        {toastMsg && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-2xl bg-emerald-500 text-slate-950 font-black text-xs shadow-xl shadow-emerald-500/30 animate-in fade-in slide-in-from-top-2">
            {toastMsg}
          </div>
        )}

        {/* Header with Close */}
        <div className="absolute top-3 right-3 z-20">
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-black/60 hover:bg-black/90 text-slate-300 hover:text-white backdrop-blur-md transition-all border border-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Album Hero Card */}
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-5 bg-gradient-to-b from-emerald-950/40 to-slate-900/60 p-4 sm:p-6 rounded-2xl border border-emerald-500/20">
            <div className="relative w-36 h-36 sm:w-44 sm:h-44 rounded-2xl overflow-hidden shadow-2xl shrink-0 border border-white/10 group">
              <img
                src={album?.cover || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&h=500&fit=crop'}
                alt={album?.title}
                onError={(e) => {
                  e.target.src = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&h=500&fit=crop';
                }}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-[9px] font-mono font-bold text-emerald-400 border border-white/10">
                {album?.badge || 'ALBUM 💿'}
              </div>
            </div>

            <div className="flex-1 text-center sm:text-left min-w-0">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-emerald-400">
                {album?.language ? `${album.language} • ` : ''}Album
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-white leading-tight mt-1 truncate">
                {album?.title || 'Album Details'}
              </h2>
              <p
                onClick={() => onOpenArtist && album?.artist && onOpenArtist(album.artist)}
                className="text-xs sm:text-sm font-bold text-slate-300 hover:text-emerald-400 cursor-pointer transition-colors mt-1 truncate"
              >
                {album?.artist || 'Various Artists'}
              </p>
              <div className="flex items-center justify-center sm:justify-start gap-2 text-xs text-slate-400 font-mono mt-2">
                <span>{album?.year || '2024'}</span>
                <span>•</span>
                <span>{album?.tracks?.length || album?.tracksCount || 0} Tracks</span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-center sm:justify-start gap-2.5 mt-4">
                <button
                  onClick={() => handlePlayAll(false)}
                  className="px-5 py-2 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-500/30 transition-all active:scale-95"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Play All</span>
                </button>
                <button
                  onClick={() => handlePlayAll(true)}
                  className="px-4 py-2 rounded-2xl bg-slate-800 hover:bg-slate-750 text-white font-bold text-xs flex items-center gap-1.5 border border-slate-700 transition-all active:scale-95"
                >
                  <Shuffle className="w-4 h-4 text-emerald-400" />
                  <span>Shuffle</span>
                </button>
              </div>
            </div>
          </div>

          {/* Description */}
          {album?.description && (
            <p className="text-xs text-slate-400 leading-relaxed px-1">
              {album.description}
            </p>
          )}

          {/* Tracklist */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-2 pb-1 border-b border-slate-800 text-[11px] font-mono text-slate-500 font-bold uppercase tracking-wider">
              <span># &nbsp; Title</span>
              <span>Actions &nbsp; <Clock className="w-3.5 h-3.5 inline ml-1" /></span>
            </div>

            {loading ? (
              <div className="space-y-2 py-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-12 rounded-2xl bg-slate-800/40 animate-pulse" />
                ))}
              </div>
            ) : (!album?.tracks || album.tracks.length === 0) ? (
              <div className="text-center py-8 text-slate-500 text-xs font-mono">
                No tracks loaded for this album.
              </div>
            ) : (
              <div className="space-y-1">
                {album.tracks.map((track, idx) => {
                  const isCurrent = currentTrack?.id === track.id;
                  const isThisPlaying = isCurrent && isPlaying;
                  const liked = isFavorite(track.id);
                  const isDl = downloadedMap[track.id];
                  const isDlLoading = downloadingMap[track.id];

                  return (
                    <div
                      key={track.id || idx}
                      onClick={() => playTrack(track, album.tracks)}
                      className={`p-2.5 sm:p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-2 group ${
                        isCurrent
                          ? 'bg-emerald-950/40 border-emerald-500/60 shadow-md shadow-emerald-950/20'
                          : 'bg-slate-900/60 border-slate-800/80 hover:bg-slate-850 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-5 text-center text-xs font-mono font-bold text-slate-500 group-hover:text-emerald-400">
                          {isThisPlaying ? (
                            <Disc3 className="w-4 h-4 text-emerald-400 animate-spin" />
                          ) : (
                            idx + 1
                          )}
                        </span>

                        <div className="min-w-0">
                          <h4 className={`text-xs sm:text-sm font-bold truncate ${isCurrent ? 'text-emerald-400' : 'text-white'}`}>
                            {track.title}
                          </h4>
                          <p className="text-[11px] text-slate-400 truncate">
                            {track.artist}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {/* Download button */}
                        <button
                          onClick={(e) => handleDownloadTrack(track, e)}
                          disabled={isDlLoading}
                          className={`p-1.5 rounded-xl transition-all ${
                            isDl
                              ? 'text-emerald-400 bg-emerald-500/10'
                              : isDlLoading
                              ? 'text-cyan-400 animate-pulse'
                              : 'text-slate-500 hover:text-white hover:bg-slate-800'
                          }`}
                          title={isDl ? 'Downloaded' : 'Download track'}
                        >
                          {isDlLoading ? (
                            <Sparkles className="w-4 h-4 animate-spin" />
                          ) : isDl ? (
                            <Check className="w-4 h-4" />
                          ) : (
                            <Download className="w-4 h-4" />
                          )}
                        </button>

                        {/* Add to playlist */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openPlaylistModal(track);
                          }}
                          className="p-1.5 rounded-xl text-slate-500 hover:text-white hover:bg-slate-800 transition-all opacity-0 group-hover:opacity-100"
                          title="Add to Playlist"
                        >
                          <Plus className="w-4 h-4" />
                        </button>

                        {/* Like button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(track);
                          }}
                          className={`p-1.5 rounded-xl transition-transform active:scale-90 ${
                            liked ? 'text-rose-500' : 'text-slate-500 hover:text-white'
                          }`}
                          title={liked ? 'Unlike' : 'Like'}
                        >
                          <Heart className={`w-4 h-4 ${liked ? 'fill-current' : ''}`} />
                        </button>

                        <span className="text-[11px] text-slate-500 font-mono w-10 text-right">
                          {track.duration}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
