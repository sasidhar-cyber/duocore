import React, { useState, useEffect } from 'react';
import { useMusic } from '../context/MusicContext';
import api from '../services/api';
import {
  BarChart3,
  Clock,
  Music2,
  Users,
  Flame,
  X,
  Sparkles,
  TrendingUp
} from 'lucide-react';

export function StatsModal() {
  const { isStatsOpen, closeStats, playTrack } = useMusic();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isStatsOpen) {
      setLoading(true);
      api.getStats()
        .then((res) => setStats(res))
        .catch(() => setStats(null))
        .finally(() => setLoading(false));
    }
  }, [isStatsOpen]);

  useEffect(() => {
    if (!isStatsOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        closeStats();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isStatsOpen, closeStats]);

  if (!isStatsOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in select-none p-4">
      <div className="w-full max-w-lg glass-panel p-6 rounded-3xl border border-emerald-500/30 shadow-2xl bg-slate-950/95 space-y-6 max-h-[85vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-black text-white">Listening Statistics</h3>
          </div>
          <button
            onClick={closeStats}
            className="p-1 rounded-xl text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-2 text-slate-400">
            <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-mono">Analyzing Listening Habits...</span>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Quick Cards Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
                <div className="flex items-center gap-2 text-slate-400 text-xs font-mono">
                  <Clock className="w-4 h-4 text-emerald-400" />
                  <span>TOTAL MINUTES</span>
                </div>
                <h4 className="text-2xl font-black text-white">
                  {stats?.totalMinutes || 0} <span className="text-xs font-normal text-slate-400">mins</span>
                </h4>
              </div>

              <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1">
                <div className="flex items-center gap-2 text-slate-400 text-xs font-mono">
                  <Music2 className="w-4 h-4 text-cyan-400" />
                  <span>TOTAL PLAYS</span>
                </div>
                <h4 className="text-2xl font-black text-white">
                  {stats?.totalPlays || 0} <span className="text-xs font-normal text-slate-400">tracks</span>
                </h4>
              </div>
            </div>

            {/* Top Tracks */}
            <div className="space-y-3">
              <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 font-bold block px-1">
                TOP 5 MOST PLAYED SONGS
              </span>

              {stats?.topTracks?.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-2">Listen to more songs to see your top tracks.</p>
              ) : (
                <div className="space-y-2">
                  {stats?.topTracks?.map((track, idx) => (
                    <div
                      key={track.track_id}
                      onClick={() => {
                        playTrack({
                          id: track.track_id,
                          title: track.title,
                          artist: track.artist,
                          thumbnail: track.thumbnail
                        });
                        closeStats();
                      }}
                      className="p-2.5 rounded-xl bg-slate-900/60 hover:bg-slate-850 border border-slate-800 flex items-center justify-between gap-3 cursor-pointer group transition-all"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-xs font-bold text-emerald-400 font-mono w-4">#{idx + 1}</span>
                        <img
                          src={track.thumbnail}
                          alt={track.title}
                          className="w-9 h-9 rounded-lg object-cover"
                        />
                        <div className="min-w-0">
                          <h5 className="text-xs font-bold text-white truncate group-hover:text-emerald-400">
                            {track.title}
                          </h5>
                          <p className="text-[10px] text-slate-400 truncate">{track.artist}</p>
                        </div>
                      </div>

                      <span className="text-[11px] font-mono font-bold text-slate-400 shrink-0">
                        {track.play_count} plays
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Top Artists */}
            <div className="space-y-3">
              <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400 font-bold block px-1">
                TOP ARTISTS YOU ENJOY
              </span>

              {stats?.topArtists?.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-2">Listen to more music to discover top artists.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {stats?.topArtists?.map((artist, idx) => (
                    <div
                      key={artist.artist}
                      className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1 text-center"
                    >
                      <h5 className="text-xs font-black text-white truncate">{artist.artist}</h5>
                      <span className="text-[10px] font-mono text-emerald-400">{artist.play_count} plays</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
