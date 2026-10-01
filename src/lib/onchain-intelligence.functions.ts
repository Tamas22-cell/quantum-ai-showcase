import { createServerFn } from "@tanstack/react-start";

type RecentTx = { txid?: string; fee?: number; vsize?: number; value?: number };
type Block = { height?: number; timestamp?: number; tx_count?: number; extras?: { totalFees?: number } };
type Lightning = { latest?: { channel_count?: number; node_count?: number; total_capacity?: number }; channel_count?: number; node_count?: number; total_capacity?: number };

async function json<T>(path: string): Promise<T> {
  const r = await fetch(`https://mempool.space/api${path}`, { headers: { accept: "application/json", "user-agent": "quantum-ai-showcase/1.0" } });
  if (!r.ok) throw new Error(`mempool.space returned ${r.status}`);
  return r.json() as Promise<T>;
}

export const getOnchainIntelligence = createServerFn({ method: "GET" }).handler(async () => {
  const [txResult, blockResult, lightningResult] = await Promise.allSettled([
    json<RecentTx[]>("/mempool/recent"),
    json<Block[]>("/v1/blocks"),
    json<Lightning>("/v1/lightning/statistics/latest"),
  ]);
  const txs = txResult.status === "fulfilled" ? txResult.value : [];
  const blocks = blockResult.status === "fulfilled" ? blockResult.value.slice(0, 6) : [];
  const lightning = lightningResult.status === "fulfilled" ? lightningResult.value : null;
  const ln = lightning?.latest ?? lightning;
  const recentValueBtc = txs.reduce((s, t) => s + (typeof t.value === "number" ? t.value : 0), 0) / 100_000_000;
  const recentFeesBtc = txs.reduce((s, t) => s + (typeof t.fee === "number" ? t.fee : 0), 0) / 100_000_000;
  const avgRecentFeeRate = txs.length ? txs.reduce((s, t) => s + (t.fee && t.vsize ? t.fee / t.vsize : 0), 0) / txs.length : null;
  const blockTx = blocks.reduce((s, b) => s + (b.tx_count ?? 0), 0);
  const blockFees = blocks.reduce((s, b) => s + (b.extras?.totalFees ?? 0), 0) / 100_000_000;
  return {
    recentTxCount: txs.length,
    recentValueBtc,
    recentFeesBtc,
    avgRecentFeeRate,
    sampledBlockTransactions: blockTx,
    sampledBlockFeesBtc: blockFees,
    lightningNodes: ln?.node_count ?? null,
    lightningChannels: ln?.channel_count ?? null,
    lightningCapacityBtc: typeof ln?.total_capacity === "number" ? ln.total_capacity / 100_000_000 : null,
    recentTransactions: txs.slice(0, 6).map(t => ({ txid: t.txid ?? "", valueBtc: typeof t.value === "number" ? t.value / 100_000_000 : null, feeRate: t.fee && t.vsize ? t.fee / t.vsize : null })),
    updatedAt: new Date().toISOString(),
  };
});
