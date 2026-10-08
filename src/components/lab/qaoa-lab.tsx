import { useMemo, useRef, useState } from "react";
import { Loader2, Play, Plus, RotateCcw, Square, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Histogram, Panel } from "./charts";
import { LineChart } from "./line-chart";
import {
  costHamiltonianTerms,
  evaluateAngles,
  GRAPH_PRESETS,
  MAX_CUT_NODES,
  mixerHamiltonianTerms,
  QAOA_LAB_MAX_P,
  runQaoaLab,
  validateAngles,
  validateGraph,
  validateQaoaLabConfig,
  type Graph,
  type QaoaLabResult,
} from "@/lib/quantum";

const field =
  "w-full rounded-sm border border-border bg-surface px-2 py-1.5 font-mono text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const DEFAULTS = { p: 1, seed: 42, restarts: 3, maxIter: 150 };
const DEFAULT_PRESET = "k4w";
const fmt = (x: number, d = 4) => (Number.isFinite(x) ? x.toFixed(d) : "—");

/** Circular-layout graph. When `assignment` is given, partition S (bit=1) is filled and cut edges are highlighted emerald. */
function GraphView({
  g,
  assignment,
  label,
}: {
  g: Graph;
  assignment?: number | undefined;
  label: string;
}) {
  const pos = Array.from({ length: g.n }, (_, i) => {
    const a = (2 * Math.PI * i) / g.n - Math.PI / 2;
    return { x: 110 + 78 * Math.cos(a), y: 110 + 78 * Math.sin(a) };
  });
  const side = (i: number) => (assignment === undefined ? -1 : (assignment >> i) & 1);
  const valid = g.edges.every((e) => e.u >= 0 && e.v >= 0 && e.u < g.n && e.v < g.n);
  return (
    <svg viewBox="0 0 220 220" className="mx-auto h-60 w-60" role="img" aria-label={label}>
      {valid &&
        g.edges.map((e, k) => {
          const cut = assignment !== undefined && side(e.u) !== side(e.v);
          const a = pos[e.u]!,
            b = pos[e.v]!;
          return (
            <g key={k}>
              <line
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke={cut ? "var(--emerald)" : "var(--border-strong)"}
                strokeWidth={cut ? 2.5 : 1.2}
                strokeDasharray={cut ? "5 3" : undefined}
              />
              <text
                x={(a.x + b.x) / 2}
                y={(a.y + b.y) / 2 - 3}
                textAnchor="middle"
                fontSize={8}
                className="fill-muted-foreground font-mono"
              >
                {e.w}
              </text>
            </g>
          );
        })}
      {pos.map((p, i) => (
        <g key={i}>
          <circle
            cx={p.x}
            cy={p.y}
            r={11}
            fill={side(i) === 1 ? "var(--primary)" : "var(--card)"}
            stroke="var(--primary)"
            strokeWidth={1.5}
          />
          <text
            x={p.x}
            y={p.y + 3}
            textAnchor="middle"
            fontSize={9}
            className={`font-mono ${side(i) === 1 ? "fill-primary-foreground" : "fill-foreground"}`}
          >
            {i}
          </text>
        </g>
      ))}
    </svg>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-sm border border-border bg-surface p-3">
      <div className="font-mono text-[10px] uppercase text-muted-foreground">{label}</div>
      <div className="mt-1 font-mono text-lg text-foreground">{value}</div>
      {hint ? <div className="mt-0.5 text-[11px] text-muted-foreground">{hint}</div> : null}
    </div>
  );
}

