import { describe, expect, it } from "vitest";
import { ANNUAL_RETURNS, ASSET_WEIGHTS, METRICS, STRATEGIES, STUDY_SCOPE, SUPPLIED_WEIGHT_TOTAL } from "./dwave-reference";

describe("illustrative finance reference", () => {
  it("preserves the supplied summary metrics without deriving new results", () => {
    expect(METRICS.map(m => [...m.values])).toEqual([
      [85.24, 70.5, 12.36], [35.54, 35.52, 42.18], [1.913, 1.68, 0.293],
      [3.082, 2.636, 0.451], [-17.63, -21.85, -48.32], [2.521, 2.226, 1.124],
    ]);
    expect(STUDY_SCOPE).toEqual({ assets: 30, windows: 18, observations: 378 });
  });
  it("contains only the four supplied annual periods, retaining the YTD label", () => {
    expect(ANNUAL_RETURNS.map(r => [...r.values])).toEqual([
      [-12.34, -15.61, -28.43], [94.21, 78.36, 36.18], [41.73, 32.15, 8.76], [22.18, 15.84, 4.23],
    ]);
    expect(ANNUAL_RETURNS[3]?.period).toBe("2025 YTD");
    expect(STRATEGIES.map(s => s.id)).toEqual(["annealing", "exact", "equal"]);
  });
  it("does not fill in or normalize missing asset allocations", () => {
    expect(ASSET_WEIGHTS).toHaveLength(15);
    expect(SUPPLIED_WEIGHT_TOTAL).toBe(84.61);
    expect(ASSET_WEIGHTS[0]).toEqual({ symbol: "BTC", weight: 18.42 });
    expect(ASSET_WEIGHTS[14]).toEqual({ symbol: "XRP", weight: 1.96 });
  });
});