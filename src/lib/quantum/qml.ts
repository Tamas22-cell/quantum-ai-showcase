/**
 * Module 6 — Quantum Machine Learning Lab engine (UI-free).
 *
 * 2-qubit variational quantum classifier (VQC), simulated exactly on the shared statevector engine.
 * Per layer ℓ (data re-uploading):
 *   Ry(π·x₁) q0, Ry(π·x₂) q1          — angle encoding of features scaled to [-1, 1]
 *   Ry(θ) Rz(θ) on q0 and on q1        — 4 trainable parameters
 *   CNOT(q0 → q1)                      — entangling layer
 * Output: P(class 1) = P(q1 = 1) after the final CNOT. Because CNOT maps Z₁ → Z₀Z₁, this equals the odd-parity
 *   probability of the state just before the entangler, (1 − ⟨Z₀Z₁⟩)/2 — a non-linear readout that can express XOR.
 * Training minimises binary cross-entropy with the gradient-free Nelder–Mead optimiser (seeded init).
 * Ideal noiseless classical simulation — not quantum hardware; educational only.
 */
import type { Circuit, Op } from "./circuit";
import { simulate } from "./circuit";
import { nelderMead } from "./optimize";
import { createRng, type Rng } from "./rng";
import { probabilities } from "./statevector";

export type Sample = { x1: number; x2: number; y: 0 | 1 };
export type DatasetKind = "linear" | "xor" | "circle";
export const QML_MIN_SAMPLES = 8;
export const QML_MAX_SAMPLES = 200;
export const QML_MAX_DEPTH = 4;
export const QML_MAX_ITER = 500;
export const PARAMS_PER_LAYER = 4;
const EPS = 1e-9;

// ---------- datasets ----------
export function generateDataset(kind: DatasetKind, n: number, seed: number): Sample[] {
  const rng = createRng(seed);
  const u = () => rng() * 2 - 1;
  const out: Sample[] = [];
  while (out.length < n) {
    const x1 = u(),
      x2 = u();
    let y: 0 | 1;
    if (kind === "linear") {
      const m = x2 - 0.6 * x1 - 0.1;
      if (Math.abs(m) < 0.08) continue; // margin keeps the set linearly separable
      y = m > 0 ? 1 : 0;
    } else if (kind === "xor") {
      if (Math.abs(x1) < 0.1 || Math.abs(x2) < 0.1) continue;
      y = x1 * x2 > 0 ? 0 : 1;
    } else {
      const r2 = x1 * x1 + x2 * x2;
      if (Math.abs(r2 - 0.45) < 0.05) continue;
      y = r2 < 0.45 ? 1 : 0;
    }
    out.push({ x1: round(x1), x2: round(x2), y });
  }
  return out;
}
const round = (v: number) => Math.round(v * 1e4) / 1e4;

/** Seeded Fisher–Yates split; stratification is not applied (small-sample caveat shown in UI). */
export function trainTestSplit(
  data: Sample[],
  testFraction: number,
  seed: number,
): { train: Sample[]; test: Sample[] } {
  const idx = data.map((_, i) => i);
  const rng = createRng(seed);
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [idx[i], idx[j]] = [idx[j]!, idx[i]!];
  }
  const nTest = Math.max(1, Math.round(data.length * testFraction));
  return {
    test: idx.slice(0, nTest).map((i) => data[i]!),
    train: idx.slice(nTest).map((i) => data[i]!),
  };
}

/** Parse "x1,x2,label" lines. Returns readable per-line errors instead of throwing. */
export function parseSamples(text: string): { samples: Sample[]; errors: string[] } {
  const samples: Sample[] = [],
    errors: string[] = [];
  text.split(/\r?\n/).forEach((raw, i) => {
    const line = raw.trim();
    if (!line || line.startsWith("#")) return;
    const parts = line.split(/[,;\s]+/);
    if (parts.length !== 3) {
      errors.push(`Line ${i + 1}: expected "x1, x2, label".`);
      return;
    }
    const [a, b, c] = parts.map(Number) as [number, number, number];
    if (![a, b].every(Number.isFinite)) {
      errors.push(`Line ${i + 1}: features must be numbers.`);
      return;
    }
    if (Math.abs(a) > 1 || Math.abs(b) > 1) {
      errors.push(`Line ${i + 1}: features must lie in [-1, 1].`);
      return;
    }
    if (c !== 0 && c !== 1) {
      errors.push(`Line ${i + 1}: label must be 0 or 1.`);
      return;
    }
    samples.push({ x1: a, x2: b, y: c });
  });
  return { samples, errors };
}

