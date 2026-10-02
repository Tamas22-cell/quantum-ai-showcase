import { createServerFn } from "@tanstack/react-start";

type RecentTx = { txid?: string; fee?: number; vsize?: number; value?: number };
type TxOutput = { value?: number };
type TxDetail = { txid?: string; fee?: number; weight?: number; vout?: TxOutput[] };
type PriceResponse = { USD?: number };

const WHALE_THRESHOLD_BTC = 10;
const DETAIL_SAMPLE_SIZE = 10;

async function mempoolJson<T>(path: string): Promise<T> {
  const r = await fetch(`https://mempool.space/api${path}`, {
    headers: { accept: "application/json", "user-agent": "quantum-ai-showcase/1.0" },
  });
  if (!r.ok) throw new Error(`mempool.space returned ${r.status}`);
  return r.json() as Promise<T>;
}

export const getWhaleFlow = createServerFn({ method: "GET" }).handler(async () => {
  const [recentResult, priceResult] = await Promise.allSettled([
    mempoolJson<RecentTx[]>("/mempool/recent"),
    mempoolJson<PriceResponse>("/v1/prices"),
  ]);

  const recent = recentResult.status === "fulfilled" ? recentResult.value : [];
  const btcUsd = priceResult.status === "fulfilled" && typeof priceResult.value.USD === "number"
    ? priceResult.value.USD
    : null;

  const txids = recent.map((t) => t.txid).filter((id): id is string => Boolean(id)).slice(0, DETAIL_SAMPLE_SIZE);
  const details = await Promise.allSettled(txids.map((id) => mempoolJson<TxDetail>(`/tx/${id}`)));

  const mapped = details.flatMap((result) => {
    if (result.status !== "fulfilled") return [];
    const t = result.value;
    const valueSats = (t.vout ?? []).reduce((sum, output) => sum + (typeof output.value === "number" ? output.value : 0), 0);
    const valueBtc = valueSats / 100_000_000;
    const vsize = typeof t.weight === "number" && t.weight > 0 ? t.weight / 4 : null;
    return [{
      txid: t.txid ?? "",
      valueBtc,
      valueUsd: btcUsd == null ? null : valueBtc * btcUsd,
      feeRate: typeof t.fee === "number" && vsize ? t.fee / vsize : null,
      isWhale: valueBtc >= WHALE_THRESHOLD_BTC,
    }];
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
    methodology: "Large-transfer detector over detailed public Bitcoin mempool transactions. Output values are read from each transaction's vout data. It does not classify exchange wallets and must not be interpreted as exchange inflow/outflow.",
  };
});
