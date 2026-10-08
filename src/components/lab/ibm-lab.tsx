import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Copy, Download, Play, ShieldCheck, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { parseProposal } from "@/lib/assistant/proposal";
import { analyzeCircuit, toQasm3 } from "@/lib/ibm/qasm";
import { buildJobRequest, IBM_LIMITS, readIbmTransfer } from "@/lib/ibm/job";
import { getIbmStatus, submitIbmJob, getIbmJob, type IbmStatus } from "@/lib/ibm.functions";
import {
  EXAMPLE_CIRCUITS,
  createRng,
  marginal,
  measuredQubits,
  probabilities,
  sampleCounts,
  simulate,
  toBitstring,
  type Circuit,
} from "@/lib/quantum";
import { CircuitDiagram } from "./circuit-diagram";
import { Histogram, Panel } from "./charts";

const inputCls =
  "h-9 w-full rounded-md border border-input bg-background px-2 font-mono text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const SIM_LABEL =
  "Ideal noiseless classical statevector simulation — not quantum hardware. No claim of quantum advantage.";

export function IbmLab() {
  const [circuit, setCircuit] = useState<Circuit>(EXAMPLE_CIRCUITS[0]!.circuit);
  const [source, setSource] = useState("Example: Bell state");
  const [json, setJson] = useState("");
  const [jsonErrors, setJsonErrors] = useState<string[]>([]);
  const [shots, setShots] = useState("1024");
  const [seed, setSeed] = useState("2026");
  const [sim, setSim] = useState<{
    key: string;
    counts: Uint32Array;
    exact: Float64Array;
    width: number;
    shots: number;
    seed: number;
  } | null>(null);
  const [simError, setSimError] = useState<string | null>(null);
  const [status, setStatus] = useState<IbmStatus | null>(null);
  const [backend, setBackend] = useState("ibm_brisbane");
  const [hwShots, setHwShots] = useState("1024");
  const [confirm, setConfirm] = useState(false);
  const [hwMsg, setHwMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchStatus = useServerFn(getIbmStatus);
  const submit = useServerFn(submitIbmJob);
  const poll = useServerFn(getIbmJob);

  useEffect(() => {
    const incoming = readIbmTransfer(window.sessionStorage);
    if (incoming) {
      setCircuit(incoming);
      setSource("Circuit Builder");
    }
    fetchStatus()
      .then(setStatus)
      .catch(() =>
        setStatus({
          tokenConfigured: false,
          serviceConfigured: false,
          missing: ["Status check failed"],
        }),
      );
  }, [fetchStatus]);

  const validation = useMemo(() => parseProposal(circuit), [circuit]);
  const analysis = useMemo(
    () => (validation.ok ? analyzeCircuit(circuit) : null),
    [circuit, validation],
  );
  const qasm = useMemo(() => (validation.ok ? toQasm3(circuit) : ""), [circuit, validation]);
  const key = JSON.stringify(circuit);
  const liveSim = sim && sim.key === key ? sim : null;
  const configured = !!status && status.missing.length === 0;

  const load = (c: Circuit, label: string) => {
    setCircuit(c);
    setSource(label);
    setSim(null);
    setHwMsg(null);
  };

  const loadJson = () => {
    const r = parseProposal(json);
    if (!r.ok) return setJsonErrors(r.errors);
    setJsonErrors([]);
    load(r.circuit, "Pasted JSON");
  };

  const runSim = () => {
    setSimError(null);
    const s = Number(shots),
      sd = Number(seed);
    if (!Number.isInteger(s) || s < 1 || s > 100_000)
      return setSimError("Shots must be an integer from 1 to 100000.");
    if (!Number.isInteger(sd) || sd < 0) return setSimError("Seed must be a non-negative integer.");
    if (!validation.ok) return setSimError("Fix validation errors first.");
    const mq = measuredQubits(circuit);
    const exact = marginal(probabilities(simulate(circuit)), mq);
    setSim({
      key,
      counts: sampleCounts(exact, s, createRng(sd)),
      exact,
      width: mq.length,
      shots: s,
      seed: sd,
    });
  };

  const submitHw = async () => {
    setHwMsg(null);
    const req = buildJobRequest({ circuit, backend, shots: Number(hwShots) });
    if (!req.ok) return setHwMsg(req.errors.join(" "));
    if (!confirm) return setHwMsg("Confirm hardware submission first.");
    const r = await submit({
      data: { circuit, backend, shots: Number(hwShots), confirmHardware: true },
    });
    if (!r.ok) return setHwMsg(r.error + (r.missing ? ` Missing: ${r.missing.join(", ")}.` : ""));
    setHwMsg(`Job ${r.jobId} submitted (${r.status}). Results will be labelled as real hardware.`);
    const st = await poll({ data: { jobId: r.jobId } });
    if (st.ok) setHwMsg(`Job ${r.jobId}: ${st.status}`);
  };

  const download = () => {
    const url = URL.createObjectURL(new Blob([qasm], { type: "text/plain" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "circuit.qasm";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="grid gap-5">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Panel
          title="Circuit source"
          aside={
            <span className="font-mono text-[10px] text-muted-foreground">Loaded: {source}</span>
          }
        >
          <div className="mb-4 flex flex-wrap gap-2">
            <Button size="sm" variant="signalOutline" asChild>
              <Link to="/lab/circuit-builder">Open Circuit Builder</Link>
            </Button>
            {EXAMPLE_CIRCUITS.map((e) => (
              <Button
                key={e.id}
                size="sm"
                variant="signalOutline"
                onClick={() => load(e.circuit, `Example: ${e.name}`)}
              >
                {e.name}
              </Button>
            ))}
          </div>
          <p className="mb-3 text-xs text-muted-foreground">
            In the Circuit Builder, use “Send to IBM prep” to hand the current circuit over
            (re-validated here).
          </p>
          <CircuitDiagram circuit={circuit} selected={null} onSelect={() => {}} />
          <details className="mt-4">
            <summary className="cursor-pointer font-mono text-xs text-primary">
              Paste circuit JSON
            </summary>
            <textarea
              aria-label="Circuit JSON"
              value={json}
              onChange={(e) => setJson(e.target.value)}
              rows={5}
              placeholder='{"numQubits":2,"ops":[{"gate":"H","qubits":[0]},{"gate":"CNOT","qubits":[0,1]}]}'
              className="mt-2 w-full rounded-md border border-input bg-background p-2 font-mono text-xs"
            />
            <Button size="sm" className="mt-2" onClick={loadJson}>
              Validate & load
            </Button>
            {jsonErrors.length ? (
              <ul className="mt-2 list-disc pl-5 text-xs text-destructive">
                {jsonErrors.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            ) : null}
          </details>
        </Panel>

        <Panel title="Pre-submission validation">
          {validation.ok && analysis ? (
            <div className="grid gap-3 text-sm">
              <p className="flex items-center gap-2 text-emerald">
                <ShieldCheck className="size-4" aria-hidden="true" />
                Circuit passed validation
              </p>
              <dl className="grid grid-cols-2 gap-2 font-mono text-xs">
                {[
                  ["Qubits", analysis.numQubits],
                  ["Gates", analysis.gateCount],
                  ["2-qubit gates", analysis.twoQubitGates],
                  ["Depth", analysis.depth],
                  ["Measure ops", analysis.measurementOps],
                  [
                    "Read-out",
                    analysis.implicitMeasurement
                      ? "all (implicit)"
                      : analysis.measuredQubits.map((q) => `q${q}`).join(" "),
                  ],
                ].map(([k, v]) => (
                  <div key={k as string} className="rounded border border-border p-2">
                    <dt className="text-muted-foreground">{k}</dt>
                    <dd className="text-foreground">{v}</dd>
                  </div>
                ))}
              </dl>
              <div>
                <p className="mb-1 font-mono text-[10px] uppercase text-muted-foreground">
                  Gate support (IBM Heron native basis: X, RZ, CZ, SX)
                </p>
                <ul className="grid gap-1 text-xs">
                  {analysis.breakdown.map((b) => (
                    <li key={b.gate} className="flex justify-between">
                      <span className="font-mono">
                        {b.gate} ×{b.count}
                      </span>
                      <span className={b.native ? "text-emerald" : "text-muted-foreground"}>
                        {b.native ? "native" : "supported · transpiled"}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-xs text-muted-foreground">
                  Unsupported gates are rejected before this point. Final depth on hardware grows
                  after transpilation and qubit routing.
                </p>
              </div>
            </div>
          ) : (
            <ul className="list-disc pl-5 text-xs text-destructive">
              {!validation.ok && validation.errors.map((e) => <li key={e}>{e}</li>)}
            </ul>
          )}
        </Panel>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel
          title="Ideal simulator run"
          aside={
            <span className="rounded border border-primary/40 px-2 py-0.5 font-mono text-[10px] text-primary">
              SIMULATOR
            </span>
          }
        >
          <p className="mb-3 text-xs text-muted-foreground">{SIM_LABEL}</p>
          <div className="mb-3 grid grid-cols-[1fr_1fr_auto] items-end gap-2">
            <label className="grid gap-1 font-mono text-[10px] uppercase text-muted-foreground">
              Shots
              <input
                className={inputCls}
                value={shots}
                onChange={(e) => setShots(e.target.value)}
                inputMode="numeric"
              />
            </label>
            <label className="grid gap-1 font-mono text-[10px] uppercase text-muted-foreground">
              Seed
              <input
                className={inputCls}
                value={seed}
                onChange={(e) => setSeed(e.target.value)}
                inputMode="numeric"
              />
            </label>
            <Button onClick={runSim} disabled={!validation.ok}>
              <Play aria-hidden="true" />
              Run
            </Button>
          </div>
          {simError ? <p className="mb-2 text-xs text-destructive">{simError}</p> : null}
          {liveSim ? (
            <>
              <Histogram
                ariaLabel="Simulated measurement counts"
                valueFormat={(v) => v.toFixed(0)}
                bars={Array.from(liveSim.counts, (c, i) => ({
                  label: toBitstring(i, liveSim.width),
                  value: c,
                  expected: liveSim.exact[i]! * liveSim.shots,
                })).filter((b) => b.value > 0 || (b.expected ?? 0) > 1e-9)}
              />
              <p className="mt-2 font-mono text-[10px] text-muted-foreground">
                {liveSim.shots} shots · seed {liveSim.seed} · bars = sampled, green ticks = exact
                expectation · bit order q(n-1)…q0 (Qiskit)
              </p>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">Run the simulator to see counts.</p>
          )}
        </Panel>

        <Panel
          title="OpenQASM 3 export"
          aside={
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="signalOutline"
                disabled={!qasm}
                onClick={() => {
                  void navigator.clipboard.writeText(qasm);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
              >
                <Copy aria-hidden="true" />
                {copied ? "Copied" : "Copy"}
              </Button>
              <Button size="sm" variant="signalOutline" disabled={!qasm} onClick={download}>
                <Download aria-hidden="true" />
                .qasm
              </Button>
            </div>
          }
        >
          <pre className="max-h-72 overflow-auto rounded border border-border bg-background p-3 font-mono text-xs text-foreground">
            {qasm || "// fix validation errors to export"}
          </pre>
          <p className="mt-2 text-xs text-muted-foreground">
            Load with <code className="font-mono">qiskit.qasm3.loads()</code> and run via Qiskit
            Runtime SamplerV2 on your own IBM account.
          </p>
        </Panel>
      </div>

      <Panel
        title="IBM Quantum hardware"
        aside={
          <span
            className={`rounded border px-2 py-0.5 font-mono text-[10px] ${configured ? "border-emerald/50 text-emerald" : "border-border text-muted-foreground"}`}
          >
            {status === null ? "CHECKING…" : configured ? "CONFIGURED" : "NOT CONFIGURED"}
          </span>
        }
      >
        {!configured ? (
          <div className="mb-4 rounded border border-border p-3 text-xs text-muted-foreground">
            <p className="mb-2 flex items-center gap-2 text-foreground">
              <TriangleAlert className="size-4 text-primary" aria-hidden="true" />
              Hardware execution is disabled. Nothing has been enabled or connected.
            </p>
            <p className="mb-1">Required before real jobs can run:</p>
            <ul className="list-disc pl-5">
              {(status?.missing ?? []).map((m) => (
                <li key={m} className="font-mono">
                  {m}
                </li>
              ))}
            </ul>
            <p className="mt-2">
              The Qiskit service must be a separately hosted Python app exposing{" "}
              <code className="font-mono">POST /jobs</code> and{" "}
              <code className="font-mono">GET /jobs/:id</code>. Tokens stay on the server and are
              never sent to the browser. IBM hardware usage may be billed or quota-limited on your
              IBM account.
            </p>
          </div>
        ) : null}
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <label className="grid gap-1 font-mono text-[10px] uppercase text-muted-foreground">
            Backend
            <input
              className={inputCls}
              value={backend}
              onChange={(e) => setBackend(e.target.value)}
            />
          </label>
          <label className="grid gap-1 font-mono text-[10px] uppercase text-muted-foreground">
            Shots (max {IBM_LIMITS.maxShots})
            <input
              className={inputCls}
              value={hwShots}
              onChange={(e) => setHwShots(e.target.value)}
              inputMode="numeric"
            />
          </label>
          <Button onClick={submitHw} disabled={!configured || !validation.ok || !confirm}>
            Submit to IBM
          </Button>
        </div>
        <label className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={confirm}
            onChange={(e) => setConfirm(e.target.checked)}
            disabled={!configured}
          />
          I understand this submits to real IBM hardware on my account (queue time, possible cost).
        </label>
        {hwMsg ? (
          <p className="mt-2 text-xs text-foreground" role="status">
            {hwMsg}
          </p>
        ) : null}
      </Panel>
    </div>
  );
}
