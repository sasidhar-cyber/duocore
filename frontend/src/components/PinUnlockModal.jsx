import React, { useState, useEffect } from 'react';
import { X, Lock, Sparkles, Delete } from 'lucide-react';
import { playSound } from '../utils/soundEffects';
import { useRoom } from '../context/RoomContext';
import api from '../services/api';

export function PinUnlockModal({ isOpen, onClose, onUnlockSuccess }) {
  const [enteredPin, setEnteredPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [isClearing, setIsClearing] = useState(false);
  const { roomData } = useRoom();

  const savedPin = localStorage.getItem('soundwave_vault_pin') || localStorage.getItem('duocore_vault_pin') || '1234';

  useEffect(() => {
    if (isOpen) {
      setEnteredPin('');
      setPinError('');
    }
  }, [isOpen]);

  // Esc key closes modal
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const triggerUnlock = () => {
    localStorage.removeItem('duocore_pin_failures');
    try { playSound('quiz_correct'); } catch (err) {}
    onUnlockSuccess();
  };

  const handleKeypadPress = (digit) => {
    setPinError('');
    const next = (enteredPin + digit).slice(0, 4);
    setEnteredPin(next);

    if (next === savedPin) {
      triggerUnlock();
    }
  };

  const handleDeleteDigit = () => {
    setEnteredPin((prev) => prev.slice(0, -1));
    setPinError('');
  };

  const handlePinSubmit = (e) => {
    e?.preventDefault();
    if (enteredPin === savedPin) {
      triggerUnlock();
    } else {
      const failures = Number(localStorage.getItem('duocore_pin_failures') || '0') + 1;
      localStorage.setItem('duocore_pin_failures', String(failures));
      const limit = Number(localStorage.getItem('duocore_pin_failure_limit') || '3');
      const shouldClear = localStorage.getItem('duocore_panic_clear_enabled') === 'true' && failures >= limit;
      if (shouldClear && roomData?.id) {
        setIsClearing(true);
        api.panicClearRoomMessages(roomData.id)
          .then(() => setPinError('Too many incorrect PINs. Chat has been cleared.'))
          .catch(() => setPinError('Too many incorrect PINs. Could not clear chat while offline.'))
          .finally(() => {
            localStorage.removeItem('duocore_pin_failures');
            setIsClearing(false);
          });
      } else {
        setPinError(`Incorrect PIN. ${Math.max(0, limit - failures)} attempts remaining.`);
      }
      setEnteredPin('');
      try { playSound('quiz_wrong'); } catch (err) {}
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in select-none">
      <div className="w-full max-w-xs glass-panel p-6 rounded-3xl border border-emerald-500/40 shadow-2xl bg-slate-950/95 text-center space-y-5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono font-bold text-slate-500 tracking-wider">STEALTH SECURITY</span>
          <button
            onClick={onClose}
            className="p-1 rounded-xl text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto text-2xl animate-pulse shadow-lg shadow-emerald-500/10">
          💬
        </div>

        <div>
          <h3 className="text-base font-black text-white">Unlock 1v1 Duo Chat</h3>
          <p className="text-xs text-slate-400 mt-0.5">Enter 4-digit PIN (Default: 1234)</p>
        </div>

        {/* PIN Dots Indicator */}
        <div className="flex justify-center items-center gap-3 my-2">
          {[0, 1, 2, 3].map((idx) => (
            <div
              key={idx}
              className={`w-3.5 h-3.5 rounded-full border-2 transition-all ${
                enteredPin.length > idx
                  ? 'bg-emerald-400 border-emerald-400 scale-110 shadow-lg shadow-emerald-400/50'
                  : 'border-slate-700 bg-slate-900'
              }`}
            />
          ))}
        </div>

        {pinError && (
          <p className="text-xs text-red-400 font-bold animate-shake">{pinError}</p>
        )}

        {/* Touch Number Keypad */}
        <div className="grid grid-cols-3 gap-2.5 max-w-[230px] mx-auto pt-1">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => handleKeypadPress(num)}
              disabled={isClearing}
              className="h-11 rounded-2xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 text-lg font-bold text-white active:scale-95 active:bg-emerald-500 active:text-slate-950 transition-all flex items-center justify-center shadow-sm"
            >
              {num}
            </button>
          ))}
          <button
            type="button"
            onClick={handleDeleteDigit}
            className="h-11 rounded-2xl bg-slate-900/60 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-400 active:scale-95 transition-all flex items-center justify-center"
          >
            ⌫
          </button>
          <button
            type="button"
            onClick={() => handleKeypadPress('0')}
            disabled={isClearing}
            className="h-11 rounded-2xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 text-lg font-bold text-white active:scale-95 active:bg-emerald-500 active:text-slate-950 transition-all flex items-center justify-center shadow-sm"
          >
            0
          </button>
          <button
            type="button"
            onClick={handlePinSubmit}
            disabled={isClearing}
            className="h-11 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-xs font-black text-slate-950 active:scale-95 transition-all flex items-center justify-center shadow-md shadow-emerald-500/30"
          >
            {isClearing ? '…' : '🔓'}
          </button>
        </div>

        <div className="pt-1">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white text-xs font-bold"
          >
            Cancel / Back to Music
          </button>
        </div>
      </div>
    </div>
  );
}
