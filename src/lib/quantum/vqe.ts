/**
 * VQE engine (UI-free). Hamiltonians are real-weighted sums of Pauli strings.
 * Pauli string convention (Qiskit): character k acts on qubit n-1-k, so "ZI" = Z on q1.
 * Everything here is an ideal noiseless classical statevector simulation.
 */
import { createRng } from "./rng";
import { simulate, type Circuit, type Op } from "./circuit";
import { nelderMead } from "./optimize";
import type { StateVector } from "./statevector";

export type PauliTerm = { coef: number; pauli: string };
export type Hamiltonian = { n: number; terms: PauliTerm[] };
export type Rotations = "ry" | "ryrz";
export type OptimizerName = "nelder-mead" | "cobyla" | "spsa";
export type VqeConfig = { hamiltonian: Hamiltonian; depth: number; rotations: Rotations; optimizer: OptimizerName; maxIter: number; restarts: number; seed: number };

export const VQE_MAX_QUBITS = 4;
export const VQE_MAX_TERMS = 24;
export const VQE_MAX_DEPTH = 6;
export const VQE_MAX_PARAMS = 64;
export const OPTIMIZERS: { id: OptimizerName; name: string; note: string }[] = [
  { id: "nelder-mead", name: "Nelder–Mead", note: "Deterministic simplex search (derivative-free)." },
  { id: "cobyla", name: "COBYLA (unconstrained)", note: "Linear-approximation trust-region method in the COBYLA family; simplified implementation without constraints." },
  { id: "spsa", name: "SPSA (gradient-free)", note: "Simultaneous-perturbation stochastic approximation — two energy evaluations per step, seeded." },
];

export const HAMILTONIAN_PRESETS: { id: string; name: string; note: string; h: Hamiltonian }[] = [
  { id: "z", name: "Single-qubit Z", note: "H = Z. Ground state |1⟩, energy −1.", h: { n: 1, terms: [{ coef: 1, pauli: "Z" }] } },
  { id: "zz", name: "ZZ interaction", note: "H = Z⊗Z. Doubly degenerate ground space span{|01⟩, |10⟩}, energy −1.", h: { n: 2, terms: [{ coef: 1, pauli: "ZZ" }] } },
  {
    id: "h2", name: "H₂ toy Hamiltonian (2 qubits)",
    note: "Literature coefficients of the parity-reduced 2-qubit STO-3G H₂ Hamiltonian near 0.735 Å (electronic part, Hartree). Educational toy — not a chemistry calculation performed here.",
    h: { n: 2, terms: [
      { coef: -1.052373245772859, pauli: "II" }, { coef: 0.39793742484318045, pauli: "IZ" }, { coef: -0.39793742484318045, pauli: "ZI" },
      { coef: -0.01128010425623538, pauli: "ZZ" }, { coef: 0.18093119978423156, pauli: "XX" },
    ] },
  },
  { id: "custom", name: "Custom weighted Hamiltonian", note: "Editable. Default: transverse-field Ising pair −ZZ + 0.5·XI + 0.5·IX.", h: { n: 2, terms: [{ coef: -1, pauli: "ZZ" }, { coef: 0.5, pauli: "XI" }, { coef: 0.5, pauli: "IX" }] } },
];

// ---------- Validation ----------
const isInt = (x: number) => Number.isInteger(x);

export function validateHamiltonian(h: Hamiltonian): string[] {
  const e: string[] = [];
  if (!h || !isInt(h.n) || h.n < 1 || h.n > VQE_MAX_QUBITS) return [`Qubit count must be an integer from 1 to ${VQE_MAX_QUBITS}.`];
  if (!Array.isArray(h.terms) || h.terms.length === 0) return ["Add at least one Pauli term."];
  if (h.terms.length > VQE_MAX_TERMS) e.push(`At most ${VQE_MAX_TERMS} terms are supported.`);
  h.terms.forEach((t, i) => {
    if (!Number.isFinite(t.coef) || Math.abs(t.coef) > 100) e.push(`Term ${i + 1}: coefficient must be a finite number with |c| ≤ 100.`);
    const p = String(t.pauli ?? "").toUpperCase();
    if (p.length !== h.n) e.push(`Term ${i + 1}: Pauli string must have exactly ${h.n} character${h.n > 1 ? "s" : ""}.`);
    else if (!/^[IXYZ]+$/.test(p)) e.push(`Term ${i + 1}: only I, X, Y, Z are allowed.`);
  });
  return e;
}

