import { useMemo, useRef, useState } from "react";
import { ArrowRight, Loader2, Play } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Panel } from "@/components/lab/charts";
import { saveExperimentSnapshot } from "@/lib/experiment-history";
import { interpret, runStressTest, SCENARIOS, STRESS_ASSETS, type ScenarioId, type StressResult } from "@/lib/finance/stress";

const pct = (v: number) => `${(v * 100).toFixed(1)}%`;
const STEPS = ["Portfolio", "Market scenario", "Classical baseline", "QAOA optimization", "Risk/return comparison"];
const DEFAULT = ["SPX", "NDX", "TLT", "GLD", "XLE", "BTC"];

/** Interactive stress/regime comparison: Original vs classical mean-variance vs QAOA-selected allocation. */
export function StressLab() {
  const [selected, setSelected] = useState<string[]>(DEFAULT);
  const [weights, setWeights] = useState<Record<string, number>>(() => Object.fromEntries(STRESS_ASSETS.map((a) => [a.ticker, 20])));
  const [scenario, setScenario] = useState<ScenarioId>("crash");
  const [riskPref, setRiskPref] = useState(5);
  const [k, setK] = useState(3);
  const [seed, setSeed] = useState(42);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<StressResult | null>(null);
  const [saved, setSaved] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const kMax = Math.max(2, selected.length - 1);
  const stage = result ? 5 : running ? 3 : 2;
  const lines = useMemo(() => (result ? interpret(result) : []), [result]);

  function toggle(t: string) {
    setResult(null);
    setSelected((s) => (s.includes(t) ? s.filter((x) => x !== t) : [...s, t]));
  }

  async function run() {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setRunning(true); setError(null); setSaved(false);
    try {
      const tickers = STRESS_ASSETS.map((a) => a.ticker).filter((t) => selected.includes(t));
      const r = await runStressTest({ tickers, weights: tickers.map((t) => weights[t] ?? 0), scenario, riskPref, k: Math.min(k, kMax), seed }, { signal: ctrl.signal });
      setResult(r);
    } catch (e) {
      if (!ctrl.signal.aborted) setError(e instanceof Error ? e.message : "Stress test failed.");
    } finally {
      setRunning(false);
    }
  }

  function save() {
    if (!result) return;
    const c = result.config;
    const row = (name: string, m: StressResult["original"]["m"]) => `${name}: ret ${pct(m.ret)} vol ${pct(m.vol)} Sharpe ${m.sharpe.toFixed(2)} MDD ${pct(m.maxDrawdown)} VaR95 ${pct(m.var95)}`;
    saveExperimentSnapshot({
      module: "Quantum Portfolio Stress Lab",
      route: "/lab/finance/stress",
      fields: {
        scenario: SCENARIOS.find((s) => s.id === c.scenario)!.label, assets: c.tickers.join(", "),
        weights: c.weights.join(", "), riskPreference: String(c.riskPref), qaoaK: String(c.k), seed: String(c.seed),
        qaoaSelection: result.qaoa.selected.join(", "), qaoaMatchesExact: result.qaoa.matchesExact, data: "synthetic",
      },
      summary: [row("Original", result.original.m), row("Classical", result.classical.m), row("QAOA", result.qaoa.m), ...lines].join("\n"),
    });
    setSaved(true);
  }

  const cols = result ? [
    { key: "Original", w: result.original.w, m: result.original.m },
    { key: "Classical", w: result.classical.w, m: result.classical.m },
    { key: "QAOA", w: result.qaoa.w, m: result.qaoa.m },
  ] : [];

  return (
    <div className="space-y-6">
      <ol className="grid gap-2 sm:grid-cols-5" aria-label="Stress test workflow">
        {STEPS.map((s, i) => (
          <li key={s} className={`flex items-center gap-2 rounded-sm border px-3 py-2 font-mono text-[11px] uppercase ${i < stage ? "border-primary/60 bg-signal-soft text-primary" : "border-border text-muted-foreground"}`}>
            <span>{String(i + 1).padStart(2, "0")}</span><span className="truncate">{s}</span>
            {i < STEPS.length - 1 ? <ArrowRight className="ml-auto hidden size-3 sm:block" aria-hidden="true" /> : null}
          </li>
        ))}
      </ol>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        <Panel title="01 · Portfolio" aside={<span className="font-mono text-[10px] uppercase text-muted-foreground">Synthetic assets</span>}>
          <p className="mb-3 text-xs text-muted-foreground">Select 3–8 assets and set raw weights (normalised to 100%). Parameters are illustrative, not market data.</p>
          <ul className="space-y-2">
            {STRESS_ASSETS.map((a) => {
              const on = selected.includes(a.ticker);
              return (
                <li key={a.ticker} className="grid grid-cols-[auto_1fr_5rem] items-center gap-3">
                  <input id={`asset-${a.ticker}`} type="checkbox" checked={on} onChange={() => toggle(a.ticker)} className="size-4 accent-primary" />
                  <label htmlFor={`asset-${a.ticker}`} className="min-w-0 text-sm">
                    <span className="font-mono text-primary">{a.ticker}</span> <span className="text-muted-foreground">· {a.name} · {a.kind}</span>
                  </label>
                  <input aria-label={`${a.ticker} weight`} name={`weight-${a.ticker}`} type="number" min={0} max={100} step={1} disabled={!on}
                    value={weights[a.ticker]} onChange={(e) => { setResult(null); setWeights((w) => ({ ...w, [a.ticker]: Math.max(0, Number(e.target.value) || 0) })); }}
                    className="h-8 rounded-sm border border-border bg-background px-2 text-right font-mono text-xs disabled:opacity-40" />
                </li>
              );
            })}
          </ul>
        </Panel>

        <Panel title="02 · Market scenario & model">
          <fieldset className="grid gap-2" aria-label="Market scenario">
            {SCENARIOS.map((s) => (
              <label key={s.id} className={`cursor-pointer rounded-sm border px-3 py-2 text-sm ${scenario === s.id ? "border-primary bg-signal-soft" : "border-border hover:border-primary/50"}`}>
                <input type="radio" name="scenario" value={s.id} checked={scenario === s.id} onChange={() => { setScenario(s.id); setResult(null); }} className="mr-2 accent-primary" />
                <span className="font-medium">{s.label}</span>
                <span className="mt-1 block text-xs text-muted-foreground">{s.note}</span>
              </label>
            ))}
          </fieldset>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <label className="text-xs text-muted-foreground">Risk preference: <span className="font-mono text-foreground">{riskPref}</span> <span className="text-[10px]">(1 aggressive · 10 defensive)</span>
              <input name="riskPreference" type="range" min={1} max={10} value={riskPref} onChange={(e) => { setRiskPref(Number(e.target.value)); setResult(null); }} className="mt-2 w-full accent-primary" />
            </label>
            <label className="text-xs text-muted-foreground">QAOA subset size K
              <input name="qaoaK" type="number" min={2} max={kMax} value={Math.min(k, kMax)} onChange={(e) => { setK(Number(e.target.value)); setResult(null); }} className="mt-2 h-8 w-full rounded-sm border border-border bg-background px-2 font-mono text-xs" />
            </label>
            <label className="text-xs text-muted-foreground">Seed
              <input name="seed" type="number" min={0} value={seed} onChange={(e) => { setSeed(Math.max(0, Math.floor(Number(e.target.value) || 0))); setResult(null); }} className="mt-2 h-8 w-full rounded-sm border border-border bg-background px-2 font-mono text-xs" />
            </label>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button type="button" onClick={run} disabled={running}>
              {running ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Play className="size-4" aria-hidden="true" />}
              {running ? "Running stress test…" : "Run stress test"}
            </Button>
            <Button type="button" variant="outline" onClick={save} disabled={!result}>{saved ? "Saved to history" : "Save experiment"}</Button>
          </div>
          {error ? <p role="alert" className="mt-3 text-xs text-destructive">{error}</p> : null}
        </Panel>
      </div>

      <div aria-live="polite">
        {result ? (
          <div className="grid gap-6 lg:grid-cols-2">
            <Panel title="03–05 · Risk/return comparison" className="lg:col-span-2">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-sm">
                  <thead><tr className="border-b border-border font-mono text-[11px] uppercase text-muted-foreground">
                    <th className="py-2 text-left">Metric</th>{cols.map((c) => <th key={c.key} className="py-2 text-right">{c.key}</th>)}
                  </tr></thead>
                  <tbody className="font-mono">
                    {([["Expected return", (m) => pct(m.ret)], ["Volatility", (m) => pct(m.vol)], ["Sharpe ratio", (m) => m.sharpe.toFixed(2)], ["Max drawdown (sim.)", (m) => pct(m.maxDrawdown)], ["VaR 95% (1y, param.)", (m) => pct(m.var95)]] as [string, (m: StressResult["original"]["m"]) => string][]).map(([label, f]) => (
                      <tr key={label} className="border-b border-border/60"><td className="py-2 font-sans text-muted-foreground">{label}</td>{cols.map((c) => <td key={c.key} className="py-2 text-right">{f(c.m)}</td>)}</tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-[11px] text-muted-foreground">
                QAOA: p=2 simulated statevector, selection from {result.qaoa.source}; P(optimal) {pct(result.qaoa.pOptimal)}, P(feasible) {pct(result.qaoa.pFeasible)}. Max drawdown is the mean over 200 seeded one-year paths.
              </p>
            </Panel>

            <Panel title="Allocation comparison">
              <ul className="space-y-3" aria-label="Allocation by asset">
                {result.universe.assets.map((a, i) => (
                  <li key={a.ticker}>
                    <div className="mb-1 font-mono text-xs text-primary">{a.ticker}</div>
                    {cols.map((c, ci) => (
                      <div key={c.key} className="grid grid-cols-[4.5rem_1fr_3rem] items-center gap-2 text-[11px]">
                        <span className="text-muted-foreground">{c.key}</span>
                        <div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary" style={{ width: `${c.w[i]! * 100}%`, opacity: [0.4, 0.7, 1][ci] }} /></div>
                        <span className="text-right font-mono">{pct(c.w[i]!)}</span>
                      </div>
                    ))}
                  </li>
                ))}
              </ul>
            </Panel>

            <Panel title="Research interpretation">
              <ul className="space-y-2 text-sm leading-6 text-muted-foreground">{lines.map((l) => <li key={l}>{l}</li>)}</ul>
            </Panel>
          </div>
        ) : (
          <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">Choose a portfolio and a stress regime, then run the stress test to compare allocations.</p>
        )}
      </div>

      <aside className="rounded-md border border-border bg-card p-4 text-xs leading-6 text-muted-foreground">
        <strong className="text-foreground">Limitations.</strong> All asset parameters and scenarios are synthetic and hand-set for research illustration. QAOA runs on an ideal noiseless classical simulation, not quantum hardware, and selects a K-asset subset that is then weighted classically; any difference from the classical baseline reflects the cardinality constraint and objective, not evidence of quantum advantage. Not investment advice.
      </aside>
    </div>
  );
}
