/**
 * Hand-off of a validated circuit from the Assistant to the Circuit Builder.
 * The payload is re-validated on read, so a tampered value can never load.
 */
import type { Circuit } from "@/lib/quantum/circuit";
import { parseProposal } from "./proposal";

export const TRANSFER_KEY = "qal:circuit-transfer";
type KV = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function writeTransfer(circuit: Circuit, store: KV): boolean {
  const check = parseProposal(circuit);
  if (!check.ok) return false;
  store.setItem(TRANSFER_KEY, JSON.stringify(check.circuit));
  return true;
}

/** Reads and consumes (one-shot) a pending transfer. Returns null when absent or invalid. */
export function readTransfer(store: KV): Circuit | null {
  const raw = store.getItem(TRANSFER_KEY);
  if (raw === null) return null;
  store.removeItem(TRANSFER_KEY);
  const check = parseProposal(raw);
  return check.ok ? check.circuit : null;
}
