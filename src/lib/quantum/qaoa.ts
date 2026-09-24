import type { Circuit, Op } from "./circuit";
import { rx } from "./gates";
import { cutTable, type Graph } from "./maxcut";
import { nelderMead } from "./optimize";
import type { Rng } from "./rng";
import { applySingle, probabilities, type StateVector } from "./statevector";

/**
 * QAOA for Max-Cut (Farhi et al., 2014).
 * |γ,β⟩ = Π_k e^{-iβ_k B} e^{-iγ_k C} |+⟩^n,  C = Σ w_uv (1 − Z_u Z_v)/2,  B = Σ X_q.
 * The cost unitary is diagonal, so it is applied exactly as a per-basis-state phase e^{-iγ C(z)}.
 */
export function qaoaState(g: Graph, gammas: number[], betas: number[], table = cutTable(g)): StateVector {
  if (gammas.length !== betas.length || !gammas.length) throw new RangeError("Need p ≥ 1 matching γ and β");
  const dim = 1 << g.n;
  const amp = 1 / Math.sqrt(dim);
  const s: StateVector = { n: g.n, re: new Float64Array(dim).fill(amp), im: new Float64Array(dim) };
  for (let k = 0; k < gammas.length; k++) {
    const gamma = gammas[k]!;
    for (let z = 0; z < dim; z++) {
      const ph = -gamma * table[z]!;
      const c = Math.cos(ph), sn = Math.sin(ph);
      const r = s.re[z]!, i = s.im[z]!;
      s.re[z] = r * c - i * sn;
      s.im[z] = r * sn + i * c;
    }
    const m = rx(2 * betas[k]!); // e^{-iβX} = Rx(2β)
    for (let q = 0; q < g.n; q++) applySingle(s, q, m);
  }
  return s;
}

/** ⟨C⟩ = Σ_z |⟨z|γ,β⟩|² C(z). */
export function qaoaExpectation(g: Graph, gammas: number[], betas: number[], table = cutTable(g)): number {
  const p = probabilities(qaoaState(g, gammas, betas, table));
  let e = 0;
  for (let z = 0; z < p.length; z++) e += p[z]! * table[z]!;
  return e;
}

/**
 * Equivalent gate-level circuit (H layer, CNOT·Rz·CNOT per edge, Rx mixer) for display and
 * for cross-validation against the generic circuit simulator. Equal up to global phase.
 */
export function qaoaCircuit(g: Graph, gammas: number[], betas: number[]): Circuit {
  const ops: Op[] = [];
  for (let q = 0; q < g.n; q++) ops.push({ gate: "H", qubits: [q] });
  gammas.forEach((gamma, k) => {
    for (const e of g.edges) {
      // e^{-iγ w (1−ZZ)/2} ∝ e^{+iγw ZZ/2} = CNOT · Rz(−γw) · CNOT
      ops.push({ gate: "CNOT", qubits: [e.u, e.v] }, { gate: "RZ", qubits: [e.v], theta: -gamma * e.w }, { gate: "CNOT", qubits: [e.u, e.v] });
    }
    for (let q = 0; q < g.n; q++) ops.push({ gate: "RX", qubits: [q], theta: 2 * betas[k]! });
  });
  return { numQubits: g.n, ops };
}

export type QaoaRun = {
  p: number;
  gammas: number[];
  betas: number[];
  expectation: number;
  probs: Float64Array;
  history: { evals: number; best: number }[]; // best ⟨C⟩ found so far vs objective evaluations
  evaluations: number;
  restarts: number;
};

/**
 * Optimise (γ, β) by Nelder–Mead from `restarts` seeded random starts; keep the best.
 * `yieldEvery` awaits a macrotask so long runs don't block the browser.
 */
export async function optimizeQaoa(
  g: Graph,
  opts: { p: number; restarts: number; maxIter: number; rng: Rng; signal?: AbortSignal | undefined; onProgress?: (frac: number) => void; table?: Float64Array },
): Promise<QaoaRun> {
  // Optional custom diagonal objective (maximised); defaults to the Max-Cut table.
  const table = opts.table ?? cutTable(g);
  const { p, restarts, maxIter, rng } = opts;
  let evals = 0, best = -Infinity, bestX: number[] = [];
  const history: QaoaRun["history"] = [];
  const f = (x: number[]) => {
    evals++;
    const v = qaoaExpectation(g, x.slice(0, p), x.slice(p), table);
    if (v > best) { best = v; bestX = x.slice(); history.push({ evals, best }); }
    return -v;
  };
  for (let r = 0; r < restarts; r++) {
    const x0 = [...Array.from({ length: p }, () => rng() * Math.PI), ...Array.from({ length: p }, () => rng() * (Math.PI / 2))];
    await nelderMead(f, x0, {
      maxIter, signal: opts.signal,
      onIter: async (_b, it) => {
        if (it % 10 === 0) { opts.onProgress?.((r + it / maxIter) / restarts); await new Promise((res) => setTimeout(res, 0)); }
      },
    });
  }
  const gammas = bestX.slice(0, p), betas = bestX.slice(p);
  return { p, gammas, betas, expectation: best, probs: probabilities(qaoaState(g, gammas, betas, table)), history, evaluations: evals, restarts };
}
