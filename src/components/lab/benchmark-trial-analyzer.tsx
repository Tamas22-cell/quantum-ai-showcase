import { useMemo, useState } from "react";
import { parseBenchmarkTrials, summarizeBenchmarkTrials } from "@/lib/quantum/benchmark-statistics";

const format = (n: number) => Number(n.toPrecision(6)).toLocaleString("en-US");

export function BenchmarkTrialAnalyzer() {
  const [input, setInput] = useState("");
  const analysis = useMemo(() => {
    if (!input.trim()) return null;
    try {
      return { result: summarizeBenchmarkTrials(parseBenchmarkTrials(input)), error: null };
    } catch (err) {
      return { result: null, error: err instanceof Error ? err.message : "Invalid data" };
    }
  }, [input]);

  return (
    <section className="mt-8 rounded-md border border-border bg-card p-5">
      <h2 className="text-lg font-semibold">Independent-run statistical analyzer</h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
        Paste objective scores from repeated runs of the same benchmark problem with identical
        settings (varying the independent random seed). This is a local calculation; no
        results are uploaded or fabricated. Do not mix different metrics or problem instances.
      </p>
      <label htmlFor="benchmark-trials" className="mt-4 block font-mono text-xs text-muted-foreground">
        Trial scores (comma, semicolon or newline separated)
      </label>
      <textarea
        id="benchmark-trials"
        rows={3}
        value={input}
        onChange={(event) => setInput(event.target.value)}
        placeholder="Paste your measured scores here"
        className="mt-2 w-full rounded-md border border-border bg-surface p-3 font-mono text-sm text-foreground"
      />
      {analysis?.error && <p role="alert" className="mt-3 text-sm text-destructive">{analysis.error}</p>}
      {analysis?.result && (
        <div className="mt-4">
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {([
              ["Trials", String(analysis.result.n)],
              ["Mean", format(analysis.result.mean)],
              ["Median", format(analysis.result.median)],
              ["Sample standard deviation", format(analysis.result.sampleStdDev)],
              ["Minimum", format(analysis.result.min)],
              ["Maximum", format(analysis.result.max)],
            ] as const).map(([label, value]) => (
              <div key={label} className="rounded-md border border-border bg-surface p-3">
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd className="mt-1 font-mono text-base text-foreground">{value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-sm text-muted-foreground">
            {analysis.result.ci95
              ? `Approximate 95% CI of mean: [${format(analysis.result.ci95.lower)}, ${format(analysis.result.ci95.upper)}]`
              : "95% normal-approximation CI withheld: at least 30 independent trials required."}
          </p>
        </div>
      )}
      <p className="mt-3 text-xs text-muted-foreground">
        Confidence intervals use a normal approximation and require independent trials; they do
        not establish quantum advantage or account for hardware/systematic uncertainty.
      </p>
    </section>
  );
}
