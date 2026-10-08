import { lazy, Suspense } from "react";
import { createFileRoute } from "@tanstack/react-router";

import { ExperimentSnapshotButton } from "@/components/lab/experiment-snapshot-button";
import { LabShell } from "@/components/lab/lab-shell";

const VqeLab = lazy(() => import("@/components/lab/vqe-lab").then((m) => ({ default: m.VqeLab })));

export const Route = createFileRoute("/lab/vqe")({
  head: () => ({
    meta: [
      { title: "VQE Research Lab — Quantum AI Lab" },
      {
        name: "description",
        content:
          "Interactive Variational Quantum Eigensolver for small Pauli Hamiltonians with Ry/Rz ansatz, seeded optimizers and exact ground-state reference.",
      },
      { property: "og:title", content: "VQE Research Lab — Quantum AI Lab" },
      {
        property: "og:description",
        content:
          "Ideal noiseless statevector simulation of VQE compared against exact diagonalisation. Not quantum hardware; no quantum-advantage claims.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <LabShell crumb="VQE">
      <div className="mb-8 max-w-3xl">
        <span className="font-mono text-xs text-primary">LAB / 04</span>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">VQE Research Lab</h1>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          Define a small Pauli Hamiltonian, choose a hardware-efficient Ry/Rz ansatz and a classical
          optimizer, and watch the variational energy approach the exact ground-state energy
          obtained by diagonalisation. All runs are seeded and reproducible.
        </p>
        <div className="mt-4">
          <ExperimentSnapshotButton module="VQE Research Lab" route="/lab/vqe" />
        </div>
      </div>
      <Suspense
        fallback={
          <div
            className="h-96 animate-pulse rounded-md border border-border bg-card"
            aria-label="Loading VQE lab"
          />
        }
      >
        <VqeLab />
      </Suspense>
    </LabShell>
  );
}
