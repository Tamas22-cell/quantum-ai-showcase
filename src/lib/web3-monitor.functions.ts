import { createServerFn } from "@tanstack/react-start";

type NumericValue = string | number;
type FeeResponse = { fastestFee: NumericValue; halfHourFee: NumericValue; hourFee: NumericValue };
type TickerResponse = { result?: Record<string, { c?: NumericValue[]; o?: NumericValue }> };
type OhlcResponse = { result: Record<string, NumericValue[][] | number> };

async function read(url: string): Promise<unknown> {
  const response = await fetch(url, { signal: AbortSignal.timeout(7000), headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error("Upstream " + response.status);
  return response.json();
}

export const getWeb3Monitor = createServerFn({ method: "GET" }).handler(async () => {
  const pairs = [{ symbol: "BTC", pair: "XBTUSD" }, { symbol: "ETH", pair: "ETHUSD" }, { symbol: "SOL", pair: "SOLUSD" }];
  const requests = [
    "https://mempool.space/api/blocks/tip/height",
    "https://mempool.space/api/v1/fees/recommended",
    "https://mempool.space/api/v1/mining/hashrate/1m",
    "https://api.coingecko.com/api/v3/global/decentralized_finance_defi",
    ...pairs.map(p => "https://api.kraken.com/0/public/Ticker?pair=" + p.pair),
    ...pairs.map(p => "https://api.kraken.com/0/public/OHLC?pair=" + p.pair + "&interval=60")
  ];
  const responses = await Promise.allSettled(requests.map(read));
  const value = <T,>(i: number): T | null => {
    const response = responses[i];
    return response?.status === "fulfilled" ? response.value as T : null;
  };
  const height = Number(value<NumericValue>(0));
  const fees = value<FeeResponse>(1);
  const hashrate = Number(value<{ currentHashrate?: NumericValue }>(2)?.currentHashrate);
  const defiMarketCap = Number(value<{ data?: { defi_market_cap?: NumericValue } }>(3)?.data?.defi_market_cap);
  const markets = pairs.flatMap((p, i) => {
    const ticker = value<TickerResponse>(4 + i), ohlc = value<OhlcResponse>(7 + i);
    const tickerRow = Object.values(ticker?.result ?? {})[0];
    const key = Object.keys(ohlc?.result ?? {}).find(k => k !== "last");
    const rows = (key ? ohlc!.result[key] : []) as NumericValue[][];
    const closes = rows.slice(-48).map(row => Number(row[4])).filter(Number.isFinite);
    const price = Number(tickerRow?.c?.[0]), open = Number(tickerRow?.o);
    if (!Number.isFinite(price) || price <= 0) return [];
    return [{ symbol: p.symbol, price, change: Number.isFinite(open) && open > 0 ? (price - open) / open * 100 : 0, closes }];
  });
  return {
    snapshot: {
      blockHeight: Number.isFinite(height) && height > 0 ? height : null,
      fees: fees && Number.isFinite(Number(fees.fastestFee)) ? { fastestFee: Number(fees.fastestFee), halfHourFee: Number(fees.halfHourFee), hourFee: Number(fees.hourFee) } : null,
      hashrate: Number.isFinite(hashrate) && hashrate > 0 ? hashrate : null,
      tvl: Number.isFinite(defiMarketCap) && defiMarketCap > 0 ? defiMarketCap : null
    },
    history: [],
    markets,
    timestamp: Date.now()
  };
});
