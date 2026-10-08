import { createFileRoute } from "@tanstack/react-router";

import { LabShell } from "@/components/lab/lab-shell";
import { MachineLearningLab } from "@/components/lab/machine-learning-lab";
import { MlModelComparison } from "@/components/lab/ml-model-comparison";

export const Route = createFileRoute("/lab/ai/machine-learning")({
  head: () => ({
    meta: [
      { title: "Machine Learning Lab — Quantum AI Lab" },
      {
        name: "description",
        content:
          "Interactive classical machine-learning lab with synthetic datasets, train/test evaluation, logistic regression, linear regression, k-NN and decision-tree model comparison.",
      },
      { property: "og:title", content: "Machine Learning Lab — Quantum AI Lab" },
      {
        property: "og:description",
        content:
          "Reproducible browser-based classification, regression and model-comparison experiments with held-out metrics.",
      },
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
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
          Machine Learning Lab
        </h1>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          Run reproducible classical machine-learning experiments directly in the browser. Compare
          binary classification and regression, tune dataset and training parameters, inspect
          held-out metrics and learned coefficients, then benchmark Logistic Regression, k-NN and
          Decision Tree models on the same data split.
        </p>
      </div>
      <div className="space-y-6">
        <MachineLearningLab />
        <MlModelComparison />
      </div>
    </LabShell>
  );
}
