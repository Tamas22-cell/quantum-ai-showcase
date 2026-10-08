/**
 * Module 5 — Quantum Portfolio Optimizer (educational).
 * Binary asset selection as a QUBO, mapped to an Ising Hamiltonian and solved with QAOA on the
 * shared statevector engine, compared against exhaustive classical search.
 *
 * Model (x_i ∈ {0,1}, selected assets are equally weighted 1/K for reporting):
 *   f(x) = q · xᵀΣx − μᵀx + A · (Σ_i x_i − K)² + L · Σ_{i ∈ excluded} x_i
 * All data is synthetic or user-supplied; nothing here is live market data or investment advice.
 */
import { optimizeQaoa, qaoaState } from "./qaoa";
import { createRng, type Rng } from "./rng";
import { probabilities, sampleCounts, toBitstring } from "./statevector";

export const PORTFOLIO_MAX_ASSETS = 8;
export const PORTFOLIO_MAX_P = 4;

export type PortfolioData = {
  names: string[];
  mu: number[];
  sigma: number[][];
  source: "synthetic" | "user";
};
export type PortfolioModel = {
  riskAversion: number;
  k: number;
  penalty: number;
  excluded: number[];
};
export type Qubo = { n: number; Q: number[][]; offset: number }; // f(x) = Σ_{i≤j} Q_ij x_i x_j + offset (Q upper-triangular, diag = linear)
export type Ising = { n: number; h: number[]; J: number[][]; offset: number }; // E(z) = Σ h_i z_i + Σ_{i<j} J_ij z_i z_j + offset

/* ---------------- Data ---------------- */

/** Seeded synthetic data from a 1-factor model: Σ = ββᵀσ_m² + diag(σ_ε²), guaranteed PSD. */
export function syntheticData(n: number, seed: number): PortfolioData {
  const rng = createRng(seed);
  const beta = Array.from({ length: n }, () => 0.5 + rng());
  const idio = Array.from({ length: n }, () => 0.01 + 0.03 * rng());
  const sm2 = 0.02;
  const sigma = beta.map((bi, i) =>
    beta.map((bj, j) => +(bi * bj * sm2 + (i === j ? idio[i]! : 0)).toFixed(6)),
  );
  const mu = beta.map((b) => +(0.02 + 0.06 * b + 0.04 * (rng() - 0.5)).toFixed(4));
  return {
    names: Array.from({ length: n }, (_, i) => `SYN-${String.fromCharCode(65 + i)}`),
    mu,
    sigma,
    source: "synthetic",
  };
}

/**
 * Parse user CSV of periodic returns: header row = asset names, each following row = one period.
 * Returns sample mean and unbiased sample covariance.
 */
export function parseReturnsCsv(text: string): { data?: PortfolioData; errors: string[] } {
  const rows = text
    .trim()
    .split(/\r?\n/)
    .map((r) => r.split(/[,;\t]/).map((c) => c.trim()))
    .filter((r) => r.some((c) => c));
  if (rows.length < 3) return { errors: ["Need a header row and at least 2 return rows."] };
  const names = rows[0]!;
  const n = names.length;
  if (n < 2 || n > PORTFOLIO_MAX_ASSETS)
    return { errors: [`Need 2–${PORTFOLIO_MAX_ASSETS} asset columns.`] };
  if (names.some((x) => !x || x.length > 16))
    return { errors: ["Asset names must be 1–16 characters."] };
  const data: number[][] = [];
  for (let r = 1; r < rows.length; r++) {
    if (rows[r]!.length !== n)
      return { errors: [`Row ${r + 1} has ${rows[r]!.length} values, expected ${n}.`] };
    const vals = rows[r]!.map(Number);
    if (!vals.every((v) => Number.isFinite(v) && Math.abs(v) < 10))
      return {
        errors: [`Row ${r + 1} contains a non-numeric or implausible return (|r| must be < 10).`],
      };
    data.push(vals);
  }
  const T = data.length;
  const mu = names.map((_, i) => data.reduce((s, row) => s + row[i]!, 0) / T);
  const sigma = names.map((_, i) =>
    names.map(
      (_, j) => data.reduce((s, row) => s + (row[i]! - mu[i]!) * (row[j]! - mu[j]!), 0) / (T - 1),
    ),
  );
  return { data: { names, mu, sigma, source: "user" }, errors: [] };
}

