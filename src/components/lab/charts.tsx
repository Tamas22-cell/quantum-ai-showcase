/** Reusable scientific chart primitives (plain SVG/HTML — no heavy chart dependency). */

export type Bar = { label: string; value: number; expected?: number };

/**
 * Vertical histogram. `value` is plotted as a filled bar; optional `expected`
 * (same units) is drawn as an emerald tick for theory-vs-sample comparison.
 */
export function Histogram({ bars, max, valueFormat, ariaLabel }: { bars: Bar[]; max?: number; valueFormat: (v: number) => string; ariaLabel: string }) {
  const top = max ?? Math.max(1e-12, ...bars.map((b) => Math.max(b.value, b.expected ?? 0)));
  return (
    <div className="overflow-x-auto">
      <div role="img" aria-label={ariaLabel} className="flex h-48 min-w-full items-end gap-1 border-b border-l border-border px-1" style={{ minWidth: bars.length * 28 }}>
        {bars.map((b) => (
          <div key={b.label} className="group relative flex h-full flex-1 flex-col justify-end" title={`${b.label}: ${valueFormat(b.value)}`}>
            <div className="w-full rounded-t-sm bg-primary/80 transition-[height] duration-500 group-hover:bg-primary" style={{ height: `${(b.value / top) * 100}%` }} />
            {b.expected !== undefined ? (
              <div className="absolute inset-x-0 h-0.5 bg-emerald" style={{ bottom: `${(b.expected / top) * 100}%` }} aria-hidden="true" />
            ) : null}
          </div>
        ))}
      </div>
      <div className="flex gap-1 px-1 pt-1" style={{ minWidth: bars.length * 28 }}>
        {bars.map((b) => (
          <span key={b.label} className="flex-1 truncate text-center font-mono text-[9px] text-muted-foreground [writing-mode:vertical-rl] sm:[writing-mode:initial]">{b.label}</span>
        ))}
      </div>
    </div>
  );
}

export function ProbabilityRow({ label, p }: { label: string; p: number }) {
  return (
    <div>
      <div className="flex justify-between font-mono text-xs text-muted-foreground"><span>{label}</span><span>{(p * 100).toFixed(2)}%</span></div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary transition-all duration-500" style={{ width: `${p * 100}%` }} /></div>
    </div>
  );
}

export function Panel({ title, aside, children, className = "" }: { title: string; aside?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-md border border-border bg-card p-4 sm:p-5 ${className}`} aria-label={title}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-mono text-xs uppercase tracking-wider text-primary">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}
