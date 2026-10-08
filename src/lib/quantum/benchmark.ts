import { greedyLocalSearch, randomSearch, simulatedAnnealing } from "./classical";
import { exhaustiveMaxCut, validateGraph, type Graph } from "./maxcut";
import { optimizeQaoa } from "./qaoa";
import { createRng } from "./rng";
import { sampleCounts } from "./statevector";

/**
 * Quantum vs Classical Arena: runs QAOA (statevector simulation) and classical solvers
 * on the SAME graph with the SAME master seed. Every stochastic component draws from its own
 * seeded stream derived from that seed, so results are reproducible (wall-clock times are not).
 */
export const ENGINE_VERSION = "quantum-ai-lab/arena@1.0.0";

export type ArenaConfig = {
  graph: Graph;
  seed: number;
  p: number;
  restarts: number;
  maxIter: number;
  shots: number;
  saSteps: number;
  greedyRestarts: number;
};

export type AlgorithmKind = "exact" | "classical-heuristic" | "quantum-simulated";
export type AlgorithmResult = {
  id: string;
  name: string;
  kind: AlgorithmKind;
  value: number; // best cut value found
  ratio: number; // value / exact optimum
  assignment: number;
  timeMs: number;
  evaluations: number;
  evaluationUnit: string;
  history: { evals: number; best: number }[];
  notes: string;
};
export type QaoaDetails = {
  gammas: number[];
  betas: number[];
  expectation: number;
  expectationRatio: number;
  pOptimal: number;
  counts: Record<string, number>;
  shots: number;
};
export type ArenaResult = {
  config: ArenaConfig;
  optimum: number;
  optimalAssignments: number[];
  results: AlgorithmResult[];
  qaoa: QaoaDetails;
  environment: Record<string, string>;
  createdAt: string;
};

/** Derive independent, reproducible sub-seeds from a master seed. */
export const subSeed = (seed: number, k: number) =>
  (Math.imul(seed ^ 0x9e3779b9, 2654435761) + k * 0x85ebca6b) >>> 0;

export function validateArenaConfig(c: ArenaConfig): string[] {
  const errs = validateGraph(c.graph);
  const int = (v: number, lo: number, hi: number, name: string) => {
    if (!Number.isInteger(v) || v < lo || v > hi)
      errs.push(`${name} must be an integer in [${lo}, ${hi}].`);
  };
  int(c.seed, 0, 2 ** 32 - 1, "Seed");
  int(c.p, 1, 4, "QAOA depth p");
  int(c.restarts, 1, 20, "Restarts");
  int(c.maxIter, 10, 1000, "Max iterations");
  int(c.shots, 1, 100_000, "Shots");
  int(c.saSteps, 10, 200_000, "Annealing steps");
  int(c.greedyRestarts, 1, 1000, "Greedy restarts");
  return errs;
}

const now = () => (typeof performance !== "undefined" ? performance.now() : Date.now());

