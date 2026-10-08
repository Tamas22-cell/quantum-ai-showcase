import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowDown, ArrowUpRight, BrainCircuit, FlaskConical } from "lucide-react";

import {
  ComputerVisionLab,
  ExplainableAiLab,
  MlOpsEvaluationLab,
  RagLab,
  ReinforcementLearningLab,
  TimeSeriesLab,
} from "@/components/lab/applied-ai-labs";
import { DeepLearningLab } from "@/components/lab/deep-learning-lab";
import { LabShell } from "@/components/lab/lab-shell";
import { SystemHealthPanel } from "@/components/lab/system-health-panel";
import { LAB_MODULES } from "@/components/lab/lab-modules";
import { MachineLearningLab } from "@/components/lab/machine-learning-lab";
import { MlModelComparison } from "@/components/lab/ml-model-comparison";
import { NlpLlmLab } from "@/components/lab/nlp-llm-lab";

export const Route = createFileRoute("/lab/")({
  head: () => ({
    meta: [
      { title: "Quantum & AI Research Lab — Quantum AI Lab" },
      { name: "description", content: "Interactive browser-based quantum computing and artificial intelligence laboratories, including machine learning, deep learning, LLM evaluation, RAG, computer vision, reinforcement learning, forecasting, explainability and MLOps." },
      { property: "og:title", content: "Quantum & AI Research Lab — Quantum AI Lab" },
      { property: "og:description", content: "Interactive quantum and AI experiments in one research dashboard." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LabDashboard,
});

const AI_LABS = [
  ["Machine Learning", "#ai-machine-learning"],
  ["Model Comparison", "#ai-model-comparison"],
  ["Deep Learning", "#ai-deep-learning"],
  ["NLP & LLM", "#ai-nlp-llm"],
  ["RAG", "#ai-rag"],
  ["Computer Vision", "#ai-computer-vision"],
  ["Reinforcement Learning", "#ai-reinforcement-learning"],
  ["Time-Series", "#ai-time-series"],
  ["Explainable AI", "#ai-explainable"],
  ["MLOps", "#ai-mlops"],
] as const;

function LabDashboard() {
  return (
    <LabShell>
      <div className="mb-10 max-w-3xl">
        <span className="inline-flex items-center gap-2 font-mono text-xs text-primary"><FlaskConical className="size-4" aria-hidden="true" />Quantum & AI Research Dashboard</span>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">Interactive laboratories</h1>
        <p className="mt-4 text-sm leading-7 text-muted-foreground">
          Browser-based research laboratories covering quantum computing and modern artificial intelligence. Quantum modules use ideal classical simulations unless explicitly marked otherwise; AI modules below are interactive browser-local educational experiments.
        </p>
      </div>

      <SystemHealthPanel />

      {(["core", "command"] as const).map((group) => (
        <section key={group} className="mb-12" aria-label={group === "core" ? "Core laboratories" : "Research Command Center"}>
          <h2 className="mb-5 font-mono text-xs uppercase tracking-wider text-primary">{group === "core" ? "Core laboratories" : "Research Command Center"}</h2>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {LAB_MODULES.filter((m) => m.group === group).map((m) => {
              const available = m.status === "available";
              const body = (
                <>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs text-muted-foreground">LAB / {m.index}</span>
                    <span className={`rounded-full border px-2 py-0.5 font-mono text-[9px] uppercase ${available ? "border-emerald/50 text-emerald" : "border-border-strong text-muted-foreground"}`}>
                      {available ? "Available" : "In development"}
                    </span>
                  </div>
                  <h2 className="mt-8 text-xl font-semibold tracking-tight">{m.title}</h2>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{m.summary}</p>
                  <div className="mt-auto flex flex-wrap gap-1.5 pt-6">
                    {m.topics.map((t) => <span key={t} className="rounded-sm border border-border bg-surface px-2 py-1 font-mono text-[9px] uppercase text-muted-foreground">{t}</span>)}
                  </div>
                  {available ? <span className="mt-5 inline-flex items-center gap-1 font-mono text-xs text-primary">Open lab <ArrowUpRight className="size-3.5" aria-hidden="true" /></span> : null}
                </>
              );
              return available && m.to ? (
                <Link key={m.id} to={m.to} className="card-interactive flex min-h-72 flex-col rounded-md border border-border bg-card p-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{body}</Link>
              ) : (
                <div key={m.id} aria-disabled="true" className="flex min-h-72 flex-col rounded-md border border-dashed border-border-strong bg-card/50 p-6 opacity-80">{body}</div>
              );
            })}
          </div>
        </section>
      ))}

      <section className="mb-8 rounded-md border border-primary/30 bg-primary/5 p-5 sm:p-6">
        <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.18em] text-primary"><BrainCircuit className="size-4" aria-hidden="true" />AI Research Labs</div>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">Interactive Artificial Intelligence</h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
          Choose a lab below. Every card is now clickable and jumps directly to the interactive controls for that experiment.
        </p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {AI_LABS.map(([title, href]) => (
            <a key={href} href={href} className="card-interactive flex items-center justify-between rounded-md border border-border bg-card p-4 font-mono text-xs font-semibold text-foreground hover:border-primary/50 hover:text-primary">
              <span>{title}</span>
              <ArrowDown className="size-4" aria-hidden="true" />
            </a>
          ))}
        </div>
      </section>

      <div className="space-y-8">
        <section id="ai-machine-learning" className="scroll-mt-24"><MachineLearningLab /></section>
        <section id="ai-model-comparison" className="scroll-mt-24"><MlModelComparison /></section>
        <section id="ai-deep-learning" className="scroll-mt-24"><DeepLearningLab /></section>
        <section id="ai-nlp-llm" className="scroll-mt-24"><NlpLlmLab /></section>
        <section id="ai-rag" className="scroll-mt-24"><RagLab /></section>
        <section id="ai-computer-vision" className="scroll-mt-24"><ComputerVisionLab /></section>
        <section id="ai-reinforcement-learning" className="scroll-mt-24"><ReinforcementLearningLab /></section>
        <section id="ai-time-series" className="scroll-mt-24"><TimeSeriesLab /></section>
        <section id="ai-explainable" className="scroll-mt-24"><ExplainableAiLab /></section>
        <section id="ai-mlops" className="scroll-mt-24"><MlOpsEvaluationLab /></section>
      </div>
    </LabShell>
  );
}
