import { useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getBtcMarketNetwork } from "@/lib/btc-market-network.functions";
type Data = Awaited<ReturnType<typeof getBtcMarketNetwork>>;
type Point = { timestamp: number; value: number };
const n = (v: number | null, d = 2) =>
  v == null ? "—" : v.toLocaleString("en-US", { maximumFractionDigits: d });
function Chart({ points, format }: { points: Point[]; format: (v: number) => string }) {
  const [hover, setHover] = useState<number | null>(null);
  if (points.length < 2)
    return (
      <div className="flex h-48 items-center justify-center text-xs text-muted-foreground">
        Chart data unavailable.
      </div>
    );
  const w = 900,
    h = 220,
    p = 14,
    vals = points.map((x) => x.value),
    min = Math.min(...vals),
    max = Math.max(...vals),
    span = max - min || 1,
    xy = points.map((q, i) => ({
      x: p + (i / (points.length - 1)) * (w - p * 2),
      y: h - p - ((q.value - min) / span) * (h - p * 2),
    })),
    active = hover == null ? null : xy[hover],
    point = hover == null ? null : points[hover];
  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="none"
        className="h-48 w-full cursor-crosshair"
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          setHover(
            Math.round(
              Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * (points.length - 1),
            ),
          );
        }}
        onMouseLeave={() => setHover(null)}
      >
        <polyline
          points={xy.map((q) => `${q.x},${q.y}`).join(" ")}
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
              strokeDasharray="4 4"
              className="text-muted-foreground"
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
          className="pointer-events-none absolute top-2 rounded-sm border bg-card px-3 py-2 font-mono text-[10px] shadow"
          style={{ left: `${Math.max(5, Math.min(78, (active.x / w) * 100))}%` }}
        >
          <div>{new Date(point.timestamp * 1000).toLocaleDateString("en-GB")}</div>
          <div className="mt-1 text-primary">{format(point.value)}</div>
        </div>
      ) : null}
    </div>
  );
}
export function BtcMarketNetworkPanel() {
  const [data, setData] = useState<Data | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [mode, setMode] = useState<"price" | "hashrate">("price");
  async function load() {
    setLoading(true);
    setError("");
    try {
      setData(await getBtcMarketNetwork());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load BTC market/network data");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
    const t = window.setInterval(() => void load(), 300000);
    return () => window.clearInterval(t);
  }, []);
  const points = useMemo(
    () => (mode === "price" ? (data?.prices ?? []) : (data?.hashrate ?? [])),
    [data, mode],
  );
  return (
    <section
      id="market-network"
      className="mt-4 scroll-mt-24 rounded-md border border-primary/30 bg-card p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="font-mono text-[10px] uppercase text-primary">
            Market × network intelligence
          </div>
          <h2 className="mt-1 text-xl font-semibold">BTC Market + Network</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Interactive 30-day Bitcoin price and network hashrate research.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>
      {error ? <p className="mt-4 text-xs text-destructive">{error}</p> : null}
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric
          label="BTC PRICE"
          value={data?.latestPrice == null ? "—" : `$${n(data.latestPrice, 0)}`}
        />
        <Metric
          label="30D PRICE CHANGE"
          value={
            data?.change30d == null ? "—" : `${data.change30d >= 0 ? "+" : ""}${n(data.change30d)}%`
          }
        />
        <Metric label="NETWORK HASHRATE" value={`${n(data?.currentHashrateEh ?? null)} EH/s`} />
        <Metric
          label="NEXT DIFFICULTY"
          value={
            data?.nextDifficultyChange == null
              ? "—"
              : `${data.nextDifficultyChange >= 0 ? "+" : ""}${n(data.nextDifficultyChange)}%`
          }
        />
      </div>
      <div className="mt-3 rounded-md border p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="font-mono text-xs text-primary">INTERACTIVE 30-DAY CHART</div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={mode === "price" ? "default" : "outline"}
              onClick={() => setMode("price")}
            >
              BTC Price
            </Button>
            <Button
              size="sm"
              variant={mode === "hashrate" ? "default" : "outline"}
              onClick={() => setMode("hashrate")}
            >
              Hashrate
            </Button>
          </div>
        </div>
        <div className="mt-3 rounded-sm border p-2">
          <Chart
            points={points}
            format={(v) => (mode === "price" ? `$${n(v, 0)}` : `${n(v, 2)} EH/s`)}
          />
        </div>
        <p className="mt-2 text-[10px] text-muted-foreground">
          Move across the chart to inspect date and value. Price: CoinGecko. Network: mempool.space.
        </p>
      </div>
      <div className="mt-3 font-mono text-[10px] uppercase text-muted-foreground">
        Auto refresh 5 min · market and network feeds remain independently sourced
      </div>
    </section>
  );
}
function Metric({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-md border bg-background p-4">
      <div className="font-mono text-[10px] text-primary">{label}</div>
      <div className="mt-2 font-mono text-xl font-semibold">{value}</div>
    </article>
  );
}
