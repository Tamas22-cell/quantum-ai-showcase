/**
 * Quantum Portfolio Stress Lab — pure (UI-free) analysis layer.
 *
 * Research question: how does a QAOA-selected allocation behave under different market stress
 * regimes compared with the original and a classical mean-variance allocation?
 *
 * All asset parameters are SYNTHETIC (hand-set, illustrative). Covariances come from a 4-factor model
 * Σ = B·diag(f²)·Bᵀ + diag(ε²), which is positive semidefinite by construction. Scenarios shock the
 * expected returns, factor volatilities and risk-free rate. Nothing here is live data or advice.
 */
import { createRng } from "@/lib/quantum/rng";
import { runPortfolioQaoa, selectedIndices, type PortfolioData } from "@/lib/quantum/portfolio";

export type StressAsset = { ticker: string; name: string; kind: "Equity" | "ETF" | "Bond" | "Commodity" | "Crypto"; mu: number; idio: number; b: [number, number, number, number] };

/** Factor loadings b = [equity market, rates (duration), inflation, crypto]. */
export const STRESS_ASSETS: StressAsset[] = [
  { ticker: "SPX", name: "US large-cap index ETF", kind: "ETF", mu: 0.08, idio: 0.03, b: [1.0, -0.1, -0.2, 0.05] },
  { ticker: "NDX", name: "US tech index ETF", kind: "ETF", mu: 0.1, idio: 0.07, b: [1.25, -0.35, -0.3, 0.15] },
  { ticker: "AAPL", name: "Mega-cap equity", kind: "Equity", mu: 0.09, idio: 0.18, b: [1.1, -0.25, -0.2, 0.1] },
  { ticker: "XLE", name: "Energy sector ETF", kind: "ETF", mu: 0.07, idio: 0.15, b: [0.8, 0.1, 0.9, 0.0] },
  { ticker: "TLT", name: "Long Treasury ETF", kind: "Bond", mu: 0.035, idio: 0.03, b: [-0.2, 1.0, -0.6, 0.0] },
  { ticker: "GLD", name: "Gold ETF", kind: "Commodity", mu: 0.045, idio: 0.1, b: [0.05, 0.3, 0.8, 0.05] },
  { ticker: "BTC", name: "Bitcoin", kind: "Crypto", mu: 0.2, idio: 0.35, b: [0.6, -0.2, 0.1, 1.0] },
  { ticker: "ETH", name: "Ether", kind: "Crypto", mu: 0.22, idio: 0.45, b: [0.7, -0.25, 0.05, 1.15] },
];

export type ScenarioId = "baseline" | "crash" | "inflation" | "rates" | "crypto";
export type Scenario = { id: ScenarioId; label: string; rf: number; factorVol: [number, number, number, number]; factorShock: [number, number, number, number]; note: string };

const BASE_VOL: [number, number, number, number] = [0.16, 0.08, 0.05, 0.55];

/** factorShock is added to expected annual returns as B·shock; factorVol replaces the base factor vols. */
export const SCENARIOS: Scenario[] = [
  { id: "baseline", label: "Baseline / Normal", rf: 0.03, factorVol: BASE_VOL, factorShock: [0, 0, 0, 0], note: "Long-run synthetic assumptions; diversification behaves as expected." },
  { id: "crash", label: "Market Crash", rf: 0.02, factorVol: [0.38, 0.1, 0.05, 0.8], factorShock: [-0.3, 0.06, -0.02, -0.25], note: "Equity factor volatility more than doubles and returns turn sharply negative; duration and gold partially hedge." },
  { id: "inflation", label: "High Inflation", rf: 0.05, factorVol: [0.22, 0.12, 0.14, 0.6], factorShock: [-0.06, -0.08, 0.12, -0.02], note: "Inflation factor dominates: real assets gain, long bonds and long-duration equities lose." },
  { id: "rates", label: "Interest Rate Shock", rf: 0.055, factorVol: [0.22, 0.2, 0.07, 0.65], factorShock: [-0.05, -0.14, 0.02, -0.08], note: "Sudden repricing of the curve: duration-heavy assets and growth equities are hit hardest." },
  { id: "crypto", label: "Crypto Drawdown", rf: 0.03, factorVol: [0.18, 0.08, 0.05, 1.1], factorShock: [-0.02, 0, 0, -0.6], note: "Crypto factor collapses with doubled volatility; traditional assets are only mildly affected." },
];

export const getScenario = (id: ScenarioId) => SCENARIOS.find((s) => s.id === id)!;

export type Universe = { assets: StressAsset[]; mu: number[]; sigma: number[][]; rf: number };

