import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowLeft, Atom, Play, Pause, RotateCcw } from "lucide-react";

export const Route = createFileRoute("/d-wave")({ component: DWavePage });

const strategies = [
  { name: "Simulated Annealing", key: "anneal", color: "#22d3ee", annual: "85.24%", volatility: "35.54%", sharpe: "1.913", sortino: "3.082", drawdown: "-17.63%", equity: "2.521×" },
  { name: "Exact Solver", key: "exact", color: "#a78bfa", annual: "70.50%", volatility: "35.52%", sharpe: "1.680", sortino: "2.636", drawdown: "-21.85%", equity: "2.226×" },
  { name: "Equal Weight", key: "equal", color: "#f59e0b", annual: "12.36%", volatility: "42.18%", sharpe: "0.293", sortino: "0.451", drawdown: "-48.32%", equity: "1.124×" },
] as const;
type Strategy = (typeof strategies)[number]["key"];
const years = [
  { year: "2022", anneal: -12.34, exact: -15.61, equal: -28.43 },
  { year: "2023", anneal: 94.21, exact: 78.36, equal: 36.18 },
  { year: "2024", anneal: 41.73, exact: 32.15, equal: 8.76 },
  { year: "2025 YTD", anneal: 22.18, exact: 15.84, equal: 4.23 },
];
const allocations = [
  ["BTC",18.42],["ETH",15.36],["SOL",8.21],["ADA",6.14],["SUI",5.62],
  ["JUP",4.98],["AVAX",4.21],["LINK",3.87],["MATIC",3.24],["DOT",2.91],
  ["ATOM",2.76],["LTC",2.54],["UNI",2.31],["BCH",2.08],["XRP",1.96],
].map(([asset,weight])=>({asset:String(asset),weight:Number(weight)}));
const sumWeights=allocations.reduce((sum,x)=>sum+x.weight,0);
const formatPct=(n:number)=>`${n.toFixed(2)}%`;

function QuantumNetwork({ playing }: { playing: boolean }) {
  const nodes = Array.from({ length: 16 }, (_, i) => ({
    x: 50 + 34 * Math.cos(i * Math.PI * 2 / 16),
    y: 50 + 34 * Math.sin(i * Math.PI * 2 / 16),
  }));
  return <svg viewBox="0 0 100 100" role="img" aria-label="Animated conceptual annealing network, not a live quantum processor" className="h-full w-full max-h-80">
    <defs><radialGradient id="dw-glow"><stop stopColor="#22d3ee" stopOpacity=".4"/><stop offset="1" stopColor="#22d3ee" stopOpacity="0"/></radialGradient></defs>
    <circle cx="50" cy="50" r="45" fill="url(#dw-glow)" />
    {nodes.map((n,i)=><g key={i}>
      <line x1={n.x} y1={n.y} x2={nodes[(i+5)%16].x} y2={nodes[(i+5)%16].y} stroke="#22d3ee" strokeOpacity=".22" strokeWidth=".25"/>
      <line x1={n.x} y1={n.y} x2="50" y2="50" stroke="#a78bfa" strokeOpacity=".28" strokeWidth=".25"/>
      <circle cx={n.x} cy={n.y} r="1.4" fill="#67e8f9"><animate attributeName="opacity" values={playing?"0.25;1;0.25":"1;1"} dur={`${1.6+i%5*.35}s`} repeatCount="indefinite"/></circle>
    </g>)}
    <circle cx="50" cy="50" r="5" fill="#a78bfa" opacity=".85"/>
    <circle cx="50" cy="50" r="9" fill="none" stroke="#22d3ee" strokeWidth=".45" strokeDasharray="2 2" className={playing?"motion-safe:animate-spin origin-center":""} style={{transformOrigin:"50% 50%"}} />
  </svg>;
}

