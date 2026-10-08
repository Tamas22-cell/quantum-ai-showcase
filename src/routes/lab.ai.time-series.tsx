import { createFileRoute } from "@tanstack/react-router";
import { TimeSeriesLab } from "@/components/lab/applied-ai-labs";
import { LabShell } from "@/components/lab/lab-shell";
export const Route = createFileRoute("/lab/ai/time-series")({ component: Page });
function Page() {
  return (
    <LabShell crumb="Time-Series">
      <div className="mb-8 max-w-3xl">
        <span className="font-mono text-xs text-primary">AI LAB / 07</span>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
          Time-Series & Forecasting Lab
        </h1>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          Walk-forward style forecasting baseline with tunable windows, synthetic trend and error
          metrics.
        </p>
      </div>
      <TimeSeriesLab />
    </LabShell>
  );
}
