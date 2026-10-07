import { useEffect, useMemo, useRef, useState } from "react";
import { Dices, Loader2, Play, RotateCcw, Square } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Histogram, Panel, ProbabilityRow } from "@/components/lab/charts";
import { CircuitDiagram } from "@/components/lab/circuit-diagram";
import {
  accuracy, confusionMatrix, generateDataset, logRegPredict, measurementProbs, parseSamples, predictProba, qmlCircuit, QML_MAX_DEPTH,
  QML_MAX_ITER, QML_MAX_SAMPLES, QML_MIN_SAMPLES, trainLogReg, trainQml, trainTestSplit, validateDataset, validateQmlConfig,
  type DatasetKind, type HistoryPoint, type QmlConfig, type QmlResult, type Sample,
} from "@/lib/quantum";

const field = "w-full rounded-sm border border-border bg-surface px-2 py-1.5 font-mono text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const pct = (x: number) => (Number.isFinite(x) ? `${(x * 100).toFixed(1)}%` : "—");
const fmt = (x: number, d = 4) => (Number.isFinite(x) ? x.toFixed(d) : "—");
const DEF_CFG: QmlConfig = { depth: 1, maxIter: 150, seed: 7, testFraction: 0.25 };
const DEF_DATA = { kind: "xor" as DatasetKind, n: 60, seed: 3 };
const LABEL = "Ideal noiseless classical statevector simulation — not quantum hardware.";

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-sm border border-border bg-surface p-3">
      <div className="font-mono text-[10px] uppercase text-muted-foreground">{label}</div>
      <div className="mt-1 font-mono text-lg text-foreground">{value}</div>
      {hint ? <div className="mt-0.5 text-[10px] text-muted-foreground">{hint}</div> : null}
    </div>
  );
}

/** Scatter plot in [-1,1]² with optional decision-boundary heatmap (P(class 1) on a grid). */
function Scatter({ train, test, grid, selected, onSelect }: { train: Sample[]; test: Sample[]; grid: number[][] | null; selected: Sample | null; onSelect: (s: Sample) => void }) {
  const S = 320, P = 20, G = grid?.length ?? 0;
  const sx = (x: number) => P + ((x + 1) / 2) * (S - 2 * P), sy = (y: number) => P + ((1 - y) / 2) * (S - 2 * P);
  const cell = (S - 2 * P) / (G || 1);
  const dot = (s: Sample, isTest: boolean, i: number) => {
    const sel = selected === s;
    const color = s.y ? "var(--primary)" : "var(--amber)";
    return (
      <g key={`${isTest ? "t" : "r"}${i}`} role="button" tabIndex={0} aria-label={`${isTest ? "Test" : "Train"} sample (${s.x1}, ${s.x2}), class ${s.y}`} style={{ cursor: "pointer", outline: "none" }}
        onClick={() => onSelect(s)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(s); } }}>
        {isTest
          ? <rect x={sx(s.x1) - 4} y={sy(s.x2) - 4} width={8} height={8} fill="none" stroke={color} strokeWidth={2} />
          : <circle cx={sx(s.x1)} cy={sy(s.x2)} r={4} fill={color} />}
        {sel ? <circle cx={sx(s.x1)} cy={sy(s.x2)} r={9} fill="none" stroke="var(--emerald)" strokeWidth={2} /> : null}
      </g>
    );
  };
  return (
    <figure>
      <svg viewBox={`0 0 ${S} ${S}`} className="mx-auto h-auto w-full max-w-md" role="group" aria-label="Dataset scatter plot with decision boundary">
        {grid?.map((row, j) => row.map((p, i) => (
          <rect key={`${i}-${j}`} x={P + i * cell} y={P + (G - 1 - j) * cell} width={cell + 0.5} height={cell + 0.5} fill={p >= 0.5 ? "var(--primary)" : "var(--amber)"} fillOpacity={0.08 + Math.abs(p - 0.5) * 0.35} />
        )))}
        <rect x={P} y={P} width={S - 2 * P} height={S - 2 * P} fill="none" stroke="var(--border)" />
        <line x1={sx(0)} x2={sx(0)} y1={P} y2={S - P} stroke="var(--border)" strokeDasharray="2 3" />
        <line y1={sy(0)} y2={sy(0)} x1={P} x2={S - P} stroke="var(--border)" strokeDasharray="2 3" />
        <text x={S - P} y={S - 6} textAnchor="end" fontSize={9} className="fill-muted-foreground font-mono">x₁ ∈ [−1, 1]</text>
        <text x={4} y={P - 6} fontSize={9} className="fill-muted-foreground font-mono">x₂</text>
        {train.map((s, i) => dot(s, false, i))}
        {test.map((s, i) => dot(s, true, i))}
      </svg>
      <figcaption className="mt-2 flex flex-wrap justify-center gap-4 font-mono text-[10px] text-muted-foreground">
        <span><span className="mr-1 inline-block size-2 rounded-full bg-primary" />class 1</span>
        <span><span className="mr-1 inline-block size-2 rounded-full bg-amber" />class 0</span>
        <span>● train · □ test</span>
        {grid ? <span>shading = QML predicted class</span> : null}
      </figcaption>
    </figure>
  );
}

