import { Fragment, useMemo, useRef, useState } from "react";
import { Dice5, Download, Loader2, Play, Plus, Square, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Histogram, Panel } from "./charts";
import { LineChart, type Series } from "./line-chart";
import {
  arenaToCsv, arenaToJson, createRng, GRAPH_PRESETS, MAX_CUT_NODES, randomGraph, runArena, validateArenaConfig,
  type ArenaConfig, type ArenaResult, type Graph,
} from "@/lib/quantum";

const COLORS: Record<string, string> = { exhaustive: "var(--muted-foreground)", greedy: "var(--amber)", sa: "var(--rose)", random: "var(--border-strong)", qaoa: "var(--primary)" };
const KIND_LABEL = { exact: "Exact", "classical-heuristic": "Classical", "quantum-simulated": "Quantum · simulated" } as const;

const field = "w-full rounded-sm border border-border bg-surface px-2 py-1.5 font-mono text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function download(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}

/** Circular layout preview of the Max-Cut graph; optionally colours nodes by a cut assignment. */
function GraphView({ g, assignment }: { g: Graph; assignment?: number | undefined }) {
  const pos = Array.from({ length: g.n }, (_, i) => {
    const a = (2 * Math.PI * i) / g.n - Math.PI / 2;
    return { x: 100 + 70 * Math.cos(a), y: 100 + 70 * Math.sin(a) };
  });
  const side = (i: number) => (assignment === undefined ? -1 : (assignment >> i) & 1);
  return (
    <svg viewBox="0 0 200 200" className="mx-auto h-56 w-56" role="img" aria-label={`Graph with ${g.n} nodes and ${g.edges.length} edges${assignment !== undefined ? ", coloured by the best cut" : ""}`}>
      {g.edges.map((e, k) => {
        const cut = assignment !== undefined && side(e.u) !== side(e.v);
        const a = pos[e.u]!, b = pos[e.v]!;
        return (
          <g key={k}>
            <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={cut ? "var(--emerald)" : "var(--border-strong)"} strokeWidth={cut ? 2 : 1.2} strokeDasharray={cut ? "4 3" : undefined} />
            <text x={(a.x + b.x) / 2} y={(a.y + b.y) / 2 - 3} textAnchor="middle" fontSize={8} className="fill-muted-foreground font-mono">{e.w}</text>
          </g>
        );
      })}
      {pos.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r={10} fill={side(i) === 1 ? "var(--primary)" : "var(--card)"} stroke="var(--primary)" strokeWidth={1.5} />
          <text x={p.x} y={p.y + 3} textAnchor="middle" fontSize={9} className={`font-mono ${side(i) === 1 ? "fill-primary-foreground" : "fill-foreground"}`}>{i}</text>
        </g>
      ))}
    </svg>
  );
}

