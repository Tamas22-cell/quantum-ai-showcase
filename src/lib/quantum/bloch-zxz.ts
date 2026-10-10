/**
 * Exact single-qubit ZXZ rotation engine for the Interactive Quantum Lab.
 *
 * Conventions follow Qiskit exactly:
 *  - Rz(λ) = diag(e^{-iλ/2}, e^{+iλ/2})   (keeps its global phase — not the P(λ) gate)
 *  - Rx(θ) = exp(-iθX/2)
 *  - A circuit `rz(α); rx(β); rz(γ)` applies Rz(α) FIRST, so the unitary is
 *    U = Rz(γ) · Rx(β) · Rz(α)   (matrix product reads right-to-left).
 * Pure functions only — no randomness, no hardware.
 */
import { H, S, X, matmul, rx, rz, type Matrix2 } from "./gates";

export type Complex = { re: number; im: number };
export type Qubit = [Complex, Complex];
export type BlochVec = { x: number; y: number; z: number };
export type PresetId = "0" | "1" | "+" | "-" | "i+";

/** Presets with the Qiskit gates that prepare them from |0⟩. */
export const PRESETS: Record<PresetId, { label: string; prep: ("x" | "h" | "s")[] }> = {
  "0": { label: "|0⟩", prep: [] },
  "1": { label: "|1⟩", prep: ["x"] },
  "+": { label: "|+⟩", prep: ["h"] },
  "-": { label: "|−⟩", prep: ["x", "h"] },
  "i+": { label: "|+i⟩", prep: ["h", "s"] },
};

const PREP_MATRIX = { x: X, h: H, s: S } as const;

export function applyMatrix(m: Matrix2, [a, b]: Qubit): Qubit {
  const [m00, m01, m10, m11] = m.re;
  const [i00, i01, i10, i11] = m.im;
  return [
    {
      re: m00 * a.re - i00 * a.im + m01 * b.re - i01 * b.im,
      im: m00 * a.im + i00 * a.re + m01 * b.im + i01 * b.re,
    },
    {
      re: m10 * a.re - i10 * a.im + m11 * b.re - i11 * b.im,
      im: m10 * a.im + i10 * a.re + m11 * b.im + i11 * b.re,
    },
  ];
}

export function presetState(id: PresetId): Qubit {
  let s: Qubit = [
    { re: 1, im: 0 },
    { re: 0, im: 0 },
  ];
  for (const g of PRESETS[id].prep) s = applyMatrix(PREP_MATRIX[g], s);
  return s;
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/**
 * Angles actually applied at animation progress p ∈ [0, 3].
 * Segment 0→1 sweeps Rz(α), 1→2 sweeps Rx(β), 2→3 sweeps Rz(γ).
 * Partial angles are real rotations, so every frame is a physical state.
 */
export function partialAngles(alpha: number, beta: number, gamma: number, p: number) {
  return { a: alpha * clamp01(p), b: beta * clamp01(p - 1), g: gamma * clamp01(p - 2) };
}

/** U = Rz(γ)·Rx(β)·Rz(α) — the unitary of circuit rz(α) → rx(β) → rz(γ). */
export function zxzUnitary(alpha: number, beta: number, gamma: number): Matrix2 {
  return matmul(rz(gamma), matmul(rx(beta), rz(alpha)));
}

export function evolve(
  preset: PresetId,
  alpha: number,
  beta: number,
  gamma: number,
  p = 3,
): Qubit {
  const { a, b, g } = partialAngles(alpha, beta, gamma, p);
  // Apply gate-by-gate in circuit order (equivalent to zxzUnitary on the full angles).
  let s = presetState(preset);
  s = applyMatrix(rz(a), s);
  s = applyMatrix(rx(b), s);
  s = applyMatrix(rz(g), s);
  return s;
}

export function blochVector([a, b]: Qubit): BlochVec {
  // ⟨σ⟩ from ρ = |ψ⟩⟨ψ|:  x = 2Re(a*b), y = 2Im(a*b), z = |a|² − |b|²
  const re = a.re * b.re + a.im * b.im;
  const im = a.re * b.im - a.im * b.re;
  const fix = (v: number) => (Math.abs(v) < 1e-12 ? 0 : v);
  return { x: fix(2 * re), y: fix(2 * im), z: fix(abs2(a) - abs2(b)) };
}

export const abs2 = (c: Complex) => c.re * c.re + c.im * c.im;
export const arg = (c: Complex) => (abs2(c) < 1e-24 ? 0 : Math.atan2(c.im, c.re));

export function stateMetrics(s: Qubit) {
  const p0 = abs2(s[0]);
  const p1 = abs2(s[1]);
  const amp0 = abs2(s[0]) > 1e-24;
  const amp1 = abs2(s[1]) > 1e-24;
  return {
    p0,
    p1,
    norm: p0 + p1,
    /** Phase of the first non-zero amplitude — unobservable, but Qiskit reports it. */
    globalPhase: amp0 ? arg(s[0]) : arg(s[1]),
    /** φ = arg(β) − arg(α): the observable relative phase (Bloch azimuth). */
    relativePhase: amp0 && amp1 ? wrap(arg(s[1]) - arg(s[0])) : null,
  };
}

const wrap = (t: number) => Math.atan2(Math.sin(t), Math.cos(t));

/** Sampled Bloch path of the full animation, for drawing the trajectory. */
export function trajectory(preset: PresetId, alpha: number, beta: number, gamma: number, n = 90) {
  return Array.from({ length: n + 1 }, (_, i) =>
    blochVector(evolve(preset, alpha, beta, gamma, (3 * i) / n)),
  );
}

const fmtAngle = (v: number) => {
  const r = Number(v.toFixed(6));
  return Object.is(r, -0) ? "0" : String(r);
};

/** Equivalent Qiskit program (angles in radians, same ordering). */
export function qiskitCode(preset: PresetId, alpha: number, beta: number, gamma: number) {
  const prep = PRESETS[preset].prep.map((g) => `qc.${g}(0)`);
  return [
    "from qiskit import QuantumCircuit",
    "from qiskit.quantum_info import Statevector",
    "",
    "qc = QuantumCircuit(1)",
    `# Prepare ${PRESETS[preset].label}${prep.length ? "" : " (default)"}`,
    ...prep,
    "# ZXZ sequence — applied left to right: U = Rz(γ)·Rx(β)·Rz(α)",
    `qc.rz(${fmtAngle(alpha)}, 0)  # α`,
    `qc.rx(${fmtAngle(beta)}, 0)  # β`,
    `qc.rz(${fmtAngle(gamma)}, 0)  # γ`,
    "",
    "state = Statevector.from_instruction(qc)",
    "print(state)                       # complex amplitudes incl. global phase",
    "print(state.probabilities_dict())  # P(0), P(1)",
  ].join("\n");
}

export function formatComplex(c: Complex, digits = 4) {
  const z = (v: number) => (Math.abs(v) < 0.5 * 10 ** -digits ? 0 : v);
  const re = z(c.re);
  const im = z(c.im);
  const sign = im < 0 ? "−" : "+";
  return `${re.toFixed(digits).replace("-", "−")} ${sign} ${Math.abs(im).toFixed(digits)}i`;
}
