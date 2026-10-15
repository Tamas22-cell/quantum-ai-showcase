import { createFileRoute } from "@tanstack/react-router";
import { RagLab } from "@/components/lab/applied-ai-labs";
import { LabShell } from "@/components/lab/lab-shell";
export const Route = createFileRoute("/lab/ai/rag")({ head: () => ({ meta: [{ title: "Retrieval-Augmented Generation Lab \u2014 Quantum AI Lab" }, { name: "description", content: "Transparent chunk retrieval, ranking and grounding experiments with visible source evidence." }, { property: "og:title", content: "Retrieval-Augmented Generation Lab \u2014 Quantum AI Lab" }, { property: "og:description", content: "Transparent chunk retrieval, ranking and grounding experiments with visible source evidence." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" }] }), component: Page });
function Page() {
  return (
    <LabShell crumb="RAG">
      <div className="mb-8 max-w-3xl">
        <span className="font-mono text-xs text-primary">AI LAB / 04</span>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
          Retrieval-Augmented Generation Lab
        </h1>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          Transparent chunk retrieval, ranking and grounding experiments with visible source
          evidence.
        </p>
      </div>
      <RagLab />
    </LabShell>
  );
}
