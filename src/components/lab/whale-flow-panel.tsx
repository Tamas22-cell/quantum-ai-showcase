import { useEffect, useState } from "react";
import { RefreshCw, Waves } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getWhaleFlow } from "@/lib/whale-flow.functions";

type Data = Awaited<ReturnType<typeof getWhaleFlow>>;
const n=(v:number|null|undefined,d=2)=>v==null?"—":v.toLocaleString("en-US",{maximumFractionDigits:d});
const usd=(v:number|null|undefined)=>v==null?"—":`$${v.toLocaleString("en-US",{maximumFractionDigits:0})}`;

export function WhaleFlowPanel(){
 const[data,setData]=useState<Data|null>(null),[loading,setLoading]=useState(true),[error,setError]=useState("");
 async function load(){setLoading(true);setError("");try{setData(await getWhaleFlow())}catch(e){setError(e instanceof Error?e.message:"Unable to load whale-flow data")}finally{setLoading(false)}}
 useEffect(()=>{void load();const t=window.setInterval(()=>void load(),120000);return()=>window.clearInterval(t)},[]);
 return <section id="whale-flow" className="mt-4 scroll-mt-24 rounded-md border border-primary/30 bg-card p-4 sm:p-5">
  <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-primary"><Waves className="size-4"/>Live large-transfer research</div><h2 className="mt-1 text-xl font-semibold">Whale Flow Monitor</h2><p className="mt-1 max-w-3xl text-xs text-muted-foreground">Detects unusually large BTC transfers in the latest public mempool sample. This is transparent whale-activity research, not exchange-wallet attribution.</p></div><Button variant="outline" size="sm" onClick={()=>void load()} disabled={loading}><RefreshCw className={`size-4 ${loading?"animate-spin":""}`}/>Refresh</Button></div>
  {error?<p className="mt-4 text-xs text-destructive">{error}</p>:null}
  <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Metric label="WHALE TX" value={n(data?.whaleTransactions,0)} note={`≥ ${n(data?.thresholdBtc,0)} BTC in latest sample`}/><Metric label="WHALE VOLUME" value={`${n(data?.whaleVolumeBtc)} BTC`} note={usd(data?.whaleVolumeUsd)}/><Metric label="WHALE SHARE" value={data?.whaleSharePct==null?"—":`${n(data.whaleSharePct,1)}%`} note="Share of sampled transfer value"/><Metric label="BTC PRICE" value={usd(data?.btcUsd)} note={`${n(data?.sampleTransactions,0)} recent transactions scanned`}/></div>
  <div className="mt-3 rounded-md border border-border p-4"><div className="font-mono text-xs text-primary">LARGEST RECENT TRANSFERS</div><div className="mt-3 overflow-x-auto"><table className="w-full min-w-[620px] text-left text-xs"><thead className="font-mono text-[10px] uppercase text-muted-foreground"><tr><th className="pb-2">TXID</th><th className="pb-2">BTC</th><th className="pb-2">USD estimate</th><th className="pb-2">Fee rate</th></tr></thead><tbody>{(data?.largest??[]).map((t,i)=><tr key={`${t.txid}-${i}`} className="border-t border-border"><td className="py-2 font-mono">{t.txid?`${t.txid.slice(0,12)}…${t.txid.slice(-8)}`:"—"}</td><td>{n(t.valueBtc,4)}</td><td>{usd(t.valueUsd)}</td><td>{n(t.feeRate,1)} sat/vB</td></tr>)}</tbody></table></div></div>
  <div className="mt-3 rounded-sm border border-border bg-background p-3 text-[10px] leading-5 text-muted-foreground"><span className="font-mono text-primary">METHODOLOGY:</span> {data?.methodology??"Public Bitcoin mempool sample; no exchange-wallet labels."} A future Exchange Flow layer can be activated only with a validated labeled-wallet provider such as CryptoQuant or Glassnode.</div>
  <div className="mt-3 font-mono text-[10px] uppercase text-muted-foreground">Source: mempool.space · public Bitcoin data · auto refresh 2 min</div>
 </section>
}
function Metric({label,value,note}:{label:string;value:string;note:string}){return <article className="rounded-md border border-border bg-background p-4"><div className="font-mono text-[10px] text-primary">{label}</div><div className="mt-2 font-mono text-xl font-semibold">{value}</div><p className="mt-2 text-[10px] text-muted-foreground">{note}</p></article>}
