import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { RoomProvider } from './context/RoomContext';
import { Navbar } from './components/Navbar';
import { playSound } from './utils/soundEffects';

import { LandingPage } from './pages/LandingPage';
import { AuthPage } from './pages/AuthPage';
import { DashboardPage } from './pages/DashboardPage';
import { CyberRoadmapGamePage } from './pages/CyberRoadmapGamePage';
import { LinuxLabPage } from './pages/LinuxLabPage';
import { StudyRoomDashboard } from './pages/StudyRoomDashboard';
import { QuizArenaPage } from './pages/QuizArenaPage';

function AppContent() {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [duelChallenge, setDuelChallenge] = useState(null);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 border-4 border-pink-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-mono tracking-widest uppercase text-cyan-400">Loading DUOCORE...</span>
        </div>
      </div>
    );
  }

  if (!user && activeTab !== 'auth') {
    return (
      <LandingPage
        onGetStarted={() => setActiveTab('auth')}
      />
    );
  }

  if (!user && activeTab === 'auth') {
    return <AuthPage onAuthenticated={() => setActiveTab('dashboard')} />;
  }

  const handleChallengeFriend = (levelId, levelTitle) => {
    setDuelChallenge({ levelId, levelTitle });
    setActiveTab('quiz');
    playSound('quiz_correct');
  };

  return (
    <RoomProvider>
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-pink-500/30 selection:text-white relative">
        <Navbar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />

        <main className="flex-1 pb-16">
          {activeTab === 'dashboard' && (
            <DashboardPage
              onSelectTrack={(track) => setActiveTab(track)}
              onOpenRoom={() => setActiveTab('room')}
              onChallengeQuiz={() => setActiveTab('quiz')}
            />
          )}

          {activeTab === 'cyber' && (
            <CyberRoadmapGamePage
              onChallengeFriend={handleChallengeFriend}
            />
          )}

          {activeTab === 'linux' && (
            <LinuxLabPage
              onChallengeFriend={handleChallengeFriend}
            />
          )}

          {activeTab === 'room' && (
            <StudyRoomDashboard
              onSelectTrack={(track) => setActiveTab(track)}
            />
          )}

          {activeTab === 'quiz' && (
            <QuizArenaPage
              duelChallenge={duelChallenge}
              onClearChallenge={() => setDuelChallenge(null)}
            />
          )}
        </main>
      </div>
    </RoomProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
