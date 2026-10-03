import { lazy, Suspense } from "react";
import { createFileRoute } from "@tanstack/react-router";

import { ExperimentSnapshotButton } from "@/components/lab/experiment-snapshot-button";
import { LabShell } from "@/components/lab/lab-shell";
import { PortfolioSimulationBenchmarks } from "@/components/lab/portfolio-simulation-benchmarks";

const PortfolioLab = lazy(() => import("@/components/lab/portfolio-lab").then((m) => ({ default: m.PortfolioLab })));

export const Route = createFileRoute("/lab/portfolio")({
  head: () => ({
    meta: [
      { title: "Quantum Portfolio Optimizer — Quantum AI Lab" },
      { name: "description", content: "Educational QUBO/Ising portfolio selection solved with simulated QAOA and compared against an exhaustive classical optimum." },
      { property: "og:title", content: "Quantum Portfolio Optimizer — Quantum AI Lab" },
      { property: "og:description", content: "Synthetic or user-supplied returns, risk aversion and cardinality constraints; ideal noiseless QAOA simulation. Not investment advice." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <LabShell crumb="Portfolio">
      <div className="mb-8 max-w-3xl">
        <span className="font-mono text-xs text-primary">LAB / 05</span>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Quantum Portfolio Optimizer</h1>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          Choose K assets out of a small universe by minimising risk minus return with a cardinality penalty. See the QUBO and Ising forms,
          solve with seeded QAOA on the shared statevector simulator, and compare with the exact exhaustive optimum. Educational only.
        </p>
        <div className="mt-4"><ExperimentSnapshotButton module="Quantum Portfolio Optimizer" route="/lab/portfolio" /></div>
      </div>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-md border border-border bg-card" aria-label="Loading portfolio optimizer" />}>
        <PortfolioLab />
      </Suspense>
      <PortfolioSimulationBenchmarks />
    </LabShell>
  );
}
