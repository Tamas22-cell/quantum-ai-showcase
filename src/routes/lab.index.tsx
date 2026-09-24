import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight, FlaskConical } from "lucide-react";

import { LabShell } from "@/components/lab/lab-shell";
import { LAB_MODULES } from "@/components/lab/lab-modules";

export const Route = createFileRoute("/lab/")({
  head: () => ({
    meta: [
      { title: "Quantum Research Lab — Quantum AI Lab" },
      { name: "description", content: "Interactive, browser-based quantum computing laboratories: circuit simulation, entanglement, QAOA, VQE, portfolio optimisation and quantum ML." },
      { property: "og:title", content: "Quantum Research Lab — Quantum AI Lab" },
      { property: "og:description", content: "Mathematically exact statevector simulations for learning and research exploration." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: LabDashboard,
});

function LabDashboard() {
  return (
    <LabShell>
      <div className="mb-10 max-w-3xl">
        <span className="inline-flex items-center gap-2 font-mono text-xs text-primary"><FlaskConical className="size-4" aria-hidden="true" />Quantum Research Dashboard</span>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">Interactive laboratories</h1>
        <p className="mt-4 text-sm leading-7 text-muted-foreground">
          Six browser-based laboratories built on a shared, unit-tested statevector engine. All results are ideal classical simulations —
          they are not quantum hardware results and make no claim of quantum advantage. Modules are released one at a time as their calculations and tests are completed.
        </p>
      </div>
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {LAB_MODULES.map((m) => {
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
    </LabShell>
  );
}
