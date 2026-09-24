/**
 * Pure report builders: snapshot → ReportDoc. Deterministic given (snapshot, generatedAt).
 * Every builder validates the snapshot first and throws ReportInputError on incomplete input.
 */
import { EXAMPLE_CIRCUITS, GRAPH_PRESETS, HAMILTONIAN_PRESETS, BELL_STATES, TSIRELSON, toBitstring, costHamiltonianTerms, mixerHamiltonianTerms, formatHamiltonian, portfolioMetrics, type Circuit, type Graph } from "@/lib/quantum";
import type { Snapshot } from "./sources";
import { SOURCES } from "./sources";
import { CORE_DISCLAIMER, NO_ADVANTAGE, NO_FIN_ADVICE, NO_LIVE_DATA, NO_QML_CLAIM, ReportInputError, type Block, type ReportDoc, type Section } from "./types";

const f = (x: number | null | undefined, d = 4) => (x === null || x === undefined || !Number.isFinite(x) ? "n/a" : x.toFixed(d));
const pct = (x: number | null | undefined) => (x === null || x === undefined || !Number.isFinite(x) ? "n/a" : `${(x * 100).toFixed(1)}%`);
const arr = (xs: number[] | undefined, d = 4) => (xs && xs.length ? xs.map((x) => f(x, d)).join(", ") : "n/a");

function need(cond: unknown, msg: string): asserts cond { if (!cond) throw new ReportInputError(msg); }
const finite = (x: unknown) => typeof x === "number" && Number.isFinite(x);
const finiteArr = (a: unknown) => Array.isArray(a) && a.every(finite);

function circuitText(c: Circuit): string {
  if (!c.ops.length) return "(empty circuit)";
  return c.ops.map((o) => `${o.gate}${o.theta !== undefined ? `(${f(o.theta, 3)})` : ""}[${o.qubits.join(",")}]`).join("  ");
}
const graphRows = (g: Graph) => g.edges.map((e) => [`${e.u}–${e.v}`, f(e.w, 2)]);
const topProbs = (probs: ArrayLike<number>, width: number, k = 12) => {
  const idx = Array.from({ length: probs.length }, (_, i) => i).sort((a, b) => probs[b]! - probs[a]! || a - b).slice(0, k);
  return { labels: idx.map((i) => toBitstring(i, width)), values: idx.map((i) => probs[i]!), idx };
};

function reproducibility(seed: number | undefined, settings: [string, string][], extra: string[] = []): Section {
  return {
    heading: "Reproducibility",
    blocks: [
      { type: "kv", rows: [["Master seed", seed === undefined ? "n/a (deterministic, no sampling)" : String(seed)], ...settings] },
      { type: "bullets", items: [
        "Re-running with identical settings and seed in this application reproduces identical numbers (seeded Mulberry32-family PRNG, deterministic optimizers).",
        "Qubit ordering is little-endian (qubit 0 = rightmost bit), matching Qiskit conventions.",
        "Computation performed locally in the browser with double-precision floating point; no data left the device.",
        ...extra,
      ] },
    ],
  };
}

function wrap(snap: Snapshot, generatedAt: string, disclaimers: string[], summary: string[], sections: Section[]): ReportDoc {
  const moduleName = SOURCES[snap.kind].name;
  return {
    title: `${moduleName} — Research Report`, moduleId: snap.kind, moduleName, generatedAt,
    disclaimers: [CORE_DISCLAIMER, ...disclaimers], summary, sections,
  };
}

// ---------------------------------------------------------------- per module

