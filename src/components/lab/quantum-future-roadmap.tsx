import { useState } from "react";
import { Atom, Cpu, Network, Sparkles, ArrowUpRight } from "lucide-react";

const stages = [
  { period: "Now · Near term", title: "Reliable Qubits", color: "#38bdf8", icon: Cpu, details: "Better calibration, coherence, gate fidelity and hybrid quantum–classical workflows.", topics: ["Hardware", "Noise mitigation", "Hybrid AI"] },
  { period: "Next milestone", title: "Logical Qubits", color: "#c084fc", icon: Atom, details: "Demonstrations of error-corrected logical qubits and improving logical error rates.", topics: ["Error correction", "Fault tolerance", "QEC"] },
  { period: "Scaling phase", title: "Connected Systems", color: "#2dd4bf", icon: Network, details: "Modular architectures, scalable control systems and increasingly capable quantum software.", topics: ["Modularity", "Qiskit", "Cloud systems"] },
  { period: "Long-term outlook", title: "Useful Advantage?", color: "#fbbf24", icon: Sparkles, details: "Potential validated advantage for selected chemistry, materials and optimisation problems; not guaranteed.", topics: ["Chemistry", "Finance research", "Optimisation"] },
];

export function QuantumFutureRoadmap() {
  const [active, setActive] = useState(0);
  const [application, setApplication] = useState<number | null>(null);
  const selected = stages[active];
  return (
    <section aria-labelledby="quantum-roadmap-heading" className="relative mb-12 overflow-hidden rounded-2xl border border-cyan-400/20 bg-[#050c20] p-5 text-white sm:p-8">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-50" style={{backgroundImage:"radial-gradient(circle at 50% 0%, #155e75 0%, transparent 52%), radial-gradient(circle at 95% 90%, #312e81 0%, transparent 38%)"}} />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        {Array.from({ length: 24 }, (_, i) => (
          <span key={i} className="absolute rounded-full bg-cyan-300/70 motion-safe:animate-pulse"
            style={{ left: ((i * 37 + 11) % 97) + "%", top: ((i * 23 + 7) % 93) + "%", width: i % 4 === 0 ? 4 : 2, height: i % 4 === 0 ? 4 : 2, animationDelay: ((i % 9) * 0.3) + "s", animationDuration: (2 + i % 5) + "s", boxShadow: "0 0 12px #67e8f9" }} />
        ))}
        <svg viewBox="0 0 900 330" preserveAspectRatio="none" className="absolute inset-0 h-full w-full opacity-40" fill="none">
          <path d="M-30 230 C160 20 220 320 440 140 S700 70 930 240" stroke="#22d3ee" strokeWidth="1.5" strokeDasharray="9 13" />
          <path d="M-30 160 C190 300 270 20 470 180 S760 280 930 80" stroke="#a78bfa" strokeWidth="1.5" strokeDasharray="5 16" />
          <circle cx="450" cy="160" r="75" stroke="#38bdf8" strokeWidth="1" opacity=".45" />
          <ellipse cx="450" cy="160" rx="145" ry="40" stroke="#a78bfa" strokeWidth="1" transform="rotate(-25 450 160)" />
          <ellipse cx="450" cy="160" rx="145" ry="40" stroke="#2dd4bf" strokeWidth="1" transform="rotate(25 450 160)" />
          <circle cx="450" cy="160" r="9" fill="#67e8f9" />
        </svg>
      </div>
      <div className="relative">
        <p className="font-mono text-xs uppercase tracking-[.25em] text-cyan-300">Quantum AI Research Lab · Interactive outlook</p>
        <h2 id="quantum-roadmap-heading" className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">The Future of <span className="bg-gradient-to-r from-cyan-300 via-violet-400 to-emerald-300 bg-clip-text text-transparent">Quantum Computing</span></h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">Explore scientific milestones rather than fixed predictions. Select a stage to learn what matters next.</p>
        <div className="relative mx-auto mt-8 flex min-h-64 max-w-3xl items-center justify-center overflow-hidden rounded-2xl border border-cyan-300/20 bg-slate-950/60 sm:min-h-80">
          <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(34,211,238,.19),transparent_65%)]" />
          <div aria-hidden="true" className="absolute left-1/2 top-1/2 h-52 w-52 -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-300/40 shadow-[0_0_65px_rgba(34,211,238,.2)] motion-safe:animate-[spin_24s_linear_infinite] sm:h-64 sm:w-64">
            {Array.from({length:8},(_,i)=><span key={i} className="absolute h-2 w-2 rounded-full bg-cyan-200 shadow-[0_0_15px_#67e8f9]" style={{left:(50+48*Math.cos(i*Math.PI/4))+"%",top:(50+48*Math.sin(i*Math.PI/4))+"%"}} />)}
          </div>
          <div aria-hidden="true" className="absolute left-1/2 top-1/2 h-36 w-72 -translate-x-1/2 -translate-y-1/2 rounded-[50%] border border-violet-400/60 motion-safe:animate-[spin_18s_linear_infinite]" style={{transform:"translate(-50%,-50%) rotate(-28deg)"}} />
          <div className="relative flex flex-col items-center">
            <div className="relative h-32 w-36 sm:h-40 sm:w-44">
              <div className="absolute left-1/2 top-0 h-5 w-28 -translate-x-1/2 rounded-full border border-amber-300/80 bg-gradient-to-b from-yellow-200 to-amber-600 shadow-[0_0_24px_rgba(251,191,36,.5)] sm:w-36" />
              {Array.from({length:7},(_,i)=><div key={i} className="absolute top-4 h-24 w-2 rounded-b-full bg-gradient-to-b from-amber-200 via-yellow-600 to-amber-900 shadow-[0_0_9px_rgba(251,191,36,.5)] sm:h-32" style={{left:(14+i*12)+"%"}} />)}
              {[0,1,2].map(i=><div key={i} className="absolute left-1/2 h-3 -translate-x-1/2 rounded-full border border-amber-200/70 bg-amber-500/30" style={{top:(38+i*29)+"%",width:(92-i*18)+"%"}} />)}
            </div>
            <p className="mt-3 text-center font-mono text-xs tracking-[.2em] text-amber-200">QUANTUM PROCESSOR</p>
          </div>
          <div className="absolute bottom-3 left-3 text-[10px] text-slate-400">Conceptual illustration · not a hardware photograph</div>
        </div>
        <div className="relative mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {stages.map((stage, i) => {
            const Icon = stage.icon;
            return <button type="button" key={stage.title} onClick={() => setActive(i)} aria-pressed={active === i} className="group relative min-h-52 rounded-xl border p-4 text-left transition-all duration-300 hover:-translate-y-2 hover:scale-[1.02] focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300" style={{borderColor:active===i?stage.color:"#334155",background:active===i?"#10233a":"#0b1428",boxShadow:active===i?`0 0 28px ${stage.color}33`:"none"}}>
              <span className="text-xs font-mono" style={{color:stage.color}}>{stage.period}</span>
              <div className="relative my-5 flex h-28 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-slate-950/80">
                <div className="absolute h-20 w-20 rounded-full border opacity-60 motion-safe:animate-[spin_12s_linear_infinite]" style={{borderColor:stage.color}} />
                <div className="absolute h-10 w-24 rounded-[50%] border opacity-70 motion-safe:animate-pulse" style={{borderColor:stage.color,transform:"rotate(-30deg)"}} />
                {i === 0 && <div className="absolute bottom-3 flex gap-2">{[0,1,2,3,4].map(n=><span key={n} className="h-9 w-2 rounded-b-full bg-gradient-to-b from-amber-200 to-amber-700" style={{height:(24+n%2*12)+"px"}} />)}</div>}
                {i === 1 && <div className="absolute inset-0 flex items-center justify-center gap-2">{[0,1,2].map(n=><span key={n} className="h-5 w-5 rounded-full border-2 motion-safe:animate-pulse" style={{borderColor:stage.color,animationDelay:(n*.4)+"s",boxShadow:"0 0 14px "+stage.color}} />)}</div>}
                {i === 2 && <svg viewBox="0 0 120 80" className="absolute h-20 w-28" fill="none" stroke={stage.color} strokeWidth="2"><path d="M20 20L60 10L100 25L95 65L55 70L15 55Z M20 20L55 70 M60 10L95 65 M100 25L15 55" opacity=".65"/>{[[20,20],[60,10],[100,25],[95,65],[55,70],[15,55]].map(([x,y],n)=><circle key={n} cx={x} cy={y} r="5" fill={stage.color} className="motion-safe:animate-pulse" />)}</svg>}
                {i === 3 && <svg viewBox="0 0 120 80" className="absolute h-20 w-28" fill="none" stroke={stage.color} strokeWidth="2.5"><path d="M8 65L30 55L48 60L70 32L85 40L112 10" strokeLinecap="round" strokeLinejoin="round"/><path d="M102 10H112V20" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                <Icon size={i===0?25:19} strokeWidth={1.5} style={{color:stage.color,filter:"drop-shadow(0 0 10px "+stage.color+")"}} className="absolute right-2 top-2 motion-safe:animate-pulse" />
              </div>
              <strong className="block text-base">{stage.title}</strong>
              <span className="mt-2 block text-xs text-slate-400">{stage.topics.join(" · ")}</span>
            </button>;
          })}
        </div>
        <div aria-live="polite" className="mt-5 rounded-xl border border-white/10 bg-white/5 p-5">
          <p className="text-xs font-mono uppercase tracking-widest text-cyan-300">Selected milestone</p>
          <h3 className="mt-2 text-xl font-semibold">{selected.title}</h3>
          <p className="mt-2 text-sm leading-6 text-slate-300">{selected.details}</p>
          <div className="mt-4 flex flex-wrap gap-2">{selected.topics.map(t=><span key={t} className="rounded-full border border-white/20 px-3 py-1 text-xs text-slate-200">{t}</span>)}</div>
        </div>
        <div className="mt-7">
          <h3 className="mb-3 text-lg font-semibold text-slate-100">Potential Applications</h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { name:"Chemistry", color:"#38bdf8", desc:"Quantum simulation could help model molecular energies and reaction pathways for materials and chemical research." },
              { name:"Drug Discovery", color:"#c084fc", desc:"Quantum chemistry research may support molecular modelling and candidate screening, subject to hardware and algorithmic advances." },
              { name:"AI & Machine Learning", color:"#2dd4bf", desc:"Quantum machine learning explores feature maps, quantum kernels and hybrid models; practical advantage remains unproven for most tasks." },
              { name:"Quantum Finance", color:"#fbbf24", desc:"Research applications include portfolio optimisation, sampling and risk models, benchmarked against strong classical approaches." },
            ].map((item,i)=>(
              <button key={item.name} type="button" aria-pressed={application===i} onClick={()=>setApplication(application===i?null:i)}
                className="group rounded-xl border bg-slate-900/80 p-3 text-center transition-all duration-300 hover:-translate-y-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300 sm:p-4"
                style={{borderColor:application===i?item.color:"#334155",boxShadow:application===i?"0 0 25px "+item.color+"33":"none"}}>
                <svg aria-hidden="true" viewBox="0 0 160 105" className="mx-auto mb-3 h-24 w-full max-w-44 overflow-visible" fill="none">
                  <defs><radialGradient id={"glow-"+i}><stop stopColor={item.color} stopOpacity=".6"/><stop offset="1" stopColor={item.color} stopOpacity="0"/></radialGradient></defs>
                  <circle cx="80" cy="52" r="47" fill={"url(#glow-"+i+")"} opacity=".3" className="motion-safe:animate-pulse"/>
                  {i===0 && <>
                    <path d="M36 65L70 28L112 48L94 83L36 65M70 28L94 83" stroke={item.color} strokeWidth="2"/>
                    {[[36,65],[70,28],[112,48],[94,83]].map(([x,y],j)=><circle key={j} cx={x} cy={y} r={j===1?11:8} fill={item.color} stroke="#e0f2fe" strokeWidth="1.5" className="motion-safe:animate-pulse" style={{animationDelay:j*.25+"s"}}/>)}
                  </>}
                  {i===1 && <>
                    <g transform="rotate(-35 80 52)"><rect x="51" y="20" width="58" height="65" rx="28" stroke={item.color} strokeWidth="3" fill="#25123b"/><path d="M51 52H109" stroke="#e9d5ff" strokeWidth="3"/><path d="M55 53H105V60Q105 81 80 81Q55 81 55 60Z" fill={item.color} opacity=".7"/></g>
                    {[[30,24],[132,36],[128,82]].map(([x,y],j)=><circle key={j} cx={x} cy={y} r="5" fill="#e9d5ff" className="motion-safe:animate-pulse" style={{animationDelay:j*.4+"s"}}/>)}
                  </>}
                  {i===2 && <>
                    {[[24,26],[24,76],[70,18],[70,52],[70,87],[130,32],[130,72]].map(([x,y],j)=><g key={j}>{j<2&&[2,3,4].map(k=><path key={k} d={`M${x} ${y}L${[70,70,70][k-2]} ${[18,52,87][k-2]}`} stroke={item.color} opacity=".5"/>)}{j>=2&&j<=4&&[5,6].map(k=><path key={k} d={`M${x} ${y}L130 ${k===5?32:72}`} stroke={item.color} opacity=".5"/>)}<circle cx={x} cy={y} r="7" fill={item.color} className="motion-safe:animate-pulse" style={{animationDelay:j*.18+"s"}}/></g>)}
                  </>}
                  {i===3 && <>
                    <path d="M20 86V20M20 86H145" stroke="#94a3b8" strokeWidth="1.5"/>
                    {[30,50,70,90,110,130].map((x,j)=><rect key={x} x={x} y={82-[18,26,21,43,54,68][j]} width="11" height={[18,26,21,43,54,68][j]} rx="2" fill={item.color} opacity={.25+j*.12}/>)}
                    <path d="M24 70L48 61L70 66L91 40L111 47L140 15" stroke="#fde68a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="motion-safe:animate-pulse"/>
                  </>}
                </svg>
                <span className="block text-sm font-semibold sm:text-base">{item.name}</span>
                <span className="mt-2 block text-[11px] text-slate-400">Tap to explore ↗</span>
              </button>
            ))}
          </div>
          {application!==null&&<div aria-live="polite" className="mt-3 rounded-xl border border-cyan-400/20 bg-slate-950/80 p-4">
            <h4 className="font-semibold text-cyan-200">{["Chemistry","Drug Discovery","AI & Machine Learning","Quantum Finance"][application]}</h4>
            <p className="mt-2 text-sm leading-6 text-slate-300">{[
              "Quantum simulation could help model molecular energies and reaction pathways for materials and chemical research.",
              "Quantum chemistry research may support molecular modelling and candidate screening, subject to hardware and algorithmic advances.",
              "Quantum machine learning explores feature maps, quantum kernels and hybrid models; practical advantage remains unproven for most tasks.",
              "Research applications include portfolio optimisation, sampling and risk models, benchmarked against strong classical approaches."
            ][application]}</p>
          </div>}
        </div>
        <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-slate-400"><ArrowUpRight size={15} className="mt-0.5 shrink-0"/>Research outlook only. Milestones and timing are uncertain; practical quantum advantage must be independently validated.</p>
      </div>
    </section>
  );
}
