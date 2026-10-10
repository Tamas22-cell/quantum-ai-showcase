import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { LabShell } from "@/components/lab/lab-shell";

export const Route = createFileRoute("/lab/quantum-teleportation")({
  head: () => ({meta:[{title:"Quantum Teleportation Simulator — Quantum AI Lab"},{name:"description",content:"Interactive three-qubit quantum teleportation with exact statevector and Bell-measurement correction."}]}),
  component: TeleportationLab,
});
type C={re:number;im:number};
const add=(a:C,b:C):C=>({re:a.re+b.re,im:a.im+b.im});
const mul=(a:C,b:C):C=>({re:a.re*b.re-a.im*b.im,im:a.re*b.im+a.im*b.re});
const abs2=(a:C)=>a.re*a.re+a.im*a.im;
const Z:C={re:0,im:0}, ONE:C={re:1,im:0};
const scale=(a:C,v:number):C=>({re:a.re*v,im:a.im*v});
function gate(s:C[],q:number,m:C[][]):C[]{const t=s.map(v=>({...v}));for(let i=0;i<s.length;i++)if(!(i&(1<<q))){let j=i|(1<<q);t[i]=add(mul(m[0]![0]!,s[i]!),mul(m[0]![1]!,s[j]!));t[j]=add(mul(m[1]![0]!,s[i]!),mul(m[1]![1]!,s[j]!));}return t;}
const H:C[][]=[[scale(ONE,Math.SQRT1_2),scale(ONE,Math.SQRT1_2)],[scale(ONE,Math.SQRT1_2),scale(ONE,-Math.SQRT1_2)]];
const X:C[][]=[[Z,ONE],[ONE,Z]],ZMAT:C[][]=[[ONE,Z],[Z,scale(ONE,-1)]];
function cnot(s:C[],control:number,target:number):C[]{let t=s.map(v=>({...v}));for(let i=0;i<8;i++)if((i&(1<<control))&&!(i&(1<<target))){const j=i|(1<<target);t[i]=s[j]!;t[j]=s[i]!;}return t;}
function phase(theta:number):C{return {re:Math.cos(theta),im:Math.sin(theta)};}
function calculate(theta:number,phi:number,m0:number,m1:number){
 const a=scale(ONE,Math.cos(theta/2)),b=scale(phase(phi),Math.sin(theta/2));
 let s=Array.from({length:8},()=>({...Z}));s[0]=a;s[1]=b;
 s=gate(s,1,H);s=cnot(s,1,2);const entangled=s;
 s=cnot(s,0,1);s=gate(s,0,H);
 const indices=[(m0<<0)|(m1<<1),(m0<<0)|(m1<<1)|4];
 const probability=indices.reduce((v,i)=>v+abs2(s[i]!),0);
 const raw: C[]=indices.map(i=>scale(s[i]!,1/Math.sqrt(probability)));
 let corrected=[...raw];
 // Bell outcome m1 controls X and m0 controls Z.
 if(m1)corrected=[corrected[1]!,corrected[0]!];
 if(m0)corrected=[corrected[0]!,scale(corrected[1]!,-1)];
 const overlap=add(mul({re:a.re,im:-a.im},corrected[0]!),mul({re:b.re,im:-b.im},corrected[1]!));
 return {a,b,s,entangled,probability,raw,corrected,fidelity:abs2(overlap)};
}
function fmt(c:C){return `${c.re.toFixed(3)} ${c.im<0?"−":"+"} ${Math.abs(c.im).toFixed(3)}i`;}
function TeleportationLab(){
 const [theta,setTheta]=useState(70),[phi,setPhi]=useState(45),[m0,setM0]=useState(0),[m1,setM1]=useState(0),[stage,setStage]=useState(4);
 const q=useMemo(()=>calculate(theta*Math.PI/180,phi*Math.PI/180,m0,m1),[theta,phi,m0,m1]);
 const stages=["Input state","Bell pair |Φ+⟩","Alice CNOT + H","Alice measurement","Bob corrections"];
 return <LabShell crumb="Quantum Teleportation">
 <div className="mb-7 max-w-3xl"><span className="font-mono text-xs text-primary">QUANTUM LAB / 11</span><h1 className="mt-2 text-3xl font-semibold sm:text-4xl">Quantum Teleportation Simulator</h1><p className="mt-3 text-sm leading-7 text-muted-foreground">Follow an actual three-qubit teleportation circuit. Alice measures her two qubits and communicates classical bits to Bob, who applies X and Z corrections.</p><p className="mt-2 text-xs text-primary">Exact ideal statevector simulation · not live quantum hardware</p></div>
 <div className="grid gap-5 lg:grid-cols-2"><section className="rounded-lg border border-border bg-card p-5">
 <h2 className="font-semibold">Prepare input qubit</h2>
 {([["Polar angle θ",theta,setTheta,180],["Relative phase φ",phi,setPhi,360]] as const).map(([name,v,fn,max])=><label key={name} className="mt-5 block text-sm">{name}: <strong>{v}°</strong><input className="mt-2 w-full accent-cyan-400" type="range" min="0" max={max} value={v} onChange={e=>fn(Number(e.target.value))}/></label>)}
 <div className="mt-5 rounded border border-border bg-background p-3 font-mono text-xs leading-6">|ψ⟩ = ({fmt(q.a)})|0⟩ + ({fmt(q.b)})|1⟩</div>
 <h3 className="mt-6 font-semibold">Choose Alice's measurement outcome</h3><div className="mt-3 flex flex-wrap gap-2">{[0,1].flatMap(a=>[0,1].map(b=><button key={`${a}${b}`} onClick={()=>{setM0(a);setM1(b);setStage(4);}} className={`rounded border px-4 py-2 font-mono text-xs ${m0===a&&m1===b?"border-cyan-400 bg-cyan-400/10":"border-border"}`}>{a}{b}</button>))}</div>
 <p className="mt-3 text-sm text-muted-foreground">P(outcome {m0}{m1}) = {(100*q.probability).toFixed(2)}%. Each of the four outcomes occurs with 25% probability in the ideal protocol.</p>
 </section><section className="rounded-lg border border-border bg-card p-5">
 <h2 className="font-semibold">Teleportation circuit — step-by-step</h2>
 <svg viewBox="0 0 520 185" role="img" aria-label="Three-qubit circuit with Bell-pair preparation, Alice measurement, and Bob classical corrections" className="mt-5 w-full">
 {[45,90,135].map((y,i)=><g key={y}><text x="2" y={y+4} fill="currentColor" fontSize="13">{["q₀ ψ","q₁ |0⟩","q₂ |0⟩"][i]}</text><line x1="70" y1={y} x2="515" y2={y} stroke="#64748b"/></g>)}
 <rect x="110" y="74" width="28" height="30" rx="4" fill="#0e7490"/><text x="119" y="95" fill="white" fontSize="16">H</text><line x1="161" y1="90" x2="161" y2="135" stroke="#22d3ee" strokeWidth="2"/><circle cx="161" cy="90" r="5" fill="#22d3ee"/><circle cx="161" cy="135" r="11" stroke="#22d3ee" fill="none" strokeWidth="2"/><path d="M150 135H172" stroke="#22d3ee" strokeWidth="2"/>
 <line x1="230" y1="45" x2="230" y2="90" stroke="#22d3ee" strokeWidth="2"/><circle cx="230" cy="45" r="5" fill="#22d3ee"/><circle cx="230" cy="90" r="11" stroke="#22d3ee" fill="none" strokeWidth="2"/><path d="M219 90H241" stroke="#22d3ee" strokeWidth="2"/>
 <rect x="264" y="30" width="28" height="30" rx="4" fill="#0e7490"/><text x="273" y="51" fill="white" fontSize="16">H</text>
 {[45,90].map(y=><g key={y}><rect x="326" y={y-15} width="35" height="30" rx="4" fill="#164e63"/><text x="337" y={y+5} fill="white" fontSize="16">M</text></g>)}
 <rect x="400" y="120" width="28" height="30" rx="4" fill="#0e7490"/><text x="409" y="141" fill="white" fontSize="16">X</text><rect x="461" y="120" width="28" height="30" rx="4" fill="#0e7490"/><text x="470" y="141" fill="white" fontSize="16">Z</text>
 <path d="M344 105V169H475V151M344 60V176H414V151" fill="none" stroke="#f59e0b" strokeDasharray="5 4"/>
 </svg>
 <div className="mt-4 flex flex-wrap gap-2">{stages.map((name,i)=><button key={name} onClick={()=>setStage(i)} className={`rounded border px-2 py-2 text-xs ${stage===i?"border-primary text-primary":"border-border"}`}>{i+1}. {name}</button>)}</div>
 <button onClick={()=>setStage(s=>(s+1)%5)} className="mt-3 rounded border border-primary px-4 py-2 text-sm text-primary">Next stage →</button>
 <div className="mt-5 rounded border border-border bg-background/60 p-4"><p className="text-sm font-semibold">{stages[stage]}</p><p className="mt-2 font-mono text-xs leading-6">{stage===0?"Unknown input |ψ⟩ on q₀":stage===1?"H(q₁), CNOT(q₁,q₂) create |Φ+⟩":stage===2?"CNOT(q₀,q₁), H(q₀)":stage===3?`Measured bits: m₀=${m0}, m₁=${m1}; Bob uncorrected amplitudes [${q.raw.map(fmt).join("; ")}]`:`Bob applies X^${m1} then Z^${m0}; recovered amplitudes [${q.corrected.map(fmt).join("; ")}]`}</p></div>
 <div className="mt-5 grid grid-cols-2 gap-3"><div className="rounded border border-border p-3"><div className="text-xs text-muted-foreground">Recovered-state fidelity</div><div className="mt-2 text-2xl font-bold text-primary">{stage===4?(100*q.fidelity).toFixed(3)+"%":"—"}</div></div><div className="rounded border border-border p-3"><div className="text-xs text-muted-foreground">Classical bits</div><div className="mt-2 text-2xl font-bold">{m0}{m1}</div></div></div>
 </section></div>
 <p className="mt-5 text-xs text-muted-foreground">The quantum state is teleported, not matter or information faster than light. Alice's 2-bit classical message is necessary. Ideal noiseless model, and the fidelity is invariant under a global phase.</p>
 </LabShell>;
}