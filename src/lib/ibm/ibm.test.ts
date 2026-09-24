import { describe, expect, it } from "vitest";

import { EXAMPLE_CIRCUITS } from "@/lib/quantum/examples";
import type { Circuit } from "@/lib/quantum/circuit";
import { analyzeCircuit, toQasm3 } from "./qasm";
import { buildJobRequest, readIbmTransfer, writeIbmTransfer, IBM_TRANSFER_KEY } from "./job";

const bell = EXAMPLE_CIRCUITS.find((e) => e.id === "bell")!.circuit;
const mem = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) }; };

describe("IBM circuit analysis", () => {
  it("counts gates, measurements and depth for the Bell circuit", () => {
    const a = analyzeCircuit(bell);
    expect(a).toMatchObject({ numQubits: 2, gateCount: 2, twoQubitGates: 1, measurementOps: 2, implicitMeasurement: false });
    expect(a.depth).toBe(3);
    expect(a.needsDecomposition.sort()).toEqual(["CNOT", "H"]);
  });
  it("marks implicit measurement of all qubits", () => {
    const a = analyzeCircuit({ numQubits: 3, ops: [{ gate: "H", qubits: [0] }] });
    expect(a.implicitMeasurement).toBe(true);
    expect(a.measuredQubits).toEqual([0, 1, 2]);
  });
});

describe("OpenQASM 3 export", () => {
  it("emits the exact Bell program", () => {
    expect(toQasm3(bell)).toBe(
      'OPENQASM 3.0;\ninclude "stdgates.inc";\nqubit[2] q;\nbit[2] c;\nh q[0];\ncx q[0], q[1];\nc[0] = measure q[0];\nc[1] = measure q[1];\n',
    );
  });
  it("serialises rotation angles and adds measurements for all qubits", () => {
    const q = toQasm3({ numQubits: 1, ops: [{ gate: "RY", qubits: [0], theta: Math.PI / 2 }] });
    expect(q).toContain("ry(1.5707963267949) q[0];");
    expect(q).toContain("c[0] = measure q[0];");
  });
  it("refuses invalid circuits", () => {
    expect(() => toQasm3({ numQubits: 2, ops: [{ gate: "CNOT", qubits: [0, 0] }] })).toThrow();
    expect(() => toQasm3({ numQubits: 6, ops: [] })).toThrow();
  });
});

describe("job requests", () => {
  it("accepts a valid request", () => {
    const r = buildJobRequest({ circuit: bell, backend: "ibm_brisbane", shots: 1024 });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.request.qasm).toContain("cx q[0], q[1];");
  });
  it("rejects bad shots, backend names and unsupported gates", () => {
    const r = buildJobRequest({ circuit: { numQubits: 1, ops: [{ gate: "SWAP", qubits: [0] }] }, backend: "Bad Name!", shots: 0 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.length).toBe(3);
    expect(buildJobRequest({ circuit: bell, backend: "ibm_x", shots: 20_001 }).ok).toBe(false);
  });
  it("rejects malformed payloads", () => {
    expect(buildJobRequest({ circuit: "not json", backend: "ibm_brisbane", shots: 10 }).ok).toBe(false);
  });
});

describe("Builder → IBM transfer", () => {
  it("round-trips a valid circuit once", () => {
    const s = mem();
    expect(writeIbmTransfer(bell, s)).toBe(true);
    expect(readIbmTransfer(s)).toEqual(bell);
    expect(readIbmTransfer(s)).toBeNull();
  });
  it("rejects tampered payloads", () => {
    const s = mem();
    s.setItem(IBM_TRANSFER_KEY, JSON.stringify({ numQubits: 2, ops: [{ gate: "H", qubits: [7] }] }));
    expect(readIbmTransfer(s)).toBeNull();
    expect(writeIbmTransfer({ numQubits: 0, ops: [] } as Circuit, s)).toBe(false);
  });
});
