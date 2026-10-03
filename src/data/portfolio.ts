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
    { label: "AI Lab", href: "/lab/ai" },
    { label: "Quantum Lab", href: "#quantum-lab" },
    { label: "Crypto Intelligence", href: "/lab/crypto-intelligence" },
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
      href: "/lab/qaoa",
    },
    {
      code: "VQE",
      title: "Variational Quantum Eigensolver",
      description: "Exploring variational circuits and the classical–quantum optimization loop.",
      href: "/lab/vqe",
    },
    {
      code: "QISKIT",
      title: "Quantum Software Workflows",
      description: "Building reproducible experiments and examining hardware-aware execution patterns with Qiskit.",
      href: "https://quantum-ai-showcase.vercel.app/lab/qiskit",
    },
    {
      code: "HYBRID",
      title: "Hybrid Algorithms",
      description: "Investigating where classical and quantum methods can be composed into practical research workflows.",
      href: "/lab/arena",
    },
  ],
  certifications: [
    {
      title: "Development and Applications of Germanium Quantum Technologies",
      detail: "DelftX / edX · Verified Certificate · Issued Sep 2026 · Credential ID c7a7a5d0baf54375b6b2523afbdbb856",
      verified: true,
      href: "https://courses.edx.org/certificates/c7a7a5d0baf54375b6b2523afbdbb856",
    },
    {
      title: "Implementing AI Algorithms from Scratch",
      detail: "CodeSignal / edX · Verified Certificate · Issued Oct 1, 2026 · Credential ID bc2ee34632334473ac2ccec9a1207cc1",
      verified: true,
      href: "https://courses.edx.org/certificates/bc2ee34632334473ac2ccec9a1207cc1",
    },
    {
      title: "QCST1x: Machine Learning for Semiconductor Quantum Devices",
      detail: "DelftX / edX · Verified Certificate · Issued Oct 1, 2026 · Credential ID 94853a5f91cf4416bc459a5230d08fb4",
      verified: true,
      href: "https://courses.edx.org/certificates/94853a5f91cf4416bc459a5230d08fb4",
    },
  ],
  social: [
    { label: "LinkedIn", href: "https://www.linkedin.com/in/tamas-nemeth-8820a6a5/", placeholder: false },
    { label: "GitHub", href: "https://github.com/Tamas22-cell", placeholder: false },
  ] satisfies PortfolioLink[],
} as const;