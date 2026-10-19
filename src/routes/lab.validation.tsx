import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight, Beaker, ClipboardCheck, FileText, Github, ShieldCheck } from "lucide-react";
import { LabShell } from "@/components/lab/lab-shell";

export const Route = createFileRoute("/lab/validation")({
  head: () => ({
    meta: [
      { title: "Research Validation Center — Quantum AI Lab" },
      { name: "description", content: "Evidence-focused guide to reproducible quantum experiments, benchmark references, automated tests and research limitations." },
      { property: "og:title", content: "Research Validation Center — Quantum AI Lab" },
      { property: "og:type", content: "website" },
    ],
  }),
  component: ResearchValidationCenter,
});

const repository = "https://github.com/Tamas22-cell/quantum-ai-showcase";
const modules = [
  {
    title: "Quantum vs Classical Arena",
    href: "/lab/arena" as const,
    subject: "Weighted Max-Cut; exact, greedy, annealing, random and simulated QAOA comparisons",
    evidence: "Seeded configurations, algorithm evaluation histories and exportable run results",
    caution: "Simulated QAOA is not proof of quantum advantage; inspect matched evaluation budgets.",
    source: "src/lib/quantum/arena.test.ts",
  },
  {
    title: "QAOA Optimization",
    href: "/lab/qaoa" as const,
    subject: "Max-Cut optimisation with a classical reference",
    evidence: "Fixed graph presets, seeded optimisation and expected-cost metrics",
    caution: "Simulator output; performance depends on settings and instance size.",
    source: "src/lib/quantum/benchmark.ts",
  },
  {
    title: "VQE Research",
    href: "/lab/vqe" as const,
    subject: "Ground-state energy estimation",
    evidence: "Energy error compared with an exact eigenvalue reference",
    caution: "Simulation results are not hardware measurements.",
    source: "src/components/lab/vqe-lab.tsx",
  },
  {
    title: "Quantum Portfolio",
    href: "/lab/portfolio" as const,
    subject: "Binary asset selection and QUBO modelling",
    evidence: "Classical comparison and controlled synthetic inputs",
    caution: "Illustrative experiments do not establish financial performance.",
    source: "src/routes/lab.portfolio.tsx",
  },
];

function ResearchValidationCenter() {
  return (
    <LabShell crumb="Validation">
      <div className="max-w-4xl">
        <span className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-primary">
          <ShieldCheck className="size-4" aria-hidden="true" /> Research integrity
        </span>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Research Validation Center</h1>
        <p className="mt-4 text-sm leading-7 text-muted-foreground">
          An evidence directory for the existing Quantum AI Lab experiments. Each entry identifies
          what can be inspected, the comparison reference, and important limitations. Links to
          source files are evidence pointers, not claims that tests have passed in this session.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link to="/lab/benchmark" className="inline-flex items-center gap-2 rounded-md border border-primary/40 px-4 py-2 text-sm text-primary hover:bg-surface">
            <Beaker className="size-4" aria-hidden="true" /> Benchmark dashboard
          </Link>
          <Link to="/lab/history" className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm hover:bg-surface">
            Experiment history
          </Link>
          <Link to="/lab/reports" className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm hover:bg-surface">
            <FileText className="size-4" aria-hidden="true" /> Research reports
          </Link>
        </div>
      </div>

      <section className="mt-8 grid gap-4 md:grid-cols-2" aria-label="Research modules and evidence">
        {modules.map((module) => (
          <article key={module.title} className="min-w-0 rounded-md border border-border bg-card p-5">
            <div className="flex items-start gap-3">
              <ClipboardCheck className="mt-1 size-5 shrink-0 text-primary" aria-hidden="true" />
              <div className="min-w-0">
                <h2 className="text-lg font-semibold">{module.title}</h2>
                <p className="mt-1 text-xs text-muted-foreground">{module.subject}</p>
              </div>
            </div>
            <dl className="mt-5 space-y-4 text-sm">
              <div>
                <dt className="font-mono text-xs uppercase text-primary">Inspectible evidence</dt>
                <dd className="mt-1 leading-6 text-muted-foreground">{module.evidence}</dd>
              </div>
              <div>
                <dt className="font-mono text-xs uppercase text-amber">Limitation</dt>
                <dd className="mt-1 leading-6 text-muted-foreground">{module.caution}</dd>
              </div>
            </dl>
            <div className="mt-5 flex flex-wrap gap-4 border-t border-border pt-4 font-mono text-xs">
              <Link to={module.href} className="inline-flex items-center gap-1 text-primary hover:underline">
                Open experiment <ArrowUpRight className="size-3" aria-hidden="true" />
              </Link>
              <a href={repository + "/blob/main/" + module.source} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground">
                <Github className="size-3" aria-hidden="true" /> View source
              </a>
            </div>
          </article>
        ))}
      </section>

      <section className="mt-8 rounded-md border border-border bg-card p-5">
        <h2 className="text-lg font-semibold">What counts as validation?</h2>
        <p className="mt-2 text-sm leading-7 text-muted-foreground">
          Reproduce an experiment with recorded parameters and seed; compare its results with an
          appropriate classical or exact reference; inspect tests and export a report. This page
          does not show fabricated pass counts, live CI status, hardware results, or a combined
          score across incompatible experiments.
        </p>
        <a href={repository + "/actions"} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-2 font-mono text-xs text-primary hover:underline">
          View actual GitHub Actions runs <ArrowUpRight className="size-3.5" aria-hidden="true" />
        </a>
      </section>
    </LabShell>
  );
}
