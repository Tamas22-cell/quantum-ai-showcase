/**
 * Module 3 — QAOA Optimization Lab: pure (UI-free) analysis layer on top of the shared QAOA engine.
 * All results are ideal, noiseless classical statevector simulations.
 */
import { exhaustiveMaxCut, validateGraph, cutTable, type Graph } from "./maxcut";
import { optimizeQaoa, qaoaState } from "./qaoa";
import { createRng } from "./rng";
import { probabilities, toBitstring } from "./statevector";

export const QAOA_LAB_MAX_P = 5;

export type QaoaLabConfig = { graph: Graph; p: number; seed: number; restarts: number; maxIter: number };

export function validateQaoaLabConfig(c: QaoaLabConfig): string[] {
  const errs = validateGraph(c.graph);
  if (!Number.isInteger(c.p) || c.p < 1 || c.p > QAOA_LAB_MAX_P) errs.push(`Depth p must be an integer 1–${QAOA_LAB_MAX_P}.`);
  if (!Number.isInteger(c.seed) || c.seed < 0 || c.seed > 4294967295) errs.push("Seed must be an integer 0–4294967295.");
  if (!Number.isInteger(c.restarts) || c.restarts < 1 || c.restarts > 20) errs.push("Restarts must be an integer 1–20.");
  if (!Number.isInteger(c.maxIter) || c.maxIter < 10 || c.maxIter > 1000) errs.push("Iterations must be an integer 10–1000.");
  return errs;
}

export function validateAngles(gammas: number[], betas: number[], p: number): string[] {
  if (gammas.length !== p || betas.length !== p) return [`Need exactly ${p} γ and ${p} β values.`];
  return [...gammas, ...betas].every((x) => Number.isFinite(x) && Math.abs(x) <= 100) ? [] : ["Angles must be finite numbers with |angle| ≤ 100."];
}

/** Human-readable Hamiltonians: C = Σ w/2 (I − Z_u Z_v), B = Σ X_q. */
export function costHamiltonianTerms(g: Graph): string {
  return g.edges.map((e) => `${+(e.w / 2).toFixed(4)}·(I − Z${e.u}Z${e.v})`).join(" + ");
}
export function mixerHamiltonianTerms(n: number): string {
  return Array.from({ length: n }, (_, q) => `X${q}`).join(" + ");
}

export type QaoaAnalysis = {
  expectation: number;
  optimum: number;
  approxRatio: number; // ⟨C⟩ / C*
  pOptimal: number; // probability mass on optimal cuts
  mostLikely: { z: number; bits: string; prob: number; cut: number };
  optimalAssignments: number[];
  top: { z: number; bits: string; prob: number; cut: number; optimal: boolean }[];
};

/** Exact analysis of a probability distribution against the exhaustive optimum. */
export function analyzeDistribution(g: Graph, probs: Float64Array, topK = 16): QaoaAnalysis {
  const ex = exhaustiveMaxCut(g);
  const opt = new Set(ex.optimal);
  let e = 0, pOpt = 0;
  for (let z = 0; z < probs.length; z++) { e += probs[z]! * ex.table[z]!; if (opt.has(z)) pOpt += probs[z]!; }
  const idx = Array.from(probs.keys()).sort((a, b) => probs[b]! - probs[a]! || a - b);
  const row = (z: number) => ({ z, bits: toBitstring(z, g.n), prob: probs[z]!, cut: ex.table[z]!, optimal: opt.has(z) });
  const ml = row(idx[0]!);
  return { expectation: e, optimum: ex.value, approxRatio: e / ex.value, pOptimal: pOpt, mostLikely: ml, optimalAssignments: ex.optimal, top: idx.slice(0, topK).map(row) };
}

export function evaluateAngles(g: Graph, gammas: number[], betas: number[]) {
  const probs = probabilities(qaoaState(g, gammas, betas, cutTable(g)));
  return { probs, ...analyzeDistribution(g, probs) };
}

export type QaoaLabResult = QaoaAnalysis & {
  config: QaoaLabConfig;
  gammas: number[];
  betas: number[];
  probs: Float64Array;
  history: { evals: number; best: number }[];
  evaluations: number;
};

export async function runQaoaLab(c: QaoaLabConfig, opts: { signal?: AbortSignal; onProgress?: (f: number) => void } = {}): Promise<QaoaLabResult> {
  const errs = validateQaoaLabConfig(c);
  if (errs.length) throw new RangeError(errs.join(" "));
  const run = await optimizeQaoa(c.graph, { p: c.p, restarts: c.restarts, maxIter: c.maxIter, rng: createRng(c.seed), signal: opts.signal, onProgress: (f) => opts.onProgress?.(f) });
  if (!run.gammas.every(Number.isFinite) || !run.betas.every(Number.isFinite)) throw new Error("Optimisation produced non-finite parameters.");
  return { config: structuredClone(c), gammas: run.gammas, betas: run.betas, probs: run.probs, history: run.history, evaluations: run.evaluations, ...analyzeDistribution(c.graph, run.probs) };
}
