/**
 * Static heuristic checks on Solidity source + ABI. These are pattern checks, not a formal audit:
 * they can produce false positives/negatives and never prove a contract is safe.
 */
import type { AbiParam } from "./abi-args";

export type AbiItem = { type?: string; name?: string; stateMutability?: string; inputs?: AbiParam[]; outputs?: AbiParam[] };
export type CheckStatus = "pass" | "info" | "warn" | "fail";
export type SecurityCheck = { id: string; label: string; status: CheckStatus; detail: string };

/** Remove comments and string literals so patterns inside them don't trigger checks. */
export function stripSolidity(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/\/\/.*$/gm, " ")
    .replace(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g, '""');
}

const isWrite = (f: AbiItem) => f.type === "function" && f.stateMutability !== "view" && f.stateMutability !== "pure";

export function runSecurityChecks(input: { source: string; abi: AbiItem[]; compiled: boolean; errors: number; warnings: number }): SecurityCheck[] {
  const code = stripSolidity(input.source);
  const out: SecurityCheck[] = [];
  const has = (re: RegExp) => re.test(code);

  out.push(!input.compiled
    ? { id: "compile", label: "Compilation", status: "fail", detail: `${input.errors} compiler error(s). Fix before deploying.` }
    : input.warnings > 0
      ? { id: "compile", label: "Compilation", status: "warn", detail: `Compiled with ${input.warnings} warning(s); review the compiler messages.` }
      : { id: "compile", label: "Compilation", status: "pass", detail: "Compiled with no errors or warnings." });

  const pragma = /pragma\s+solidity\s+([^;]+);/.exec(code);
  out.push(!pragma
    ? { id: "pragma", label: "Compiler pragma", status: "warn", detail: "No `pragma solidity` found." }
    : /[\^><]/.test(pragma[1]!)
      ? { id: "pragma", label: "Compiler pragma", status: "info", detail: `Floating pragma \`${pragma[1]!.trim()}\`; pin an exact version for production deployments.` }
      : { id: "pragma", label: "Compiler pragma", status: "pass", detail: `Pinned pragma \`${pragma[1]!.trim()}\`.` });

  const writes = input.abi.filter(isWrite);
  out.push({ id: "writes", label: "External/public state-changing functions", status: writes.length ? "info" : "pass",
    detail: writes.length ? writes.map((f) => f.name).join(", ") : "None — contract exposes no state-changing functions." });

  const payable = input.abi.filter((f) => f.stateMutability === "payable");
  out.push({ id: "payable", label: "Payable entry points", status: payable.length ? "warn" : "pass",
    detail: payable.length ? `${payable.map((f) => f.name || f.type).join(", ")} accept ETH; ensure funds can be withdrawn safely.` : "No payable functions." });

  const pattern = (id: string, label: string, re: RegExp, warn: string, ok: string) =>
    out.push({ id, label, status: has(re) ? "warn" : "pass", detail: has(re) ? warn : ok });
  pattern("tx-origin", "tx.origin usage", /\btx\.origin\b/, "tx.origin found — unsafe for authorization (phishing risk). Use msg.sender.", "Not used.");
  pattern("delegatecall", "delegatecall", /\.delegatecall\s*\(/, "delegatecall found — executes foreign code in this contract's storage context.", "Not used.");
  pattern("selfdestruct", "selfdestruct", /\bselfdestruct\s*\(/, "selfdestruct found — deprecated (EIP-6049) and dangerous if reachable.", "Not used.");
  pattern("low-level-call", "Low-level call", /\.call\s*[({]/, "Low-level .call found — check return values and reentrancy (checks-effects-interactions).", "Not used.");

  const guarded = /\bonlyOwner\b|\bonlyRole\b|\bhasRole\s*\(|msg\.sender\s*==|==\s*msg\.sender|require\s*\(\s*msg\.sender|_checkOwner\s*\(/.test(code);
  out.push(writes.length && !guarded
    ? { id: "access", label: "Access control", status: "warn", detail: `No obvious access-control pattern; anyone can call ${writes.map((f) => f.name).join(", ")}. Fine if intentional (e.g. an open registry).` }
    : { id: "access", label: "Access control", status: writes.length ? "pass" : "info", detail: writes.length ? "An access-control pattern (owner/role/msg.sender check) is present." : "No externally callable writes to guard." });

  return out;
}
