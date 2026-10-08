import { lazy, Suspense } from "react";
import { createFileRoute } from "@tanstack/react-router";

import { LabShell } from "@/components/lab/lab-shell";

const QmlLab = lazy(() => import("@/components/lab/qml-lab").then((m) => ({ default: m.QmlLab })));

export const Route = createFileRoute("/lab/qml")({
  head: () => ({
    meta: [
      { title: "Quantum Machine Learning Lab — Quantum AI Lab" },
      {
        name: "description",
        content:
          "Educational 2-qubit variational quantum classifier on seeded 2D datasets, compared with a logistic regression baseline.",
      },
      { property: "og:title", content: "Quantum Machine Learning Lab — Quantum AI Lab" },
      {
        property: "og:description",
        content:
          "Angle encoding, Ry/Rz layers and CNOT entanglers trained gradient-free. Ideal noiseless simulation; no quantum-advantage claims.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <LabShell crumb="QML">
      <div className="mb-8 max-w-3xl">
        <span className="font-mono text-xs text-primary">LAB / 06</span>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
          Quantum Machine Learning Lab
        </h1>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          Train a small variational quantum classifier on linear, XOR or circle data, watch loss and
          accuracy evolve, inspect the decision boundary and the circuit for any point, and compare
          with classical logistic regression on the same split. Educational only.
        </p>
      </div>
      <Suspense
        fallback={
          <div
            className="h-96 animate-pulse rounded-md border border-border bg-card"
            aria-label="Loading QML lab"
          />
        }
      >
        <QmlLab />
      </Suspense>
    </LabShell>
  );
}
