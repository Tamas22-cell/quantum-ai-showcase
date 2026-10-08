import * as G from "./gates";
import { applyControlled, applySingle, zeroState, type StateVector } from "./statevector";

/** Gate vocabulary shared by all lab modules. */
export type GateName = "H" | "X" | "Y" | "Z" | "S" | "T" | "RX" | "RY" | "RZ" | "CNOT" | "CZ" | "M";

/**
 * A circuit operation.
 * - single-qubit gates: qubits = [target]
 * - CNOT / CZ: qubits = [control, target]
 * - M: qubits = [target] (terminal computational-basis measurement)
 */
export type Op = { gate: GateName; qubits: number[]; theta?: number };
export type Circuit = { numQubits: number; ops: Op[] };

export const GATE_META: Record<
  GateName,
  { arity: 1 | 2; param: boolean; label: string; description: string }
> = {
  H: { arity: 1, param: false, label: "H", description: "Hadamard" },
  X: { arity: 1, param: false, label: "X", description: "Pauli-X (NOT)" },
  Y: { arity: 1, param: false, label: "Y", description: "Pauli-Y" },
  Z: { arity: 1, param: false, label: "Z", description: "Pauli-Z (phase flip)" },
  S: { arity: 1, param: false, label: "S", description: "Phase gate √Z" },
  T: { arity: 1, param: false, label: "T", description: "π/8 gate √S" },
  RX: { arity: 1, param: true, label: "Rx", description: "Rotation about X" },
  RY: { arity: 1, param: true, label: "Ry", description: "Rotation about Y" },
  RZ: { arity: 1, param: true, label: "Rz", description: "Rotation about Z" },
  CNOT: { arity: 2, param: false, label: "CX", description: "Controlled-NOT" },
  CZ: { arity: 2, param: false, label: "CZ", description: "Controlled-Z" },
  M: { arity: 1, param: false, label: "M", description: "Measure (Z basis)" },
};

export function gateMatrix(op: Op): G.Matrix2 {
  switch (op.gate) {
    case "H":
      return G.H;
    case "X":
    case "CNOT":
      return G.X;
    case "Y":
      return G.Y;
    case "Z":
    case "CZ":
      return G.Z;
    case "S":
      return G.S;
    case "T":
      return G.T;
    case "RX":
      return G.rx(op.theta ?? 0);
    case "RY":
      return G.ry(op.theta ?? 0);
    case "RZ":
      return G.rz(op.theta ?? 0);
    case "M":
      return G.I;
  }
}

/** Returns a list of human-readable problems; empty means the circuit is valid. */
export function validateCircuit(c: Circuit, maxQubits = 5, maxOps = 64): string[] {
  const errors: string[] = [];
  if (!Number.isInteger(c.numQubits) || c.numQubits < 1 || c.numQubits > maxQubits)
    errors.push(`Qubit count must be between 1 and ${maxQubits}.`);
  if (c.ops.length > maxOps) errors.push(`Circuit exceeds ${maxOps} operations.`);
  const measured = new Set<number>();
  c.ops.forEach((op, i) => {
    const meta = GATE_META[op.gate];
    if (!meta) {
      errors.push(`Step ${i + 1}: unknown gate.`);
      return;
    }
    if (op.qubits.length !== meta.arity)
      errors.push(`Step ${i + 1}: ${op.gate} needs ${meta.arity} qubit(s).`);
    op.qubits.forEach((q) => {
      if (!Number.isInteger(q) || q < 0 || q >= c.numQubits)
        errors.push(`Step ${i + 1}: qubit q${q} does not exist.`);
      else if (op.gate !== "M" && measured.has(q))
        errors.push(
          `Step ${i + 1}: q${q} was already measured — only terminal measurements are supported.`,
        );
    });
    if (meta.arity === 2 && op.qubits[0] === op.qubits[1])
      errors.push(`Step ${i + 1}: control and target must differ.`);
    if (meta.param && !Number.isFinite(op.theta))
      errors.push(`Step ${i + 1}: rotation angle must be a finite number.`);
    if (op.gate === "M") measured.add(op.qubits[0]!);
  });
  return errors;
}

/** Simulate all unitary operations; measurement ops only mark qubits for sampling. */
export function simulate(c: Circuit): StateVector {
  const errors = validateCircuit(c, 12, 10_000);
  if (errors.length) throw new Error(errors[0]);
  const s = zeroState(c.numQubits);
  for (const op of c.ops) {
    if (op.gate === "M") continue;
    const m = gateMatrix(op);
    if (GATE_META[op.gate].arity === 2) applyControlled(s, op.qubits[0]!, op.qubits[1]!, m);
    else applySingle(s, op.qubits[0]!, m);
  }
  return s;
}

/** Qubits to read out: explicit M ops (sorted) or, if none, every qubit. */
export function measuredQubits(c: Circuit): number[] {
  const m = [...new Set(c.ops.filter((o) => o.gate === "M").map((o) => o.qubits[0]!))].sort(
    (a, b) => a - b,
  );
  return m.length ? m : Array.from({ length: c.numQubits }, (_, i) => i);
}
