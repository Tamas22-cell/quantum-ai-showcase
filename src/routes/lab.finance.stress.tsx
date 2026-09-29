import { lazy, Suspense } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

import { LabShell } from "@/components/lab/lab-shell";

const StressLab = lazy(() => import("@/components/lab/stress-lab").then((m) => ({ default: m.StressLab })));

export const Route = createFileRoute("/lab/finance/stress")({
  head: () => ({
    meta: [
      { title: "Quantum Portfolio Stress Lab — Quantum AI Lab" },
      { name: "description", content: "How does a QAOA-selected portfolio behave under market crash, inflation, rate-shock and crypto-drawdown regimes versus the original and a classical baseline? Synthetic data, simulated QAOA." },
      { property: "og:title", content: "Quantum Portfolio Stress Lab — Quantum AI Lab" },
      { property: "og:description", content: "Regime stress testing of original, classical mean-variance and QAOA-selected allocations: return, volatility, Sharpe, max drawdown and VaR." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <LabShell crumb="Finance / Stress">
      <Link to="/lab/finance" className="mb-6 inline-flex items-center gap-2 rounded-sm font-mono text-[11px] uppercase text-muted-foreground hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <ArrowLeft className="size-3.5" aria-hidden="true" /> Back to Quantum Finance Lab
      </Link>
      <div className="mb-8 max-w-3xl">
        <span className="font-mono text-xs text-primary">FINANCE / RESEARCH AREA 01</span>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Quantum Portfolio Stress Lab</h1>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          Research question: how does a QAOA-selected portfolio allocation behave under different market stress regimes compared with
          the original and a classical mean-variance allocation? Pick a portfolio, apply a regime, and compare the risk/return trade-off.
        </p>
      </div>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-md border border-border bg-card" aria-label="Loading stress lab" />}>
        <StressLab />
      </Suspense>
    </LabShell>
  );
}
