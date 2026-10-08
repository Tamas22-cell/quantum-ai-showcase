import { createFileRoute } from "@tanstack/react-router";

import { LabShell } from "@/components/lab/lab-shell";
import { MarketDataStructureLab } from "@/components/lab/market-data-structure-lab";

export const Route = createFileRoute("/lab/finance/market-data-structure")({
  head: () => ({
    meta: [
      { title: "Financial Market Data Structure Lab — Quantum AI Lab" },
      {
        name: "description",
        content:
          "Financial market data research project for returns, volatility, covariance, correlation, anomaly ranking and data stability diagnostics.",
      },
      { property: "og:title", content: "Financial Market Data Structure Lab — Quantum AI Lab" },
      {
        property: "og:description",
        content:
          "A distinct market-data research project that validates data structure before downstream quantum or classical modelling.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <LabShell crumb="Market Data Structure">
      <div className="mb-8 max-w-3xl">
        <span className="font-mono text-xs text-primary">FINANCE / RESEARCH AREA 04</span>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
          Financial Market Data Structure Lab
        </h1>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          Analyse the structure and stability of a multi-asset dataset before it feeds optimization
          or QML models. Inspect returns, volatility, correlations, anomalies and a reproducible
          data-stability score.
        </p>
      </div>
      <MarketDataStructureLab />
    </LabShell>
  );
}