/** Simple linear-axis curve chart for loss / accuracy histories. */
function Curve({ series, yMin, yMax, label }: { series: { name: string; color: string; ys: number[] }[]; yMin: number; yMax: number; label: string }) {
  const W = 480, H = 180, L = 40, B = 22, T = 8, R = 8;
  const n = Math.max(2, ...series.map((s) => s.ys.length));
  const sx = (i: number) => L + (i / (n - 1)) * (W - L - R);
  const sy = (y: number) => T + (1 - (Math.min(yMax, Math.max(yMin, y)) - yMin) / (yMax - yMin || 1)) * (H - T - B);
  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={label}>
        {[0, 0.5, 1].map((t) => { const y = yMin + (yMax - yMin) * t; return (
          <g key={t}><line x1={L} x2={W - R} y1={sy(y)} y2={sy(y)} stroke="var(--border)" /><text x={L - 4} y={sy(y) + 3} textAnchor="end" fontSize={9} className="fill-muted-foreground font-mono">{y.toFixed(2)}</text></g>
        ); })}
        <text x={(L + W) / 2} y={H - 4} textAnchor="middle" fontSize={9} className="fill-muted-foreground font-mono">iteration (1 – {n})</text>
        {series.map((s) => s.ys.length ? <polyline key={s.name} fill="none" stroke={s.color} strokeWidth={2} points={s.ys.map((y, i) => `${sx(i)},${sy(y)}`).join(" ")} /> : null)}
      </svg>
      <figcaption className="mt-1 flex flex-wrap gap-4 font-mono text-[10px] text-muted-foreground">
        {series.map((s) => <span key={s.name}><span className="mr-1 inline-block h-0.5 w-4 align-middle" style={{ background: s.color }} />{s.name}</span>)}
      </figcaption>
    </figure>
  );
}

function Confusion({ title, m }: { title: string; m: [[number, number], [number, number]] }) {
  return (
    <div>
      <div className="mb-1 font-mono text-[10px] uppercase text-muted-foreground">{title}</div>
      <table className="w-full border-collapse font-mono text-xs">
        <thead><tr><th className="p-1 text-left text-[10px] font-normal text-muted-foreground">actual \ pred</th><th className="p-1 font-normal">0</th><th className="p-1 font-normal">1</th></tr></thead>
        <tbody>{[0, 1].map((a) => (
          <tr key={a}><td className="p-1 text-muted-foreground">{a}</td>{[0, 1].map((p) => (
            <td key={p} className={`border border-border p-2 text-center ${a === p ? "bg-emerald/15 text-foreground" : "bg-rose/10"}`}>{m[a as 0 | 1][p as 0 | 1]}</td>
          ))}</tr>
        ))}</tbody>
      </table>
    </div>
  );
}