/** Cholesky-based PSD check with a small tolerance (jitter). */
export function isPositiveSemidefinite(S: number[][], tol = 1e-10): boolean {
  const n = S.length,
    Lm = Array.from({ length: n }, () => new Array<number>(n).fill(0));
  for (let i = 0; i < n; i++)
    for (let j = 0; j <= i; j++) {
      let s = S[i]![j]! + (i === j ? tol : 0);
      for (let k = 0; k < j; k++) s -= Lm[i]![k]! * Lm[j]![k]!;
      if (i === j) {
        if (s < 0) return false;
        Lm[i]![i] = Math.sqrt(s);
      } else Lm[i]![j] = Lm[j]![j]! > 0 ? s / Lm[j]![j]! : 0;
    }
  return true;
}

export function validatePortfolio(d: PortfolioData, m: PortfolioModel): string[] {
  const e: string[] = [];
  const n = d.names.length;
  if (n < 2 || n > PORTFOLIO_MAX_ASSETS)
    e.push(`Number of assets must be 2–${PORTFOLIO_MAX_ASSETS}.`);
  if (new Set(d.names).size !== n) e.push("Asset names must be unique.");
  if (d.mu.length !== n || !d.mu.every(Number.isFinite))
    e.push("Expected returns must be finite numbers, one per asset.");
  if (d.sigma.length !== n || d.sigma.some((r) => r.length !== n || !r.every(Number.isFinite)))
    e.push("Covariance must be an n×n matrix of finite numbers.");
  else {
    if (d.sigma.some((r, i) => r.some((v, j) => Math.abs(v - d.sigma[j]![i]!) > 1e-9)))
      e.push("Covariance matrix must be symmetric.");
    else if (!isPositiveSemidefinite(d.sigma))
      e.push("Covariance matrix must be positive semidefinite.");
    if (d.sigma.some((r, i) => r[i]! < 0)) e.push("Variances (diagonal) must be non-negative.");
  }
  if (!Number.isFinite(m.riskAversion) || m.riskAversion < 0 || m.riskAversion > 100)
    e.push("Risk aversion q must be 0–100.");
  if (!Number.isInteger(m.k) || m.k < 1 || m.k > n)
    e.push(`Portfolio size K must be an integer 1–${n}.`);
  if (!Number.isFinite(m.penalty) || m.penalty <= 0 || m.penalty > 1000)
    e.push("Constraint penalty A must be in (0, 1000].");
  if (m.excluded.some((i) => !Number.isInteger(i) || i < 0 || i >= n))
    e.push("Excluded asset index out of range.");
  if (n - new Set(m.excluded).size < m.k) e.push("Too many excluded assets to select K.");
  return e;
}

/* ---------------- QUBO / Ising ---------------- */

export function buildQubo(d: PortfolioData, m: PortfolioModel): Qubo {
  const n = d.names.length,
    A = m.penalty,
    K = m.k;
  const L = excludePenalty(d, m);
  const Q = Array.from({ length: n }, () => new Array<number>(n).fill(0));
  for (let i = 0; i < n; i++) {
    // x_i² = x_i: diagonal risk, −μ_i, penalty A(1 − 2K), exclusion L
    Q[i]![i] =
      m.riskAversion * d.sigma[i]![i]! -
      d.mu[i]! +
      A * (1 - 2 * K) +
      (m.excluded.includes(i) ? L : 0);
    for (let j = i + 1; j < n; j++) Q[i]![j] = 2 * m.riskAversion * d.sigma[i]![j]! + 2 * A;
  }
  return { n, Q, offset: A * K * K };
}

/** Exclusion penalty large enough that selecting an excluded asset never helps. */
function excludePenalty(d: PortfolioData, m: PortfolioModel) {
  const scale =
    d.mu.reduce((s, v) => s + Math.abs(v), 0) +
    m.riskAversion * d.sigma.flat().reduce((s, v) => s + Math.abs(v), 0);
  return 2 * (scale + m.penalty * d.names.length) + 1;
}

export function quboValue(q: Qubo, x: number): number {
  let v = q.offset;
  for (let i = 0; i < q.n; i++)
    if ((x >> i) & 1) for (let j = i; j < q.n; j++) if ((x >> j) & 1) v += q.Q[i]![j]!;
  return v;
}

