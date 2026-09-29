import { lazy, Suspense } from "react";
import { createFileRoute } from "@tanstack/react-router";

import { LabShell } from "@/components/lab/lab-shell";

const BlockchainLab = lazy(() => import("@/components/lab/blockchain-lab").then((m) => ({ default: m.BlockchainLab })));

export const Route = createFileRoute("/lab/blockchain")({
  head: () => ({
    meta: [
      { title: "Blockchain Research Lab — Quantum AI Lab" },
      { name: "description", content: "Build blocks, mine with proof-of-work, visualise Merkle trees, sign and verify with ephemeral browser-only keys, analyse sample on-chain data and explore post-quantum cryptography." },
      { property: "og:title", content: "Blockchain Research Lab — Quantum AI Lab" },
      { property: "og:description", content: "Interactive, in-browser blockchain fundamentals with SHA-256 and ECDSA. No real funds, no paid APIs." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <LabShell crumb="Blockchain">
      <div className="mb-8 max-w-3xl">
        <span className="font-mono text-xs text-primary">LAB / C11</span>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Blockchain Research Lab</h1>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          Build a block from editable transactions, mine it, trace its Merkle tree, sign and verify with ephemeral browser-only keys,
          analyse a sample transaction set, and review how quantum computing affects blockchain cryptography.
        </p>
      </div>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-md border border-border bg-card" aria-label="Loading blockchain lab" />}>
        <BlockchainLab />
      </Suspense>
    </LabShell>
  );
}
