import { lazy, Suspense } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";

import { LabShell } from "@/components/lab/lab-shell";

const FinanceLab = lazy(() => import("@/components/lab/finance-lab").then((m) => ({ default: m.FinanceLab })));

export const Route = createFileRoute("/lab/finance/")({
  head: () => ({
    meta: [
      { title: "Live Quantum Finance Lab — Quantum AI Lab" },
      { name: "description", content: "Synthetic (seeded), CSV or optional live price data feeding returns, covariance and correlation into a QUBO portfolio model solved with simulated QAOA and classical baselines." },
      { property: "og:title", content: "Live Quantum Finance Lab — Quantum AI Lab" },
      { property: "og:description", content: "Market-data pipeline + simulated QAOA portfolio selection with equal-weight, minimum-variance and exhaustive baselines. Not financial advice." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <LabShell crumb="Finance">
      <div className="mb-8 max-w-3xl">
        <span className="font-mono text-xs text-primary">COMMAND / C4</span>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Live Quantum Finance Lab</h1>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          Load prices (seeded synthetic data, your own CSV, or an optional live provider), compute returns, covariance and correlation,
          then select a portfolio with the same QUBO/QAOA engine as the Portfolio Optimizer — side by side with classical baselines.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link to="/lab/finance/stress" className="inline-flex items-center gap-2 rounded-sm border border-primary/50 bg-signal-soft px-3 py-2 font-mono text-[11px] uppercase text-primary hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            01 · Quantum Portfolio Stress Lab →
          </Link>
          <Link to="/lab/finance/variational-risk" className="inline-flex items-center gap-2 rounded-sm border border-primary/50 bg-signal-soft px-3 py-2 font-mono text-[11px] uppercase text-primary hover:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            02 · Variational Quantum Risk Model →
          </Link>
        </div>
      </div>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-md border border-border bg-card" aria-label="Loading finance lab" />}>
        <FinanceLab />
      </Suspense>
    </LabShell>
  );
}
