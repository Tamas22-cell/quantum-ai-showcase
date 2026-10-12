import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { MarketTechnicalCharts, type MarketCandle } from "../components/web3/market-technical-charts";
import { ArrowLeft, RefreshCw } from "lucide-react";

export const Route = createFileRoute("/web3-monitor")({ component: Web3Terminal });
type SymbolName = "BTC" | "ETH" | "SOL";
const pairs: { symbol: SymbolName; pair: string }[] = [
  { symbol: "BTC", pair: "XBTUSD" },
  { symbol: "ETH", pair: "ETHUSD" },
  { symbol: "SOL", pair: "SOLUSD" }
];
const fmt = (value: number, digits = 2) => value.toLocaleString("en-US", { maximumFractionDigits: digits });
const panel = { border: "1px solid #294254", borderRadius: 16, background: "#0c1927", padding: 22 } as const;
async function loadCandles(pair: string): Promise<MarketCandle[]> {
  const response = await fetch("https://api.kraken.com/0/public/OHLC?pair=" + pair + "&interval=60", { signal: AbortSignal.timeout(12000), cache: "no-store" });
  if (!response.ok) throw new Error("HTTP " + response.status);
  const json = await response.json();
  if (json.error?.length) throw new Error("Kraken API error");
  const key = Object.keys(json.result ?? {}).find(k => k !== "last");
  if (!key) throw new Error("Missing candle data");
  const rows = json.result[key] as (number | string)[][];
  const candles = rows.slice(-100).map(row => ({
    open: Number(row[1]), high: Number(row[2]), low: Number(row[3]), close: Number(row[4])
  })).filter(c => [c.open, c.high, c.low, c.close].every(n => Number.isFinite(n) && n > 0));
  if (!candles.length) throw new Error("No valid market candles");
  return candles;
}
function Web3Terminal() {
  const [selected, setSelected] = useState<SymbolName>("BTC");
  const [candlesBySymbol, setCandlesBySymbol] = useState<Partial<Record<SymbolName, MarketCandle[]>>>({});
  const [errors, setErrors] = useState<Partial<Record<SymbolName, string>>>({});
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [refreshIndex, setRefreshIndex] = useState(0);
  const [demo, setDemo] = useState(false);
  useEffect(() => {
    let active = true;
    async function refresh() {
      setLoading(true);
      const settled = await Promise.allSettled(pairs.map(p => loadCandles(p.pair)));
      if (!active) return;
      const nextErrors: Partial<Record<SymbolName, string>> = {};
      const next: Partial<Record<SymbolName, MarketCandle[]>> = {};
      settled.forEach((result, i) => {
        const symbol = pairs[i].symbol;
        if (result.status === "fulfilled") next[symbol] = result.value;
        else nextErrors[symbol] = "Market feed temporarily unavailable";
      });
      setCandlesBySymbol(previous => ({ ...previous, ...next }));
      setErrors(nextErrors);
      setLastUpdated(Date.now());
      setLoading(false);
    }
    void refresh();
    const timer = setInterval(() => void refresh(), 60000);
    return () => { active = false; clearInterval(timer); };
  }, [refreshIndex]);
  const onLiveCandles = useCallback((symbol: string, candles: MarketCandle[]) => {
    if (symbol !== "BTC" && symbol !== "ETH" && symbol !== "SOL") return;
    setCandlesBySymbol(previous => {
      const old = previous[symbol];
      if (old?.length === candles.length && old[old.length - 1]?.close === candles[candles.length - 1]?.close) return previous;
      return { ...previous, [symbol]: candles };
    });
    setErrors(previous => ({ ...previous, [symbol]: undefined }));
  }, []);
  const demoCandles = useMemo(() => Array.from({length:72}, (_, i) => {
    const close = 100 + i * 0.08 + Math.sin(i / 5) * 2.5;
    const open = 100 + (i - 1) * 0.08 + Math.sin((i - 1) / 5) * 2.5;
    return { open, close, high: Math.max(open, close) * 1.002, low: Math.min(open, close) * 0.998 };
  }), []);
  const selectedCandles = demo ? demoCandles : candlesBySymbol[selected] ?? [];
  const closes = selectedCandles.map(c => c.close);
  const indicator = (() => {
    if (closes.length < 15) return null;
    const last = closes.slice(-15);
    let gains = 0, losses = 0;
    for (let i = 1; i < last.length; i++) {
      const diff = last[i] - last[i - 1];
      gains += Math.max(0, diff);
      losses += Math.max(0, -diff);
    }
    return {
      sma: closes.slice(-14).reduce((a, b) => a + b, 0) / 14,
      rsi: losses === 0 ? (gains === 0 ? 50 : 100) : 100 - 100 / (1 + gains / losses)
    };
  })();
  return <main style={{minHeight:"100vh",background:"#070e18",color:"#e8f3fb",fontFamily:"Inter,system-ui,sans-serif",padding:"clamp(18px,4vw,52px)"}}>
    <div style={{maxWidth:1250,margin:"auto"}}>
      <a href="/" style={{color:"#9db5c7",textDecoration:"none",display:"inline-flex",alignItems:"center",gap:8}}><ArrowLeft size={16}/> Back to Research Lab</a>
      <header style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:18,margin:"32px 0"}}>
        <div><div style={{color:"#45e6bd",fontSize:12,letterSpacing:2}}>QUANTUM AI RESEARCH LAB / WEB3</div><h1 style={{fontSize:"clamp(30px,5vw,52px)",margin:"10px 0"}}>Web3 Market Terminal</h1><p style={{color:"#9db5c7"}}>BTC · ETH · SOL · Live Kraken market data and technical analysis</p></div>
        <button type="button" disabled={loading} onClick={()=>{setDemo(false);setRefreshIndex(v=>v+1)}} style={{padding:"12px 18px",border:"1px solid #45e6bd",borderRadius:10,background:"#12382f",color:"#45e6bd",cursor:"pointer"}}><RefreshCw size={15} style={{display:"inline",marginRight:8}}/>{loading?"Loading…":"Refresh markets"}</button>
      </header>
      <div style={{display:"flex",gap:14,alignItems:"center",flexWrap:"wrap",marginBottom:20}}>
        <button type="button" onClick={()=>setDemo(v=>!v)} style={{background:"#192b3c",color:"#e8f3fb",border:"1px solid #3b576b",borderRadius:9,padding:"10px 14px",cursor:"pointer"}}>{demo?"Exit demo":"Interactive demo"}</button>
        <span role="status" style={{fontSize:13,color:demo?"#fbbf24":"#a8bac9"}}>{demo?"DEMO · Simulated index values, not USD prices":loading?"Updating market data…":lastUpdated?"Last refresh "+new Date(lastUpdated).toLocaleTimeString():"Connecting to Kraken…"}</span>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))",gap:14,marginBottom:18}}>
        {pairs.map(({symbol})=>{
          const rows = demo ? demoCandles : candlesBySymbol[symbol] ?? [];
          const last = rows[rows.length-1], first = rows[0];
          const price = last?.close;
          const change = last && first ? (last.close-first.open)/first.open*100 : null;
          return <button key={symbol} type="button" aria-pressed={selected===symbol} onClick={()=>setSelected(symbol)} style={{...panel,textAlign:"left",color:"#e8f3fb",cursor:"pointer",border:selected===symbol?"1px solid #45e6bd":"1px solid #294254",background:selected===symbol?"#11332f":"#0c1927"}}>
            <div style={{fontSize:12,color:"#9db5c7"}}>{symbol}/USD</div>
            <strong style={{display:"block",fontSize:29,margin:"12px 0"}}>{price ? (demo?fmt(price)+" pts":"$"+fmt(price)) : "Waiting for data"}</strong>
            <span style={{fontSize:13,color:change!=null?(change>=0?"#45e6bd":"#fb7185"):"#9db5c7"}}>{change!=null?(change>=0?"+":"")+fmt(change)+"% · last "+(rows.length-1)+"h":errors[symbol]||"Connecting…"}</span>
          </button>;
        })}
      </div>
      <section style={panel}>
        <div style={{color:"#45e6bd",fontSize:12,letterSpacing:1}}>INTERACTIVE MARKET ANALYSIS</div>
        <h2 style={{fontSize:24,margin:"12px 0"}}>{selected}/USD · Candlestick & indicators</h2>
        <div style={{display:"flex",flexWrap:"wrap",gap:18,color:"#a9bdcd",fontSize:14,margin:"14px 0"}}>
          <span>SMA14: {indicator?(demo?fmt(indicator.sma)+" pts":"$"+fmt(indicator.sma)):"Waiting for candles"}</span>
          <span>RSI14: {indicator?fmt(indicator.rsi,1):"Waiting for candles"}</span>
        </div>
        <MarketTechnicalCharts symbol={selected} candles={demo?demoCandles:[]} mode={demo?"demo":"live"} onLiveCandles={onLiveCandles}/>
        <p style={{fontSize:12,color:"#9db5c7",marginTop:18}}>Kraken public OHLC feed · Candlestick, SMA14 and MACD · 5m, 15m, 1H, 4H and 1D timeframes · Updated periodically. RSI is calculated from the available hourly candles. These are market indicators, not trading recommendations.</p>
      </section>
      <footer style={{fontSize:12,color:"#9db5c7",marginTop:26}}>No fabricated prices · No wallet connection required · Market feeds may be temporarily unavailable.</footer>
    </div>
  </main>;
}
