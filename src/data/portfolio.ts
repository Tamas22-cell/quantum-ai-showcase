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
      title: "AgentTrust",
      description:
        "A research concept exploring trust, identity, and verifiable coordination for autonomous AI agents.",
      tags: ["AI agents", "Trust systems", "Blockchain"],
      link: { label: "GitHub pending", href: "#", placeholder: true },
    },
    {
      index: "02",
      title: "AI Financial Research Platform",
      description:
        "A structured workspace concept for AI-assisted financial research, synthesis, and analytical workflows.",
      tags: ["Python", "AI research", "Quantitative finance"],
      link: { label: "GitHub pending", href: "#", placeholder: true },
    },
    {
      index: "03",
      title: "Quantum Portfolio Lab",
      description:
        "An experimental research environment for studying quantum and hybrid approaches to portfolio optimization.",
      tags: ["Qiskit", "QAOA", "Optimization"],
      link: { label: "GitHub pending", href: "#", placeholder: true },
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
    { title: "Certification entry", detail: "Credential details pending verification" },
    { title: "Certification entry", detail: "Credential details pending verification" },
  ],
  social: [
    { label: "LinkedIn", href: "https://www.linkedin.com/in/tamas-nemeth-8820a6a5/", placeholder: false },
    { label: "GitHub", href: "#", placeholder: true },
  ] satisfies PortfolioLink[],
} as const;