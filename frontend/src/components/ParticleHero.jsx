import React, { useEffect, useRef } from 'react';

export function ParticleHero() {
  const canvasRef = useRef(null);
  const mouseRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    const handleMouseMove = (e) => {
      mouseRef.current.targetX = (e.clientX - width / 2) * 0.0015;
      mouseRef.current.targetY = (e.clientY - height / 2) * 0.0015;
    };
    window.addEventListener('mousemove', handleMouseMove);

    // 3D Particles
    const particles = [];
    const particleCount = 80;
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: (Math.random() - 0.5) * 800,
        y: (Math.random() - 0.5) * 800,
        z: Math.random() * 800 - 400,
        radius: Math.random() * 2 + 1,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        vz: (Math.random() - 0.5) * 0.4,
        color: i % 2 === 0 ? 'rgba(236, 72, 153, ' : 'rgba(99, 102, 241, '
      });
    }

    let angleX = 0;
    let angleY = 0;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.05;
      mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.05;

      angleY += 0.004 + mouseRef.current.x * 0.05;
      angleX += 0.002 + mouseRef.current.y * 0.05;

      const fov = 450;
      const projected = [];

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.z += p.vz;

        if (p.x < -400) p.x = 400;
        if (p.x > 400) p.x = -400;
        if (p.y < -400) p.y = 400;
        if (p.y > 400) p.y = -400;
        if (p.z < -400) p.z = 400;
        if (p.z > 400) p.z = -400;

        // 3D Rotation Math
        let x1 = p.x * Math.cos(angleY) + p.z * Math.sin(angleY);
        let z1 = -p.x * Math.sin(angleY) + p.z * Math.cos(angleY);
        let y1 = p.y * Math.cos(angleX) - z1 * Math.sin(angleX);
        let z2 = p.y * Math.sin(angleX) + z1 * Math.cos(angleX);

        const depth = z2 + 600;
        if (depth > 50) {
          const scale = fov / depth;
          const projX = x1 * scale + width / 2;
          const projY = y1 * scale + height / 2;
          const alpha = Math.min(1, Math.max(0.1, (depth - 50) / 700));

          projected.push({ x: projX, y: projY, alpha, color: p.color, radius: p.radius * scale });

          ctx.beginPath();
          ctx.arc(projX, projY, Math.max(1, p.radius * scale), 0, Math.PI * 2);
          ctx.fillStyle = `${p.color}${alpha})`;
          ctx.fill();
        }
      }

      // Interconnecting cyber vectors
      for (let i = 0; i < projected.length; i++) {
        for (let j = i + 1; j < projected.length; j++) {
          const dx = projected[i].x - projected[j].x;
          const dy = projected[i].y - projected[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 100) {
            ctx.beginPath();
            ctx.moveTo(projected[i].x, projected[i].y);
            ctx.lineTo(projected[j].x, projected[j].y);
            ctx.strokeStyle = `rgba(236, 72, 153, ${(1 - dist / 100) * 0.25})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none z-0" />;
}
