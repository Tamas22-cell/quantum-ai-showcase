import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Database, FileDown, Loader2, Play, Radio, RotateCcw, Square, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Histogram, Panel } from "@/components/lab/charts";
import { LineChart } from "@/components/lab/line-chart";
import {
  DEMO_UNIVERSE, FINANCE_MAX_ASSETS, RANGES, computeStats, demoPrices, parsePriceCsv, runFinanceExperiment, sliceRange, validateFinance,
  type FinanceExperiment, type PriceSeries, type ProviderKind, type ProviderStatus, type RangeId,
} from "@/lib/finance";
import { fetchLiveHistory, getFinanceProviderStatus } from "@/lib/finance.functions";
import { PORTFOLIO_MAX_P, isingTerms, buildQubo, quboToIsing, toBitstring, type PortfolioConfig, type PortfolioModel } from "@/lib/quantum";

type Mode = "demo" | "csv" | "live";
const field = "w-full rounded-sm border border-border bg-surface px-2 py-1.5 font-mono text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const fmt = (x: number | undefined, d = 4) => (x !== undefined && Number.isFinite(x) ? x.toFixed(d) : "—");
const pct = (x: number | undefined, d = 2) => (x !== undefined && Number.isFinite(x) ? `${(x * 100).toFixed(d)}%` : "—");
const PALETTE = ["var(--primary)", "var(--emerald)", "var(--amber)", "var(--rose)", "var(--foreground)", "var(--muted-foreground)", "var(--accent)", "var(--border-strong)"];
const DEF_MODEL = { riskAversion: 2, k: 2, penalty: 1 };
const DEF_CFG: PortfolioConfig = { p: 2, seed: 42, restarts: 3, maxIter: 150, shots: 2000 };
const DEF_SYMS = DEMO_UNIVERSE.slice(0, 5).map((a) => a.symbol);

export const QUANTUM_NOTICE = "Quantum calculations are ideal noiseless classical statevector simulations unless explicitly labelled as IBM Quantum hardware results.";

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-sm border border-border bg-surface p-3">
      <div className="font-mono text-[10px] uppercase text-muted-foreground">{label}</div>
      <div className="mt-1 font-mono text-lg text-foreground">{value}</div>
      {hint ? <div className="mt-0.5 text-[10px] text-muted-foreground">{hint}</div> : null}
    </div>
  );
}

function Tag({ kind }: { kind: "market" | "classical" | "quantum" }) {
  const map = { market: ["Market data", "text-amber border-amber/40"], classical: ["Classical calculation", "text-emerald border-emerald/40"], quantum: ["Simulated QAOA", "text-primary border-primary/40"] } as const;
  return <span className={`rounded-sm border px-1.5 py-0.5 font-mono text-[10px] uppercase ${map[kind][1]}`}>{map[kind][0]}</span>;
}

/** Normalised price chart (linear axes, one line per asset). */
function PriceChart({ dates, series, names }: { dates: string[]; series: number[][]; names: string[] }) {
  const W = 640, H = 240, L = 40, R = 10, T = 10, B = 26;
  const all = series.flat(), lo = Math.min(...all), hi = Math.max(...all), span = hi - lo || 1;
  const n = dates.length, step = Math.max(1, Math.floor(n / 160));
  const sx = (t: number) => L + (t / Math.max(1, n - 1)) * (W - L - R), sy = (v: number) => T + (1 - (v - lo) / span) * (H - T - B);
  const ticks = Array.from({ length: 5 }, (_, i) => lo + (span * i) / 4);
  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Normalised price history (start = 100)">
        {ticks.map((v) => <g key={v}><line x1={L} x2={W - R} y1={sy(v)} y2={sy(v)} stroke="var(--border)" /><text x={L - 5} y={sy(v) + 3} textAnchor="end" fontSize={9} className="fill-muted-foreground font-mono">{v.toFixed(0)}</text></g>)}
        <line x1={L} x2={W - R} y1={sy(100)} y2={sy(100)} stroke="var(--muted-foreground)" strokeDasharray="3 3" />
        {[0, Math.floor((n - 1) / 2), n - 1].map((t) => <text key={t} x={sx(t)} y={H - 8} textAnchor={t === 0 ? "start" : t === n - 1 ? "end" : "middle"} fontSize={9} className="fill-muted-foreground font-mono">{dates[t]}</text>)}
        {series.map((s, a) => {
          const pts: string[] = [];
          for (let t = 0; t < n; t += step) pts.push(`${sx(t).toFixed(1)},${sy(s[t]!).toFixed(1)}`);
          pts.push(`${sx(n - 1).toFixed(1)},${sy(s[n - 1]!).toFixed(1)}`);
          return <polyline key={a} points={pts.join(" ")} fill="none" stroke={PALETTE[a % PALETTE.length]} strokeWidth={1.4} />;
        })}
      </svg>
      <figcaption className="mt-2 flex flex-wrap gap-3 font-mono text-[10px] text-muted-foreground">
        {names.map((nm, a) => <span key={nm} className="flex items-center gap-1"><span className="inline-block h-0.5 w-3" style={{ background: PALETTE[a % PALETTE.length] }} />{nm}</span>)}
      </figcaption>
    </figure>
  );
}

