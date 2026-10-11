import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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
  const [markets, setMarkets] = useState<{ symbol: string; price: number; change: number; closes: number[]; candles: { open: number; high: number; low: number; close: number }[] }[]>([]);
  const [marketError, setMarketError] = useState("");
  const [selected, setSelected] = useState("BTC");
  async function refreshMarkets() {
    try {
      const next = await Promise.all([{ symbol: "BTC", pair: "XBTUSD" }, { symbol: "ETH", pair: "ETHUSD" }, { symbol: "SOL", pair: "SOLUSD" }].map(async ({ symbol, pair }) => {
        const [ticker, candles] = await Promise.all([
          getJSON("https://api.kraken.com/0/public/Ticker?pair=" + pair),
          getJSON("https://api.kraken.com/0/public/OHLC?pair=" + pair + "&interval=60")
        ]);
        if (ticker.error?.length || candles.error?.length) throw new Error("Market feed unavailable");
        const t = Object.values(ticker.result)[0] as { c: string[]; o: string };
        const key = Object.keys(candles.result).find(k => k !== "last");
        const rows = (key ? candles.result[key] : []) as (string | number)[][];
        const candles = rows.slice(-100).map(row => ({ open: Number(row[1]), high: Number(row[2]), low: Number(row[3]), close: Number(row[4]) })).filter(c => Object.values(c).every(Number.isFinite));
        const closes = candles.map(c => c.close);
        const price = Number(t.c[0]), open = Number(t.o);
        if (!Number.isFinite(price) || !Number.isFinite(open) || !closes.length) throw new Error("Invalid market data");
        return { symbol, price, change: open ? ((price - open) / open) * 100 : 0, closes, candles };
      }));
      setMarkets(next);
      setMarketError("");
    } catch {
      setMarketError("Market feed unavailable; last received prices remain visible.");
    }
  }
  async function refresh() {
    setBusy(true);
    const results = await Promise.allSettled([
      getJSON("https://mempool.space/api/blocks/tip/height"),
      getJSON("https://mempool.space/api/v1/fees/recommended"),
      getJSON("https://mempool.space/api/v1/mining/hashrate/1m"),
      getJSON("https://api.llama.fi/v2/historicalChainTvl")
    ]);
    const [height, fees, hash, tvl] = results;
    if (height.status === "fulfilled" && fees.status === "fulfilled" && hash.status === "fulfilled" && tvl.status === "fulfilled") {
      const chains = tvl.value as { date: number; tvl: number }[];
      const latest = chains[chains.length - 1];
      if (!latest || !Number.isFinite(latest.tvl)) {
        setError("DeFi feed returned invalid data");
      } else {
        const next: Snapshot = {
          blockHeight: Number(height.value),
          fees: fees.value,
          hashrate: Number(hash.value.currentHashrate),
          defi: { totalLiquidityUSD: latest.tvl },
          timestamp: Date.now()
        };
        setData(next);
        setHistory(chains.slice(-32).map(x => x.tvl));
        setError("");
      }
    } else {
      setError("One or more public data feeds are unavailable. Showing last verified snapshot, if available.");
    }
    await refreshMarkets();
    setBusy(false);
  }
  useEffect(() => {
    void refresh();
    const id = setInterval(() => void refresh(), 60000);
    return () => clearInterval(id);
  }, []);
  const chart = history.length > 1 ? history.map((v, i) => {
    const lo = Math.min(...history), hi = Math.max(...history);
    return `${(i / (history.length - 1)) * 100},${85 - (hi === lo ? 40 : ((v - lo) / (hi - lo)) * 65)}`;
  }).join(" ") : "";
  const active = markets.find(m => m.symbol === selected);
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
  const macd = (() => {
    if (!active || active.closes.length < 35) return null;
    const ema = (values: number[], period: number) => {
      const alpha = 2 / (period + 1);
      let previous = values[0];
      return values.map(value => (previous = value * alpha + previous * (1 - alpha)));
    };
    const fast = ema(active.closes, 12), slow = ema(active.closes, 26);
    const line = fast.map((v, i) => v - slow[i]);
    const signal = ema(line, 9);
    const histogram = line.map((v, i) => v - signal[i]);
    return { line, signal, histogram, current: histogram[histogram.length - 1] };
  })();
  const priceLine = active && active.closes.length > 1 ? (() => {
    const values = active.closes, lo = Math.min(...values), hi = Math.max(...values);
    return values.map((v, i) => String((i / (values.length - 1)) * 100) + "," + String(85 - (hi === lo ? 40 : ((v - lo) / (hi - lo)) * 65))).join(" ");
  })() : "";
  const cards = [
    { label: "BITCOIN BLOCK HEIGHT", value: data ? fmt(data.blockHeight) : "—", sub: "mempool.space / mainnet", icon: <Blocks size={20} /> },
    { label: "BTC FASTEST FEE", value: data ? fmt(data.fees.fastestFee) + " sat/vB" : "—", sub: "Recommended next block", icon: <Bitcoin size={20} /> },
    { label: "BTC HASHRATE", value: data ? fmt(data.hashrate / 1e18, 2) + " EH/s" : "—", sub: "1-month estimated hashrate", icon: <Activity size={20} /> },
    { label: "DEFI TOTAL TVL", value: data ? usd(data.defi.totalLiquidityUSD) : "—", sub: "DeFiLlama / historical total", icon: <Database size={20} /> }
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
          <button onClick={() => void refresh()} disabled={busy} style={{ border: "1px solid #29433e", borderRadius: 10, background: "#10211f", color: "#41e5bb", padding: "12px 18px", cursor: busy ? "wait" : "pointer", display: "flex", alignItems: "center", gap: 9 }}><RefreshCw size={16} /> {busy ? "Syncing..." : "Refresh feeds"}</button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 9, color: error ? "#ffb86b" : data ? "#41e5bb" : "#93a3b9", fontSize: 13, marginBottom: 24 }}>
          {error ? <WifiOff size={16} /> : <Wifi size={16} />}
          {error || (data ? "LIVE · Last verified sync " + new Date(data.timestamp).toLocaleTimeString() : "Connecting to public feeds...")}
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
            <div style={{ color: "#8394aa", fontSize: 12 }}>Source: DeFiLlama · Historical data, not a price forecast</div>
          </section>
          <section style={{ border: "1px solid #253448", background: "#0d1521", padding: 26, borderRadius: 16 }}>
            <div style={{ color: "#41e5bb", fontSize: 12, letterSpacing: 1.3 }}>BITCOIN NETWORK / FEE MARKET</div>
            <h2 style={{ fontSize: 23 }}>Transaction Priority</h2>
            {([["Fastest", data?.fees.fastestFee], ["30 minutes", data?.fees.halfHourFee], ["60 minutes", data?.fees.hourFee]] as const).map(([name, fee]) => <div key={name} style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid #263344", padding: "18px 0", gap: 16 }}><span style={{ color: "#a5b3c6" }}>{name}</span><strong>{fee == null ? "—" : fee + " sat/vB"}</strong></div>)}
            <p style={{ color: "#8394aa", fontSize: 12, marginTop: 28 }}>Fee estimates are indicative, not guaranteed confirmation times.</p>
          </section>
        </div>
        <section style={{ marginTop: 18, background: "#0d1521", border: "1px solid #253448", borderRadius: 16, padding: 26 }}>
          <div style={{ color: "#41e5bb", fontSize: 12, letterSpacing: 1.3 }}>CRYPTO MARKET INTELLIGENCE · KRAKEN PUBLIC DATA</div>
          <h2 style={{ fontSize: 24, marginBottom: 8 }}>BTC / ETH / SOL Live Markets</h2>
          <p style={{ color: "#8394aa", fontSize: 13 }}>Latest prices · Daily change · Hourly candles · Auto-refresh every 60 seconds</p>
          {marketError && <p role="status" style={{ color: "#ffb86b" }}>{marketError}</p>}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(175px,1fr))", gap: 12, margin: "18px 0" }}>
            {(["BTC", "ETH", "SOL"] as const).map(symbol => {
              const m = markets.find(x => x.symbol === symbol);
              return <button key={symbol} onClick={() => setSelected(symbol)} aria-pressed={selected === symbol} style={{ textAlign: "left", cursor: "pointer", borderRadius: 12, border: selected === symbol ? "1px solid #41e5bb" : "1px solid #253448", padding: 18, background: selected === symbol ? "#10211f" : "#111c2a", color: "#e6edf7" }}>
                <div style={{ color: "#93a3b9", fontSize: 13 }}>{symbol} / USD</div>
                <strong style={{ display: "block", fontSize: 24, margin: "9px 0" }}>{m ? "$" + fmt(m.price, 2) : "—"}</strong>
                <span style={{ color: m && m.change < 0 ? "#ff8f92" : "#41e5bb", fontSize: 13 }}>{m ? (m.change >= 0 ? "+" : "") + fmt(m.change, 2) + "% today" : "Loading..."}</span>
              </button>;
            })}
          </div>
          <div style={{ display: "flex", gap: 18, flexWrap: "wrap", color: "#a5b3c6", fontSize: 14, marginBottom: 12 }}>
            <strong>{selected}/USD · Recent hourly candles</strong>
            <span>SMA14: {indicator ? "$" + fmt(indicator.sma, 2) : "—"}</span>
            <span>RSI14: {indicator ? fmt(indicator.rsi, 1) : "—"}</span>
            <span style={{ color: "#41e5bb" }}>{indicator?.signal || "Waiting for market data"}</span>
          </div>
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label={selected + " recent price history"} style={{ width: "100%", height: 210, background: "repeating-linear-gradient(to bottom,transparent 0px,transparent 47px,#233042 48px)" }}>
            {priceLine && <polyline points={priceLine} fill="none" stroke="#41e5bb" strokeWidth="2" vectorEffect="non-scaling-stroke" />}
          </svg>
          <div style={{ marginTop: 24, padding: 18, borderRadius: 14, border: "1px solid #344155", background: "#0b1220" }}>
            <h3 style={{ fontSize: 18, margin: "0 0 8px" }}>Candlestick Chart · 1H</h3>
            <p style={{ fontSize: 12, color: "#8394aa" }}>Green: close above open · Red: close below open · Last 48 hourly candles</p>
            <svg viewBox="0 0 960 250" preserveAspectRatio="none" role="img" aria-label={selected + " hourly OHLC candlestick chart"} style={{ width: "100%", height: 260 }}>
              {(() => {
                const candles = active?.candles.slice(-48) || [];
                if (!candles.length) return null;
                const lo = Math.min(...candles.map(c => c.low)), hi = Math.max(...candles.map(c => c.high));
                const y = (value: number) => 230 - ((value - lo) / (hi - lo || 1)) * 210;
                return candles.map((c, i) => {
                  const x = i * (960 / candles.length) + 10;
                  const color = c.close >= c.open ? "#34d399" : "#fb7185";
                  const top = Math.min(y(c.open), y(c.close));
                  return <g key={i}><line x1={x} y1={y(c.high)} x2={x} y2={y(c.low)} stroke={color} strokeWidth="2" /><rect x={x - 6} y={top} width="12" height={Math.max(1.5, Math.abs(y(c.close) - y(c.open)))} rx="1" fill={color} /></g>;
                });
              })()}
            </svg>
          </div>
          <div style={{ marginTop: 20, padding: 18, borderRadius: 14, border: "1px solid #344155", background: "linear-gradient(135deg,#101827,#19142b)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
              <h3 style={{ fontSize: 18, margin: 0 }}>MACD · 12 / 26 / 9</h3>
              <strong style={{ color: macd ? macd.current >= 0 ? "#34d399" : "#fb7185" : "#94a3b8" }}>{macd ? (macd.current >= 0 ? "Positive momentum" : "Negative momentum") : "Loading..."}</strong>
            </div>
            <p style={{ fontSize: 12, color: "#8394aa" }}>Green/red histogram · Blue MACD line · Orange signal line</p>
            <svg viewBox="0 0 960 230" preserveAspectRatio="none" role="img" aria-label={selected + " MACD indicator histogram and signal lines"} style={{ width: "100%", height: 230 }}>
              {(() => {
                if (!macd) return null;
                const count = macd.line.length, extent = Math.max(0.001, ...macd.line.map(Math.abs), ...macd.signal.map(Math.abs), ...macd.histogram.map(Math.abs));
                const y = (v: number) => 115 - v / extent * 94;
                const x = (i: number) => 12 + i * 936 / (count - 1);
                const points = (values: number[]) => values.map((v, i) => String(x(i)) + "," + String(y(v))).join(" ");
                return <g>
                  <line x1="0" y1="115" x2="960" y2="115" stroke="#64748b" strokeDasharray="5 5" />
                  {macd.histogram.map((v, i) => <rect key={i} x={x(i) - 3} y={Math.min(115, y(v))} width="6" height={Math.max(1, Math.abs(y(v) - 115))} fill={v >= 0 ? "#34d399" : "#fb7185"} opacity="0.8" />)}
                  <polyline points={points(macd.line)} fill="none" stroke="#60a5fa" strokeWidth="2" vectorEffect="non-scaling-stroke" />
                  <polyline points={points(macd.signal)} fill="none" stroke="#fbbf24" strokeWidth="2" vectorEffect="non-scaling-stroke" />
                </g>;
              })()}
            </svg>
            <p style={{ fontSize: 12, color: "#8394aa" }}>MACD momentum is not a guaranteed Buy/Sell signal. EMA calculations use available hourly history.</p>
          </div>
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
