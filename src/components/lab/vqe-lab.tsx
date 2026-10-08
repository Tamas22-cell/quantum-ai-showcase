import { useMemo, useRef, useState } from "react";
import { Loader2, Play, Plus, RotateCcw, Square, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Histogram, Panel } from "./charts";
import { LineChart } from "./line-chart";
import { CircuitDiagram } from "./circuit-diagram";
import {
  ansatzCircuit,
  exactSpectrum,
  formatHamiltonian,
  HAMILTONIAN_PRESETS,
  hamiltonianMatrix,
  OPTIMIZERS,
  paramCount,
  runVqe,
  toBitstring,
  validateHamiltonian,
  validateVqeConfig,
  VQE_MAX_DEPTH,
  VQE_MAX_QUBITS,
  VQE_MAX_TERMS,
  type Hamiltonian,
  type OptimizerName,
  type Rotations,
  type VqeResult,
} from "@/lib/quantum";

const field =
  "w-full rounded-sm border border-border bg-surface px-2 py-1.5 font-mono text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const label = "font-mono text-[10px] uppercase text-muted-foreground";
const DEFAULT_PRESET = "h2";
const DEFAULTS = {
  depth: 1,
  rotations: "ry" as Rotations,
  optimizer: "nelder-mead" as OptimizerName,
  maxIter: 200,
  restarts: 3,
  seed: 42,
};
const fmt = (x: number, d = 6) => (Number.isFinite(x) ? x.toFixed(d) : "—");
const presetH = (id: string) => structuredClone(HAMILTONIAN_PRESETS.find((p) => p.id === id)!.h);
const cplx = (re: number, im: number) =>
  `${fmt(re, 3)}${im < 0 ? " − " : " + "}${fmt(Math.abs(im), 3)}i`;

function Stat({
  label: l,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint?: string | undefined;
  accent?: boolean;
}) {
  return (
    <div className="rounded-sm border border-border bg-surface p-3">
      <div className="font-mono text-[10px] uppercase text-muted-foreground">{l}</div>
      <div
        className={`mt-1 break-all font-mono text-base ${accent ? "text-emerald" : "text-foreground"}`}
      >
        {value}
      </div>
      {hint ? <div className="mt-0.5 text-[11px] text-muted-foreground">{hint}</div> : null}
    </div>
  );
}

