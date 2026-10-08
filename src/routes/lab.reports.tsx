import { lazy, Suspense } from "react";
import { createFileRoute } from "@tanstack/react-router";

import { LabShell } from "@/components/lab/lab-shell";

const ReportGenerator = lazy(() =>
  import("@/components/lab/report-generator").then((m) => ({ default: m.ReportGenerator })),
);

export const Route = createFileRoute("/lab/reports")({
  head: () => ({
    meta: [
      { title: "Research Report Generator — Quantum AI Lab" },
      {
        name: "description",
        content:
          "Generate professional PDF research reports from seeded Quantum AI Lab experiments — entirely in your browser, with methodology, results, limitations and reproducibility settings.",
      },
      { property: "og:title", content: "Research Report Generator — Quantum AI Lab" },
      {
        property: "og:description",
        content:
          "Client-side PDF reports for circuit, entanglement, QAOA, VQE, portfolio, QML and Arena experiments. Simulation only — not quantum hardware.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <LabShell crumb="Reports">
      <div className="mb-8 max-w-3xl">
        <span className="font-mono text-xs text-primary">COMMAND CENTER / C5</span>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
          Research Report Generator
        </h1>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          Choose a lab, set its seeded parameters, and produce a downloadable PDF report. Every
          report states: ideal noiseless classical statevector simulation — not quantum hardware.
        </p>
      </div>
      <Suspense
        fallback={
          <div
            className="h-96 animate-pulse rounded-md border border-border bg-card"
            aria-label="Loading report generator"
          />
        }
      >
        <ReportGenerator />
      </Suspense>
    </LabShell>
  );
}
