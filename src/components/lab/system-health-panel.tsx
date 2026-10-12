import { Activity, ArrowUpRight, CheckCircle2 } from "lucide-react";

const MODULES = [
  { name: "Quantum Lab", url: "/lab/qaoa" },
  { name: "AI Lab", url: "/lab/ai" },
  { name: "Finance Lab", url: "/lab/finance" },
  { name: "Web3 / Solidity", url: "/lab/web3-solidity" },
  { name: "Crypto Intelligence", url: "/lab/crypto-intelligence" },
];

export function SystemHealthPanel() {
  return (
    <section id="system-health" aria-label="System Health" className="mb-12 rounded-md border border-primary/30 bg-card p-5 sm:p-6">
      <div>
        <span className="inline-flex items-center gap-2 font-mono text-xs uppercase text-primary">
          <Activity className="size-4" /> System Health
        </span>
        <h2 className="mt-2 text-2xl font-semibold">Platform Health &amp; module status</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Research platform overview. External API uptime and individual laboratory execution are not continuously monitored.
        </p>
      </div>
      <div className="mt-5 rounded-md border border-border bg-background p-4">
        <div className="flex items-center gap-2 text-sm font-medium">
          <CheckCircle2 className="size-4 text-emerald-400" />
          Platform deployed
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Deployment status was verified during maintenance. This is not a live health check.
        </p>
        <a href="https://github.com/Tamas22-cell/quantum-ai-showcase/actions" target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs text-primary hover:underline">
          View GitHub Actions <ArrowUpRight className="size-3" />
        </a>
      </div>
      <h3 className="mt-6 font-mono text-xs uppercase text-muted-foreground">Research modules · links, not live health checks</h3>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {MODULES.map(module => (
          <a key={module.url} href={module.url} className="flex items-center justify-between gap-3 rounded-md border border-border bg-background p-4 text-sm hover:border-primary/50 hover:text-primary">
            <span>{module.name}<span className="mt-1 block font-mono text-[10px] text-muted-foreground">Open module · uptime unverified</span></span>
            <ArrowUpRight className="size-4 shrink-0" />
          </a>
        ))}
      </div>
    </section>
  );
}