function circuitReport(s: Extract<Snapshot, { kind: "circuit" }>, at: string): ReportDoc {
  need(s.circuit && Number.isInteger(s.circuit.numQubits), "Circuit is missing.");
  need(finiteArr(s.probs) && s.probs.length > 0, "Probability distribution is missing.");
  const width = s.measured?.length || s.circuit.numQubits;
  const ex = EXAMPLE_CIRCUITS.find((e) => e.id === s.exampleId);
  const top = topProbs(s.probs, width);
  const hasCounts = finiteArr(s.counts) && s.counts.length === s.probs.length;
  const blocks: Block[] = [
    { type: "bar", caption: "Exact measurement probabilities (top outcomes)", labels: top.labels, values: top.values },
    { type: "table", caption: "Exact vs sampled", head: ["Outcome", "Exact P", hasCounts ? "Counts" : "Counts", hasCounts ? "Empirical freq." : "Empirical freq."], rows: top.idx.map((i, k) => [top.labels[k]!, f(s.probs[i]), hasCounts ? String(s.counts[i]) : "n/a", hasCounts ? f(s.counts[i]! / s.shots) : "n/a"]) },
  ];
  if (hasCounts) blocks.push({ type: "bar", caption: `Seeded shot histogram (${s.shots} shots)`, labels: top.labels, values: top.idx.map((i) => s.counts[i]!) });
  else blocks.push({ type: "notice", text: "Shot counts were not provided — sampled histogram omitted." });
  return wrap(s, at, [NO_ADVANTAGE], [
    `${ex?.name ?? "Custom circuit"} on ${s.circuit.numQubits} qubit(s), ${s.circuit.ops.length} operations; statevector dimension 2^${s.circuit.numQubits} = ${2 ** s.circuit.numQubits}.`,
    `Most likely outcome |${top.labels[0]}⟩ with exact probability ${f(top.values[0])}.`,
  ], [
    { heading: "Experiment setup", blocks: [
      { type: "kv", rows: [["Circuit", ex?.name ?? "Custom"], ["Qubits", String(s.circuit.numQubits)], ["Operations", String(s.circuit.ops.length)], ["Measured qubits", s.measured?.length ? s.measured.join(", ") : "all (no explicit M)"], ["Shots", hasCounts ? String(s.shots) : "n/a"]] },
      { type: "paragraph", text: `Gate sequence: ${circuitText(s.circuit)}` },
      ...(ex ? [{ type: "paragraph" as const, text: ex.description }] : []),
    ] },
    { heading: "Methodology", blocks: [{ type: "paragraph", text: "The full complex statevector is evolved exactly by applying 2×2 gate matrices (and controlled variants) to the amplitude array. Probabilities are |amplitude|²; marginals are taken over measured qubits. Shots are drawn from the exact distribution with a seeded PRNG." }] },
    { heading: "Results", blocks },
    { heading: "Interpretation", blocks: [{ type: "paragraph", text: "Differences between exact probabilities and empirical frequencies reflect finite-shot sampling noise (standard error ≈ √(p(1−p)/shots)), not hardware noise — no noise model is applied." }] },
    { heading: "Limitations", blocks: [{ type: "bullets", items: ["Up to 5 qubits; memory grows as 2^n.", "No decoherence, gate error or readout error modelled.", "Mid-circuit measurement is not supported; measurements are terminal."] }] },
    reproducibility(hasCounts ? s.seed : undefined, [["Shots", String(s.shots)]]),
    { heading: "Appendix — raw circuit", blocks: [{ type: "paragraph", text: JSON.stringify(s.circuit) }] },
  ]);
}

