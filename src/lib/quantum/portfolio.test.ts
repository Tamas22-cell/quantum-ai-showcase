import { describe, expect, it } from "vitest";
import {
  buildQubo, exhaustivePortfolio, isFeasible, isingEnergy, isPositiveSemidefinite, parseReturnsCsv, popcount, portfolioMetrics,
  quboToIsing, quboValue, runPortfolioQaoa, syntheticData, validatePortfolio, validatePortfolioConfig, type PortfolioModel,
} from "@/lib/quantum";

const data = syntheticData(4, 11);
const model: PortfolioModel = { riskAversion: 2, k: 2, penalty: 1, excluded: [] };
const cfg = { p: 2, seed: 5, restarts: 3, maxIter: 150, shots: 2000 };

/** Direct evaluation of f(x) = q xᵀΣx − μᵀx + A(Σx − K)² + exclusion, independent of buildQubo. */
function direct(x: number, m = model, d = data) {
  const n = d.names.length, b = (i: number) => (x >> i) & 1;
  let v = 0;
  for (let i = 0; i < n; i++) { v -= d.mu[i]! * b(i); for (let j = 0; j < n; j++) v += m.riskAversion * d.sigma[i]![j]! * b(i) * b(j); }
  return v + m.penalty * (popcount(x) - m.k) ** 2;
}

describe("Portfolio — data", () => {
  it("synthetic data is seeded, symmetric and PSD", () => {
    expect(syntheticData(5, 3)).toEqual(syntheticData(5, 3));
    expect(syntheticData(5, 3)).not.toEqual(syntheticData(5, 4));
    expect(isPositiveSemidefinite(data.sigma)).toBe(true);
    expect(validatePortfolio(data, model)).toEqual([]);
  });
  it("CSV parser computes sample mean and covariance", () => {
    const r = parseReturnsCsv("A,B\n0.1,0.2\n0.3,0.0\n0.2,0.1");
    expect(r.errors).toEqual([]);
    expect(r.data!.mu[0]).toBeCloseTo(0.2, 12); expect(r.data!.mu[1]).toBeCloseTo(0.1, 12);
    expect(r.data!.sigma[0]![0]).toBeCloseTo(0.01, 12); expect(r.data!.sigma[0]![1]).toBeCloseTo(-0.01, 12);
  });
  it("CSV parser rejects malformed input", () => {
    expect(parseReturnsCsv("A,B\n0.1,0.2").errors.length).toBe(1);
    expect(parseReturnsCsv("A,B\n0.1,x\n0.2,0.1").errors.length).toBe(1);
    expect(parseReturnsCsv("A,B\n0.1\n0.2,0.1").errors.length).toBe(1);
    expect(parseReturnsCsv("A\n0.1\n0.2").errors.length).toBe(1);
  });
});

describe("Portfolio — QUBO / Ising", () => {
  it("QUBO equals the direct objective for every bitstring", () => {
    const q = buildQubo(data, model);
    for (let x = 0; x < 16; x++) expect(quboValue(q, x)).toBeCloseTo(direct(x), 10);
  });
  it("Ising energy equals QUBO for every bitstring", () => {
    const q = buildQubo(data, { ...model, excluded: [1] }), s = quboToIsing(q);
    for (let x = 0; x < 16; x++) expect(isingEnergy(s, x)).toBeCloseTo(quboValue(q, x), 10);
  });
  it("exhaustive optimum is feasible and matches brute force over K-subsets", () => {
    const q = buildQubo(data, model), ex = exhaustivePortfolio(q, model);
    expect(ex.feasible).toBe(true);
    let best = Infinity;
    for (let x = 0; x < 16; x++) if (popcount(x) === 2) best = Math.min(best, direct(x));
    expect(ex.value).toBeCloseTo(best, 10);
  });
  it("excluded assets are never selected in the optimum", () => {
    const m = { ...model, excluded: [0, 1] }, ex = exhaustivePortfolio(buildQubo(data, m), m);
    expect(ex.assignment).toBe(0b1100);
    expect(isFeasible(m, ex.assignment)).toBe(true);
  });
  it("equal-weight metrics", () => {
    const m = portfolioMetrics(data, 0b0011);
    expect(m.ret).toBeCloseTo((data.mu[0]! + data.mu[1]!) / 2, 12);
    expect(m.variance).toBeCloseTo((data.sigma[0]![0]! + data.sigma[1]![1]! + 2 * data.sigma[0]![1]!) / 4, 12);
  });
});

describe("Portfolio — QAOA", () => {
  it("normalised distribution, ⟨f⟩ ≥ exact optimum, history monotone", async () => {
    const r = await runPortfolioQaoa(data, model, cfg);
    expect(r.probs.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 10);
    expect(r.expectedObjective).toBeGreaterThanOrEqual(r.exact.value - 1e-9);
    expect(r.sampledBest.value).toBeGreaterThanOrEqual(r.exact.value - 1e-9);
    for (let i = 1; i < r.history.length; i++) expect(r.history[i]!.best).toBeLessThanOrEqual(r.history[i - 1]!.best + 1e-12);
    expect(r.counts.reduce((a, b) => a + b, 0)).toBe(cfg.shots);
  });
  it("QAOA concentrates probability on the optimum beyond uniform", async () => {
    const r = await runPortfolioQaoa(data, model, cfg);
    expect(r.pOptimal).toBeGreaterThan(1 / 16);
  });
  it("identical seeds reproduce identical results", async () => {
    const a = await runPortfolioQaoa(data, model, cfg), b = await runPortfolioQaoa(data, model, cfg);
    expect(a.gammas).toEqual(b.gammas); expect(a.betas).toEqual(b.betas);
    expect(Array.from(a.counts)).toEqual(Array.from(b.counts));
  });
  it("rejects invalid inputs", async () => {
    expect(validatePortfolio(data, { ...model, k: 0 }).length).toBeGreaterThan(0);
    expect(validatePortfolio(data, { ...model, k: 2, excluded: [0, 1, 2] }).length).toBeGreaterThan(0);
    expect(validatePortfolio({ ...data, sigma: [[1, 2, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]] }, model).length).toBeGreaterThan(0);
    expect(validatePortfolio({ ...data, sigma: [[1, 2, 0, 0], [2, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]] }, model)).toContain("Covariance matrix must be positive semidefinite.");
    expect(validatePortfolioConfig({ ...cfg, p: 9 }).length).toBe(1);
    await expect(runPortfolioQaoa(data, { ...model, penalty: 0 }, cfg)).rejects.toThrow(RangeError);
  });
});
