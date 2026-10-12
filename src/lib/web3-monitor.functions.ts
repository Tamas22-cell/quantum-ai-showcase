import { createServerFn } from "@tanstack/react-start";

async function read(url: string): Promise<any> {
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
    "https://api.llama.fi/charts",
    ...pairs.map(p => "https://api.kraken.com/0/public/Ticker?pair=" + p.pair),
    ...pairs.map(p => "https://api.kraken.com/0/public/OHLC?pair=" + p.pair + "&interval=60")
  ];
  const responses = await Promise.allSettled(requests.map(read));
  const value = (i: number): any => responses[i].status === "fulfilled" ? (responses[i] as PromiseFulfilledResult<any>).value : null;
  const height = Number(value(0));
  const fees = value(1);
  const hashrate = Number(value(2)?.currentHashrate);
  const tvlHistory = Array.isArray(value(3)) ? value(3).map((p: any) => Number(p.totalLiquidityUSD ?? p.tvl)).filter((n: number) => Number.isFinite(n) && n > 0) : [];
  const markets = pairs.flatMap((p, i) => {
    const ticker = value(4 + i), ohlc = value(7 + i);
    const tickerRow: any = Object.values(ticker?.result ?? {})[0];
    const key = Object.keys(ohlc?.result ?? {}).find(k => k !== "last");
    const rows: any[] = key ? ohlc.result[key] : [];
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
      tvl: tvlHistory.at(-1) ?? null
    },
    history: tvlHistory.slice(-32),
    markets,
    timestamp: Date.now()
  };
});
