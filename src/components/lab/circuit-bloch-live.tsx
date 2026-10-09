import { useState } from "react";
import type { StateVector } from "@/lib/quantum";
import { Panel } from "./charts";

export function reducedBloch(s: StateVector, qubit: number) {
  const bit = 1 << qubit;
  let x = 0, y = 0, z = 0;
  for (let i = 0; i < s.re.length; i++) {
    if (i & bit) continue;
    const j = i | bit;
    const ar = s.re[i]!, ai = s.im[i]!, br = s.re[j]!, bi = s.im[j]!;
    x += 2 * (ar * br + ai * bi);
    y += 2 * (ar * bi - ai * br);
    z += ar * ar + ai * ai - br * br - bi * bi;
  }
  return { x, y, z };
}

/** Perspective-style interactive projection driven by the actual circuit state. */
export function CircuitBlochLive({ state }: { state: StateVector }) {
  const [qubit, setQubit] = useState(0);
  const [yaw, setYaw] = useState(35);
  const [pitch, setPitch] = useState(22);
  const selected = Math.min(qubit, state.n - 1);
  const v = reducedBloch(state, selected);
  const a = yaw * Math.PI / 180, b = pitch * Math.PI / 180;
  const project = (p: typeof v) => {
    const horizontal = p.x * Math.cos(a) - p.y * Math.sin(a);
    const depth = p.x * Math.sin(a) + p.y * Math.cos(a);
    return { x: 160 + 112 * horizontal, y: 160 + 112 * (depth * Math.sin(b) - p.z * Math.cos(b)) };
  };
  const tip = project(v);
  const length = Math.hypot(v.x, v.y, v.z);
  return (
    <Panel title="Live Circuit Bloch View" aside={<span className="font-mono text-[10px] text-muted-foreground">Exact circuit state</span>}>
      <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_minmax(210px,.75fr)] md:items-center">
        <svg viewBox="0 0 320 320" role="img"
          aria-label={`Qubit ${selected}: Bloch x ${v.x.toFixed(3)}, y ${v.y.toFixed(3)}, z ${v.z.toFixed(3)}`}
          className="mx-auto aspect-square w-full max-w-[340px] text-primary">
          <circle cx="160" cy="160" r="112" fill="none" stroke="currentColor" strokeOpacity=".45" strokeWidth="1.5" />
          <ellipse cx="160" cy="160" rx="112" ry={Math.max(8, 112 * Math.abs(Math.sin(b)))} fill="none" stroke="currentColor" strokeOpacity=".25" strokeDasharray="4 5" />
          <path d="M160 48 V272" stroke="currentColor" strokeOpacity=".25" />
          <line x1="160" y1="160" x2={tip.x} y2={tip.y} stroke="currentColor" strokeWidth="3" />
          <circle cx={tip.x} cy={tip.y} r="6" fill="currentColor" />
          <text x="165" y="40" fill="currentColor" fontSize="12">|0⟩</text>
          <text x="165" y="291" fill="currentColor" fontSize="12">|1⟩</text>
        </svg>
        <div className="space-y-3 text-sm">
          <label className="block">Qubit
            <select className="mt-1 w-full rounded border border-border bg-background p-2" value={selected}
              onChange={e => setQubit(Number(e.target.value))}>
              {Array.from({ length: state.n }, (_, i) => <option key={i} value={i}>q{i}</option>)}
            </select>
          </label>
          <label className="block">Rotation: {yaw}°
            <input className="mt-1 w-full" type="range" min="-180" max="180" value={yaw} onChange={e => setYaw(Number(e.target.value))} />
          </label>
          <label className="block">Tilt: {pitch}°
            <input className="mt-1 w-full" type="range" min="-70" max="70" value={pitch} onChange={e => setPitch(Number(e.target.value))} />
          </label>
          <div className="grid grid-cols-3 gap-2 font-mono text-xs">
            {(["x","y","z"] as const).map(k => <div key={k} className="rounded border border-border p-2">{k}: {v[k].toFixed(3)}</div>)}
          </div>
          <p className="text-xs text-muted-foreground">
            Bloch length: {length.toFixed(3)}. Values below 1 indicate a reduced mixed state.
            Interactive 3D projection of a classical quantum-state simulation, not quantum hardware.
          </p>
        </div>
      </div>
    </Panel>
  );
}
