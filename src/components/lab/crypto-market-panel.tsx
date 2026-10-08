import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";

type CoinId = "bitcoin" | "ethereum" | "solana";
type PriceRow = {
  usd: number;
  usd_24h_change: number;
  usd_market_cap: number;
  usd_24h_vol: number;
};
type MarketResponse = Record<CoinId, PriceRow>;

const COINS: Array<{ id: CoinId; symbol: string; name: string }> = [
  { id: "bitcoin", symbol: "BTC", name: "Bitcoin" },
  { id: "ethereum", symbol: "ETH", name: "Ethereum" },
  { id: "solana", symbol: "SOL", name: "Solana" },
];

const endpoint =
  "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana&vs_currencies=usd&include_market_cap=true&include_24hr_vol=true&include_24hr_change=true";

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

function compact(value: number) {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(value);
}

export function CryptoMarketPanel() {
  const [data, setData] = useState<MarketResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(endpoint, { headers: { accept: "application/json" } });
      if (!response.ok) throw new Error(`Market data request failed (${response.status})`);
      const json = (await response.json()) as MarketResponse;
      setData(json);
      setUpdatedAt(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load market data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <section
      className="mb-6 rounded-md border border-border bg-card p-4 sm:p-5"
      aria-labelledby="live-market-heading"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-wider text-primary">
            Live market intelligence
          </div>
          <h2 id="live-market-heading" className="mt-1 text-xl font-semibold tracking-tight">
            BTC · ETH · SOL
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            USD market data · refreshes every 60 seconds · source: CoinGecko
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void load()}
          disabled={loading}
        >
          <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} aria-hidden="true" />
          Refresh
        </Button>
      </div>

      {error ? (
        <div className="mt-4 rounded-sm border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive">
          {error}. The research simulations below remain available.
        </div>
      ) : null}

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        {COINS.map((coin) => {
          const row = data?.[coin.id];
          const change = row?.usd_24h_change ?? 0;
          return (
            <article key={coin.id} className="rounded-md border border-border bg-background p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-mono text-xs text-primary">{coin.symbol}</div>
                  <div className="text-sm text-muted-foreground">{coin.name}</div>
                </div>
                {row ? (
                  <span
                    className={`font-mono text-xs ${change >= 0 ? "text-primary" : "text-destructive"}`}
                  >
                    {change >= 0 ? "+" : ""}
                    {change.toFixed(2)}%
                  </span>
                ) : null}
              </div>
              <div className="mt-4 font-mono text-2xl font-semibold tabular-nums">
                {row ? money.format(row.usd) : loading ? "Loading…" : "—"}
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <dt className="text-muted-foreground">Market cap</dt>
                  <dd className="mt-1 font-mono">
                    {row ? `$${compact(row.usd_market_cap)}` : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">24h volume</dt>
                  <dd className="mt-1 font-mono">{row ? `$${compact(row.usd_24h_vol)}` : "—"}</dd>
                </div>
              </dl>
            </article>
          );
        })}
      </div>

      <div className="mt-3 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        {updatedAt ? `Last update ${updatedAt.toLocaleTimeString()}` : "Connecting to market data…"}
      </div>
    </section>
  );
}
