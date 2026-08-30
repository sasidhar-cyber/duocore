import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';

export function triggerScreenEffect(effectType) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('duocore:screen_effect', { detail: { effectType } }));
  }
}

export function detectMessageEffect(text) {
  if (!text) return null;
  const lower = text.toLowerCase().trim();

  // Love / Romance / Hearts
  if (
    lower.includes('❤️') ||
    lower.includes('💖') ||
    lower.includes('💕') ||
    lower.includes('love') ||
    lower.includes('prema') ||
    lower.includes('pyaar') ||
    lower.includes('ily') ||
    lower.includes('kiss') ||
    lower.includes('heart')
  ) {
    return 'love';
  }

  // Celebration / Party / Congrats
  if (
    lower.includes('🎉') ||
    lower.includes('🥳') ||
    lower.includes('congrats') ||
    lower.includes('congratulations') ||
    lower.includes('party') ||
    lower.includes('happy birthday') ||
    lower.includes('yay') ||
    lower.includes('hurray')
  ) {
    return 'confetti';
  }

  // Fire / Streaks / Hype
  if (
    lower.includes('🔥') ||
    lower.includes('fire') ||
    lower.includes('lit') ||
    lower.includes('hype') ||
    lower.includes('streak') ||
    lower.includes('insane')
  ) {
    return 'fire';
  }

  // Matrix / Hacker / Cyber
  if (
    lower.includes('⚡') ||
    lower.includes('matrix') ||
    lower.includes('hack') ||
    lower.includes('cyber') ||
    lower.includes('root') ||
    lower.includes('terminal')
  ) {
    return 'matrix';
  }

  // Rocket / Launch / Level Up
  if (
    lower.includes('🚀') ||
    lower.includes('rocket') ||
    lower.includes('launch') ||
    lower.includes('lets go') ||
    lower.includes('levelup') ||
    lower.includes('level up')
  ) {
    return 'rocket';
  }

  // 100 / Perfect / GG
  if (
    lower.includes('💯') ||
    lower.includes('100') ||
    lower.includes('gg') ||
    lower.includes('pro') ||
    lower.includes('winner')
  ) {
    return 'hundred';
  }

  return null;
}

