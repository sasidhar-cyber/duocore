export function getHackerRank(level = 1, xp = 0) {
  if (level >= 26 || xp >= 2500) {
    return { title: 'Zero-Day Hunter', icon: '🛡️', color: 'from-pink-500 to-red-500', badgeColor: 'bg-red-500/20 text-red-300 border-red-500/30' };
  }
  if (level >= 21 || xp >= 1800) {
    return { title: 'Exploit Architect', icon: '⚡', color: 'from-purple-500 to-indigo-500', badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/30' };
  }
  if (level >= 16 || xp >= 1200) {
    return { title: 'Kernel Hacker', icon: '💻', color: 'from-cyan-500 to-blue-500', badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' };
  }
  if (level >= 11 || xp >= 700) {
    return { title: 'Shell Operator', icon: '🐧', color: 'from-emerald-500 to-teal-500', badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' };
  }
  if (level >= 6 || xp >= 300) {
    return { title: 'Packet Sniffer', icon: '📡', color: 'from-amber-500 to-orange-500', badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/30' };
  }
  return { title: 'Script Kiddie', icon: '🐣', color: 'from-slate-400 to-slate-200', badgeColor: 'bg-slate-800 text-slate-300 border-slate-700' };
}

export const TERMINAL_THEMES = {
  matrix: {
    id: 'matrix',
    name: 'Matrix Green 🟢',
    bg: 'bg-black/95',
    text: 'text-emerald-400',
    prompt: 'text-emerald-300',
    input: 'text-emerald-200',
    border: 'border-emerald-500/40',
    glow: 'shadow-emerald-900/20'
  },
  cyberpunk: {
    id: 'cyberpunk',
    name: 'Cyberpunk Neon 🟣',
    bg: 'bg-[#0d051a]',
    text: 'text-cyan-300',
    prompt: 'text-pink-400',
    input: 'text-pink-200',
    border: 'border-pink-500/40',
    glow: 'shadow-pink-900/20'
  },
  dracula: {
    id: 'dracula',
    name: 'Dracula Dark 🧛',
    bg: 'bg-[#1e1f29]',
    text: 'text-[#50fa7b]',
    prompt: 'text-[#bd93f9]',
    input: 'text-[#f1fa8c]',
    border: 'border-purple-500/40',
    glow: 'shadow-purple-900/20'
  },
  amber: {
    id: 'amber',
    name: 'Retro Amber 🟠',
    bg: 'bg-[#140b02]',
    text: 'text-amber-400',
    prompt: 'text-amber-300',
    input: 'text-amber-200',
    border: 'border-amber-500/40',
    glow: 'shadow-amber-900/20'
  },
  nordic: {
    id: 'nordic',
    name: 'Nordic Frost 🔵',
    bg: 'bg-[#0f172a]',
    text: 'text-sky-300',
    prompt: 'text-cyan-400',
    input: 'text-white',
    border: 'border-sky-500/40',
    glow: 'shadow-sky-900/20'
  }
};
