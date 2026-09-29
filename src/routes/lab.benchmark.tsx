import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight, BarChart3, CheckCircle2, Gauge, Layers3, Repeat2 } from "lucide-react";

import { LabShell } from "@/components/lab/lab-shell";

export const Route = createFileRoute("/lab/benchmark")({
  head: () => ({
    meta: [
      { title: "Quantum Benchmark Dashboard — Quantum AI Lab" },
      { name: "description", content: "Research benchmark overview for QAOA, VQE, portfolio optimisation and quantum-vs-classical experiments." },
      { property: "og:title", content: "Quantum Benchmark Dashboard — Quantum AI Lab" },
      { property: "og:description", content: "Compare benchmark scope, classical references and reproducibility across the interactive Quantum AI Lab." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: BenchmarkDashboard,
});

type BenchmarkRow = {
  name: string;
  to: "/lab/qaoa" | "/lab/vqe" | "/lab/portfolio" | "/lab/arena";
  problem: string;
  primaryMetric: string;
  classicalReference: string;
  reproducibility: string;
};

const benchmarks: BenchmarkRow[] = [
  {
    name: "QAOA Optimization Lab",
    to: "/lab/qaoa",
    problem: "Weighted Max-Cut",
    primaryMetric: "Expected cost / approximation quality",
    classicalReference: "Exact exhaustive optimum",
    reproducibility: "Seeded optimiser + fixed graph presets",
  },
  {
    name: "VQE Research Lab",
    to: "/lab/vqe",
    problem: "Ground-state energy estimation",
    primaryMetric: "Energy error vs exact diagonalisation",
    classicalReference: "Exact eigenvalue reference",
    reproducibility: "Explicit Hamiltonian + deterministic settings",
  },
  {
    name: "Quantum Portfolio Optimizer",
    to: "/lab/portfolio",
    problem: "Binary asset selection / QUBO",
    primaryMetric: "Objective value, risk-return trade-off",
    classicalReference: "Exhaustive / classical comparison",
    reproducibility: "Synthetic labelled data + controlled inputs",
  },
  {
    name: "Quantum vs Classical Arena",
    to: "/lab/arena",
    problem: "Shared Max-Cut benchmark instances",
    primaryMetric: "Solution quality and simulation runtime",
    classicalReference: "Exact, greedy, annealing, random",
    reproducibility: "Single master seed + exportable results",
  },
];

const pillars = [
  {
    icon: Gauge,
    title: "Comparable metrics",
    text: "Each module exposes a measurable objective instead of a visual-only illustration.",
  },
  {
    icon: Repeat2,
    title: "Reproducibility",
    text: "Seeded or deterministic settings make repeated experiments inspectable.",
  },
  {
    icon: Layers3,
    title: "Classical baselines",
    text: "Quantum-simulation results are interpreted against explicit classical references.",
  },
  {
    icon: CheckCircle2,
    title: "No advantage claims",
    text: "Browser simulations are labelled as simulations and are not presented as quantum-hardware speedups.",
  },
];

function BenchmarkDashboard() {
  return (
    <LabShell crumb="Benchmark">
      <div className="mb-8 max-w-3xl">
        <span className="inline-flex items-center gap-2 font-mono text-xs text-primary">
          <BarChart3 className="size-4" aria-hidden="true" />
          COMMAND CENTER / C6
        </span>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Quantum Benchmark Dashboard</h1>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          A research overview of the benchmark logic used across the interactive lab. It connects QAOA, VQE, portfolio optimisation and the Quantum vs Classical Arena without inventing aggregate results. Open each lab to run the actual experiment and inspect its real outputs.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {pillars.map(({ icon: Icon, title, text }) => (
          <div key={title} className="rounded-md border border-border bg-card p-5">
            <Icon className="size-5 text-primary" aria-hidden="true" />
            <h2 className="mt-4 text-base font-semibold">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p>
          </div>
        ))}
      </div>

      <section className="mt-8 overflow-hidden rounded-md border border-border bg-card">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-lg font-semibold">Benchmark matrix</h2>
          <p className="mt-1 text-sm text-muted-foreground">What each live module measures and what it is compared against.</p>
        </div>

        <div className="divide-y divide-border">
          {benchmarks.map((row) => (
            <div key={row.name} className="grid gap-4 px-5 py-5 md:grid-cols-[1.2fr_1fr_1.2fr_1.2fr]">
              <div>
                <div className="font-medium">{row.name}</div>
                <div className="mt-1 text-xs text-muted-foreground">{row.problem}</div>
                <Link to={row.to} className="mt-3 inline-flex items-center gap-1 font-mono text-xs text-primary hover:underline">
                  Open lab <ArrowUpRight className="size-3.5" aria-hidden="true" />
                </Link>
              </div>
              <Metric label="Primary metric" value={row.primaryMetric} />
              <Metric label="Classical reference" value={row.classicalReference} />
              <Metric label="Reproducibility" value={row.reproducibility} />
            </div>
          ))}
        </div>
      </section>

      <section className="mt-8 rounded-md border border-border bg-card p-5">
        <h2 className="text-lg font-semibold">How to use this dashboard</h2>
        <p className="mt-2 max-w-4xl text-sm leading-7 text-muted-foreground">
          Use this page as the research index. Choose a benchmark, open the corresponding lab, run the experiment with controlled parameters, then compare the quantum-simulation result against the stated classical reference. The dashboard intentionally avoids fabricated cross-lab scores because the modules solve different optimisation and estimation problems.
        </p>
      </section>
    </LabShell>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm leading-6">{value}</div>
    </div>
  );
}
