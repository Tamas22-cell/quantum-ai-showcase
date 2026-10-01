import { createServerFn } from "@tanstack/react-start";

type CoinGeckoGlobalResponse = {
  data?: { market_cap_percentage?: { btc?: number } };
};

type FearGreedResponse = {
  data?: Array<{ value?: string; value_classification?: string }>;
};

type PremiumIndexResponse = {
  lastFundingRate?: string;
  nextFundingTime?: number;
};

type OpenInterestResponse = {
  openInterest?: string;
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
    requestJson<PremiumIndexResponse>("https://dapi.binance.com/dapi/v1/premiumIndex?symbol=BTCUSD_PERP"),
    requestJson<OpenInterestResponse>("https://dapi.binance.com/dapi/v1/openInterest?symbol=BTCUSD_PERP"),
  ]);

  const btcDominance =
    globalResult.status === "fulfilled" ? finite(globalResult.value.data?.market_cap_percentage?.btc) : null;

  const fearRow = fearResult.status === "fulfilled" ? fearResult.value.data?.[0] : undefined;
  const fearGreed = finite(fearRow?.value);

  const fundingRate =
    fundingResult.status === "fulfilled" ? finite(fundingResult.value.lastFundingRate) : null;
  const nextFundingTime =
    fundingResult.status === "fulfilled" ? finite(fundingResult.value.nextFundingTime) : null;

  const openInterest =
    oiResult.status === "fulfilled" ? finite(oiResult.value.openInterest) : null;

  return {
    btcDominance,
    fearGreed,
    fearGreedLabel: fearRow?.value_classification ?? null,
    fundingRatePercent: fundingRate == null ? null : fundingRate * 100,
    openInterest,
    nextFundingTime,
    updatedAt: new Date().toISOString(),
    sources: {
      dominance: globalResult.status === "fulfilled" ? "CoinGecko" : null,
      sentiment: fearResult.status === "fulfilled" ? "Alternative.me" : null,
      derivatives:
        fundingResult.status === "fulfilled" || oiResult.status === "fulfilled" ? "Binance COIN-M Futures" : null,
    },
  };
});
