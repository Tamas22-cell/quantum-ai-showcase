import { describe, expect, it } from "vitest";
import {
  ansatzCircuit,
  exactSpectrum,
  expectation,
  groundFidelity,
  HAMILTONIAN_PRESETS,
  hamiltonianMatrix,
  paramCount,
  runVqe,
  validateHamiltonian,
  validateVqeConfig,
  vqeEnergy,
  zeroState,
  simulate,
  validateCircuit,
  type Hamiltonian,
  type VqeConfig,
} from "@/lib/quantum";

const preset = (id: string) => HAMILTONIAN_PRESETS.find((p) => p.id === id)!.h;
const base = (h: Hamiltonian, extra: Partial<VqeConfig> = {}): VqeConfig => ({
  hamiltonian: h,
  depth: 1,
  rotations: "ry",
  optimizer: "nelder-mead",
  maxIter: 200,
  restarts: 2,
  seed: 11,
  ...extra,
});

describe("VQE — Hamiltonians", () => {
  it("Pauli matrices and Qiskit ordering", () => {
    const y = hamiltonianMatrix({ n: 1, terms: [{ coef: 1, pauli: "Y" }] });
    expect([...y.re]).toEqual([0, 0, 0, 0]);
    expect([...y.im]).toEqual([0, -1, 1, 0]);
    const zi = hamiltonianMatrix({ n: 2, terms: [{ coef: 1, pauli: "ZI" }] }); // Z on q1
    expect([0, 5, 10, 15].map((k) => zi.re[k])).toEqual([1, 1, -1, -1]);
  });
  it("matrix is Hermitian", () => {
    const m = hamiltonianMatrix({
      n: 2,
      terms: [
        { coef: 0.3, pauli: "XY" },
        { coef: -0.7, pauli: "YZ" },
        { coef: 1.1, pauli: "ZX" },
      ],
    });
    for (let i = 0; i < 4; i++)
      for (let j = 0; j < 4; j++) {
        expect(m.re[i * 4 + j]).toBeCloseTo(m.re[j * 4 + i]!, 14);
        expect(m.im[i * 4 + j]).toBeCloseTo(-m.im[j * 4 + i]!, 14);
      }
  });
  it("exact ground energies of presets", () => {
    expect(exactSpectrum(preset("z")).ground).toBeCloseTo(-1, 10);
    const zz = exactSpectrum(preset("zz"));
    expect(zz.ground).toBeCloseTo(-1, 10);
    expect(zz.degeneracy).toBe(2);
    expect(exactSpectrum(preset("h2")).ground).toBeCloseTo(-1.857275, 5);
    expect(exactSpectrum(preset("custom")).ground).toBeCloseTo(-Math.sqrt(2), 10); // −ZZ + 0.5(XI+IX): −√(1+1)
  });
});

describe("VQE — energies", () => {
  it("expectation matches ⟨ψ|H|ψ⟩ via dense matrix", () => {
    const h = preset("h2");
    const s = simulate(ansatzCircuit(2, 1, "ryrz", [0.3, -1.2, 0.8, 0.1, 2.2, -0.4, 0.9, 1.5]));
    const m = hamiltonianMatrix(h);
    let e = 0;
    for (let i = 0; i < 4; i++)
      for (let j = 0; j < 4; j++) {
        const hr = m.re[i * 4 + j]!,
          hi = m.im[i * 4 + j]!,
          pr = hr * s.re[j]! - hi * s.im[j]!,
          pi = hr * s.im[j]! + hi * s.re[j]!;
        e += s.re[i]! * pr + s.im[i]! * pi;
      }
    expect(expectation(h, s)).toBeCloseTo(e, 12);
  });
  it("single-qubit Ry ansatz: E(θ) = cos θ", () => {
    for (const t of [0, 0.7, Math.PI / 2, 2.5])
      expect(vqeEnergy(preset("z"), 0, "ry", [t]).energy).toBeCloseTo(Math.cos(t), 12);
    expect(expectation(preset("z"), zeroState(1))).toBeCloseTo(1, 12);
  });
  it("fidelity 1 for exact ground state, 0 for orthogonal state", () => {
    const spec = exactSpectrum(preset("z"));
    expect(groundFidelity(spec, vqeEnergy(preset("z"), 0, "ry", [Math.PI]).state)).toBeCloseTo(
      1,
      10,
    );
    expect(groundFidelity(spec, zeroState(1))).toBeCloseTo(0, 10);
  });
  it("ansatz circuits are valid engine circuits with the right parameter count", () => {
    expect(paramCount(3, 2, "ryrz")).toBe(18);
    const c = ansatzCircuit(3, 2, "ryrz", new Array(18).fill(0.1));
    expect(validateCircuit(c, 5, 200)).toEqual([]);
    expect(c.ops.filter((o) => o.gate === "CNOT")).toHaveLength(4);
    expect(() => vqeEnergy(preset("z"), 0, "ry", [1, 2])).toThrow();
  });
});

