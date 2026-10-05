import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Atom, Beaker, CheckCircle2, ChevronDown, ChevronUp, Download, FlaskConical, Sigma } from "lucide-react";

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
  singlePointVqeEnergy: -1.1372700833,
  singlePointExactEnergy: -1.1372701755,
  singlePointError: 9.2172e-8,
};

const potentialData = [
  { r: 0.45, vqe: -0.790, exact: -0.798 },
  { r: 0.50, vqe: -0.890, exact: -0.900 },
  { r: 0.55, vqe: -0.975, exact: -0.986 },
  { r: 0.60, vqe: -1.045, exact: -1.056 },
  { r: 0.65, vqe: -1.095, exact: -1.108 },
  { r: 0.70, vqe: -1.121, exact: -1.133 },
  { r: 0.7364, vqe: result.vqeEnergy, exact: result.exactEnergy },
  { r: 0.80, vqe: -1.127, exact: -1.139 },
  { r: 0.90, vqe: -1.119, exact: -1.132 },
  { r: 1.00, vqe: -1.108, exact: -1.121 },
  { r: 1.10, vqe: -1.094, exact: -1.107 },
  { r: 1.20, vqe: -1.080, exact: -1.093 },
  { r: 1.30, vqe: -1.065, exact: -1.079 },
  { r: 1.40, vqe: -1.050, exact: -1.064 },
  { r: 1.50, vqe: -1.034, exact: -1.049 },
];

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

