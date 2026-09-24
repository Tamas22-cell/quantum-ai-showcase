import { describe, expect, it } from "vitest";
import {
  analyzeDistribution, costHamiltonianTerms, evaluateAngles, GRAPH_PRESETS, mixerHamiltonianTerms, qaoaExpectation,
  runQaoaLab, validateAngles, validateQaoaLabConfig, type Graph,
} from "@/lib/quantum";

const edge: Graph = { n: 2, edges: [{ u: 0, v: 1, w: 1 }] };
const square = GRAPH_PRESETS.find((p) => p.id === "square")!.graph;
const base = { graph: square, p: 1, seed: 7, restarts: 3, maxIter: 150 };

describe("QAOA Lab — math", () => {
  it("single edge p=1 matches analytic ⟨C⟩ = ½(1 + sin4β·sinγ)", () => {
    for (const [g, b] of [[0.3, 0.2], [1.1, -0.4], [Math.PI / 2, Math.PI / 8]] as const) {
      expect(evaluateAngles(edge, [g], [b]).expectation).toBeCloseTo(0.5 * (1 + Math.sin(4 * b) * Math.sin(g)), 10);
    }
  });
  it("γ=β=0 gives the uniform distribution and ⟨C⟩ = W/2", () => {
    const r = evaluateAngles(square, [0], [0]);
    r.probs.forEach((p) => expect(p).toBeCloseTo(1 / 16, 12));
    expect(r.expectation).toBeCloseTo(2, 12);
    expect(r.approxRatio).toBeCloseTo(0.5, 12);
  });
  it("distribution normalised; expectation agrees with engine", () => {
    const r = evaluateAngles(square, [0.4, 0.9], [0.3, 0.1]);
    expect(r.probs.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12);
    expect(r.expectation).toBeCloseTo(qaoaExpectation(square, [0.4, 0.9], [0.3, 0.1]), 12);
  });
  it("analysis finds optimal cuts and probability mass", () => {
    const probs = new Float64Array(16); probs[0b0101] = 0.75; probs[0] = 0.25;
    const a = analyzeDistribution(square, probs);
    expect(a.optimum).toBe(4);
    expect(a.optimalAssignments.sort((x, y) => x - y)).toEqual([5, 10]);
    expect(a.pOptimal).toBeCloseTo(0.75, 12);
    expect(a.expectation).toBeCloseTo(3, 12);
    expect(a.mostLikely.bits).toBe("0101");
  });
  it("Hamiltonian strings", () => {
    expect(costHamiltonianTerms(edge)).toBe("0.5·(I − Z0Z1)");
    expect(mixerHamiltonianTerms(3)).toBe("X0 + X1 + X2");
  });
});

describe("QAOA Lab — optimisation", () => {
  it("p=1 on the 4-cycle reaches the known optimum ratio 3/4", async () => {
    const r = await runQaoaLab(base);
    expect(r.approxRatio).toBeGreaterThan(0.749);
    expect(r.approxRatio).toBeLessThanOrEqual(1 + 1e-9);
    expect(r.history.length).toBeGreaterThan(0);
    for (let i = 1; i < r.history.length; i++) expect(r.history[i]!.best).toBeGreaterThanOrEqual(r.history[i - 1]!.best);
  });
  it("deeper circuits do not do worse (p=2 ≥ p=1 on weighted K4)", async () => {
    const g = GRAPH_PRESETS.find((p) => p.id === "k4w")!.graph;
    const r1 = await runQaoaLab({ ...base, graph: g, p: 1 });
    const r2 = await runQaoaLab({ ...base, graph: g, p: 2, restarts: 5 });
    expect(r2.expectation).toBeGreaterThanOrEqual(r1.expectation - 1e-6);
  });
  it("identical seeds reproduce identical results", async () => {
    const a = await runQaoaLab(base), b = await runQaoaLab(base);
    expect(a.gammas).toEqual(b.gammas); expect(a.betas).toEqual(b.betas);
    expect(Array.from(a.probs)).toEqual(Array.from(b.probs));
  });
  it("abort signal cancels", async () => {
    const ac = new AbortController(); ac.abort();
    await expect(runQaoaLab(base, { signal: ac.signal })).rejects.toThrow();
  });
});

describe("QAOA Lab — validation", () => {
  it("rejects bad configs", () => {
    expect(validateQaoaLabConfig(base)).toEqual([]);
    expect(validateQaoaLabConfig({ ...base, p: 0 }).length).toBe(1);
    expect(validateQaoaLabConfig({ ...base, p: 9 }).length).toBe(1);
    expect(validateQaoaLabConfig({ ...base, seed: -1 }).length).toBe(1);
    expect(validateQaoaLabConfig({ ...base, restarts: 1.5 }).length).toBe(1);
    expect(validateQaoaLabConfig({ ...base, graph: { n: 2, edges: [{ u: 0, v: 0, w: 1 }] } }).length).toBeGreaterThan(0);
    expect(validateQaoaLabConfig({ ...base, graph: { n: 2, edges: [{ u: 0, v: 1, w: -1 }] } }).length).toBeGreaterThan(0);
    expect(validateQaoaLabConfig({ ...base, graph: { n: 11, edges: [{ u: 0, v: 1, w: 1 }] } }).length).toBeGreaterThan(0);
  });
  it("runQaoaLab throws on invalid config instead of producing output", async () => {
    await expect(runQaoaLab({ ...base, p: 0 })).rejects.toThrow(RangeError);
  });
  it("validates angles", () => {
    expect(validateAngles([0.1], [0.2], 1)).toEqual([]);
    expect(validateAngles([0.1], [], 1).length).toBe(1);
    expect(validateAngles([NaN], [0], 1).length).toBe(1);
  });
});
