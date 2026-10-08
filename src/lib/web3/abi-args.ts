/**
 * Text → ABI value parsing with clear validation errors, and result formatting.
 * Pure functions (no wallet/network) so they are unit-testable.
 */
import { getAddress, isAddress, isHex, stringToHex } from "viem";

export type AbiParam = { name?: string; type?: string; components?: AbiParam[] };

export class ArgError extends Error {}

const ARRAY_RE = /^(.*)\[(\d*)\]$/;

/** Parse one textual argument into the JS value viem expects for `type`. */
export function parseArg(type: string, raw: unknown, label = "argument"): unknown {
  const arr = ARRAY_RE.exec(type);
  if (arr) {
    const [, base, len] = arr as unknown as [string, string, string];
    let items: unknown;
    if (Array.isArray(raw)) items = raw;
    else {
      try {
        items = JSON.parse(String(raw ?? "").trim() || "[]");
      } catch {
        throw new ArgError(`${label}: ${type} expects a JSON array, e.g. ["a","b"] or [1,2].`);
      }
    }
    if (!Array.isArray(items)) throw new ArgError(`${label}: ${type} expects a JSON array.`);
    if (len && items.length !== Number(len))
      throw new ArgError(`${label}: ${type} needs exactly ${len} items (got ${items.length}).`);
    return items.map((v, i) => parseArg(base, v, `${label}[${i}]`));
  }
  if (type === "tuple" || type.startsWith("tuple"))
    throw new ArgError(`${label}: tuple/struct arguments are not supported in this panel.`);

  const s = typeof raw === "string" ? raw.trim() : String(raw ?? "");

  if (type === "string") return typeof raw === "string" ? raw : s;

  if (type === "bool") {
    if (/^(true|1)$/i.test(s)) return true;
    if (/^(false|0)$/i.test(s)) return false;
    throw new ArgError(`${label}: bool expects true or false.`);
  }

  const int = /^(u?)int(\d*)$/.exec(type);
  if (int) {
    const unsigned = int[1] === "u";
    const bits = Number(int[2] || 256);
    if (!/^-?\d+$/.test(s) && !/^0x[0-9a-f]+$/i.test(s))
      throw new ArgError(`${label}: ${type} expects an integer (decimal or 0x-hex).`);
    const v = BigInt(s);
    const min = unsigned ? 0n : -(2n ** BigInt(bits - 1));
    const max = unsigned ? 2n ** BigInt(bits) - 1n : 2n ** BigInt(bits - 1) - 1n;
    if (v < min || v > max) throw new ArgError(`${label}: value out of range for ${type}.`);
    return v;
  }

  if (type === "address") {
    if (!isAddress(s, { strict: false }))
      throw new ArgError(`${label}: invalid address (expected 0x + 40 hex characters).`);
    return getAddress(s);
  }

  if (type === "bytes") {
    if (!isHex(s) || s.length % 2 !== 0)
      throw new ArgError(`${label}: bytes expects even-length 0x-hex.`);
    return s;
  }

  const fixed = /^bytes(\d+)$/.exec(type);
  if (fixed) {
    const size = Number(fixed[1]);
    // Convenience: "text:hello" → right-padded UTF-8 bytesN.
    if (s.startsWith("text:")) {
      const text = s.slice(5);
      if (new TextEncoder().encode(text).length > size)
        throw new ArgError(`${label}: text is longer than ${size} bytes.`);
      return stringToHex(text, { size });
    }
    if (!isHex(s) || s.length !== 2 + size * 2)
      throw new ArgError(
        `${label}: ${type} expects 0x + ${size * 2} hex characters (or text:your-label).`,
      );
    return s;
  }

  throw new ArgError(`${label}: unsupported type ${type}.`);
}

export function parseArgs(params: AbiParam[] = [], raws: string[] = []): unknown[] {
  return params.map((p, i) => parseArg(p.type ?? "", raws[i] ?? "", p.name || `arg${i}`));
}

/** JSON-safe rendering of decoded values (bigint → decimal string). */
export function formatValue(v: unknown): string {
  return typeof v === "string"
    ? v
    : JSON.stringify(v, (_k, x) => (typeof x === "bigint" ? x.toString() : x), 2);
}

/** Sensible starting value for an input of the given type. */
export function defaultArgFor(type = ""): string {
  if (ARRAY_RE.test(type)) return "[]";
  if (type === "bytes32") return "text:research-001";
  if (type.startsWith("bytes")) return "0x";
  if (type === "address") return "";
  if (type === "bool") return "false";
  if (/int/.test(type)) return "0";
  return "";
}