export function paramCount(n: number, depth: number, rotations: Rotations) {
  return (depth + 1) * n * (rotations === "ryrz" ? 2 : 1);
}

export function validateVqeConfig(c: VqeConfig): string[] {
  const e = validateHamiltonian(c.hamiltonian);
  if (!isInt(c.depth) || c.depth < 0 || c.depth > VQE_MAX_DEPTH) e.push(`Ansatz depth must be an integer from 0 to ${VQE_MAX_DEPTH}.`);
  if (c.rotations !== "ry" && c.rotations !== "ryrz") e.push("Rotation set must be Ry or Ry+Rz.");
  if (!OPTIMIZERS.some((o) => o.id === c.optimizer)) e.push("Unknown optimizer.");
  if (!isInt(c.maxIter) || c.maxIter < 1 || c.maxIter > 2000) e.push("Iterations must be an integer from 1 to 2000.");
  if (!isInt(c.restarts) || c.restarts < 1 || c.restarts > 10) e.push("Restarts must be an integer from 1 to 10.");
  if (!isInt(c.seed) || c.seed < 0 || c.seed > 4294967295) e.push("Seed must be an integer from 0 to 4294967295.");
  if (!e.length && paramCount(c.hamiltonian.n, c.depth, c.rotations) > VQE_MAX_PARAMS) e.push(`Too many parameters (max ${VQE_MAX_PARAMS}); reduce depth.`);
  return e;
}

// ---------- Pauli algebra ----------
/** Action of a Pauli string on basis state j: P|j⟩ = (phRe + i·phIm)|j ^ flip⟩. */
function pauliAction(pauli: string, n: number, j: number) {
  let flip = 0, re = 1, im = 0;
  for (let k = 0; k < n; k++) {
    const q = n - 1 - k, bit = (j >> q) & 1, c = pauli[k]!.toUpperCase();
    let fr = 1, fi = 0;
    if (c === "X") flip |= 1 << q;
    else if (c === "Y") { flip |= 1 << q; fi = bit ? -1 : 1; fr = 0; } // Y|0⟩=i|1⟩, Y|1⟩=−i|0⟩
    else if (c === "Z" && bit) fr = -1;
    [re, im] = [re * fr - im * fi, re * fi + im * fr];
  }
  return { flip, re, im };
}

/** Dense Hermitian matrix (row-major, re/im). */
export function hamiltonianMatrix(h: Hamiltonian) {
  const errs = validateHamiltonian(h); if (errs.length) throw new Error(errs[0]);
  const d = 1 << h.n, re = new Float64Array(d * d), im = new Float64Array(d * d);
  for (const t of h.terms) for (let j = 0; j < d; j++) {
    const a = pauliAction(t.pauli, h.n, j), i = j ^ a.flip;
    re[i * d + j]! += t.coef * a.re; im[i * d + j]! += t.coef * a.im;
  }
  return { dim: d, re, im };
}

/** ⟨ψ|H|ψ⟩ computed term by term from Pauli actions (no dense matrix). */
export function expectation(h: Hamiltonian, s: StateVector): number {
  const d = 1 << h.n; let e = 0;
  for (const t of h.terms) {
    let acc = 0;
    for (let j = 0; j < d; j++) {
      const a = pauliAction(t.pauli, h.n, j), i = j ^ a.flip;
      const pr = a.re * s.re[j]! - a.im * s.im[j]!, pi = a.re * s.im[j]! + a.im * s.re[j]!;
      acc += s.re[i]! * pr + s.im[i]! * pi; // Re(conj(ψ_i)·(Pψ)_i)
    }
    e += t.coef * acc;
  }
  return e;
}

