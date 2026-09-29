/** Registry for the Quantum Research Dashboard. Status must reflect real implementation state. */
export type LabModule = {
  id: string;
  index: string;
  title: string;
  summary: string;
  topics: string[];
  status: "available" | "in-development";
  group: "core" | "command";
  to?: "/lab/circuit-builder" | "/lab/entanglement" | "/lab/qaoa" | "/lab/vqe" | "/lab/portfolio" | "/lab/arena" | "/lab/assistant" | "/lab/qml" | "/lab/reports" | "/lab/ibm" | "/lab/finance" | "/lab/benchmark" | "/lab/history";
};

export const LAB_MODULES: LabModule[] = [
  {
    id: "circuit-builder", index: "01", title: "Quantum Circuit Builder",
    summary: "Compose 1–5 qubit circuits, inspect the complex statevector, and sample measurement outcomes with a seeded RNG.",
    topics: ["Statevector", "H · X · Y · Z · S · T", "Rx · Ry · Rz", "CNOT · CZ", "Shots"],
    status: "available", to: "/lab/circuit-builder", group: "core",
  },
  {
    id: "entanglement", index: "02", title: "Quantum Entanglement Lab",
    summary: "Bell-state preparation, joint measurement correlations, and a configurable CHSH experiment.",
    topics: ["Bell states", "X · Y · Z bases", "CHSH"], status: "available", to: "/lab/entanglement", group: "core",
  },
  {
    id: "qaoa", index: "03", title: "QAOA Optimization Lab",
    summary: "QAOA for small weighted Max-Cut graphs, compared against an exhaustive classical baseline.",
    topics: ["Max-Cut", "Cost Hamiltonian", "Classical baseline"], status: "available", to: "/lab/qaoa", group: "core",
  },
  {
    id: "vqe", index: "04", title: "VQE Research Lab",
    summary: "Variational eigensolver for small explicit Hamiltonians with exact-diagonalisation reference.",
    topics: ["Ansatz", "Optimizers", "Exact reference"], status: "available", to: "/lab/vqe", group: "core",
  },
  {
    id: "portfolio", index: "05", title: "Quantum Portfolio Optimizer",
    summary: "Educational QUBO formulation of binary asset selection on clearly labelled synthetic data.",
    topics: ["QUBO / Ising", "Risk aversion", "Synthetic data"], status: "available", to: "/lab/portfolio", group: "core",
  },
  {
    id: "qml", index: "06", title: "Quantum Machine Learning Lab",
    summary: "Small variational quantum classifier compared with a classical baseline on the same split.",
    topics: ["Feature maps", "Loss curves", "Confusion matrix"], status: "available", to: "/lab/qml", group: "core",
  },

  {
    id: "arena", index: "C1", title: "Quantum vs Classical Arena", group: "command",
    summary: "Simulated QAOA vs exhaustive search, greedy local search, simulated annealing and random sampling on identical Max-Cut instances.",
    topics: ["QAOA", "Benchmarks", "Seeded", "CSV / JSON export"], status: "available", to: "/lab/arena",
  },
  {
    id: "assistant", index: "C2", title: "Quantum AI Research Assistant", group: "command",
    summary: "Explains algorithms and drafts circuits that are validated by the engine before use in the Circuit Builder.",
    topics: ["AI", "Validated circuits", "Demo mode"], status: "available", to: "/lab/assistant",
  },
  {
    id: "ibm", index: "C3", title: "IBM Quantum Cloud Integration", group: "command",
    summary: "Validate circuits, export OpenQASM 3 and run ideal simulations. Hardware submission stays disabled until an external Qiskit service and your IBM token are configured.",
    topics: ["OpenQASM 3", "Simulator mode", "Hardware not configured"], status: "available", to: "/lab/ibm",
  },
  {
    id: "finance", index: "C4", title: "Live Quantum Finance Lab", group: "command",
    summary: "Demo, CSV or optional live prices → returns, covariance, correlation → QUBO/QAOA portfolio selection vs equal-weight, min-variance and exhaustive baselines. Live data not configured.",
    topics: ["Covariance", "QAOA", "Demo + CSV", "PDF report"], status: "available", to: "/lab/finance",
  },
  {
    id: "reports", index: "C5", title: "Research Report Generator", group: "command",
    summary: "Client-side PDF reports from seeded experiments in all all eight labs: configuration, charts, limitations and reproducibility settings.",
    topics: ["PDF", "Client-side", "Reproducibility"], status: "available", to: "/lab/reports",
  },
  {
    id: "benchmark", index: "C6", title: "Quantum Benchmark Dashboard", group: "command",
    summary: "Research benchmark overview connecting QAOA, VQE, portfolio optimisation and quantum-vs-classical experiments with explicit classical references.",
    topics: ["Benchmarks", "QAOA", "VQE", "Classical baselines", "Reproducibility"], status: "available", to: "/lab/benchmark",
  },
  {
    id: "history", index: "C7", title: "Experiment History", group: "command",
    summary: "Save QAOA, VQE and portfolio experiment snapshots locally in the browser, review them later, and export the history as JSON or CSV.",
    topics: ["Run history", "Local storage", "JSON / CSV", "Reproducibility"], status: "available", to: "/lab/history",
  },
];