/** Scenario-conditioned expected returns and covariance for a subset of assets. */
export function buildUniverse(tickers: string[], scenario: Scenario): Universe {
  const assets = STRESS_ASSETS.filter((a) => tickers.includes(a.ticker));
  const mu = assets.map((a) => a.mu + a.b.reduce((s, bk, k) => s + bk * scenario.factorShock[k]!, 0));
  const stressIdio = scenario.id === "baseline" ? 1 : 1.25;
  const sigma = assets.map((ai, i) => assets.map((aj, j) => {
    let c = 0;
    for (let k = 0; k < 4; k++) c += ai.b[k]! * aj.b[k]! * scenario.factorVol[k]! ** 2;
    if (i === j) c += (ai.idio * stressIdio) ** 2;
    return c;
  }));
  return { assets, mu, sigma, rf: scenario.rf };
}

export type Metrics = { ret: number; vol: number; sharpe: number; maxDrawdown: number; var95: number };

export function portfolioStats(u: Universe, w: number[]) {
  const ret = w.reduce((s, wi, i) => s + wi * u.mu[i]!, 0);
  let v = 0;
  for (let i = 0; i < w.length; i++) for (let j = 0; j < w.length; j++) v += w[i]! * w[j]! * u.sigma[i]![j]!;
  return { ret, vol: Math.sqrt(Math.max(0, v)) };
}

/**
 * Mean max drawdown over seeded one-year GBM paths of the portfolio (single-factor aggregation
 * using portfolio μ and σ; daily steps). Deterministic for a given seed.
 */
export function simulatedMaxDrawdown(ret: number, vol: number, seed = 7, paths = 200, days = 252) {
  const rng = createRng(seed);
  const dt = 1 / days, drift = (ret - 0.5 * vol * vol) * dt, sd = vol * Math.sqrt(dt);
  let total = 0;
  for (let p = 0; p < paths; p++) {
    let logV = 0, peak = 0, mdd = 0;
    for (let d = 0; d < days; d++) {
      // Box–Muller standard normal
      const z = Math.sqrt(-2 * Math.log(Math.max(1e-12, rng()))) * Math.cos(2 * Math.PI * rng());
      logV += drift + sd * z;
      if (logV > peak) peak = logV;
      mdd = Math.max(mdd, 1 - Math.exp(logV - peak));
    }
    total += mdd;
  }
  return total / paths;
}

export function metrics(u: Universe, w: number[], seed = 7): Metrics {
  const { ret, vol } = portfolioStats(u, w);
  return {
    ret, vol,
    sharpe: vol > 1e-9 ? (ret - u.rf) / vol : 0,
    maxDrawdown: simulatedMaxDrawdown(ret, vol, seed),
    var95: Math.max(0, 1.645 * vol - ret), // parametric 1-year 95% VaR (fraction of capital)
  };
}

/** Euclidean projection onto the probability simplex (long-only, fully invested). */
export function projectSimplex(v: number[]): number[] {
  const u = [...v].sort((a, b) => b - a);
  let css = 0, theta = 0;
  for (let i = 0; i < u.length; i++) {
    css += u[i]!;
    const t = (css - 1) / (i + 1);
    if (u[i]! - t > 0) theta = t;
  }
  return v.map((x) => Math.max(0, x - theta));
}

/** Long-only mean-variance: maximise μᵀw − (λ/2)·wᵀΣw via projected gradient ascent. */
export function meanVariance(mu: number[], sigma: number[][], lambda: number, iters = 3000): number[] {
  const n = mu.length;
  let w = Array(n).fill(1 / n) as number[];
  let maxEig = 0;
  for (let i = 0; i < n; i++) maxEig = Math.max(maxEig, sigma[i]!.reduce((s, x) => s + Math.abs(x), 0));
  const step = 1 / (lambda * maxEig + 1e-6);
  for (let t = 0; t < iters; t++) {
    const g = mu.map((m, i) => m - lambda * sigma[i]!.reduce((s, x, j) => s + x * w[j]!, 0));
    w = projectSimplex(w.map((wi, i) => wi + step * g[i]!));
  }
  return w;
}

/** Risk preference 1 (aggressive) … 10 (defensive) → risk-aversion λ. */
export const riskLambda = (pref: number) => 1 + (pref - 1) * 2;

export function normaliseWeights(w: number[]): number[] {
  const s = w.reduce((a, b) => a + Math.max(0, b), 0);
  return s > 0 ? w.map((x) => Math.max(0, x) / s) : w.map(() => 1 / w.length);
}

export type StressConfig = { tickers: string[]; weights: number[]; scenario: ScenarioId; riskPref: number; k: number; seed: number };
export type StressResult = {
  config: StressConfig; universe: Universe;
  /** Original weights evaluated under the Baseline regime — the pre-stress reference point. */
  baseline: Metrics;
  original: { w: number[]; m: Metrics };
  classical: { w: number[]; m: Metrics };
  qaoa: { w: number[]; m: Metrics; selected: string[]; pOptimal: number; pFeasible: number; matchesExact: boolean; source: string };
};

