import type { Rng } from "./rng";

/**
 * Weighted undirected graph for Max-Cut.
 * Node i ↔ qubit i ↔ bit i of an assignment index (little-endian, like the statevector).
 */
export type Edge = { u: number; v: number; w: number };
export type Graph = { n: number; edges: Edge[] };

export const MAX_CUT_NODES = 10; // 2^10 = 1024 amplitudes — interactive in the browser

export function validateGraph(g: Graph): string[] {
  const errs: string[] = [];
  if (!Number.isInteger(g.n) || g.n < 2 || g.n > MAX_CUT_NODES) errs.push(`Graph must have 2–${MAX_CUT_NODES} nodes.`);
  if (!g.edges.length) errs.push("Graph needs at least one edge.");
  const seen = new Set<string>();
  g.edges.forEach((e, i) => {
    if (![e.u, e.v].every((x) => Number.isInteger(x) && x >= 0 && x < g.n)) errs.push(`Edge ${i + 1}: node out of range.`);
    if (e.u === e.v) errs.push(`Edge ${i + 1}: self-loops are not allowed.`);
    if (!Number.isFinite(e.w) || e.w <= 0 || e.w > 100) errs.push(`Edge ${i + 1}: weight must be in (0, 100].`);
    const k = `${Math.min(e.u, e.v)}-${Math.max(e.u, e.v)}`;
    if (seen.has(k)) errs.push(`Edge ${i + 1}: duplicate edge ${k}.`);
    seen.add(k);
  });
  return errs;
}

/** Cut value C(z) = Σ_{(u,v)} w_uv · [z_u ≠ z_v]. */
export function cutValue(g: Graph, z: number): number {
  let c = 0;
  for (const e of g.edges) if (((z >> e.u) ^ (z >> e.v)) & 1) c += e.w;
  return c;
}

/** C(z) for every assignment — the diagonal of the cost Hamiltonian. */
export function cutTable(g: Graph): Float64Array {
  const t = new Float64Array(1 << g.n);
  for (let z = 0; z < t.length; z++) t[z] = cutValue(g, z);
  return t;
}

/** Exhaustive search: exact optimum and all optimal assignments. O(2^n · |E|). */
export function exhaustiveMaxCut(g: Graph) {
  const table = cutTable(g);
  let best = -Infinity;
  for (const v of table) if (v > best) best = v;
  const optimal: number[] = [];
  table.forEach((v, z) => { if (Math.abs(v - best) < 1e-9) optimal.push(z); });
  return { value: best, optimal, evaluations: table.length, table };
}

export function randomGraph(n: number, edgeProb: number, rng: Rng, weighted = true): Graph {
  const edges: Edge[] = [];
  for (let u = 0; u < n; u++)
    for (let v = u + 1; v < n; v++)
      if (rng() < edgeProb) edges.push({ u, v, w: weighted ? Math.round((0.5 + rng() * 4.5) * 10) / 10 : 1 });
  // Guarantee connectivity-ish: chain any isolated node to its neighbour.
  for (let u = 0; u < n; u++) if (!edges.some((e) => e.u === u || e.v === u)) edges.push({ u, v: (u + 1) % n, w: 1 });
  return { n, edges };
}

export const GRAPH_PRESETS: { id: string; name: string; graph: Graph }[] = [
  { id: "triangle", name: "Triangle (unweighted)", graph: { n: 3, edges: [{ u: 0, v: 1, w: 1 }, { u: 1, v: 2, w: 1 }, { u: 0, v: 2, w: 1 }] } },
  { id: "square", name: "4-cycle (unweighted)", graph: { n: 4, edges: [{ u: 0, v: 1, w: 1 }, { u: 1, v: 2, w: 1 }, { u: 2, v: 3, w: 1 }, { u: 3, v: 0, w: 1 }] } },
  {
    id: "k4w", name: "Weighted K4", graph: {
      n: 4, edges: [{ u: 0, v: 1, w: 3 }, { u: 0, v: 2, w: 1 }, { u: 0, v: 3, w: 2 }, { u: 1, v: 2, w: 2.5 }, { u: 1, v: 3, w: 1 }, { u: 2, v: 3, w: 4 }],
    },
  },
  {
    id: "ring6", name: "6-ring + chords (weighted)", graph: {
      n: 6, edges: [
        { u: 0, v: 1, w: 2 }, { u: 1, v: 2, w: 1 }, { u: 2, v: 3, w: 3 }, { u: 3, v: 4, w: 1.5 }, { u: 4, v: 5, w: 2 }, { u: 5, v: 0, w: 1 },
        { u: 0, v: 3, w: 2.5 }, { u: 1, v: 4, w: 1 },
      ],
    },
  },
];
