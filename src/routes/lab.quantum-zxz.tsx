import { useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { LabShell } from "@/components/lab/lab-shell";

export const Route = createFileRoute("/lab/quantum-zxz")({
  head: () => ({ meta: [{ title: "Interactive ZXZ Quantum Gate Simulator — Quantum AI Lab" }, { name: "description", content: "Interactive Bloch sphere with physically accurate one-qubit ZXZ gate rotations and Born-rule probabilities." }] }),
  component: ZXZLab,
});

type V = { x: number; y: number; z: number };
const origin: V = { x: 0, y: 0, z: 1 };
function rz(v: V, a: number): V { return { x: Math.cos(a)*v.x-Math.sin(a)*v.y, y: Math.sin(a)*v.x+Math.cos(a)*v.y, z:v.z }; }
function rx(v: V, a: number): V { return { x:v.x, y:Math.cos(a)*v.y-Math.sin(a)*v.z, z:Math.sin(a)*v.y+Math.cos(a)*v.z }; }
const r = (v: V, theta: number, phi: number): V => rz(rx(v,theta),phi);
function ZXZLab() {
  const [angles,setAngles]=useState<[number,number,number]>([45,90,60]);
  const [step,setStep]=useState(3);
  const [yaw,setYaw]=useState(-35);
  const [pitch,setPitch]=useState(20);
  const [zoom,setZoom]=useState(1);
  const drag=useRef<{x:number;y:number;yaw:number;pitch:number}|null>(null);
  const rad=angles.map(x=>x*Math.PI/180);
  // Qiskit circuit time ordering: rz(gamma), rx(beta), rz(alpha).
  const points=useMemo(()=>{
    const p0=origin;
    const p1=rz(p0,rad[2]!);
    const p2=rx(p1,rad[1]!);
    const p3=rz(p2,rad[0]!);
    return [p0,p1,p2,p3];
  },[angles]);
  const state=points[step]!;
  const p0=Math.max(0,Math.min(1,(1+state.z)/2));
  const p1=1-p0;
  const theta=Math.acos(Math.max(-1,Math.min(1,state.z)));
  const phase=Math.atan2(state.y,state.x);
  const a0=Math.cos(theta/2);
  const a1r=Math.sin(theta/2)*Math.cos(phase);
  const a1i=Math.sin(theta/2)*Math.sin(phase);
  const view=(v:V)=>{
    const y=yaw*Math.PI/180, p=pitch*Math.PI/180;
    const xx=Math.cos(y)*v.x-Math.sin(y)*v.y;
    const yy=Math.sin(y)*v.x+Math.cos(y)*v.y;
    return {x:180+122*zoom*xx,y:180-122*zoom*(Math.cos(p)*v.z-Math.sin(p)*yy)};
  };
  const line=(a:V,b:V,color:string,dash=false)=>{const A=view(a),B=view(b);return <line x1={A.x} y1={A.y} x2={B.x} y2={B.y} stroke={color} strokeWidth="2" strokeDasharray={dash?"5 5":undefined}/>;};
  const vector=view(state);
  const qiskit=`from qiskit import QuantumCircuit\nfrom qiskit.quantum_info import Statevector\nfrom numpy import pi\nqc = QuantumCircuit(1)\nqc.rz(${angles[2]} * pi / 180, 0)  # gamma\nqc.rx(${angles[1]} * pi / 180, 0)  # beta\nqc.rz(${angles[0]} * pi / 180, 0)  # alpha\nprint(Statevector.from_instruction(qc).probabilities_dict())`;
  return <LabShell crumb="Quantum ZXZ Simulator">
    <div className="mb-7 max-w-3xl">
      <span className="font-mono text-xs text-primary">QUANTUM LAB / INTERACTIVE</span>
      <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">3D Bloch Sphere & ZXZ Gate Simulator</h1>
      <p className="mt-3 text-sm leading-7 text-muted-foreground">Drag or touch to rotate the viewing angle. Adjust physical gate rotations; the qubit state and exact measurement probabilities update in real time.</p>
      <p className="mt-2 font-mono text-xs text-primary">Exact ideal statevector simulation · NOT live quantum hardware</p>
    </div>
    <div className="grid gap-5 lg:grid-cols-2">
      <section className="rounded-lg border border-border bg-card p-4 sm:p-6">
        <div className="flex items-center justify-between gap-3"><h2 className="font-semibold">Interactive Bloch sphere</h2><button className="rounded border border-border px-3 py-1 text-xs" onClick={()=>{setYaw(-35);setPitch(20);setZoom(1);}}>Reset camera</button></div>
        <svg className="mt-4 w-full touch-none select-none" viewBox="0 0 360 360" role="img" aria-label="Draggable projected three-dimensional Bloch sphere displaying the current qubit state"
          onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);drag.current={x:e.clientX,y:e.clientY,yaw,pitch};}}
          onPointerMove={e=>{if(!drag.current)return;setYaw(drag.current.yaw+(e.clientX-drag.current.x)*.4);setPitch(Math.max(-89,Math.min(89,drag.current.pitch+(e.clientY-drag.current.y)*.4)));}}
          onPointerUp={()=>drag.current=null} onPointerCancel={()=>drag.current=null}>
          <defs><radialGradient id="zxzsphere"><stop offset="0%" stopColor="#38bdf8" stopOpacity=".2"/><stop offset="100%" stopColor="#38bdf8" stopOpacity=".015"/></radialGradient></defs>
          <circle cx="180" cy="180" r={122*zoom} fill="url(#zxzsphere)" stroke="#22d3ee" strokeOpacity=".55"/>
          {Array.from({length:3},(_,i)=>{const pts=Array.from({length:101},(_,j)=>{const t=j*Math.PI*2/100;return view(i===0?{x:Math.cos(t),y:Math.sin(t),z:0}:i===1?{x:Math.cos(t),y:0,z:Math.sin(t)}:{x:0,y:Math.cos(t),z:Math.sin(t)});});return <polyline key={i} points={pts.map(v=>`${v.x},${v.y}`).join(" ")} fill="none" stroke={["#22d3ee","#a78bfa","#84cc16"][i]} strokeWidth="1.5" opacity=".55"/>;})}
          {line({x:-1.13,y:0,z:0},{x:1.13,y:0,z:0},"#fb7185",true)}
          {line({x:0,y:-1.13,z:0},{x:0,y:1.13,z:0},"#fbbf24",true)}
          {line({x:0,y:0,z:-1.13},{x:0,y:0,z:1.13},"#22d3ee",true)}
          {(["X","Y","Z"] as const).map((axis,i)=>{const v=[{x:1.19,y:0,z:0},{x:0,y:1.19,z:0},{x:0,y:0,z:1.19}][i]!;const pos=view(v);return <text key={axis} x={pos.x} y={pos.y} textAnchor="middle" fill={["#fb7185","#fbbf24","#22d3ee"][i]} fontSize="14" fontWeight="bold">{axis}</text>;})}
          <line x1="180" y1="180" x2={vector.x} y2={vector.y} stroke="#4ade80" strokeWidth="4"/>
          <circle cx={vector.x} cy={vector.y} r="7" fill="#4ade80" stroke="#fff" strokeWidth="1"/>
          <circle cx="180" cy="180" r="3" fill="#fff"/>
        </svg>
        <label className="text-xs text-muted-foreground">Camera zoom: {zoom.toFixed(1)}× <input type="range" min=".6" max="1.2" step=".05" value={zoom} onChange={e=>setZoom(Number(e.target.value))} className="mt-2 w-full"/></label>
        <div className="mt-4 grid grid-cols-3 gap-2 font-mono text-center text-xs"><span>x = {state.x.toFixed(3)}</span><span>y = {state.y.toFixed(3)}</span><span>z = {state.z.toFixed(3)}</span></div>
      </section>
      <section className="rounded-lg border border-border bg-card p-4 sm:p-6">
        <h2 className="font-semibold">ZXZ decomposition</h2>
        <p className="mt-2 font-mono text-sm text-primary">U = Rz(α) · Rx(β) · Rz(γ)</p>
        <p className="mt-1 text-xs text-muted-foreground">Applied from right to left: γ → β → α</p>
        {(["α — final Rz","β — Rx","γ — first Rz"] as const).map((label,i)=><label key={label} className="mt-5 block text-sm">{label}: <strong>{angles[i]}°</strong><input className="mt-2 w-full accent-cyan-400" type="range" min="-360" max="360" step="1" value={angles[i]} onChange={e=>{setAngles(a=>a.map((v,j)=>j===i?Number(e.target.value):v) as [number,number,number]);setStep(3);}}/></label>)}
        <div className="mt-6 flex flex-wrap gap-2">{["Initial |0⟩","Rz(γ)","Rx(β)","Rz(α)"].map((label,i)=><button key={label} onClick={()=>setStep(i)} className={`rounded border px-3 py-2 text-xs ${step===i?"border-cyan-400 bg-cyan-400/10 text-cyan-300":"border-border"}`}>{label}</button>)}</div>
        <div className="mt-4 flex gap-2"><button onClick={()=>setStep(s=>(s+1)%4)} className="rounded border border-primary px-3 py-2 text-xs text-primary">Next gate →</button><button onClick={()=>{setAngles([45,90,60]);setStep(3);}} className="rounded border border-border px-3 py-2 text-xs">Reset circuit</button></div>
        <h3 className="mt-7 text-sm font-semibold">Exact Born-rule probabilities</h3>
        {[[ "|0⟩",p0],["|1⟩",p1]].map(([label,value])=><div key={label as string} className="mt-3"><div className="flex justify-between font-mono text-xs"><span>P({label as string})</span><span>{((value as number)*100).toFixed(3)}%</span></div><div className="mt-1 h-2 rounded bg-muted"><div className="h-full rounded bg-cyan-400" style={{width:`${(value as number)*100}%`}}/></div></div>)}
        <p className="mt-3 text-xs text-muted-foreground">P(0) + P(1) = {(p0+p1).toFixed(6)} · Pure state norm = 1</p>
        <div className="mt-5 rounded border border-border bg-background/50 p-3 font-mono text-xs leading-6">|ψ⟩ ≈ {a0.toFixed(4)}|0⟩ + ({a1r.toFixed(4)} {a1i<0?"−":"+"} {Math.abs(a1i).toFixed(4)}i)|1⟩<div className="mt-1 text-muted-foreground">Bloch vector shown; amplitudes are equivalent up to global phase.</div></div>
      </section>
    </div>
    <section className="mt-5 rounded-lg border border-border bg-card p-4 sm:p-6"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="font-semibold">Reproducible Qiskit circuit</h2><button className="rounded border border-primary px-3 py-2 text-xs text-primary" onClick={()=>navigator.clipboard?.writeText(qiskit)}>Copy Python code</button></div><pre className="mt-3 overflow-x-auto rounded bg-background p-4 text-xs leading-6">{qiskit}</pre><p className="mt-3 text-xs text-muted-foreground">The displayed ket uses a global-phase-equivalent state. Run this Qiskit code to reproduce final measurement probabilities (all three gates).</p></section>
  </LabShell>;
}
