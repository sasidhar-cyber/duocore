import React from 'react';
import { useMusic } from '../context/MusicContext';
import { Keyboard, X } from 'lucide-react';

const SHORTCUTS = [
  { key: 'Space', desc: 'Play / Pause music' },
  { key: '← Left Arrow', desc: 'Seek backward 5 seconds' },
  { key: '→ Right Arrow', desc: 'Seek forward 5 seconds' },
  { key: 'N', desc: 'Next track in queue' },
  { key: 'P', desc: 'Previous track' },
  { key: 'M', desc: 'Mute / Unmute volume' },
  { key: 'L', desc: 'Open / Close Synchronized Lyrics' },
  { key: 'F', desc: 'Like / Favorite currently playing track' },
  { key: 'Esc', desc: 'Close open modal / fullscreen player' }
];

export function KeyboardShortcutsModal() {
  const { isShortcutsHelpOpen, closeShortcutsHelp } = useMusic();

  React.useEffect(() => {
    if (!isShortcutsHelpOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        closeShortcutsHelp();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isShortcutsHelpOpen, closeShortcutsHelp]);

  if (!isShortcutsHelpOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in select-none p-4">
      <div className="w-full max-w-md glass-panel p-6 rounded-3xl border border-emerald-500/30 shadow-2xl bg-slate-950/95 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Keyboard className="w-5 h-5 text-emerald-400" />
            <h3 className="text-base font-black text-white">Keyboard Shortcuts</h3>
          </div>
          <button
            onClick={closeShortcutsHelp}
            className="p-1 rounded-xl text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Shortcuts List */}
        <div className="space-y-2">
          {SHORTCUTS.map((sc) => (
            <div
              key={sc.key}
              className="p-2.5 rounded-xl bg-slate-900/70 border border-slate-800 flex items-center justify-between gap-3 text-xs"
            >
              <span className="text-slate-300">{sc.desc}</span>
              <kbd className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 font-mono font-bold text-emerald-400 shadow-sm">
                {sc.key}
              </kbd>
            </div>
          ))}
        </div>

        <p className="text-[11px] text-slate-500 text-center font-mono">
          Shortcuts are automatically paused while typing in search or message inputs.
        </p>
      </div>
    </div>
  );
}
