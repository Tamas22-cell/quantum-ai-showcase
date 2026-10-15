/** User-supplied illustrative figures, not computed results or hardware output. */
export const STRATEGIES = [
  { id: "annealing", label: "Simulated annealing", short: "SA", color: "text-primary", fill: "fill-primary", bar: "bg-primary" },
  { id: "exact", label: "Exact solver", short: "Exact", color: "text-research-violet", fill: "fill-research-violet", bar: "bg-research-violet" },
  { id: "equal", label: "Equal weight", short: "EW", color: "text-amber", fill: "fill-amber", bar: "bg-amber" },
] as const;
export type StrategyId = typeof STRATEGIES[number]["id"];
export const METRICS = [
  { label: "Annualized return", values: [85.24, 70.50, 12.36], unit: "%", digits: 2 },
  { label: "Volatility", values: [35.54, 35.52, 42.18], unit: "%", digits: 2 },
  { label: "Sharpe ratio", values: [1.913, 1.680, 0.293], unit: "", digits: 3 },
  { label: "Sortino ratio", values: [3.082, 2.636, 0.451], unit: "", digits: 3 },
  { label: "Max drawdown", values: [-17.63, -21.85, -48.32], unit: "%", digits: 2 },
  { label: "Final equity", values: [2.521, 2.226, 1.124], unit: "x", digits: 3 },
] as const;
export const ANNUAL_RETURNS = [
  { period: "2022", values: [-12.34, -15.61, -28.43] },
  { period: "2023", values: [94.21, 78.36, 36.18] },
  { period: "2024", values: [41.73, 32.15, 8.76] },
  { period: "2025 YTD", values: [22.18, 15.84, 4.23] },
] as const;
export const ASSET_WEIGHTS = [
  { symbol: "BTC", weight: 18.42 }, { symbol: "ETH", weight: 15.36 },
  { symbol: "SOL", weight: 8.21 }, { symbol: "ADA", weight: 6.14 },
  { symbol: "SUI", weight: 5.62 }, { symbol: "JUP", weight: 4.98 },
  { symbol: "AVAX", weight: 4.21 }, { symbol: "LINK", weight: 3.87 },
  { symbol: "MATIC", weight: 3.24 }, { symbol: "DOT", weight: 2.91 },
  { symbol: "ATOM", weight: 2.76 }, { symbol: "LTC", weight: 2.54 },
  { symbol: "UNI", weight: 2.31 }, { symbol: "BCH", weight: 2.08 },
  { symbol: "XRP", weight: 1.96 },
] as const;
export const SUPPLIED_WEIGHT_TOTAL = Number(ASSET_WEIGHTS.reduce((sum, asset) => sum + asset.weight, 0).toFixed(2));
export const STUDY_SCOPE = { assets: 30, windows: 18, observations: 378 } as const;