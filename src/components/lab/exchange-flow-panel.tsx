import { ArrowDownToLine, ArrowUpFromLine, Minus } from "lucide-react";

export function ExchangeFlowPanel() {
  return (
    <section
      id="exchange-flow"
      className="mt-4 w-full max-w-full scroll-mt-24 overflow-hidden rounded-md border border-primary/30 bg-card p-4 sm:p-5"
    >
      <div className="min-w-0">
        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-primary">
          EXCHANGE FLOW
        </div>
        <h2 className="mt-1 text-xl font-semibold">Exchange Flow Intelligence</h2>
        <p className="mt-1 max-w-3xl text-xs leading-5 text-muted-foreground">
          Exchange inflow, outflow and net-flow research. Values are displayed only when the required
          exchange-wallet data feed is available.
        </p>
      </div>

      <div className="mt-4 grid w-full grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <FlowMetric
          icon={ArrowDownToLine}
          label="Exchange Inflow"
          description="BTC moving into exchange wallets"
        />
        <FlowMetric
          icon={ArrowUpFromLine}
          label="Exchange Outflow"
          description="BTC moving out of exchange wallets"
        />
        <FlowMetric
          icon={Minus}
          label="Net Flow"
          description="Inflow minus outflow"
        />
      </div>

      <div className="mt-3 grid w-full grid-cols-1 gap-3 lg:grid-cols-2">
        <div className="min-w-0 rounded-md border border-border bg-background p-4">
          <div className="font-mono text-[10px] uppercase tracking-wider text-primary">
            MARKET INTERPRETATION
          </div>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            Awaiting exchange-flow data. No market signal is generated while this feed is unavailable.
          </p>
        </div>

        <div className="min-w-0 rounded-md border border-border bg-background p-4">
          <div className="font-mono text-[10px] uppercase tracking-wider text-primary">
            DATA INTEGRITY
          </div>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            Exchange-flow values are not estimated. The dashboard displays live values only when the
            underlying data source is available.
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
    <article className="min-w-0 w-full rounded-md border border-border bg-background p-4">
      <div className="flex min-w-0 items-center gap-2 text-muted-foreground">
        <Icon className="size-4 shrink-0" aria-hidden="true" />
        <span className="min-w-0 break-words font-mono text-[10px] uppercase tracking-wider">
          {label}
        </span>
      </div>
      <div className="mt-3 flex min-w-0 flex-wrap items-baseline gap-2">
        <span className="font-mono text-2xl font-semibold text-muted-foreground">—</span>
        <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
          Data unavailable
        </span>
      </div>
      <p className="mt-2 break-words text-[11px] leading-4 text-muted-foreground">{description}</p>
    </article>
  );
}
