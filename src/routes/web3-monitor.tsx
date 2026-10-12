import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useState } from "react";
import { MarketTechnicalCharts, type MarketCandle } from "../components/web3/market-technical-charts";
import { ArrowLeft, Activity } from "lucide-react";

export const Route = createFileRoute("/web3-monitor")({ component: Web3Terminal });
type SymbolName = "BTC" | "ETH" | "SOL";
const symbols: SymbolName[] = ["BTC", "ETH", "SOL"];
const fmt = (n: number, digits = 2) => n.toLocaleString("en-US", { maximumFractionDigits: digits });
const surface = { border: "1px solid #284154", borderRadius: 16, background: "#0e1928", padding: 22 } as const;

function Web3Terminal() {
  const [selected, setSelected] = useState<SymbolName>("BTC");
  const [candles, setCandles] = useState<Partial<Record<SymbolName, MarketCandle[]>>>({});
  const [demo, setDemo] = useState(false);
  const onLiveCandles = useCallback((symbol: string, rows: MarketCandle[]) => {
    if (!symbols.includes(symbol as SymbolName)) return;
    setCandles(previous => ({ ...previous, [symbol]: rows }));
  }, []);
  const demoRows = (symbol: SymbolName): MarketCandle[] => Array.from({ length: 60 }, (_, i) => {
    const base = 100 + symbols.indexOf(symbol) * 15;
    const close = base + Math.sin(i / 5) * 3 + i * 0.06;
    const open = base + Math.sin((i - 1) / 5) * 3 + (i - 1) * 0.06;
    return { open, close, high: Math.max(open, close) * 1.003, low: Math.min(open, close) * 0.997 };
  });
  const active = demo ? demoRows(selected) : candles[selected] ?? [];
  const close = active.map(row => row.close);
  const current = active.at(-1)?.close;
  const first = active[0]?.open;
  const change = current != null && first ? (current - first) / first * 100 : null;
  const sma = close.length >= 14 ? close.slice(-14).reduce((sum, n) => sum + n, 0) / 14 : null;
  const rsi = (() => {
    if (close.length < 15) return null;
    let gain = 0, loss = 0;
    for (let i = close.length - 14; i < close.length; i++) {
      const diff = close[i] - close[i - 1];
      gain += Math.max(0, diff);
      loss += Math.max(0, -diff);
    }
    return loss === 0 ? gain === 0 ? 50 : 100 : 100 - 100 / (1 + gain / loss);
  })();
  return <main style={{ minHeight: "100vh", background: "#070d16", color: "#e7f4ff", fontFamily: "Inter,system-ui,sans-serif", padding: "clamp(18px,4vw,52px)" }}>
    <div style={{ maxWidth: 1250, margin: "auto" }}>
      <a href="/" style={{ color: "#9fb5c9", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 8 }}><ArrowLeft size={16} /> Back to Research Lab</a>
      <header style={{ margin: "34px 0 28px" }}>
        <div style={{ color: "#43e6bc", fontSize: 12, letterSpacing: 2 }}>QUANTUM AI RESEARCH LAB / WEB3</div>
        <h1 style={{ fontSize: "clamp(32px,5vw,56px)", margin: "10px 0" }}>Web3 Market Terminal</h1>
        <p style={{ color: "#a7bbce" }}>Kraken public market data · Candlestick charts · SMA14 · RSI14 · MACD</p>
      </header>
      <div style={{ ...surface, marginBottom: 16, display: "flex", gap: 14, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
        <span style={{ color: demo ? "#fbbf24" : "#43e6bc", display: "inline-flex", alignItems: "center", gap: 9 }}><Activity size={16} />{demo ? "DEMO — simulated values, not real prices" : "LIVE — Kraken public OHLC feed (60-second refresh)"}</span>
        <button type="button" onClick={() => setDemo(value => !value)} style={{ background: "#183344", color: "#e7f4ff", border: "1px solid #476376", borderRadius: 9, padding: "10px 15px", cursor: "pointer" }}>{demo ? "Return to live data" : "Interactive demo"}</button>
      </div>
      <section style={surface}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(175px,1fr))", gap: 12 }}>
          {symbols.map(symbol => {
            const rows = demo ? demoRows(symbol) : candles[symbol] ?? [];
            const latest = rows.at(-1)?.close;
            const start = rows[0]?.open;
            const pct = latest != null && start ? (latest - start) / start * 100 : null;
            return <button type="button" key={symbol} onClick={() => setSelected(symbol)} aria-pressed={selected === symbol} style={{ background: selected === symbol ? "#12382f" : "#132335", color: "#e7f4ff", border: selected === symbol ? "1px solid #43e6bc" : "1px solid #334d61", borderRadius: 12, padding: 18, cursor: "pointer", textAlign: "left" }}>
              <span style={{ color: "#a7bbce" }}>{symbol}/USD</span>
              <strong style={{ display: "block", fontSize: 27, margin: "10px 0" }}>{latest != null ? demo ? fmt(latest) + " pts" : "$" + fmt(latest) : "Select to load"}</strong>
              <span style={{ color: pct == null ? "#a7bbce" : pct < 0 ? "#fb7185" : "#43e6bc" }}>{pct == null ? "Awaiting candles" : (pct >= 0 ? "+" : "") + fmt(pct) + "% over chart period"}</span>
            </button>;
          })}
        </div>
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap", margin: "22px 0 8px", color: "#a7bbce" }}>
          <strong style={{ color: "#e7f4ff" }}>{selected}/USD</strong>
          <span>Last: {current == null ? "Loading" : demo ? fmt(current) + " pts" : "$" + fmt(current)}</span>
          <span>Period change: {change == null ? "—" : fmt(change) + "%"}</span>
          <span>SMA14: {sma == null ? "—" : fmt(sma)}</span>
          <span>RSI14: {rsi == null ? "—" : fmt(rsi, 1)}</span>
        </div>
        <MarketTechnicalCharts symbol={selected} candles={demo ? active : []} mode={demo ? "demo" : "live"} onLiveCandles={onLiveCandles} />
      </section>
      <p style={{ color: "#a7bbce", fontSize: 12, marginTop: 22 }}>Real market candles come from Kraken. Changes refer to the displayed candle period, not necessarily the daily session. Indicators are informational, not trading signals. The demo is explicitly simulated.</p>
    </div>
  </main>;
}
