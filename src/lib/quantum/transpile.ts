/**
 * Educational in-browser "transpiler" modelled on the Qiskit workflow.
 * Rewrites a circuit into an IBM-style basis {RZ, SX, X, CZ} (SX = RX(π/2)),
 * then optionally applies peephole optimisation. All rewrites are exact up to
 * a global phase, which is verified by state fidelity in the tests.
 * It does NOT perform layout/routing onto a device coupling map.
 */
import { circuitDepth } from "@/lib/assistant/proposal";
import type { Circuit, Op } from "./circuit";
import { simulate } from "./circuit";

export type OptimizationLevel = 0 | 1;
export type TranspileResult = {
  circuit: Circuit;
  before: { ops: number; depth: number; twoQubit: number };
  after: { ops: number; depth: number; twoQubit: number };
  removed: number;
  basis: string[];
};

const PI = Math.PI;
const rz = (q: number, theta: number): Op => ({ gate: "RZ", qubits: [q], theta });
const sx = (q: number): Op => ({ gate: "RX", qubits: [q], theta: PI / 2 });
const h = (q: number): Op[] => [rz(q, PI / 2), sx(q), rz(q, PI / 2)];

/** Decompose one gate into the {RZ, SX, X, CZ} basis. */
function decompose(op: Op): Op[] {
  const q = op.qubits[0]!;
  switch (op.gate) {
    case "H": return h(q);
    case "Z": return [rz(q, PI)];
    case "S": return [rz(q, PI / 2)];
    case "T": return [rz(q, PI / 4)];
    case "Y": return [rz(q, PI), { gate: "X", qubits: [q] }]; // Y = iXZ
    case "RZ": return [rz(q, op.theta!)];
    case "RX":
      // SX is already native; general RX(θ) = H·RZ(θ)·H
      return isSx(op) ? [op] : [...h(q), rz(q, op.theta!), ...h(q)];
    case "RY": return [rz(q, -PI / 2), ...decompose({ gate: "RX", qubits: [q], theta: op.theta! }), rz(q, PI / 2)];
    case "CNOT": { const t = op.qubits[1]!; return [...h(t), { gate: "CZ", qubits: [q, t] }, ...h(t)]; }
    default: return [op]; // X, CZ, M are native
  }
}

const isSx = (op: Op) => op.gate === "RX" && Math.abs(op.theta! - PI / 2) < 1e-12;
const wrap = (t: number) => { const r = ((t + PI) % (2 * PI) + 2 * PI) % (2 * PI) - PI; return Math.abs(r) < 1e-12 ? 0 : r; };

/** Peephole pass: merge consecutive RZ, drop identity RZ, cancel X·X and CZ·CZ pairs. */
function optimize(ops: Op[], n: number): Op[] {
  let cur = ops;
  for (let pass = 0; pass < 20; pass++) {
    const out: Op[] = [];
    const last = new Array<number>(n).fill(-1); // index in `out` of the latest op per qubit
    let changed = false;
    for (const op of cur) {
      const prevIdx = op.qubits.length === 1 ? last[op.qubits[0]!]! : -1;
      const prev = prevIdx >= 0 ? out[prevIdx] : undefined;
      if (op.gate === "RZ" && prev?.gate === "RZ") { prev.theta = wrap(prev.theta! + op.theta!); changed = true; continue; }
      if (op.gate === "X" && prev?.gate === "X") { out.splice(prevIdx, 1, { gate: "RZ", qubits: [op.qubits[0]!], theta: 0 }); changed = true; continue; }
      if (op.gate === "CZ") {
        const [a, b] = op.qubits as [number, number];
        const pi = last[a]!;
        const p = out[pi];
        if (pi >= 0 && pi === last[b] && p?.gate === "CZ") { out.splice(pi, 1, { gate: "RZ", qubits: [a], theta: 0 }); changed = true; continue; }
      }
      out.push({ ...op, qubits: [...op.qubits] });
      op.qubits.forEach((q) => { last[q] = out.length - 1; });
    }
    const filtered = out.filter((o) => !(o.gate === "RZ" && wrap(o.theta!) === 0));
    if (filtered.length !== out.length) changed = true;
    cur = filtered;
    if (!changed) break;
  }
  return cur;
}

const stats = (c: Circuit) => ({
  ops: c.ops.filter((o) => o.gate !== "M").length,
  depth: circuitDepth({ numQubits: c.numQubits, ops: c.ops.filter((o) => o.gate !== "M") }),
  twoQubit: c.ops.filter((o) => o.gate === "CNOT" || o.gate === "CZ").length,
});

export function transpile(c: Circuit, level: OptimizationLevel = 1): TranspileResult {
  const unitary = c.ops.filter((o) => o.gate !== "M").flatMap(decompose);
  const opt = level === 1 ? optimize(unitary, c.numQubits) : unitary;
  const measures = c.ops.filter((o) => o.gate === "M");
  const out: Circuit = { numQubits: c.numQubits, ops: [...opt, ...measures] };
  const before = stats(c), after = stats(out);
  return { circuit: out, before, after, removed: unitary.length - opt.length, basis: ["rz", "sx", "x", "cz"] };
}

/** |⟨ψ_a|ψ_b⟩|² — equals 1 when circuits agree up to global phase. */
export function stateFidelity(a: Circuit, b: Circuit): number {
  const s = simulate(a), t = simulate(b);
  let re = 0, im = 0;
  for (let i = 0; i < s.re.length; i++) {
    re += s.re[i]! * t.re[i]! + s.im[i]! * t.im[i]!;
    im += s.re[i]! * t.im[i]! - s.im[i]! * t.re[i]!;
  }
  return re * re + im * im;
}

/** Display name of a transpiled op (RX(π/2) is shown as SX). */
export const basisLabel = (op: Op) => (isSx(op) ? "SX" : op.gate);