/** Cyclic Jacobi eigen-decomposition of a real symmetric matrix. Returns eigenvalues + column eigenvectors. */
export function jacobiEigen(A: number[][]) {
  const n = A.length, a = A.map((r) => r.slice()), v = A.map((_, i) => A.map((__, j) => (i === j ? 1 : 0)));
  for (let sweep = 0; sweep < 100; sweep++) {
    let off = 0;
    for (let p = 0; p < n; p++) for (let q = p + 1; q < n; q++) off += a[p]![q]! ** 2;
    if (off < 1e-26) break;
    for (let p = 0; p < n; p++) for (let q = p + 1; q < n; q++) {
      const apq = a[p]![q]!; if (Math.abs(apq) < 1e-300) continue;
      const th = (a[q]![q]! - a[p]![p]!) / (2 * apq);
      const t = Math.sign(th || 1) / (Math.abs(th) + Math.sqrt(th * th + 1)), c = 1 / Math.sqrt(t * t + 1), s = t * c;
      for (let k = 0; k < n; k++) { const akp = a[k]![p]!, akq = a[k]![q]!; a[k]![p] = c * akp - s * akq; a[k]![q] = s * akp + c * akq; }
      for (let k = 0; k < n; k++) { const apk = a[p]![k]!, aqk = a[q]![k]!; a[p]![k] = c * apk - s * aqk; a[q]![k] = s * apk + c * aqk; }
      for (let k = 0; k < n; k++) { const vkp = v[k]![p]!, vkq = v[k]![q]!; v[k]![p] = c * vkp - s * vkq; v[k]![q] = s * vkp + c * vkq; }
    }
  }
  return { values: a.map((r, i) => r[i]!), vectors: v };
}

/**
 * Exact ground state via the real 2d×2d embedding [[A, −B], [B, A]] of H = A + iB.
 * Each complex eigenvalue appears twice; the ground *space* projector is used for fidelity,
 * so degenerate ground states are handled correctly.
 */
export function exactSpectrum(h: Hamiltonian) {
  const { dim: d, re, im } = hamiltonianMatrix(h);
  const M = Array.from({ length: 2 * d }, (_, r) => Array.from({ length: 2 * d }, (_, c) => {
    const i = r % d, j = c % d, A = re[i * d + j]!, B = im[i * d + j]!;
    if (r < d && c < d) return A; if (r >= d && c >= d) return A; if (r < d) return -B; return B;
  }));
  const { values, vectors } = jacobiEigen(M);
  const ground = Math.min(...values);
  const idx = values.map((_, i) => i).filter((i) => values[i]! - ground < 1e-8);
  const eig = [...new Set(values.map((x) => Math.round(x * 1e9) / 1e9))].sort((a, b) => a - b);
  return { ground, degeneracy: idx.length / 2, eigenvalues: eig, groundBasis: idx.map((i) => vectors.map((row) => row[i]!)) };
}

/** Fidelity = ‖P_ground ψ‖² (projection onto the exact ground space). */
export function groundFidelity(spec: ReturnType<typeof exactSpectrum>, s: StateVector) {
  const x = [...s.re, ...s.im];
  return Math.min(1, spec.groundBasis.reduce((acc, e) => acc + e.reduce((a, v, k) => a + v * x[k]!, 0) ** 2, 0));
}

// ---------- Ansatz ----------
/** Hardware-efficient ansatz: [rotations on every qubit → CNOT chain] × depth, then a final rotation layer. */
export function ansatzCircuit(n: number, depth: number, rotations: Rotations, params: number[]): Circuit {
  const ops: Op[] = []; let k = 0;
  const rot = () => { for (let q = 0; q < n; q++) { ops.push({ gate: "RY", qubits: [q], theta: params[k++]! }); if (rotations === "ryrz") ops.push({ gate: "RZ", qubits: [q], theta: params[k++]! }); } };
  for (let l = 0; l < depth; l++) { rot(); for (let q = 0; q < n - 1; q++) ops.push({ gate: "CNOT", qubits: [q, q + 1] }); }
  rot();
  return { numQubits: n, ops };
}

export function vqeEnergy(h: Hamiltonian, depth: number, rotations: Rotations, params: number[]) {
  if (params.length !== paramCount(h.n, depth, rotations) || !params.every(Number.isFinite)) throw new Error("Parameter vector has the wrong length or non-finite values.");
  const state = simulate(ansatzCircuit(h.n, depth, rotations, params));
  return { energy: expectation(h, state), state };
}

