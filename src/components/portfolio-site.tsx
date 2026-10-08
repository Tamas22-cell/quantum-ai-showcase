import { Fragment, useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Atom,
  Blocks,
  Braces,
  BrainCircuit,
  Check,
  CircleDashed,
  Code2,
  Cpu,
  Database,
  FileText,
  Github,
  LineChart,
  Linkedin,
  Menu,
  Network,
  Orbit,
  ScanSearch,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { portfolio } from "@/data/portfolio";
import { QuantumLab } from "@/components/quantum-lab";
import { QuantumField } from "@/components/quantum-field";
import { AIResearchAssistant } from "@/components/ai-research-assistant";
import { LiveResearchMarquee } from "@/components/live-research-marquee";
import { QuantumProjectsShowcase } from "@/components/quantum-projects-showcase";
import { AIProjectsShowcase } from "@/components/ai-projects-showcase";
import { AiAgentExecutionMonitor } from "@/components/ai-agent-execution-monitor";

const projectIcons = [ShieldCheck, Network, Orbit];
const researchIcons = [Orbit, Atom, Braces, Cpu];
const disciplineIcons = [BrainCircuit, Code2, Blocks, LineChart, Atom];

/** Agentic pipeline shown in the AI Multi-Agent Research System section. */
const pipelineSteps = [
  { label: "Research Question", icon: Search, endpoint: true },
  { label: "Planner Agent", icon: BrainCircuit, endpoint: false },
  { label: "Data Agent", icon: Database, endpoint: false },
  { label: "Market Agent", icon: LineChart, endpoint: false },
  { label: "Risk Agent", icon: ShieldCheck, endpoint: false },
  { label: "Critic Agent", icon: ScanSearch, endpoint: false },
  { label: "Final Synthesis", icon: FileText, endpoint: true },
];

const agentCapabilities = [
  "Python",
  "Multi-agent AI",
  "Market Analysis",
  "News / Sentiment",
  "Risk Analysis",
  "LLM orchestration",
];

const agentDetails: Record<string, { title: string; description: string; output: string }> = {
  "Research Question": {
    title: "Research Question",
    description: "Defines the financial or market research problem that starts the workflow.",
    output: "Output · structured research objective",
  },
  "Planner Agent": {
    title: "Planner Agent",
    description:
      "Breaks the research question into ordered tasks and assigns work to the specialist agents.",
    output: "Output · research plan + task sequence",
  },
  "Data Agent": {
    title: "Data Agent",
    description: "Collects and prepares the quantitative data required by the research plan.",
    output: "Output · structured datasets + key metrics",
  },
  "Market Agent": {
    title: "Market Agent",
    description: "Analyses market conditions, price behaviour, news and sentiment signals.",
    output: "Output · market analysis + signal context",
  },
  "Risk Agent": {
    title: "Risk Agent",
    description:
      "Stress-tests the findings, evaluates downside scenarios and identifies material risks.",
    output: "Output · risk assessment + stress scenarios",
  },
  "Critic Agent": {
    title: "Critic Agent",
    description:
      "Challenges assumptions, checks inconsistencies and critiques the other agents before synthesis.",
    output: "Output · critique + validation notes",
  },
  "Final Synthesis": {
    title: "Final Synthesis",
    description: "Combines the validated agent outputs into one concise research conclusion.",
    output: "Output · final research synthesis",
  },
};

/**
 * Honest capability map: each discipline links only to items already present
 * on this page (project titles / research codes). No proficiency scores.
 */
const disciplineLinks: Record<string, string[]> = {
  "AI agents": ["AgentTrust", "AI Financial Research Platform", "AI Multi-Agent Research System"],
  Python: ["AI Financial Research Platform", "Qiskit workflows"],
  Blockchain: ["AgentTrust", "Blockchain Research Lab"],
  "Quantitative finance": ["AI Financial Research Platform", "Quantum Portfolio Lab"],
  "Quantum computing": ["QAOA", "VQE", "Hybrid algorithms"],
};

const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

function PlaceholderLink({
  label,
  icon,
  compact = false,
}: {
  label: string;
  icon?: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <span
      aria-label={`${label}. Link pending verification.`}
      title="URL pending verification"
      className={`inline-flex cursor-not-allowed items-center gap-2 rounded-sm border border-dashed border-border-strong bg-surface px-3 font-mono text-muted-foreground ${compact ? "h-8 text-[10px] uppercase" : "h-11 text-xs"}`}
    >
      <CircleDashed className="size-3" aria-hidden="true" />
      {icon}
      {label}
    </span>
  );
}

function SectionHeading({ index, title, copy }: { index: string; title: string; copy?: string }) {
  return (
    <div className="mb-12 grid gap-4 border-b border-border pb-8 md:grid-cols-[minmax(0,1fr)_minmax(18rem,0.8fr)] md:items-end">
      <div className="min-w-0">
        <span className="inline-flex items-center gap-2 font-mono text-xs text-primary">
          <span className="h-px w-6 bg-primary" aria-hidden="true" />
          {index}
        </span>
        <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
          {title}
        </h2>
      </div>
      {copy ? (
        <p className="max-w-xl text-sm leading-7 text-muted-foreground md:justify-self-end">
          {copy}
        </p>
      ) : null}
    </div>
  );
}

/** Tracks which section is in view to highlight the nav item. */
function useActiveSection(ids: string[]) {
  const [active, setActive] = useState<string>("");
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        const hit = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (hit) setActive(hit.target.id);
      },
      { rootMargin: "-40% 0px -50% 0px", threshold: [0, 0.25, 0.5] },
    );
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    });
    return () => io.disconnect();
  }, [ids]);
  return active;
}

const sectionIds = portfolio.navigation
  .filter((n) => n.href.startsWith("#"))
  .map((n) => n.href.slice(1));

