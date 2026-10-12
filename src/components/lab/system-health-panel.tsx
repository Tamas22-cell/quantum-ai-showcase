import { useState } from "react";
import { Activity, ArrowUpRight, RefreshCw } from "lucide-react";

const MODULES = [
  { name: "Quantum Lab", url: "/lab/qaoa" },
  { name: "AI Lab", url: "/lab/ai" },
  { name: "Finance Lab", url: "/lab/finance" },
  { name: "Web3 / Solidity", url: "/lab/web3-solidity" },
  { name: "Crypto Intelligence", url: "/lab/crypto-intelligence" },
];
type Result = { label: string; status: "ok" | "error"; detail: string };
export function SystemHealthPanel() {
  const [checking, setChecking] = useState(false);
  const [results, setResults] = useState<Result[] | null>(null);
  const [checkedAt, setCheckedAt] = useState("");
  async function probe(url: string, label: string): Promise<Result> {
    try {
      const response = await Promise.race([
        fetch(url, { method: "GET", cache: "no-store", signal: AbortSignal.timeout(6000) }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Timed out")), 6500))
      ]);
      const html = (response.headers.get("content-type") ?? "").includes("text/html");
      return {
        label,
        status: response.ok && html ? "ok" : "error",
        detail: response.ok && html ? "HTTP " + response.status + " · Page reachable (lab execution not tested)" : "HTTP " + response.status + " · Unexpected response"
      };
    } catch (error) {
      return { label, status: "error", detail: error instanceof Error ? error.message : "Connection unavailable" };
    }
  }
  async function checkNow() {
    if (checking) return;
    setChecking(true);
    setResults(null);
    try {
      const checks = await Promise.all([
        probe(window.location.pathname, "Platform HTTP"),
        ...MODULES.map(module => probe(module.url, module.name))
      ]);
      setResults(checks);
      setCheckedAt(new Date().toLocaleString());
    } catch {
      setResults([{ label: "Platform Health", status: "error", detail: "Diagnostics could not complete" }]);
      setCheckedAt(new Date().toLocaleString());
    } finally {
      setChecking(false);
    }
  }
  return (
    <section id="system-health" aria-label="System Health" className="mb-12 rounded-md border border-primary/30 bg-card p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <span className="inline-flex items-center gap-2 font-mono text-xs uppercase text-primary"><Activity className="size-4" /> System Health</span>
          <h2 className="mt-2 text-2xl font-semibold">Platform Health &amp; module status</h2>
          <p className="mt-2 text-sm text-muted-foreground">On-demand platform and module route checks. These do not test laboratory calculations or external APIs.</p>
        </div>
        <button type="button" onClick={checkNow} disabled={checking} className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-xs hover:text-primary disabled:opacity-50">
          <RefreshCw className={`size-4 ${checking ? "animate-spin" : ""}`} /> {checking ? "Checking…" : "Check now"}
        </button>
      </div>
      <div className="mt-5 rounded-md border border-border bg-background p-4">
        {!results ? <p className="text-sm text-muted-foreground">{checking ? "Checking platform and module routes…" : "Not checked yet. Select Check now to run diagnostics."}</p> :
          <div>
            <p className="mb-3 text-xs text-muted-foreground">Last checked: {checkedAt}</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {results.map(result => <div key={result.label} className="rounded border border-border p-3 text-xs">
                <span className={result.status === "ok" ? "text-emerald-400" : "text-destructive"}>{result.status === "ok" ? "● Reachable" : "● Failed"}</span>
                <span className="ml-2 font-semibold">{result.label}</span>
                <p className="mt-1 text-muted-foreground">{result.detail}</p>
              </div>)}
            </div>
          </div>}
      </div>
      <h3 className="mt-6 font-mono text-xs uppercase text-muted-foreground">Research modules</h3>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {MODULES.map(module => <a key={module.url} href={module.url} className="flex items-center justify-between gap-3 rounded-md border border-border bg-background p-4 text-sm hover:border-primary/50 hover:text-primary">
          <span>{module.name}<span className="mt-1 block font-mono text-[10px] text-muted-foreground">Open research module</span></span>
          <ArrowUpRight className="size-4 shrink-0" />
        </a>)}
      </div>
    </section>
  );
}
