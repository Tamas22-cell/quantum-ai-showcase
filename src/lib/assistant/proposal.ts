/**
 * Strict parsing + validation of AI-proposed circuits.
 * AI output is treated as untrusted data: it is never executed, only parsed into
 * the engine's structured `Circuit` type and checked against hard limits.
 */
import { GATE_META, validateCircuit, type Circuit, type GateName, type Op } from "@/lib/quantum/circuit";

export const PROPOSAL_LIMITS = { maxQubits: 5, maxOps: 40, maxDepth: 30, maxAbsTheta: 8 * Math.PI } as const;

const ALIASES: Record<string, GateName> = {
  H: "H", X: "X", Y: "Y", Z: "Z", S: "S", T: "T", RX: "RX", RY: "RY", RZ: "RZ",
  CNOT: "CNOT", CX: "CNOT", CZ: "CZ", M: "M", MEASURE: "M",
};

export type ProposalResult =
  | { ok: true; circuit: Circuit; depth: number }
  | { ok: false; errors: string[] };

/** Extract a JSON object from raw text (tolerates ```json fences). */
function extractJson(raw: string): unknown {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const text = (fenced ? fenced[1] : raw)!.trim();
  return JSON.parse(text);
}

/** Circuit depth: longest chain of ops sharing a qubit. */
export function circuitDepth(c: Circuit): number {
  const layer = new Array<number>(c.numQubits).fill(0);
  for (const op of c.ops) {
    const d = Math.max(...op.qubits.map((q) => layer[q] ?? 0)) + 1;
    op.qubits.forEach((q) => { layer[q] = d; });
  }
  return Math.max(0, ...layer);
}

export function parseProposal(input: unknown): ProposalResult {
  let data: unknown = input;
  if (typeof input === "string") {
    try { data = extractJson(input); } catch { return { ok: false, errors: ["Proposal is not valid JSON."] }; }
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) return { ok: false, errors: ["Proposal must be a JSON object."] };
  const obj = data as Record<string, unknown>;
  const errors: string[] = [];

  const numQubits = obj["numQubits"];
  if (typeof numQubits !== "number" || !Number.isInteger(numQubits)) errors.push("numQubits must be an integer.");
  const rawOps = obj["ops"];
  if (!Array.isArray(rawOps)) return { ok: false, errors: [...errors, "ops must be an array."] };
  if (rawOps.length > PROPOSAL_LIMITS.maxOps) errors.push(`Too many operations (max ${PROPOSAL_LIMITS.maxOps}).`);

  const ops: Op[] = [];
  rawOps.slice(0, PROPOSAL_LIMITS.maxOps).forEach((r, i) => {
    const step = `Step ${i + 1}`;
    if (!r || typeof r !== "object") { errors.push(`${step}: operation must be an object.`); return; }
    const o = r as Record<string, unknown>;
    const name = typeof o["gate"] === "string" ? ALIASES[o["gate"].trim().toUpperCase()] : undefined;
    if (!name) { errors.push(`${step}: unsupported gate "${String(o["gate"])}".`); return; }
    const qubits = o["qubits"];
    if (!Array.isArray(qubits) || !qubits.every((q) => typeof q === "number" && Number.isInteger(q))) {
      errors.push(`${step}: qubits must be an array of integers.`); return;
    }
    const meta = GATE_META[name];
    const op: Op = { gate: name, qubits: qubits as number[] };
    if (meta.param) {
      const t = o["theta"];
      if (typeof t !== "number" || !Number.isFinite(t)) { errors.push(`${step}: ${name} requires a finite numeric theta (radians).`); return; }
      if (Math.abs(t) > PROPOSAL_LIMITS.maxAbsTheta) { errors.push(`${step}: theta out of range (|θ| ≤ 8π).`); return; }
      op.theta = t;
    } else if (o["theta"] !== undefined && o["theta"] !== null) {
      errors.push(`${step}: ${name} takes no parameter.`); return;
    }
    ops.push(op);
  });
  if (errors.length) return { ok: false, errors };

  const circuit: Circuit = { numQubits: numQubits as number, ops };
  const engineErrors = validateCircuit(circuit, PROPOSAL_LIMITS.maxQubits, PROPOSAL_LIMITS.maxOps);
  if (engineErrors.length) return { ok: false, errors: engineErrors };
  const depth = circuitDepth(circuit);
  if (depth > PROPOSAL_LIMITS.maxDepth) return { ok: false, errors: [`Circuit depth ${depth} exceeds ${PROPOSAL_LIMITS.maxDepth}.`] };
  return { ok: true, circuit, depth };
}
