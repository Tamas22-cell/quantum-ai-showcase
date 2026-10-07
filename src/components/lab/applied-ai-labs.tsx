import { useMemo, useState } from "react";

function Panel({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <section className="rounded-md border border-border bg-card p-4 sm:p-5">
      <div className="font-mono text-xs uppercase tracking-[0.18em] text-primary">Interactive experiment</div>
      <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{title}</h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">{subtitle}</p>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-sm border border-border bg-surface p-3">
      <div className="font-mono text-lg font-semibold text-foreground">{value}</div>
      <div className="mt-1 font-mono text-[10px] uppercase text-muted-foreground">{label}</div>
    </div>
  );
}

function Range({ label, value, min, max, step = 1, onChange }: { label: string; value: number; min: number; max: number; step?: number; onChange: (value: number) => void }) {
  return (
    <label className="block rounded-sm border border-border bg-surface p-3">
      <div className="flex items-center justify-between gap-3 font-mono text-[11px]"><span className="text-muted-foreground">{label}</span><span className="text-foreground">{value}</span></div>
      <input className="mt-3 w-full" type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  );
}

export function DeepLearningLab() {
  const [layers, setLayers] = useState(3);
  const [epochs, setEpochs] = useState(40);
  const [lr, setLr] = useState(0.02);
  const [dropout, setDropout] = useState(0.2);
  const stability = Math.max(0, 1 - Math.abs(lr - 0.025) * 13 - Math.max(0, layers - 5) * 0.04);
  const accuracy = Math.min(0.985, 0.69 + layers * 0.035 + Math.log10(epochs + 1) * 0.07 + stability * 0.06 - Math.abs(dropout - 0.2) * 0.12);
  const loss = Math.max(0.04, 1.2 * Math.exp(-epochs / (17 + layers * 2)) + (1 - stability) * 0.25);
  const curve = Array.from({ length: 18 }, (_, i) => {
    const p = i / 17;
    return { x: 14 + p * 572, y: 145 - (1 - Math.exp(-p * (3 + epochs / 30))) * 105 * stability };
  });
  return (
    <Panel title="Deep Learning Lab" subtitle="Tune a compact dense neural-network experiment and inspect training dynamics. The metrics are an educational browser-local simulation, not claims from a production model.">
      <div className="grid gap-3 md:grid-cols-4">
        <Range label="Hidden layers" value={layers} min={1} max={8} onChange={setLayers} />
        <Range label="Epochs" value={epochs} min={10} max={120} step={5} onChange={setEpochs} />
        <Range label="Learning rate" value={lr} min={0.005} max={0.08} step={0.005} onChange={setLr} />
        <Range label="Dropout" value={dropout} min={0} max={0.5} step={0.05} onChange={setDropout} />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Metric label="Validation accuracy" value={`${(accuracy * 100).toFixed(1)}%`} />
        <Metric label="Final loss" value={loss.toFixed(3)} />
        <Metric label="Parameters" value={`${(layers * 384 + 257).toLocaleString()}`} />
        <Metric label="Optimizer" value="Adam" />
      </div>
      <div className="mt-4 rounded-sm border border-border bg-surface p-3">
        <div className="mb-2 font-mono text-[10px] uppercase text-muted-foreground">Training curve</div>
        <svg viewBox="0 0 600 160" className="w-full">
          <line x1="12" y1="145" x2="590" y2="145" stroke="currentColor" opacity="0.25" />
          <polyline points={curve.map((p) => `${p.x},${p.y}`).join(" ")} fill="none" stroke="currentColor" strokeWidth="3" />
        </svg>
      </div>
    </Panel>
  );
}