export async function runArena(
  config: ArenaConfig,
  opts: { signal?: AbortSignal; onProgress?: (label: string, frac: number) => void } = {},
): Promise<ArenaResult> {
  const errs = validateArenaConfig(config);
  if (errs.length) throw new Error(errs.join(" "));
  const g = config.graph;
  const results: AlgorithmResult[] = [];

  let t = now();
  const ex = exhaustiveMaxCut(g);
  const exTime = now() - t;
  const optimum = ex.value;
  const ratio = (v: number) => (optimum > 0 ? v / optimum : 1);
  results.push({
    id: "exhaustive",
    name: "Exhaustive search",
    kind: "exact",
    value: optimum,
    ratio: 1,
    assignment: ex.optimal[0]!,
    timeMs: exTime,
    evaluations: ex.evaluations,
    evaluationUnit: "cut evaluations",
    history: [{ evals: ex.evaluations, best: optimum }],
    notes: "Enumerates all 2ⁿ assignments; exact reference (only feasible for small n).",
  });

  opts.onProgress?.("Classical heuristics", 0.02);
  t = now();
  const gr = greedyLocalSearch(g, config.greedyRestarts, createRng(subSeed(config.seed, 1)));
  results.push({
    id: "greedy",
    name: "Greedy local search",
    kind: "classical-heuristic",
    value: gr.value,
    ratio: ratio(gr.value),
    assignment: gr.assignment,
    timeMs: now() - t,
    evaluations: gr.evaluations,
    evaluationUnit: "cut evaluations",
    history: gr.history,
    notes: `Steepest single-flip ascent, ${config.greedyRestarts} random restarts.`,
  });

  t = now();
  const sa = simulatedAnnealing(g, config.saSteps, createRng(subSeed(config.seed, 2)));
  results.push({
    id: "sa",
    name: "Simulated annealing",
    kind: "classical-heuristic",
    value: sa.value,
    ratio: ratio(sa.value),
    assignment: sa.assignment,
    timeMs: now() - t,
    evaluations: sa.evaluations,
    evaluationUnit: "cut evaluations",
    history: sa.history,
    notes: `${config.saSteps} steps, geometric cooling T: 2 → 0.01.`,
  });

  t = now();
  const rs = randomSearch(g, config.shots, createRng(subSeed(config.seed, 3)));
  results.push({
    id: "random",
    name: "Random sampling",
    kind: "classical-heuristic",
    value: rs.value,
    ratio: ratio(rs.value),
    assignment: rs.assignment,
    timeMs: now() - t,
    evaluations: rs.evaluations,
    evaluationUnit: "cut evaluations",
    history: rs.history,
    notes: `Same sample budget as QAOA shots (${config.shots}); a sanity baseline.`,
  });

  t = now();
  const q = await optimizeQaoa(g, {
    p: config.p,
    restarts: config.restarts,
    maxIter: config.maxIter,
    rng: createRng(subSeed(config.seed, 4)),
    signal: opts.signal,
    onProgress: (f) => opts.onProgress?.("QAOA parameter optimisation", 0.05 + 0.9 * f),
  });
  const counts = sampleCounts(q.probs, config.shots, createRng(subSeed(config.seed, 5)));
  let bestSampled = -Infinity,
    bestZ = 0;
  const countMap: Record<string, number> = {};
  counts.forEach((c, z) => {
    if (!c) return;
    countMap[z.toString(2).padStart(g.n, "0")] = c;
    const v = ex.table[z]!;
    if (v > bestSampled) {
      bestSampled = v;
      bestZ = z;
    }
  });
  const pOptimal = ex.optimal.reduce((s, z) => s + q.probs[z]!, 0);
  results.push({
    id: "qaoa",
    name: `QAOA (p=${config.p}, simulated)`,
    kind: "quantum-simulated",
    value: bestSampled,
    ratio: ratio(bestSampled),
    assignment: bestZ,
    timeMs: now() - t,
    evaluations: q.evaluations,
    evaluationUnit: "exact ⟨C⟩ evaluations",
    history: q.history.map((h) => ({ evals: h.evals, best: h.best })),
    notes: `Best of ${config.shots} seeded shots from the optimised ideal statevector. Convergence curve tracks ⟨C⟩, not best sample. Time = classical simulation cost.`,
  });
  opts.onProgress?.("Done", 1);

  return {
    config,
    optimum,
    optimalAssignments: ex.optimal,
    results,
    qaoa: {
      gammas: q.gammas,
      betas: q.betas,
      expectation: q.expectation,
      expectationRatio: ratio(q.expectation),
      pOptimal,
      counts: countMap,
      shots: config.shots,
    },
    environment: {
      engine: ENGINE_VERSION,
      backend: "Ideal noiseless statevector simulator (JavaScript, Float64) running in the browser",
      hardware: "None — no quantum hardware was used",
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "n/a",
      cpuThreads:
        typeof navigator !== "undefined"
          ? String(navigator.hardwareConcurrency ?? "unknown")
          : "n/a",
    },
    createdAt: new Date().toISOString(),
  };
}

/** CSV summary (one row per algorithm). */
export function arenaToCsv(r: ArenaResult): string {
  const esc = (s: string | number) => {
    const v = String(s);
    return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
  };
  const head = [
    "algorithm",
    "kind",
    "best_cut",
    "optimum",
    "approx_ratio",
    "assignment",
    "time_ms",
    "evaluations",
    "evaluation_unit",
    "seed",
  ];
  const rows = r.results.map((a) => [
    a.name,
    a.kind,
    a.value,
    r.optimum,
    a.ratio.toFixed(6),
    a.assignment.toString(2).padStart(r.config.graph.n, "0"),
    a.timeMs.toFixed(3),
    a.evaluations,
    a.evaluationUnit,
    r.config.seed,
  ]);
  return [head, ...rows].map((row) => row.map(esc).join(",")).join("\n");
}

/** Full JSON export; Float64Arrays are not included, only serialisable fields. */
export function arenaToJson(r: ArenaResult): string {
  return JSON.stringify(
    {
      ...r,
      disclaimer:
        "Simulated results only. No quantum hardware used. Not evidence of quantum advantage.",
    },
    null,
    2,
  );
}
