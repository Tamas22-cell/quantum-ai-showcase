import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Activity, Blocks, Braces, Fuel, Radio, ShieldCheck, Zap } from "lucide-react";

import { LabShell } from "@/components/lab/lab-shell";
import { compileSolidity } from "@/lib/solidity.functions";
import { OnchainLab } from "@/components/web3/onchain-lab";
import type { CompiledArtifact } from "@/components/web3/types";

export const Route = createFileRoute("/lab/web3-solidity")({
  head: () => ({
    meta: [
      { title: "Web3 & Solidity Lab — Quantum AI Lab" },
      {
        name: "description",
        content:
          "Real Web3 testnet lab: compile Solidity, deploy on Ethereum Sepolia, Base Sepolia or Arbitrum Sepolia with your own wallet, and call ABI-driven read/write functions with decoded receipts and events — plus a wallet-free sandbox.",
      },
      { property: "og:title", content: "Web3 & Solidity Lab — Quantum AI Lab" },
      {
        property: "og:description",
        content:
          "Compile Solidity, deploy to real testnets via your injected wallet, interact through ABI-generated controls, decode events and prepare explorer verification.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Web3SolidityLab,
});

const PUBLIC_SEPOLIA_RPCS = [
  "https://ethereum-sepolia-rpc.publicnode.com",
  "https://rpc.sepolia.org",
];

const defaultSource = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract ResearchRegistry {
    mapping(bytes32 => string) public records;
    event RecordStored(bytes32 indexed id, string value);

    function store(bytes32 id, string calldata value) external {
        records[id] = value;
        emit RecordStored(id, value);
    }
}`;

type AbiParameter = {
  name?: string;
  type?: string;
  indexed?: boolean;
};

type AbiEntry = {
  type?: string;
  name?: string;
  stateMutability?: string;
  inputs?: AbiParameter[];
  outputs?: AbiParameter[];
};

type SandboxTx = {
  hash: string;
  type: "deploy" | "write" | "read";
  label: string;
  status: "confirmed";
  gas: number;
  time: string;
};

type SandboxEvent = {
  name: string;
  detail: string;
  time: string;
};

function short(value: string) {
  return value.length > 14 ? `${value.slice(0, 8)}…${value.slice(-6)}` : value;
}

function hexToDecimal(value?: string) {
  if (!value) return "—";
  try {
    return BigInt(value).toString(10);
  } catch {
    return value;
  }
}

function weiHexToGwei(value?: string) {
  if (!value) return "—";
  try {
    return (Number(BigInt(value)) / 1_000_000_000).toFixed(2);
  } catch {
    return "—";
  }
}

async function publicRpc(method: string, params: unknown[] = []) {
  let lastError: unknown;
  for (const url of PUBLIC_SEPOLIA_RPCS) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
      });
      if (!response.ok) throw new Error(`RPC HTTP ${response.status}`);
      const body = (await response.json()) as { result?: string; error?: { message?: string } };
      if (body.error) throw new Error(body.error.message || "RPC error");
      if (typeof body.result !== "string") throw new Error("RPC returned no result");
      return body.result;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Public Sepolia RPC unavailable");
}

function randomHash() {
  let out = "";
  for (let i = 0; i < 64; i += 1) out += Math.floor(Math.random() * 16).toString(16);
  return `0x${out}`;
}

function defaultArgument(type = "") {
  if (type === "bool") return "true";
  if (type.startsWith("uint") || type.startsWith("int")) return "42";
  if (type === "address") return "0x0000000000000000000000000000000000000001";
  if (type.startsWith("bytes32")) return `0x${"0".repeat(64)}`;
  if (type.startsWith("bytes")) return "0x";
  if (type.includes("[]")) return "[]";
  return "QAOA portfolio run";
}

function functionSignature(entry: AbiEntry) {
  const inputs = (entry.inputs ?? []).map((input) => input.type || "unknown").join(", ");
  return `${entry.name || "function"}(${inputs})`;
}

function Web3SolidityLab() {
  const [source, setSource] = useState(defaultSource);
  const [compileStatus, setCompileStatus] = useState("Ready to compile");
  const [compilerVersion, setCompilerVersion] = useState("—");
  const [contractName, setContractName] = useState("—");
  const [abiEntries, setAbiEntries] = useState<AbiEntry[]>([]);
  const [bytecode, setBytecode] = useState("");
  const [compileMessages, setCompileMessages] = useState<string[]>([]);

  const [liveBlock, setLiveBlock] = useState("—");
  const [liveGas, setLiveGas] = useState("—");
  const [lastRefresh, setLastRefresh] = useState("—");
  const [networkStatus, setNetworkStatus] = useState("Sepolia · public RPC");

  const [sandboxContract, setSandboxContract] = useState("");
  const [sandboxGas, setSandboxGas] = useState("—");
  const [sandboxTxs, setSandboxTxs] = useState<SandboxTx[]>([]);
  const [sandboxEvents, setSandboxEvents] = useState<SandboxEvent[]>([
    { name: "SANDBOX_READY", detail: "Wallet-free Web3 engine initialized", time: "page load" },
  ]);

  const [functionArgs, setFunctionArgs] = useState<Record<string, string[]>>({});
  const [functionResults, setFunctionResults] = useState<Record<string, string>>({});
  const [sandboxStorage, setSandboxStorage] = useState<Record<string, string>>({});

  const [compileCounts, setCompileCounts] = useState({ errors: 0, warnings: 0 });

  const compiledReady = Boolean(bytecode);
  const artifact = useMemo<CompiledArtifact>(
    () => ({
      source,
      abi: abiEntries,
      bytecode,
      compilerVersion,
      contractName,
      compiled: compiledReady,
      errors: compileCounts.errors,
      warnings: compileCounts.warnings,
    }),
    [source, abiEntries, bytecode, compilerVersion, contractName, compiledReady, compileCounts],
  );
  const sandboxReady = Boolean(sandboxContract);
  const functions = useMemo(
    () => abiEntries.filter((entry) => entry.type === "function"),
    [abiEntries],
  );
  const events = useMemo(() => abiEntries.filter((entry) => entry.type === "event"), [abiEntries]);

  function pushEvent(name: string, detail: string) {
    setSandboxEvents((current) =>
      [{ name, detail, time: new Date().toLocaleTimeString() }, ...current].slice(0, 12),
    );
  }

  function pushTx(type: SandboxTx["type"], label: string, gas: number) {
    setSandboxTxs((current) =>
      [
        {
          hash: randomHash(),
          type,
          label,
          status: "confirmed" as const,
          gas,
          time: new Date().toLocaleTimeString(),
        },
        ...current,
      ].slice(0, 12),
    );
  }

  async function refreshNetwork() {
    try {
      const [blockNumber, gasPrice] = await Promise.all([
        publicRpc("eth_blockNumber"),
        publicRpc("eth_gasPrice"),
      ]);
      setLiveBlock(hexToDecimal(blockNumber));
      setLiveGas(weiHexToGwei(gasPrice));
      setLastRefresh(new Date().toLocaleTimeString());
      setNetworkStatus("Sepolia · public RPC · LIVE");
    } catch (error) {
      setNetworkStatus(
        error instanceof Error
          ? `Sepolia telemetry: ${error.message}`
          : "Sepolia telemetry unavailable",
      );
      setLastRefresh(new Date().toLocaleTimeString());
    }
  }

  useEffect(() => {
    void refreshNetwork();
    const timer = window.setInterval(() => void refreshNetwork(), 12_000);
    return () => window.clearInterval(timer);
  }, []);

  async function compileSource() {
    setCompileStatus("Compiling with solc…");
    setCompileMessages([]);
    setBytecode("");
    setAbiEntries([]);
    setFunctionArgs({});
    setFunctionResults({});
    try {
      const result = await compileSolidity({ data: { source } });
      setCompilerVersion(result.compilerVersion);
      if (!result.ok) {
        setCompileStatus("Compilation failed");
        setCompileMessages([...result.errors, ...result.warnings]);
        setCompileCounts({ errors: result.errors.length, warnings: result.warnings.length });
        return;
      }

      const parsedAbi = result.abi as AbiEntry[];
      setContractName(result.contractName);
      setAbiEntries(parsedAbi);
      setBytecode(result.bytecode);
      setCompileMessages(result.warnings);
      setCompileCounts({ errors: 0, warnings: result.warnings.length });
      setCompileStatus("Compiled successfully");

      const defaults: Record<string, string[]> = {};
      parsedAbi
        .filter((entry) => entry.type === "function")
        .forEach((entry, index) => {
          const key = `${entry.name || "function"}-${index}`;
          defaults[key] = (entry.inputs ?? []).map((input) => defaultArgument(input.type));
        });
      setFunctionArgs(defaults);
      pushEvent(
        "SOLIDITY_COMPILED",
        `${result.contractName} → ABI + ${Math.max(0, result.bytecode.length / 2 - 1)} byte bytecode`,
      );
    } catch (error) {
      setCompileStatus("Compilation request failed");
      setCompileMessages([error instanceof Error ? error.message : "Compiler request failed"]);
    }
  }

  function estimateSandboxDeployGas() {
    const base = compiledReady ? Math.max(87_000, Math.round(bytecode.length * 6.5)) : 87_000;
    const estimate = base + Math.floor(Math.random() * 6_000);
    setSandboxGas(estimate.toLocaleString());
    pushEvent("GAS_ESTIMATE", `Sandbox deploy estimate: ${estimate.toLocaleString()} gas`);
  }

  function deploySandbox() {
    if (!compiledReady) {
      pushEvent("ACTION_BLOCKED", "Compile the Solidity contract first");
      return;
    }
    const address = `0x${randomHash().slice(2, 42)}`;
    const gas =
      Math.max(91_000, Math.round(bytecode.length * 6.7)) + Math.floor(Math.random() * 4_000);
    setSandboxContract(address);
    setSandboxGas(gas.toLocaleString());
    setSandboxStorage({});
    setFunctionResults({});
    pushTx("deploy", contractName, gas);
    pushEvent("CONTRACT_DEPLOYED", `${contractName} ${short(address)} deployed in ABI SANDBOX`);
  }

  function updateFunctionArg(key: string, index: number, value: string) {
    setFunctionArgs((current) => {
      const next = [...(current[key] ?? [])];
      next[index] = value;
      return { ...current, [key]: next };
    });
  }

  function executeFunction(entry: AbiEntry, key: string) {
    if (!sandboxReady) {
      pushEvent("ACTION_BLOCKED", "Deploy the compiled contract in SANDBOX first");
      return;
    }

    const args = functionArgs[key] ?? [];
    const signature = functionSignature(entry);
    const isRead = entry.stateMutability === "view" || entry.stateMutability === "pure";

    if (entry.name === "store" && args.length >= 2) {
      const storageKey = args[0] || `0x${"0".repeat(64)}`;
      const value = args[1] || "";
      setSandboxStorage((current) => ({ ...current, [storageKey]: value }));
      setFunctionResults((current) => ({
        ...current,
        [key]: `tx confirmed · stored "${value}"`,
      }));
      pushTx("write", signature, 44_000 + Math.floor(Math.random() * 3_000));
      pushEvent("RecordStored", `${short(storageKey)} → ${value}`);
      return;
    }

    if (entry.name === "records" && args.length >= 1) {
      const value = sandboxStorage[args[0] ?? ""] ?? "";
      setFunctionResults((current) => ({ ...current, [key]: value || "(empty string)" }));
      pushTx("read", signature, 0);
      pushEvent("CALL", `${signature} → ${value || "empty"}`);
      return;
    }

    if (isRead) {
      const outputTypes =
        (entry.outputs ?? []).map((output) => output.type || "value").join(", ") ||
        "no return value";
      const result = `SANDBOX result (${outputTypes})`;
      setFunctionResults((current) => ({ ...current, [key]: result }));
      pushTx("read", signature, 0);
      pushEvent("CALL", `${signature} executed`);
      return;
    }

    const gas = 38_000 + Math.floor(Math.random() * 12_000);
    setFunctionResults((current) => ({
      ...current,
      [key]: `tx confirmed · ${gas.toLocaleString()} gas`,
    }));
    pushTx("write", signature, gas);
    pushEvent("FUNCTION_CALL", `${signature}(${args.join(", ")})`);
  }

  return (
    <LabShell crumb="Web3 & Solidity">
      <div className="mb-8 max-w-3xl">
        <div className="flex items-center gap-2 font-mono text-xs text-primary">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-70" />
            <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
          </span>
          LAB / C13 · LIVE
        </div>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
          Web3 & Solidity Lab
        </h1>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          Solidity Editor → real solc compilation → ABI explorer → automatically generated function
          controls → wallet-free contract sandbox → real testnet deployment and ABI-driven on-chain
          interaction with your own wallet.
        </p>
      </div>

      <section className="mb-8 rounded-md border border-violet-500/50 bg-violet-500/5 p-5 sm:p-6">
        <div className="font-mono text-xs uppercase tracking-wider text-violet-400">
          1 · Real Solidity compiler
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl font-semibold">Solidity Editor → Compile</h2>
          <span className="rounded-full border border-violet-500/40 bg-violet-500/10 px-3 py-1 font-mono text-[10px] uppercase text-violet-300">
            solc server compiler
          </span>
        </div>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Edit the Solidity source. Compilation produces the real ABI and EVM bytecode used by the
          sections below.
        </p>

        <textarea
          value={source}
          onChange={(event) => setSource(event.target.value)}
          spellCheck={false}
          className="mt-5 min-h-[360px] w-full rounded-md border border-border bg-background p-4 font-mono text-xs leading-6 text-foreground outline-none focus:border-violet-500/60"
        />

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void compileSource()}
            className="rounded-md border border-violet-500/60 bg-violet-500/10 px-5 py-2.5 font-mono text-xs font-semibold text-violet-300 hover:bg-violet-500/15"
          >
            Compile Solidity
          </button>
          <span
            className={`font-mono text-xs ${compiledReady ? "text-emerald-400" : "text-muted-foreground"}`}
          >
            {compileStatus}
          </span>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          <div className="rounded-md border border-border bg-card p-4">
            <div className="font-mono text-[10px] uppercase text-muted-foreground">Compiler</div>
            <div className="mt-2 break-all font-mono text-xs">{compilerVersion}</div>
          </div>
          <div className="rounded-md border border-border bg-card p-4">
            <div className="font-mono text-[10px] uppercase text-muted-foreground">Contract</div>
            <div className="mt-2 font-mono text-sm font-semibold">{contractName}</div>
          </div>
          <div className="rounded-md border border-border bg-card p-4">
            <div className="font-mono text-[10px] uppercase text-muted-foreground">Bytecode</div>
            <div className="mt-2 font-mono text-sm font-semibold">
              {bytecode ? `${Math.max(0, bytecode.length / 2 - 1).toLocaleString()} bytes` : "—"}
            </div>
          </div>
        </div>

        {compileMessages.length > 0 ? (
          <div className="mt-4 rounded-md border border-border bg-background p-4">
            <div className="font-mono text-[10px] uppercase text-muted-foreground">
              Compiler messages
            </div>
            <div className="mt-3 space-y-2">
              {compileMessages.map((message, index) => (
                <pre
                  key={index}
                  className="whitespace-pre-wrap break-words font-mono text-[10px] leading-5 text-muted-foreground"
                >
                  {message}
                </pre>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      {compiledReady ? (
        <section className="mb-8 rounded-md border border-cyan-500/40 bg-cyan-500/5 p-5 sm:p-6">
          <div className="font-mono text-xs uppercase tracking-wider text-cyan-400">
            2 · ABI explorer
          </div>
          <h2 className="mt-2 text-2xl font-semibold">Contract Interface</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Generated automatically from the compiled ABI. Functions, parameters, mutability and
            events are shown separately.
          </p>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <div className="rounded-md border border-border bg-card p-4">
              <div className="font-mono text-[10px] uppercase text-muted-foreground">
                Functions · {functions.length}
              </div>
              <div className="mt-3 space-y-2">
                {functions.map((entry, index) => (
                  <div
                    key={`${entry.name}-${index}`}
                    className="rounded-md border border-border bg-background p-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <code className="font-mono text-xs font-semibold text-cyan-300">
                        {functionSignature(entry)}
                      </code>
                      <span className="rounded-full border border-border px-2 py-0.5 font-mono text-[9px] uppercase text-muted-foreground">
                        {entry.stateMutability || "nonpayable"}
                      </span>
                    </div>
                    {(entry.outputs ?? []).length > 0 ? (
                      <div className="mt-2 font-mono text-[10px] text-muted-foreground">
                        returns {(entry.outputs ?? []).map((output) => output.type).join(", ")}
                      </div>
                    ) : null}
                  </div>
                ))}
                {functions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No public/external functions in ABI.
                  </p>
                ) : null}
              </div>
            </div>

            <div className="rounded-md border border-border bg-card p-4">
              <div className="font-mono text-[10px] uppercase text-muted-foreground">
                Events · {events.length}
              </div>
              <div className="mt-3 space-y-2">
                {events.map((entry, index) => (
                  <div
                    key={`${entry.name}-${index}`}
                    className="rounded-md border border-border bg-background p-3"
                  >
                    <code className="font-mono text-xs font-semibold text-amber-300">
                      {entry.name}(
                      {(entry.inputs ?? [])
                        .map((input) => `${input.type}${input.indexed ? " indexed" : ""}`)
                        .join(", ")}
                      )
                    </code>
                  </div>
                ))}
                {events.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No events in ABI.</p>
                ) : null}
              </div>
            </div>
          </div>

          <details className="mt-4 rounded-md border border-border bg-background p-4">
            <summary className="cursor-pointer font-mono text-xs text-muted-foreground">
              Raw ABI JSON
            </summary>
            <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap break-all font-mono text-[10px] leading-5">
              {JSON.stringify(abiEntries, null, 2)}
            </pre>
          </details>
        </section>
      ) : null}

      <section className="mb-8 rounded-md border border-emerald-500/50 bg-emerald-500/5 p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="font-mono text-xs uppercase tracking-wider text-emerald-400">
              3 · ABI-driven contract sandbox
            </div>
            <h2 className="mt-2 text-2xl font-semibold">Deploy + Automatic Function Interaction</h2>
          </div>
          <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 font-mono text-[10px] font-semibold uppercase text-emerald-400">
            SANDBOX · No wallet required
          </span>
        </div>
        <p className="mt-2 max-w-4xl text-sm leading-6 text-muted-foreground">
          After compilation, inputs and buttons below are generated from the ABI. Calls execute
          inside the labelled browser SANDBOX; they do not broadcast real Ethereum transactions.
        </p>

        <div className="mt-5 rounded-md border border-border bg-card p-4">
          <div className="font-mono text-[10px] uppercase text-muted-foreground">
            Deploy compiled artifact
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={estimateSandboxDeployGas}
              className="rounded-md border border-border bg-background px-4 py-2 font-mono text-xs font-semibold hover:border-primary/50"
            >
              Estimate Gas
            </button>
            <button
              type="button"
              onClick={deploySandbox}
              className="rounded-md border border-emerald-500/50 bg-emerald-500/10 px-4 py-2 font-mono text-xs font-semibold text-emerald-400 hover:bg-emerald-500/15"
            >
              Deploy ABI SANDBOX
            </button>
          </div>
          <p className="mt-3 font-mono text-xs text-muted-foreground">
            Gas: <span className="text-foreground">{sandboxGas}</span>
          </p>
          <p className="mt-2 break-all font-mono text-xs text-muted-foreground">
            Contract: <span className="text-foreground">{sandboxContract || "Not deployed"}</span>
          </p>
        </div>

        {functions.length > 0 ? (
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {functions.map((entry, index) => {
              const key = `${entry.name || "function"}-${index}`;
              const isRead = entry.stateMutability === "view" || entry.stateMutability === "pure";
              return (
                <div key={key} className="rounded-md border border-border bg-card p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <code className="font-mono text-xs font-semibold text-foreground">
                      {functionSignature(entry)}
                    </code>
                    <span
                      className={`rounded-full border px-2 py-0.5 font-mono text-[9px] uppercase ${isRead ? "border-cyan-500/40 text-cyan-300" : "border-amber-500/40 text-amber-300"}`}
                    >
                      {isRead ? "READ" : "WRITE"}
                    </span>
                  </div>

                  <div className="mt-3 space-y-2">
                    {(entry.inputs ?? []).map((input, inputIndex) => (
                      <label
                        key={`${key}-${inputIndex}`}
                        className="block text-xs text-muted-foreground"
                      >
                        {input.name || `arg${inputIndex}`} · {input.type}
                        <input
                          value={functionArgs[key]?.[inputIndex] ?? ""}
                          onChange={(event) =>
                            updateFunctionArg(key, inputIndex, event.target.value)
                          }
                          className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-xs text-foreground outline-none focus:border-primary"
                        />
                      </label>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => executeFunction(entry, key)}
                    className={`mt-3 rounded-md border px-4 py-2 font-mono text-xs font-semibold ${isRead ? "border-cyan-500/50 bg-cyan-500/10 text-cyan-300" : "border-amber-500/50 bg-amber-500/10 text-amber-300"}`}
                  >
                    {isRead ? "Call Function" : "Send SANDBOX Tx"}
                  </button>

                  {functionResults[key] ? (
                    <div className="mt-3 rounded-md border border-border bg-background p-3 font-mono text-xs text-emerald-300">
                      {functionResults[key]}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted-foreground">
            Compile a Solidity contract to generate function controls.
          </p>
        )}
      </section>

      <section className="mb-8 grid gap-4 lg:grid-cols-2">
        <div className="rounded-md border border-border bg-card p-5">
          <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-primary">
            <Zap className="size-4" />
            SANDBOX transaction history
          </div>
          {sandboxTxs.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No sandbox transactions yet.</p>
          ) : (
            <div className="mt-4 space-y-2">
              {sandboxTxs.map((tx) => (
                <div key={tx.hash} className="rounded-md border border-border bg-background p-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-mono text-xs font-semibold uppercase">
                      {tx.type} · {tx.label}
                    </span>
                    <span className="font-mono text-[10px] text-emerald-400">CONFIRMED</span>
                  </div>
                  <div className="mt-1 break-all font-mono text-[10px] text-muted-foreground">
                    {tx.hash}
                  </div>
                  <div className="mt-1 font-mono text-[10px] text-muted-foreground">
                    gas: {tx.gas.toLocaleString()} · {tx.time}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="rounded-md border border-border bg-card p-5">
          <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-primary">
            <Activity className="size-4" />
            Decoded event / activity log
          </div>
          <div className="mt-4 space-y-3">
            {sandboxEvents.map((event, index) => (
              <div
                key={`${event.time}-${index}`}
                className="relative border-l border-primary/30 pl-4"
              >
                <span className="absolute -left-1 top-1.5 size-2 rounded-full bg-primary shadow-[0_0_12px_currentColor]" />
                <div className="font-mono text-[10px] uppercase text-primary">{event.name}</div>
                <div className="mt-1 text-xs">{event.detail}</div>
                <div className="mt-1 font-mono text-[9px] text-muted-foreground">{event.time}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mb-8 overflow-hidden rounded-md border border-primary/40 bg-card">
        <div className="flex items-center justify-between border-b border-border bg-primary/5 px-5 py-3">
          <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-primary">
            <Radio className="size-4 animate-pulse" />
            Live Sepolia network
          </div>
          <button
            type="button"
            onClick={() => void refreshNetwork()}
            className="rounded-md border border-border bg-background px-3 py-1.5 font-mono text-[10px] uppercase text-muted-foreground hover:border-primary/50 hover:text-primary"
          >
            Refresh
          </button>
        </div>
        <div className="grid gap-px bg-border md:grid-cols-3">
          <div className="bg-card p-5">
            <div className="flex items-center gap-2 font-mono text-[10px] uppercase text-muted-foreground">
              <Activity className="size-4 text-emerald-400" />
              Network
            </div>
            <div className="mt-2 text-lg font-semibold">{networkStatus}</div>
            <div className="mt-1 font-mono text-[10px] text-muted-foreground">
              updated {lastRefresh}
            </div>
          </div>
          <div className="bg-card p-5">
            <div className="flex items-center gap-2 font-mono text-[10px] uppercase text-muted-foreground">
              <Blocks className="size-4 text-primary" />
              Latest block
            </div>
            <div className="mt-2 font-mono text-xl font-semibold">#{liveBlock}</div>
          </div>
          <div className="bg-card p-5">
            <div className="flex items-center gap-2 font-mono text-[10px] uppercase text-muted-foreground">
              <Fuel className="size-4 text-amber-400" />
              Gas price
            </div>
            <div className="mt-2 text-xl font-semibold">
              {liveGas} <span className="text-xs text-muted-foreground">Gwei</span>
            </div>
          </div>
        </div>
      </section>

      <OnchainLab artifact={artifact} />

      <section className="grid gap-4 md:grid-cols-3">
        <article className="rounded-md border border-border bg-card p-5">
          <Braces className="size-5 text-primary" />
          <h2 className="mt-4 text-lg font-semibold">Solidity</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Real solc compilation, ABI explorer and generated contract controls.
          </p>
        </article>
        <article className="rounded-md border border-border bg-card p-5">
          <Activity className="size-5 text-primary" />
          <h2 className="mt-4 text-lg font-semibold">EVM</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Compiled bytecode, real testnet deploys, ABI-driven calls, gas and decoded receipts.
          </p>
        </article>
        <article className="rounded-md border border-border bg-card p-5">
          <ShieldCheck className="size-5 text-primary" />
          <h2 className="mt-4 text-lg font-semibold">Security</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Server-side compilation, no private-key handling, wallet-signed testnet transactions and
            static heuristic checks.
          </p>
        </article>
      </section>
    </LabShell>
  );
}
