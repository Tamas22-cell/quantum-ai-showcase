import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getOnchainIntelligence } from "@/lib/onchain-intelligence.functions";

type Data = Awaited<ReturnType<typeof getOnchainIntelligence>>;
const n = (v: number | null | undefined, d = 2) =>
  v == null ? "—" : v.toLocaleString("en-US", { maximumFractionDigits: d });

export function OnchainIntelligencePanel() {
  const [data, setData] = useState<Data | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  async function load() {
    setLoading(true);
    setError("");
    try {
      setData(await getOnchainIntelligence());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load on-chain data");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
    const t = window.setInterval(() => void load(), 120000);
    return () => window.clearInterval(t);
  }, []);
  return (
    <section
      id="on-chain"
      className="mt-4 scroll-mt-24 rounded-md border border-primary/30 bg-card p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-wider text-primary">
            Live public-chain signals
          </div>
          <h2 className="mt-1 text-xl font-semibold">On-chain Intelligence</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Transparent Bitcoin transaction, block and Lightning-network activity. No proprietary
            exchange-flow or MVRV/SOPR values are fabricated.
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
          label="RECENT TX SAMPLE"
          value={`${n(data?.recentValueBtc)} BTC`}
          note={`${n(data?.recentTxCount, 0)} latest mempool transactions`}
        />
        <Metric
          label="SAMPLE FEE RATE"
          value={`${n(data?.avgRecentFeeRate, 1)} sat/vB`}
          note={`${n(data?.recentFeesBtc, 6)} BTC fees in sample`}
        />
        <Metric
          label="RECENT BLOCK ACTIVITY"
          value={n(data?.sampledBlockTransactions, 0)}
          note={`${n(data?.sampledBlockFeesBtc, 4)} BTC fees · latest 6 blocks`}
        />
        <Metric
          label="LIGHTNING CAPACITY"
          value={`${n(data?.lightningCapacityBtc)} BTC`}
          note={`${n(data?.lightningNodes, 0)} nodes · ${n(data?.lightningChannels, 0)} channels`}
        />
      </div>
      <div className="mt-3 rounded-md border border-border p-4">
        <div className="font-mono text-xs text-primary">LATEST MEMPOOL TRANSACTIONS</div>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-xs">
            <thead className="font-mono text-[10px] uppercase text-muted-foreground">
              <tr>
                <th className="pb-2">TXID</th>
                <th className="pb-2">Value</th>
                <th className="pb-2">Fee rate</th>
              </tr>
            </thead>
            <tbody>
              {(data?.recentTransactions ?? []).map((t, i) => (
                <tr key={`${t.txid}-${i}`} className="border-t border-border">
                  <td className="py-2 font-mono">
                    {t.txid ? `${t.txid.slice(0, 12)}…${t.txid.slice(-8)}` : "—"}
                  </td>
                  <td>{n(t.valueBtc, 8)} BTC</td>
                  <td>{n(t.feeRate, 1)} sat/vB</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="mt-3 rounded-sm border border-border bg-background p-3 text-[10px] leading-5 text-muted-foreground">
        <span className="font-mono text-primary">METHODOLOGY:</span> These are observable public
        Bitcoin/Lightning activity samples, not estimates of exchange inflows/outflows,
        active-address counts, MVRV or SOPR. Those metrics require a separately licensed or
        validated data provider.
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
