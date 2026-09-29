import { useMemo, useState } from "react";
import { Activity, Play } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Panel } from "@/components/lab/charts";

type RunResult = {
  iterations: { step: number; cost: number }[];
  classicalRisk: number;
  variationalRisk: number;
  expectedReturn: number;
  concentration: number;
  theta: number[];
};

const ASSETS = [
  { ticker: "SPX", ret: 0.085, risk: 0.18 },
  { ticker: "NDX", ret: 0.11, risk: 0.25 },
  { ticker: "TLT", ret: 0.045, risk: 0.12 },
  { ticker: "GLD", ret: 0.06, risk: 0.16 },
  { ticker: "BTC", ret: 0.19, risk: 0.55 },
];

function seeded(seed: number) {
  let x = Math.max(1, seed) % 2147483647;
  return () => ((x = (x * 48271) % 2147483647) / 2147483647);
}

export function VariationalRiskLab() {
  const [depth, setDepth] = useState(3);
  const [riskAversion, setRiskAversion] = useState(6);
  const [shots, setShots] = useState(2048);
  const [seed, setSeed] = useState(42);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<RunResult | null>(null);

  const objectiveText = useMemo(
    () => `J(θ) = ${riskAversion.toFixed(0)} × portfolio risk − expected return + concentration penalty`,
    [riskAversion],
  );

  async function runExperiment() {
    setRunning(true);
    setResult(null);
    await new Promise((resolve) => setTimeout(resolve, 120));

    const rnd = seeded(seed + depth * 97 + riskAversion * 13 + shots);
    const iterations: { step: number; cost: number }[] = [];
    const start = 1.15 + riskAversion * 0.035 + rnd() * 0.08;
    const floor = 0.32 + riskAversion * 0.018 + depth * 0.008;
    for (let i = 0; i <= 24; i += 1) {
      const decay = Math.exp(-i / (5.5 + depth));
      const noise = (rnd() - 0.5) * 0.025 * (1 - i / 30);
      iterations.push({ step: i, cost: Math.max(floor, floor + (start - floor) * decay + noise) });
    }

    const avgRisk = ASSETS.reduce((s, a) => s + a.risk, 0) / ASSETS.length;
    const avgReturn = ASSETS.reduce((s, a) => s + a.ret, 0) / ASSETS.length;
    const classicalRisk = avgRisk * (0.88 + riskAversion * 0.008);
    const variationalRisk = classicalRisk * Math.max(0.78, 0.95 - depth * 0.018 + (rnd() - 0.5) * 0.025);
    const expectedReturn = avgReturn * (0.92 + (10 - riskAversion) * 0.012 + depth * 0.006);
    const concentration = 0.21 + depth * 0.012 + rnd() * 0.035;
    const theta = Array.from({ length: Math.min(8, depth * 2) }, () => Number(((rnd() * 2 - 1) * Math.PI).toFixed(3)));

    setResult({ iterations, classicalRisk, variationalRisk, expectedReturn, concentration, theta });
    setRunning(false);
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[1fr_1.15fr]">
        <Panel title="01 · Variational model configuration">
          <div className="space-y-5">
            <label className="block text-xs text-muted-foreground">
              Circuit depth: <span className="font-mono text-foreground">{depth}</span>
              <input className="mt-2 w-full accent-primary" type="range" min={1} max={6} value={depth} onChange={(e) => setDepth(Number(e.target.value))} />
            </label>
            <label className="block text-xs text-muted-foreground">
              Risk aversion λ: <span className="font-mono text-foreground">{riskAversion}</span>
              <input className="mt-2 w-full accent-primary" type="range" min={1} max={10} value={riskAversion} onChange={(e) => setRiskAversion(Number(e.target.value))} />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="text-xs text-muted-foreground">Shots
                <select className="mt-2 h-9 w-full rounded-sm border border-border bg-background px-2 font-mono text-xs" value={shots} onChange={(e) => setShots(Number(e.target.value))}>
                  <option value={512}>512</option><option value={1024}>1024</option><option value={2048}>2048</option><option value={4096}>4096</option>
                </select>
              </label>
              <label className="text-xs text-muted-foreground">Seed
                <input className="mt-2 h-9 w-full rounded-sm border border-border bg-background px-2 font-mono text-xs" type="number" value={seed} min={0} onChange={(e) => setSeed(Math.max(0, Number(e.target.value) || 0))} />
              </label>
            </div>
            <div className="rounded-sm border border-border bg-background/40 p-3 font-mono text-[11px] leading-5 text-muted-foreground">{objectiveText}</div>
            <Button type="button" onClick={runExperiment} disabled={running}>
              {running ? <Activity className="size-4 animate-pulse" aria-hidden="true" /> : <Play className="size-4" aria-hidden="true" />}
              {running ? "Running variational experiment…" : "Run Variational Experiment"}
            </Button>
          </div>
        </Panel>

        <Panel title="02 · Hybrid quantum-classical loop">
          <ol className="space-y-3 text-sm text-muted-foreground">
            <li><span className="font-mono text-primary">01</span> Encode synthetic return/risk factors into a parameterized ansatz.</li>
            <li><span className="font-mono text-primary">02</span> Evaluate the risk-return objective for the current θ parameters.</li>
            <li><span className="font-mono text-primary">03</span> Classical optimizer updates θ and sends parameters back to the circuit.</li>
            <li><span className="font-mono text-primary">04</span> Stop when the objective stabilizes and compare with the classical baseline.</li>
          </ol>
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {ASSETS.map((a) => <div key={a.ticker} className="rounded-sm border border-border p-3"><div className="font-mono text-xs text-primary">{a.ticker}</div><div className="mt-1 text-[11px] text-muted-foreground">μ {(a.ret * 100).toFixed(1)}% · σ {(a.risk * 100).toFixed(1)}%</div></div>)}
          </div>
        </Panel>
      </div>

      <Panel title="03 · Experiment output">
        {!result ? (
          <p className="text-sm text-muted-foreground">Run the experiment to generate a seeded convergence path and compare the variational solution with the classical risk baseline.</p>
        ) : (
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-4">
              <Metric label="Classical risk" value={`${(result.classicalRisk * 100).toFixed(2)}%`} />
              <Metric label="Variational risk" value={`${(result.variationalRisk * 100).toFixed(2)}%`} />
              <Metric label="Expected return" value={`${(result.expectedReturn * 100).toFixed(2)}%`} />
              <Metric label="Concentration" value={`${(result.concentration * 100).toFixed(1)}%`} />
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between text-[11px] text-muted-foreground"><span>Cost-function convergence</span><span>24 iterations</span></div>
              <div className="flex h-32 items-end gap-1 rounded-sm border border-border bg-background/40 p-3" aria-label="Cost convergence chart">
                {result.iterations.map((p) => {
                  const max = result.iterations[0]?.cost ?? 1;
                  const min = result.iterations[result.iterations.length - 1]?.cost ?? 0;
                  const h = 18 + ((p.cost - min) / Math.max(0.001, max - min)) * 78;
                  return <div key={p.step} title={`Iteration ${p.step}: ${p.cost.toFixed(4)}`} className="min-w-0 flex-1 rounded-t-[1px] bg-primary/70" style={{ height: `${h}%` }} />;
                })}
              </div>
            </div>
            <div className="rounded-sm border border-border p-3 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Final θ:</span> <span className="font-mono">[{result.theta.join(", ")}]</span>
            </div>
          </div>
        )}
      </Panel>

      <aside className="rounded-md border border-border bg-card p-4 text-xs leading-6 text-muted-foreground">
        <strong className="text-foreground">Research note.</strong> This project uses a seeded synthetic variational simulation to demonstrate the hybrid optimization loop for a financial risk objective. It does not execute on quantum hardware and does not claim quantum advantage or provide investment advice.
      </aside>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-sm border border-border p-3"><div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div><div className="mt-1 font-mono text-lg text-foreground">{value}</div></div>;
}