function entanglementReport(s: Extract<Snapshot, { kind: "entanglement" }>, at: string): ReportDoc {
  need(s.state && BELL_STATES[s.state], "Bell state is missing or invalid.");
  need(s.chsh && finite(s.chsh.exactS) && Array.isArray(s.chsh.terms), "CHSH result is missing.");
  const zz = finiteArr(s.zzProbs) && s.zzProbs.length === 4 ? s.zzProbs : null;
  const bell = BELL_STATES[s.state];
  const results: Block[] = [];
  if (zz) results.push({ type: "bar", caption: "Z⊗Z joint probabilities", labels: ["00", "01", "10", "11"], values: zz });
  else results.push({ type: "notice", text: "Z-basis joint probabilities not provided." });
  if (s.correlations?.length) results.push({ type: "table", caption: "Correlators E(a,b) = P(same) − P(different)", head: ["Basis A", "Basis B", "E"], rows: s.correlations.map((c) => [c.a, c.b, f(c.E)]) });
  results.push({ type: "table", caption: "CHSH terms (optimal angles for Φ+)", head: ["Term", "Sign", "Exact", "Sampled"], rows: s.chsh.terms.map((t) => [t.label, t.sign > 0 ? "+" : "−", f(t.exact), f(t.sampled)]) });
  results.push({ type: "kv", rows: [["Exact S", f(s.chsh.exactS)], ["Sampled S", f(s.chsh.sampledS)], ["Shots per setting", s.chsh.shotsPerSetting ? String(s.chsh.shotsPerSetting) : "n/a"], ["Classical bound", "|S| ≤ 2"], ["Tsirelson bound", `2√2 ≈ ${f(TSIRELSON)}`]] });
  const viol = Math.abs(s.chsh.exactS) > 2 + 1e-9;
  return wrap(s, at, [NO_ADVANTAGE, "A simulated CHSH violation is a mathematical property of the ideal quantum model, not an experimental Bell test."], [
    `Bell state ${bell.label} = ${bell.ket}, prepared with H + CNOT.`,
    `Exact CHSH value S = ${f(s.chsh.exactS)} ${viol ? "exceeds" : "does not exceed"} the classical bound 2 (Tsirelson bound ${f(TSIRELSON)}).`,
  ], [
    { heading: "Experiment setup", blocks: [{ type: "kv", rows: [["Bell state", `${bell.label}  ${bell.ket}`], ["Preparation", "H(q0), CNOT(q0→q1), optional X/Z flips"], ["CHSH angles", "a=0, a′=π/2, b=π/4, b′=−π/4"], ["Shots per setting", String(s.shots ?? "n/a")]] }] },
    { heading: "Methodology", blocks: [{ type: "paragraph", text: "Measurement bases are implemented by pre-measurement rotations (H for X, S†H for Y). For CHSH each party measures along an angle in the X–Z plane via Ry(−θ). Correlators are computed exactly from joint probabilities and estimated from seeded shots." }] },
    { heading: "Results", blocks: results },
    { heading: "Interpretation", blocks: [{ type: "paragraph", text: "The sampled S fluctuates around the exact value with finite-shot noise. Values above 2 are incompatible with local hidden-variable models in a real loophole-free experiment; here they only confirm the simulator reproduces quantum predictions." }] },
    { heading: "Limitations", blocks: [{ type: "bullets", items: ["Ideal, noiseless two-qubit simulation.", "No detection, locality or freedom-of-choice loopholes are relevant — this is not an experiment."] }] },
    reproducibility(s.seed, [["Bell state", s.state], ["Shots per setting", String(s.shots)]]),
  ]);
}

