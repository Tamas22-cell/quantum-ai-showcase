import { cutValue, type Graph } from "./maxcut";
import type { Rng } from "./rng";

/** Common result shape for classical Max-Cut heuristics. */
export type HeuristicRun = {
  assignment: number;
  value: number;
  evaluations: number;
  history: { evals: number; best: number }[];
};

const randomAssignment = (n: number, rng: Rng) => Math.floor(rng() * (1 << n));

/** Uniform random sampling with a fixed evaluation budget. */
export function randomSearch(g: Graph, samples: number, rng: Rng): HeuristicRun {
  let best = -Infinity,
    arg = 0;
  const history: HeuristicRun["history"] = [];
  for (let i = 1; i <= samples; i++) {
    const z = randomAssignment(g.n, rng),
      v = cutValue(g, z);
    if (v > best) {
      best = v;
      arg = z;
      history.push({ evals: i, best });
    }
  }
  return { assignment: arg, value: best, evaluations: samples, history };
}

/** Steepest-ascent single-flip local search with random restarts. */
export function greedyLocalSearch(g: Graph, restarts: number, rng: Rng): HeuristicRun {
  let evals = 0,
    best = -Infinity,
    arg = 0;
  const history: HeuristicRun["history"] = [];
  const record = (z: number, v: number) => {
    if (v > best) {
      best = v;
      arg = z;
      history.push({ evals, best });
    }
  };
  for (let r = 0; r < restarts; r++) {
    let z = randomAssignment(g.n, rng),
      v = cutValue(g, z);
    evals++;
    record(z, v);
    for (;;) {
      let bz = z,
        bv = v;
      for (let q = 0; q < g.n; q++) {
        const nz = z ^ (1 << q),
          nv = cutValue(g, nz);
        evals++;
        if (nv > bv) {
          bz = nz;
          bv = nv;
        }
      }
      if (bz === z) break;
      z = bz;
      v = bv;
      record(z, v);
    }
  }
  return { assignment: arg, value: best, evaluations: evals, history };
}

/** Simulated annealing with geometric cooling and single-bit-flip moves. */
export function simulatedAnnealing(
  g: Graph,
  steps: number,
  rng: Rng,
  t0 = 2,
  t1 = 0.01,
): HeuristicRun {
  let z = randomAssignment(g.n, rng),
    v = cutValue(g, z);
  let best = v,
    arg = z;
  const history: HeuristicRun["history"] = [{ evals: 1, best }];
  for (let s = 1; s <= steps; s++) {
    const T = t0 * Math.pow(t1 / t0, s / steps);
    const nz = z ^ (1 << Math.floor(rng() * g.n)),
      nv = cutValue(g, nz);
    if (nv >= v || rng() < Math.exp((nv - v) / T)) {
      z = nz;
      v = nv;
    }
    if (v > best) {
      best = v;
      arg = z;
      history.push({ evals: s + 1, best });
    }
  }
  return { assignment: arg, value: best, evaluations: steps + 1, history };
}
