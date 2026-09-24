import { describe, expect, it } from "vitest";
import * as G from "./gates";
import {
  EXAMPLE_CIRCUITS, applySingle, createRng, marginal, measuredQubits, norm, probabilities,
  sampleCounts, simulate, validateCircuit, zeroState, type Circuit, type GateName,
} from "./index";

const EPS = 1e-12;
const close = (a: number, b: number, eps = EPS) => expect(Math.abs(a - b)).toBeLessThan(eps);

function isUnitary(m: G.Matrix2) {
  const p = G.matmul(G.dagger(m), m);
  [1, 0, 0, 1].forEach((v, i) => { close(p.re[i]!, v); close(p.im[i]!, 0); });
}

describe("gate matrices", () => {
  it("are unitary", () => {
    [G.H, G.X, G.Y, G.Z, G.S, G.T, G.rx(0.7), G.ry(-1.3), G.rz(2.9)].forEach(isUnitary);
  });
  it("satisfy algebraic identities", () => {
    const eq = (a: G.Matrix2, b: G.Matrix2) => a.re.forEach((_, i) => { close(a.re[i]!, b.re[i]!); close(a.im[i]!, b.im[i]!); });
    eq(G.matmul(G.H, G.H), G.I);
    eq(G.matmul(G.S, G.S), G.Z);
    eq(G.matmul(G.T, G.T), G.S);
    eq(G.matmul(G.matmul(G.H, G.Z), G.H), G.X);
    // Rx(π) = -iX
    const r = G.rx(Math.PI);
    close(r.im[1], -1); close(r.im[2], -1); close(r.re[0], 0);
  });
});

describe("statevector", () => {
  it("H|0> gives equal superposition", () => {
    const s = zeroState(1); applySingle(s, 0, G.H);
    close(s.re[0]!, Math.SQRT1_2); close(s.re[1]!, Math.SQRT1_2);
  });
  it("uses little-endian qubit ordering", () => {
    const s = simulate({ numQubits: 3, ops: [{ gate: "X", qubits: [1] }] });
    close(probabilities(s)[0b010]!, 1);
  });
  it("preserves normalisation for random circuits", () => {
    const rng = createRng(42);
    const gates: GateName[] = ["H", "X", "Y", "Z", "S", "T", "RX", "RY", "RZ", "CNOT", "CZ"];
    for (let trial = 0; trial < 50; trial++) {
      const n = 1 + Math.floor(rng() * 5);
      const c: Circuit = { numQubits: n, ops: [] };
      for (let k = 0; k < 40; k++) {
        const g = gates[Math.floor(rng() * gates.length)]!;
        if ((g === "CNOT" || g === "CZ") && n < 2) continue;
        const a = Math.floor(rng() * n);
        const b = (a + 1 + Math.floor(rng() * (n - 1))) % n;
        c.ops.push({ gate: g, qubits: g === "CNOT" || g === "CZ" ? [a, b] : [a], theta: rng() * 6.28 });
      }
      close(norm(simulate(c)), 1, 1e-10);
    }
  });
});

describe("entanglement", () => {
  it("prepares the Bell state (|00>+|11>)/√2", () => {
    const s = simulate(EXAMPLE_CIRCUITS.find((e) => e.id === "bell")!.circuit);
    close(s.re[0]!, Math.SQRT1_2); close(s.re[3]!, Math.SQRT1_2);
    close(s.re[1]!, 0); close(s.re[2]!, 0);
  });
  it("CZ applies a phase only to |11>", () => {
    const s = simulate({ numQubits: 2, ops: [{ gate: "H", qubits: [0] }, { gate: "H", qubits: [1] }, { gate: "CZ", qubits: [0, 1] }] });
    [0.5, 0.5, 0.5, -0.5].forEach((v, i) => close(s.re[i]!, v));
  });
  it("GHZ state has only 000 and 111", () => {
    const p = probabilities(simulate(EXAMPLE_CIRCUITS.find((e) => e.id === "ghz")!.circuit));
    close(p[0]!, 0.5); close(p[7]!, 0.5);
  });
});

describe("measurement", () => {
  it("Ry(π/3) gives P(1)=0.25", () => {
    close(probabilities(simulate(EXAMPLE_CIRCUITS.find((e) => e.id === "rotation")!.circuit))[1]!, 0.25);
  });
  it("marginalises correctly", () => {
    const p = probabilities(simulate({ numQubits: 2, ops: [{ gate: "X", qubits: [1] }, { gate: "H", qubits: [0] }] }));
    const m1 = marginal(p, [1]);
    close(m1[1]!, 1);
    const m0 = marginal(p, [0]);
    close(m0[0]!, 0.5);
  });
  it("defaults to measuring all qubits", () => {
    expect(measuredQubits({ numQubits: 3, ops: [] })).toEqual([0, 1, 2]);
    expect(measuredQubits({ numQubits: 3, ops: [{ gate: "M", qubits: [2] }] })).toEqual([2]);
  });
  it("sampling is reproducible with a seed and converges", () => {
    const p = new Float64Array([0.25, 0.75]);
    const a = sampleCounts(p, 20000, createRng(7));
    const b = sampleCounts(p, 20000, createRng(7));
    expect(Array.from(a)).toEqual(Array.from(b));
    expect(a[0]! + a[1]!).toBe(20000);
    close(a[1]! / 20000, 0.75, 0.02);
  });
});

describe("validation", () => {
  it("rejects invalid circuits", () => {
    expect(validateCircuit({ numQubits: 6, ops: [] })).not.toHaveLength(0);
    expect(validateCircuit({ numQubits: 2, ops: [{ gate: "CNOT", qubits: [1, 1] }] })).not.toHaveLength(0);
    expect(validateCircuit({ numQubits: 1, ops: [{ gate: "RX", qubits: [0], theta: NaN }] })).not.toHaveLength(0);
    expect(validateCircuit({ numQubits: 1, ops: [{ gate: "M", qubits: [0] }, { gate: "H", qubits: [0] }] })).not.toHaveLength(0);
    expect(validateCircuit({ numQubits: 1, ops: [{ gate: "H", qubits: [3] }] })).not.toHaveLength(0);
  });
  it("accepts all examples", () => {
    EXAMPLE_CIRCUITS.forEach((e) => expect(validateCircuit(e.circuit)).toEqual([]));
  });
});