function qaoaReport(s: Extract<Snapshot, { kind: "qaoa" }>, at: string): ReportDoc {
  const r = s.result;
  need(r && r.config && r.config.graph, "QAOA result or configuration is missing.");
  need(finiteArr(r.gammas) && finiteArr(r.betas) && r.gammas.length === r.config.p, "Optimised angles are missing or invalid.");
  need(finite(r.expectation) && finite(r.optimum), "Expected cost or classical optimum is missing.");
  const g = r.config.graph;
  const results: Block[] = [
    { type: "kv", rows: [["Expected cut ⟨C⟩", f(r.expectation)], ["Exhaustive optimum C*", f(r.optimum)], ["Approximation ratio ⟨C⟩/C*", f(r.approxRatio)], ["P(optimal cut)", f(r.pOptimal)], ["Most likely bitstring", `${r.mostLikely?.bits ?? "n/a"} (cut ${f(r.mostLikely?.cut)}, P=${f(r.mostLikely?.prob)})`], ["Optimal assignments", (r.optimalAssignments ?? []).map((z) => toBitstring(z, g.n)).join(", ") || "n/a"], ["Objective evaluations", String(r.evaluations ?? "n/a")]] },
    { type: "table", caption: "Optimised parameters", head: ["Layer", "γ", "β"], rows: r.gammas.map((gm, i) => [String(i + 1), f(gm), f(r.betas[i])]) },
  ];
  if (r.top?.length) results.push({ type: "bar", caption: "Final QAOA distribution (top bitstrings; highlighted = optimal cut)", labels: r.top.map((t) => t.bits), values: r.top.map((t) => t.prob), highlight: r.top.flatMap((t, i) => (t.optimal ? [i] : [])) });
  if (r.history?.length) results.push({ type: "line", caption: "Optimisation convergence (best ⟨C⟩ so far)", xLabel: "evaluations", yLabel: "⟨C⟩", series: [{ name: "best ⟨C⟩", points: r.history.map((h) => [h.evals, h.best]) }], reference: { label: "C*", y: r.optimum } });
  else results.push({ type: "notice", text: "Convergence history not provided." });
  return wrap(s, at, [NO_ADVANTAGE, "Local optimiser with restarts: results may correspond to a local optimum of the angle landscape."], [
    `QAOA p=${r.config.p} on a ${g.n}-node, ${g.edges.length}-edge weighted Max-Cut instance.`,
    `Approximation ratio ${f(r.approxRatio)} with ${pct(r.pOptimal)} probability on an exactly optimal cut (C* = ${f(r.optimum)}).`,
  ], [
    { heading: "Experiment setup", blocks: [
      { type: "kv", rows: [["Graph", GRAPH_PRESETS.find((p) => p.id === s.presetId)?.name ?? "Custom"], ["Nodes / qubits", String(g.n)], ["Depth p", String(r.config.p)], ["Restarts", String(r.config.restarts)], ["Max iterations", String(r.config.maxIter)]] },
      { type: "table", caption: "Edges", head: ["Edge", "Weight"], rows: graphRows(g) },
      { type: "paragraph", text: `Cost Hamiltonian: ${costHamiltonianTerms(g)}` },
      { type: "paragraph", text: `Mixer Hamiltonian: ${mixerHamiltonianTerms(g.n)}` },
    ] },
    { heading: "Methodology", blocks: [{ type: "paragraph", text: "|γ,β⟩ = Π_k e^{−iβ_k B} e^{−iγ_k C} |+⟩^n is computed exactly (C is diagonal). ⟨C⟩ is maximised over angles by Nelder–Mead with seeded random restarts. The classical reference is an exhaustive search over all 2^n assignments." }] },
    { heading: "Results", blocks: results },
    { heading: "Interpretation", blocks: [{ type: "paragraph", text: "The approximation ratio measures ⟨C⟩ relative to the exact optimum. For graphs this small exhaustive search is trivial; the experiment illustrates the QAOA mechanism, not a computational speed-up." }] },
    { heading: "Limitations", blocks: [{ type: "bullets", items: ["≤ 10 nodes (1024 amplitudes).", "Ideal simulation — no noise, no hardware compilation or connectivity.", "Angle optimisation is local and may miss the global optimum."] }] },
    reproducibility(r.config.seed, [["Depth p", String(r.config.p)], ["Restarts", String(r.config.restarts)], ["Max iterations", String(r.config.maxIter)]]),
    { heading: "Appendix — raw configuration", blocks: [{ type: "paragraph", text: JSON.stringify(r.config) }] },
  ]);
}

