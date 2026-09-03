import React, { useState, useEffect, useRef } from 'react';
import { useMusic } from '../context/MusicContext';
import api from '../services/api';
import {
  Mic2,
  X,
  Type,
  Plus,
  Minus,
  RotateCcw,
  Sparkles,
  Music,
  Clock
} from 'lucide-react';

export function LyricsModal() {
  const {
    isLyricsOpen,
    setIsLyricsOpen,
    currentTrack,
    currentTime,
    seekTo,
    lyricsFontSize,
    setLyricsFontSize,
    lyricsOffsetMs,
    setLyricsOffsetMs
  } = useMusic();

  const [loading, setLoading] = useState(false);
  const [syncedLines, setSyncedLines] = useState([]);
  const [plainLyrics, setPlainLyrics] = useState('');
  const [currentLineIdx, setCurrentLineIdx] = useState(-1);
  const [isManualScroll, setIsManualScroll] = useState(false);

  const activeLineRef = useRef(null);
  const containerRef = useRef(null);

  // Parse LRC timestamps [mm:ss.xx]
  const parseLrc = (lrcString) => {
    if (!lrcString) return [];
    const lines = lrcString.split('\n');
    const result = [];
    const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]/;

    for (const line of lines) {
      const match = timeRegex.exec(line);
      if (match) {
        const min = parseInt(match[1], 10);
        const sec = parseInt(match[2], 10);
        const ms = parseInt(match[3].padEnd(3, '0'), 10);
        const time = min * 60 + sec + ms / 1000;
        const text = line.replace(timeRegex, '').trim();
        if (text) {
          result.push({ time, text });
        }
      }
    }
    return result.sort((a, b) => a.time - b.time);
  };

  // Fetch Lyrics on Track Change / Modal Open
  useEffect(() => {
    if (!isLyricsOpen || !currentTrack) return;

    setLoading(true);
    setSyncedLines([]);
    setPlainLyrics('');
    setCurrentLineIdx(-1);

    api.getMusicLyrics(currentTrack.title, currentTrack.artist)
      .then((res) => {
        if (res.syncedLyrics) {
          const parsed = parseLrc(res.syncedLyrics);
          setSyncedLines(parsed);
        } else if (res.plainLyrics) {
          setPlainLyrics(res.plainLyrics);
        } else {
          setPlainLyrics(`🎵 ${currentTrack.title}\n\nLyrics currently unavailable for this track.`);
        }
      })
      .catch(() => {
        setPlainLyrics(`🎵 ${currentTrack.title}\n\nLyrics currently unavailable.`);
      })
      .finally(() => setLoading(false));
  }, [isLyricsOpen, currentTrack?.id]);

  // Global Escape key listener to close modal
  useEffect(() => {
    if (!isLyricsOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsLyricsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLyricsOpen, setIsLyricsOpen]);

  // Synchronize Active Line based on Current Time + Offset
  useEffect(() => {
    if (syncedLines.length === 0) return;

    const adjustedTime = currentTime + lyricsOffsetMs / 1000;
    let activeIdx = -1;

    for (let i = 0; i < syncedLines.length; i++) {
      if (adjustedTime >= syncedLines[i].time) {
        activeIdx = i;
      } else {
        break;
      }
    }

    if (activeIdx !== currentLineIdx) {
      setCurrentLineIdx(activeIdx);
      if (!isManualScroll && activeLineRef.current) {
        activeLineRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [currentTime, syncedLines, lyricsOffsetMs, isManualScroll, currentLineIdx]);

  if (!isLyricsOpen || !currentTrack) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-2xl animate-in fade-in select-none p-3 sm:p-6">
      <div className="w-full max-w-2xl h-[88vh] glass-panel rounded-3xl border border-emerald-500/30 shadow-2xl bg-slate-950/95 flex flex-col overflow-hidden">
        {/* Header with Title & Adjusters */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between gap-3 shrink-0 bg-slate-900/60">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <Mic2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-black text-white truncate">{currentTrack.title}</h3>
              <p className="text-xs text-emerald-400 font-semibold truncate">{currentTrack.artist}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Font Size Adjusters */}
            <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-1 gap-1">
              <button
                onClick={() => setLyricsFontSize((s) => Math.max(14, s - 2))}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
                title="Smaller font"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="text-[10px] font-mono text-slate-400 px-1">{lyricsFontSize}px</span>
              <button
                onClick={() => setLyricsFontSize((s) => Math.min(28, s + 2))}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
                title="Larger font"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Sync Offset Timing Adjuster */}
            {syncedLines.length > 0 && (
              <div className="hidden sm:flex items-center bg-slate-900 border border-slate-800 rounded-xl p-1 gap-1 text-xs">
                <button
                  onClick={() => setLyricsOffsetMs((o) => o - 500)}
                  className="px-1.5 py-0.5 rounded text-[10px] font-mono text-slate-400 hover:text-white"
                  title="Offset -0.5s"
                >
                  -0.5s
                </button>
                <span className="text-[10px] font-mono text-emerald-400">{lyricsOffsetMs / 1000}s</span>
                <button
                  onClick={() => setLyricsOffsetMs((o) => o + 500)}
                  className="px-1.5 py-0.5 rounded text-[10px] font-mono text-slate-400 hover:text-white"
                  title="Offset +0.5s"
                >
                  +0.5s
                </button>
              </div>
            )}

            <button
              onClick={() => setIsLyricsOpen(false)}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-900"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Lyrics Body */}
        <div
          ref={containerRef}
          onWheel={() => setIsManualScroll(true)}
          onTouchMove={() => setIsManualScroll(true)}
          className="flex-1 overflow-y-auto p-6 sm:p-10 space-y-6 text-center scroll-smooth"
        >
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center gap-3 text-slate-400">
              <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-mono tracking-wider">Loading Synchronized Lyrics...</span>
            </div>
          ) : syncedLines.length > 0 ? (
            syncedLines.map((line, idx) => {
              const isActive = idx === currentLineIdx;
              const isPast = idx < currentLineIdx;

              return (
                <p
                  key={idx}
                  ref={isActive ? activeLineRef : null}
                  onClick={() => seekTo(line.time)}
                  style={{ fontSize: `${lyricsFontSize}px` }}
                  className={`font-black cursor-pointer transition-all duration-300 ${
                    isActive
                      ? 'text-emerald-400 scale-105 drop-shadow-[0_0_20px_rgba(52,211,153,0.5)]'
                      : isPast
                      ? 'text-slate-400 opacity-60 hover:opacity-90'
                      : 'text-slate-600 hover:text-slate-400'
                  }`}
                >
                  {line.text}
                </p>
              );
            })
          ) : (
            <div className="py-12 whitespace-pre-line text-sm sm:text-base font-semibold text-slate-300 leading-loose">
              {plainLyrics}
            </div>
          )}
        </div>

        {/* Footer info & resume auto-scroll */}
        {isManualScroll && syncedLines.length > 0 && (
          <div className="p-2.5 bg-slate-900/90 border-t border-slate-800 text-center shrink-0">
            <button
              onClick={() => setIsManualScroll(false)}
              className="px-4 py-1.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition-all hover:bg-emerald-500/30"
            >
              Resume Auto-Scroll ⚡
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
