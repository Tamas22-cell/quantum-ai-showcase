import { ArrowDownToLine, ArrowUpFromLine, Building2, Minus, ShieldCheck } from "lucide-react";

export function ExchangeFlowPanel() {
  const attributionReady = false;

  return (
    <section id="exchange-flow" className="mt-4 scroll-mt-24 rounded-md border border-primary/30 bg-card p-4 sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-primary">Exchange attribution layer</div>
          <h2 className="mt-1 text-xl font-semibold">Exchange Flow Intelligence</h2>
          <p className="mt-1 max-w-3xl text-xs leading-5 text-muted-foreground">
            Exchange inflow, outflow and net-flow metrics are displayed only when a verified exchange-wallet attribution source is connected.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2 rounded-sm border border-amber-500/30 bg-amber-500/5 px-3 py-2">
          <ShieldCheck className="size-4 text-amber-500" />
          <div>
            <div className="font-mono text-[9px] uppercase tracking-wider text-amber-500">Attribution unavailable</div>
            <div className="mt-0.5 text-[10px] text-muted-foreground">No verified source connected</div>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <FlowMetric icon={ArrowDownToLine} label="Exchange Inflow" description="BTC sent to attributed exchange wallets" />
        <FlowMetric icon={ArrowUpFromLine} label="Exchange Outflow" description="BTC leaving attributed exchange wallets" />
        <FlowMetric icon={Minus} label="Net Flow" description="Inflow minus outflow" />
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div className="rounded-md border border-border bg-background p-4">
          <div className="flex items-center gap-2">
            <Building2 className="size-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Market interpretation</h3>
          </div>
          <div className="mt-3 rounded-sm border border-border/70 bg-card p-3">
            <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              {attributionReady ? "Signal available" : "Signal unavailable"}
            </div>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {attributionReady
                ? "Net exchange flow can be interpreted alongside other market and on-chain signals."
                : "No interpretation is generated because verified exchange-wallet attribution data is not connected."}
            </p>
          </div>
        </div>

        <div className="rounded-md border border-border bg-background p-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-primary" />
            <h3 className="text-sm font-semibold">Data integrity</h3>
          </div>
          <p className="mt-3 text-xs leading-5 text-muted-foreground">
            Exchange attribution requires a provider that maintains labeled exchange-wallet clusters. Until that source is connected, values remain unavailable rather than being estimated or fabricated.
          </p>
          <div className="mt-3 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
            Verified attribution required
          </div>
        </div>
      </div>
    </section>
  );
}

function FlowMetric({
  icon: Icon,
  label,
  description,
}: {
  icon: typeof ArrowDownToLine;
  label: string;
  description: string;
}) {
  return (
    <article className="rounded-md border border-border bg-background p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="size-4" aria-hidden="true" />
        <span className="font-mono text-[10px] uppercase tracking-wider">{label}</span>
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="font-mono text-2xl font-semibold text-muted-foreground">—</span>
        <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">Unavailable</span>
      </div>
      <div className="mt-2 text-[11px] leading-4 text-muted-foreground">{description}</div>
    </article>
  );
}
