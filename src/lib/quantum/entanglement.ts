/**
 * Module 2 — Entanglement engine (UI-free).
 * Builds Bell-state circuits and measurement-basis rotations on top of the shared
 * statevector simulator, then computes joint probabilities, correlators and CHSH.
 * Convention: qubit 0 = Alice (A, rightmost bit), qubit 1 = Bob (B).
 */
import { simulate, type Op, type Circuit } from "./circuit";
import { probabilities, sampleCounts } from "./statevector";
import { createRng } from "./rng";

export type BellState = "phi+" | "phi-" | "psi+" | "psi-";
export type Basis = "X" | "Y" | "Z";

export const BELL_STATES: Record<BellState, { label: string; ket: string }> = {
  "phi+": { label: "Φ⁺", ket: "(|00⟩ + |11⟩)/√2" },
  "phi-": { label: "Φ⁻", ket: "(|00⟩ − |11⟩)/√2" },
  "psi+": { label: "Ψ⁺", ket: "(|01⟩ + |10⟩)/√2" },
  "psi-": { label: "Ψ⁻", ket: "(|01⟩ − |10⟩)/√2" },
};

/** Preparation: optional X flips, then H(q0) + CNOT(q0→q1). Ψ⁻ is produced up to a global phase. */
export function bellPrep(state: BellState): Op[] {
  const pre: Op[] = [];
  if (state === "phi-" || state === "psi-") pre.push({ gate: "X", qubits: [0] });
  if (state === "psi+" || state === "psi-") pre.push({ gate: "X", qubits: [1] });
  return [...pre, { gate: "H", qubits: [0] }, { gate: "CNOT", qubits: [0, 1] }];
}

/** Rotation mapping the chosen Pauli eigenbasis onto Z: X → H, Y → S†·H (S† = Rz(−π/2) up to phase). */
export function basisOps(basis: Basis, q: number): Op[] {
  if (basis === "X") return [{ gate: "H", qubits: [q] }];
  if (basis === "Y")
    return [
      { gate: "RZ", qubits: [q], theta: -Math.PI / 2 },
      { gate: "H", qubits: [q] },
    ];
  return [];
}

/** Measurement along angle θ in the X–Z plane (observable cosθ·Z + sinθ·X) via Ry(−θ). */
export function angleOps(theta: number, q: number): Op[] {
  if (!Number.isFinite(theta)) throw new RangeError("Measurement angle must be a finite number");
  return theta === 0 ? [] : [{ gate: "RY", qubits: [q], theta: -theta }];
}

export function bellCircuit(state: BellState, a: Basis, b: Basis): Circuit {
  if (!(state in BELL_STATES)) throw new RangeError(`Unknown Bell state: ${state}`);
  return {
    numQubits: 2,
    ops: [
      ...bellPrep(state),
      ...basisOps(a, 0),
      ...basisOps(b, 1),
      { gate: "M", qubits: [0] },
      { gate: "M", qubits: [1] },
    ],
  };
}

/** Joint probabilities indexed by basis index (bit0 = A, bit1 = B): [00, 01(A=1), 10(B=1), 11]. */
export function jointProbabilities(c: Circuit): Float64Array {
  return probabilities(simulate(c));
}

/** E = Σ p(a,b)·(−1)^(a⊕b), outcomes mapped to ±1. Works for probabilities or counts. */
export function correlator(p: ArrayLike<number>): number {
  const total = p[0]! + p[1]! + p[2]! + p[3]!;
  if (!(total > 0)) throw new RangeError("Empty distribution");
  return (p[0]! - p[1]! - p[2]! + p[3]!) / total;
}

export type ChshAngles = { a: number; a2: number; b: number; b2: number };
/** Settings that saturate Tsirelson's bound for Φ⁺. */
export const OPTIMAL_CHSH: ChshAngles = { a: 0, a2: Math.PI / 2, b: Math.PI / 4, b2: -Math.PI / 4 };
export const TSIRELSON = 2 * Math.SQRT2;

function angleCircuit(state: BellState, ta: number, tb: number): Circuit {
  return { numQubits: 2, ops: [...bellPrep(state), ...angleOps(ta, 0), ...angleOps(tb, 1)] };
}

export type ChshResult = {
  terms: { label: string; sign: 1 | -1; exact: number; sampled: number | null }[];
  exactS: number;
  sampledS: number | null;
  shotsPerSetting: number | null;
};

/** S = E(a,b) + E(a,b′) + E(a′,b) − E(a′,b′). Optional seeded sampling estimates each E from shots. */
export function runChsh(state: BellState, ang: ChshAngles, shots?: number, seed = 1): ChshResult {
  const settings: [string, number, number, 1 | -1][] = [
    ["E(a, b)", ang.a, ang.b, 1],
    ["E(a, b′)", ang.a, ang.b2, 1],
    ["E(a′, b)", ang.a2, ang.b, 1],
    ["E(a′, b′)", ang.a2, ang.b2, -1],
  ];
  const rng = shots !== undefined ? createRng(seed) : null;
  const terms = settings.map(([label, ta, tb, sign]) => {
    const p = probabilities(simulate(angleCircuit(state, ta, tb)));
    const sampled = rng ? correlator(sampleCounts(p, shots!, rng)) : null;
    return { label, sign, exact: correlator(p), sampled };
  });
  const sum = (k: "exact" | "sampled") => terms.reduce((s, t) => s + t.sign * (t[k] ?? 0), 0);
  return {
    terms,
    exactS: sum("exact"),
    sampledS: rng ? sum("sampled") : null,
    shotsPerSetting: shots ?? null,
  };
}

export function validateShots(shots: number): string | null {
  return Number.isInteger(shots) && shots >= 1 && shots <= 100_000
    ? null
    : "Shots must be an integer between 1 and 100,000";
}
