import type { Matrix2 } from "./gates";
import type { Rng } from "./rng";

/**
 * Dense statevector simulator.
 * Qubit ordering is little-endian (qubit 0 = least significant bit), matching Qiskit:
 * basis index i = Σ b_q · 2^q, and bitstrings are displayed as q_{n-1} … q_1 q_0.
 */
export type StateVector = { n: number; re: Float64Array; im: Float64Array };

export const MAX_QUBITS = 12; // hard engine ceiling; UI modules impose tighter limits

export function zeroState(n: number): StateVector {
  if (!Number.isInteger(n) || n < 1 || n > MAX_QUBITS)
    throw new RangeError(`Qubit count must be 1–${MAX_QUBITS}`);
  const dim = 1 << n;
  const re = new Float64Array(dim);
  re[0] = 1;
  return { n, re, im: new Float64Array(dim) };
}

export function cloneState(s: StateVector): StateVector {
  return { n: s.n, re: s.re.slice(), im: s.im.slice() };
}

function checkQubit(s: StateVector, q: number) {
  if (!Number.isInteger(q) || q < 0 || q >= s.n) throw new RangeError(`Qubit ${q} out of range`);
}

/** Apply a 2x2 unitary to qubit q in place. */
export function applySingle(s: StateVector, q: number, m: Matrix2): void {
  checkQubit(s, q);
  const bit = 1 << q,
    dim = s.re.length;
  const [a, b, c, d] = m.re,
    [ai, bi, ci, di] = m.im;
  for (let i = 0; i < dim; i++) {
    if (i & bit) continue;
    const j = i | bit;
    const xr = s.re[i]!,
      xi = s.im[i]!,
      yr = s.re[j]!,
      yi = s.im[j]!;
    s.re[i] = a * xr - ai * xi + b * yr - bi * yi;
    s.im[i] = a * xi + ai * xr + b * yi + bi * yr;
    s.re[j] = c * xr - ci * xi + d * yr - di * yi;
    s.im[j] = c * xi + ci * xr + d * yi + di * yr;
  }
}

/** Apply a 2x2 unitary to `target` only on basis states where `control` is |1⟩. */
export function applyControlled(s: StateVector, control: number, target: number, m: Matrix2): void {
  checkQubit(s, control);
  checkQubit(s, target);
  if (control === target) throw new RangeError("Control and target must differ");
  const cb = 1 << control,
    tb = 1 << target,
    dim = s.re.length;
  const [a, b, c, d] = m.re,
    [ai, bi, ci, di] = m.im;
  for (let i = 0; i < dim; i++) {
    if (!(i & cb) || i & tb) continue;
    const j = i | tb;
    const xr = s.re[i]!,
      xi = s.im[i]!,
      yr = s.re[j]!,
      yi = s.im[j]!;
    s.re[i] = a * xr - ai * xi + b * yr - bi * yi;
    s.im[i] = a * xi + ai * xr + b * yi + bi * yr;
    s.re[j] = c * xr - ci * xi + d * yr - di * yi;
    s.im[j] = c * xi + ci * xr + d * yi + di * yr;
  }
}

export function probabilities(s: StateVector): Float64Array {
  const p = new Float64Array(s.re.length);
  for (let i = 0; i < p.length; i++) p[i] = s.re[i]! ** 2 + s.im[i]! ** 2;
  return p;
}

export function norm(s: StateVector): number {
  let t = 0;
  for (let i = 0; i < s.re.length; i++) t += s.re[i]! ** 2 + s.im[i]! ** 2;
  return Math.sqrt(t);
}

/**
 * Marginal distribution over a subset of qubits.
 * Output index k encodes qubits[0] as bit 0, qubits[1] as bit 1, …
 */
export function marginal(p: Float64Array, qubits: number[]): Float64Array {
  const out = new Float64Array(1 << qubits.length);
  for (let i = 0; i < p.length; i++) {
    let k = 0;
    for (let j = 0; j < qubits.length; j++) if (i & (1 << qubits[j]!)) k |= 1 << j;
    out[k]! += p[i]!;
  }
  return out;
}

/** Draw `shots` samples from a discrete distribution using cumulative sums + binary search. */
export function sampleCounts(p: Float64Array, shots: number, rng: Rng): Uint32Array {
  if (!Number.isInteger(shots) || shots < 1)
    throw new RangeError("Shots must be a positive integer");
  const cdf = new Float64Array(p.length);
  let acc = 0;
  for (let i = 0; i < p.length; i++) {
    acc += p[i]!;
    cdf[i] = acc;
  }
  const counts = new Uint32Array(p.length);
  for (let s = 0; s < shots; s++) {
    const r = rng() * acc;
    let lo = 0,
      hi = cdf.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (cdf[mid]! > r) hi = mid;
      else lo = mid + 1;
    }
    counts[lo]!++;
  }
  return counts;
}

export function toBitstring(index: number, width: number): string {
  return index.toString(2).padStart(width, "0");
}
