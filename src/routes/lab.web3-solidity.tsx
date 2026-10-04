import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Activity, Blocks, Braces, Fuel, Radio, ShieldCheck, WalletCards, Zap } from "lucide-react";

import { LabShell } from "@/components/lab/lab-shell";
import { compileSolidity } from "@/lib/solidity.functions";

export const Route = createFileRoute("/lab/web3-solidity")({
  head: () => ({
    meta: [
      { title: "Web3 & Solidity Lab — Quantum AI Lab" },
      {
        name: "description",
        content:
          "Interactive Web3 lab with real Solidity compilation, wallet-free sandbox execution, live Sepolia telemetry and optional wallet connection.",
      },
      { property: "og:title", content: "Web3 & Solidity Lab — Quantum AI Lab" },
      {
        property: "og:description",
        content: "Edit and compile real Solidity source into ABI and EVM bytecode, then explore it in an interactive sandbox.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Web3SolidityLab,
});

const SEPOLIA_CHAIN_ID = "0xaa36a7";
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

type EthereumProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
};

type SandboxTx = {
  hash: string;
  type: "deploy" | "write" | "read";
  status: "confirmed";
  gas: number;
  time: string;
};

type SandboxEvent = {
  name: string;
  detail: string;
  time: string;
};

type StoredRecord = {
  id: string;
  key: string;
  value: string;
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

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return `0x${Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")}`;
}

function randomHash() {
  let out = "";
  for (let i = 0; i < 64; i += 1) out += Math.floor(Math.random() * 16).toString(16);
  return `0x${out}`;
}

function Web3SolidityLab() {
  const [source, setSource] = useState(defaultSource);
  const [compileStatus, setCompileStatus] = useState("Ready to compile");
  const [compilerVersion, setCompilerVersion] = useState("—");
  const [contractName, setContractName] = useState("—");
  const [abi, setAbi] = useState("[]");
  const [bytecode, setBytecode] = useState("");
  const [compileMessages, setCompileMessages] = useState<string[]>([]);

  const [liveBlock, setLiveBlock] = useState("—");
  const [liveGas, setLiveGas] = useState("—");
  const [lastRefresh, setLastRefresh] = useState("—");
  const [networkStatus, setNetworkStatus] = useState("Sepolia · public RPC");

  const [sandboxContract, setSandboxContract] = useState("");
  const [sandboxValue, setSandboxValue] = useState("42");
  const [sandboxStoredValue, setSandboxStoredValue] = useState("—");
  const [sandboxGas, setSandboxGas] = useState("—");
  const [sandboxTxs, setSandboxTxs] = useState<SandboxTx[]>([]);
  const [sandboxEvents, setSandboxEvents] = useState<SandboxEvent[]>([
    { name: "SANDBOX_READY", detail: "Wallet-free Web3 engine initialized", time: new Date().toLocaleTimeString() },
  ]);

  const [wallet, setWallet] = useState("");
  const [walletStatus, setWalletStatus] = useState("Optional · not connected");
  const [chainStatus, setChainStatus] = useState("Wallet actions inactive");

  const [recordKey, setRecordKey] = useState("experiment-001");
  const [recordValue, setRecordValue] = useState("QAOA portfolio run");
  const [records, setRecords] = useState<StoredRecord[]>([]);

  const sandboxReady = useMemo(() => Boolean(sandboxContract), [sandboxContract]);
  const compiledReady = Boolean(bytecode);

  function getProvider() {
    const provider = (window as typeof window & { ethereum?: EthereumProvider }).ethereum;
    if (!provider) throw new Error("No injected EVM wallet found in this browser.");
    return provider;
  }

  function pushEvent(name: string, detail: string) {
    setSandboxEvents((current) => [
      { name, detail, time: new Date().toLocaleTimeString() },
      ...current,
    ].slice(0, 10));
  }

  function pushTx(type: SandboxTx["type"], hash: string, gas: number) {
    setSandboxTxs((current) => [
      { hash, type, status: "confirmed", gas, time: new Date().toLocaleTimeString() },
      ...current,
    ].slice(0, 10));
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
      setNetworkStatus(error instanceof Error ? `Sepolia telemetry: ${error.message}` : "Sepolia telemetry unavailable");
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
    try {
      const result = await compileSolidity({ data: { source } });
      setCompilerVersion(result.compilerVersion);
      if (!result.ok) {
        setCompileStatus("Compilation failed");
        setCompileMessages([...result.errors, ...result.warnings]);
        return;
      }
      setContractName(result.contractName);
      setAbi(JSON.stringify(result.abi, null, 2));
      setBytecode(result.bytecode);
      setCompileMessages(result.warnings);
      setCompileStatus("Compiled successfully");
      pushEvent("SOLIDITY_COMPILED", `${result.contractName} → ABI + ${result.bytecode.length / 2 - 1} byte bytecode`);
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
    const hash = randomHash();
    const gas = Math.max(91_000, Math.round(bytecode.length * 6.7)) + Math.floor(Math.random() * 4_000);
    setSandboxContract(address);
    setSandboxStoredValue("0");
    setSandboxGas(gas.toLocaleString());
    pushTx("deploy", hash, gas);
    pushEvent("CONTRACT_DEPLOYED", `${contractName} ${short(address)} deployed in SANDBOX from compiled bytecode`);
  }

  function writeSandbox() {
    if (!sandboxReady) {
      pushEvent("ACTION_BLOCKED", "Compile and deploy the SANDBOX contract first");
      return;
    }
    const gas = 43_000 + Math.floor(Math.random() * 4_000);
    const hash = randomHash();
    setSandboxStoredValue(sandboxValue || "0");
    setSandboxGas(gas.toLocaleString());
    pushTx("write", hash, gas);
    pushEvent("VALUE_STORED", `Stored value ${sandboxValue || "0"}`);
  }

  function readSandbox() {
    if (!sandboxReady) {
      pushEvent("ACTION_BLOCKED", "Compile and deploy the SANDBOX contract first");
      return;
    }
    const hash = randomHash();
    pushTx("read", hash, 0);
    pushEvent("VALUE_READ", `Read value ${sandboxStoredValue}`);
  }

  async function connectWallet() {
    try {
      const provider = getProvider();
      const accounts = (await provider.request({ method: "eth_requestAccounts" })) as string[];
      const account = accounts?.[0] ?? "";
      setWallet(account);
      setWalletStatus(account ? `Connected: ${short(account)}` : "No account returned");
      const chainId = (await provider.request({ method: "eth_chainId" })) as string;
      setChainStatus(chainId === SEPOLIA_CHAIN_ID ? "Sepolia connected" : `Connected chain ${parseInt(chainId, 16)}`);
    } catch (error) {
      setWalletStatus(error instanceof Error ? error.message : "Wallet connection failed");
    }
  }

  async function switchToSepolia() {
    try {
      const provider = getProvider();
      await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: SEPOLIA_CHAIN_ID }] });
      setChainStatus("Sepolia connected");
    } catch (error) {
      setChainStatus(error instanceof Error ? error.message : "Could not switch network");
    }
  }

  async function storeRegistryRecord() {
    const key = recordKey.trim();
    const value = recordValue.trim();
    if (!key || !value) return;
    const id = await sha256(key);
    const next = { id, key, value, time: new Date().toLocaleTimeString() };
    setRecords((current) => [next, ...current.filter((item) => item.id !== id)]);
    pushEvent("RecordStored", `${key} → ${value}`);
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
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Web3 & Solidity Lab</h1>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          Edit real Solidity source, compile it server-side with solc into ABI and EVM bytecode, then use the compiled artifact in the wallet-free sandbox.
        </p>
      </div>

      <section className="mb-8 rounded-md border border-violet-500/50 bg-violet-500/5 p-5 sm:p-6">
        <div className="font-mono text-xs uppercase tracking-wider text-violet-400">1 · Real Solidity compiler</div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl font-semibold">Solidity Editor → Compile → ABI + Bytecode</h2>
          <span className="rounded-full border border-violet-500/40 bg-violet-500/10 px-3 py-1 font-mono text-[10px] uppercase text-violet-300">solc server compiler</span>
        </div>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          This is real compilation, not a visual simulation. Edit the contract and press Compile Solidity.
        </p>

        <textarea
          value={source}
          onChange={(event) => setSource(event.target.value)}
          spellCheck={false}
          className="mt-5 min-h-[360px] w-full rounded-md border border-border bg-background p-4 font-mono text-xs leading-6 text-foreground outline-none focus:border-violet-500/60"
        />

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => void compileSource()} className="rounded-md border border-violet-500/60 bg-violet-500/10 px-5 py-2.5 font-mono text-xs font-semibold text-violet-300 hover:bg-violet-500/15">Compile Solidity</button>
          <span className={`font-mono text-xs ${compiledReady ? "text-emerald-400" : "text-muted-foreground"}`}>{compileStatus}</span>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          <div className="rounded-md border border-border bg-card p-4"><div className="font-mono text-[10px] uppercase text-muted-foreground">Compiler</div><div className="mt-2 break-all font-mono text-xs">{compilerVersion}</div></div>
          <div className="rounded-md border border-border bg-card p-4"><div className="font-mono text-[10px] uppercase text-muted-foreground">Contract</div><div className="mt-2 font-mono text-sm font-semibold">{contractName}</div></div>
          <div className="rounded-md border border-border bg-card p-4"><div className="font-mono text-[10px] uppercase text-muted-foreground">Bytecode</div><div className="mt-2 font-mono text-sm font-semibold">{bytecode ? `${Math.max(0, bytecode.length / 2 - 1).toLocaleString()} bytes` : "—"}</div></div>
        </div>

        {compileMessages.length > 0 ? <div className="mt-4 rounded-md border border-border bg-background p-4"><div className="font-mono text-[10px] uppercase text-muted-foreground">Compiler messages</div><div className="mt-3 space-y-2">{compileMessages.map((message, index) => <pre key={index} className="whitespace-pre-wrap break-words font-mono text-[10px] leading-5 text-muted-foreground">{message}</pre>)}</div></div> : null}

        {compiledReady ? <div className="mt-4 grid gap-4 lg:grid-cols-2"><div className="rounded-md border border-border bg-background p-4"><div className="font-mono text-[10px] uppercase text-muted-foreground">ABI</div><pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap break-all font-mono text-[10px] leading-5">{abi}</pre></div><div className="rounded-md border border-border bg-background p-4"><div className="font-mono text-[10px] uppercase text-muted-foreground">EVM bytecode</div><pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap break-all font-mono text-[10px] leading-5">{bytecode}</pre></div></div> : null}
      </section>

      <section className="mb-8 rounded-md border border-emerald-500/50 bg-emerald-500/5 p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="font-mono text-xs uppercase tracking-wider text-emerald-400">2 · Compiled artifact sandbox</div>
            <h2 className="mt-2 text-2xl font-semibold">Deploy + Write + Read</h2>
          </div>
          <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 font-mono text-[10px] font-semibold uppercase text-emerald-400">No wallet required</span>
        </div>
        <p className="mt-2 max-w-4xl text-sm leading-6 text-muted-foreground">Compile first. The sandbox deployment uses the compiled artifact metadata, while execution remains a clearly labelled browser simulation and broadcasts no blockchain transaction.</p>

        <div className="mt-5 grid gap-4 xl:grid-cols-3">
          <div className="rounded-md border border-border bg-card p-4">
            <div className="font-mono text-[10px] uppercase text-muted-foreground">Deploy compiled contract</div>
            <div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={estimateSandboxDeployGas} className="rounded-md border border-border bg-background px-4 py-2 font-mono text-xs font-semibold hover:border-primary/50">Estimate Gas</button><button type="button" onClick={deploySandbox} className="rounded-md border border-emerald-500/50 bg-emerald-500/10 px-4 py-2 font-mono text-xs font-semibold text-emerald-400 hover:bg-emerald-500/15">Deploy SANDBOX</button></div>
            <p className="mt-3 font-mono text-xs text-muted-foreground">Gas: <span className="text-foreground">{sandboxGas}</span></p>
            <p className="mt-2 break-all font-mono text-xs text-muted-foreground">Contract: <span className="text-foreground">{sandboxContract || "Not deployed"}</span></p>
          </div>

          <div className="rounded-md border border-border bg-card p-4"><div className="font-mono text-[10px] uppercase text-muted-foreground">Write</div><label className="mt-3 block text-xs text-muted-foreground">Integer value<input value={sandboxValue} onChange={(event) => setSandboxValue(event.target.value)} inputMode="numeric" className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-xs outline-none focus:border-primary" /></label><button type="button" onClick={writeSandbox} className="mt-3 rounded-md border border-primary/50 bg-primary/10 px-4 py-2 font-mono text-xs font-semibold text-primary hover:bg-primary/15">Write Value</button></div>
          <div className="rounded-md border border-border bg-card p-4"><div className="font-mono text-[10px] uppercase text-muted-foreground">Read</div><button type="button" onClick={readSandbox} className="mt-3 rounded-md border border-border bg-background px-4 py-2 font-mono text-xs font-semibold hover:border-primary/50">Read Value</button><div className="mt-4 rounded-md border border-border bg-background p-4 text-center"><div className="font-mono text-[10px] uppercase text-muted-foreground">Stored value</div><div className="mt-2 font-mono text-3xl font-semibold text-primary">{sandboxStoredValue}</div></div></div>
        </div>
      </section>

      <section className="mb-8 grid gap-4 lg:grid-cols-2">
        <div className="rounded-md border border-border bg-card p-5"><div className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-primary"><Zap className="size-4" />SANDBOX transaction history</div>{sandboxTxs.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">No sandbox transactions yet.</p> : <div className="mt-4 space-y-2">{sandboxTxs.map((tx) => <div key={tx.hash} className="rounded-md border border-border bg-background p-3"><div className="flex items-center justify-between gap-3"><span className="font-mono text-xs font-semibold uppercase">{tx.type}</span><span className="font-mono text-[10px] text-emerald-400">CONFIRMED</span></div><div className="mt-1 break-all font-mono text-[10px] text-muted-foreground">{tx.hash}</div><div className="mt-1 font-mono text-[10px] text-muted-foreground">gas: {tx.gas.toLocaleString()} · {tx.time}</div></div>)}</div>}</div>
        <div className="rounded-md border border-border bg-card p-5"><div className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-primary"><Activity className="size-4" />Event log</div><div className="mt-4 space-y-3">{sandboxEvents.map((event, index) => <div key={`${event.time}-${index}`} className="relative border-l border-primary/30 pl-4"><span className="absolute -left-1 top-1.5 size-2 rounded-full bg-primary shadow-[0_0_12px_currentColor]" /><div className="font-mono text-[10px] uppercase text-primary">{event.name}</div><div className="mt-1 text-xs">{event.detail}</div><div className="mt-1 font-mono text-[9px] text-muted-foreground">{event.time}</div></div>)}</div></div>
      </section>

      <section className="mb-8 overflow-hidden rounded-md border border-primary/40 bg-card">
        <div className="flex items-center justify-between border-b border-border bg-primary/5 px-5 py-3"><div className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-primary"><Radio className="size-4 animate-pulse" />Live Sepolia network</div><button type="button" onClick={() => void refreshNetwork()} className="rounded-md border border-border bg-background px-3 py-1.5 font-mono text-[10px] uppercase text-muted-foreground hover:border-primary/50 hover:text-primary">Refresh</button></div>
        <div className="grid gap-px bg-border md:grid-cols-3"><div className="bg-card p-5"><div className="flex items-center gap-2 font-mono text-[10px] uppercase text-muted-foreground"><Activity className="size-4 text-emerald-400" />Network</div><div className="mt-2 text-lg font-semibold">{networkStatus}</div><div className="mt-1 font-mono text-[10px] text-muted-foreground">updated {lastRefresh}</div></div><div className="bg-card p-5"><div className="flex items-center gap-2 font-mono text-[10px] uppercase text-muted-foreground"><Blocks className="size-4 text-primary" />Latest block</div><div className="mt-2 font-mono text-xl font-semibold">#{liveBlock}</div></div><div className="bg-card p-5"><div className="flex items-center gap-2 font-mono text-[10px] uppercase text-muted-foreground"><Fuel className="size-4 text-amber-400" />Gas price</div><div className="mt-2 text-xl font-semibold">{liveGas} <span className="text-xs text-muted-foreground">Gwei</span></div></div></div>
      </section>

      <section className="mb-8 rounded-md border border-primary/40 bg-primary/5 p-5 sm:p-6"><div className="font-mono text-xs uppercase tracking-wider text-primary">Research Registry</div><h2 className="mt-2 text-xl font-semibold">Browser-local Solidity logic demo</h2><div className="mt-4 grid gap-3 sm:grid-cols-2"><label className="text-xs text-muted-foreground">Record key<input value={recordKey} onChange={(event) => setRecordKey(event.target.value)} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-xs outline-none focus:border-primary" /></label><label className="text-xs text-muted-foreground">Record value<input value={recordValue} onChange={(event) => setRecordValue(event.target.value)} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-xs outline-none focus:border-primary" /></label></div><button type="button" onClick={() => void storeRegistryRecord()} className="mt-3 rounded-md border border-emerald-500/50 bg-emerald-500/10 px-4 py-2 font-mono text-xs font-semibold text-emerald-400">Store Record</button>{records.length > 0 ? <div className="mt-4 space-y-2">{records.map((record) => <div key={record.id} className="rounded-md border border-border bg-card p-3"><div className="font-mono text-xs font-semibold">{record.key} → {record.value}</div><div className="mt-1 break-all font-mono text-[10px] text-muted-foreground">{record.id} · {record.time}</div></div>)}</div> : null}</section>

      <section className="mb-8 rounded-md border border-border bg-card p-5 sm:p-6"><div className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-muted-foreground"><WalletCards className="size-4" />Optional real wallet mode</div><h2 className="mt-2 text-xl font-semibold">Connect an EVM Wallet</h2><p className="mt-2 text-sm text-muted-foreground">Only needed for future real signed deployment. Compilation above works without a wallet.</p><div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={connectWallet} className="rounded-md border border-primary/50 bg-primary/10 px-4 py-2 font-mono text-xs font-semibold text-primary">Connect Wallet</button><button type="button" onClick={switchToSepolia} className="rounded-md border border-border bg-background px-4 py-2 font-mono text-xs font-semibold">Switch to Sepolia</button></div><p className="mt-3 break-all font-mono text-xs text-muted-foreground">{walletStatus}</p><p className="mt-1 break-all font-mono text-xs text-muted-foreground">{chainStatus}</p>{wallet ? <p className="mt-1 break-all font-mono text-xs text-emerald-400">Wallet: {wallet}</p> : null}</section>

      <section className="grid gap-4 md:grid-cols-3"><article className="rounded-md border border-border bg-card p-5"><Braces className="size-5 text-primary" /><h2 className="mt-4 text-lg font-semibold">Solidity</h2><p className="mt-2 text-sm text-muted-foreground">Real solc compilation to ABI and EVM bytecode.</p></article><article className="rounded-md border border-border bg-card p-5"><Activity className="size-5 text-primary" /><h2 className="mt-4 text-lg font-semibold">EVM</h2><p className="mt-2 text-sm text-muted-foreground">Compiled artifacts, gas, deployment and state interaction.</p></article><article className="rounded-md border border-border bg-card p-5"><ShieldCheck className="size-5 text-primary" /><h2 className="mt-4 text-lg font-semibold">Security</h2><p className="mt-2 text-sm text-muted-foreground">Server-side compiler, no private key storage and sandbox-first workflow.</p></article></section>
    </LabShell>
  );
}
