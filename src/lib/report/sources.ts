/**
 * Experiment runners for the Report Generator. Each runs the SAME tested engine the corresponding lab uses,
 * with seeded settings, and returns a typed snapshot. Everything executes locally in the browser.
 */
import {
  EXAMPLE_CIRCUITS, GRAPH_PRESETS, HAMILTONIAN_PRESETS, OPTIMAL_CHSH, createRng, probabilities, sampleCounts, simulate, measuredQubits,
  marginal, bellCircuit, jointProbabilities, correlator, runChsh, runQaoaLab, runVqe, syntheticData, runPortfolioQaoa, generateDataset,
  trainTestSplit, trainQml, trainLogReg, logRegPredict, accuracy, predictProba, confusionMatrix, runArena,
  type BellState, type Circuit, type ChshResult, type QaoaLabResult, type VqeResult, type PortfolioData, type PortfolioModel,
  type PortfolioResult, type QmlResult, type Sample, type ArenaResult, type OptimizerName, type DatasetKind,
} from "@/lib/quantum";
import { DEMO_UNIVERSE, RANGES, demoPrices, runFinanceExperiment, type FinanceExperiment, type RangeId } from "@/lib/finance";
import type { ReportModuleId } from "./types";

export type CircuitSnapshot = { kind: "circuit"; exampleId: string; circuit: Circuit; seed: number; shots: number; probs: number[]; counts: number[]; measured: number[] };
export type EntanglementSnapshot = { kind: "entanglement"; state: BellState; seed: number; shots: number; zzProbs: number[]; correlations: { a: string; b: string; E: number }[]; chsh: ChshResult };
export type QaoaSnapshot = { kind: "qaoa"; presetId: string; result: QaoaLabResult };
export type VqeSnapshot = { kind: "vqe"; presetId: string; result: VqeResult };
export type PortfolioSnapshot = { kind: "portfolio"; data: PortfolioData; model: PortfolioModel; result: PortfolioResult };
export type QmlSnapshot = { kind: "qml"; seed: number; dataset: DatasetKind; n: number; testFraction: number; train: Sample[]; test: Sample[]; result: QmlResult; baseline: { trainAcc: number; testAcc: number; quadratic: boolean }; confusionTest: [[number, number], [number, number]] };
export type ArenaSnapshot = { kind: "arena"; presetId: string; result: ArenaResult };

export type FinanceSnapshot = { kind: "finance"; experiment: FinanceExperiment };

export type Snapshot = FinanceSnapshot | CircuitSnapshot | EntanglementSnapshot | QaoaSnapshot | VqeSnapshot | PortfolioSnapshot | QmlSnapshot | ArenaSnapshot;

export type FieldSpec = { key: string; label: string; kind: "int" | "number" | "select"; min?: number; max?: number; step?: number; options?: { value: string; label: string }[] };
export type Settings = Record<string, string | number>;

const graphOpts = GRAPH_PRESETS.map((g) => ({ value: g.id, label: g.name }));
const seedField: FieldSpec = { key: "seed", label: "Seed", kind: "int", min: 0, max: 2 ** 31 - 1 };