function LiveQmlShowcasePreview() {
  const [epoch, setEpoch] = useState(0);
  const [loss, setLoss] = useState(0.95);
  const [epochs, setEpochs] = useState<number[]>([]);
  const [losses, setLosses] = useState<number[]>([]);
  const [accuracies, setAccuracies] = useState<number[]>([]);

  useEffect(() => {
    const id = window.setInterval(() => {
      setEpoch((prevEpoch) => {
        const nextEpoch = prevEpoch + 1;
        setLoss((prevLoss) => {
          const nextLoss = Math.max(0.03, prevLoss * 0.96);
          const nextAcc = Math.min(0.98, 0.10 + nextEpoch * 0.015);

          setEpochs((prev) => [...prev, nextEpoch].slice(-60));
          setLosses((prev) => [...prev, nextLoss].slice(-60));
          setAccuracies((prev) => [...prev, nextAcc].slice(-60));

          return nextLoss;
        });
        return nextEpoch;
      });
    }, 350);

    return () => window.clearInterval(id);
  }, []);

  const width = 560;
  const height = 260;
  const padX = 42;
  const padY = 24;
  const maxX = Math.max(60, epoch || 60);
  const x = (v: number) => padX + (v / maxX) * (width - padX - 18);
  const y = (v: number) => height - padY - v * (height - padY - 18);

  const lossPath = epochs.map((e, i) => `${i ? "L" : "M"} ${x(e)} ${y(losses[i] ?? 0)}`).join(" ");
  const accPath = epochs.map((e, i) => `${i ? "L" : "M"} ${x(e)} ${y(accuracies[i] ?? 0)}`).join(" ");

  return (
    <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div className="rounded-[22px] border border-[#315081] bg-[#071228]/90 p-6 shadow-[0_0_35px_rgba(0,132,255,0.10)]">
        <h2 className="text-xl font-semibold">🧠 Machine Learning Training</h2>
        <p className="mt-1 text-sm text-[#9db4d7]">Live training visualization</p>

        <svg viewBox={`0 0 ${width} ${height}`} className="mt-4 w-full" role="img" aria-label="Live machine learning training chart">
          {[0, 0.25, 0.5, 0.75, 1].map((v) => (
            <g key={v}>
              <line x1={padX} x2={width - 18} y1={y(v)} y2={y(v)} stroke="#24395d" strokeWidth="1" />
              <text x={padX - 8} y={y(v) + 4} textAnchor="end" fontSize="10" fill="#9bb4df">{v.toFixed(2)}</text>
            </g>
          ))}
          <line x1={padX} x2={width - 18} y1={height - padY} y2={height - padY} stroke="#506b96" />
          <line x1={padX} x2={padX} y1={18} y2={height - padY} stroke="#506b96" />
          <path d={lossPath} fill="none" stroke="#ffb347" strokeWidth="4" strokeLinecap="round" />
          <path d={accPath} fill="none" stroke="#00ffbb" strokeWidth="4" strokeLinecap="round" />
          <text x={width / 2} y={height - 5} textAnchor="middle" fontSize="11" fill="#9bb4df">Epoch</text>
          <text x="14" y="16" fontSize="11" fill="#9bb4df">Metric</text>
        </svg>

        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-[#1f335d] p-3 text-center">
            <div className="text-xs text-[#8fa7d6]">Epoch</div>
            <div className="mt-1 text-lg font-bold">{epoch}</div>
          </div>
          <div className="rounded-xl border border-[#1f335d] p-3 text-center">
            <div className="text-xs text-[#8fa7d6]">Loss</div>
            <div className="mt-1 text-lg font-bold">{loss.toFixed(3)}</div>
          </div>
          <div className="rounded-xl border border-[#1f335d] p-3 text-center">
            <div className="text-xs text-[#8fa7d6]">Accuracy</div>
            <div className="mt-1 text-lg font-bold">{(Math.min(0.98, 0.10 + epoch * 0.015) * 100).toFixed(1)}%</div>
          </div>
        </div>
      </div>

      <div className="rounded-[22px] border border-[#315081] bg-[#071228]/90 p-6 shadow-[0_0_35px_rgba(0,132,255,0.10)]">
        <h2 className="text-xl font-semibold">⚛ Quantum State Simulator</h2>
        <p className="mt-1 text-sm text-[#9db4d7]">Animated Bloch sphere</p>

        <div className="flex h-[330px] items-center justify-center">
          <div className="relative h-[280px] w-[280px] rounded-full border-2 border-[#00d9ff] shadow-[0_0_45px_rgba(0,217,255,0.5)] animate-[pulse_3s_ease-in-out_infinite]">
            <div className="absolute left-1/2 top-1/2 h-[36%] w-full -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#259ddd]" />
            <div className="absolute left-1/2 top-1/2 h-[36%] w-full -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#259ddd] animate-[spin_5s_linear_infinite]" style={{ transform: "translate(-50%,-50%) rotate(55deg)" }} />
            <div className="absolute left-1/2 top-1/2 h-[36%] w-full -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#259ddd] animate-[spin_7s_linear_infinite_reverse]" style={{ transform: "translate(-50%,-50%) rotate(-55deg)" }} />
            <div className="absolute left-1/2 top-1/2 h-[115px] w-1 origin-bottom -translate-x-1/2 -translate-y-full bg-gradient-to-b from-white to-[#00ffbb] shadow-[0_0_20px_#00ffbb] animate-[spin_4s_linear_infinite]">
              <span className="absolute -top-2 left-1/2 h-4 w-4 -translate-x-1/2 rounded-full bg-white shadow-[0_0_20px_#00ffbb]" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function QmlLab() {
  const [kind, setKind] = useState<DatasetKind>(DEF_DATA.kind);
  const [nSamples, setNSamples] = useState(DEF_DATA.n);
  const [dataSeed, setDataSeed] = useState(DEF_DATA.seed);
  const [data, setData] = useState<Sample[]>(() => generateDataset(DEF_DATA.kind, DEF_DATA.n, DEF_DATA.seed));
  const [custom, setCustom] = useState("");
  const [dataErr, setDataErr] = useState<string[]>([]);
  const [cfg, setCfg] = useState<QmlConfig>(DEF_CFG);
  const [quadratic, setQuadratic] = useState(false);
  const [result, setResult] = useState<QmlResult | null>(null);
  const [live, setLive] = useState<HistoryPoint[]>([]);
  const [running, setRunning] = useState(false);
  const [runErr, setRunErr] = useState<string | null>(null);
  const [selected, setSelected] = useState<Sample | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const cfgErr = validateQmlConfig(cfg);
  const split = useMemo(() => trainTestSplit(data, Number.isFinite(cfg.testFraction) ? Math.min(0.5, Math.max(0.1, cfg.testFraction)) : 0.25, cfg.seed || 0), [data, cfg.testFraction, cfg.seed]);

  const invalidate = () => { setResult(null); setLive([]); setRunErr(null); };
  const regenerate = (k = kind, n = nSamples, s = dataSeed) => {
    if (!Number.isInteger(n) || n < QML_MIN_SAMPLES || n > QML_MAX_SAMPLES) { setDataErr([`Sample count must be ${QML_MIN_SAMPLES}–${QML_MAX_SAMPLES}.`]); return; }
    if (!Number.isInteger(s) || s < 0) { setDataErr(["Data seed must be a non-negative integer."]); return; }
    setDataErr([]); setData(generateDataset(k, n, s)); setSelected(null); invalidate();
  };
  const applyCustom = () => {
    const { samples, errors } = parseSamples(custom);
    const errs = [...errors, ...validateDataset(samples)];
    if (errs.length) { setDataErr(errs.slice(0, 6)); return; }
    setDataErr([]); setData(samples); setSelected(null); invalidate();
  };
  const loadIntoEditor = () => setCustom(data.map((s) => `${s.x1}, ${s.x2}, ${s.y}`).join("\n"));

  const baseline = useMemo(() => {
    if (!split.train.length) return null;
    const m = trainLogReg(split.train, { quadratic });
    const pr = (set: Sample[]) => set.map((s) => logRegPredict(m, s.x1, s.x2));
    return { m, trainAcc: accuracy(pr(split.train), split.train.map((s) => s.y)), testAcc: accuracy(pr(split.test), split.test.map((s) => s.y)) };
  }, [split, quadratic]);

  const grid = useMemo(() => {
    if (!result) return null;
    const G = 28;
    return Array.from({ length: G }, (_, j) => Array.from({ length: G }, (_, i) => predictProba(-1 + (2 * (i + 0.5)) / G, -1 + (2 * (j + 0.5)) / G, result.params, result.depth)));
  }, [result]);

  const metrics = useMemo(() => {
    if (!result) return null;
    const pr = (set: Sample[]) => set.map((s) => predictProba(s.x1, s.x2, result.params, result.depth));
    return { cmTrain: confusionMatrix(pr(split.train), split.train.map((s) => s.y)), cmTest: confusionMatrix(pr(split.test), split.test.map((s) => s.y)) };
  }, [result, split]);

  async function run() {
    const errs = [...validateDataset(data), ...cfgErr];
    if (errs.length) { setRunErr(errs[0]!); return; }
    abortRef.current?.abort();
    const ac = new AbortController(); abortRef.current = ac;
    setRunning(true); setRunErr(null); setResult(null); setLive([]);
    try {
      const buf: HistoryPoint[] = [];
      const r = await trainQml(split.train, split.test, cfg, { signal: ac.signal, onProgress: (h) => { buf.push(h); if (h.iter % 4 === 0) setLive(buf.slice()); } });
      setLive(r.history); setResult(r);
    } catch (e) {
      setRunErr(e instanceof DOMException && e.name === "AbortError" ? "Training cancelled." : e instanceof Error ? e.message : "Training failed.");
    } finally { setRunning(false); }
  }
  const reset = () => {
    abortRef.current?.abort();
    setKind(DEF_DATA.kind); setNSamples(DEF_DATA.n); setDataSeed(DEF_DATA.seed); setData(generateDataset(DEF_DATA.kind, DEF_DATA.n, DEF_DATA.seed));
    setCfg(DEF_CFG); setQuadratic(false); setCustom(""); setDataErr([]); setSelected(null); invalidate();
  };

  const hist = result?.history ?? live;
  const depth = result?.depth ?? (Number.isInteger(cfg.depth) && cfg.depth >= 1 && cfg.depth <= QML_MAX_DEPTH ? cfg.depth : 1);
  const params = result?.params ?? new Array(depth * 4).fill(0);
  const sel = selected ?? split.train[0] ?? null;
  const selProbs = sel ? measurementProbs(sel.x1, sel.x2, params, depth) : null;
  const circuit = qmlCircuit(sel?.x1 ?? 0, sel?.x2 ?? 0, params, depth);

  return (
    <div className="space-y-6">
      <div role="note" className="rounded-md border border-amber/40 bg-amber/10 p-3 text-xs leading-6 text-foreground">
        <strong>{LABEL}</strong> Educational simulation only. No claim of quantum advantage, and no evidence that this QML model outperforms classical machine learning.
      </div>

      <LiveQmlShowcasePreview />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Panel title="Dataset" className="lg:col-span-1">
          <div className="grid grid-cols-3 gap-2">
            {(["linear", "xor", "circle"] as const).map((k) => (
              <Button key={k} size="sm" variant={kind === k ? "signal" : "outline"} onClick={() => { setKind(k); regenerate(k); }} aria-pressed={kind === k}>{k === "linear" ? "Linear" : k === "xor" ? "XOR" : "Circle"}</Button>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <label className="text-[10px] uppercase text-muted-foreground">Samples ({QML_MIN_SAMPLES}–{QML_MAX_SAMPLES})
              <input type="number" className={field} value={nSamples} min={QML_MIN_SAMPLES} max={QML_MAX_SAMPLES} onChange={(e) => setNSamples(Number(e.target.value))} /></label>
            <label className="text-[10px] uppercase text-muted-foreground">Data seed
              <div className="flex gap-1"><input type="number" className={field} value={dataSeed} onChange={(e) => setDataSeed(Number(e.target.value))} />
                <Button size="icon" variant="outline" aria-label="New random data seed" onClick={() => { const s = Math.floor(Math.random() * 1e6); setDataSeed(s); regenerate(kind, nSamples, s); }}><Dices /></Button></div></label>
          </div>
          <Button size="sm" variant="outline" className="mt-2 w-full" onClick={() => regenerate()}>Generate seeded dataset</Button>
          <details className="mt-4">
            <summary className="cursor-pointer font-mono text-xs text-primary">Custom dataset editor</summary>
            <p className="mt-2 text-[11px] text-muted-foreground">One sample per line: <code>x1, x2, label</code> with features in [−1, 1] and label 0 or 1.</p>
            <textarea className={`${field} mt-2 h-32`} value={custom} onChange={(e) => setCustom(e.target.value)} aria-label="Custom samples" placeholder="0.5, -0.2, 1" />
            <div className="mt-2 flex gap-2"><Button size="sm" variant="outline" onClick={loadIntoEditor}>Copy current data</Button><Button size="sm" variant="signal" onClick={applyCustom}>Apply</Button></div>
          </details>
          {dataErr.length ? <ul role="alert" className="mt-3 space-y-1 text-xs text-rose">{dataErr.map((e) => <li key={e}>{e}</li>)}</ul> : null}
          <p className="mt-3 font-mono text-[11px] text-muted-foreground">{data.length} samples · train {split.train.length} · test {split.test.length}</p>
        </Panel>

        <Panel title="Scatter & decision boundary" className="lg:col-span-2" aside={<span className="font-mono text-[10px] text-muted-foreground">click a point to inspect it</span>}>
          <Scatter train={split.train} test={split.test} grid={grid} selected={sel} onSelect={setSelected} />
        </Panel>
      </div>

      <Panel title="Model & training">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <label className="text-[10px] uppercase text-muted-foreground">Depth (1–{QML_MAX_DEPTH})<input type="number" className={field} value={cfg.depth} onChange={(e) => { setCfg({ ...cfg, depth: Number(e.target.value) }); invalidate(); }} /></label>
          <label className="text-[10px] uppercase text-muted-foreground">Iterations (1–{QML_MAX_ITER})<input type="number" className={field} value={cfg.maxIter} onChange={(e) => setCfg({ ...cfg, maxIter: Number(e.target.value) })} /></label>
          <label className="text-[10px] uppercase text-muted-foreground">Seed (split + init)<input type="number" className={field} value={cfg.seed} onChange={(e) => { setCfg({ ...cfg, seed: Number(e.target.value) }); invalidate(); }} /></label>
          <label className="text-[10px] uppercase text-muted-foreground">Test fraction (0.1–0.5)<input type="number" step={0.05} className={field} value={cfg.testFraction} onChange={(e) => { setCfg({ ...cfg, testFraction: Number(e.target.value) }); invalidate(); }} /></label>
        </div>
        <p className="mt-3 text-xs leading-6 text-muted-foreground">
          Each layer: angle encoding Ry(πx₁)·Ry(πx₂) (re-uploaded), trainable Ry·Rz on both qubits, then CNOT(q0→q1). {depth * 4} trainable parameters.
          P(class 1) = P(q1 = 1). Loss: binary cross-entropy. Optimiser: gradient-free Nelder–Mead with seeded random initialisation.
        </p>
        {cfgErr.length ? <ul role="alert" className="mt-2 space-y-1 text-xs text-rose">{cfgErr.map((e) => <li key={e}>{e}</li>)}</ul> : null}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {running
            ? <Button variant="outline" onClick={() => abortRef.current?.abort()}><Square />Cancel</Button>
            : <Button variant="signal" onClick={run} disabled={cfgErr.length > 0}><Play />Train classifier</Button>}
          <Button variant="outline" onClick={reset}><RotateCcw />Reset</Button>
          {running ? <span className="inline-flex items-center gap-2 font-mono text-xs text-muted-foreground" aria-live="polite"><Loader2 className="size-4 animate-spin" />iteration {live.at(-1)?.iter ?? 0} / {cfg.maxIter}</span> : null}
        </div>
        {running ? <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary transition-all" style={{ width: `${((live.at(-1)?.iter ?? 0) / cfg.maxIter) * 100}%` }} /></div> : null}
        {runErr ? <p role="alert" className="mt-3 text-xs text-rose">{runErr}</p> : null}
      </Panel>

      {result && metrics ? (
        <Panel title="Results" aside={<span className="font-mono text-[10px] text-muted-foreground">{LABEL}</span>}>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Train accuracy" value={pct(result.trainAcc)} />
            <Stat label="Test accuracy" value={pct(result.testAcc)} />
            <Stat label="Train loss (BCE)" value={fmt(result.trainLoss)} />
            <Stat label="Test loss (BCE)" value={fmt(result.testLoss)} hint={`${result.evaluations} circuit-batch evaluations`} />
          </div>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Confusion title="Confusion matrix · train" m={metrics.cmTrain} />
            <Confusion title="Confusion matrix · test" m={metrics.cmTest} />
          </div>
          <div className="mt-4">
            <div className="mb-1 font-mono text-[10px] uppercase text-muted-foreground">Learned parameters (radians)</div>
            <div className="overflow-x-auto"><table className="w-full font-mono text-xs"><thead><tr className="text-muted-foreground"><th className="p-1 text-left font-normal">layer</th><th className="p-1 font-normal">Ry q0</th><th className="p-1 font-normal">Rz q0</th><th className="p-1 font-normal">Ry q1</th><th className="p-1 font-normal">Rz q1</th></tr></thead>
              <tbody>{Array.from({ length: result.depth }, (_, l) => <tr key={l}><td className="p-1">{l + 1}</td>{result.params.slice(l * 4, l * 4 + 4).map((v, i) => <td key={i} className="p-1 text-center">{fmt(v, 3)}</td>)}</tr>)}</tbody></table></div>
          </div>
        </Panel>
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Panel title="Training loss"><Curve label="Training loss per iteration" yMin={0} yMax={Math.max(1, ...hist.map((h) => h.loss))} series={[{ name: "train BCE loss", color: "var(--primary)", ys: hist.map((h) => h.loss) }]} /></Panel>
        <Panel title="Accuracy"><Curve label="Accuracy per iteration" yMin={0} yMax={1} series={[{ name: "train", color: "var(--primary)", ys: hist.map((h) => h.trainAcc) }, { name: "test", color: "var(--emerald)", ys: hist.map((h) => h.testAcc).filter(Number.isFinite) }]} /></Panel>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Panel title="Circuit for selected sample" aside={<span className="font-mono text-[10px] text-muted-foreground">{result ? "trained parameters" : "parameters = 0 (untrained)"}</span>}>
          <CircuitDiagram circuit={circuit} selected={null} onSelect={() => {}} />
        </Panel>
        <Panel title="Selected-point prediction">
          {sel && selProbs ? (
            <div className="space-y-3">
              <p className="font-mono text-xs text-muted-foreground">x = ({sel.x1}, {sel.x2}) · true class {sel.y} · {split.test.includes(sel) ? "test" : "train"} sample</p>
              <Histogram ariaLabel="Exact measurement probabilities for the selected sample" valueFormat={(v) => `${(v * 100).toFixed(2)}%`} max={1}
                bars={["00", "01", "10", "11"].map((b, i) => ({ label: `|${b}⟩`, value: selProbs[i]! }))} />
              <ProbabilityRow label="P(class 1) = P(q1 = 1)" p={selProbs[2]! + selProbs[3]!} />
              <ProbabilityRow label="P(class 0)" p={selProbs[0]! + selProbs[1]!} />
              <p className="font-mono text-xs">Predicted class: <span className="text-primary">{selProbs[2]! + selProbs[3]! >= 0.5 ? 1 : 0}</span>{result ? null : " (untrained)"}</p>
            </div>
          ) : <p className="text-xs text-muted-foreground">No sample selected.</p>}
        </Panel>
      </div>

      <Panel title="Classical baseline · logistic regression">
        <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={quadratic} onChange={(e) => setQuadratic(e.target.checked)} />Add quadratic features (x₁², x₂², x₁x₂)</label>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full font-mono text-xs">
            <thead><tr className="text-muted-foreground"><th className="p-2 text-left font-normal">model</th><th className="p-2 font-normal">train acc.</th><th className="p-2 font-normal">test acc.</th></tr></thead>
            <tbody>
              <tr className="border-t border-border"><td className="p-2">Variational quantum classifier (simulated)</td><td className="p-2 text-center">{pct(result?.trainAcc ?? NaN)}</td><td className="p-2 text-center">{pct(result?.testAcc ?? NaN)}</td></tr>
              <tr className="border-t border-border"><td className="p-2">Logistic regression ({quadratic ? "quadratic" : "linear"} features)</td><td className="p-2 text-center">{pct(baseline?.trainAcc ?? NaN)}</td><td className="p-2 text-center">{pct(baseline?.testAcc ?? NaN)}</td></tr>
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs leading-6 text-muted-foreground">
          Same train/test split for both. Logistic regression: full-batch gradient descent, zero initialisation, 2,000 epochs, L2 = 10⁻³ (deterministic).
          Linear logistic regression cannot separate XOR or circle data; adding quadratic features usually fixes that. <strong className="text-foreground">This comparison does NOT show quantum advantage</strong>: the
          datasets are tiny, the quantum model is simulated classically, and differences mostly reflect feature choices, not quantum effects.
        </p>
      </Panel>

      <Panel title="Limitations">
        <ul className="list-disc space-y-1 pl-5 text-xs leading-6 text-muted-foreground">
          <li>{LABEL} Exact probabilities — no shot noise, gate errors or decoherence.</li>
          <li>Only 2 qubits and 2 input features; results say nothing about scaling to real problems.</li>
          <li>Nelder–Mead is a local optimiser; different seeds can reach different minima.</li>
          <li>The train/test split is random, not stratified; small test sets make accuracy estimates noisy.</li>
          <li>Educational simulation only. No evidence that this model outperforms classical machine learning.</li>
        </ul>
      </Panel>
    </div>
  );
}
