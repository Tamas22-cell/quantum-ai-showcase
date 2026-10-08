import { useMemo, useState } from "react";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

type Basis = "X" | "Y" | "Z";
type Vec = { x: number; y: number; z: number };

const PRESETS: { label: string; ket: string; v: Vec }[] = [
  { label: "|0⟩", ket: "|0⟩", v: { x: 0, y: 0, z: 1 } },
  { label: "|1⟩", ket: "|1⟩", v: { x: 0, y: 0, z: -1 } },
  { label: "|+⟩", ket: "(|0⟩ + |1⟩)/√2", v: { x: 1, y: 0, z: 0 } },
  { label: "|−⟩", ket: "(|0⟩ − |1⟩)/√2", v: { x: -1, y: 0, z: 0 } },
  { label: "|+i⟩", ket: "(|0⟩ + i|1⟩)/√2", v: { x: 0, y: 1, z: 0 } },
  { label: "|−i⟩", ket: "(|0⟩ − i|1⟩)/√2", v: { x: 0, y: -1, z: 0 } },
];

const axis: Record<Basis, Vec> = {
  X: { x: 1, y: 0, z: 0 },
  Y: { x: 0, y: 1, z: 0 },
  Z: { x: 0, y: 0, z: 1 },
};

function dot(a: Vec, b: Vec) {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function project(v: Vec) {
  const cx = 160,
    cy = 160,
    r = 112;
  return {
    x: cx + r * (0.86 * v.x - 0.5 * v.y),
    y: cy + r * (0.34 * v.x + 0.58 * v.y - v.z),
  };
}

function MeasurementSphere({ state, basis }: { state: Vec; basis: Basis }) {
  const p = project(state);
  const a = project(axis[basis]);
  const n = project({ x: -axis[basis].x, y: -axis[basis].y, z: -axis[basis].z });
  return (
    <svg
      viewBox="0 0 320 320"
      className="h-auto w-full max-w-[420px]"
      role="img"
      aria-label={`Quantum state measured in the ${basis} basis`}
    >
      <defs>
        <radialGradient id="measurementGlow" cx="42%" cy="34%" r="70%">
          <stop offset="0" stopColor="var(--primary)" stopOpacity=".18" />
          <stop offset="1" stopColor="var(--primary)" stopOpacity=".02" />
        </radialGradient>
      </defs>
      <circle
        cx="160"
        cy="160"
        r="112"
        fill="url(#measurementGlow)"
        stroke="var(--primary)"
        strokeOpacity=".55"
        strokeWidth="1.5"
      />
      <ellipse
        cx="160"
        cy="160"
        rx="112"
        ry="42"
        fill="none"
        stroke="var(--primary)"
        strokeOpacity=".25"
        strokeDasharray="4 5"
      />
      <ellipse
        cx="160"
        cy="160"
        rx="42"
        ry="112"
        fill="none"
        stroke="var(--primary)"
        strokeOpacity=".2"
        strokeDasharray="4 5"
        transform="rotate(-30 160 160)"
      />
      <line
        x1={n.x}
        y1={n.y}
        x2={a.x}
        y2={a.y}
        stroke="var(--muted-foreground)"
        strokeOpacity=".65"
        strokeWidth="2"
        strokeDasharray="5 5"
      />
      <text x={a.x + 5} y={a.y - 7} fill="var(--primary)" fontSize="11">
        +{basis}
      </text>
      <text x={n.x + 5} y={n.y + 14} fill="var(--muted-foreground)" fontSize="11">
        −{basis}
      </text>
      <line x1="160" y1="160" x2={p.x} y2={p.y} stroke="var(--primary)" strokeWidth="3" />
      <circle
        cx={p.x}
        cy={p.y}
        r="7"
        fill="var(--primary)"
        style={{ filter: "drop-shadow(0 0 6px var(--primary))" }}
      />
      <circle cx="160" cy="160" r="3" fill="var(--foreground)" />
    </svg>
  );
}

export function QuantumLab() {
  const [preset, setPreset] = useState(2);
  const [basis, setBasis] = useState<Basis>("Z");
  const [shots, setShots] = useState<{ plus: number; minus: number } | null>(null);
  const state = PRESETS[preset]!;
  const expectation = dot(state.v, axis[basis]);
  const pPlus = (1 + expectation) / 2;
  const pMinus = 1 - pPlus;

  const measure = () => {
    let plus = 0;
    for (let i = 0; i < 1000; i++) if (Math.random() < pPlus) plus++;
    setShots({ plus, minus: 1000 - plus });
  };

  const resultLabel = useMemo(() => {
    if (!shots) return "Ready to measure";
    return `${basis}+ ${shots.plus} · ${basis}− ${shots.minus}`;
  }, [basis, shots]);

  return (
    <div className="grid gap-6 overflow-hidden rounded-lg border border-border bg-card/80 p-4 shadow-[0_30px_80px_-40px_oklch(0.82_0.145_192/0.35)] backdrop-blur-sm sm:p-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-8">
      <div className="flex flex-col items-center rounded-md border border-border bg-background/70 p-5">
        <div className="mb-2 flex w-full items-center justify-between font-mono text-[10px] uppercase text-muted-foreground">
          <span className="flex items-center gap-2">
            <span className="signal-pulse size-1.5 rounded-full bg-primary" />
            Quantum measurement
          </span>
          <span>{basis}-basis · 1 qubit</span>
        </div>
        <MeasurementSphere state={state.v} basis={basis} />
        <p className="mt-2 text-center font-mono text-xs text-muted-foreground">
          State vector versus the selected measurement axis
        </p>
      </div>

      <div className="flex min-w-0 flex-col gap-5">
        <div>
          <h3 className="font-mono text-xs uppercase text-primary">Prepare state</h3>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {PRESETS.map((s, i) => (
              <Button
                key={s.label}
                variant={preset === i ? "signal" : "signalOutline"}
                onClick={() => {
                  setPreset(i);
                  setShots(null);
                }}
              >
                {s.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="rounded-md border border-border bg-surface p-4 font-mono text-sm">
          <h3 className="text-xs uppercase text-primary">Prepared state</h3>
          <p className="mt-2 text-foreground">|ψ⟩ = {state.ket}</p>
        </div>

        <div>
          <h3 className="font-mono text-xs uppercase text-primary">Choose measurement basis</h3>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {(["X", "Y", "Z"] as Basis[]).map((b) => (
              <Button
                key={b}
                variant={basis === b ? "signal" : "signalOutline"}
                onClick={() => {
                  setBasis(b);
                  setShots(null);
                }}
              >
                {b} basis
              </Button>
            ))}
          </div>
        </div>

        <div>
          <h3 className="font-mono text-xs uppercase text-primary">Measurement probabilities</h3>
          {[
            [`${basis}+`, pPlus, shots?.plus],
            [`${basis}−`, pMinus, shots?.minus],
          ].map(([label, p, n]) => (
            <div key={label as string} className="mt-3">
              <div className="flex justify-between font-mono text-xs text-muted-foreground">
                <span>P({label as string})</span>
                <span>
                  {((p as number) * 100).toFixed(1)}%{n !== undefined ? ` · ${n}/1000 shots` : ""}
                </span>
              </div>
              <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary transition-all duration-500"
                  style={{ width: `${(p as number) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-md border border-border bg-surface p-4">
          <div className="font-mono text-[10px] uppercase text-muted-foreground">
            Measurement result
          </div>
          <div className="mt-1 font-mono text-sm text-primary">{resultLabel}</div>
          <div className="mt-2 text-xs leading-5 text-muted-foreground">
            Expectation ⟨σ{basis.toLowerCase()}⟩ = {expectation.toFixed(2)}. The selected basis
            changes what information the measurement extracts from the same prepared qubit.
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button variant="signal" onClick={measure}>
            Measure ×1000
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              setPreset(2);
              setBasis("Z");
              setShots(null);
            }}
          >
            <RotateCcw className="mr-2 size-4" />
            Reset
          </Button>
        </div>
      </div>
    </div>
  );
}
