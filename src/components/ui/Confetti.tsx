'use client';

/**
 * Lightweight CSS-only confetti burst for win/celebration moments.
 * Deterministic per index (no Math.random) so it is SSR-safe.
 * Automatically disabled by the global prefers-reduced-motion guard.
 */

const COLORS = ['#818cf8', '#eec224', '#34d399', '#f87171', '#22d3ee'];

interface ConfettiProps {
  count?: number;
}

export default function Confetti({ count = 42 }: ConfettiProps) {
  return (
    <div className="confetti" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => {
        const left = (i * 37 + 11) % 100;
        const delay = (i % 12) * 0.08;
        const duration = 1.5 + ((i * 13) % 10) * 0.14;
        const color = COLORS[i % COLORS.length];
        const width = 5 + ((i * 7) % 6);
        const height = 8 + ((i * 5) % 8);
        const drift = ((i * 29) % 60) - 30;
        return (
          <span
            key={i}
            className="confetti-piece"
            style={{
              left: `${left}%`,
              animationDelay: `${delay}s`,
              animationDuration: `${duration}s`,
              background: color,
              width,
              height,
              '--drift': `${drift}px`,
            } as React.CSSProperties}
          />
        );
      })}

      <style jsx>{`
        .confetti {
          position: absolute;
          inset: 0;
          overflow: hidden;
          pointer-events: none;
          z-index: 20;
        }

        .confetti-piece {
          position: absolute;
          top: -14px;
          border-radius: 2px;
          opacity: 0.95;
          animation-name: confetti-fall;
          animation-timing-function: cubic-bezier(0.3, 0.4, 0.6, 1);
          animation-fill-mode: forwards;
          will-change: transform, opacity;
        }

        @keyframes confetti-fall {
          0% {
            transform: translate3d(0, 0, 0) rotate(0deg);
            opacity: 1;
          }

          70% {
            opacity: 1;
          }

          100% {
            transform: translate3d(var(--drift, 0px), 340px, 0) rotate(560deg);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
