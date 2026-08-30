import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRoom } from '../context/RoomContext';
import api from '../services/api';
import { User, X, Check, Edit3, Sparkles, Smile } from 'lucide-react';
import { playSound } from '../utils/soundEffects';

export function ProfileEditModal({ isOpen, onClose }) {
  const { user, setUser } = useAuth();
  const { partner } = useRoom();

  const [username, setUsername] = useState(user?.username || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [partnerNickname, setPartnerNickname] = useState(localStorage.getItem('duocore_partner_nickname') || '');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (username.trim().length < 2) {
      setError('Username must be at least 2 characters.');
      playSound('quiz_wrong');
      return;
    }

    setLoading(true);

    try {
      const res = await api.updateProfile({
        username: username.trim(),
        bio: bio.trim()
      });

      setUser(res.user);
      if (partnerNickname.trim()) {
        localStorage.setItem('duocore_partner_nickname', partnerNickname.trim());
      } else {
        localStorage.removeItem('duocore_partner_nickname');
      }

      setSuccess('🎉 Profile & Name updated successfully!');
      playSound('quiz_correct');
      setTimeout(() => {
        onClose();
      }, 800);
    } catch (err) {
      setError(err.message || 'Failed to update profile.');
      playSound('quiz_wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
      <div className="w-full max-w-md glass-panel p-6 sm:p-8 rounded-3xl border border-pink-500/40 shadow-2xl space-y-6 relative animate-in zoom-in-95 duration-150 bg-slate-950/95">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-500 to-indigo-600 p-[1.5px] shadow-md">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-lg">
                ✏️
              </div>
            </div>
            <div>
              <h3 className="text-base font-black text-white">Rename Profile & Nickname</h3>
              <p className="text-xs text-slate-400">Customize your name and your partner's display name</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-2xl bg-red-950/60 border border-red-500/40 text-red-300 text-xs">
            {error}
          </div>
        )}

        {success && (
          <div className="p-3 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-xs">
            {success}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1.5">
              Your Display Username:
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Sasi or CyberMaster"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full glass-input rounded-xl px-4 py-2.5 text-xs text-white"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1.5">
              Your Bio / Status:
            </label>
            <input
              type="text"
              placeholder="e.g. Learning Cybersecurity & Linux Together!"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full glass-input rounded-xl px-4 py-2.5 text-xs text-white"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1.5">
              Friend's Custom Nickname (Optional):
            </label>
            <input
              type="text"
              placeholder="e.g. Bestie, Alex, Buddy"
              value={partnerNickname}
              onChange={(e) => setPartnerNickname(e.target.value)}
              className="w-full glass-input rounded-xl px-4 py-2.5 text-xs text-white"
            />
            <span className="text-[10px] text-slate-500 block mt-1">
              Sets a custom local nickname for your study partner in chat & presence.
            </span>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 hover:from-pink-500 hover:to-indigo-500 text-white font-black text-xs shadow-lg shadow-pink-600/30 transition-all disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save Changes ✨'}
          </button>
        </form>
      </div>
    </div>
  );
}
