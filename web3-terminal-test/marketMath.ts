/** Pure, dependency-free market-data validation and technical indicators.
 * All inputs are chronological OHLCV candles with UNIX millisecond timestamps.
 * No network calls, no production imports.
 */
export type Candle = { time: number; open: number; high: number; low: number; close: number; volume: number };
export type Quote = { symbol: 'BTC/USD' | 'ETH/USD' | 'SOL/USD'; price: number; timestamp: number; source: string };
const finite = (n: number) => Number.isFinite(n);
export function validateCandles(input: Candle[]): Candle[] {
  if (!Array.isArray(input)) throw new Error('INVALID_CANDLES');
  let last = -Infinity;
  return input.map(c => {
    if (!c || ![c.time,c.open,c.high,c.low,c.close,c.volume].every(finite)
      || c.time <= last || c.time < 0 || c.open <= 0 || c.high <= 0 || c.low <= 0 || c.close <= 0
      || c.volume < 0 || c.high < Math.max(c.open,c.close,c.low)
      || c.low > Math.min(c.open,c.close,c.high)) throw new Error('INVALID_CANDLE');
    last = c.time;
    return { ...c };
  });
}
export function validateQuote(q: Quote, now: number, maxAgeMs = 120000): Quote {
  if (!q || !['BTC/USD','ETH/USD','SOL/USD'].includes(q.symbol)
    || !finite(q.price) || q.price <= 0 || !finite(q.timestamp)
    || !finite(now) || !finite(maxAgeMs) || maxAgeMs < 0
    || q.timestamp > now + 5000 || now - q.timestamp > maxAgeMs
    || !q.source?.trim()) throw new Error('INVALID_OR_STALE_QUOTE');
  return { ...q };
}
export function sma(values: number[], period: number): (number | null)[] {
  if (!Number.isInteger(period) || period < 1) throw new Error('INVALID_PERIOD');
  let sum = 0;
  return values.map((v,i) => {
    if (!finite(v)) throw new Error('INVALID_VALUE');
    sum += v;
    if (i >= period) sum -= values[i-period] ?? 0;
    return i >= period-1 ? sum / period : null;
  });
}
export function ema(values: number[], period: number): (number | null)[] {
  if (!Number.isInteger(period) || period < 1) throw new Error('INVALID_PERIOD');
  const seed = sma(values,period);
  let previous: number | null = null;
  const k = 2 / (period+1);
  return values.map((v,i) => {
    if (i < period-1) return null;
    previous = previous === null ? (seed[i] ?? 0) : v*k + previous*(1-k);
    return previous;
  });
}
export function rsi(values: number[], period=14): (number | null)[] {
  if (!Number.isInteger(period) || period < 1) throw new Error('INVALID_PERIOD');
  if (values.some(v => !finite(v))) throw new Error('INVALID_VALUE');
  const out: (number|null)[] = values.map(() => null);
  if (values.length <= period) return out;
  let gain=0,loss=0;
  for(let i=1;i<=period;i++){const d=(values[i] ?? 0)-(values[i-1] ?? 0);gain+=Math.max(d,0);loss+=Math.max(-d,0);}
  gain/=period; loss/=period;
  const calc=()=>loss===0 ? (gain===0 ? 50 : 100) : 100-100/(1+gain/loss);
  out[period]=calc();
  for(let i=period+1;i<values.length;i++){
    const d=(values[i] ?? 0)-(values[i-1] ?? 0);
    gain=(gain*(period-1)+Math.max(d,0))/period;
    loss=(loss*(period-1)+Math.max(-d,0))/period;
    out[i]=calc();
  }
  return out;
}
export function macd(values: number[], fast=12, slow=26, signal=9) {
  if (!(Number.isInteger(fast)&&Number.isInteger(slow)&&Number.isInteger(signal)&&fast>0&&slow>fast&&signal>0))
    throw new Error('INVALID_PERIOD');
  const a=ema(values,fast),b=ema(values,slow);
  const line=a.map((v,i)=>v===null||b[i]===null ? null : v-(b[i] ?? 0));
  const valid=line.filter((v):v is number=>v!==null);
  const sig=ema(valid,signal);
  let j=0;
  const signalLine=line.map(v=>v===null ? null : sig[j++] ?? null);
  const histogram=line.map((v,i)=>v===null||signalLine[i]===null ? null : v-(signalLine[i] ?? 0));
  return {line,signal:signalLine,histogram};
}
export function fibonacci(a: number,b: number) {
  if (!finite(a)||!finite(b)||a<=0||b<=0||a===b) throw new Error('INVALID_ANCHORS');
  return [0,0.236,0.382,0.5,0.618,0.786,1].map(level=>({level,price:b+(a-b)*level}));
}

export function bollinger(values:number[],period=20,multiplier=2) {
  if(!Number.isInteger(period)||period<2||!Number.isFinite(multiplier)||multiplier<=0) throw new Error('INVALID_PERIOD');
  if(values.some(v=>!Number.isFinite(v))) throw new Error('INVALID_VALUE');
  const middle=sma(values,period);
  const upper=middle.map((m,i)=>{if(m===null)return null;const sample=values.slice(i-period+1,i+1);const deviation=Math.sqrt(sample.reduce((sum,v)=>sum+(v-m)**2,0)/period);return m+multiplier*deviation});
  const lower=middle.map((m,i)=>{if(m===null)return null;const sample=values.slice(i-period+1,i+1);const deviation=Math.sqrt(sample.reduce((sum,v)=>sum+(v-m)**2,0)/period);return m-multiplier*deviation});
  return {middle,upper,lower};
}
export function atr(candles:Candle[],period=14):(number|null)[] {
  if(!Number.isInteger(period)||period<1) throw new Error('INVALID_PERIOD');
  const cs=validateCandles(candles);
  const tr=cs.map((c,i)=>{const previous=cs[i-1];return !previous?c.high-c.low:Math.max(c.high-c.low,Math.abs(c.high-previous.close),Math.abs(c.low-previous.close));});
  const result:(number|null)[]=cs.map(()=>null);
  if(cs.length<period)return result;
  let avg=tr.slice(0,period).reduce((a,b)=>a+b,0)/period;
  result[period-1]=avg;
  for(let i=period;i<cs.length;i++){avg=(avg*(period-1)+(tr[i] ?? 0))/period;result[i]=avg}
  return result;
}