export function NlpLlmLab() {
  const [prompt, setPrompt] = useState("Summarize the main market risks in three concise bullets and cite the evidence you rely on.");
  const [temperature, setTemperature] = useState(0.3);
  const words = prompt.trim().split(/\s+/).filter(Boolean);
  const tokenEstimate = Math.ceil(prompt.length / 4);
  const structureSignals = ["three", "bullet", "cite", "evidence", "concise", "summarize"].filter((k) => prompt.toLowerCase().includes(k)).length;
  const specificity = Math.min(100, 35 + Math.min(words.length, 45) + structureSignals * 8);
  const risk = Math.min(100, Math.round(temperature * 55 + (prompt.toLowerCase().includes("cite") ? 5 : 24)));
  return (
    <Panel title="NLP & LLM Evaluation Lab" subtitle="A local prompt-analysis sandbox for prompt structure, token budgeting and hallucination-risk heuristics. It does not call an external language model.">
      <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} className="min-h-36 w-full rounded-sm border border-border bg-surface p-3 text-sm text-foreground" />
      <div className="mt-3 grid gap-3 md:grid-cols-3">
        <Range label="Temperature" value={temperature} min={0} max={1} step={0.1} onChange={setTemperature} />
        <Metric label="Estimated tokens" value={String(tokenEstimate)} />
        <Metric label="Prompt specificity" value={`${specificity}%`} />
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-3">
        <Metric label="Hallucination risk heuristic" value={`${risk}%`} />
        <Metric label="Structure signals" value={`${structureSignals}/6`} />
        <Metric label="Words" value={String(words.length)} />
      </div>
    </Panel>
  );
}

const ragDocument = [
  "QAOA is a variational quantum algorithm that alternates cost and mixer operators.",
  "Portfolio optimization can be encoded as a binary QUBO with a risk-return objective and budget constraint.",
  "Readout error mitigation targets measurement error and does not remove every source of gate noise.",
  "A retrieval system should expose source chunks so generated claims can be checked against evidence.",
  "Walk-forward validation is useful for time-series models because it preserves temporal order.",
];

function similarity(query: string, text: string) {
  const q = new Set(query.toLowerCase().split(/\W+/).filter(Boolean));
  const t = new Set(text.toLowerCase().split(/\W+/).filter(Boolean));
  let overlap = 0;
  q.forEach((word) => { if (t.has(word)) overlap += 1; });
  return overlap / Math.max(1, q.size);
}

export function RagLab() {
  const [query, setQuery] = useState("How is portfolio optimization represented and how should results be grounded?");
  const [topK, setTopK] = useState(2);
  const ranked = useMemo(() => ragDocument.map((text, i) => ({ text, i, score: similarity(query, text) })).sort((a, b) => b.score - a.score).slice(0, topK), [query, topK]);
  return (
    <Panel title="RAG Retrieval Lab" subtitle="Experiment with chunk retrieval, top-k selection and grounding using a transparent local keyword-overlap retriever.">
      <input value={query} onChange={(event) => setQuery(event.target.value)} className="w-full rounded-sm border border-border bg-surface p-3 text-sm text-foreground" />
      <div className="mt-3 max-w-sm"><Range label="Top-k chunks" value={topK} min={1} max={5} onChange={setTopK} /></div>
      <div className="mt-4 space-y-3">
        {ranked.map((item, index) => (
          <article key={item.i} className="rounded-sm border border-border bg-surface p-3">
            <div className="font-mono text-[10px] uppercase text-primary">Rank {index + 1} · score {item.score.toFixed(2)}</div>
            <p className="mt-2 text-sm leading-6 text-foreground">{item.text}</p>
          </article>
        ))}
      </div>
    </Panel>
  );
}

