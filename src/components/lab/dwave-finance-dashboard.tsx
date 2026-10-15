import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Activity, ArrowLeft, ArrowUpRight, Check, ChevronDown, FlaskConical, Pause, Play, RotateCcw, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ANNUAL_RETURNS, ASSET_WEIGHTS, METRICS, STRATEGIES, STUDY_SCOPE, SUPPLIED_WEIGHT_TOTAL, type StrategyId } from "@/lib/finance/dwave-reference";

function AnimatedAnnealingNetwork({ running }: { running: boolean }) {
  const nodes = Array.from({ length: 24 }, (_, i) => {
    const angle = (i / 24) * Math.PI * 2;
    return { x: 300 + Math.cos(angle) * 205, y: 220 + Math.sin(angle) * 175 };
  });
  return <section className="relative mt-8 overflow-hidden rounded-2xl border border-cyan-400/40 bg-[#061329] p-4 shadow-[0_0_45px_rgba(6,182,212,0.12)] sm:p-7" aria-label="Animated quantum optimization network">
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-25" style={{ backgroundImage: "linear-gradient(rgba(34,211,238,.14) 1px,transparent 1px),linear-gradient(90deg,rgba(34,211,238,.14) 1px,transparent 1px)", backgroundSize: "34px 34px" }} />
    <div className="relative z-10 flex flex-wrap items-start justify-between gap-3">
      <div><h2 className="text-lg font-bold tracking-wide text-cyan-100 sm:text-xl">QUANTUM ANNEALING NETWORK</h2>
        <p className="mt-1 text-xs text-cyan-200/70">Animated optimization topology · conceptual research visualization</p></div>
      <span className="rounded-full border border-cyan-400/50 bg-cyan-400/10 px-3 py-1 font-mono text-[11px] text-cyan-200">{running ? "● NETWORK ACTIVE" : "Ⅱ ANIMATION PAUSED"}</span>
    </div>
    <div className="relative z-10 grid items-center gap-2 lg:grid-cols-[minmax(0,1fr)_190px]">
      <svg viewBox="0 0 600 440" role="img" aria-label="Large animated quantum network with pulsing nodes and connected optimization paths" className="mx-auto block w-full max-w-4xl drop-shadow-[0_0_22px_rgba(34,211,238,0.35)]">
        <defs>
          <radialGradient id="annealing-bg"><stop stopColor="#06b6d4" stopOpacity=".45"/><stop offset=".6" stopColor="#0891b2" stopOpacity=".13"/><stop offset="1" stopColor="#0e7490" stopOpacity="0"/></radialGradient>
          <linearGradient id="annealing-line" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#22d3ee"/><stop offset="1" stopColor="#a78bfa"/></linearGradient>
        </defs>
        <circle cx="300" cy="220" r="215" fill="url(#annealing-bg)" />
        <circle cx="300" cy="220" r="198" fill="none" stroke="#22d3ee" strokeWidth="1" strokeDasharray="3 12" opacity=".4" />
        {nodes.map((node, i) => <g key={i}>
          <line x1={node.x} y1={node.y} x2={nodes[(i + 7) % nodes.length].x} y2={nodes[(i + 7) % nodes.length].y} stroke="url(#annealing-line)" strokeWidth="1.4" opacity=".48" />
          <line x1={node.x} y1={node.y} x2={nodes[(i + 11) % nodes.length].x} y2={nodes[(i + 11) % nodes.length].y} stroke="#22d3ee" strokeWidth=".9" opacity=".22" />
          <line x1={node.x} y1={node.y} x2="300" y2="220" stroke="#a78bfa" strokeWidth=".85" opacity=".36" />
          <circle cx={node.x} cy={node.y} r="7" fill="#22d3ee" opacity=".18" />
          <circle cx={node.x} cy={node.y} r="3.7" fill="#a5f3fc">
            {running && <animate attributeName="opacity" values=".25;1;.25" dur={`${1.3 + (i % 6) * .25}s`} repeatCount="indefinite" />}
          </circle>
        </g>)}
        <circle cx="300" cy="220" r="33" fill="#22d3ee" opacity=".12" />
        <circle cx="300" cy="220" r="14" fill="#e0f2fe" />
        <circle cx="300" cy="220" r="25" fill="none" stroke="#22d3ee" strokeWidth="2" strokeDasharray="5 6" className={running ? "motion-safe:animate-spin" : ""} style={{ transformOrigin: "300px 220px" }} />
        <circle cx="300" cy="220" r="65" fill="none" stroke="#a78bfa" strokeWidth=".8" strokeDasharray="2 9" opacity=".55" />
      </svg>
      <div className="grid grid-cols-3 gap-2 lg:grid-cols-1">
        {[["24", "Visual nodes"], ["3", "Connection layers"], [running ? "ON" : "OFF", "Motion status"]].map(([value, label]) => <div key={label} className="rounded-lg border border-cyan-400/25 bg-cyan-950/40 px-3 py-3 backdrop-blur-sm">
          <div className="font-mono text-xl font-semibold text-cyan-200 sm:text-2xl">{value}</div>
          <div className="mt-1 text-[10px] uppercase tracking-wide text-slate-300">{label}</div>
        </div>)}
      </div>
    </div>
    <p className="relative z-10 mt-2 border-t border-cyan-400/20 pt-3 text-[11px] leading-5 text-slate-400">Conceptual animation only — not a live D-Wave processor, hardware execution, or verified quantum computation.</p>
  </section>;
}

