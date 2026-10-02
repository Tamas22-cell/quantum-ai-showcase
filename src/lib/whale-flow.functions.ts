import { createServerFn } from "@tanstack/react-start";

type RecentTx = { txid?: string; fee?: number; vsize?: number; value?: number };
type Block = { id?: string; height?: number };
type TxOutput = { value?: number };
type TxDetail = { txid?: string; fee?: number; weight?: number; vout?: TxOutput[] };
type PriceResponse = { USD?: number };

const WHALE_THRESHOLD_BTC = 10;
const BLOCK_COUNT = 2;
const MAX_BLOCK_TXS = 120;

async function mempoolJson<T>(path: string): Promise<T> {
  const r = await fetch(`https://mempool.space/api${path}`, {
    headers: { accept: "application/json", "user-agent": "quantum-ai-showcase/1.0" },
  });
  if (!r.ok) throw new Error(`mempool.space returned ${r.status}`);
  return r.json() as Promise<T>;
}

function mapTx(t: RecentTx | TxDetail, btcUsd: number | null) {
  let sats: number | null = null;
  if ("value" in t && typeof t.value === "number") sats = t.value;
  if ("vout" in t && Array.isArray(t.vout)) {
    sats = t.vout.reduce((sum, output) => sum + (typeof output.value === "number" ? output.value : 0), 0);
  }
  if (!t.txid || sats == null || sats <= 0) return null;
  const valueBtc = sats / 100_000_000;
  const vsize = "vsize" in t && typeof t.vsize === "number" ? t.vsize : ("weight" in t && typeof t.weight === "number" ? t.weight / 4 : null);
  const feeRate = typeof t.fee === "number" && vsize && vsize > 0 ? t.fee / vsize : null;
  return { txid: t.txid, valueBtc, valueUsd: btcUsd == null ? null : valueBtc * btcUsd, feeRate, isWhale: valueBtc >= WHALE_THRESHOLD_BTC };
}

export const getWhaleFlow = createServerFn({ method: "GET" }).handler(async () => {
  const [recentResult, priceResult, blocksResult] = await Promise.allSettled([
    mempoolJson<RecentTx[]>("/mempool/recent"),
    mempoolJson<PriceResponse>("/v1/prices"),
    mempoolJson<Block[]>("/v1/blocks"),
  ]);

  const btcUsd = priceResult.status === "fulfilled" && typeof priceResult.value.USD === "number" ? priceResult.value.USD : null;
  const recent = recentResult.status === "fulfilled" ? recentResult.value : [];
  const recentMapped = recent.map(t => mapTx(t, btcUsd)).filter((t): t is NonNullable<ReturnType<typeof mapTx>> => t !== null);

  const blocks = blocksResult.status === "fulfilled" ? blocksResult.value.slice(0, BLOCK_COUNT) : [];
  const blockTxResults = await Promise.allSettled(blocks.map(async block => {
    if (!block.id) return [] as TxDetail[];
    const pages: TxDetail[] = [];
    for (let start = 0; start < MAX_BLOCK_TXS; start += 25) {
      try {
        const batch = await mempoolJson<TxDetail[]>(`/v1/block/${block.id}/txs/${start}`);
        pages.push(...batch);
        if (batch.length < 25) break;
      } catch { break; }
    }
    return pages;
  }));

  const blockMapped = blockTxResults.flatMap(r => r.status === "fulfilled" ? r.value : []).map(t => mapTx(t, btcUsd)).filter((t): t is NonNullable<ReturnType<typeof mapTx>> => t !== null);
  const unique = new Map<string, NonNullable<ReturnType<typeof mapTx>>>();
  [...recentMapped, ...blockMapped].forEach(t => unique.set(t.txid, t));
  const mapped = [...unique.values()];

  if (!mapped.length) throw new Error("Unable to load Bitcoin transaction sample");

  const ranked = [...mapped].sort((a, b) => b.valueBtc - a.valueBtc);
  const whales = ranked.filter(t => t.isWhale);
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
    methodology: `Large-transfer detector using the live mempool plus up to ${BLOCK_COUNT} recent Bitcoin blocks. The ≥${WHALE_THRESHOLD_BTC} BTC threshold is applied to transaction output totals. Exchange wallets are not attributed.`,
  };
});