export function validateDataset(d: Sample[]): string[] {
  const e: string[] = [];
  if (d.length < QML_MIN_SAMPLES || d.length > QML_MAX_SAMPLES)
    e.push(`Dataset must contain ${QML_MIN_SAMPLES}–${QML_MAX_SAMPLES} samples (has ${d.length}).`);
  d.forEach((s, i) => {
    if (
      !Number.isFinite(s.x1) ||
      !Number.isFinite(s.x2) ||
      Math.abs(s.x1) > 1 ||
      Math.abs(s.x2) > 1
    )
      e.push(`Sample ${i + 1}: features must be finite and in [-1, 1].`);
    if (s.y !== 0 && s.y !== 1) e.push(`Sample ${i + 1}: label must be 0 or 1.`);
  });
  if (d.length && (!d.some((s) => s.y === 0) || !d.some((s) => s.y === 1)))
    e.push("Both classes (0 and 1) must be present.");
  return e.slice(0, 8);
}

export type QmlConfig = { depth: number; maxIter: number; seed: number; testFraction: number };
export function validateQmlConfig(c: QmlConfig): string[] {
  const e: string[] = [];
  if (!Number.isInteger(c.depth) || c.depth < 1 || c.depth > QML_MAX_DEPTH)
    e.push(`Depth must be an integer 1–${QML_MAX_DEPTH}.`);
  if (!Number.isInteger(c.maxIter) || c.maxIter < 1 || c.maxIter > QML_MAX_ITER)
    e.push(`Iterations must be an integer 1–${QML_MAX_ITER}.`);
  if (!Number.isInteger(c.seed) || c.seed < 0) e.push("Seed must be a non-negative integer.");
  if (!Number.isFinite(c.testFraction) || c.testFraction < 0.1 || c.testFraction > 0.5)
    e.push("Test fraction must be between 0.1 and 0.5.");
  return e;
}

// ---------- quantum model ----------
/** Angle encoding: feature v ∈ [-1, 1] → rotation angle π·v ∈ [-π, π]. */
export const encodeAngle = (v: number) => Math.PI * v;

export function qmlCircuit(x1: number, x2: number, params: number[], depth: number): Circuit {
  if (params.length !== depth * PARAMS_PER_LAYER)
    throw new RangeError(`Expected ${depth * PARAMS_PER_LAYER} parameters.`);
  const ops: Op[] = [];
  for (let l = 0; l < depth; l++) {
    const p = params.slice(l * 4, l * 4 + 4) as [number, number, number, number];
    ops.push(
      { gate: "RY", qubits: [0], theta: encodeAngle(x1) },
      { gate: "RY", qubits: [1], theta: encodeAngle(x2) },
    );
    ops.push({ gate: "RY", qubits: [0], theta: p[0] }, { gate: "RZ", qubits: [0], theta: p[1] });
    ops.push({ gate: "RY", qubits: [1], theta: p[2] }, { gate: "RZ", qubits: [1], theta: p[3] });
    ops.push({ gate: "CNOT", qubits: [0, 1] });
  }
  return { numQubits: 2, ops };
}

/** Exact basis probabilities [p00, p01, p10, p11] (index = q1q0, little-endian). */
export function measurementProbs(
  x1: number,
  x2: number,
  params: number[],
  depth: number,
): number[] {
  return Array.from(probabilities(simulate(qmlCircuit(x1, x2, params, depth))));
}
/** P(class 1) = P(q1 = 1) = p(|10⟩) + p(|11⟩) (index = q1q0). */
export function predictProba(x1: number, x2: number, params: number[], depth: number): number {
  const p = measurementProbs(x1, x2, params, depth);
  return p[2]! + p[3]!;
}

export function bceLoss(probs: number[], labels: (0 | 1)[]): number {
  if (!probs.length) return NaN;
  let s = 0;
  probs.forEach((p, i) => {
    const q = Math.min(1 - EPS, Math.max(EPS, p));
    s -= labels[i] ? Math.log(q) : Math.log(1 - q);
  });
  return s / probs.length;
}
export function accuracy(probs: number[], labels: (0 | 1)[]): number {
  if (!probs.length) return NaN;
  return (
    probs.reduce((a, p, i) => a + ((p >= 0.5 ? 1 : 0) === labels[i] ? 1 : 0), 0) / probs.length
  );
}
/** [[TN, FP], [FN, TP]] with rows = actual class, columns = predicted class. */
export function confusionMatrix(
  probs: number[],
  labels: (0 | 1)[],
): [[number, number], [number, number]] {
  const m: [[number, number], [number, number]] = [
    [0, 0],
    [0, 0],
  ];
  probs.forEach((p, i) => {
    m[labels[i]!][p >= 0.5 ? 1 : 0]++;
  });
  return m;
}

