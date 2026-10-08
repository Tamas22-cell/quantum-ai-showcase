import { createFileRoute } from "@tanstack/react-router";
import { MlOpsEvaluationLab } from "@/components/lab/applied-ai-labs";
import { LabShell } from "@/components/lab/lab-shell";
export const Route = createFileRoute("/lab/ai/mlops-evaluation")({ component: Page });
function Page() {
  return (
    <LabShell crumb="MLOps & Evaluation">
      <div className="mb-8 max-w-3xl">
        <span className="font-mono text-xs text-primary">AI LAB / 09</span>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
          MLOps & AI Evaluation Lab
        </h1>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          Versioned model and dataset evaluation with quality gates and reproducible experiment
          records.
        </p>
      </div>
      <MlOpsEvaluationLab />
    </LabShell>
  );
}
