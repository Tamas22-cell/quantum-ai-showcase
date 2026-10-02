import { createServerFn } from "@tanstack/react-start";

type RecentTx = {
  txid?: string;
  fee?: number;
  vsize?: number;
  value?: number;
};
type PriceResponse = { USD?: number };

const WHALE_THRESHOLD_BTC = 10;

async function mempoolJson<T>(path: string): Promise<T> {
  const r = await fetch(`https://mempool.space/api${path}`, {
    headers: {
      accept: "application/json",
      "user-agent": "quantum-ai-showcase/1.0",
    },
  });
  if (!r.ok) throw new Error(`mempool.space returned ${r.status}`);
  return r.json() as Promise<T>;
}

export const getWhaleFlow = createServerFn({ method: "GET" }).handler(async () => {
  const [recentResult, priceResult] = await Promise.allSettled([
    mempoolJson<RecentTx[]>("/mempool/recent"),
    mempoolJson<PriceResponse>("/v1/prices"),
  ]);

  if (recentResult.status !== "fulfilled") {
    throw new Error("Unable to load recent Bitcoin mempool transactions");
  }

  const recent = recentResult.value;
  const btcUsd =
    priceResult.status === "fulfilled" && typeof priceResult.value.USD === "number"
      ? priceResult.value.USD
      : null;

  // /mempool/recent already exposes each transaction's transferred output value
  // in satoshis. Using it directly avoids a burst of per-TX detail requests that
  // can be rate-limited and previously caused an empty sample / all-zero metrics.
  const mapped = recent.flatMap((t) => {
    if (!t.txid || typeof t.value !== "number" || t.value <= 0) return [];

    const valueBtc = t.value / 100_000_000;
    const feeRate =
      typeof t.fee === "number" && typeof t.vsize === "number" && t.vsize > 0
        ? t.fee / t.vsize
        : null;

    return [
      {
        txid: t.txid,
        valueBtc,
        valueUsd: btcUsd == null ? null : valueBtc * btcUsd,
        feeRate,
        isWhale: valueBtc >= WHALE_THRESHOLD_BTC,
      },
    ];
  });

  const ranked = [...mapped].sort((a, b) => b.valueBtc - a.valueBtc);
  const whales = ranked.filter((t) => t.isWhale);
  const whaleVolumeBtc = whales.reduce((sum, t) => sum + t.valueBtc, 0);
  const totalSampleBtc = mapped.reduce((sum, t) => sum + t.valueBtc, 0);

  return {
    thresholdBtc: WHALE_THRESHOLD_BTC,
    sampleTransactions: mapped.length,
    whaleTransactions: whales.length,
    whaleVolumeBtc,
    whaleVolumeUsd: btcUsd == null ? null : whaleVolumeBtc * btcUsd,
    totalSampleBtc,
    whaleSharePct:
      totalSampleBtc > 0 ? (whaleVolumeBtc / totalSampleBtc) * 100 : null,
    btcUsd,
    largest: ranked.slice(0, 6),
    updatedAt: new Date().toISOString(),
    methodology:
      "Large-transfer detector over the latest public Bitcoin mempool sample. Transfer values come directly from mempool.space recent-transaction output totals. It does not classify exchange wallets and must not be interpreted as exchange inflow/outflow.",
  };
});
