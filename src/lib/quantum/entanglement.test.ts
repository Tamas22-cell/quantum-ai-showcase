import { describe, expect, it } from "vitest";
import {
  bellCircuit,
  correlator,
  jointProbabilities,
  runChsh,
  OPTIMAL_CHSH,
  TSIRELSON,
  validateShots,
  BELL_STATES,
  type BellState,
  type Basis,
} from "./entanglement";
import { simulate, validateCircuit } from "./circuit";
import { norm } from "./statevector";

const close = (a: number, b: number) => expect(a).toBeCloseTo(b, 10);
const states = Object.keys(BELL_STATES) as BellState[];

describe("Entanglement engine", () => {
  it("prepares the four Bell states with correct amplitudes", () => {
    const s = 1 / Math.SQRT2;
    const expected: Record<BellState, number[]> = {
      "phi+": [s, 0, 0, s],
      "phi-": [s, 0, 0, -s],
      "psi+": [0, s, s, 0],
      "psi-": [0, -s, s, 0],
    };
    for (const st of states) {
      const v = simulate(bellCircuit(st, "Z", "Z"));
      expected[st].forEach((e, i) => {
        close(v.re[i]!, e);
        close(v.im[i]!, 0);
      });
      close(norm(v), 1);
    }
  });

  it("produces valid circuits for every state/basis combination", () => {
    for (const st of states)
      for (const a of ["X", "Y", "Z"] as Basis[])
        for (const b of ["X", "Y", "Z"] as Basis[])
          expect(validateCircuit(bellCircuit(st, a, b))).toEqual([]);
  });

  it("matches known Pauli correlators", () => {
    // ⟨ZZ⟩, ⟨XX⟩, ⟨YY⟩ for Φ⁺, Φ⁻, Ψ⁺, Ψ⁻
    const table: Record<BellState, [number, number, number]> = {
      "phi+": [1, 1, -1],
      "phi-": [1, -1, 1],
      "psi+": [-1, 1, 1],
      "psi-": [-1, -1, -1],
    };
    for (const st of states) {
      const [zz, xx, yy] = table[st];
      close(correlator(jointProbabilities(bellCircuit(st, "Z", "Z"))), zz);
      close(correlator(jointProbabilities(bellCircuit(st, "X", "X"))), xx);
      close(correlator(jointProbabilities(bellCircuit(st, "Y", "Y"))), yy);
      close(correlator(jointProbabilities(bellCircuit(st, "X", "Z"))), 0);
    }
  });

  it("Φ⁺ measured in ZZ gives 50/50 on 00 and 11 only", () => {
    const p = jointProbabilities(bellCircuit("phi+", "Z", "Z"));
    close(p[0]!, 0.5);
    close(p[1]!, 0);
    close(p[2]!, 0);
    close(p[3]!, 0.5);
  });

  it("CHSH reaches Tsirelson's bound at optimal angles and E = cos(a−b) for Φ⁺", () => {
    const r = runChsh("phi+", OPTIMAL_CHSH);
    close(r.exactS, TSIRELSON);
    close(r.terms[0]!.exact, Math.cos(OPTIMAL_CHSH.a - OPTIMAL_CHSH.b));
    for (const st of states)
      expect(Math.abs(runChsh(st, OPTIMAL_CHSH).exactS)).toBeLessThanOrEqual(TSIRELSON + 1e-9);
  });

  it("aligned settings do not violate the classical bound", () => {
    expect(Math.abs(runChsh("phi+", { a: 0, a2: 0, b: 0, b2: 0 }).exactS)).toBeLessThanOrEqual(
      2 + 1e-9,
    );
  });

  it("seeded CHSH sampling is reproducible and converges", () => {
    const a = runChsh("phi+", OPTIMAL_CHSH, 20000, 7),
      b = runChsh("phi+", OPTIMAL_CHSH, 20000, 7);
    expect(a.sampledS).toBe(b.sampledS);
    expect(Math.abs(a.sampledS! - TSIRELSON)).toBeLessThan(0.08);
  });

  it("rejects invalid input", () => {
    expect(validateShots(0)).not.toBeNull();
    expect(validateShots(1.5)).not.toBeNull();
    expect(validateShots(100_001)).not.toBeNull();
    expect(validateShots(1000)).toBeNull();
    expect(() => runChsh("phi+", { ...OPTIMAL_CHSH, a: NaN })).toThrow();
    expect(() => bellCircuit("bogus" as BellState, "Z", "Z")).toThrow();
    expect(() => correlator([0, 0, 0, 0])).toThrow();
  });
});
