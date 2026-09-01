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
  Users,
  Mic2,
  Radio
} from 'lucide-react';
import { useMusic } from '../context/MusicContext';
import api from '../services/api';
import { downloadTrack, isTrackDownloaded } from '../utils/downloadManager';

export function ArtistDetailModal({ artistId, artistData, isOpen, onClose, onOpenAlbum }) {
  const {
    currentTrack,
    isPlaying,
    playTrack,
    isFavorite,
    toggleFavorite,
    openPlaylistModal
  } = useMusic();

  const [artist, setArtist] = useState(artistData || null);
  const [loading, setLoading] = useState(!artistData?.topSongs);
  const [downloadingMap, setDownloadingMap] = useState({});
  const [downloadedMap, setDownloadedMap] = useState({});
  const [toastMsg, setToastMsg] = useState('');

  useEffect(() => {
    if (!isOpen || !artistId) return;

    let isMounted = true;
    setLoading(true);

    api.getArtistDetails(artistId)
      .then((res) => {
        if (isMounted && res?.artist) {
          setArtist(res.artist);
          const dMap = {};
          (res.artist.topSongs || []).forEach(t => {
            if (isTrackDownloaded(t.id)) dMap[t.id] = true;
          });
          setDownloadedMap(dMap);
        }
      })
      .catch((err) => {
        console.error('Failed to load artist details:', err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, artistId]);

  if (!isOpen) return null;

  const showToast = (msg) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

  const handlePlayAll = (shuffle = false) => {
    if (!artist?.topSongs || artist.topSongs.length === 0) return;
    let list = [...artist.topSongs];
    if (shuffle) {
      list = list.sort(() => Math.random() - 0.5);
    }
    playTrack(list[0], list);
    showToast(shuffle ? `🔀 Shuffling ${artist.name}...` : `▶ Playing ${artist.name}...`);
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
          {/* Artist Hero Card */}
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-5 bg-gradient-to-b from-cyan-950/40 via-slate-900/60 to-slate-900 p-4 sm:p-6 rounded-2xl border border-cyan-500/20">
            <div className="relative w-36 h-36 sm:w-44 sm:h-44 rounded-full overflow-hidden shadow-2xl shrink-0 border-2 border-emerald-500/30 group">
              <img
                src={artist?.image || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&h=500&fit=crop'}
                alt={artist?.name}
                onError={(e) => {
                  e.target.src = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&h=500&fit=crop';
                }}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute bottom-2 inset-x-0 flex justify-center">
                <span className="px-2 py-0.5 rounded-full bg-black/75 backdrop-blur-md text-[9px] font-mono font-bold text-cyan-400 border border-white/10">
                  {artist?.badge || 'VERIFIED ARTIST ⭐'}
                </span>
              </div>
            </div>

            <div className="flex-1 text-center sm:text-left min-w-0">
              <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-cyan-400">
                {artist?.role || 'Featured Artist'}
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-white leading-tight mt-1 truncate">
                {artist?.name || 'Artist Profile'}
              </h2>
              <div className="flex items-center justify-center sm:justify-start gap-2 text-xs text-slate-400 font-mono mt-1.5">
                <Users className="w-3.5 h-3.5 text-emerald-400" />
                <span>{artist?.monthlyListeners || '15M+'} Monthly Listeners</span>
                {artist?.language && (
                  <>
                    <span>•</span>
                    <span>{artist.language}</span>
                  </>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-center sm:justify-start gap-2.5 mt-4">
                <button
                  onClick={() => handlePlayAll(false)}
                  className="px-5 py-2 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-lg shadow-cyan-500/30 transition-all active:scale-95"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Play Top Songs</span>
                </button>
                <button
                  onClick={() => handlePlayAll(true)}
                  className="px-4 py-2 rounded-2xl bg-slate-800 hover:bg-slate-750 text-white font-bold text-xs flex items-center gap-1.5 border border-slate-700 transition-all active:scale-95"
                >
                  <Shuffle className="w-4 h-4 text-cyan-400" />
                  <span>Shuffle</span>
                </button>
              </div>
            </div>
          </div>

          {/* Bio */}
          {artist?.bio && (
            <p className="text-xs text-slate-400 leading-relaxed px-1">
              {artist.bio}
            </p>
          )}

          {/* Discography / Related Albums */}
          {artist?.albums && artist.albums.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-mono text-slate-400 font-bold uppercase tracking-wider px-1">
                Albums & Soundtracks
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {artist.albums.map(alb => (
                  <div
                    key={alb.id}
                    onClick={() => onOpenAlbum && onOpenAlbum(alb.id, alb)}
                    className="p-2.5 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-cyan-500/40 cursor-pointer group transition-all"
                  >
                    <div className="w-full aspect-square rounded-xl overflow-hidden mb-2 bg-slate-800">
                      <img
                        src={alb.cover}
                        alt={alb.title}
                        onError={(e) => {
                          e.target.src = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=300&h=300&fit=crop';
                        }}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    </div>
                    <h4 className="text-xs font-bold text-white truncate group-hover:text-cyan-400">
                      {alb.title}
                    </h4>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {alb.year} • {alb.tracksCount} tracks
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Popular Tracks */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-2 pb-1 border-b border-slate-800 text-[11px] font-mono text-slate-500 font-bold uppercase tracking-wider">
              <span>Popular Tracks</span>
              <span>Actions &nbsp; <Clock className="w-3.5 h-3.5 inline ml-1" /></span>
            </div>

            {loading ? (
              <div className="space-y-2 py-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-12 rounded-2xl bg-slate-800/40 animate-pulse" />
                ))}
              </div>
            ) : (!artist?.topSongs || artist.topSongs.length === 0) ? (
              <div className="text-center py-8 text-slate-500 text-xs font-mono">
                No songs loaded for this artist.
              </div>
            ) : (
              <div className="space-y-1">
                {artist.topSongs.map((track, idx) => {
                  const isCurrent = currentTrack?.id === track.id;
                  const isThisPlaying = isCurrent && isPlaying;
                  const liked = isFavorite(track.id);
                  const isDl = downloadedMap[track.id];
                  const isDlLoading = downloadingMap[track.id];

                  return (
                    <div
                      key={track.id || idx}
                      onClick={() => playTrack(track, artist.topSongs)}
                      className={`p-2.5 sm:p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-2 group ${
                        isCurrent
                          ? 'bg-cyan-950/40 border-cyan-500/60 shadow-md shadow-cyan-950/20'
                          : 'bg-slate-900/60 border-slate-800/80 hover:bg-slate-850 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="w-5 text-center text-xs font-mono font-bold text-slate-500 group-hover:text-cyan-400">
                          {isThisPlaying ? (
                            <Disc3 className="w-4 h-4 text-cyan-400 animate-spin" />
                          ) : (
                            idx + 1
                          )}
                        </span>

                        <div className="min-w-0">
                          <h4 className={`text-xs sm:text-sm font-bold truncate ${isCurrent ? 'text-cyan-400' : 'text-white'}`}>
                            {track.title}
                          </h4>
                          <p className="text-[11px] text-slate-400 truncate">
                            {track.album || artist.name}
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
                              ? 'text-cyan-400 bg-cyan-500/10'
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
