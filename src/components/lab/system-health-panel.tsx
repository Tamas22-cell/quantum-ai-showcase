import { Activity, ArrowUpRight } from "lucide-react";

const MODULES = [
  { name: "Quantum Lab", url: "/lab/qaoa" },
  { name: "AI Lab", url: "/lab/ai" },
  { name: "Finance Lab", url: "/lab/finance" },
  { name: "Web3 / Solidity", url: "/lab/web3-solidity" },
  { name: "Crypto Intelligence", url: "/lab/crypto-intelligence" },
];

export function SystemHealthPanel() {
  return (
    <section id="system-health" aria-label="Research modules" className="mb-12 rounded-md border border-primary/30 bg-card p-5 sm:p-6">
      <div>
        <span className="inline-flex items-center gap-2 font-mono text-xs uppercase text-primary">
          <Activity className="size-4" /> Research modules
        </span>
        <h2 className="mt-2 text-2xl font-semibold">Explore the research labs</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Open a research module below. Availability of a module link does not imply live service uptime.
        </p>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {MODULES.map(module => (
          <a key={module.url} href={module.url} className="flex items-center justify-between gap-3 rounded-md border border-border bg-background p-4 text-sm hover:border-primary/50 hover:text-primary">
            <span>{module.name}<span className="mt-1 block font-mono text-[10px] text-muted-foreground">Open research module</span></span>
            <ArrowUpRight className="size-4 shrink-0" />
          </a>
        ))}
      </div>
    </section>
  );
}
