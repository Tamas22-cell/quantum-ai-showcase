/** Registry for the Quantum Research Dashboard. Status must reflect real implementation state. */
export type LabModule = {
  id: string;
  index: string;
  title: string;
  summary: string;
  topics: string[];
  status: "available" | "in-development";
  to?: "/lab/circuit-builder";
};

export const LAB_MODULES: LabModule[] = [
  {
    id: "circuit-builder", index: "01", title: "Quantum Circuit Builder",
    summary: "Compose 1–5 qubit circuits, inspect the complex statevector, and sample measurement outcomes with a seeded RNG.",
    topics: ["Statevector", "H · X · Y · Z · S · T", "Rx · Ry · Rz", "CNOT · CZ", "Shots"],
    status: "available", to: "/lab/circuit-builder",
  },
  {
    id: "entanglement", index: "02", title: "Quantum Entanglement Lab",
    summary: "Bell-state preparation, joint measurement correlations, and a configurable CHSH experiment.",
    topics: ["Bell states", "Correlations", "CHSH"], status: "in-development",
  },
  {
    id: "qaoa", index: "03", title: "QAOA Optimization Lab",
    summary: "QAOA for small weighted Max-Cut graphs, compared against an exhaustive classical baseline.",
    topics: ["Max-Cut", "Cost Hamiltonian", "Classical baseline"], status: "in-development",
  },
  {
    id: "vqe", index: "04", title: "VQE Research Lab",
    summary: "Variational eigensolver for small explicit Hamiltonians with exact-diagonalisation reference.",
    topics: ["Ansatz", "Optimizers", "Exact reference"], status: "in-development",
  },
  {
    id: "portfolio", index: "05", title: "Quantum Portfolio Optimizer",
    summary: "Educational QUBO formulation of binary asset selection on clearly labelled synthetic data.",
    topics: ["QUBO / Ising", "Risk aversion", "Synthetic data"], status: "in-development",
  },
  {
    id: "qml", index: "06", title: "Quantum Machine Learning Lab",
    summary: "Small variational quantum classifier compared with a classical baseline on the same split.",
    topics: ["Feature maps", "Loss curves", "Confusion matrix"], status: "in-development",
  },
];
