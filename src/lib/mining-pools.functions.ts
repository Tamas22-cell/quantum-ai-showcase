import { createServerFn } from "@tanstack/react-start";

type Pool = { name: string; share: number; blocks: number };

export const getMiningPools = createServerFn({ method: "GET" }).handler(async (): Promise<Pool[]> => {
  const base = "https://mempool.space/api";
  const listResponse = await fetch(`${base}/v1/mining/pools/24h`, {
    headers: { accept: "application/json", "user-agent": "quantum-ai-showcase/1.0" },
  });
  if (!listResponse.ok) throw new Error(`mempool.space returned ${listResponse.status}`);

  const data = await listResponse.json();
  const rows = Array.isArray(data) ? data : Array.isArray(data?.pools) ? data.pools : [];
  const top = rows.slice(0, 8);

  const pools = await Promise.all(top.map(async (p: any) => {
    const slug = p.slug;
    let share = 0;
    if (slug) {
      try {
        const detailResponse = await fetch(`${base}/v1/mining/pool/${encodeURIComponent(slug)}`, {
          headers: { accept: "application/json", "user-agent": "quantum-ai-showcase/1.0" },
        });
        if (detailResponse.ok) {
          const detail = await detailResponse.json();
          const rawShare = Number(detail?.blockShare?.["24h"] ?? 0);
          share = rawShare <= 1 ? rawShare * 100 : rawShare;
        }
      } catch {
        share = 0;
      }
    }
    return {
      name: p.name ?? p.slug ?? "Unknown pool",
      blocks: Number(p.blockCount ?? p.blocksFound ?? p.blocks ?? 0),
      share,
    };
  }));

  return pools.sort((a, b) => b.share - a.share);
});
