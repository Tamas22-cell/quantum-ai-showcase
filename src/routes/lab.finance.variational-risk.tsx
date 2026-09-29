import { lazy, Suspense } from "react";
import { createFileRoute } from "@tanstack/react-router";

import { LabShell } from "@/components/lab/lab-shell";

const VariationalRiskLab = lazy(() => import("@/components/lab/variational-risk-lab").then((m) => ({ default: m.VariationalRiskLab })));

export const Route = createFileRoute("/lab/finance/variational-risk")({
  head: () => ({
    meta: [
      { title: "Variational Quantum Risk Model — Quantum AI Lab" },
      { name: "description", content: "Interactive variational quantum-finance research project: parameterized circuits, hybrid optimization, cost convergence and classical risk baseline comparison." },
      { property: "og:title", content: "Variational Quantum Risk Model — Quantum AI Lab" },
      { property: "og:description", content: "A distinct quantum-finance experiment focused on variational optimization of a synthetic risk-return objective." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <LabShell crumb="Variational Risk">
      <div className="mb-8 max-w-3xl">
        <span className="font-mono text-xs text-primary">FINANCE / RESEARCH AREA 02</span>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Variational Quantum Risk Model</h1>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          Explore a hybrid variational workflow built around a financial risk-return objective. Tune circuit depth and risk aversion,
          run a seeded parameter optimization, inspect cost-function convergence, and compare the final variational risk estimate with a classical baseline.
        </p>
      </div>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-md border border-border bg-card" aria-label="Loading variational risk model" />}>
        <VariationalRiskLab />
      </Suspense>
    </LabShell>
  );
}
