import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi, X } from 'lucide-react';

export function NetworkStatusBanner() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showBanner, setShowBanner] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (wasOffline) {
        setShowBanner(true);
        const timer = setTimeout(() => setShowBanner(false), 3000);
        return () => clearTimeout(timer);
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setWasOffline(true);
      setShowBanner(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [wasOffline]);

  if (!showBanner && isOnline) return null;

  return (
    <div
      className={`fixed top-2 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-2xl text-xs font-bold shadow-2xl flex items-center gap-2.5 transition-all animate-in fade-in slide-in-from-top-2 select-none border max-w-[90vw] ${
        isOnline
          ? 'bg-emerald-950/95 border-emerald-500/50 text-emerald-300'
          : 'bg-red-950/95 border-red-500/50 text-red-300'
      }`}
    >
      {isOnline ? (
        <>
          <Wifi className="w-4 h-4 text-emerald-400" />
          <span>Back online!</span>
        </>
      ) : (
        <>
          <WifiOff className="w-4 h-4 text-red-400" />
          <span>You are offline. Reconnecting...</span>
          <button
            onClick={() => setShowBanner(false)}
            className="p-1 rounded-lg hover:bg-red-900/50 text-red-400"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </>
      )}
    </div>
  );
}
