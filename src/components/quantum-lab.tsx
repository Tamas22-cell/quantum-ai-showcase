import { useCallback, useMemo, useRef, useState } from "react";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Complex number helpers for single-qubit state simulation. */
type C = { re: number; im: number };
const c = (re: number, im = 0): C => ({ re, im });
const add = (a: C, b: C): C => c(a.re + b.re, a.im + b.im);
const mul = (a: C, b: C): C => c(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re);
const abs2 = (a: C) => a.re * a.re + a.im * a.im;

type State = [C, C];
type Gate = "H" | "X" | "Y" | "Z";
const S = Math.SQRT1_2;

/** 2x2 unitary matrices for each gate. */
const GATES: Record<Gate, [[C, C], [C, C]]> = {
  H: [[c(S), c(S)], [c(S), c(-S)]],
  X: [[c(0), c(1)], [c(1), c(0)]],
  Y: [[c(0), c(0, -1)], [c(0, 1), c(0)]],
  Z: [[c(1), c(0)], [c(0), c(-1)]],
};
const GATE_INFO: Record<Gate, string> = {
  H: "Hadamard — creates superposition",
  X: "Pauli-X — bit flip (π about X)",
  Y: "Pauli-Y — π rotation about Y",
  Z: "Pauli-Z — phase flip (π about Z)",
};

const apply = (g: Gate, [a, b]: State): State => {
  const m = GATES[g];
  return [add(mul(m[0][0], a), mul(m[0][1], b)), add(mul(m[1][0], a), mul(m[1][1], b))];
};

/** Bloch vector from amplitudes (global phase invariant). */
const bloch = ([a, b]: State) => {
  const ab = mul(c(a.re, -a.im), b);
  return { x: 2 * ab.re, y: 2 * ab.im, z: abs2(a) - abs2(b) };
};

const fmt = (z: C) => {
  const r = (v: number) => (Math.abs(v) < 1e-9 ? 0 : v).toFixed(3);
  if (Math.abs(z.im) < 1e-9) return r(z.re);
  if (Math.abs(z.re) < 1e-9) return `${r(z.im)}i`;
  return `${r(z.re)} ${z.im < 0 ? "−" : "+"} ${Math.abs(z.im).toFixed(3)}i`;
};

const INITIAL: State = [c(1), c(0)];
const SIZE = 320;
const R = 120;

/** Interactive Bloch sphere rendered as a rotatable orthographic SVG projection. */
function BlochSphere({ v }: { v: { x: number; y: number; z: number } }) {
  const [rot, setRot] = useState({ yaw: -0.6, pitch: 0.35 });
  const drag = useRef<{ x: number; y: number } | null>(null);

  // Physics convention (z up) -> screen: rotate by yaw about z, then pitch about screen x.
  const project = useCallback(
    (x: number, y: number, z: number) => {
      const cy = Math.cos(rot.yaw), sy = Math.sin(rot.yaw);
      const x1 = x * cy - y * sy;
      const y1 = x * sy + y * cy; // depth axis before pitch
      const cp = Math.cos(rot.pitch), sp = Math.sin(rot.pitch);
      const depth = y1 * cp - z * sp;
      const up = y1 * sp + z * cp;
      return { sx: SIZE / 2 + x1 * R, sy: SIZE / 2 - up * R, d: depth };
    },
    [rot],
  );

  const circle = (fn: (t: number) => [number, number, number]) => {
    const pts = Array.from({ length: 73 }, (_, i) => project(...fn((i / 72) * Math.PI * 2)));
    const back: string[] = [], front: string[] = [];
    for (let i = 1; i < pts.length; i++) {
      const seg = `M${pts[i - 1].sx},${pts[i - 1].sy}L${pts[i].sx},${pts[i].sy}`;
      (pts[i].d > 0 ? back : front).push(seg);
    }
    return { back: back.join(""), front: front.join("") };
  };

  const rings = [
    circle((t) => [Math.cos(t), Math.sin(t), 0]),
    circle((t) => [Math.cos(t), 0, Math.sin(t)]),
    circle((t) => [0, Math.cos(t), Math.sin(t)]),
  ];
  const axes: { p: [number, number, number]; label: string }[] = [
    { p: [0, 0, 1], label: "|0⟩" }, { p: [0, 0, -1], label: "|1⟩" },
    { p: [1, 0, 0], label: "+x" }, { p: [0, 1, 0], label: "+y" },
  ];
  const o = project(0, 0, 0);
  const tip = project(v.x, v.y, v.z);

  const onDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY };
  };
  const onMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    const dx = e.clientX - drag.current.x, dy = e.clientY - drag.current.y;
    drag.current = { x: e.clientX, y: e.clientY };
    setRot((r) => ({ yaw: r.yaw - dx * 0.01, pitch: Math.max(-1.4, Math.min(1.4, r.pitch + dy * 0.01)) }));
  };

  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className="h-auto w-full max-w-[420px] cursor-grab touch-none select-none active:cursor-grabbing"
      role="img"
      aria-label={`Bloch sphere. State vector x ${v.x.toFixed(2)}, y ${v.y.toFixed(2)}, z ${v.z.toFixed(2)}. Drag to rotate.`}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={() => (drag.current = null)}
      onPointerCancel={() => (drag.current = null)}
    >
      <defs>
        <radialGradient id="bloch-fill" cx="40%" cy="35%">
          <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.18" />
          <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.02" />
        </radialGradient>
      </defs>
      <circle cx={SIZE / 2} cy={SIZE / 2} r={R} fill="url(#bloch-fill)" stroke="var(--primary)" strokeOpacity="0.45" />
      {rings.map((r, i) => <path key={`b${i}`} d={r.back} stroke="var(--primary)" strokeOpacity="0.15" strokeDasharray="3 4" fill="none" />)}
      {rings.map((r, i) => <path key={`f${i}`} d={r.front} stroke="var(--primary)" strokeOpacity="0.4" fill="none" />)}
      {axes.map(({ p, label }) => {
        const a = project(...p);
        const l = project(p[0] * 1.2, p[1] * 1.2, p[2] * 1.2);
        return (
          <g key={label}>
            <line x1={o.sx} y1={o.sy} x2={a.sx} y2={a.sy} stroke="var(--muted-foreground)" strokeOpacity="0.4" />
            <text x={l.sx} y={l.sy} fill="var(--muted-foreground)" fontSize="11" fontFamily="IBM Plex Mono, monospace" textAnchor="middle" dominantBaseline="middle">{label}</text>
          </g>
        );
      })}
      <line x1={o.sx} y1={o.sy} x2={tip.sx} y2={tip.sy} stroke="var(--primary)" strokeWidth="3" strokeLinecap="round" style={{ transition: "all 400ms ease" }} />
      <circle cx={tip.sx} cy={tip.sy} r="7" fill="var(--primary)" style={{ transition: "all 400ms ease", filter: "drop-shadow(0 0 6px var(--primary))" }} />
      <circle cx={o.sx} cy={o.sy} r="2.5" fill="var(--foreground)" />
    </svg>
  );
}

