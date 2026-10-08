import { createServerFn } from "@tanstack/react-start";

type Pool = { name: string; share: number; blocks: number };

export const getMiningPools = createServerFn({ method: "GET" }).handler(
  async (): Promise<Pool[]> => {
    const response = await fetch("https://mempool.space/api/v1/mining/pools/24h", {
      headers: { accept: "application/json", "user-agent": "quantum-ai-showcase/1.0" },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(`Mining pool feed returned HTTP ${response.status}`);
    }

    const payload: unknown = await response.json();
    const source = payload && typeof payload === "object" ? payload as { pools?: unknown } : null;
    const rows = Array.isArray(payload)
      ? payload
      : Array.isArray(source?.pools)
        ? source.pools
        : [];

    const normalized = (rows as unknown[])
      .map((item) => {
        const p = item && typeof item === "object" ? item as Record<string, unknown> : {};
        return {
          name: String(p.name ?? p.poolName ?? p.slug ?? "Unknown pool"),
          blocks: Number(p.blockCount ?? p.blocksFound ?? p.blocks ?? 0),
        };
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
  },
);