// ---------- Optimizers ----------
type Opt = { maxIter: number; signal?: AbortSignal | undefined; onIter: (best: number, it: number, current: number) => Promise<void> };

/** Simplified unconstrained COBYLA-style method: linear model from d+1 interpolation points, trust radius ρ shrinks on failure. */
async function cobyla(f: (x: number[]) => number, x0: number[], o: Opt) {
  const d = x0.length; let rho = 0.5; const rhoEnd = 1e-6;
  let pts = [x0.slice(), ...x0.map((_, i) => x0.map((v, j) => (i === j ? v + rho : v)))];
  let vals = pts.map(f); let evals = vals.length; let it = 0;
  for (; it < o.maxIter && rho > rhoEnd; it++) {
    if (o.signal?.aborted) throw new DOMException("Aborted", "AbortError");
    const order = vals.map((_, i) => i).sort((a, b) => vals[a]! - vals[b]!);
    pts = order.map((i) => pts[i]!); vals = order.map((i) => vals[i]!);
    await o.onIter(vals[0]!, it, vals[0]!);
    // Linear model g from differences to the best point: solve D g = df by least squares (normal equations).
    const D = pts.slice(1).map((p) => p.map((v, j) => v - pts[0]![j]!)), df = vals.slice(1).map((v) => v - vals[0]!);
    const g = solveLeastSquares(D, df);
    const gn = Math.hypot(...g);
    let improved = false;
    if (gn > 1e-14) {
      const xn = pts[0]!.map((v, j) => v - (rho * g[j]!) / gn), fn = f(xn); evals++;
      if (fn < vals[0]!) { pts[d] = xn; vals[d] = fn; improved = true; }
    }
    if (!improved) {
      rho *= 0.5; // shrink trust region and rebuild geometry around the best point
      pts = [pts[0]!, ...x0.map((_, i) => pts[0]!.map((v, j) => (i === j ? v + rho : v)))];
      vals = [vals[0]!, ...pts.slice(1).map(f)]; evals += d;
    }
  }
  const bi = vals.indexOf(Math.min(...vals));
  return { x: pts[bi]!, value: vals[bi]!, iterations: it, evaluations: evals };
}

function solveLeastSquares(D: number[][], y: number[]) {
  const d = D[0]!.length;
  const A = Array.from({ length: d }, (_, i) => Array.from({ length: d }, (_, j) => D.reduce((s, r) => s + r[i]! * r[j]!, 0) + (i === j ? 1e-12 : 0)));
  const b = Array.from({ length: d }, (_, i) => D.reduce((s, r, k) => s + r[i]! * y[k]!, 0));
  for (let c = 0; c < d; c++) { // Gaussian elimination with partial pivoting
    let p = c; for (let r = c + 1; r < d; r++) if (Math.abs(A[r]![c]!) > Math.abs(A[p]![c]!)) p = r;
    [A[c], A[p]] = [A[p]!, A[c]!]; [b[c], b[p]] = [b[p]!, b[c]!];
    for (let r = c + 1; r < d; r++) { const m = A[r]![c]! / A[c]![c]!; for (let k = c; k < d; k++) A[r]![k]! -= m * A[c]![k]!; b[r]! -= m * b[c]!; }
  }
  const x = new Array<number>(d).fill(0);
  for (let r = d - 1; r >= 0; r--) x[r] = (b[r]! - A[r]!.slice(r + 1).reduce((s, v, k) => s + v * x[r + 1 + k]!, 0)) / A[r]![r]!;
  return x.map((v) => (Number.isFinite(v) ? v : 0));
}

