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
          "Web3 and Solidity research lab covering smart contracts, EVM architecture, wallets, dApps, security, testing and blockchain integration.",
      },
      { property: "og:title", content: "Web3 & Solidity Lab — Quantum AI Lab" },
      {
        property: "og:description",
        content: "Smart contracts, EVM, wallets, dApps, testing and Web3 security in one developer-focused lab.",
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

function Web3SolidityLab() {
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
