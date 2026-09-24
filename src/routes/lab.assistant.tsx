import { lazy, Suspense } from "react";
import { createFileRoute } from "@tanstack/react-router";

import { LabShell } from "@/components/lab/lab-shell";

const ResearchAssistant = lazy(() => import("@/components/lab/assistant").then((m) => ({ default: m.ResearchAssistant })));

export const Route = createFileRoute("/lab/assistant")({
  head: () => ({
    meta: [
      { title: "Quantum AI Research Assistant — Quantum AI Lab" },
      { name: "description", content: "Ask about QAOA, VQE, Max-Cut and statevectors; drafted circuits are validated before loading into the Circuit Builder." },
      { property: "og:title", content: "Quantum AI Research Assistant — Quantum AI Lab" },
      { property: "og:description", content: "AI explanations with strictly validated circuit proposals and clear provenance labels." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <LabShell crumb="AI Assistant">
      <div className="mb-8 max-w-3xl">
        <span className="font-mono text-xs text-primary">COMMAND / C2</span>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Quantum AI Research Assistant</h1>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          Explanations are generated text and may be wrong. Circuit proposals are never executed as code: they are parsed into a strict circuit format, checked for gates, qubits, parameters and depth, and only then simulated or loaded.
        </p>
      </div>
      <Suspense fallback={<div className="h-96 animate-pulse rounded-md border border-border bg-card" aria-label="Loading assistant" />}>
        <ResearchAssistant />
      </Suspense>
    </LabShell>
  );
}
