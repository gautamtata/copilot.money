"use client";

// Placeholder-grade area sparkline; the M8 design pass replaces this.
export function Sparkline({
  values,
  height = 48,
  stroke = "#175a43",
}: {
  values: number[];
  height?: number;
  stroke?: string;
}) {
  if (values.length < 2) {
    return (
      <div className="flex items-center text-xs text-ink-3" style={{ height }}>
        History builds up daily from here.
      </div>
    );
  }
  const width = 300;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const points = values.map((v, i) => {
    const x = (i / (values.length - 1)) * width;
    const y = height - 4 - ((v - min) / range) * (height - 8);
    return `${x},${y}`;
  });
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full"
      style={{ height }}
      preserveAspectRatio="none"
    >
      <polyline
        points={points.join(" ")}
        fill="none"
        stroke={stroke}
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <polygon
        points={`0,${height} ${points.join(" ")} ${width},${height}`}
        fill={stroke}
        opacity="0.08"
      />
    </svg>
  );
}
