import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";

type GlobalResponse = {
  data?: {
    bitcoin_percentage_of_market_cap?: number | string;
  };
  bitcoin_percentage_of_market_cap?: number | string;
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

const globalEndpoint = "https://api.alternative.me/v2/global/";
const fearGreedEndpoint = "https://api.alternative.me/fng/?limit=1";
const fundingEndpoint = "https://dapi.binance.com/dapi/v1/premiumIndex?symbol=BTCUSD_PERP";
const openInterestEndpoint = "https://dapi.binance.com/dapi/v1/openInterest?symbol=BTCUSD_PERP";

function toFiniteNumber(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(parsed) ? parsed : null;
}

function fmtPercent(value: number | null) {
  return value == null ? "—" : `${value.toFixed(2)}%`;
}

export function CryptoIntelligencePanel() {
  const [dominance, setDominance] = useState<number | null>(null);
  const [fearGreed, setFearGreed] = useState<number | null>(null);
  const [fearGreedLabel, setFearGreedLabel] = useState("—");
  const [fundingRate, setFundingRate] = useState<number | null>(null);
  const [openInterest, setOpenInterest] = useState<number | null>(null);
  const [nextFundingTime, setNextFundingTime] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  async function load() {
    setLoading(true);
    setError("");

    const requestJson = async <T,>(url: string): Promise<T> => {
      const response = await fetch(url, { headers: { accept: "application/json" } });
      if (!response.ok) throw new Error(`Request failed (${response.status})`);
      return (await response.json()) as T;
    };

    try {
      const [globalResult, fearResult, fundingResult, oiResult] = await Promise.allSettled([
        requestJson<GlobalResponse>(globalEndpoint),
        requestJson<FearGreedResponse>(fearGreedEndpoint),
        requestJson<PremiumIndexResponse>(fundingEndpoint),
        requestJson<OpenInterestResponse>(openInterestEndpoint),
      ]);

      let loaded = false;

      if (globalResult.status === "fulfilled") {
        const raw = globalResult.value.data?.bitcoin_percentage_of_market_cap ?? globalResult.value.bitcoin_percentage_of_market_cap;
        const value = toFiniteNumber(raw);
        if (value != null) {
          setDominance(value);
          loaded = true;
        }
      }

      if (fearResult.status === "fulfilled") {
        const row = fearResult.value.data?.[0];
        const value = toFiniteNumber(row?.value);
        if (value != null) {
          setFearGreed(value);
          setFearGreedLabel(row?.value_classification || "—");
          loaded = true;
        }
      }

      if (fundingResult.status === "fulfilled") {
        const value = toFiniteNumber(fundingResult.value.lastFundingRate);
        if (value != null) {
          setFundingRate(value * 100);
          setNextFundingTime(toFiniteNumber(fundingResult.value.nextFundingTime));
          loaded = true;
        }
      }

      if (oiResult.status === "fulfilled") {
        const value = toFiniteNumber(oiResult.value.openInterest);
        if (value != null) {
          setOpenInterest(value);
          loaded = true;
        }
      }

      if (!loaded) throw new Error("Intelligence data is temporarily unavailable");
      setUpdatedAt(new Date());
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

  return (
    <section className="mb-6 rounded-md border border-border bg-card p-4 sm:p-5" aria-labelledby="crypto-intelligence-heading">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-wider text-primary">Market intelligence</div>
          <h2 id="crypto-intelligence-heading" className="mt-1 text-xl font-semibold tracking-tight">Crypto Market Signals</h2>
          <p className="mt-1 text-xs text-muted-foreground">Market structure, sentiment and BTC derivatives research layer</p>
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
          <div className="mt-3 font-mono text-2xl font-semibold tabular-nums">{loading && dominance == null ? "Loading…" : fmtPercent(dominance)}</div>
          <p className="mt-2 text-xs text-muted-foreground">Bitcoin share of total crypto market cap.</p>
          <div className="mt-3 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Source: Alternative.me</div>
        </article>

        <article className="rounded-md border border-border bg-background p-4">
          <div className="font-mono text-xs text-primary">FEAR &amp; GREED</div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-semibold tabular-nums">{loading && fearGreed == null ? "Loading…" : fearGreed ?? "—"}</span>
            {fearGreed != null ? <span className="text-xs text-muted-foreground">/ 100</span> : null}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{fearGreedLabel} · Bitcoin market sentiment index.</p>
          <div className="mt-3 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Source: Alternative.me</div>
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
            {loading && fundingRate == null ? "Loading…" : fundingRate == null ? "—" : `${fundingRate >= 0 ? "+" : ""}${fundingRate.toFixed(4)}%`}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Latest BTCUSD perpetual funding rate.</p>
          <div className="mt-3 text-xs">
            <span className="text-muted-foreground">Open interest </span>
            <span className="font-mono">{openInterest == null ? "—" : `${openInterest.toLocaleString("en-US")} contracts`}</span>
          </div>
          {nextFundingTime ? <div className="mt-2 text-[10px] text-muted-foreground">Next funding {new Date(nextFundingTime).toLocaleString()}</div> : null}
          <div className="mt-3 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Source: Binance COIN-M Futures · BTCUSD_PERP</div>
        </article>
      </div>

      <div className="mt-3 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        {updatedAt ? `Last update ${updatedAt.toLocaleTimeString()} · auto refresh 5 min` : "Connecting to intelligence feeds…"}
      </div>
    </section>
  );
}
