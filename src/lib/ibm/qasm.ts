/**
 * Circuit analysis + OpenQASM 3 export for IBM Quantum preparation.
 * Pure functions; no network access. Qubit/bit order follows Qiskit (q[0] = least-significant bit).
 */
import { GATE_META, measuredQubits, type Circuit, type GateName } from "@/lib/quantum/circuit";
import { circuitDepth, parseProposal } from "@/lib/assistant/proposal";

/** Gates executed natively on current IBM Heron-class devices (others are decomposed by the Qiskit transpiler). */
export const IBM_NATIVE: ReadonlySet<GateName> = new Set<GateName>(["X", "RZ", "CZ", "M"]);

const QASM_NAME: Record<Exclude<GateName, "M">, string> = {
  H: "h", X: "x", Y: "y", Z: "z", S: "s", T: "t", RX: "rx", RY: "ry", RZ: "rz", CNOT: "cx", CZ: "cz",
};

export type CircuitAnalysis = {
  numQubits: number;
  gateCount: number;          // unitary gates (excludes measurements)
  twoQubitGates: number;
  measurementOps: number;     // explicit M operations
  measuredQubits: number[];   // qubits that will be read out
  implicitMeasurement: boolean;
  depth: number;
  breakdown: { gate: GateName; count: number; native: boolean }[];
  needsDecomposition: GateName[];
};

export function analyzeCircuit(c: Circuit): CircuitAnalysis {
  const counts = new Map<GateName, number>();
  c.ops.forEach((o) => counts.set(o.gate, (counts.get(o.gate) ?? 0) + 1));
  const breakdown = [...counts.entries()].map(([gate, count]) => ({ gate, count, native: IBM_NATIVE.has(gate) }));
  const measurementOps = counts.get("M") ?? 0;
  return {
    numQubits: c.numQubits,
    gateCount: c.ops.length - measurementOps,
    twoQubitGates: c.ops.filter((o) => GATE_META[o.gate].arity === 2).length,
    measurementOps,
    measuredQubits: measuredQubits(c),
    implicitMeasurement: measurementOps === 0,
    depth: circuitDepth(c),
    breakdown,
    needsDecomposition: breakdown.filter((b) => !b.native).map((b) => b.gate),
  };
}

const angle = (t: number) => Number(t.toPrecision(15)).toString();

/** OpenQASM 3 program. Without explicit M ops every qubit is measured (matches the site's read-out rule). */
export function toQasm3(c: Circuit): string {
  const check = parseProposal(c);
  if (!check.ok) throw new Error(check.errors[0]);
  const mq = measuredQubits(c);
  const lines = ["OPENQASM 3.0;", 'include "stdgates.inc";', `qubit[${c.numQubits}] q;`, `bit[${mq.length}] c;`];
  for (const op of c.ops) {
    if (op.gate === "M") continue;
    const name = QASM_NAME[op.gate];
    const args = op.qubits.map((q) => `q[${q}]`).join(", ");
    lines.push(GATE_META[op.gate].param ? `${name}(${angle(op.theta!)}) ${args};` : `${name} ${args};`);
  }
  mq.forEach((q, i) => lines.push(`c[${i}] = measure q[${q}];`));
  return lines.join("\n") + "\n";
}
