import { createFileRoute } from "@tanstack/react-router";
import { ExplainableAiLab } from "@/components/lab/applied-ai-labs";
import { LabShell } from "@/components/lab/lab-shell";
export const Route = createFileRoute("/lab/ai/explainable-ai")({ head: () => ({ meta: [{ title: "Explainable AI Lab \u2014 Quantum AI Lab" }, { name: "description", content: "Interactive local explanations with transparent feature contributions and prediction-score changes." }, { property: "og:title", content: "Explainable AI Lab \u2014 Quantum AI Lab" }, { property: "og:description", content: "Interactive local explanations with transparent feature contributions and prediction-score changes." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }), component: Page });
function Page() {
  return (
    <LabShell crumb="Explainable AI">
      <div className="mb-8 max-w-3xl">
        <span className="font-mono text-xs text-primary">AI LAB / 08</span>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
          Explainable AI Lab
        </h1>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          Interactive local explanations with transparent feature contributions and prediction-score
          changes.
        </p>
      </div>
      <ExplainableAiLab />
    </LabShell>
  );
}
