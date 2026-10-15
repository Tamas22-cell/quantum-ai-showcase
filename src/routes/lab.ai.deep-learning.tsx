import { createFileRoute } from "@tanstack/react-router";
import { DeepLearningLab } from "@/components/lab/applied-ai-labs";
import { LabShell } from "@/components/lab/lab-shell";
export const Route = createFileRoute("/lab/ai/deep-learning")({ head: () => ({ meta: [{ title: "Deep Learning Lab \u2014 Quantum AI Lab" }, { name: "description", content: "Interactive neural-network training diagnostics with architecture, optimization and regularization controls." }, { property: "og:title", content: "Deep Learning Lab \u2014 Quantum AI Lab" }, { property: "og:description", content: "Interactive neural-network training diagnostics with architecture, optimization and regularization controls." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }), component: Page });
function Page() {
  return (
    <LabShell crumb="Deep Learning">
      <div className="mb-8 max-w-3xl">
        <span className="font-mono text-xs text-primary">AI LAB / 02</span>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
          Deep Learning Lab
        </h1>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          Interactive neural-network training diagnostics with architecture, optimization and
          regularization controls.
        </p>
      </div>
      <DeepLearningLab />
    </LabShell>
  );
}