export function PortfolioSite() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [researchPulse, setResearchPulse] = useState(false);
  const [activeAgent, setActiveAgent] = useState("Planner Agent");
  const [demoQuestion, setDemoQuestion] = useState(
    "What are the main risks of investing in Bitcoin?",
  );
  const [demoResult, setDemoResult] = useState(false);
  const [btcQuote, setBtcQuote] = useState<{
    usd: number;
    change24h: number | null;
    fetchedAt: string;
  } | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState("");
  const runDemo = async () => {
    setDemoResult(false);
    setBtcQuote(null);
    setQuoteError("");
    setQuoteLoading(true);
    try {
      const response = await fetch(
        "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd&include_24hr_change=true",
        { headers: { accept: "application/json" } },
      );
      if (!response.ok) throw new Error("Price provider unavailable");
      const json: unknown = await response.json();
      if (!json || typeof json !== "object" || !("bitcoin" in json))
        throw new Error("Invalid response");
      const btc = (json as { bitcoin?: { usd?: unknown; usd_24h_change?: unknown } }).bitcoin;
      if (!btc || typeof btc.usd !== "number" || !Number.isFinite(btc.usd) || btc.usd <= 0)
        throw new Error("Invalid BTC price");
      setBtcQuote({
        usd: btc.usd,
        change24h:
          typeof btc.usd_24h_change === "number" && Number.isFinite(btc.usd_24h_change)
            ? btc.usd_24h_change
            : null,
        fetchedAt: new Date().toLocaleString(),
      });
    } catch {
      setQuoteError(
        "Live BTC data could not be retrieved. Please retry later; no price has been estimated.",
      );
    } finally {
      setQuoteLoading(false);
      setDemoResult(true);
    }
  };
  const active = useActiveSection(sectionIds);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Escape closes the mobile menu.
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  const linkedin = portfolio.social.find((link) => link.label === "LinkedIn")?.href ?? "#";
  const github = portfolio.social.find((link) => link.label === "GitHub")?.href ?? "#";

  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-foreground">
      <a
        href="#main"
        className="fixed left-4 top-4 z-[60] -translate-y-24 rounded-sm bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground focus:translate-y-0"
      >
        Skip to content
      </a>

      <header
        className={`fixed inset-x-0 top-0 z-50 border-b transition-colors duration-300 ${scrolled || menuOpen ? "border-border/80 bg-background/85 backdrop-blur-xl" : "border-transparent bg-transparent"}`}
      >
        <div className="mx-auto grid h-16 max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-5 sm:px-8">
          <a
            href="#top"
            className={`flex min-w-0 items-center gap-3 rounded-sm ${focusRing}`}
            aria-label="Quantum AI Lab home"
          >
            <span className="grid size-8 shrink-0 place-items-center rounded-sm border border-primary/50 bg-signal-soft text-primary">
              <Atom className="size-4" aria-hidden="true" />
            </span>
            <span className="truncate font-mono text-xs font-medium uppercase tracking-wider text-foreground sm:text-sm">
              Quantum AI Lab
            </span>
          </a>
          <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary navigation">
            {portfolio.navigation.map((item) => {
              const isActive = item.href.startsWith("#") && active === item.href.slice(1);
              return (
                <a
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? "true" : undefined}
                  className={`relative rounded-sm px-3 py-2 font-mono text-[11px] uppercase tracking-wider transition-colors hover:text-primary ${focusRing} ${isActive ? "text-primary" : "text-muted-foreground"}`}
                >
                  {item.label}
                  <span
                    className={`absolute inset-x-3 -bottom-px h-px bg-primary transition-transform duration-300 ${isActive ? "scale-x-100" : "scale-x-0"}`}
                    aria-hidden="true"
                  />
                </a>
              );
            })}
          </nav>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-controls="mobile-navigation"
            aria-label={menuOpen ? "Close navigation" : "Open navigation"}
          >
            {menuOpen ? <X /> : <Menu />}
          </Button>
        </div>
        {menuOpen ? (
          <nav
            id="mobile-navigation"
            className="animate-fade-in border-t border-border bg-surface/95 px-5 py-4 backdrop-blur-xl lg:hidden"
            aria-label="Mobile navigation"
          >
            <div className="mx-auto grid max-w-7xl gap-1 sm:grid-cols-2 sm:gap-x-6">
              {portfolio.navigation.map((item, i) => (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className={`flex items-center gap-3 rounded-sm border-b border-border/60 py-3.5 font-mono text-xs uppercase tracking-wider text-muted-foreground hover:text-primary ${focusRing}`}
                >
                  <span className="text-primary/70">0{i + 1}</span>
                  {item.label}
                </a>
              ))}
            </div>
          </nav>
        ) : null}
      </header>

      <AIResearchAssistant />

      <main id="main">
        {/* HERO */}
        <section
          id="top"
          className="lab-grid relative isolate flex items-center overflow-hidden border-b border-border px-5 pb-16 pt-28 sm:px-8 lg:pb-20 lg:pt-32"
        >
          <QuantumField className="absolute inset-0 -z-10 h-full w-full opacity-80" />
          <div
            className="hero-glow absolute -right-40 top-1/4 -z-10 size-[36rem] rounded-full"
            aria-hidden="true"
          />
          <div
            className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,var(--color-background)_0%,color-mix(in_oklab,var(--color-background)_55%,transparent)_55%,transparent_100%)]"
            aria-hidden="true"
          />
          <div
            className="absolute inset-x-0 bottom-0 -z-10 h-40 bg-gradient-to-t from-background to-transparent"
            aria-hidden="true"
          />
          <div className="relative mx-auto w-full max-w-7xl">
            <div className="reveal-up mb-10 inline-flex items-center gap-3 rounded-full border border-primary/30 bg-signal-soft px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-primary">
              <span className="signal-pulse size-1.5 rounded-full bg-primary" />
              Independent research portfolio
            </div>
            <div className="reveal-up max-w-5xl [animation-delay:100ms]">
              <p className="mb-5 font-mono text-sm text-muted-foreground">
                {portfolio.name} / Researcher
              </p>
              <h1 className="text-5xl font-semibold leading-[1.02] tracking-tight text-foreground sm:text-7xl lg:text-8xl">
                AI & Quantum
                <span className="text-gradient-signal block">Computing Researcher</span>
              </h1>
              <p className="mt-7 font-mono text-xs font-semibold uppercase tracking-[0.16em] text-primary sm:text-sm">
                AI Development <span className="text-muted-foreground">/</span> Quantum Computing{" "}
                <span className="text-muted-foreground">/</span> Blockchain &amp; Web3
              </p>
              <p className="mt-5 max-w-3xl text-base leading-8 text-foreground/90 sm:text-lg">
                I design and develop intelligent AI applications, collaborative multi-agent research
                systems, and quantum computing solutions—connecting financial intelligence, advanced
                automation, and blockchain innovation through hands-on engineering and research.
              </p>
              <div className="mt-10 flex flex-wrap gap-3">
                <Button asChild variant="signal" size="lg">
                  <a href="#projects">
                    Explore research <ArrowDown aria-hidden="true" />
                  </a>
                </Button>
                <Button asChild variant="signalOutline" size="lg">
                  <a href="#quantum-lab">
                    Try the Quantum Lab <Atom aria-hidden="true" />
                  </a>
                </Button>
                <Button asChild variant="ghost" size="lg">
                  <a href="#contact">
                    Connect <ArrowUpRight aria-hidden="true" />
                  </a>
                </Button>
              </div>
            </div>
            <div className="reveal-up mt-16 grid max-w-4xl grid-cols-2 overflow-hidden rounded-md border border-border bg-background/60 backdrop-blur-sm sm:grid-cols-3 lg:grid-cols-5 [animation-delay:200ms]">
              {portfolio.disciplines.map((item, index) => {
                const cell = (
                  <>
                    <span className="font-mono text-[10px] text-primary">0{index + 1}</span>
                    <p className="mt-2 text-xs text-foreground/80">{item}</p>
                  </>
                );
                if (item === "AI agents") {
                  return (
                    <a
                      key={item}
                      href="#ai-agents"
                      aria-label="AI agents — jump to the AI Multi-Agent Research System section"
                      className={`group min-w-0 border-b border-r border-border px-4 py-4 transition-colors last:border-r-0 hover:bg-signal-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ${focusRing}`}
                    >
                      {cell}
                    </a>
                  );
                }
                return (
                  <div
                    key={item}
                    className="min-w-0 border-b border-r border-border px-4 py-4 last:border-r-0"
                  >
                    {cell}
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <LiveResearchMarquee />

        {/* RESEARCH HIGHLIGHTS */}
        <section className="border-b border-border px-5 py-10 sm:px-8 lg:py-12">
          <div className="mx-auto max-w-7xl">
            <div className="mb-5 flex items-end justify-between gap-4">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-primary">
                  Research highlights
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                  Three active research directions
                </h2>
              </div>
              <span className="hidden font-mono text-[10px] uppercase tracking-wider text-muted-foreground sm:block">
                AI · Finance · Quantum
              </span>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <a
                href="#ai-agents"
                className={`group rounded-xl border border-border bg-surface/80 p-5 transition-all hover:-translate-y-1 hover:border-primary/50 hover:bg-signal-soft ${focusRing}`}
                aria-label="Open Autonomous AI Systems research"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] text-primary">01</span>
                  <div className="flex items-center gap-2 text-primary">
                    <BrainCircuit className="size-5" aria-hidden="true" />
                    <ArrowUpRight
                      className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                      aria-hidden="true"
                    />
                  </div>
                </div>
                <h3 className="mt-8 text-lg font-semibold text-foreground">
                  Autonomous AI Systems
                </h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Multi-agent coordination, financial research workflows and verifiable decision
                  support.
                </p>
                <p className="mt-5 font-mono text-[10px] uppercase tracking-wider text-primary">
                  Open AI research →
                </p>
              </a>

              <Link
                to="/lab/finance"
                className={`group rounded-xl border border-border bg-surface/80 p-5 transition-all hover:-translate-y-1 hover:border-primary/50 hover:bg-signal-soft ${focusRing}`}
                aria-label="Open Quantum Finance Lab"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] text-primary">02</span>
                  <div className="flex items-center gap-2 text-primary">
                    <LineChart className="size-5" aria-hidden="true" />
                    <ArrowUpRight
                      className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                      aria-hidden="true"
                    />
                  </div>
                </div>
                <h3 className="mt-8 text-lg font-semibold text-foreground">Quantum Finance</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Portfolio optimization, stress testing and hybrid classical-quantum financial
                  experiments.
                </p>
                <p className="mt-5 font-mono text-[10px] uppercase tracking-wider text-primary">
                  Open finance lab →
                </p>
              </Link>

              <Link
                to="/lab"
                className={`group rounded-xl border border-border bg-surface/80 p-5 transition-all hover:-translate-y-1 hover:border-primary/50 hover:bg-signal-soft ${focusRing}`}
                aria-label="Open Quantum Algorithms Lab"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] text-primary">03</span>
                  <div className="flex items-center gap-2 text-primary">
                    <Atom className="size-5" aria-hidden="true" />
                    <ArrowUpRight
                      className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                      aria-hidden="true"
                    />
                  </div>
                </div>
                <h3 className="mt-8 text-lg font-semibold text-foreground">Quantum Algorithms</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  QAOA, VQE and QML research focused on practical hybrid system design.
                </p>
                <p className="mt-5 font-mono text-[10px] uppercase tracking-wider text-primary">
                  Open quantum lab →
                </p>
              </Link>
            </div>
          </div>
        </section>

        {/* FEATURED INTERACTIVE PROJECT */}
        <section className="border-b border-border px-5 py-10 sm:px-8 lg:py-14">
          <div className="mx-auto max-w-7xl">
            <div className="relative overflow-hidden rounded-xl border border-primary/25 bg-[linear-gradient(135deg,color-mix(in_oklab,var(--color-primary)_10%,var(--color-background)),var(--color-surface))] p-6 shadow-[0_0_80px_color-mix(in_oklab,var(--color-primary)_8%,transparent)] sm:p-8 lg:p-10">
              <div
                className="absolute -right-20 -top-20 size-64 rounded-full border border-primary/15"
                aria-hidden="true"
              />
              <div
                className="absolute -right-8 -top-8 size-40 rounded-full border border-primary/20"
                aria-hidden="true"
              />
              <div className="grid items-center gap-8 lg:grid-cols-[1.05fr_0.95fr]">
                <div className="relative z-10">
                  <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-signal-soft px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-primary">
                    <span className="signal-pulse size-1.5 rounded-full bg-primary" />
                    New interactive project
                  </div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                    AI × Quantum Systems / Project 2026
                  </p>
                  <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
                    Quantum AI <span className="text-gradient-signal">Research Navigator</span>
                  </h2>
                  <p className="mt-5 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
                    An interactive research concept that connects agentic AI, quantum optimization,
                    QML and hybrid decision systems into one visual research pulse.
                  </p>
                  <div className="mt-6 flex flex-wrap gap-2">
                    {["AI Agents", "QAOA", "QML", "Hybrid Systems"].map((item) => (
                      <span
                        key={item}
                        className="rounded-full border border-border bg-background/55 px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-foreground/80"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                  <div className="mt-7 flex flex-wrap gap-3">
                    <Button
                      type="button"
                      variant="signal"
                      size="lg"
                      onClick={() => setResearchPulse(true)}
                    >
                      Run research pulse <Orbit aria-hidden="true" />
                    </Button>
                    <Button asChild variant="signalOutline" size="lg">
                      <a href="#quantum-lab">
                        Open Quantum Lab <ArrowRight aria-hidden="true" />
                      </a>
                    </Button>
                  </div>
                  <p className="mt-4 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                    Local interactive simulation · research visualization · no quantum advantage
                    claim
                  </p>
                </div>

                <div className="relative min-h-[300px] rounded-lg border border-border bg-background/45 p-5 backdrop-blur-sm">
                  <div className="absolute inset-0 overflow-hidden rounded-lg" aria-hidden="true">
                    <div className="absolute left-1/2 top-1/2 size-48 -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/20" />
                    <div className="absolute left-1/2 top-1/2 size-32 -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/30" />
                    <div className="absolute left-1/2 top-1/2 size-16 -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/45 bg-signal-soft shadow-[0_0_45px_color-mix(in_oklab,var(--color-primary)_25%,transparent)]" />
                  </div>
                  <div className="relative z-10 flex h-full min-h-[260px] flex-col justify-between">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-mono text-[10px] uppercase tracking-wider text-primary">
                          Research field
                        </p>
                        <p className="mt-1 text-sm text-foreground">Hybrid intelligence topology</p>
                      </div>
                      <Atom
                        className={"size-7 text-primary " + (researchPulse ? "animate-spin" : "")}
                        aria-hidden="true"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      {[
                        ["Agent coordination", researchPulse ? "84%" : "—"],
                        ["Quantum optimization", researchPulse ? "72%" : "—"],
                        ["QML signal", researchPulse ? "79%" : "—"],
                        ["Hybrid confidence", researchPulse ? "81%" : "—"],
                      ].map(([label, value]) => (
                        <div
                          key={label}
                          className="rounded-md border border-border bg-surface/80 p-3"
                        >
                          <p className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                            {label}
                          </p>
                          <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-between gap-3 border-t border-border pt-4 font-mono text-[10px] uppercase tracking-wider">
                      <span className={researchPulse ? "text-primary" : "text-muted-foreground"}>
                        {researchPulse ? "Pulse complete" : "Awaiting pulse"}
                      </span>
                      <span className="text-muted-foreground">Simulation / v1.0</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ABOUT + capability map */}
        <section id="about" className="border-b border-border px-5 py-24 sm:px-8 lg:py-32">
          <div className="mx-auto max-w-7xl">
            <SectionHeading
              index="01"
              title="About"
              copy="Cross-disciplinary research spanning intelligent systems, financial computation, and emerging quantum methods."
            />
            <div className="grid gap-10 lg:grid-cols-[0.7fr_1.3fr]">
              <div className="font-mono text-xs leading-6 text-primary">
                RESEARCH PROFILE
                <br />
                BUDAPEST, HUNGARY
              </div>
              <div className="max-w-3xl space-y-6 text-xl leading-9 text-foreground sm:text-2xl sm:leading-10">
                {portfolio.about.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </div>

            <div className="mt-20">
              <div className="mb-6 flex items-center justify-between gap-4">
                <h3 className="font-mono text-xs uppercase tracking-wider text-primary">
                  Capability map
                </h3>
                <span className="hidden font-mono text-[10px] uppercase text-muted-foreground sm:block">
                  Disciplines → where they appear on this page
                </span>
              </div>
              <div className="relative grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                <div
                  className="signal-line absolute inset-x-8 top-10 hidden h-px opacity-40 lg:block"
                  aria-hidden="true"
                />
                {portfolio.disciplines.map((item, i) => {
                  const Icon = disciplineIcons[i] ?? Cpu;
                  const card = (
                    <>
                      <span className="relative grid size-10 place-items-center rounded-full border border-primary/40 bg-background text-primary transition-shadow group-hover:shadow-[var(--shadow-signal)]">
                        <Icon className="size-4" aria-hidden="true" />
                      </span>
                      <p className="mt-5 font-medium">{item}</p>
                      <ul className="mt-3 space-y-1.5">
                        {(disciplineLinks[item] ?? []).map((l) => (
                          <li
                            key={l}
                            className="flex items-center gap-2 font-mono text-[10px] uppercase text-muted-foreground"
                          >
                            <span
                              className="size-1 rounded-full bg-primary/70"
                              aria-hidden="true"
                            />
                            {l}
                          </li>
                        ))}
                      </ul>
                      {item === "AI agents" && (
                        <span className="mt-4 inline-flex items-center gap-1 font-mono text-[10px] uppercase text-primary">
                          Open AI Multi-Agent Research System{" "}
                          <ArrowRight className="size-3" aria-hidden="true" />
                        </span>
                      )}
                      {item === "Python" && (
                        <span className="mt-4 inline-flex items-center gap-1 font-mono text-[10px] uppercase text-primary">
                          Open Python Research Lab{" "}
                          <ArrowRight className="size-3" aria-hidden="true" />
                        </span>
                      )}
                      {item === "Blockchain" && (
                        <span className="mt-4 inline-flex items-center gap-1 font-mono text-[10px] uppercase text-primary">
                          Open Blockchain Research Lab{" "}
                          <ArrowRight className="size-3" aria-hidden="true" />
                        </span>
                      )}
                      {item === "Quantitative finance" && (
                        <span className="mt-4 inline-flex items-center gap-1 font-mono text-[10px] uppercase text-primary">
                          Open Quantum Finance Lab{" "}
                          <ArrowRight className="size-3" aria-hidden="true" />
                        </span>
                      )}
                      {item === "Quantum computing" && (
                        <span className="mt-4 inline-flex items-center gap-1 font-mono text-[10px] uppercase text-primary">
                          Open Quantum Research Lab{" "}
                          <ArrowRight className="size-3" aria-hidden="true" />
                        </span>
                      )}
                    </>
                  );
                  const cardClass =
                    "card-interactive group relative rounded-md border border-border bg-card p-5";
                  if (item === "AI agents") {
                    return (
                      <a
                        key={item}
                        href="#ai-agents"
                        aria-label="AI agents — open the AI Multi-Agent Research System"
                        className={`${cardClass} block ${focusRing}`}
                      >
                        {card}
                      </a>
                    );
                  }
                  if (item === "Python") {
                    return (
                      <Link
                        key={item}
                        to="/lab/python"
                        aria-label="Python — open the Python Research Lab"
                        className={`${cardClass} block ${focusRing}`}
                      >
                        {card}
                      </Link>
                    );
                  }
                  if (item === "Blockchain") {
                    return (
                      <Link
                        key={item}
                        to="/lab/blockchain"
                        aria-label="Blockchain — open the Blockchain Research Lab"
                        className={`${cardClass} block ${focusRing}`}
                      >
                        {card}
                      </Link>
                    );
                  }
                  if (item === "Quantitative finance") {
                    return (
                      <Link
                        key={item}
                        to="/lab/finance"
                        aria-label="Quantitative finance — open the Live Quantum Finance Lab"
                        className={`${cardClass} block ${focusRing}`}
                      >
                        {card}
                      </Link>
                    );
                  }
                  if (item === "Quantum computing") {
                    return (
                      <Link
                        key={item}
                        to="/lab"
                        aria-label="Quantum computing — open the Quantum Research Lab"
                        className={`${cardClass} block ${focusRing}`}
                      >
                        {card}
                      </Link>
                    );
                  }
                  return (
                    <div key={item} className={cardClass}>
                      {card}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <QuantumProjectsShowcase />
        <AIProjectsShowcase />

        {/* PROJECTS */}
        <section id="projects" className="bg-surface px-5 py-24 sm:px-8 lg:py-32">
          <div className="mx-auto max-w-7xl">
            <SectionHeading
              index="02"
              title="Selected projects"
              copy="Live deployed research projects and production-ready portfolio showcases."
            />
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {portfolio.projects.map((project, index) => {
                const Icon = projectIcons[index] ?? Cpu;
                return (
                  <article
                    key={project.title}
                    tabIndex={0}
                    className={`card-interactive group relative flex min-h-[26rem] flex-col overflow-hidden rounded-md border border-border bg-card p-6 sm:p-8 ${focusRing}`}
                  >
                    <div
                      className="signal-line absolute inset-x-0 top-0 h-px scale-x-0 transition-transform duration-500 group-hover:scale-x-100 group-focus-visible:scale-x-100"
                      aria-hidden="true"
                    />
                    <div className="flex items-start justify-between">
                      <span className="font-mono text-xs text-muted-foreground">
                        PRJ / {project.index}
                      </span>
                      <span className="grid size-11 place-items-center rounded-sm border border-border text-primary transition-colors group-hover:border-primary/60 group-hover:bg-signal-soft">
                        <Icon className="size-5" aria-hidden="true" />
                      </span>
                    </div>
                    <span className="mt-12 inline-flex w-fit items-center gap-1.5 rounded-full border border-border px-2 py-0.5 font-mono text-[9px] uppercase text-muted-foreground">
                      <span
                        className="size-1 rounded-full bg-muted-foreground"
                        aria-hidden="true"
                      />{" "}
                      Live · deployed
                    </span>
                    <h3 className="mt-4 text-2xl font-semibold tracking-tight">{project.title}</h3>
                    <p className="mt-4 text-sm leading-7 text-muted-foreground">
                      {project.description}
                    </p>
                    <div className="mt-auto pt-8">
                      <div className="mb-5 flex flex-wrap gap-2">
                        {project.tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-sm border border-border bg-surface px-2 py-1 font-mono text-[9px] uppercase text-muted-foreground"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                      {project.link.placeholder ? (
                        <PlaceholderLink label={project.link.label} compact />
                      ) : (
                        <a
                          href={project.link.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`inline-flex h-8 w-fit items-center gap-2 rounded-sm border border-primary/40 bg-signal-soft px-3 font-mono text-[10px] uppercase text-primary transition-colors hover:border-primary hover:bg-primary hover:text-primary-foreground ${focusRing}`}
                        >
                          <ArrowUpRight className="size-3" aria-hidden="true" />
                          {project.link.label}
                        </a>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* AI MULTI-AGENT RESEARCH SYSTEM */}
        <section id="ai-agents" className="border-b border-border px-5 py-24 sm:px-8 lg:py-32">
          <div className="mx-auto max-w-7xl">
            <SectionHeading
              index="AI"
              title="AI Multi-Agent Research System"
              copy="A deployed multi-agent financial research system: specialised agents plan the work, gather and analyse market and news data, stress-test risk, and critique each other before a final synthesis is produced."
            />
            <div className="card-interactive group relative overflow-hidden rounded-md border border-border bg-card p-6 sm:p-10">
              <div className="signal-line absolute inset-x-0 top-0 h-px" aria-hidden="true" />
              <p className="font-mono text-[10px] uppercase tracking-wider text-primary">
                Deployed system · agentic workflow
              </p>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">
                Given a research question, the Planner decomposes it into tasks. The Data and Market
                agents collect and analyse market and news/sentiment data, the Risk agent
                stress-tests the findings, and the Critic challenges them before the Final Synthesis
                is written.
              </p>

              {/* Workflow pipeline: horizontal on desktop, stacked on mobile */}
              <div
                className="mt-10 flex flex-col items-stretch gap-1.5 md:flex-row md:items-center"
                role="img"
                aria-label="Workflow: Research Question flows through Planner, Data, Market, Risk and Critic agents to a Final Synthesis"
              >
                {pipelineSteps.map((step, i) => {
                  const Icon = step.icon;
                  return (
                    <Fragment key={step.label}>
                      <button
                        type="button"
                        onClick={() => setActiveAgent(step.label)}
                        aria-pressed={activeAgent === step.label}
                        className={`flex min-w-0 flex-1 items-center gap-3 rounded-md border px-4 py-3 text-left transition-all hover:-translate-y-0.5 hover:border-primary/60 hover:bg-signal-soft md:flex-col md:items-center md:gap-2 md:px-2 md:py-4 md:text-center ${focusRing} ${
                          activeAgent === step.label || step.endpoint
                            ? "border-primary/40 bg-signal-soft"
                            : "border-border bg-background"
                        }`}
                      >
                        <span
                          className={`grid size-9 shrink-0 place-items-center rounded-sm border ${step.endpoint ? "border-primary/50 text-primary" : "border-border text-primary/80"}`}
                        >
                          <Icon className="size-4" aria-hidden="true" />
                        </span>
                        <p
                          className={`min-w-0 font-mono text-[11px] uppercase tracking-wider md:text-[10px] ${step.endpoint ? "text-primary" : "text-foreground/85"}`}
                        >
                          {step.label}
                        </p>
                      </button>
                      {i < pipelineSteps.length - 1 ? (
                        <ArrowRight
                          aria-hidden="true"
                          className="mx-auto size-4 shrink-0 rotate-90 text-primary/60 md:rotate-0"
                        />
                      ) : null}
                    </Fragment>
                  );
                })}
              </div>

              <div
                className="mt-6 rounded-md border border-primary/30 bg-signal-soft p-5"
                aria-live="polite"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="font-mono text-[10px] uppercase tracking-wider text-primary">
                    Active workflow node
                  </p>
                  <span className="rounded-full border border-primary/30 px-2.5 py-1 font-mono text-[9px] uppercase text-primary">
                    Interactive
                  </span>
                </div>
                <h3 className="mt-3 text-xl font-semibold text-foreground">
                  {agentDetails[activeAgent]!.title}
                </h3>
                <p className="mt-2 max-w-3xl text-sm leading-7 text-muted-foreground">
                  {agentDetails[activeAgent]!.description}
                </p>
                <p className="mt-4 font-mono text-[10px] uppercase tracking-wider text-primary">
                  {agentDetails[activeAgent]!.output}
                </p>
              </div>

              {/* Local, clearly labelled educational demo; no live AI/API calls. */}
              <div className="mt-8 rounded-lg border border-primary/40 bg-background/70 p-5 sm:p-7">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-xl font-semibold text-foreground">Launch Interactive Demo</h3>
                  <span className="rounded-full border border-primary/40 px-3 py-1 font-mono text-[10px] uppercase text-primary">
                    Live BTC data + guided workflow
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Enter a research question and explore how a multi-agent workflow could organize
                  its analysis. Bitcoin price and 24-hour change are fetched from CoinGecko when
                  available. Agent steps remain illustrative, not live AI reasoning or investment
                  advice.
                </p>
                <label
                  htmlFor="agent-demo-question"
                  className="mt-5 block font-mono text-xs text-primary"
                >
                  Your research question
                </label>
                <textarea
                  id="agent-demo-question"
                  rows={3}
                  maxLength={500}
                  value={demoQuestion}
                  onChange={(event) => {
                    setDemoQuestion(event.target.value);
                    setDemoResult(false);
                  }}
                  placeholder="e.g. What are the risks of investing in Bitcoin?"
                  className={`mt-2 w-full resize-y rounded-md border border-border bg-card p-3 text-sm text-foreground placeholder:text-muted-foreground ${focusRing}`}
                />
                <Button
                  type="button"
                  variant="signal"
                  className="mt-3"
                  disabled={quoteLoading || !demoQuestion.trim()}
                  onClick={runDemo}
                >
                  Run research demo <ArrowRight className="size-4" aria-hidden="true" />
                </Button>
                <AiAgentExecutionMonitor
                  running={quoteLoading}
                  completed={demoResult}
                  error={quoteError}
                  fetchedAt={btcQuote?.fetchedAt ?? null}
                />
                {quoteLoading ? (
                  <p className="mt-4 text-sm text-primary" role="status">
                    Fetching live Bitcoin market data…
                  </p>
                ) : null}
                {demoResult ? (
                  <div className="mt-6 space-y-3" aria-live="polite">
                    <p className="text-sm font-semibold text-foreground">
                      Research question: {demoQuestion}
                    </p>
                    {btcQuote ? (
                      <div className="rounded-md border border-primary/40 bg-signal-soft p-4">
                        <p className="font-mono text-[10px] uppercase text-primary">
                          Live Bitcoin market snapshot · CoinGecko
                        </p>
                        <p className="mt-2 text-2xl font-semibold text-foreground">
                          {btcQuote.usd.toLocaleString("en-US", {
                            style: "currency",
                            currency: "USD",
                          })}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          24h change:{" "}
                          {btcQuote.change24h === null
                            ? "Not available"
                            : `${btcQuote.change24h >= 0 ? "+" : ""}${btcQuote.change24h.toFixed(2)}%`}{" "}
                          · Retrieved: {btcQuote.fetchedAt}
                        </p>
                        <p className="mt-2 text-xs text-muted-foreground">
                          Provider quote may be delayed. Not an exchange execution price.
                        </p>
                      </div>
                    ) : (
                      <p
                        role="alert"
                        className="rounded-md border border-border p-3 text-sm text-muted-foreground"
                      >
                        {quoteError}
                      </p>
                    )}
                    <div className="grid gap-4 md:grid-cols-2">
                      {[
                        {
                          name: "Planner Agent",
                          icon: BrainCircuit,
                          label: "01 / RESEARCH PLAN",
                          output:
                            "Define the scope, time horizon, key assumptions, and evidence needed to answer the question.",
                        },
                        {
                          name: "Data Agent",
                          icon: Database,
                          label: "02 / MARKET DATA",
                          output:
                            "Retrieve a live BTC/USD market snapshot when the provider is available; other datasets are not fetched.",
                        },
                        {
                          name: "Market Agent",
                          icon: LineChart,
                          label: "03 / MARKET CONTEXT",
                          output:
                            "Display the fetched 24-hour BTC change; broader market drivers and news require separate verified sources.",
                        },
                        {
                          name: "Risk Agent",
                          icon: ShieldCheck,
                          label: "04 / RISK REVIEW",
                          output:
                            "Consider volatility, liquidity, counterparty exposure, uncertainty, and downside scenarios.",
                        },
                        {
                          name: "Critic Agent",
                          icon: ScanSearch,
                          label: "05 / CRITICAL REVIEW",
                          output:
                            "Flag missing sources, unverified claims, biases, and assumptions requiring further checks.",
                        },
                        {
                          name: "Final Synthesis",
                          icon: FileText,
                          label: "06 / RESEARCH SUMMARY",
                          output:
                            "Summarize the verified BTC snapshot and the remaining research steps. These agent descriptions are illustrative, not AI-generated conclusions.",
                        },
                      ].map(({ name, icon: AgentIcon, label, output }, index) => (
                        <article
                          key={name}
                          className={`relative overflow-hidden rounded-xl border p-5 sm:p-6 transition-colors ${index === 5 ? "border-primary/60 bg-signal-soft shadow-[0_0_35px_color-mix(in_oklab,var(--color-primary)_12%,transparent)] md:col-span-2" : "border-border bg-card hover:border-primary/40"}`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="grid size-11 shrink-0 place-items-center rounded-lg border border-primary/40 bg-signal-soft text-primary">
                              <AgentIcon className="size-5" aria-hidden="true" />
                            </span>
                            <div>
                              <p className="font-mono text-[11px] font-semibold tracking-wider text-primary">
                                {label}
                              </p>
                              <h4 className="mt-1 text-lg font-bold text-foreground sm:text-xl">
                                {name}
                              </h4>
                            </div>
                          </div>
                          <p className="mt-4 text-sm leading-7 text-foreground/85 sm:text-base">
                            {output}
                          </p>
                          {index === 5 ? (
                            <div className="mt-5 rounded-lg border border-primary/35 bg-background/60 p-4">
                              <p className="font-mono text-xs font-semibold uppercase tracking-wider text-primary">
                                Verified market snapshot
                              </p>
                              <p className="mt-2 text-lg font-semibold text-foreground">
                                {btcQuote
                                  ? `BTC/USD ${btcQuote.usd.toLocaleString("en-US", { style: "currency", currency: "USD" })}`
                                  : "Live market data unavailable"}
                              </p>
                              <p className="mt-1 text-sm text-muted-foreground">
                                {btcQuote?.change24h != null
                                  ? `24h change: ${btcQuote.change24h >= 0 ? "+" : ""}${btcQuote.change24h.toFixed(2)}%`
                                  : "No verified 24-hour change"}
                              </p>
                              <p className="mt-3 text-xs text-muted-foreground">
                                Illustrative agent workflow · Not an AI-generated investment
                                recommendation
                              </p>
                            </div>
                          ) : null}
                        </article>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>

              {/* Capability chips */}
              <div className="mt-8 flex flex-wrap gap-2" aria-label="System capabilities">
                {agentCapabilities.map((cap) => (
                  <span
                    key={cap}
                    className="rounded-sm border border-border bg-surface px-3 py-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground"
                  >
                    {cap}
                  </span>
                ))}
              </div>

              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild variant="signal">
                  <a
                    href="https://ai-multi-agent-financial-research-p.vercel.app"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Open the live AI Multi-Agent Research System (opens in a new tab)"
                  >
                    Open live project <ArrowUpRight aria-hidden="true" />
                  </a>
                </Button>
                <Button asChild variant="signalOutline">
                  <a href="#projects">
                    See project details <ArrowDown aria-hidden="true" />
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* RESEARCH */}
        <section id="research" className="border-y border-border px-5 py-24 sm:px-8 lg:py-32">
          <div className="mx-auto max-w-7xl">
            <SectionHeading
              index="03"
              title="Research vectors"
              copy="Current areas of study across variational methods, quantum software, and hybrid computation."
            />
            <div className="divide-y divide-border border-y border-border">
              {portfolio.research.map((item, index) => {
                const Icon = researchIcons[index] ?? Cpu;
                const href =
                  "href" in item && typeof item.href === "string" ? item.href : undefined;
                const body = (
                  <>
                    <div className="flex items-center gap-3 text-primary">
                      <span className="grid size-8 place-items-center rounded-sm border border-primary/30 bg-signal-soft">
                        <Icon className="size-4" aria-hidden="true" />
                      </span>
                      <span className="font-mono text-xs">{item.code}</span>
                    </div>
                    <h3 className="text-lg font-semibold transition-colors group-hover:text-primary">
                      {item.title}{" "}
                      <ArrowUpRight
                        aria-hidden="true"
                        className="inline size-4 text-primary opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
                      />
                    </h3>
                    <p className="text-sm leading-7 text-muted-foreground">{item.description}</p>
                  </>
                );
                if (href) {
                  // Native anchor on purpose: a plain document navigation works even if the
                  // client router bundle is stale or not hydrated, so rows are always clickable.
                  return (
                    <a
                      key={item.code}
                      href={href}
                      aria-label={`${item.title} — open the interactive lab`}
                      className="group relative z-10 grid cursor-pointer gap-4 rounded-md py-8 transition-colors hover:bg-surface/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background md:grid-cols-[8rem_minmax(0,0.8fr)_minmax(0,1fr)] md:items-center md:px-4"
                    >
                      {body}
                    </a>
                  );
                }
                return (
                  <article
                    key={item.code}
                    className="group grid gap-4 py-8 transition-colors hover:bg-surface/60 md:grid-cols-[8rem_minmax(0,0.8fr)_minmax(0,1fr)] md:items-center md:px-4"
                  >
                    {body}
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* QUANTUM LAB */}
        <section
          id="quantum-lab"
          className="lab-grid relative border-b border-border px-5 py-24 sm:px-8 lg:py-32"
        >
          <div className="mx-auto max-w-7xl">
            <SectionHeading
              index="Q"
              title="Interactive Quantum Lab"
              copy="A single-qubit circuit simulator running in your browser. Apply gates, watch the state move on the Bloch sphere, and sample measurements."
            />
            <QuantumLab />
            <div className="mt-8 flex flex-col items-start justify-between gap-4 rounded-md border border-border bg-card/80 p-5 sm:flex-row sm:items-center">
              <div>
                <p className="font-mono text-xs uppercase text-primary">
                  Quantum Research Dashboard
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Multi-qubit circuit builder with statevector, seeded sampling and histograms. More
                  labs in development.
                </p>
              </div>
              <Button asChild variant="signal">
                <Link to="/lab">
                  Open Research Lab <ArrowUpRight aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* CERTIFICATIONS */}
        <section id="certifications" className="bg-surface px-5 py-24 sm:px-8 lg:py-32">
          <div className="mx-auto max-w-7xl">
            <SectionHeading
              index="04"
              title="Certifications"
              copy="This section is reserved for verified credentials. No certification claims are displayed until details are supplied."
            />
            <div className="grid gap-4 md:grid-cols-2">
              {portfolio.certifications.map((item, index) => {
                const verified = (item as { verified?: boolean }).verified === true;
                return (
                  <div
                    key={index}
                    className={`grid min-h-36 grid-cols-[auto_minmax(0,1fr)] gap-5 rounded-md border bg-card p-6 ${verified ? "border-primary/40" : "border-dashed border-border-strong"}`}
                  >
                    <span
                      className={`grid size-9 place-items-center rounded-sm border ${verified ? "border-primary/50 text-primary" : "border-border text-muted-foreground"}`}
                    >
                      {verified ? (
                        <ShieldCheck className="size-4" aria-hidden="true" />
                      ) : (
                        <CircleDashed className="size-4" aria-hidden="true" />
                      )}
                    </span>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-3">
                        <h3 className="font-medium text-muted-foreground">{item.title}</h3>
                        <span
                          className={`rounded-full border px-2 py-0.5 font-mono text-[9px] uppercase ${verified ? "border-primary/50 text-primary" : "border-border-strong text-muted-foreground"}`}
                        >
                          {verified ? "Verified" : "Pending verification"}
                        </span>
                      </div>
                      <p className="mt-2 font-mono text-[10px] uppercase leading-5 text-muted-foreground">
                        {item.detail}
                      </p>
                      {"href" in item && item.href ? (
                        <a
                          href={item.href}
                          target="_blank"
                          rel="noreferrer"
                          className={`mt-4 inline-flex items-center gap-2 font-mono text-[10px] uppercase text-primary hover:underline ${focusRing}`}
                        >
                          View credential <ArrowUpRight className="size-3" aria-hidden="true" />
                        </a>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* CONTACT */}
        <section
          id="contact"
          className="lab-grid relative overflow-hidden px-5 py-24 sm:px-8 lg:py-36"
        >
          <div className="signal-line absolute inset-x-0 top-0 h-px" aria-hidden="true" />
          <div
            className="hero-glow absolute -left-40 bottom-0 size-[30rem] rounded-full"
            aria-hidden="true"
          />
          <div className="relative mx-auto grid max-w-7xl gap-12 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
            <div>
              <span className="inline-flex items-center gap-2 font-mono text-xs text-primary">
                <span className="h-px w-6 bg-primary" aria-hidden="true" />
                05 / CONTACT
              </span>
              <h2 className="mt-5 max-w-3xl text-4xl font-semibold leading-tight tracking-tight sm:text-6xl">
                Interested in the intersection of intelligence, markets, and quantum systems?
              </h2>
            </div>
            <div className="lg:justify-self-end">
              <p className="max-w-md text-sm leading-7 text-muted-foreground">
                Reach out through LinkedIn or follow ongoing work on GitHub. Both links open in a
                new tab.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button asChild variant="signal" size="lg">
                  <a
                    href={linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="LinkedIn profile of Tamás Németh (opens in a new tab)"
                  >
                    <Linkedin aria-hidden="true" /> LinkedIn <ArrowUpRight aria-hidden="true" />
                  </a>
                </Button>
                <Button asChild variant="signalOutline" size="lg">
                  <a
                    href={github}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="GitHub profile of Tamás Németh (opens in a new tab)"
                  >
                    <Github aria-hidden="true" /> GitHub <ArrowUpRight aria-hidden="true" />
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border px-5 py-8 sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 font-mono text-[10px] uppercase text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>© 2026 {portfolio.name} · Quantum AI Lab</span>
          <span className="flex items-center gap-2">
            <Check className="size-3 text-primary" aria-hidden="true" /> Portfolio content awaiting
            final verification
          </span>
        </div>
      </footer>
    </div>
  );
}
