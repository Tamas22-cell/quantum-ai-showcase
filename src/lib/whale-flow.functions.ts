import { createServerFn } from "@tanstack/react-start";

type RecentTx = { txid?: string; fee?: number; vsize?: number; value?: number };
type PriceResponse = { USD?: number };

const WHALE_THRESHOLD_BTC = 10;

async function mempoolJson<T>(path: string): Promise<T> {
  const r = await fetch(`https://mempool.space/api${path}`, {
    headers: { accept: "application/json", "user-agent": "quantum-ai-showcase/1.0" },
  });
  if (!r.ok) throw new Error(`mempool.space returned ${r.status}`);
  return r.json() as Promise<T>;
}

export const getWhaleFlow = createServerFn({ method: "GET" }).handler(async () => {
  const [txResult, priceResult] = await Promise.allSettled([
    mempoolJson<RecentTx[]>("/mempool/recent"),
    mempoolJson<PriceResponse>("/v1/prices"),
  ]);

  const txs = txResult.status === "fulfilled" ? txResult.value : [];
  const btcUsd = priceResult.status === "fulfilled" && typeof priceResult.value.USD === "number"
    ? priceResult.value.USD
    : null;

  const mapped = txs.map((t) => {
    const valueBtc = typeof t.value === "number" ? t.value / 100_000_000 : 0;
    return {
      txid: t.txid ?? "",
      valueBtc,
      valueUsd: btcUsd == null ? null : valueBtc * btcUsd,
      feeRate: t.fee && t.vsize ? t.fee / t.vsize : null,
      isWhale: valueBtc >= WHALE_THRESHOLD_BTC,
    };
  });

  const whales = mapped.filter((t) => t.isWhale).sort((a, b) => b.valueBtc - a.valueBtc);
  const whaleVolumeBtc = whales.reduce((sum, t) => sum + t.valueBtc, 0);
  const totalSampleBtc = mapped.reduce((sum, t) => sum + t.valueBtc, 0);

  return {
    thresholdBtc: WHALE_THRESHOLD_BTC,
    sampleTransactions: mapped.length,
    whaleTransactions: whales.length,
    whaleVolumeBtc,
    whaleVolumeUsd: btcUsd == null ? null : whaleVolumeBtc * btcUsd,
    totalSampleBtc,
    whaleSharePct: totalSampleBtc > 0 ? (whaleVolumeBtc / totalSampleBtc) * 100 : null,
    btcUsd,
    largest: whales.slice(0, 6),
    updatedAt: new Date().toISOString(),
    methodology: "Large-transfer detector over the latest public Bitcoin mempool transaction sample. It does not classify exchange wallets and must not be interpreted as exchange inflow/outflow.",
  };
});
