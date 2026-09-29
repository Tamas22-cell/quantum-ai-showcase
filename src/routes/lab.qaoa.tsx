import { lazy, Suspense } from "react";
import { createFileRoute } from "@tanstack/react-router";

import { ExperimentSnapshotButton } from "@/components/lab/experiment-snapshot-button";
import { LabShell } from "@/components/lab/lab-shell";

const QaoaLab = lazy(() => import("@/components/lab/qaoa-lab").then((m) => ({ default: m.QaoaLab })));

export const Route = createFileRoute("/lab/qaoa")({
  head: () => ({
    meta: [
      { title: "QAOA Optimization Lab — Quantum AI Lab" },
      { name: "description", content: "Interactive QAOA for small weighted Max-Cut graphs: Hamiltonians, parameter inspection, seeded optimisation and exact classical comparison." },
      { property: "og:title", content: "QAOA Optimization Lab — Quantum AI Lab" },
      { property: "og:description", content: "Ideal noiseless simulation of QAOA on Max-Cut with an exhaustive classical baseline. No quantum-advantage claims." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <LabShell crumb="QAOA">
      <div className="mb-8 max-w-3xl">
        <span className="font-mono text-xs text-primary">LAB / 03</span>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">QAOA Optimization Lab</h1>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          Build a small weighted Max-Cut graph, inspect the cost and mixer Hamiltonians, tune γ and β by hand or with seeded classical optimisation,
          and compare the result to the exact optimum. Everything runs as an ideal noiseless classical simulation in your browser.
        </p>
        <div className="mt-4"><ExperimentSnapshotButton module="QAOA Optimization Lab" route="/lab/qaoa" /></div>
      </div>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-md border border-border bg-card" aria-label="Loading QAOA lab" />}>
        <QaoaLab />
      </Suspense>
    </LabShell>
  );
}
