import { createFileRoute } from "@tanstack/react-router";

import { LabShell } from "@/components/lab/lab-shell";
import { QuantumMarketRegimeLab } from "@/components/lab/quantum-market-regime-lab";

export const Route = createFileRoute("/lab/finance/quantum-market-regime")({
  head: () => ({
    meta: [
      { title: "Quantum Market Regime Classifier — Quantum AI Lab" },
      {
        name: "description",
        content:
          "Quantum machine learning research project for classifying synthetic financial market regimes with a variational classifier and classical baseline.",
      },
      { property: "og:title", content: "Quantum Market Regime Classifier — Quantum AI Lab" },
      {
        property: "og:description",
        content:
          "A distinct QML finance experiment with feature maps, training loss, regime probabilities and confusion matrix.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <LabShell crumb="QML Market Regime">
      <div className="mb-8 max-w-3xl">
        <span className="font-mono text-xs text-primary">FINANCE / RESEARCH AREA 03</span>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
          Quantum Market Regime Classifier
        </h1>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          Train a simulated variational classifier on synthetic financial features to identify
          risk-on, neutral and risk-off regimes, then compare its seeded test accuracy against a
          classical baseline.
        </p>
      </div>
      <QuantumMarketRegimeLab />
    </LabShell>
  );
}
