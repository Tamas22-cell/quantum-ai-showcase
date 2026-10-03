const aiAreas = [
  {
    code: "ML",
    title: "Machine Learning",
    description: "Supervised and unsupervised learning workflows covering classification, regression, clustering, feature engineering and model evaluation.",
    topics: ["Classification", "Regression", "Clustering", "Feature engineering"],
    status: "CORE",
    href: "/lab/ai/machine-learning",
  },
  {
    code: "DL",
    title: "Deep Learning",
    description: "Neural-network experiments with dense architectures, representation learning, optimisation, regularisation and training diagnostics.",
    topics: ["Neural networks", "Backpropagation", "Optimizers", "Regularisation"],
    status: "CORE",
    href: "/lab/ai/deep-learning",
  },
  {
    code: "NLP",
    title: "NLP & Large Language Models",
    description: "Language-model workflows spanning embeddings, prompt design, structured outputs, retrieval and evaluation of generated answers.",
    topics: ["LLMs", "Embeddings", "Structured output", "Evaluation"],
    status: "RESEARCH",
    href: "/lab/ai/nlp-llm",
  },
  {
    code: "RAG",
    title: "Retrieval-Augmented Generation",
    description: "Document ingestion, chunking, vector retrieval, reranking and grounded generation with explicit source-aware evaluation.",
    topics: ["Vector search", "Chunking", "Reranking", "Grounding"],
    status: "RESEARCH",
    href: "/lab/ai/rag",
  },
  {
    code: "AGENTS",
    title: "Multi-Agent AI Systems",
    description: "Specialised agents that coordinate research, analysis, risk, market and synthesis tasks through tool-driven workflows.",
    topics: ["Tool use", "Orchestration", "Planning", "Agent evaluation"],
    status: "DEPLOYED",
    href: "https://ai-multi-agent-financial-research-p.vercel.app",
  },
  {
    code: "CV",
    title: "Computer Vision",
    description: "Image classification, feature extraction and multimodal model experiments with reproducible preprocessing and metrics.",
    topics: ["Image classification", "CNNs", "Multimodal", "Metrics"],
    status: "ROADMAP",
    href: "/lab/ai/computer-vision",
  },
  {
    code: "RL",
    title: "Reinforcement Learning",
    description: "Sequential decision-making research with policies, rewards, exploration strategies and benchmark environments.",
    topics: ["Policies", "Rewards", "Exploration", "Q-learning"],
    status: "ROADMAP",
    href: "/lab/ai/reinforcement-learning",
  },
  {
    code: "TS",
    title: "Time-Series & Forecasting",
    description: "Feature-rich time-series modelling with walk-forward validation, baseline comparison and leakage-aware evaluation.",
    topics: ["Forecasting", "Walk-forward", "Features", "Backtesting"],
    status: "RESEARCH",
    href: "/lab/ai/time-series",
  },
  {
    code: "XAI",
    title: "Explainable AI",
    description: "Model interpretation and error analysis using feature importance, local explanations and transparent benchmark reporting.",
    topics: ["SHAP-style analysis", "Feature importance", "Error analysis", "Interpretability"],
    status: "RESEARCH",
    href: "/lab/ai/explainable-ai",
  },
  {
    code: "MLOPS",
    title: "MLOps & AI Evaluation",
    description: "Reproducible experiments, dataset/version tracking, testable pipelines, observability and model-quality evaluation.",
    topics: ["Experiment tracking", "Testing", "Monitoring", "Evals"],
    status: "ENGINEERING",
    href: "/lab/ai/mlops-evaluation",
  },
] as const;

const statusClass: Record<string, string> = {
  CORE: "border-primary/40 text-primary",
  RESEARCH: "border-primary/40 text-primary",
  DEPLOYED: "border-emerald/40 text-emerald",
  ROADMAP: "border-amber/40 text-amber",
  ENGINEERING: "border-emerald/40 text-emerald",
};

