import { useMemo, useRef, useState } from "react";
import { Dices, Loader2, Play, RotateCcw, Square, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Histogram, Panel } from "@/components/lab/charts";
import { LineChart } from "@/components/lab/line-chart";
import {
  buildQubo,
  exhaustivePortfolio,
  isFeasible,
  isingTerms,
  parseReturnsCsv,
  popcount,
  portfolioMetrics,
  PORTFOLIO_MAX_ASSETS,
  PORTFOLIO_MAX_P,
  quboToIsing,
  runPortfolioQaoa,
  selectedIndices,
  syntheticData,
  toBitstring,
  validatePortfolio,
  validatePortfolioConfig,
  type PortfolioConfig,
  type PortfolioData,
  type PortfolioModel,
  type PortfolioResult,
} from "@/lib/quantum";

const field =
  "w-full rounded-sm border border-border bg-surface px-2 py-1.5 font-mono text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const fmt = (x: number, d = 4) => (Number.isFinite(x) ? x.toFixed(d) : "—");
const pct = (x: number, d = 2) => (Number.isFinite(x) ? `${(x * 100).toFixed(d)}%` : "—");
const DEF_MODEL: PortfolioModel = { riskAversion: 2, k: 2, penalty: 1, excluded: [] };
const DEF_CFG: PortfolioConfig = { p: 2, seed: 42, restarts: 3, maxIter: 150, shots: 2000 };
const SAMPLE_CSV =
  "ALPHA,BETA,GAMMA,DELTA\n0.021,0.010,-0.004,0.015\n-0.012,0.004,0.018,0.002\n0.030,0.012,0.006,-0.010\n0.008,-0.003,0.011,0.020\n-0.005,0.009,-0.002,0.012\n0.017,0.001,0.014,-0.004";

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-sm border border-border bg-surface p-3">
      <div className="font-mono text-[10px] uppercase text-muted-foreground">{label}</div>
      <div className="mt-1 font-mono text-lg text-foreground">{value}</div>
      {hint ? <div className="mt-0.5 text-[10px] text-muted-foreground">{hint}</div> : null}
    </div>
  );
}

/** Risk–return scatter of every K-asset equal-weight portfolio; highlights exact optimum and QAOA sampled best. */
function RiskReturn({
  data,
  model,
  exact,
  sampled,
}: {
  data: PortfolioData;
  model: PortfolioModel;
  exact?: number | undefined;
  sampled?: number | undefined;
}) {
  const pts = useMemo(() => {
    const out: { x: number; vol: number; ret: number }[] = [];
    for (let x = 1; x < 1 << data.names.length; x++)
      if (isFeasible(model, x)) {
        const m = portfolioMetrics(data, x);
        out.push({ x, vol: m.vol, ret: m.ret });
      }
    return out;
  }, [data, model]);
  if (!pts.length) return <p className="text-xs text-muted-foreground">No feasible portfolios.</p>;
  const W = 520,
    H = 240,
    L = 48,
    B = 30,
    T = 10,
    R = 10;
  const v0 = Math.min(...pts.map((p) => p.vol)),
    v1 = Math.max(...pts.map((p) => p.vol)) || v0 + 1;
  const r0 = Math.min(...pts.map((p) => p.ret)),
    r1 = Math.max(...pts.map((p) => p.ret)) || r0 + 1;
  const sx = (v: number) => L + ((v - v0) / (v1 - v0 || 1)) * (W - L - R);
  const sy = (r: number) => T + (1 - (r - r0) / (r1 - r0 || 1)) * (H - T - B);
  return (
    <figure>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-auto w-full"
        role="img"
        aria-label={`Risk versus return for ${pts.length} feasible portfolios`}
      >
        <line x1={L} x2={W - R} y1={H - B} y2={H - B} stroke="var(--border)" />
        <line x1={L} x2={L} y1={T} y2={H - B} stroke="var(--border)" />
        <text
          x={(L + W) / 2}
          y={H - 6}
          textAnchor="middle"
          fontSize={9}
          className="fill-muted-foreground font-mono"
        >
          volatility σ (equal weight)
        </text>
        <text
          x={12}
          y={(T + H - B) / 2}
          textAnchor="middle"
          fontSize={9}
          transform={`rotate(-90 12 ${(T + H - B) / 2})`}
          className="fill-muted-foreground font-mono"
        >
          expected return μ
        </text>
        <text
          x={L - 4}
          y={T + 8}
          textAnchor="end"
          fontSize={8}
          className="fill-muted-foreground font-mono"
        >
          {fmt(r1, 3)}
        </text>
        <text
          x={L - 4}
          y={H - B}
          textAnchor="end"
          fontSize={8}
          className="fill-muted-foreground font-mono"
        >
          {fmt(r0, 3)}
        </text>
        {pts.map((p) => {
          const isEx = p.x === exact,
            isS = p.x === sampled;
          return (
            <g key={p.x}>
              <circle
                cx={sx(p.vol)}
                cy={sy(p.ret)}
                r={isEx || isS ? 6 : 3.5}
                fill={isEx ? "var(--emerald)" : "var(--primary)"}
                fillOpacity={isEx ? 1 : 0.45}
                stroke={isS ? "var(--amber)" : "none"}
                strokeWidth={2}
              >
                <title>{`${selectedIndices(p.x, data.names.length)
                  .map((i) => data.names[i])
                  .join(" + ")}: μ ${fmt(p.ret)}, σ ${fmt(p.vol)}`}</title>
              </circle>
            </g>
          );
        })}
      </svg>
      <figcaption className="mt-1 flex flex-wrap gap-4 font-mono text-[10px] text-muted-foreground">
        <span>
          <span className="mr-1 inline-block size-2 rounded-full bg-emerald" />
          exact optimum
        </span>
        <span>
          <span className="mr-1 inline-block size-2 rounded-full border-2 border-amber" />
          QAOA sampled best
        </span>
        <span>
          <span className="mr-1 inline-block size-2 rounded-full bg-primary/50" />
          other feasible K-portfolios
        </span>
      </figcaption>
    </figure>
  );
}

