import { createServerFn } from "@tanstack/react-start";

type CoinGeckoGlobalResponse = {
  data?: { market_cap_percentage?: { btc?: number } };
};

type FearGreedResponse = {
  data?: Array<{ value?: string; value_classification?: string }>;
};

type BybitFundingResponse = {
  retCode?: number;
  result?: {
    list?: Array<{ fundingRate?: string; fundingRateTimestamp?: string }>;
  };
};

type BybitOpenInterestResponse = {
  retCode?: number;
  result?: {
    list?: Array<{ openInterest?: string; timestamp?: string }>;
  };
};

async function requestJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      accept: "application/json",
      "user-agent": "quantum-ai-showcase/1.0",
    },
  });
  if (!response.ok) throw new Error(`${new URL(url).hostname} returned ${response.status}`);
  return (await response.json()) as T;
}

function finite(value: unknown): number | null {
  const number = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(number) ? number : null;
}

export const getCryptoIntelligence = createServerFn({ method: "GET" }).handler(async () => {
  const [globalResult, fearResult, fundingResult, oiResult] = await Promise.allSettled([
    requestJson<CoinGeckoGlobalResponse>("https://api.coingecko.com/api/v3/global"),
    requestJson<FearGreedResponse>("https://api.alternative.me/fng/?limit=1"),
    requestJson<BybitFundingResponse>("https://api.bybit.com/v5/market/funding/history?category=linear&symbol=BTCUSDT&limit=1"),
    requestJson<BybitOpenInterestResponse>("https://api.bybit.com/v5/market/open-interest?category=linear&symbol=BTCUSDT&intervalTime=5min&limit=1"),
  ]);

  const btcDominance =
    globalResult.status === "fulfilled" ? finite(globalResult.value.data?.market_cap_percentage?.btc) : null;

  const fearRow = fearResult.status === "fulfilled" ? fearResult.value.data?.[0] : undefined;
  const fearGreed = finite(fearRow?.value);

  const fundingRow =
    fundingResult.status === "fulfilled" && fundingResult.value.retCode === 0
      ? fundingResult.value.result?.list?.[0]
      : undefined;
  const fundingRate = finite(fundingRow?.fundingRate);
  const fundingTimestamp = finite(fundingRow?.fundingRateTimestamp);

  const oiRow =
    oiResult.status === "fulfilled" && oiResult.value.retCode === 0
      ? oiResult.value.result?.list?.[0]
      : undefined;
  const openInterest = finite(oiRow?.openInterest);
  const openInterestTimestamp = finite(oiRow?.timestamp);

  return {
    btcDominance,
    fearGreed,
    fearGreedLabel: fearRow?.value_classification ?? null,
    fundingRatePercent: fundingRate == null ? null : fundingRate * 100,
    openInterest,
    nextFundingTime: null,
    fundingTimestamp,
    openInterestTimestamp,
    updatedAt: new Date().toISOString(),
    sources: {
      dominance: globalResult.status === "fulfilled" ? "CoinGecko" : null,
      sentiment: fearResult.status === "fulfilled" ? "Alternative.me" : null,
      derivatives: fundingRate != null || openInterest != null ? "Bybit V5 · BTCUSDT perpetual" : null,
    },
  };
});
