import { Activity, ExternalLink } from "lucide-react";

type Props = {
  running: boolean;
  completed: boolean;
  error: string;
  fetchedAt: string | null;
};

const AGENTS = [
  ["Planner", "Workflow outline"],
  ["Data", "Market-data retrieval"],
  ["Market", "Research interpretation"],
  ["Risk", "Risk assessment"],
  ["Critic", "Evidence review"],
  ["Synthesis", "Final research output"],
] as const;

/** Monitors this page's real BTC data request; does not pretend the illustrative agents execute. */
export function AiAgentExecutionMonitor({ running, completed, error, fetchedAt }: Props) {
  const dataState = running ? "Fetching" : completed && !error && fetchedAt ? "Fetched" : completed ? "Unavailable" : "Idle";

  return (
    <section className="mt-6 rounded-md border border-primary/30 bg-card p-5" aria-label="AI Agents Execution Monitor">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="inline-flex items-center gap-2 text-lg font-semibold">
          <Activity className="size-5 text-primary" aria-hidden="true" />
          AI Agents Execution Monitor
        </h3>
        <span className="rounded-full border border-border px-2 py-1 font-mono text-[10px] uppercase text-muted-foreground">
          Local demo telemetry
        </span>
      </div>
      <p className="mt-2 text-xs leading-6 text-muted-foreground">
        Tracks the real CoinGecko request from this demo. Agent stages below are a workflow
        illustration, not independently executing or connected production agents.
      </p>
      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {AGENTS.map(([name, purpose]) => {
          const isData = name === "Data";
          const state = isData ? dataState : "Illustrative";
          return (
            <div key={name} className="rounded-md border border-border bg-background p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-xs font-semibold">{name} Agent</span>
                <span className={`font-mono text-[10px] ${isData && state === "Fetched" ? "text-emerald-400" : isData && state === "Unavailable" ? "text-destructive" : "text-muted-foreground"}`}>
                  {state}
                </span>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{purpose}</p>
            </div>
          );
        })}
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground" aria-live="polite">
        <span>
          {running
            ? "Request in progress…"
            : completed
              ? error
                ? "Market-data request failed; no fabricated data displayed."
                : `BTC data received: ${fetchedAt ?? "timestamp unavailable"}`
              : "Run the research demo above to check the live market-data request."}
        </span>
        <a href="https://ai-multi-agent-financial-research-p.vercel.app" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
          Open deployed agent platform <ExternalLink className="size-3" aria-hidden="true" />
        </a>
      </div>
    </section>
  );
}
