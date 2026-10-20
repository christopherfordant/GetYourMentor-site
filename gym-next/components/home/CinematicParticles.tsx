"use client";

import { useEffect, useRef } from "react";

type Particle = {
  x: number;
  y: number;
  z: number;
  size: number;
  speed: number;
  phase: number;
};

export function CinematicParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const particles: Particle[] = [];
    let frame = 0;
    let width = 0;
    let height = 0;
    let pointerX = 0;
    let pointerY = 0;

    const resize = () => {
      const ratio = Math.min(window.devicePixelRatio || 1, 1.75);
      const bounds = canvas.getBoundingClientRect();
      width = bounds.width;
      height = bounds.height;
      canvas.width = Math.max(1, Math.floor(width * ratio));
      canvas.height = Math.max(1, Math.floor(height * ratio));
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    const seedParticles = () => {
      particles.length = 0;
      const count = width < 700 ? 24 : 58;
      for (let index = 0; index < count; index += 1) {
        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          z: 0.35 + Math.random() * 0.65,
          size: 0.6 + Math.random() * 2.2,
          speed: 0.08 + Math.random() * 0.2,
          phase: Math.random() * Math.PI * 2,
        });
      }
    };

    const onPointerMove = (event: PointerEvent) => {
      pointerX = (event.clientX / Math.max(window.innerWidth, 1) - 0.5) * 2;
      pointerY = (event.clientY / Math.max(window.innerHeight, 1) - 0.5) * 2;
    };

    const draw = (time: number) => {
      context.clearRect(0, 0, width, height);
      const elapsed = time * 0.001;
      const drift = reducedMotion.matches ? 0 : elapsed;
      const points = particles.map((particle) => ({
        x: particle.x + pointerX * particle.z * 13,
        y: particle.y + pointerY * particle.z * 8 + Math.sin(drift * particle.speed + particle.phase) * 8,
        radius: particle.size * particle.z,
      }));

      points.forEach((point, index) => {
        const particle = particles[index];
        const pulse = 0.45 + (Math.sin(drift * 1.4 + particle.phase) + 1) * 0.22;
        context.beginPath();
        context.fillStyle = `rgba(215, 243, 107, ${pulse * particle.z})`;
        context.shadowColor = "rgba(215, 243, 107, .55)";
        context.shadowBlur = point.radius * 5;
        context.arc(point.x, point.y, point.radius, 0, Math.PI * 2);
        context.fill();
        context.shadowBlur = 0;

        for (let nextIndex = index + 1; nextIndex < points.length; nextIndex += 1) {
          const next = points[nextIndex];
          const distance = Math.hypot(point.x - next.x, point.y - next.y);
          if (distance > 120) continue;
          context.beginPath();
          context.strokeStyle = `rgba(145, 184, 255, ${0.08 * (1 - distance / 120)})`;
          context.lineWidth = 0.7;
          context.moveTo(point.x, point.y);
          context.lineTo(next.x, next.y);
          context.stroke();
        }
      });

      if (!reducedMotion.matches) frame = window.requestAnimationFrame(draw);
    };

    resize();
    seedParticles();
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onPointerMove, { passive: true });

    if (reducedMotion.matches) {
      draw(0);
    } else {
      frame = window.requestAnimationFrame(draw);
    }

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointerMove);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  return <canvas ref={canvasRef} className="cinematic-particles" aria-hidden="true" />;
}
