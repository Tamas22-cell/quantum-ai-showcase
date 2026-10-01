import { createServerFn } from "@tanstack/react-start";

type Mempool = { count?: number; vsize?: number; total_fee?: number };
type Fees = { fastestFee?: number; halfHourFee?: number; hourFee?: number; economyFee?: number; minimumFee?: number };
type Block = { height?: number; timestamp?: number; tx_count?: number; size?: number; weight?: number; extras?: { totalFees?: number } };

async function json<T>(path: string): Promise<T> {
  const response = await fetch(`https://mempool.space/api${path}`, { headers: { accept: "application/json", "user-agent": "quantum-ai-showcase/1.0" } });
  if (!response.ok) throw new Error(`mempool.space returned ${response.status}`);
  return response.json() as Promise<T>;
}

export const getBitcoinNetworkActivity = createServerFn({ method: "GET" }).handler(async () => {
  const [mempoolResult, feesResult, blocksResult] = await Promise.allSettled([
    json<Mempool>("/mempool"),
    json<Fees>("/v1/fees/recommended"),
    json<Block[]>("/v1/blocks"),
  ]);
  const mempool = mempoolResult.status === "fulfilled" ? mempoolResult.value : null;
  const fees = feesResult.status === "fulfilled" ? feesResult.value : null;
  const blocks = blocksResult.status === "fulfilled" ? blocksResult.value.slice(0, 6) : [];
  const intervals = blocks.slice(0, -1).map((b, i) => b.timestamp && blocks[i + 1]?.timestamp ? b.timestamp - (blocks[i + 1].timestamp as number) : null).filter((v): v is number => v != null && v > 0);
  const avgBlockIntervalMinutes = intervals.length ? intervals.reduce((a, b) => a + b, 0) / intervals.length / 60 : null;
  const latest = blocks[0];
  return {
    mempoolTransactions: mempool?.count ?? null,
    mempoolVsizeMb: typeof mempool?.vsize === "number" ? mempool.vsize / 1_000_000 : null,
    mempoolFeesBtc: typeof mempool?.total_fee === "number" ? mempool.total_fee / 100_000_000 : null,
    fastestFee: fees?.fastestFee ?? null,
    halfHourFee: fees?.halfHourFee ?? null,
    hourFee: fees?.hourFee ?? null,
    economyFee: fees?.economyFee ?? null,
    minimumFee: fees?.minimumFee ?? null,
    blockHeight: latest?.height ?? null,
    latestBlockTx: latest?.tx_count ?? null,
    avgBlockIntervalMinutes,
    recentBlocks: blocks.map((b) => ({ height: b.height ?? null, timestamp: b.timestamp ?? null, txCount: b.tx_count ?? null, sizeMb: typeof b.size === "number" ? b.size / 1_000_000 : null, feesBtc: typeof b.extras?.totalFees === "number" ? b.extras.totalFees / 100_000_000 : null })),
    updatedAt: new Date().toISOString(),
  };
});