export const SOURCES: Record<ReportModuleId, { name: string; route: string; fields: FieldSpec[]; defaults: Settings }> = {
  circuit: {
    name: "Quantum Circuit Builder", route: "/lab/circuit-builder",
    fields: [{ key: "exampleId", label: "Circuit", kind: "select", options: EXAMPLE_CIRCUITS.map((c) => ({ value: c.id, label: c.name })) }, { key: "shots", label: "Shots", kind: "int", min: 1, max: 100000 }, seedField],
    defaults: { exampleId: "bell", shots: 1024, seed: 42 },
  },
  entanglement: {
    name: "Quantum Entanglement Lab", route: "/lab/entanglement",
    fields: [{ key: "state", label: "Bell state", kind: "select", options: [{ value: "phi+", label: "Φ+" }, { value: "phi-", label: "Φ−" }, { value: "psi+", label: "Ψ+" }, { value: "psi-", label: "Ψ−" }] }, { key: "shots", label: "Shots per setting", kind: "int", min: 1, max: 100000 }, seedField],
    defaults: { state: "phi+", shots: 2000, seed: 42 },
  },
  qaoa: {
    name: "QAOA Optimization Lab", route: "/lab/qaoa",
    fields: [{ key: "presetId", label: "Graph", kind: "select", options: graphOpts }, { key: "p", label: "Depth p", kind: "int", min: 1, max: 5 }, { key: "restarts", label: "Restarts", kind: "int", min: 1, max: 20 }, { key: "maxIter", label: "Max iterations", kind: "int", min: 10, max: 1000 }, seedField],
    defaults: { presetId: "k4w", p: 1, restarts: 3, maxIter: 150, seed: 42 },
  },
  vqe: {
    name: "VQE Research Lab", route: "/lab/vqe",
    fields: [
      { key: "presetId", label: "Hamiltonian", kind: "select", options: HAMILTONIAN_PRESETS.map((h) => ({ value: h.id, label: h.name })) },
      { key: "optimizer", label: "Optimizer", kind: "select", options: [{ value: "nelder-mead", label: "Nelder–Mead" }, { value: "cobyla", label: "COBYLA (simplified)" }, { value: "spsa", label: "SPSA" }] },
      { key: "depth", label: "Ansatz depth", kind: "int", min: 1, max: 6 }, { key: "maxIter", label: "Max iterations", kind: "int", min: 10, max: 2000 }, { key: "restarts", label: "Restarts", kind: "int", min: 1, max: 10 }, seedField,
    ],
    defaults: { presetId: "h2", optimizer: "nelder-mead", depth: 1, maxIter: 200, restarts: 3, seed: 42 },
  },
  portfolio: {
    name: "Quantum Portfolio Optimizer", route: "/lab/portfolio",
    fields: [{ key: "assets", label: "Assets (synthetic)", kind: "int", min: 2, max: 8 }, { key: "k", label: "Select K", kind: "int", min: 1, max: 7 }, { key: "riskAversion", label: "Risk aversion q", kind: "number", min: 0, max: 100, step: 0.5 }, { key: "penalty", label: "Penalty A", kind: "number", min: 0.1, max: 100, step: 0.1 }, { key: "p", label: "QAOA depth p", kind: "int", min: 1, max: 5 }, seedField],
    defaults: { assets: 5, k: 2, riskAversion: 2, penalty: 1, p: 2, seed: 42 },
  },
  qml: {
    name: "Quantum Machine Learning Lab", route: "/lab/qml",
    fields: [{ key: "dataset", label: "Dataset", kind: "select", options: [{ value: "linear", label: "Linear" }, { value: "xor", label: "XOR" }, { value: "circle", label: "Circle" }] }, { key: "n", label: "Samples", kind: "int", min: 8, max: 200 }, { key: "depth", label: "Depth", kind: "int", min: 1, max: 4 }, { key: "maxIter", label: "Iterations", kind: "int", min: 1, max: 500 }, seedField],
    defaults: { dataset: "xor", n: 60, depth: 1, maxIter: 150, seed: 7 },
  },
  arena: {
    name: "Quantum vs Classical Arena", route: "/lab/arena",
    fields: [{ key: "presetId", label: "Graph", kind: "select", options: graphOpts }, { key: "p", label: "QAOA depth p", kind: "int", min: 1, max: 5 }, seedField],
    defaults: { presetId: "k4w", p: 2, seed: 42 },
  },
  finance: {
    name: "Live Quantum Finance Lab", route: "/lab/finance",
    fields: [{ key: "assets", label: "Synthetic assets", kind: "int", min: 2, max: 8 }, { key: "range", label: "Time range", kind: "select", options: RANGES.map((r) => ({ value: r.id, label: r.label })) }, { key: "k", label: "Select K", kind: "int", min: 1, max: 7 }, { key: "riskAversion", label: "Risk aversion q", kind: "number", min: 0, max: 100, step: 0.5 }, { key: "penalty", label: "Penalty A", kind: "number", min: 0.1, max: 100, step: 0.1 }, { key: "p", label: "QAOA depth p", kind: "int", min: 1, max: 4 }, seedField],
    defaults: { assets: 5, range: "1y", k: 2, riskAversion: 2, penalty: 1, p: 2, seed: 42 },
  },
};

/** Validates settings against the field specs; returns readable errors (empty = valid). */
export function validateSettings(id: ReportModuleId, s: Settings): string[] {
  const errs: string[] = [];
  for (const f of SOURCES[id].fields) {
    const v = s[f.key];
    if (f.kind === "select") { if (!f.options!.some((o) => o.value === v)) errs.push(`${f.label}: choose a valid option.`); continue; }
    const n = Number(v);
    if (typeof v === "string" && v.trim() === "") { errs.push(`${f.label} is required.`); continue; }
    if (!Number.isFinite(n) || (f.kind === "int" && !Number.isInteger(n))) { errs.push(`${f.label} must be ${f.kind === "int" ? "an integer" : "a number"}.`); continue; }
    if ((f.min !== undefined && n < f.min) || (f.max !== undefined && n > f.max)) errs.push(`${f.label} must be between ${f.min} and ${f.max}.`);
  }
  if ((id === "portfolio" || id === "finance") && !errs.length && Number(s["k"]) >= Number(s["assets"])) errs.push("Select K must be smaller than the number of assets.");
  return errs;
}

type RunOpts = { signal?: AbortSignal; onProgress?: (f: number) => void };