export type HistoryPoint = { iter: number; loss: number; trainAcc: number; testAcc: number };
export type QmlResult = {
  params: number[];
  depth: number;
  history: HistoryPoint[];
  evaluations: number;
  trainLoss: number;
  testLoss: number;
  trainAcc: number;
  testAcc: number;
};

export function initParams(depth: number, rng: Rng): number[] {
  return Array.from({ length: depth * PARAMS_PER_LAYER }, () => (rng() * 2 - 1) * Math.PI);
}

export async function trainQml(
  train: Sample[],
  test: Sample[],
  cfg: QmlConfig,
  opts: {
    signal?: AbortSignal | undefined;
    onProgress?: (h: HistoryPoint) => void;
    yieldEvery?: number;
  } = {},
): Promise<QmlResult> {
  const errs = [...validateQmlConfig(cfg), ...(train.length ? [] : ["Training set is empty."])];
  if (errs.length) throw new Error(errs[0]);
  const yTr = train.map((s) => s.y),
    yTe = test.map((s) => s.y);
  const pred = (set: Sample[], p: number[]) =>
    set.map((s) => predictProba(s.x1, s.x2, p, cfg.depth));
  const history: HistoryPoint[] = [];
  let bestX: number[] = initParams(cfg.depth, createRng(cfg.seed));
  let bestF = Infinity;
  const f = (p: number[]) => {
    const v = bceLoss(pred(train, p), yTr);
    if (v < bestF) {
      bestF = v;
      bestX = p.slice();
    }
    return v;
  };
  const every = opts.yieldEvery ?? 4;
  const res = await nelderMead(f, bestX, {
    maxIter: cfg.maxIter,
    step: 0.6,
    tol: 1e-10,
    signal: opts.signal,
    onIter: async (best, it) => {
      const h: HistoryPoint = {
        iter: it + 1,
        loss: best,
        trainAcc: accuracy(pred(train, bestX), yTr),
        testAcc: test.length ? accuracy(pred(test, bestX), yTe) : NaN,
      };
      history.push(h);
      opts.onProgress?.(h);
      if (it % every === 0) await new Promise((r) => setTimeout(r, 0)); // keep the UI responsive
    },
  });
  const params = res.x;
  const pTr = pred(train, params),
    pTe = pred(test, params);
  return {
    params,
    depth: cfg.depth,
    history,
    evaluations: res.evaluations,
    trainLoss: bceLoss(pTr, yTr),
    testLoss: test.length ? bceLoss(pTe, yTe) : NaN,
    trainAcc: accuracy(pTr, yTr),
    testAcc: test.length ? accuracy(pTe, yTe) : NaN,
  };
}

// ---------- classical baseline: logistic regression ----------
export type LogReg = { w: number[]; b: number; quadratic: boolean };
export const logRegFeatures = (x1: number, x2: number, quadratic: boolean) =>
  quadratic ? [x1, x2, x1 * x1, x2 * x2, x1 * x2] : [x1, x2];
export const sigmoid = (z: number) => 1 / (1 + Math.exp(-z));
export function logRegPredict(m: LogReg, x1: number, x2: number): number {
  const f = logRegFeatures(x1, x2, m.quadratic);
  return sigmoid(f.reduce((a, v, i) => a + v * m.w[i]!, m.b));
}
/** Deterministic full-batch gradient descent from zero initialisation with small L2 regularisation. */
export function trainLogReg(
  data: Sample[],
  opts: { quadratic?: boolean; epochs?: number; lr?: number; l2?: number } = {},
): LogReg {
  const quadratic = opts.quadratic ?? false,
    epochs = opts.epochs ?? 2000,
    lr = opts.lr ?? 0.5,
    l2 = opts.l2 ?? 1e-3;
  const X = data.map((s) => logRegFeatures(s.x1, s.x2, quadratic));
  const d = X[0]?.length ?? (quadratic ? 5 : 2);
  const m: LogReg = { w: new Array(d).fill(0), b: 0, quadratic };
  const n = Math.max(1, data.length);
  for (let e = 0; e < epochs; e++) {
    const gw = new Array(d).fill(0);
    let gb = 0;
    X.forEach((f, i) => {
      const err = sigmoid(f.reduce((a, v, j) => a + v * m.w[j]!, m.b)) - data[i]!.y;
      f.forEach((v, j) => (gw[j] += err * v));
      gb += err;
    });
    m.w = m.w.map((w, j) => w - lr * (gw[j] / n + l2 * w));
    m.b -= lr * (gb / n);
  }
  return m;
}
