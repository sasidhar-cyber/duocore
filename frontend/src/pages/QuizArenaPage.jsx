import React, { useState, useEffect } from 'react';
import api from '../services/api';
import {
  Swords,
  Clock,
  Zap,
  Award,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Sparkles,
  ArrowRight,
  Shield,
  Terminal,
  Bookmark
} from 'lucide-react';
import { playSound } from '../utils/soundEffects';
import { fireConfetti } from '../utils/confetti';

export function QuizArenaPage({ challengeContext, onBack }) {
  const [subjectSlug, setSubjectSlug] = useState('cybersecurity');
  const [questions, setQuestions] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState(25);
  const [reveal, setReveal] = useState(null);

  useEffect(() => {
    async function loadQuestions() {
      setLoading(true);
      try {
        const res = await api.getQuizQuestions(subjectSlug, 5);
        setQuestions(res.questions || []);
      } catch (err) {}
      setLoading(false);
    }
    loadQuestions();
  }, [subjectSlug]);

  useEffect(() => {
    if (quizFinished || isAnswered || loading) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleAnswer(-1); // Timeout
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [currentIdx, isAnswered, quizFinished, loading]);

  const currentQ = questions[currentIdx];

  const handleAnswer = async (idx) => {
    if (isAnswered) return;
    setSelectedOption(idx);
    setIsAnswered(true);

    try {
      const res = await api.submitQuizAnswer({
        questionId: currentQ.id,
        selectedIndex: idx,
        responseTimeMs: (25 - timeLeft) * 1000
      });
      setReveal(res);
      if (res.isCorrect) {
        setScore((prev) => prev + 1);
        playSound('quiz_correct');
        fireConfetti();
      } else {
        playSound('quiz_wrong');
      }
    } catch {
      playSound('quiz_wrong');
      setReveal({ isCorrect: false, explanation: 'Could not score this answer. Try again.', correctIndex: -1 });
    }
  };

  const handleNext = () => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx(currentIdx + 1);
      setSelectedOption(null);
      setIsAnswered(false);
      setReveal(null);
      setTimeLeft(25);
      playSound('click');
    } else {
      setQuizFinished(true);
      playSound('quiz_correct');
    }
  };

  const handleRestart = () => {
    setCurrentIdx(0);
    setSelectedOption(null);
    setIsAnswered(false);
    setScore(0);
    setQuizFinished(false);
    setTimeLeft(25);
    setReveal(null);
    playSound('click');
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="glass-panel p-6 rounded-3xl border border-amber-500/30 shadow-2xl bg-gradient-to-r from-slate-950 via-amber-950/30 to-slate-900 flex items-center justify-between">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-black mb-2 border border-amber-500/30">
            <Swords className="w-3.5 h-3.5" />
            <span>1v1 Synchronized Quiz Battle</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white">
            Quiz Battle Arena ⚔️
          </h1>
        </div>

        {/* Track Switcher */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-900 border border-slate-800">
          <button
            onClick={() => { setSubjectSlug('cybersecurity'); handleRestart(); }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              subjectSlug === 'cybersecurity' ? 'bg-pink-600 text-white' : 'text-slate-400'
            }`}
          >
            Cybersecurity
          </button>
          <button
            onClick={() => { setSubjectSlug('linux'); handleRestart(); }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              subjectSlug === 'linux' ? 'bg-emerald-600 text-white' : 'text-slate-400'
            }`}
          >
            Linux
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400">Loading quiz questions...</div>
      ) : quizFinished ? (
        /* Quiz Finished Summary */
        <div className="glass-card p-8 rounded-3xl border border-slate-800 text-center space-y-6 shadow-2xl">
          <div className="w-16 h-16 rounded-3xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-3xl mx-auto">
            🏆
          </div>
          <h2 className="text-2xl font-black text-white">Quiz Duel Completed!</h2>
          <p className="text-xs text-slate-300">
            You scored <strong className="text-amber-400 text-base">{score} / {questions.length}</strong> correct answers!
          </p>

          <div className="flex items-center justify-center gap-3">
            <button
              onClick={handleRestart}
              className="px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-red-600 text-white font-bold text-xs shadow-lg shadow-amber-600/30 flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Rematch / Play Again</span>
            </button>
            {onBack && (
              <button
                onClick={onBack}
                className="px-6 py-3 rounded-2xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white text-xs font-bold"
              >
                Back to Dashboard
              </button>
            )}
          </div>
        </div>
      ) : currentQ ? (
        /* Active Question Card */
        <div className="glass-card p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-6 shadow-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-slate-400">
              Question {currentIdx + 1} of {questions.length}
            </span>
            <span className={`text-xs font-mono font-black flex items-center gap-1.5 ${timeLeft <= 5 ? 'text-red-400 animate-pulse' : 'text-amber-400'}`}>
              <Clock className="w-4 h-4" />
              <span>{timeLeft}s</span>
            </span>
          </div>

          <h3 className="text-lg font-black text-white leading-relaxed">
            {currentQ.question_text}
          </h3>

          {/* Options */}
          <div className="space-y-3">
            {currentQ.options.map((opt, oIdx) => {
              const isSelected = selectedOption === oIdx;
              let btnStyle = 'bg-slate-900/90 border-slate-800 text-slate-200 hover:border-pink-500/50';

              if (isAnswered && reveal) {
                if (oIdx === reveal.correctIndex) {
                  btnStyle = 'bg-emerald-950/80 border-emerald-500 text-emerald-200 ring-2 ring-emerald-500/40';
                } else if (isSelected) {
                  btnStyle = 'bg-red-950/80 border-red-500 text-red-200 ring-2 ring-red-500/40';
                }
              }

              return (
                <button
                  key={oIdx}
                  disabled={isAnswered}
                  onClick={() => handleAnswer(oIdx)}
                  className={`w-full p-4 rounded-2xl border text-left text-xs font-semibold transition-all flex items-center justify-between ${btnStyle}`}
                >
                  <span>{opt}</span>
                  {isAnswered && reveal && oIdx === reveal.correctIndex && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Explanation & Next */}
          {isAnswered && (
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 animate-in fade-in">
              <div>
                <strong className="text-xs text-white block mb-1">💡 Explanation:</strong>
                <p className="text-xs text-slate-300 leading-relaxed font-sans">{reveal?.explanation || currentQ.explanation}</p>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleNext}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-pink-600 to-indigo-600 hover:from-pink-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-pink-600/30"
                >
                  <span>Next Question</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
