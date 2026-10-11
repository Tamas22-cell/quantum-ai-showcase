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
        <footer style={{ marginTop: 30, color: "#8394aa", fontSize: 12, display: "flex", gap: 9, alignItems: "center", flexWrap: "wrap" }}><ShieldCheck size={15} /> Public API data · No wallet connection required · Auto-refresh every 60 seconds · Data may be delayed or temporarily unavailable</footer>
      </div>
    </main>
  );
}
