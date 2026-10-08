import { useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getBitcoinMiningIntelligence } from "@/lib/bitcoin-mining.functions";
type MiningData = Awaited<ReturnType<typeof getBitcoinMiningIntelligence>>;
type TrendPoint = { timestamp: number; valueEh: number };
function number(value: number | null, digits = 2) {
  return value == null ? "—" : value.toLocaleString("en-US", { maximumFractionDigits: digits });
}
function money(value: number) {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
}
function Sparkline({ points }: { points: TrendPoint[] }) {
  const [hovered, setHovered] = useState<number | null>(null);
  if (points.length < 2)
    return (
      <div className="flex h-40 items-center justify-center text-xs text-muted-foreground">
        Trend data unavailable.
      </div>
    );
  const w = 900,
    h = 180,
    p = 12,
    values = points.map((x) => x.valueEh),
    min = Math.min(...values),
    max = Math.max(...values),
    span = max - min || 1;
  const xy = points.map((v, i) => ({
    x: p + (i / (points.length - 1)) * (w - p * 2),
    y: h - p - ((v.valueEh - min) / span) * (h - p * 2),
  }));
  const line = xy.map((v) => `${v.x},${v.y}`).join(" ");
  const active = hovered == null ? null : xy[hovered];
  const point = hovered == null ? null : points[hovered];
  function move(e: React.MouseEvent<SVGSVGElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
    setHovered(Math.round(ratio * (points.length - 1)));
  }
  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="h-40 w-full cursor-crosshair"
        preserveAspectRatio="none"
        role="img"
        aria-label="Interactive 30 day Bitcoin network hashrate trend"
        onMouseMove={move}
        onMouseLeave={() => setHovered(null)}
      >
        <polyline
          points={line}
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          vectorEffect="non-scaling-stroke"
          className="text-primary"
        />
        {active ? (
          <>
            <line
              x1={active.x}
              x2={active.x}
              y1={p}
              y2={h - p}
              stroke="currentColor"
              strokeWidth="1"
              vectorEffect="non-scaling-stroke"
              className="text-muted-foreground"
              strokeDasharray="4 4"
            />
            <circle
              cx={active.x}
              cy={active.y}
              r="5"
              fill="currentColor"
              className="text-primary"
            />
          </>
        ) : null}
      </svg>
      {point && active ? (
        <div
          className="pointer-events-none absolute top-2 rounded-sm border border-border bg-card px-3 py-2 font-mono text-[10px] shadow-lg"
          style={{ left: `${Math.max(8, Math.min(78, (active.x / w) * 100))}%` }}
        >
          <div>
            {new Date(point.timestamp * 1000).toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
          </div>
          <div className="mt-1 text-primary">{point.valueEh.toFixed(2)} EH/s</div>
        </div>
      ) : null}
    </div>
  );
}
export function BitcoinMiningPanel() {
  const [data, setData] = useState<MiningData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [hashrateTh, setHashrateTh] = useState(200);
  const [powerWatts, setPowerWatts] = useState(3500);
  const [electricityPrice, setElectricityPrice] = useState(0.1);
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
    const timer = window.setInterval(() => void load(), 300000);
    return () => window.clearInterval(timer);
  }, []);
  const adjustment = data?.difficultyChangePercent ?? null;
  const profitability = useMemo(() => {
    const ph = Math.max(0, hashrateTh) / 1000,
      dailyRevenue = ph * Math.max(0, hashprice),
      dailyElectricity = (Math.max(0, powerWatts) / 1000) * 24 * Math.max(0, electricityPrice),
      dailyProfit = dailyRevenue - dailyElectricity;
    return {
      dailyRevenue,
      dailyElectricity,
      dailyProfit,
      monthlyRevenue: dailyRevenue * 30,
      monthlyElectricity: dailyElectricity * 30,
      monthlyProfit: dailyProfit * 30,
    };
  }, [hashrateTh, powerWatts, electricityPrice, hashprice]);
  const history: TrendPoint[] = (data?.hashrateHistory ?? []).filter(
    (x): x is { timestamp: number; valueEh: number } => x.timestamp != null && x.valueEh != null,
  );
  const values = history.map((x) => x.valueEh),
    historyMin = values.length ? Math.min(...values) : null,
    historyMax = values.length ? Math.max(...values) : null;
  return (
    <section className="mb-6 rounded-md border border-border bg-card p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-wider text-primary">
            Proof-of-work intelligence
          </div>
          <h2 className="mt-1 text-xl font-semibold">Bitcoin Mining Intelligence</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Live network hashrate, difficulty, mining-pool distribution, trend analysis and
            profitability research
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void load()}
          disabled={loading}
        >
          <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>
      {error ? <div className="mt-4 text-xs text-destructive">{error}</div> : null}
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <article className="rounded-md border p-4">
          <div className="font-mono text-xs text-primary">NETWORK HASHRATE</div>
          <div className="mt-3 font-mono text-2xl font-semibold">{`${number(data?.hashrateEh ?? null)} EH/s`}</div>
        </article>
        <article className="rounded-md border p-4">
          <div className="font-mono text-xs text-primary">MINING DIFFICULTY</div>
          <div className="mt-3 font-mono text-2xl font-semibold">{`${number(data?.difficultyT ?? null)} T`}</div>
        </article>
        <article className="rounded-md border p-4">
          <div className="font-mono text-xs text-primary">NEXT ADJUSTMENT</div>
          <div
            className={`mt-3 font-mono text-2xl font-semibold ${adjustment != null && adjustment < 0 ? "text-destructive" : "text-primary"}`}
          >
            {adjustment == null ? "—" : `${adjustment >= 0 ? "+" : ""}${adjustment.toFixed(2)}%`}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {data?.remainingBlocks ?? "—"} blocks remaining
          </p>
        </article>
        <article className="rounded-md border p-4">
          <div className="font-mono text-xs text-primary">BLOCK HEIGHT</div>
          <div className="mt-3 font-mono text-2xl font-semibold">
            {number(data?.blockHeight ?? null, 0)}
          </div>
        </article>
      </div>
      <div className="mt-3 rounded-md border p-4">
        <div className="flex justify-between gap-2">
          <div>
            <div className="font-mono text-xs text-primary">NETWORK HASHRATE TREND · 30 DAYS</div>
            <p className="mt-1 text-xs text-muted-foreground">
              Move the cursor across the chart for date and EH/s.
            </p>
          </div>
          <div className="font-mono text-[10px] text-muted-foreground">
            LOW {number(historyMin)} · HIGH {number(historyMax)} EH/s
          </div>
        </div>
        <div className="mt-3 rounded-sm border p-2">
          <Sparkline points={history} />
        </div>
      </div>
      <div className="mt-3 rounded-md border p-4">
        <div className="font-mono text-xs text-primary">TOP MINING POOLS · 1 WEEK</div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {(data?.topPools ?? []).map((pool, index) => (
            <div key={`${pool.name}-${index}`} className="rounded-sm border p-3">
              <div className="truncate text-sm font-medium">
                {index + 1}. {pool.name}
              </div>
              <div className="mt-2 font-mono text-lg">
                {pool.sharePercent == null ? "—" : `${pool.sharePercent.toFixed(1)}%`}
              </div>
              <div className="text-[10px] text-muted-foreground">{pool.blocks} blocks</div>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-3 rounded-md border p-4">
        <div className="font-mono text-xs text-primary">MINING PROFITABILITY CALCULATOR</div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-xs">
            ASIC hashrate (TH/s)
            <input
              className="mt-1 w-full rounded-sm border bg-card px-3 py-2 font-mono"
              type="number"
              value={hashrateTh}
              onChange={(e) => setHashrateTh(Number(e.target.value))}
            />
          </label>
          <label className="text-xs">
            Power (W)
            <input
              className="mt-1 w-full rounded-sm border bg-card px-3 py-2 font-mono"
              type="number"
              value={powerWatts}
              onChange={(e) => setPowerWatts(Number(e.target.value))}
            />
          </label>
          <label className="text-xs">
            Electricity ($/kWh)
            <input
              className="mt-1 w-full rounded-sm border bg-card px-3 py-2 font-mono"
              type="number"
              step=".01"
              value={electricityPrice}
              onChange={(e) => setElectricityPrice(Number(e.target.value))}
            />
          </label>
          <label className="text-xs">
            Hashprice ($/PH/s/day)
            <input
              className="mt-1 w-full rounded-sm border bg-card px-3 py-2 font-mono"
              type="number"
              value={hashprice}
              onChange={(e) => setHashprice(Number(e.target.value))}
            />
          </label>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {[
            ["Daily revenue", profitability.dailyRevenue],
            ["Daily power", profitability.dailyElectricity],
            ["Daily profit", profitability.dailyProfit],
            ["30d revenue", profitability.monthlyRevenue],
            ["30d power", profitability.monthlyElectricity],
            ["30d profit", profitability.monthlyProfit],
          ].map(([label, value]) => (
            <div key={label as string} className="rounded-sm border p-3">
              <div className="text-[10px] uppercase text-muted-foreground">{label}</div>
              <div className="mt-1 font-mono font-semibold">{money(value as number)}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-3 font-mono text-[10px] uppercase text-muted-foreground">
        Source: mempool.space · auto refresh 5 min
      </div>
    </section>
  );
}
