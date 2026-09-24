/**
 * Job-request construction and the Builder → IBM hand-off.
 * Everything that reaches the server is re-validated there as well.
 */
import type { Circuit } from "@/lib/quantum/circuit";
import { parseProposal } from "@/lib/assistant/proposal";
import { toQasm3 } from "./qasm";

export const IBM_LIMITS = { minShots: 1, maxShots: 20_000 } as const;
export const IBM_BACKEND_RE = /^[a-z][a-z0-9_]{2,40}$/;
export const IBM_TRANSFER_KEY = "qal:ibm-circuit";

export type JobRequest = { backend: string; shots: number; qasm: string; circuit: Circuit };
export type JobRequestResult = { ok: true; request: JobRequest } | { ok: false; errors: string[] };

export function buildJobRequest(input: { circuit: unknown; backend: string; shots: number }): JobRequestResult {
  const errors: string[] = [];
  const check = parseProposal(input.circuit);
  if (!check.ok) errors.push(...check.errors);
  const backend = input.backend.trim();
  if (!IBM_BACKEND_RE.test(backend)) errors.push("Backend name must look like an IBM backend id, e.g. ibm_brisbane.");
  if (!Number.isInteger(input.shots) || input.shots < IBM_LIMITS.minShots || input.shots > IBM_LIMITS.maxShots)
    errors.push(`Shots must be an integer between ${IBM_LIMITS.minShots} and ${IBM_LIMITS.maxShots}.`);
  if (errors.length || !check.ok) return { ok: false, errors };
  return { ok: true, request: { backend, shots: input.shots, circuit: check.circuit, qasm: toQasm3(check.circuit) } };
}

type KV = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function writeIbmTransfer(c: Circuit, store: KV): boolean {
  const check = parseProposal(c);
  if (!check.ok) return false;
  store.setItem(IBM_TRANSFER_KEY, JSON.stringify(check.circuit));
  return true;
}

/** One-shot read; tampered or invalid payloads return null. */
export function readIbmTransfer(store: KV): Circuit | null {
  const raw = store.getItem(IBM_TRANSFER_KEY);
  if (raw === null) return null;
  store.removeItem(IBM_TRANSFER_KEY);
  const check = parseProposal(raw);
  return check.ok ? check.circuit : null;
}
