import { describe, expect, it } from "vitest";
import { EXAMPLE_CIRCUITS } from "./examples";
import { transpile, stateFidelity, basisLabel } from "./transpile";
import type { Circuit, GateName } from "./circuit";

const ALLOWED = new Set(["RZ", "SX", "X", "CZ", "M"]);

describe("transpile", () => {
  it("every example circuit is equivalent after transpilation (levels 0 and 1)", () => {
    for (const ex of EXAMPLE_CIRCUITS)
      for (const lvl of [0, 1] as const) {
        const r = transpile(ex.circuit, lvl);
        expect(stateFidelity(ex.circuit, r.circuit)).toBeCloseTo(1, 10);
        r.circuit.ops.forEach((o) => expect(ALLOWED.has(basisLabel(o))).toBe(true));
      }
  });

  it("each single gate decomposes exactly", () => {
    const gates: GateName[] = ["H", "X", "Y", "Z", "S", "T", "RX", "RY", "RZ"];
    for (const g of gates) {
      const c: Circuit = {
        numQubits: 1,
        ops: [
          { gate: "H", qubits: [0] },
          { gate: "T", qubits: [0] },
          { gate: g, qubits: [0], theta: 0.731 },
        ],
      };
      expect(stateFidelity(c, transpile(c).circuit)).toBeCloseTo(1, 10);
    }
  });

  it("CNOT becomes CZ conjugated by H and optimisation reduces op count", () => {
    const c: Circuit = {
      numQubits: 2,
      ops: [
        { gate: "H", qubits: [0] },
        { gate: "CNOT", qubits: [0, 1] },
      ],
    };
    const r0 = transpile(c, 0),
      r1 = transpile(c, 1);
    expect(r1.circuit.ops.some((o) => o.gate === "CZ")).toBe(true);
    expect(r1.after.ops).toBeLessThanOrEqual(r0.after.ops);
  });

  it("cancels X·X and CZ·CZ", () => {
    const c: Circuit = {
      numQubits: 2,
      ops: [
        { gate: "X", qubits: [0] },
        { gate: "X", qubits: [0] },
        { gate: "CZ", qubits: [0, 1] },
        { gate: "CZ", qubits: [0, 1] },
      ],
    };
    expect(transpile(c, 1).after.ops).toBe(0);
  });

  it("is deterministic", () => {
    const c = EXAMPLE_CIRCUITS[1]!.circuit;
    expect(JSON.stringify(transpile(c))).toBe(JSON.stringify(transpile(c)));
  });
});