function vqeReport(s: Extract<Snapshot, { kind: "vqe" }>, at: string): ReportDoc {
  const r = s.result;
  need(r && r.config && r.config.hamiltonian, "VQE result or configuration is missing.");
  need(finite(r.energy) && finite(r.exact), "Energy values are missing.");
  need(finiteArr(r.params), "Optimised parameters are missing.");
  const h = r.config.hamiltonian;
  const n = h.n;
  const results: Block[] = [
    { type: "kv", rows: [["VQE energy", f(r.energy, 6)], ["Exact ground energy", f(r.exact, 6)], ["Absolute error", r.error !== undefined ? r.error.toExponential(3) : "n/a"], ["Ground-space fidelity", f(r.fidelity)], ["Ground degeneracy", String(r.degeneracy ?? "n/a")], ["Evaluations", String(r.evaluations ?? "n/a")]] },
    { type: "paragraph", text: `Optimised parameters: ${arr(r.params)}` },
  ];
  if (r.eigenvalues?.length) results.push({ type: "table", caption: "Exact spectrum (diagonalisation)", head: ["#", "Eigenvalue"], rows: r.eigenvalues.map((e, i) => [String(i), f(e, 6)]) });
  if (r.restartEnergies?.length) results.push({ type: "table", caption: "Best energy per restart", head: ["Restart", "Energy"], rows: r.restartEnergies.map((e, i) => [String(i + 1), f(e, 6)]) });
  if (r.history?.length) results.push({ type: "line", caption: "Energy convergence (best so far)", xLabel: "iteration (all restarts)", yLabel: "energy", series: [{ name: "best", points: r.history.map((p, i) => [i, p.best]) }], reference: { label: "exact", y: r.exact } });
  else results.push({ type: "notice", text: "Convergence history not provided." });
  if (finiteArr(r.probs) && r.probs.length) { const t = topProbs(r.probs, n, 16); results.push({ type: "bar", caption: "Measurement probabilities of optimised state", labels: t.labels, values: t.values }); }
  const preset = HAMILTONIAN_PRESETS.find((p) => p.id === s.presetId);
  return wrap(s, at, [NO_ADVANTAGE, "COBYLA option is a simplified unconstrained variant, not Powell's reference implementation.", ...(s.presetId === "h2" ? ["H₂ coefficients are literature values; no quantum-chemistry calculation is performed here."] : [])], [
    `VQE on ${preset?.name ?? "custom Hamiltonian"} (${n} qubit(s), ${h.terms.length} Pauli terms) using ${r.config.optimizer}.`,
    `Best energy ${f(r.energy, 6)} vs exact ${f(r.exact, 6)} (error ${r.error?.toExponential(2) ?? "n/a"}, fidelity ${f(r.fidelity)}).`,
  ], [
    { heading: "Experiment setup", blocks: [
      { type: "paragraph", text: `H = ${formatHamiltonian(h)}` },
      { type: "kv", rows: [["Ansatz", `${r.config.rotations.toUpperCase()} layers + CNOT chain, depth ${r.config.depth}`], ["Parameters", String(r.params.length)], ["Optimizer", r.config.optimizer], ["Max iterations", String(r.config.maxIter)], ["Restarts", String(r.config.restarts)]] },
      ...(preset ? [{ type: "paragraph" as const, text: preset.note }] : []),
    ] },
    { heading: "Methodology", blocks: [{ type: "paragraph", text: "E(θ) = ⟨ψ(θ)|H|ψ(θ)⟩ is evaluated exactly from the statevector for each Pauli term. A classical optimiser minimises E(θ) over seeded restarts. The reference ground energy is obtained by Jacobi diagonalisation of the full 2^n×2^n Hamiltonian matrix." }] },
    { heading: "Results", blocks: results },
    { heading: "Interpretation", blocks: [{ type: "paragraph", text: "By the variational principle E(θ) ≥ E₀, so the error is non-negative up to rounding. A small error with fidelity near 1 indicates the ansatz can express the ground state; this says nothing about scalability on hardware." }] },
    { heading: "Limitations", blocks: [{ type: "bullets", items: ["≤ 4 qubits.", "Exact expectation values — no shot noise or measurement grouping.", "Gradient-free local optimisers may stall in local minima or barren regions."] }] },
    reproducibility(r.config.seed, [["Optimizer", r.config.optimizer], ["Depth", String(r.config.depth)], ["Restarts", String(r.config.restarts)]]),
    { heading: "Appendix — raw configuration", blocks: [{ type: "paragraph", text: JSON.stringify(r.config) }] },
  ]);
}