export async function runSource(id: ReportModuleId, s: Settings, opts: RunOpts = {}): Promise<Snapshot> {
  const errs = validateSettings(id, s);
  if (errs.length) throw new RangeError(errs.join(" "));
  const num = (k: string) => Number(s[k]);
  const seed = num("seed");
  const sig = opts.signal ? { signal: opts.signal } : {};
  switch (id) {
    case "finance": {
      const series = demoPrices(seed);
      const symbols = DEMO_UNIVERSE.slice(0, num("assets")).map((a) => a.symbol);
      const model: PortfolioModel = { riskAversion: num("riskAversion"), k: num("k"), penalty: num("penalty"), excluded: [] };
      const experiment = await runFinanceExperiment(series, { symbols, range: s["range"] as RangeId, model, config: { p: num("p"), seed, restarts: 3, maxIter: 150, shots: 2000 } }, { ...opts, demoSeed: seed });
      return { kind: "finance", experiment };
    }
    case "circuit": {
      const ex = EXAMPLE_CIRCUITS.find((c) => c.id === s["exampleId"])!;
      const probs = probabilities(simulate(ex.circuit));
      const measured = measuredQubits(ex.circuit);
      const dist = measured.length ? marginal(probs, measured) : probs;
      const counts = sampleCounts(dist, num("shots"), createRng(seed));
      return { kind: "circuit", exampleId: ex.id, circuit: structuredClone(ex.circuit), seed, shots: num("shots"), probs: Array.from(dist), counts: Array.from(counts), measured };
    }
    case "entanglement": {
      const state = s["state"] as BellState;
      const B = ["X", "Y", "Z"] as const;
      const correlations = B.flatMap((a) => B.map((b) => ({ a, b, E: correlator(jointProbabilities(bellCircuit(state, a, b))) })));
      return { kind: "entanglement", state, seed, shots: num("shots"), zzProbs: Array.from(jointProbabilities(bellCircuit(state, "Z", "Z"))), correlations, chsh: runChsh(state, OPTIMAL_CHSH, num("shots"), seed) };
    }
    case "qaoa": {
      const g = GRAPH_PRESETS.find((p) => p.id === s["presetId"])!.graph;
      return { kind: "qaoa", presetId: String(s["presetId"]), result: await runQaoaLab({ graph: structuredClone(g), p: num("p"), seed, restarts: num("restarts"), maxIter: num("maxIter") }, opts) };
    }
    case "vqe": {
      const h = HAMILTONIAN_PRESETS.find((p) => p.id === s["presetId"])!.h;
      const r = await runVqe({ hamiltonian: structuredClone(h), depth: num("depth"), rotations: "ry", optimizer: s["optimizer"] as OptimizerName, maxIter: num("maxIter"), restarts: num("restarts"), seed }, { ...sig, onProgress: (f) => opts.onProgress?.(f) });
      return { kind: "vqe", presetId: String(s["presetId"]), result: r };
    }
    case "portfolio": {
      const data = syntheticData(num("assets"), seed);
      const model: PortfolioModel = { riskAversion: num("riskAversion"), k: num("k"), penalty: num("penalty"), excluded: [] };
      const result = await runPortfolioQaoa(data, model, { p: num("p"), seed, restarts: 3, maxIter: 150, shots: 2000 }, opts);
      return { kind: "portfolio", data, model, result };
    }
    case "qml": {
      const kind = s["dataset"] as DatasetKind, testFraction = 0.25;
      const data = generateDataset(kind, num("n"), seed);
      const { train, test } = trainTestSplit(data, testFraction, seed);
      const maxIter = num("maxIter");
      const result = await trainQml(train, test, { depth: num("depth"), maxIter, seed, testFraction }, { ...sig, onProgress: (h) => opts.onProgress?.(h.iter / maxIter) });
      const quadratic = kind !== "linear";
      const lr = trainLogReg(train, { quadratic });
      const lp = (set: Sample[]) => set.map((p) => logRegPredict(lr, p.x1, p.x2));
      const lab = (set: Sample[]) => set.map((p) => p.y);
      const qTest = test.map((p) => predictProba(p.x1, p.x2, result.params, result.depth));
      return {
        kind: "qml", seed, dataset: kind, n: num("n"), testFraction, train, test, result,
        baseline: { trainAcc: accuracy(lp(train), lab(train)), testAcc: test.length ? accuracy(lp(test), lab(test)) : NaN, quadratic },
        confusionTest: confusionMatrix(qTest, lab(test)),
      };
    }
    case "arena": {
      const g = GRAPH_PRESETS.find((p) => p.id === s["presetId"])!.graph;
      const r = await runArena({ graph: structuredClone(g), seed, p: num("p"), restarts: 3, maxIter: 150, shots: 1024, saSteps: 2000, greedyRestarts: 5 }, { ...sig, onProgress: (_l, f) => opts.onProgress?.(f) });
      return { kind: "arena", presetId: String(s["presetId"]), result: r };
    }
  }
}
