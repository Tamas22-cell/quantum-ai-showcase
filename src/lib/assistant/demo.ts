/**
 * Scripted demo responder — NOT AI. Lets the full interface and the validation
 * pipeline be exercised without spending AI credits. Output is clearly labelled.
 */
import type { AssistantMode, AssistantReply } from "./types";

const PI = Math.PI;
const CIRCUITS: Record<string, { text: string; circuit: unknown }> = {
  bell: {
    text: "Bell state |Φ⁺⟩ = (|00⟩ + |11⟩)/√2: a Hadamard on q0 creates superposition, then CNOT (control q0, target q1) correlates the qubits. Ideal probabilities: 0.5 for 00 and 11.",
    circuit: {
      numQubits: 2,
      ops: [
        { gate: "H", qubits: [0] },
        { gate: "CNOT", qubits: [0, 1] },
      ],
    },
  },
  ghz: {
    text: "3-qubit GHZ state (|000⟩ + |111⟩)/√2 via H on q0 and a CNOT chain q0→q1→q2.",
    circuit: {
      numQubits: 3,
      ops: [
        { gate: "H", qubits: [0] },
        { gate: "CNOT", qubits: [0, 1] },
        { gate: "CNOT", qubits: [1, 2] },
      ],
    },
  },
  qaoa: {
    text: "One QAOA layer (p = 1) for Max-Cut on a single edge (q0–q1): H on both qubits, the cost unitary exp(−iγZZ/2) as CNOT·Rz(γ)·CNOT, then the mixer Rx(2β) on each qubit. Angles γ = π/2, β = π/8 are illustrative, not optimised.",
    circuit: {
      numQubits: 2,
      ops: [
        { gate: "H", qubits: [0] },
        { gate: "H", qubits: [1] },
        { gate: "CNOT", qubits: [0, 1] },
        { gate: "RZ", qubits: [1], theta: PI / 2 },
        { gate: "CNOT", qubits: [0, 1] },
        { gate: "RX", qubits: [0], theta: PI / 4 },
        { gate: "RX", qubits: [1], theta: PI / 4 },
      ],
    },
  },
  invalid: {
    text: "Example of a rejected proposal: this draft uses an unsupported Toffoli gate and a qubit index that does not exist, so validation blocks it.",
    circuit: {
      numQubits: 2,
      ops: [
        { gate: "CCX", qubits: [0, 1, 2] },
        { gate: "H", qubits: [7] },
      ],
    },
  },
};

const EXPLAIN: Record<string, string> = {
  qaoa: "QAOA alternates a cost unitary e^{−iγC} (encoding the objective, e.g. Max-Cut) with a mixer e^{−iβB}. A classical optimiser tunes (γ, β) to maximise ⟨C⟩. On small instances a classical computer simulates it exactly; no quantum advantage is implied.",
  vqe: "VQE prepares a parameterised ansatz |ψ(θ)⟩, measures ⟨ψ|H|ψ⟩, and a classical optimiser minimises it. By the variational principle the result upper-bounds the ground-state energy.",
  default:
    "In scripted mode I can outline QAOA, VQE, Max-Cut, statevectors and measurement. Switch to Live AI for open-ended answers.",
};

export function demoReply(mode: AssistantMode, question: string): AssistantReply {
  const q = question.toLowerCase();
  if (mode === "draft-circuit") {
    const key =
      q.includes("invalid") || q.includes("toffoli")
        ? "invalid"
        : q.includes("ghz")
          ? "ghz"
          : q.includes("qaoa") || q.includes("max-cut")
            ? "qaoa"
            : "bell";
    const c = CIRCUITS[key]!;
    return { ok: true, source: "demo", answer: c.text, circuitRaw: JSON.stringify(c.circuit) };
  }
  if (mode === "explain-results") {
    return {
      ok: true,
      source: "demo",
      circuitRaw: null,
      answer:
        "Scripted reading guide: compare sampled frequencies with exact probabilities — deviations shrink roughly as 1/√shots. Results on this site come from ideal classical simulation, not quantum hardware.",
    };
  }
  const key = q.includes("vqe") ? "vqe" : q.includes("qaoa") ? "qaoa" : "default";
  return { ok: true, source: "demo", answer: EXPLAIN[key]!, circuitRaw: null };
}
