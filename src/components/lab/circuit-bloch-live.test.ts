import { describe, expect, it } from "vitest";
import { reducedBloch } from "./circuit-bloch-live";
import { simulate, type Circuit } from "@/lib/quantum";

function vector(ops: Circuit["ops"], n = 1) {
  return reducedBloch(simulate({ numQubits: n, ops }), 0);
}

describe("live circuit Bloch vector", () => {
  it("maps |0> to the north pole", () => {
    expect(vector([])).toEqual({ x: 0, y: 0, z: 1 });
  });
  it("maps X|0> to the south pole", () => {
    const v = vector([{ gate: "X", qubits: [0] }]);
    expect(v.z).toBeCloseTo(-1);
    expect(v.x).toBeCloseTo(0);
  });
  it("maps H|0> to positive X", () => {
    const v = vector([{ gate: "H", qubits: [0] }]);
    expect(v.x).toBeCloseTo(1);
    expect(v.y).toBeCloseTo(0);
    expect(v.z).toBeCloseTo(0);
  });
  it("shows a maximally mixed reduced state for a Bell pair", () => {
    const s = simulate({
      numQubits: 2,
      ops: [
        { gate: "H", qubits: [0] },
        { gate: "CNOT", qubits: [0, 1] },
      ],
    });
    for (const q of [0, 1]) {
      const v = reducedBloch(s, q);
      expect(v.x).toBeCloseTo(0);
      expect(v.y).toBeCloseTo(0);
      expect(v.z).toBeCloseTo(0);
    }
  });
});
