import { ArrowDownToLine, ArrowUpFromLine, Building2, Minus, ShieldCheck } from "lucide-react";

export function ExchangeFlowPanel(){
  return <section id="exchange-flow" className="mt-4 scroll-mt-24 rounded-md border border-primary/30 bg-card p-4 sm:p-5">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <div className="font-mono text-[10px] uppercase tracking-wider text-primary">Exchange attribution layer</div>
        <h2 className="mt-1 text-xl font-semibold">Exchange Flow Intelligence</h2>
        <p className="mt-1 max-w-3xl text-xs leading-5 text-muted-foreground">Tracks exchange inflow, outflow and net flow only when a verified exchange-wallet attribution source is connected. No synthetic or guessed exchange balances are displayed.</p>
      </div>
      <span className="w-fit rounded-sm border border-amber-500/40 px-2 py-1 font-mono text-[9px] uppercase tracking-wider text-amber-500">Source required</span>
    </div>

    <div className="mt-4 grid gap-3 sm:grid-cols-3">
      <div className="rounded-md border border-border bg-background p-4"><div className="flex items-center gap-2 text-muted-foreground"><ArrowDownToLine className="size-4"/><span className="font-mono text-[10px] uppercase">Exchange Inflow</span></div><div className="mt-3 text-2xl font-semibold">—</div><div className="mt-1 text-[11px] text-muted-foreground">BTC sent to attributed exchange wallets</div></div>
      <div className="rounded-md border border-border bg-background p-4"><div className="flex items-center gap-2 text-muted-foreground"><ArrowUpFromLine className="size-4"/><span className="font-mono text-[10px] uppercase">Exchange Outflow</span></div><div className="mt-3 text-2xl font-semibold">—</div><div className="mt-1 text-[11px] text-muted-foreground">BTC leaving attributed exchange wallets</div></div>
      <div className="rounded-md border border-border bg-background p-4"><div className="flex items-center gap-2 text-muted-foreground"><Minus className="size-4"/><span className="font-mono text-[10px] uppercase">Net Flow</span></div><div className="mt-3 text-2xl font-semibold">—</div><div className="mt-1 text-[11px] text-muted-foreground">Inflow minus outflow</div></div>
    </div>

    <div className="mt-3 grid gap-3 md:grid-cols-2">
      <div className="rounded-md border border-border bg-background p-4"><div className="flex items-center gap-2"><Building2 className="size-4 text-primary"/><h3 className="text-sm font-semibold">Market interpretation</h3></div><p className="mt-2 text-xs leading-5 text-muted-foreground">Once connected, positive net flow can indicate more BTC moving toward exchanges, while negative net flow can indicate net withdrawals. This is a research signal, not a standalone trading signal.</p></div>
      <div className="rounded-md border border-border bg-background p-4"><div className="flex items-center gap-2"><ShieldCheck className="size-4 text-primary"/><h3 className="text-sm font-semibold">Data integrity</h3></div><p className="mt-2 text-xs leading-5 text-muted-foreground">Exchange attribution requires a provider that maintains labeled exchange-wallet clusters. Until that source is connected, the dashboard intentionally shows unavailable values instead of fabricated data.</p></div>
    </div>
  </section>
}