/** x_i = (1 − z_i)/2, z_i ∈ {+1,−1} (z = +1 ↔ bit 0, the Qiskit convention). */
export function quboToIsing(q: Qubo): Ising {
  const n = q.n,
    h = new Array<number>(n).fill(0),
    J = Array.from({ length: n }, () => new Array<number>(n).fill(0));
  let offset = q.offset;
  for (let i = 0; i < n; i++) {
    const a = q.Q[i]![i]!;
    offset += a / 2;
    h[i] = h[i]! - a / 2;
    for (let j = i + 1; j < n; j++) {
      const b = q.Q[i]![j]!;
      offset += b / 4;
      h[i] = h[i]! - b / 4;
      h[j] = h[j]! - b / 4;
      J[i]![j] = b / 4;
    }
  }
  return { n, h, J, offset };
}

export function isingEnergy(s: Ising, x: number): number {
  const z = (i: number) => ((x >> i) & 1 ? -1 : 1);
  let e = s.offset;
  for (let i = 0; i < s.n; i++) {
    e += s.h[i]! * z(i);
    for (let j = i + 1; j < s.n; j++) e += s.J[i]![j]! * z(i) * z(j);
  }
  return e;
}

export function isingTerms(s: Ising, digits = 4): string {
  const f = (v: number) => (v >= 0 ? "+ " : "− ") + Math.abs(v).toFixed(digits);
  const parts = [s.offset.toFixed(digits)];
  s.h.forEach((v, i) => {
    if (Math.abs(v) > 1e-12) parts.push(`${f(v)}·Z${i}`);
  });
  for (let i = 0; i < s.n; i++)
    for (let j = i + 1; j < s.n; j++)
      if (Math.abs(s.J[i]![j]!) > 1e-12) parts.push(`${f(s.J[i]![j]!)}·Z${i}Z${j}`);
  return parts.join(" ");
}

/* ---------------- Portfolio metrics & exhaustive baseline ---------------- */

export const popcount = (x: number) => {
  let c = 0;
  while (x) {
    c += x & 1;
    x >>>= 1;
  }
  return c;
};
export const selectedIndices = (x: number, n: number) =>
  Array.from({ length: n }, (_, i) => i).filter((i) => (x >> i) & 1);

/** Equal-weight (1/|S|) portfolio return and risk for a selection. */
export function portfolioMetrics(d: PortfolioData, x: number) {
  const S = selectedIndices(x, d.names.length);
  if (!S.length) return { ret: 0, variance: 0, vol: 0, weights: d.names.map(() => 0) };
  const w = 1 / S.length;
  const ret = S.reduce((s, i) => s + w * d.mu[i]!, 0);
  let variance = 0;
  for (const i of S) for (const j of S) variance += w * w * d.sigma[i]![j]!;
  return {
    ret,
    variance,
    vol: Math.sqrt(Math.max(0, variance)),
    weights: d.names.map((_, i) => (S.includes(i) ? w : 0)),
  };
}

export const isFeasible = (m: PortfolioModel, x: number) =>
  popcount(x) === m.k && !m.excluded.some((i) => (x >> i) & 1);

export function exhaustivePortfolio(q: Qubo, m: PortfolioModel) {
  const dim = 1 << q.n,
    table = new Float64Array(dim);
  let best = Infinity,
    arg = 0;
  for (let x = 0; x < dim; x++) {
    table[x] = quboValue(q, x);
    if (table[x]! < best - 1e-12) {
      best = table[x]!;
      arg = x;
    }
  }
  const optimal: number[] = [];
  for (let x = 0; x < dim; x++) if (Math.abs(table[x]! - best) < 1e-9) optimal.push(x);
  return { table, value: best, assignment: arg, optimal, feasible: isFeasible(m, arg) };
}

/* ---------------- QAOA ---------------- */

export type PortfolioConfig = {
  p: number;
  seed: number;
  restarts: number;
  maxIter: number;
  shots: number;
};

export function validatePortfolioConfig(c: PortfolioConfig): string[] {
  const e: string[] = [];
  if (!Number.isInteger(c.p) || c.p < 1 || c.p > PORTFOLIO_MAX_P)
    e.push(`Depth p must be an integer 1–${PORTFOLIO_MAX_P}.`);
  if (!Number.isInteger(c.seed) || c.seed < 0 || c.seed > 4294967295)
    e.push("Seed must be an integer 0–4294967295.");
  if (!Number.isInteger(c.restarts) || c.restarts < 1 || c.restarts > 20)
    e.push("Restarts must be an integer 1–20.");
  if (!Number.isInteger(c.maxIter) || c.maxIter < 10 || c.maxIter > 1000)
    e.push("Iterations must be an integer 10–1000.");
  if (!Number.isInteger(c.shots) || c.shots < 1 || c.shots > 100000)
    e.push("Shots must be an integer 1–100,000.");
  return e;
}

