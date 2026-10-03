import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";

const defaultPrompt = "Summarize the main market risks in three concise bullets and cite the evidence you rely on.";

export function NlpLlmLab() {
  const [prompt, setPrompt] = useState(defaultPrompt);
  const [temperature, setTemperature] = useState(0.3);
  const [maxTokens, setMaxTokens] = useState(180);
  const [runId, setRunId] = useState(0);
  const [lastRun, setLastRun] = useState<{ specificity: number; risk: number; tokens: number; structure: number; words: number; score: number } | null>(null);

  const preview = useMemo(() => analysePrompt(prompt, temperature, maxTokens, runId), [prompt, temperature, maxTokens, runId]);

  const run = () => {
    const next = runId + 1;
    setRunId(next);
    setLastRun(analysePrompt(prompt, temperature, maxTokens, next));
  };

  const reset = () => {
    setPrompt(defaultPrompt);
    setTemperature(0.3);
    setMaxTokens(180);
    setRunId(0);
    setLastRun(null);
  };

  const result = lastRun ?? preview;

  return (
    <section className="rounded-md border border-border bg-card p-4 sm:p-5">
      <div className="font-mono text-xs uppercase tracking-[0.18em] text-primary">Interactive experiment</div>
      <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">NLP & LLM Evaluation Lab</h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
        Test prompt quality, token budget, structure and hallucination-risk heuristics in a transparent browser-local evaluator. No external LLM API is called.
      </p>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div>
          <label className="font-mono text-[10px] uppercase text-muted-foreground">Prompt</label>
          <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} className="mt-1 min-h-44 w-full rounded-sm border border-border bg-surface p-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
        </div>

        <div className="space-y-3">
          <label className="block rounded-sm border border-border bg-surface p-3">
            <div className="flex items-center justify-between font-mono text-[11px]"><span className="text-muted-foreground">Temperature</span><span>{temperature.toFixed(1)}</span></div>
            <input className="mt-3 w-full" type="range" min={0} max={1} step={0.1} value={temperature} onChange={(e) => setTemperature(Number(e.target.value))} />
          </label>
          <label className="block rounded-sm border border-border bg-surface p-3">
            <div className="flex items-center justify-between font-mono text-[11px]"><span className="text-muted-foreground">Max output tokens</span><span>{maxTokens}</span></div>
            <input className="mt-3 w-full" type="range" min={64} max={512} step={16} value={maxTokens} onChange={(e) => setMaxTokens(Number(e.target.value))} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <Button type="button" variant="signal" onClick={run}>RUN EVALUATION</Button>
            <Button type="button" variant="outline" onClick={reset}>RESET</Button>
          </div>
          <div className="font-mono text-[10px] text-muted-foreground">{lastRun ? `Run #${runId} complete` : "Adjust the prompt, then run the evaluation"}</div>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <Metric label="Prompt specificity" value={`${result.specificity}%`} />
        <Metric label="Risk heuristic" value={`${result.risk}%`} />
        <Metric label="Input tokens" value={String(result.tokens)} />
        <Metric label="Structure signals" value={`${result.structure}/6`} />
        <Metric label="Words" value={String(result.words)} />
        <Metric label="Quality score" value={`${result.score}%`} />
      </div>

      <div className="mt-5 rounded-sm border border-border bg-surface p-4">
        <div className="font-mono text-[10px] uppercase text-muted-foreground">Evaluation summary</div>
        <p className="mt-2 text-sm leading-6 text-foreground">
          {result.score >= 80 ? "Strong prompt structure with clear constraints and good evidence guidance." : result.score >= 60 ? "Usable prompt, but adding clearer output format, evidence requirements or scope would improve it." : "Prompt is underspecified. Add explicit task, format, evidence and scope instructions."}
        </p>
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-sm border border-border bg-surface p-3"><div className="font-mono text-lg font-semibold text-foreground">{value}</div><div className="mt-1 font-mono text-[10px] uppercase text-muted-foreground">{label}</div></div>;
}

function analysePrompt(prompt: string, temperature: number, maxTokens: number, runId: number) {
  const text = prompt.trim();
  const words = text.split(/\s+/).filter(Boolean);
  const tokens = Math.max(1, Math.ceil(text.length / 4));
  const lower = text.toLowerCase();
  const signals = ["bullet", "cite", "evidence", "concise", "summarize", "three"].filter((k) => lower.includes(k)).length;
  const specificity = Math.min(100, Math.round(30 + Math.min(words.length, 45) + signals * 8 + Math.min(maxTokens / 32, 12)));
  const variability = ((runId * 17) % 9) - 4;
  const risk = Math.max(0, Math.min(100, Math.round(temperature * 58 + (lower.includes("cite") || lower.includes("evidence") ? 8 : 27) + variability)));
  const score = Math.max(0, Math.min(100, Math.round(specificity * 0.72 + (100 - risk) * 0.28)));
  return { specificity, risk, tokens, structure: signals, words: words.length, score };
}
