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

type ShowcaseView = "annealing" | "portfolio" | "risk" | "research";

function LiveQuantumShowcase({ running }: { running: boolean }) {
  const [view, setView] = useState<ShowcaseView>("annealing");
  const [selectedStrategy, setSelectedStrategy] = useState(0);
  const views: { id: ShowcaseView; title: string; subtitle: string }[] = [
    { id: "annealing", title: "Quantum Annealing", subtitle: "Conceptual optimization network" },
    { id: "portfolio", title: "Portfolio Optimization", subtitle: "Reported asset allocations" },
    { id: "risk", title: "Risk Analysis", subtitle: "Reported strategy risk comparison" },
    { id: "research", title: "Financial Research", subtitle: "Historical reference performance" },
  ];
  const points = Array.from({ length: 16 }, (_, i) => {
    const a = i * Math.PI / 8;
    return { x: 240 + Math.cos(a) * 146, y: 165 + Math.sin(a) * 124 };
  });
  const active = views.find(v => v.id === view)!;
  return <section className="relative mt-8 overflow-hidden rounded-2xl border border-cyan-400/40 bg-[#030e20] text-slate-100 shadow-[0_0_55px_rgba(6,182,212,.16)]" aria-label="Interactive D-Wave quantum finance showcase">
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-30" style={{ backgroundImage: "radial-gradient(ellipse at 50% 40%,rgba(8,145,178,.45),transparent 58%),linear-gradient(rgba(34,211,238,.1) 1px,transparent 1px),linear-gradient(90deg,rgba(34,211,238,.1) 1px,transparent 1px)", backgroundSize: "auto,38px 38px,38px 38px" }} />
    <div className="relative z-10 border-b border-cyan-400/20 p-5 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-mono text-[10px] uppercase tracking-[.25em] text-cyan-400">Interactive research dashboard · Offline reference</p><h2 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">D-WAVE <span className="text-cyan-300">QUANTUM FINANCE</span></h2><p className="mt-2 text-xs text-slate-400">Explore the research panels — click any mode below</p></div><span className="rounded-full border border-cyan-400/40 bg-cyan-400/10 px-3 py-2 font-mono text-[10px] text-cyan-200">{running ? "● VISUALS ACTIVE" : "Ⅱ VISUALS PAUSED"}</span></div>
      <div className="mt-6 grid grid-cols-2 gap-2 lg:grid-cols-4" role="tablist" aria-label="Quantum finance visualization modes">
        {views.map(item => <button type="button" key={item.id} role="tab" aria-selected={view === item.id} onClick={() => setView(item.id)} className={`rounded-lg border px-3 py-3 text-left text-xs font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 ${view === item.id ? "border-cyan-300 bg-cyan-400/20 text-cyan-100 shadow-[0_0_20px_rgba(34,211,238,.2)]" : "border-cyan-400/20 bg-slate-950/50 text-slate-300 hover:border-cyan-400/70 hover:bg-cyan-400/10"}`}>{item.title}<span className="mt-1 block text-[10px] font-normal text-slate-400">{item.subtitle}</span></button>)}
      </div>
    </div>
    <div className="relative z-10 min-h-[360px] p-4 sm:p-7" role="tabpanel">
      {view === "annealing" && <div className="grid items-center gap-4 lg:grid-cols-[1fr_210px]"><svg viewBox="0 0 480 330" className="mx-auto w-full max-w-3xl drop-shadow-[0_0_24px_rgba(34,211,238,.4)]" role="img" aria-label="Animated conceptual quantum optimization graph">
        <defs><radialGradient id="showcase-glow"><stop stopColor="#22d3ee" stopOpacity=".28"/><stop offset="1" stopColor="#22d3ee" stopOpacity="0"/></radialGradient></defs>
        <circle cx="240" cy="165" r="155" fill="url(#showcase-glow)" />
        {points.map((p, i) => <g key={i}><line x1={p.x} y1={p.y} x2={points[(i + 5) % points.length].x} y2={points[(i + 5) % points.length].y} stroke="#22d3ee" strokeWidth="1.1" opacity=".55" /><line x1={p.x} y1={p.y} x2="240" y2="165" stroke="#a78bfa" strokeWidth=".8" opacity=".4" /><circle cx={p.x} cy={p.y} r="4" fill="#a5f3fc">{running && <animate attributeName="opacity" values=".35;1;.35" dur={`${1.2 + i % 5 * .25}s`} repeatCount="indefinite" />}</circle></g>)}
        <circle cx="240" cy="165" r="14" fill="#cffafe" /><circle cx="240" cy="165" r="29" fill="none" stroke="#22d3ee" strokeWidth="2" strokeDasharray="5 8" className={running ? "motion-safe:animate-spin" : ""} style={{ transformOrigin: "240px 165px" }} />
      </svg><div className="grid grid-cols-2 gap-3 lg:grid-cols-1">{[["16","Visual nodes"],["2","Connection types"],[running ? "ON" : "OFF","Animation"]].map(([value,label])=><div key={label} className="rounded-xl border border-cyan-400/25 bg-cyan-950/30 p-4"><p className="font-mono text-2xl font-bold text-cyan-200">{value}</p><p className="mt-1 text-xs text-slate-400">{label}</p></div>)}</div></div>}
      {view === "portfolio" && <div><h3 className="text-lg font-semibold text-cyan-100">Portfolio allocation</h3><p className="mt-1 text-xs text-slate-400">Reported asset weights · 15 supplied assets · not attributed to a specific strategy</p><div className="mt-6 grid gap-x-7 gap-y-4 md:grid-cols-2">{ASSET_WEIGHTS.slice(0,10).map(asset => <div key={asset.symbol}><div className="mb-1 flex justify-between text-xs"><span className="font-mono text-cyan-100">{asset.symbol}</span><span className="font-mono text-slate-300">{asset.weight.toFixed(2)}%</span></div><div className="h-3 overflow-hidden rounded-full bg-cyan-950/70"><div className={`h-full rounded-full bg-gradient-to-r from-cyan-500 to-violet-400 ${running ? "transition-all duration-700" : ""}`} style={{ width: `${Math.min(asset.weight,100)}%` }} /></div></div>)}</div><p className="mt-6 text-xs text-slate-400">Shown on an absolute 0–100% allocation scale. The supplied list is incomplete.</p></div>}
      {view === "risk" && <div><h3 className="text-lg font-semibold text-cyan-100">Risk comparison</h3><p className="mt-1 text-xs text-slate-400">Select a strategy to explore its supplied risk metrics</p><div className="mt-5 flex flex-wrap gap-2">{STRATEGIES.map((strategy,i)=><button type="button" key={strategy.id} onClick={()=>setSelectedStrategy(i)} aria-pressed={selectedStrategy===i} className={`rounded-lg border px-4 py-2 text-xs ${selectedStrategy===i?"border-cyan-300 bg-cyan-400/20 text-cyan-100":"border-slate-600 text-slate-300"}`}>{strategy.label}</button>)}</div><div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{METRICS.map(metric=><div key={metric.label} className="rounded-xl border border-cyan-400/20 bg-cyan-950/30 p-5"><p className="text-xs text-slate-400">{metric.label}</p><p className="mt-3 font-mono text-2xl text-cyan-200">{metric.values[selectedStrategy]?.toFixed(metric.digits)}{metric.unit}</p></div>)}</div></div>}
      {view === "research" && <div><h3 className="text-lg font-semibold text-cyan-100">Annual return research</h3><p className="mt-1 text-xs text-slate-400">Reported historical annual returns · 2025 is year-to-date</p><div className="mt-6 grid gap-5">{ANNUAL_RETURNS.map(row=><div key={row.period} className="grid grid-cols-[65px_1fr] items-center gap-3"><span className="font-mono text-xs text-cyan-100">{row.period}</span><div className="space-y-2">{STRATEGIES.map((strategy,i)=>{const v=row.values[i]??0;return <div key={strategy.id} className="flex items-center gap-2"><span className="w-12 shrink-0 text-[10px] text-slate-400">{strategy.short}</span><div className="relative h-3 flex-1 rounded bg-slate-800"><div className={`h-3 rounded ${strategy.bar} ${running?"transition-all duration-700":""}`} style={{width:`${Math.min(Math.abs(v),100)}%`,opacity:v<0?.55:1}} /></div><span className="w-16 text-right font-mono text-[10px] text-slate-300">{v.toFixed(2)}%</span></div>})}</div></div>)}</div></div>}
    </div>
    <div className="relative z-10 border-t border-cyan-400/20 bg-slate-950/70 px-5 py-3 text-[11px] text-slate-400">Interactive visual exploration of user-supplied illustrative research figures. No live market feed, solver execution, or verified quantum advantage.</div>
  </section>;
}

