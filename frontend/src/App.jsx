import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { RoomProvider, useRoom } from './context/RoomContext';
import { MusicProvider, useMusic } from './context/MusicContext';
import { Navbar } from './components/Navbar';
import { MusicHomePage } from './pages/MusicHomePage';
import { MusicPlayerBar } from './components/MusicPlayerBar';
import { NowPlayingModal } from './components/NowPlayingModal';
import { LyricsModal } from './components/LyricsModal';
import { QueueDrawer } from './components/QueueDrawer';
import { PlaylistModal } from './components/PlaylistModal';
import { StatsModal } from './components/StatsModal';
import { KeyboardShortcutsModal } from './components/KeyboardShortcutsModal';
import { DuoChatScreen } from './components/DuoChatScreen';
import { NetworkStatusBanner } from './components/NetworkStatusBanner';
import { PWAInstallPrompt } from './components/PWAInstallPrompt';
import { AuthPage } from './pages/AuthPage';
import api from './services/api';

function AppContent() {
  const { user, loading } = useAuth();
  const { refreshPartnerState } = useRoom();
  const { isNowPlayingOpen, closeNowPlaying, playTrack } = useMusic();
  const [authOpen, setAuthOpen] = useState(false);
  const [isDuoChatOpen, setIsDuoChatOpen] = useState(false);

  // Check URL query parameters for 1-Click invite links & direct song deep links
  useEffect(() => {
    const handleUrlActions = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const inviteCode = params.get('invite');
        const songId = params.get('song');
        const action = params.get('action');

        if (inviteCode) {
          const cleanCode = inviteCode.toUpperCase();
          window.history.replaceState({}, document.title, window.location.pathname);
          try {
            await api.acceptInvite(cleanCode);
            await refreshPartnerState();
            setIsDuoChatOpen(true);
          } catch (e) {
            console.warn('[Auto Invite Join] Error:', e);
          }
        }

        if (songId) {
          api.searchMusic(songId)
            .then((res) => {
              if (res.results && res.results.length > 0) {
                playTrack(res.results[0]);
              }
            })
            .catch(() => {});
        }

        if (action === 'chat') {
          setIsDuoChatOpen(true);
        }
      } catch (e) {}
    };

    if (!loading) {
      handleUrlActions();
    }
  }, [loading, refreshPartnerState]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white select-none">
        <div className="flex flex-col items-center gap-3">
          <img
            src="/icons/icon-192x192.png"
            alt="SoundWave"
            className="w-16 h-16 rounded-3xl object-cover ring-2 ring-emerald-500/40 shadow-2xl animate-pulse"
          />
          <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-mono tracking-widest uppercase text-emerald-400 font-bold">
            SoundWave Starting...
          </span>
        </div>
      </div>
    );
  }

  if (authOpen && !user) {
    return <AuthPage onAuthenticated={() => setAuthOpen(false)} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-emerald-500/30 selection:text-white relative">
      {/* Offline / Online Network Indicator */}
      <NetworkStatusBanner />

      {/* PWA Mobile Install Prompt */}
      <PWAInstallPrompt />

      <Navbar
        onOpenAuth={() => setAuthOpen(true)}
        onOpenChat={() => setIsDuoChatOpen(true)}
      />

      <main className="flex-1">
        <MusicHomePage />
      </main>

      {/* Global Bottom Sticky Music Player */}
      <MusicPlayerBar />

      {/* Full Screen Now Playing View */}
      <NowPlayingModal
        isOpen={isNowPlayingOpen}
        onClose={closeNowPlaying}
      />

      {/* Synchronized Karaoke Lyrics Modal */}
      <LyricsModal />

      {/* Queue Drawer */}
      <QueueDrawer />

      {/* Playlist Add / Create Modal */}
      <PlaylistModal />

      {/* Listening Analytics & Stats Modal */}
      <StatsModal />

      {/* Keyboard Shortcuts Help Modal */}
      <KeyboardShortcutsModal />

      {/* 1v1 Duo Chat Screen with PIN Security (1234) */}
      <DuoChatScreen
        isOpen={isDuoChatOpen}
        onClose={() => setIsDuoChatOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <RoomProvider>
        <MusicProvider>
          <AppContent />
        </MusicProvider>
      </RoomProvider>
    </AuthProvider>
  );
}
