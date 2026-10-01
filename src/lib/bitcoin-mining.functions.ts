import { createServerFn } from "@tanstack/react-start";

type HashrateResponse = {
  currentHashrate?: number;
  currentDifficulty?: number;
};

type DifficultyResponse = {
  progressPercent?: number;
  difficultyChange?: number;
  estimatedRetargetDate?: number;
  remainingBlocks?: number;
};

type Pool = {
  name?: string;
  slug?: string;
  blockCount?: number;
};

type PoolsResponse = {
  pools?: Pool[];
  blockCount?: number;
};

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
    requestJson<HashrateResponse>("/v1/mining/hashrate/1w"),
    requestJson<DifficultyResponse>("/v1/difficulty-adjustment"),
    requestJson<PoolsResponse>("/v1/mining/pools/1w"),
    fetch("https://mempool.space/api/blocks/tip/height").then(async (response) => {
      if (!response.ok) throw new Error(`mempool.space returned ${response.status}`);
      return Number(await response.text());
    }),
  ]);

  const hashrate = hashrateResult.status === "fulfilled" ? finite(hashrateResult.value.currentHashrate) : null;
  const difficulty = hashrateResult.status === "fulfilled" ? finite(hashrateResult.value.currentDifficulty) : null;
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

  return {
    hashrateEh: hashrate == null ? null : hashrate / 1e18,
    difficultyT: difficulty == null ? null : difficulty / 1e12,
    difficultyChangePercent: finite(adjustment?.difficultyChange),
    progressPercent: finite(adjustment?.progressPercent),
    remainingBlocks: finite(adjustment?.remainingBlocks),
    estimatedRetargetDate: finite(adjustment?.estimatedRetargetDate),
    blockHeight: heightResult.status === "fulfilled" && Number.isFinite(heightResult.value) ? heightResult.value : null,
    topPools,
    updatedAt: new Date().toISOString(),
  };
});
