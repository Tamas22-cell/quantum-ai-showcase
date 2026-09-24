/**
 * Live Quantum Finance Lab — market-data pipeline (UI-free, fully unit tested).
 * Price series → simple returns → annualised mean / covariance / correlation / volatility.
 * Every source (demo, CSV, live provider) is normalised to the same PriceSeries shape first.
 */
import { createRng } from "@/lib/quantum/rng";
import { isPositiveSemidefinite, PORTFOLIO_MAX_ASSETS } from "@/lib/quantum/portfolio";

export type DataSource = "demo" | "csv" | "live";
export type AssetClass = "crypto" | "equity" | "etf" | "other";
/** prices[a][t] = close of symbols[a] on dates[t]; dates ascending ISO YYYY-MM-DD. */
export type PriceSeries = { dates: string[]; symbols: string[]; prices: number[][]; source: DataSource; classes?: AssetClass[] };

export const MIN_RETURNS = 20;
export const MAX_CSV_COLUMNS = 30;
export const MAX_CSV_ROWS = 5000;
export const PERIODS_PER_YEAR = 252;
export const FINANCE_MAX_ASSETS = PORTFOLIO_MAX_ASSETS; // 2^8 = 256 amplitudes: exact + QAOA stay instant

export const RANGES = [
  { id: "3m", label: "3 months", periods: 63 },
  { id: "6m", label: "6 months", periods: 126 },
  { id: "1y", label: "1 year", periods: 252 },
  { id: "3y", label: "3 years", periods: 756 },
  { id: "all", label: "All", periods: Infinity },
] as const;
export type RangeId = (typeof RANGES)[number]["id"];

/* ---------------- Demo data ---------------- */

/** Synthetic universe. Names are deliberately NOT real tickers so nothing can be mistaken for market data. */
export const DEMO_UNIVERSE: { symbol: string; cls: AssetClass; mu: number; vol: number; beta: number }[] = [
  { symbol: "SYN-CRY1", cls: "crypto", mu: 0.35, vol: 0.7, beta: 0.45 },
  { symbol: "SYN-CRY2", cls: "crypto", mu: 0.45, vol: 0.85, beta: 0.4 },
  { symbol: "SYN-EQ1", cls: "equity", mu: 0.12, vol: 0.28, beta: 0.75 },
  { symbol: "SYN-EQ2", cls: "equity", mu: 0.09, vol: 0.22, beta: 0.7 },
  { symbol: "SYN-EQ3", cls: "equity", mu: 0.15, vol: 0.35, beta: 0.65 },
  { symbol: "SYN-EQ4", cls: "equity", mu: 0.07, vol: 0.18, beta: 0.6 },
  { symbol: "SYN-ETF1", cls: "etf", mu: 0.08, vol: 0.16, beta: 0.9 },
  { symbol: "SYN-ETF2", cls: "etf", mu: 0.05, vol: 0.1, beta: 0.5 },
  { symbol: "SYN-BND", cls: "etf", mu: 0.03, vol: 0.06, beta: -0.2 },
  { symbol: "SYN-GLD", cls: "other", mu: 0.04, vol: 0.14, beta: 0.05 },
];

