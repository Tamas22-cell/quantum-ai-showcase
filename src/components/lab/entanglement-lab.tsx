import { useMemo, useState, useTransition } from "react";
import { Dices, Play, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Histogram, Panel, ProbabilityRow } from "./charts";
import { CircuitDiagram } from "./circuit-diagram";
import {
  BELL_STATES,
  OPTIMAL_CHSH,
  TSIRELSON,
  bellCircuit,
  correlator,
  createRng,
  jointProbabilities,
  runChsh,
  sampleCounts,
  validateShots,
  type Basis,
  type BellState,
  type ChshResult,
} from "@/lib/quantum";

const BASES: Basis[] = ["X", "Y", "Z"];
// Display order q1 q0 = B A (little-endian), mapped to basis indices.
const OUTCOMES = [
  { label: "00", i: 0 },
  { label: "01", i: 1 },
  { label: "10", i: 2 },
  { label: "11", i: 3 },
];
const deg = (r: number) => Math.round(((r * 180) / Math.PI) * 1000) / 1000;
const rad = (d: number) => (d * Math.PI) / 180;
const DEFAULT_ANG = {
  a: deg(OPTIMAL_CHSH.a),
  a2: deg(OPTIMAL_CHSH.a2),
  b: deg(OPTIMAL_CHSH.b),
  b2: deg(OPTIMAL_CHSH.b2),
};

const inputCls =
  "h-9 w-full rounded-md border border-border bg-background px-2 font-mono text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function Seg<T extends string>({
  label,
  value,
  options,
  onChange,
  render,
}: {
  label: string;
  value: T;
  options: T[];
  onChange: (v: T) => void;
  render?: (v: T) => string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((o) => (
        <Button
          key={o}
          size="sm"
          role="radio"
          aria-checked={value === o}
          variant={value === o ? "signal" : "signalOutline"}
          onClick={() => onChange(o)}
        >
          {render ? render(o) : o}
        </Button>
      ))}
    </div>
  );
}

