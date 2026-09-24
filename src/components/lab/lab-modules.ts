/** Registry for the Quantum Research Dashboard. Status must reflect real implementation state. */
export type LabModule = {
  id: string;
  index: string;
  title: string;
  summary: string;
  topics: string[];
  status: "available" | "in-development";
  group: "core" | "command";
  to?: "/lab/circuit-builder" | "/lab/entanglement" | "/lab/qaoa" | "/lab/vqe" | "/lab/portfolio" | "/lab/arena" | "/lab/assistant" | "/lab/qml" | "/lab/reports";
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
    summary: "Optional Qiskit job submission to IBM Quantum hardware. Requires an external Python service and your IBM credentials — not connected.",
    topics: ["Qiskit", "Jobs", "Not configured"], status: "in-development",
  },
  {
    id: "finance", index: "C4", title: "Live Quantum Finance Lab", group: "command",
    summary: "Portfolio optimisation with optional market-data provider; labelled sample datasets until a provider is connected.",
    topics: ["Covariance", "Backtest", "Sample data"], status: "in-development",
  },
  {
    id: "reports", index: "C5", title: "Research Report Generator", group: "command",
    summary: "Client-side PDF reports from seeded experiments in all seven labs: configuration, charts, limitations and reproducibility settings.",
    topics: ["PDF", "Client-side", "Reproducibility"], status: "available", to: "/lab/reports",
  },
];
