import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getBitcoinNetworkActivity } from "@/lib/bitcoin-network.functions";

type Data = Awaited<ReturnType<typeof getBitcoinNetworkActivity>>;
const n = (v: number | null, digits = 0) =>
  v == null ? "—" : v.toLocaleString("en-US", { maximumFractionDigits: digits });

export function BitcoinNetworkActivityPanel() {
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  async function load() {
    setLoading(true);
    setError("");
    try {
      setData(await getBitcoinNetworkActivity());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load network data");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 120000);
    return () => window.clearInterval(timer);
  }, []);
  return (
    <section
      id="network-activity"
      className="scroll-mt-24 rounded-md border border-primary/30 bg-card p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-wider text-primary">
            Live Bitcoin network feed
          </div>
          <h2 className="mt-1 text-xl font-semibold">Bitcoin Network Activity</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Mempool pressure, recommended transaction fees and recent block production from
            mempool.space.
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
          label="MEMPOOL TRANSACTIONS"
          value={n(data?.mempoolTransactions ?? null)}
          note={`${n(data?.mempoolVsizeMb ?? null, 2)} MB virtual size`}
        />
        <Metric
          label="FASTEST FEE"
          value={`${n(data?.fastestFee ?? null)} sat/vB`}
          note={`30 min: ${n(data?.halfHourFee ?? null)} · 1h: ${n(data?.hourFee ?? null)} sat/vB`}
        />
        <Metric
          label="BLOCK HEIGHT"
          value={n(data?.blockHeight ?? null)}
          note={`Latest block: ${n(data?.latestBlockTx ?? null)} transactions`}
        />
        <Metric
          label="AVG BLOCK INTERVAL"
          value={`${n(data?.avgBlockIntervalMinutes ?? null, 1)} min`}
          note="Calculated from the latest blocks"
        />
      </div>
      <div className="mt-3 grid gap-3 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded-md border border-border p-4">
          <div className="font-mono text-xs text-primary">FEE LADDER</div>
          <div className="mt-3 space-y-2 text-xs">
            <Row label="Priority / fastest" value={data?.fastestFee} />
            <Row label="~30 minutes" value={data?.halfHourFee} />
            <Row label="~1 hour" value={data?.hourFee} />
            <Row label="Economy" value={data?.economyFee} />
            <Row label="Minimum" value={data?.minimumFee} />
          </div>
        </div>
        <div className="rounded-md border border-border p-4">
          <div className="font-mono text-xs text-primary">RECENT BLOCKS</div>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-xs">
              <thead className="font-mono text-[10px] uppercase text-muted-foreground">
                <tr>
                  <th className="pb-2">Height</th>
                  <th className="pb-2">Transactions</th>
                  <th className="pb-2">Size</th>
                  <th className="pb-2">Fees</th>
                </tr>
              </thead>
              <tbody>
                {(data?.recentBlocks ?? []).map((b, i) => (
                  <tr key={`${b.height}-${i}`} className="border-t border-border">
                    <td className="py-2 font-mono">{n(b.height)}</td>
                    <td>{n(b.txCount)}</td>
                    <td>{n(b.sizeMb, 2)} MB</td>
                    <td>{n(b.feesBtc, 4)} BTC</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <div className="mt-3 font-mono text-[10px] uppercase text-muted-foreground">
        Source: mempool.space · server feed · auto refresh 2 min
      </div>
    </section>
  );
}
function Metric({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <article className="rounded-md border border-border bg-background p-4">
      <div className="font-mono text-[10px] text-primary">{label}</div>
      <div className="mt-2 font-mono text-xl font-semibold">{value}</div>
      <p className="mt-2 text-[10px] text-muted-foreground">{note}</p>
    </article>
  );
}
function Row({ label, value }: { label: string; value: number | null | undefined }) {
  return (
    <div className="flex justify-between gap-3 border-b border-border/60 pb-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono">{n(value ?? null)} sat/vB</span>
    </div>
  );
}
