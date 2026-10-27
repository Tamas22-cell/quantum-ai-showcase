import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowUpRight, CheckCircle2, CircleHelp, Cloud, Code2, Database, GitBranch, Search, ShieldCheck, Workflow } from "lucide-react";

export const Route = createFileRoute("/engineering-dashboard")({
  head: () => ({ meta: [
    { title: "Engineering Readiness Dashboard — Quantum AI Lab" },
    { name: "description", content: "Evidence-based AI engineering skills and production-readiness roadmap." },
  ] }),
  component: EngineeringDashboard,
});

type Status = "documented" | "unverified";
type Priority = "P0" | "P1" | "P2";
type Item = {
  name: string;
  category: string;
  status: Status;
  priority: Priority;
  evidence: string;
  next: string;
  link: string;
};

const profile = "https://github.com/Tamas22-cell";
const items: Item[] = [
  { name: "Frontend & deployment", category: "Application", status: "documented", priority: "P1", evidence: "React, TypeScript, TanStack Start and Vercel documented in quantum-ai-showcase; deployment still needs live verification.", next: "Verify a production build and a deployed route.", link: profile + "/quantum-ai-showcase" },
  { name: "Python ML & API", category: "AI", status: "documented", priority: "P1", evidence: "FastAPI, scikit-learn and Qiskit described in machine-learning-quantum-lab README.", next: "Run API integration and model reproducibility tests.", link: profile + "/machine-learning-quantum-lab" },
  { name: "Multi-agent research", category: "AI", status: "documented", priority: "P1", evidence: "Orchestrator and agents source directories in the original financial research repository; v2.3 is a README/presentation repository.", next: "Audit agent execution, failure handling and data-source quality.", link: profile + "/AI-Multi-Agent-Financial-Research-Platform" },
  { name: "GitHub Actions CI/CD", category: "DevOps", status: "unverified", priority: "P0", evidence: "Workflow implementation and successful runs were not verified during this audit.", next: "Add lint, typecheck, tests, build and security checks; require green checks before merge.", link: profile + "/quantum-ai-showcase/actions" },
  { name: "Docker & reproducible runtime", category: "DevOps", status: "unverified", priority: "P0", evidence: "Container build and compose startup were not verified.", next: "Add multi-stage Dockerfiles, Compose and health checks.", link: profile + "/quantum-ai-showcase" },
  { name: "Azure cloud deployment", category: "Cloud", status: "unverified", priority: "P0", evidence: "No Azure deployment or infrastructure evidence verified.", next: "Deploy staging using OIDC, managed secrets and a defined budget.", link: profile + "/quantum-ai-showcase" },
  { name: "Automated backend tests", category: "Quality", status: "unverified", priority: "P0", evidence: "Frontend Vitest script exists; full backend/integration coverage and latest passing run not verified.", next: "Implement pytest, API integration tests and report coverage.", link: profile + "/quantum-ai-showcase" },
  { name: "Langfuse & OpenTelemetry", category: "Observability", status: "unverified", priority: "P1", evidence: "Live traces, LLM cost telemetry and correlation IDs not verified.", next: "Instrument API, agents and tool calls; show real trace links.", link: profile + "/AI-Multi-Agent-Financial-Research-Platform" },
  { name: "MLOps & model lifecycle", category: "AI", status: "unverified", priority: "P1", evidence: "A portfolio MLOps evaluation route exists; MLflow registry and production serving not verified.", next: "Track experiments, datasets and model versions with reproducible evaluations.", link: profile + "/quantum-ai-showcase" },
  { name: "Data pipelines & quality", category: "Data", status: "unverified", priority: "P1", evidence: "Market-data research documented, but scheduled ETL quality gates not verified.", next: "Add ingestion jobs, schemas, retries and data-quality alerts.", link: profile + "/AI-Powered-Global-Market-Intelligence-System" },
  { name: "Kubernetes & Terraform", category: "Cloud", status: "unverified", priority: "P2", evidence: "Cluster workloads and Infrastructure as Code not verified.", next: "Add optional IaC/Kubernetes stage after basic cloud deployment works.", link: profile + "/quantum-ai-showcase" },
  { name: "Security & access controls", category: "Security", status: "unverified", priority: "P1", evidence: "Authentication files exist in showcase, but authorization tests and vulnerability scans not verified.", next: "Audit RBAC, secrets, dependency scans and protected releases.", link: profile + "/quantum-ai-showcase" },
];
const categories = ["All", "Application", "AI", "DevOps", "Cloud", "Quality", "Observability", "Data", "Security"];
const priorityColor: Record<Priority, string> = {
  P0: "bg-rose-500/15 text-rose-300 border-rose-500/30",
  P1: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  P2: "bg-sky-500/15 text-sky-300 border-sky-500/30",
};
const icons = [Code2, Workflow, GitBranch, Cloud, Database, ShieldCheck];