function portfolioReport(s: Extract<Snapshot, { kind: "portfolio" }>, at: string): ReportDoc {
  const { data: d, model: m, result: r } = s;
  need(d && Array.isArray(d.names) && d.names.length >= 2 && finiteArr(d.mu), "Portfolio data is missing.");
  need(m && Number.isInteger(m.k), "Portfolio model is missing.");
  need(r && r.exact && finite(r.expectedObjective) && finiteArr(r.gammas), "QAOA portfolio result is missing.");
  const n = d.names.length;
  const sel = (x: number) => d.names.filter((_, i) => (x >> i) & 1).join(", ") || "(none)";
  const ex = portfolioMetrics(d, r.exact.assignment), sb = r.sampledBest ? portfolioMetrics(d, r.sampledBest.x) : null;
  const results: Block[] = [
    { type: "table", caption: "Exact optimum vs QAOA", head: ["Quantity", "Selection", "Objective", "Return", "Volatility"], rows: [
      ["Exhaustive optimum", sel(r.exact.assignment), f(r.exact.value), pct(ex.ret), pct(ex.vol)],
      ["QAOA sampled best", r.sampledBest ? sel(r.sampledBest.x) : "n/a", f(r.sampledBest?.value), sb ? pct(sb.ret) : "n/a", sb ? pct(sb.vol) : "n/a"],
      ["QAOA most likely", r.mostLikely ? sel(r.mostLikely.x) : "n/a", f(r.mostLikely?.value), "", ""],
    ] },
    { type: "kv", rows: [["Expected objective ⟨f⟩ (QAOA state)", f(r.expectedObjective)], ["P(optimal)", f(r.pOptimal)], ["P(feasible)", f(r.pFeasible)], ["γ", arr(r.gammas)], ["β", arr(r.betas)]] },
  ];
  if (r.probs?.length) { const t = topProbs(r.probs, n); results.push({ type: "bar", caption: "QAOA probability distribution (top selections; highlighted = exact optimum)", labels: t.labels, values: t.values, highlight: t.idx.flatMap((z, i) => (z === r.exact.assignment ? [i] : [])) }); }
  if (r.history?.length) results.push({ type: "line", caption: "Convergence of best ⟨f⟩ (minimisation)", xLabel: "evaluations", yLabel: "⟨f⟩", series: [{ name: "best ⟨f⟩", points: r.history.map((h) => [h.evals, h.best]) }], reference: { label: "exact min", y: r.exact.value } });
  return wrap(s, at, [NO_FIN_ADVICE, d.source === "synthetic" ? NO_LIVE_DATA : "User-supplied return data; not verified and not live.", NO_ADVANTAGE], [
    `Select exactly K=${m.k} of ${n} ${d.source} assets (equal weights) with risk aversion q=${m.riskAversion}.`,
    `Exact optimum: ${sel(r.exact.assignment)}. QAOA places ${pct(r.pOptimal)} probability on it; expected objective ${f(r.expectedObjective)} vs optimum ${f(r.exact.value)}.`,
  ], [
    { heading: "Experiment setup", blocks: [
      { type: "table", caption: "Assets (annualised, synthetic factor model)", head: ["Asset", "Expected return", "Volatility"], rows: d.names.map((nm, i) => [nm, pct(d.mu[i]), pct(Math.sqrt(d.sigma[i]![i]!))]) },
      { type: "kv", rows: [["Risk aversion q", String(m.riskAversion)], ["Cardinality K", String(m.k)], ["Penalty A", String(m.penalty)], ["Excluded", m.excluded.length ? m.excluded.map((i) => d.names[i]).join(", ") : "none"], ["QAOA depth p", String(r.config.p)], ["Shots", String(r.config.shots)]] },
      { type: "paragraph", text: "Objective (minimised): f(x) = q·xᵀΣx − μᵀx + A·(Σx − K)², x ∈ {0,1}^n, mapped to an Ising Hamiltonian via x = (1 − z)/2." },
    ] },
    { heading: "Methodology", blocks: [{ type: "paragraph", text: "The QUBO diagonal is used as the QAOA cost; angles are optimised to minimise ⟨f⟩ with seeded Nelder–Mead restarts, then the final state is sampled with seeded shots. The classical reference enumerates all 2^n selections. Reported return/volatility use equal weights 1/K." }] },
    { heading: "Results", blocks: results },
    { heading: "Interpretation", blocks: [{ type: "paragraph", text: "Expected objective and sampled best are distinct: sampling can recover the optimum even when ⟨f⟩ is above it. With ≤ 8 assets exhaustive search is instantaneous; this is an illustration of formulation, not a practical optimiser." }] },
    { heading: "Limitations", blocks: [{ type: "bullets", items: ["Synthetic data from a seeded factor model — not real market data.", "Binary equal-weight selection only; no transaction costs, lot sizes or continuous weights.", "Penalty A too small can make infeasible selections optimal."] }] },
    reproducibility(r.config.seed, [["Data seed", String(r.config.seed)], ["Restarts", String(r.config.restarts)], ["Max iterations", String(r.config.maxIter)]]),
  ]);
}

