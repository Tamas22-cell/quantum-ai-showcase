import { createServerFn } from "@tanstack/react-start";

type TxOutput = { value?: number };
type RecentTx = { txid?: string; fee?: number; vsize?: number; value?: number; outputs?: TxOutput[] };
type PriceResponse = { USD?: number };

const WHALE_THRESHOLD_BTC = 10;

async function mempoolJson<T>(path: string): Promise<T> {
  const r = await fetch(`https://mempool.space/api${path}`, {
    headers: { accept: "application/json", "user-agent": "quantum-ai-showcase/1.0" },
  });
  if (!r.ok) throw new Error(`mempool.space returned ${r.status}`);
  return r.json() as Promise<T>;
}

function txValueSats(t: RecentTx) {
  if (Array.isArray(t.outputs)) {
    return t.outputs.reduce((sum, output) => sum + (typeof output.value === "number" ? output.value : 0), 0);
  }
  return typeof t.value === "number" ? t.value : 0;
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
    const valueBtc = txValueSats(t) / 100_000_000;
    return {
      txid: t.txid ?? "",
      valueBtc,
      valueUsd: btcUsd == null ? null : valueBtc * btcUsd,
      feeRate: t.fee && t.vsize ? t.fee / t.vsize : null,
      isWhale: valueBtc >= WHALE_THRESHOLD_BTC,
    };
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
    whaleSharePct: totalSampleBtc > 0 ? (whaleVolumeBtc / totalSampleBtc) * 100 : null,
    btcUsd,
    largest: ranked.slice(0, 6),
    updatedAt: new Date().toISOString(),
    methodology: "Large-transfer detector over the latest public Bitcoin mempool transaction sample. Transaction value is calculated from transaction outputs. It does not classify exchange wallets and must not be interpreted as exchange inflow/outflow.",
  };
});
