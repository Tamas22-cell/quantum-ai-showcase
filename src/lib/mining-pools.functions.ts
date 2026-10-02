import { createServerFn } from "@tanstack/react-start";

type Pool = { name: string; share: number; blocks: number };

export const getMiningPools = createServerFn({ method: "GET" }).handler(async (): Promise<Pool[]> => {
  const r = await fetch("https://mempool.space/api/v1/mining/pools/24h", {
    headers: { accept: "application/json", "user-agent": "quantum-ai-showcase/1.0" },
  });
  if (!r.ok) throw new Error(`mempool.space returned ${r.status}`);
  const data = await r.json();
  const rows = Array.isArray(data) ? data : Array.isArray(data?.pools) ? data.pools : [];
  const totalBlocks = rows.reduce((sum: number, p: any) => sum + Number(p.blockCount ?? p.blocksFound ?? p.blocks ?? 0), 0);
  return rows.slice(0, 8).map((p: any) => ({
    name: p.name ?? p.slug ?? p.poolName ?? "Unknown pool",
    blocks: Number(p.blockCount ?? p.blocksFound ?? p.blocks ?? 0),
    share: totalBlocks > 0 ? (Number(p.blockCount ?? p.blocksFound ?? p.blocks ?? 0) / totalBlocks) * 100 : 0,
  }));
});
