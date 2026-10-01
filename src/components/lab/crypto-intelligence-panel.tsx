import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getCryptoIntelligence } from "@/lib/crypto-intelligence.functions";

type Intelligence = Awaited<ReturnType<typeof getCryptoIntelligence>>;

function fmtPercent(value: number | null) {
  return value == null ? "—" : `${value.toFixed(2)}%`;
}

export function CryptoIntelligencePanel() {
  const [data, setData] = useState<Intelligence | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const result = await getCryptoIntelligence();
      setData(result);
      if (result.btcDominance == null && result.fundingRatePercent == null && result.openInterest == null) {
        setError("Some market feeds are temporarily unavailable");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load intelligence data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 300_000);
    return () => window.clearInterval(timer);
  }, []);

  const dominance = data?.btcDominance ?? null;
  const fearGreed = data?.fearGreed ?? null;
  const fundingRate = data?.fundingRatePercent ?? null;
  const openInterest = data?.openInterest ?? null;

  return (
    <section className="mb-6 rounded-md border border-border bg-card p-4 sm:p-5" aria-labelledby="crypto-intelligence-heading">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-wider text-primary">Market intelligence</div>
          <h2 id="crypto-intelligence-heading" className="mt-1 text-xl font-semibold tracking-tight">Crypto Market Signals</h2>
          <p className="mt-1 text-xs text-muted-foreground">Server-side market structure, sentiment and BTC derivatives feeds</p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} aria-hidden="true" />
          Refresh
        </Button>
      </div>

      {error ? <div className="mt-4 rounded-sm border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive">{error}</div> : null}

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <article className="rounded-md border border-border bg-background p-4">
          <div className="font-mono text-xs text-primary">BTC DOMINANCE</div>
          <div className="mt-3 font-mono text-2xl font-semibold tabular-nums">{loading && !data ? "Loading…" : fmtPercent(dominance)}</div>
          <p className="mt-2 text-xs text-muted-foreground">Bitcoin share of total crypto market cap.</p>
          <div className="mt-3 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Source: CoinGecko · server feed</div>
        </article>

        <article className="rounded-md border border-border bg-background p-4">
          <div className="font-mono text-xs text-primary">FEAR &amp; GREED</div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-semibold tabular-nums">{loading && !data ? "Loading…" : fearGreed ?? "—"}</span>
            {fearGreed != null ? <span className="text-xs text-muted-foreground">/ 100</span> : null}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{data?.fearGreedLabel ?? "—"} · Bitcoin market sentiment index.</p>
          <div className="mt-3 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Source: Alternative.me · server feed</div>
        </article>

        <article className="rounded-md border border-border bg-background p-4">
          <div className="font-mono text-xs text-primary">BTC ETF FLOWS</div>
          <div className="mt-3 font-mono text-xl font-semibold">Research layer</div>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">Daily spot-Bitcoin ETF net-flow integration is reserved for a verified institutional data source.</p>
          <div className="mt-3 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">No synthetic live value shown</div>
        </article>

        <article className="rounded-md border border-border bg-background p-4">
          <div className="font-mono text-xs text-primary">BTC FUNDING / OPEN INTEREST</div>
          <div className="mt-3 font-mono text-xl font-semibold tabular-nums">
            {loading && !data ? "Loading…" : fundingRate == null ? "—" : `${fundingRate >= 0 ? "+" : ""}${fundingRate.toFixed(4)}%`}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Current BTC-USDT perpetual funding rate.</p>
          <div className="mt-3 text-xs">
            <span className="text-muted-foreground">Open interest </span>
            <span className="font-mono">{openInterest == null ? "—" : `${openInterest.toLocaleString("en-US", { maximumFractionDigits: 2 })} BTC`}</span>
          </div>
          {data?.derivativesError ? (
            <div className="mt-3 break-words rounded-sm border border-destructive/30 bg-destructive/5 p-2 font-mono text-[10px] leading-4 text-destructive">
              API diagnostic: {data.derivativesError}
            </div>
          ) : null}
          <div className="mt-3 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Source: OKX · BTC-USDT-SWAP · server feed</div>
        </article>
      </div>

      <div className="mt-3 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        {data?.updatedAt ? `Last update ${new Date(data.updatedAt).toLocaleTimeString()} · auto refresh 5 min` : "Connecting to server feeds…"}
      </div>
    </section>
  );
}
