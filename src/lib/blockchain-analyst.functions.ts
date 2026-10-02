import { createServerFn } from "@tanstack/react-start";

type M={count?:number;vsize?:number};
type F={fastestFee?:number;hourFee?:number};
type H={currentHashrate?:number;currentDifficulty?:number};
type D={difficultyChange?:number};
type B={height?:number;timestamp?:number;tx_count?:number;extras?:{totalFees?:number}}[];
type R={txid?:string;value?:number;fee?:number;vsize?:number}[];

const WHALE_THRESHOLD_BTC=10;

async function j<T>(p:string):Promise<T>{
 const r=await fetch(`https://mempool.space/api${p}`,{headers:{accept:"application/json","user-agent":"quantum-ai-showcase/1.0"}});
 if(!r.ok)throw new Error(`mempool.space returned ${r.status}`);
 return r.json() as Promise<T>;
}

export const getBlockchainAnalyst=createServerFn({method:"GET"}).handler(async()=>{
 const[m,f,h,d,b,recent]=await Promise.all([
  j<M>("/mempool"),j<F>("/v1/fees/recommended"),j<H>("/v1/mining/hashrate/1m"),j<D>("/v1/difficulty-adjustment"),j<B>("/v1/blocks"),j<R>("/mempool/recent")
 ]);
 const ts=b.map(x=>x.timestamp).filter((x):x is number=>typeof x==="number");
 const ints=ts.slice(0,-1).map((x,i)=>(x-ts[i+1])/60).filter(x=>x>0);
 const interval=ints.length?ints.reduce((a,c)=>a+c,0)/ints.length:null;
 const fees=b.map(x=>x.extras?.totalFees).filter((x):x is number=>typeof x==="number");
 const avgFees=fees.length?fees.reduce((a,c)=>a+c,0)/fees.length/1e8:null;
 const hash=typeof h.currentHashrate==="number"?h.currentHashrate/1e18:null;
 const diff=typeof d.difficultyChange==="number"?d.difficultyChange:null;
 const mem=(m.vsize??0)/1e6;
 const hour=f.hourFee??null;
 const transfers=recent.flatMap(t=>typeof t.value==="number"&&t.value>0?[t.value/1e8]:[]);
 const totalTransfer=transfers.reduce((a,c)=>a+c,0);
 const whaleTransfers=transfers.filter(v=>v>=WHALE_THRESHOLD_BTC);
 const whaleVolume=whaleTransfers.reduce((a,c)=>a+c,0);
 const whaleShare=totalTransfer>0?whaleVolume/totalTransfer*100:null;
 const largestTransfer=transfers.length?Math.max(...transfers):null;
 const observations=[
  hash==null?null:`Network security: hashrate is ${hash.toFixed(1)} EH/s.`,
  interval==null?null:`Block production: recent blocks average ${interval.toFixed(1)} minutes versus the protocol target of about 10 minutes.`,
  diff==null?null:`Difficulty: current retarget estimate is ${diff>=0?'+':''}${diff.toFixed(2)}%.`,
  hour==null?null:`Fee market: the current 1-hour recommendation is ${hour} sat/vB; mempool virtual size is ${mem.toFixed(1)} MB.`,
  avgFees==null?null:`Miner economics: sampled recent blocks average ${avgFees.toFixed(4)} BTC in transaction fees.`,
  whaleShare==null?null:`Whale activity: ${whaleTransfers.length} transfer(s) at or above ${WHALE_THRESHOLD_BTC} BTC account for ${whaleShare.toFixed(1)}% of the latest sampled transfer value${largestTransfer==null?'.':`; largest observed transfer is ${largestTransfer.toFixed(2)} BTC.`}`
 ].filter((x):x is string=>x!=null);
 const watch=[
  interval!=null&&interval>12?"Recent block production is slower than the 10-minute target; monitor whether this persists.":"Recent block timing does not show a sustained slowdown in this small sample.",
  hour!=null&&hour>25?"Fee pressure is elevated relative to a low-congestion baseline.":"Fee pressure is currently moderate/low by this model's threshold.",
  diff!=null&&diff< -5?"The estimated difficulty adjustment is materially negative; watch hashrate and block cadence together.":"No large negative difficulty adjustment is indicated by the current estimate.",
  whaleShare!=null&&whaleShare>70?"Large transfers dominate the latest mempool sample. Treat this as a whale-activity flag, not a directional buy/sell signal because wallet ownership is not attributed.":"Large-transfer concentration is not dominant in the latest sample by this model's threshold."
 ];
 return{observations,watch,evidence:{blockHeight:b[0]?.height??null,hashrateEh:hash,avgBlockMinutes:interval,difficultyChange:diff,hourFee:hour,mempoolMb:mem,avgFeesBtc:avgFees,whaleTransactions:whaleTransfers.length,whaleVolumeBtc:whaleVolume,whaleSharePct:whaleShare,largestTransferBtc:largestTransfer},updatedAt:new Date().toISOString(),mode:"Evidence-based automated analyst"};
});