export function PortfolioLab() {
  const [nAssets, setNAssets] = useState(4);
  const [dataSeed, setDataSeed] = useState(7);
  const [data, setData] = useState<PortfolioData>(() => syntheticData(4, 7));
  const [csv, setCsv] = useState(SAMPLE_CSV);
  const [csvErr, setCsvErr] = useState<string[]>([]);
  const [model, setModel] = useState<PortfolioModel>(DEF_MODEL);
  const [cfg, setCfg] = useState<PortfolioConfig>(DEF_CFG);
  const [result, setResult] = useState<PortfolioResult | null>(null);
  const [resultKey, setResultKey] = useState("");
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const n = data.names.length;
  const dataErrors = validatePortfolio(data, model);
  const cfgErrors = validatePortfolioConfig(cfg);
  const errors = [...dataErrors, ...cfgErrors];
  const key = JSON.stringify([data, model, cfg]);
  const stale = result !== null && resultKey !== key;
  const shown = result && !stale ? result : null;

  const derived = useMemo(() => {
    if (dataErrors.length) return null;
    const q = buildQubo(data, model);
    return { q, ising: quboToIsing(q), ex: exhaustivePortfolio(q, model) };
  }, [JSON.stringify([data, model]), dataErrors.length]);

  const setSynthetic = (count: number, seed: number) => {
    setData(syntheticData(count, seed));
    setModel((m) => ({
      ...m,
      k: Math.min(m.k, count),
      excluded: m.excluded.filter((i) => i < count),
    }));
  };
  const editMu = (i: number, v: number) =>
    setData((d) => ({ ...d, mu: d.mu.map((x, k) => (k === i ? v : x)) }));
  const editName = (i: number, v: string) =>
    setData((d) => ({ ...d, names: d.names.map((x, k) => (k === i ? v : x)) }));
  // Covariance edits stay symmetric: editing (i,j) also sets (j,i).
  const editSigma = (i: number, j: number, v: number) =>
    setData((d) => ({
      ...d,
      sigma: d.sigma.map((r, a) =>
        r.map((x, b) => ((a === i && b === j) || (a === j && b === i) ? v : x)),
      ),
    }));

  function loadCsv() {
    const r = parseReturnsCsv(csv);
    setCsvErr(r.errors);
    if (r.data) {
      setData(r.data);
      setModel((m) => ({ ...m, k: Math.min(m.k, r.data!.names.length), excluded: [] }));
    }
  }

  function reset() {
    abortRef.current?.abort();
    setNAssets(4);
    setDataSeed(7);
    setData(syntheticData(4, 7));
    setCsv(SAMPLE_CSV);
    setCsvErr([]);
    setModel(DEF_MODEL);
    setCfg(DEF_CFG);
    setResult(null);
    setError(null);
  }

  async function run() {
    setError(null);
    setRunning(true);
    setProgress(0);
    const ac = new AbortController();
    abortRef.current = ac;
    const k = key;
    try {
      const r = await runPortfolioQaoa(data, model, cfg, {
        signal: ac.signal,
        onProgress: setProgress,
      });
      setResult(r);
      setResultKey(k);
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

  const names = (x: number) =>
    selectedIndices(x, n)
      .map((i) => data.names[i])
      .join(", ") || "none";
  const exM = derived ? portfolioMetrics(data, derived.ex.assignment) : null;
  const sbM = shown ? portfolioMetrics(data, shown.sampledBest.x) : null;

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,400px)_minmax(0,1fr)]">
      {/* ---------- Inputs ---------- */}
      <div className="min-w-0 space-y-5">
        <Panel
          title="Asset data"
          aside={
            <Button type="button" size="sm" variant="ghost" onClick={reset}>
              <RotateCcw className="size-4" aria-hidden="true" />
              Reset
            </Button>
          }
        >
          <div
            className={`mb-3 rounded-sm border p-2 text-[11px] ${data.source === "synthetic" ? "border-amber/40 text-amber" : "border-primary/40 text-primary"}`}
          >
            {data.source === "synthetic"
              ? "Synthetic data — generated from a seeded factor model. Not market data."
              : "User-supplied returns — statistics computed from your pasted data. Not live market data."}
          </div>
          <div className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
            <label className="font-mono text-[10px] uppercase text-muted-foreground">
              Assets (2–{PORTFOLIO_MAX_ASSETS})
              <input
                type="number"
                min={2}
                max={PORTFOLIO_MAX_ASSETS}
                value={nAssets}
                onChange={(e) => setNAssets(Number(e.target.value))}
                className={`${field} mt-1`}
              />
            </label>
            <label className="font-mono text-[10px] uppercase text-muted-foreground">
              Data seed
              <input
                type="number"
                min={0}
                value={dataSeed}
                onChange={(e) => setDataSeed(Number(e.target.value))}
                className={`${field} mt-1`}
              />
            </label>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={
                !Number.isInteger(nAssets) ||
                nAssets < 2 ||
                nAssets > PORTFOLIO_MAX_ASSETS ||
                !Number.isInteger(dataSeed) ||
                dataSeed < 0
              }
              onClick={() => setSynthetic(nAssets, dataSeed)}
            >
              <Dices className="size-4" aria-hidden="true" />
              Generate
            </Button>
          </div>

          <details className="mt-3">
            <summary className="cursor-pointer font-mono text-xs text-primary">
              Paste your own return data (CSV)
            </summary>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Header = asset names; each row = one period's returns (decimals, e.g. 0.012). Sample
              mean and covariance are computed in your browser.
            </p>
            <textarea
              aria-label="Return data CSV"
              value={csv}
              onChange={(e) => setCsv(e.target.value)}
              rows={6}
              className={`${field} mt-2`}
            />
            <Button type="button" size="sm" variant="outline" className="mt-2" onClick={loadCsv}>
              <Upload className="size-4" aria-hidden="true" />
              Use this data
            </Button>
            {csvErr.length ? (
              <p className="mt-2 text-xs text-destructive" role="alert">
                {csvErr.join(" ")}
              </p>
            ) : null}
          </details>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full font-mono text-[11px]">
              <thead>
                <tr className="text-muted-foreground">
                  <th className="p-1 text-left">Asset</th>
                  <th className="p-1 text-left">μ</th>
                  <th className="p-1 text-left">Exclude</th>
                </tr>
              </thead>
              <tbody>
                {data.names.map((nm, i) => (
                  <tr key={i}>
                    <td className="p-1">
                      <input
                        aria-label={`Asset ${i + 1} name`}
                        value={nm}
                        onChange={(e) => editName(i, e.target.value)}
                        className={field}
                      />
                    </td>
                    <td className="p-1">
                      <input
                        aria-label={`${nm} expected return`}
                        type="number"
                        step={0.001}
                        value={data.mu[i]}
                        onChange={(e) => editMu(i, Number(e.target.value))}
                        className={field}
                      />
                    </td>
                    <td className="p-1 text-center">
                      <input
                        type="checkbox"
                        aria-label={`Exclude ${nm}`}
                        checked={model.excluded.includes(i)}
                        onChange={(e) =>
                          setModel((m) => ({
                            ...m,
                            excluded: e.target.checked
                              ? [...m.excluded, i]
                              : m.excluded.filter((x) => x !== i),
                          }))
                        }
                        className="accent-[var(--primary)]"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <details className="mt-3">
            <summary className="cursor-pointer font-mono text-xs text-primary">
              Covariance matrix Σ (symmetric edits)
            </summary>
            <div className="mt-2 overflow-x-auto">
              <table className="font-mono text-[10px]">
                <tbody>
                  {data.sigma.map((row, i) => (
                    <tr key={i}>
                      {row.map((v, j) => (
                        <td key={j} className="p-0.5">
                          <input
                            aria-label={`Covariance ${data.names[i]} ${data.names[j]}`}
                            type="number"
                            step={0.001}
                            value={+v.toFixed(6)}
                            onChange={(e) => editSigma(i, j, Number(e.target.value))}
                            className={`${field} w-20`}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </Panel>

        <Panel title="Model & constraints">
          <div className="grid grid-cols-3 gap-3">
            <label className="font-mono text-[10px] uppercase text-muted-foreground">
              Risk aversion q
              <input
                type="number"
                min={0}
                max={100}
                step={0.5}
                value={model.riskAversion}
                onChange={(e) => setModel((m) => ({ ...m, riskAversion: Number(e.target.value) }))}
                className={`${field} mt-1`}
              />
            </label>
            <label className="font-mono text-[10px] uppercase text-muted-foreground">
              Select K
              <input
                type="number"
                min={1}
                max={n}
                value={model.k}
                onChange={(e) => setModel((m) => ({ ...m, k: Number(e.target.value) }))}
                className={`${field} mt-1`}
              />
            </label>
            <label className="font-mono text-[10px] uppercase text-muted-foreground">
              Penalty A
              <input
                type="number"
                min={0.1}
                step={0.1}
                value={model.penalty}
                onChange={(e) => setModel((m) => ({ ...m, penalty: Number(e.target.value) }))}
                className={`${field} mt-1`}
              />
            </label>
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Allocation: exactly K assets, equally weighted 1/K; excluded assets are forbidden by a
            large penalty. Too small an A can make an infeasible selection optimal — the page flags
            this.
          </p>
        </Panel>

        <Panel title="QAOA settings">
          <div className="grid grid-cols-2 gap-3">
            {(
              [
                ["p", `Depth p (1–${PORTFOLIO_MAX_P})`, 1, PORTFOLIO_MAX_P, 1],
                ["seed", "Seed", 0, 4294967295, 1],
                ["restarts", "Restarts", 1, 20, 1],
                ["maxIter", "Nelder–Mead iters", 10, 1000, 10],
                ["shots", "Shots", 1, 100000, 100],
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
                  onChange={(e) => setCfg((c) => ({ ...c, [k]: Number(e.target.value) }))}
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
                Run QAOA
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
              Inputs changed since the last run — re-run to update results.
            </p>
          ) : null}
        </Panel>
      </div>

      {/* ---------- Model & results ---------- */}
      <div className="min-w-0 space-y-5">
        <div className="rounded-md border border-amber/40 bg-amber/5 p-3 text-xs leading-5 text-muted-foreground">
          <strong className="text-amber">
            Educational model · ideal noiseless classical simulation.
          </strong>{" "}
          Not quantum hardware results, not evidence of quantum advantage, not live market data and
          not investment advice.
        </div>

        <Panel title="QUBO / Ising formulation">
          <div className="space-y-3 font-mono text-[11px] leading-5">
            <div className="text-foreground">
              f(x) = <span className="text-primary">q·xᵀΣx</span> −{" "}
              <span className="text-emerald">μᵀx</span> +{" "}
              <span className="text-amber">A·(Σᵢxᵢ − K)²</span> + L·Σ<sub>i∈excl</sub> xᵢ, xᵢ ∈{" "}
              {"{0,1}"}
            </div>
            <ul className="space-y-1 text-muted-foreground">
              <li>
                <span className="text-primary">Risk</span>: covariance between selected assets,
                scaled by q = {fmt(model.riskAversion, 2)}.
              </li>
              <li>
                <span className="text-emerald">Return</span>: expected returns lower the cost (we
                minimise f).
              </li>
              <li>
                <span className="text-amber">Constraint</span>: quadratic penalty is 0 only when
                exactly K = {model.k} assets are chosen (A = {fmt(model.penalty, 2)}).
              </li>
              <li>
                Mapping xᵢ = (1 − Zᵢ)/2 gives the Ising cost Hamiltonian H<sub>C</sub> below; mixer
                B = Σ Xᵢ.
              </li>
            </ul>
            <div>
              <div className="text-muted-foreground">
                H<sub>C</sub> =
              </div>
              <div className="break-words text-foreground">
                {derived ? isingTerms(derived.ising) : "—"}
              </div>
            </div>
          </div>
        </Panel>

        <Panel
          title="Exact classical optimum"
          aside={
            <span className="font-mono text-[10px] text-muted-foreground">
              exhaustive · 2^{n} = {1 << n} bitstrings
            </span>
          }
        >
          {derived && exM ? (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Stat label="Selected" value={names(derived.ex.assignment)} />
                <Stat label="Objective f*" value={fmt(derived.ex.value)} />
                <Stat label="Return μₚ" value={pct(exM.ret)} />
                <Stat label="Volatility σₚ" value={pct(exM.vol)} />
              </div>
              {!derived.ex.feasible ? (
                <p className="mt-3 text-xs text-destructive" role="alert">
                  The QUBO minimum violates the constraints ({popcount(derived.ex.assignment)}{" "}
                  assets selected). Increase penalty A.
                </p>
              ) : null}
            </>
          ) : (
            <p className="text-xs text-muted-foreground">
              Fix the input errors to compute the optimum.
            </p>
          )}
        </Panel>

        {shown && derived && sbM ? (
          <>
            <Panel
              title="QAOA result"
              aside={
                <span className="font-mono text-[10px] text-muted-foreground">
                  seed {shown.config.seed} · p = {shown.config.p}
                </span>
              }
            >
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Stat
                  label="Expected ⟨f⟩"
                  value={fmt(shown.expectedObjective)}
                  hint="average over the QAOA state (exact)"
                />
                <Stat
                  label="Sampled best f"
                  value={fmt(shown.sampledBest.value)}
                  hint={`best of ${shown.config.shots} shots`}
                />
                <Stat label="P(optimal)" value={pct(shown.pOptimal)} />
                <Stat
                  label="P(feasible)"
                  value={pct(shown.pFeasible)}
                  hint={`exactly K = ${shown.model.k}`}
                />
              </div>
              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-sm border border-border p-3 text-xs">
                  <div className="font-mono text-[10px] uppercase text-muted-foreground">
                    Sampled best portfolio
                  </div>
                  <div className="mt-1 font-mono text-foreground">
                    {toBitstring(shown.sampledBest.x, n)} → {names(shown.sampledBest.x)}
                  </div>
                  <div className="mt-1 text-muted-foreground">
                    μₚ {pct(sbM.ret)} · σₚ {pct(sbM.vol)} · seen {shown.sampledBest.count}× ·{" "}
                    {shown.sampledBest.feasible ? "feasible" : "infeasible"}
                  </div>
                  <div
                    className={`mt-1 font-mono text-[11px] ${Math.abs(shown.sampledBest.value - shown.exact.value) < 1e-9 ? "text-emerald" : "text-amber"}`}
                  >
                    {Math.abs(shown.sampledBest.value - shown.exact.value) < 1e-9
                      ? "Matches the exact optimum"
                      : `Gap to optimum: ${fmt(shown.sampledBest.value - shown.exact.value)}`}
                  </div>
                </div>
                <div className="rounded-sm border border-border p-3 text-xs">
                  <div className="font-mono text-[10px] uppercase text-muted-foreground">
                    Optimised parameters
                  </div>
                  {shown.gammas.map((g, k) => (
                    <div key={k} className="mt-1 font-mono text-foreground">
                      γ{k + 1} = {fmt(g)} · β{k + 1} = {fmt(shown.betas[k]!)}
                    </div>
                  ))}
                  <div className="mt-1 text-[10px] text-muted-foreground">
                    γ is in normalised-cost units (f rescaled to [0,1]). {shown.evaluations}{" "}
                    objective evaluations.
                  </div>
                </div>
              </div>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full font-mono text-[11px]">
                  <thead>
                    <tr className="text-left text-muted-foreground">
                      <th className="p-1">Asset</th>
                      <th className="p-1">Exact optimum weight</th>
                      <th className="p-1">QAOA sampled weight</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.names.map((nm, i) => (
                      <tr key={i} className="border-t border-border">
                        <td className="p-1">{nm}</td>
                        <td className="p-1">{pct(exM!.weights[i]!, 1)}</td>
                        <td className="p-1">{pct(sbM.weights[i]!, 1)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>

            <Panel
              title="Convergence"
              aside={
                <span className="font-mono text-[10px] text-muted-foreground">
                  best ⟨f⟩ vs evaluations
                </span>
              }
            >
              {(() => {
                const lo = Math.min(shown.exact.value, ...shown.history.map((h) => h.best));
                const hi = Math.max(...shown.history.map((h) => h.best), lo + 1e-6);
                return (
                  <LineChart
                    ariaLabel="QAOA expected objective convergence"
                    xLabel="objective evaluations (log)"
                    yLabel="⟨f⟩"
                    yMin={lo - (hi - lo) * 0.05}
                    yMax={hi + (hi - lo) * 0.05}
                    series={[
                      {
                        name: "QAOA best ⟨f⟩",
                        color: "var(--primary)",
                        points: shown.history.map((h) => ({ x: h.evals, y: h.best })),
                      },
                      {
                        name: "exact optimum f*",
                        color: "var(--emerald)",
                        dashed: true,
                        points: [{ x: 1, y: shown.exact.value }],
                      },
                    ]}
                  />
                );
              })()}
            </Panel>

            <Panel
              title="Measurement distribution"
              aside={
                <span className="font-mono text-[10px] text-muted-foreground">
                  bars = sampled · tick = exact
                </span>
              }
            >
              {(() => {
                const idx = Array.from(shown.probs.keys())
                  .sort((a, b) => shown.probs[b]! - shown.probs[a]!)
                  .slice(0, 16);
                return (
                  <>
                    <Histogram
                      ariaLabel="Top bitstrings by probability"
                      valueFormat={(v) => pct(v)}
                      bars={idx.map((x) => ({
                        label: toBitstring(x, n),
                        value: shown.counts[x]! / shown.config.shots,
                        expected: shown.probs[x]!,
                      }))}
                    />
                    <p className="mt-2 text-[10px] text-muted-foreground">
                      Top {idx.length} of {1 << n} bitstrings (qubit 0 = rightmost = {data.names[0]}
                      ).
                    </p>
                  </>
                );
              })()}
            </Panel>
          </>
        ) : null}

        <Panel title="Risk–return map">
          <RiskReturn
            data={data}
            model={model}
            exact={derived?.ex.feasible ? derived.ex.assignment : undefined}
            sampled={shown?.sampledBest.feasible ? shown.sampledBest.x : undefined}
          />
        </Panel>

        <Panel title="Limitations">
          <ul className="list-disc space-y-1 pl-4 text-xs leading-5 text-muted-foreground">
            <li>
              Binary selection with equal weights — a simplification of real mean–variance
              optimisation (continuous weights, costs, turnover).
            </li>
            <li>
              Up to {PORTFOLIO_MAX_ASSETS} assets (2⁸ = 256 states), so exhaustive search is
              trivial; QAOA here is for learning, not speed.
            </li>
            <li>
              Penalty-based constraints: QAOA can return infeasible bitstrings; the result depends
              on A.
            </li>
            <li>Ideal statevector simulation on a classical computer — no noise, no hardware.</li>
            <li>
              Historical means and covariances are noisy estimates; nothing here is a forecast or
              recommendation.
            </li>
          </ul>
        </Panel>
      </div>
    </div>
  );
}