export function Arena() {
  const [graph, setGraph] = useState<Graph>(GRAPH_PRESETS[3]!.graph);
  const [cfg, setCfg] = useState({ seed: 42, p: 2, restarts: 3, maxIter: 150, shots: 1024, saSteps: 2000, greedyRestarts: 5 });
  const [rand, setRand] = useState({ n: 7, prob: 0.5 });
  const [result, setResult] = useState<ArenaResult | null>(null);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<{ label: string; frac: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const config: ArenaConfig = { graph, ...cfg };
  const errors = useMemo(() => validateArenaConfig(config), [graph, cfg]); // eslint-disable-line react-hooks/exhaustive-deps
  const stale = result !== null && JSON.stringify(result.config) !== JSON.stringify(config);

  const setNum = (k: keyof typeof cfg) => (e: React.ChangeEvent<HTMLInputElement>) => setCfg((c) => ({ ...c, [k]: Number(e.target.value) }));
  const editEdge = (i: number, patch: Partial<Graph["edges"][number]>) => setGraph((g) => ({ ...g, edges: g.edges.map((e, k) => (k === i ? { ...e, ...patch } : e)) }));

  async function run() {
    setError(null); setRunning(true); setProgress({ label: "Starting", frac: 0 });
    const ac = new AbortController(); abortRef.current = ac;
    try {
      setResult(await runArena(config, { signal: ac.signal, onProgress: (label, frac) => setProgress({ label, frac }) }));
    } catch (e) {
      setError(e instanceof DOMException && e.name === "AbortError" ? "Run cancelled." : e instanceof Error ? e.message : "Benchmark failed.");
    } finally { setRunning(false); setProgress(null); abortRef.current = null; }
  }

  const series: Series[] = result
    ? result.results.map((a) => ({
        name: a.id === "qaoa" ? `${a.name} — ⟨C⟩/C* (per ⟨C⟩ evaluation)` : a.name,
        color: COLORS[a.id] ?? "var(--primary)", dashed: a.kind === "exact",
        points: a.history.map((h) => ({ x: h.evals, y: h.best / result.optimum })),
      }))
    : [];

  const bars = result
    ? Object.entries(result.qaoa.counts).sort((a, b) => b[1] - a[1]).slice(0, 16)
        .map(([label, c]) => ({ label, value: c / result.qaoa.shots }))
    : [];

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
      {/* ---------------- Configuration ---------------- */}
      <div className="space-y-5">
        <Panel title="Problem instance">
          <label className="block font-mono text-[10px] uppercase text-muted-foreground" htmlFor="preset">Preset</label>
          <select id="preset" className={`${field} mt-1`} defaultValue="ring6" onChange={(e) => { const p = GRAPH_PRESETS.find((x) => x.id === e.target.value); if (p) setGraph(structuredClone(p.graph)); }}>
            {GRAPH_PRESETS.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <div className="mt-3 grid grid-cols-[1fr_1fr_auto] items-end gap-2">
            <label className="font-mono text-[10px] uppercase text-muted-foreground">Nodes<input type="number" min={2} max={MAX_CUT_NODES} value={rand.n} onChange={(e) => setRand((r) => ({ ...r, n: Number(e.target.value) }))} className={`${field} mt-1`} /></label>
            <label className="font-mono text-[10px] uppercase text-muted-foreground">Edge prob.<input type="number" min={0.1} max={1} step={0.05} value={rand.prob} onChange={(e) => setRand((r) => ({ ...r, prob: Number(e.target.value) }))} className={`${field} mt-1`} /></label>
            <Button type="button" size="sm" variant="outline" onClick={() => { const n = Math.min(MAX_CUT_NODES, Math.max(2, Math.round(rand.n))); setGraph(randomGraph(n, rand.prob, createRng(cfg.seed))); }} title="Random graph from the current seed">
              <Dice5 className="size-4" aria-hidden="true" />Random
            </Button>
          </div>
          <GraphView g={graph} assignment={result && !stale ? result.optimalAssignments[0] : undefined} />
          <details className="mt-2">
            <summary className="cursor-pointer font-mono text-xs text-primary">Edit edges ({graph.edges.length})</summary>
            <div className="mt-2 max-h-56 space-y-1 overflow-y-auto pr-1">
              {graph.edges.map((e, i) => (
                <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-1">
                  <input aria-label={`Edge ${i + 1} node u`} type="number" min={0} max={graph.n - 1} value={e.u} onChange={(x) => editEdge(i, { u: Number(x.target.value) })} className={field} />
                  <input aria-label={`Edge ${i + 1} node v`} type="number" min={0} max={graph.n - 1} value={e.v} onChange={(x) => editEdge(i, { v: Number(x.target.value) })} className={field} />
                  <input aria-label={`Edge ${i + 1} weight`} type="number" min={0.1} step={0.1} value={e.w} onChange={(x) => editEdge(i, { w: Number(x.target.value) })} className={field} />
                  <Button type="button" size="icon" variant="ghost" aria-label={`Remove edge ${i + 1}`} onClick={() => setGraph((g) => ({ ...g, edges: g.edges.filter((_, k) => k !== i) }))}><Trash2 className="size-4" /></Button>
                </div>
              ))}
            </div>
            <Button type="button" size="sm" variant="ghost" className="mt-2" onClick={() => setGraph((g) => ({ ...g, edges: [...g.edges, { u: 0, v: Math.min(1, g.n - 1), w: 1 }] }))}><Plus className="size-4" aria-hidden="true" />Add edge</Button>
          </details>
        </Panel>

        <Panel title="Experiment settings">
          <div className="grid grid-cols-2 gap-3">
            {([
              ["seed", "Master seed", 0, 4294967295, 1], ["p", "QAOA depth p", 1, 4, 1], ["restarts", "QAOA restarts", 1, 20, 1], ["maxIter", "Nelder–Mead iters", 10, 1000, 10],
              ["shots", "Shots / samples", 1, 100000, 1], ["saSteps", "Annealing steps", 10, 200000, 100], ["greedyRestarts", "Greedy restarts", 1, 1000, 1],
            ] as const).map(([k, label, min, max, step]) => (
              <label key={k} className="font-mono text-[10px] uppercase text-muted-foreground">{label}
                <input type="number" min={min} max={max} step={step} value={cfg[k]} onChange={setNum(k)} className={`${field} mt-1`} />
              </label>
            ))}
          </div>
          {errors.length ? <ul className="mt-3 space-y-1 text-xs text-destructive" role="alert">{errors.map((e) => <li key={e}>{e}</li>)}</ul> : null}
          <div className="mt-4 flex gap-2">
            {running ? (
              <Button type="button" variant="outline" onClick={() => abortRef.current?.abort()}><Square className="size-4" aria-hidden="true" />Cancel</Button>
            ) : (
              <Button type="button" variant="signal" disabled={errors.length > 0} onClick={run}><Play className="size-4" aria-hidden="true" />Run benchmark</Button>
            )}
          </div>
          {progress ? (
            <div className="mt-3" role="status" aria-live="polite">
              <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground"><Loader2 className="size-3.5 animate-spin" aria-hidden="true" />{progress.label} · {Math.round(progress.frac * 100)}%</div>
              <div className="mt-1 h-1 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary transition-all" style={{ width: `${progress.frac * 100}%` }} /></div>
            </div>
          ) : null}
          {error ? <p className="mt-3 text-xs text-destructive" role="alert">{error}</p> : null}
        </Panel>
      </div>

      {/* ---------------- Results ---------------- */}
      <div className="min-w-0 space-y-5">
        {!result ? (
          <Panel title="Results"><p className="text-sm text-muted-foreground">Configure an instance and press <span className="text-foreground">Run benchmark</span>. The same master seed always reproduces the same solutions and samples.</p></Panel>
        ) : (
          <>
            {stale ? <p className="rounded-sm border border-border-strong bg-card px-3 py-2 text-xs text-muted-foreground" role="status">Settings changed since this run — results below belong to the previous configuration.</p> : null}
            <Panel title="Scoreboard" aside={
              <div className="flex gap-2">
                <Button type="button" size="sm" variant="outline" onClick={() => download(`arena-seed${result.config.seed}.csv`, arenaToCsv(result), "text/csv")}><Download className="size-4" aria-hidden="true" />CSV</Button>
                <Button type="button" size="sm" variant="outline" onClick={() => download(`arena-seed${result.config.seed}.json`, arenaToJson(result), "application/json")}><Download className="size-4" aria-hidden="true" />JSON</Button>
              </div>
            }>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-left text-xs">
                  <thead className="font-mono text-[10px] uppercase text-muted-foreground">
                    <tr><th className="py-2">Algorithm</th><th>Type</th><th className="text-right">Best cut</th><th className="text-right">Ratio</th><th className="text-right">Time</th><th className="text-right">Evaluations</th></tr>
                  </thead>
                  <tbody className="font-mono">
                    {result.results.map((a) => (
                      <tr key={a.id} className="border-t border-border" title={a.notes}>
                        <td className="py-2 font-sans"><span className="mr-2 inline-block size-2 rounded-full" style={{ background: COLORS[a.id] }} aria-hidden="true" />{a.name}</td>
                        <td><span className={`rounded-full border px-2 py-0.5 text-[9px] uppercase ${a.kind === "quantum-simulated" ? "border-primary/50 text-primary" : "border-border-strong text-muted-foreground"}`}>{KIND_LABEL[a.kind]}</span></td>
                        <td className="text-right">{a.value.toFixed(2)}</td>
                        <td className={`text-right ${a.ratio >= 1 - 1e-9 ? "text-emerald" : ""}`}>{a.ratio.toFixed(4)}</td>
                        <td className="text-right">{a.timeMs < 1 ? `${(a.timeMs * 1000).toFixed(0)} µs` : `${a.timeMs.toFixed(1)} ms`}</td>
                        <td className="text-right" title={a.evaluationUnit}>{a.evaluations.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-[11px] leading-5 text-muted-foreground">
                Exact optimum C* = {result.optimum.toFixed(2)}. Ratio = best cut / C*. Evaluation units differ (cut evaluations vs exact ⟨C⟩ statevector evaluations), so counts and times are not a like-for-like cost comparison. Times are wall-clock in this browser and vary between runs.
              </p>
            </Panel>

            <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
              <Panel title="QAOA details">
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 font-mono text-xs">
                  <dt className="text-muted-foreground">⟨C⟩ (expected cut)</dt><dd>{result.qaoa.expectation.toFixed(4)}</dd>
                  <dt className="text-muted-foreground">⟨C⟩ / C*</dt><dd>{result.qaoa.expectationRatio.toFixed(4)}</dd>
                  <dt className="text-muted-foreground">P(optimal cut)</dt><dd>{(result.qaoa.pOptimal * 100).toFixed(2)}%</dd>
                  <dt className="text-muted-foreground">γ</dt><dd className="break-all">[{result.qaoa.gammas.map((x) => x.toFixed(4)).join(", ")}]</dd>
                  <dt className="text-muted-foreground">β</dt><dd className="break-all">[{result.qaoa.betas.map((x) => x.toFixed(4)).join(", ")}]</dd>
                </dl>
                <p className="mt-3 text-[11px] leading-5 text-muted-foreground">
                  H_C = Σ w_uv (1 − Z_u Z_v)/2. Circuit: H⊗ⁿ, then p × [e^(−iγH_C) via CNOT·Rz·CNOT per edge, Rx(2β) mixer]. Parameters optimised by Nelder–Mead from seeded random starts.
                </p>
              </Panel>
              <Panel title={`QAOA samples (top ${bars.length} of ${Object.keys(result.qaoa.counts).length})`}>
                <Histogram bars={bars} valueFormat={(v) => `${(v * 100).toFixed(2)}%`} ariaLabel="Distribution of measured bitstrings from the optimised QAOA state" />
                <p className="mt-2 font-mono text-[10px] text-muted-foreground">Bitstrings q{result.config.graph.n - 1}…q0 · optimal: {result.optimalAssignments.map((z) => z.toString(2).padStart(result.config.graph.n, "0")).join(", ")}</p>
              </Panel>
            </div>

            <Panel title="Convergence (best-so-far / C*)">
              <LineChart series={series} yLabel="approximation ratio" xLabel="evaluations (log scale)" yMin={Math.max(0, Math.min(0.5, ...series.flatMap((s) => s.points.map((p) => p.y))) - 0.05)} yMax={1.02} ariaLabel="Best-so-far approximation ratio versus number of evaluations for each algorithm" />
            </Panel>

            <Panel title="Environment & reproducibility">
              <dl className="grid gap-x-4 gap-y-1.5 font-mono text-[11px] sm:grid-cols-[160px_1fr]">
                {Object.entries(result.environment).map(([k, v]) => (<Fragment key={k}><dt className="text-muted-foreground">{k}</dt><dd className="break-all">{v}</dd></Fragment>))}
                <dt className="text-muted-foreground">master seed</dt><dd>{result.config.seed}</dd>
                <dt className="text-muted-foreground">run at</dt><dd>{result.createdAt}</dd>
              </dl>
              <p className="mt-3 text-[11px] leading-5 text-muted-foreground">
                Simulator results only. Small instances are solved instantly by exhaustive search; this arena illustrates algorithm behaviour and does not show quantum advantage. Real hardware adds noise, limited connectivity and shot costs not modelled here.
              </p>
            </Panel>
          </>
        )}
      </div>
    </div>
  );
}
