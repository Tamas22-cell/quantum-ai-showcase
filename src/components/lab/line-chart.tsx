/**
 * Multi-series convergence chart (SVG). X axis is log10 of evaluation count because
 * algorithms spend very different numbers of evaluations; Y axis is approximation ratio.
 */
export type Series = {
  name: string;
  color: string;
  points: { x: number; y: number }[];
  dashed?: boolean;
};

export function LineChart({
  series,
  yLabel,
  xLabel,
  yMin = 0,
  yMax = 1,
  ariaLabel,
}: {
  series: Series[];
  yLabel: string;
  xLabel: string;
  yMin?: number;
  yMax?: number;
  ariaLabel: string;
}) {
  const W = 640,
    H = 260,
    L = 44,
    R = 12,
    T = 12,
    B = 34;
  const xs = series.flatMap((s) => s.points.map((p) => Math.max(1, p.x)));
  const lx0 = 0,
    lx1 = Math.max(1, Math.ceil(Math.log10(Math.max(10, ...xs))));
  const sx = (x: number) => L + ((Math.log10(Math.max(1, x)) - lx0) / (lx1 - lx0)) * (W - L - R);
  const sy = (y: number) =>
    T + (1 - (Math.min(yMax, Math.max(yMin, y)) - yMin) / (yMax - yMin)) * (H - T - B);
  const xEnd = 10 ** lx1;
  const yTicks = Array.from({ length: 5 }, (_, i) => yMin + ((yMax - yMin) * i) / 4);
  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={ariaLabel}>
        {yTicks.map((y) => (
          <g key={y}>
            <line x1={L} x2={W - R} y1={sy(y)} y2={sy(y)} stroke="var(--border)" strokeWidth={1} />
            <text
              x={L - 6}
              y={sy(y) + 3}
              textAnchor="end"
              className="fill-muted-foreground font-mono"
              fontSize={9}
            >
              {y.toFixed(2)}
            </text>
          </g>
        ))}
        {Array.from({ length: lx1 + 1 }, (_, k) => (
          <text
            key={k}
            x={sx(10 ** k)}
            y={H - B + 14}
            textAnchor="middle"
            className="fill-muted-foreground font-mono"
            fontSize={9}
          >
            10
            {k === 0
              ? "⁰"
              : k === 1
                ? "¹"
                : k === 2
                  ? "²"
                  : k === 3
                    ? "³"
                    : k === 4
                      ? "⁴"
                      : k === 5
                        ? "⁵"
                        : `^${k}`}
          </text>
        ))}
        <text
          x={(L + W - R) / 2}
          y={H - 4}
          textAnchor="middle"
          className="fill-muted-foreground font-mono"
          fontSize={9}
        >
          {xLabel}
        </text>
        <text
          x={10}
          y={(T + H - B) / 2}
          textAnchor="middle"
          transform={`rotate(-90 10 ${(T + H - B) / 2})`}
          className="fill-muted-foreground font-mono"
          fontSize={9}
        >
          {yLabel}
        </text>
        {series.map((s) => {
          if (!s.points.length) return null;
          // Step function: best-so-far holds until next improvement, extended to the run end.
          let d = `M${sx(s.points[0]!.x)},${sy(s.points[0]!.y)}`;
          for (let i = 1; i < s.points.length; i++)
            d += ` H${sx(s.points[i]!.x)} V${sy(s.points[i]!.y)}`;
          d += ` H${sx(xEnd)}`;
          return (
            <path
              key={s.name}
              d={d}
              fill="none"
              stroke={s.color}
              strokeWidth={2}
              strokeDasharray={s.dashed ? "5 4" : undefined}
            />
          );
        })}
      </svg>
      <figcaption className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        {series.map((s) => (
          <span
            key={s.name}
            className="inline-flex items-center gap-1.5 font-mono text-[10px] text-muted-foreground"
          >
            <span
              className="inline-block h-0.5 w-4"
              style={{ background: s.color }}
              aria-hidden="true"
            />
            {s.name}
          </span>
        ))}
      </figcaption>
    </figure>
  );
}
