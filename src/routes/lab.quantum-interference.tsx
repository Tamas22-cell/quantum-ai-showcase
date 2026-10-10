import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { LabShell } from "@/components/lab/lab-shell";
export const Route=createFileRoute("/lab/quantum-interference")({head:()=>({meta:[{title:"Quantum Interference Visualizer — Quantum AI Lab"},{name:"description",content:"Phase-based quantum interference using exact H–Rz–H circuit amplitudes."}]}),component:InterferenceLab});
function InterferenceLab(){
 const [degrees,setDegrees]=useState(90),[stage,setStage]=useState(3);
 const phi=degrees*Math.PI/180;
 const p0=Math.cos(phi/2)**2,p1=Math.sin(phi/2)**2;
 const phasors=useMemo(()=>[{re:Math.cos(-phi/2)/2,im:Math.sin(-phi/2)/2},{re:Math.cos(phi/2)/2,im:Math.sin(phi/2)/2}],[phi]);
 const result={re:phasors[0]!.re+phasors[1]!.re,im:phasors[0]!.im+phasors[1]!.im};
 const pos=(c:{re:number;im:number},radius=85)=>({x:140+c.re*radius*2,y:118-c.im*radius*2});
 const P0=pos(phasors[0]!),P1=pos(phasors[1]!),sum=pos(result);
 const labels=["|0⟩ input","H: equal paths","Rz(φ): relative phase","H: recombine"];
 return <LabShell crumb="Quantum Interference"><div className="mb-7 max-w-3xl"><span className="font-mono text-xs text-primary">QUANTUM LAB / 12</span><h1 className="mt-2 text-3xl font-semibold sm:text-4xl">Quantum Interference Visualizer</h1><p className="mt-3 text-sm leading-7 text-muted-foreground">Watch how relative phase changes constructive and destructive interference. Uses the exact one-qubit circuit H → Rz(φ) → H.</p><p className="mt-2 text-xs text-primary">Exact ideal statevector simulation · not quantum hardware measurements</p></div>
 <div className="grid gap-5 lg:grid-cols-2">
 <section className="rounded-lg border border-border bg-card p-5"><h2 className="font-semibold">Phase-controlled interference</h2><label className="mt-5 block text-sm">Relative phase φ: <strong>{degrees}°</strong><input className="mt-3 w-full accent-cyan-400" type="range" min="0" max="360" value={degrees} onChange={e=>{setDegrees(Number(e.target.value));setStage(3);}}/></label>
 <div className="mt-4 flex flex-wrap gap-2">{[0,90,180,270,360].map(v=><button key={v} onClick={()=>{setDegrees(v);setStage(3);}} className="rounded border border-border px-3 py-1.5 font-mono text-xs">{v}°</button>)}</div>
 <svg viewBox="0 0 280 240" className="mt-5 w-full" role="img" aria-label="Complex-plane amplitude phasors for interference at zero output">
 <line x1="10" y1="118" x2="270" y2="118" stroke="#64748b"/><line x1="140" y1="8" x2="140" y2="230" stroke="#64748b"/><circle cx="140" cy="118" r="85" fill="none" stroke="#64748b" strokeDasharray="3 6"/>
 <text x="252" y="110" fontSize="11" fill="currentColor">Re</text><text x="148" y="14" fontSize="11" fill="currentColor">Im</text>
 {stage>=2&&<><line x1="140" y1="118" x2={P0.x} y2={P0.y} stroke="#22d3ee" strokeWidth="3"/><line x1="140" y1="118" x2={P1.x} y2={P1.y} stroke="#f59e0b" strokeWidth="3"/></>}
 {stage===3&&<><line x1="140" y1="118" x2={sum.x} y2={sum.y} stroke="#4ade80" strokeWidth="4"/><circle cx={sum.x} cy={sum.y} r="5" fill="#4ade80"/></>}
 </svg><p className="text-xs text-muted-foreground">Cyan and amber: path contributions to |0⟩. Green: complex-amplitude sum, giving P(0) = |amplitude|².</p>
 </section><section className="rounded-lg border border-border bg-card p-5"><h2 className="font-semibold">Quantum circuit</h2>
 <svg viewBox="0 0 400 90" className="mt-5 w-full" role="img" aria-label="H Rz phase H measurement circuit"><text x="4" y="49" fill="currentColor" fontSize="15">|0⟩</text><line x1="45" y1="44" x2="398" y2="44" stroke="#64748b"/>{[[70,"H"],[157,"Rz(φ)"],[270,"H"],[345,"M"]].map(([x,label])=><g key={label}><rect x={Number(x)} y="25" width={String(label).length>3?67:40} height="38" rx="5" fill="#0e7490"/><text x={Number(x)+7} y="48" fill="white" fontSize="13">{label}</text></g>)}</svg>
 <div className="mt-5 flex flex-wrap gap-2">{labels.map((label,i)=><button key={label} onClick={()=>setStage(i)} className={`rounded border px-3 py-2 text-xs ${stage===i?"border-primary text-primary":"border-border"}`}>{i+1}. {label}</button>)}</div><button onClick={()=>setStage(v=>(v+1)%4)} className="mt-3 rounded border border-primary px-4 py-2 text-sm text-primary">Next gate →</button>
 <h3 className="mt-7 font-semibold">Exact Born-rule probabilities</h3>
 {([["|0⟩",p0],["|1⟩",p1]] as const).map(([label,p])=><div key={label} className="mt-4"><div className="flex justify-between font-mono text-sm"><span>P({label})</span><strong>{(p*100).toFixed(3)}%</strong></div><div className="mt-2 h-3 rounded bg-muted"><div className="h-full rounded bg-cyan-400 transition-all" style={{width:`${p*100}%`}}/></div></div>)}
 <p className="mt-5 rounded border border-border bg-background p-3 font-mono text-xs">P(0) = cos²(φ/2) = {p0.toFixed(6)}<br/>P(1) = sin²(φ/2) = {p1.toFixed(6)}</p>
 <p className="mt-4 text-xs text-muted-foreground">{stage===0?"Input is |0⟩.":stage===1?"First H creates equal amplitudes for both paths.":stage===2?"Rz changes the relative phase without changing measurement probabilities yet.":"Final H recombines amplitudes. Observe phase-dependent output probabilities."}</p>
 </section></div></LabShell>;
}