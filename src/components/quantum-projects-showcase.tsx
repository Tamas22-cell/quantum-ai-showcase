import { useState } from "react";
import { ArrowUpRight, Atom, Cpu, LineChart } from "lucide-react";

const owner = "https://github.com/Tamas22-cell/";
const groups = [
  { title: "Quantum Finance & Optimization", icon: LineChart, description: "Hybrid quantum-classical finance and optimization research.", projects: [
    ["Quantum Portfolio Optimizer", "Portfolio optimization with QUBO and QAOA research workflows.", "QuantumPortfolioOptimizer", "QAOA · QUBO · Python"],
    ["Quantum Finance Lab", "Quantitative finance experiments and hybrid quantum workflows.", "QuantumFinanceLab", "Quantum finance · Qiskit"],
    ["Quantum Auto-Tuning", "Automated tuning experiments for quantum systems.", "quantum-auto-tuning", "Optimization · Python"],
  ] },
  { title: "Quantum Computing & Engineering", icon: Cpu, description: "Circuit engineering, noise studies, and quantum error correction.", projects: [
    ["Production Quantum Engineering Lab", "Bell and GHZ circuits, validation and automated tests.", "production-quantum-engineering-lab", "Qiskit · Python · Testing"],
    ["Quantum Hardware & Noise Simulation Lab", "Experiments investigating quantum hardware noise and coherence.", "quantum-hardware-noise-lab", "Noise · Simulation"],
    ["Quantum Error Correction Lab", "Exploration of quantum error correction and syndrome extraction.", "quantum-error-correction-lab", "Error correction · Circuits"],
  ] },
  { title: "Quantum Algorithms & Research", icon: Atom, description: "Variational algorithms, chemistry, and quantum machine learning.", projects: [
    ["VQE Molecular Chemistry", "Variational quantum chemistry experiments for molecular systems.", "ab-initio-vqe-molecular-chemistry-for-h2-using-pennylane.", "VQE · PennyLane"],
    ["Machine Learning & Quantum Lab", "Machine learning and quantum computing research experiments.", "machine-learning-quantum-lab", "ML · QML"],
    ["Advanced Quantum Algorithms Lab", "Quantum algorithm implementations and ongoing research.", "quantum-algorithms-lab", "QFT · QPE · Grover · VQE · QAOA"],
  ] },
] as const;

export function QuantumProjectsShowcase() {
  const [selected, setSelected] = useState<number | null>(null);
  return (
    <section id="quantum-projects" className="scroll-mt-20 border-b border-border px-5 py-20 sm:px-8 lg:py-24" aria-labelledby="quantum-projects-heading">
      <div className="mx-auto max-w-7xl">
        <p className="font-mono text-xs uppercase tracking-widest text-primary">Engineering & research portfolio</p>
        <h2 id="quantum-projects-heading" className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Quantum Projects</h2>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">Nine GitHub research projects across three areas. Select a field to explore the repositories and their technical focus.</p>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {groups.map((group, index) => {
            const Icon = group.icon;
            return <button key={group.title} type="button" onClick={() => setSelected(selected === index ? null : index)} aria-expanded={selected === index} aria-controls="quantum-project-details" className={`group rounded-xl border p-6 text-left transition-all hover:-translate-y-1 hover:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${selected === index ? "border-primary bg-signal-soft" : "border-border bg-surface/80"}`}>
              <span className="flex items-center justify-between text-primary"><Icon className="size-7" aria-hidden="true" /><span className="font-mono text-xs">0{index + 1} / 03</span></span>
              <h3 className="mt-8 text-xl font-semibold">{group.title}</h3>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{group.description}</p>
              <span className="mt-6 block font-mono text-xs text-primary">{selected === index ? "Close projects −" : "Explore 3 projects →"}</span>
            </button>;
          })}
        </div>
        {selected !== null && <div id="quantum-project-details" className="mt-6 grid gap-4 md:grid-cols-3" aria-live="polite">
          {groups[selected].projects.map(([title, description, slug, stack]) => <article key={slug} className="flex flex-col rounded-xl border border-border bg-surface/60 p-6">
            <p className="font-mono text-[10px] uppercase tracking-wider text-primary">{stack}</p>
            <h4 className="mt-4 text-lg font-semibold">{title}</h4>
            <p className="mt-3 flex-1 text-sm leading-6 text-muted-foreground">{description}</p>
            <a className="mt-6 inline-flex items-center gap-2 self-start rounded-sm font-mono text-xs text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" href={owner + slug} target="_blank" rel="noopener noreferrer" aria-label={`Open ${title} GitHub repository`}>View source on GitHub <ArrowUpRight className="size-4" aria-hidden="true" /></a>
          </article>)}
        </div>}
      </div>
    </section>
  );
}
