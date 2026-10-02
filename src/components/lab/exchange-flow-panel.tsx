import { ArrowDownToLine, ArrowUpFromLine, Minus, ShieldCheck } from "lucide-react";

export function ExchangeFlowPanel() {
  return (
    <section
      id="exchange-flow"
      className="mt-4 scroll-mt-24 rounded-md border border-primary/30 bg-card p-4 sm:p-5"
    >
      <div className="flex flex-col gap-4">
        <div className="min-w-0">
          <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-primary">
            EXCHANGE ATTRIBUTION LAYER
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <h2 className="text-xl font-semibold">Exchange Flow Intelligence</h2>
            <span className="rounded-sm border border-amber-500/40 bg-amber-500/5 px-2 py-1 font-mono text-[9px] uppercase tracking-wider text-amber-500">
              SOURCE REQUIRED
            </span>
          </div>
          <p className="mt-2 max-w-3xl text-xs leading-5 text-muted-foreground">
            Exchange inflow, outflow and net flow are intentionally unavailable until a verified
            exchange-wallet attribution provider is connected. No synthetic exchange data is shown.
          </p>
        </div>

        <div className="rounded-md border border-amber-500/25 bg-amber-500/5 p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 rounded-sm border border-amber-500/30 p-2">
              <ShieldCheck className="size-4 text-amber-500" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold">No verified exchange attribution data</h3>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                This module will remain in research mode until a provider with labeled exchange-wallet
                clusters is connected. The dashboard will not estimate or infer exchange flows.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <FlowMetric icon={ArrowDownToLine} label="Exchange Inflow" description="BTC sent to attributed exchange wallets" />
          <FlowMetric icon={ArrowUpFromLine} label="Exchange Outflow" description="BTC leaving attributed exchange wallets" />
          <FlowMetric icon={Minus} label="Net Flow" description="Inflow minus outflow" />
        </div>

        <div className="rounded-md border border-border bg-background p-4">
          <div className="font-mono text-[10px] uppercase tracking-wider text-primary">DATA INTEGRITY</div>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            Verified attribution required. Because the source is not connected, no market interpretation
            is generated from this module.
          </p>
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
    <article className="min-w-0 rounded-md border border-border bg-background p-4">
      <div className="flex min-w-0 items-center gap-2 text-muted-foreground">
        <Icon className="size-4 shrink-0" aria-hidden="true" />
        <span className="truncate font-mono text-[10px] uppercase tracking-wider">{label}</span>
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className="font-mono text-2xl font-semibold text-muted-foreground">—</span>
        <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">Unavailable</span>
      </div>
      <div className="mt-2 break-words text-[11px] leading-4 text-muted-foreground">{description}</div>
    </article>
  );
}
