import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getMiningPools } from "@/lib/mining-pools.functions";

type Pool = { name: string; share: number; blocks: number };

export function ExchangeFlowPanel() {
  const [pools, setPools] = useState<Pool[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true); setError("");
    try {
      const r = await fetch("https://mempool.space/api/v1/mining/pools/24h");
      if (!r.ok) throw new Error(`mempool.space returned ${r.status}`);
      const json = await r.json();
      const rows = (json.pools ?? []).slice(0, 8).map((p: any) => ({
        name: p.name ?? p.slug ?? "Unknown",
        share: Number(p.sharePercent ?? p.share ?? 0),
        blocks: Number(p.blockCount ?? p.blocks ?? 0),
      }));
      setPools(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load mining-pool data");
    } finally { setLoading(false); }
  }

  useEffect(() => { void load(); const t = window.setInterval(() => void load(), 300000); return () => window.clearInterval(t); }, []);

  const total = pools.reduce((s, p) => s + p.blocks, 0);

  return <section id="mining-pools" className="mt-4 w-full max-w-full scroll-mt-24 overflow-hidden rounded-md border border-primary/30 bg-card p-4 sm:p-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><div className="font-mono text-[10px] uppercase tracking-[0.18em] text-primary">LIVE MINING NETWORK</div>
      <h2 className="mt-1 text-xl font-semibold">Bitcoin Mining Pool Distribution</h2>
      <p className="mt-1 text-xs text-muted-foreground">Known mining pools and their share of Bitcoin blocks over the last 24 hours.</p></div>
      <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}><RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />Refresh</Button>
    </div>
    {error ? <p className="mt-4 text-xs text-destructive">{error}</p> : null}
    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
      <Metric label="SAMPLED BLOCKS" value={loading && !pools.length ? "Loading…" : String(total)} note="Known pools · trailing 24h" />
      <Metric label="TOP POOL" value={pools[0]?.name ?? "—"} note={pools[0] ? `${pools[0].share.toFixed(1)}% block share` : "Live feed"} />
      <Metric label="POOLS DETECTED" value={String(pools.length || "—")} note="Returned by public source" />
    </div>
    <div className="mt-3 rounded-md border border-border bg-background p-4">
      <div className="font-mono text-xs text-primary">BLOCK DISTRIBUTION</div>
      <div className="mt-3 space-y-3">
        {pools.map((p) => <div key={p.name} className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 items-center">
          <div className="min-w-0"><div className="truncate text-xs">{p.name}</div><div className="mt-1 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary" style={{width:`${Math.min(100,Math.max(0,p.share))}%`}} /></div></div>
          <div className="font-mono text-xs">{p.share.toFixed(1)}%</div>
        </div>)}
        {!loading && !pools.length && !error ? <p className="text-xs text-muted-foreground">No pool records returned.</p> : null}
      </div>
    </div>
    <div className="mt-3 font-mono text-[10px] uppercase text-muted-foreground">Source: mempool.space · mining pools · auto refresh 5 min</div>
  </section>;
}

function Metric({label,value,note}:{label:string;value:string;note:string}) {
  return <article className="min-w-0 rounded-md border border-border bg-background p-4"><div className="font-mono text-[10px] text-primary">{label}</div><div className="mt-2 truncate font-mono text-xl font-semibold">{value}</div><p className="mt-2 text-[10px] text-muted-foreground">{note}</p></article>;
}