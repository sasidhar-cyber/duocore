import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { LINUX_ROADMAP_LEVELS } from '../data/linuxRoadmapData';
import { TERMINAL_THEMES, getHackerRank } from '../utils/hackerTitles';
import { useAuth } from '../context/AuthContext';
import {
  Terminal,
  CheckCircle,
  HelpCircle,
  Sparkles,
  RotateCcw,
  BookOpen,
  Send,
  Check,
  Layers,
  Code,
  Shield,
  Search,
  Flame,
  Zap,
  Play,
  Award,
  ArrowRight,
  ArrowLeft,
  ChevronRight,
  Bookmark,
  Swords,
  Palette
} from 'lucide-react';
import { playSound } from '../utils/soundEffects';
import { fireConfetti } from '../utils/confetti';

const COMMAND_CATEGORIES = [
  {
    id: 'navigation',
    title: '📁 File & Directory Management',
    commands: [
      { cmd: 'ls -la', syntax: 'ls [options] [path]', desc: 'List all files including hidden files, permissions, size & owner', example: 'ls -la /var/log', expected: 'drwxr-xr-x 2 root root 4096 ...', mistake: 'Omitting -a hides dotfiles.' },
      { cmd: 'pwd', syntax: 'pwd', desc: 'Print absolute path of current working directory', example: 'pwd', expected: '/home/student', mistake: 'Passing directory arguments to pwd.' },
      { cmd: 'mkdir -p projects/duocore', syntax: 'mkdir -p <path>', desc: 'Create nested directory hierarchy in one step', example: 'mkdir -p ~/labs/net', expected: '(directory created)', mistake: 'Forgetting -p when parent folder is missing.' },
      { cmd: 'cat /etc/os-release', syntax: 'cat <file>', desc: 'Display Linux distribution name and kernel version', example: 'cat /etc/os-release', expected: 'NAME="Ubuntu" VERSION="24.04"', mistake: 'Opening giant files with cat.' },
      { cmd: 'head -n 5 /var/log/auth.log', syntax: 'head -n <lines> <file>', desc: 'View top 5 lines of authentication security log', example: 'head -n 5 auth.log', expected: 'First 5 lines of auth events', mistake: 'Forgetting -n flag.' },
      { cmd: 'tail -n 5 /var/log/auth.log', syntax: 'tail -n <lines> <file>', desc: 'View bottom 5 lines of recent security events', example: 'tail -n 5 auth.log', expected: 'Last 5 lines of security log', mistake: 'Not using -f for live tailing.' }
    ]
  },
  {
    id: 'permissions',
    title: '🔒 Permissions & SUID Auditing',
    commands: [
      { cmd: 'chmod 755 /home/student/projects', syntax: 'chmod <octal> <path>', desc: 'Set rwxr-xr-x permissions (read/write/exec owner, read/exec others)', example: 'chmod 755 script.sh', expected: '-rwxr-xr-x 1 student student', mistake: 'Using 777 in production.' },
      { cmd: 'chmod 600 /home/student/.ssh/id_rsa', syntax: 'chmod 600 <keyfile>', desc: 'Restrict SSH private key to Owner Read/Write only (rw-------)', example: 'chmod 600 ~/.ssh/id_rsa', expected: '-rw------- 1 student student', mistake: 'Leaving private key readable by group.' },
      { cmd: 'chown student:developers /home/student', syntax: 'chown <user>:<group> <file>', desc: 'Change user owner to student and group to developers', example: 'chown root:root /etc/shadow', expected: 'Ownership modified', mistake: 'Requires root / sudo privilege.' },
      { cmd: 'find / -perm -4000 2>/dev/null', syntax: 'find / -perm -4000', desc: 'Audit and list all SUID root binaries on system', example: 'find / -perm -4000', expected: '/usr/bin/passwd\n/bin/su', mistake: 'Omitting 2>/dev/null floods terminal with errors.' }
    ]
  },
  {
    id: 'text_processing',
    title: '📊 Text Processing (grep, awk, sed)',
    commands: [
      { cmd: 'grep "Failed password" /var/log/auth.log', syntax: 'grep [options] "<pattern>" <file>', desc: 'Filter auth log for failed SSH authentication attempts', example: 'grep "Failed" /var/log/auth.log', expected: 'Failed password for invalid user root from 192.168.1.100', mistake: 'Case sensitivity: use -i.' },
      { cmd: "awk -F: '{print $1, $7}' /etc/passwd", syntax: "awk -F<sep> '{print $N}'", desc: 'Parse /etc/passwd columns for usernames and default login shells', example: "awk -F: '{print $1}' /etc/passwd", expected: 'root /bin/bash\nstudent /bin/bash', mistake: 'Not defining custom delimiter with -F.' },
      { cmd: 'grep -v "nologin" /etc/passwd', syntax: 'grep -v "<pattern>" <file>', desc: 'Invert match to find active user accounts with shell access', example: 'grep -v "nologin" /etc/passwd', expected: 'Accounts with real shells', mistake: 'Confusing -v (invert) with -i (ignore case).' }
    ]
  },
  {
    id: 'processes',
    title: '⚙️ Processes & Systemd Services',
    commands: [
      { cmd: 'ps aux', syntax: 'ps aux', desc: 'List all running system processes with PID, CPU %, MEM %, and command', example: 'ps aux', expected: 'USER PID %CPU %MEM COMMAND ...', mistake: 'Running without aux shows only current shell.' },
      { cmd: 'ps aux | grep "duocore"', syntax: 'ps aux | grep "<name>"', desc: 'Search for active DUOCORE processes', example: 'ps aux | grep node', expected: 'node /home/duocore/server.js', mistake: 'Grep itself shows up in ps results.' },
      { cmd: 'kill -9 14205', syntax: 'kill -9 <PID>', desc: 'Send unblockable SIGKILL signal to terminate PID 14205', example: 'kill -9 14205', expected: '(Process terminated)', mistake: 'Killing system PID 1 crashes OS.' },
      { cmd: 'systemctl status duocore', syntax: 'systemctl status <service>', desc: 'Check background systemd service status and uptime', example: 'systemctl status nginx', expected: 'Active: active (running)', mistake: 'Forgetting service name.' }
    ]
  },
  {
    id: 'networking',
    title: '🌐 Network Diagnostics & Sockets',
    commands: [
      { cmd: 'ss -tulpn', syntax: 'ss -tulpn', desc: 'List all open listening TCP/UDP sockets, port numbers, and PIDs', example: 'ss -tulpn', expected: 'tcp LISTEN 0.0.0.0:5000 node', mistake: 'Using deprecated netstat.' },
      { cmd: 'curl http://localhost:5000/api/health', syntax: 'curl [options] <url>', desc: 'Send HTTP GET request to test API health endpoint', example: 'curl http://localhost:5000/api/health', expected: '{"status":"healthy"}', mistake: 'Missing protocol http://.' },
      { cmd: 'ip addr show', syntax: 'ip a[ddr]', desc: 'Display network interfaces, MAC addresses, and assigned IP addresses', example: 'ip a', expected: 'eth0: inet 192.168.1.5/24', mistake: 'Using deprecated ifconfig.' }
    ]
  },
  {
    id: 'storage',
    title: '💾 Storage & Archiving',
    commands: [
      { cmd: 'df -h', syntax: 'df -h', desc: 'Display disk filesystem capacity in human-readable GB/MB', example: 'df -h', expected: '/dev/sda1 50G 12G 38G 24% /', mistake: 'Omitting -h shows block counts in bytes.' },
      { cmd: 'du -sh /home/student', syntax: 'du -sh <path>', desc: 'Calculate total disk space consumed by student home folder', example: 'du -sh /var/log', expected: '128M /var/log', mistake: 'Running without -s outputs every subfolder.' }
    ]
  },
  {
    id: 'users',
    title: '👤 Users & Groups',
    commands: [
      { cmd: 'whoami', syntax: 'whoami', desc: 'Print the current effective username', example: 'whoami', expected: 'student', mistake: 'Confusing with id.' },
      { cmd: 'id', syntax: 'id', desc: 'Show uid, gid, and group memberships', example: 'id', expected: 'uid=1000(student) ...', mistake: 'Requires no extra flags for a quick check.' },
      { cmd: 'groups', syntax: 'groups', desc: 'List groups for the current user', example: 'groups', expected: 'student sudo', mistake: 'Not the same as /etc/group dump.' }
    ]
  }
];

