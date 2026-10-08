import { createFileRoute } from "@tanstack/react-router";

import { AiResearchHub } from "@/components/lab/ai-research-hub";
import { LabShell } from "@/components/lab/lab-shell";

export const Route = createFileRoute("/lab/ai/")({
  head: () => ({
    meta: [
      { title: "AI Research Lab — Quantum AI Lab" },
      {
        name: "description",
        content:
          "Dedicated AI research area covering machine learning, deep learning, LLMs, RAG, multi-agent systems, computer vision, reinforcement learning, forecasting, explainability and MLOps.",
      },
      { property: "og:title", content: "AI Research Lab — Quantum AI Lab" },
      {
        property: "og:description",
        content:
          "Machine learning, LLMs, agents and applied AI research in a dedicated lab separated from the quantum research modules.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <LabShell crumb="AI Research">
      <div className="mb-8 max-w-3xl">
        <span className="font-mono text-xs text-primary">LAB / AI</span>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">AI Research Lab</h1>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          A dedicated artificial-intelligence research area for machine learning, deep learning,
          language models, RAG, multi-agent systems, time-series modelling, explainability and
          production AI engineering. Quantum research remains in its own separate lab modules.
        </p>
      </div>
      <AiResearchHub />
    </LabShell>
  );
}
