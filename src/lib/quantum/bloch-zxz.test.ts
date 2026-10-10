import { describe, expect, it } from "vitest";
import {
  applyMatrix,
  blochVector,
  evolve,
  presetState,
  qiskitCode,
  stateMetrics,
  zxzUnitary,
  type PresetId,
} from "./bloch-zxz";

const PI = Math.PI;
const near = (v: { x: number; y: number; z: number }, x: number, y: number, z: number) => {
  expect(v.x).toBeCloseTo(x, 10);
  expect(v.y).toBeCloseTo(y, 10);
  expect(v.z).toBeCloseTo(z, 10);
};

describe("ZXZ Bloch engine", () => {
  it("places presets at the correct Bloch poles", () => {
    const expected: Record<PresetId, [number, number, number]> = {
      "0": [0, 0, 1],
      "1": [0, 0, -1],
      "+": [1, 0, 0],
      "-": [-1, 0, 0],
      "i+": [0, 1, 0],
    };
    for (const [id, [x, y, z]] of Object.entries(expected))
      near(blochVector(presetState(id as PresetId)), x, y, z);
  });

  it("Rx(π)|0⟩ = −i|1⟩ (keeps the global phase)", () => {
    const [a, b] = evolve("0", 0, PI, 0);
    expect(a.re).toBeCloseTo(0);
    expect(a.im).toBeCloseTo(0);
    expect(b.re).toBeCloseTo(0);
    expect(b.im).toBeCloseTo(-1);
  });

  it("Rz(π/2)|+⟩ is |+i⟩ with Qiskit's e^{-iπ/4} global phase", () => {
    const s = evolve("+", PI / 2, 0, 0);
    near(blochVector(s), 0, 1, 0);
    const m = stateMetrics(s);
    expect(m.globalPhase).toBeCloseTo(-PI / 4);
    expect(m.relativePhase).toBeCloseTo(PI / 2);
  });

  it("applies gates in circuit order (Rz(α) first)", () => {
    near(blochVector(evolve("0", PI / 2, PI / 2, 0)), 0, -1, 0);
    near(blochVector(evolve("0", 0, PI / 2, PI / 2)), 1, 0, 0);
  });

  it("gate-by-gate evolution equals U = Rz(γ)Rx(β)Rz(α) and stays normalized", () => {
    const [al, be, ga] = [0.7, -1.9, 2.4];
    for (const id of ["0", "1", "+", "-", "i+"] as PresetId[]) {
      const a = evolve(id, al, be, ga);
      const b = applyMatrix(zxzUnitary(al, be, ga), presetState(id));
      for (const k of [0, 1] as const) {
        expect(a[k].re).toBeCloseTo(b[k].re, 12);
        expect(a[k].im).toBeCloseTo(b[k].im, 12);
      }
      expect(stateMetrics(a).norm).toBeCloseTo(1, 12);
    }
  });

  it("P(0) of Rx(β)|0⟩ equals cos²(β/2) for any Z phases", () => {
    const m = stateMetrics(evolve("0", 1.1, 1.2, -0.4));
    expect(m.p0).toBeCloseTo(Math.cos(0.6) ** 2, 12);
    expect(m.p1).toBeCloseTo(Math.sin(0.6) ** 2, 12);
  });

  it("emits Qiskit code with the same gate order", () => {
    const code = qiskitCode("-", 0.5, 1, -0.25);
    expect(code.indexOf("qc.x(0)")).toBeLessThan(code.indexOf("qc.h(0)"));
    expect(code.indexOf("qc.rz(0.5, 0)")).toBeLessThan(code.indexOf("qc.rx(1, 0)"));
    expect(code).toContain("qc.rz(-0.25, 0)");
  });
});
