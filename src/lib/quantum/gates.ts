/**
 * Single-qubit gate matrices in row-major order: [[m00, m01], [m10, m11]].
 * Each entry is stored as separate real / imaginary parts.
 */
export type Matrix2 = { re: [number, number, number, number]; im: [number, number, number, number] };

const S2 = Math.SQRT1_2;

export const I: Matrix2 = { re: [1, 0, 0, 1], im: [0, 0, 0, 0] };
export const H: Matrix2 = { re: [S2, S2, S2, -S2], im: [0, 0, 0, 0] };
export const X: Matrix2 = { re: [0, 1, 1, 0], im: [0, 0, 0, 0] };
export const Y: Matrix2 = { re: [0, 0, 0, 0], im: [0, -1, 1, 0] };
export const Z: Matrix2 = { re: [1, 0, 0, -1], im: [0, 0, 0, 0] };
export const S: Matrix2 = { re: [1, 0, 0, 0], im: [0, 0, 0, 1] };
export const T: Matrix2 = { re: [1, 0, 0, S2], im: [0, 0, 0, S2] };

/** Rx(θ) = exp(-iθX/2) */
export function rx(theta: number): Matrix2 {
  const c = Math.cos(theta / 2), s = Math.sin(theta / 2);
  return { re: [c, 0, 0, c], im: [0, -s, -s, 0] };
}
/** Ry(θ) = exp(-iθY/2) */
export function ry(theta: number): Matrix2 {
  const c = Math.cos(theta / 2), s = Math.sin(theta / 2);
  return { re: [c, -s, s, c], im: [0, 0, 0, 0] };
}
/** Rz(θ) = exp(-iθZ/2) = diag(e^{-iθ/2}, e^{iθ/2}) */
export function rz(theta: number): Matrix2 {
  const c = Math.cos(theta / 2), s = Math.sin(theta / 2);
  return { re: [c, 0, 0, c], im: [-s, 0, 0, s] };
}

/** Matrix product A·B (used in tests and for gate fusion). */
export function matmul(a: Matrix2, b: Matrix2): Matrix2 {
  const re = [0, 0, 0, 0] as Matrix2["re"];
  const im = [0, 0, 0, 0] as Matrix2["im"];
  for (let r = 0; r < 2; r++)
    for (let c = 0; c < 2; c++)
      for (let k = 0; k < 2; k++) {
        const ar = a.re[r * 2 + k]!, ai = a.im[r * 2 + k]!, br = b.re[k * 2 + c]!, bi = b.im[k * 2 + c]!;
        re[r * 2 + c]! += ar * br - ai * bi;
        im[r * 2 + c]! += ar * bi + ai * br;
      }
  return { re, im };
}

/** Conjugate transpose. */
export function dagger(m: Matrix2): Matrix2 {
  return { re: [m.re[0], m.re[2], m.re[1], m.re[3]], im: [-m.im[0], -m.im[2], -m.im[1], -m.im[3]] };
}
