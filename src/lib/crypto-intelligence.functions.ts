import { createServerFn } from "@tanstack/react-start";

type CoinGeckoGlobalResponse = {
  data?: { market_cap_percentage?: { btc?: number } };
};

type FearGreedResponse = {
  data?: Array<{ value?: string; value_classification?: string }>;
};

type OkxFundingResponse = {
  code?: string;
  msg?: string;
  data?: Array<{
    fundingRate?: string;
    fundingTime?: string;
    nextFundingTime?: string;
  }>;
};

type OkxOpenInterestResponse = {
  code?: string;
  msg?: string;
  data?: Array<{
    oi?: string;
    oiCcy?: string;
    oiUsd?: string;
    ts?: string;
  }>;
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
    requestJson<OkxFundingResponse>("https://www.okx.com/api/v5/public/funding-rate?instId=BTC-USDT-SWAP"),
    requestJson<OkxOpenInterestResponse>("https://www.okx.com/api/v5/public/open-interest?instType=SWAP&instId=BTC-USDT-SWAP"),
  ]);

  const btcDominance =
    globalResult.status === "fulfilled" ? finite(globalResult.value.data?.market_cap_percentage?.btc) : null;

  const fearRow = fearResult.status === "fulfilled" ? fearResult.value.data?.[0] : undefined;
  const fearGreed = finite(fearRow?.value);

  const fundingApiError =
    fundingResult.status === "fulfilled" && fundingResult.value.code !== "0"
      ? `OKX ${fundingResult.value.code ?? "error"}: ${fundingResult.value.msg ?? "unknown error"}`
      : rejectionMessage(fundingResult);
  const oiApiError =
    oiResult.status === "fulfilled" && oiResult.value.code !== "0"
      ? `OKX ${oiResult.value.code ?? "error"}: ${oiResult.value.msg ?? "unknown error"}`
      : rejectionMessage(oiResult);

  const fundingRow =
    fundingResult.status === "fulfilled" && fundingResult.value.code === "0"
      ? fundingResult.value.data?.[0]
      : undefined;
  const fundingRate = finite(fundingRow?.fundingRate);
  const fundingTimestamp = finite(fundingRow?.fundingTime);
  const nextFundingTime = finite(fundingRow?.nextFundingTime ?? fundingRow?.fundingTime);

  const oiRow =
    oiResult.status === "fulfilled" && oiResult.value.code === "0"
      ? oiResult.value.data?.[0]
      : undefined;
  const openInterest = finite(oiRow?.oiCcy);
  const openInterestUsd = finite(oiRow?.oiUsd);
  const openInterestTimestamp = finite(oiRow?.ts);

  return {
    btcDominance,
    fearGreed,
    fearGreedLabel: fearRow?.value_classification ?? null,
    fundingRatePercent: fundingRate == null ? null : fundingRate * 100,
    openInterest,
    openInterestUsd,
    nextFundingTime,
    fundingTimestamp,
    openInterestTimestamp,
    derivativesError: [fundingApiError && `Funding: ${fundingApiError}`, oiApiError && `OI: ${oiApiError}`]
      .filter(Boolean)
      .join(" | ") || null,
    updatedAt: new Date().toISOString(),
    sources: {
      dominance: globalResult.status === "fulfilled" ? "CoinGecko" : null,
      sentiment: fearResult.status === "fulfilled" ? "Alternative.me" : null,
      derivatives: fundingRate != null || openInterest != null ? "OKX · BTC-USDT-SWAP" : null,
    },
  };
});
