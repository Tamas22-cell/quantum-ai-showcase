import { useEffect, useState } from "react";
import { Activity, ArrowUpRight, RefreshCw } from "lucide-react";

type WorkflowRun = {
  id: number;
  html_url: string;
  name: string;
  status: string;
  conclusion: string | null;
  updated_at: string;
};
type RunsResponse = { workflow_runs?: WorkflowRun[] };
const RUNS_URL =
  "https://api.github.com/repos/Tamas22-cell/quantum-ai-showcase/actions/workflows/ci.yml/runs?per_page=1";
const ACTIONS_URL = "https://github.com/Tamas22-cell/quantum-ai-showcase/actions";
const MODULES = [
  { name: "Quantum Lab", url: "/lab/qaoa" },
  { name: "AI Lab", url: "/lab/ai" },
  { name: "Finance Lab", url: "/lab/finance" },
  { name: "Web3 / Solidity", url: "/lab/web3-solidity" },
  { name: "Crypto Intelligence", url: "/lab/crypto-intelligence" },
];

export function SystemHealthPanel() {
  const [run, setRun] = useState<WorkflowRun | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function refresh() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(RUNS_URL, {
        headers: { Accept: "application/vnd.github+json" },
      });
      if (!response.ok) throw new Error(`GitHub API HTTP ${response.status}`);
      const result = (await response.json()) as RunsResponse;
      setRun(result.workflow_runs?.[0] ?? null);
    } catch (cause) {
      setRun(null);
      setError(cause instanceof Error ? cause.message : "GitHub status unavailable");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  const passed = run?.status === "completed" && run.conclusion === "success";
  const failed = run?.status === "completed" && run.conclusion !== "success";
  const statusText = loading
    ? "Checking…"
    : error
      ? "Unavailable"
      : !run
        ? "No runs found"
        : passed
          ? "Passed"
          : failed
            ? `Finished: ${run.conclusion ?? "unknown"}`
            : `In progress: ${run.status}`;
  const statusClass = passed
    ? "text-emerald-400"
    : failed
      ? "text-destructive"
      : "text-muted-foreground";

  return (
    <section
      id="system-health"
      aria-label="System Health"
      className="mb-12 rounded-md border border-primary/30 bg-card p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <span className="inline-flex items-center gap-2 font-mono text-xs uppercase text-primary">
            <Activity className="size-4" />
            System Health
          </span>
          <h2 className="mt-2 text-2xl font-semibold">Build & module status</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Live GitHub CI result and links to implemented labs. Module links do not indicate live
            API uptime.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-xs hover:text-primary disabled:opacity-50"
        >
          <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      <div className="mt-5 rounded-md border border-border bg-background p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-mono text-[11px] uppercase text-muted-foreground">
              GitHub Actions · Lint / Test / Build
            </p>
            <p aria-live="polite" className={`mt-1 text-lg font-semibold ${statusClass}`}>
              {statusText}
            </p>
            {error && (
              <p className="mt-1 text-xs text-muted-foreground">
                {error}. See GitHub Actions for details.
              </p>
            )}
            {run?.updated_at && (
              <p className="mt-1 text-xs text-muted-foreground">
                Last update: {new Date(run.updated_at).toLocaleString()}
              </p>
            )}
          </div>
          <a
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
            href={run?.html_url ?? ACTIONS_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            View GitHub Actions <ArrowUpRight className="size-3.5" />
          </a>
        </div>
      </div>

      <h3 className="mt-6 font-mono text-xs uppercase text-muted-foreground">
        Research modules · links, not live health checks
      </h3>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {MODULES.map((module) => (
          <a
            key={module.url}
            href={module.url}
            className="flex items-center justify-between gap-3 rounded-md border border-border bg-background p-4 text-sm hover:border-primary/50 hover:text-primary"
          >
            <span>
              {module.name}
              <span className="mt-1 block font-mono text-[10px] text-muted-foreground">
                Open module · uptime unverified
              </span>
            </span>
            <ArrowUpRight className="size-4 shrink-0" />
          </a>
        ))}
      </div>
    </section>
  );
}
