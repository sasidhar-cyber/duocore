import React, { useState, useEffect } from 'react';
import { Download, X, Sparkles, Smartphone } from 'lucide-react';

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if already in standalone / PWA installed mode
    const isStandaloneMode =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;

    setIsStandalone(isStandaloneMode);

    if (isStandaloneMode) return;

    // Check if user dismissed recently
    const dismissedAt = localStorage.getItem('soundwave_pwa_dismissed');
    if (dismissedAt && Date.now() - Number(dismissedAt) < 24 * 60 * 60 * 1000) {
      return;
    }

    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('soundwave_pwa_dismissed', Date.now().toString());
  };

  if (!showPrompt || isStandalone) return null;

  return (
    <div className="fixed bottom-20 left-3 right-3 sm:left-auto sm:right-6 sm:max-w-sm z-40 p-3 sm:p-4 rounded-3xl bg-slate-900/95 border border-emerald-500/40 shadow-2xl backdrop-blur-xl flex items-center justify-between gap-3 animate-in slide-in-from-bottom duration-300 select-none">
      <div className="flex items-center gap-3 min-w-0">
        <img
          src="/icons/icon-192x192.png"
          alt="SoundWave"
          className="w-11 h-11 rounded-2xl object-cover ring-1 ring-emerald-500/40 shrink-0"
        />
        <div className="min-w-0">
          <h4 className="text-xs font-black text-white truncate flex items-center gap-1.5">
            <span>Install SoundWave</span>
            <span className="px-1.5 py-0.2 rounded-md bg-emerald-500/20 text-emerald-300 text-[9px] font-mono">App</span>
          </h4>
          <p className="text-[11px] text-slate-400 truncate mt-0.5">
            Add to Android Home Screen for fast app experience
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={handleInstallClick}
          className="px-3 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs transition-transform active:scale-95 shadow-md shadow-emerald-500/30 flex items-center gap-1"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Install</span>
        </button>

        <button
          onClick={handleDismiss}
          className="p-1.5 rounded-xl text-slate-500 hover:text-white"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