export function AiResearchHub() {
  return (
    <div className="space-y-6">
      <section className="rounded-md border border-border bg-card p-4 sm:p-5">
        <div className="font-mono text-xs uppercase tracking-[0.18em] text-primary">AI Research Stack</div>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">Machine Learning, LLMs, Agents & Applied AI</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
          A dedicated AI research area separated from the quantum labs. The focus is reproducible machine-learning experiments, modern language-model systems,
          agent orchestration, evaluation and production-oriented AI engineering.
        </p>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-sm border border-border bg-surface p-3"><div className="font-mono text-xl font-semibold text-foreground">10</div><div className="mt-1 font-mono text-[10px] uppercase text-muted-foreground">AI domains</div></div>
          <div className="rounded-sm border border-border bg-surface p-3"><div className="font-mono text-xl font-semibold text-foreground">ML → LLM</div><div className="mt-1 font-mono text-[10px] uppercase text-muted-foreground">full stack</div></div>
          <div className="rounded-sm border border-border bg-surface p-3"><div className="font-mono text-xl font-semibold text-foreground">Agents</div><div className="mt-1 font-mono text-[10px] uppercase text-muted-foreground">tool workflows</div></div>
          <div className="rounded-sm border border-border bg-surface p-3"><div className="font-mono text-xl font-semibold text-foreground">Evals</div><div className="mt-1 font-mono text-[10px] uppercase text-muted-foreground">measured quality</div></div>
        </div>
      </section>

      <section className="rounded-md border border-primary/30 bg-primary/5 p-4 sm:p-5">
        <div className="font-mono text-xs uppercase tracking-[0.18em] text-primary">Interactive AI Labs</div>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">Open a lab</h2>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {aiAreas.filter((area) => area.code !== "AGENTS").map((area) => (
            <a
              key={area.code}
              href={area.href}
              className="rounded-md border border-border bg-card p-4 transition-colors hover:border-primary/60 hover:bg-surface"
            >
              <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">{area.code}</div>
              <div className="mt-2 text-base font-semibold text-foreground">{area.title}</div>
              <div className="mt-3 font-mono text-[10px] font-semibold text-primary">OPEN LAB →</div>
            </a>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <div className="font-mono text-xs uppercase tracking-[0.18em] text-primary">Research Areas</div>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">AI modules</h2>
          </div>
          <div className="hidden font-mono text-[10px] uppercase text-muted-foreground sm:block">separate from quantum research</div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {aiAreas.map((area) => {
            const card = (
              <article className="h-full rounded-md border border-border bg-card p-4 transition-colors hover:border-primary/40">
                <div className="flex items-start justify-between gap-3">
                  <div className="font-mono text-xs font-semibold text-primary">{area.code}</div>
                  <span className={`rounded-full border px-2 py-1 font-mono text-[9px] font-semibold ${statusClass[area.status] ?? "border-border text-muted-foreground"}`}>
                    {area.status}
                  </span>
                </div>
                <h3 className="mt-3 text-lg font-semibold text-foreground">{area.title}</h3>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">{area.description}</p>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {area.topics.map((topic) => (
                    <span key={topic} className="rounded-sm border border-border bg-surface px-2 py-1 font-mono text-[9px] text-muted-foreground">{topic}</span>
                  ))}
                </div>
                <div className="mt-4 font-mono text-[10px] font-semibold text-primary">OPEN LAB →</div>
              </article>
            );

            const external = area.href.startsWith("http");
            return (
              <a key={area.code} href={area.href} target={external ? "_blank" : undefined} rel={external ? "noreferrer" : undefined} className="block">
                {card}
              </a>
            );
          })}
        </div>
      </section>

      <section className="rounded-md border border-primary/30 bg-primary/5 p-4 sm:p-5">
        <div className="font-mono text-xs uppercase tracking-[0.18em] text-primary">Build Order</div>
        <h2 className="mt-2 text-xl font-semibold text-foreground">Interactive AI research stack</h2>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">
          Machine Learning, Deep Learning, NLP & LLM, RAG, Computer Vision, Reinforcement Learning, Time-Series, Explainable AI and MLOps are now exposed as dedicated lab entry points. Multi-Agent AI remains linked to the deployed agent platform.
        </p>
      </section>
    </div>
  );
}
