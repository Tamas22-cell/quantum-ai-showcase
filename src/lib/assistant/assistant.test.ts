import { describe, expect, it } from "vitest";

import { EXAMPLE_CIRCUITS, probabilities, simulate } from "@/lib/quantum";
import { runArena } from "@/lib/quantum/benchmark";
import { demoReply } from "./demo";
import { circuitDepth, parseProposal } from "./proposal";
import { readTransfer, TRANSFER_KEY, writeTransfer } from "./transfer";

function memStore() {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k), m };
}

describe("C2 proposal validation", () => {
  it("accepts a valid Bell proposal and simulates it correctly", () => {
    const r = parseProposal({ numQubits: 2, ops: [{ gate: "H", qubits: [0], theta: null }, { gate: "CX", qubits: [0, 1], theta: null }] });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.circuit.ops[1]!.gate).toBe("CNOT");
    const p = probabilities(simulate(r.circuit));
    expect(p[0]).toBeCloseTo(0.5); expect(p[3]).toBeCloseTo(0.5);
    expect(r.depth).toBe(2);
  });
  it("accepts JSON text in a code fence and rotations with theta", () => {
    const r = parseProposal('```json\n{"numQubits":1,"ops":[{"gate":"ry","qubits":[0],"theta":1.0472}]}\n```');
    expect(r.ok).toBe(true);
  });
  it("rejects unsupported gates", () => {
    const r = parseProposal({ numQubits: 3, ops: [{ gate: "CCX", qubits: [0, 1, 2] }] });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors[0]).toMatch(/unsupported gate/);
  });
  it("rejects invalid qubit references and control = target", () => {
    expect(parseProposal({ numQubits: 2, ops: [{ gate: "H", qubits: [5] }] }).ok).toBe(false);
    expect(parseProposal({ numQubits: 2, ops: [{ gate: "H", qubits: [-1] }] }).ok).toBe(false);
    expect(parseProposal({ numQubits: 2, ops: [{ gate: "CNOT", qubits: [1, 1] }] }).ok).toBe(false);
    expect(parseProposal({ numQubits: 2, ops: [{ gate: "CNOT", qubits: [0] }] }).ok).toBe(false);
  });
  it("rejects bad parameters", () => {
    expect(parseProposal({ numQubits: 1, ops: [{ gate: "RX", qubits: [0] }] }).ok).toBe(false);
    expect(parseProposal({ numQubits: 1, ops: [{ gate: "RX", qubits: [0], theta: "pi" }] }).ok).toBe(false);
    expect(parseProposal({ numQubits: 1, ops: [{ gate: "RX", qubits: [0], theta: 1e9 }] }).ok).toBe(false);
    expect(parseProposal({ numQubits: 1, ops: [{ gate: "H", qubits: [0], theta: 1 }] }).ok).toBe(false);
  });
  it("enforces qubit, op-count and depth limits", () => {
    expect(parseProposal({ numQubits: 6, ops: [] }).ok).toBe(false);
    expect(parseProposal({ numQubits: 1, ops: Array.from({ length: 41 }, () => ({ gate: "X", qubits: [0] })) }).ok).toBe(false);
    const deep = parseProposal({ numQubits: 1, ops: Array.from({ length: 31 }, () => ({ gate: "X", qubits: [0] })) });
    expect(deep.ok).toBe(false);
    if (!deep.ok) expect(deep.errors[0]).toMatch(/depth/);
    expect(circuitDepth({ numQubits: 2, ops: [{ gate: "H", qubits: [0] }, { gate: "H", qubits: [1] }] })).toBe(1);
  });
  it("rejects gates after measurement", () => {
    expect(parseProposal({ numQubits: 1, ops: [{ gate: "M", qubits: [0] }, { gate: "H", qubits: [0] }] }).ok).toBe(false);
  });
  it("handles malformed AI output without throwing", () => {
    for (const bad of ["not json", "{", "[]", "null", '{"numQubits":2}', '{"numQubits":"two","ops":[]}', 42, null, { ops: [null] }]) {
      expect(() => parseProposal(bad)).not.toThrow();
      expect(parseProposal(bad).ok).toBe(false);
    }
  });
});

describe("C2 transfer to Circuit Builder", () => {
  it("round-trips a validated circuit exactly once", () => {
    const s = memStore();
    const c = EXAMPLE_CIRCUITS[0]!.circuit;
    expect(writeTransfer(c, s)).toBe(true);
    expect(readTransfer(s)).toEqual(c);
    expect(readTransfer(s)).toBeNull();
  });
  it("refuses to write or read invalid/tampered payloads", () => {
    const s = memStore();
    expect(writeTransfer({ numQubits: 2, ops: [{ gate: "H", qubits: [9] }] }, s)).toBe(false);
    expect(s.m.size).toBe(0);
    s.setItem(TRANSFER_KEY, '{"numQubits":2,"ops":[{"gate":"EVAL","qubits":[0]}]}');
    expect(readTransfer(s)).toBeNull();
    expect(s.m.size).toBe(0);
  });
});

describe("C2 demo mode", () => {
  it("is labelled demo and its circuits pass/fail validation as intended", () => {
    const bell = demoReply("draft-circuit", "Draft a Bell state");
    expect(bell.ok && bell.source).toBe("demo");
    expect(bell.ok && parseProposal(bell.circuitRaw!).ok).toBe(true);
    for (const q of ["ghz", "qaoa layer"]) { const r = demoReply("draft-circuit", q); expect(r.ok && parseProposal(r.circuitRaw!).ok).toBe(true); }
    const bad = demoReply("draft-circuit", "invalid toffoli");
    expect(bad.ok && parseProposal(bad.circuitRaw!).ok).toBe(false);
    const ex = demoReply("explain-algorithm", "qaoa");
    expect(ex.ok && ex.circuitRaw).toBe(null);
  });
});

describe("Regression: existing modules", () => {
  it("Circuit Builder examples still validate through the C2 pipeline", () => {
    for (const ex of EXAMPLE_CIRCUITS) expect(parseProposal(ex.circuit).ok).toBe(true);
  });
  it("C1 Arena still runs reproducibly", async () => {
    const cfg = { graph: { n: 3, edges: [{ u: 0, v: 1, w: 1 }, { u: 1, v: 2, w: 1 }, { u: 0, v: 2, w: 1 }] }, p: 1, seed: 7 } as never;
    const a = await runArena(cfg); const b = await runArena(cfg);
    const strip = (r: unknown) => JSON.stringify(r, (k, v) => (/ms|time/i.test(k) ? undefined : v));
    expect(strip(a)).toBe(strip(b));
  });
});
