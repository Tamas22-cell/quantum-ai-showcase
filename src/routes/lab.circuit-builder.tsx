import { lazy, Suspense } from "react";
import { createFileRoute } from "@tanstack/react-router";

import { BlochSphereVisualizer } from "@/components/lab/bloch-sphere-visualizer";
import { LabShell } from "@/components/lab/lab-shell";

// Lazy-load the simulator so the portfolio and dashboard don't pay for it.
const CircuitBuilder = lazy(() => import("@/components/lab/circuit-builder").then((m) => ({ default: m.CircuitBuilder })));

export const Route = createFileRoute("/lab/circuit-builder")({
  head: () => ({
    meta: [
      { title: "Quantum Circuit Builder — Quantum AI Lab" },
      { name: "description", content: "Build 1–5 qubit circuits with H, X, Y, Z, S, T, Rx, Ry, Rz, CNOT and CZ; inspect the exact statevector, seeded shot sampling and an interactive Bloch sphere." },
      { property: "og:title", content: "Quantum Circuit Builder — Quantum AI Lab" },
      { property: "og:description", content: "Exact statevector simulation, measurement probabilities and an interactive single-qubit Bloch sphere." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <LabShell crumb="Circuit Builder">
      <div className="mb-8 max-w-3xl">
        <span className="font-mono text-xs text-primary">LAB / 01</span>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Quantum Circuit Builder</h1>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          Compose a circuit from the gate palette. The statevector is recomputed exactly after every edit; shot sampling draws from that exact distribution with a seeded random generator.
        </p>
      </div>
      <div className="mb-5" data-feature="bloch-sphere">
        <BlochSphereVisualizer />
      </div>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-md border border-border bg-card" aria-label="Loading simulator" />}>
        <CircuitBuilder />
      </Suspense>
    </LabShell>
  );
}
