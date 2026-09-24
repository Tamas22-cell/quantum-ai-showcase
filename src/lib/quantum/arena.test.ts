import { describe, expect, it } from "vitest";
import { arenaToCsv, arenaToJson, runArena, validateArenaConfig, type ArenaConfig } from "./benchmark";
import { greedyLocalSearch, randomSearch, simulatedAnnealing } from "./classical";
import { cutValue, exhaustiveMaxCut, GRAPH_PRESETS, randomGraph, validateGraph } from "./maxcut";
import { nelderMead } from "./optimize";
import { qaoaCircuit, qaoaExpectation, qaoaState } from "./qaoa";
import { createRng } from "./rng";
import { simulate } from "./circuit";
import { norm, probabilities } from "./statevector";

const preset = (id: string) => GRAPH_PRESETS.find((p) => p.id === id)!.graph;

describe("Max-Cut", () => {
  it("cut values and exact optima of known graphs", () => {
    expect(exhaustiveMaxCut(preset("triangle")).value).toBe(2);
    expect(exhaustiveMaxCut(preset("square")).value).toBe(4);
    expect(exhaustiveMaxCut(preset("square")).optimal.sort()).toEqual([0b0101, 0b1010]);
    expect(cutValue(preset("k4w"), 0b0011)).toBeCloseTo(1 + 2 + 2.5 + 1); // {0,1} vs {2,3}
  });
  it("rejects invalid graphs", () => {
    expect(validateGraph({ n: 3, edges: [{ u: 0, v: 0, w: 1 }] }).length).toBeGreaterThan(0);
    expect(validateGraph({ n: 3, edges: [{ u: 0, v: 1, w: -1 }] }).length).toBeGreaterThan(0);
    expect(validateGraph({ n: 3, edges: [{ u: 0, v: 1, w: 1 }, { u: 1, v: 0, w: 2 }] }).length).toBeGreaterThan(0);
    expect(validateGraph(preset("ring6"))).toEqual([]);
  });
});

describe("QAOA", () => {
  it("matches the analytic p=1 single-edge formula ⟨C⟩ = ½ + ½ sin4β sinγ", () => {
    const g = { n: 2, edges: [{ u: 0, v: 1, w: 1 }] };
    for (const [gm, b] of [[0.3, 0.2], [1.1, 0.7], [Math.PI / 2, Math.PI / 8], [2.5, 1.3]] as const)
      expect(qaoaExpectation(g, [gm], [b])).toBeCloseTo(0.5 + 0.5 * Math.sin(4 * b) * Math.sin(gm), 10);
    expect(qaoaExpectation(g, [Math.PI / 2], [Math.PI / 8])).toBeCloseTo(1, 10);
  });
  it("diagonal-phase simulation equals gate-level circuit on the shared engine", () => {
    const g = preset("k4w");
    const direct = probabilities(qaoaState(g, [0.4, 0.9], [0.3, 0.1]));
    const viaCircuit = probabilities(simulate(qaoaCircuit(g, [0.4, 0.9], [0.3, 0.1])));
    direct.forEach((p, i) => expect(p).toBeCloseTo(viaCircuit[i]!, 10));
    expect(norm(qaoaState(g, [0.4, 0.9], [0.3, 0.1]))).toBeCloseTo(1, 12);
  });
  it("γ=β=0 gives the uniform-average cut", () => {
    const g = preset("ring6");
    const avg = exhaustiveMaxCut(g).table.reduce((s, v) => s + v, 0) / 64;
    expect(qaoaExpectation(g, [0], [0])).toBeCloseTo(avg, 10);
  });
});

describe("Optimiser & classical heuristics", () => {
  it("Nelder–Mead finds the minimum of a quadratic", async () => {
    const r = await nelderMead((x) => (x[0]! - 1) ** 2 + (x[1]! + 2) ** 2, [0, 0], { maxIter: 500 });
    expect(r.x[0]).toBeCloseTo(1, 3); expect(r.x[1]).toBeCloseTo(-2, 3);
  });
  it("heuristics never exceed the optimum and are seed-reproducible", () => {
    const g = randomGraph(8, 0.5, createRng(7));
    const opt = exhaustiveMaxCut(g).value;
    for (const run of [(s: number) => greedyLocalSearch(g, 5, createRng(s)), (s: number) => simulatedAnnealing(g, 2000, createRng(s)), (s: number) => randomSearch(g, 100, createRng(s))]) {
      const a = run(11), b = run(11);
      expect(a.value).toBeLessThanOrEqual(opt + 1e-9);
      expect(a).toEqual(b);
      expect(cutValue(g, a.assignment)).toBeCloseTo(a.value);
    }
  });
});

describe("Arena benchmark", () => {
  const cfg: ArenaConfig = { graph: preset("square"), seed: 42, p: 1, restarts: 2, maxIter: 80, shots: 500, saSteps: 500, greedyRestarts: 3 };
  it("runs all algorithms, ratios are consistent, QAOA reaches the p=1 ring optimum ¾", async () => {
    const r = await runArena(cfg);
    expect(r.optimum).toBe(4);
    for (const a of r.results) {
      expect(a.ratio).toBeCloseTo(a.value / 4);
      expect(a.ratio).toBeLessThanOrEqual(1 + 1e-9);
    }
    // Known result: p=1 QAOA on even rings (2-regular) achieves ⟨C⟩/C_max = 3/4.
    expect(r.qaoa.expectationRatio).toBeCloseTo(0.75, 3);
    expect(Object.values(r.qaoa.counts).reduce((s, c) => s + c, 0)).toBe(500);
  });
  it("is reproducible for a fixed seed (except wall-clock time)", async () => {
    const strip = (r: Awaited<ReturnType<typeof runArena>>) => ({ q: r.qaoa, res: r.results.map(({ timeMs: _t, ...x }) => x) });
    expect(strip(await runArena(cfg))).toEqual(strip(await runArena(cfg)));
  });
  it("validates config and exports CSV/JSON", async () => {
    expect(validateArenaConfig({ ...cfg, p: 0 }).length).toBeGreaterThan(0);
    await expect(runArena({ ...cfg, shots: 0 })).rejects.toThrow();
    const r = await runArena(cfg);
    const csv = arenaToCsv(r).split("\n");
    expect(csv).toHaveLength(r.results.length + 1);
    expect(csv[0]).toContain("approx_ratio");
    expect(JSON.parse(arenaToJson(r)).disclaimer).toMatch(/No quantum hardware/);
  });
});
