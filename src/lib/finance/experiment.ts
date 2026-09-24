/**
 * Market data → QUBO → QAOA pipeline. Reuses the tested Module 5 engine unchanged:
 * annualised μ, Σ from the market pipeline become a PortfolioData instance.
 */
import {
  buildQubo, exhaustivePortfolio, portfolioMetrics, runPortfolioQaoa, validatePortfolio, validatePortfolioConfig,
  type PortfolioConfig, type PortfolioData, type PortfolioModel, type PortfolioResult,
} from "@/lib/quantum/portfolio";
import {
  approximationRatio, computeStats, equalWeight, minVariance, minVarianceSubset, sliceRange,
  type DataSource, type MarketStats, type PriceSeries, type RangeId, type WeightPortfolio,
} from "./market";

export type FinanceInput = { symbols: string[]; range: RangeId; model: PortfolioModel; config: PortfolioConfig };
export type FinanceExperiment = {
  source: DataSource; demoSeed?: number; range: RangeId; stats: MarketStats; data: PortfolioData;
  model: PortfolioModel; result: PortfolioResult;
  fMax: number;
  approxRatio: number; // normalised, on ⟨f⟩
  baselines: {
    equalWeight: WeightPortfolio;
    minVariance: (WeightPortfolio & { longOnly: boolean }) | null;
    minVarSubset: { x: number; p: WeightPortfolio } | null;
    exact: WeightPortfolio; qaoaMostLikely: WeightPortfolio; qaoaSampledBest: WeightPortfolio;
  };
};

export function toPortfolioData(stats: MarketStats, source: DataSource): PortfolioData {
  return { names: [...stats.symbols], mu: [...stats.mu], sigma: stats.sigma.map((r) => [...r]), source: source === "demo" ? "synthetic" : "user" };
}

/** Readable validation of the whole workflow before any computation. */
export function validateFinance(series: PriceSeries, input: FinanceInput): string[] {
  const { stats, errors } = computeStats(sliceRange(series, input.range), input.symbols);
  if (errors.length) return errors;
  return [...validatePortfolio(toPortfolioData(stats!, series.source), input.model), ...validatePortfolioConfig(input.config)];
}

const asWeights = (d: PortfolioData, x: number): WeightPortfolio => { const m = portfolioMetrics(d, x); return { weights: m.weights, ret: m.ret, vol: m.vol }; };

export async function runFinanceExperiment(series: PriceSeries, input: FinanceInput, opts: { signal?: AbortSignal; onProgress?: (f: number) => void; demoSeed?: number } = {}): Promise<FinanceExperiment> {
  const errs = validateFinance(series, input);
  if (errs.length) throw new RangeError(errs.join(" "));
  const stats = computeStats(sliceRange(series, input.range), input.symbols).stats!;
  const data = toPortfolioData(stats, series.source);
  const result = await runPortfolioQaoa(data, input.model, input.config, { signal: opts.signal, onProgress: opts.onProgress });
  const table = exhaustivePortfolio(buildQubo(data, input.model), input.model).table;
  let fMax = -Infinity; for (const v of table) fMax = Math.max(fMax, v);
  return {
    source: series.source, demoSeed: opts.demoSeed, range: input.range, stats, data, model: structuredClone(input.model), result, fMax,
    approxRatio: approximationRatio(result.expectedObjective, result.exact.value, fMax),
    baselines: {
      equalWeight: equalWeight(stats.mu, stats.sigma),
      minVariance: minVariance(stats.mu, stats.sigma),
      minVarSubset: minVarianceSubset(stats.mu, stats.sigma, input.model.k, input.model.excluded),
      exact: asWeights(data, result.exact.assignment),
      qaoaMostLikely: asWeights(data, result.mostLikely.x),
      qaoaSampledBest: asWeights(data, result.sampledBest.x),
    },
  };
}
