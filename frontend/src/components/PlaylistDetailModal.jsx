import React, { useState, useEffect } from 'react';
import { useMusic } from '../context/MusicContext';
import api from '../services/api';
import {
  ListPlus,
  Play,
  Pause,
  Shuffle,
  Trash2,
  X,
  Music,
  Plus,
  Clock,
  Sparkles,
  Download
} from 'lucide-react';
import { downloadTrack, isTrackDownloaded } from '../utils/downloadManager';
import { playSound } from '../utils/soundEffects';

export function PlaylistDetailModal({ isOpen, onClose, playlistId, playlistMeta }) {
  const {
    currentTrack,
    isPlaying,
    playTrack,
    removeSongFromPlaylist,
    fetchPlaylists
  } = useMusic();

  const [playlist, setPlaylist] = useState(playlistMeta || null);
  const [loading, setLoading] = useState(true);
  const [searchFilter, setSearchFilter] = useState('');

  const loadPlaylistDetails = async () => {
    if (!playlistId) return;
    setLoading(true);
    try {
      const res = await api.getPlaylist(playlistId);
      const data = res.playlist || res;
      setPlaylist(data);
    } catch (err) {
      console.error('[PlaylistDetailModal] Load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && playlistId) {
      loadPlaylistDetails();
    }
  }, [isOpen, playlistId]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const songs = playlist?.songs || playlist?.tracks || [];
  const filteredSongs = songs.filter((s) => {
    if (!searchFilter.trim()) return true;
    const q = searchFilter.toLowerCase();
    return (s.title || '').toLowerCase().includes(q) || (s.artist || '').toLowerCase().includes(q);
  });

  const handlePlayAll = (shuffle = false) => {
    if (songs.length === 0) return;
    let list = [...songs];
    if (shuffle) list = list.sort(() => Math.random() - 0.5);
    playTrack(list[0], list);
    playSound('quiz_correct');
  };

  const handleRemoveSong = async (songId, e) => {
    e.stopPropagation();
    if (!playlistId || !songId) return;
    try {
      await removeSongFromPlaylist(playlistId, songId);
      setPlaylist((prev) => {
        if (!prev) return prev;
        const updatedSongs = (prev.songs || prev.tracks || []).filter((s) => s.id !== songId);
        return { ...prev, songs: updatedSongs, tracks: updatedSongs };
      });
      playSound('message');
    } catch (err) {
      alert('Could not remove song');
    }
  };

  const handleDownloadSong = async (song, e) => {
    e.stopPropagation();
    try {
      await downloadTrack(song);
      playSound('quiz_correct');
    } catch (err) {
      console.warn('Download error:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in select-none p-4">
      <div className="w-full max-w-2xl glass-panel p-6 rounded-3xl border border-emerald-500/30 shadow-2xl bg-slate-950/95 space-y-5 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-emerald-600/30 to-teal-800/40 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0 shadow-lg shadow-emerald-500/10">
              <Music className="w-7 h-7 sm:w-8 sm:h-8" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 font-bold block">
                CUSTOM PLAYLIST
              </span>
              <h2 className="text-lg sm:text-xl font-black text-white truncate">
                {playlist?.name || playlistMeta?.name || 'Playlist'}
              </h2>
              <p className="text-xs text-slate-400 truncate mt-0.5">
                {songs.length} tracks • {playlist?.description || 'Curated SoundWave Collection'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900 border border-slate-800 transition-all shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Controls & Search Filter */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePlayAll(false)}
              disabled={songs.length === 0}
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md shadow-emerald-500/30 transition-transform active:scale-95 disabled:opacity-40"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Play All</span>
            </button>

            <button
              onClick={() => handlePlayAll(true)}
              disabled={songs.length === 0}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-200 hover:text-emerald-400 font-bold text-xs flex items-center gap-1.5 transition-transform active:scale-95 disabled:opacity-40"
            >
              <Shuffle className="w-3.5 h-3.5" />
              <span>Shuffle</span>
            </button>
          </div>

          {songs.length > 5 && (
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Search in playlist..."
              className="glass-input rounded-xl px-3 py-1.5 text-xs text-white placeholder:text-slate-500 w-full sm:w-48"
            />
          )}
        </div>

        {/* Song List */}
        <div className="space-y-2 overflow-y-auto flex-1 pr-1 custom-scrollbar min-h-[220px]">
          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center gap-2 text-slate-400">
              <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-mono">Loading Playlist Tracks...</span>
            </div>
          ) : songs.length === 0 ? (
            <div className="py-16 text-center space-y-2">
              <p className="text-sm font-bold text-slate-400">This playlist is currently empty.</p>
              <p className="text-xs text-slate-500">Add songs from Search, Trending, or Albums by tapping "+ Playlist".</p>
            </div>
          ) : filteredSongs.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-8">No tracks matching "{searchFilter}".</p>
          ) : (
            filteredSongs.map((song, idx) => {
              const isCurrent = currentTrack?.id === song.id;
              const isThisPlaying = isCurrent && isPlaying;
              const isDl = isTrackDownloaded(song.id);

              return (
                <div
                  key={song.id || idx}
                  onClick={() => playTrack(song, songs)}
                  className={`p-2.5 sm:p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 group ${
                    isCurrent
                      ? 'bg-emerald-950/50 border-emerald-500/60 shadow-md shadow-emerald-950/20'
                      : 'bg-slate-900/60 hover:bg-slate-850 border-slate-800/80 text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xs font-mono text-slate-500 w-5 text-center font-bold">
                      {isThisPlaying ? (
                        <div className="flex items-center justify-center gap-0.5">
                          <span className="w-1 h-3 bg-emerald-400 animate-pulse" />
                          <span className="w-1 h-4 bg-emerald-400 animate-pulse delay-75" />
                          <span className="w-1 h-2 bg-emerald-400 animate-pulse delay-150" />
                        </div>
                      ) : (
                        idx + 1
                      )}
                    </span>

                    <img
                      src={song.thumbnail || 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=150&h=150&fit=crop'}
                      alt={song.title}
                      onError={(e) => {
                        e.target.src = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=150&h=150&fit=crop';
                      }}
                      className="w-10 h-10 rounded-xl object-cover ring-1 ring-slate-800 shrink-0"
                    />

                    <div className="min-w-0">
                      <h4 className={`text-xs sm:text-sm font-bold truncate ${isCurrent ? 'text-emerald-400' : 'text-white'}`}>
                        {song.title}
                      </h4>
                      <p className="text-[11px] text-slate-400 truncate">{song.artist}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] font-mono text-slate-500 hidden sm:inline">
                      {song.duration || '3:30'}
                    </span>

                    <button
                      onClick={(e) => handleDownloadSong(song, e)}
                      className={`p-2 rounded-xl transition-all ${
                        isDl
                          ? 'text-emerald-400'
                          : 'text-slate-500 hover:text-cyan-400 hover:bg-slate-800'
                      }`}
                      title="Download Track"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={(e) => handleRemoveSong(song.id, e)}
                      className="p-2 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-all"
                      title="Remove from playlist"
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
