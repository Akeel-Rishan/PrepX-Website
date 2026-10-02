import type { CSSProperties } from 'react';

/** Fixed arithmetic produces identical markup on every server/client render. */
const particles = Array.from({ length: 24 }, (_, index) => ({
  left: `${(index * 37 + 7) % 100}%`,
  top: `${(index * 23 + 11) % 100}%`,
  size: `${1 + (index % 3)}px`,
  duration: `${24 + ((index * 7) % 19)}s`,
  delay: `${-((index * 11) % 43)}s`,
  drift: `${((index * 13) % 49) - 24}px`,
}));

export function FloatingParticles(): React.JSX.Element {
  return (
    <div aria-hidden="true" className="public-results-particles">
      {particles.map((particle, index) => (
        <span
          key={index}
          className="public-results-particle"
          style={{
            left: particle.left,
            top: particle.top,
            width: particle.size,
            height: particle.size,
            animationDuration: particle.duration,
            animationDelay: particle.delay,
            '--particle-drift': particle.drift,
          } as CSSProperties}
        />
      ))}
    </div>
  );
}