function DWavePage(){
  const [active,setActive]=useState<Strategy>("anneal");
  const [playing,setPlaying]=useState(true);
  const [view,setView]=useState<"annual"|"allocation">("annual");
  useEffect(()=>{if(window.matchMedia("(prefers-reduced-motion: reduce)").matches)setPlaying(false)},[]);
  const selected=strategies.find(s=>s.key===active)!;
  const metricRows=[["Annualized return","annual"],["Volatility","volatility"],["Sharpe ratio","sharpe"],["Sortino ratio","sortino"],["Max drawdown","drawdown"],["Final equity multiple","equity"]] as const;
  return <main className="min-h-screen bg-[#060d1d] text-slate-100 selection:bg-cyan-500/40">
    <div className="pointer-events-none fixed inset-0 opacity-40" style={{background:"radial-gradient(ellipse at 75% 0%,#164e63 0%,transparent 46%),radial-gradient(ellipse at 0% 65%,#312e81 0%,transparent 48%)"}}/>
    <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-8">
      <Link to="/" className="inline-flex items-center gap-2 text-sm text-cyan-300 hover:text-white"><ArrowLeft size={16}/> Back to Quantum AI Lab</Link>
      <div className="mt-8 flex flex-wrap items-center justify-between gap-5">
        <div><p className="font-mono text-xs uppercase tracking-[.3em] text-cyan-400">Quantum Finance / Research Engine</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-5xl">D-Wave <span className="text-cyan-300">Optimization Lab</span></h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">Interactive research dashboard comparing illustrative simulated annealing, exact optimization and equal-weight benchmark results.</p>
        </div>
        <div className="rounded-full border border-amber-400/30 bg-amber-500/10 px-4 py-2 text-xs font-semibold text-amber-200">ILLUSTRATIVE BACKTEST · NOT LIVE D-WAVE</div>
      </div>
      <section className="mt-8 grid gap-4 sm:grid-cols-3" aria-label="Backtest sample">
        {[["ASSETS","30"],["WALK-FORWARD WINDOWS","18"],["OBSERVATIONS","378"]].map(([label,value])=><div key={label} className="rounded-2xl border border-cyan-300/15 bg-slate-900/70 p-5"><p className="font-mono text-xs tracking-wider text-slate-400">{label}</p><p className="mt-2 text-3xl font-semibold text-cyan-200">{value}</p></div>)}
      </section>
      <div className="mt-5 grid gap-5 lg:grid-cols-[1.35fr_1fr]">
        <section className="rounded-2xl border border-cyan-300/15 bg-slate-900/70 p-5">
          <div className="flex items-center justify-between"><h2 className="flex items-center gap-2 text-lg font-semibold"><Atom className="text-cyan-300"/> Annealing network</h2>
            <button type="button" onClick={()=>setPlaying(p=>!p)} className="flex items-center gap-2 rounded-lg border border-cyan-300/30 px-3 py-2 text-xs text-cyan-200 hover:bg-cyan-400/10">{playing?<Pause size={14}/>:<Play size={14}/>} {playing?"Pause":"Animate"}</button>
          </div>
          <QuantumNetwork playing={playing}/>
          <p className="text-xs text-slate-400">Conceptual animation only — no quantum hardware connection or live solver execution.</p>
        </section>
        <section className="rounded-2xl border border-cyan-300/15 bg-slate-900/70 p-5">
          <h2 className="text-lg font-semibold">Strategy explorer</h2>
          <div className="mt-4 flex flex-wrap gap-2">{strategies.map(s=><button type="button" key={s.key} onClick={()=>setActive(s.key)} aria-pressed={active===s.key} className={`rounded-lg border px-3 py-2 text-xs transition ${active===s.key?"border-cyan-400 bg-cyan-400/15 text-cyan-200":"border-slate-700 text-slate-400 hover:border-slate-500"}`}>{s.name}</button>)}</div>
          <div className="mt-7 grid grid-cols-2 gap-4">{metricRows.map(([label,key])=><div key={key} className="rounded-xl bg-slate-950/60 p-4"><p className="text-xs text-slate-400">{label}</p><p className="mt-2 text-2xl font-semibold" style={{color:selected.color}}>{selected[key]}</p></div>)}</div>
          <p className="mt-5 text-xs text-slate-500">Metrics supplied for demonstration; methodology and raw return series are not independently verified.</p>
        </section>
      </div>
      <section className="mt-5 rounded-2xl border border-cyan-300/15 bg-slate-900/70 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold">Research visualizations</h2><div className="flex gap-2">{(["annual","allocation"] as const).map(v=><button type="button" key={v} onClick={()=>setView(v)} className={`rounded-lg px-3 py-2 text-xs ${view===v?"bg-cyan-500/20 text-cyan-200":"text-slate-400 hover:text-white"}`}>{v==="annual"?"Annual returns":"Asset weights"}</button>)}</div></div>
        <div className="mt-5 h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            {view==="annual"?<BarChart data={years} margin={{top:8,right:12,bottom:8,left:0}}><CartesianGrid stroke="#263449" strokeDasharray="3 3"/><XAxis dataKey="year" stroke="#94a3b8" tick={{fontSize:12}}/><YAxis stroke="#94a3b8" tick={{fontSize:12}} tickFormatter={v=>`${v}%`}/><Tooltip contentStyle={{background:"#0f172a",border:"1px solid #334155",color:"#e2e8f0"}} formatter={(v)=>formatPct(Number(v))}/><Legend/>{strategies.map(s=><Bar key={s.key} dataKey={s.key} name={s.name} fill={s.color} radius={[3,3,0,0]}/>)}</BarChart>:
            <BarChart data={allocations} layout="vertical" margin={{top:4,right:20,bottom:4,left:0}}><CartesianGrid stroke="#263449" strokeDasharray="3 3"/><XAxis type="number" stroke="#94a3b8" tickFormatter={v=>`${v}%`}/><YAxis dataKey="asset" type="category" stroke="#94a3b8" width={45} tick={{fontSize:11}}/><Tooltip contentStyle={{background:"#0f172a",border:"1px solid #334155",color:"#e2e8f0"}} formatter={v=>formatPct(Number(v))}/><Bar dataKey="weight" name="Allocation" fill="#22d3ee" radius={[0,4,4,0]}/></BarChart>}
          </ResponsiveContainer>
        </div>
        {view==="allocation"&&<p className="mt-2 text-xs text-slate-400">15 displayed assets: {formatPct(sumWeights)} total. Remaining {formatPct(100-sumWeights)} is unspecified in the supplied figures.</p>}
        {view==="annual"&&<p className="mt-2 text-xs text-slate-400">2025 is year-to-date. Annual return figures are illustrative user-provided values; no intermediate monthly or daily prices have been inferred.</p>}
      </section>
      <footer className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-slate-700/60 py-6 text-xs text-slate-500"><span>Quantum AI Lab · D-Wave-inspired research visualization</span><span>Not financial advice · No live market data</span></footer>
    </div>
  </main>;
}