export function ComputerVisionLab() {
  const [threshold, setThreshold] = useState(0.55);
  const [blur, setBlur] = useState(1);
  const signal = Math.max(0.05, 0.86 - blur * 0.055);
  const confidence = Math.max(0.01, Math.min(0.99, signal - Math.abs(threshold - 0.5) * 0.18));
  const pixels = Array.from({ length: 64 }, (_, i) => ((i * 17 + blur * 11) % 19) / 18);
  return (
    <Panel title="Computer Vision Lab" subtitle="Inspect a synthetic 8×8 feature map and study how preprocessing and confidence thresholds change an image-classification decision.">
      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <div className="grid grid-cols-8 gap-1 rounded-sm border border-border bg-surface p-3">
          {pixels.map((v, i) => <div key={i} className="aspect-square rounded-[2px] bg-foreground" style={{ opacity: 0.12 + v * 0.75 }} />)}
        </div>
        <div>
          <div className="grid gap-3 md:grid-cols-2">
            <Range label="Confidence threshold" value={threshold} min={0.1} max={0.9} step={0.05} onChange={setThreshold} />
            <Range label="Blur / preprocessing" value={blur} min={0} max={6} onChange={setBlur} />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3">
            <Metric label="Class" value={confidence >= threshold ? "Object A" : "Uncertain"} />
            <Metric label="Confidence" value={`${(confidence * 100).toFixed(1)}%`} />
            <Metric label="Feature-map size" value="8 × 8" />
          </div>
        </div>
      </div>
    </Panel>
  );
}

export function ReinforcementLearningLab() {
  const [episodes, setEpisodes] = useState(120);
  const [epsilon, setEpsilon] = useState(0.2);
  const [gamma, setGamma] = useState(0.9);
  const success = Math.min(0.99, 0.38 + Math.log10(episodes + 1) * 0.24 + gamma * 0.18 - Math.abs(epsilon - 0.18) * 0.28);
  const avgReward = -4.2 + success * 12.3;
  return (
    <Panel title="Reinforcement Learning Lab" subtitle="Explore a compact Q-learning grid-world experiment with episodes, exploration and discount-factor controls.">
      <div className="grid gap-3 md:grid-cols-3">
        <Range label="Episodes" value={episodes} min={20} max={500} step={20} onChange={setEpisodes} />
        <Range label="Epsilon" value={epsilon} min={0} max={0.8} step={0.05} onChange={setEpsilon} />
        <Range label="Gamma" value={gamma} min={0.1} max={0.99} step={0.05} onChange={setGamma} />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Metric label="Success rate" value={`${(success * 100).toFixed(1)}%`} />
        <Metric label="Average reward" value={avgReward.toFixed(2)} />
        <Metric label="State space" value="5 × 5" />
        <Metric label="Algorithm" value="Q-learning" />
      </div>
    </Panel>
  );
}

export function TimeSeriesLab() {
  const [window, setWindow] = useState(6);
  const [trend, setTrend] = useState(1.2);
  const series = useMemo(() => Array.from({ length: 36 }, (_, i) => 80 + i * trend + Math.sin(i * 0.7) * 8 + Math.cos(i * 0.23) * 4), [trend]);
  const forecast = series.map((_, i) => {
    if (i < window) return series[i]!;
    return series.slice(i - window, i).reduce((a, b) => a + b, 0) / window;
  });
  const errors = series.slice(window).map((v, i) => v - forecast[i + window]!);
  const mae = errors.reduce((a, b) => a + Math.abs(b), 0) / errors.length;
  const rmse = Math.sqrt(errors.reduce((a, b) => a + b * b, 0) / errors.length);
  const toPoints = (values: number[]) => values.map((v, i) => `${12 + i * 16},${150 - (v - 65) * 1.55}`).join(" ");
  return (
    <Panel title="Time-Series & Forecasting Lab" subtitle="Test a moving-average forecasting baseline on a synthetic trend-plus-seasonality series while preserving temporal order.">
      <div className="grid gap-3 md:grid-cols-2">
        <Range label="Moving-average window" value={window} min={2} max={12} onChange={setWindow} />
        <Range label="Trend strength" value={trend} min={0} max={2.5} step={0.1} onChange={setTrend} />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Metric label="MAE" value={mae.toFixed(2)} />
        <Metric label="RMSE" value={rmse.toFixed(2)} />
        <Metric label="Validation" value="Walk-forward" />
        <Metric label="Baseline" value="Moving avg" />
      </div>
      <div className="mt-4 rounded-sm border border-border bg-surface p-3">
        <svg viewBox="0 0 600 170" className="w-full">
          <polyline points={toPoints(series)} fill="none" stroke="currentColor" strokeWidth="2.5" />
          <polyline points={toPoints(forecast)} fill="none" stroke="currentColor" strokeWidth="2" opacity="0.45" />
        </svg>
      </div>
    </Panel>
  );
}

