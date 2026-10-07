import { createServerFn } from "@tanstack/react-start";

type Pool = { name: string; share: number; blocks: number };

export const getMiningPools = createServerFn({ method: "GET" }).handler(async (): Promise<Pool[]> => {
  const response = await fetch("https://mempool.space/api/v1/mining/pools/24h", {
    headers: { accept: "application/json", "user-agent": "quantum-ai-showcase/1.0" },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Mining pool feed returned HTTP ${response.status}`);
  }

  const payload = (await response.json()) as { pools?: unknown[] } | unknown[];
  const rows: unknown[] = Array.isArray(payload) ? payload : payload.pools ?? [];

  // Normalise the feed into Pool-shaped rows; unknown fields fall back to defaults.
  const normalized: Pool[] = rows
    .map((entry) => {
      const pool = (entry ?? {}) as Record<string, unknown>;
      const name = pool["name"] ?? pool["poolName"] ?? pool["slug"] ?? "Unknown pool";
      const blocks = Number(pool["blockCount"] ?? pool["blocksFound"] ?? pool["blocks"] ?? 0);
      return { name: String(name), blocks, share: 0 };
    })
    .filter((p) => Number.isFinite(p.blocks) && p.blocks > 0);

  const totalBlocks = normalized.reduce((sum, p) => sum + p.blocks, 0);

  return normalized
    .map((p) => ({
      ...p,
      share: totalBlocks > 0 ? (p.blocks / totalBlocks) * 100 : 0,
    }))
    .sort((a, b) => b.blocks - a.blocks)
    .slice(0, 8);
});
