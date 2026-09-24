/**
 * Derivative-free Nelder–Mead minimiser (deterministic given x0).
 * `onIter` receives the best value after each iteration and may be async so callers can yield to the UI.
 */
export type NMOptions = { maxIter?: number; step?: number; tol?: number; signal?: AbortSignal | undefined; onIter?: (best: number, it: number) => void | Promise<void> };

export async function nelderMead(f: (x: number[]) => number, x0: number[], opts: NMOptions = {}) {
  const { maxIter = 200, step = 0.3, tol = 1e-8 } = opts;
  const d = x0.length;
  let simplex = [x0.slice(), ...x0.map((_, i) => x0.map((v, j) => (i === j ? v + step : v)))];
  let values = simplex.map(f);
  let evals = values.length;
  let it = 0;
  for (; it < maxIter; it++) {
    if (opts.signal?.aborted) throw new DOMException("Aborted", "AbortError");
    const order = values.map((_, i) => i).sort((a, b) => values[a]! - values[b]!);
    simplex = order.map((i) => simplex[i]!);
    values = order.map((i) => values[i]!);
    await opts.onIter?.(values[0]!, it);
    if (Math.abs(values[d]! - values[0]!) < tol) break;

    const centroid = Array.from({ length: d }, (_, j) => simplex.slice(0, d).reduce((s, p) => s + p[j]!, 0) / d);
    const worst = simplex[d]!;
    const along = (t: number) => centroid.map((c, j) => c + t * (worst[j]! - c));
    const xr = along(-1), fr = f(xr); evals++;
    if (fr < values[0]!) {
      const xe = along(-2), fe = f(xe); evals++;
      [simplex[d], values[d]] = fe < fr ? [xe, fe] : [xr, fr];
    } else if (fr < values[d - 1]!) {
      [simplex[d], values[d]] = [xr, fr];
    } else {
      const xc = fr < values[d]! ? along(-0.5) : along(0.5);
      const fc = f(xc); evals++;
      if (fc < Math.min(fr, values[d]!)) [simplex[d], values[d]] = [xc, fc];
      else {
        // Shrink toward the best vertex.
        for (let i = 1; i <= d; i++) {
          simplex[i] = simplex[i]!.map((v, j) => simplex[0]![j]! + 0.5 * (v - simplex[0]![j]!));
          values[i] = f(simplex[i]!); evals++;
        }
      }
    }
  }
  const bi = values.indexOf(Math.min(...values));
  return { x: simplex[bi]!, value: values[bi]!, iterations: it, evaluations: evals };
}
