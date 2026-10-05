import { createFileRoute } from "@tanstack/react-router";
import { Atom, Beaker, CheckCircle2, Download, FlaskConical, Sigma } from "lucide-react";

import { LabShell } from "@/components/lab/lab-shell";

export const Route = createFileRoute("/lab/vqe-molecular-chemistry")({
  head: () => ({
    meta: [
      { title: "VQE Molecular Chemistry Lab — Quantum AI Lab" },
      {
        name: "description",
        content:
          "Ab initio H2 molecular chemistry experiment using VQE, STO-3G, Hartree-Fock initialization, excitation-based ansatz and exact diagonalization reference.",
      },
      { property: "og:title", content: "VQE Molecular Chemistry Lab — Quantum AI Lab" },
      {
        property: "og:description",
        content: "Imported H2 ab initio VQE research result with bond-length optimisation and exact-energy comparison.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: VqeMolecularChemistryPage,
});

const result = {
  molecule: "H₂",
  method: "Ab Initio VQE",
  basis: "STO-3G",
  equilibrium: 0.7364,
  referenceBond: 0.7414,
  vqeEnergy: -1.127951287,
  exactEnergy: -1.137304145,
  error: 0.0093528581,
};

const features = [
  "Molecular Hamiltonian generation",
  "Hartree-Fock initial state",
  "Single and double excitations",
  "Variational Quantum Eigensolver",
  "Exact diagonalization reference",
  "Potential energy curve",
  "Bond-length scan",
  "VQE error analysis",
];

function MetricCard({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="rounded-md border border-border bg-card p-5">
      <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{label}</div>
      <div className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{value}</div>
      {note ? <div className="mt-2 text-xs leading-5 text-muted-foreground">{note}</div> : null}
    </div>
  );
}

function VqeMolecularChemistryPage() {
  const energyGapPct = Math.abs(result.error / result.exactEnergy) * 100;
  const bondDelta = Math.abs(result.equilibrium - result.referenceBond);

  return (
    <LabShell crumb="VQE Molecular Chemistry">
      <div className="mb-8 max-w-4xl">
        <span className="inline-flex items-center gap-2 font-mono text-xs text-primary">
          <FlaskConical className="size-4" aria-hidden="true" /> LAB / 07
        </span>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">VQE Molecular Chemistry Lab</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
          H₂ ab initio quantum-chemistry workflow using a molecular Hamiltonian, STO-3G basis, Hartree-Fock reference state,
          excitation-based variational ansatz and an exact diagonalisation benchmark. The values below are imported from the
          completed local Python research run.
        </p>
      </div>

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4" aria-label="VQE molecular chemistry summary">
        <MetricCard label="Molecule" value={result.molecule} note="Hydrogen molecule" />
        <MetricCard label="Method" value={result.method} note={`Basis: ${result.basis}`} />
        <MetricCard label="VQE bond length" value={`${result.equilibrium.toFixed(4)} Å`} note={`Reference: ${result.referenceBond.toFixed(4)} Å`} />
        <MetricCard label="Absolute energy error" value={`${result.error.toFixed(6)} Ha`} note={`${energyGapPct.toFixed(3)}% of |exact energy|`} />
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-md border border-border bg-card p-6">
          <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.16em] text-primary">
            <Atom className="size-4" aria-hidden="true" /> H₂ molecular result
          </div>

          <div className="mt-6 flex items-center justify-center gap-10 py-8">
            <div className="flex size-20 items-center justify-center rounded-full border border-primary/50 bg-primary/10 text-2xl font-semibold">H</div>
            <div className="relative h-px w-36 bg-border-strong">
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-border bg-background px-3 py-1 font-mono text-[10px] text-primary">
                {result.equilibrium.toFixed(4)} Å
              </div>
            </div>
            <div className="flex size-20 items-center justify-center rounded-full border border-primary/50 bg-primary/10 text-2xl font-semibold">H</div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-md border border-border bg-surface p-4">
              <div className="font-mono text-[10px] uppercase text-muted-foreground">Minimum VQE energy</div>
              <div className="mt-2 font-mono text-lg text-foreground">{result.vqeEnergy.toFixed(10)} Ha</div>
            </div>
            <div className="rounded-md border border-border bg-surface p-4">
              <div className="font-mono text-[10px] uppercase text-muted-foreground">Exact energy at minimum</div>
              <div className="mt-2 font-mono text-lg text-foreground">{result.exactEnergy.toFixed(10)} Ha</div>
            </div>
          </div>

          <div className="mt-4 rounded-md border border-border bg-surface p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="font-mono text-[10px] uppercase text-muted-foreground">Bond-length deviation from reference</div>
                <div className="mt-1 font-mono text-base text-foreground">{bondDelta.toFixed(4)} Å</div>
              </div>
              <CheckCircle2 className="size-6 text-emerald" aria-hidden="true" />
            </div>
          </div>
        </div>

        <div className="rounded-md border border-border bg-card p-6">
          <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.16em] text-primary">
            <Sigma className="size-4" aria-hidden="true" /> Workflow
          </div>

          <div className="mt-5 space-y-3">
            {[
              ["01", "Molecular geometry", "H₂ nuclear coordinates and bond length"],
              ["02", "Hamiltonian", "Ab initio molecular Hamiltonian in STO-3G"],
              ["03", "Reference state", "Hartree-Fock occupation state"],
              ["04", "Ansatz", "Single and double fermionic excitations"],
              ["05", "VQE optimisation", "Classical optimisation of variational parameters"],
              ["06", "Validation", "Exact diagonalisation and error analysis"],
            ].map(([index, title, description]) => (
              <div key={index} className="flex gap-4 rounded-md border border-border bg-surface p-4">
                <span className="font-mono text-xs text-primary">{index}</span>
                <div>
                  <div className="text-sm font-semibold text-foreground">{title}</div>
                  <div className="mt-1 text-xs leading-5 text-muted-foreground">{description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-md border border-border bg-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.16em] text-primary">
              <Beaker className="size-4" aria-hidden="true" /> Completed research features
            </div>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              The local Python workflow produced the bond-length optimisation and VQE/exact comparison. The website displays the exported result snapshot without claiming a live quantum-hardware run.
            </p>
          </div>
          <a
            href="/vqe_results.json"
            download
            className="inline-flex items-center gap-2 rounded-md border border-primary/40 bg-primary/10 px-4 py-2 font-mono text-xs text-primary transition hover:bg-primary/15"
          >
            <Download className="size-4" aria-hidden="true" /> Download result JSON
          </a>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <div key={feature} className="rounded-md border border-border bg-surface p-4 text-sm text-foreground">
              <CheckCircle2 className="mb-2 size-4 text-emerald" aria-hidden="true" />
              {feature}
            </div>
          ))}
        </div>
      </section>
    </LabShell>
  );
}
