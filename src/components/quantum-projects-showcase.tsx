import { ArrowUpRight, Atom, Cpu, LineChart } from "lucide-react";

const owner = "https://github.com/Tamas22-cell/";
const groups = [
  {
    title: "Quantum Finance & Optimization",
    icon: LineChart,
    description: "Hybrid quantum-classical finance and optimization research.",
    projects: [
      [
        "Quantum Portfolio Optimizer",
        "Portfolio optimization with QUBO and QAOA research workflows.",
        "QuantumPortfolioOptimizer",
        "QAOA · QUBO · Python",
      ],
      [
        "Quantum Finance Lab",
        "Quantitative finance experiments and hybrid quantum workflows.",
        "QuantumFinanceLab",
        "Quantum finance · Qiskit",
      ],
      [
        "Quantum Auto-Tuning",
        "Automated tuning experiments for quantum systems.",
        "quantum-auto-tuning",
        "Optimization · Python",
      ],
    ],
  },
  {
    title: "Quantum Computing & Engineering",
    icon: Cpu,
    description: "Circuit engineering, noise studies, and quantum error correction.",
    projects: [
      [
        "Production Quantum Engineering Lab",
        "Bell and GHZ circuits, validation and automated tests.",
        "production-quantum-engineering-lab",
        "Qiskit · Python · Testing",
      ],
      [
        "Quantum Hardware & Noise Simulation Lab",
        "Experiments investigating quantum hardware noise and coherence.",
        "quantum-hardware-noise-lab",
        "Noise · Simulation",
      ],
      [
        "Quantum Error Correction Lab",
        "Exploration of quantum error correction and syndrome extraction.",
        "quantum-error-correction-lab",
        "Error correction · Circuits",
      ],
    ],
  },
  {
    title: "Quantum Algorithms & Research",
    icon: Atom,
    description: "Variational algorithms, chemistry, and quantum machine learning.",
    projects: [
      [
        "VQE Molecular Chemistry",
        "Variational quantum chemistry experiments for molecular systems.",
        "ab-initio-vqe-molecular-chemistry-for-h2-using-pennylane.",
        "VQE · PennyLane",
      ],
      [
        "Machine Learning & Quantum Lab",
        "Machine learning and quantum computing research experiments.",
        "machine-learning-quantum-lab",
        "ML · QML",
      ],
      [
        "Advanced Quantum Algorithms Lab",
        "Quantum algorithm implementations and ongoing research.",
        "quantum-algorithms-lab",
        "QFT · QPE · Grover · VQE · QAOA",
      ],
    ],
  },
] as const;

export function QuantumProjectsShowcase() {
  return (
    <section
      id="quantum-projects"
      className="scroll-mt-20 relative overflow-hidden border-y border-primary/40 bg-[radial-gradient(ellipse_at_top,color-mix(in_oklab,var(--color-primary)_14%,transparent),transparent_65%)] px-5 py-20 sm:px-8 lg:py-28"
      aria-labelledby="quantum-projects-heading"
    >
      <div className="relative mx-auto max-w-7xl">
        <p className="font-mono text-xs uppercase tracking-widest text-primary">
          Engineering & research portfolio
        </p>
        <h2
          id="quantum-projects-heading"
          className="mt-3 text-4xl font-bold tracking-tight text-foreground drop-shadow-[0_0_24px_color-mix(in_oklab,var(--color-primary)_35%,transparent)] sm:text-5xl"
        >
          Quantum Projects
        </h2>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground">
          Explore all nine quantum research projects below, organized into three areas.
        </p>
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {groups.map((group, index) => {
            const Icon = group.icon;
            return (
              <a
                key={group.title}
                href={`#quantum-group-${index + 1}`}
                className="group relative overflow-hidden rounded-2xl border-2 border-primary/55 bg-[linear-gradient(145deg,color-mix(in_oklab,var(--color-primary)_15%,var(--color-surface)),var(--color-surface))] p-7 text-left shadow-[0_0_35px_color-mix(in_oklab,var(--color-primary)_13%,transparent)] transition-all duration-300 hover:-translate-y-2 hover:border-primary hover:shadow-[0_0_45px_color-mix(in_oklab,var(--color-primary)_32%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <span className="flex items-center justify-between text-primary">
                  <Icon
                    className="size-9 transition-transform duration-300 group-hover:scale-110"
                    aria-hidden="true"
                  />
                  <span className="font-mono text-xs">0{index + 1} / 03</span>
                </span>
                <h3 className="mt-8 text-2xl font-bold tracking-tight text-foreground">
                  {group.title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{group.description}</p>
                <span className="mt-6 inline-flex rounded-full border border-primary/50 bg-primary/10 px-4 py-2 font-mono text-xs font-semibold text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  View 3 projects ↓
                </span>
              </a>
            );
          })}
        </div>
        <div className="mt-16 space-y-16">
          {groups.map((group, index) => (
            <div
              key={group.title}
              id={`quantum-group-${index + 1}`}
              className="scroll-mt-24 rounded-2xl border border-primary/25 bg-surface/30 p-5 sm:p-7"
            >
              <h3 className="mb-7 border-l-4 border-primary pl-4 text-2xl font-bold tracking-tight text-foreground">
                {group.title}
              </h3>
              <div className="grid gap-5 md:grid-cols-3">
                {group.projects.map(([title, description, slug, stack]) => (
                  <article
                    key={slug}
                    className="group flex flex-col rounded-xl border border-primary/35 bg-card/90 p-6 shadow-[0_0_18px_color-mix(in_oklab,var(--color-primary)_7%,transparent)] transition-all duration-300 hover:-translate-y-1 hover:border-primary hover:bg-signal-soft hover:shadow-[0_0_30px_color-mix(in_oklab,var(--color-primary)_23%,transparent)]"
                  >
                    <p className="font-mono text-[10px] uppercase tracking-wider text-primary">
                      {stack}
                    </p>
                    <h4 className="mt-4 text-xl font-bold text-foreground">{title}</h4>
                    <p className="mt-3 flex-1 text-sm leading-6 text-muted-foreground">
                      {description}
                    </p>
                    <a
                      className="mt-6 inline-flex items-center gap-2 self-start rounded-md border border-primary/45 bg-primary/10 px-3 py-2 font-mono text-xs font-semibold text-primary transition-colors hover:bg-primary hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      href={owner + slug}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Open ${title} GitHub repository`}
                    >
                      View source on GitHub <ArrowUpRight className="size-4" aria-hidden="true" />
                    </a>
                  </article>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
