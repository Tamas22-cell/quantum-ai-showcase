export function PortfolioSimulationBenchmarks() {
  const rows = [
    {
      method: "Classical exact",
      engine: "Exhaustive baseline",
      noise: "None",
      shots: "n/a",
      objective: "Exact reference",
      runtime: "Measured in lab",
      status: "REFERENCE",
      statusClass: "border-emerald/40 text-emerald",
    },
    {
      method: "Ideal QAOA",
      engine: "Qiskit simulator",
      noise: "Noise-free",
      shots: "statevector",
      objective: "QAOA result",
      runtime: "Printed by script",
      status: "IDEAL",
      statusClass: "border-primary/40 text-primary",
    },
    {
      method: "Noisy QAOA",
      engine: "Aer noise model",
      noise: "Gate + readout",
      shots: "2048",
      objective: "Noisy QAOA result",
      runtime: "Printed by script",
      status: "NOISY",
      statusClass: "border-amber/40 text-amber",
    },
  ];

  return (
    <section className="mt-6 rounded-md border border-border bg-card p-5">
      <div className="font-mono text-xs uppercase tracking-[0.18em] text-primary">Quantum Simulation Benchmarks</div>
      <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">Classical vs Ideal QAOA vs Noisy QAOA</h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
        The portfolio QUBO is now evaluated through three comparable paths: an exact classical reference, a reproducible ideal QAOA simulator and a shot-based noisy QAOA simulator.
      </p>

      <div className="mt-5 overflow-x-auto rounded-sm border border-border">
        <table className="min-w-[760px] w-full border-collapse font-mono text-[11px]">
          <thead className="bg-surface text-muted-foreground">
            <tr>
              <th className="border-b border-border p-3 text-left">Method</th>
              <th className="border-b border-border p-3 text-left">Engine</th>
              <th className="border-b border-border p-3 text-left">Noise</th>
              <th className="border-b border-border p-3 text-left">Shots</th>
              <th className="border-b border-border p-3 text-left">Objective</th>
              <th className="border-b border-border p-3 text-left">Runtime</th>
              <th className="border-b border-border p-3 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.method} className="border-b border-border last:border-b-0">
                <td className="p-3 text-foreground">{row.method}</td>
                <td className="p-3 text-muted-foreground">{row.engine}</td>
                <td className="p-3 text-muted-foreground">{row.noise}</td>
                <td className="p-3 text-muted-foreground">{row.shots}</td>
                <td className="p-3 text-muted-foreground">{row.objective}</td>
                <td className="p-3 text-muted-foreground">{row.runtime}</td>
                <td className="p-3"><span className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-semibold ${row.statusClass}`}>{row.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-[11px] leading-5 text-muted-foreground">
        Benchmark values are not hard-coded: objective values, selected assets and runtimes come from the executable scripts or the interactive lab, so the comparison remains reproducible instead of presenting fabricated results.
      </p>

      <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
        <article className="rounded-sm border border-border bg-surface p-4">
          <span className="inline-flex rounded-full border border-emerald/40 px-2 py-1 font-mono text-[10px] font-semibold text-emerald">IDEAL</span>
          <h3 className="mt-3 text-lg font-semibold text-foreground">Ideal QAOA Simulator</h3>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            Noise-free QAOA portfolio optimisation with a fixed seed for reproducible baseline experiments.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2 font-mono text-[10px]">
            <div className="rounded-sm border border-border p-2"><div className="text-foreground">Seed 42</div><div className="text-muted-foreground">reproducible run</div></div>
            <div className="rounded-sm border border-border p-2"><div className="text-foreground">QAOA reps 1</div><div className="text-muted-foreground">baseline depth</div></div>
            <div className="rounded-sm border border-border p-2"><div className="text-foreground">QUBO</div><div className="text-muted-foreground">binary selection</div></div>
            <div className="rounded-sm border border-border p-2"><div className="text-foreground">4 assets</div><div className="text-muted-foreground">BTC · ETH · SOL · NVDA</div></div>
          </div>
          <a className="mt-4 inline-block font-mono text-xs font-semibold text-primary hover:underline" href="https://github.com/Tamas22-cell/QuantumPortfolioOptimizer/blob/main/qaoa_simulator.py" target="_blank" rel="noreferrer">VIEW SOURCE →</a>
        </article>

        <article className="rounded-sm border border-border bg-surface p-4">
          <span className="inline-flex rounded-full border border-amber/40 px-2 py-1 font-mono text-[10px] font-semibold text-amber">NOISY</span>
          <h3 className="mt-3 text-lg font-semibold text-foreground">Noisy QAOA Simulator</h3>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            Shot-based simulation with depolarizing and readout noise as the benchmark layer before mitigation and hardware execution.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2 font-mono text-[10px]">
            <div className="rounded-sm border border-border p-2"><div className="text-foreground">2048 shots</div><div className="text-muted-foreground">sampling budget</div></div>
            <div className="rounded-sm border border-border p-2"><div className="text-foreground">Seed 42</div><div className="text-muted-foreground">reproducible run</div></div>
            <div className="rounded-sm border border-border p-2"><div className="text-foreground">Depolarizing</div><div className="text-muted-foreground">gate noise</div></div>
            <div className="rounded-sm border border-border p-2"><div className="text-foreground">Readout noise</div><div className="text-muted-foreground">measurement noise</div></div>
          </div>
          <a className="mt-4 inline-block font-mono text-xs font-semibold text-primary hover:underline" href="https://github.com/Tamas22-cell/QuantumPortfolioOptimizer/blob/main/qaoa_noisy_simulator.py" target="_blank" rel="noreferrer">VIEW SOURCE →</a>
        </article>
      </div>

      <div className="mt-4 rounded-sm border border-primary/30 bg-primary/5 p-3 text-xs leading-5 text-muted-foreground">
        Next benchmark step: add error mitigation, then compare simulator results with IBM Quantum hardware execution under the same portfolio instance and seed.
      </div>
    </section>
  );
}
