import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { MarketTechnicalCharts } from "../components/web3/market-technical-charts";
import { getWeb3Monitor } from "../lib/web3-monitor.functions";
import { Activity, ArrowLeft, Bitcoin, Blocks, Database, RefreshCw, ShieldCheck, TrendingUp, Wifi, WifiOff } from "lucide-react";

export const Route = createFileRoute("/web3-monitor")({ component: Web3Terminal });

type Snapshot = {
  blockHeight: number;
  fees: { fastestFee: number; halfHourFee: number; hourFee: number };
  hashrate: number;
  defi: { totalLiquidityUSD: number };
  timestamp: number;
};
const fmt = (n: number, digits = 0) => new Intl.NumberFormat("en-US", { maximumFractionDigits: digits }).format(n);
const usd = (n: number) => n >= 1e12 ? "$" + fmt(n / 1e12, 2) + "T" : n >= 1e9 ? "$" + fmt(n / 1e9, 2) + "B" : "$" + fmt(n);
async function getJSON(url: string) {
  const response = await fetch(url, { signal: AbortSignal.timeout(12000) });
  if (!response.ok) throw new Error("HTTP " + response.status);
  return response.json();
}
function Web3Terminal() {
  const [data, setData] = useState<Snapshot | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<number[]>([]);
  const [markets, setMarkets] = useState<{ symbol: string; price: number; change: number; closes: number[] }[]>([]);
  const [marketError, setMarketError] = useState("");
  const [selected, setSelected] = useState("BTC");
  const onLiveCandles = useCallback((symbol: string, candles: {open:number;high:number;low:number;close:number}[]) => {
    if (!candles.length) return;
    const price = candles[candles.length - 1].close;
    const open = candles[0].open;
    const closes = candles.map(c => c.close);
    setMarkets(previous => {
      const old = previous.find(m => m.symbol === symbol);
      if (old && old.price === price && old.closes.length === closes.length) return previous;
      return [...previous.filter(m => m.symbol !== symbol), {symbol, price, change: open ? (price - open) / open * 100 : 0, closes}];
    });
  }, []);
  const [demo, setDemo] = useState(false);
  const sample = { blockHeight: 850000, fees: { fastestFee: 12, halfHourFee: 8, hourFee: 5 }, hashrate: 650e18, defi: { totalLiquidityUSD: 95000000000 }, timestamp: 0 };
  const sampleMarkets = [
    { symbol: "BTC", price: 100, change: 1.2, closes: Array.from({length:48},(_,i)=>98+i*.04+Math.sin(i/4)*.6) },
    { symbol: "ETH", price: 100, change: -0.4, closes: Array.from({length:48},(_,i)=>102-i*.04+Math.sin(i/4)*.5) },
    { symbol: "SOL", price: 100, change: 2.1, closes: Array.from({length:48},(_,i)=>96+i*.08+Math.sin(i/4)*.7) }
  ];
  const shownData = demo ? sample : data;
  const shownMarkets = demo ? sampleMarkets : markets;
  const demoCandles = (shownMarkets.find(m => m.symbol === selected)?.closes ?? []).map((close, i, values) => {
    const open = i ? values[i - 1] : close;
    return { open, close, high: Math.max(open, close) * 1.001, low: Math.min(open, close) * 0.999 };
  });
  const shownHistory = demo ? Array.from({length:32},(_,i)=>90e9+i*130e6+Math.sin(i/3)*3e9) : history;
  async function refresh() {
    setBusy(true);
    try {
      const result = await getWeb3Monitor();
      const v = result.snapshot;
      const anyNetwork = v.blockHeight !== null || v.fees !== null || v.hashrate !== null || v.tvl !== null;
      if (anyNetwork) {
        setData(previous => ({
          blockHeight: v.blockHeight ?? previous?.blockHeight ?? NaN,
          fees: v.fees ?? previous?.fees ?? { fastestFee: NaN, halfHourFee: NaN, hourFee: NaN },
          hashrate: v.hashrate ?? previous?.hashrate ?? NaN,
          defi: { totalLiquidityUSD: v.tvl ?? previous?.defi.totalLiquidityUSD ?? NaN },
          timestamp: result.timestamp
        }));
      }
      if (result.history.length) setHistory(result.history);
      if (result.markets.length) setMarkets(previous => {
        const map = new Map(previous.map(m => [m.symbol, m]));
        for (const m of result.markets) map.set(m.symbol, m);
        return [...map.values()];
      });
      setError(anyNetwork ? "" : "Network data temporarily unavailable · Try demo");
      if (result.markets.length === 3) setMarketError("");
    } catch {
      setError("Live data connection unavailable · Try Interactive Demo");
      // Independent browser Kraken ticker remains available when server aggregation fails.
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    if (demo) return;
    let active = true;
    async function fetchMarketPrices() {
      const pairs = [{symbol:"BTC",pair:"XBTUSD"},{symbol:"ETH",pair:"ETHUSD"},{symbol:"SOL",pair:"SOLUSD"}];
      const results = await Promise.allSettled(pairs.map(async ({symbol,pair}) => {
        const json = await getJSON("https://api.kraken.com/0/public/Ticker?pair="+pair);
        if (json.error?.length) throw new Error("Kraken error");
        const row = Object.values(json.result ?? {})[0] as {c?:string[];o?:string}|undefined;
        const price = Number(row?.c?.[0]), open = Number(row?.o);
        if (!Number.isFinite(price) || price <= 0) throw new Error("Invalid price");
        return {symbol,price,change:Number.isFinite(open)&&open>0?(price-open)/open*100:0};
      }));
      if (!active) return;
      const ok = results.filter((r):r is PromiseFulfilledResult<{symbol:string;price:number;change:number}>=>r.status==="fulfilled").map(r=>r.value);
      if (ok.length) {
        setMarkets(previous => {
          const map = new Map(previous.map(m=>[m.symbol,m]));
          for (const item of ok) {
            const old = map.get(item.symbol);
            map.set(item.symbol,{...item,closes:old?.closes??[]});
          }
          return [...map.values()];
        });
      }
      setMarketError(ok.length ? "" : "Kraken ticker temporarily unavailable");
    }
    void fetchMarketPrices();
    const timer = setInterval(()=>void fetchMarketPrices(),60000);
    return ()=>{active=false;clearInterval(timer);};
  }, [demo]);
  useEffect(() => {
    void refresh();
    const id = setInterval(() => void refresh(), 60000);
    return () => clearInterval(id);
  }, []);
  const chart = shownHistory.length > 1 ? shownHistory.map((v, i) => {
    const lo = Math.min(...shownHistory), hi = Math.max(...shownHistory);
    return `${(i / (shownHistory.length - 1)) * 100},${85 - (hi === lo ? 40 : ((v - lo) / (hi - lo)) * 65)}`;
  }).join(" ") : "";
  const active = shownMarkets.find(m => m.symbol === selected);
  const indicator = (() => {
    if (!active || active.closes.length < 15) return null;
    const values = active.closes;
    const sma = values.slice(-14).reduce((a, b) => a + b, 0) / 14;
    let gains = 0, losses = 0;
    for (let i = values.length - 14; i < values.length; i++) {
      const diff = values[i] - values[i - 1];
      gains += Math.max(diff, 0);
      losses += Math.max(-diff, 0);
    }
    const rsi = losses === 0 ? (gains === 0 ? 50 : 100) : 100 - 100 / (1 + gains / losses);
    const signal = rsi < 30 ? "Oversold watch" : rsi > 70 ? "Overbought watch" : active.price > sma ? "Above SMA14" : "Below SMA14";
    return { sma, rsi, signal };
  })();
  const rsiSeries = (() => {
    if (!active || active.closes.length < 16) return [];
    return active.closes.slice(15).map((_, idx) => {
      const end = idx + 16;
      const window = active.closes.slice(end - 15, end);
      let gains = 0, losses = 0;
      for (let i = 1; i < window.length; i++) {
        const delta = window[i] - window[i - 1];
        gains += Math.max(0, delta);
        losses += Math.max(0, -delta);
      }
      return losses === 0 ? (gains === 0 ? 50 : 100) : 100 - 100 / (1 + gains / losses);
    });
  })();
  const rsiLine = rsiSeries.length > 1 ? rsiSeries.map((v, i) => String(i / (rsiSeries.length - 1) * 100) + "," + String(100 - v)).join(" ") : "";
  const rsiColor = indicator ? indicator.rsi >= 70 ? "#fb7185" : indicator.rsi <= 30 ? "#34d399" : "#fbbf24" : "#94a3b8";
  const priceLine = active && active.closes.length > 1 ? (() => {
    const values = active.closes, lo = Math.min(...values), hi = Math.max(...values);
    return values.map((v, i) => String((i / (values.length - 1)) * 100) + "," + String(85 - (hi === lo ? 40 : ((v - lo) / (hi - lo)) * 65))).join(" ");
  })() : "";
  const cards = [
    { label: "BITCOIN BLOCK HEIGHT", value: shownData && Number.isFinite(shownData.blockHeight) ? fmt(shownData.blockHeight) : "—", sub: "mempool.space / mainnet", icon: <Blocks size={20} /> },
    { label: "BTC FASTEST FEE", value: shownData && Number.isFinite(shownData.fees.fastestFee) ? fmt(shownData.fees.fastestFee) + " sat/vB" : "—", sub: "Recommended next block", icon: <Bitcoin size={20} /> },
    { label: "BTC HASHRATE", value: shownData && Number.isFinite(shownData.hashrate) ? fmt(shownData.hashrate / 1e18, 2) + " EH/s" : "—", sub: "1-month estimated hashrate", icon: <Activity size={20} /> },
    { label: "DEFI TOTAL TVL", value: shownData && Number.isFinite(shownData.defi.totalLiquidityUSD) ? usd(shownData.defi.totalLiquidityUSD) : "—", sub: "DeFiLlama / historical total", icon: <Database size={20} /> }
  ];
  return (
    <main style={{ minHeight: "100vh", background: "#070b12", color: "#e6edf7", fontFamily: "Inter, system-ui, sans-serif", padding: "clamp(18px,4vw,56px)" }}>
      <div style={{ maxWidth: 1280, margin: "auto" }}>
        <a href="/" style={{ color: "#9aaac0", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 8 }}><ArrowLeft size={16} /> Back to Research Lab</a>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 20, flexWrap: "wrap", margin: "35px 0" }}>
          <div><div style={{ color: "#41e5bb", letterSpacing: 3, fontSize: 11, fontWeight: 700 }}>QUANTUM AI RESEARCH LAB / WEB3</div>
            <h1 style={{ fontSize: "clamp(30px,5vw,58px)", letterSpacing: -2, margin: "10px 0" }}>Intelligence Terminal<span style={{ color: "#41e5bb" }}>.</span></h1>
            <p style={{ color: "#93a3b9", margin: 0 }}>Live network intelligence · On-chain infrastructure · DeFi liquidity</p>
          </div>
          <button onClick={() => { setDemo(false); void refresh(); }} disabled={busy} style={{ border: "1px solid #29433e", borderRadius: 10, background: "#10211f", color: "#41e5bb", padding: "12px 18px", cursor: busy ? "wait" : "pointer", display: "flex", alignItems: "center", gap: 9 }}><RefreshCw size={16} /> {busy ? "Syncing..." : "Refresh feeds"}</button>
        </div>
        <div style={{ marginBottom: 16, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <button type="button" onClick={() => setDemo(v => !v)} style={{ padding: "12px 18px", borderRadius: 10, border: "1px solid #41e5bb", color: "#41e5bb", background: "#10211f", cursor: "pointer" }}>{demo ? "Switch to Live Data" : "Try Interactive Demo"}</button>
          {demo && <strong role="status" style={{ color: "#fbbf24" }}>DEMO MODE — INDEX VALUES (BASE 100), NOT USD PRICES</strong>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 9, color: demo ? "#fbbf24" : error ? "#ffb86b" : data ? "#41e5bb" : "#93a3b9", fontSize: 13, marginBottom: 24 }}>
          {!demo && error ? <WifiOff size={16} /> : <Wifi size={16} />}
          {demo ? "Interactive demo · simulated sample values" : error || (data ? "LIVE · Last verified sync " + new Date(data.timestamp).toLocaleTimeString() : busy ? "Connecting to public feeds..." : "Live feeds unavailable · Try demo")}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 14 }}>
          {cards.map(c => <section key={c.label} style={{ background: "linear-gradient(140deg,#111c2a,#0c131e)", border: "1px solid #253448", borderRadius: 16, padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", color: "#7f94af", fontSize: 11, letterSpacing: 1.2 }}>{c.label}<span style={{ color: "#41e5bb" }}>{c.icon}</span></div>
            <div style={{ fontSize: "clamp(24px,3vw,35px)", fontWeight: 750, margin: "23px 0 9px", fontVariantNumeric: "tabular-nums" }}>{c.value}</div>
            <div style={{ fontSize: 12, color: "#8394aa" }}>{c.sub}</div>
          </section>)}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(100%,380px),1fr))", gap: 16, marginTop: 18 }}>
          <section style={{ border: "1px solid #253448", background: "#0d1521", padding: 26, borderRadius: 16 }}>
            <div style={{ color: "#41e5bb", fontSize: 12, letterSpacing: 1.3 }}>LIQUIDITY INTELLIGENCE</div>
            <h2 style={{ fontSize: 23 }}>DeFi Total Value Locked</h2>
            <div style={{ color: "#8394aa", fontSize: 13 }}>Last 32 daily observations · USD</div>
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label="Historical DeFi TVL trend" style={{ width: "100%", height: 240, marginTop: 20, background: "repeating-linear-gradient(to bottom,transparent 0px,transparent 47px,#233042 48px)" }}>
              {chart && <polyline points={chart} fill="none" stroke="#41e5bb" strokeWidth="1.4" vectorEffect="non-scaling-stroke" />}
            </svg>
            <div style={{ color: "#8394aa", fontSize: 12 }}>{demo ? "Simulated example · Not live data" : "Source: DeFiLlama · Historical data, not a price forecast"}</div>
          </section>
          <section style={{ border: "1px solid #253448", background: "#0d1521", padding: 26, borderRadius: 16 }}>
            <div style={{ color: "#41e5bb", fontSize: 12, letterSpacing: 1.3 }}>BITCOIN NETWORK / FEE MARKET</div>
            <h2 style={{ fontSize: 23 }}>Transaction Priority</h2>
            {([["Fastest", shownData?.fees.fastestFee], ["30 minutes", shownData?.fees.halfHourFee], ["60 minutes", shownData?.fees.hourFee]] as const).map(([name, fee]) => <div key={name} style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #263344", padding: "18px 0", gap: 16 }}><span style={{ color: "#a5b3c6" }}>{name}</span><strong>{fee == null || !Number.isFinite(fee) ? "—" : fee + " sat/vB"}</strong></div>)}
            <p style={{ color: "#8394aa", fontSize: 12, marginTop: 28 }}>Fee estimates are indicative, not guaranteed confirmation times.</p>
          </section>
        </div>
        <section style={{ marginTop: 18, background: "#0d1521", border: "1px solid #253448", borderRadius: 16, padding: 26 }}>
          <div style={{ color: "#41e5bb", fontSize: 12, letterSpacing: 1.3 }}>CRYPTO MARKET INTELLIGENCE · KRAKEN PUBLIC DATA</div>
          <h2 style={{ fontSize: 24, marginBottom: 8 }}>BTC / ETH / SOL Live Markets</h2>
          <p style={{ color: "#8394aa", fontSize: 13 }}>{demo ? "Simulated normalized index (base 100) · Not USD market prices" : "Latest prices · Daily change · Hourly candles · Auto-refresh every 60 seconds"}</p>
          {!demo && marketError && <p role="status" style={{ color: "#ffb86b" }}>{marketError}</p>}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(175px,1fr))", gap: 12, margin: "18px 0" }}>
            {(["BTC", "ETH", "SOL"] as const).map(symbol => {
              const m = shownMarkets.find(x => x.symbol === symbol);
              return <button key={symbol} onClick={() => setSelected(symbol)} aria-pressed={selected === symbol} style={{ textAlign: "left", cursor: "pointer", borderRadius: 12, border: selected === symbol ? "1px solid #41e5bb" : "1px solid #253448", padding: 18, background: selected === symbol ? "#10211f" : "#111c2a", color: "#e6edf7" }}>
                <div style={{ color: "#93a3b9", fontSize: 13 }}>{symbol} / USD</div>
                <strong style={{ display: "block", fontSize: 24, margin: "9px 0" }}>{m ? (demo ? fmt(m.price, 2) + " pts" : "$" + fmt(m.price, 2)) : "—"}</strong>
                <span style={{ color: m && m.change < 0 ? "#ff8f92" : "#41e5bb", fontSize: 13 }}>{m ? (m.change >= 0 ? "+" : "") + fmt(m.change, 2) + (demo ? "% demo" : "% today") : marketError ? "Unavailable" : busy ? "Loading..." : "Unavailable"}</span>
              </button>;
            })}
          </div>
          <div style={{ display: "flex", gap: 18, flexWrap: "wrap", color: "#a5b3c6", fontSize: 14, marginBottom: 12 }}>
            <strong>{selected}/USD · Recent hourly candles</strong>
            <span>SMA14: {indicator ? (demo ? fmt(indicator.sma, 2) + " pts" : "$" + fmt(indicator.sma, 2)) : "—"}</span>
            <span>RSI14: {indicator ? fmt(indicator.rsi, 1) : "—"}</span>
            <span style={{ color: "#41e5bb" }}>{indicator?.signal || "Waiting for market data"}</span>
          </div>
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label={selected + " recent price history"} style={{ width: "100%", height: 210, background: "repeating-linear-gradient(to bottom,transparent 0px,transparent 47px,#233042 48px)" }}>
            {priceLine && <polyline points={priceLine} fill="none" stroke="#41e5bb" strokeWidth="2" vectorEffect="non-scaling-stroke" />}
          </svg>
          <MarketTechnicalCharts symbol={selected} candles={demo ? demoCandles : []} mode={demo ? "demo" : "live"} onLiveCandles={onLiveCandles} />
          <div style={{ marginTop: 24, borderRadius: 14, border: "1px solid #344155", padding: 18, background: "linear-gradient(135deg,#121b2c,#1b1430)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
              <strong style={{ fontSize: 17 }}>RSI 14 · Momentum</strong>
              <strong style={{ fontSize: 25, color: rsiColor }}>{indicator ? fmt(indicator.rsi, 1) : "—"}</strong>
            </div>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 12, margin: "12px 0", color: "#a5b3c6" }}>
              <span style={{ color: "#34d399" }}>● Below 30 · Oversold</span>
              <span style={{ color: "#fbbf24" }}>● 30–70 · Neutral</span>
              <span style={{ color: "#fb7185" }}>● Above 70 · Overbought</span>
            </div>
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label={selected + " RSI 14 momentum chart with 30 and 70 levels"} style={{ width: "100%", height: 165, borderRadius: 8, background: "#0b1220" }}>
              <rect x="0" y="0" width="100" height="30" fill="#fb7185" fillOpacity="0.12" />
              <rect x="0" y="30" width="100" height="40" fill="#fbbf24" fillOpacity="0.07" />
              <rect x="0" y="70" width="100" height="30" fill="#34d399" fillOpacity="0.12" />
              <line x1="0" y1="30" x2="100" y2="30" stroke="#fb7185" strokeWidth="0.6" strokeDasharray="2 2" vectorEffect="non-scaling-stroke" />
              <line x1="0" y1="70" x2="100" y2="70" stroke="#34d399" strokeWidth="0.6" strokeDasharray="2 2" vectorEffect="non-scaling-stroke" />
              {rsiLine && <polyline points={rsiLine} fill="none" stroke={rsiColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />}
            </svg>
            <div style={{ display: "flex", justifyContent: "space-between", color: "#8394aa", fontSize: 11, marginTop: 8 }}><span>Recent hourly candles</span><span>RSI levels: 30 / 70</span></div>
          </div>
          <p style={{ color: "#8394aa", fontSize: 12 }}>Indicators are descriptive, not investment advice or automatic trading signals. Prices may be delayed. Daily change is measured against today's opening price.</p>
        </section>
        <footer style={{ marginTop: 30, color: "#8394aa", fontSize: 12, display: "flex", gap: 9, alignItems: "center", flexWrap: "wrap" }}><ShieldCheck size={15} /> Public API data · No wallet connection required · Auto-refresh every 60 seconds · Data may be delayed or temporarily unavailable</footer>
      </div>
    </main>
  );
}