/** SPSA with standard gain schedules (Spall): a_k = a/(k+1+A)^0.602, c_k = c/(k+1)^0.101. */
async function spsa(f: (x: number[]) => number, x0: number[], o: Opt, seed: number) {
  const rng = createRng(seed); const a = 0.2, c = 0.15, A = 10;
  let x = x0.slice(), best = f(x), bx = x.slice(), evals = 1;
  for (let k = 0; k < o.maxIter; k++) {
    if (o.signal?.aborted) throw new DOMException("Aborted", "AbortError");
    const ak = a / (k + 1 + A) ** 0.602, ck = c / (k + 1) ** 0.101;
    const delta = x.map(() => (rng() < 0.5 ? -1 : 1));
    const fp = f(x.map((v, i) => v + ck * delta[i]!)), fm = f(x.map((v, i) => v - ck * delta[i]!)); evals += 2;
    x = x.map((v, i) => v - (ak * (fp - fm)) / (2 * ck * delta[i]!));
    const fx = f(x); evals++;
    if (fx < best) { best = fx; bx = x.slice(); }
    await o.onIter(best, k, fx);
  }
  return { x: bx, value: best, iterations: o.maxIter, evaluations: evals };
}

// ---------- Full run ----------
export type VqeHistoryPoint = { iter: number; restart: number; current: number; best: number };
export type VqeResult = {
  config: VqeConfig; params: number[]; energy: number; exact: number; error: number; fidelity: number; degeneracy: number;
  eigenvalues: number[]; history: VqeHistoryPoint[]; restartEnergies: number[]; evaluations: number;
  state: StateVector; probs: number[]; circuit: Circuit;
};

export async function runVqe(cfg: VqeConfig, opts: { signal?: AbortSignal; onProgress?: (fraction: number, current: number) => void } = {}): Promise<VqeResult> {
  const errs = validateVqeConfig(cfg); if (errs.length) throw new Error(errs[0]);
  const h = { n: cfg.hamiltonian.n, terms: cfg.hamiltonian.terms.map((t) => ({ coef: t.coef, pauli: t.pauli.toUpperCase() })) };
  const spec = exactSpectrum(h);
  const np = paramCount(h.n, cfg.depth, cfg.rotations);
  const f = (x: number[]) => { const e = vqeEnergy(h, cfg.depth, cfg.rotations, x).energy; if (!Number.isFinite(e)) throw new Error("Numerical error: non-finite energy."); return e; };
  const rng = createRng(cfg.seed);
  const history: VqeHistoryPoint[] = []; const restartEnergies: number[] = [];
  let bestX: number[] = [], best = Infinity, evals = 0, gIt = 0;
  for (let r = 0; r < cfg.restarts; r++) {
    const x0 = Array.from({ length: np }, () => (rng() * 2 - 1) * Math.PI);
    const onIter = async (b: number, it: number, cur: number) => {
      history.push({ iter: gIt++, restart: r, current: cur, best: Math.min(best, b) });
      if (it % 8 === 0) { opts.onProgress?.((r + it / cfg.maxIter) / cfg.restarts, cur); await new Promise((res) => setTimeout(res, 0)); }
    };
    const o = { maxIter: cfg.maxIter, signal: opts.signal, onIter };
    const res = cfg.optimizer === "nelder-mead"
      ? await nelderMead(f, x0, { maxIter: cfg.maxIter, step: 0.4, tol: 1e-12, signal: opts.signal, onIter: (b, it) => onIter(b, it, b) })
      : cfg.optimizer === "cobyla" ? await cobyla(f, x0, o) : await spsa(f, x0, o, (cfg.seed + 7919 * (r + 1)) >>> 0);
    evals += res.evaluations; restartEnergies.push(res.value);
    if (res.value < best) { best = res.value; bestX = res.x; }
  }
  opts.onProgress?.(1, best);
  const { energy, state } = vqeEnergy(h, cfg.depth, cfg.rotations, bestX);
  const probs = Array.from({ length: 1 << h.n }, (_, i) => state.re[i]! ** 2 + state.im[i]! ** 2);
  return {
    config: structuredClone(cfg), params: bestX, energy, exact: spec.ground, error: energy - spec.ground, fidelity: groundFidelity(spec, state),
    degeneracy: spec.degeneracy, eigenvalues: spec.eigenvalues, history, restartEnergies, evaluations: evals, state, probs,
    circuit: ansatzCircuit(h.n, cfg.depth, cfg.rotations, bestX),
  };
}

export function formatHamiltonian(h: Hamiltonian) {
  return h.terms.map((t, i) => `${t.coef < 0 ? (i ? " − " : "−") : i ? " + " : ""}${+Math.abs(t.coef).toPrecision(6)}·${t.pauli.toUpperCase()}`).join("");
}