export function DwaveFinanceDashboard() {
  const [visible, setVisible] = useState<StrategyId[]>(STRATEGIES.map(s => s.id));
  const [metricOrder, setMetricOrder] = useState<string[]>(METRICS.map(m => m.label));
  const [draggingMetric, setDraggingMetric] = useState<string | null>(null);
  const moveMetric = (from: string, to: string) => setMetricOrder(order => { const next = [...order]; const a = next.indexOf(from); const b = next.indexOf(to); if (a < 0 || b < 0 || a === b) return order; next.splice(a, 1); next.splice(b, 0, from); return next; });
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

    <LiveQuantumShowcase running={animated} />
    <AnimatedAnnealingNetwork running={animated} />

    <div className="my-6 flex flex-wrap items-center justify-between gap-4">
      <div role="tablist" aria-label="Research views" className="flex gap-2">{(["overview", "methodology"] as const).map(value => <Button key={value} id={`finance-tab-${value}`} role="tab" aria-selected={tab === value} aria-controls="finance-view" variant={tab === value ? "secondary" : "ghost"} onClick={() => setTab(value)} className="capitalize">{value}</Button>)}</div>
      <div className="flex items-center gap-2"><Button size="sm" variant="ghost" aria-pressed={animated} onClick={() => setAnimated(v => !v)}>{animated ? <Pause /> : <Play />} Animation {animated ? "on" : "off"}</Button><Button size="icon" variant="outline" title="Replay chart entrance" aria-label="Replay chart entrance" disabled={!animated} onClick={() => setReplay(v => v + 1)}><RotateCcw /></Button></div>
    </div>

    <div id="finance-view" role="tabpanel" aria-labelledby={`finance-tab-${tab}`}>
      {tab === "overview" ? <>
        <div className="mb-6 flex flex-wrap items-center gap-2" role="group" aria-label="Visible strategies">{STRATEGIES.map(strategy => <Button key={strategy.id} variant="outline" size="sm" aria-pressed={visible.includes(strategy.id)} onClick={() => toggle(strategy.id)} className={visible.includes(strategy.id) ? strategy.color : "text-muted-foreground"}><span className={`size-2 rounded-full ${strategy.bar}`} />{strategy.label}{visible.includes(strategy.id) && <Check className="size-3" />}</Button>)}</div>
        <section aria-label="Reported performance metrics" className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <p className="col-span-full text-xs text-cyan-300/80">↔ Drag cards to rearrange · use arrows on touch devices · illustrative historical metrics</p>
          {metricOrder.map((label, index) => { const metric = METRICS.find(m => m.label === label); if (!metric) return null; return <article key={metric.label} draggable onDragStart={event => { event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", metric.label); setDraggingMetric(metric.label); }} onDragOver={event => event.preventDefault()} onDrop={event => { event.preventDefault(); const from = event.dataTransfer.getData("text/plain"); if (from) moveMetric(from, metric.label); setDraggingMetric(null); }} onDragEnd={() => setDraggingMetric(null)} className={`group rounded-xl border border-cyan-400/25 bg-card p-5 transition-all duration-300 hover:-translate-y-1 hover:border-cyan-400/70 hover:shadow-[0_0_25px_rgba(34,211,238,.18)] ${draggingMetric === metric.label ? "opacity-50 ring-2 ring-cyan-400" : ""}`}>
            <div className="flex items-center justify-between gap-2"><h2 className="text-xs font-medium text-cyan-100">{metric.label}</h2><div className="flex gap-1"><button type="button" aria-label={`Move ${metric.label} left`} disabled={index === 0} onClick={() => moveMetric(metric.label, metricOrder[index - 1])} className="rounded border border-cyan-400/20 px-2 py-1 text-xs text-cyan-200 disabled:opacity-20">←</button><button type="button" aria-label={`Move ${metric.label} right`} disabled={index === metricOrder.length - 1} onClick={() => moveMetric(metric.label, metricOrder[index + 1])} className="rounded border border-cyan-400/20 px-2 py-1 text-xs text-cyan-200 disabled:opacity-20">→</button></div></div>
            <div className="mt-5 grid grid-cols-3 gap-2">{STRATEGIES.map((strategy, i) => <div key={strategy.id} className={visible.includes(strategy.id) ? "" : "opacity-30"}><span className={`font-mono text-[10px] ${strategy.color}`}>{strategy.short}</span><p className={`mt-1 whitespace-nowrap font-mono text-xl ${strategy.color}`}>{visible.includes(strategy.id) ? metric.values[i]?.toFixed(metric.digits) + metric.unit : "—"}</p></div>)}</div>
            <div className="mt-4 h-8 overflow-hidden"><svg viewBox="0 0 200 32" preserveAspectRatio="none" className="h-full w-full" aria-hidden="true"><polyline fill="none" stroke="#22d3ee" strokeWidth="1.7" opacity=".8" points={Array.from({length: 21}, (_, i) => `${i * 10},${17 - Math.sin(i * .63 + index) * 8 - Math.cos(i * .29 + index) * 4}`).join(" ")} /></svg></div>
          </article>; })}
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