function EngineeringDashboard() {
  const [category, setCategory] = useState("All");
  const [status, setStatus] = useState("All");
  const [search, setSearch] = useState("");
  const [done, setDone] = useState<string[]>([]);
  const visible = useMemo(() => items.filter((item) =>
    (category === "All" || item.category === category) &&
    (status === "All" || item.status === status) &&
    (item.name + " " + item.next + " " + item.category).toLowerCase().includes(search.toLowerCase())
  ), [category, status, search]);
  const documented = items.filter((x) => x.status === "documented").length;
  const unverified = items.length - documented;
  const p0 = items.filter((x) => x.priority === "P0" && x.status === "unverified").length;
  const progress = Math.round(done.length / items.length * 100);
  return (
    <main className="min-h-screen bg-[#080d18] text-slate-100">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-8">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-7">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-cyan-400">Quantum AI Lab / Engineering Intelligence</p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-5xl">Engineering Readiness</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400">AI Engineer / Cloud Engineer gap dashboard. Repository evidence is distinguished from verified production behavior. Updated from GitHub inspection on 27 Oct 2026.</p>
          </div>
          <a href={profile} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-sm font-medium text-cyan-300 hover:bg-cyan-500/20">GitHub profile <ArrowUpRight size={16}/></a>
        </header>

        <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Summary">
          {[
            { label: "Assessment areas", value: items.length, note: "Scoped engineering checks" },
            { label: "Documented", value: documented, note: "Evidence in repository/README" },
            { label: "Not yet verified", value: unverified, note: "Not necessarily absent" },
            { label: "Priority P0", value: p0, note: "Recommended first" },
          ].map((metric, index) => {
            const Icon = icons[index];
            return <div key={metric.label} className="rounded-2xl border border-white/10 bg-white/[0.04] p-5"><Icon size={20} className="text-cyan-400"/><p className="mt-5 text-3xl font-semibold tabular-nums">{metric.value}</p><p className="mt-1 text-sm font-medium">{metric.label}</p><p className="mt-1 text-xs text-slate-500">{metric.note}</p></div>;
          })}
        </section>

        <section className="mt-6 grid gap-5 lg:grid-cols-[1.6fr_1fr]">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-6">
            <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold">Implementation roadmap</h2><span className="text-xs text-slate-400">Local checklist • not synced to GitHub</span></div>
            <div className="mt-5 h-2 overflow-hidden rounded-full bg-slate-800"><div className="h-full rounded-full bg-cyan-400 transition-all" style={{width: progress + "%"}}/></div>
            <div className="mt-2 flex justify-between text-xs text-slate-400"><span>{done.length} tasks marked complete in this session</span><span>{progress}%</span></div>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {[
                ["01 / Foundation", "Tests, Docker, CI", "P0"],
                ["02 / Production", "Azure, tracing, security", "P1"],
                ["03 / Scale", "MLOps, IaC, Kubernetes", "P2"],
              ].map(([phase, label, pr]) => <div key={phase} className="rounded-xl border border-white/10 bg-slate-950/50 p-4"><span className="text-xs text-cyan-400">{phase}</span><p className="mt-2 text-sm font-medium">{label}</p><span className="mt-3 inline-block text-xs text-slate-500">{pr} milestone</span></div>)}
            </div>
          </div>
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.05] p-6">
            <CircleHelp className="text-amber-300"/><h2 className="mt-4 text-lg font-semibold">Evidence rules</h2>
            <ul className="mt-3 space-y-3 text-sm leading-6 text-slate-300">
              <li><strong className="text-emerald-300">Documented:</strong> feature or relevant source exists; does not imply tests passed.</li>
              <li><strong className="text-amber-300">Unverified:</strong> needs code or live-environment checks; never treated as a proven absence.</li>
              <li><strong className="text-slate-100">No invented metrics:</strong> cloud cost, CI results, latency and uptime are omitted until connected.</li>
            </ul>
          </div>
        </section>

        <section className="mt-8">
          <div className="flex flex-wrap items-end justify-between gap-4"><div><h2 className="text-2xl font-semibold">Engineering backlog</h2><p className="mt-1 text-sm text-slate-400">Prioritized actions with traceable GitHub sources.</p></div><span className="text-sm text-slate-400">{visible.length} / {items.length} displayed</span></div>
          <div className="mt-5 grid gap-3 md:grid-cols-[1fr_auto_auto]">
            <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-4"><Search size={17} className="text-slate-400"/><input aria-label="Search engineering tasks" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tasks..." className="min-w-0 flex-1 bg-transparent py-3 text-sm outline-none placeholder:text-slate-500"/></label>
            <select aria-label="Category" value={category} onChange={e => setCategory(e.target.value)} className="rounded-xl border border-white/10 bg-[#151e2e] px-4 py-3 text-sm">{categories.map(x => <option key={x} value={x}>{x}</option>)}</select>
            <select aria-label="Evidence status" value={status} onChange={e => setStatus(e.target.value)} className="rounded-xl border border-white/10 bg-[#151e2e] px-4 py-3 text-sm"><option value="All">All evidence</option><option value="documented">Documented</option><option value="unverified">Unverified</option></select>
          </div>
          <div className="mt-4 grid gap-3">
            {visible.map(item => <article key={item.name} className="rounded-xl border border-white/10 bg-white/[0.035] p-5 transition-colors hover:border-cyan-500/30">
              <div className="flex flex-wrap items-start gap-3">
                <input aria-label={"Mark task reviewed: " + item.name} type="checkbox" checked={done.includes(item.name)} onChange={e => setDone(old => e.target.checked ? [...old, item.name] : old.filter(x => x !== item.name))} className="mt-1 h-4 w-4 accent-cyan-400"/>
                <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{item.name}</h3><span className={"rounded-full border px-2 py-0.5 text-[10px] font-semibold " + priorityColor[item.priority]}>{item.priority}</span><span className="rounded-full border border-white/15 px-2 py-0.5 text-[10px] text-slate-400">{item.category}</span><span className={"inline-flex items-center gap-1 text-xs " + (item.status === "documented" ? "text-emerald-300" : "text-amber-300")}>{item.status === "documented" ? <CheckCircle2 size={13}/> : <CircleHelp size={13}/>} {item.status === "documented" ? "Documented" : "Unverified"}</span></div>
                  <p className="mt-3 text-sm leading-6 text-slate-400">{item.evidence}</p><p className="mt-2 text-sm leading-6"><strong className="text-cyan-300">Next:</strong> {item.next}</p>
                </div>
                <a href={item.link} target="_blank" rel="noopener noreferrer" aria-label={"GitHub evidence for " + item.name} className="rounded-lg border border-white/10 p-2 text-slate-300 hover:bg-white/10"><ArrowUpRight size={17}/></a>
              </div>
            </article>)}
            {visible.length === 0 && <p className="rounded-xl border border-white/10 p-10 text-center text-slate-400">No matching items. Change your filters.</p>}
          </div>
        </section>
        <footer className="mt-10 border-t border-white/10 py-6 text-xs text-slate-500">Engineering Readiness • Source: connected GitHub repositories • No live Azure/GitHub Actions metrics connected • Checklist resets on reload</footer>
      </div>
    </main>
  );
}