export function EntanglementLab() {
  const [bell, setBell] = useState<BellState>("phi+");
  const [ba, setBa] = useState<Basis>("Z");
  const [bb, setBb] = useState<Basis>("Z");
  const [shots, setShots] = useState(1000);
  const [seed, setSeed] = useState(42);
  const [counts, setCounts] = useState<Uint32Array | null>(null);
  const [ang, setAng] = useState(DEFAULT_ANG);
  const [chsh, setChsh] = useState<ChshResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const circuit = useMemo(() => bellCircuit(bell, ba, bb), [bell, ba, bb]);
  const probs = useMemo(() => jointProbabilities(circuit), [circuit]);
  const exactE = correlator(probs);
  const table = useMemo(
    () =>
      BASES.map((a) => BASES.map((b) => correlator(jointProbabilities(bellCircuit(bell, a, b))))),
    [bell],
  );

  const invalidate = () => {
    setCounts(null);
    setChsh(null);
    setError(null);
  };

  const run = () => {
    const shotErr = validateShots(shots);
    const angVals = [ang.a, ang.a2, ang.b, ang.b2];
    if (shotErr) return setError(shotErr);
    if (!Number.isInteger(seed)) return setError("Seed must be an integer");
    if (angVals.some((v) => !Number.isFinite(v)))
      return setError("All CHSH angles must be finite numbers (degrees)");
    setError(null);
    start(() => {
      try {
        setCounts(sampleCounts(probs, shots, createRng(seed)));
        setChsh(
          runChsh(
            bell,
            { a: rad(ang.a), a2: rad(ang.a2), b: rad(ang.b), b2: rad(ang.b2) },
            shots,
            seed,
          ),
        );
      } catch (e) {
        setError(e instanceof Error ? e.message : "Simulation failed");
      }
    });
  };

  const reset = () => {
    setBell("phi+");
    setBa("Z");
    setBb("Z");
    setShots(1000);
    setSeed(42);
    setAng(DEFAULT_ANG);
    invalidate();
  };
  const sampledE = counts ? correlator(counts) : null;

  return (
    <div className="grid gap-5">
      <p
        role="note"
        className="rounded-md border border-amber/40 bg-amber/10 px-4 py-2 font-mono text-xs text-amber"
      >
        All results: ideal noiseless classical statevector simulation in your browser — not quantum
        hardware results.
      </p>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Panel title="1 · Prepare & measure">
          <div className="grid gap-4">
            <div>
              <span className="mb-2 block font-mono text-[10px] uppercase text-muted-foreground">
                Bell state
              </span>
              <Seg
                label="Bell state"
                value={bell}
                options={Object.keys(BELL_STATES) as BellState[]}
                render={(v) => BELL_STATES[v].label}
                onChange={(v) => {
                  setBell(v);
                  invalidate();
                }}
              />
              <p className="mt-2 font-mono text-sm text-foreground">
                |{BELL_STATES[bell].label}⟩ = {BELL_STATES[bell].ket}
              </p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <span className="mb-2 block font-mono text-[10px] uppercase text-muted-foreground">
                  Alice basis (q0)
                </span>
                <Seg
                  label="Alice measurement basis"
                  value={ba}
                  options={BASES}
                  onChange={(v) => {
                    setBa(v);
                    invalidate();
                  }}
                />
              </div>
              <div>
                <span className="mb-2 block font-mono text-[10px] uppercase text-muted-foreground">
                  Bob basis (q1)
                </span>
                <Seg
                  label="Bob measurement basis"
                  value={bb}
                  options={BASES}
                  onChange={(v) => {
                    setBb(v);
                    invalidate();
                  }}
                />
              </div>
            </div>
            <CircuitDiagram circuit={circuit} selected={null} onSelect={() => {}} />
            <p className="text-xs leading-6 text-muted-foreground">
              X/H flips prepare the variant, H + CNOT entangles, then basis rotations (X: H · Y:
              S†H) map the chosen basis onto Z before measurement. Ψ⁻ is prepared up to an
              unobservable global phase.
            </p>
          </div>
        </Panel>

        <Panel
          title="2 · Joint probabilities"
          aside={
            <span className="font-mono text-[10px] text-muted-foreground">
              bitstring = q1 q0 (Bob Alice)
            </span>
          }
        >
          <div className="grid gap-3">
            {OUTCOMES.map((o) => (
              <ProbabilityRow key={o.label} label={`P(${o.label})`} p={probs[o.i]!} />
            ))}
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3 font-mono text-sm">
            <div className="rounded-md border border-border bg-surface p-3">
              <div className="text-[10px] uppercase text-muted-foreground">
                Exact E({ba}
                {bb})
              </div>
              <div className="mt-1 text-lg text-primary">{exactE.toFixed(4)}</div>
            </div>
            <div className="rounded-md border border-border bg-surface p-3">
              <div className="text-[10px] uppercase text-muted-foreground">Sampled E</div>
              <div className="mt-1 text-lg text-emerald">
                {sampledE === null ? "—" : sampledE.toFixed(4)}
              </div>
            </div>
          </div>
        </Panel>
      </div>

      <Panel
        title="3 · Run experiment"
        aside={
          <span className="font-mono text-[10px] text-muted-foreground">seeded mulberry32</span>
        }
      >
        <div className="flex flex-wrap items-end gap-3">
          <label className="w-32 font-mono text-[10px] uppercase text-muted-foreground">
            Shots
            <input
              type="number"
              min={1}
              max={100000}
              value={shots}
              onChange={(e) => {
                setShots(Number(e.target.value));
                invalidate();
              }}
              className={inputCls}
            />
          </label>
          <label className="w-32 font-mono text-[10px] uppercase text-muted-foreground">
            Seed
            <input
              type="number"
              value={seed}
              onChange={(e) => {
                setSeed(Number(e.target.value));
                invalidate();
              }}
              className={inputCls}
            />
          </label>
          <Button
            variant="signalOutline"
            size="icon"
            aria-label="New random seed"
            onClick={() => {
              setSeed(Math.floor(Math.random() * 1e6));
              invalidate();
            }}
          >
            <Dices className="size-4" />
          </Button>
          <Button variant="signal" onClick={run} disabled={pending}>
            <Play className="size-4" aria-hidden="true" />
            {pending ? "Running…" : "Run Experiment"}
          </Button>
          <Button variant="signalOutline" onClick={reset}>
            <RotateCcw className="size-4" aria-hidden="true" />
            Reset
          </Button>
        </div>
        {error ? (
          <p role="alert" className="mt-3 font-mono text-xs text-rose">
            {error}
          </p>
        ) : null}
        <div className="mt-5" aria-live="polite">
          {counts ? (
            <Histogram
              bars={OUTCOMES.map((o) => ({
                label: o.label,
                value: counts[o.i]! / shots,
                expected: probs[o.i]!,
              }))}
              valueFormat={(v) => `${(v * 100).toFixed(2)}%`}
              ariaLabel={`Sampled frequencies over ${shots} shots with exact probabilities overlaid`}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              Press Run Experiment to sample {Number.isFinite(shots) ? shots : "?"} shots and run
              the CHSH test. Bars = sampled frequency; emerald tick = exact probability.
            </p>
          )}
        </div>
      </Panel>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Panel title="4 · Correlation matrix E(A,B)">
          <table className="w-full font-mono text-sm">
            <caption className="sr-only">
              Exact correlators for {BELL_STATES[bell].label}; rows Alice basis, columns Bob basis
            </caption>
            <thead>
              <tr>
                <th className="p-2 text-left text-[10px] text-muted-foreground">A \ B</th>
                {BASES.map((b) => (
                  <th key={b} className="p-2 text-right text-primary">
                    {b}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {BASES.map((a, i) => (
                <tr key={a} className="border-t border-border">
                  <th className="p-2 text-left text-primary">{a}</th>
                  {BASES.map((b, j) => (
                    <td
                      key={b}
                      className={`p-2 text-right ${a === ba && b === bb ? "text-emerald" : ""}`}
                    >
                      {(Math.abs(table[i]![j]!) < 1e-12 ? 0 : table[i]![j]!).toFixed(3)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-4 text-xs leading-6 text-muted-foreground">
            E = P(same) − P(different), with outcomes mapped to ±1. Perfect correlation in one basis
            alone does <em>not</em> prove entanglement: a classical mixture of |00⟩ and |11⟩ also
            gives E(ZZ) = 1. The signature of entanglement is strong correlation in several
            complementary bases at once (e.g. ZZ and XX), which no separable state can reproduce —
            quantified by the CHSH test.
          </p>
        </Panel>

        <Panel title="5 · CHSH experiment">
          <div className="grid grid-cols-2 gap-3">
            {(
              [
                ["a", "Alice a"],
                ["a2", "Alice a′"],
                ["b", "Bob b"],
                ["b2", "Bob b′"],
              ] as const
            ).map(([k, l]) => (
              <label key={k} className="font-mono text-[10px] uppercase text-muted-foreground">
                {l} (deg)
                <input
                  type="number"
                  step="any"
                  value={Number.isFinite(ang[k]) ? ang[k] : ""}
                  onChange={(e) => {
                    setAng({ ...ang, [k]: e.target.value === "" ? NaN : Number(e.target.value) });
                    setChsh(null);
                  }}
                  className={inputCls}
                />
              </label>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Angles in the X–Z plane: observable cos θ·Z + sin θ·X. Defaults are the optimal settings
            (0°, 90°, 45°, −45°).
          </p>
          {chsh ? (
            <div className="mt-4 font-mono text-sm">
              <table className="w-full">
                <thead>
                  <tr className="text-[10px] text-muted-foreground">
                    <th className="p-1 text-left">Term</th>
                    <th className="p-1 text-right">Exact</th>
                    <th className="p-1 text-right">Sampled ({chsh.shotsPerSetting}/setting)</th>
                  </tr>
                </thead>
                <tbody>
                  {chsh.terms.map((t) => (
                    <tr key={t.label} className="border-t border-border">
                      <td className="p-1">
                        {t.sign < 0 ? "−" : "+"} {t.label}
                      </td>
                      <td className="p-1 text-right">{t.exact.toFixed(4)}</td>
                      <td className="p-1 text-right">{t.sampled?.toFixed(4)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div className="rounded-md border border-border bg-surface p-3">
                  <div className="text-[10px] uppercase text-muted-foreground">Exact S</div>
                  <div className="mt-1 text-lg text-primary">{chsh.exactS.toFixed(4)}</div>
                </div>
                <div className="rounded-md border border-border bg-surface p-3">
                  <div className="text-[10px] uppercase text-muted-foreground">Sampled S</div>
                  <div className="mt-1 text-lg text-emerald">{chsh.sampledS!.toFixed(4)}</div>
                </div>
              </div>
              <p className="mt-3 text-xs text-foreground">
                {Math.abs(chsh.exactS) > 2 + 1e-9
                  ? `|S| exceeds the classical bound 2 — these settings violate the CHSH inequality (in ideal simulation).`
                  : `|S| ≤ 2 — these settings do not violate the CHSH inequality.`}
              </p>
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">Run Experiment to compute S.</p>
          )}
          <div className="mt-4 rounded-md border border-border bg-surface p-3 text-xs leading-6 text-muted-foreground">
            <strong className="text-foreground">S = E(a,b) + E(a,b′) + E(a′,b) − E(a′,b′).</strong>{" "}
            Any local-hidden-variable (classical) model obeys |S| ≤ 2. Quantum mechanics allows up
            to Tsirelson's bound 2√2 ≈ {TSIRELSON.toFixed(4)}, reached by Φ⁺ at the default angles.
            Sampled S fluctuates by roughly ±1/√shots per term, so with few shots it can land
            slightly above 2√2 — that is sampling noise, not a physical violation. A real Bell test
            also needs spacelike separation, efficient detectors and random setting choices — none
            of which a simulation provides.
          </div>
        </Panel>
      </div>
    </div>
  );
}
