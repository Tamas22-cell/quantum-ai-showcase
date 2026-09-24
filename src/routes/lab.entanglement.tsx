import { lazy, Suspense } from "react";
import { createFileRoute } from "@tanstack/react-router";

import { LabShell } from "@/components/lab/lab-shell";

const EntanglementLab = lazy(() => import("@/components/lab/entanglement-lab").then((m) => ({ default: m.EntanglementLab })));

export const Route = createFileRoute("/lab/entanglement")({
  head: () => ({
    meta: [
      { title: "Quantum Entanglement Lab — Quantum AI Lab" },
      { name: "description", content: "Prepare Bell states, measure joint correlations in X, Y and Z bases, and run a seeded CHSH experiment on an ideal statevector simulator." },
      { property: "og:title", content: "Quantum Entanglement Lab — Quantum AI Lab" },
      { property: "og:description", content: "Bell states, correlations and CHSH — ideal noiseless simulation, not hardware results." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <LabShell crumb="Entanglement">
      <div className="mb-8 max-w-3xl">
        <span className="font-mono text-xs text-primary">MODULE 02</span>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Quantum Entanglement Lab</h1>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          Prepare the four Bell states with H + CNOT, measure each qubit in the X, Y or Z basis, and test the CHSH inequality. Everything runs on the same tested
          statevector engine as the Circuit Builder — an ideal, noiseless classical simulation, not quantum hardware.
        </p>
      </div>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-md border border-border bg-card" aria-label="Loading entanglement lab" />}>
        <EntanglementLab />
      </Suspense>
    </LabShell>
  );
}
