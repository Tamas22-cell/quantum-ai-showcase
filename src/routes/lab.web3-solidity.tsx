import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Braces, Code2, Database, ExternalLink, ShieldCheck, WalletCards } from "lucide-react";

import { LabShell } from "@/components/lab/lab-shell";

export const Route = createFileRoute("/lab/web3-solidity")({
  head: () => ({
    meta: [
      { title: "Web3 & Solidity Lab — Quantum AI Lab" },
      {
        name: "description",
        content:
          "Interactive Web3 and Solidity research lab covering smart contracts, EVM architecture, wallets, dApps, security, testing and blockchain integration.",
      },
      { property: "og:title", content: "Web3 & Solidity Lab — Quantum AI Lab" },
      {
        property: "og:description",
        content: "Interactive wallet connection and smart-contract registry simulation for Web3 development.",
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
  { icon: ExternalLink, title: "Deployment", text: "Local testing, testnet deployment, verification and contract lifecycle." },
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

type StoredRecord = {
  id: string;
  key: string;
  value: string;
  time: string;
};

type EthereumProvider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
};

function shortAddress(value: string) {
  return value.length > 12 ? `${value.slice(0, 6)}…${value.slice(-4)}` : value;
}

async function hashKey(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return `0x${Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("")}`;
}

function Web3SolidityLab() {
  const [wallet, setWallet] = useState("");
  const [walletStatus, setWalletStatus] = useState("Not connected");
  const [keyName, setKeyName] = useState("experiment-001");
  const [recordValue, setRecordValue] = useState("QAOA portfolio run");
  const [records, setRecords] = useState<StoredRecord[]>([]);
  const [lastEvent, setLastEvent] = useState("No events yet");

  async function connectWallet() {
    try {
      const provider = (window as typeof window & { ethereum?: EthereumProvider }).ethereum;
      if (!provider) {
        setWalletStatus("No injected wallet detected. Install MetaMask or another EVM wallet.");
        return;
      }
      const accounts = (await provider.request({ method: "eth_requestAccounts" })) as string[];
      const account = accounts?.[0] ?? "";
      setWallet(account);
      setWalletStatus(account ? `Connected: ${shortAddress(account)}` : "No account returned");
    } catch (error) {
      setWalletStatus(error instanceof Error ? error.message : "Wallet connection failed");
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
    const next: StoredRecord = {
      id,
      key: cleanKey,
      value: cleanValue,
      time: new Date().toLocaleTimeString(),
    };
    setRecords((current) => [next, ...current.filter((item) => item.id !== id)]);
    setLastEvent(`RecordStored(${id.slice(0, 12)}…, \"${cleanValue}\")`);
  }

  return (
    <LabShell crumb="Web3 & Solidity">
      <div className="mb-10 max-w-3xl">
        <span className="font-mono text-xs text-primary">LAB / C13</span>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Web3 & Solidity Lab</h1>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          Developer-focused Web3 workspace covering Solidity smart contracts, EVM execution,
          wallet connectivity, dApp architecture, testing, deployment and smart-contract security.
        </p>
      </div>

      <section className="mb-8 rounded-md border border-primary/40 bg-primary/5 p-5 sm:p-6">
        <div className="font-mono text-xs uppercase tracking-wider text-primary">Interactive Web3 demo</div>
        <h2 className="mt-2 text-2xl font-semibold">Wallet + Smart Contract Registry Simulator</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          The wallet button uses a real injected EVM wallet if available. Record storage below is a browser-local smart-contract simulation, so it works without gas, testnet funds or an API key.
        </p>

        <div className="mt-5 grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="rounded-md border border-border bg-card p-4">
            <div className="font-mono text-[10px] uppercase text-muted-foreground">Wallet</div>
            <button
              type="button"
              onClick={connectWallet}
              className="mt-3 rounded-md border border-primary/50 bg-primary/10 px-4 py-2 font-mono text-xs font-semibold text-primary hover:bg-primary/15"
            >
              {wallet ? "Reconnect Wallet" : "Connect Wallet"}
            </button>
            <p className="mt-3 break-all font-mono text-xs text-muted-foreground">{walletStatus}</p>
          </div>

          <div className="rounded-md border border-border bg-card p-4">
            <div className="font-mono text-[10px] uppercase text-muted-foreground">Contract write simulation</div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="text-xs text-muted-foreground">
                Record key
                <input
                  value={keyName}
                  onChange={(event) => setKeyName(event.target.value)}
                  className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-xs text-foreground outline-none focus:border-primary"
                />
              </label>
              <label className="text-xs text-muted-foreground">
                Record value
                <input
                  value={recordValue}
                  onChange={(event) => setRecordValue(event.target.value)}
                  className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-xs text-foreground outline-none focus:border-primary"
                />
              </label>
            </div>
            <button
              type="button"
              onClick={storeRecord}
              className="mt-3 rounded-md border border-emerald-500/50 bg-emerald-500/10 px-4 py-2 font-mono text-xs font-semibold text-emerald-400 hover:bg-emerald-500/15"
            >
              Store Record
            </button>
            <p className="mt-3 break-all font-mono text-xs text-muted-foreground">Event: {lastEvent}</p>
          </div>
        </div>

        <div className="mt-4 rounded-md border border-border bg-card p-4">
          <div className="font-mono text-[10px] uppercase text-muted-foreground">Registry state</div>
          {records.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">No records stored yet.</p>
          ) : (
            <div className="mt-3 space-y-3">
              {records.map((record) => (
                <div key={record.id} className="rounded-md border border-border bg-background p-3">
                  <div className="font-mono text-xs font-semibold text-foreground">{record.key} → {record.value}</div>
                  <div className="mt-1 break-all font-mono text-[10px] text-muted-foreground">id: {record.id}</div>
                  <div className="mt-1 font-mono text-[10px] text-muted-foreground">stored: {record.time}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {stack.map(({ icon: Icon, title, text }) => (
          <article key={title} className="rounded-md border border-border bg-card p-5">
            <Icon className="size-5 text-primary" aria-hidden="true" />
            <h2 className="mt-4 text-lg font-semibold">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p>
          </article>
        ))}
      </section>

      <section className="mt-8 rounded-md border border-border bg-card p-5 sm:p-6">
        <div className="font-mono text-xs uppercase tracking-wider text-primary">Solidity example</div>
        <h2 className="mt-2 text-2xl font-semibold">Research Registry Smart Contract</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Minimal contract demonstrating ownership, mappings, calldata, events and access control.
        </p>
        <pre className="mt-5 overflow-x-auto rounded-md border border-border bg-background p-4 text-xs leading-6 text-foreground">
          <code>{sampleContract}</code>
        </pre>
      </section>

      <section className="mt-8 rounded-md border border-primary/30 bg-primary/5 p-5 sm:p-6">
        <div className="font-mono text-xs uppercase tracking-wider text-primary">Developer path</div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            "1. Solidity fundamentals",
            "2. Foundry / Hardhat testing",
            "3. ethers.js / viem integration",
            "4. Testnet deployment + security review",
          ].map((step) => (
            <div key={step} className="rounded-md border border-border bg-card p-4 font-mono text-xs text-foreground">
              {step}
            </div>
          ))}
        </div>
      </section>
    </LabShell>
  );
}
