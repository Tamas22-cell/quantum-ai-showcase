import { createFileRoute } from "@tanstack/react-router";
import { ReinforcementLearningLab } from "@/components/lab/applied-ai-labs";
import { LabShell } from "@/components/lab/lab-shell";
export const Route = createFileRoute("/lab/ai/reinforcement-learning")({ head: () => ({ meta: [{ title: "Reinforcement Learning Lab \u2014 Quantum AI Lab" }, { name: "description", content: "Interactive Q-learning controls for exploration, discounting, reward and training progress." }, { property: "og:title", content: "Reinforcement Learning Lab \u2014 Quantum AI Lab" }, { property: "og:description", content: "Interactive Q-learning controls for exploration, discounting, reward and training progress." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }), component: Page });
function Page() {
  return (
    <LabShell crumb="Reinforcement Learning">
      <div className="mb-8 max-w-3xl">
        <span className="font-mono text-xs text-primary">AI LAB / 06</span>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
          Reinforcement Learning Lab
        </h1>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          Interactive Q-learning controls for exploration, discounting, reward and training
          progress.
        </p>
      </div>
      <ReinforcementLearningLab />
    </LabShell>
  );
}
