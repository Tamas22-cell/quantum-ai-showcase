import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";

type GlobalResponse = {
  data?: {
    bitcoin_percentage_of_market_cap?: number;
    quotes?: { USD?: { total_market_cap?: number; total_volume_24h?: number } };
  };
};

type FearGreedResponse = {
  data?: Array<{
    value?: string;
    value_classification?: string;
  }>;
};

const globalEndpoint = "https://api.alternative.me/v2/global/";
const fearGreedEndpoint = "https://api.alternative.me/fng/?limit=1";

function fmtPercent(value: number | null) {
  return value == null ? "—" : `${value.toFixed(2)}%`;
}

export function CryptoIntelligencePanel() {
  const [dominance, setDominance] = useState<number | null>(null);
  const [fearGreed, setFearGreed] = useState<number | null>(null);
  const [fearGreedLabel, setFearGreedLabel] = useState("—");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [globalResult, fearResult] = await Promise.allSettled([
        fetch(globalEndpoint, { headers: { accept: "application/json" } }).then(async (response) => {
          if (!response.ok) throw new Error(`Global market request failed (${response.status})`);
          return (await response.json()) as GlobalResponse;
        }),
        fetch(fearGreedEndpoint, { headers: { accept: "application/json" } }).then(async (response) => {
          if (!response.ok) throw new Error(`Fear & Greed request failed (${response.status})`);
          return (await response.json()) as FearGreedResponse;
        }),
      ]);

      let loaded = false;
      if (globalResult.status === "fulfilled") {
        const value = globalResult.value.data?.bitcoin_percentage_of_market_cap;
        if (typeof value === "number") {
          setDominance(value);
          loaded = true;
        }
      }
      if (fearResult.status === "fulfilled") {
        const row = fearResult.value.data?.[0];
        const value = Number(row?.value);
        if (Number.isFinite(value)) {
          setFearGreed(value);
          setFearGreedLabel(row?.value_classification || "—");
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
          <p className="mt-1 text-xs text-muted-foreground">Market structure, sentiment and derivatives/ETF research layer</p>
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
          <p className="mt-2 text-xs leading-5 text-muted-foreground">Daily spot-Bitcoin ETF net-flow integration is prepared for a verified institutional data source.</p>
          <div className="mt-3 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">No synthetic live value shown</div>
        </article>

        <article className="rounded-md border border-border bg-background p-4">
          <div className="font-mono text-xs text-primary">FUNDING / OPEN INTEREST</div>
          <div className="mt-3 font-mono text-xl font-semibold">Research layer</div>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">Perpetual funding and aggregate open-interest integration is prepared for a verified derivatives feed.</p>
          <div className="mt-3 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">No synthetic live value shown</div>
        </article>
      </div>

      <div className="mt-3 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        {updatedAt ? `Last update ${updatedAt.toLocaleTimeString()} · auto refresh 5 min` : "Connecting to intelligence feeds…"}
      </div>
    </section>
  );
}
