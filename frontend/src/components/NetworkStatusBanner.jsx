import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi, RefreshCw, X } from 'lucide-react';
import { getSocket } from '../services/socket';

export function NetworkStatusBanner() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [socketStatus, setSocketStatus] = useState('connected'); // 'connected' | 'reconnecting' | 'disconnected'
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

    const s = getSocket();
    if (s) {
      const onConnect = () => {
        setSocketStatus('connected');
        if (wasOffline) {
          setShowBanner(true);
          setTimeout(() => setShowBanner(false), 3000);
        }
      };

      const onDisconnect = () => {
        setSocketStatus('disconnected');
        setWasOffline(true);
        setShowBanner(true);
      };

      const onReconnectAttempt = () => {
        setSocketStatus('reconnecting');
        setShowBanner(true);
      };

      s.on('connect', onConnect);
      s.on('disconnect', onDisconnect);
      s.io?.on('reconnect_attempt', onReconnectAttempt);

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
        s.off('connect', onConnect);
        s.off('disconnect', onDisconnect);
        s.io?.off('reconnect_attempt', onReconnectAttempt);
      };
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [wasOffline]);

  if (!showBanner && isOnline && socketStatus === 'connected') return null;

  return (
    <div
      className={`fixed top-2 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-2xl text-xs font-bold shadow-2xl flex items-center gap-2.5 transition-all animate-in fade-in slide-in-from-top-2 select-none border max-w-[90vw] ${
        isOnline && socketStatus === 'connected'
          ? 'bg-emerald-950/95 border-emerald-500/50 text-emerald-300'
          : socketStatus === 'reconnecting'
          ? 'bg-yellow-950/95 border-yellow-500/50 text-yellow-300'
          : 'bg-red-950/95 border-red-500/50 text-red-300'
      }`}
    >
      {isOnline && socketStatus === 'connected' ? (
        <>
          <Wifi className="w-4 h-4 text-emerald-400" />
          <span>Real-time Connection Restored! ✅</span>
        </>
      ) : socketStatus === 'reconnecting' ? (
        <>
          <RefreshCw className="w-4 h-4 text-yellow-400 animate-spin" />
          <span>Reconnecting to DuoCore real-time network...</span>
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