export function ExplainableAiLab() {
  const [risk, setRisk] = useState(0.7);
  const [momentum, setMomentum] = useState(0.5);
  const [volatility, setVolatility] = useState(0.4);
  const contributions = [
    { name: "Risk score", value: risk * -0.9 },
    { name: "Momentum", value: momentum * 1.1 },
    { name: "Volatility", value: volatility * -0.65 },
  ];
  const score = contributions.reduce((sum, item) => sum + item.value, 0) + 0.2;
  return (
    <Panel title="Explainable AI Lab" subtitle="Inspect feature contributions for a transparent linear decision function and see how local explanations change with the input features.">
      <div className="grid gap-3 md:grid-cols-3">
        <Range label="Risk score" value={risk} min={0} max={1} step={0.05} onChange={setRisk} />
        <Range label="Momentum" value={momentum} min={0} max={1} step={0.05} onChange={setMomentum} />
        <Range label="Volatility" value={volatility} min={0} max={1} step={0.05} onChange={setVolatility} />
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {contributions.map((item) => (
          <div key={item.name} className="rounded-sm border border-border bg-surface p-3">
            <div className="font-mono text-[10px] uppercase text-muted-foreground">{item.name}</div>
            <div className="mt-2 text-xl font-semibold text-foreground">{item.value >= 0 ? "+" : ""}{item.value.toFixed(3)}</div>
          </div>
        ))}
      </div>
      <div className="mt-3"><Metric label="Local prediction score" value={score.toFixed(3)} /></div>
    </Panel>
  );
}

export function MlOpsEvaluationLab() {
  const [version, setVersion] = useState(3);
  const [dataVersion, setDataVersion] = useState(5);
  const [threshold, setThreshold] = useState(0.78);
  const score = Math.min(0.99, 0.71 + version * 0.018 + dataVersion * 0.007);
  const status = score >= threshold ? "PASS" : "FAIL";
  return (
    <Panel title="MLOps & AI Evaluation Lab" subtitle="Track model and dataset versions, define a quality gate and inspect a reproducible deployment-style evaluation record.">
      <div className="grid gap-3 md:grid-cols-3">
        <Range label="Model version" value={version} min={1} max={10} onChange={setVersion} />
        <Range label="Dataset version" value={dataVersion} min={1} max={10} onChange={setDataVersion} />
        <Range label="Quality gate" value={threshold} min={0.6} max={0.95} step={0.01} onChange={setThreshold} />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Metric label="Evaluation score" value={score.toFixed(3)} />
        <Metric label="Gate status" value={status} />
        <Metric label="Model artifact" value={`v${version}`} />
        <Metric label="Dataset" value={`data-v${dataVersion}`} />
      </div>
      <div className="mt-4 overflow-x-auto rounded-sm border border-border">
        <table className="min-w-[650px] w-full font-mono text-[11px]">
          <thead className="bg-surface text-muted-foreground"><tr><th className="p-3 text-left">Run</th><th className="p-3 text-left">Model</th><th className="p-3 text-left">Dataset</th><th className="p-3 text-left">Score</th><th className="p-3 text-left">Gate</th></tr></thead>
          <tbody><tr><td className="p-3">eval-{version}{dataVersion}01</td><td className="p-3">v{version}</td><td className="p-3">data-v{dataVersion}</td><td className="p-3">{score.toFixed(3)}</td><td className="p-3">{status}</td></tr></tbody>
        </table>
      </div>
    </Panel>
  );
}
