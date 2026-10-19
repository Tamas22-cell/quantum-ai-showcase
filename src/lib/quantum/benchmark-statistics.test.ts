import { describe, expect, it } from "vitest";
import { parseBenchmarkTrials, summarizeBenchmarkTrials } from "./benchmark-statistics";

describe("benchmark trial analysis", () => {
  it("parses comma, newline and semicolon separated results", () => {
    expect(parseBenchmarkTrials("1, 2; 3\n4")).toEqual([1, 2, 3, 4]);
  });
  it("rejects missing, nonfinite and insufficient trials", () => {
    expect(() => parseBenchmarkTrials("")).toThrow();
    expect(() => parseBenchmarkTrials("42")).toThrow();
    expect(() => parseBenchmarkTrials("1, NaN")).toThrow();
    expect(() => summarizeBenchmarkTrials([1, Infinity])).toThrow();
  });
  it("computes unbiased sample deviation and median", () => {
    const s = summarizeBenchmarkTrials([1, 2, 3, 4]);
    expect(s.mean).toBe(2.5);
    expect(s.median).toBe(2.5);
    expect(s.sampleStdDev).toBeCloseTo(Math.sqrt(5 / 3));
    expect(s.ci95).toBeNull();
  });
  it("reports a 95% approximate interval for >=30 identical trials", () => {
    const s = summarizeBenchmarkTrials(Array(30).fill(7));
    expect(s.ci95).toEqual({ lower: 7, upper: 7 });
  });
  it("does not change input trial ordering", () => {
    const values = [8, 2, 5];
    summarizeBenchmarkTrials(values);
    expect(values).toEqual([8, 2, 5]);
  });
});
