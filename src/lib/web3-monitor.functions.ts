import { createServerFn } from "@tanstack/react-start";

type JsonObject = Record<string, unknown>;
function object(value: unknown): JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as JsonObject : {};
}
function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}
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
  const value = (i: number): unknown => {
    const result = responses[i];
    return result?.status === "fulfilled" ? result.value : null;
  };
  const height = Number(value(0));
  const fees = value(1);
  const hashrate = Number(object(value(2)).currentHashrate);
  const defiMarketCap = Number(object(object(value(3)).data).defi_market_cap);
  const markets = pairs.flatMap((p, i) => {
    const ticker = object(object(value(4 + i)).result);
    const ohlc = object(object(value(7 + i)).result);
    const tickerRow = object(Object.values(ticker)[0]);
    const key = Object.keys(ohlc).find(k => k !== "last");
    const rows = array(key ? ohlc[key] : null);
    const closes = rows.slice(-48).map(row => Number(array(row)[4])).filter(Number.isFinite);
    const price = Number(array(tickerRow.c)[0]), open = Number(tickerRow.o);
    if (!Number.isFinite(price) || price <= 0) return [];
    return [{ symbol: p.symbol, price, change: Number.isFinite(open) && open > 0 ? (price - open) / open * 100 : 0, closes }];
  });
  return {
    snapshot: {
      blockHeight: Number.isFinite(height) && height > 0 ? height : null,
      fees: Number.isFinite(Number(object(fees).fastestFee)) ? { fastestFee: Number(object(fees).fastestFee), halfHourFee: Number(object(fees).halfHourFee), hourFee: Number(object(fees).hourFee) } : null,
      hashrate: Number.isFinite(hashrate) && hashrate > 0 ? hashrate : null,
      tvl: Number.isFinite(defiMarketCap) && defiMarketCap > 0 ? defiMarketCap : null
    },
    history: [],
    markets,
    timestamp: Date.now()
  };
});
