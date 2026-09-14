"use client";

import { useEffect, useRef } from "react";

export function tvDuration(page: number, text: string) {
  if (page === 1) return 20_000;
  if (page >= 18 && page <= 22) return 26_000;
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(8_000, Math.min(40_000, 5_000 + words * 300));
}

export function TvProgress({
  current,
  slideNumber,
  total,
  duration,
  paused,
  onAdvance,
  onTogglePause,
}: {
  current: number;
  slideNumber: number;
  total: number;
  duration: number;
  paused: boolean;
  onAdvance: () => void;
  onTogglePause: () => void;
}) {
  const progress = useRef<HTMLSpanElement>(null);
  const elapsed = useRef(0);

  useEffect(() => {
    elapsed.current = 0;
    if (progress.current) progress.current.style.transform = "scaleX(0)";
  }, [current]);

  useEffect(() => {
    if (paused) return;
    let frame = 0;
    let previous = performance.now();
    const art = document.querySelector<HTMLImageElement>(
      `#slide-${slideNumber} .original-slide`,
    );
    const tick = (now: number) => {
      const delta = Math.min(now - previous, 100);
      previous = now;
      // Hidden tabs and still-loading artwork never consume viewing time.
      // A failed image completes as well, so one bad asset cannot stop a TV loop.
      if (!document.hidden && art?.complete) {
        elapsed.current += delta;
        if (progress.current)
          progress.current.style.transform = `scaleX(${Math.min(elapsed.current / duration, 1)})`;
        if (elapsed.current >= duration) {
          onAdvance();
          return;
        }
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [current, slideNumber, duration, paused, onAdvance]);

  return (
    <div className="tv-progress" data-paused={paused}>
      <button
        className="tv-progress-control"
        onClick={onTogglePause}
        aria-label={`${paused ? "Continuar" : "Pausar"} modo TV. Página ${current + 1} de ${total}`}
        aria-pressed={paused}
      >
        {Array.from({ length: total }, (_, index) => (
          <span className="tv-progress-track" key={index} aria-hidden="true">
            <span
              key={`${current}-${index}`}
              ref={index === current ? progress : undefined}
              style={{ transform: `scaleX(${index < current ? 1 : 0})` }}
            />
          </span>
        ))}
      </button>
    </div>
  );
}
