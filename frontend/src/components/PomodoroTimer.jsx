import React, { useState, useEffect } from 'react';
import { useRoom } from '../context/RoomContext';
import { Play, Pause, RotateCcw, Clock, Sparkles } from 'lucide-react';
import { playSound } from '../utils/soundEffects';

const MODES = {
  study: { label: 'Study Focus', duration: 25 * 60, color: 'text-pink-400', border: 'border-pink-500/40' },
  shortBreak: { label: 'Short Break', duration: 5 * 60, color: 'text-cyan-400', border: 'border-cyan-500/40' },
  longBreak: { label: 'Long Break', duration: 15 * 60, color: 'text-emerald-400', border: 'border-emerald-500/40' }
};

export function PomodoroTimer() {
  const { timerState, startTimer, pauseTimer, resetTimer } = useRoom();
  const [localSeconds, setLocalSeconds] = useState(25 * 60);
  const [activeMode, setActiveMode] = useState('study');

  useEffect(() => {
    if (!timerState) return;

    if (timerState.isRunning && timerState.endsAt) {
      const interval = setInterval(() => {
        const remaining = Math.max(0, Math.floor((timerState.endsAt - Date.now()) / 1000));
        setLocalSeconds(remaining);
        if (remaining === 0) clearInterval(interval);
      }, 500);
      return () => clearInterval(interval);
    } else if (timerState.remainingSeconds !== undefined) {
      setLocalSeconds(timerState.remainingSeconds);
    }
  }, [timerState]);

  const minutes = Math.floor(localSeconds / 60);
  const seconds = localSeconds % 60;
  const timeFormatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const handleToggle = () => {
    playSound('click');
    if (timerState?.isRunning) {
      pauseTimer();
    } else {
      startTimer(activeMode, MODES[activeMode].duration, 'Cybersecurity', 'Focus Session');
    }
  };

  const handleReset = (mode) => {
    playSound('click');
    setActiveMode(mode);
    setLocalSeconds(MODES[mode].duration);
    resetTimer(mode, MODES[mode].duration);
  };

  return (
    <div className="glass-card p-6 rounded-3xl border border-slate-800 shadow-xl space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs font-black text-slate-300 flex items-center gap-1.5">
          <Clock className="w-4 h-4 text-pink-400" />
          <span>Synchronized Focus Timer</span>
        </span>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 font-bold border border-pink-500/30">
          DUO-SYNC
        </span>
      </div>

      {/* Mode Buttons */}
      <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-slate-900 border border-slate-800">
        {Object.entries(MODES).map(([k, v]) => (
          <button
            key={k}
            onClick={() => handleReset(k)}
            className={`py-1.5 rounded-xl text-[11px] font-bold transition-all ${
              activeMode === k ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>

      {/* Big Digital Clock Display */}
      <div className="text-center py-3">
        <span className="text-5xl font-black font-mono tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-white via-pink-200 to-cyan-300 drop-shadow-md">
          {timeFormatted}
        </span>
      </div>

      {/* Control Buttons */}
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={handleToggle}
          className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-pink-600 to-indigo-600 hover:from-pink-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-pink-600/30 flex items-center gap-2 transition-all"
        >
          {timerState?.isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          <span>{timerState?.isRunning ? 'Pause Timer' : 'Start Focus'}</span>
        </button>

        <button
          onClick={() => handleReset(activeMode)}
          className="p-2.5 rounded-2xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-all"
          title="Reset Timer"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
