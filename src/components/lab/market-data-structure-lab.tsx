import { useMemo, useState } from "react";
import { Database, Play } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Panel } from "@/components/lab/charts";

const TICKERS = ["SPX", "NDX", "TLT", "GLD", "BTC"];

type Result = {
  returns: Record<string, number>;
  vol: Record<string, number>;
  corr: number[][];
  anomalies: { ticker: string; score: number }[];
  stability: number;
};

function rng(seed: number) { let x = Math.max(1, seed) % 2147483647; return () => ((x = (x * 48271) % 2147483647) / 2147483647); }

export function MarketDataStructureLab() {
  const [window, setWindow] = useState(60);
  const [seed, setSeed] = useState(17);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  const windowLabel = useMemo(() => `${window}-day rolling window`, [window]);

  async function run() {
    setRunning(true); setResult(null);
    await new Promise((r) => setTimeout(r, 120));
    const random = rng(seed + window * 19);
    const returns: Record<string, number> = {};
    const vol: Record<string, number> = {};
    TICKERS.forEach((t, i) => {
      returns[t] = 0.03 + i * 0.018 + random() * 0.045;
      vol[t] = 0.1 + i * 0.045 + random() * 0.08;
    });
    const corr = TICKERS.map((_, i) => TICKERS.map((__, j) => i === j ? 1 : Number((0.08 + 0.68 * random() - Math.abs(i - j) * 0.035).toFixed(2))));
    const anomalies = TICKERS.map((ticker) => ({ ticker, score: Number((0.3 + random() * 2.8).toFixed(2)) })).sort((a, b) => b.score - a.score);
    const stability = 0.62 + random() * 0.27;
    setResult({ returns, vol, corr, anomalies, stability });
    setRunning(false);
  }

  return <div className="space-y-6">
    <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
      <Panel title="01 · Market data pipeline">
        <div className="space-y-5">
          <p className="text-sm leading-6 text-muted-foreground">Inspect the structure of a synthetic multi-asset dataset before it enters optimization or QML models.</p>
          <label className="block text-xs text-muted-foreground">Rolling window: <span className="font-mono text-foreground">{window} days</span><input className="mt-2 w-full accent-primary" type="range" min={20} max={120} step={10} value={window} onChange={(e) => setWindow(Number(e.target.value))} /></label>
          <label className="block text-xs text-muted-foreground">Seed<input className="mt-2 h-9 w-full rounded-sm border border-border bg-background px-2 font-mono text-xs" type="number" value={seed} onChange={(e) => setSeed(Math.max(0, Number(e.target.value) || 0))} /></label>
          <div className="rounded-sm border border-border p-3 font-mono text-[11px] text-muted-foreground">Pipeline: prices → returns → volatility → covariance → correlation → anomaly score</div>
          <Button type="button" onClick={run} disabled={running}><Database className="size-4" />{running ? "Processing dataset…" : "Run Market Data Analysis"}</Button>
        </div>
      </Panel>
      <Panel title="02 · Dataset scope">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">{TICKERS.map((t) => <div key={t} className="rounded-sm border border-border p-3 text-center font-mono text-xs text-primary">{t}</div>)}</div>
        <div className="mt-5 space-y-2 text-sm text-muted-foreground"><p>• {windowLabel}</p><p>• Covariance and correlation diagnostics</p><p>• Cross-asset anomaly ranking</p><p>• Data stability score for downstream model suitability</p></div>
      </Panel>
    </div>
    <Panel title="03 · Data diagnostics">
      {!result ? <p className="text-sm text-muted-foreground">Run the analysis to calculate return, volatility, correlation and anomaly diagnostics.</p> : <div className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-5">{TICKERS.map((t) => <div key={t} className="rounded-sm border border-border p-3"><div className="font-mono text-xs text-primary">{t}</div><div className="mt-2 text-[11px] text-muted-foreground">Return {(result.returns[t]! * 100).toFixed(1)}%</div><div className="text-[11px] text-muted-foreground">Vol {(result.vol[t]! * 100).toFixed(1)}%</div></div>)}</div>
        <div className="overflow-x-auto"><table className="min-w-[460px] text-xs"><thead><tr><th className="p-2 text-left text-muted-foreground">Corr</th>{TICKERS.map((t) => <th key={t} className="p-2 font-mono text-primary">{t}</th>)}</tr></thead><tbody>{result.corr.map((row, i) => <tr key={TICKERS[i]} className="border-t border-border"><td className="p-2 font-mono text-primary">{TICKERS[i]}</td>{row.map((v, j) => <td key={j} className="p-2 text-center font-mono">{v.toFixed(2)}</td>)}</tr>)}</tbody></table></div>
        <div className="grid gap-3 sm:grid-cols-2"><div className="rounded-sm border border-border p-4"><div className="text-xs uppercase tracking-wide text-muted-foreground">Data stability</div><div className="mt-2 font-mono text-2xl">{(result.stability * 100).toFixed(1)}%</div></div><div className="rounded-sm border border-border p-4"><div className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Top anomaly scores</div>{result.anomalies.slice(0, 3).map((a) => <div key={a.ticker} className="flex justify-between border-t border-border py-1.5 text-xs"><span className="font-mono text-primary">{a.ticker}</span><span className="font-mono">z {a.score.toFixed(2)}</span></div>)}</div></div>
      </div>}
    </Panel>
    <aside className="rounded-md border border-border bg-card p-4 text-xs leading-6 text-muted-foreground"><strong className="text-foreground">Research note.</strong> This module studies financial data quality and structure before quantum or classical modelling. Values are synthetic and reproducible; no live market data is used here.</aside>
  </div>;
}
