import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getMiningRevenueData } from "@/lib/mining-revenue.functions";

type Data = Awaited<ReturnType<typeof getMiningRevenueData>>;
const n = (v: number | null, d = 2) => v == null ? "—" : v.toLocaleString("en-US", { maximumFractionDigits: d });

export function MiningRevenuePanel() {
  const [data, setData] = useState<Data | null>(null); const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  async function load(){setLoading(true);setError("");try{setData(await getMiningRevenueData())}catch(e){setError(e instanceof Error?e.message:"Unable to load mining revenue data")}finally{setLoading(false)}}
  useEffect(()=>{void load();const timer=window.setInterval(()=>void load(),300000);return()=>window.clearInterval(timer)},[]);
  return <section id="mining-revenue" className="mt-4 scroll-mt-24 rounded-md border border-primary/30 bg-card p-4 sm:p-5">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="font-mono text-[10px] uppercase tracking-wider text-primary">Live miner economics</div><h2 className="mt-1 text-xl font-semibold">Mining Revenue Dashboard</h2><p className="mt-1 text-xs text-muted-foreground">Block subsidy, transaction-fee contribution, recent miner rewards and network production estimates.</p></div><Button variant="outline" size="sm" onClick={()=>void load()} disabled={loading}><RefreshCw className={`size-4 ${loading?"animate-spin":""}`}/>Refresh</Button></div>
    {error?<p className="mt-4 text-xs text-destructive">{error}</p>:null}
    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Metric label="BLOCK SUBSIDY" value={`${n(data?.subsidyBtc??null,3)} BTC`} note="Current protocol subsidy per block"/><Metric label="AVG FEES / BLOCK" value={`${n(data?.avgFeesBtc??null,4)} BTC`} note={`Fee share: ${n(data?.feeSharePercent??null,2)}% of sampled reward`}/><Metric label="AVG MINER REWARD" value={`${n(data?.avgRewardBtc??null,4)} BTC`} note="Subsidy + sampled transaction fees"/><Metric label="NETWORK HASHRATE" value={`${n(data?.networkHashrateEh??null,2)} EH/s`} note="Current network computing power"/></div>
    <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3"><Metric label="EST. BLOCKS / DAY" value={n(data?.estimatedBlocksPerDay??null,1)} note={`Recent interval: ${n(data?.avgBlockMinutes??null,1)} min`}/><Metric label="EST. DAILY ISSUANCE" value={`${n(data?.estimatedDailyIssuanceBtc??null,2)} BTC`} note="Recent block-rate estimate × subsidy"/><Metric label="EST. MINER REVENUE / DAY" value={`${n(data?.estimatedDailyMinerRevenueBtc??null,2)} BTC`} note="BTC-denominated estimate; not USD revenue"/></div>
    <div className="mt-3 rounded-md border border-border p-4"><div className="font-mono text-xs text-primary">RECENT BLOCK REWARDS</div><div className="mt-3 overflow-x-auto"><table className="w-full min-w-[560px] text-left text-xs"><thead className="font-mono text-[10px] uppercase text-muted-foreground"><tr><th className="pb-2">Height</th><th className="pb-2">Transactions</th><th className="pb-2">Fees</th><th className="pb-2">Total reward</th></tr></thead><tbody>{(data?.recentBlocks??[]).map((b,i)=><tr key={`${b.height}-${i}`} className="border-t border-border"><td className="py-2 font-mono">{n(b.height,0)}</td><td>{n(b.txCount,0)}</td><td>{n(b.feesBtc,4)} BTC</td><td className="font-mono">{n(b.totalRewardBtc,4)} BTC</td></tr>)}</tbody></table></div></div>
    <p className="mt-3 text-[10px] leading-5 text-muted-foreground">Research estimate based on recent blocks. Daily values extrapolate the sampled block interval and are not guaranteed future miner revenue. Hardware cost, pool fees, electricity and downtime are excluded.</p><div className="mt-2 font-mono text-[10px] uppercase text-muted-foreground">Source: mempool.space · auto refresh 5 min</div>
  </section>;
}
function Metric({label,value,note}:{label:string;value:string;note:string}){return <article className="rounded-md border border-border bg-background p-4"><div className="font-mono text-[10px] text-primary">{label}</div><div className="mt-2 font-mono text-xl font-semibold">{value}</div><p className="mt-2 text-[10px] text-muted-foreground">{note}</p></article>}
