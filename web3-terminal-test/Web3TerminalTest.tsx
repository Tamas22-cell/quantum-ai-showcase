import React, { useEffect, useMemo, useState } from 'react';
import { sma, ema, rsi, macd, fibonacci, bollinger, atr, validateCandles, type Candle } from './marketMath';

const PAIRS = { BTC: 'XBTUSD', ETH: 'ETHUSD', SOL: 'SOLUSD' } as const;
type Coin = keyof typeof PAIRS;
const COINS: Coin[] = ['BTC','ETH','SOL'];
const INTERVALS = { '5m': 5, '15m': 15, '1h': 60, '4h': 240, '1d': 1440 } as const;
type Frame = keyof typeof INTERVALS;
type QuoteState = { price: number; updated: number; high: number; low: number; volume: number; change: number };
type MarketState = { candles: Candle[]; updated: number };
const api = 'https://api.kraken.com/0/public/';
function unwrap(payload: unknown): any {
  const p = payload as { error?: unknown; result?: Record<string,unknown> };
  if (!p || !Array.isArray(p.error) || p.error.length || !p.result) throw new Error('EXCHANGE_RESPONSE');
  const key = Object.keys(p.result).find(k=>k!=='last');
  if (!key) throw new Error('MISSING_PAIR');
  return p.result[key];
}
async function json(url: string, signal: AbortSignal): Promise<unknown> {
  const response = await fetch(url, {signal,cache:'no-store'});
  if (!response.ok) throw new Error('HTTP_'+response.status);
  return response.json();
}
function parseTicker(t: any): Omit<QuoteState,'updated'> {
  const price=Number(t?.c?.[0]), open=Number(t?.o), high=Number(t?.h?.[1]), low=Number(t?.l?.[1]), volume=Number(t?.v?.[1]);
  if (![price,open,high,low,volume].every(Number.isFinite) || Math.min(price,open,high,low)<=0 || high<low || price>high*1.02 || price<low*.98 || volume<0) throw new Error('INVALID_TICKER');
  return {price,high,low,volume,change:(price/open-1)*100};
}
function parseCandles(raw: any, interval: number): Candle[] {
  if (!Array.isArray(raw)) throw new Error('INVALID_OHLC');
  const candles=validateCandles(raw.map((r: unknown[])=>({
    time:Number(r[0])*1000,open:Number(r[1]),high:Number(r[2]),low:Number(r[3]),close:Number(r[4]),volume:Number(r[6])
  })));
  if (candles.length<35) throw new Error('INSUFFICIENT_CANDLES');
  const lastClosed=candles.at(-2);
  if (!lastClosed || Date.now()-lastClosed.time>interval*60_000*3 || lastClosed.time>Date.now()+60_000) throw new Error('STALE_CANDLES');
  return candles;
}
function CandleChart({candles,flags,anchors,onAnchor,zoom,offset,onOffset}:{
  candles:Candle[];flags:Record<string,boolean>;anchors:[number,number]|null;onAnchor:(price:number)=>void;
  zoom:number;offset:number;onOffset:(v:number)=>void;
}) {
  const [hover,setHover]=useState<number|null>(null);
  const [pointer,setPointer]=useState<{x:number;y:number}|null>(null);
  const count=Math.max(20,Math.min(90,zoom));
  const end=Math.max(count,candles.length-offset);
  const start=Math.max(0,end-count);
  const visible=candles.slice(start,end);
  const closes=candles.map(c=>c.close);
  const bands=bollinger(closes);
  const overlays=[
    {on:flags.sma50,values:sma(closes,50),color:'#fbbf24'},
    {on:flags.sma200,values:sma(closes,200),color:'#c084fc'},
    {on:flags.ema20,values:ema(closes,20),color:'#60a5fa'},
    {on:flags.bb,values:bands.upper,color:'#f472b6'},
    {on:flags.bb,values:bands.middle,color:'#f9a8d4'},
    {on:flags.bb,values:bands.lower,color:'#f472b6'}
  ];
  const fib=flags.fib&&visible.length>1?fibonacci(...(anchors??[Math.min(...visible.map(c=>c.low)),Math.max(...visible.map(c=>c.high))])):[];
  const extra=overlays.filter(l=>l.on).flatMap(l=>l.values.slice(start,end).filter((v):v is number=>v!==null));
  const high=Math.max(...visible.map(c=>c.high),...extra,...fib.map(f=>f.price));
  const low=Math.min(...visible.map(c=>c.low),...extra,...fib.map(f=>f.price));
  const range=Math.max(high-low,high*.0001);
  const y=(p:number)=>12+(high-p)/range*240;
  const x=(i:number)=>40+(i+.5)*640/visible.length;
  const width=Math.max(2,640/visible.length*.65);
  const volumeMax=Math.max(1,...visible.map(c=>c.volume));
  const selected=hover===null?null:visible[hover];
  const move=(e:React.PointerEvent<SVGSVGElement>)=>{
    const rect=e.currentTarget.getBoundingClientRect();
    const px=(e.clientX-rect.left)/rect.width*690,py=(e.clientY-rect.top)/rect.height*360;
    setPointer({x:px,y:py});setHover(Math.max(0,Math.min(visible.length-1,Math.floor((px-40)/640*visible.length))));
  };
  return <div>
    <svg viewBox="0 0 690 360" role="img" aria-label="Interactive candlestick chart with volume and crosshair" style={{width:'100%',background:'#0f172a',borderRadius:12,touchAction:'pan-y'}}
      onPointerMove={move} onPointerLeave={()=>{setHover(null);setPointer(null)}}
      onClick={e=>{if(!flags.fib)return;const rect=e.currentTarget.getBoundingClientRect();const py=(e.clientY-rect.top)/rect.height*360;if(py>=12&&py<=252)onAnchor(high-(py-12)/240*range)}}>
      {[0,.25,.5,.75,1].map(t=><g key={t}><line x1="35" x2="685" y1={12+t*240} y2={12+t*240} stroke="#334155" strokeDasharray="3 4"/><text x="1" y={15+t*240} fill="#cbd5e1" fontSize="10">{(high-t*range).toFixed(2)}</text></g>)}
      {visible.map((c,i)=>{const color=c.close>=c.open?'#34d399':'#fb7185';return <g key={c.time}><line x1={x(i)} x2={x(i)} y1={y(c.high)} y2={y(c.low)} stroke={color}/><rect x={x(i)-width/2} y={Math.min(y(c.open),y(c.close))} width={width} height={Math.max(1,Math.abs(y(c.open)-y(c.close)))} fill={color}/>{flags.volume&&<rect x={x(i)-width/2} y={338-c.volume/volumeMax*65} width={width} height={c.volume/volumeMax*65} fill={color} opacity=".8"/>}</g>})}
      {overlays.filter(l=>l.on).map((l,i)=><polyline key={i} points={l.values.slice(start,end).map((v,j)=>v===null?'':`${x(j)},${y(v)}`).filter(Boolean).join(' ')} fill="none" stroke={l.color} strokeWidth="1.8"/>)}
      {fib.map(f=><g key={f.level}><line x1="35" x2="685" y1={y(f.price)} y2={y(f.price)} stroke="#f0abfc" strokeDasharray="5 5"/><text x="620" y={y(f.price)-3} fill="#f0abfc" fontSize="10">{f.level}</text></g>)}
      {flags.volume&&<text x="38" y="275" fill="#94a3b8" fontSize="11">VOLUME</text>}
      {selected&&pointer&&<g pointerEvents="none"><line x1={x(hover!)} x2={x(hover!)} y1="10" y2="342" stroke="#e2e8f0" strokeDasharray="3 3"/><line x1="35" x2="685" y1={Math.min(252,Math.max(12,pointer.y))} y2={Math.min(252,Math.max(12,pointer.y))} stroke="#e2e8f0" strokeDasharray="3 3"/><rect x="40" y="3" width="340" height="21" fill="#020617" opacity=".9"/><text x="45" y="17" fill="#f8fafc" fontSize="11">{new Date(selected.time).toLocaleString()} O {selected.open.toFixed(2)} H {selected.high.toFixed(2)} L {selected.low.toFixed(2)} C {selected.close.toFixed(2)}</text></g>}
    </svg>
    <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap',marginTop:8}}>
      <button type="button" onClick={()=>onOffset(Math.min(candles.length-count,offset+Math.max(1,Math.floor(count/3))))}>← Older</button>
      <button type="button" onClick={()=>onOffset(Math.max(0,offset-Math.max(1,Math.floor(count/3))))}>Newer →</button>
      <button type="button" onClick={()=>onOffset(0)}>Latest</button>
      <small>Tap or hover for crosshair · {visible.length} candles · use Zoom controls</small>
    </div>
  </div>;
}
function IndicatorPanel({title, lines, bounds, guides}: {
  title:string;
  lines:{values:(number|null)[];color:string;label:string}[];
  bounds?:[number,number];
  guides?:number[];
}) {
  const values=lines.flatMap(l=>l.values.slice(-90).filter((v):v is number=>v!==null&&Number.isFinite(v)));
  const min=bounds?.[0]??Math.min(0,...values);
  const max=bounds?.[1]??Math.max(0,...values);
  const span=Math.max(max-min,0.000001);
  const y=(v:number)=>12+(max-v)/span*112;
  const x=(i:number)=>35+i*7;
  return <div style={{marginTop:12,padding:12,background:'#0f172a',borderRadius:12}}>
    <strong>{title}</strong>
    <div style={{display:'flex',gap:14,flexWrap:'wrap',fontSize:12,marginTop:4}}>
      {lines.map(l=><span key={l.label} style={{color:l.color}}>{l.label}: {l.values.at(-1)?.toFixed(2)??'—'}</span>)}
    </div>
    <svg viewBox="0 0 690 150" role="img" aria-label={title+' indicator chart'} style={{width:'100%',marginTop:6}}>
      {(guides??[0]).map(g=><g key={g}><line x1="35" x2="685" y1={y(g)} y2={y(g)} stroke="#64748b" strokeDasharray="5 5"/><text x="2" y={y(g)+3} fill="#94a3b8" fontSize="11">{g}</text></g>)}
      {lines.map(l=><polyline key={l.label} points={l.values.slice(-90).map((v,i)=>v===null?'':`${x(i)},${y(v)}`).filter(Boolean).join(' ')} stroke={l.color} fill="none" strokeWidth="2"/>)}
    </svg>
  </div>;
}
export default function Web3TerminalTest() {
  const [coin,setCoin]=useState<Coin>('BTC'),[frame,setFrame]=useState<Frame>('1h');
  const [quotes,setQuotes]=useState<Partial<Record<Coin,QuoteState>>>({});
  const [market,setMarket]=useState<MarketState|null>(null);
  const [errors,setErrors]=useState<Partial<Record<Coin,string>>>({});
  const [chartError,setChartError]=useState('');
  const [flags,setFlags]=useState({sma50:true,sma200:false,ema20:false,rsi:true,macd:true,fib:false,volume:true,bb:false,atr:false});
  const [anchors,setAnchors]=useState<[number,number]|null>(null);
  const [anchorInput,setAnchorInput]=useState('');
  const [anchorEnd,setAnchorEnd]=useState('');
  const [zoom,setZoom]=useState(70),[offset,setOffset]=useState(0),[fullscreen,setFullscreen]=useState(false);
  const [clock,setClock]=useState(Date.now());
  useEffect(()=>{const timer=setInterval(()=>setClock(Date.now()),10000);return ()=>clearInterval(timer)},[]);
  useEffect(()=>{
    const ctrl=new AbortController();
    const poll=async()=>{
      const outcomes=await Promise.allSettled(COINS.map(async c=>({coin:c,ticker:parseTicker(unwrap(await json(`${api}Ticker?pair=${PAIRS[c]}`,ctrl.signal)))})));
      if(ctrl.signal.aborted)return;
      const updated=Date.now();
      setQuotes(prev=>{const next={...prev};outcomes.forEach((o,i)=>{if(o.status==='fulfilled')next[COINS[i]]={...o.value.ticker,updated};});return next;});
      setErrors(prev=>{const next={...prev};outcomes.forEach((o,i)=>{next[COINS[i]]=o.status==='rejected'?'Quote unavailable':'';});return next;});
      setClock(updated);
    };
    void poll();const timer=setInterval(()=>void poll(),60_000);
    return ()=>{ctrl.abort();clearInterval(timer)};
  },[]);
  useEffect(()=>{
    const ctrl=new AbortController();setMarket(null);setChartError('');
    const poll=async()=>{
      try {const candles=parseCandles(unwrap(await json(`${api}OHLC?pair=${PAIRS[coin]}&interval=${INTERVALS[frame]}`,ctrl.signal)),INTERVALS[frame]);
        if(!ctrl.signal.aborted){setMarket({candles,updated:Date.now()});setChartError('');}
      }catch{if(!ctrl.signal.aborted){setMarket(null);setChartError('Chart data unavailable');}}
    };
    void poll();const timer=setInterval(()=>void poll(),60_000);
    return ()=>{ctrl.abort();clearInterval(timer)};
  },[coin,frame]);
  const closes=useMemo(()=>market?.candles.map(c=>c.close)??[],[market]);
  const rsiLine=useMemo(()=>rsi(closes),[closes]), macdLines=useMemo(()=>macd(closes),[closes]);
  const atrLine=useMemo(()=>market?atr(market.candles):[],[market]);
  const onAnchor=(p:number)=>{if(!Number.isFinite(p)||p<=0)return;setAnchors(prev=>prev===null?[p,p]:prev[0]===prev[1]?[prev[0],p]:[p,p]);};
  const manualAnchors=Number(anchorInput)>0&&Number(anchorEnd)>0&&Number(anchorInput)!==Number(anchorEnd)?[Number(anchorInput),Number(anchorEnd)] as [number,number]:null;
  const setFlag=(key:keyof typeof flags)=>setFlags(v=>({...v,[key]:!v[key]}));
  return <section style={{background:'#020617',color:'#e2e8f0',padding:20,borderRadius:16,fontFamily:'system-ui',...(fullscreen?{position:'fixed' as const,inset:0,zIndex:9999,overflowY:'auto' as const}:{})}}>
    <h2>Web3 Market Terminal — TEST ONLY</h2>
    <p>USD pairs · Kraken public API · Prices are last trades, not guaranteed executable quotes</p>
    <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
      {COINS.map(c=>{const q=quotes[c],fresh=q&&clock-q.updated<120000;return <button key={c} onClick={()=>{setCoin(c);setOffset(0);setAnchors(null);setAnchorInput('');setAnchorEnd('')}} aria-pressed={coin===c} style={{padding:12,color:'white',background:c===coin?'#1d4ed8':'#1e293b',border:'1px solid #475569',borderRadius:10,minWidth:150,textAlign:'left'}}>
        <strong>{c}/USD</strong><div>{fresh?'$'+q.price.toLocaleString('en-US'): 'Data unavailable'}</div>
        <small>{fresh?`${q.change.toFixed(2)}% · 24h H ${q.high.toFixed(2)} L ${q.low.toFixed(2)}`:errors[c]||'Waiting for quote'}</small>
      </button>})}
    </div>
    <div style={{display:'flex',gap:12,flexWrap:'wrap',margin:'16px 0'}}>
      <label>Timeframe <select value={frame} onChange={e=>{setFrame(e.target.value as Frame);setOffset(0);setAnchors(null);setAnchorInput('');setAnchorEnd('')}}>{Object.keys(INTERVALS).map(v=><option key={v}>{v}</option>)}</select></label>
      {Object.entries(flags).map(([key,on])=><label key={key}><input type="checkbox" checked={on} onChange={()=>setFlag(key as keyof typeof flags)}/>{key.toUpperCase()}</label>)}
    </div>
    <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:12}}><button onClick={()=>setZoom(v=>Math.max(20,v-10))}>Zoom +</button><button onClick={()=>setZoom(v=>Math.min(90,v+10))}>Zoom −</button><button onClick={()=>setFullscreen(v=>!v)}>{fullscreen?'Exit full screen':'Full screen'}</button></div>
    {flags.fib&&<div style={{marginBottom:12}}>Fibonacci: click two chart price levels, or enter prices manually. <input aria-label="First Fibonacci anchor" placeholder="Anchor A" type="number" min="0" step="any" value={anchorInput} onChange={e=>setAnchorInput(e.target.value)}/><input aria-label="Second Fibonacci anchor" placeholder="Anchor B" type="number" min="0" step="any" value={anchorEnd} onChange={e=>setAnchorEnd(e.target.value)}/><button onClick={()=>{setAnchors(null);setAnchorInput('');setAnchorEnd('')}}>Auto range</button></div>}
    {market?<CandleChart candles={market.candles} flags={flags} anchors={manualAnchors??(anchors?.[0]===anchors?.[1]?null:anchors)} onAnchor={onAnchor} zoom={zoom} offset={offset} onOffset={setOffset}/>:<p role="status">{chartError||'Loading chart…'}</p>}
    {flags.rsi&&<IndicatorPanel title="RSI (14)" lines={[{values:rsiLine,color:'#fbbf24',label:'RSI'}]} bounds={[0,100]} guides={[30,50,70]}/>}
    {flags.macd&&<IndicatorPanel title="MACD (12, 26, 9)" lines={[{values:macdLines.line,color:'#60a5fa',label:'MACD'},{values:macdLines.signal,color:'#f97316',label:'Signal'},{values:macdLines.histogram,color:'#34d399',label:'Histogram'}]} guides={[0]}/>}
    {flags.atr&&<IndicatorPanel title="ATR (14)" lines={[{values:atrLine,color:'#a78bfa',label:'ATR'}]}/>}
    <p style={{fontSize:12,color:'#94a3b8'}}>Quotes refreshed every 60 seconds. Last candle can be incomplete. If API requests fail or quotes expire, prices are hidden instead of presenting stale values as live. Test branch only.</p>
  </section>;
}
