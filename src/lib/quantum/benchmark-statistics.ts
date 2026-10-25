/**
 * Descriptive analysis for independent repetitions of the SAME benchmark configuration.
 * A normal-approximation confidence interval describes uncertainty of the sample mean;
 * it is not a proof of quantum advantage and is not suited to tiny samples.
 */
export type BenchmarkSummary = {
  n: number;
  mean: number;
  median: number;
  sampleStdDev: number;
  min: number;
  max: number;
  ci95: { lower: number; upper: number } | null;
};

export function parseBenchmarkTrials(input: string): number[] {
  if (!input.trim()) throw new Error("Enter at least two independent trial results.");
  const tokens = input.split(/[\s,;]+/).filter(Boolean);
  if (tokens.length < 2) throw new Error("At least two independent trials are required.");
  if (tokens.length > 10000) throw new Error("A maximum of 10,000 trials is supported.");
  const values = tokens.map((token) => Number(token));
  if (values.some((value) => !Number.isFinite(value))) {
    throw new Error("All trial results must be finite numbers.");
  }
  return values;
}

export function summarizeBenchmarkTrials(values: readonly number[]): BenchmarkSummary {
  if (values.length < 2 || values.length > 10000 || values.some((v) => !Number.isFinite(v))) {
    throw new Error("Provide 2–10,000 finite independent trial results.");
  }
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  const mean = values.reduce((sum, value) => sum + value, 0) / n;
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (n - 1);
  const sampleStdDev = Math.sqrt(variance);
  const median = n % 2 ? sorted[(n - 1) / 2]! : (sorted[n / 2 - 1]! + sorted[n / 2]!) / 2;
  // Normal approximation is intentionally withheld for n < 30.
  const margin = n >= 30 ? 1.96 * sampleStdDev / Math.sqrt(n) : null;
  return {
    n, mean, median, sampleStdDev, min: sorted[0]!, max: sorted[n - 1]!,
    ci95: margin === null ? null : { lower: mean - margin, upper: mean + margin },
  };
}
