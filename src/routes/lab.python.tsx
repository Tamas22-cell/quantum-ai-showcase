import { lazy, Suspense } from "react";
import { createFileRoute } from "@tanstack/react-router";

import { LabShell } from "@/components/lab/lab-shell";

// Heavy runtime code is isolated to this route and loaded lazily.
const PythonLab = lazy(() =>
  import("@/components/lab/python-lab").then((m) => ({ default: m.PythonLab })),
);

export const Route = createFileRoute("/lab/python")({
  head: () => ({
    meta: [
      { title: "Python Research Lab — Quantum AI Lab" },
      {
        name: "description",
        content:
          "Run real Python in your browser with Pyodide: quantitative finance, statistics and quantum/AI presets, saved to Experiment History.",
      },
      { property: "og:title", content: "Python Research Lab — Quantum AI Lab" },
      {
        property: "og:description",
        content:
          "Real CPython via WebAssembly, executed locally in the browser. No server, no paid service.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <LabShell crumb="Python">
      <div className="mb-8 max-w-3xl">
        <span className="font-mono text-xs text-primary">LAB / C10</span>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
          Python Research Lab
        </h1>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          Write and execute real Python directly in your browser. Start from a quantitative finance,
          statistics or quantum/AI preset, edit it, run it, and save the run to your Experiment
          History.
        </p>
      </div>
      <Suspense
        fallback={
          <div
            className="h-96 animate-pulse rounded-md border border-border bg-card"
            aria-label="Loading Python lab"
          />
        }
      >
        <PythonLab />
      </Suspense>
    </LabShell>
  );
}
