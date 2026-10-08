import { lazy, Suspense } from "react";
import { createFileRoute } from "@tanstack/react-router";

import { LabShell } from "@/components/lab/lab-shell";

const Arena = lazy(() => import("@/components/lab/arena").then((m) => ({ default: m.Arena })));

export const Route = createFileRoute("/lab/arena")({
  head: () => ({
    meta: [
      { title: "Quantum vs Classical Arena — Quantum AI Lab" },
      {
        name: "description",
        content:
          "Reproducible benchmark of simulated QAOA against exhaustive search, greedy local search, simulated annealing and random sampling on identical Max-Cut instances.",
      },
      { property: "og:title", content: "Quantum vs Classical Arena — Quantum AI Lab" },
      {
        property: "og:description",
        content:
          "Seeded, exportable Max-Cut benchmarks. Simulator results only — no quantum-advantage claims.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <LabShell crumb="Arena">
      <div className="mb-8 max-w-3xl">
        <span className="font-mono text-xs text-primary">COMMAND CENTER / C1</span>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
          Quantum vs Classical Arena
        </h1>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          Run QAOA and classical solvers on the same weighted Max-Cut instance with one master seed.
          QAOA is executed on an ideal, noiseless classical statevector simulator in your browser —
          its timings measure simulation cost, not quantum hardware runtime, and nothing here is
          evidence of quantum advantage.
        </p>
      </div>
      <Suspense
        fallback={
          <div
            className="h-96 animate-pulse rounded-md border border-border bg-card"
            aria-label="Loading arena"
          />
        }
      >
        <Arena />
      </Suspense>
    </LabShell>
  );
}
