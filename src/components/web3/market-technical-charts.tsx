import { useEffect, useMemo, useState } from "react";

export type MarketCandle = { open: number; high: number; low: number; close: number };

function ema(values: number[], period: number): number[] {
  const weight = 2 / (period + 1);
  let last = values[0] ?? 0;
  return values.map(value => (last = value * weight + last * (1 - weight)));
}

export function MarketTechnicalCharts({ symbol, candles, mode = "live" }: { symbol: string; candles: MarketCandle[]; mode?: "live" | "demo" }) {
  const [loaded, setLoaded] = useState<MarketCandle[]>([]);
  const [feedError, setFeedError] = useState("");
  const [intervalMinutes, setIntervalMinutes] = useState(60);
  const [windowSize, setWindowSize] = useState(48);
  const [showSma, setShowSma] = useState(true);
  useEffect(() => {
    if (mode === "demo") { setLoaded([]); setFeedError(""); return; }
    let active = true;
    const load = async () => {
      try {
        const pair = symbol === "BTC" ? "XBTUSD" : symbol + "USD";
        const response = await fetch("https://api.kraken.com/0/public/OHLC?pair=" + pair + "&interval=" + intervalMinutes);
        if (!response.ok) throw new Error("Market feed HTTP " + response.status);
        const json = await response.json();
        if (json.error?.length) throw new Error("Market feed error");
        const key = Object.keys(json.result || {}).find(k => k !== "last");
        if (!key) throw new Error("No candles");
        const values: MarketCandle[] = (json.result[key] as number[][]).slice(-100).map(row => ({
          open: Number(row[1]), high: Number(row[2]), low: Number(row[3]), close: Number(row[4])
        })).filter(c => [c.open, c.high, c.low, c.close].every(Number.isFinite));
        if (active) { setLoaded(values); setFeedError(""); }
      } catch {
        if (active) setFeedError("Candle feed temporarily unavailable");
      }
    };
    setLoaded([]);
    void load();
    const interval = setInterval(() => void load(), 60000);
    return () => { active = false; clearInterval(interval); };
  }, [symbol, intervalMinutes, mode]);
  const series = candles.length ? candles : loaded;
  const macd = useMemo(() => {
    if (series.length < 35) return null;
    const closes = series.map(c => c.close);
    const e12 = ema(closes, 12), e26 = ema(closes, 26);
    const line = e12.map((value, i) => value - e26[i]);
    const signal = ema(line, 9);
    return { line, signal, bars: line.map((value, i) => value - signal[i]) };
  }, [series]);
  const recent = series.slice(-windowSize);
  const low = recent.length ? Math.min(...recent.map(c => c.low)) : 0;
  const high = recent.length ? Math.max(...recent.map(c => c.high)) : 1;
  const priceY = (n: number) => 220 - ((n - low) / (high - low || 1)) * 200;
  const extent = macd ? Math.max(0.001, ...macd.line.map(Math.abs), ...macd.signal.map(Math.abs), ...macd.bars.map(Math.abs)) : 1;
  const macdY = (n: number) => 105 - n / extent * 90;
  const macdX = (i: number) => 12 + i * 936 / Math.max(1, (macd?.line.length ?? 1) - 1);
  const polyline = (values: number[]) => values.map((n, i) => macdX(i) + "," + macdY(n)).join(" ");
  const [hovered, setHovered] = useState<number | null>(null);
  const panel = { marginTop: 20, padding: 18, borderRadius: 14, border: "1px solid #19506b", background: "linear-gradient(140deg,#091724,#111c33)", boxShadow: "inset 0 1px 0 #24435b" };
  const picked = hovered == null ? recent[recent.length - 1] : recent[hovered];
  const smaPoints = recent.map((_, i) => {
    if (i < 13) return null;
    const avg = recent.slice(i - 13, i + 1).reduce((sum, c) => sum + c.close, 0) / 14;
    return (10 + i * 940 / Math.max(1, recent.length)) + "," + priceY(avg);
  }).filter((v): v is string => v !== null).join(" ");
  const display = (value: number) => Number.isFinite(value) ? value.toLocaleString("en-US", {maximumFractionDigits: 2}) : "—";
  return (
    <>
      <section style={panel}>
        {feedError && <p role="status" style={{ color: "#fbbf24" }}>{feedError}</p>}
        <h3 style={{ margin: "0 0 8px", fontSize: 18 }}>Interactive Candlestick · {symbol}/USD · {intervalMinutes}m</h3>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
          {[5, 15, 60, 240, 1440].map(minutes => <button key={minutes} onClick={() => setIntervalMinutes(minutes)} aria-pressed={intervalMinutes === minutes} style={{ cursor: "pointer", borderRadius: 7, border: "1px solid #285472", padding: "7px 12px", color: "#e0f2fe", background: intervalMinutes === minutes ? "#075caa" : "#12263b" }}>{minutes === 60 ? "1H" : minutes === 240 ? "4H" : minutes === 1440 ? "1D" : minutes + "m"}</button>)}
          <button onClick={() => setShowSma(v => !v)} aria-pressed={showSma} style={{ cursor: "pointer", borderRadius: 7, border: "1px solid #285472", padding: "7px 12px", color: showSma ? "#facc15" : "#94a3b8", background: "#12263b" }}>SMA 14 {showSma ? "●" : "○"}</button>
          <button onClick={() => setWindowSize(v => Math.max(20, v - 12))} style={{ cursor: "pointer", borderRadius: 7, border: "1px solid #285472", padding: "7px 12px", color: "#e0f2fe", background: "#12263b" }}>Zoom +</button>
          <button onClick={() => setWindowSize(v => Math.min(96, v + 12))} style={{ cursor: "pointer", borderRadius: 7, border: "1px solid #285472", padding: "7px 12px", color: "#e0f2fe", background: "#12263b" }}>Zoom −</button>
        </div>
        <p style={{ fontSize: 12, color: "#9aaac0" }}>{mode === "demo" ? "SIMULATED OHLC · NOT LIVE PRICES" : "Live Kraken OHLC"} · Green = rising · Red = falling · Hover for OHLC · Choose timeframe and zoom</p>
        {picked && <div style={{ display: "flex", gap: 16, flexWrap: "wrap", color: "#7dd3fc", fontSize: 12, marginBottom: 10 }}>
          <span>O: ${display(picked.open)}</span><span>H: ${display(picked.high)}</span><span>L: ${display(picked.low)}</span><span>C: ${display(picked.close)}</span>
        </div>}
        <svg viewBox="0 0 960 240" preserveAspectRatio="none" role="img" aria-label={symbol + " hourly candlestick chart"} onMouseLeave={() => setHovered(null)} style={{ display: "block", width: "100%", height: 240, background: "repeating-linear-gradient(to right,transparent 0px,transparent 94px,#19344a 95px),repeating-linear-gradient(to bottom,transparent 0px,transparent 39px,#19344a 40px)", borderRadius: 8 }}>
          {showSma && smaPoints && <polyline points={smaPoints} stroke="#facc15" strokeWidth="2" fill="none" vectorEffect="non-scaling-stroke" />}
          {recent.map((c, i) => {
            const x = 10 + i * 940 / Math.max(1, recent.length);
            const color = c.close >= c.open ? "#34d399" : "#fb7185";
            const top = Math.min(priceY(c.open), priceY(c.close));
            return <g key={i} onMouseEnter={() => setHovered(i)} style={{ cursor: "crosshair" }}>
              <rect x={x - 9} y="0" width="18" height="240" fill="transparent" /><line x1={x} x2={x} y1={priceY(c.high)} y2={priceY(c.low)} stroke={color} strokeWidth="2" />
              <rect x={x - 5} y={top} width="10" height={Math.max(2, Math.abs(priceY(c.close) - priceY(c.open)))} fill={color} />{hovered === i && <line x1={x} x2={x} y1="0" y2="240" stroke="#7dd3fc" strokeDasharray="4 4" opacity="0.8" />}
            </g>;
          })}
        </svg>
        {!recent.length && <p style={{ color: "#9aaac0" }}>Waiting for candle data…</p>}
      </section>
      <section style={panel}>
        <h3 style={{ margin: "0 0 8px", fontSize: 18 }}>MACD · 12 / 26 / 9</h3>
        <p style={{ fontSize: 12, color: "#9aaac0" }}>Blue MACD · Orange signal · Green/red histogram</p>
        <svg viewBox="0 0 960 220" preserveAspectRatio="none" role="img" aria-label={symbol + " MACD momentum indicator"} style={{ display: "block", width: "100%", height: 220, background: "repeating-linear-gradient(to right,transparent 0px,transparent 94px,#19344a 95px),repeating-linear-gradient(to bottom,transparent 0px,transparent 43px,#19344a 44px)", borderRadius: 8 }}>
          <line x1="0" x2="960" y1="105" y2="105" stroke="#64748b" strokeDasharray="5 5" />
          {macd && <>
            {macd.bars.map((value, i) => <rect key={i} x={macdX(i) - 3} y={Math.min(105, macdY(value))} width="6" height={Math.max(1, Math.abs(105 - macdY(value)))} fill={value >= 0 ? "#34d399" : "#fb7185"} />)}
            <polyline points={polyline(macd.line)} fill="none" stroke="#60a5fa" strokeWidth="2" vectorEffect="non-scaling-stroke" />
            <polyline points={polyline(macd.signal)} fill="none" stroke="#fbbf24" strokeWidth="2" vectorEffect="non-scaling-stroke" />
          </>}
        </svg>
        {!macd && <p style={{ color: "#9aaac0" }}>Waiting for at least 35 hourly candles…</p>}
        <p style={{ fontSize: 12, color: "#9aaac0" }}>Indicators are informational, not guaranteed trading signals.</p>
      </section>
    </>
  );
}