function CorrMatrix({ names, corr }: { names: string[]; corr: number[][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="font-mono text-[10px]" aria-label="Correlation matrix">
        <thead><tr><th />{names.map((n) => <th key={n} className="px-1 pb-1 text-muted-foreground">{n.replace("SYN-", "")}</th>)}</tr></thead>
        <tbody>
          {corr.map((row, i) => (
            <tr key={i}>
              <th className="pr-2 text-left text-muted-foreground">{names[i]!.replace("SYN-", "")}</th>
              {row.map((v, j) => (
                <td key={j} className="h-9 w-12 border border-background text-center text-foreground"
                  style={{ background: `color-mix(in oklab, ${v >= 0 ? "var(--primary)" : "var(--rose)"} ${Math.round(Math.abs(v) * 70)}%, var(--surface))` }}
                  title={`${names[i]} / ${names[j]}: ${v.toFixed(3)}`}>{v.toFixed(2)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

type Pt = { label: string; vol: number; ret: number; kind: "asset" | "classical" | "quantum" };
function RiskReturn({ points }: { points: Pt[] }) {
  const W = 640, H = 260, L = 46, R = 12, T = 12, B = 30;
  const vs = points.map((p) => p.vol), rs = points.map((p) => p.ret);
  const x0 = 0, x1 = Math.max(...vs) * 1.1 || 1, y0 = Math.min(0, ...rs) * 1.1, y1 = Math.max(...rs) * 1.15 || 1;
  const sx = (v: number) => L + ((v - x0) / (x1 - x0)) * (W - L - R), sy = (r: number) => T + (1 - (r - y0) / (y1 - y0)) * (H - T - B);
  const color = { asset: "var(--muted-foreground)", classical: "var(--emerald)", quantum: "var(--primary)" };
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Risk-return scatter: annualised volatility vs expected return">
      <line x1={L} x2={W - R} y1={sy(0)} y2={sy(0)} stroke="var(--border)" />
      <line x1={L} x2={L} y1={T} y2={H - B} stroke="var(--border)" />
      {[0.25, 0.5, 0.75, 1].map((f) => <text key={f} x={sx(x1 * f)} y={H - B + 12} textAnchor="middle" fontSize={9} className="fill-muted-foreground font-mono">{(x1 * f * 100).toFixed(0)}%</text>)}
      {[y0, (y0 + y1) / 2, y1].map((r) => <text key={r} x={L - 4} y={sy(r) + 3} textAnchor="end" fontSize={9} className="fill-muted-foreground font-mono">{(r * 100).toFixed(0)}%</text>)}
      <text x={(L + W) / 2} y={H - 4} textAnchor="middle" fontSize={9} className="fill-muted-foreground font-mono">volatility (annualised)</text>
      {points.map((p) => (
        <g key={p.label}>
          {p.kind === "asset" ? <circle cx={sx(p.vol)} cy={sy(p.ret)} r={4} fill={color.asset} /> : <rect x={sx(p.vol) - 5} y={sy(p.ret) - 5} width={10} height={10} fill="none" stroke={color[p.kind]} strokeWidth={2} transform={`rotate(45 ${sx(p.vol)} ${sy(p.ret)})`} />}
          <text x={sx(p.vol) + 8} y={sy(p.ret) + 3} fontSize={9} className="font-mono" fill={color[p.kind]}>{p.label}</text>
        </g>
      ))}
    </svg>
  );
}

function Allocation({ names, rows }: { names: string[]; rows: { label: string; weights: number[] }[] }) {
  return (
    <div className="space-y-3">
      {rows.map((r) => (
        <div key={r.label}>
          <div className="mb-1 font-mono text-[10px] uppercase text-muted-foreground">{r.label}</div>
          <div className="flex h-5 overflow-hidden rounded-sm border border-border bg-surface" role="img" aria-label={`${r.label} weights`}>
            {r.weights.map((w, i) => (w > 1e-9 ? <div key={i} style={{ width: `${w * 100}%`, background: PALETTE[i % PALETTE.length] }} title={`${names[i]}: ${pct(w, 1)}`} className="border-r border-background" /> : null))}
          </div>
          <div className="mt-1 font-mono text-[10px] text-muted-foreground">
            {r.weights.map((w, i) => (Math.abs(w) > 1e-9 ? `${names[i]} ${pct(w, 1)}` : null)).filter(Boolean).join(" · ")}
            {r.weights.some((w) => w < -1e-9) ? " (negative = short)" : ""}
          </div>
        </div>
      ))}
    </div>
  );
}

export function FinanceLab() {
  const [mode, setMode] = useState<Mode>("demo");
  const [demoSeed, setDemoSeed] = useState(42);
  const [csvText, setCsvText] = useState("");
  const [loaded, setLoaded] = useState<{ csv: PriceSeries | null; live: PriceSeries | null }>({ csv: null, live: null });
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [symbols, setSymbols] = useState<string[]>(DEF_SYMS);
  const [range, setRange] = useState<RangeId>("1y");
  const [model, setModel] = useState(DEF_MODEL);
  const [cfg, setCfg] = useState<PortfolioConfig>(DEF_CFG);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [runErr, setRunErr] = useState<string | null>(null);
  const [result, setResult] = useState<FinanceExperiment | null>(null);
  const [pdfBusy, setPdfBusy] = useState(false);
  const abort = useRef<AbortController | null>(null);

  // Live-provider status (server reports booleans + env-var names only)
  const statusFn = useServerFn(getFinanceProviderStatus);
  const liveFn = useServerFn(fetchLiveHistory);
  const [provider, setProvider] = useState<ProviderStatus | null>(null);
  const [liveKind, setLiveKind] = useState<ProviderKind>("crypto");
  const [liveSyms, setLiveSyms] = useState("");
  const [liveBusy, setLiveBusy] = useState(false);
  useEffect(() => { statusFn().then(setProvider).catch(() => setProvider({ configured: false, providers: [] })); }, [statusFn]);

  const demo = useMemo(() => demoPrices(demoSeed), [demoSeed]);
  const series: PriceSeries | null = mode === "demo" ? demo : loaded[mode];
  const sliced = useMemo(() => { try { return series ? sliceRange(series, range) : null; } catch { return null; } }, [series, range]);
  const statsRes = useMemo(() => (sliced ? computeStats(sliced, symbols) : null), [sliced, symbols]);
  const stats = statsRes?.stats;
  const fullModel: PortfolioModel = { ...model, excluded: [] };
  const errors = series ? validateFinance(series, { symbols, range, model: fullModel, config: cfg }) : [];
  const ising = useMemo(() => {
    if (!stats || errors.length) return null;
    try { return isingTerms(quboToIsing(buildQubo({ names: stats.symbols, mu: stats.mu, sigma: stats.sigma, source: "user" }, fullModel)), 3); } catch { return null; }
  }, [stats, errors.length, model]); // eslint-disable-line react-hooks/exhaustive-deps

  const switchMode = (m: Mode) => {
    abort.current?.abort(); setMode(m); setResult(null); setRunErr(null); setLoadErr(null);
    const s = m === "demo" ? demo : loaded[m];
    if (s) setSymbols(s.symbols.slice(0, Math.min(5, s.symbols.length)));
  };
  const useSeries = (s: PriceSeries, m: "csv" | "live") => {
    setLoaded((l) => ({ ...l, [m]: s })); setSymbols(s.symbols.slice(0, Math.min(FINANCE_MAX_ASSETS, s.symbols.length, 5))); setRange("all"); setResult(null);
    setModel((x) => ({ ...x, k: Math.min(x.k, Math.max(1, Math.min(s.symbols.length, 5) - 1)) }));
  };
  const loadCsv = (text: string) => {
    setCsvText(text);
    const r = parsePriceCsv(text);
    if (r.errors.length) { setLoadErr(r.errors.join(" ")); setLoaded((l) => ({ ...l, csv: null })); return; }
    setLoadErr(null); useSeries(r.series!, "csv");
  };
  const onFile = async (f: File | undefined) => {
    if (!f) return;
    if (f.size > 2_000_000) { setLoadErr("File is larger than 2 MB."); return; }
    loadCsv(await f.text()); // read locally; never uploaded anywhere
  };
  const loadLive = async () => {
    setLiveBusy(true); setLoadErr(null);
    try {
      const syms = liveSyms.split(/[\s,]+/).filter(Boolean);
      const r = await liveFn({ data: { kind: liveKind, symbols: syms, range } });
      if (r.ok) useSeries(r.series, "live"); else setLoadErr(r.error + (r.missing ? ` Missing: ${r.missing.join(", ")}.` : ""));
    } catch { setLoadErr("Invalid symbols: enter 2–8 symbols (letters, digits, . _ - ^ /)."); }
    finally { setLiveBusy(false); }
  };
  const toggleSym = (s: string) => { setResult(null); setSymbols((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : cur.length >= FINANCE_MAX_ASSETS ? cur : [...cur, s])); };

  const run = async () => {
    if (!series || errors.length) return;
    abort.current?.abort();
    const ctl = new AbortController(); abort.current = ctl;
    setRunning(true); setProgress(0); setRunErr(null);
    try {
      const r = await runFinanceExperiment(series, { symbols, range, model: fullModel, config: cfg }, { signal: ctl.signal, onProgress: setProgress, demoSeed: mode === "demo" ? demoSeed : undefined });
      if (!ctl.signal.aborted) setResult(r);
    } catch (e) {
      if (!ctl.signal.aborted) setRunErr(e instanceof Error ? e.message : "Optimisation failed.");
    } finally { if (abort.current === ctl) setRunning(false); }
  };
  const cancel = () => { abort.current?.abort(); setRunning(false); };
  const reset = () => { cancel(); setMode("demo"); setDemoSeed(42); setSymbols(DEF_SYMS); setRange("1y"); setModel(DEF_MODEL); setCfg(DEF_CFG); setResult(null); setRunErr(null); setLoadErr(null); };

  const exportPdf = async () => {
    if (!result) return;
    setPdfBusy(true);
    try {
      const { buildReport } = await import("@/lib/report");
      const { renderReportPdf, reportFilename } = await import("@/lib/report/pdf");
      const doc = buildReport({ kind: "finance", experiment: result });
      const url = URL.createObjectURL(renderReportPdf(doc).output("blob"));
      const a = document.createElement("a"); a.href = url; a.download = reportFilename(doc); a.click();
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch (e) { setRunErr(e instanceof Error ? `PDF export failed: ${e.message}` : "PDF export failed."); }
    finally { setPdfBusy(false); }
  };

  const num = (v: string) => (v.trim() === "" ? NaN : Number(v));
  const names = stats?.symbols ?? [];
  const sel = (x: number) => names.filter((_, i) => (x >> i) & 1).join(", ") || "(none)";

  return (
    <div className="space-y-6">
      <div role="note" className="rounded-md border border-amber/40 bg-card p-4 text-xs leading-6 text-muted-foreground">
        <p className="font-medium text-foreground">{QUANTUM_NOTICE}</p>
        <p className="mt-1">Not financial advice · No guaranteed returns · Historical performance does not guarantee future results · No claim of quantum advantage.</p>
      </div>

      {/* ---------------- Data source ---------------- */}
      <Panel title="1 · Market data source" aside={<Tag kind="market" />}>
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Data mode">
          {([["demo", "Synthetic (seeded)", Database], ["csv", "CSV upload", Upload], ["live", "Live provider", Radio]] as const).map(([m, label, Icon]) => (
            <Button key={m} role="tab" aria-selected={mode === m} variant={mode === m ? "default" : "outline"} size="sm" onClick={() => switchMode(m)}><Icon className="h-3.5 w-3.5" />{label}</Button>
          ))}
        </div>

        {mode === "demo" && (
          <div className="mt-4 grid gap-3 sm:grid-cols-[160px_1fr] sm:items-end">
            <label className="text-xs text-muted-foreground">Synthetic seed
              <input type="number" className={field} value={demoSeed} onChange={(e) => { const v = Math.trunc(Number(e.target.value)); if (Number.isFinite(v) && v >= 0 && v < 2 ** 31) { setDemoSeed(v); setResult(null); } }} />
            </label>
            <p className="text-xs leading-6 text-muted-foreground">Seeded one-factor GBM prices on a synthetic weekday calendar. Symbols prefixed <span className="font-mono">SYN-</span> are fictional — this is not market data.</p>
          </div>
        )}

        {mode === "csv" && (
          <div className="mt-4 space-y-3">
            <p className="text-xs leading-6 text-muted-foreground">
              Header <span className="font-mono">date,SYM1,SYM2,…</span>, one row per period with positive closing prices (YYYY-MM-DD). At least 21 rows, no missing values.
              The file is read in your browser only and never sent to any server.
            </p>
            <div className="flex flex-wrap gap-2">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-1.5 text-xs hover:bg-surface focus-within:ring-2 focus-within:ring-ring">
                <Upload className="h-3.5 w-3.5" /> Choose CSV file
                <input type="file" accept=".csv,text/csv,text/plain" className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} />
              </label>
              <Button variant="outline" size="sm" onClick={() => {
                const d = sliceRange(demoPrices(7), "6m");
                loadCsv(["date," + d.symbols.slice(0, 4).map((s) => s.replace("SYN-", "EX-")).join(","), ...d.dates.map((dt, t) => [dt, ...d.prices.slice(0, 4).map((p) => p[t]!.toFixed(4))].join(","))].join("\n"));
              }}>Insert example CSV</Button>
            </div>
            <textarea aria-label="CSV price data" className={`${field} h-32`} value={csvText} onChange={(e) => setCsvText(e.target.value)} placeholder={"date,AAA,BBB\n2024-01-02,100.0,50.0\n…"} />
            <Button size="sm" variant="outline" onClick={() => loadCsv(csvText)}>Parse CSV</Button>
            {loaded.csv && !loadErr ? <p className="font-mono text-xs text-emerald">Loaded {loaded.csv.symbols.length} assets × {loaded.csv.dates.length} rows ({loaded.csv.dates[0]} → {loaded.csv.dates.at(-1)}).</p> : null}
          </div>
        )}

        {mode === "live" && (
          <div className="mt-4 space-y-3">
            {!provider ? <p className="text-xs text-muted-foreground"><Loader2 className="mr-1 inline h-3 w-3 animate-spin" />Checking provider configuration…</p> : !provider.configured ? (
              <div className="rounded-sm border border-amber/40 bg-surface p-3 text-xs leading-6">
                <p className="font-mono uppercase text-amber">Live data not configured</p>
                <p className="mt-1 text-muted-foreground">No market-data provider is connected, and nothing paid has been enabled. Synthetic and CSV modes remain fully usable. To enable live data later, a provider URL and API key are stored as server-side secrets:</p>
                <ul className="mt-2 space-y-1 font-mono text-[11px] text-muted-foreground">
                  {provider.providers.map((p) => <li key={p.kind}>{p.label}: {p.missing.join(" + ")}</li>)}
                </ul>
              </div>
            ) : (
              <>
                <ul className="font-mono text-[11px] text-muted-foreground">{provider.providers.map((p) => <li key={p.kind}>{p.label}: {p.configured ? <span className="text-emerald">configured</span> : "not configured"}</li>)}</ul>
                <div className="grid gap-2 sm:grid-cols-[180px_1fr_auto] sm:items-end">
                  <label className="text-xs text-muted-foreground">Provider
                    <select className={field} value={liveKind} onChange={(e) => setLiveKind(e.target.value as ProviderKind)}>
                      {provider.providers.filter((p) => p.configured).map((p) => <option key={p.kind} value={p.kind}>{p.label}</option>)}
                    </select>
                  </label>
                  <label className="text-xs text-muted-foreground">Symbols (2–8, comma separated)
                    <input className={field} value={liveSyms} onChange={(e) => setLiveSyms(e.target.value)} />
                  </label>
                  <Button size="sm" onClick={loadLive} disabled={liveBusy}>{liveBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Radio className="h-3.5 w-3.5" />}Fetch history</Button>
                </div>
              </>
            )}
          </div>
        )}
        {loadErr ? <p role="alert" className="mt-3 text-xs text-rose">{loadErr}</p> : null}
      </Panel>

      {series ? (
        <>
          {/* ---------------- Asset selection & market statistics ---------------- */}
          <Panel title="2 · Assets & time range" aside={<span className="font-mono text-[10px] text-muted-foreground">{symbols.length}/{FINANCE_MAX_ASSETS} selected</span>}>
            <div className="flex flex-wrap gap-2" aria-label="Asset selector">
              {series.symbols.map((s) => (
                <label key={s} className={`flex cursor-pointer items-center gap-1.5 rounded-sm border px-2 py-1 font-mono text-xs ${symbols.includes(s) ? "border-primary text-foreground" : "border-border text-muted-foreground"}`}>
                  <input type="checkbox" className="accent-[var(--primary)]" checked={symbols.includes(s)} onChange={() => toggleSym(s)} disabled={!symbols.includes(s) && symbols.length >= FINANCE_MAX_ASSETS} />
                  {s}{series.classes?.[series.symbols.indexOf(s)] ? <span className="text-[9px] uppercase text-muted-foreground">{series.classes[series.symbols.indexOf(s)]}</span> : null}
                </label>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-2" role="radiogroup" aria-label="Time range">
              {RANGES.map((r) => <Button key={r.id} size="sm" role="radio" aria-checked={range === r.id} variant={range === r.id ? "default" : "outline"} onClick={() => { setRange(r.id); setResult(null); }}>{r.label}</Button>)}
            </div>
            {statsRes?.errors.length ? <p role="alert" className="mt-3 text-xs text-rose">{statsRes.errors.join(" ")}</p> : null}
          </Panel>

          {stats ? (
            <div className="grid gap-6 lg:grid-cols-2">
              <Panel title="Normalised price history" aside={<Tag kind="market" />} className="lg:col-span-2">
                <PriceChart dates={sliced!.dates} series={stats.normalized} names={stats.symbols} />
                <p className="mt-2 font-mono text-[10px] text-muted-foreground">{stats.periods} returns · {stats.start} → {stats.end} · annualised × {stats.periodsPerYear}</p>
              </Panel>
              <Panel title="Returns, volatility & covariance" aside={<Tag kind="classical" />}>
                <div className="overflow-x-auto">
                  <table className="w-full font-mono text-xs">
                    <thead className="text-muted-foreground"><tr><th className="text-left">Asset</th><th className="text-right">E[r] ann.</th><th className="text-right">Vol</th><th className="text-right">Range return</th></tr></thead>
                    <tbody>{stats.symbols.map((s, i) => <tr key={s} className="border-t border-border"><td className="py-1">{s}</td><td className="text-right">{pct(stats.mu[i])}</td><td className="text-right">{pct(stats.vol[i])}</td><td className="text-right">{pct(stats.totalReturn[i])}</td></tr>)}</tbody>
                  </table>
                </div>
                <details className="mt-3 text-xs"><summary className="cursor-pointer text-muted-foreground">Covariance matrix Σ (annualised)</summary>
                  <div className="mt-2 overflow-x-auto"><table className="font-mono text-[10px]"><tbody>{stats.sigma.map((r, i) => <tr key={i}>{r.map((v, j) => <td key={j} className="px-1.5 py-0.5 text-right">{v.toFixed(4)}</td>)}</tr>)}</tbody></table></div>
                </details>
              </Panel>
              <Panel title="Correlation matrix" aside={<Tag kind="classical" />}><CorrMatrix names={stats.symbols} corr={stats.corr} /></Panel>
            </div>
          ) : null}

          {/* ---------------- Portfolio construction ---------------- */}
          <Panel title="3 · Portfolio construction & QAOA settings">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <label className="text-xs text-muted-foreground">Risk aversion q<input type="number" step={0.5} className={field} value={Number.isNaN(model.riskAversion) ? "" : model.riskAversion} onChange={(e) => setModel({ ...model, riskAversion: num(e.target.value) })} /></label>
              <label className="text-xs text-muted-foreground">Portfolio size K<input type="number" className={field} value={Number.isNaN(model.k) ? "" : model.k} onChange={(e) => setModel({ ...model, k: num(e.target.value) })} /></label>
              <label className="text-xs text-muted-foreground">Penalty A<input type="number" step={0.1} className={field} value={Number.isNaN(model.penalty) ? "" : model.penalty} onChange={(e) => setModel({ ...model, penalty: num(e.target.value) })} /></label>
              <label className="text-xs text-muted-foreground">QAOA depth p (1–{PORTFOLIO_MAX_P})<input type="number" className={field} value={Number.isNaN(cfg.p) ? "" : cfg.p} onChange={(e) => setCfg({ ...cfg, p: num(e.target.value) })} /></label>
              <label className="text-xs text-muted-foreground">Seed<input type="number" className={field} value={Number.isNaN(cfg.seed) ? "" : cfg.seed} onChange={(e) => setCfg({ ...cfg, seed: num(e.target.value) })} /></label>
              <label className="text-xs text-muted-foreground">Restarts<input type="number" className={field} value={Number.isNaN(cfg.restarts) ? "" : cfg.restarts} onChange={(e) => setCfg({ ...cfg, restarts: num(e.target.value) })} /></label>
              <label className="text-xs text-muted-foreground">Max iterations<input type="number" className={field} value={Number.isNaN(cfg.maxIter) ? "" : cfg.maxIter} onChange={(e) => setCfg({ ...cfg, maxIter: num(e.target.value) })} /></label>
              <label className="text-xs text-muted-foreground">Shots<input type="number" className={field} value={Number.isNaN(cfg.shots) ? "" : cfg.shots} onChange={(e) => setCfg({ ...cfg, shots: num(e.target.value) })} /></label>
            </div>
            <div className="mt-4 rounded-sm border border-border bg-surface p-3 font-mono text-[11px] leading-6 text-muted-foreground">
              <div className="text-foreground">QUBO: f(x) = q·xᵀΣx − μᵀx + A·(Σᵢxᵢ − K)²,  x ∈ {"{0,1}"}ⁿ</div>
              <div>risk → q·xᵀΣx · return → −μᵀx · cardinality constraint → A·(Σx − K)² · Ising via xᵢ = (1 − zᵢ)/2</div>
              {ising ? <details className="mt-1"><summary className="cursor-pointer">Ising Hamiltonian H = …</summary><div className="mt-1 break-all">{ising}</div></details> : null}
            </div>
            {errors.length ? <ul role="alert" className="mt-3 space-y-1 text-xs text-rose">{errors.map((e) => <li key={e}>{e}</li>)}</ul> : null}
            {runErr ? <p role="alert" className="mt-3 text-xs text-rose">{runErr}</p> : null}
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {running
                ? <Button size="sm" variant="outline" onClick={cancel}><Square className="h-3.5 w-3.5" />Cancel ({Math.round(progress * 100)}%)</Button>
                : <Button size="sm" onClick={run} disabled={errors.length > 0}><Play className="h-3.5 w-3.5" />Run quantum finance experiment</Button>}
              <Button size="sm" variant="outline" onClick={reset}><RotateCcw className="h-3.5 w-3.5" />Reset</Button>
              {result ? <Button size="sm" variant="outline" onClick={exportPdf} disabled={pdfBusy}>{pdfBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileDown className="h-3.5 w-3.5" />}Export PDF report</Button> : null}
            </div>
            {running ? <div className="mt-3 h-1 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}><div className="h-full bg-primary transition-all" style={{ width: `${progress * 100}%` }} /></div> : null}
          </Panel>
        </>
      ) : null}

      {/* ---------------- Results ---------------- */}
      {result ? <Results r={result} sel={sel} /> : null}
    </div>
  );
}

function Results({ r, sel }: { r: FinanceExperiment; sel: (x: number) => string }) {
  const st = r.stats, res = r.result, b = r.baselines, n = st.symbols.length;
  const top = Array.from({ length: res.probs.length }, (_, i) => i).sort((a, c) => res.probs[c]! - res.probs[a]!).slice(0, 16);
  const hist = res.history, lo = Math.min(res.exact.value, ...hist.map((h) => h.best)), hi = Math.max(res.exact.value, ...hist.map((h) => h.best));
  const pts: Pt[] = [
    ...st.symbols.map((s, i) => ({ label: s.replace("SYN-", ""), vol: st.vol[i]!, ret: st.mu[i]!, kind: "asset" as const })),
    { label: "Equal wt", vol: b.equalWeight.vol, ret: b.equalWeight.ret, kind: "classical" },
    ...(b.minVariance ? [{ label: "Min-var", vol: b.minVariance.vol, ret: b.minVariance.ret, kind: "classical" as const }] : []),
    { label: "Exact opt", vol: b.exact.vol, ret: b.exact.ret, kind: "classical" },
    { label: "QAOA best", vol: b.qaoaSampledBest.vol, ret: b.qaoaSampledBest.ret, kind: "quantum" },
  ];
  const rows: { m: string; t: "classical" | "quantum"; p: string; ret: number; vol: number; obj?: number }[] = [
    { m: "Equal weight (all selected assets)", t: "classical", p: "all", ret: b.equalWeight.ret, vol: b.equalWeight.vol },
    ...(b.minVariance ? [{ m: `Global min-variance${b.minVariance.longOnly ? "" : " (uses shorts)"}`, t: "classical" as const, p: "continuous", ret: b.minVariance.ret, vol: b.minVariance.vol }] : []),
    ...(b.minVarSubset ? [{ m: `Min-variance K-subset`, t: "classical" as const, p: sel(b.minVarSubset.x), ret: b.minVarSubset.p.ret, vol: b.minVarSubset.p.vol }] : []),
    { m: "Exhaustive QUBO optimum", t: "classical", p: sel(res.exact.assignment), ret: b.exact.ret, vol: b.exact.vol, obj: res.exact.value },
    { m: "QAOA most likely", t: "quantum", p: sel(res.mostLikely.x), ret: b.qaoaMostLikely.ret, vol: b.qaoaMostLikely.vol, obj: res.mostLikely.value },
    { m: "QAOA sampled best", t: "quantum", p: sel(res.sampledBest.x), ret: b.qaoaSampledBest.ret, vol: b.qaoaSampledBest.vol, obj: res.sampledBest.value },
  ];
  return (
    <div className="space-y-6">
      <Panel title="4 · Results — simulated QAOA vs classical" aside={<Tag kind="quantum" />}>
        <p className="mb-4 text-xs text-muted-foreground">{QUANTUM_NOTICE}</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Selected (exact optimum)" value={sel(res.exact.assignment).replace(/SYN-/g, "")} hint={res.exact.feasible ? `feasible, |S| = ${r.model.k}` : "infeasible — raise A"} />
          <Stat label="Expected return" value={pct(b.exact.ret)} hint="equal-weight, annualised" />
          <Stat label="Volatility / variance" value={pct(b.exact.vol)} hint={`σ² = ${fmt(b.exact.vol ** 2)}`} />
          <Stat label="Objective f*" value={fmt(res.exact.value)} hint="exhaustive minimum" />
          <Stat label="⟨f⟩ QAOA state" value={fmt(res.expectedObjective)} hint="expected objective" />
          <Stat label="Approximation ratio" value={fmt(r.approxRatio, 3)} hint="(f_max − ⟨f⟩)/(f_max − f*)" />
          <Stat label="P(optimal portfolio)" value={pct(res.pOptimal)} hint={`uniform = ${pct(1 / 2 ** n)}`} />
          <Stat label="QAOA sampled best" value={sel(res.sampledBest.x).replace(/SYN-/g, "")} hint={`${res.sampledBest.count}/${res.config.shots} shots · f = ${fmt(res.sampledBest.value)}`} />
        </div>
        <div className="mt-4 font-mono text-[11px] text-muted-foreground">γ = [{res.gammas.map((g) => g.toFixed(4)).join(", ")}] · β = [{res.betas.map((x) => x.toFixed(4)).join(", ")}] · {res.evaluations} evaluations</div>
      </Panel>

      <Panel title="Quantum vs classical comparison">
        <div className="overflow-x-auto">
          <table className="w-full font-mono text-xs">
            <thead className="text-muted-foreground"><tr><th className="text-left">Method</th><th className="text-left">Type</th><th className="text-left">Portfolio</th><th className="text-right">Return</th><th className="text-right">Vol</th><th className="text-right">Objective</th></tr></thead>
            <tbody>{rows.map((x) => (
              <tr key={x.m} className="border-t border-border"><td className="py-1.5 pr-2">{x.m}</td><td className="pr-2"><Tag kind={x.t} /></td><td className="pr-2">{x.p.replace(/SYN-/g, "")}</td><td className="text-right">{pct(x.ret)}</td><td className="text-right">{pct(x.vol)}</td><td className="text-right">{x.obj === undefined ? "—" : fmt(x.obj)}</td></tr>
            ))}</tbody>
          </table>
        </div>
        <p className="mt-3 text-xs leading-6 text-muted-foreground">Exhaustive search over 2^{n} = {2 ** n} selections is exact and instant at this size. The comparison illustrates the formulation only and is not evidence of quantum advantage.</p>
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Risk–return map"><RiskReturn points={pts} /><p className="mt-1 font-mono text-[10px] text-muted-foreground">● assets · ◆ emerald = classical · ◆ cyan = simulated QAOA</p></Panel>
        <Panel title="Allocation / selection">
          <Allocation names={st.symbols} rows={[
            { label: "Exhaustive optimum (classical)", weights: b.exact.weights },
            { label: "QAOA most likely (simulated)", weights: b.qaoaMostLikely.weights },
            { label: "Equal weight (classical)", weights: b.equalWeight.weights },
            ...(b.minVariance ? [{ label: "Global min-variance (classical)", weights: b.minVariance.weights.map((w) => Math.max(0, w)) }] : []),
          ]} />
        </Panel>
        <Panel title="QAOA probability distribution (top 16)" aside={<Tag kind="quantum" />}>
          <Histogram ariaLabel="QAOA probability over portfolio bitstrings" valueFormat={(v) => `${(v * 100).toFixed(2)}%`}
            bars={top.map((x) => ({ label: `${toBitstring(x, n)}${x === res.exact.assignment ? "★" : ""}`, value: res.probs[x]! }))} />
          <p className="mt-2 font-mono text-[10px] text-muted-foreground">Bitstrings little-endian (asset 0 = rightmost). ★ = exact optimum.</p>
        </Panel>
        <Panel title="Convergence history" aside={<Tag kind="quantum" />}>
          <LineChart ariaLabel="QAOA expected objective convergence" xLabel="objective evaluations (log)" yLabel="⟨f⟩" yMin={lo - (hi - lo) * 0.05 - 1e-9} yMax={hi + (hi - lo) * 0.05 + 1e-9}
            series={[{ name: "QAOA best ⟨f⟩", color: "var(--primary)", points: hist.map((h) => ({ x: h.evals, y: h.best })) },
              { name: "exact optimum f*", color: "var(--emerald)", dashed: true, points: [{ x: 1, y: res.exact.value }, { x: Math.max(10, res.evaluations), y: res.exact.value }] }]} />
        </Panel>
      </div>
    </div>
  );
}