export function VqeLab() {
  const [preset, setPreset] = useState(DEFAULT_PRESET);
  const [h, setH] = useState<Hamiltonian>(() => presetH(DEFAULT_PRESET));
  const [cfg, setCfg] = useState(DEFAULTS);
  const [result, setResult] = useState<VqeResult | null>(null);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState({ f: 0, current: NaN });
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const config = { hamiltonian: h, ...cfg };
  const hErrors = validateHamiltonian(h);
  const errors = useMemo(() => validateVqeConfig(config), [JSON.stringify(config)]);
  const exact = useMemo(() => {
    try {
      return hErrors.length ? null : exactSpectrum(h);
    } catch {
      return null;
    }
  }, [JSON.stringify(h)]);
  const matrix = useMemo(() => {
    try {
      return hErrors.length ? null : hamiltonianMatrix(h);
    } catch {
      return null;
    }
  }, [JSON.stringify(h)]);
  const stale = result !== null && JSON.stringify(result.config) !== JSON.stringify(config);
  const shown = result && !stale ? result : null;
  const np =
    !hErrors.length && Number.isInteger(cfg.depth) && cfg.depth >= 0 && cfg.depth <= VQE_MAX_DEPTH
      ? paramCount(h.n, cfg.depth, cfg.rotations)
      : 0;
  const previewCircuit = shown
    ? shown.circuit
    : np
      ? ansatzCircuit(h.n, cfg.depth, cfg.rotations, new Array(np).fill(0))
      : null;

  const setNum =
    (k: "depth" | "maxIter" | "restarts" | "seed") => (e: React.ChangeEvent<HTMLInputElement>) =>
      setCfg((c) => ({ ...c, [k]: e.target.value === "" ? NaN : Number(e.target.value) }));
  const editTerm = (i: number, patch: Partial<Hamiltonian["terms"][number]>) => {
    setPreset("custom");
    setH((x) => ({ ...x, terms: x.terms.map((t, k) => (k === i ? { ...t, ...patch } : t)) }));
  };

  function choosePreset(id: string) {
    setPreset(id);
    setH(presetH(id));
  }
  function reset() {
    abortRef.current?.abort();
    setPreset(DEFAULT_PRESET);
    setH(presetH(DEFAULT_PRESET));
    setCfg(DEFAULTS);
    setResult(null);
    setError(null);
  }

  async function run() {
    setError(null);
    setRunning(true);
    setProgress({ f: 0, current: NaN });
    const ac = new AbortController();
    abortRef.current = ac;
    try {
      setResult(
        await runVqe(config, {
          signal: ac.signal,
          onProgress: (f, current) => setProgress({ f, current }),
        }),
      );
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

  const hist = shown?.history ?? [];
  const yAll = hist.flatMap((p) => [p.current, p.best]).concat(shown ? [shown.exact] : []);
  const yMin = yAll.length ? Math.min(...yAll) : -1,
    yMax = yAll.length ? Math.max(...yAll) : 1;
  const pad = (yMax - yMin) * 0.05 || 0.1;
  const errSeries = hist.map((p) => ({
    x: p.iter,
    y: Math.log10(Math.max(1e-12, p.best - (shown?.exact ?? 0))),
  }));

  return (
    <div className="space-y-5">
      <p
        className="rounded-md border border-amber/40 bg-amber/10 px-4 py-3 text-xs leading-6 text-foreground"
        role="note"
      >
        <strong>
          Ideal noiseless classical statevector simulation. Not quantum hardware. No claim of
          quantum advantage.
        </strong>{" "}
        Every energy, statevector and probability below is computed exactly on your computer.
      </p>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,400px)_minmax(0,1fr)]">
        {/* ---------- Configuration ---------- */}
        <div className="space-y-5">
          <Panel
            title="Hamiltonian"
            aside={
              <Button type="button" size="sm" variant="ghost" onClick={reset}>
                <RotateCcw className="size-4" aria-hidden="true" />
                Reset
              </Button>
            }
          >
            <label className={label} htmlFor="vqe-preset">
              Preset
            </label>
            <select
              id="vqe-preset"
              className={`${field} mt-1`}
              value={preset}
              onChange={(e) => choosePreset(e.target.value)}
            >
              {HAMILTONIAN_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <p className="mt-2 text-[11px] leading-5 text-muted-foreground">
              {HAMILTONIAN_PRESETS.find((p) => p.id === preset)?.note}
            </p>
            <label className={`${label} mt-3 block`}>
              Qubits (1–{VQE_MAX_QUBITS})
              <input
                type="number"
                min={1}
                max={VQE_MAX_QUBITS}
                value={Number.isFinite(h.n) ? h.n : ""}
                className={`${field} mt-1`}
                onChange={(e) => {
                  setPreset("custom");
                  setH((x) => ({ ...x, n: e.target.value === "" ? NaN : Number(e.target.value) }));
                }}
              />
            </label>
            <div className="mt-3 space-y-1">
              <div className="grid grid-cols-[1fr_1fr_auto] gap-1">
                <span className={label}>Coefficient</span>
                <span className={label}>Pauli (q{Math.max(0, (h.n || 1) - 1)}…q0)</span>
                <span className="w-9" />
              </div>
              {h.terms.map((t, i) => (
                <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-1">
                  <input
                    aria-label={`Term ${i + 1} coefficient`}
                    type="number"
                    step={0.1}
                    value={Number.isFinite(t.coef) ? t.coef : ""}
                    className={field}
                    onChange={(e) =>
                      editTerm(i, { coef: e.target.value === "" ? NaN : Number(e.target.value) })
                    }
                  />
                  <input
                    aria-label={`Term ${i + 1} Pauli string`}
                    value={t.pauli}
                    maxLength={8}
                    className={`${field} uppercase`}
                    onChange={(e) => editTerm(i, { pauli: e.target.value.toUpperCase() })}
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label={`Remove term ${i + 1}`}
                    onClick={() => {
                      setPreset("custom");
                      setH((x) => ({ ...x, terms: x.terms.filter((_, k) => k !== i) }));
                    }}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={h.terms.length >= VQE_MAX_TERMS}
                onClick={() => {
                  setPreset("custom");
                  setH((x) => ({
                    ...x,
                    terms: [
                      ...x.terms,
                      { coef: 0.5, pauli: "Z".padStart(Number.isFinite(x.n) ? x.n : 1, "I") },
                    ],
                  }));
                }}
              >
                <Plus className="size-4" aria-hidden="true" />
                Add term
              </Button>
            </div>
            {hErrors.length ? (
              <ul className="mt-2 space-y-1 text-xs text-destructive" role="alert">
                {hErrors.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 break-words font-mono text-[11px] text-foreground">
                H = {formatHamiltonian(h)}
              </p>
            )}
          </Panel>

          <Panel title="Ansatz & optimizer">
            <div className="grid grid-cols-2 gap-3">
              <label className={label}>
                Rotations
                <select
                  className={`${field} mt-1`}
                  value={cfg.rotations}
                  onChange={(e) =>
                    setCfg((c) => ({ ...c, rotations: e.target.value as Rotations }))
                  }
                >
                  <option value="ry">Ry</option>
                  <option value="ryrz">Ry + Rz</option>
                </select>
              </label>
              <label className={label}>
                Depth (0–{VQE_MAX_DEPTH})
                <input
                  type="number"
                  min={0}
                  max={VQE_MAX_DEPTH}
                  value={Number.isFinite(cfg.depth) ? cfg.depth : ""}
                  onChange={setNum("depth")}
                  className={`${field} mt-1`}
                />
              </label>
              <label className={`${label} col-span-2`}>
                Optimizer
                <select
                  className={`${field} mt-1`}
                  value={cfg.optimizer}
                  onChange={(e) =>
                    setCfg((c) => ({ ...c, optimizer: e.target.value as OptimizerName }))
                  }
                >
                  {OPTIMIZERS.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
                <span className="mt-1 block normal-case tracking-normal text-muted-foreground">
                  {OPTIMIZERS.find((o) => o.id === cfg.optimizer)?.note}
                </span>
              </label>
              <label className={label}>
                Iterations (1–2000)
                <input
                  type="number"
                  min={1}
                  max={2000}
                  value={Number.isFinite(cfg.maxIter) ? cfg.maxIter : ""}
                  onChange={setNum("maxIter")}
                  className={`${field} mt-1`}
                />
              </label>
              <label className={label}>
                Restarts (1–10)
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={Number.isFinite(cfg.restarts) ? cfg.restarts : ""}
                  onChange={setNum("restarts")}
                  className={`${field} mt-1`}
                />
              </label>
              <label className={`${label} col-span-2`}>
                Seed
                <input
                  type="number"
                  min={0}
                  max={4294967295}
                  value={Number.isFinite(cfg.seed) ? cfg.seed : ""}
                  onChange={setNum("seed")}
                  className={`${field} mt-1`}
                />
              </label>
            </div>
            <p className="mt-2 font-mono text-[11px] text-muted-foreground">
              Parameters: {np || "—"}
            </p>
            {errors.length && !hErrors.length ? (
              <ul className="mt-2 space-y-1 text-xs text-destructive" role="alert">
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
                  Run VQE
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
                  Optimising… {Math.round(progress.f * 100)}% · current E = {fmt(progress.current)}
                </div>
                <div className="mt-1 h-1 overflow-hidden rounded-full bg-muted">
                  <div className="h-full bg-primary" style={{ width: `${progress.f * 100}%` }} />
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

          <Panel title="Hamiltonian matrix">
            {matrix && matrix.dim <= 8 ? (
              <div className="overflow-x-auto">
                <table className="font-mono text-[10px]">
                  <tbody>
                    {Array.from({ length: matrix.dim }, (_, i) => (
                      <tr key={i}>
                        {Array.from({ length: matrix.dim }, (_, j) => {
                          const re = matrix.re[i * matrix.dim + j]!,
                            im = matrix.im[i * matrix.dim + j]!;
                          const zero = Math.abs(re) < 1e-12 && Math.abs(im) < 1e-12;
                          return (
                            <td
                              key={j}
                              className={`whitespace-nowrap px-1.5 py-0.5 text-right ${zero ? "text-muted-foreground/50" : "text-foreground"}`}
                            >
                              {zero ? "0" : Math.abs(im) < 1e-12 ? fmt(re, 3) : cplx(re, im)}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : matrix ? (
              <p className="text-xs text-muted-foreground">
                {matrix.dim}×{matrix.dim} matrix — too large to display legibly; eigenvalues below.
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Fix the Hamiltonian to see its matrix.
              </p>
            )}
            {exact ? (
              <p className="mt-3 break-words font-mono text-[11px] text-muted-foreground">
                Exact eigenvalues (diagonalisation):{" "}
                {exact.eigenvalues.map((v) => fmt(v, 4)).join(", ")}
              </p>
            ) : null}
          </Panel>
        </div>

        {/* ---------- Results ---------- */}
        <div className="min-w-0 space-y-5">
          <Panel title="Energies">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <Stat
                label="Current energy"
                value={
                  running
                    ? fmt(progress.current)
                    : shown
                      ? fmt(shown.history.at(-1)?.current ?? NaN)
                      : "—"
                }
                hint="Last optimizer evaluation"
              />
              <Stat label="Best VQE energy" value={shown ? fmt(shown.energy) : "—"} accent />
              <Stat
                label="Exact ground energy"
                value={exact ? fmt(exact.ground) : "—"}
                hint={
                  exact && exact.degeneracy > 1
                    ? `${exact.degeneracy}-fold degenerate`
                    : "Exact diagonalisation"
                }
              />
              <Stat
                label="Energy error"
                value={shown ? shown.error.toExponential(2) : "—"}
                hint="E_VQE − E_exact (≥ 0)"
              />
              <Stat
                label="Fidelity"
                value={shown ? fmt(shown.fidelity, 6) : "—"}
                hint="Overlap with exact ground space"
              />
              <Stat
                label="Evaluations"
                value={shown ? String(shown.evaluations) : "—"}
                hint={shown ? `${shown.config.restarts} restart(s)` : undefined}
              />
            </div>
            {shown ? (
              <p className="mt-3 font-mono text-[11px] text-muted-foreground">
                Per-restart best: {shown.restartEnergies.map((e) => fmt(e, 5)).join(" · ")}
              </p>
            ) : null}
          </Panel>

          <Panel title="Optimization history">
            {hist.length ? (
              <>
                <LineChart
                  ariaLabel="Energy per iteration: current, best so far, and exact ground energy"
                  xLabel="Iteration (all restarts)"
                  yLabel="Energy"
                  yMin={yMin - pad}
                  yMax={yMax + pad}
                  series={[
                    {
                      name: "Current",
                      color: "var(--muted-foreground)",
                      points: hist.map((p) => ({ x: p.iter, y: p.current })),
                    },
                    {
                      name: "Best so far",
                      color: "var(--primary)",
                      points: hist.map((p) => ({ x: p.iter, y: p.best })),
                    },
                    {
                      name: "Exact ground",
                      color: "var(--emerald)",
                      dashed: true,
                      points: [
                        { x: 0, y: shown!.exact },
                        { x: hist.at(-1)!.iter, y: shown!.exact },
                      ],
                    },
                  ]}
                />
                <h3 className="mt-5 font-mono text-[10px] uppercase text-muted-foreground">
                  Energy convergence — log₁₀(E_best − E_exact)
                </h3>
                <LineChart
                  ariaLabel="Log10 energy error of best-so-far energy per iteration"
                  xLabel="Iteration"
                  yLabel="log₁₀ error"
                  yMin={-12}
                  yMax={Math.max(1, ...errSeries.map((p) => p.y))}
                  series={[{ name: "log₁₀ error", color: "var(--emerald)", points: errSeries }]}
                />
              </>
            ) : (
              <p className="text-xs text-muted-foreground">
                Run VQE to see the optimization history.
              </p>
            )}
          </Panel>

          <Panel title={shown ? "Final optimized circuit" : "Ansatz circuit (parameters = 0)"}>
            {previewCircuit ? (
              <CircuitDiagram circuit={previewCircuit} selected={null} onSelect={() => {}} />
            ) : (
              <p className="text-xs text-muted-foreground">
                Fix the settings to preview the ansatz.
              </p>
            )}
            {shown ? (
              <details className="mt-3">
                <summary className="cursor-pointer font-mono text-xs text-primary">
                  Optimized parameters ({shown.params.length})
                </summary>
                <ol className="mt-2 grid grid-cols-2 gap-1 font-mono text-[11px] sm:grid-cols-4">
                  {shown.params.map((p, i) => (
                    <li key={i}>
                      θ{i} = {fmt(p, 4)}
                    </li>
                  ))}
                </ol>
              </details>
            ) : null}
          </Panel>

          {shown ? (
            <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
              <Panel title="Statevector">
                <div className="overflow-x-auto">
                  <table className="w-full font-mono text-[11px]">
                    <thead>
                      <tr className="text-left text-muted-foreground">
                        <th className="py-1 pr-2">State</th>
                        <th className="pr-2">Amplitude</th>
                        <th>Prob.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {shown.probs.map((p, i) => (
                        <tr key={i} className={p < 1e-10 ? "text-muted-foreground/60" : ""}>
                          <td className="py-0.5 pr-2">|{toBitstring(i, h.n)}⟩</td>
                          <td className="whitespace-nowrap pr-2">
                            {cplx(shown.state.re[i]!, shown.state.im[i]!)}
                          </td>
                          <td>{fmt(p, 4)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Panel>
              <Panel title="Measurement probabilities (Z basis, exact)">
                <Histogram
                  ariaLabel="Exact measurement probabilities of the optimized state"
                  valueFormat={(v) => v.toFixed(4)}
                  max={1}
                  bars={shown.probs.map((p, i) => ({ label: toBitstring(i, h.n), value: p }))}
                />
              </Panel>
            </div>
          ) : null}

          <Panel title="Limitations">
            <ul className="list-disc space-y-1 pl-5 text-xs leading-6 text-muted-foreground">
              <li>
                Ideal noiseless classical statevector simulation — no shot noise, no hardware noise,
                not run on a quantum computer.
              </li>
              <li>
                Energies are exact expectation values; real devices estimate them from finite
                measurement samples.
              </li>
              <li>
                The exact ground energy comes from classical diagonalisation, which is trivial at
                this size (≤ {VQE_MAX_QUBITS} qubits). No quantum advantage is claimed.
              </li>
              <li>
                The H₂ preset uses published coefficients as a toy example; no electronic-structure
                calculation is performed here.
              </li>
              <li>
                COBYLA here is a simplified unconstrained linear-model trust-region variant, not the
                reference Powell implementation.
              </li>
            </ul>
          </Panel>
        </div>
      </div>
    </div>
  );
}