function qmlReport(s: Extract<Snapshot, { kind: "qml" }>, at: string): ReportDoc {
  const r = s.result;
  need(r && finiteArr(r.params) && finite(r.trainAcc), "QML training result is missing.");
  need(Array.isArray(s.train) && s.train.length > 0, "Training set is missing.");
  const b = s.baseline;
  const results: Block[] = [
    { type: "table", caption: "Side-by-side accuracy (same split)", head: ["Model", "Train acc.", "Test acc."], rows: [["Variational quantum classifier", pct(r.trainAcc), pct(r.testAcc)], [b ? `Logistic regression${b.quadratic ? " (quadratic features)" : ""}` : "Classical baseline", pct(b?.trainAcc), pct(b?.testAcc)]] },
    { type: "kv", rows: [["Train loss (BCE)", f(r.trainLoss)], ["Test loss (BCE)", f(r.testLoss)], ["Evaluations", String(r.evaluations ?? "n/a")], ["Learned parameters", arr(r.params, 3)]] },
  ];
  if (s.confusionTest) results.push({ type: "table", caption: "Test confusion matrix (quantum model)", head: ["", "Pred 0", "Pred 1"], rows: [["True 0", String(s.confusionTest[0][0]), String(s.confusionTest[0][1])], ["True 1", String(s.confusionTest[1][0]), String(s.confusionTest[1][1])]] });
  if (r.history?.length) {
    results.push({ type: "line", caption: "Training loss", xLabel: "iteration", yLabel: "BCE", series: [{ name: "loss", points: r.history.map((h) => [h.iter, h.loss]) }] });
    results.push({ type: "line", caption: "Accuracy", xLabel: "iteration", yLabel: "accuracy", series: [{ name: "train", points: r.history.map((h) => [h.iter, h.trainAcc]) }, { name: "test", points: r.history.map((h) => [h.iter, h.testAcc]) }] });
  } else results.push({ type: "notice", text: "Training history not provided." });
  return wrap(s, at, [NO_ADVANTAGE, NO_QML_CLAIM, "Educational demonstration only."], [
    `2-qubit variational classifier (depth ${r.depth}) on the ${s.dataset} dataset (${s.train.length} train / ${s.test.length} test).`,
    `Quantum test accuracy ${pct(r.testAcc)} vs classical baseline ${pct(b?.testAcc)}; this comparison does not demonstrate any advantage.`,
  ], [
    { heading: "Experiment setup", blocks: [{ type: "kv", rows: [["Dataset", s.dataset], ["Samples", String(s.n)], ["Test fraction", String(s.testFraction)], ["Depth", String(r.depth)], ["Parameters", String(r.params.length)], ["Encoding", "Angle encoding Ry(π·x) per feature"], ["Readout", "P(q1 = 1) after CNOT entangler"]] }] },
    { heading: "Methodology", blocks: [{ type: "paragraph", text: "Each input is angle-encoded into 2 qubits, followed by trainable Ry/Rz layers and CNOT entanglers. Class-1 probability is read out exactly. Parameters minimise binary cross-entropy with seeded Nelder–Mead. The baseline is logistic regression trained by gradient descent on the same split." }] },
    { heading: "Results", blocks: results },
    { heading: "Interpretation", blocks: [{ type: "paragraph", text: "Accuracy differences on tiny synthetic datasets are dominated by model capacity and the random split; they are not evidence that quantum models outperform classical ones." }] },
    { heading: "Limitations", blocks: [{ type: "bullets", items: ["Only 2 features / 2 qubits.", "Small, unstratified splits — high variance.", "Local optimiser can settle in weaker minima."] }] },
    reproducibility(undefined, [["Seed (data, split, init)", String(s.result ? s.train.length && (s as { seed?: number }).seed !== undefined ? (s as { seed?: number }).seed : "see settings" : "n/a")], ["Iterations", String(r.history?.length ?? "n/a")]]),
  ]);
}

