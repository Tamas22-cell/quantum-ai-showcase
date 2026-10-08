import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";

const field =
  "w-full rounded-sm border border-border bg-surface px-2 py-1.5 font-mono text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

type Point = { x1: number; x2: number; y: number };
type Task = "classification" | "regression";

function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return (s >>> 0) / 4294967296;
  };
}

function gaussian(random: () => number) {
  const u = Math.max(random(), 1e-12);
  const v = Math.max(random(), 1e-12);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function makeData(task: Task, n: number, noise: number, seed: number): Point[] {
  const random = rng(seed);
  return Array.from({ length: n }, () => {
    const x1 = random() * 2 - 1;
    const x2 = random() * 2 - 1;
    if (task === "classification") {
      const margin = 1.25 * x1 - 0.85 * x2 + 0.15 + gaussian(random) * noise;
      return { x1, x2, y: margin >= 0 ? 1 : 0 };
    }
    const y = 1.8 * x1 - 1.1 * x2 + 0.35 + gaussian(random) * noise;
    return { x1, x2, y };
  });
}

const sigmoid = (z: number) => 1 / (1 + Math.exp(-Math.max(-30, Math.min(30, z))));

function trainLogistic(data: Point[], learningRate: number, epochs: number) {
  let w0 = 0,
    w1 = 0,
    w2 = 0;
  const loss: number[] = [];
  for (let epoch = 0; epoch < epochs; epoch++) {
    let g0 = 0,
      g1 = 0,
      g2 = 0,
      l = 0;
    for (const p of data) {
      const pred = sigmoid(w0 + w1 * p.x1 + w2 * p.x2);
      const e = pred - p.y;
      g0 += e;
      g1 += e * p.x1;
      g2 += e * p.x2;
      l += -(p.y * Math.log(pred + 1e-12) + (1 - p.y) * Math.log(1 - pred + 1e-12));
    }
    const m = data.length;
    w0 -= (learningRate * g0) / m;
    w1 -= (learningRate * g1) / m;
    w2 -= (learningRate * g2) / m;
    if (epoch % Math.max(1, Math.floor(epochs / 40)) === 0 || epoch === epochs - 1)
      loss.push(l / m);
  }
  return { w0, w1, w2, loss };
}

function trainLinear(data: Point[]) {
  // Solve normal equations for [1, x1, x2] using Gaussian elimination.
  const a = Array.from({ length: 3 }, () => Array(4).fill(0) as number[]);
  for (const p of data) {
    const f = [1, p.x1, p.x2];
    for (let i = 0; i < 3; i++) {
      const row = a[i]!;
      for (let j = 0; j < 3; j++) row[j] = (row[j] ?? 0) + f[i]! * f[j]!;
      row[3] = (row[3] ?? 0) + f[i]! * p.y;
    }
  }
  for (let i = 0; i < 3; i++) {
    let pivot = i;
    for (let r = i + 1; r < 3; r++) if (Math.abs(a[r]![i]!) > Math.abs(a[pivot]![i]!)) pivot = r;
    [a[i], a[pivot]] = [a[pivot]!, a[i]!];
    const row = a[i]!;
    const d = row[i] || 1e-12;
    for (let c = i; c < 4; c++) row[c] = (row[c] ?? 0) / d;
    for (let r = 0; r < 3; r++)
      if (r !== i) {
        const rr = a[r]!;
        const f = rr[i]!;
        for (let c = i; c < 4; c++) rr[c] = (rr[c] ?? 0) - f * row[c]!;
      }
  }
  return { w0: a[0]![3]!, w1: a[1]![3]!, w2: a[2]![3]! };
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-sm border border-border bg-surface p-3">
      <div className="font-mono text-[10px] uppercase text-muted-foreground">{label}</div>
      <div className="mt-1 font-mono text-xl text-foreground">{value}</div>
      {hint ? <div className="mt-1 text-[10px] text-muted-foreground">{hint}</div> : null}
    </div>
  );
}

