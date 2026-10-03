import { createFileRoute } from "@tanstack/react-router";

import { LabShell } from "@/components/lab/lab-shell";
import { MachineLearningLab } from "@/components/lab/machine-learning-lab";

export const Route = createFileRoute("/lab/ai/machine-learning")({
  head: () => ({
    meta: [
      { title: "Machine Learning Lab — Quantum AI Lab" },
      { name: "description", content: "Interactive classical machine-learning lab with synthetic datasets, train/test evaluation, logistic regression, linear regression and transparent metrics." },
      { property: "og:title", content: "Machine Learning Lab — Quantum AI Lab" },
      { property: "og:description", content: "Reproducible browser-based classification and regression experiments with held-out metrics and model parameters." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <LabShell crumb="Machine Learning">
      <div className="mb-8 max-w-3xl">
        <span className="font-mono text-xs text-primary">AI LAB / 01</span>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Machine Learning Lab</h1>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          Run reproducible classical machine-learning experiments directly in the browser. Compare binary classification and regression, tune dataset and training parameters,
          and inspect held-out metrics, confusion matrices and learned model coefficients.
        </p>
      </div>
      <MachineLearningLab />
    </LabShell>
  );
}
