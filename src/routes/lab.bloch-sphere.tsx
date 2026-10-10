import { createFileRoute } from "@tanstack/react-router";

import { InteractiveQuantumLab } from "@/components/lab/interactive-quantum-lab";
import { LabShell } from "@/components/lab/lab-shell";

const TITLE = "Interactive Quantum Lab — 3D Bloch Sphere";
const DESC =
  "Rotate a 3D Bloch sphere, drive a qubit with Rz(α)·Rx(β)·Rz(γ) and read the exact complex amplitudes, P(0)/P(1) and equivalent Qiskit code. Statevector simulation, not hardware.";

export const Route = createFileRoute("/lab/bloch-sphere")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <LabShell crumb="Interactive Quantum Lab">
      <div className="mb-8 max-w-3xl">
        <span className="font-mono text-xs text-primary">LAB / 10</span>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Interactive Quantum Lab</h1>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          A single qubit on a 3D Bloch sphere. Pick a starting state, set the three angles of the ZXZ sequence
          Rz(α) → Rx(β) → Rz(γ), and watch the state move gate by gate. Every value is computed exactly from the
          statevector.
        </p>
      </div>
      <InteractiveQuantumLab />
    </LabShell>
  );
}
