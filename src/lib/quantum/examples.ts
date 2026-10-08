import type { Circuit } from "./circuit";

/** Reference circuits with well-known exact outputs. */
export const EXAMPLE_CIRCUITS: {
  id: string;
  name: string;
  description: string;
  circuit: Circuit;
}[] = [
  {
    id: "bell",
    name: "Bell state Φ⁺",
    description: "H then CNOT: (|00⟩ + |11⟩)/√2. Outcomes 00 and 11 each with probability 0.5.",
    circuit: {
      numQubits: 2,
      ops: [
        { gate: "H", qubits: [0] },
        { gate: "CNOT", qubits: [0, 1] },
        { gate: "M", qubits: [0] },
        { gate: "M", qubits: [1] },
      ],
    },
  },
  {
    id: "ghz",
    name: "GHZ (3 qubits)",
    description: "(|000⟩ + |111⟩)/√2 — a CNOT chain spreads the superposition.",
    circuit: {
      numQubits: 3,
      ops: [
        { gate: "H", qubits: [0] },
        { gate: "CNOT", qubits: [0, 1] },
        { gate: "CNOT", qubits: [1, 2] },
      ],
    },
  },
  {
    id: "uniform",
    name: "Uniform superposition",
    description: "H on every qubit of a 4-qubit register: all 16 outcomes with probability 1/16.",
    circuit: { numQubits: 4, ops: [0, 1, 2, 3].map((q) => ({ gate: "H" as const, qubits: [q] })) },
  },
  {
    id: "interference",
    name: "Interference (H·Z·H = X)",
    description: "A phase flip between two Hadamards deterministically yields |1⟩.",
    circuit: {
      numQubits: 1,
      ops: [
        { gate: "H", qubits: [0] },
        { gate: "Z", qubits: [0] },
        { gate: "H", qubits: [0] },
      ],
    },
  },
  {
    id: "rotation",
    name: "Ry(π/3) rotation",
    description: "P(1) = sin²(π/6) = 0.25 exactly.",
    circuit: { numQubits: 1, ops: [{ gate: "RY", qubits: [0], theta: Math.PI / 3 }] },
  },
];
