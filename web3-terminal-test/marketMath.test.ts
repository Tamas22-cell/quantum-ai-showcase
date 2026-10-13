import { describe, expect, it } from 'vitest';
import { validateCandles, validateQuote, sma, ema, rsi, macd, fibonacci } from './marketMath';

describe('market-data safeguards', () => {
  const now = 1_800_000_000_000;
  it('accepts fresh USD quotes and rejects stale/invalid quotes', () => {
    expect(validateQuote({symbol:'BTC/USD',price:83000,timestamp:now,source:'Kraken'},now).price).toBe(83000);
    expect(()=>validateQuote({symbol:'BTC/USD',price:65000,timestamp:now-3600000,source:'Kraken'},now)).toThrow();
    expect(()=>validateQuote({symbol:'SOL/USD',price:0,timestamp:now,source:'Kraken'},now)).toThrow();
  });
  it('rejects duplicate times and invalid OHLC', () => {
    const c={time:1,open:10,high:12,low:9,close:11,volume:1};
    expect(validateCandles([c])).toHaveLength(1);
    expect(()=>validateCandles([c,c])).toThrow();
    expect(()=>validateCandles([{...c,high:8}])).toThrow();
  });
});
describe('indicators', () => {
  it('does not invent SMA or EMA before enough history', () => {
    expect(sma([1,2,3,4],3)).toEqual([null,null,2,3]);
    expect(ema([1,2,3],3)).toEqual([null,null,2]);
  });
  it('handles RSI constant and rising markets', () => {
    expect(rsi(Array(16).fill(100),14)[14]).toBe(50);
    expect(rsi(Array.from({length:16},(_,i)=>i+1),14)[14]).toBe(100);
  });
  it('warms up MACD before returning signals', () => {
    const m=macd(Array.from({length:40},(_,i)=>100+i));
    expect(m.line[24]).toBeNull();
    expect(m.line[25]).not.toBeNull();
    expect(m.signal[32]).toBeNull();
    expect(m.signal[33]).not.toBeNull();
  });
  it('creates editable Fibonacci level values from two anchors', () => {
    const levels=fibonacci(100,200);
    expect(levels[0].price).toBe(200);
    expect(levels[3].price).toBe(150);
    expect(levels.at(-1)?.price).toBe(100);
  });
});
