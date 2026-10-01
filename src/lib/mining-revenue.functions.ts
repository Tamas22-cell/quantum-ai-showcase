import { createServerFn } from "@tanstack/react-start";

type Block = { height?: number; timestamp?: number; tx_count?: number; extras?: { totalFees?: number } };
type HashrateResponse = { currentHashrate?: number };

async function json<T>(path: string): Promise<T> {
  const response = await fetch(`https://mempool.space/api${path}`, { headers: { accept: "application/json", "user-agent": "quantum-ai-showcase/1.0" } });
  if (!response.ok) throw new Error(`mempool.space returned ${response.status}`);
  return response.json() as Promise<T>;
}

export const getMiningRevenueData = createServerFn({ method: "GET" }).handler(async () => {
  const [blocksResult, hashResult] = await Promise.allSettled([
    json<Block[]>("/v1/blocks"),
    json<HashrateResponse>("/v1/mining/hashrate/1m"),
  ]);
  const blocks = blocksResult.status === "fulfilled" ? blocksResult.value.slice(0, 10) : [];
  const hash = hashResult.status === "fulfilled" ? hashResult.value : null;
  const subsidyBtc = 3.125;
  const recentBlocks = blocks.map((b) => {
    const feesBtc = typeof b.extras?.totalFees === "number" ? b.extras.totalFees / 100_000_000 : null;
    return { height: b.height ?? null, timestamp: b.timestamp ?? null, txCount: b.tx_count ?? null, feesBtc, totalRewardBtc: feesBtc == null ? null : subsidyBtc + feesBtc };
  });
  const feeValues = recentBlocks.map((b) => b.feesBtc).filter((v): v is number => v != null);
  const avgFeesBtc = feeValues.length ? feeValues.reduce((a, b) => a + b, 0) / feeValues.length : null;
  const avgRewardBtc = avgFeesBtc == null ? null : subsidyBtc + avgFeesBtc;
  const feeSharePercent = avgRewardBtc && avgFeesBtc != null ? avgFeesBtc / avgRewardBtc * 100 : null;
  const timestamps = recentBlocks.map((b) => b.timestamp).filter((v): v is number => v != null);
  const intervals = timestamps.slice(0, -1).map((t, i) => t - timestamps[i + 1]).filter((v) => v > 0);
  const avgBlockMinutes = intervals.length ? intervals.reduce((a, b) => a + b, 0) / intervals.length / 60 : null;
  const estimatedBlocksPerDay = avgBlockMinutes && avgBlockMinutes > 0 ? 1440 / avgBlockMinutes : null;
  return {
    subsidyBtc,
    avgFeesBtc,
    avgRewardBtc,
    feeSharePercent,
    avgBlockMinutes,
    estimatedBlocksPerDay,
    estimatedDailyIssuanceBtc: estimatedBlocksPerDay == null ? null : estimatedBlocksPerDay * subsidyBtc,
    estimatedDailyMinerRevenueBtc: estimatedBlocksPerDay == null || avgRewardBtc == null ? null : estimatedBlocksPerDay * avgRewardBtc,
    networkHashrateEh: typeof hash?.currentHashrate === "number" ? hash.currentHashrate / 1e18 : null,
    recentBlocks,
    updatedAt: new Date().toISOString(),
  };
});