export function ScreenEffectsOverlay() {
  const [activeEffect, setActiveEffect] = useState(null);
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    const handleEffect = (event) => {
      const effect = event.detail?.effectType;
      if (!effect) return;

      setActiveEffect(effect);

      if (effect === 'confetti') {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
        setTimeout(() => {
          confetti({
            particleCount: 50,
            angle: 60,
            spread: 55,
            origin: { x: 0 }
          });
          confetti({
            particleCount: 50,
            angle: 120,
            spread: 55,
            origin: { x: 1 }
          });
        }, 250);
      } else if (effect === 'love') {
        // Spawn 25 floating hearts with randomized sizes and trajectories
        const hearts = Array.from({ length: 24 }).map((_, i) => ({
          id: i,
          x: Math.random() * 85 + 5,
          delay: Math.random() * 1.2,
          size: Math.random() * 28 + 22,
          emoji: ['❤️', '💖', '💕', '💗', '🥰', '✨'][Math.floor(Math.random() * 6)]
        }));
        setParticles(hearts);
      } else if (effect === 'fire') {
        // Spawn rising fire flames
        const flames = Array.from({ length: 24 }).map((_, i) => ({
          id: i,
          x: Math.random() * 85 + 5,
          delay: Math.random() * 0.8,
          size: Math.random() * 26 + 24,
          emoji: ['🔥', '⚡', '💥', '✨'][Math.floor(Math.random() * 4)]
        }));
        setParticles(flames);
      } else if (effect === 'matrix') {
        // Spawn green binary code stream
        const codes = Array.from({ length: 20 }).map((_, i) => ({
          id: i,
          x: Math.random() * 90 + 5,
          delay: Math.random() * 0.7,
          text: ['01101', '0x7F', 'ROOT', 'SSH', 'ACK', '1337', 'EXEC', 'PING'][Math.floor(Math.random() * 8)]
        }));
        setParticles(codes);
      } else if (effect === 'rocket') {
        const items = Array.from({ length: 8 }).map((_, i) => ({
          id: i,
          x: Math.random() * 70 + 15,
          delay: Math.random() * 0.6,
          size: 36,
          emoji: '🚀'
        }));
        setParticles(items);
      } else if (effect === 'hundred') {
        const items = Array.from({ length: 20 }).map((_, i) => ({
          id: i,
          x: Math.random() * 85 + 5,
          delay: Math.random() * 0.8,
          size: 28,
          emoji: ['💯', '🏆', '⭐', '👑'][Math.floor(Math.random() * 4)]
        }));
        setParticles(items);
      }

      // Auto dismiss after 3.2 seconds
      setTimeout(() => {
        setActiveEffect(null);
        setParticles([]);
      }, 3200);
    };

    window.addEventListener('duocore:screen_effect', handleEffect);
    return () => window.removeEventListener('duocore:screen_effect', handleEffect);
  }, []);

  if (!activeEffect) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden select-none">
      {/* LOVE HEARTS EFFECT */}
      {activeEffect === 'love' && (
        <div className="relative w-full h-full">
          {particles.map((p) => (
            <div
              key={p.id}
              className="absolute bottom-0 animate-bounce"
              style={{
                left: `${p.x}%`,
                fontSize: `${p.size}px`,
                animation: `floatUpLove 2.8s cubic-bezier(0.2, 0.8, 0.2, 1) forwards`,
                animationDelay: `${p.delay}s`
              }}
            >
              {p.emoji}
            </div>
          ))}
          {/* Big Center Heart Burst */}
          <div className="absolute inset-0 flex items-center justify-center animate-in zoom-in-50 duration-500">
            <div className="text-7xl sm:text-9xl animate-pulse filter drop-shadow-[0_0_35px_rgba(236,72,153,0.8)]">
              💖
            </div>
          </div>
        </div>
      )}

      {/* FIRE BLAST EFFECT */}
      {activeEffect === 'fire' && (
        <div className="relative w-full h-full">
          {particles.map((p) => (
            <div
              key={p.id}
              className="absolute bottom-0"
              style={{
                left: `${p.x}%`,
                fontSize: `${p.size}px`,
                animation: `floatUpFire 2.2s ease-out forwards`,
                animationDelay: `${p.delay}s`
              }}
            >
              {p.emoji}
            </div>
          ))}
          <div className="absolute inset-0 flex items-center justify-center animate-in zoom-in-75 duration-300">
            <div className="text-7xl sm:text-9xl filter drop-shadow-[0_0_40px_rgba(249,115,22,0.9)] animate-bounce">
              🔥
            </div>
          </div>
        </div>
      )}

      {/* MATRIX CYBER EFFECT */}
      {activeEffect === 'matrix' && (
        <div className="relative w-full h-full bg-emerald-950/10 backdrop-blur-[1px]">
          {particles.map((p) => (
            <div
              key={p.id}
              className="absolute top-0 text-emerald-400 font-mono font-black text-sm tracking-widest filter drop-shadow-[0_0_8px_#10b981]"
              style={{
                left: `${p.x}%`,
                animation: `matrixRain 2.4s linear forwards`,
                animationDelay: `${p.delay}s`
              }}
            >
              {p.text}
            </div>
          ))}
          <div className="absolute inset-0 flex items-center justify-center animate-in fade-in duration-300">
            <div className="text-5xl sm:text-7xl font-mono font-black text-emerald-400 border border-emerald-500/60 px-6 py-3 rounded-2xl bg-black/80 shadow-[0_0_50px_rgba(16,185,129,0.5)]">
              ⚡ ACCESS GRANTED
            </div>
          </div>
        </div>
      )}

      {/* ROCKET LAUNCH EFFECT */}
      {activeEffect === 'rocket' && (
        <div className="relative w-full h-full">
          {particles.map((p) => (
            <div
              key={p.id}
              className="absolute bottom-0"
              style={{
                left: `${p.x}%`,
                fontSize: `${p.size}px`,
                animation: `rocketAscent 2.2s cubic-bezier(0.1, 0.9, 0.2, 1) forwards`,
                animationDelay: `${p.delay}s`
              }}
            >
              {p.emoji}
            </div>
          ))}
        </div>
      )}

      {/* 100 / WINNER EFFECT */}
      {activeEffect === 'hundred' && (
        <div className="relative w-full h-full">
          {particles.map((p) => (
            <div
              key={p.id}
              className="absolute bottom-0"
              style={{
                left: `${p.x}%`,
                fontSize: `${p.size}px`,
                animation: `floatUpLove 2.4s ease-out forwards`,
                animationDelay: `${p.delay}s`
              }}
            >
              {p.emoji}
            </div>
          ))}
          <div className="absolute inset-0 flex items-center justify-center animate-in zoom-in duration-300">
            <div className="text-7xl sm:text-9xl filter drop-shadow-[0_0_30px_rgba(234,179,8,0.8)]">
              💯
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes floatUpLove {
          0% { transform: translateY(0) scale(0.6) rotate(0deg); opacity: 0; }
          15% { opacity: 1; }
          80% { opacity: 0.9; }
          100% { transform: translateY(-85vh) scale(1.3) rotate(25deg); opacity: 0; }
        }
        @keyframes floatUpFire {
          0% { transform: translateY(0) scale(0.5); opacity: 0; }
          20% { opacity: 1; }
          100% { transform: translateY(-80vh) scale(1.4); opacity: 0; }
        }
        @keyframes matrixRain {
          0% { transform: translateY(-50px); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(90vh); opacity: 0; }
        }
        @keyframes rocketAscent {
          0% { transform: translateY(0) scale(0.7); opacity: 0; }
          10% { opacity: 1; }
          100% { transform: translateY(-100vh) scale(1.6); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
