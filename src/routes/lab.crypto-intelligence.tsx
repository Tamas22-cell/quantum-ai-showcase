import { createFileRoute, Link } from "@tanstack/react-router";
import { Activity, Bot, ChartNoAxesCombined, Coins, Gauge, Network } from "lucide-react";
import { LabShell } from "@/components/lab/lab-shell";

export const Route = createFileRoute("/lab/crypto-intelligence")({
  head: () => ({ meta: [
    { title: "Crypto Intelligence — Quantum AI Lab" },
    { name: "description", content: "Independent crypto research workspace for Bitcoin network activity, on-chain intelligence, mining revenue, market/network charts, transparent health scoring and AI-assisted analysis." },
    { property: "og:title", content: "Crypto Intelligence — Quantum AI Lab" },
    { property: "og:type", content: "website" },
  ]}),
  component: Page,
});

const modules = [
  { icon: Activity, title: "Bitcoin Network Activity", text: "Mempool, transaction fees, block production and network throughput.", status: "NEXT" },
  { icon: Network, title: "On-chain Intelligence", text: "Exchange flows, active-address and valuation signals with source transparency.", status: "PLANNED" },
  { icon: Coins, title: "Mining Revenue Dashboard", text: "Block subsidy, fee revenue, hashprice and miner-economics research.", status: "PLANNED" },
  { icon: ChartNoAxesCombined, title: "BTC Market + Network", text: "Interactive overlays for price, hashrate, difficulty and derivatives data.", status: "PLANNED" },
  { icon: Gauge, title: "Network Health Score", text: "Explainable component score built from measurable Bitcoin network signals.", status: "PLANNED" },
  { icon: Bot, title: "AI Blockchain Analyst", text: "Evidence-linked summaries generated from the live research feeds on this page.", status: "PLANNED" },
];

function Page() {
  return <LabShell crumb="Crypto Intelligence">
    <div className="mb-8 max-w-4xl">
      <span className="font-mono text-xs text-primary">RESEARCH / CRYPTO INTELLIGENCE</span>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Crypto Intelligence</h1>
      <p className="mt-3 text-sm leading-7 text-muted-foreground">A dedicated research workspace for Bitcoin network, on-chain, mining and market intelligence. This is separate from the interactive Blockchain Research Lab so each workspace stays focused.</p>
      <Link to="/lab/blockchain" className="mt-4 inline-flex rounded-sm border border-border px-3 py-2 font-mono text-[11px] uppercase text-muted-foreground hover:border-primary/60 hover:text-primary">Open Blockchain Research Lab →</Link>
    </div>
    <section className="rounded-md border border-border bg-card p-4 sm:p-5">
      <div className="font-mono text-[10px] uppercase tracking-wider text-primary">Research architecture</div>
      <h2 className="mt-1 text-xl font-semibold">Six intelligence modules</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {modules.map(({icon:Icon,title,text,status}) => <article key={title} className="rounded-md border border-border bg-background p-4">
          <div className="flex items-start justify-between gap-3"><Icon className="size-5 text-primary"/><span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">{status}</span></div>
          <h3 className="mt-4 font-semibold">{title}</h3><p className="mt-2 text-xs leading-5 text-muted-foreground">{text}</p>
        </article>)}
      </div>
    </section>
    <div className="mt-4 rounded-md border border-primary/30 bg-signal-soft p-4 text-xs leading-6 text-muted-foreground"><span className="font-mono text-primary">BUILD ORDER:</span> Network Activity → On-chain → Mining Revenue → Market/Network Chart → Health Score → AI Analyst. Live values will only be shown when backed by a real data source; no synthetic value will be presented as live.</div>
  </LabShell>;
}
