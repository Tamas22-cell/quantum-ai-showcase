import { lazy, Suspense } from "react";
import { createFileRoute } from "@tanstack/react-router";

import { LabShell } from "@/components/lab/lab-shell";

const IbmLab = lazy(() => import("@/components/lab/ibm-lab").then((m) => ({ default: m.IbmLab })));

export const Route = createFileRoute("/lab/ibm")({
  head: () => ({
    meta: [
      { title: "IBM Quantum Integration — Quantum AI Lab" },
      {
        name: "description",
        content:
          "Validate circuits, export OpenQASM 3 and run ideal simulations; optional secure IBM Quantum hardware bridge when configured.",
      },
      { property: "og:title", content: "IBM Quantum Integration — Quantum AI Lab" },
      {
        property: "og:description",
        content:
          "Simulator-first IBM Quantum preparation with validation, QASM export and a server-side credential boundary.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <LabShell crumb="IBM Quantum">
      <div className="mb-8 max-w-3xl">
        <span className="font-mono text-xs text-primary">COMMAND / C3</span>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
          IBM Quantum Integration
        </h1>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          Simulator mode works without credentials. Hardware execution stays disabled until an
          external Qiskit service and your IBM token are configured on the server — simulated
          results are never presented as hardware results.
        </p>
      </div>
      <Suspense
        fallback={
          <div
            className="h-96 animate-pulse rounded-md border border-border bg-card"
            aria-label="Loading IBM module"
          />
        }
      >
        <IbmLab />
      </Suspense>
    </LabShell>
  );
}