/** Weekday calendar starting 2023-01-02 (UTC). Synthetic — not an exchange calendar. */
function weekdays(count: number): string[] {
  const out: string[] = [];
  const d = new Date(Date.UTC(2023, 0, 2));
  while (out.length < count) {
    const w = d.getUTCDay();
    if (w !== 0 && w !== 6) out.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}

/** Seeded one-factor geometric Brownian motion. Same seed → identical series. */
export function demoPrices(seed: number, periods = 757): PriceSeries {
  const rng = createRng(seed);
  const normal = () => Math.sqrt(-2 * Math.log(Math.max(rng(), 1e-12))) * Math.cos(2 * Math.PI * rng());
  const dt = 1 / PERIODS_PER_YEAR;
  const prices = DEMO_UNIVERSE.map(() => [100]);
  for (let t = 1; t < periods; t++) {
    const m = normal();
    DEMO_UNIVERSE.forEach((a, i) => {
      const z = a.beta * m + Math.sqrt(1 - a.beta * a.beta) * normal();
      const r = (a.mu - 0.5 * a.vol * a.vol) * dt + a.vol * Math.sqrt(dt) * z;
      const row = prices[i]!;
      row.push(+(row[t - 1]! * Math.exp(r)).toFixed(6));
    });
  }
  return { dates: weekdays(periods), symbols: DEMO_UNIVERSE.map((a) => a.symbol), prices, source: "demo", classes: DEMO_UNIVERSE.map((a) => a.cls) };
}

/* ---------------- CSV ---------------- */

const ISO = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Parse a price CSV: header `date,SYM1,SYM2,…`, one row per period with positive closing prices.
 * Runs entirely client-side. Descending files are re-ordered ascending.
 */
export function parsePriceCsv(text: string): { series?: PriceSeries; errors: string[] } {
  if (typeof text !== "string" || !text.trim()) return { errors: ["The file is empty."] };
  const rows = text.trim().split(/\r?\n/).map((r) => r.split(/[,;\t]/).map((c) => c.trim().replace(/^"|"$/g, ""))).filter((r) => r.some((c) => c));
  if (rows.length > MAX_CSV_ROWS + 1) return { errors: [`Too many rows (max ${MAX_CSV_ROWS}).`] };
  const head = rows[0]!;
  if (!/^date$/i.test(head[0] ?? "")) return { errors: ["First column header must be 'date'."] };
  const symbols = head.slice(1);
  if (symbols.length < 2) return { errors: ["Need at least 2 asset price columns after 'date'."] };
  if (symbols.length > MAX_CSV_COLUMNS) return { errors: [`Too many asset columns (max ${MAX_CSV_COLUMNS}).`] };
  if (symbols.some((s) => !/^[A-Za-z0-9._\-^/]{1,16}$/.test(s))) return { errors: ["Asset names must be 1–16 characters (letters, digits, . _ - ^ /)."] };
  if (new Set(symbols).size !== symbols.length) return { errors: ["Asset names must be unique."] };
  const recs: { date: string; vals: number[] }[] = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r]!;
    if (row.length !== head.length) return { errors: [`Row ${r + 1} has ${row.length} values, expected ${head.length}.`] };
    const date = row[0]!;
    if (!ISO.test(date) || Number.isNaN(Date.parse(date))) return { errors: [`Row ${r + 1}: date '${date}' must be YYYY-MM-DD.`] };
    const vals: number[] = [];
    for (let c = 1; c < row.length; c++) {
      const cell = row[c]!;
      if (cell === "" || /^(na|nan|null|n\/a)$/i.test(cell)) return { errors: [`Row ${r + 1}, ${symbols[c - 1]}: missing value.`] };
      const v = Number(cell);
      if (!Number.isFinite(v) || v <= 0) return { errors: [`Row ${r + 1}, ${symbols[c - 1]}: '${cell}' is not a positive price.`] };
      vals.push(v);
    }
    recs.push({ date, vals });
  }
  recs.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  for (let i = 1; i < recs.length; i++) if (recs[i]!.date === recs[i - 1]!.date) return { errors: [`Duplicate date ${recs[i]!.date}.`] };
  if (recs.length < MIN_RETURNS + 1) return { errors: [`Insufficient history: ${recs.length} price rows; need at least ${MIN_RETURNS + 1} (${MIN_RETURNS} returns).`] };
  return {
    series: { dates: recs.map((r) => r.date), symbols, prices: symbols.map((_, a) => recs.map((r) => r.vals[a]!)), source: "csv" },
    errors: [],
  };
}

/** Structural validation shared by every source (used for live-provider payloads too). */
export function validateSeries(s: PriceSeries): string[] {
  const e: string[] = [];
  if (!s || !Array.isArray(s.dates) || !Array.isArray(s.symbols) || !Array.isArray(s.prices)) return ["Malformed price data."];
  if (s.symbols.length < 2) e.push("Need at least 2 assets.");
  if (s.prices.length !== s.symbols.length) e.push("Price columns do not match symbols.");
  if (s.prices.some((p) => !Array.isArray(p) || p.length !== s.dates.length || !p.every((v) => typeof v === "number" && Number.isFinite(v) && v > 0))) e.push("Every price must be a positive finite number with no gaps.");
  if (s.dates.some((d, i) => typeof d !== "string" || !ISO.test(d) || (i > 0 && d <= s.dates[i - 1]!))) e.push("Dates must be ascending unique YYYY-MM-DD.");
  if (s.dates.length < MIN_RETURNS + 1) e.push(`Insufficient history: need at least ${MIN_RETURNS + 1} price points.`);
  return e;
}

/* ---------------- Returns & statistics ---------------- */

/** Keep the last `periods` returns (periods + 1 prices) of the range. */
export function sliceRange(s: PriceSeries, range: RangeId): PriceSeries {
  const r = RANGES.find((x) => x.id === range);
  if (!r) throw new RangeError(`Unknown range '${range}'.`);
  const start = Number.isFinite(r.periods) ? Math.max(0, s.dates.length - 1 - r.periods) : 0;
  return { ...s, dates: s.dates.slice(start), prices: s.prices.map((p) => p.slice(start)) };
}

export const simpleReturns = (p: number[]) => p.slice(1).map((v, t) => v / p[t]! - 1);

export type MarketStats = {
  symbols: string[]; periods: number; periodsPerYear: number; start: string; end: string;
  mu: number[]; sigma: number[][]; corr: number[][]; vol: number[];
  normalized: number[][]; // price / first price × 100
  totalReturn: number[];
};

