import { useEffect, useMemo, useState, useTransition } from "react";
import { useNavigate } from "@tanstack/react-router";
import { readTransfer } from "@/lib/assistant/transfer";
import { writeIbmTransfer } from "@/lib/ibm/job";
import { ChevronLeft, ChevronRight, Dices, RotateCcw, Send, Trash2, Undo2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  EXAMPLE_CIRCUITS, GATE_META, createRng, marginal, measuredQubits, probabilities, sampleCounts,
  simulate, toBitstring, validateCircuit, type Circuit, type GateName,
} from "@/lib/quantum";
import { CircuitDiagram } from "./circuit-diagram";
import { Histogram, Panel, ProbabilityRow } from "./charts";

const MAX_QUBITS = 5;
const MAX_OPS = 64;
const MAX_SHOTS = 100_000;
const PALETTE: GateName[] = ["H", "X", "Y", "Z", "S", "T", "RX", "RY", "RZ", "CNOT", "CZ", "M"];
const inputCls = "h-9 w-full rounded-md border border-input bg-background px-2 font-mono text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const fmtNum = (v: number) => (Math.abs(v) < 5e-13 ? 0 : v).toFixed(4);
const fmtComplex = (re: number, im: number) => `${fmtNum(re)} ${im < -5e-13 ? "−" : "+"} ${fmtNum(Math.abs(im))}i`;

