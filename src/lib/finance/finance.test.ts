import { describe, expect, it } from "vitest";
import {
  DEMO_UNIVERSE,
  MIN_RETURNS,
  approximationRatio,
  computeStats,
  demoPrices,
  equalWeight,
  minVariance,
  minVarianceSubset,
  parsePriceCsv,
  parseProviderPayload,
  providerStatus,
  runFinanceExperiment,
  simpleReturns,
  sliceRange,
  solve,
  toPortfolioData,
  validateFinance,
  type PriceSeries,
} from "./index";
import { buildQubo, quboValue } from "@/lib/quantum";
import {
  buildReport,
  runSource,
  QUANTUM_LABEL,
  PAST_PERFORMANCE,
  NO_GUARANTEE,
  NO_FIN_ADVICE,
  NO_ADVANTAGE,
} from "@/lib/report";
import { renderReportPdf } from "@/lib/report/pdf";

const csv = (rows: number, cols = ["A", "B", "C"]) => {
  const lines = [`date,${cols.join(",")}`];
  for (let t = 0; t < rows; t++) {
    const d = new Date(Date.UTC(2024, 0, 1 + t)).toISOString().slice(0, 10);
    lines.push(
      [
        d,
        ...cols.map((_, i) =>
          (100 + i * 10 + Math.sin(t * (i + 1)) * 3 + t * 0.1 * (i + 1)).toFixed(4),
        ),
      ].join(","),
    );
  }
  return lines.join("\n");
};
const model = { riskAversion: 2, k: 2, penalty: 1, excluded: [] as number[] };
const cfg = { p: 1, seed: 7, restarts: 2, maxIter: 80, shots: 1000 };
const syms4 = DEMO_UNIVERSE.slice(0, 4).map((a) => a.symbol);

describe("Finance — demo data", () => {
  it("loads a seeded, deterministic, labelled demo universe", () => {
    const a = demoPrices(42),
      b = demoPrices(42),
      c = demoPrices(43);
    expect(a).toEqual(b);
    expect(a.prices).not.toEqual(c.prices);
    expect(a.source).toBe("demo");
    expect(a.symbols.every((s) => s.startsWith("SYN-"))).toBe(true);
    expect(a.prices.every((p) => p.length === a.dates.length && p.every((v) => v > 0))).toBe(true);
    expect(new Set(a.dates).size).toBe(a.dates.length);
  });
  it("range slicing keeps the last N returns", () => {
    const s = sliceRange(demoPrices(1), "3m");
    expect(s.dates.length).toBe(64);
    expect(sliceRange(demoPrices(1), "all").dates.length).toBe(757);
  });
});

describe("Finance — CSV parsing", () => {
  it("parses valid prices and sorts descending files ascending", () => {
    const text = csv(30);
    const r = parsePriceCsv(text);
    expect(r.errors).toEqual([]);
    expect(r.series!.symbols).toEqual(["A", "B", "C"]);
    const [head, ...rest] = text.split("\n");
    const rev = parsePriceCsv([head, ...rest.reverse()].join("\n"));
    expect(rev.series!.dates).toEqual(r.series!.dates);
  });
  it("rejects malformed files, missing values, bad prices and short history", () => {
    expect(parsePriceCsv("").errors[0]).toMatch(/empty/);
    expect(parsePriceCsv("x,A,B\n2024-01-01,1,2").errors[0]).toMatch(/date/);
    const lines = csv(30).split("\n");
    const miss = [...lines];
    miss[5] = miss[5]!.replace(/,[^,]+$/, ",");
    expect(parsePriceCsv(miss.join("\n")).errors[0]).toMatch(/missing value/);
    const neg = [...lines];
    neg[5] = neg[5]!.replace(/,[^,]+$/, ",-3");
    expect(parsePriceCsv(neg.join("\n")).errors[0]).toMatch(/positive price/);
    const bad = [...lines];
    bad[3] = "01/02/2024,1,2,3";
    expect(parsePriceCsv(bad.join("\n")).errors[0]).toMatch(/YYYY-MM-DD/);
    const dup = [...lines];
    dup[4] = dup[3]!;
    expect(parsePriceCsv(dup.join("\n")).errors[0]).toMatch(/Duplicate/);
    expect(parsePriceCsv(csv(MIN_RETURNS)).errors[0]).toMatch(/Insufficient history/);
    expect(
      parsePriceCsv(
        "date,A,A\n" +
          csv(30)
            .split("\n")
            .slice(1)
            .map((l) => l.split(",").slice(0, 3).join(","))
            .join("\n"),
      ).errors[0],
    ).toMatch(/unique/);
  });
});

