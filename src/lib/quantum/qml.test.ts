import { describe, expect, it } from "vitest";
import {
  accuracy,
  bceLoss,
  confusionMatrix,
  encodeAngle,
  generateDataset,
  logRegPredict,
  measurementProbs,
  parseSamples,
  predictProba,
  qmlCircuit,
  sigmoid,
  trainLogReg,
  trainQml,
  trainTestSplit,
  validateCircuit,
  validateDataset,
  validateQmlConfig,
} from "@/lib/quantum";

describe("QML lab", () => {
  it("generates deterministic, bounded, two-class datasets", () => {
    for (const k of ["linear", "xor", "circle"] as const) {
      const a = generateDataset(k, 60, 11),
        b = generateDataset(k, 60, 11);
      expect(a).toEqual(b);
      expect(a).toHaveLength(60);
      expect(validateDataset(a)).toEqual([]);
      expect(generateDataset(k, 60, 12)).not.toEqual(a);
    }
    const xor = generateDataset("xor", 40, 3);
    xor.forEach((s) => expect(s.y).toBe(s.x1 * s.x2 > 0 ? 0 : 1));
  });

  it("splits train/test deterministically without loss or overlap", () => {
    const d = generateDataset("circle", 50, 1);
    const s1 = trainTestSplit(d, 0.3, 5),
      s2 = trainTestSplit(d, 0.3, 5);
    expect(s1).toEqual(s2);
    expect(s1.test).toHaveLength(15);
    expect(s1.train.length + s1.test.length).toBe(50);
    expect(new Set([...s1.train, ...s1.test]).size).toBe(50);
  });

  it("angle-encodes features and builds a valid circuit", () => {
    expect(encodeAngle(1)).toBeCloseTo(Math.PI);
    expect(encodeAngle(-0.5)).toBeCloseTo(-Math.PI / 2);
    const c = qmlCircuit(0.2, -0.4, new Array(8).fill(0.1), 2);
    expect(c.ops).toHaveLength(14);
    expect(c.ops.filter((o) => o.gate === "CNOT")).toHaveLength(2);
    expect(c.ops[0]).toMatchObject({ gate: "RY", qubits: [0] });
    expect(c.ops[0]!.theta).toBeCloseTo(0.2 * Math.PI);
    expect(validateCircuit(c)).toEqual([]);
    expect(() => qmlCircuit(0, 0, [1, 2], 1)).toThrow();
  });

  it("gives normalised probabilities and the analytic parity output", () => {
    for (let i = 0; i < 20; i++) {
      const p = measurementProbs(
        Math.sin(i),
        Math.cos(i),
        Array.from({ length: 8 }, (_, j) => i + j),
        2,
      );
      expect(p.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12);
      const q = predictProba(
        Math.sin(i),
        Math.cos(i),
        Array.from({ length: 8 }, (_, j) => i + j),
        2,
      );
      expect(q).toBeGreaterThanOrEqual(0);
      expect(q).toBeLessThanOrEqual(1);
    }
    // Zero trainable params, depth 1: Ry(πx1)⊗Ry(πx2) then CNOT; parity odd prob = sin²(a/2)cos²(b/2)+cos²(a/2)sin²(b/2) with CNOT mapping q1→q1⊕q0 → P(q1=1).
    const a = encodeAngle(0.3),
      b = encodeAngle(-0.7);
    const s = (t: number) => Math.sin(t / 2) ** 2,
      c = (t: number) => Math.cos(t / 2) ** 2;
    expect(predictProba(0.3, -0.7, [0, 0, 0, 0], 1)).toBeCloseTo(s(b) * c(a) + c(b) * s(a), 12);
  });

  it("computes loss, accuracy and confusion matrix correctly", () => {
    expect(bceLoss([0.5, 0.5], [0, 1])).toBeCloseTo(Math.log(2));
    expect(bceLoss([1, 0], [1, 0])).toBeLessThan(1e-6);
    expect(Number.isFinite(bceLoss([0, 1], [1, 0]))).toBe(true); // clamped
    const p = [0.9, 0.2, 0.6, 0.4],
      y: (0 | 1)[] = [1, 0, 0, 1];
    expect(accuracy(p, y)).toBe(0.5);
    expect(confusionMatrix(p, y)).toEqual([
      [1, 1],
      [1, 1],
    ]);
  });

  it("trains deterministically for the same seed and reduces loss", async () => {
    const { train, test } = trainTestSplit(generateDataset("linear", 40, 2), 0.25, 2);
    const cfg = { depth: 1, maxIter: 40, seed: 9, testFraction: 0.25 };
    const r1 = await trainQml(train, test, cfg, { yieldEvery: 1000 });
    const r2 = await trainQml(train, test, cfg, { yieldEvery: 1000 });
    expect(r1.params).toEqual(r2.params);
    expect(r1.history).toEqual(r2.history);
    expect(r1.history.at(-1)!.loss).toBeLessThanOrEqual(r1.history[0]!.loss);
    const r3 = await trainQml(train, test, { ...cfg, seed: 10 }, { yieldEvery: 1000 });
    expect(r3.params).not.toEqual(r1.params);
  });

  it("learns XOR with the parity readout", async () => {
    const { train, test } = trainTestSplit(generateDataset("xor", 40, 4), 0.25, 4);
    const r = await trainQml(
      train,
      test,
      { depth: 1, maxIter: 150, seed: 1, testFraction: 0.25 },
      { yieldEvery: 1000 },
    );
    expect(r.trainAcc).toBeGreaterThanOrEqual(0.9);
  });

  it("supports cancellation", async () => {
    const d = generateDataset("circle", 30, 1);
    const ac = new AbortController();
    ac.abort();
    await expect(
      trainQml(d, [], { depth: 1, maxIter: 50, seed: 1, testFraction: 0.2 }, { signal: ac.signal }),
    ).rejects.toThrow();
  });

  it("classical logistic regression baseline behaves as expected", () => {
    expect(sigmoid(0)).toBe(0.5);
    const lin = generateDataset("linear", 80, 3);
    const m = trainLogReg(lin);
    expect(m.w).toHaveLength(2);
    expect(
      accuracy(
        lin.map((s) => logRegPredict(m, s.x1, s.x2)),
        lin.map((s) => s.y),
      ),
    ).toBeGreaterThanOrEqual(0.95);
    expect(trainLogReg(lin)).toEqual(m); // deterministic
    const circ = generateDataset("circle", 80, 3);
    const quad = trainLogReg(circ, { quadratic: true });
    expect(
      accuracy(
        circ.map((s) => logRegPredict(quad, s.x1, s.x2)),
        circ.map((s) => s.y),
      ),
    ).toBeGreaterThan(0.85);
  });

  it("validates datasets, custom samples and config", () => {
    expect(validateDataset(generateDataset("linear", 4, 1)).length).toBeGreaterThan(0);
    expect(
      validateDataset(Array.from({ length: 10 }, () => ({ x1: 0, x2: 0, y: 1 as const }))),
    ).toContain("Both classes (0 and 1) must be present.");
    expect(
      validateDataset([...generateDataset("xor", 10, 1), { x1: NaN, x2: 0, y: 0 }]).length,
    ).toBeGreaterThan(0);
    const p = parseSamples("0.1, 0.2, 1\nfoo,1,0\n2,0,1\n0,0,3\n0.5 -0.5 0\n0,0");
    expect(p.samples).toHaveLength(2);
    expect(p.errors).toHaveLength(4);
    expect(
      validateQmlConfig({ depth: 0, maxIter: 1000, seed: -1, testFraction: 0.9 }),
    ).toHaveLength(4);
    expect(validateQmlConfig({ depth: 2, maxIter: 100, seed: 0, testFraction: 0.25 })).toEqual([]);
  });
});
