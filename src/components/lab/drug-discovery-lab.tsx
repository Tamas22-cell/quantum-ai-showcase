import { useMemo, useState } from "react";
import { Atom, Dna, FlaskConical, ArrowUpRight } from "lucide-react";

type Molecule = { name:string; formula:string; mw:number; logp:number; hbd:number; hba:number; tpsa:number; rings:number; note:string };
const MOLECULES:Molecule[] = [
 {name:"Aspirin",formula:"C9H8O4",mw:180.16,logp:1.19,hbd:1,hba:4,tpsa:63.6,rings:1,note:"Acetylsalicylic acid; reference molecule."},
 {name:"Caffeine",formula:"C8H10N4O2",mw:194.19,logp:-0.07,hbd:0,hba:6,tpsa:61.8,rings:2,note:"Methylxanthine reference compound."},
 {name:"Ibuprofen",formula:"C13H18O2",mw:206.28,logp:3.97,hbd:1,hba:2,tpsa:37.3,rings:1,note:"Nonsteroidal anti-inflammatory reference compound."},
 {name:"Paracetamol",formula:"C8H9NO2",mw:151.16,logp:0.46,hbd:2,hba:2,tpsa:49.3,rings:1,note:"Acetaminophen reference compound."},
];
function violations(m:Molecule){return [m.mw>500,m.logp>5,m.hbd>5,m.hba>10].filter(Boolean).length;}
export function DrugDiscoveryLab(){
 const [selected,setSelected]=useState(0);
 const [sort,setSort]=useState<"name"|"score">("score");
 const molecule=MOLECULES[selected];
 const ranked=useMemo(()=>MOLECULES.map((m,i)=>({m,i,score:Math.max(0,Math.round(100-violations(m)*25-Math.abs(m.logp-2)*7-Math.abs(m.mw-300)*.04))})).sort((a,b)=>sort==="score"?b.score-a.score:a.m.name.localeCompare(b.m.name)),[sort]);
 return <section id="drug-discovery-lab" className="mb-12 overflow-hidden rounded-2xl border border-violet-400/30 bg-[#080d22] p-5 text-white sm:p-8">
  <div className="flex items-center gap-3 text-violet-300"><Dna size={24}/><span className="font-mono text-xs uppercase tracking-[.2em]">Quantum & AI Research · Drug Discovery</span></div>
  <h2 className="mt-3 text-3xl font-bold">AI Drug Discovery Lab</h2>
  <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-300">Interactive reference-molecule screening with published-style physicochemical descriptors, Lipinski checks and an illustrative heuristic ranking. No clinical or binding-affinity predictions.</p>
  <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_1.4fr]">
   <div className="rounded-xl border border-violet-400/20 bg-slate-950/70 p-5">
    <label htmlFor="drug-molecule" className="text-xs font-mono text-violet-300">SELECT REFERENCE MOLECULE</label>
    <select id="drug-molecule" value={selected} onChange={e=>setSelected(Number(e.target.value))} className="mt-2 w-full rounded-lg border border-slate-600 bg-slate-900 p-3 text-white">{MOLECULES.map((m,i)=><option value={i} key={m.name}>{m.name}</option>)}</select>
    <div className="relative mt-5 flex h-40 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-violet-950/80 to-cyan-950/70">
      <div className="absolute h-28 w-28 rounded-full border border-violet-300/50 motion-safe:animate-[spin_18s_linear_infinite]"/>
      <div className="absolute h-12 w-36 rotate-45 rounded-[50%] border border-cyan-300/60"/>
      <Atom size={68} className="text-cyan-300 motion-safe:animate-pulse"/>
    </div>
    <h3 className="mt-4 text-xl font-semibold">{molecule.name} <span className="font-mono text-sm text-slate-400">{molecule.formula}</span></h3>
    <p className="mt-2 text-xs text-slate-400">{molecule.note}</p>
    <a href="/lab/vqe-molecular-chemistry" className="mt-4 inline-flex items-center gap-2 text-sm text-cyan-300 underline underline-offset-4">Explore quantum molecular VQE <ArrowUpRight size={15}/></a>
   </div>
   <div>
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {([["Molecular weight",molecule.mw.toFixed(2)+" g/mol"],["LogP",molecule.logp.toFixed(2)],["H-bond donors",molecule.hbd],["H-bond acceptors",molecule.hba],["Polar surface",molecule.tpsa.toFixed(1)+" Å²"],["Ring count",molecule.rings]] as const).map(([label,value])=><div key={label} className="rounded-xl border border-white/10 bg-white/5 p-4"><p className="text-xs text-slate-400">{label}</p><p className="mt-2 text-xl font-semibold text-cyan-200">{value}</p></div>)}
    </div>
    <div className="mt-4 rounded-xl border border-emerald-400/20 bg-emerald-950/20 p-4">
      <p className="font-semibold text-emerald-300">Lipinski Rule of Five · {violations(molecule)} violations</p>
      <p className="mt-2 text-sm text-slate-300">MW ≤ 500, LogP ≤ 5, HBD ≤ 5, HBA ≤ 10. Screening heuristics only; passing does not imply efficacy, safety or bioavailability.</p>
    </div>
   </div>
  </div>
  <div className="mt-6 rounded-xl border border-white/10 bg-slate-950/70 p-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="flex items-center gap-2 text-lg font-semibold"><FlaskConical size={20} className="text-violet-300"/> Illustrative Screening Ranking</h3><select aria-label="Sort molecules" value={sort} onChange={e=>setSort(e.target.value as "name"|"score")} className="rounded-lg border border-slate-600 bg-slate-900 p-2 text-sm"><option value="score">Heuristic score</option><option value="name">Name</option></select></div>
    <div className="mt-4 space-y-3">{ranked.map(({m,i,score})=><button type="button" key={m.name} onClick={()=>setSelected(i)} className="flex w-full items-center gap-3 rounded-lg border border-white/10 p-3 text-left hover:border-violet-300/60"><span className="w-24 shrink-0 text-sm">{m.name}</span><span className="h-2 flex-1 overflow-hidden rounded-full bg-slate-700"><span className="block h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-300" style={{width:score+"%"}}/></span><span className="w-12 text-right font-mono text-sm text-cyan-200">{score}/100</span></button>)}</div>
    <p className="mt-3 text-xs leading-5 text-amber-200/80">Scores are an explicitly invented educational heuristic, not a trained AI model, drug efficacy, toxicity or clinical probability. Descriptor values are reference approximations and may vary by method.</p>
  </div>
 </section>;
}
