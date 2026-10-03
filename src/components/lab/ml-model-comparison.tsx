import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";

const field = "w-full rounded-sm border border-border bg-surface px-2 py-1.5 font-mono text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

type Point = { x1: number; x2: number; y: 0 | 1 };
type Metrics = { accuracy: number; precision: number; recall: number; f1: number };

type Tree =
  | { kind: "leaf"; value: 0 | 1 }
  | { kind: "node"; feature: "x1" | "x2"; threshold: number; left: Tree; right: Tree };

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

function makeData(n: number, noise: number, seed: number): Point[] {
  const random = rng(seed);
  return Array.from({ length: n }, () => {
    const x1 = random() * 2 - 1;
    const x2 = random() * 2 - 1;
    const nonlinear = 0.35 * Math.sin(3 * x1);
    const margin = 1.15 * x1 - 0.8 * x2 + nonlinear + 0.1 + gaussian(random) * noise;
    return { x1, x2, y: margin >= 0 ? 1 : 0 };
  });
}

const sigmoid = (z: number) => 1 / (1 + Math.exp(-Math.max(-30, Math.min(30, z))));

function trainLogistic(data: Point[], learningRate = 0.4, epochs = 300) {
  let w0 = 0, w1 = 0, w2 = 0;
  for (let epoch = 0; epoch < epochs; epoch++) {
    let g0 = 0, g1 = 0, g2 = 0;
    for (const p of data) {
      const e = sigmoid(w0 + w1 * p.x1 + w2 * p.x2) - p.y;
      g0 += e; g1 += e * p.x1; g2 += e * p.x2;
    }
    w0 -= learningRate * g0 / data.length;
    w1 -= learningRate * g1 / data.length;
    w2 -= learningRate * g2 / data.length;
  }
  return (p: Point) => (sigmoid(w0 + w1 * p.x1 + w2 * p.x2) >= 0.5 ? 1 : 0) as 0 | 1;
}

function predictKnn(train: Point[], p: Point, k: number): 0 | 1 {
  const nearest = train
    .map((q) => ({ d: (q.x1 - p.x1) ** 2 + (q.x2 - p.x2) ** 2, y: q.y }))
    .sort((a, b) => a.d - b.d)
    .slice(0, k);
  const votes = nearest.reduce((s, q) => s + q.y, 0);
  return votes >= nearest.length / 2 ? 1 : 0;
}

const gini = (rows: Point[]) => {
  if (!rows.length) return 0;
  const p = rows.reduce((s, r) => s + r.y, 0) / rows.length;
  return 1 - p * p - (1 - p) * (1 - p);
};

function majority(rows: Point[]): 0 | 1 {
  return rows.reduce((s, r) => s + r.y, 0) >= rows.length / 2 ? 1 : 0;
}

function buildTree(rows: Point[], depth: number, maxDepth: number, minLeaf = 6): Tree {
  if (depth >= maxDepth || rows.length <= minLeaf || gini(rows) < 1e-9) return { kind: "leaf", value: majority(rows) };
  let best: { feature: "x1" | "x2"; threshold: number; score: number; left: Point[]; right: Point[] } | null = null;
  for (const feature of ["x1", "x2"] as const) {
    const values = [...rows].sort((a, b) => a[feature] - b[feature]);
    const candidates: number[] = [];
    for (let i = 1; i < values.length; i += Math.max(1, Math.floor(values.length / 18))) {
      candidates.push((values[i - 1]![feature] + values[i]![feature]) / 2);
    }
    for (const threshold of candidates) {
      const left = rows.filter((r) => r[feature] < threshold);
      const right = rows.filter((r) => r[feature] >= threshold);
      if (left.length < minLeaf || right.length < minLeaf) continue;
      const score = (left.length * gini(left) + right.length * gini(right)) / rows.length;
      if (!best || score < best.score) best = { feature, threshold, score, left, right };
    }
  }
  if (!best) return { kind: "leaf", value: majority(rows) };
  return {
    kind: "node",
    feature: best.feature,
    threshold: best.threshold,
    left: buildTree(best.left, depth + 1, maxDepth, minLeaf),
    right: buildTree(best.right, depth + 1, maxDepth, minLeaf),
  };
}

function predictTree(tree: Tree, p: Point): 0 | 1 {
  if (tree.kind === "leaf") return tree.value;
  return p[tree.feature] < tree.threshold ? predictTree(tree.left, p) : predictTree(tree.right, p);
}

