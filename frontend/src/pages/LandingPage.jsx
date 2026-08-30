import React from 'react';
import { ParticleHero } from '../components/ParticleHero';
import {
  Shield,
  Terminal,
  MessageSquare,
  Swords,
  Radio,
  ArrowRight,
  Sparkles,
  Zap,
  Code2,
  Users
} from 'lucide-react';
import { playSound } from '../utils/soundEffects';

export function LandingPage({ onGetStarted }) {
  return (
    <div className="min-h-screen relative overflow-hidden bg-slate-950 flex flex-col justify-between">
      {/* 3D Cyber Particle Background Canvas */}
      <ParticleHero />

      {/* Hero Content */}
      <main className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 text-center space-y-8">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900/90 border border-pink-500/40 text-pink-300 text-xs font-bold shadow-lg shadow-pink-500/10 backdrop-blur-md animate-bounce">
          <Sparkles className="w-3.5 h-3.5 text-pink-400" />
          <span>DUOCORE — Cyber & Linux Learning Squad</span>
        </div>

        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-white tracking-tight leading-tight">
          Learn. Practice. Challenge.<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-purple-300 to-cyan-400">
            Together.
          </span>
        </h1>

        <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed font-medium">
          A synchronized collaborative learning platform for you and your friends. Master <strong>30 Cybersecurity levels</strong> and <strong>16 Linux terminal labs</strong> with live squad chat, real-time WebRTC voice calls, and synchronized 1v1 quizzes.
        </p>

        {/* Call to Action */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <button
            onClick={() => { onGetStarted(); playSound('click'); }}
            className="w-full sm:w-auto px-10 py-4 rounded-2xl bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 hover:from-pink-500 hover:to-indigo-500 text-white font-black text-sm shadow-2xl shadow-pink-600/40 flex items-center justify-center gap-2 transition-all group"
          >
            <span>Get Started & Create Account</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>

        {/* 4 Core Feature Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-12 text-left">
          <div className="glass-card p-5 rounded-3xl border border-pink-500/30 space-y-2">
            <div className="w-10 h-10 rounded-2xl bg-pink-500/20 flex items-center justify-center text-pink-400 font-bold">
              🛡️
            </div>
            <h3 className="text-sm font-black text-white">30-Level Cyber Roadmap</h3>
            <p className="text-xs text-slate-400">From CIA Triad to Cryptography, SQLi, XSS, and incident response with hands-on safe labs.</p>
          </div>

          <div className="glass-card p-5 rounded-3xl border border-emerald-500/30 space-y-2">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold">
              🐧
            </div>
            <h3 className="text-sm font-black text-white">16-Level Linux Terminal</h3>
            <p className="text-xs text-slate-400">Live POSIX virtual terminal with auto-validation for permissions, processes, and hardening.</p>
          </div>

          <div className="glass-card p-5 rounded-3xl border border-indigo-500/30 space-y-2">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold">
              💬
            </div>
            <h3 className="text-sm font-black text-white">Squad Chat & Voice</h3>
            <p className="text-xs text-slate-400">Real-time collaboration with voice notes, photo sharing, PDF documents, location, and WebRTC voice calls.</p>
          </div>

          <div className="glass-card p-5 rounded-3xl border border-purple-500/30 space-y-2">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/20 flex items-center justify-center text-purple-400 font-bold">
              ⚔️
            </div>
            <h3 className="text-sm font-black text-white">1v1 Quiz Arena</h3>
            <p className="text-xs text-slate-400">Synchronized timed face-offs with secret answer locking and automatic Revision Zone capture.</p>
          </div>
        </div>
      </main>

      <footer className="relative z-10 py-6 border-t border-slate-900 text-center text-xs text-slate-500">
        DUOCORE — Learn. Practice. Challenge. Together.
      </footer>
    </div>
  );
}
