import React, { useEffect, useMemo, useState } from 'react';
import { sma, ema, rsi, macd, fibonacci, validateCandles, validateQuote, type Candle } from './marketMath';

/** Isolated preview component: do not import into production routes before approval. */
const PAIRS = { BTC: 'XBTUSD', ETH: 'ETHUSD', SOL: 'SOLUSD' } as const;
type Coin = keyof typeof PAIRS;
const INTERVALS = { '5m': 5, '15m': 15, '1h': 60, '4h': 240, '1d': 1440 } as const;
type Frame = keyof typeof INTERVALS;
type State = { candles: Candle[]; updated: number; source: string };
const kraken = 'https://api.kraken.com/0/public/';
function pairResult(data: any): any {
  if (!data || !Array.isArray(data.error) || data.error.length) throw new Error('EXCHANGE_ERROR');
  const key = Object.keys(data.result ?? {}).find(k => k !== 'last');
  if (!key) throw new Error('MISSING_PAIR');
  return data.result[key];
}
async function fetchJson(url: string, signal: AbortSignal) {
  const response = await fetch(url, { signal, cache: 'no-store' });
  if (!response.ok) throw new Error('HTTP_' + response.status);
  return response.json();
}
function CandleChart({ candles, sma50, sma200, ema20, fib }: {
  candles: Candle[]; sma50: boolean; sma200: boolean; ema20: boolean; fib: boolean;
}) {
  const visible = candles.slice(-90);
  const closes = candles.map(c => c.close);
  const start = candles.length - visible.length;
  const layers = [
    { enabled: sma50, data: sma(closes,50), color: '#fbbf24' },
    { enabled: sma200, data: sma(closes,200), color: '#a78bfa' },
    { enabled: ema20, data: ema(closes,20), color: '#60a5fa' },
  ];
  const extras = layers.filter(x=>x.enabled).flatMap(x=>x.data.slice(start).filter((n):n is number=>n!==null));
  const hi = Math.max(...visible.map(c=>c.high), ...extras);
  const lo = Math.min(...visible.map(c=>c.low), ...extras);
  const span = Math.max(hi-lo,hi*0.0001);
  const y = (p:number)=>12+(hi-p)/span*245;
  const x = (i:number)=>38+i*7;
  const fibLevels = fib && visible.length>1
    ? fibonacci(visible[0].close, visible[visible.length-1].close) : [];
  return <svg viewBox="0 0 690 300" role="img" aria-label="Candlestick chart with technical overlays" style={{width:'100%',background:'#0f172a',borderRadius:12}}>
    {[0,.25,.5,.75,1].map((f,i)=><g key={i}><line x1="30" x2="685" y1={12+f*245} y2={12+f*245} stroke="#334155" strokeDasharray="3 4"/><text x="2" y={16+f*245} fontSize="9" fill="#cbd5e1">{(hi-span*f).toFixed(0)}</text></g>)}
    {visible.map((c,i)=>{const cx=x(i),up=c.close>=c.open,color=up?'#34d399':'#fb7185';return <g key={c.time}><line x1={cx} x2={cx} y1={y(c.high)} y2={y(c.low)} stroke={color}/><rect x={cx-2.4} y={Math.min(y(c.open),y(c.close))} width="4.8" height={Math.max(1,Math.abs(y(c.open)-y(c.close)))} fill={color}/></g>})}
    {layers.filter(l=>l.enabled).map((l,i)=>{const points=l.data.slice(start).map((p,j)=>p===null?null:`${x(j)},${y(p)}`).filter(Boolean).join(' ');return <polyline key={i} points={points} fill="none" stroke={l.color} strokeWidth="1.7"/>})}
    {fibLevels.map(l=><g key={l.level}><line x1="36" x2="680" y1={y(l.price)} y2={y(l.price)} stroke="#f0abfc" strokeDasharray="5 5" opacity=".7"/><text x="590" y={y(l.price)-3} fontSize="10" fill="#f0abfc">{l.level}</text></g>)}
  </svg>;
}
export default function Web3TerminalTest() {
  const [coin,setCoin]=useState<Coin>('BTC');
  const [frame,setFrame]=useState<Frame>('1h');
  const [data,setData]=useState<State|null>(null);
  const [error,setError]=useState('');
  const [loading,setLoading]=useState(true);
  const [show,setShow]=useState({sma50:true,sma200:false,ema20:false,rsi:true,macd:true,fib:false});
  useEffect(()=>{
    const controller=new AbortController();
    let active=true;
    const load=async()=>{
      try {
        const pair=PAIRS[coin];
        const [ohlc,ticker]=await Promise.all([
          fetchJson(`${kraken}OHLC?pair=${pair}&interval=${INTERVALS[frame]}`,controller.signal),
          fetchJson(`${kraken}Ticker?pair=${pair}`,controller.signal)
        ]);
        const raw=pairResult(ohlc);
        const candles=validateCandles(raw.map((r:any[])=>({
          time:Number(r[0])*1000,open:Number(r[1]),high:Number(r[2]),
          low:Number(r[3]),close:Number(r[4]),volume:Number(r[6])
        })));
        const price=Number(pairResult(ticker).c[0]);
        validateQuote({symbol:`${coin}/USD` as 'BTC/USD'|'ETH/USD'|'SOL/USD',price,timestamp:Date.now(),source:'Kraken'},Date.now());
        if(active){setData({candles,updated:Date.now(),source:'Kraken'});setError('');}
      } catch(e) {if(active&&!controller.signal.aborted){setError('Live data unavailable: '+(e instanceof Error?e.message:'UNKNOWN'));setData(null);}}
      finally {if(active)setLoading(false);}
    };
    setLoading(true);setData(null);load();
    const timer=setInterval(load,60000);
    return ()=>{active=false;clearInterval(timer);controller.abort();};
  },[coin,frame]);
  const values=useMemo(()=>data?.candles.map(c=>c.close)??[],[data]);
  const rsiValues=useMemo(()=>rsi(values),[values]);
  const macdValues=useMemo(()=>macd(values),[values]);
  const toggle=(key:keyof typeof show)=>setShow(v=>({...v,[key]:!v[key]}));
  const last=data?.candles.at(-1);
  return <section style={{color:'#e2e8f0',background:'#020617',padding:20,borderRadius:16,fontFamily:'system-ui'}}>
    <h2>Web3 Market Terminal — TEST ONLY</h2>
    <p style={{color:'#fbbf24'}}>Separate preview. Not connected to the public portfolio.</p>
    <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:12}}>
      {(['BTC','ETH','SOL'] as Coin[]).map(c=><button key={c} onClick={()=>setCoin(c)} aria-pressed={coin===c}>{c}</button>)}
      <select value={frame} onChange={e=>setFrame(e.target.value as Frame)} aria-label="Candle interval">{Object.keys(INTERVALS).map(t=><option key={t}>{t}</option>)}</select>
    </div>
    <p>{loading?'Loading verified data…':error?error:last?`${coin}/USD · Last candle close: $${last.close.toLocaleString('en-US')} · Source: ${data?.source} · Retrieved: ${new Date(data!.updated).toLocaleTimeString()}`:'Data unavailable'}</p>
    <div style={{display:'flex',gap:12,flexWrap:'wrap',marginBottom:12}}>
      {Object.entries(show).map(([key,value])=><label key={key}><input type="checkbox" checked={value} onChange={()=>toggle(key as keyof typeof show)}/> {key.toUpperCase()}</label>)}
    </div>
    {data&&data.candles.length>0&&<CandleChart candles={data.candles} sma50={show.sma50} sma200={show.sma200} ema20={show.ema20} fib={show.fib}/>}
    {show.rsi&&<p>RSI(14): {rsiValues.at(-1)?.toFixed(2)??'Warming up'}</p>}
    {show.macd&&<p>MACD(12,26,9): {macdValues.line.at(-1)?.toFixed(3)??'Warming up'} · Signal: {macdValues.signal.at(-1)?.toFixed(3)??'Warming up'}</p>}
    <p style={{fontSize:12,color:'#94a3b8'}}>Preview uses Kraken public endpoints. Browser CORS/network failures are surfaced; no fallback prices are invented. The last candle may be unfinished. Drawing tools and independent live-price cards are not yet implemented.</p>
  </section>;
}