export function validateStress(c: StressConfig): string[] {
  const e: string[] = [];
  if (c.tickers.length < 3) e.push("Select at least 3 assets.");
  if (c.tickers.length > 8) e.push("Select at most 8 assets.");
  if (c.weights.length !== c.tickers.length) e.push("Weights must match selected assets.");
  if (c.weights.some((w) => !Number.isFinite(w) || w < 0)) e.push("Weights must be non-negative numbers.");
  if (c.weights.reduce((a, b) => a + b, 0) <= 0) e.push("At least one weight must be positive.");
  if (!Number.isInteger(c.k) || c.k < 2 || c.k > c.tickers.length - 1) e.push(`QAOA subset size K must be 2–${Math.max(2, c.tickers.length - 1)}.`);
  return e;
}

export async function runStressTest(c: StressConfig, opts: { signal?: AbortSignal } = {}): Promise<StressResult> {
  const errs = validateStress(c);
  if (errs.length) throw new RangeError(errs.join(" "));
  const scenario = getScenario(c.scenario);
  const u = buildUniverse(c.tickers, scenario);
  const lambda = riskLambda(c.riskPref);

  const wOrig = normaliseWeights(c.weights);
  const wClass = meanVariance(u.mu, u.sigma, lambda);

  // QAOA: choose K assets from the scenario-conditioned QUBO (simulated statevector, seeded).
  const data: PortfolioData = { names: u.assets.map((a) => a.ticker), mu: u.mu, sigma: u.sigma, source: "synthetic" };
  const model = { riskAversion: lambda / 2, k: c.k, penalty: 2 + lambda, excluded: [] as number[] };
  const q = await runPortfolioQaoa(data, model, { p: 2, seed: c.seed, restarts: 3, maxIter: 150, shots: 1024 }, opts);
  let x = q.sampledBest.feasible ? q.sampledBest.x : q.mostLikely.feasible ? q.mostLikely.x : q.exact.assignment;
  const source = q.sampledBest.feasible ? "best sampled bitstring" : q.mostLikely.feasible ? "most likely bitstring" : "exact fallback (no feasible sample)";
  if (x < 0) x = q.exact.assignment;
  const S = selectedIndices(x, u.assets.length);
  // Weight the QAOA-selected subset with the same mean-variance rule, restricted to S.
  const sub = meanVariance(S.map((i) => u.mu[i]!), S.map((i) => S.map((j) => u.sigma[i]![j]!)), lambda);
  const wQ = u.assets.map((_, i) => { const k = S.indexOf(i); return k >= 0 ? sub[k]! : 0; });

  return {
    config: structuredClone(c), universe: u,
    baseline: metrics(buildUniverse(c.tickers, getScenario("baseline")), wOrig, c.seed),
    original: { w: wOrig, m: metrics(u, wOrig, c.seed) },
    classical: { w: wClass, m: metrics(u, wClass, c.seed) },
    qaoa: { w: wQ, m: metrics(u, wQ, c.seed), selected: S.map((i) => u.assets[i]!.ticker), pOptimal: q.pOptimal, pFeasible: q.pFeasible, matchesExact: x === q.exact.assignment, source },
  };
}

/** Plain-language interpretation of how the regime moved the allocation/risk trade-off. */
export function interpret(r: StressResult): string[] {
  const s = getScenario(r.config.scenario);
  const top = (w: number[]) => r.universe.assets.map((a, i) => ({ t: a.ticker, w: w[i]! })).sort((a, b) => b.w - a.w).filter((x) => x.w > 0.005).slice(0, 3).map((x) => `${x.t} ${(x.w * 100).toFixed(0)}%`).join(", ");
  const pct = (v: number) => `${(v * 100).toFixed(1)}%`;
  const b = r.baseline, o = r.original.m;
  const lines = [
    `${s.label}: ${s.note}`,
    `Stress impact on the original portfolio: return ${pct(b.ret)} → ${pct(o.ret)}, volatility ${pct(b.vol)} → ${pct(o.vol)}, simulated max drawdown ${pct(b.maxDrawdown)} → ${pct(o.maxDrawdown)}.`,
    `Original allocation: return ${pct(r.original.m.ret)}, volatility ${pct(r.original.m.vol)}, simulated max drawdown ${pct(r.original.m.maxDrawdown)}.`,
    `Classical mean-variance shifts toward ${top(r.classical.w)} (Sharpe ${r.classical.m.sharpe.toFixed(2)} vs ${r.original.m.sharpe.toFixed(2)} original).`,
    `QAOA-selected subset {${r.qaoa.selected.join(", ")}} → ${top(r.qaoa.w)} (Sharpe ${r.qaoa.m.sharpe.toFixed(2)}). ${r.qaoa.matchesExact ? "The selection matches the exhaustive QUBO optimum." : "The selection differs from the exhaustive QUBO optimum."}`,
  ];
  const d = r.qaoa.m.sharpe - r.classical.m.sharpe;
  lines.push(Math.abs(d) < 0.02
    ? "QAOA and classical results are effectively equal here; a K-asset cardinality constraint costs little in this regime."
    : d < 0
      ? "The classical optimiser beats the cardinality-constrained QAOA portfolio in this regime — expected, since it can use every asset."
      : "The QAOA-selected subset scores a higher Sharpe here; this reflects the different objective and constraint, not a quantum advantage.");
  return lines;
}
