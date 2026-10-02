import { FloatingParticles } from './floating-particles';

/** CSS-only decoration; remains server-rendered and outside the interaction layer. */
export function AnimatedBackground(): React.JSX.Element {
  return (
    <div aria-hidden="true" className="public-results-animation">
      <div className="public-results-gradient" />
      <div className="public-results-grid" />
      <FloatingParticles />
    </div>
  );
}