describe("VQE — optimizers", () => {
  for (const optimizer of ["nelder-mead", "cobyla", "spsa"] as const) {
    it(`${optimizer} converges on every preset (variational bound respected)`, async () => {
      for (const id of ["z", "zz", "h2", "custom"]) {
        const r = await runVqe(
          base(preset(id), {
            optimizer,
            maxIter: optimizer === "spsa" ? 400 : 300,
            restarts: 3,
            depth: id === "z" ? 0 : 1,
          }),
        );
        expect(r.energy).toBeGreaterThanOrEqual(r.exact - 1e-9);
        expect(r.error).toBeLessThan(optimizer === "spsa" ? 2e-2 : 1e-4);
        if (optimizer !== "spsa") expect(r.fidelity).toBeGreaterThan(0.999);
        expect(r.probs.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12);
      }
    }, 30_000);
  }
  it("same seed → identical results; different seed → different starts", async () => {
    for (const optimizer of ["nelder-mead", "cobyla", "spsa"] as const) {
      const a = await runVqe(base(preset("h2"), { optimizer, maxIter: 60 })),
        b = await runVqe(base(preset("h2"), { optimizer, maxIter: 60 }));
      expect(a.params).toEqual(b.params);
      expect(a.history).toEqual(b.history);
    }
    const c = await runVqe(base(preset("h2"), { maxIter: 5, seed: 12 })),
      d = await runVqe(base(preset("h2"), { maxIter: 5 }));
    expect(c.history[0]!.current).not.toBe(d.history[0]!.current);
  });
  it("best-energy history is monotone non-increasing and cancellation works", async () => {
    const r = await runVqe(base(preset("custom"), { restarts: 3, maxIter: 80 }));
    r.history.forEach(
      (p, i) => i && expect(p.best).toBeLessThanOrEqual(r.history[i - 1]!.best + 1e-15),
    );
    const ac = new AbortController();
    ac.abort();
    await expect(runVqe(base(preset("h2")), { signal: ac.signal })).rejects.toThrow();
  });
});

describe("VQE — validation", () => {
  it("rejects bad Hamiltonians", () => {
    expect(validateHamiltonian({ n: 0, terms: [] })).not.toEqual([]);
    expect(validateHamiltonian({ n: 5, terms: [{ coef: 1, pauli: "ZZZZZ" }] })).not.toEqual([]);
    expect(validateHamiltonian({ n: 2, terms: [] })).not.toEqual([]);
    expect(validateHamiltonian({ n: 2, terms: [{ coef: 1, pauli: "Z" }] })[0]).toMatch(/exactly 2/);
    expect(validateHamiltonian({ n: 2, terms: [{ coef: 1, pauli: "ZQ" }] })[0]).toMatch(
      /I, X, Y, Z/,
    );
    expect(validateHamiltonian({ n: 1, terms: [{ coef: NaN, pauli: "Z" }] })).not.toEqual([]);
    expect(validateHamiltonian({ n: 1, terms: [{ coef: 1e6, pauli: "Z" }] })).not.toEqual([]);
    expect(validateHamiltonian({ n: 2, terms: [{ coef: 1, pauli: "zx" }] })).toEqual([]);
  });
  it("rejects bad run settings and never runs them", async () => {
    const h = preset("h2");
    for (const bad of [
      { depth: -1 },
      { depth: 1.5 },
      { depth: 99 },
      { maxIter: 0 },
      { restarts: 11 },
      { seed: -3 },
      { seed: 0.5 },
      { optimizer: "adam" as never },
      { rotations: "rx" as never },
    ])
      expect(validateVqeConfig(base(h, bad))).not.toEqual([]);
    expect(
      validateVqeConfig(
        base({ n: 4, terms: [{ coef: 1, pauli: "ZZZZ" }] }, { depth: 6, rotations: "ryrz" }),
      ),
    ).toEqual([]);
    await expect(runVqe(base(h, { maxIter: 0 }))).rejects.toThrow(/Iterations/);
    expect(validateVqeConfig(base(h))).toEqual([]);
  });
});