export function QaoaLab() {
  const initial = () => structuredClone(GRAPH_PRESETS.find((p) => p.id === DEFAULT_PRESET)!.graph);
  const [preset, setPreset] = useState(DEFAULT_PRESET);
  const [graph, setGraph] = useState<Graph>(initial);
  const [cfg, setCfg] = useState(DEFAULTS);
  const [result, setResult] = useState<QaoaLabResult | null>(null);
  const [angles, setAngles] = useState<{ g: number[]; b: number[] }>({ g: [0.6], b: [0.3] });
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const config = { graph, ...cfg };
  const errors = useMemo(() => validateQaoaLabConfig(config), [graph, cfg]); // eslint-disable-line react-hooks/exhaustive-deps
  const graphOk = validateGraph(graph).length === 0;
  const stale = result !== null && JSON.stringify(result.config) !== JSON.stringify(config);

  // Keep manual angle arrays sized to p.
  const g = Array.from({ length: cfg.p }, (_, k) => angles.g[k] ?? 0.5);
  const b = Array.from({ length: cfg.p }, (_, k) => angles.b[k] ?? 0.25);
  const angleErrors = validateAngles(g, b, cfg.p);
  const manual = useMemo(
    () =>
      graphOk && !angleErrors.length && cfg.p >= 1 && cfg.p <= QAOA_LAB_MAX_P
        ? evaluateAngles(graph, g, b)
        : null,
    [graph, JSON.stringify(g), JSON.stringify(b), graphOk],
  ); // eslint-disable-line react-hooks/exhaustive-deps

  const setNum = (k: keyof typeof cfg) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setCfg((c) => ({ ...c, [k]: Number(e.target.value) }));
  const editEdge = (i: number, patch: Partial<Graph["edges"][number]>) =>
    setGraph((x) => ({ ...x, edges: x.edges.map((e, k) => (k === i ? { ...e, ...patch } : e)) }));

  function reset() {
    abortRef.current?.abort();
    setPreset(DEFAULT_PRESET);
    setGraph(initial());
    setCfg(DEFAULTS);
    setResult(null);
    setError(null);
    setAngles({ g: [0.6], b: [0.3] });
  }

  async function run() {
    setError(null);
    setRunning(true);
    setProgress(0);
    const ac = new AbortController();
    abortRef.current = ac;
    try {
      const r = await runQaoaLab(config, { signal: ac.signal, onProgress: setProgress });
      setResult(r);
      setAngles({ g: r.gammas.slice(), b: r.betas.slice() });
    } catch (e) {
      setError(
        e instanceof DOMException && e.name === "AbortError"
          ? "Run cancelled."
          : e instanceof Error
            ? e.message
            : "Optimisation failed.",
      );
    } finally {
      setRunning(false);
      abortRef.current = null;
    }
  }

  const shown = result && !stale ? result : null;

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
      {/* ---------- Configuration ---------- */}
      <div className="space-y-5">
        <Panel
          title="Graph"
          aside={
            <Button type="button" size="sm" variant="ghost" onClick={reset}>
              <RotateCcw className="size-4" aria-hidden="true" />
              Reset
            </Button>
          }
        >
          <label
            className="block font-mono text-[10px] uppercase text-muted-foreground"
            htmlFor="qaoa-preset"
          >
            Preset
          </label>
          <select
            id="qaoa-preset"
            className={`${field} mt-1`}
            value={preset}
            onChange={(e) => {
              const p = GRAPH_PRESETS.find((x) => x.id === e.target.value);
              setPreset(e.target.value);
              if (p) setGraph(structuredClone(p.graph));
            }}
          >
            {GRAPH_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <label className="mt-3 block font-mono text-[10px] uppercase text-muted-foreground">
            Nodes (2–{MAX_CUT_NODES})
            <input
              type="number"
              min={2}
              max={MAX_CUT_NODES}
              value={graph.n}
              onChange={(e) => setGraph((x) => ({ ...x, n: Number(e.target.value) }))}
              className={`${field} mt-1`}
            />
          </label>
          <GraphView
            g={graph}
            assignment={shown ? shown.optimalAssignments[0] : undefined}
            label={`Graph with ${graph.n} nodes and ${graph.edges.length} edges${shown ? "; filled nodes and dashed emerald edges show an optimal cut" : ""}`}
          />
          {shown ? (
            <p className="text-center font-mono text-[10px] text-muted-foreground">
              Highlighted: exact optimal cut (value {fmt(shown.optimum, 2)})
            </p>
          ) : null}
          <details className="mt-2" open>
            <summary className="cursor-pointer font-mono text-xs text-primary">
              Edges: u · v · weight ({graph.edges.length})
            </summary>
            <div className="mt-2 max-h-56 space-y-1 overflow-y-auto pr-1">
              {graph.edges.map((e, i) => (
                <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-1">
                  <input
                    aria-label={`Edge ${i + 1} node u`}
                    type="number"
                    min={0}
                    max={graph.n - 1}
                    value={e.u}
                    onChange={(x) => editEdge(i, { u: Number(x.target.value) })}
                    className={field}
                  />
                  <input
                    aria-label={`Edge ${i + 1} node v`}
                    type="number"
                    min={0}
                    max={graph.n - 1}
                    value={e.v}
                    onChange={(x) => editEdge(i, { v: Number(x.target.value) })}
                    className={field}
                  />
                  <input
                    aria-label={`Edge ${i + 1} weight`}
                    type="number"
                    min={0.1}
                    step={0.1}
                    value={e.w}
                    onChange={(x) => editEdge(i, { w: Number(x.target.value) })}
                    className={field}
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label={`Remove edge ${i + 1}`}
                    onClick={() =>
                      setGraph((x) => ({ ...x, edges: x.edges.filter((_, k) => k !== i) }))
                    }
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="mt-2"
              onClick={() =>
                setGraph((x) => ({
                  ...x,
                  edges: [...x.edges, { u: 0, v: Math.min(1, x.n - 1), w: 1 }],
                }))
              }
            >
              <Plus className="size-4" aria-hidden="true" />
              Add edge
            </Button>
          </details>
        </Panel>

        <Panel title="QAOA settings">
          <div className="grid grid-cols-2 gap-3">
            {(
              [
                ["p", `Depth p (1–${QAOA_LAB_MAX_P})`, 1, QAOA_LAB_MAX_P, 1],
                ["seed", "Seed", 0, 4294967295, 1],
                ["restarts", "Restarts", 1, 20, 1],
                ["maxIter", "Nelder–Mead iters", 10, 1000, 10],
              ] as const
            ).map(([k, label, min, max, step]) => (
              <label key={k} className="font-mono text-[10px] uppercase text-muted-foreground">
                {label}
                <input
                  type="number"
                  min={min}
                  max={max}
                  step={step}
                  value={cfg[k]}
                  onChange={setNum(k)}
                  className={`${field} mt-1`}
                />
              </label>
            ))}
          </div>
          {errors.length ? (
            <ul className="mt-3 space-y-1 text-xs text-destructive" role="alert">
              {errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          ) : null}
          <div className="mt-4 flex gap-2">
            {running ? (
              <Button type="button" variant="outline" onClick={() => abortRef.current?.abort()}>
                <Square className="size-4" aria-hidden="true" />
                Cancel
              </Button>
            ) : (
              <Button type="button" variant="signal" disabled={errors.length > 0} onClick={run}>
                <Play className="size-4" aria-hidden="true" />
                Optimise parameters
              </Button>
            )}
          </div>
          {running ? (
            <div className="mt-3" role="status" aria-live="polite">
              <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
                <Loader2
                  className="size-3.5 animate-spin motion-reduce:animate-none"
                  aria-hidden="true"
                />
                Optimising… {Math.round(progress * 100)}%
              </div>
              <div className="mt-1 h-1 overflow-hidden rounded-full bg-muted">
                <div className="h-full bg-primary" style={{ width: `${progress * 100}%` }} />
              </div>
            </div>
          ) : null}
          {error ? (
            <p className="mt-3 text-xs text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          {stale ? (
            <p className="mt-3 text-xs text-amber">
              Settings changed since the last run — re-run to update results.
            </p>
          ) : null}
        </Panel>

        <Panel title="Hamiltonians">
          <div className="space-y-3 font-mono text-[11px] leading-5">
            <div>
              <div className="text-muted-foreground">Cost C =</div>
              <div className="break-words text-foreground">
                {graphOk ? costHamiltonianTerms(graph) : "—"}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Mixer B =</div>
              <div className="text-foreground">
                {graphOk ? mixerHamiltonianTerms(graph.n) : "—"}
              </div>
            </div>
            <div className="text-muted-foreground">
              |γ,β⟩ = Π<sub>k</sub> e
              <sup>
                −iβ<sub>k</sub>B
              </sup>{" "}
              e
              <sup>
                −iγ<sub>k</sub>C
              </sup>{" "}
              |+⟩<sup>⊗n</sup>
            </div>
          </div>
        </Panel>
      </div>

      {/* ---------- Results ---------- */}
      <div className="min-w-0 space-y-5">
        <div className="rounded-md border border-amber/40 bg-amber/5 p-3 text-xs leading-5 text-muted-foreground">
          <strong className="text-amber">Ideal noiseless classical simulation.</strong> Not quantum
          hardware results and not evidence of quantum advantage. The exhaustive optimum is computed
          by brute force over all 2ⁿ assignments.
        </div>

        <Panel
          title="Parameter inspector"
          aside={
            <span className="font-mono text-[10px] text-muted-foreground">live, exact ⟨C⟩</span>
          }
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {g.map((_, k) => (
              <div key={k} className="space-y-2 rounded-sm border border-border p-3">
                {(["g", "b"] as const).map((key) => {
                  const arr = key === "g" ? g : b;
                  const max = key === "g" ? Math.PI : Math.PI / 2;
                  const name = key === "g" ? `γ${k + 1}` : `β${k + 1}`;
                  const set = (v: number) =>
                    setAngles((a) => {
                      const next = key === "g" ? g.slice() : b.slice();
                      next[k] = v;
                      return { ...a, [key]: next };
                    });
                  return (
                    <label
                      key={key}
                      className="block font-mono text-[10px] uppercase text-muted-foreground"
                    >
                      <span className="flex justify-between normal-case">
                        <span>{name}</span>
                        <span className="text-foreground">{fmt(arr[k]!)}</span>
                      </span>
                      <div className="mt-1 flex items-center gap-2">
                        <input
                          type="range"
                          min={-max}
                          max={max}
                          step={0.001}
                          value={arr[k]}
                          onChange={(e) => set(Number(e.target.value))}
                          className="w-full accent-[var(--primary)]"
                          aria-label={`${name} slider`}
                        />
                        <input
                          type="number"
                          step={0.01}
                          value={+arr[k]!.toFixed(4)}
                          onChange={(e) => set(Number(e.target.value))}
                          className={`${field} w-24`}
                          aria-label={`${name} value`}
                        />
                      </div>
                    </label>
                  );
                })}
              </div>
            ))}
          </div>
          {angleErrors.length ? (
            <p className="mt-3 text-xs text-destructive" role="alert">
              {angleErrors.join(" ")}
            </p>
          ) : null}
          {manual ? (
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="⟨C⟩" value={fmt(manual.expectation)} />
              <Stat label="Optimum C*" value={fmt(manual.optimum, 2)} />
              <Stat label="Ratio ⟨C⟩/C*" value={fmt(manual.approxRatio)} />
              <Stat label="P(optimal)" value={`${(manual.pOptimal * 100).toFixed(2)}%`} />
            </div>
          ) : null}
          <p className="mt-3 text-[11px] text-muted-foreground">
            After a run, the sliders load the optimised angles; move them to see how ⟨C⟩ changes.
          </p>
        </Panel>

        {shown ? (
          <>
            <Panel title="QAOA vs exhaustive classical optimum">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                <Stat label="Expected cost ⟨C⟩" value={fmt(shown.expectation)} />
                <Stat
                  label="Exact optimum C*"
                  value={fmt(shown.optimum, 2)}
                  hint={`${shown.optimalAssignments.length} optimal assignment(s)`}
                />
                <Stat label="Approx. ratio" value={fmt(shown.approxRatio)} hint="⟨C⟩ / C*" />
                <Stat label="P(optimal cut)" value={`${(shown.pOptimal * 100).toFixed(2)}%`} />
                <Stat
                  label="Most likely bitstring"
                  value={shown.mostLikely.bits}
                  hint={`cut ${fmt(shown.mostLikely.cut, 2)} · p ${fmt(shown.mostLikely.prob)}`}
                />
                <Stat
                  label="Objective evaluations"
                  value={String(shown.evaluations)}
                  hint={`seed ${shown.config.seed} · p=${shown.config.p}`}
                />
              </div>
              <div className="mt-4 overflow-x-auto font-mono text-[11px]">
                <table className="w-full min-w-[300px]">
                  <thead className="text-left text-muted-foreground">
                    <tr>
                      <th className="py-1 font-normal">Layer</th>
                      <th className="font-normal">γ</th>
                      <th className="font-normal">β</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shown.gammas.map((x, k) => (
                      <tr key={k} className="border-t border-border">
                        <td className="py-1">{k + 1}</td>
                        <td>{fmt(x)}</td>
                        <td>{fmt(shown.betas[k]!)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>

            <Panel title="Optimisation history">
              <LineChart
                ariaLabel="Best approximation ratio found versus objective evaluations"
                xLabel="objective evaluations (log)"
                yLabel="best ⟨C⟩ / C*"
                series={[
                  {
                    name: "QAOA best ⟨C⟩/C*",
                    color: "var(--primary)",
                    points: shown.history.map((h) => ({ x: h.evals, y: h.best / shown.optimum })),
                  },
                  {
                    name: "Exact optimum",
                    color: "var(--emerald)",
                    dashed: true,
                    points: [{ x: 1, y: 1 }],
                  },
                ]}
              />
            </Panel>

            <Panel
              title="Final bitstring distribution"
              aside={
                <span className="font-mono text-[10px] text-muted-foreground">
                  top {shown.top.length} of {2 ** shown.config.graph.n} · exact probabilities
                </span>
              }
            >
              <Histogram
                ariaLabel="Probability of each bitstring in the optimised QAOA state"
                valueFormat={(v) => `${(v * 100).toFixed(2)}%`}
                bars={shown.top.map((t) => ({ label: t.bits, value: t.prob }))}
              />
              <div className="mt-3 overflow-x-auto font-mono text-[11px]">
                <table className="w-full min-w-[320px]">
                  <thead className="text-left text-muted-foreground">
                    <tr>
                      <th className="py-1 font-normal">
                        Bitstring (q{shown.config.graph.n - 1}…q0)
                      </th>
                      <th className="font-normal">Prob.</th>
                      <th className="font-normal">Cut</th>
                      <th className="font-normal" />
                    </tr>
                  </thead>
                  <tbody>
                    {shown.top.slice(0, 8).map((t) => (
                      <tr key={t.z} className="border-t border-border">
                        <td className="py-1">{t.bits}</td>
                        <td>{(t.prob * 100).toFixed(2)}%</td>
                        <td>{fmt(t.cut, 2)}</td>
                        <td>{t.optimal ? <span className="text-emerald">optimal</span> : null}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          </>
        ) : (
          <Panel title="Results">
            <p className="text-sm text-muted-foreground">
              Press <strong>Optimise parameters</strong> to run seeded Nelder–Mead optimisation of
              (γ, β).
            </p>
          </Panel>
        )}

        <Panel title="Limitations">
          <ul className="list-disc space-y-1 pl-5 text-xs leading-5 text-muted-foreground">
            <li>
              Exact statevector simulation of 2ⁿ amplitudes; limited to {MAX_CUT_NODES} nodes. No
              noise, decoherence or gate errors.
            </li>
            <li>
              Probabilities are exact, not sampled; real devices estimate ⟨C⟩ from finite shots.
            </li>
            <li>
              Nelder–Mead may find local optima; results depend on seed, restarts and iterations.
            </li>
            <li>
              For graphs this small, exhaustive search is exact and faster. Nothing here shows
              quantum advantage.
            </li>
          </ul>
        </Panel>
      </div>
    </div>
  );
}