/** Annualised sample statistics (arithmetic mean × P, unbiased covariance × P). */
export function computeStats(s: PriceSeries, symbols: string[], periodsPerYear = PERIODS_PER_YEAR): { stats?: MarketStats; errors: string[] } {
  const e = validateSeries(s);
  if (e.length) return { errors: e };
  if (symbols.length < 2) return { errors: ["Select at least 2 assets."] };
  if (symbols.length > FINANCE_MAX_ASSETS) return { errors: [`Too many assets for exact/QAOA simulation: max ${FINANCE_MAX_ASSETS} (2^${FINANCE_MAX_ASSETS} amplitudes).`] };
  const idx = symbols.map((x) => s.symbols.indexOf(x));
  if (idx.some((i) => i < 0)) return { errors: ["Selected asset not present in the data."] };
  const R = idx.map((i) => simpleReturns(s.prices[i]!));
  const T = R[0]!.length;
  if (T < MIN_RETURNS) return { errors: [`Insufficient history in this range: ${T} returns, need ≥ ${MIN_RETURNS}.`] };
  if (T <= symbols.length) return { errors: ["Insufficient history: need more return periods than assets for a full-rank covariance."] };
  const mean = R.map((r) => r.reduce((a, b) => a + b, 0) / T);
  const cov = R.map((ri, i) => R.map((rj, j) => ri.reduce((acc, v, t) => acc + (v - mean[i]!) * (rj[t]! - mean[j]!), 0) / (T - 1)));
  const sigma = cov.map((row) => row.map((v) => v * periodsPerYear));
  const vol = sigma.map((row, i) => Math.sqrt(Math.max(0, row[i]!)));
  if (vol.some((v) => v === 0)) return { errors: ["An asset has zero variance in this range (constant price); remove it."] };
  const corr = sigma.map((row, i) => row.map((v, j) => (i === j ? 1 : v / (vol[i]! * vol[j]!))));
  if (!isPositiveSemidefinite(sigma, 1e-12)) return { errors: ["Covariance matrix is not positive semidefinite."] };
  const normalized = idx.map((i) => s.prices[i]!.map((v) => (v / s.prices[i]![0]!) * 100));
  return {
    stats: {
      symbols: [...symbols], periods: T, periodsPerYear, start: s.dates[0]!, end: s.dates[s.dates.length - 1]!,
      mu: mean.map((m) => m * periodsPerYear), sigma, corr, vol, normalized, totalReturn: normalized.map((n) => n[n.length - 1]! / 100 - 1),
    },
    errors: [],
  };
}

/* ---------------- Classical baselines ---------------- */

export type WeightPortfolio = { weights: number[]; ret: number; vol: number };

export function evalWeights(mu: number[], sigma: number[][], w: number[]): WeightPortfolio {
  const ret = w.reduce((s, wi, i) => s + wi * mu[i]!, 0);
  let v = 0;
  for (let i = 0; i < w.length; i++) for (let j = 0; j < w.length; j++) v += w[i]! * w[j]! * sigma[i]![j]!;
  return { weights: w, ret, vol: Math.sqrt(Math.max(0, v)) };
}

export const equalWeight = (mu: number[], sigma: number[][]) => evalWeights(mu, sigma, mu.map(() => 1 / mu.length));

/** Solve A x = b by Gaussian elimination with partial pivoting; null if (near-)singular. */
export function solve(A: number[][], b: number[]): number[] | null {
  const n = b.length, M = A.map((r, i) => [...r, b[i]!]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r]![c]!) > Math.abs(M[p]![c]!)) p = r;
    if (Math.abs(M[p]![c]!) < 1e-14) return null;
    [M[c], M[p]] = [M[p]!, M[c]!];
    for (let r = 0; r < n; r++) if (r !== c) { const k = M[r]![c]! / M[c]![c]!; for (let j = c; j <= n; j++) M[r]![j]! -= k * M[c]![j]!; }
  }
  return M.map((r, i) => r[n]! / r[i]!);
}

/**
 * Global minimum-variance portfolio (fully invested, shorting allowed): w = Σ⁻¹1 / 1ᵀΣ⁻¹1.
 * `longOnly` reports whether the closed form happens to be long-only. Null when Σ is singular.
 */
export function minVariance(mu: number[], sigma: number[][]): (WeightPortfolio & { longOnly: boolean }) | null {
  const x = solve(sigma, mu.map(() => 1));
  if (!x) return null;
  const s = x.reduce((a, b) => a + b, 0);
  if (!Number.isFinite(s) || Math.abs(s) < 1e-14) return null;
  const w = x.map((v) => v / s);
  return { ...evalWeights(mu, sigma, w), longOnly: w.every((v) => v >= -1e-12) };
}

/** Lowest-variance equal-weight K-subset by exhaustive search (discrete min-variance baseline). */
export function minVarianceSubset(mu: number[], sigma: number[][], k: number, excluded: number[] = []) {
  const n = mu.length;
  let best: { x: number; p: WeightPortfolio } | null = null;
  for (let x = 0; x < 1 << n; x++) {
    let c = 0; for (let i = 0; i < n; i++) c += (x >> i) & 1;
    if (c !== k || excluded.some((i) => (x >> i) & 1)) continue;
    const p = evalWeights(mu, sigma, mu.map((_, i) => ((x >> i) & 1 ? 1 / k : 0)));
    if (!best || p.vol < best.p.vol - 1e-15) best = { x, p };
  }
  return best;
}

/** Normalised approximation ratio for a minimisation objective: 1 = optimum, 0 = worst bitstring. */
export const approximationRatio = (value: number, fMin: number, fMax: number) => (fMax - fMin < 1e-15 ? 1 : (fMax - value) / (fMax - fMin));
