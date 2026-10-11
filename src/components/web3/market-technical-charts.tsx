import { useMemo } from "react";

export type MarketCandle = { open: number; high: number; low: number; close: number };

function ema(values: number[], period: number): number[] {
  const weight = 2 / (period + 1);
  let last = values[0] ?? 0;
  return values.map(value => (last = value * weight + last * (1 - weight)));
}

export function MarketTechnicalCharts({ symbol, candles }: { symbol: string; candles: MarketCandle[] }) {
  const macd = useMemo(() => {
    if (candles.length < 35) return null;
    const closes = candles.map(c => c.close);
    const e12 = ema(closes, 12), e26 = ema(closes, 26);
    const line = e12.map((value, i) => value - e26[i]);
    const signal = ema(line, 9);
    return { line, signal, bars: line.map((value, i) => value - signal[i]) };
  }, [candles]);
  const recent = candles.slice(-48);
  const low = recent.length ? Math.min(...recent.map(c => c.low)) : 0;
  const high = recent.length ? Math.max(...recent.map(c => c.high)) : 1;
  const priceY = (n: number) => 220 - ((n - low) / (high - low || 1)) * 200;
  const extent = macd ? Math.max(0.001, ...macd.line.map(Math.abs), ...macd.signal.map(Math.abs), ...macd.bars.map(Math.abs)) : 1;
  const macdY = (n: number) => 105 - n / extent * 90;
  const macdX = (i: number) => 12 + i * 936 / Math.max(1, (macd?.line.length ?? 1) - 1);
  const polyline = (values: number[]) => values.map((n, i) => macdX(i) + "," + macdY(n)).join(" ");
  const panel = { marginTop: 20, padding: 18, borderRadius: 14, border: "1px solid #344155", background: "#101827" };
  return (
    <>
      <section style={panel}>
        <h3 style={{ margin: "0 0 8px", fontSize: 18 }}>Candlestick Chart · {symbol}/USD · 1H</h3>
        <p style={{ fontSize: 12, color: "#9aaac0" }}>Green = rising candle · Red = falling candle · Last 48 hours</p>
        <svg viewBox="0 0 960 240" preserveAspectRatio="none" role="img" aria-label={symbol + " hourly candlestick chart"} style={{ display: "block", width: "100%", height: 240 }}>
          {recent.map((c, i) => {
            const x = 10 + i * 940 / Math.max(1, recent.length);
            const color = c.close >= c.open ? "#34d399" : "#fb7185";
            const top = Math.min(priceY(c.open), priceY(c.close));
            return <g key={i}>
              <line x1={x} x2={x} y1={priceY(c.high)} y2={priceY(c.low)} stroke={color} strokeWidth="2" />
              <rect x={x - 5} y={top} width="10" height={Math.max(2, Math.abs(priceY(c.close) - priceY(c.open)))} fill={color} />
            </g>;
          })}
        </svg>
        {!recent.length && <p style={{ color: "#9aaac0" }}>Waiting for candle data…</p>}
      </section>
      <section style={panel}>
        <h3 style={{ margin: "0 0 8px", fontSize: 18 }}>MACD · 12 / 26 / 9</h3>
        <p style={{ fontSize: 12, color: "#9aaac0" }}>Blue MACD · Orange signal · Green/red histogram</p>
        <svg viewBox="0 0 960 220" preserveAspectRatio="none" role="img" aria-label={symbol + " MACD momentum indicator"} style={{ display: "block", width: "100%", height: 220 }}>
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