function arenaReport(s: Extract<Snapshot, { kind: "arena" }>, at: string): ReportDoc {
  const r = s.result;
  need(r && r.config && Array.isArray(r.results) && r.results.length > 0, "Arena results are missing.");
  need(finite(r.optimum), "Exhaustive optimum is missing.");
  const g = r.config.graph;
  const results: Block[] = [
    { type: "table", caption: "Solver comparison (identical instance)", head: ["Algorithm", "Type", "Best cut", "Ratio", "Evaluations", "Time (ms)"], rows: r.results.map((a) => [a.name, a.kind, f(a.value, 3), f(a.ratio, 3), `${a.evaluations} ${a.evaluationUnit}`, f(a.timeMs, 1)]) },
    { type: "bar", caption: "Best cut value by algorithm", labels: r.results.map((a) => a.name), values: r.results.map((a) => a.value) },
  ];
  if (r.qaoa) {
    results.push({ type: "kv", rows: [["QAOA ⟨C⟩", f(r.qaoa.expectation)], ["QAOA ⟨C⟩/C*", f(r.qaoa.expectationRatio)], ["P(optimal)", f(r.qaoa.pOptimal)], ["γ", arr(r.qaoa.gammas)], ["β", arr(r.qaoa.betas)], ["Shots", String(r.qaoa.shots)]] });
    const c = Object.entries(r.qaoa.counts ?? {}).sort((a, b) => b[1] - a[1]).slice(0, 12);
    if (c.length) results.push({ type: "bar", caption: "QAOA sampled counts (top bitstrings)", labels: c.map((x) => x[0]), values: c.map((x) => x[1]) });
  }
  const series = r.results.filter((a) => a.history?.length).map((a) => ({ name: a.name, points: a.history.map((h) => [h.evals, h.best] as [number, number]) }));
  if (series.length) results.push({ type: "line", caption: "Best value vs evaluations (units differ per algorithm)", xLabel: "evaluations", yLabel: "best cut", series, reference: { label: "C*", y: r.optimum } });
  return wrap(s, at, [NO_ADVANTAGE, "QAOA timings measure classical simulation cost, not quantum hardware runtime; evaluation units differ between algorithms."], [
    `Benchmark of ${r.results.length} solvers on a ${g.n}-node Max-Cut instance (C* = ${f(r.optimum)}).`,
    `Algorithms reaching the optimum: ${r.results.filter((a) => a.ratio >= 1 - 1e-9).map((a) => a.name).join(", ") || "none"}.`,
  ], [
    { heading: "Experiment setup", blocks: [
      { type: "kv", rows: [["Graph", GRAPH_PRESETS.find((p) => p.id === s.presetId)?.name ?? "Custom"], ["Nodes", String(g.n)], ["QAOA depth p", String(r.config.p)], ["QAOA restarts / max iter", `${r.config.restarts} / ${r.config.maxIter}`], ["Shots", String(r.config.shots)], ["SA steps", String(r.config.saSteps)], ["Greedy restarts", String(r.config.greedyRestarts)]] },
      { type: "table", caption: "Edges", head: ["Edge", "Weight"], rows: graphRows(g) },
    ] },
    { heading: "Methodology", blocks: [{ type: "paragraph", text: "All solvers use the same graph and sub-seeds derived from one master seed. Exhaustive search provides the exact optimum; greedy local search, simulated annealing and random sampling are classical heuristics; QAOA is simulated exactly and then sampled." }] },
    { heading: "Results", blocks: results },
    { heading: "Interpretation", blocks: [{ type: "paragraph", text: "At this scale every method is cheap and exhaustive search is exact; the comparison shows solution quality under equal conditions, not scaling behaviour." }] },
    { heading: "Limitations", blocks: [{ type: "bullets", items: ["≤ 10 nodes.", "Wall-clock times depend on the browser and device.", "Heuristic parameters are not tuned per instance."] }] },
    reproducibility(r.config.seed, Object.entries(r.environment ?? {}).map(([k, v]) => [k, String(v)] as [string, string])),
    { heading: "Appendix — raw configuration", blocks: [{ type: "paragraph", text: JSON.stringify(r.config) }] },
  ]);
}

/** Entry point. `generatedAt` is injectable for deterministic tests. */
export function buildReport(snap: Snapshot | null | undefined, generatedAt: string = new Date().toISOString()): ReportDoc {
  need(snap && typeof snap === "object" && "kind" in snap, "No experiment data supplied.");
  switch (snap.kind) {
    case "circuit": return circuitReport(snap, generatedAt);
    case "entanglement": return entanglementReport(snap, generatedAt);
    case "qaoa": return qaoaReport(snap, generatedAt);
    case "vqe": return vqeReport(snap, generatedAt);
    case "portfolio": return portfolioReport(snap, generatedAt);
    case "qml": return qmlReport(snap, generatedAt);
    case "arena": return arenaReport(snap, generatedAt);
    default: throw new ReportInputError(`Unsupported module: ${String((snap as { kind: unknown }).kind)}`);
  }
}
