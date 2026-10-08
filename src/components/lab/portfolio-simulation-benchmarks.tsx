// Deployment refresh marker: benchmark-v7-composer
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
    {
      method: "Mitigated QAOA",
      engine: "Aer + mitigation",
      noise: "Readout corrected",
      shots: "2048",
      objective: "Mitigated result",
      runtime: "Printed by script",
      status: "MITIGATED",
      statusClass: "border-primary/40 text-primary",
    },
    {
      method: "IBM Hardware QAOA",
      engine: "IBM Quantum QPU",
      noise: "Real device noise",
      shots: "2048",
      objective: "After hardware run",
      runtime: "After hardware run",
      status: "HARDWARE READY",
      statusClass: "border-emerald/40 text-emerald",
    },
  ];

  return (
    <section className="mt-6 rounded-md border border-border bg-card p-4 sm:p-5">
      <div className="font-mono text-xs uppercase tracking-[0.18em] text-primary">
        Quantum Simulation Benchmarks
      </div>
      <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
        Classical vs Ideal vs Noisy vs Mitigated vs IBM Hardware
      </h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
        The portfolio QUBO now has a five-stage benchmark pipeline: exact classical reference, ideal
        QAOA, noisy QAOA, readout-mitigated QAOA and a hardware-ready IBM Quantum execution path.
        Shot-based benchmark paths use 2048 shots.
      </p>

      <div className="mt-5 grid grid-cols-1 gap-3 md:hidden">
        {rows.map((row) => (
          <article key={row.method} className="rounded-sm border border-border bg-surface p-4">
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-mono text-sm font-semibold text-foreground">{row.method}</h3>
              <span
                className={`inline-flex shrink-0 rounded-full border px-2 py-1 font-mono text-[10px] font-semibold ${row.statusClass}`}
              >
                {row.status}
              </span>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 font-mono text-[11px]">
              <div>
                <dt className="text-muted-foreground">Engine</dt>
                <dd className="mt-1 text-foreground">{row.engine}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Noise</dt>
                <dd className="mt-1 text-foreground">{row.noise}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Shots</dt>
                <dd className="mt-1 text-foreground">{row.shots}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Objective</dt>
                <dd className="mt-1 text-foreground">{row.objective}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-muted-foreground">Runtime</dt>
                <dd className="mt-1 text-foreground">{row.runtime}</dd>
              </div>
            </dl>
          </article>
        ))}
      </div>

      <div className="mt-5 hidden overflow-x-auto rounded-sm border border-border md:block">
        <table className="min-w-[920px] w-full border-collapse font-mono text-[11px]">
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
                <td className="p-3">
                  <span
                    className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-semibold ${row.statusClass}`}
                  >
                    {row.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-[11px] leading-5 text-muted-foreground">
        Simulator benchmark values are produced by executable code. The IBM Hardware row is
        intentionally marked hardware-ready until a real QPU job is submitted and measured; no
        hardware result is fabricated.
      </p>

      <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
        <article className="rounded-sm border border-border bg-surface p-4">
          <span className="inline-flex rounded-full border border-emerald/40 px-2 py-1 font-mono text-[10px] font-semibold text-emerald">
            IDEAL
          </span>
          <h3 className="mt-3 text-lg font-semibold text-foreground">Ideal QAOA Simulator</h3>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            Noise-free QAOA portfolio optimisation with a fixed seed for reproducible baseline
            experiments.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2 font-mono text-[10px]">
            <div className="rounded-sm border border-border p-2">
              <div className="text-foreground">Seed 42</div>
              <div className="text-muted-foreground">reproducible run</div>
            </div>
            <div className="rounded-sm border border-border p-2">
              <div className="text-foreground">QAOA reps 1</div>
              <div className="text-muted-foreground">baseline depth</div>
            </div>
            <div className="rounded-sm border border-border p-2">
              <div className="text-foreground">QUBO</div>
              <div className="text-muted-foreground">binary selection</div>
            </div>
            <div className="rounded-sm border border-border p-2">
              <div className="text-foreground">4 assets</div>
              <div className="text-muted-foreground">BTC · ETH · SOL · NVDA</div>
            </div>
          </div>
          <a
            className="mt-4 inline-block font-mono text-xs font-semibold text-primary hover:underline"
            href="https://github.com/Tamas22-cell/QuantumPortfolioOptimizer/blob/main/qaoa_simulator.py"
            target="_blank"
            rel="noreferrer"
          >
            VIEW SOURCE →
          </a>
        </article>

        <article className="rounded-sm border border-border bg-surface p-4">
          <span className="inline-flex rounded-full border border-amber/40 px-2 py-1 font-mono text-[10px] font-semibold text-amber">
            NOISY
          </span>
          <h3 className="mt-3 text-lg font-semibold text-foreground">Noisy QAOA Simulator</h3>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            Shot-based simulation with depolarizing and readout noise as the benchmark layer before
            mitigation and hardware execution.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2 font-mono text-[10px]">
            <div className="rounded-sm border border-border p-2">
              <div className="text-foreground">2048 shots</div>
              <div className="text-muted-foreground">sampling budget</div>
            </div>
            <div className="rounded-sm border border-border p-2">
              <div className="text-foreground">Seed 42</div>
              <div className="text-muted-foreground">reproducible run</div>
            </div>
            <div className="rounded-sm border border-border p-2">
              <div className="text-foreground">Depolarizing</div>
              <div className="text-muted-foreground">gate noise</div>
            </div>
            <div className="rounded-sm border border-border p-2">
              <div className="text-foreground">Readout noise</div>
              <div className="text-muted-foreground">measurement noise</div>
            </div>
          </div>
          <a
            className="mt-4 inline-block font-mono text-xs font-semibold text-primary hover:underline"
            href="https://github.com/Tamas22-cell/QuantumPortfolioOptimizer/blob/main/qaoa_noisy_simulator.py"
            target="_blank"
            rel="noreferrer"
          >
            VIEW SOURCE →
          </a>
        </article>

        <article className="rounded-sm border border-primary/30 bg-primary/5 p-4 md:col-span-2">
          <span className="inline-flex rounded-full border border-primary/40 px-2 py-1 font-mono text-[10px] font-semibold text-primary">
            MITIGATED
          </span>
          <h3 className="mt-3 text-lg font-semibold text-foreground">Readout Error Mitigation</h3>
          <p className="mt-2 max-w-3xl text-xs leading-5 text-muted-foreground">
            The noisy QAOA sample distribution is corrected with the pseudo-inverse of the readout
            assignment matrix. This targets measurement error only; depolarizing gate noise
            intentionally remains so the mitigation claim stays precise.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2 font-mono text-[10px] sm:grid-cols-4">
            <div className="rounded-sm border border-border p-2">
              <div className="text-foreground">2048 shots</div>
              <div className="text-muted-foreground">same noisy budget</div>
            </div>
            <div className="rounded-sm border border-border p-2">
              <div className="text-foreground">2% readout</div>
              <div className="text-muted-foreground">assignment model</div>
            </div>
            <div className="rounded-sm border border-border p-2">
              <div className="text-foreground">Pseudo-inverse</div>
              <div className="text-muted-foreground">matrix correction</div>
            </div>
            <div className="rounded-sm border border-border p-2">
              <div className="text-foreground">Gate noise</div>
              <div className="text-muted-foreground">still present</div>
            </div>
          </div>
          <a
            className="mt-4 inline-block font-mono text-xs font-semibold text-primary hover:underline"
            href="https://github.com/Tamas22-cell/QuantumPortfolioOptimizer/blob/main/qaoa_error_mitigation.py"
            target="_blank"
            rel="noreferrer"
          >
            VIEW MITIGATION SOURCE →
          </a>
        </article>

        <article className="rounded-sm border border-emerald/30 bg-emerald/5 p-4 md:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="inline-flex rounded-full border border-emerald/40 px-2 py-1 font-mono text-[10px] font-semibold text-emerald">
              HARDWARE READY
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
              Browser path · no local API setup
            </span>
          </div>
          <h3 className="mt-3 text-lg font-semibold text-foreground">
            IBM Quantum Hardware Execution
          </h3>
          <p className="mt-2 max-w-3xl text-xs leading-5 text-muted-foreground">
            Run the prepared 4-qubit QAOA circuit from the browser in IBM Quantum Composer. The
            OpenQASM 3 circuit is hosted directly by this site, so you can open the Composer and the
            circuit file from here without configuring a local Qiskit API token.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2 font-mono text-[10px] sm:grid-cols-5">
            <div className="rounded-sm border border-border p-2">
              <div className="text-foreground">Real QPU</div>
              <div className="text-muted-foreground">IBM Quantum</div>
            </div>
            <div className="rounded-sm border border-border p-2">
              <div className="text-foreground">QAOA p=1</div>
              <div className="text-muted-foreground">hardware depth</div>
            </div>
            <div className="rounded-sm border border-border p-2">
              <div className="text-foreground">4 qubits</div>
              <div className="text-muted-foreground">BTC · ETH · SOL · NVDA</div>
            </div>
            <div className="rounded-sm border border-border p-2">
              <div className="text-foreground">2048 shots</div>
              <div className="text-muted-foreground">target sampling</div>
            </div>
            <div className="rounded-sm border border-border p-2">
              <div className="text-foreground">OpenQASM 3</div>
              <div className="text-muted-foreground">Composer-ready</div>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <a
              className="inline-flex items-center rounded-sm border border-primary/50 bg-primary/10 px-4 py-2 font-mono text-xs font-semibold text-primary transition-colors hover:bg-primary/15"
              href="https://quantum.cloud.ibm.com/composer"
              target="_blank"
              rel="noreferrer"
            >
              OPEN IBM COMPOSER →
            </a>
            <a
              className="inline-flex items-center rounded-sm border border-border bg-surface px-4 py-2 font-mono text-xs font-semibold text-foreground transition-colors hover:border-primary/40"
              href="/ibm_composer_qaoa.qasm"
              target="_blank"
              rel="noreferrer"
            >
              OPEN QAOA CIRCUIT →
            </a>
            <a
              className="inline-flex items-center rounded-sm border border-border bg-surface px-4 py-2 font-mono text-xs font-semibold text-foreground transition-colors hover:border-primary/40"
              href="https://github.com/Tamas22-cell/QuantumPortfolioOptimizer/blob/main/qaoa_ibm_hardware.py"
              target="_blank"
              rel="noreferrer"
            >
              VIEW HARDWARE SOURCE →
            </a>
          </div>

          <div className="mt-4 rounded-sm border border-border bg-background/30 p-3 font-mono text-[10px] leading-5 text-muted-foreground">
            Flow: OPEN QAOA CIRCUIT → copy/import the OpenQASM 3 circuit → OPEN IBM COMPOSER →
            choose an available IBM QPU → set shots → run. Publish backend, job ID, depth, gate
            counts and measured objective only after the real job completes.
          </div>
        </article>
      </div>

      <div className="mt-4 rounded-sm border border-primary/30 bg-primary/5 p-3 text-xs leading-5 text-muted-foreground">
        Interactive lab default: p=2. Hardware benchmark path: p=1 to keep the real-device circuit
        shallower. Shot-based benchmark paths use 2048 shots. The browser-based Composer route is
        now available directly from this page.
      </div>
    </section>
  );
}
