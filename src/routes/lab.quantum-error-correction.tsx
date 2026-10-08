import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CheckCircle2, RotateCcw, ShieldCheck, Zap } from "lucide-react";

import { LabShell } from "@/components/lab/lab-shell";

export const Route = createFileRoute("/lab/quantum-error-correction")({
  head: () => ({
    meta: [
      { title: "Quantum Error Correction Lab — Quantum AI Lab" },
      {
        name: "description",
        content:
          "Interactive educational quantum error-correction lab for bit-flip and phase-flip error detection, syndrome interpretation and recovery logic.",
      },
    ],
  }),
  component: QuantumErrorCorrectionLab,
});

type ErrorType = "none" | "bit" | "phase";

type Result = {
  syndrome: string;
  detected: string;
  correction: string;
  recovered: string;
  success: boolean;
};

function QuantumErrorCorrectionLab() {
  const [errorType, setErrorType] = useState<ErrorType>("bit");
  const [qubit, setQubit] = useState(2);
  const [result, setResult] = useState<Result | null>(null);

  const encoded = useMemo(() => "|000⟩ + |111⟩", []);

  function runCorrection() {
    if (errorType === "none") {
      setResult({
        syndrome: "00",
        detected: "No error detected",
        correction: "No correction required",
        recovered: encoded,
        success: true,
      });
      return;
    }

    if (errorType === "bit") {
      const syndromeMap: Record<number, string> = { 1: "11", 2: "10", 3: "01" };
      setResult({
        syndrome: syndromeMap[qubit] ?? "--",
        detected: `Bit-flip error on qubit ${qubit}`,
        correction: `Apply X gate to qubit ${qubit}`,
        recovered: encoded,
        success: true,
      });
      return;
    }

    const syndromeMap: Record<number, string> = { 1: "11", 2: "10", 3: "01" };
    setResult({
      syndrome: syndromeMap[qubit] ?? "--",
      detected: `Phase-flip error on qubit ${qubit}`,
      correction: `Switch to X basis, identify syndrome, apply Z to qubit ${qubit}, return to computational basis`,
      recovered: encoded,
      success: true,
    });
  }

  return (
    <LabShell crumb="Quantum Error Correction">
      <div className="mb-8 max-w-3xl">
        <span className="font-mono text-xs text-primary">LAB / 08</span>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
          Quantum Error Correction Lab
        </h1>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          Interactive educational simulation of a three-qubit repetition-code workflow. Choose an
          error, inject it into an encoded logical state, inspect the syndrome, and recover the
          state.
        </p>
      </div>

      <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-md border border-border bg-card p-6">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <ShieldCheck className="size-5 text-primary" />
            Experiment setup
          </div>

          <div className="mt-6">
            <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              Encoded logical state
            </div>
            <div className="mt-2 rounded-md border border-border bg-surface p-4 font-mono text-lg text-foreground">
              {encoded}
            </div>
          </div>

          <label className="mt-6 block text-sm font-medium">Injected error</label>
          <select
            value={errorType}
            onChange={(e) => setErrorType(e.target.value as ErrorType)}
            className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
          >
            <option value="none">No error</option>
            <option value="bit">Bit flip (X)</option>
            <option value="phase">Phase flip (Z)</option>
          </select>

          <label className="mt-5 block text-sm font-medium">Affected physical qubit</label>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {[1, 2, 3].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setQubit(n)}
                className={`rounded-md border px-3 py-3 font-mono text-sm transition ${qubit === n ? "border-primary bg-primary/10 text-primary" : "border-border bg-surface text-muted-foreground hover:border-primary/50"}`}
              >
                Qubit {n}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={runCorrection}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-md border border-primary/40 bg-primary/10 px-4 py-3 text-sm font-semibold text-primary transition hover:bg-primary/15"
          >
            <Zap className="size-4" /> Run correction
          </button>

          <button
            type="button"
            onClick={() => setResult(null)}
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-md border border-border bg-surface px-4 py-3 text-sm text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="size-4" /> Reset result
          </button>
        </div>

        <div className="rounded-md border border-border bg-card p-6">
          <div className="font-mono text-xs uppercase tracking-[0.16em] text-primary">
            Correction result
          </div>
          {result ? (
            <div className="mt-5 space-y-3">
              {[
                ["Syndrome", result.syndrome],
                ["Detected", result.detected],
                ["Correction", result.correction],
                ["Recovered state", result.recovered],
              ].map(([label, value]) => (
                <div key={label} className="rounded-md border border-border bg-surface p-4">
                  <div className="font-mono text-[10px] uppercase text-muted-foreground">
                    {label}
                  </div>
                  <div className="mt-2 text-sm leading-6 text-foreground">{value}</div>
                </div>
              ))}
              <div className="flex items-center gap-2 rounded-md border border-emerald/30 bg-emerald/5 p-4 text-emerald">
                <CheckCircle2 className="size-5" /> Logical state successfully recovered in this
                idealized simulation.
              </div>
            </div>
          ) : (
            <div className="mt-6 rounded-md border border-dashed border-border-strong bg-surface/40 p-8 text-center text-sm text-muted-foreground">
              Choose an error and press <strong>Run correction</strong> to generate a syndrome and
              recovery result.
            </div>
          )}

          <div className="mt-6 rounded-md border border-border bg-background/40 p-4 text-xs leading-6 text-muted-foreground">
            Educational classical simulation of repetition-code logic. This page does not claim
            fault-tolerant quantum hardware execution.
          </div>
        </div>
      </section>
    </LabShell>
  );
}
