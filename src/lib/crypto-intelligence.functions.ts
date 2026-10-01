import { createServerFn } from "@tanstack/react-start";

type CoinGeckoGlobalResponse = {
  data?: { market_cap_percentage?: { btc?: number } };
};

type FearGreedResponse = {
  data?: Array<{ value?: string; value_classification?: string }>;
};

type BybitFundingResponse = {
  retCode?: number;
  retMsg?: string;
  result?: {
    list?: Array<{ fundingRate?: string; fundingRateTimestamp?: string }>;
  };
};

type BybitOpenInterestResponse = {
  retCode?: number;
  retMsg?: string;
  result?: {
    list?: Array<{ openInterest?: string; timestamp?: string }>;
  };
};

type RequestError = Error & { status?: number; body?: string };

async function requestJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      accept: "application/json",
      "user-agent": "quantum-ai-showcase/1.0",
    },
  });

  const text = await response.text();
  if (!response.ok) {
    const error = new Error(`${new URL(url).hostname} HTTP ${response.status}`) as RequestError;
    error.status = response.status;
    error.body = text.slice(0, 180).replace(/\s+/g, " ").trim();
    throw error;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    const error = new Error(`${new URL(url).hostname} returned invalid JSON`) as RequestError;
    error.status = response.status;
    error.body = text.slice(0, 180).replace(/\s+/g, " ").trim();
    throw error;
  }
}

function finite(value: unknown): number | null {
  const number = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(number) ? number : null;
}

function rejectionMessage(result: PromiseSettledResult<unknown>) {
  if (result.status !== "rejected") return null;
  const error = result.reason as RequestError;
  const status = error?.status ? `HTTP ${error.status}` : "request failed";
  const body = error?.body ? ` · ${error.body}` : "";
  return `${status}${body}`;
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

  const fundingApiError =
    fundingResult.status === "fulfilled" && fundingResult.value.retCode !== 0
      ? `Bybit ${fundingResult.value.retCode}: ${fundingResult.value.retMsg ?? "unknown error"}`
      : rejectionMessage(fundingResult);
  const oiApiError =
    oiResult.status === "fulfilled" && oiResult.value.retCode !== 0
      ? `Bybit ${oiResult.value.retCode}: ${oiResult.value.retMsg ?? "unknown error"}`
      : rejectionMessage(oiResult);

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
    derivativesError: [fundingApiError && `Funding: ${fundingApiError}`, oiApiError && `OI: ${oiApiError}`]
      .filter(Boolean)
      .join(" | ") || null,
    updatedAt: new Date().toISOString(),
    sources: {
      dominance: globalResult.status === "fulfilled" ? "CoinGecko" : null,
      sentiment: fearResult.status === "fulfilled" ? "Alternative.me" : null,
      derivatives: fundingRate != null || openInterest != null ? "Bybit V5 · BTCUSDT perpetual" : null,
    },
  };
});
