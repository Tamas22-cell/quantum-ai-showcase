import { useEffect, useState } from "react";
import { RefreshCw, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

type FeeData = {
  fastestFee: number;
  halfHourFee: number;
  hourFee: number;
  economyFee: number;
  minimumFee: number;
};

type MempoolData = { count: number; vsize: number; total_fee: number };

export function ExchangeFlowPanel() {
  const [fees, setFees] = useState<FeeData | null>(null);
  const [mempool, setMempool] = useState<MempoolData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const [feesResponse, mempoolResponse] = await Promise.all([
        fetch("https://mempool.space/api/v1/fees/recommended", { cache: "no-store" }),
        fetch("https://mempool.space/api/mempool", { cache: "no-store" }),
      ]);
      if (!feesResponse.ok || !mempoolResponse.ok) throw new Error("Bitcoin network data feed unavailable");
      const feeData = await feesResponse.json();
      const mempoolData = await mempoolResponse.json();
      setFees(feeData);
      setMempool(mempoolData);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load Bitcoin network fee data");
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
    <section id="fee-intelligence" className="mt-4 w-full max-w-full overflow-hidden rounded-md border border-primary/30 bg-card p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-primary">LIVE BITCOIN NETWORK</div>
          <h2 className="mt-1 text-xl font-semibold">Bitcoin Fee &amp; Mempool Intelligence</h2>
          <p className="mt-1 max-w-3xl text-xs leading-5 text-muted-foreground">
            Live recommended fee levels and current mempool pressure from the public Bitcoin network.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} aria-hidden="true" />
          Refresh
        </Button>
      </div>

      {error ? <div className="mt-4 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">{error}</div> : null}

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Metric label="NEXT BLOCK" value={fees ? `${fees.fastestFee} sat/vB` : loading ? "Loading…" : "—"} note="Fast confirmation" />
        <Metric label="~30 MIN" value={fees ? `${fees.halfHourFee} sat/vB` : loading ? "Loading…" : "—"} note="Medium priority" />
        <Metric label="~60 MIN" value={fees ? `${fees.hourFee} sat/vB` : loading ? "Loading…" : "—"} note="Lower priority" />
        <Metric label="ECONOMY" value={fees ? `${fees.economyFee} sat/vB` : loading ? "Loading…" : "—"} note="Economy fee" />
        <Metric label="MEMPOOL" value={mempool ? mempool.count.toLocaleString() : loading ? "Loading…" : "—"} note="Unconfirmed transactions" />
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
        <div className="min-w-0 rounded-md border border-border bg-background p-4">
          <div className="flex items-center gap-2 font-mono text-xs text-primary">
            <Zap className="size-4" aria-hidden="true" />
            FEE PRESSURE
          </div>
          <div className="mt-3 flex items-end gap-3">
            <span className="font-mono text-3xl font-semibold">{fees?.fastestFee ?? "—"}</span>
            <span className="pb-1 font-mono text-[10px] text-muted-foreground">sat/vB · next block</span>
          </div>
          <p className="mt-2 text-[11px] leading-4 text-muted-foreground">
            Higher recommended fees indicate stronger competition for near-term block space.
          </p>
        </div>
        <div className="min-w-0 rounded-md border border-border bg-background p-4">
          <div className="font-mono text-xs text-primary">MEMPOOL PRESSURE</div>
          <div className="mt-3 font-mono text-2xl font-semibold">
            {mempool ? `${(mempool.vsize / 1_000_000).toFixed(2)} MB` : "—"}
          </div>
          <p className="mt-2 text-[11px] leading-4 text-muted-foreground">
            Current unconfirmed transaction virtual size. Source data is refreshed automatically.
          </p>
        </div>
      </div>

      <div className="mt-3 font-mono text-[10px] uppercase text-muted-foreground">
        Source: mempool.space · recommended fees + mempool · auto refresh 2 min
      </div>
    </section>
  );
}

function Metric({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <article className="min-w-0 rounded-md border border-border bg-background p-4">
      <div className="font-mono text-[10px] text-primary">{label}</div>
      <div className="mt-2 truncate font-mono text-xl font-semibold">{value}</div>
      <p className="mt-2 text-[10px] text-muted-foreground">{note}</p>
    </article>
  );
}
