import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Activity, Gauge, RefreshCcw, Waves } from "lucide-react";

import { LabShell } from "@/components/lab/lab-shell";

export const Route = createFileRoute("/lab/quantum-noise-fidelity")({
  head: () => ({
    meta: [
      { title: "Quantum Noise & Fidelity Lab — Quantum AI Lab" },
      {
        name: "description",
        content:
          "Interactive educational quantum noise and fidelity model showing how circuit depth and noise strength affect survival probability and state fidelity.",
      },
    ],
  }),
  component: QuantumNoiseFidelityLab,
});

function QuantumNoiseFidelityLab() {
  const [noisePct, setNoisePct] = useState(1.5);
  const [depth, setDepth] = useState(20);
  const [measurementPct, setMeasurementPct] = useState(2);
  const [hasRun, setHasRun] = useState(false);

  const result = useMemo(() => {
    const p = Math.max(0, Math.min(0.95, noisePct / 100));
    const pm = Math.max(0, Math.min(0.95, measurementPct / 100));
    const gateSurvival = Math.pow(1 - p, depth);
    const measurementSurvival = 1 - pm;
    const fidelity = Math.max(0, Math.min(1, gateSurvival * measurementSurvival));
    const infidelity = 1 - fidelity;
    const expectedErrors = depth * p + pm;
    return { gateSurvival, measurementSurvival, fidelity, infidelity, expectedErrors };
  }, [noisePct, depth, measurementPct]);

  return (
    <LabShell crumb="Quantum Noise & Fidelity">
      <div className="mb-8 max-w-3xl">
        <span className="font-mono text-xs text-primary">LAB / 09</span>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
          Quantum Noise & Fidelity Lab
        </h1>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          Explore how gate noise, circuit depth and measurement error reduce the fidelity of an
          ideal quantum state. This is a transparent educational model, not a hardware calibration
          result.
        </p>
      </div>

      <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-md border border-border bg-card p-6">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Waves className="size-5 text-primary" />
            Noise model
          </div>

          <label className="mt-6 block text-sm font-medium">
            Gate noise per layer: {noisePct.toFixed(1)}%
          </label>
          <input
            type="range"
            min="0"
            max="10"
            step="0.1"
            value={noisePct}
            onChange={(e) => {
              setNoisePct(Number(e.target.value));
              setHasRun(false);
            }}
            className="mt-3 w-full"
          />

          <label className="mt-6 block text-sm font-medium">Circuit depth: {depth} layers</label>
          <input
            type="range"
            min="1"
            max="100"
            step="1"
            value={depth}
            onChange={(e) => {
              setDepth(Number(e.target.value));
              setHasRun(false);
            }}
            className="mt-3 w-full"
          />

          <label className="mt-6 block text-sm font-medium">
            Measurement error: {measurementPct.toFixed(1)}%
          </label>
          <input
            type="range"
            min="0"
            max="15"
            step="0.5"
            value={measurementPct}
            onChange={(e) => {
              setMeasurementPct(Number(e.target.value));
              setHasRun(false);
            }}
            className="mt-3 w-full"
          />

          <button
            type="button"
            onClick={() => setHasRun(true)}
            className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-md border border-primary/40 bg-primary/10 px-4 py-3 text-sm font-semibold text-primary transition hover:bg-primary/15"
          >
            <Activity className="size-4" /> Run fidelity estimate
          </button>

          <button
            type="button"
            onClick={() => {
              setNoisePct(1.5);
              setDepth(20);
              setMeasurementPct(2);
              setHasRun(false);
            }}
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-md border border-border bg-surface px-4 py-3 text-sm text-muted-foreground hover:text-foreground"
          >
            <RefreshCcw className="size-4" /> Reset
          </button>
        </div>

        <div className="rounded-md border border-border bg-card p-6">
          <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.16em] text-primary">
            <Gauge className="size-4" />
            Simulation result
          </div>

          {hasRun ? (
            <>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-md border border-border bg-surface p-4">
                  <div className="font-mono text-[10px] uppercase text-muted-foreground">
                    Estimated fidelity
                  </div>
                  <div className="mt-2 text-3xl font-semibold text-foreground">
                    {(result.fidelity * 100).toFixed(2)}%
                  </div>
                </div>
                <div className="rounded-md border border-border bg-surface p-4">
                  <div className="font-mono text-[10px] uppercase text-muted-foreground">
                    Infidelity
                  </div>
                  <div className="mt-2 text-3xl font-semibold text-foreground">
                    {(result.infidelity * 100).toFixed(2)}%
                  </div>
                </div>
                <div className="rounded-md border border-border bg-surface p-4">
                  <div className="font-mono text-[10px] uppercase text-muted-foreground">
                    Gate survival
                  </div>
                  <div className="mt-2 text-xl font-semibold text-foreground">
                    {(result.gateSurvival * 100).toFixed(2)}%
                  </div>
                </div>
                <div className="rounded-md border border-border bg-surface p-4">
                  <div className="font-mono text-[10px] uppercase text-muted-foreground">
                    Expected error load
                  </div>
                  <div className="mt-2 text-xl font-semibold text-foreground">
                    {result.expectedErrors.toFixed(3)}
                  </div>
                </div>
              </div>

              <div className="mt-5 rounded-md border border-border bg-background/40 p-4">
                <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                  <span>State quality</span>
                  <span>{(result.fidelity * 100).toFixed(2)}%</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-surface">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${result.fidelity * 100}%` }}
                  />
                </div>
              </div>

              <div className="mt-5 rounded-md border border-border bg-surface p-4 text-sm leading-6 text-foreground">
                At {noisePct.toFixed(1)}% gate noise over {depth} layers plus{" "}
                {measurementPct.toFixed(1)}% measurement error, this simplified model predicts a
                final fidelity of <strong>{(result.fidelity * 100).toFixed(2)}%</strong>.
              </div>
            </>
          ) : (
            <div className="mt-6 rounded-md border border-dashed border-border-strong bg-surface/40 p-8 text-center text-sm text-muted-foreground">
              Adjust the noise parameters and press <strong>Run fidelity estimate</strong> to
              calculate the result.
            </div>
          )}

          <div className="mt-6 rounded-md border border-border bg-background/40 p-4 text-xs leading-6 text-muted-foreground">
            Model used: fidelity = (1 − gate noise)<sup>depth</sup> × (1 − measurement error). This
            deliberately simple model is designed for transparent educational comparison.
          </div>
        </div>
      </section>
    </LabShell>
  );
}
