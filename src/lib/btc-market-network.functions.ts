import { createServerFn } from "@tanstack/react-start";

type MarketChart = { prices?: [number, number][] };
type HashrateResponse = { hashrates?: { timestamp?: number; avgHashrate?: number }[]; currentHashrate?: number; currentDifficulty?: number };
type DifficultyResponse = { difficultyChange?: number };

async function mempool<T>(path:string):Promise<T>{const r=await fetch(`https://mempool.space/api${path}`,{headers:{accept:"application/json","user-agent":"quantum-ai-showcase/1.0"}});if(!r.ok)throw new Error(`mempool.space returned ${r.status}`);return r.json() as Promise<T>}
async function coingecko<T>(path:string):Promise<T>{const r=await fetch(`https://api.coingecko.com/api/v3${path}`,{headers:{accept:"application/json","user-agent":"quantum-ai-showcase/1.0"}});if(!r.ok)throw new Error(`CoinGecko returned ${r.status}`);return r.json() as Promise<T>}

export const getBtcMarketNetwork = createServerFn({method:"GET"}).handler(async()=>{
 const [priceResult,hashResult,diffResult]=await Promise.allSettled([coingecko<MarketChart>("/coins/bitcoin/market_chart?vs_currency=usd&days=30&interval=daily"),mempool<HashrateResponse>("/v1/mining/hashrate/1m"),mempool<DifficultyResponse>("/v1/difficulty-adjustment")]);
 const price=priceResult.status==="fulfilled"?priceResult.value:null;const hash=hashResult.status==="fulfilled"?hashResult.value:null;const diff=diffResult.status==="fulfilled"?diffResult.value:null;
 const prices=(price?.prices??[]).map(([timestamp,value])=>({timestamp:Math.floor(timestamp/1000),value})).filter(x=>Number.isFinite(x.value));
 const hashrate=(hash?.hashrates??[]).map(x=>({timestamp:x.timestamp??0,value:typeof x.avgHashrate==="number"?x.avgHashrate/1e18:null})).filter((x):x is {timestamp:number;value:number}=>x.timestamp>0&&x.value!=null);
 const latestPrice=prices.at(-1)?.value??null;const firstPrice=prices[0]?.value??null;const change30d=latestPrice!=null&&firstPrice?((latestPrice/firstPrice)-1)*100:null;
 return {prices,hashrate,latestPrice,change30d,currentHashrateEh:typeof hash?.currentHashrate==="number"?hash.currentHashrate/1e18:null,currentDifficultyT:typeof hash?.currentDifficulty==="number"?hash.currentDifficulty/1e12:null,nextDifficultyChange:typeof diff?.difficultyChange==="number"?diff.difficultyChange:null,updatedAt:new Date().toISOString()};
});