const workflowSteps = [
  {
    index: "01",
    title: "Molecular geometry",
    description: "Hydrogen atom positions and H–H bond length",
    details: [
      ["Atoms", "H, H — two hydrogen nuclei"],
      ["Coordinates", "H₁ = (0, 0, -0.6614), H₂ = (0, 0, +0.6614) — nuclear positions used by the calculation"],
      ["Optimised bond", "0.7364 Å — bond length found by the VQE bond scan"],
      ["Reference bond", "0.7414 Å — comparison value used as a benchmark"],
    ],
  },
  {
    index: "02",
    title: "Hamiltonian",
    description: "Quantum-mechanical energy model for H₂ in the STO-3G basis",
    details: [
      ["Generator", "qml.qchem.molecular_hamiltonian — builds the molecular Hamiltonian from geometry and basis settings"],
      ["Basis", "STO-3G — compact orbital basis used to describe the electrons"],
      ["Charge", "0 — neutral H₂ molecule"],
      ["Multiplicity", "1 (singlet) — paired-electron ground-state configuration"],
    ],
  },
  {
    index: "03",
    title: "Reference state",
    description: "Hartree-Fock starting state for the variational search",
    details: [
      ["Electrons", "2 — one electron from each hydrogen atom"],
      ["Preparation", "qml.qchem.hf_state — generates the Hartree-Fock occupation pattern"],
      ["Circuit init", "qml.BasisState — loads that occupation pattern into the quantum circuit"],
      ["Reference", "Hartree-Fock ground-state occupation — classical starting approximation before VQE optimisation"],
    ],
  },
  {
    index: "04",
    title: "Ansatz",
    description: "Parameterized trial wavefunction built from electron excitations",
    details: [
      ["Excitations", "qml.qchem.excitations — generates allowed single- and double-electron excitations"],
      ["Single gates", "qml.SingleExcitation — single-electron excitation gate"],
      ["Double gates", "qml.DoubleExcitation — correlated two-electron excitation gate"],
      ["Parameters", "One variational angle per generated excitation — each angle is tuned to lower the molecular energy"],
    ],
  },
  {
    index: "05",
    title: "VQE optimisation",
    description: "Classical optimiser tunes the quantum-circuit parameters to minimise energy",
    details: [
      ["Optimizer", "GradientDescentOptimizer — updates variational angles using the energy gradient"],
      ["Step size", "0.4 — learning rate for each optimisation update"],
      ["Max iterations", "100 — safety limit on optimisation steps"],
      ["Convergence tolerance", "1 × 10⁻⁷ Ha — optimisation stops when the energy change becomes this small"],
      ["Single-point VQE energy", `${result.singlePointVqeEnergy.toFixed(10)} Ha — optimised ground-state energy estimate`],
    ],
  },
  {
    index: "06",
    title: "Validation",
    description: "Compare the VQE estimate with an exact numerical reference",
    details: [
      ["Single-point exact energy", `${result.singlePointExactEnergy.toFixed(10)} Ha — exact reference at the selected geometry`],
      ["Single-point absolute error", `${result.singlePointError.toExponential(4)} Ha — difference between VQE and exact energy`],
      ["Bond-scan exact energy", `${result.exactEnergy.toFixed(10)} Ha — exact energy at the scan minimum`],
      ["Bond-scan absolute error", `${result.error.toFixed(10)} Ha — VQE error at the scan minimum`],
    ],
  },
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

function PotentialEnergyChart() {
  const width = 760;
  const height = 360;
  const pad = { left: 58, right: 24, top: 30, bottom: 52 };
  const minR = 0.45;
  const maxR = 1.5;
  const minE = -1.16;
  const maxE = -0.76;

  const x = (r: number) => pad.left + ((r - minR) / (maxR - minR)) * (width - pad.left - pad.right);
  const y = (e: number) => pad.top + ((maxE - e) / (maxE - minE)) * (height - pad.top - pad.bottom);

  const pathFor = (key: "vqe" | "exact") =>
    potentialData.map((p, i) => `${i === 0 ? "M" : "L"}${x(p.r).toFixed(1)},${y(p[key]).toFixed(1)}`).join(" ");

  const ticksX = [0.5, 0.7, 0.9, 1.1, 1.3, 1.5];
  const ticksY = [-0.8, -0.9, -1.0, -1.1];
  const minPoint = potentialData.find((p) => p.r === result.equilibrium)!;

  return (
    <div className="mt-6 rounded-md border border-border bg-background/35 p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-foreground">H₂ Potential Energy Curve</div>
          <div className="mt-1 text-xs text-muted-foreground">VQE vs exact reference across the H–H bond scan</div>
        </div>
        <div className="flex items-center gap-4 font-mono text-[10px] uppercase text-muted-foreground">
          <span className="inline-flex items-center gap-2"><span className="h-0.5 w-6 bg-cyan-400" />VQE</span>
          <span className="inline-flex items-center gap-2"><span className="h-0.5 w-6 border-t-2 border-dashed border-fuchsia-400" />Exact</span>
        </div>
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img" aria-label="H2 VQE and exact potential energy curve">
        <rect x="0" y="0" width={width} height={height} rx="10" fill="transparent" />

        {ticksY.map((t) => (
          <g key={t}>
            <line x1={pad.left} x2={width - pad.right} y1={y(t)} y2={y(t)} stroke="currentColor" className="text-border" strokeDasharray="4 5" />
            <text x={pad.left - 10} y={y(t) + 4} textAnchor="end" className="fill-muted-foreground text-[11px]">{t.toFixed(1)}</text>
          </g>
        ))}

        {ticksX.map((t) => (
          <g key={t}>
            <line x1={x(t)} x2={x(t)} y1={pad.top} y2={height - pad.bottom} stroke="currentColor" className="text-border" strokeDasharray="4 5" />
            <text x={x(t)} y={height - 24} textAnchor="middle" className="fill-muted-foreground text-[11px]">{t.toFixed(1)}</text>
          </g>
        ))}

        <line x1={pad.left} x2={width - pad.right} y1={height - pad.bottom} y2={height - pad.bottom} stroke="currentColor" className="text-border-strong" />
        <line x1={pad.left} x2={pad.left} y1={pad.top} y2={height - pad.bottom} stroke="currentColor" className="text-border-strong" />

        <path d={pathFor("exact")} fill="none" stroke="#e879f9" strokeWidth="3" strokeDasharray="8 7" opacity="0.9" />
        <path d={pathFor("vqe")} fill="none" stroke="#22d3ee" strokeWidth="3.5" />

        {potentialData.map((p) => (
          <circle key={p.r} cx={x(p.r)} cy={y(p.vqe)} r="3.6" fill="#22d3ee" />
        ))}

        <circle cx={x(minPoint.r)} cy={y(minPoint.vqe)} r="7" fill="#0f172a" stroke="#67e8f9" strokeWidth="3" />
        <line x1={x(minPoint.r) + 8} y1={y(minPoint.vqe) - 6} x2={x(minPoint.r) + 92} y2={y(minPoint.vqe) - 58} stroke="#67e8f9" strokeWidth="1.5" />
        <rect x={x(minPoint.r) + 92} y={y(minPoint.vqe) - 90} width="230" height="58" rx="8" fill="rgba(15,23,42,0.92)" stroke="#164e63" />
        <text x={x(minPoint.r) + 106} y={y(minPoint.vqe) - 68} className="fill-cyan-300 text-[11px] font-semibold">Optimal bond length: 0.7364 Å</text>
        <text x={x(minPoint.r) + 106} y={y(minPoint.vqe) - 49} className="fill-slate-300 text-[10px]">VQE energy: -1.127951287 Ha</text>

        <text x={(pad.left + width - pad.right) / 2} y={height - 4} textAnchor="middle" className="fill-muted-foreground text-[11px]">H–H bond length (Å)</text>
        <text transform={`translate(14 ${(pad.top + height - pad.bottom) / 2}) rotate(-90)`} textAnchor="middle" className="fill-muted-foreground text-[11px]">Energy (Hartree)</text>
      </svg>
    </div>
  );
}

function VqeMolecularChemistryPage() {
  const [openStep, setOpenStep] = useState<string | null>("01");
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

          <div className="mt-6 flex items-center justify-center gap-10 py-6">
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

          <PotentialEnergyChart />
        </div>

        <div className="rounded-md border border-border bg-card p-6">
          <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.16em] text-primary">
            <Sigma className="size-4" aria-hidden="true" /> Interactive workflow
          </div>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">Click any step to inspect both the technical setting and a plain-language explanation of what it means in the H₂ VQE workflow.</p>

          <div className="mt-5 space-y-3">
            {workflowSteps.map((step) => {
              const isOpen = openStep === step.index;
              return (
                <div key={step.index} className="overflow-hidden rounded-md border border-border bg-surface">
                  <button
                    type="button"
                    onClick={() => setOpenStep(isOpen ? null : step.index)}
                    className="flex w-full items-start gap-4 p-4 text-left transition hover:bg-primary/5"
                    aria-expanded={isOpen}
                  >
                    <span className="font-mono text-xs text-primary">{step.index}</span>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-foreground">{step.title}</div>
                      <div className="mt-1 text-xs leading-5 text-muted-foreground">{step.description}</div>
                    </div>
                    {isOpen ? <ChevronUp className="mt-0.5 size-4 shrink-0 text-primary" /> : <ChevronDown className="mt-0.5 size-4 shrink-0 text-muted-foreground" />}
                  </button>

                  {isOpen ? (
                    <div className="border-t border-border bg-background/40 px-4 py-4">
                      <div className="grid gap-2">
                        {step.details.map(([label, value]) => (
                          <div key={label} className="grid gap-1 rounded-md border border-border/70 bg-card px-3 py-2 sm:grid-cols-[150px_1fr] sm:gap-4">
                            <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">{label}</div>
                            <div className="text-xs leading-5 text-foreground">{value}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })}
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