export function MachineLearningLab() {
  const [task, setTask] = useState<Task>("classification");
  const [samples, setSamples] = useState(160);
  const [noise, setNoise] = useState(0.22);
  const [seed, setSeed] = useState(42);
  const [learningRate, setLearningRate] = useState(0.45);
  const [epochs, setEpochs] = useState(250);
  const [runId, setRunId] = useState(0);

  const activeSeed = seed + runId * 9973;
  const data = useMemo(
    () => makeData(task, samples, noise, activeSeed),
    [task, samples, noise, activeSeed],
  );
  const split = Math.max(10, Math.floor(data.length * 0.75));
  const train = data.slice(0, split);
  const test = data.slice(split);

  const result = useMemo(() => {
    if (task === "classification") {
      const model = trainLogistic(train, learningRate, epochs);
      let tp = 0,
        tn = 0,
        fp = 0,
        fn = 0;
      for (const p of test) {
        const pred = sigmoid(model.w0 + model.w1 * p.x1 + model.w2 * p.x2) >= 0.5 ? 1 : 0;
        if (pred === 1 && p.y === 1) tp++;
        else if (pred === 0 && p.y === 0) tn++;
        else if (pred === 1) fp++;
        else fn++;
      }
      const accuracy = (tp + tn) / Math.max(1, test.length);
      const precision = tp / Math.max(1, tp + fp);
      const recall = tp / Math.max(1, tp + fn);
      const f1 = (2 * precision * recall) / Math.max(1e-12, precision + recall);
      return {
        kind: "classification" as const,
        model,
        tp,
        tn,
        fp,
        fn,
        accuracy,
        precision,
        recall,
        f1,
      };
    }
    const model = trainLinear(train);
    const ys = test.map((p) => p.y);
    const mean = ys.reduce((a, b) => a + b, 0) / Math.max(1, ys.length);
    let ae = 0,
      se = 0,
      sst = 0;
    for (const p of test) {
      const pred = model.w0 + model.w1 * p.x1 + model.w2 * p.x2;
      const e = pred - p.y;
      ae += Math.abs(e);
      se += e * e;
      sst += (p.y - mean) ** 2;
    }
    return {
      kind: "regression" as const,
      model,
      mae: ae / test.length,
      rmse: Math.sqrt(se / test.length),
      r2: 1 - se / Math.max(1e-12, sst),
    };
  }, [task, train, test, learningRate, epochs]);

  const W = 560,
    H = 330,
    P = 28;
  const sx = (x: number) => P + ((x + 1) / 2) * (W - 2 * P);
  const sy = (y: number) => H - P - ((y + 1) / 2) * (H - 2 * P);

  return (
    <div className="space-y-5">
      <section className="grid grid-cols-1 gap-5 lg:grid-cols-[340px_minmax(0,1fr)]">
        <div className="rounded-md border border-border bg-card p-4">
          <div className="font-mono text-xs uppercase tracking-[0.18em] text-primary">
            Experiment controls
          </div>
          <div className="mt-4 space-y-3">
            <label className="block font-mono text-[10px] uppercase text-muted-foreground">
              Task
              <select
                value={task}
                onChange={(e) => setTask(e.target.value as Task)}
                className={`${field} mt-1`}
              >
                <option value="classification">Binary classification</option>
                <option value="regression">Linear regression</option>
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="font-mono text-[10px] uppercase text-muted-foreground">
                Samples
                <input
                  type="number"
                  min={40}
                  max={600}
                  step={10}
                  value={samples}
                  onChange={(e) => setSamples(Number(e.target.value))}
                  className={`${field} mt-1`}
                />
              </label>
              <label className="font-mono text-[10px] uppercase text-muted-foreground">
                Seed
                <input
                  type="number"
                  min={0}
                  value={seed}
                  onChange={(e) => setSeed(Number(e.target.value))}
                  className={`${field} mt-1`}
                />
              </label>
              <label className="font-mono text-[10px] uppercase text-muted-foreground">
                Noise
                <input
                  type="number"
                  min={0}
                  max={1}
                  step={0.02}
                  value={noise}
                  onChange={(e) => setNoise(Number(e.target.value))}
                  className={`${field} mt-1`}
                />
              </label>
              {task === "classification" ? (
                <label className="font-mono text-[10px] uppercase text-muted-foreground">
                  Learning rate
                  <input
                    type="number"
                    min={0.01}
                    max={2}
                    step={0.05}
                    value={learningRate}
                    onChange={(e) => setLearningRate(Number(e.target.value))}
                    className={`${field} mt-1`}
                  />
                </label>
              ) : null}
              {task === "classification" ? (
                <label className="col-span-2 font-mono text-[10px] uppercase text-muted-foreground">
                  Epochs
                  <input
                    type="number"
                    min={20}
                    max={2000}
                    step={10}
                    value={epochs}
                    onChange={(e) => setEpochs(Number(e.target.value))}
                    className={`${field} mt-1`}
                  />
                </label>
              ) : null}
            </div>
            <Button
              type="button"
              variant="signal"
              className="w-full"
              onClick={() => setRunId((x) => x + 1)}
            >
              Run experiment #{runId + 1}
            </Button>
          </div>
          <div className="mt-4 rounded-sm border border-border bg-surface p-3 text-[11px] leading-5 text-muted-foreground">
            Browser-local training · 75/25 train/test split · active run seed {activeSeed}. Each RUN
            generates a fresh deterministic dataset.
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-md border border-border bg-card p-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <div className="font-mono text-xs uppercase tracking-[0.18em] text-primary">
                  Model performance
                </div>
                <h2 className="mt-2 text-xl font-semibold text-foreground">
                  {task === "classification" ? "Logistic Regression" : "Multiple Linear Regression"}
                </h2>
              </div>
              <div className="font-mono text-[10px] text-muted-foreground">
                train {train.length} · test {test.length}
              </div>
            </div>
            {result.kind === "classification" ? (
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Stat label="Accuracy" value={`${(result.accuracy * 100).toFixed(1)}%`} />
                <Stat label="Precision" value={`${(result.precision * 100).toFixed(1)}%`} />
                <Stat label="Recall" value={`${(result.recall * 100).toFixed(1)}%`} />
                <Stat label="F1" value={result.f1.toFixed(3)} />
              </div>
            ) : (
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <Stat label="MAE" value={result.mae.toFixed(4)} />
                <Stat label="RMSE" value={result.rmse.toFixed(4)} />
                <Stat label="R²" value={result.r2.toFixed(4)} />
              </div>
            )}
          </div>

          <div className="rounded-md border border-border bg-card p-4">
            <div className="font-mono text-xs uppercase tracking-[0.18em] text-primary">
              Dataset & decision surface
            </div>
            <svg
              viewBox={`0 0 ${W} ${H}`}
              className="mt-3 h-auto w-full rounded-sm border border-border bg-surface"
              role="img"
              aria-label="Machine learning synthetic dataset"
            >
              <line x1={P} x2={W - P} y1={H / 2} y2={H / 2} stroke="var(--border)" />
              <line x1={W / 2} x2={W / 2} y1={P} y2={H - P} stroke="var(--border)" />
              {task === "classification" &&
              result.kind === "classification" &&
              Math.abs(result.model.w2) > 1e-9
                ? (() => {
                    const y1 = -(result.model.w0 + result.model.w1 * -1) / result.model.w2;
                    const y2 = -(result.model.w0 + result.model.w1 * 1) / result.model.w2;
                    return (
                      <line
                        x1={sx(-1)}
                        x2={sx(1)}
                        y1={sy(y1)}
                        y2={sy(y2)}
                        stroke="var(--emerald)"
                        strokeWidth={2}
                        strokeDasharray="6 5"
                      />
                    );
                  })()
                : null}
              {data.map((p, i) => {
                const cy =
                  task === "classification" ? sy(p.x2) : sy(Math.max(-1, Math.min(1, p.y / 3)));
                return (
                  <circle
                    key={i}
                    cx={sx(p.x1)}
                    cy={cy}
                    r={3.5}
                    fill={
                      task === "classification"
                        ? p.y
                          ? "var(--primary)"
                          : "var(--amber)"
                        : "var(--primary)"
                    }
                    fillOpacity={i < split ? 0.72 : 0.3}
                  >
                    <title>{i < split ? "train" : "test"}</title>
                  </circle>
                );
              })}
            </svg>
            <div className="mt-2 flex flex-wrap gap-4 font-mono text-[10px] text-muted-foreground">
              <span>solid points = train</span>
              <span>faded points = test</span>
              {task === "classification" ? (
                <span>green dashed = learned boundary</span>
              ) : (
                <span>y-axis displays scaled target</span>
              )}
            </div>
          </div>
        </div>
      </section>

      {result.kind === "classification" ? (
        <section className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <div className="rounded-md border border-border bg-card p-4">
            <div className="font-mono text-xs uppercase tracking-[0.18em] text-primary">
              Confusion matrix
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 font-mono text-sm">
              <div className="rounded-sm border border-border bg-surface p-4">
                <div className="text-muted-foreground">True positive</div>
                <div className="mt-1 text-2xl text-foreground">{result.tp}</div>
              </div>
              <div className="rounded-sm border border-border bg-surface p-4">
                <div className="text-muted-foreground">False positive</div>
                <div className="mt-1 text-2xl text-foreground">{result.fp}</div>
              </div>
              <div className="rounded-sm border border-border bg-surface p-4">
                <div className="text-muted-foreground">False negative</div>
                <div className="mt-1 text-2xl text-foreground">{result.fn}</div>
              </div>
              <div className="rounded-sm border border-border bg-surface p-4">
                <div className="text-muted-foreground">True negative</div>
                <div className="mt-1 text-2xl text-foreground">{result.tn}</div>
              </div>
            </div>
          </div>
          <div className="rounded-md border border-border bg-card p-4">
            <div className="font-mono text-xs uppercase tracking-[0.18em] text-primary">
              Learned parameters
            </div>
            <div className="mt-4 space-y-2 font-mono text-xs text-foreground">
              <div>bias = {result.model.w0.toFixed(4)}</div>
              <div>w₁ = {result.model.w1.toFixed(4)}</div>
              <div>w₂ = {result.model.w2.toFixed(4)}</div>
              <div>final log-loss = {result.model.loss.at(-1)?.toFixed(4)}</div>
            </div>
            <p className="mt-4 text-xs leading-5 text-muted-foreground">
              Gradient descent optimises binary cross-entropy. Metrics are computed only on the
              held-out test set.
            </p>
          </div>
        </section>
      ) : (
        <section className="rounded-md border border-border bg-card p-4">
          <div className="font-mono text-xs uppercase tracking-[0.18em] text-primary">
            Learned regression equation
          </div>
          <div className="mt-3 break-words font-mono text-sm text-foreground">
            ŷ = {result.model.w0.toFixed(4)} + {result.model.w1.toFixed(4)}·x₁ +{" "}
            {result.model.w2.toFixed(4)}·x₂
          </div>
          <p className="mt-3 text-xs leading-5 text-muted-foreground">
            Coefficients are solved from the normal equations; MAE, RMSE and R² are evaluated on the
            held-out test set.
          </p>
        </section>
      )}

      <section className="rounded-md border border-primary/30 bg-primary/5 p-4 text-xs leading-5 text-muted-foreground">
        <strong className="text-primary">Classical ML benchmark.</strong> This lab demonstrates
        reproducible training, hold-out evaluation and transparent metrics. It is intentionally
        separate from the quantum machine-learning modules.
      </section>
    </div>
  );
}
