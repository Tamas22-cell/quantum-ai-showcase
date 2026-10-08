import { lazy, Suspense } from "react";
import { createFileRoute } from "@tanstack/react-router";

import { LabShell } from "@/components/lab/lab-shell";

const QiskitLab = lazy(() =>
  import("@/components/lab/qiskit-lab").then((m) => ({ default: m.QiskitLab })),
);

export const Route = createFileRoute("/lab/qiskit")({
  head: () => ({
    meta: [
      { title: "Qiskit Workflow Lab — Quantum AI Lab" },
      {
        name: "description",
        content:
          "Walk through a Qiskit-style workflow in your browser: circuit, transpile, choose a simulator, run, inspect counts and save the experiment.",
      },
      { property: "og:title", content: "Qiskit Workflow Lab — Quantum AI Lab" },
      {
        property: "og:description",
        content:
          "Circuit → Transpile → Backend → Run → Result → Save, simulated locally. Not IBM hardware.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <LabShell crumb="Qiskit">
      <div className="mb-8 max-w-3xl">
        <span className="font-mono text-xs text-primary">LAB / C9</span>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
          Qiskit Workflow Lab
        </h1>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          Follow the steps of a typical Qiskit experiment: pick a circuit, transpile it to a
          hardware-style gate basis, choose a local simulator, run it, read the measurement results
          and save the experiment to your history. Everything runs in your browser for free.
        </p>
      </div>
      <Suspense
        fallback={
          <div
            className="h-96 animate-pulse rounded-md border border-border bg-card"
            aria-label="Loading Qiskit lab"
          />
        }
      >
        <QiskitLab />
      </Suspense>
    </LabShell>
  );
}