export function CircuitBuilder() {
  const navigate = useNavigate();
  const [circuit, setCircuit] = useState<Circuit>(EXAMPLE_CIRCUITS[0]!.circuit);
  const [history, setHistory] = useState<Circuit[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [gate, setGate] = useState<GateName>("H");
  const [target, setTarget] = useState(0);
  const [control, setControl] = useState(1);
  const [thetaPi, setThetaPi] = useState("0.5"); // angle entered in units of π
  const [shots, setShots] = useState("1024");
  const [seed, setSeed] = useState("2026");
  const [counts, setCounts] = useState<{ counts: Uint32Array; shots: number; seed: number; key: string } | null>(null);
  const [inputError, setInputError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [hideZero, setHideZero] = useState(true);

  // Load a circuit handed over by the AI Assistant (re-validated; one-shot).
  useEffect(() => {
    const incoming = readTransfer(window.sessionStorage);
    if (incoming) setCircuit(incoming);
  }, []);

  const n = circuit.numQubits;
  const errors = useMemo(() => validateCircuit(circuit, MAX_QUBITS, MAX_OPS), [circuit]);
  // Exact simulation — recomputed on every edit.
  const result = useMemo(() => {
    if (errors.length) return null;
    const state = simulate(circuit);
    const probs = probabilities(state);
    const mq = measuredQubits(circuit);
    return { state, probs, mq, marg: marginal(probs, mq) };
  }, [circuit, errors]);
  const circuitKey = JSON.stringify(circuit);

  /** Commit a new circuit and push the old one to the undo stack. */
  const commit = (next: Circuit, nextSelected: number | null = null) => {
    setHistory((h) => [...h.slice(-49), circuit]);
    setCircuit(next);
    setSelected(nextSelected);
    setCounts(null);
  };

  const addGate = () => {
    setInputError(null);
    const meta = GATE_META[gate];
    if (circuit.ops.length >= MAX_OPS) return setInputError(`Maximum of ${MAX_OPS} operations.`);
    const theta = Number(thetaPi) * Math.PI;
    if (meta.param && !Number.isFinite(theta)) return setInputError("Enter a numeric angle (in units of π).");
    if (meta.arity === 2 && (n < 2 || control === target)) return setInputError("Two-qubit gates need distinct control and target qubits.");
    const op = { gate, qubits: meta.arity === 2 ? [control, target] : [target], ...(meta.param ? { theta } : {}) };
    const candidate = { ...circuit, ops: [...circuit.ops, op] };
    const errs = validateCircuit(candidate, MAX_QUBITS, MAX_OPS);
    if (errs.length) return setInputError(errs[errs.length - 1]!);
    commit(candidate);
  };

  const setQubits = (q: number) => {
    const ops = circuit.ops.filter((o) => o.qubits.every((x) => x < q));
    commit({ numQubits: q, ops });
    setTarget((t) => Math.min(t, q - 1));
    setControl((c) => (q > 1 ? Math.min(c, q - 1) : 0));
  };

  const moveSelected = (dir: -1 | 1) => {
    if (selected === null) return;
    const j = selected + dir;
    if (j < 0 || j >= circuit.ops.length) return;
    const ops = [...circuit.ops];
    [ops[selected], ops[j]] = [ops[j]!, ops[selected]!];
    commit({ ...circuit, ops }, j);
  };
  const deleteSelected = () => {
    if (selected === null) return;
    commit({ ...circuit, ops: circuit.ops.filter((_, i) => i !== selected) });
  };
  const updateSelectedTheta = (v: string) => {
    if (selected === null) return;
    const theta = Number(v) * Math.PI;
    if (!Number.isFinite(theta)) return;
    const ops = circuit.ops.map((o, i) => (i === selected ? { ...o, theta } : o));
    commit({ ...circuit, ops }, selected);
  };
  const undo = () => {
    const prev = history[history.length - 1];
    if (!prev) return;
    setHistory((h) => h.slice(0, -1));
    setCircuit(prev); setSelected(null); setCounts(null);
  };

  const runShots = () => {
    setInputError(null);
    const s = Number(shots), sd = Number(seed);
    if (!Number.isInteger(s) || s < 1 || s > MAX_SHOTS) return setInputError(`Shots must be an integer between 1 and ${MAX_SHOTS.toLocaleString()}.`);
    if (!Number.isInteger(sd) || sd < 0) return setInputError("Seed must be a non-negative integer.");
    if (!result) return;
    // Sampling is O(shots · log dim); a transition keeps the UI responsive.
    startTransition(() => {
      setCounts({ counts: sampleCounts(result.marg, s, createRng(sd)), shots: s, seed: sd, key: circuitKey });
    });
  };

  const selectedOp = selected !== null ? circuit.ops[selected] : undefined;
  const dim = 1 << n;
  const mq = result?.mq ?? [];
  const labelFor = (k: number) => toBitstring(k, mq.length);
  const liveCounts = counts && counts.key === circuitKey ? counts : null;

  return (
    <div className="grid gap-5">
      {/* Controls */}
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Panel
          title="Circuit"
          aside={
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="signalOutline" onClick={undo} disabled={!history.length}><Undo2 aria-hidden="true" />Undo</Button>
              <Button size="sm" variant="signalOutline" onClick={() => commit({ numQubits: n, ops: [] })} disabled={!circuit.ops.length}><RotateCcw aria-hidden="true" />Reset</Button>
              <Button size="sm" variant="signalOutline" disabled={errors.length > 0} onClick={() => { if (writeIbmTransfer(circuit, window.sessionStorage)) void navigate({ to: "/lab/ibm" }); }}><Send aria-hidden="true" />Send to IBM prep</Button>
            </div>
          }
        >
          <div className="mb-4 flex flex-wrap items-end gap-3">
            <label className="grid gap-1 font-mono text-[10px] uppercase text-muted-foreground">
              Qubits
              <div className="flex gap-1" role="radiogroup" aria-label="Number of qubits">
                {[1, 2, 3, 4, 5].map((q) => (
                  <button key={q} role="radio" aria-checked={n === q} onClick={() => q !== n && setQubits(q)}
                    className={`size-9 rounded-md border font-mono text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${n === q ? "border-primary bg-signal-soft text-primary" : "border-border text-muted-foreground hover:border-primary/60"}`}>{q}</button>
                ))}
              </div>
            </label>
            <label className="grid min-w-48 flex-1 gap-1 font-mono text-[10px] uppercase text-muted-foreground">
              Example circuits
              <select className={inputCls} value="" onChange={(e) => { const ex = EXAMPLE_CIRCUITS.find((x) => x.id === e.target.value); if (ex) commit(ex.circuit); }}>
                <option value="" disabled>Load an example…</option>
                {EXAMPLE_CIRCUITS.map((ex) => <option key={ex.id} value={ex.id}>{ex.name}</option>)}
              </select>
            </label>
          </div>

          <CircuitDiagram circuit={circuit} selected={selected} onSelect={(i) => setSelected((s) => (s === i ? null : i))} />
          <p className="mt-2 font-mono text-[10px] text-muted-foreground">Click or press Enter on a gate to select it for editing. Wires start in |0⟩.</p>

          {selectedOp ? (
            <div className="mt-3 flex flex-wrap items-center gap-2 rounded-md border border-emerald/40 bg-emerald-soft p-3">
              <span className="font-mono text-xs text-emerald">Step {selected! + 1}: {GATE_META[selectedOp.gate].description} · {selectedOp.qubits.map((q) => `q${q}`).join(" → ")}</span>
              {GATE_META[selectedOp.gate].param ? (
                <label className="flex items-center gap-2 font-mono text-xs text-muted-foreground">θ/π
                  <input key={selected} type="number" step="0.05" defaultValue={((selectedOp.theta ?? 0) / Math.PI).toFixed(3)} onBlur={(e) => updateSelectedTheta(e.target.value)} className={`${inputCls} w-24`} aria-label="Rotation angle in units of pi" />
                </label>
              ) : null}
              <div className="ml-auto flex gap-1">
                <Button size="sm" variant="ghost" onClick={() => moveSelected(-1)} aria-label="Move gate earlier"><ChevronLeft aria-hidden="true" /></Button>
                <Button size="sm" variant="ghost" onClick={() => moveSelected(1)} aria-label="Move gate later"><ChevronRight aria-hidden="true" /></Button>
                <Button size="sm" variant="ghost" onClick={deleteSelected} aria-label="Delete gate"><Trash2 aria-hidden="true" /></Button>
              </div>
            </div>
          ) : null}

          {errors.length ? (
            <ul role="alert" className="mt-3 space-y-1 rounded-md border border-destructive/50 bg-destructive/10 p-3 font-mono text-xs text-destructive">
              {errors.map((e) => <li key={e}>{e}</li>)}
            </ul>
          ) : null}
        </Panel>

        <Panel title="Add operation">
          <div className="grid grid-cols-4 gap-2" role="radiogroup" aria-label="Gate">
            {PALETTE.map((g) => {
              const disabled = GATE_META[g].arity === 2 && n < 2;
              return (
                <button key={g} role="radio" aria-checked={gate === g} disabled={disabled} onClick={() => setGate(g)} title={GATE_META[g].description}
                  className={`h-11 rounded-md border font-mono text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-30 ${gate === g ? "border-primary bg-signal-soft text-primary" : "border-border text-foreground hover:border-primary/60"}`}>
                  {GATE_META[g].label}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{GATE_META[gate].description}</p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {GATE_META[gate].arity === 2 ? (
              <label className="grid gap-1 font-mono text-[10px] uppercase text-muted-foreground">Control
                <select className={inputCls} value={control} onChange={(e) => setControl(Number(e.target.value))}>
                  {Array.from({ length: n }, (_, q) => <option key={q} value={q}>q{q}</option>)}
                </select>
              </label>
            ) : null}
            <label className="grid gap-1 font-mono text-[10px] uppercase text-muted-foreground">Target
              <select className={inputCls} value={target} onChange={(e) => setTarget(Number(e.target.value))}>
                {Array.from({ length: n }, (_, q) => <option key={q} value={q}>q{q}</option>)}
              </select>
            </label>
            {GATE_META[gate].param ? (
              <label className="grid gap-1 font-mono text-[10px] uppercase text-muted-foreground">Angle θ (× π)
                <input type="number" step="0.05" value={thetaPi} onChange={(e) => setThetaPi(e.target.value)} className={inputCls} />
              </label>
            ) : null}
          </div>
          <Button className="mt-4 w-full" variant="signal" onClick={addGate}>Add {GATE_META[gate].label}</Button>
          {inputError ? <p role="alert" className="mt-2 font-mono text-xs text-destructive">{inputError}</p> : null}
        </Panel>
      </div>

      {/* Results */}
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Statevector |ψ⟩" aside={
          <label className="flex items-center gap-2 font-mono text-[10px] uppercase text-muted-foreground">
            <input type="checkbox" checked={hideZero} onChange={(e) => setHideZero(e.target.checked)} className="accent-[var(--primary)]" /> Hide zero amplitudes
          </label>
        }>
          {result ? (
            <div className="max-h-96 overflow-auto">
              <table className="w-full font-mono text-xs">
                <thead className="sticky top-0 bg-card text-left text-[10px] uppercase text-muted-foreground">
                  <tr><th className="py-2 pr-3">Basis</th><th className="pr-3">Amplitude</th><th className="pr-3">Phase</th><th className="text-right">P</th></tr>
                </thead>
                <tbody>
                  {Array.from({ length: dim }, (_, i) => i)
                    .filter((i) => !hideZero || result.probs[i]! > 1e-12)
                    .map((i) => {
                      const re = result.state.re[i]!, im = result.state.im[i]!;
                      const p = result.probs[i]!;
                      return (
                        <tr key={i} className="border-t border-border/60">
                          <td className="py-1.5 pr-3 text-primary">|{toBitstring(i, n)}⟩</td>
                          <td className="whitespace-nowrap pr-3">{fmtComplex(re, im)}</td>
                          <td className="whitespace-nowrap pr-3 text-muted-foreground">{p > 1e-12 ? `${(Math.atan2(im, re) / Math.PI).toFixed(3)}π` : "—"}</td>
                          <td className="text-right">{p.toFixed(4)}</td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          ) : <p className="text-sm text-muted-foreground">Fix the circuit errors to see the statevector.</p>}
          <p className="mt-3 text-[11px] leading-5 text-muted-foreground">Bitstrings read q{n - 1}…q0 (little-endian, Qiskit convention). Global phase is physically unobservable.</p>
        </Panel>

        <Panel title={`Exact probabilities · measured ${mq.map((q) => `q${q}`).join(", ")}`}>
          {result ? (
            <div className="grid max-h-96 gap-2 overflow-auto pr-1">
              {Array.from(result.marg).map((p, k) => (!hideZero || p > 1e-12 ? <ProbabilityRow key={k} label={`|${labelFor(k)}⟩`} p={p} /> : null))}
            </div>
          ) : null}
          <p className="mt-3 text-[11px] leading-5 text-muted-foreground">
            {circuit.ops.some((o) => o.gate === "M") ? "Marginal distribution over qubits with a measurement operation." : "No measurement ops placed — all qubits are measured by default."}
          </p>
        </Panel>
      </div>

      <Panel title="Shot-based sampling" aside={liveCounts ? <span className="font-mono text-[10px] uppercase text-muted-foreground">{liveCounts.shots.toLocaleString()} shots · seed {liveCounts.seed}</span> : null}>
        <div className="flex flex-wrap items-end gap-3">
          <label className="grid gap-1 font-mono text-[10px] uppercase text-muted-foreground">Shots
            <input type="number" min={1} max={MAX_SHOTS} value={shots} onChange={(e) => setShots(e.target.value)} className={`${inputCls} w-32`} />
          </label>
          <label className="grid gap-1 font-mono text-[10px] uppercase text-muted-foreground">Seed
            <input type="number" min={0} value={seed} onChange={(e) => setSeed(e.target.value)} className={`${inputCls} w-28`} />
          </label>
          <Button variant="signalOutline" onClick={() => setSeed(String(Math.floor(Math.random() * 1e6)))}><Dices aria-hidden="true" />New seed</Button>
          <Button variant="signal" onClick={runShots} disabled={!result || pending}>{pending ? "Sampling…" : "Run shots"}</Button>
        </div>
        {liveCounts && result ? (
          <div className="mt-5">
            <Histogram
              ariaLabel="Measurement histogram"
              valueFormat={(v) => `${Math.round(v * liveCounts.shots)} counts (${(v * 100).toFixed(2)}%)`}
              bars={Array.from(liveCounts.counts).map((c, k) => ({ label: labelFor(k), value: c / liveCounts.shots, expected: result.marg[k]! }))}
            />
            <div className="mt-3 flex flex-wrap gap-4 font-mono text-[10px] uppercase text-muted-foreground">
              <span className="flex items-center gap-2"><span className="size-2.5 rounded-sm bg-primary" />Sampled frequency</span>
              <span className="flex items-center gap-2"><span className="h-0.5 w-3 bg-emerald" />Exact probability</span>
            </div>
          </div>
        ) : <p className="mt-4 text-sm text-muted-foreground">Run shots to draw samples from the exact distribution. The same seed always reproduces the same counts.</p>}
      </Panel>

      <Panel title="Computational limits">
        <dl className="grid grid-cols-2 gap-4 font-mono text-xs sm:grid-cols-4">
          {[
            ["Qubits", `${n} / ${MAX_QUBITS}`],
            ["Statevector dimension", `2^${n} = ${dim}`],
            ["Memory (complex128)", `${dim * 16} bytes`],
            ["Operations", `${circuit.ops.length} / ${MAX_OPS}`],
          ].map(([k, v]) => (
            <div key={k} className="rounded-md border border-border bg-background/60 p-3"><dt className="text-[10px] uppercase text-muted-foreground">{k}</dt><dd className="mt-1 text-foreground">{v}</dd></div>
          ))}
        </dl>
        <ul className="mt-4 grid gap-1.5 text-xs leading-5 text-muted-foreground sm:grid-cols-2">
          <li>• Ideal, noiseless dense statevector simulation — memory grows as 2ⁿ, so exact classical simulation becomes infeasible beyond roughly 40–50 qubits.</li>
          <li>• Measurements are terminal (Z basis); gates after a measurement on the same qubit are rejected.</li>
          <li>• No noise models, decoherence, or hardware connectivity constraints are simulated.</li>
          <li>• Results are classical simulations, not outputs from quantum hardware.</li>
        </ul>
      </Panel>
    </div>
  );
}
