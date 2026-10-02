/** Two elliptical tracks behind the existing publication year, without layout space. */
export function YearOrbit(): React.JSX.Element {
  return (
    <span aria-hidden="true" className="public-results-year-orbits">
      <span className="public-results-orbit public-results-orbit-one">
        <span className="public-results-orbit-dot" />
      </span>
      <span className="public-results-orbit public-results-orbit-two">
        <span className="public-results-orbit-dot" />
      </span>
    </span>
  );
}