export function LinuxLabPage({ onChallengeFriend }) {
  const { user } = useAuth();
  const rank = getHackerRank(user?.level || 1, user?.xp || 0);

  const [activeViewTab, setActiveViewTab] = useState('roadmap'); // 'roadmap' or 'encyclopedia'
  const [selectedLevelIdx, setSelectedLevelIdx] = useState(0);
  const [completedLevels, setCompletedLevels] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('navigation');
  const [activeHintIdx, setActiveHintIdx] = useState(-1);

  // Terminal Theme state
  const [currentThemeId, setCurrentThemeId] = useState(
    () => localStorage.getItem('duocore_terminal_theme') || 'matrix'
  );
  const activeTheme = TERMINAL_THEMES[currentThemeId] || TERMINAL_THEMES.matrix;

  // Virtual Terminal State
  const [cwd, setCwd] = useState('/home/student');
  const [inputCmd, setInputCmd] = useState('');
  const [terminalHistory, setTerminalHistory] = useState([
    { type: 'system', text: 'DUOCORE POSIX Terminal Environment v2.4 initialized.' },
    { type: 'system', text: 'Type "help" or click any guided command on the left to start.' }
  ]);
  const terminalEndRef = useRef(null);

  useEffect(() => {
    async function loadProgress() {
      try {
        const res = await api.getLinuxProgress();
        const done = res.progress?.filter(p => p.lab_done).map(p => p.level_num) || [];
        setCompletedLevels(done);
      } catch (err) {}
    }
    loadProgress();
  }, []);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [terminalHistory]);

  const activeLevel = LINUX_ROADMAP_LEVELS[selectedLevelIdx] || LINUX_ROADMAP_LEVELS[0];

  const handleThemeChange = (themeId) => {
    setCurrentThemeId(themeId);
    localStorage.setItem('duocore_terminal_theme', themeId);
    playSound('click');
  };

  const executeCommand = async (cmdToRun) => {
    const rawCmd = cmdToRun || inputCmd;
    if (!rawCmd.trim()) return;

    const clean = rawCmd.trim();
    setInputCmd('');

    setTerminalHistory(prev => [
      ...prev,
      { type: 'input', text: `student@duocore:${cwd}$ ${clean}` }
    ]);

    try {
      const res = await api.execLinuxCommand(clean, cwd);
      if (res.cwd) setCwd(res.cwd);

      setTerminalHistory(prev => [
        ...prev,
        { type: res.isError ? 'error' : 'output', text: res.output }
      ]);

      if (res.isError) {
        playSound('quiz_wrong');
      } else {
        playSound('click');
      }

      // Check if command satisfies active roadmap level
      if (activeLevel.targetCommands.some(tc => clean.includes(tc.split(' ')[0])) || clean === activeLevel.targetCommands[0]) {
        if (!completedLevels.includes(activeLevel.levelNum)) {
          setCompletedLevels(prev => [...prev, activeLevel.levelNum]);
          playSound('quiz_correct');
          fireConfetti();
          api.updateLinuxProgress({
            levelNum: activeLevel.levelNum,
            labDone: 1,
            mastery: 100
          }).catch(() => {});
        }
      }
    } catch (err) {
      setTerminalHistory(prev => [
        ...prev,
        { type: 'error', text: `bash: ${clean}: command error: ${err.message}` }
      ]);
      playSound('quiz_wrong');
    }
  };

  const handleResetTerminal = () => {
    setCwd('/home/student');
    setTerminalHistory([
      { type: 'system', text: 'Terminal reset. Environment ready.' }
    ]);
    playSound('click');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header Banner */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-emerald-500/30 shadow-2xl bg-gradient-to-r from-slate-950 via-teal-950/40 to-slate-900">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-black border border-emerald-500/30">
                <Terminal className="w-3.5 h-3.5" />
                <span>16-Level Linux Operating & Security Lab</span>
              </div>

              {/* Hacker Rank Title Badge */}
              <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold ${rank.badgeColor}`}>
                <span>{rank.icon}</span>
                <span>{rank.title} (Lv.{user?.level || 1})</span>
              </div>
            </div>

            <h1 className="text-2xl sm:text-4xl font-black text-white">
              Linux Command Center & Terminal Lab 🐧
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
              Master the Linux operating system with hands-on command execution, security permissions, file auditing, processes, and network sockets.
            </p>
          </div>

          <div className="px-4 py-2.5 rounded-2xl bg-slate-900/90 border border-emerald-500/40 flex items-center gap-3">
            <Award className="w-7 h-7 text-emerald-400" />
            <div>
              <span className="text-[10px] text-slate-400 font-semibold block uppercase tracking-wider">Linux Progress</span>
              <span className="text-xs font-black text-emerald-300">
                {completedLevels.length} / 16 Levels Completed
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Mode Switcher & Theme Selector */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setActiveViewTab('roadmap'); playSound('click'); }}
            className={`px-4 py-2 rounded-2xl text-xs font-black transition-all flex items-center gap-1.5 ${
              activeViewTab === 'roadmap'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-600/30'
                : 'bg-slate-900 text-slate-400 hover:text-white'
            }`}
          >
            <span>🌟 16-Level Linux Journey</span>
          </button>
          <button
            onClick={() => { setActiveViewTab('encyclopedia'); playSound('click'); }}
            className={`px-4 py-2 rounded-2xl text-xs font-black transition-all flex items-center gap-1.5 ${
              activeViewTab === 'encyclopedia'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-600/30'
                : 'bg-slate-900 text-slate-400 hover:text-white'
            }`}
          >
            <span>📚 Command Encyclopedia</span>
          </button>
        </div>

        {/* Terminal Controls: Theme Switcher & Reset */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800 text-xs">
            <Palette className="w-3.5 h-3.5 text-pink-400 ml-1.5" />
            <select
              value={currentThemeId}
              onChange={(e) => handleThemeChange(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-200 focus:outline-none pr-2 cursor-pointer"
            >
              {Object.values(TERMINAL_THEMES).map((t) => (
                <option key={t.id} value={t.id} className="bg-slate-950 text-white">
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleResetTerminal}
            className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white text-xs font-bold flex items-center gap-1"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>↻ Reset Shell</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Workspace + Virtual Terminal */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Level Content / Guided Task (6 cols) */}
        <div className="lg:col-span-6 space-y-6">
          {activeViewTab === 'roadmap' ? (
            <div className="glass-card p-6 rounded-3xl border border-slate-800 space-y-6">
              <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
                {LINUX_ROADMAP_LEVELS.map((lvl, idx) => {
                  const isSelected = selectedLevelIdx === idx;
                  const isCompleted = completedLevels.includes(lvl.levelNum);

                  return (
                    <button
                      key={lvl.id}
                      onClick={() => {
                        setSelectedLevelIdx(idx);
                        setActiveHintIdx(-1);
                        playSound('click');
                      }}
                      className={`px-3 py-2 rounded-xl border text-[11px] font-black shrink-0 transition-all ${
                        isSelected
                          ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-emerald-400 shadow-md scale-105'
                          : isCompleted
                          ? 'bg-slate-900 border-emerald-500/50 text-emerald-300'
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <span>{isCompleted ? '✓' : 'L' + lvl.levelNum}</span>
                    </button>
                  );
                })}
              </div>

              <div className="pb-4 border-b border-slate-800 flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase block mb-1">
                    Level {activeLevel.levelNum} of 16
                  </span>
                  <h3 className="text-lg font-black text-white">{activeLevel.title}</h3>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-mono font-bold border border-emerald-500/30">
                  {activeLevel.badge}
                </span>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-black text-slate-300 uppercase tracking-wider">
                  📖 How It Works
                </h4>
                <p className="text-xs text-slate-200 leading-relaxed font-sans">
                  {activeLevel.explanation}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/40 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-emerald-300 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    <span>🎯 Guided Task:</span>
                  </h4>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 text-emerald-400">
                    +{activeLevel.xpReward} XP
                  </span>
                </div>
                <p className="text-xs text-white font-bold">{activeLevel.guidedTask}</p>

                <div className="pt-2">
                  <span className="text-[10px] text-slate-400 font-bold block mb-1">Target Command (Click to Run):</span>
                  <div className="flex flex-wrap gap-2">
                    {activeLevel.targetCommands.map((tc, tcIdx) => (
                      <button
                        key={tcIdx}
                        onClick={() => executeCommand(tc)}
                        className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-emerald-900/60 border border-emerald-500/40 text-xs font-mono text-emerald-300 transition-all flex items-center gap-1.5 shadow-sm"
                      >
                        <Play className="w-3 h-3 text-emerald-400" />
                        <span>{tc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-emerald-500/20 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-400">Need a hint?</span>
                    {[0, 1, 2].map(hIdx => (
                      <button
                        key={hIdx}
                        onClick={() => { setActiveHintIdx(hIdx); playSound('click'); }}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                          activeHintIdx >= hIdx
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        Hint {hIdx + 1}
                      </button>
                    ))}
                  </div>
                  {activeHintIdx >= 0 && (
                    <div className="p-2.5 rounded-xl bg-amber-950/40 border border-amber-500/40 text-amber-300 text-xs animate-in fade-in">
                      {activeLevel.hints ? activeLevel.hints[activeHintIdx] : 'Check the syntax.'}
                    </div>
                  )}
                </div>
              </div>

              {onChallengeFriend && (
                <button
                  onClick={() => onChallengeFriend(activeLevel.id, activeLevel.title)}
                  className="w-full py-2.5 px-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-amber-500/40 text-amber-300 text-xs font-bold flex items-center justify-center gap-2 transition-all"
                >
                  <Swords className="w-4 h-4" />
                  <span>⚔️ Challenge Squad on Level {activeLevel.levelNum}</span>
                </button>
              )}
            </div>
          ) : (
            <div className="glass-card p-6 rounded-3xl border border-slate-800 space-y-4">
              <div className="flex flex-wrap gap-2 pb-2 border-b border-slate-800">
                {COMMAND_CATEGORIES.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      selectedCategory === cat.id
                        ? 'bg-emerald-600 text-white shadow-md'
                        : 'bg-slate-900 text-slate-400 hover:text-white'
                    }`}
                  >
                    {cat.title}
                  </button>
                ))}
              </div>

              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {COMMAND_CATEGORIES.find(c => c.id === selectedCategory)?.commands.map((cmdItem, cIdx) => (
                  <div
                    key={cIdx}
                    onClick={() => executeCommand(cmdItem.cmd)}
                    className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-emerald-500/50 cursor-pointer transition-all space-y-1.5 group"
                  >
                    <div className="flex items-center justify-between">
                      <code className="text-xs font-mono font-bold text-emerald-300 group-hover:text-emerald-200">
                        {cmdItem.cmd}
                      </code>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                        ▶ 1-Click Run
                      </span>
                    </div>
                    <p className="text-xs text-slate-300">{cmdItem.desc}</p>
                    <div className="text-[10px] text-slate-500 font-mono">
                      Syntax: {cmdItem.syntax}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Dynamic Themed Virtual Terminal (6 cols) */}
        <div className="lg:col-span-6 space-y-4">
          <div className={`glass-card rounded-3xl ${activeTheme.border} ${activeTheme.glow} overflow-hidden shadow-2xl flex flex-col h-[600px] ${activeTheme.bg} transition-all`}>
            <div className="px-4 py-3 bg-slate-950/90 border-b border-slate-800/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                <span className={`text-xs font-mono font-bold ${activeTheme.prompt} ml-2`}>
                  student@duocore:{cwd}$
                </span>
              </div>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded bg-slate-900 ${activeTheme.text} font-bold border border-slate-800`}>
                {activeTheme.name}
              </span>
            </div>

            <div className={`flex-1 overflow-y-auto p-4 font-mono text-xs space-y-2 ${activeTheme.bg} transition-colors`}>
              {terminalHistory.map((item, idx) => {
                if (item.type === 'system') {
                  return <div key={idx} className={`${activeTheme.text} whitespace-pre-wrap opacity-90`}>{item.text}</div>;
                }
                if (item.type === 'input') {
                  return <div key={idx} className={`${activeTheme.prompt} font-bold whitespace-pre-wrap`}>{item.text}</div>;
                }
                if (item.type === 'error') {
                  return <div key={idx} className="text-red-400 whitespace-pre-wrap">{item.text}</div>;
                }
                return <div key={idx} className={`${activeTheme.text} whitespace-pre-wrap`}>{item.text}</div>;
              })}
              <div ref={terminalEndRef} />
            </div>

            <form onSubmit={(e) => { e.preventDefault(); executeCommand(); }} className="p-3 border-t border-slate-800 bg-slate-950/90 flex items-center gap-2">
              <span className={`${activeTheme.prompt} font-mono text-xs font-bold pl-2`}>$</span>
              <input
                type="text"
                placeholder="Type Linux command (e.g. ls -la, pwd, chmod 755, ss -tulpn)..."
                value={inputCmd}
                onChange={(e) => setInputCmd(e.target.value)}
                className={`flex-1 bg-transparent text-xs font-mono ${activeTheme.input} focus:outline-none`}
                autoFocus
              />
              <button
                type="submit"
                disabled={!inputCmd.trim()}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md shadow-emerald-600/30 transition-all disabled:opacity-40"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
