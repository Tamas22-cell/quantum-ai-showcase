import { Component, lazy, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Check, Copy, Pause, Play, RotateCcw, SkipForward, Video } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  PRESETS,
  blochVector,
  evolve,
  formatComplex,
  partialAngles,
  qiskitCode,
  stateMetrics,
  trajectory,
  zxzUnitary,
  type PresetId,
} from "@/lib/quantum/bloch-zxz";
import type { BlochSceneHandle } from "./bloch-3d-scene";
import { BlochSphereVisualizer } from "./bloch-sphere-visualizer";

// three.js touches `window`; load it only in the browser after hydration.
const BlochScene = lazy(() => import("./bloch-3d-scene").then((m) => ({ default: m.BlochScene })));

type Unit = "rad" | "deg";
const TAU = 2 * Math.PI;
const SPEED = 0.6; // animation segments per second

function hasWebGL() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

/** Catches WebGL context/driver failures so the rest of the lab keeps working. */
class SceneBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  override state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  override render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

const fmtRad = (v: number) => `${(v / Math.PI).toFixed(3)}π`;

export function InteractiveQuantumLab() {
  const [preset, setPreset] = useState<PresetId>("0");
  const [angles, setAngles] = useState({ alpha: Math.PI / 2, beta: Math.PI / 2, gamma: Math.PI / 4 });
  const [unit, setUnit] = useState<Unit>("deg");
  const [progress, setProgress] = useState(3);
  const [playing, setPlaying] = useState(false);
  const [webgl, setWebgl] = useState<boolean | null>(null);
  const [copied, setCopied] = useState(false);
  const scene = useRef<BlochSceneHandle>(null);

  useEffect(() => setWebgl(hasWebGL()), []);

  // Play loop: advance progress in real time; stop at the end of the sequence.
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      setProgress((p) => {
        const next = Math.min(3, p + dt * SPEED);
        if (next >= 3) setPlaying(false);
        return next;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing]);

  const { alpha, beta, gamma } = angles;
  const state = useMemo(() => evolve(preset, alpha, beta, gamma, progress), [preset, alpha, beta, gamma, progress]);
  const vec = blochVector(state);
  const m = stateMetrics(state);
  const trail = useMemo(() => trajectory(preset, alpha, beta, gamma), [preset, alpha, beta, gamma]);
  const U = useMemo(() => zxzUnitary(alpha, beta, gamma), [alpha, beta, gamma]);
  const applied = partialAngles(alpha, beta, gamma, progress);
  const code = qiskitCode(preset, alpha, beta, gamma);
  const activeGate = progress >= 3 ? 3 : Math.floor(progress);

  const setAngle = (k: keyof typeof angles, raw: number) => {
    setAngles((a) => ({ ...a, [k]: unit === "deg" ? (raw * Math.PI) / 180 : raw }));
    setPlaying(false);
    setProgress(3);
  };

  const play = () => {
    if (progress >= 3) setProgress(0);
    setPlaying((p) => !p);
  };
  const step = () => {
    setPlaying(false);
    setProgress((p) => (p >= 3 ? 1 : Math.min(3, Math.floor(p + 1e-9) + 1)));
  };
  const reset = () => {
    setPlaying(false);
    setProgress(0);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  const sliders = [
    { k: "alpha" as const, label: "α · first Rz", gate: "Rz(α)" },
    { k: "beta" as const, label: "β · Rx", gate: "Rx(β)" },
    { k: "gamma" as const, label: "γ · last Rz", gate: "Rz(γ)" },
  ];

  const fallback = (
    <div className="space-y-3">
      <p role="status" className="rounded-md border border-border bg-surface p-3 text-xs text-muted-foreground">
        3D view unavailable — WebGL is disabled or unsupported in this browser. Showing a 2D projection; every number
        below is still exact.
      </p>
      <BlochSphereVisualizer />
    </div>
  );

  return (
    <div className="space-y-6">
      <p className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-primary">
        Statevector simulation — not live quantum hardware
      </p>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        {/* 3D sphere */}
        <section aria-label="3D Bloch sphere" className="rounded-md border border-border bg-card p-4">
          <div className="relative aspect-square w-full touch-none overflow-hidden rounded-md bg-background">
            {webgl === null ? (
              <div className="h-full w-full animate-pulse" aria-label="Loading 3D view" />
            ) : webgl ? (
              <SceneBoundary fallback={fallback}>
                <Suspense fallback={<div className="h-full w-full animate-pulse" aria-label="Loading 3D view" />}>
                  <BlochScene ref={scene} vector={vec} trail={trail} />
                </Suspense>
              </SceneBoundary>
            ) : (
              <div className="h-full overflow-auto p-2">{fallback}</div>
            )}
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <p className="font-mono text-[10px] uppercase text-muted-foreground">
              Drag / touch to rotate · scroll / pinch to zoom
            </p>
            <Button variant="ghost" size="sm" onClick={() => scene.current?.resetCamera()} disabled={!webgl}>
              <Video aria-hidden="true" /> Reset camera
            </Button>
          </div>
          <p className="sr-only" aria-live="polite">
            Bloch vector x {vec.x.toFixed(3)}, y {vec.y.toFixed(3)}, z {vec.z.toFixed(3)}
          </p>
        </section>

        {/* Controls */}
        <section aria-label="State controls" className="space-y-5 rounded-md border border-border bg-card p-5">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Initial state</div>
            <div className="mt-2 grid grid-cols-5 gap-2" role="group" aria-label="Initial state preset">
              {(Object.keys(PRESETS) as PresetId[]).map((id) => (
                <Button
                  key={id}
                  variant={preset === id ? "default" : "signalOutline"}
                  aria-pressed={preset === id}
                  onClick={() => {
                    setPreset(id);
                    setPlaying(false);
                    setProgress(3);
                  }}
                >
                  {PRESETS[id].label}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                ZXZ angles
              </span>
              <div className="flex gap-1" role="group" aria-label="Angle unit">
                {(["deg", "rad"] as Unit[]).map((u) => (
                  <Button key={u} size="sm" variant={unit === u ? "default" : "ghost"} aria-pressed={unit === u} onClick={() => setUnit(u)}>
                    {u === "deg" ? "Degrees" : "Radians"}
                  </Button>
                ))}
              </div>
            </div>
            <div className="mt-3 space-y-4">
              {sliders.map(({ k, label }) => {
                const v = angles[k];
                const shown = unit === "deg" ? (v * 180) / Math.PI : v;
                return (
                  <label key={k} className="block">
                    <span className="flex justify-between font-mono text-xs">
                      <span className="text-foreground">{label}</span>
                      <span className="text-primary">
                        {unit === "deg" ? `${shown.toFixed(0)}°` : `${v.toFixed(3)} rad`} · {fmtRad(v)}
                      </span>
                    </span>
                    <input
                      type="range"
                      className="mt-2 w-full accent-primary"
                      min={unit === "deg" ? -360 : -TAU}
                      max={unit === "deg" ? 360 : TAU}
                      step={unit === "deg" ? 1 : 0.01}
                      value={shown}
                      onChange={(e) => setAngle(k, Number(e.target.value))}
                    />
                  </label>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={play} variant="default">
              {playing ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
              {playing ? "Pause" : "Play"}
            </Button>
            <Button onClick={step} variant="signalOutline">
              <SkipForward aria-hidden="true" /> Step
            </Button>
            <Button onClick={reset} variant="ghost">
              <RotateCcw aria-hidden="true" /> Reset
            </Button>
            <span className="ml-auto self-center font-mono text-[10px] uppercase text-muted-foreground">
              {progress >= 3 ? "Sequence complete" : `Gate ${activeGate + 1} of 3`}
            </span>
          </div>

          {/* Gate diagram */}
          <div className="overflow-x-auto" aria-label="Circuit diagram">
            <div className="flex min-w-max items-center font-mono text-xs">
              <span className="pr-2 text-muted-foreground">q₀ {PRESETS[preset].label}</span>
              {sliders.map(({ gate, k }, i) => (
                <div key={k} className="flex items-center">
                  <span className="h-px w-5 bg-border-strong" />
                  <span
                    className={`rounded-sm border px-2 py-1.5 ${
                      progress >= 3 || i < activeGate
                        ? "border-primary/60 text-primary"
                        : i === activeGate
                          ? "border-primary bg-primary/15 text-primary"
                          : "border-border text-muted-foreground"
                    }`}
                  >
                    {gate}
                  </span>
                </div>
              ))}
              <span className="h-px w-5 bg-border-strong" />
              <span className="text-muted-foreground">|ψ⟩</span>
            </div>
            <p className="mt-2 font-mono text-[10px] text-muted-foreground">
              Applied now: Rz({applied.a.toFixed(3)}) → Rx({applied.b.toFixed(3)}) → Rz({applied.g.toFixed(3)}) rad
            </p>
          </div>
        </section>
      </div>

      {/* Exact numbers */}
      <div className="grid gap-6 lg:grid-cols-3">
        <section aria-label="Statevector" className="rounded-md border border-border bg-card p-5 font-mono text-xs">
          <h2 className="text-[10px] uppercase tracking-wider text-primary">Statevector |ψ⟩ = α|0⟩ + β|1⟩</h2>
          {state.map((c, i) => (
            <div key={i} className="mt-3 rounded-sm border border-border bg-surface p-3">
              <div className="text-muted-foreground">amplitude of |{i}⟩</div>
              <div className="mt-1 text-foreground">{formatComplex(c)}</div>
              <div className="mt-1 text-[10px] text-muted-foreground">
                |·| = {Math.hypot(c.re, c.im).toFixed(4)} · arg = {fmtRad(Math.atan2(c.im, c.re))}
              </div>
            </div>
          ))}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-sm border border-border bg-surface p-3">
              P(0) <div className="mt-1 text-lg text-primary">{(m.p0 * 100).toFixed(2)}%</div>
            </div>
            <div className="rounded-sm border border-border bg-surface p-3">
              P(1) <div className="mt-1 text-lg text-primary">{(m.p1 * 100).toFixed(2)}%</div>
            </div>
          </div>
          <p className={`mt-3 ${Math.abs(m.norm - 1) < 1e-9 ? "text-emerald" : "text-destructive"}`}>
            Normalization ⟨ψ|ψ⟩ = {m.norm.toFixed(12)} {Math.abs(m.norm - 1) < 1e-9 ? "✓" : "✗"}
          </p>
        </section>

        <section aria-label="Phase and Bloch vector" className="rounded-md border border-border bg-card p-5 font-mono text-xs">
          <h2 className="text-[10px] uppercase tracking-wider text-primary">Phase & Bloch vector</h2>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {(["x", "y", "z"] as const).map((a) => (
              <div key={a} className="rounded-sm border border-border bg-surface p-3">
                ⟨{a.toUpperCase()}⟩ <div className="mt-1 text-primary">{vec[a].toFixed(4)}</div>
              </div>
            ))}
          </div>
          <dl className="mt-3 space-y-2 leading-5">
            <div>
              <dt className="text-muted-foreground">Relative phase φ = arg(β) − arg(α)</dt>
              <dd className="text-foreground">{m.relativePhase === null ? "undefined (at a pole)" : fmtRad(m.relativePhase)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Global phase (unobservable)</dt>
              <dd className="text-foreground">{fmtRad(m.globalPhase)}</dd>
            </div>
          </dl>
          <p className="mt-3 text-[11px] leading-5 text-muted-foreground">
            Rz is kept as Qiskit defines it, diag(e^−iλ/2, e^iλ/2), so amplitudes carry a global phase. It changes the
            numbers above but never the Bloch vector or P(0)/P(1). The relative phase φ is what moves the arrow around
            the Z axis.
          </p>
        </section>

        <section aria-label="Unitary" className="rounded-md border border-border bg-card p-5 font-mono text-xs">
          <h2 className="text-[10px] uppercase tracking-wider text-primary">U = Rz(γ) · Rx(β) · Rz(α)</h2>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="rounded-sm border border-border bg-surface p-2 text-[11px]">
                {formatComplex({ re: U.re[i] ?? 0, im: U.im[i] ?? 0 }, 3)}
              </div>
            ))}
          </div>
          <p className="mt-3 text-[11px] leading-5 text-muted-foreground">
            Qiskit runs gates left to right on the wire: Rz(α) first, then Rx(β), then Rz(γ). As a matrix the first
            gate sits on the right, so U = Rz(γ)·Rx(β)·Rz(α). This order matters: swapping α and γ gives a different
            state.
          </p>
        </section>
      </div>

      <section aria-label="Equivalent Qiskit code" className="rounded-md border border-border bg-card p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-mono text-[10px] uppercase tracking-wider text-primary">Equivalent Qiskit code</h2>
          <Button size="sm" variant="signalOutline" onClick={copy}>
            {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
            {copied ? "Copied" : "Copy code"}
          </Button>
        </div>
        <pre className="mt-3 overflow-x-auto rounded-sm border border-border bg-surface p-4 font-mono text-xs leading-6 text-foreground">
          <code>{code}</code>
        </pre>
      </section>

      <p className="rounded-md border border-border bg-surface p-4 text-xs leading-6 text-muted-foreground">
        Limitations: one ideal, noiseless qubit computed exactly in your browser (double precision). No measurement
        sampling, noise, or hardware is involved — P(0) and P(1) are exact Born-rule probabilities, not counts.
      </p>
    </div>
  );
}
