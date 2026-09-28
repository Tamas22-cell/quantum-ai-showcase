export type PortfolioLink = {
  label: string;
  href: string;
  placeholder: boolean;
};

export type Project = {
  index: string;
  title: string;
  description: string;
  tags: string[];
  link: PortfolioLink;
};

export const portfolio = {
  name: "Tamás Németh",
  brand: "Quantum AI Lab",
  role: "AI & Quantum Computing Researcher",
  intro:
    "Exploring intelligent agents, computational finance, and quantum algorithms at the boundary between research and practical systems.",
  navigation: [
    { label: "About", href: "#about" },
    { label: "Projects", href: "#projects" },
    { label: "Research", href: "#research" },
    { label: "Quantum Lab", href: "#quantum-lab" },
    { label: "Credentials", href: "#certifications" },
    { label: "Contact", href: "#contact" },
  ],
  disciplines: ["AI agents", "Python", "Blockchain", "Quantitative finance", "Quantum computing"],
  about: [
    "I investigate how autonomous AI systems can reason, coordinate, and operate within verifiable digital environments.",
    "My interests connect Python engineering, blockchain systems, quantitative finance, and quantum computing—with an emphasis on rigorous, maintainable experimentation.",
  ],
  projects: [
    {
      index: "01",
      title: "AI Multi-Agent Financial Research Platform",
      description:
        "A deployed multi-agent financial research system combining macro, technical, crypto, sentiment, news, risk and market-analysis workflows.",
      tags: ["Python", "Multi-agent AI", "Financial research"],
      link: {
        label: "Open live project",
        href: "https://ai-multi-agent-financial-research-p.vercel.app",
        placeholder: false,
      },
    },
    {
      index: "02",
      title: "Quantum Finance Lab",
      description:
        "A deployed hybrid quantum-classical finance research environment covering QAOA, VQE, QML, Qiskit and quantitative market analysis.",
      tags: ["Qiskit", "QAOA", "Quantum finance"],
      link: {
        label: "Open live project",
        href: "https://quantumfinancelab.vercel.app",
        placeholder: false,
      },
    },
    {
      index: "03",
      title: "Quantum Portfolio Optimizer",
      description:
        "A deployed hybrid portfolio-optimization research project using real market data, QUBO formulation, QAOA and Qiskit.",
      tags: ["Qiskit", "QAOA", "Portfolio optimization"],
      link: {
        label: "Open live project",
        href: "https://quantum-portfolio-optimizer-ej1s.vercel.app",
        placeholder: false,
      },
    },
  ] satisfies Project[],
  research: [
    {
      code: "QAOA",
      title: "Quantum Approximate Optimization",
      description: "Studying variational approaches to combinatorial optimization and portfolio construction.",
    },
    {
      code: "VQE",
      title: "Variational Quantum Eigensolver",
      description: "Exploring variational circuits and the classical–quantum optimization loop.",
    },
    {
      code: "QISKIT",
      title: "Quantum Software Workflows",
      description: "Building reproducible experiments and examining hardware-aware execution patterns with Qiskit.",
    },
    {
      code: "HYBRID",
      title: "Hybrid Algorithms",
      description: "Investigating where classical and quantum methods can be composed into practical research workflows.",
    },
  ],
  certifications: [
    // Set verified: true only once a real credential (issuer, date, credential URL) is supplied.
    { title: "Certification entry", detail: "Credential details pending verification", verified: false },
    { title: "Certification entry", detail: "Credential details pending verification", verified: false },
  ],
  social: [
    { label: "LinkedIn", href: "https://www.linkedin.com/in/tamas-nemeth-8820a6a5/", placeholder: false },
    { label: "GitHub", href: "https://github.com/Tamas22-cell", placeholder: false },
  ] satisfies PortfolioLink[],
} as const;