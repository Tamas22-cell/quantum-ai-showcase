import { lazy, Suspense } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Braces, Code2, ExternalLink, ShieldCheck, WalletCards } from "lucide-react";

import { BitcoinMiningPanel } from "@/components/lab/bitcoin-mining-panel";
import { CryptoIntelligencePanel } from "@/components/lab/crypto-intelligence-panel";
import { CryptoMarketPanel } from "@/components/lab/crypto-market-panel";
import { LabShell } from "@/components/lab/lab-shell";

const BlockchainLab = lazy(() => import("@/components/lab/blockchain-lab").then((m) => ({ default: m.BlockchainLab })));

export const Route = createFileRoute("/lab/blockchain")({
  head: () => ({
    meta: [
      { title: "Blockchain Research Lab — Quantum AI Lab" },
      { name: "description", content: "Live BTC, ETH and SOL market intelligence, Bitcoin mining hashrate, difficulty, mining pools, BTC dominance and market sentiment plus interactive blockchain research: proof-of-work, Merkle trees, signatures, on-chain analytics, Web3, Solidity and post-quantum cryptography." },
      { property: "og:title", content: "Blockchain Research Lab — Quantum AI Lab" },
      { property: "og:description", content: "Live crypto and Bitcoin mining intelligence with Web3, Solidity, EVM, BTC, ETH, SOL, hashrate, difficulty, mining pools, market signals, SHA-256, ECDSA and quantum-security concepts." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

const web3Cards = [
  { icon: Braces, title: "Solidity", text: "Smart contracts, mappings, events, modifiers, inheritance and access control." },
  { icon: Code2, title: "EVM", text: "Gas, calldata, storage, memory, ABI encoding and transaction execution." },
  { icon: WalletCards, title: "Wallets & dApps", text: "Wallet connectivity, signing, RPC providers and frontend-to-contract interaction." },
  { icon: ShieldCheck, title: "Security", text: "Reentrancy, checks-effects-interactions, access control and validation patterns." },
];

function Page() {
  return (
    <LabShell crumb="Blockchain">
      <div className="mb-8 max-w-3xl">
        <span className="font-mono text-xs text-primary">LAB / C11</span>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Blockchain Research Lab</h1>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          Track live BTC, ETH and SOL market data, crypto market signals and Bitcoin mining intelligence, build a block from editable transactions, mine it,
          trace its Merkle tree, sign and verify with ephemeral browser-only keys, analyse a sample transaction set, and review how quantum computing affects blockchain cryptography.
        </p>
      </div>

      <section className="mb-8 rounded-md border border-primary/30 bg-primary/5 p-5 sm:p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="font-mono text-xs uppercase tracking-[0.18em] text-primary">WEB3 / SOLIDITY</div>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight">Web3 & Solidity Development</h2>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-muted-foreground">
              Solidity smart contracts, EVM execution, wallet integration, dApp architecture, testing, deployment and contract-security workflows.
            </p>
          </div>
          <ExternalLink className="hidden size-6 text-primary sm:block" aria-hidden="true" />
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {web3Cards.map(({ icon: Icon, title, text }) => (
            <article key={title} className="rounded-md border border-border bg-card p-4">
              <Icon className="size-5 text-primary" aria-hidden="true" />
              <h3 className="mt-3 font-semibold">{title}</h3>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">{text}</p>
            </article>
          ))}
        </div>

        <Link
          to="/lab/web3-solidity"
          className="mt-5 inline-flex items-center gap-2 rounded-md border border-primary/40 bg-card px-4 py-2 font-mono text-xs font-semibold text-primary hover:bg-primary/10"
        >
          Open full Web3 & Solidity Lab
          <ExternalLink className="size-4" aria-hidden="true" />
        </Link>
      </section>

      <CryptoMarketPanel />
      <CryptoIntelligencePanel />
      <BitcoinMiningPanel />
      <Suspense fallback={<div className="h-96 animate-pulse rounded-md border border-border bg-card" aria-label="Loading blockchain lab" />}>
        <BlockchainLab />
      </Suspense>
    </LabShell>
  );
}
