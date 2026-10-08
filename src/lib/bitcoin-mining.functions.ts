import { createServerFn } from "@tanstack/react-start";

type HashratePoint = { timestamp?: number; avgHashrate?: number };
type DifficultyPoint = { time?: number; difficulty?: number };
type HashrateResponse = {
  hashrates?: HashratePoint[];
  difficulty?: DifficultyPoint[];
  currentHashrate?: number;
  currentDifficulty?: number;
};
type DifficultyResponse = {
  progressPercent?: number;
  difficultyChange?: number;
  estimatedRetargetDate?: number;
  remainingBlocks?: number;
};
type Pool = { name?: string; slug?: string; blockCount?: number };
type PoolsResponse = { pools?: Pool[]; blockCount?: number };

async function requestJson<T>(path: string): Promise<T> {
  const response = await fetch(`https://mempool.space/api${path}`, {
    headers: { accept: "application/json", "user-agent": "quantum-ai-showcase/1.0" },
  });
  if (!response.ok) throw new Error(`mempool.space returned ${response.status}`);
  return (await response.json()) as T;
}
function finite(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export const getBitcoinMiningIntelligence = createServerFn({ method: "GET" }).handler(async () => {
  const [hashrateResult, difficultyResult, poolsResult, heightResult] = await Promise.allSettled([
    requestJson<HashrateResponse>("/v1/mining/hashrate/1m"),
    requestJson<DifficultyResponse>("/v1/difficulty-adjustment"),
    requestJson<PoolsResponse>("/v1/mining/pools/1w"),
    fetch("https://mempool.space/api/blocks/tip/height").then(async (response) => {
      if (!response.ok) throw new Error(`mempool.space returned ${response.status}`);
      return Number(await response.text());
    }),
  ]);
  const hashData = hashrateResult.status === "fulfilled" ? hashrateResult.value : undefined;
  const hashrate = finite(hashData?.currentHashrate);
  const difficulty = finite(hashData?.currentDifficulty);
  const adjustment = difficultyResult.status === "fulfilled" ? difficultyResult.value : undefined;
  const poolData = poolsResult.status === "fulfilled" ? poolsResult.value : undefined;
  const totalBlocks = finite(poolData?.blockCount);
  const topPools = (poolData?.pools ?? []).slice(0, 5).map((pool) => ({
    name: pool.name ?? pool.slug ?? "Unknown",
    blocks: finite(pool.blockCount) ?? 0,
    sharePercent:
      totalBlocks && totalBlocks > 0 && finite(pool.blockCount) != null
        ? ((pool.blockCount as number) / totalBlocks) * 100
        : null,
  }));
  const hashrateHistory = (hashData?.hashrates ?? [])
    .map((p) => ({
      timestamp: finite(p.timestamp),
      valueEh: finite(p.avgHashrate) == null ? null : (p.avgHashrate as number) / 1e18,
    }))
    .filter((p) => p.timestamp != null && p.valueEh != null);
  const difficultyHistory = (hashData?.difficulty ?? [])
    .map((p) => ({
      timestamp: finite(p.time),
      valueT: finite(p.difficulty) == null ? null : (p.difficulty as number) / 1e12,
    }))
    .filter((p) => p.timestamp != null && p.valueT != null);
  return {
    hashrateEh: hashrate == null ? null : hashrate / 1e18,
    difficultyT: difficulty == null ? null : difficulty / 1e12,
    difficultyChangePercent: finite(adjustment?.difficultyChange),
    progressPercent: finite(adjustment?.progressPercent),
    remainingBlocks: finite(adjustment?.remainingBlocks),
    estimatedRetargetDate: finite(adjustment?.estimatedRetargetDate),
    blockHeight:
      heightResult.status === "fulfilled" && Number.isFinite(heightResult.value)
        ? heightResult.value
        : null,
    topPools,
    hashrateHistory,
    difficultyHistory,
    updatedAt: new Date().toISOString(),
  };
});
