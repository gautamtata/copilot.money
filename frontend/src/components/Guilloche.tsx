/* The signature element: a parametric guilloche rosette — the engraved
   security pattern on banknotes. Deterministic SVG, no dependencies. */

function rosettePath(
  cx: number,
  cy: number,
  R: number,
  r: number,
  amp: number,
  lobes: number,
  phase: number,
): string {
  const steps = 240;
  const pts: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI * 2;
    const radius = R + r * Math.sin(lobes * t + phase) + amp * Math.cos(3 * t);
    const x = cx + radius * Math.cos(t);
    const y = cy + radius * Math.sin(t);
    pts.push(`${x.toFixed(2)},${y.toFixed(2)}`);
  }
  return `M${pts.join("L")}Z`;
}

export function Guilloche({
  size = 420,
  rings = 14,
  className = "",
  opacity = 0.16,
}: {
  size?: number;
  rings?: number;
  className?: string;
  opacity?: number;
}) {
  const c = size / 2;
  const paths = Array.from({ length: rings }, (_, i) => {
    const f = i / rings;
    return rosettePath(
      c,
      c,
      size * (0.16 + f * 0.3),
      size * 0.035 * (1 - f * 0.5),
      size * 0.018,
      9 + (i % 3),
      f * Math.PI,
    );
  });
  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className={className}
      aria-hidden
      style={{ opacity }}
    >
      {paths.map((d, i) => (
        <path key={i} d={d} fill="none" stroke="currentColor" strokeWidth="0.75" />
      ))}
    </svg>
  );
}
