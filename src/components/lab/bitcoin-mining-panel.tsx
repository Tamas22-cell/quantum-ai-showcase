import { useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getBitcoinMiningIntelligence } from "@/lib/bitcoin-mining.functions";

type MiningData = Awaited<ReturnType<typeof getBitcoinMiningIntelligence>>;

function number(value: number | null, digits = 2) {
  return value == null ? "—" : value.toLocaleString("en-US", { maximumFractionDigits: digits });
}

function money(value: number) {
  return value.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });
}

export function BitcoinMiningPanel() {
  const [data, setData] = useState<MiningData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [hashrateTh, setHashrateTh] = useState(200);
  const [powerWatts, setPowerWatts] = useState(3500);
  const [electricityPrice, setElectricityPrice] = useState(0.10);
  const [hashprice, setHashprice] = useState(45);

  async function load() {
    setLoading(true);
    setError("");
    try {
      setData(await getBitcoinMiningIntelligence());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load Bitcoin mining data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 300_000);
    return () => window.clearInterval(timer);
  }, []);

  const adjustment = data?.difficultyChangePercent ?? null;
  const profitability = useMemo(() => {
    const ph = Math.max(0, hashrateTh) / 1000;
    const dailyRevenue = ph * Math.max(0, hashprice);
    const dailyElectricity = (Math.max(0, powerWatts) / 1000) * 24 * Math.max(0, electricityPrice);
    const dailyProfit = dailyRevenue - dailyElectricity;
    return {
      dailyRevenue,
      dailyElectricity,
      dailyProfit,
      monthlyRevenue: dailyRevenue * 30,
      monthlyElectricity: dailyElectricity * 30,
      monthlyProfit: dailyProfit * 30,
    };
  }, [hashrateTh, powerWatts, electricityPrice, hashprice]);

  return (
    <section className="mb-6 rounded-md border border-border bg-card p-4 sm:p-5" aria-labelledby="bitcoin-mining-heading">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-wider text-primary">Proof-of-work intelligence</div>
          <h2 id="bitcoin-mining-heading" className="mt-1 text-xl font-semibold tracking-tight">Bitcoin Mining Intelligence</h2>
          <p className="mt-1 text-xs text-muted-foreground">Live network hashrate, difficulty, retarget cycle, mining-pool distribution and profitability research</p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} aria-hidden="true" />
          Refresh
        </Button>
      </div>

      {error ? <div className="mt-4 rounded-sm border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive">{error}</div> : null}

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <article className="rounded-md border border-border bg-background p-4">
          <div className="font-mono text-xs text-primary">NETWORK HASHRATE</div>
          <div className="mt-3 font-mono text-2xl font-semibold tabular-nums">{loading && !data ? "Loading…" : `${number(data?.hashrateEh ?? null)} EH/s`}</div>
          <p className="mt-2 text-xs text-muted-foreground">Estimated Bitcoin network computing power.</p>
        </article>
        <article className="rounded-md border border-border bg-background p-4">
          <div className="font-mono text-xs text-primary">MINING DIFFICULTY</div>
          <div className="mt-3 font-mono text-2xl font-semibold tabular-nums">{loading && !data ? "Loading…" : `${number(data?.difficultyT ?? null)} T`}</div>
          <p className="mt-2 text-xs text-muted-foreground">Current proof-of-work difficulty target.</p>
        </article>
        <article className="rounded-md border border-border bg-background p-4">
          <div className="font-mono text-xs text-primary">NEXT ADJUSTMENT</div>
          <div className={`mt-3 font-mono text-2xl font-semibold tabular-nums ${adjustment != null && adjustment < 0 ? "text-destructive" : "text-primary"}`}>
            {loading && !data ? "Loading…" : adjustment == null ? "—" : `${adjustment >= 0 ? "+" : ""}${adjustment.toFixed(2)}%`}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{data?.remainingBlocks == null ? "—" : `${data.remainingBlocks.toLocaleString("en-US")} blocks remaining`} · {data?.progressPercent == null ? "—" : `${data.progressPercent.toFixed(1)}% cycle progress`}</p>
        </article>
        <article className="rounded-md border border-border bg-background p-4">
          <div className="font-mono text-xs text-primary">BLOCK HEIGHT</div>
          <div className="mt-3 font-mono text-2xl font-semibold tabular-nums">{loading && !data ? "Loading…" : number(data?.blockHeight ?? null, 0)}</div>
          <p className="mt-2 text-xs text-muted-foreground">Current Bitcoin mainnet chain tip.</p>
        </article>
      </div>

      <div className="mt-3 rounded-md border border-border bg-background p-4">
        <div className="font-mono text-xs text-primary">TOP MINING POOLS · 1 WEEK</div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {(data?.topPools ?? []).map((pool, index) => (
            <div key={`${pool.name}-${index}`} className="rounded-sm border border-border p-3">
              <div className="truncate text-sm font-medium">{index + 1}. {pool.name}</div>
              <div className="mt-2 font-mono text-lg tabular-nums">{pool.sharePercent == null ? "—" : `${pool.sharePercent.toFixed(1)}%`}</div>
              <div className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">{pool.blocks} blocks</div>
            </div>
          ))}
          {!loading && (data?.topPools.length ?? 0) === 0 ? <div className="text-xs text-muted-foreground">Pool data unavailable.</div> : null}
        </div>
      </div>

      <div className="mt-3 rounded-md border border-border bg-background p-4">
        <div className="font-mono text-xs text-primary">MINING PROFITABILITY CALCULATOR</div>
        <p className="mt-1 text-xs text-muted-foreground">Research scenario using an editable hashprice assumption. Pool fees, downtime, cooling and hardware cost are not included.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-xs text-muted-foreground">ASIC hashrate (TH/s)<input className="mt-1 w-full rounded-sm border border-border bg-card px-3 py-2 font-mono text-foreground" type="number" min="0" value={hashrateTh} onChange={(e) => setHashrateTh(Number(e.target.value))} /></label>
          <label className="text-xs text-muted-foreground">Power (W)<input className="mt-1 w-full rounded-sm border border-border bg-card px-3 py-2 font-mono text-foreground" type="number" min="0" value={powerWatts} onChange={(e) => setPowerWatts(Number(e.target.value))} /></label>
          <label className="text-xs text-muted-foreground">Electricity ($/kWh)<input className="mt-1 w-full rounded-sm border border-border bg-card px-3 py-2 font-mono text-foreground" type="number" min="0" step="0.01" value={electricityPrice} onChange={(e) => setElectricityPrice(Number(e.target.value))} /></label>
          <label className="text-xs text-muted-foreground">Hashprice ($/PH/s/day)<input className="mt-1 w-full rounded-sm border border-border bg-card px-3 py-2 font-mono text-foreground" type="number" min="0" step="0.01" value={hashprice} onChange={(e) => setHashprice(Number(e.target.value))} /></label>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <div className="rounded-sm border border-border p-3"><div className="text-[10px] uppercase text-muted-foreground">Daily revenue</div><div className="mt-1 font-mono font-semibold">{money(profitability.dailyRevenue)}</div></div>
          <div className="rounded-sm border border-border p-3"><div className="text-[10px] uppercase text-muted-foreground">Daily power</div><div className="mt-1 font-mono font-semibold">{money(profitability.dailyElectricity)}</div></div>
          <div className="rounded-sm border border-border p-3"><div className="text-[10px] uppercase text-muted-foreground">Daily profit</div><div className={`mt-1 font-mono font-semibold ${profitability.dailyProfit < 0 ? "text-destructive" : "text-primary"}`}>{money(profitability.dailyProfit)}</div></div>
          <div className="rounded-sm border border-border p-3"><div className="text-[10px] uppercase text-muted-foreground">30d revenue</div><div className="mt-1 font-mono font-semibold">{money(profitability.monthlyRevenue)}</div></div>
          <div className="rounded-sm border border-border p-3"><div className="text-[10px] uppercase text-muted-foreground">30d power</div><div className="mt-1 font-mono font-semibold">{money(profitability.monthlyElectricity)}</div></div>
          <div className="rounded-sm border border-border p-3"><div className="text-[10px] uppercase text-muted-foreground">30d profit</div><div className={`mt-1 font-mono font-semibold ${profitability.monthlyProfit < 0 ? "text-destructive" : "text-primary"}`}>{money(profitability.monthlyProfit)}</div></div>
        </div>
      </div>

      <div className="mt-3 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        Source: mempool.space · {data?.updatedAt ? `last update ${new Date(data.updatedAt).toLocaleTimeString()} · auto refresh 5 min` : "connecting…"}
      </div>
    </section>
  );
}
