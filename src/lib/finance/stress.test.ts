import { describe, expect, it } from "vitest";
import {
  buildUniverse,
  getScenario,
  projectSimplex,
  runStressTest,
  simulatedMaxDrawdown,
  SCENARIOS,
  validateStress,
} from "./stress";

const tickers = ["SPX", "TLT", "GLD", "BTC", "XLE"];

describe("stress lab", () => {
  it("projects onto the simplex", () => {
    const w = projectSimplex([0.9, 0.5, -0.3]);
    expect(w.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 9);
    expect(Math.min(...w)).toBeGreaterThanOrEqual(0);
  });

  it("crash scenario lowers equity returns and raises volatility", () => {
    const b = buildUniverse(tickers, getScenario("baseline"));
    const c = buildUniverse(tickers, getScenario("crash"));
    expect(c.mu[0]!).toBeLessThan(b.mu[0]!);
    expect(c.sigma[0]![0]!).toBeGreaterThan(b.sigma[0]![0]!);
  });

  it("drawdown is deterministic and grows with volatility", () => {
    expect(simulatedMaxDrawdown(0.05, 0.2, 3)).toBe(simulatedMaxDrawdown(0.05, 0.2, 3));
    expect(simulatedMaxDrawdown(0.05, 0.4, 3)).toBeGreaterThan(simulatedMaxDrawdown(0.05, 0.1, 3));
  });

  it("validates config", () => {
    expect(
      validateStress({
        tickers: ["SPX", "TLT"],
        weights: [1, 1],
        scenario: "baseline",
        riskPref: 5,
        k: 2,
        seed: 1,
      }).length,
    ).toBeGreaterThan(0);
  });

  it("runs every scenario with valid weights and classical ≥ original in mean-variance utility", async () => {
    for (const s of SCENARIOS) {
      const r = await runStressTest({
        tickers,
        weights: [1, 1, 1, 1, 1],
        scenario: s.id,
        riskPref: 5,
        k: 3,
        seed: 11,
      });
      for (const w of [r.original.w, r.classical.w, r.qaoa.w])
        expect(w.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 6);
      expect(r.qaoa.selected.length).toBe(3);
      const lam = 9;
      const util = (m: { ret: number; vol: number }) => m.ret - (lam / 2) * m.vol ** 2;
      expect(util(r.classical.m)).toBeGreaterThanOrEqual(util(r.original.m) - 1e-6);
    }
  }, 30000);
});