describe("Finance — returns, covariance, correlation", () => {
  it("simple returns", () => {
    const r = simpleReturns([100, 110, 99]);
    expect(r[0]).toBeCloseTo(0.1, 14);
    expect(r[1]).toBeCloseTo(-0.1, 14);
  });
  it("matches hand-computed annualised statistics", () => {
    const prices = [[100], [100]];
    const ra = [0.01, -0.02, 0.03, 0.0],
      rb = [0.02, 0.01, -0.01, 0.0];
    const reps = 6; // 24 returns
    for (let k = 0; k < reps; k++)
      for (let t = 0; t < 4; t++) {
        prices[0]!.push(prices[0]!.at(-1)! * (1 + ra[t]!));
        prices[1]!.push(prices[1]!.at(-1)! * (1 + rb[t]!));
      }
    const dates = prices[0]!.map((_, t) =>
      new Date(Date.UTC(2024, 0, 1 + t)).toISOString().slice(0, 10),
    );
    const s: PriceSeries = { dates, symbols: ["A", "B"], prices, source: "csv" };
    const { stats, errors } = computeStats(s, ["A", "B"], 1);
    expect(errors).toEqual([]);
    const T = 24,
      ma = 0.005,
      mb = 0.005;
    const cov = (x: number[], mx: number, y: number[], my: number) =>
      (reps * x.reduce((a, v, t) => a + (v - mx) * (y[t]! - my), 0)) / (T - 1);
    expect(stats!.mu[0]).toBeCloseTo(ma, 12);
    expect(stats!.mu[1]).toBeCloseTo(mb, 12);
    expect(stats!.sigma[0]![0]).toBeCloseTo(cov(ra, ma, ra, ma), 12);
    expect(stats!.sigma[0]![1]).toBeCloseTo(cov(ra, ma, rb, mb), 12);
    expect(stats!.corr[0]![1]).toBeCloseTo(
      cov(ra, ma, rb, mb) / Math.sqrt(cov(ra, ma, ra, ma) * cov(rb, mb, rb, mb)),
      12,
    );
    expect(stats!.corr[1]![1]).toBe(1);
    expect(stats!.vol[0]).toBeCloseTo(Math.sqrt(cov(ra, ma, ra, ma)), 12);
  });
  it("demo statistics are symmetric, PSD-valid and correlations bounded", () => {
    const { stats } = computeStats(demoPrices(42), syms4);
    for (let i = 0; i < 4; i++)
      for (let j = 0; j < 4; j++) {
        expect(stats!.sigma[i]![j]).toBeCloseTo(stats!.sigma[j]![i]!, 14);
        expect(Math.abs(stats!.corr[i]![j]!)).toBeLessThanOrEqual(1 + 1e-12);
      }
    expect(stats!.normalized[0]![0]).toBe(100);
  });
  it("rejects too many assets, insufficient history and constant prices", () => {
    const d = demoPrices(1);
    expect(computeStats(d, d.symbols.slice(0, 9)).errors[0]).toMatch(/Too many assets/);
    expect(computeStats(d, ["SYN-CRY1"]).errors[0]).toMatch(/at least 2/);
    const short = {
      ...d,
      dates: d.dates.slice(0, 10),
      prices: d.prices.map((p) => p.slice(0, 10)),
    };
    expect(computeStats(short, syms4).errors.join(" ")).toMatch(/Insufficient history/);
    const flat = { ...d, prices: d.prices.map((p, i) => (i === 0 ? p.map(() => 5) : p)) };
    expect(computeStats(flat, syms4).errors[0]).toMatch(/zero variance/);
  });
});

