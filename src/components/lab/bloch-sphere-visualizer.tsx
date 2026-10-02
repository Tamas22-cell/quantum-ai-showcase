import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Panel } from "./charts";

type Vec = { x: number; y: number; z: number };
type Gate = "X" | "Y" | "Z" | "H" | "S" | "T";

const INITIAL: Vec = { x: 0, y: 0, z: 1 };
const clean = (v: number) => (Math.abs(v) < 1e-12 ? 0 : v);
const rotateZ = (v: Vec, a: number): Vec => ({ x: clean(v.x * Math.cos(a) - v.y * Math.sin(a)), y: clean(v.x * Math.sin(a) + v.y * Math.cos(a)), z: v.z });

function applyGate(v: Vec, gate: Gate): Vec {
  switch (gate) {
    case "X": return { x: v.x, y: -v.y, z: -v.z };
    case "Y": return { x: -v.x, y: v.y, z: -v.z };
    case "Z": return { x: -v.x, y: -v.y, z: v.z };
    case "H": return { x: v.z, y: -v.y, z: v.x };
    case "S": return rotateZ(v, Math.PI / 2);
    case "T": return rotateZ(v, Math.PI / 4);
  }
}

function project(v: Vec) {
  const cx = 160, cy = 160, r = 112;
  return { x: cx + r * (0.86 * v.x - 0.5 * v.y), y: cy + r * (0.34 * v.x + 0.58 * v.y - v.z) };
}

export function BlochSphereVisualizer() {
  const [vector, setVector] = useState<Vec>(INITIAL);
  const [history, setHistory] = useState<Gate[]>([]);
  const point = useMemo(() => project(vector), [vector]);
  const p0 = (1 + vector.z) / 2;
  const theta = Math.acos(Math.max(-1, Math.min(1, vector.z)));
  const phi = Math.atan2(vector.y, vector.x);

  const run = (gate: Gate) => {
    setVector((v) => applyGate(v, gate));
    setHistory((h) => [...h.slice(-11), gate]);
  };

  return (
    <Panel title="Interactive Bloch Sphere" aside={<span className="font-mono text-[9px] uppercase text-muted-foreground">Single-qubit pure state</span>}>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(260px,.75fr)] lg:items-center">
        <div className="relative mx-auto aspect-square w-full max-w-[430px] overflow-hidden rounded-full border border-primary/30 bg-background shadow-[0_0_55px_rgba(45,212,191,.08)]">
          <svg viewBox="0 0 320 320" className="h-full w-full" role="img" aria-label={`Bloch vector x ${vector.x.toFixed(3)}, y ${vector.y.toFixed(3)}, z ${vector.z.toFixed(3)}`}>
            <defs>
              <radialGradient id="blochGlow" cx="42%" cy="34%" r="70%"><stop offset="0" stopColor="currentColor" stopOpacity=".12"/><stop offset="1" stopColor="currentColor" stopOpacity=".01"/></radialGradient>
              <filter id="vectorGlow"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
            </defs>
            <circle cx="160" cy="160" r="112" fill="url(#blochGlow)" className="text-primary" stroke="currentColor" strokeOpacity=".55" strokeWidth="1.5" />
            <ellipse cx="160" cy="160" rx="112" ry="42" fill="none" stroke="currentColor" strokeOpacity=".24" strokeDasharray="4 5" />
            <ellipse cx="160" cy="160" rx="42" ry="112" fill="none" stroke="currentColor" strokeOpacity=".18" strokeDasharray="4 5" transform="rotate(-30 160 160)" />
            <line x1="48" y1="160" x2="272" y2="160" stroke="currentColor" strokeOpacity=".22" />
            <line x1="160" y1="42" x2="160" y2="278" stroke="currentColor" strokeOpacity=".28" />
            <line x1="160" y1="160" x2={point.x} y2={point.y} stroke="currentColor" strokeWidth="3" className="text-primary" filter="url(#vectorGlow)" />
            <circle cx={point.x} cy={point.y} r="6" fill="currentColor" className="text-primary" filter="url(#vectorGlow)" />
            <circle cx="160" cy="160" r="3" fill="currentColor" className="text-muted-foreground" />
            <text x="164" y="36" fill="currentColor" className="text-[11px] text-primary">|0⟩ +Z</text>
            <text x="164" y="294" fill="currentColor" className="text-[11px] text-muted-foreground">|1⟩ −Z</text>
            <text x="274" y="156" fill="currentColor" className="text-[10px] text-muted-foreground">+X</text>
            <text x="56" y="210" fill="currentColor" className="text-[10px] text-muted-foreground">+Y</text>
          </svg>
        </div>

        <div>
          <div className="mb-4">
            <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Apply quantum gate</div>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {(["H", "X", "Y", "Z", "S", "T"] as Gate[]).map((g) => <Button key={g} variant="signalOutline" onClick={() => run(g)}>{g}</Button>)}
            </div>
            <Button className="mt-2 w-full" variant="ghost" onClick={() => { setVector(INITIAL); setHistory([]); }}>Reset to |0⟩</Button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {(["x", "y", "z"] as const).map((axis) => <div key={axis} className="rounded-md border border-border bg-surface p-3"><div className="font-mono text-[9px] uppercase text-muted-foreground">{axis}</div><div className="mt-1 font-mono text-lg text-primary">{vector[axis].toFixed(3)}</div></div>)}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 font-mono text-xs">
            <div className="rounded-md border border-border bg-surface p-3"><span className="text-muted-foreground">P(|0⟩)</span><div className="mt-1 text-foreground">{(p0 * 100).toFixed(1)}%</div></div>
            <div className="rounded-md border border-border bg-surface p-3"><span className="text-muted-foreground">P(|1⟩)</span><div className="mt-1 text-foreground">{((1 - p0) * 100).toFixed(1)}%</div></div>
          </div>
          <div className="mt-3 rounded-md border border-border bg-surface p-3 font-mono text-[10px] leading-5 text-muted-foreground">
            θ = {(theta / Math.PI).toFixed(3)}π · φ = {(phi / Math.PI).toFixed(3)}π
            <br />Sequence: {history.length ? history.join(" → ") : "|0⟩"}
          </div>
          <p className="mt-3 text-xs leading-5 text-muted-foreground">The arrow is the qubit's Bloch vector. Gates rotate the state on the sphere; measurement probabilities follow directly from its Z coordinate.</p>
        </div>
      </div>
    </Panel>
  );
}
