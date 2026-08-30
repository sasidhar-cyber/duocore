import React, { useState, useEffect } from 'react';
import { CYBER_ROADMAP_LEVELS } from '../data/cyberRoadmapData';
import {
  Shield,
  Lock,
  Unlock,
  CheckCircle2,
  HelpCircle,
  Sparkles,
  Zap,
  Award,
  ArrowLeft,
  ArrowRight,
  RotateCcw,
  Lightbulb,
  AlertTriangle,
  Flame,
  Swords,
  Bookmark,
  Share2,
  Code,
  Terminal,
  ChevronDown,
  ChevronUp,
  Eye,
  Layers,
  Compass
} from 'lucide-react';
import { playSound } from '../utils/soundEffects';
import { fireConfetti } from '../utils/confetti';
import api from '../services/api';
import { CyberLab } from '../components/CyberLab';
import { useRoom } from '../context/RoomContext';
import { getSocket } from '../services/socket';

const STAGE_GROUPS = [
  'All',
  'Foundations',
  'Networking',
  'Linux',
  'Cryptography',
  'Web Security',
  'Defense',
  'Monitoring',
  'Incident Response',
  'Forensics',
  'Final Mission'
];

export function CyberRoadmapGamePage({ onChallengeFriend, onOpenRevision }) {
  const { roomData } = useRoom();
  const [selectedLevelId, setSelectedLevelId] = useState('cyber-01');
  const [activeStageFilter, setActiveStageFilter] = useState('All');
  
  const [unlockedLevels, setUnlockedLevels] = useState(['cyber-01', 'cyber-02', 'cyber-03']);
  const [completedLevels, setCompletedLevels] = useState(['cyber-01']);
  const [masteryScores, setMasteryScores] = useState({ 'cyber-01': 85 });
  
  const [showExplainSimply, setShowExplainSimply] = useState(false);
  const [showWhyItMatters, setShowWhyItMatters] = useState(false);
  const [activeHintIdx, setActiveHintIdx] = useState(-1);
  const [quizSelectedOption, setQuizSelectedOption] = useState(null);
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);

  const [labState, setLabState] = useState({
    input: '',
    key: 'DUOCORE_SECRET',
    result: null,
    tested: false
  });

  const activeLevel = CYBER_ROADMAP_LEVELS.find(l => l.id === selectedLevelId) || CYBER_ROADMAP_LEVELS[0];

  useEffect(() => {
    setShowExplainSimply(false);
    setShowWhyItMatters(false);
    setActiveHintIdx(-1);
    setQuizSelectedOption(null);
    setQuizSubmitted(false);
    setShowCompletionModal(false);
    setLabState({ input: '', key: 'DUOCORE_SECRET', result: null, tested: false });
  }, [selectedLevelId]);

  const handleResetLab = () => {
    setLabState({ input: '', key: 'DUOCORE_SECRET', result: null, tested: false });
    playSound('click');
  };

  const handleLabComplete = async () => {
    setLabState((prev) => ({ ...prev, tested: true, result: 'Lab objective complete. This is a simulated environment only.' }));
    playSound('quiz_correct');
    try {
      await api.updateCyberProgress({ levelNum: activeLevel.levelNum, labDone: true, mastery: 60 });
    } catch {}
  };

  const handleQuizSubmit = (idx) => {
    if (quizSubmitted) return;
    setQuizSelectedOption(idx);
    setQuizSubmitted(true);

    const isCorrect = idx === activeLevel.correctOptionIndex;
    if (isCorrect) {
      playSound('quiz_correct');
      fireConfetti();
      
      if (!completedLevels.includes(activeLevel.id)) {
        const nextCompleted = [...completedLevels, activeLevel.id];
        setCompletedLevels(nextCompleted);
        api.updateCyberProgress({
          levelNum: activeLevel.levelNum,
          quizDone: true,
          lessonDone: true,
          mastery: 90
        }).catch(() => {});
        
        const currentIdx = CYBER_ROADMAP_LEVELS.findIndex(l => l.id === activeLevel.id);
        if (currentIdx < CYBER_ROADMAP_LEVELS.length - 1) {
          const nextId = CYBER_ROADMAP_LEVELS[currentIdx + 1].id;
          if (!unlockedLevels.includes(nextId)) {
            setUnlockedLevels(prev => [...prev, nextId]);
          }
        }
        setShowCompletionModal(true);
      }
    } else {
      playSound('quiz_wrong');
    }
  };

  const filteredLevels = activeStageFilter === 'All'
    ? CYBER_ROADMAP_LEVELS
    : CYBER_ROADMAP_LEVELS.filter(l => l.stageGroup.toLowerCase().includes(activeStageFilter.toLowerCase()));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8">
      {/* Header Banner */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-pink-500/30 shadow-2xl relative overflow-hidden bg-gradient-to-r from-slate-950 via-indigo-950/40 to-pink-950/40">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-500/20 text-pink-300 text-xs font-black mb-2 border border-pink-500/30">
              <Compass className="w-3.5 h-3.5" />
              <span>30-Level Cybersecurity Adventure Map</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              Cybersecurity Game Roadmap 🛡️
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
              Learn, simulate, and master 30 progressive cybersecurity levels from absolute foundations to advanced incident response and defense.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-slate-900/90 border border-slate-800 p-3.5 rounded-2xl">
            <Award className="w-8 h-8 text-amber-400" />
            <div>
              <span className="text-[10px] uppercase font-mono font-bold text-slate-400 block">Overall Mastery</span>
              <span className="text-sm font-black text-cyan-300">
                {completedLevels.length} / 30 Levels Completed ({Math.round((completedLevels.length / 30) * 100)}%)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Stage Group Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
        {STAGE_GROUPS.map((grp) => (
          <button
            key={grp}
            onClick={() => {
              setActiveStageFilter(grp);
              playSound('click');
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              activeStageFilter === grp
                ? 'bg-gradient-to-r from-pink-600 to-indigo-600 text-white shadow-md shadow-pink-600/30'
                : 'bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            {grp}
          </button>
        ))}
      </div>

      {/* 30-Level Visual Game Map Node Strip */}
      <div className="glass-panel p-4 rounded-3xl border border-slate-800 bg-slate-950/90 overflow-x-auto">
        <div className="flex items-center gap-3 min-w-max py-2 px-1">
          {CYBER_ROADMAP_LEVELS.map((lvl, idx) => {
            const isUnlocked = unlockedLevels.includes(lvl.id);
            const isCompleted = completedLevels.includes(lvl.id);
            const isSelected = selectedLevelId === lvl.id;

            return (
              <div key={lvl.id} className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setSelectedLevelId(lvl.id);
                    playSound('click');
                  }}
                  className={`relative p-3 rounded-2xl border transition-all flex flex-col items-center gap-1 w-24 sm:w-28 text-center ${
                    isSelected
                      ? 'bg-gradient-to-tr from-pink-600 to-indigo-600 border-pink-400 text-white shadow-lg shadow-pink-600/40 scale-105 ring-2 ring-pink-400/50'
                      : isCompleted
                      ? 'bg-slate-900 border-emerald-500/50 text-emerald-300 hover:border-emerald-400'
                      : isUnlocked
                      ? 'bg-slate-900 border-slate-800 text-slate-300 hover:border-pink-500/50'
                      : 'bg-slate-950/60 border-slate-900 text-slate-600 opacity-60 cursor-not-allowed'
                  }`}
                >
                  <span className="text-base sm:text-lg">
                    {isCompleted ? '🏆' : isUnlocked ? '🌟' : '🔒'}
                  </span>
                  <span className="text-[10px] font-mono font-black uppercase tracking-wider block truncate w-full">
                    L{lvl.levelNum}
                  </span>
                  <span className="text-[10px] font-bold truncate w-full">
                    {lvl.title.split(' ')[0]}
                  </span>
                </button>

                {idx < CYBER_ROADMAP_LEVELS.length - 1 && (
                  <div className={`w-3 h-0.5 rounded-full ${isCompleted ? 'bg-emerald-500' : 'bg-slate-800'}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Active Level Deep Learning Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Concept, Diagram, Lab (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          <div className="glass-card p-6 sm:p-8 rounded-3xl border border-slate-800 shadow-2xl space-y-6">
            {/* Header / Objective */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-slate-800 gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono font-bold text-pink-400 uppercase tracking-wider">
                    {activeLevel.stageGroup} • Level {activeLevel.levelNum}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30">
                    +{activeLevel.xpReward} XP
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-white mt-1">
                  {activeLevel.title}
                </h2>
              </div>
              <span className="px-3 py-1 rounded-full bg-pink-500/20 text-pink-300 font-mono text-xs font-bold border border-pink-500/30">
                {activeLevel.badge}
              </span>
            </div>

            {/* Learning Objective */}
            <div className="p-4 rounded-2xl bg-indigo-950/30 border border-indigo-500/30 text-xs text-indigo-200 flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-pink-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-white block mb-0.5">Learning Objective:</strong>
                {activeLevel.objective}
              </div>
            </div>

            {/* Core Explanation */}
            <div className="space-y-2">
              <h3 className="text-xs font-black text-slate-300 uppercase tracking-wider">
                📖 Core Concept & Fundamentals
              </h3>
              <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                {activeLevel.explanation}
              </p>
            </div>

            {/* Explain Simply & Why Does This Matter */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2">
                <button
                  onClick={() => setShowExplainSimply(!showExplainSimply)}
                  className="w-full flex items-center justify-between text-xs font-black text-amber-300 hover:text-amber-200"
                >
                  <span className="flex items-center gap-1.5">
                    <Lightbulb className="w-4 h-4 text-amber-400" />
                    <span>💡 Explain Simply</span>
                  </span>
                  {showExplainSimply ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {showExplainSimply && (
                  <p className="text-xs text-slate-300 pt-2 border-t border-slate-800 leading-relaxed">
                    {activeLevel.explainSimply}
                  </p>
                )}
              </div>

              <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2">
                <button
                  onClick={() => setShowWhyItMatters(!showWhyItMatters)}
                  className="w-full flex items-center justify-between text-xs font-black text-cyan-300 hover:text-cyan-200"
                >
                  <span className="flex items-center gap-1.5">
                    <HelpCircle className="w-4 h-4 text-cyan-400" />
                    <span>❓ Why does this matter?</span>
                  </span>
                  {showWhyItMatters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {showWhyItMatters && (
                  <p className="text-xs text-slate-300 pt-2 border-t border-slate-800 leading-relaxed">
                    {activeLevel.whyItMatters}
                  </p>
                )}
              </div>
            </div>

            {/* Visual Diagram */}
            <div className="space-y-2">
              <h3 className="text-xs font-black text-purple-300 uppercase tracking-wider">
                🗺️ Visual Architectural Flow
              </h3>
              <pre className="p-4 rounded-2xl bg-slate-950 text-cyan-300 font-mono text-[11px] sm:text-xs border border-slate-800 overflow-x-auto leading-relaxed">
                {activeLevel.diagram}
              </pre>
            </div>

            {/* Connected Concepts */}
            <div className="space-y-2">
              <h3 className="text-xs font-black text-indigo-300 uppercase tracking-wider">
                🔗 Connected Concepts
              </h3>
              <div className="flex flex-wrap gap-2">
                {activeLevel.connectedConcepts.map((concept, cIdx) => (
                  <span
                    key={cIdx}
                    className="px-3 py-1 rounded-xl bg-slate-900 text-xs font-medium text-slate-300 border border-slate-800 flex items-center gap-1.5"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-pink-400" />
                    {concept}
                  </span>
                ))}
              </div>
            </div>

            {/* HANDS-ON EDUCATIONAL LAB SIMULATOR */}
            <div className="p-5 rounded-3xl bg-slate-900/90 border border-pink-500/30 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black text-white flex items-center gap-2">
                  <span className="text-base">🛠️</span>
                  <span>Hands-on Educational Lab Simulator</span>
                </h3>
                <button
                  onClick={handleResetLab}
                  className="px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-bold flex items-center gap-1 transition-all"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>↻ RESET LAB</span>
                </button>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
                <p className="text-xs text-slate-300">
                  Isolated simulator for Level {activeLevel.levelNum}: {activeLevel.title}
                </p>
                <CyberLab levelNum={activeLevel.levelNum} onComplete={handleLabComplete} />
                {labState.tested && (
                  <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs font-mono">
                    {labState.result}
                  </div>
                )}
              </div>
            </div>

            {/* Guided Challenge & 3 Progressive Hints */}
            <div className="p-5 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-3">
              <h3 className="text-xs font-black text-amber-300 uppercase tracking-wider">
                🎯 Guided Challenge
              </h3>
              <p className="text-xs text-slate-200 font-medium">
                {activeLevel.guidedChallenge}
              </p>

              {/* Progressive Hints */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-slate-400">Need a hint?</span>
                  {[0, 1, 2].map((hIdx) => (
                    <button
                      key={hIdx}
                      onClick={() => {
                        setActiveHintIdx(hIdx);
                        playSound('click');
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                        activeHintIdx >= hIdx
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      💡 Hint {hIdx + 1}
                    </button>
                  ))}
                </div>

                {activeHintIdx >= 0 && (
                  <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/30 text-amber-200 text-xs animate-in fade-in">
                    <strong>Hint {activeHintIdx + 1}:</strong> {activeLevel.hints ? activeLevel.hints[activeHintIdx] : 'Check the core principle.'}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Mastery Score, Level Quiz (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Mastery Score Progress Box */}
          <div className="glass-card p-6 rounded-3xl border border-slate-800 shadow-2xl space-y-4">
            <h3 className="text-xs font-black text-white flex items-center justify-between">
              <span>📊 Topic Mastery Breakdown</span>
              <span className="text-cyan-400 font-mono">
                {masteryScores[activeLevel.id] || (completedLevels.includes(activeLevel.id) ? 90 : 30)}%
              </span>
            </h3>

            <div className="space-y-2.5 text-xs">
              <div>
                <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                  <span>Understanding</span>
                  <span>{completedLevels.includes(activeLevel.id) ? '90%' : '50%'}</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                  <div className="h-full bg-pink-500 rounded-full" style={{ width: completedLevels.includes(activeLevel.id) ? '90%' : '50%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                  <span>Lab Skills</span>
                  <span>{labState.tested ? '100%' : '40%'}</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                  <div className="h-full bg-cyan-400 rounded-full" style={{ width: labState.tested ? '100%' : '40%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                  <span>Quiz Knowledge</span>
                  <span>{quizSubmitted && quizSelectedOption === activeLevel.correctOptionIndex ? '100%' : '0%'}</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                  <div className="h-full bg-amber-400 rounded-full" style={{ width: quizSubmitted && quizSelectedOption === activeLevel.correctOptionIndex ? '100%' : '0%' }} />
                </div>
              </div>
            </div>
          </div>

          {/* Checkpoint Quiz */}
          <div className="glass-card p-6 rounded-3xl border border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-pink-300 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-pink-400" />
                <span>Level Checkpoint Quiz</span>
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-slate-400">
                Q{activeLevel.levelNum}
              </span>
            </div>

            <p className="text-xs font-bold text-white leading-relaxed">
              {activeLevel.quizQuestion}
            </p>

            <div className="space-y-2">
              {activeLevel.quizOptions.map((opt, oIdx) => {
                const isSelected = quizSelectedOption === oIdx;
                let btnStyle = 'bg-slate-900/80 border-slate-800 text-slate-300 hover:border-pink-500/50';

                if (quizSubmitted) {
                  if (oIdx === activeLevel.correctOptionIndex) {
                    btnStyle = 'bg-emerald-950/80 border-emerald-500 text-emerald-200 ring-2 ring-emerald-500/40';
                  } else if (isSelected) {
                    btnStyle = 'bg-red-950/80 border-red-500 text-red-200 ring-2 ring-red-500/40';
                  }
                }

                return (
                  <button
                    key={oIdx}
                    disabled={quizSubmitted}
                    onClick={() => handleQuizSubmit(oIdx)}
                    className={`w-full p-3 rounded-2xl border text-left text-xs font-medium transition-all flex items-center justify-between ${btnStyle}`}
                  >
                    <span>{opt}</span>
                    {quizSubmitted && oIdx === activeLevel.correctOptionIndex && (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            {quizSubmitted && (
              <div className={`p-4 rounded-2xl text-xs space-y-1.5 animate-in fade-in ${
                quizSelectedOption === activeLevel.correctOptionIndex
                  ? 'bg-emerald-950/40 border border-emerald-500/40 text-emerald-300'
                  : 'bg-red-950/40 border border-red-500/40 text-red-300'
              }`}>
                <div className="font-bold flex items-center gap-1.5">
                  <span>{quizSelectedOption === activeLevel.correctOptionIndex ? '🎉 Level Passed!' : '❌ Incorrect'}</span>
                </div>
                <p className="text-slate-200 text-[11px] leading-relaxed">
                  {activeLevel.quizExplanation}
                </p>
              </div>
            )}
          </div>

          {/* Actions: Challenge Friend & Revision */}
          <div className="space-y-2.5">
            <button
              onClick={() => {
                if (roomData?.id) {
                  const s = getSocket();
                  s.emit('quiz:challenge_friend', {
                    roomId: roomData.id,
                    levelId: activeLevel.id,
                    levelTitle: activeLevel.title
                  });
                }
                if (onChallengeFriend) onChallengeFriend(activeLevel.id, activeLevel.title);
                playSound('click');
              }}
              className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-amber-500 to-red-600 hover:from-amber-400 hover:to-red-500 text-white font-black text-xs shadow-lg shadow-amber-600/30 flex items-center justify-center gap-2 transition-all"
            >
              <Swords className="w-4 h-4" />
              <span>⚔️ Challenge Friend on Level {activeLevel.levelNum}</span>
            </button>

            <button
              onClick={() => {
                api.bookmarkCyber({ levelId: activeLevel.id, title: activeLevel.title }).catch(() => {});
                if (onOpenRevision) onOpenRevision(activeLevel.id);
                playSound('click');
              }}
              className="w-full py-2.5 px-4 rounded-2xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-pink-500/40 font-bold text-xs flex items-center justify-center gap-2 transition-all"
            >
              <Bookmark className="w-3.5 h-3.5 text-pink-400" />
              <span>Bookmark to Revision Zone</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