describe("Finance — QUBO, baselines, QAOA", () => {
  it("QUBO from market data equals the direct objective", () => {
    const { stats } = computeStats(demoPrices(42), syms4);
    const data = toPortfolioData(stats!, "demo"),
      q = buildQubo(data, model);
    for (let x = 0; x < 16; x++) {
      const b = (i: number) => (x >> i) & 1;
      let v = model.penalty * ([0, 1, 2, 3].reduce((a, i) => a + b(i), 0) - model.k) ** 2;
      for (let i = 0; i < 4; i++) {
        v -= data.mu[i]! * b(i);
        for (let j = 0; j < 4; j++) v += model.riskAversion * data.sigma[i]![j]! * b(i) * b(j);
      }
      expect(quboValue(q, x)).toBeCloseTo(v, 10);
    }
  });
  it("classical baselines: equal weight, closed-form min variance, subset search", () => {
    const mu = [0.1, 0.2],
      sigma = [
        [0.04, 0.006],
        [0.006, 0.09],
      ];
    const ew = equalWeight(mu, sigma);
    expect(ew.ret).toBeCloseTo(0.15, 12);
    expect(ew.vol).toBeCloseTo(Math.sqrt(0.25 * (0.04 + 0.09 + 2 * 0.006)), 12);
    const mv = minVariance(mu, sigma)!;
    const w0 = (0.09 - 0.006) / (0.04 + 0.09 - 2 * 0.006);
    expect(mv.weights[0]).toBeCloseTo(w0, 12);
    expect(mv.longOnly).toBe(true);
    expect(mv.vol).toBeLessThanOrEqual(ew.vol);
    expect(
      minVariance(mu, [
        [1, 1],
        [1, 1],
      ]),
    ).toBeNull();
    expect(
      solve(
        [
          [2, 0],
          [0, 4],
        ],
        [2, 2],
      ),
    ).toEqual([1, 0.5]);
    const sub = minVarianceSubset(
      [0, 0, 0],
      [
        [0.04, 0, 0],
        [0, 0.01, 0],
        [0, 0, 0.09],
      ],
      1,
    )!;
    expect(sub.x).toBe(0b010);
    expect(approximationRatio(2, 2, 10)).toBe(1);
    expect(approximationRatio(10, 2, 10)).toBe(0);
  });
  it("QAOA integration: normalised, bounded, reproducible", async () => {
    const d = demoPrices(42),
      input = { symbols: syms4, range: "1y" as const, model, config: cfg };
    const a = await runFinanceExperiment(d, input),
      b = await runFinanceExperiment(d, input);
    expect(a.result.probs.reduce((s, v) => s + v, 0)).toBeCloseTo(1, 10);
    expect(a.result.expectedObjective).toBeGreaterThanOrEqual(a.result.exact.value - 1e-9);
    expect(a.approxRatio).toBeGreaterThan(0);
    expect(a.approxRatio).toBeLessThanOrEqual(1 + 1e-12);
    expect(a.result.pOptimal).toBeGreaterThan(1 / 16);
    expect(a.baselines.exact.weights.filter((w) => w > 0)).toHaveLength(2);
    expect(Array.from(a.result.counts)).toEqual(Array.from(b.result.counts));
    expect(a.result.gammas).toEqual(b.result.gammas);
  });
  it("validates optimisation parameters and rejects cleanly", async () => {
    const d = demoPrices(42);
    expect(
      validateFinance(d, { symbols: syms4, range: "1y", model: { ...model, k: 9 }, config: cfg })
        .length,
    ).toBeGreaterThan(0);
    expect(
      validateFinance(d, { symbols: syms4, range: "1y", model, config: { ...cfg, p: 9 } }).length,
    ).toBeGreaterThan(0);
    await expect(
      runFinanceExperiment(d, {
        symbols: syms4,
        range: "1y",
        model: { ...model, penalty: -1 },
        config: cfg,
      }),
    ).rejects.toThrow(RangeError);
  });
});

describe("Finance — live provider & reporting", () => {
  it("reports 'not configured' with no env and never exposes values", () => {
    const s = providerStatus({});
    expect(s.configured).toBe(false);
    expect(s.providers.map((p) => p.missing.length)).toEqual([2, 2, 2]);
    const c = providerStatus({
      FINANCE_CRYPTO_API_URL: "https://x",
      FINANCE_CRYPTO_API_KEY: "secret",
    });
    expect(c.configured).toBe(true);
    expect(JSON.stringify(c)).not.toContain("secret");
    expect(JSON.stringify(c)).not.toContain("https://x");
  });
  it("validates provider payloads", () => {
    expect(parseProviderPayload(null).errors.length).toBe(1);
    expect(parseProviderPayload({ dates: [], symbols: ["A"], prices: 1 }).errors[0]).toMatch(
      /malformed/,
    );
    const d = demoPrices(3);
    const ok = parseProviderPayload({
      dates: d.dates,
      symbols: d.symbols.slice(0, 2),
      prices: d.prices.slice(0, 2),
    });
    expect(ok.series!.source).toBe("live");
  });
  it("produces a complete PDF report with financial disclaimers", async () => {
    const snap = await runSource("finance", {
      assets: 4,
      range: "1y",
      k: 2,
      riskAversion: 2,
      penalty: 1,
      p: 1,
      seed: 42,
    });
    const doc = buildReport(snap, "2026-09-24T12:00:00.000Z");
    for (const x of [QUANTUM_LABEL, PAST_PERFORMANCE, NO_GUARANTEE, NO_FIN_ADVICE, NO_ADVANTAGE])
      expect(doc.disclaimers).toContain(x);
    expect(JSON.stringify(doc)).not.toMatch(/NaN|undefined/);
    expect(renderReportPdf(doc).getNumberOfPages()).toBeGreaterThan(0);
  }, 30_000);
});
