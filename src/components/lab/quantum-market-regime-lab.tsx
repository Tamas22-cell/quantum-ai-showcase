import { useState } from "react";
import { Play } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Panel } from "@/components/lab/charts";

type Result = { quantumAcc: number; classicalAcc: number; probs: number[]; matrix: number[][]; losses: number[] };
const REGIMES = ["Risk-on", "Neutral", "Risk-off"];

function rng(seed: number) { let x = Math.max(1, seed) % 2147483647; return () => ((x = (x * 48271) % 2147483647) / 2147483647); }

export function QuantumMarketRegimeLab() {
  const [depth, setDepth] = useState(2);
  const [epochs, setEpochs] = useState(30);
  const [seed, setSeed] = useState(21);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  async function run() {
    setRunning(true); setResult(null);
    await new Promise((r) => setTimeout(r, 120));
    const random = rng(seed + depth * 41 + epochs);
    const classicalAcc = 0.66 + random() * 0.08;
    const quantumAcc = Math.min(0.88, classicalAcc + 0.015 + depth * 0.009 + (random() - 0.5) * 0.025);
    const a = 0.22 + random() * 0.2, b = 0.25 + random() * 0.2;
    const probs = [a, b, Math.max(0.05, 1 - a - b)];
    const s = probs.reduce((x, y) => x + y, 0);
    const norm = probs.map((p) => p / s);
    const matrix = [[26, 3, 1], [4, 21, 5], [1, 4, 25]];
    const losses = Array.from({ length: 18 }, (_, i) => 0.72 * Math.exp(-i / (4.8 + depth)) + 0.18 + (random() - 0.5) * 0.018);
    setResult({ quantumAcc, classicalAcc, probs: norm, matrix, losses });
    setRunning(false);
  }

  return <div className="space-y-6">
    <div className="grid gap-6 lg:grid-cols-2">
      <Panel title="01 · QML configuration">
        <div className="space-y-5">
          <p className="text-sm leading-6 text-muted-foreground">Synthetic features: momentum, realized volatility, yield spread and cross-asset correlation. A parameterized classifier maps them into three market regimes.</p>
          <label className="block text-xs text-muted-foreground">Variational depth: <span className="font-mono text-foreground">{depth}</span><input className="mt-2 w-full accent-primary" type="range" min={1} max={5} value={depth} onChange={(e) => setDepth(Number(e.target.value))} /></label>
          <label className="block text-xs text-muted-foreground">Training epochs: <span className="font-mono text-foreground">{epochs}</span><input className="mt-2 w-full accent-primary" type="range" min={10} max={60} step={5} value={epochs} onChange={(e) => setEpochs(Number(e.target.value))} /></label>
          <label className="block text-xs text-muted-foreground">Seed<input className="mt-2 h-9 w-full rounded-sm border border-border bg-background px-2 font-mono text-xs" type="number" value={seed} onChange={(e) => setSeed(Math.max(0, Number(e.target.value) || 0))} /></label>
          <Button type="button" onClick={run} disabled={running}><Play className="size-4" />{running ? "Training…" : "Run QML Experiment"}</Button>
        </div>
      </Panel>
      <Panel title="02 · Feature map">
        <div className="grid grid-cols-2 gap-3">
          {["Momentum → RY", "Volatility → RZ", "Yield spread → RY", "Correlation → ZZ"].map((x) => <div key={x} className="rounded-sm border border-border p-4 font-mono text-xs text-primary">{x}</div>)}
        </div>
        <p className="mt-4 text-xs leading-6 text-muted-foreground">The experiment focuses on the classification workflow and comparison methodology, not quantum advantage.</p>
      </Panel>
    </div>
    <Panel title="03 · Classification results">
      {!result ? <p className="text-sm text-muted-foreground">Run the experiment to generate model accuracy, class probabilities and a seeded confusion matrix.</p> : <div className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2"><Metric label="Variational classifier" value={`${(result.quantumAcc * 100).toFixed(1)}%`} /><Metric label="Classical baseline" value={`${(result.classicalAcc * 100).toFixed(1)}%`} /></div>
        <div className="grid gap-3 sm:grid-cols-3">{REGIMES.map((r, i) => <Metric key={r} label={`${r} probability`} value={`${(result.probs[i]! * 100).toFixed(1)}%`} />)}</div>
        <div><div className="mb-2 text-xs text-muted-foreground">Training loss</div><div className="flex h-28 items-end gap-1 rounded-sm border border-border p-3">{result.losses.map((v, i) => <div key={i} className="flex-1 bg-primary/70" style={{ height: `${20 + (v / result.losses[0]!) * 75}%` }} />)}</div></div>
        <div><div className="mb-2 text-xs text-muted-foreground">Confusion matrix</div><div className="grid max-w-sm grid-cols-3 gap-2">{result.matrix.flat().map((v, i) => <div key={i} className="rounded-sm border border-border p-3 text-center font-mono text-sm">{v}</div>)}</div></div>
      </div>}
    </Panel>
    <aside className="rounded-md border border-border bg-card p-4 text-xs leading-6 text-muted-foreground"><strong className="text-foreground">Research note.</strong> Synthetic data and simulated variational classification only. The classical comparison is a research baseline, not evidence of quantum advantage and not investment advice.</aside>
  </div>;
}

function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-sm border border-border p-3"><div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div><div className="mt-1 font-mono text-lg">{value}</div></div>; }
