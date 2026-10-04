import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Activity, Blocks, Braces, Code2, Database, ExternalLink, Fuel, Radio, ShieldCheck, WalletCards, Zap } from "lucide-react";

import { LabShell } from "@/components/lab/lab-shell";

export const Route = createFileRoute("/lab/web3-solidity")({
  head: () => ({
    meta: [
      { title: "Web3 & Solidity Lab — Quantum AI Lab" },
      {
        name: "description",
        content:
          "Interactive Web3 and Solidity research lab with public Sepolia telemetry, wallet connection, gas estimation, deployment, transaction history and on-chain read/write actions.",
      },
      { property: "og:title", content: "Web3 & Solidity Lab — Quantum AI Lab" },
      {
        property: "og:description",
        content: "Live Sepolia network pulse, wallet activity, smart-contract deployment and transaction monitoring.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Web3SolidityLab,
});

const stack = [
  { icon: Braces, title: "Solidity", text: "Contracts, functions, modifiers, events, mappings, structs and inheritance." },
  { icon: Code2, title: "EVM", text: "Gas, calldata, storage, memory, ABI encoding and transaction execution." },
  { icon: WalletCards, title: "Web3", text: "Wallet connection, signing, RPC calls, providers and contract interaction." },
  { icon: Database, title: "dApps", text: "Frontend + smart contract architecture with on-chain/off-chain data flows." },
  { icon: ShieldCheck, title: "Security", text: "Reentrancy, access control, checks-effects-interactions and input validation." },
  { icon: ExternalLink, title: "Deployment", text: "Local testing, Sepolia deployment, transaction tracking and contract lifecycle." },
];

const sampleContract = `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract ResearchRegistry {
    address public owner;
    mapping(bytes32 => string) public records;

    event RecordStored(bytes32 indexed id, string value);

    constructor() {
        owner = msg.sender;
    }

    function store(bytes32 id, string calldata value) external {
        require(msg.sender == owner, "Not owner");
        records[id] = value;
        emit RecordStored(id, value);
    }
}`;

const EVM_STORAGE_INIT_CODE = "0x6018600c60003960186000f33615600c57600035600055005b60005460005260206000f3";
const SEPOLIA_CHAIN_ID = "0xaa36a7";
const PUBLIC_SEPOLIA_RPCS = [
  "https://ethereum-sepolia-rpc.publicnode.com",
  "https://rpc.sepolia.org",
];

type StoredRecord = { id: string; key: string; value: string; time: string };
type EthereumProvider = { request: (args: { method: string; params?: unknown[] }) => Promise<unknown> };
type RpcLog = { address?: string; data?: string; topics?: string[]; transactionHash?: string };
type RpcReceipt = { contractAddress?: string | null; status?: string; transactionHash?: string; gasUsed?: string; logs?: RpcLog[] };
type TxHistoryItem = { type: "deploy" | "write"; hash: string; status: "submitted" | "confirmed" | "failed"; gasUsed?: string; time: string };
type FeedItem = { label: string; detail: string; time: string };

function shortAddress(value: string) {
  return value.length > 12 ? `${value.slice(0, 6)}…${value.slice(-4)}` : value;
}

function hexToDecimal(value?: string) {
  if (!value) return "—";
  try { return BigInt(value).toString(10); } catch { return value; }
}

function weiHexToGwei(value?: string) {
  if (!value) return "—";
  try {
    const wei = BigInt(value);
    const whole = Number(wei) / 1_000_000_000;
    return whole.toFixed(2);
  } catch { return "—"; }
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

async function hashKey(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return `0x${Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("")}`;
}

function toWordHex(value: string) {
  const parsed = BigInt(value || "0");
  if (parsed < 0n) throw new Error("Use a positive integer.");
  return `0x${parsed.toString(16).padStart(64, "0")}`;
}

async function waitForReceipt(provider: EthereumProvider, txHash: string) {
  for (let i = 0; i < 90; i += 1) {
    const receipt = (await provider.request({ method: "eth_getTransactionReceipt", params: [txHash] })) as RpcReceipt | null;
    if (receipt) return receipt;
    await new Promise((resolve) => window.setTimeout(resolve, 2000));
  }
  throw new Error("Timed out while waiting for the transaction receipt.");
}

function Web3SolidityLab() {
  const [wallet, setWallet] = useState("");
  const [walletStatus, setWalletStatus] = useState("Not connected");
  const [keyName, setKeyName] = useState("experiment-001");
  const [recordValue, setRecordValue] = useState("QAOA portfolio run");
  const [records, setRecords] = useState<StoredRecord[]>([]);
  const [lastEvent, setLastEvent] = useState("No events yet");

  const [contractAddress, setContractAddress] = useState("");
  const [deployTx, setDeployTx] = useState("");
  const [writeTx, setWriteTx] = useState("");
  const [chainStatus, setChainStatus] = useState("Sepolia not checked");
  const [onchainValue, setOnchainValue] = useState("42");
  const [readValue, setReadValue] = useState("—");
  const [onchainStatus, setOnchainStatus] = useState("Ready");
  const [deployGas, setDeployGas] = useState("—");
  const [writeGas, setWriteGas] = useState("—");
  const [eventLogs, setEventLogs] = useState<RpcLog[]>([]);
  const [txHistory, setTxHistory] = useState<TxHistoryItem[]>([]);

  const [liveBlock, setLiveBlock] = useState("—");
  const [liveGas, setLiveGas] = useState("—");
  const [liveChain, setLiveChain] = useState("Sepolia · public RPC");
  const [telemetrySource, setTelemetrySource] = useState("public RPC");
  const [lastRefresh, setLastRefresh] = useState("—");
  const [feed, setFeed] = useState<FeedItem[]>([
    { label: "LAB READY", detail: "Web3 engine initialized", time: new Date().toLocaleTimeString() },
  ]);

  function getProvider() {
    const provider = (window as typeof window & { ethereum?: EthereumProvider }).ethereum;
    if (!provider) throw new Error("No injected EVM wallet detected. Install MetaMask or another compatible wallet.");
    return provider;
  }

  function pushFeed(label: string, detail: string) {
    setFeed((current) => [{ label, detail, time: new Date().toLocaleTimeString() }, ...current].slice(0, 8));
  }

  function addHistory(item: TxHistoryItem) {
    setTxHistory((current) => [item, ...current.filter((entry) => entry.hash !== item.hash)]);
  }

  async function refreshNetworkPulse() {
    const injected = (window as typeof window & { ethereum?: EthereumProvider }).ethereum;
    try {
      if (injected) {
        const [chainId, blockNumber, gasPrice] = await Promise.all([
          injected.request({ method: "eth_chainId" }) as Promise<string>,
          injected.request({ method: "eth_blockNumber" }) as Promise<string>,
          injected.request({ method: "eth_gasPrice" }) as Promise<string>,
        ]);
        setLiveChain(chainId === SEPOLIA_CHAIN_ID ? "Sepolia" : `Chain ${parseInt(chainId, 16)}`);
        setLiveBlock(hexToDecimal(blockNumber));
        setLiveGas(weiHexToGwei(gasPrice));
        setTelemetrySource("wallet RPC");
        setLastRefresh(new Date().toLocaleTimeString());
        return;
      }

      const [blockNumber, gasPrice] = await Promise.all([
        publicRpc("eth_blockNumber"),
        publicRpc("eth_gasPrice"),
      ]);
      setLiveChain("Sepolia · public RPC");
      setLiveBlock(hexToDecimal(blockNumber));
      setLiveGas(weiHexToGwei(gasPrice));
      setTelemetrySource("public RPC · no wallet needed");
      setLastRefresh(new Date().toLocaleTimeString());
    } catch (error) {
      setLiveChain("Sepolia telemetry unavailable");
      setTelemetrySource(error instanceof Error ? error.message : "RPC error");
      setLastRefresh(new Date().toLocaleTimeString());
    }
  }

  useEffect(() => {
    void refreshNetworkPulse();
    const timer = window.setInterval(() => void refreshNetworkPulse(), 12000);
    return () => window.clearInterval(timer);
  }, []);

  async function connectWallet() {
    try {
      const provider = getProvider();
      const accounts = (await provider.request({ method: "eth_requestAccounts" })) as string[];
      const account = accounts?.[0] ?? "";
      setWallet(account);
      setWalletStatus(account ? `Connected: ${shortAddress(account)}` : "No account returned");
      const chainId = (await provider.request({ method: "eth_chainId" })) as string;
      setChainStatus(chainId === SEPOLIA_CHAIN_ID ? "Sepolia connected" : `Current chain: ${chainId}`);
      pushFeed("WALLET", account ? `Connected ${shortAddress(account)}` : "No account returned");
      await refreshNetworkPulse();
    } catch (error) {
      setWalletStatus(error instanceof Error ? error.message : "Wallet connection failed");
    }
  }

  async function switchToSepolia() {
    try {
      const provider = getProvider();
      await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: SEPOLIA_CHAIN_ID }] });
      setChainStatus("Sepolia connected");
      pushFeed("NETWORK", "Switched to Sepolia testnet");
      await refreshNetworkPulse();
    } catch (error) {
      setChainStatus(error instanceof Error ? error.message : "Could not switch network");
    }
  }

  async function estimateDeployGas() {
    try {
      const provider = getProvider();
      if (!wallet) throw new Error("Connect your wallet first.");
      const estimate = (await provider.request({ method: "eth_estimateGas", params: [{ from: wallet, data: EVM_STORAGE_INIT_CODE }] })) as string;
      const value = hexToDecimal(estimate);
      setDeployGas(value);
      setOnchainStatus(`Deploy gas estimate: ${value}`);
      pushFeed("GAS", `Deploy estimate ${value}`);
    } catch (error) {
      setOnchainStatus(error instanceof Error ? error.message : "Gas estimation failed");
    }
  }

  async function estimateWriteGas() {
    try {
      const provider = getProvider();
      if (!wallet) throw new Error("Connect your wallet first.");
      if (!contractAddress) throw new Error("Deploy the Sepolia demo contract first.");
      const estimate = (await provider.request({ method: "eth_estimateGas", params: [{ from: wallet, to: contractAddress, data: toWordHex(onchainValue) }] })) as string;
      const value = hexToDecimal(estimate);
      setWriteGas(value);
      setOnchainStatus(`Write gas estimate: ${value}`);
      pushFeed("GAS", `Write estimate ${value}`);
    } catch (error) {
      setOnchainStatus(error instanceof Error ? error.message : "Gas estimation failed");
    }
  }

  async function deploySepoliaContract() {
    try {
      const provider = getProvider();
      if (!wallet) throw new Error("Connect your wallet first.");
      const chainId = (await provider.request({ method: "eth_chainId" })) as string;
      if (chainId !== SEPOLIA_CHAIN_ID) throw new Error("Switch the wallet to Sepolia first.");
      setOnchainStatus("Waiting for wallet confirmation…");
      const txHash = (await provider.request({ method: "eth_sendTransaction", params: [{ from: wallet, data: EVM_STORAGE_INIT_CODE }] })) as string;
      setDeployTx(txHash);
      addHistory({ type: "deploy", hash: txHash, status: "submitted", time: new Date().toLocaleTimeString() });
      pushFeed("DEPLOY", `Submitted ${shortAddress(txHash)}`);
      setOnchainStatus("Deployment submitted. Waiting for confirmation…");
      const receipt = await waitForReceipt(provider, txHash);
      if (!receipt.contractAddress) throw new Error("Transaction confirmed but no contract address was returned.");
      setContractAddress(receipt.contractAddress);
      setEventLogs(receipt.logs ?? []);
      addHistory({ type: "deploy", hash: txHash, status: receipt.status === "0x0" ? "failed" : "confirmed", gasUsed: hexToDecimal(receipt.gasUsed), time: new Date().toLocaleTimeString() });
      setOnchainStatus(`Contract deployed: ${shortAddress(receipt.contractAddress)}`);
      pushFeed("CONFIRMED", `Contract ${shortAddress(receipt.contractAddress)}`);
      await refreshNetworkPulse();
    } catch (error) {
      setOnchainStatus(error instanceof Error ? error.message : "Deployment failed");
    }
  }

  async function writeSepoliaValue() {
    try {
      const provider = getProvider();
      if (!wallet) throw new Error("Connect your wallet first.");
      if (!contractAddress) throw new Error("Deploy the Sepolia demo contract first.");
      const chainId = (await provider.request({ method: "eth_chainId" })) as string;
      if (chainId !== SEPOLIA_CHAIN_ID) throw new Error("Switch the wallet to Sepolia first.");
      const data = toWordHex(onchainValue);
      setOnchainStatus("Waiting for write confirmation…");
      const txHash = (await provider.request({ method: "eth_sendTransaction", params: [{ from: wallet, to: contractAddress, data }] })) as string;
      setWriteTx(txHash);
      addHistory({ type: "write", hash: txHash, status: "submitted", time: new Date().toLocaleTimeString() });
      pushFeed("WRITE", `Submitted value ${onchainValue}`);
      const receipt = await waitForReceipt(provider, txHash);
      setEventLogs(receipt.logs ?? []);
      addHistory({ type: "write", hash: txHash, status: receipt.status === "0x0" ? "failed" : "confirmed", gasUsed: hexToDecimal(receipt.gasUsed), time: new Date().toLocaleTimeString() });
      setOnchainStatus(`Stored ${onchainValue} on Sepolia.`);
      pushFeed("CONFIRMED", `Stored ${onchainValue} on-chain`);
      await refreshNetworkPulse();
    } catch (error) {
      setOnchainStatus(error instanceof Error ? error.message : "Write failed");
    }
  }

  async function readSepoliaValue() {
    try {
      const provider = getProvider();
      if (!contractAddress) throw new Error("Deploy the Sepolia demo contract first.");
      const result = (await provider.request({ method: "eth_call", params: [{ to: contractAddress, data: "0x" }, "latest"] })) as string;
      const value = BigInt(result || "0x0").toString(10);
      setReadValue(value);
      setOnchainStatus("Read completed from Sepolia.");
      pushFeed("READ", `On-chain value ${value}`);
    } catch (error) {
      setOnchainStatus(error instanceof Error ? error.message : "Read failed");
    }
  }

  async function storeRecord() {
    const cleanKey = keyName.trim();
    const cleanValue = recordValue.trim();
    if (!cleanKey || !cleanValue) {
      setLastEvent("Enter both a key and a value first.");
      return;
    }
    const id = await hashKey(cleanKey);
    const next: StoredRecord = { id, key: cleanKey, value: cleanValue, time: new Date().toLocaleTimeString() };
    setRecords((current) => [next, ...current.filter((item) => item.id !== id)]);
    setLastEvent(`RecordStored(${id.slice(0, 12)}…, \"${cleanValue}\")`);
    pushFeed("LOCAL EVENT", `${cleanKey} → ${cleanValue}`);
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
          Live EVM workspace for public Sepolia telemetry, wallet connectivity, smart-contract deployment,
          gas analysis, transaction tracking and on-chain interaction.
        </p>
      </div>

      <section className="mb-8 overflow-hidden rounded-md border border-primary/40 bg-card">
        <div className="flex items-center justify-between border-b border-border bg-primary/5 px-5 py-3">
          <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-primary">
            <Radio className="size-4 animate-pulse" aria-hidden="true" /> Live network pulse
          </div>
          <button type="button" onClick={() => void refreshNetworkPulse()} className="rounded-md border border-border bg-background px-3 py-1.5 font-mono text-[10px] uppercase text-muted-foreground hover:border-primary/50 hover:text-primary">Refresh</button>
        </div>
        <div className="grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-4">
          <div className="bg-card p-5">
            <div className="flex items-center gap-2 font-mono text-[10px] uppercase text-muted-foreground"><Activity className="size-4 text-emerald-400" />Network</div>
            <div className="mt-2 text-xl font-semibold">{liveChain}</div>
            <div className="mt-1 font-mono text-[10px] text-muted-foreground">updated {lastRefresh}</div>
          </div>
          <div className="bg-card p-5">
            <div className="flex items-center gap-2 font-mono text-[10px] uppercase text-muted-foreground"><Blocks className="size-4 text-primary" />Latest block</div>
            <div className="mt-2 font-mono text-xl font-semibold">#{liveBlock}</div>
            <div className="mt-1 h-1 overflow-hidden rounded-full bg-background"><div className="h-full w-2/3 animate-pulse rounded-full bg-primary" /></div>
          </div>
          <div className="bg-card p-5">
            <div className="flex items-center gap-2 font-mono text-[10px] uppercase text-muted-foreground"><Fuel className="size-4 text-amber-400" />Gas price</div>
            <div className="mt-2 text-xl font-semibold">{liveGas} <span className="text-xs text-muted-foreground">Gwei</span></div>
            <div className="mt-1 font-mono text-[10px] text-muted-foreground">{telemetrySource}</div>
          </div>
          <div className="bg-card p-5">
            <div className="flex items-center gap-2 font-mono text-[10px] uppercase text-muted-foreground"><WalletCards className="size-4 text-primary" />Wallet</div>
            <div className="mt-2 font-mono text-xl font-semibold">{wallet ? shortAddress(wallet) : "OFFLINE"}</div>
            <div className="mt-1 font-mono text-[10px] text-muted-foreground">{wallet ? "ready to sign" : "telemetry still live"}</div>
          </div>
        </div>
      </section>

      <div className="mb-8 grid gap-4 lg:grid-cols-[1.4fr_0.6fr]">
        <section className="rounded-md border border-emerald-500/40 bg-emerald-500/5 p-5 sm:p-6">
          <div className="font-mono text-xs uppercase tracking-wider text-emerald-400">Real Sepolia testnet demo</div>
          <h2 className="mt-2 text-2xl font-semibold">Deploy + Write + Read On-Chain</h2>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-muted-foreground">
            Live block and gas data work without a wallet. Real deploy/write actions still require an injected EVM wallet, Sepolia test ETH and your confirmation.
          </p>

          <div className="mt-5 grid gap-4 xl:grid-cols-3">
            <div className="rounded-md border border-border bg-card p-4">
              <div className="font-mono text-[10px] uppercase text-muted-foreground">1 · Wallet / network</div>
              <button type="button" onClick={connectWallet} className="mt-3 rounded-md border border-primary/50 bg-primary/10 px-4 py-2 font-mono text-xs font-semibold text-primary hover:bg-primary/15">
                {wallet ? "Reconnect Wallet" : "Connect Wallet"}
              </button>
              <button type="button" onClick={switchToSepolia} className="ml-2 mt-3 rounded-md border border-border bg-background px-4 py-2 font-mono text-xs font-semibold text-foreground hover:border-primary/50">Switch to Sepolia</button>
              <p className="mt-3 break-all font-mono text-xs text-muted-foreground">{walletStatus}</p>
              <p className="mt-1 break-all font-mono text-xs text-muted-foreground">{chainStatus}</p>
            </div>

            <div className="rounded-md border border-border bg-card p-4">
              <div className="font-mono text-[10px] uppercase text-muted-foreground">2 · Deploy contract</div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={estimateDeployGas} className="rounded-md border border-border bg-background px-4 py-2 font-mono text-xs font-semibold text-foreground hover:border-primary/50">Estimate Gas</button>
                <button type="button" onClick={deploySepoliaContract} className="rounded-md border border-emerald-500/50 bg-emerald-500/10 px-4 py-2 font-mono text-xs font-semibold text-emerald-400 hover:bg-emerald-500/15">Deploy</button>
              </div>
              <p className="mt-3 font-mono text-xs text-muted-foreground">Estimated gas: <span className="text-foreground">{deployGas}</span></p>
              <p className="mt-2 break-all font-mono text-xs text-muted-foreground">Contract: {contractAddress || "Not deployed"}</p>
              {contractAddress ? <a className="mt-2 inline-block font-mono text-xs text-primary underline" href={`https://sepolia.etherscan.io/address/${contractAddress}`} target="_blank" rel="noreferrer">Open on Etherscan</a> : null}
            </div>

            <div className="rounded-md border border-border bg-card p-4">
              <div className="font-mono text-[10px] uppercase text-muted-foreground">3 · Contract interaction</div>
              <label className="mt-3 block text-xs text-muted-foreground">Integer value
                <input value={onchainValue} onChange={(event) => setOnchainValue(event.target.value)} inputMode="numeric" className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-xs text-foreground outline-none focus:border-primary" />
              </label>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={estimateWriteGas} className="rounded-md border border-border bg-background px-3 py-2 font-mono text-xs font-semibold text-foreground hover:border-primary/50">Gas</button>
                <button type="button" onClick={writeSepoliaValue} className="rounded-md border border-primary/50 bg-primary/10 px-3 py-2 font-mono text-xs font-semibold text-primary hover:bg-primary/15">Write</button>
                <button type="button" onClick={readSepoliaValue} className="rounded-md border border-border bg-background px-3 py-2 font-mono text-xs font-semibold text-foreground hover:border-primary/50">Read</button>
              </div>
              <p className="mt-3 font-mono text-xs text-muted-foreground">Gas: <span className="text-foreground">{writeGas}</span> · Value: <span className="text-foreground">{readValue}</span></p>
            </div>
          </div>

          <div className="mt-4 rounded-md border border-border bg-card p-4">
            <div className="flex items-center gap-2 font-mono text-[10px] uppercase text-muted-foreground"><Zap className="size-4 text-amber-400" />Sepolia activity</div>
            <p className="mt-2 break-all font-mono text-xs text-muted-foreground">Status: {onchainStatus}</p>
            {deployTx ? <p className="mt-1 break-all font-mono text-xs text-muted-foreground">Deploy tx: <a className="text-primary underline" href={`https://sepolia.etherscan.io/tx/${deployTx}`} target="_blank" rel="noreferrer">{deployTx}</a></p> : null}
            {writeTx ? <p className="mt-1 break-all font-mono text-xs text-muted-foreground">Write tx: <a className="text-primary underline" href={`https://sepolia.etherscan.io/tx/${writeTx}`} target="_blank" rel="noreferrer">{writeTx}</a></p> : null}
          </div>
        </section>

        <aside className="rounded-md border border-border bg-card p-5">
          <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-primary"><Activity className="size-4" />Live activity feed</div>
          <div className="mt-4 space-y-3">
            {feed.map((item, index) => (
              <div key={`${item.time}-${index}`} className="relative border-l border-primary/30 pl-4">
                <span className="absolute -left-1 top-1.5 size-2 rounded-full bg-primary shadow-[0_0_12px_currentColor]" />
                <div className="font-mono text-[10px] uppercase text-primary">{item.label}</div>
                <div className="mt-1 text-xs text-foreground">{item.detail}</div>
                <div className="mt-1 font-mono text-[9px] text-muted-foreground">{item.time}</div>
              </div>
            ))}
          </div>
        </aside>
      </div>

      <section className="mb-8 grid gap-4 lg:grid-cols-2">
        <div className="rounded-md border border-border bg-card p-4">
          <div className="font-mono text-[10px] uppercase text-muted-foreground">Transaction history</div>
          {txHistory.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">No testnet transactions yet.</p> : (
            <div className="mt-3 space-y-2">
              {txHistory.map((tx) => (
                <div key={`${tx.type}-${tx.hash}`} className="rounded-md border border-border bg-background p-3">
                  <div className="flex items-center justify-between gap-3"><span className="font-mono text-xs font-semibold uppercase text-foreground">{tx.type}</span><span className="font-mono text-[10px] uppercase text-muted-foreground">{tx.status}</span></div>
                  <a className="mt-1 block break-all font-mono text-[10px] text-primary underline" href={`https://sepolia.etherscan.io/tx/${tx.hash}`} target="_blank" rel="noreferrer">{tx.hash}</a>
                  <div className="mt-1 font-mono text-[10px] text-muted-foreground">gas used: {tx.gasUsed || "pending"} · {tx.time}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-md border border-border bg-card p-4">
          <div className="font-mono text-[10px] uppercase text-muted-foreground">Event / receipt logs</div>
          {eventLogs.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">No receipt logs yet.</p> : (
            <div className="mt-3 space-y-2">
              {eventLogs.map((log, index) => (
                <div key={`${log.transactionHash || "log"}-${index}`} className="rounded-md border border-border bg-background p-3">
                  <div className="break-all font-mono text-[10px] text-muted-foreground">address: {log.address || "—"}</div>
                  <div className="mt-1 break-all font-mono text-[10px] text-muted-foreground">data: {log.data || "0x"}</div>
                  <div className="mt-1 break-all font-mono text-[10px] text-muted-foreground">topics: {(log.topics || []).join(", ") || "none"}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="mb-8 rounded-md border border-primary/40 bg-primary/5 p-5 sm:p-6">
        <div className="font-mono text-xs uppercase tracking-wider text-primary">Browser-local contract simulator</div>
        <h2 className="mt-2 text-2xl font-semibold">Research Registry Simulator</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">Gas-free local logic demo that works even without Sepolia test ETH.</p>
        <div className="mt-5 rounded-md border border-border bg-card p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs text-muted-foreground">Record key<input value={keyName} onChange={(event) => setKeyName(event.target.value)} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-xs text-foreground outline-none focus:border-primary" /></label>
            <label className="text-xs text-muted-foreground">Record value<input value={recordValue} onChange={(event) => setRecordValue(event.target.value)} className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-xs text-foreground outline-none focus:border-primary" /></label>
          </div>
          <button type="button" onClick={storeRecord} className="mt-3 rounded-md border border-emerald-500/50 bg-emerald-500/10 px-4 py-2 font-mono text-xs font-semibold text-emerald-400 hover:bg-emerald-500/15">Store Record</button>
          <p className="mt-3 break-all font-mono text-xs text-muted-foreground">Event: {lastEvent}</p>
        </div>
        {records.length > 0 ? <div className="mt-4 space-y-2">{records.map((record) => <div key={record.id} className="rounded-md border border-border bg-card p-3"><div className="font-mono text-xs font-semibold text-foreground">{record.key} → {record.value}</div><div className="mt-1 break-all font-mono text-[10px] text-muted-foreground">{record.id} · {record.time}</div></div>)}</div> : null}
      </section>

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {stack.map(({ icon: Icon, title, text }) => (
          <article key={title} className="rounded-md border border-border bg-card p-5 transition hover:-translate-y-0.5 hover:border-primary/50">
            <Icon className="size-5 text-primary" aria-hidden="true" />
            <h2 className="mt-4 text-lg font-semibold">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p>
          </article>
        ))}
      </section>

      <section className="mt-8 rounded-md border border-border bg-card p-5 sm:p-6">
        <div className="font-mono text-xs uppercase tracking-wider text-primary">Solidity example</div>
        <h2 className="mt-2 text-2xl font-semibold">Research Registry Smart Contract</h2>
        <pre className="mt-5 overflow-x-auto rounded-md border border-border bg-background p-4 text-xs leading-6 text-foreground"><code>{sampleContract}</code></pre>
      </section>
    </LabShell>
  );
}
