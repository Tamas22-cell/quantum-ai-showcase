import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-sm border border-border bg-surface p-3">
      <div className="font-mono text-lg font-semibold text-foreground">{value}</div>
      <div className="mt-1 font-mono text-[10px] uppercase text-muted-foreground">{label}</div>
    </div>
  );
}

function Range({ label, value, min, max, step = 1, onChange }: { label: string; value: number; min: number; max: number; step?: number; onChange: (value: number) => void }) {
  return (
    <label className="block rounded-sm border border-border bg-surface p-3">
      <div className="flex items-center justify-between gap-3 font-mono text-[11px]"><span className="text-muted-foreground">{label}</span><span className="text-foreground">{value}</span></div>
      <input className="mt-3 w-full" type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  );
}

export function DeepLearningLab() {
  const defaults = { layers: 3, epochs: 40, lr: 0.02, dropout: 0.2 };
  const [layers, setLayers] = useState(defaults.layers);
  const [epochs, setEpochs] = useState(defaults.epochs);
  const [lr, setLr] = useState(defaults.lr);
  const [dropout, setDropout] = useState(defaults.dropout);
  const [runId, setRunId] = useState(0);
  const [lastRun, setLastRun] = useState(0);

  const result = useMemo(() => {
    const stability = Math.max(0, 1 - Math.abs(lr - 0.025) * 13 - Math.max(0, layers - 5) * 0.04);
    const runNoise = ((runId * 37) % 11) / 1000;
    const accuracy = Math.min(0.985, 0.69 + layers * 0.035 + Math.log10(epochs + 1) * 0.07 + stability * 0.06 - Math.abs(dropout - 0.2) * 0.12 + runNoise);
    const loss = Math.max(0.04, 1.2 * Math.exp(-epochs / (17 + layers * 2)) + (1 - stability) * 0.25 - runNoise / 2);
    const curve = Array.from({ length: 18 }, (_, i) => {
      const p = i / 17;
      return { x: 14 + p * 572, y: 145 - (1 - Math.exp(-p * (3 + epochs / 30))) * 105 * stability - runNoise * 60 };
    });
    return { accuracy, loss, curve, stability };
  }, [layers, epochs, lr, dropout, runId]);

  const runTraining = () => {
    setRunId((value) => value + 1);
    setLastRun((value) => value + 1);
  };

  const reset = () => {
    setLayers(defaults.layers);
    setEpochs(defaults.epochs);
    setLr(defaults.lr);
    setDropout(defaults.dropout);
    setRunId(0);
    setLastRun(0);
  };

  return (
    <section className="rounded-md border border-border bg-card p-4 sm:p-5">
      <div className="font-mono text-xs uppercase tracking-[0.18em] text-primary">Interactive experiment</div>
      <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">Deep Learning Lab</h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">Configure the training parameters, then press RUN TRAINING. This is a browser-local educational neural-network simulation with visible run state and changing metrics.</p>

      <div className="mt-5 grid gap-3 md:grid-cols-4">
        <Range label="Hidden layers" value={layers} min={1} max={8} onChange={setLayers} />
        <Range label="Epochs" value={epochs} min={10} max={120} step={5} onChange={setEpochs} />
        <Range label="Learning rate" value={lr} min={0.005} max={0.08} step={0.005} onChange={setLr} />
        <Range label="Dropout" value={dropout} min={0} max={0.5} step={0.05} onChange={setDropout} />
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <Button type="button" variant="signal" onClick={runTraining}>RUN TRAINING</Button>
        <Button type="button" variant="outline" onClick={reset}>RESET</Button>
      </div>

      <div className="mt-3 font-mono text-[10px] uppercase text-muted-foreground">
        {lastRun === 0 ? "Ready to train" : `Training run #${lastRun} complete`}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Metric label="Validation accuracy" value={`${(result.accuracy * 100).toFixed(1)}%`} />
        <Metric label="Final loss" value={result.loss.toFixed(3)} />
        <Metric label="Parameters" value={`${(layers * 384 + 257).toLocaleString()}`} />
        <Metric label="Stability" value={`${(result.stability * 100).toFixed(0)}%`} />
      </div>

      <div className="mt-4 rounded-sm border border-border bg-surface p-3">
        <div className="mb-2 font-mono text-[10px] uppercase text-muted-foreground">Training curve</div>
        <svg viewBox="0 0 600 160" className="w-full">
          <line x1="12" y1="145" x2="590" y2="145" stroke="currentColor" opacity="0.25" />
          <polyline points={result.curve.map((p) => `${p.x},${p.y}`).join(" ")} fill="none" stroke="currentColor" strokeWidth="3" />
        </svg>
      </div>
    </section>
  );
}