export function QuantumLab() {
  const [state, setState] = useState<State>(INITIAL);
  const [circuit, setCircuit] = useState<Gate[]>([]);
  const [shots, setShots] = useState<{ zero: number; one: number } | null>(null);

  const v = useMemo(() => bloch(state), [state]);
  const p0 = abs2(state[0]), p1 = abs2(state[1]);

  const addGate = (g: Gate) => {
    setState((s) => apply(g, s));
    setCircuit((cc) => [...cc, g].slice(-24));
    setShots(null);
  };
  const reset = () => { setState(INITIAL); setCircuit([]); setShots(null); };
  /** Sample 1000 simulated measurements in the computational basis. */
  const measure = () => {
    let zero = 0;
    for (let i = 0; i < 1000; i++) if (Math.random() < p0) zero++;
    setShots({ zero, one: 1000 - zero });
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="flex flex-col items-center rounded-md border border-border bg-surface p-5">
        <BlochSphere v={v} />
        <p className="mt-2 font-mono text-xs text-muted-foreground">Drag to rotate · Bloch vector ({v.x.toFixed(2)}, {v.y.toFixed(2)}, {v.z.toFixed(2)})</p>
      </div>

      <div className="flex min-w-0 flex-col gap-6">
        <div>
          <h3 className="font-mono text-xs uppercase text-primary">Gates</h3>
          <div className="mt-3 grid grid-cols-4 gap-3">
            {(Object.keys(GATES) as Gate[]).map((g) => (
              <Button key={g} variant="signalOutline" className="h-14 font-mono text-lg" onClick={() => addGate(g)} title={GATE_INFO[g]} aria-label={`Apply ${GATE_INFO[g]}`}>
                {g}
              </Button>
            ))}
          </div>
        </div>

        <div>
          <h3 className="font-mono text-xs uppercase text-primary">Circuit</h3>
          <div className="mt-3 flex min-h-14 items-center gap-2 overflow-x-auto rounded-md border border-border bg-surface px-3 py-2 font-mono text-sm" aria-live="polite">
            <span className="shrink-0 text-muted-foreground">|0⟩</span>
            <span className="h-px w-4 shrink-0 bg-primary/50" />
            {circuit.length === 0 ? <span className="text-muted-foreground">apply a gate…</span> : circuit.map((g, i) => (
              <span key={i} className="flex shrink-0 items-center gap-2">
                <span className="grid size-8 place-items-center rounded border border-primary/60 text-primary">{g}</span>
                <span className="h-px w-3 bg-primary/50" />
              </span>
            ))}
          </div>
        </div>

        <div className="rounded-md border border-border bg-surface p-4 font-mono text-sm">
          <h3 className="text-xs uppercase text-primary">State vector</h3>
          <p className="mt-2 break-words text-foreground">|ψ⟩ = ({fmt(state[0])})|0⟩ + ({fmt(state[1])})|1⟩</p>
        </div>

        <div>
          <h3 className="font-mono text-xs uppercase text-primary">Measurement probabilities</h3>
          {[["|0⟩", p0, shots?.zero], ["|1⟩", p1, shots?.one]].map(([label, p, n]) => (
            <div key={label as string} className="mt-3">
              <div className="flex justify-between font-mono text-xs text-muted-foreground">
                <span>P({label as string})</span>
                <span>{((p as number) * 100).toFixed(1)}%{n !== undefined ? ` · ${n}/1000 shots` : ""}</span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full bg-primary transition-all duration-500" style={{ width: `${(p as number) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-3">
          <Button variant="signal" onClick={measure}>Measure ×1000</Button>
          <Button variant="signalOutline" onClick={reset}><RotateCcw className="size-4" aria-hidden="true" />Reset</Button>
        </div>
      </div>
    </div>
  );
}
