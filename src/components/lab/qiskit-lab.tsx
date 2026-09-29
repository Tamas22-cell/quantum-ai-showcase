import { useMemo, useState } from "react";
import { Check, Play, RotateCcw, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CircuitDiagram } from "@/components/lab/circuit-diagram";
import { Histogram, Panel } from "@/components/lab/charts";
import { EXAMPLE_CIRCUITS, createRng, marginal, measuredQubits, probabilities, sampleCounts, simulate, toBitstring } from "@/lib/quantum";
import { transpile, stateFidelity, basisLabel, type OptimizationLevel } from "@/lib/quantum/transpile";
import { toQasm3 } from "@/lib/ibm/qasm";
import { saveExperimentSnapshot } from "@/lib/experiment-history";

type Backend = "statevector" | "sampler";
type RunResult = { backend: Backend; shots: number; seed: number; rows: { bits: string; p: number; count: number }[] };

const STEPS = ["Circuit", "Transpile", "Backend", "Run", "Result", "Save"] as const;
const PRESETS = EXAMPLE_CIRCUITS.filter((e) => e.circuit.numQubits <= 4);

/**
 * Qiskit-style workflow: preset → transpile → backend → run → result → save.
 * Reuses the shared statevector engine; everything runs locally in the browser.
 */
export function QiskitLab() {
  const [presetId, setPresetId] = useState(PRESETS[0]!.id);
  const [level, setLevel] = useState<OptimizationLevel>(1);
  const [transpiled, setTranspiled] = useState(false);
  const [backend, setBackend] = useState<Backend | null>(null);
  const [shots, setShots] = useState(1024);
  const [seed, setSeed] = useState(42);
  const [result, setResult] = useState<RunResult | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const preset = PRESETS.find((p) => p.id === presetId)!;
  const tr = useMemo(() => transpile(preset.circuit, level), [preset, level]);
  const fidelity = useMemo(() => stateFidelity(preset.circuit, tr.circuit), [preset, tr]);
  const qasm = useMemo(() => { try { return toQasm3(tr.circuit); } catch (e) { return `// ${(e as Error).message}`; } }, [tr]);

  const stepIndex = saved ? 6 : result ? 5 : backend ? 3 : transpiled ? 2 : 1;

  function resetFrom(step: number) {
    if (step <= 1) setTranspiled(false);
    if (step <= 2) setBackend(null);
    setResult(null); setSaved(false); setError(null);
  }

  function run() {
    setError(null);
    try {
      if (!backend) throw new Error("Select a backend first.");
      if (!Number.isInteger(shots) || shots < 1 || shots > 100_000) throw new Error("Shots must be an integer between 1 and 100,000.");
      if (!Number.isInteger(seed) || seed < 0) throw new Error("Seed must be a non-negative integer.");
      const c = tr.circuit;
      const mq = measuredQubits(c);
      const p = marginal(probabilities(simulate(c)), mq);
      const counts = backend === "sampler" ? sampleCounts(p, shots, createRng(seed)) : null;
      const rows = Array.from(p, (pi, i) => ({ bits: toBitstring(i, mq.length), p: pi, count: counts ? counts[i]! : 0 }));
      setResult({ backend, shots, seed, rows }); setSaved(false);
    } catch (e) { setError((e as Error).message); }
  }

  function save() {
    if (!result) return;
    const top = [...result.rows].sort((a, b) => (b.count || b.p) - (a.count || a.p)).slice(0, 8);
    const fields: Record<string, string | boolean> = {
      preset: preset.name, qubits: String(preset.circuit.numQubits), optimizationLevel: String(level),
      basis: tr.basis.join(","), opsBefore: String(tr.before.ops), opsAfter: String(tr.after.ops),
      depthBefore: String(tr.before.depth), depthAfter: String(tr.after.depth), fidelity: fidelity.toFixed(10),
      backend: result.backend === "sampler" ? "Local seeded sampler" : "Local exact statevector",
      shots: result.backend === "sampler" ? String(result.shots) : "exact", seed: String(result.seed),
      hardware: false,
    };
    const summary = `Qiskit Workflow Lab — ${preset.name}. Transpiled to {${tr.basis.join(", ")}} (level ${level}): ${tr.before.ops}→${tr.after.ops} gates, depth ${tr.before.depth}→${tr.after.depth}, fidelity ${fidelity.toFixed(6)}. ` +
      `Backend: ${fields['backend']}. Results: ${top.map((r) => `${r.bits}=${result.backend === "sampler" ? r.count : r.p.toFixed(4)}`).join(", ")}. Browser simulation — not IBM hardware.`;
    saveExperimentSnapshot({ module: "Qiskit Workflow Lab", route: "/lab/qiskit", fields, summary });
    setSaved(true);
  }

  return (
    <div className="space-y-6">
      <ol className="grid grid-cols-3 gap-2 sm:grid-cols-6" aria-label="Workflow progress">
        {STEPS.map((s, i) => {
          const state = i < stepIndex ? "done" : i === stepIndex ? "current" : "todo";
          return (
            <li key={s} aria-current={state === "current" ? "step" : undefined}
              className={`rounded-sm border px-3 py-2 font-mono text-[11px] uppercase tracking-wider ${state === "done" ? "border-primary/60 bg-primary/10 text-primary" : state === "current" ? "border-accent text-accent" : "border-border text-muted-foreground"}`}>
              <span className="mr-1 opacity-70">{i + 1}.</span>{s}{state === "done" && <Check className="ml-1 inline size-3" aria-hidden="true" />}
            </li>
          );
        })}
      </ol>

      <div className="grid gap-6 lg:grid-cols-2 [&>*]:min-w-0">
        <Panel title="1 · Circuit">
          <label className="block text-sm">
            <span className="text-muted-foreground">Preset circuit</span>
            <select name="preset" value={presetId} onChange={(e) => { setPresetId(e.target.value); resetFrom(1); }}
              className="mt-1 w-full rounded-sm border border-border bg-background px-3 py-2 text-sm">
              {PRESETS.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </label>
          <p className="mt-2 text-xs leading-6 text-muted-foreground">{preset.description}</p>
          <div className="mt-3 overflow-x-auto"><CircuitDiagram circuit={preset.circuit} selected={null} onSelect={() => {}} /></div>
        </Panel>

        <Panel title="2 · Transpile" aside={<span className="font-mono text-[11px] text-muted-foreground">basis: {tr.basis.join(" · ")}</span>}>
          <fieldset className="flex flex-wrap gap-2" aria-label="Optimization level">
            {([0, 1] as const).map((l) => (
              <Button key={l} type="button" size="sm" variant={level === l ? "default" : "outline"} aria-pressed={level === l}
                onClick={() => { setLevel(l); resetFrom(1); }}>optimization_level={l}</Button>
            ))}
          </fieldset>
          <dl className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
            {[["Gates", tr.before.ops, tr.after.ops], ["Depth", tr.before.depth, tr.after.depth], ["2-qubit", tr.before.twoQubit, tr.after.twoQubit]].map(([k, a, b]) => (
              <div key={k as string} className="rounded-sm border border-border p-2"><dt className="text-muted-foreground">{k}</dt><dd className="mt-1 font-mono text-primary">{a} → {b}</dd></div>
            ))}
          </dl>
          <p className="mt-3 text-xs text-muted-foreground">Equivalence check (state fidelity, up to global phase): <span className="font-mono text-accent">{fidelity.toFixed(10)}</span></p>
          {transpiled && <div className="mt-3 overflow-x-auto"><CircuitDiagram circuit={tr.circuit} selected={null} onSelect={() => {}} /></div>}
          {transpiled && <p className="mt-2 font-mono text-[11px] text-muted-foreground break-words">{tr.circuit.ops.map((o) => `${basisLabel(o)}${o.gate === "RZ" ? `(${o.theta!.toFixed(3)})` : ""}[${o.qubits.join(",")}]`).join(" ")}</p>}
          <Button className="mt-4" type="button" onClick={() => { setTranspiled(true); resetFrom(2); }}>{transpiled ? "Re-transpile" : "Transpile circuit"}</Button>
        </Panel>

        <Panel title="3 · Backend / simulator">
          <div role="radiogroup" aria-label="Backend" className="grid gap-2">
            {([["statevector", "Local exact statevector", "Exact probabilities (like Qiskit's Statevector)."], ["sampler", "Local seeded sampler", "Shot-based counts with a reproducible seed (like a Sampler primitive)."]] as const).map(([id, name, desc]) => (
              <button key={id} type="button" role="radio" aria-checked={backend === id} disabled={!transpiled}
                onClick={() => { setBackend(id); setResult(null); setSaved(false); }}
                className={`rounded-sm border p-3 text-left text-sm disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${backend === id ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"}`}>
                <span className="font-medium">{name}</span><span className="mt-1 block text-xs text-muted-foreground">{desc}</span>
              </button>
            ))}
            <div className="rounded-sm border border-dashed border-border p-3 text-xs text-muted-foreground">IBM Quantum hardware — not connected. See the IBM Quantum Integration lab for the secure setup requirements.</div>
          </div>
          {!transpiled && <p className="mt-3 text-xs text-muted-foreground">Transpile the circuit first.</p>}
        </Panel>

        <Panel title="4 · Run">
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm"><span className="text-muted-foreground">Shots</span>
              <input name="shots" type="number" min={1} max={100000} value={shots} disabled={backend !== "sampler"} onChange={(e) => { setShots(Math.floor(Number(e.target.value))); setResult(null); }}
                className="mt-1 w-full rounded-sm border border-border bg-background px-3 py-2 font-mono text-sm disabled:opacity-50" /></label>
            <label className="text-sm"><span className="text-muted-foreground">Seed</span>
              <input name="seed" type="number" min={0} value={seed} disabled={backend !== "sampler"} onChange={(e) => { setSeed(Math.floor(Number(e.target.value))); setResult(null); }}
                className="mt-1 w-full rounded-sm border border-border bg-background px-3 py-2 font-mono text-sm disabled:opacity-50" /></label>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="button" onClick={run} disabled={!backend}><Play className="size-4" aria-hidden="true" />Run circuit</Button>
            <Button type="button" variant="outline" onClick={() => resetFrom(1)}><RotateCcw className="size-4" aria-hidden="true" />Reset workflow</Button>
          </div>
          {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
        </Panel>
      </div>

      <Panel title="5 · Result" aside={result && <span className="font-mono text-[11px] text-muted-foreground">{result.backend === "sampler" ? `${result.shots} shots · seed ${result.seed}` : "exact"}</span>}>
        {result ? (
          <>
            <Histogram
              bars={result.rows.map((r) => (result.backend === "sampler" ? { label: r.bits, value: r.count / result.shots, expected: r.p } : { label: r.bits, value: r.p }))}
              valueFormat={(v) => v.toFixed(3)} ariaLabel="Measurement results by bitstring" />
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left font-mono text-xs">
                <thead className="text-muted-foreground"><tr><th className="py-1">Bitstring</th><th>Exact p</th>{result.backend === "sampler" && <th>Counts</th>}</tr></thead>
                <tbody>{result.rows.filter((r) => r.p > 1e-12 || r.count > 0).map((r) => <tr key={r.bits} className="border-t border-border"><td className="py-1">{r.bits}</td><td>{r.p.toFixed(4)}</td>{result.backend === "sampler" && <td>{r.count}</td>}</tr>)}</tbody>
              </table>
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">Bitstrings are little-endian (Qiskit order: rightmost bit = lowest measured qubit).</p>
          </>
        ) : <p className="text-sm text-muted-foreground">No results yet — complete the steps above and run the circuit.</p>}
      </Panel>

      <Panel title="6 · Save experiment">
        <p className="text-sm text-muted-foreground">Stores this run locally in your browser's Experiment History, where Research Snapshot can use it. Nothing is uploaded.</p>
        <Button className="mt-3" type="button" variant="outline" disabled={!result} onClick={save}>
          {saved ? <Check className="size-4" aria-hidden="true" /> : <Save className="size-4" aria-hidden="true" />}{saved ? "Saved to Experiment History" : "Save experiment"}
        </Button>
      </Panel>

      <Panel title="OpenQASM 3 (transpiled)">
        <pre className="max-h-64 overflow-auto rounded-sm bg-background p-3 font-mono text-[11px] leading-5 text-muted-foreground">{qasm}</pre>
      </Panel>

      <aside className="rounded-md border border-accent/40 bg-accent/5 p-4 text-xs leading-6 text-muted-foreground">
        <strong className="text-foreground">Limitations.</strong> Ideal noiseless classical statevector simulation running in your browser — not an IBM Quantum hardware run, and no hardware is connected.
        The transpiler is an educational model: it rewrites gates into the rz/sx/x/cz basis with simple gate-cancellation, but does not do device layout, qubit routing (SWAPs) or noise-aware scheduling as Qiskit does.
        Results make no claim of quantum advantage.
      </aside>
    </div>
  );
}
