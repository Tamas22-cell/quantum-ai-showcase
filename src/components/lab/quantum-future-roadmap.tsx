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
  const selected = stages[active];
  return (
    <section aria-labelledby="quantum-roadmap-heading" className="relative mb-12 overflow-hidden rounded-2xl border border-cyan-400/20 bg-[#050c20] p-5 text-white sm:p-8">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-50" style={{backgroundImage:"radial-gradient(circle at 50% 0%, #155e75 0%, transparent 52%), radial-gradient(circle at 95% 90%, #312e81 0%, transparent 38%)"}} />
      <div className="relative">
        <p className="font-mono text-xs uppercase tracking-[.25em] text-cyan-300">Quantum AI Research Lab · Interactive outlook</p>
        <h2 id="quantum-roadmap-heading" className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">The Future of <span className="bg-gradient-to-r from-cyan-300 via-violet-400 to-emerald-300 bg-clip-text text-transparent">Quantum Computing</span></h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">Explore scientific milestones rather than fixed predictions. Select a stage to learn what matters next.</p>
        <div className="relative mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {stages.map((stage, i) => {
            const Icon = stage.icon;
            return <button type="button" key={stage.title} onClick={() => setActive(i)} aria-pressed={active === i} className="group relative min-h-52 rounded-xl border p-4 text-left transition-all duration-300 hover:-translate-y-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300" style={{borderColor:active===i?stage.color:"#334155",background:active===i?"#10233a":"#0b1428",boxShadow:active===i?`0 0 28px ${stage.color}33`:"none"}}>
              <span className="text-xs font-mono" style={{color:stage.color}}>{stage.period}</span>
              <div className="my-5 flex h-16 items-center justify-center rounded-lg bg-slate-950/70"><Icon size={45} strokeWidth={1.3} style={{color:stage.color,filter:`drop-shadow(0 0 12px ${stage.color})`}} className="transition-transform duration-500 group-hover:scale-110" /></div>
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
        <p className="mt-4 flex items-start gap-2 text-xs leading-5 text-slate-400"><ArrowUpRight size={15} className="mt-0.5 shrink-0"/>Research outlook only. Milestones and timing are uncertain; practical quantum advantage must be independently validated.</p>
      </div>
    </section>
  );
}