function metrics(test: Point[], predict: (p: Point) => 0 | 1): Metrics {
  let tp = 0, tn = 0, fp = 0, fn = 0;
  for (const p of test) {
    const y = predict(p);
    if (y === 1 && p.y === 1) tp++;
    else if (y === 0 && p.y === 0) tn++;
    else if (y === 1) fp++;
    else fn++;
  }
  const accuracy = (tp + tn) / Math.max(1, test.length);
  const precision = tp / Math.max(1, tp + fp);
  const recall = tp / Math.max(1, tp + fn);
  const f1 = (2 * precision * recall) / Math.max(1e-12, precision + recall);
  return { accuracy, precision, recall, f1 };
}

export function MlModelComparison() {
  const [samples, setSamples] = useState(240);
  const [noise, setNoise] = useState(0.22);
  const [seed, setSeed] = useState(42);
  const [k, setK] = useState(7);
  const [maxDepth, setMaxDepth] = useState(3);
  const [runId, setRunId] = useState(0);

  const result = useMemo(() => {
    const data = makeData(samples, noise, seed);
    const split = Math.floor(data.length * 0.75);
    const train = data.slice(0, split);
    const test = data.slice(split);
    const logistic = trainLogistic(train);
    const tree = buildTree(train, 0, maxDepth);
    const rows = [
      { name: "Logistic Regression", ...metrics(test, logistic) },
      { name: `k-NN (k=${k})`, ...metrics(test, (p) => predictKnn(train, p, k)) },
      { name: `Decision Tree (depth ${maxDepth})`, ...metrics(test, (p) => predictTree(tree, p)) },
    ];
    return { rows, train: train.length, test: test.length };
  }, [samples, noise, seed, k, maxDepth, runId]);

  return (
    <section className="rounded-md border border-border bg-card p-4 sm:p-5">
      <div className="font-mono text-xs uppercase tracking-[0.18em] text-primary">Model comparison benchmark</div>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">Logistic Regression vs k-NN vs Decision Tree</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">All three models use the same deterministic dataset and identical 75/25 hold-out split, so Accuracy, Precision, Recall and F1 are directly comparable.</p>
        </div>
        <div className="font-mono text-[10px] text-muted-foreground">train {result.train} · test {result.test}</div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-5">
        <label className="font-mono text-[10px] uppercase text-muted-foreground">Samples<input className={`${field} mt-1`} type="number" min={80} max={800} step={20} value={samples} onChange={(e) => setSamples(Number(e.target.value))} /></label>
        <label className="font-mono text-[10px] uppercase text-muted-foreground">Noise<input className={`${field} mt-1`} type="number" min={0} max={1} step={0.02} value={noise} onChange={(e) => setNoise(Number(e.target.value))} /></label>
        <label className="font-mono text-[10px] uppercase text-muted-foreground">Seed<input className={`${field} mt-1`} type="number" min={0} value={seed} onChange={(e) => setSeed(Number(e.target.value))} /></label>
        <label className="font-mono text-[10px] uppercase text-muted-foreground">k-NN k<input className={`${field} mt-1`} type="number" min={1} max={31} step={2} value={k} onChange={(e) => setK(Math.max(1, Number(e.target.value) | 1))} /></label>
        <label className="font-mono text-[10px] uppercase text-muted-foreground">Tree depth<input className={`${field} mt-1`} type="number" min={1} max={7} value={maxDepth} onChange={(e) => setMaxDepth(Number(e.target.value))} /></label>
      </div>
      <Button type="button" variant="signal" className="mt-3" onClick={() => setRunId((x) => x + 1)}>Run comparison</Button>

      <div className="mt-5 overflow-x-auto rounded-sm border border-border">
        <table className="min-w-[720px] w-full border-collapse font-mono text-[11px]">
          <thead className="bg-surface text-muted-foreground"><tr><th className="p-3 text-left">Model</th><th className="p-3 text-left">Accuracy</th><th className="p-3 text-left">Precision</th><th className="p-3 text-left">Recall</th><th className="p-3 text-left">F1</th></tr></thead>
          <tbody>
            {result.rows.map((row) => (
              <tr key={row.name} className="border-t border-border"><td className="p-3 text-foreground">{row.name}</td><td className="p-3 text-muted-foreground">{(row.accuracy * 100).toFixed(1)}%</td><td className="p-3 text-muted-foreground">{(row.precision * 100).toFixed(1)}%</td><td className="p-3 text-muted-foreground">{(row.recall * 100).toFixed(1)}%</td><td className="p-3 text-primary">{row.f1.toFixed(3)}</td></tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-[11px] leading-5 text-muted-foreground">Educational browser benchmark. Metrics are measured on held-out synthetic data; no claim is made that one model is universally superior.</p>
    </section>
  );
}