export function DwaveFinanceDashboard() {
  const [visible, setVisible] = useState<StrategyId[]>(STRATEGIES.map(s => s.id));
  const [tab, setTab] = useState<"overview" | "methodology">("overview");
  const [animated, setAnimated] = useState(true);
  const [replay, setReplay] = useState(0);
  const [period, setPeriod] = useState("All periods");
  const [sort, setSort] = useState("weight");
  const [allWeights, setAllWeights] = useState(false);
  const selected = STRATEGIES.filter(s => visible.includes(s.id));
  const annual = ANNUAL_RETURNS.filter(r => period === "All periods" || r.period === period);
  const sortedWeights = [...ASSET_WEIGHTS].sort((a, b) => sort === "symbol" ? a.symbol.localeCompare(b.symbol) : b.weight - a.weight);
  const weights = allWeights ? sortedWeights : sortedWeights.slice(0, 8);
  const toggle = (id: StrategyId) => setVisible(current => current.includes(id) ? current.filter(value => value !== id) : [...current, id]);

  return <div className={animated ? "finance-animate" : ""}>
    <div className="mb-7 flex flex-wrap items-center justify-between gap-3">
      <Link to="/lab" className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><ArrowLeft className="size-3.5" /> Research Lab</Link>
      <span className="flex items-center gap-2 font-mono text-[10px] uppercase text-research-violet"><FlaskConical className="size-3.5" /> Illustrative research · Offline</span>
    </div>
    <header className="border-b border-border pb-8">
      <div className="mb-4 flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase text-primary"><span className="border border-primary/40 bg-signal-soft px-2 py-1">Quantum finance / Research engine</span><span className="text-muted-foreground">Reference study · 2022–2025 YTD</span></div>
      <h1 className="max-w-4xl text-3xl font-semibold leading-tight sm:text-4xl">D-Wave Quantum Finance<br className="hidden sm:block" /> <span className="text-primary">Research Engine</span></h1>
      <p className="mt-4 max-w-3xl text-sm leading-6 text-muted-foreground">Portfolio allocation research comparing simulated annealing, an exact solver and an equal-weight baseline.</p>
      <div role="note" className="mt-5 flex max-w-4xl items-start gap-3 border-l-2 border-research-violet bg-research-violet/5 px-4 py-3 text-xs leading-6 text-muted-foreground"><ShieldCheck className="mt-1 size-4 shrink-0 text-research-violet" /><p><strong className="text-foreground">All metrics are user-provided illustrative backtest figures.</strong> Not live D-Wave output, independently verified results or evidence of quantum advantage. No solver or market feed is running.</p></div>
      <dl className="mt-7 grid grid-cols-3 gap-4 sm:max-w-xl">
        {[[STUDY_SCOPE.assets, "Assets reported"], [STUDY_SCOPE.windows, "Walk-forward windows"], [STUDY_SCOPE.observations, "Observations reported"]].map(([value, label]) => <div key={label}><dt className="text-[10px] leading-5 text-muted-foreground sm:text-xs">{label}</dt><dd className="mt-1 font-mono text-2xl text-foreground">{value}</dd></div>)}
      </dl>
    </header>

    <section className="mt-8 overflow-hidden rounded-xl border border-cyan-400/30 bg-[#061126]" aria-label="D-Wave research visual concept">
      <img
        src="https://raw.githubusercontent.com/Tamas22-cell/quantum-ai-showcase/a69aef46841bdf8b6bcaa12dc60f279f7302ee5e/a17e2cec-4d93-49a6-bd06-6c663b1c857e.png"
        alt="Futuristic D-Wave Quantum Finance dashboard concept with luminous cyan quantum network, market charts and quantum processor artwork"
        loading="lazy"
        className="block h-auto w-full"
      />
      <div className="border-t border-cyan-400/20 bg-slate-950/90 px-4 py-3 text-xs text-slate-300">
        Quantum Finance visual concept · The interactive research metrics and animated network are below.
      </div>
    </section>
    <AnimatedAnnealingNetwork running={animated} />

    <div className="my-6 flex flex-wrap items-center justify-between gap-4">
      <div role="tablist" aria-label="Research views" className="flex gap-2">{(["overview", "methodology"] as const).map(value => <Button key={value} id={`finance-tab-${value}`} role="tab" aria-selected={tab === value} aria-controls="finance-view" variant={tab === value ? "secondary" : "ghost"} onClick={() => setTab(value)} className="capitalize">{value}</Button>)}</div>
      <div className="flex items-center gap-2"><Button size="sm" variant="ghost" aria-pressed={animated} onClick={() => setAnimated(v => !v)}>{animated ? <Pause /> : <Play />} Animation {animated ? "on" : "off"}</Button><Button size="icon" variant="outline" title="Replay chart entrance" aria-label="Replay chart entrance" disabled={!animated} onClick={() => setReplay(v => v + 1)}><RotateCcw /></Button></div>
    </div>

    <div id="finance-view" role="tabpanel" aria-labelledby={`finance-tab-${tab}`}>
      {tab === "overview" ? <>
        <div className="mb-6 flex flex-wrap items-center gap-2" role="group" aria-label="Visible strategies">{STRATEGIES.map(strategy => <Button key={strategy.id} variant="outline" size="sm" aria-pressed={visible.includes(strategy.id)} onClick={() => toggle(strategy.id)} className={visible.includes(strategy.id) ? strategy.color : "text-muted-foreground"}><span className={`size-2 rounded-full ${strategy.bar}`} />{strategy.label}{visible.includes(strategy.id) && <Check className="size-3" />}</Button>)}</div>
        <section aria-label="Reported performance metrics" className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {METRICS.map(metric => <article key={metric.label} className="rounded-md border border-border bg-card p-5"><h2 className="text-xs text-muted-foreground">{metric.label}</h2><div className="mt-5 grid grid-cols-3 gap-2">{STRATEGIES.map((strategy, i) => <div key={strategy.id} className={visible.includes(strategy.id) ? "" : "opacity-30"}><span className={`font-mono text-[10px] ${strategy.color}`}>{strategy.short}</span><p className={`mt-1 whitespace-nowrap font-mono text-xl ${strategy.color}`}>{visible.includes(strategy.id) ? metric.values[i]?.toFixed(metric.digits) + metric.unit : "—"}</p></div>)}</div></article>)}
        </section>

        <section className="mt-9 border-y border-border py-7" aria-labelledby="annual-title">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4"><div><h2 id="annual-title" className="text-lg font-semibold">Annual return comparison</h2><p className="mt-1 text-xs text-muted-foreground">Provided annual data only · 2025 is year-to-date, not a full year</p></div><label className="flex items-center gap-2 text-xs text-muted-foreground">Period<select aria-label="Annual period" value={period} onChange={e => setPeriod(e.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{["All periods", ...ANNUAL_RETURNS.map(r => r.period)].map(p => <option key={p}>{p}</option>)}</select></label></div>
          {selected.length ? <div className="overflow-x-auto"><svg key={`${replay}-${period}-${visible.join()}`} viewBox="0 0 960 300" className="h-72 w-full min-w-[560px]" role="img" aria-label="Illustrative annual returns grouped by strategy; exact figures in table below">
            {[-40, 0, 40, 80, 100].map(value => { const y = 225 - value * 1.7; return <g key={value}><line x1="55" x2="945" y1={y} y2={y} className="stroke-border" strokeDasharray={value === 0 ? undefined : "3 5"} /><text x="4" y={y + 4} className="fill-muted-foreground" fontSize="11">{value}%</text></g>; })}
            {annual.map((row, rowIndex) => { const groupWidth = 880 / annual.length; const center = 60 + groupWidth * (rowIndex + 0.5); return <g key={row.period}><text x={center} y="286" textAnchor="middle" className="fill-muted-foreground" fontSize="12">{row.period}</text>{selected.map((strategy, strategyIndex) => { const index = STRATEGIES.findIndex(s => s.id === strategy.id); const value = row.values[index] ?? 0; const width = Math.min(48, groupWidth / 5); const x = center + (strategyIndex - (selected.length - 1) / 2) * (width + 6); return <rect key={strategy.id} x={x - width / 2} y={value >= 0 ? 225 - value * 1.7 : 225} width={width} height={Math.abs(value) * 1.7} rx="2" className={`finance-bar ${strategy.fill}`}><title>{row.period} · {strategy.label}: {value.toFixed(2)}%</title></rect>; })}</g>; })}
          </svg></div> : <p role="status" className="flex h-72 items-center justify-center text-sm text-muted-foreground">No strategies selected.</p>}
          <div className="mt-3 overflow-x-auto"><table className="w-full min-w-[450px] text-left text-xs"><caption className="sr-only">User-provided annual return figures in percent</caption><thead className="border-b border-border text-muted-foreground"><tr><th className="py-3 font-normal">Period</th>{selected.map(s => <th key={s.id} className={`py-3 text-right font-normal ${s.color}`}>{s.label}</th>)}</tr></thead><tbody>{annual.map(row => <tr key={row.period} className="border-b border-border/50"><th className="py-3 font-normal">{row.period}</th>{selected.map(s => <td key={s.id} className="py-3 text-right font-mono">{row.values[STRATEGIES.findIndex(value => value.id === s.id)]?.toFixed(2)}%</td>)}</tr>)}</tbody></table></div>
        </section>

        <section className="mt-8 grid gap-8 lg:grid-cols-[1.6fr_1fr]" aria-labelledby="weights-title">
          <div><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><h2 id="weights-title" className="text-lg font-semibold">Reported portfolio weights</h2><p className="mt-1 text-xs text-muted-foreground">15 supplied assets · Strategy attribution not supplied</p></div><label className="flex items-center gap-2 text-xs text-muted-foreground">Sort<select aria-label="Sort asset weights" value={sort} onChange={e => setSort(e.target.value)} className="h-9 rounded-md border border-input bg-background px-2 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><option value="weight">Weight</option><option value="symbol">Asset A–Z</option></select></label></div>
            <div key={`${sort}-${replay}`} className="space-y-3">{weights.map((asset, i) => <div key={asset.symbol} className="grid grid-cols-[48px_1fr_60px] items-center gap-3 text-xs"><span className="font-mono text-muted-foreground">{asset.symbol}</span><svg viewBox="0 0 100 8" preserveAspectRatio="none" role="img" aria-label={`${asset.symbol} weight ${asset.weight.toFixed(2)} percent`} className="h-3 w-full rounded-sm bg-muted"><rect width={asset.weight} height="8" className={`finance-bar ${i < 2 ? "fill-primary" : "fill-research-violet"}`} /></svg><span className="text-right font-mono">{asset.weight.toFixed(2)}%</span></div>)}</div>
            <Button variant="ghost" size="sm" aria-expanded={allWeights} className="mt-4 text-primary" onClick={() => setAllWeights(v => !v)}><ChevronDown className={allWeights ? "rotate-180" : ""} />{allWeights ? "Show top 8" : "Show all 15 assets"}</Button>
          </div>
          <aside className="border-l border-border pl-5"><span className="font-mono text-[10px] uppercase text-research-violet">Allocation coverage</span><p className="mt-3 font-mono text-4xl text-foreground">{SUPPLIED_WEIGHT_TOTAL.toFixed(2)}<span className="text-xl text-muted-foreground">%</span></p><p className="mt-4 text-sm leading-7 text-muted-foreground">The listed weights cover 84.61% of the reported portfolio. The remaining 15.39% and the other 15 assets are unspecified. Weights are shown on an absolute 0–100% scale, not renormalized.</p><div className="mt-6 border-t border-border pt-5"><h3 className="text-sm font-semibold">Research interpretation</h3><p className="mt-3 text-xs leading-6 text-muted-foreground">The supplied summary reports higher return and Sharpe for simulated annealing than the other two approaches. Without inputs, costs, constraints and solver logs, this does not establish superiority, reproducibility or quantum advantage.</p></div></aside>
        </section>
      </> : <section className="max-w-4xl space-y-8 py-2" aria-label="Methodology and provenance">
        <div><h2 className="text-xl font-semibold">Methodology & provenance</h2><p className="mt-3 text-sm leading-7 text-muted-foreground">This dashboard presents a user-supplied reference summary. The 30-asset universe, 18 walk-forward windows and 378 observations are reported counts, not a dataset loaded or validated here.</p></div>
        <ol className="grid gap-5 sm:grid-cols-3">{[["01", "Simulated annealing", "A classical stochastic search method for an optimization objective. These figures are supplied, not generated by a local annealer."], ["02", "Exact solver", "An exact optimization reference requires the same objective and constraints. No solver certificate, objective or execution log was supplied."], ["03", "Equal-weight baseline", "A reported comparison baseline. The supplied allocation list is not attributed to this or either solver strategy."]].map(([n, title, text]) => <li key={n} className="border-t border-border pt-4"><span className="font-mono text-xs text-research-violet">{n}</span><h3 className="mt-3 text-sm font-semibold">{title}</h3><p className="mt-3 text-xs leading-6 text-muted-foreground">{text}</p></li>)}</ol>
        <div className="border-y border-border py-6"><h3 className="flex items-center gap-2 text-sm font-semibold"><Activity className="size-4 text-primary" /> Simulation status: not executed</h3><p className="mt-3 text-sm leading-7 text-muted-foreground">D-Wave hardware is not connected. No quantum annealing, API calls, prices, correlations, intrayear returns or equity path are synthesized. Animation reveals the supplied bars only. Summary metrics are retained verbatim; they cannot be reconciled from four annual data points.</p></div>
        <div><h3 className="text-sm font-semibold">Required for a reproducible study</h3><p className="mt-3 text-sm leading-7 text-muted-foreground">Dated price observations, a complete asset universe, rebalancing schedule, train/test boundaries, transaction costs, risk-free rate, downside-return convention, QUBO objective, constraints, solver settings and execution logs. The 2025 YTD cutoff is unspecified.</p></div>
        <p className="text-xs text-muted-foreground">Educational research reference only. Not investment advice.</p>
      </section>}
    </div>
    <footer className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-5 text-[10px] text-muted-foreground"><span>User-provided illustrative backtest figures · No live hardware or market data</span><Link to="/lab/finance" className="inline-flex items-center gap-1 text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Quantum Finance Lab <ArrowUpRight className="size-3" /></Link></footer>
  </div>;
}