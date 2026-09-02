let audioCtx = null;

function getAudioContext() {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) audioCtx = new AudioContext();
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function playSound(type = 'click') {
  try {
    if (type === 'message') {
      const msgAllowed = localStorage.getItem('duocore_notif_messages') !== 'false';
      if (!msgAllowed) return;
    } else if (type === 'call') {
      const callsAllowed = localStorage.getItem('duocore_notif_calls') !== 'false';
      if (!callsAllowed) return;
    } else {
      const soundEnabled = localStorage.getItem('duocore_sound_enabled') !== 'false';
      if (!soundEnabled) return;
    }

    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    switch (type) {
      case 'click':
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(400, now + 0.05);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.05);
        osc.start(now);
        osc.stop(now + 0.05);
        break;

      case 'quiz_correct':
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.setValueAtTime(659.25, now + 0.08);
        osc.frequency.setValueAtTime(783.99, now + 0.16);
        osc.frequency.setValueAtTime(1046.50, now + 0.24);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.4);
        osc.start(now);
        osc.stop(now + 0.4);
        break;

      case 'quiz_wrong':
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.setValueAtTime(196, now + 0.1);
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.25);
        break;

      case 'message':
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(900, now + 0.1);
        gain.gain.setValueAtTime(0.06, now);
        gain.gain.linearRampToValueAtTime(0.01, now + 0.12);
        osc.start(now);
        osc.stop(now + 0.12);
        break;

      default:
        break;
    }
  } catch (err) {}
}

let ringtoneInterval = null;
let currentRingtoneOscillators = [];

export function startRingtone() {
  stopRingtone();

  // Respect Calls notification setting
  const callsAllowed = localStorage.getItem('duocore_notif_calls') !== 'false';
  if (!callsAllowed) return () => {};

  const ctx = getAudioContext();
  if (!ctx) return () => {};

  const playBurst = () => {
    try {
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      const now = ctx.currentTime;

      // Classic harmonic dual-tone ring cadence (440Hz + 480Hz)
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'sine';
      osc1.frequency.setValueAtTime(440, now);
      osc2.frequency.setValueAtTime(480, now);

      gain.gain.setValueAtTime(0, now);
      // Ring burst 1 (0 to 0.8s)
      gain.gain.linearRampToValueAtTime(0.16, now + 0.05);
      gain.gain.setValueAtTime(0.16, now + 0.75);
      gain.gain.linearRampToValueAtTime(0, now + 0.8);
      // Ring burst 2 (1.0 to 1.8s)
      gain.gain.linearRampToValueAtTime(0.16, now + 1.05);
      gain.gain.setValueAtTime(0.16, now + 1.75);
      gain.gain.linearRampToValueAtTime(0, now + 1.8);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 1.85);
      osc2.stop(now + 1.85);

      currentRingtoneOscillators.push(osc1, osc2);
    } catch (e) {}
  };

  playBurst();
  ringtoneInterval = setInterval(playBurst, 3500);

  return stopRingtone;
}

export function stopRingtone() {
  if (ringtoneInterval) {
    clearInterval(ringtoneInterval);
    ringtoneInterval = null;
  }
  currentRingtoneOscillators.forEach((osc) => {
    try {
      osc.stop();
      osc.disconnect();
    } catch (e) {}
  });
  currentRingtoneOscillators = [];
}