/**
 * QAOA minimising f. The shared engine maximises ⟨table⟩, so we feed a normalised reward
 * r(x) = (f_max − f(x)) / (f_max − f_min) ∈ [0,1]. γ is therefore in normalised-cost units.
 */
export function rewardTable(table: Float64Array) {
  let lo = Infinity,
    hi = -Infinity;
  for (const v of table) {
    lo = Math.min(lo, v);
    hi = Math.max(hi, v);
  }
  const span = hi - lo || 1;
  return { reward: table.map((v) => (hi - v) / span), lo, hi, span };
}

export type PortfolioResult = {
  config: PortfolioConfig;
  model: PortfolioModel;
  gammas: number[];
  betas: number[];
  probs: Float64Array;
  expectedObjective: number; // ⟨f⟩ under the QAOA state
  exact: { value: number; assignment: number; feasible: boolean };
  pOptimal: number;
  pFeasible: number;
  sampledBest: { x: number; value: number; count: number; feasible: boolean };
  mostLikely: { x: number; prob: number; value: number; feasible: boolean };
  counts: Uint32Array;
  history: { evals: number; best: number }[]; // best ⟨f⟩ so far
  evaluations: number;
};

export async function runPortfolioQaoa(
  d: PortfolioData,
  m: PortfolioModel,
  c: PortfolioConfig,
  opts: { signal?: AbortSignal; onProgress?: (f: number) => void } = {},
): Promise<PortfolioResult> {
  const errs = [...validatePortfolio(d, m), ...validatePortfolioConfig(c)];
  if (errs.length) throw new RangeError(errs.join(" "));
  const q = buildQubo(d, m);
  const ex = exhaustivePortfolio(q, m);
  const { reward, hi, span } = rewardTable(ex.table);
  const graphStub = { n: q.n, edges: [] as never[] };
  const run = await optimizeQaoaTable(graphStub, reward, c, createRng(c.seed), opts);
  const probs = run.probs;
  const toObj = (r: number) => hi - r * span;
  let exp = 0,
    pOpt = 0,
    pFeas = 0;
  const opt = new Set(ex.optimal);
  for (let x = 0; x < probs.length; x++) {
    exp += probs[x]! * ex.table[x]!;
    if (opt.has(x)) pOpt += probs[x]!;
    if (isFeasible(m, x)) pFeas += probs[x]!;
  }
  const counts = sampleCounts(probs, c.shots, createRng((c.seed ^ 0x5eed) >>> 0));
  let sb = -1;
  for (let x = 0; x < counts.length; x++)
    if (counts[x]! > 0 && (sb < 0 || ex.table[x]! < ex.table[sb]!)) sb = x;
  let ml = 0;
  for (let x = 1; x < probs.length; x++) if (probs[x]! > probs[ml]!) ml = x;
  return {
    config: { ...c },
    model: structuredClone(m),
    gammas: run.gammas,
    betas: run.betas,
    probs,
    expectedObjective: exp,
    exact: { value: ex.value, assignment: ex.assignment, feasible: ex.feasible },
    pOptimal: pOpt,
    pFeasible: pFeas,
    sampledBest: { x: sb, value: ex.table[sb]!, count: counts[sb]!, feasible: isFeasible(m, sb) },
    mostLikely: { x: ml, prob: probs[ml]!, value: ex.table[ml]!, feasible: isFeasible(m, ml) },
    counts,
    history: run.history.map((h) => ({ evals: h.evals, best: toObj(h.best) })),
    evaluations: run.evaluations,
  };
}

/** Thin wrapper: optimizeQaoa over an arbitrary diagonal reward table (same seeded Nelder–Mead engine). */
async function optimizeQaoaTable(
  g: { n: number; edges: never[] },
  reward: Float64Array,
  c: PortfolioConfig,
  rng: Rng,
  opts: { signal?: AbortSignal; onProgress?: (f: number) => void },
) {
  return optimizeQaoa(g, {
    p: c.p,
    restarts: c.restarts,
    maxIter: c.maxIter,
    rng,
    signal: opts.signal,
    onProgress: (f) => opts.onProgress?.(f),
    table: reward,
  });
}

/** Exact state probabilities for manually chosen angles. */
export function portfolioStateProbs(
  n: number,
  reward: Float64Array,
  gammas: number[],
  betas: number[],
) {
  return probabilities(qaoaState({ n, edges: [] }, gammas, betas, reward));
}

export const bits = toBitstring;
