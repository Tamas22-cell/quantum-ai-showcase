import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { MarketTechnicalCharts, type MarketCandle } from "../components/web3/market-technical-charts";
import { getWeb3Monitor } from "../lib/web3-monitor.functions";
import { ArrowLeft, RefreshCw } from "lucide-react";

export const Route = createFileRoute("/web3-monitor")({ component: Web3Terminal });
type Market = { symbol: string; price: number; change: number; closes: number[] };
type Feed = Awaited<ReturnType<typeof getWeb3Monitor>>;
const symbols = ["BTC", "ETH", "SOL"] as const;
const number = (n: number | null | undefined, digits = 0) => n != null && Number.isFinite(n) ? n.toLocaleString("en-US", { maximumFractionDigits: digits }) : "Unavailable";
const dollars = (n: number | null | undefined) => n == null || !Number.isFinite(n) ? "Unavailable" : n >= 1e12 ? "$" + number(n / 1e12, 2) + "T" : n >= 1e9 ? "$" + number(n / 1e9, 2) + "B" : "$" + number(n, 2);
const panel = { border: "1px solid #263b4b", borderRadius: 16, background: "#0d1825", padding: 22 } as const;
const demoMarkets: Market[] = symbols.map((symbol, index) => ({ symbol, price: 100 + index * 10, change: index - 1, closes: Array.from({length: 48}, (_, i) => 100 + index * 10 + Math.sin(i / 5) * 3 + i * (index - 1) / 12) }));
function Web3Terminal() {
  const [feed, setFeed] = useState<Feed | null>(null);
  const [browserMarkets,setBrowserMarkets] = useState<Market[]>([]);
  const [browserNetwork,setBrowserNetwork] = useState<Feed["snapshot"] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<string>("BTC");
  const [demo, setDemo] = useState(false);
  const [intervalMinutes, setIntervalMinutes] = useState(60);
  const [liveCandles, setLiveCandles] = useState<Record<string, MarketCandle[]>>({});
  const refresh = useCallback(async () => {
    setBusy(true);
    try {
      const next = await Promise.race([
        getWeb3Monitor(),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Server request timed out")), 15000))
      ]);
      setFeed(next);
      const snapshot = next.snapshot;
      const available = next.markets.length > 0 || snapshot.blockHeight !== null || snapshot.fees !== null || snapshot.hashrate !== null || snapshot.tvl !== null;
      setError(available ? "" : "Public data providers are currently unavailable.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load live data.");
    } finally {
      setBusy(false);
    }
  }, []);
  useEffect(() => {
    void refresh();
    const timer = setInterval(() => void refresh(), 60000);
    return () => clearInterval(timer);
  }, [refresh]);
  const onLiveCandles = useCallback((symbol: string, candles: MarketCandle[]) => {
    setLiveCandles(old => ({ ...old, [symbol]: candles }));
  }, []);
  useEffect(() => {
    if (demo) return;
    let alive = true;
    const pairs = [{symbol:"BTC",pair:"XBTUSD"},{symbol:"ETH",pair:"ETHUSD"},{symbol:"SOL",pair:"SOLUSD"}];
    const load = async () => {
      const results = await Promise.allSettled(pairs.map(async p => {
        const response = await fetch("https://api.kraken.com/0/public/Ticker?pair="+p.pair, {signal:AbortSignal.timeout(8000)});
        if (!response.ok) throw new Error("HTTP "+response.status);
        const json = await response.json();
        const row = Object.values(json.result ?? {})[0] as {c?:string[];o?:string}|undefined;
        const price = Number(row?.c?.[0]), open = Number(row?.o);
        if (!Number.isFinite(price) || price <= 0) throw new Error("Invalid ticker");
        return {symbol:p.symbol,price,change:open>0?(price-open)/open*100:0,closes:[] as number[]};
      }));
      if (!alive) return;
      const valid = results.filter((r):r is PromiseFulfilledResult<Market> => r.status==="fulfilled").map(r=>r.value);
      if (valid.length) setBrowserMarkets(valid);
    };
    void load();
    const timer = setInterval(()=>void load(),60000);
    return ()=>{alive=false;clearInterval(timer)};
  },[demo]);
  useEffect(() => {
    if (demo) return;
    let alive = true;
    const load = async () => {
      const endpoints = [
        "https://mempool.space/api/blocks/tip/height",
        "https://mempool.space/api/v1/fees/recommended",
        "https://mempool.space/api/v1/mining/hashrate/1m",
        "https://api.coingecko.com/api/v3/global/decentralized_finance_defi"
      ];
      const results = await Promise.allSettled(endpoints.map(async url => {
        const response = await fetch(url,{signal:AbortSignal.timeout(8000)});
        if(!response.ok) throw new Error("HTTP "+response.status);
        return response.json();
      }));
      if (!alive) return;
      const get=(i:number):any=>results[i].status==="fulfilled"?(results[i] as PromiseFulfilledResult<any>).value:null;
      const height=Number(get(0)),fees=get(1),hash=Number(get(2)?.currentHashrate),cap=Number(get(3)?.data?.defi_market_cap);
      setBrowserNetwork({
        blockHeight:Number.isFinite(height)&&height>0?height:null,
        fees:fees&&Number.isFinite(Number(fees.fastestFee))?{fastestFee:Number(fees.fastestFee),halfHourFee:Number(fees.halfHourFee),hourFee:Number(fees.hourFee)}:null,
        hashrate:Number.isFinite(hash)&&hash>0?hash:null,
        tvl:Number.isFinite(cap)&&cap>0?cap:null
      });
    };
    void load();
    const timer=setInterval(()=>void load(),60000);
    return ()=>{alive=false;clearInterval(timer)};
  },[demo]);
  const markets = demo ? demoMarkets : symbols.map(symbol => browserMarkets.find(m=>m.symbol===symbol) ?? feed?.markets.find(m=>m.symbol===symbol)).filter((m):m is Market=>Boolean(m));
  const market = markets.find(m => m.symbol === selected);
  const closes = demo ? market?.closes ?? [] : liveCandles[selected]?.map(c => c.close) ?? market?.closes ?? [];
  const candles = demo ? closes.map((close, i) => ({ open: i ? closes[i - 1] : close, close, high: close * 1.002, low: close * 0.998 })) : [];
  const snapshot = demo ? { blockHeight: 850000, fees: {fastestFee: 12, halfHourFee: 8, hourFee: 5}, hashrate: 650e18, tvl: 95000000000 } : { blockHeight: browserNetwork?.blockHeight ?? feed?.snapshot.blockHeight ?? null, fees: browserNetwork?.fees ?? feed?.snapshot.fees ?? null, hashrate: browserNetwork?.hashrate ?? feed?.snapshot.hashrate ?? null, tvl: browserNetwork?.tvl ?? feed?.snapshot.tvl ?? null };
  const indicator = (() => {
    if (closes.length < 15) return null;
    const window = closes.slice(-15);
    let gains = 0, losses = 0;
    for (let i = 1; i < window.length; i++) {
      const difference = window[i] - window[i - 1];
      gains += Math.max(0, difference);
      losses += Math.max(0, -difference);
    }
    const rsi = losses === 0 ? (gains === 0 ? 50 : 100) : 100 - 100 / (1 + gains / losses);
    const sma = closes.slice(-14).reduce((a, b) => a + b, 0) / 14;
    return { rsi, sma };
  })();
  const cards = [
    { label: "BITCOIN BLOCK HEIGHT", value: number(snapshot?.blockHeight), source: "mempool.space" },
    { label: "BTC FASTEST FEE", value: snapshot?.fees ? number(snapshot.fees.fastestFee) + " sat/vB" : "Unavailable", source: "mempool.space" },
    { label: "BTC HASHRATE", value: snapshot?.hashrate ? number(snapshot.hashrate / 1e18, 2) + " EH/s" : "Unavailable", source: "mempool.space" },
    { label: "DEFI MARKET CAP", value: dollars(snapshot?.tvl), source: "CoinGecko · Market cap, not TVL" }
  ];
  return <main style={{minHeight:"100vh",background:"#070d16",color:"#e5f1fa",padding:"clamp(18px,4vw,52px)",fontFamily:"Inter,system-ui,sans-serif"}}>
    <div style={{maxWidth:1250,margin:"auto"}}>
      <a href="/" style={{color:"#9fbbce",display:"inline-flex",alignItems:"center",gap:8,textDecoration:"none"}}><ArrowLeft size={16}/> Back to Research Lab</a>
      <header style={{display:"flex",justifyContent:"space-between",gap:20,alignItems:"center",flexWrap:"wrap",margin:"32px 0"}}>
        <div><div style={{fontSize:12,color:"#43e6bc",letterSpacing:2}}>QUANTUM AI RESEARCH LAB / WEB3</div><h1 style={{fontSize:"clamp(30px,5vw,54px)",margin:"8px 0"}}>Web3 Intelligence Terminal</h1><p style={{color:"#9fbbce"}}>Bitcoin network · Live crypto markets · DeFi intelligence</p></div>
        <button type="button" disabled={busy} onClick={() => {setDemo(false);void refresh();}} style={{background:"#14342d",color:"#43e6bc",border:"1px solid #43e6bc",padding:"12px 20px",borderRadius:10,cursor:"pointer"}}><RefreshCw size={15} style={{display:"inline",marginRight:8}}/>{busy?"Refreshing…":"Refresh live data"}</button>
      </header>
      <div style={{display:"flex",alignItems:"center",gap:14,flexWrap:"wrap",marginBottom:24}}>
        <button type="button" onClick={() => setDemo(d => !d)} style={{background:"#182639",color:"#e5f1fa",border:"1px solid #40576b",padding:"10px 16px",borderRadius:9,cursor:"pointer"}}>{demo?"Exit demo":"Interactive demo"}</button>
        <span role="status" style={{color:demo?"#fbbf24":error?"#fca5a5":"#43e6bc",fontSize:13}}>{demo?"DEMO · Simulated values, not live prices":(markets.length||snapshot.blockHeight||snapshot.fees||snapshot.tvl?"LIVE · Available public feeds":error||(!feed?"Connecting to live feeds…":"Some public feeds unavailable"))}</span>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(210px,1fr))",gap:14}}>
        {cards.map(c=><section key={c.label} style={panel}><div style={{fontSize:11,color:"#43e6bc",letterSpacing:1}}>{c.label}</div><div style={{fontSize:26,fontWeight:700,margin:"18px 0 12px"}}>{c.value}</div><div style={{fontSize:12,color:"#9fbbce"}}>{c.source}</div></section>)}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,350px),1fr))",gap:14,marginTop:16}}>
        <section style={panel}><h2 style={{fontSize:21}}>Bitcoin transaction priority</h2>{([["Fastest",snapshot?.fees?.fastestFee],["30 minutes",snapshot?.fees?.halfHourFee],["60 minutes",snapshot?.fees?.hourFee]] as const).map(([name,fee])=><div key={name} style={{display:"flex",justifyContent:"space-between",padding:"14px 0",borderBottom:"1px solid #263b4b"}}><span>{name}</span><strong>{fee==null?"Unavailable":number(fee)+" sat/vB"}</strong></div>)}<p style={{fontSize:12,color:"#9fbbce"}}>Estimates, not guaranteed confirmation times.</p></section>
        <section style={panel}><h2 style={{fontSize:21}}>DeFi market capitalization</h2><p style={{fontSize:38,color:"#43e6bc",fontWeight:700}}>{dollars(snapshot?.tvl)}</p><p style={{fontSize:13,color:"#9fbbce"}}>{demo?"Simulated example":"CoinGecko public API · Current market cap in USD. Historical TVL is not displayed."}</p></section>
      </div>
      <section style={{...panel,marginTop:16}}>
        <div style={{fontSize:12,color:"#43e6bc",letterSpacing:1}}>KRAKEN PUBLIC MARKET DATA</div><h2 style={{fontSize:24}}>BTC / ETH / SOL</h2><p style={{color:"#9fbbce",fontSize:13}}>Prices and market indicators · Updates every 60 seconds</p>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:12,margin:"18px 0"}}>
          {symbols.map(symbol=>{const m=markets.find(x=>x.symbol===symbol);return <button type="button" key={symbol} aria-pressed={selected===symbol} onClick={()=>setSelected(symbol)} style={{textAlign:"left",background:selected===symbol?"#12382f":"#142334",border:selected===symbol?"1px solid #43e6bc":"1px solid #33495b",borderRadius:12,color:"#e5f1fa",padding:18,cursor:"pointer"}}><div style={{fontSize:13,color:"#9fbbce"}}>{symbol}/USD</div><strong style={{fontSize:25,display:"block",margin:"12px 0"}}>{m?(demo?number(m.price,2)+" pts":dollars(m.price)):"Unavailable"}</strong><span style={{color:m&&m.change<0?"#fb7185":"#43e6bc"}}>{m?(m.change>=0?"+":"")+number(m.change,2)+"%":"Feed unavailable"}</span></button>})}
        </div>
        <div style={{display:"flex",gap:18,flexWrap:"wrap",fontSize:14,margin:"18px 0"}}><strong>{selected}/USD</strong><span>SMA14: {number(indicator?.sma,2)}</span><span>RSI14: {number(indicator?.rsi,1)}</span></div>
        <MarketTechnicalCharts symbol={selected} candles={candles} mode={demo?"demo":"live"} onLiveCandles={onLiveCandles}/>
        <p style={{fontSize:12,color:"#9fbbce"}}>RSI and MACD are descriptive indicators, not investment advice. Live data may be delayed.</p>
      </section>
      <footer style={{margin:"26px 0",fontSize:12,color:"#9fbbce"}}>Public API data · No wallet connection required · Independent provider failures do not prevent the page from rendering.</footer>
    </div>
  </main>;
}
