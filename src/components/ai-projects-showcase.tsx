import { ArrowUpRight, BrainCircuit, LineChart, Radar } from "lucide-react";

const projects = [
  {
    title: "AI Multi-Agent Financial Research Platform",
    subtitle: "Latest GitHub iteration: v2.3",
    description: "A multi-agent financial research project exploring coordinated analysis and research workflows. Earlier versions are represented as development history, not separate projects.",
    tags: ["Python", "AI Agents", "Financial Research"],
    href: "https://github.com/Tamas22-cell/AI-Multi-Agent-Financial-Research-v2.3",
    icon: BrainCircuit,
  },
  {
    title: "AI-Powered Global Market Intelligence System",
    subtitle: "AI market research",
    description: "Research repository focused on AI-assisted global market intelligence. Refer to the source repository for implemented functionality.",
    tags: ["AI", "Market Intelligence", "Research"],
    href: "https://github.com/Tamas22-cell/AI-Powered-Global-Market-Intelligence-System",
    icon: LineChart,
  },
  {
    title: "AI-Powered Memecoin Radar",
    subtitle: "Crypto intelligence",
    description: "AI-focused memecoin and crypto research project. Repository content is the source of truth for current features and implementation status.",
    tags: ["AI", "Crypto", "Research"],
    href: "https://github.com/Tamas22-cell/AIPoweredMemecoinRadar",
    icon: Radar,
  },
];

export function AIProjectsShowcase() {
  return (
    <section id="ai-projects" className="bg-background px-5 py-24 sm:px-8 lg:py-28" aria-labelledby="ai-projects-title">
      <div className="mx-auto max-w-7xl">
        <p className="font-mono text-xs uppercase tracking-widest text-primary">AI Development / Portfolio</p>
        <h2 id="ai-projects-title" className="mt-4 text-3xl font-semibold tracking-tight sm:text-5xl">AI Developer &amp; Multi-Agent Systems</h2>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-muted-foreground">Three selected AI research repositories. The Multi-Agent platform is shown as one evolving project rather than duplicating each version. GitHub links document the available source; a repository listing is not proof of a deployed or fully validated system.</p>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {projects.map(({ title, subtitle, description, tags, href, icon: Icon }) => (
            <article key={title} className="flex flex-col rounded-lg border border-border bg-card p-6">
              <Icon className="size-7 text-primary" aria-hidden="true" />
              <p className="mt-5 font-mono text-xs text-muted-foreground">{subtitle}</p>
              <h3 className="mt-2 text-xl font-semibold">{title}</h3>
              <p className="mt-3 flex-1 text-sm leading-6 text-muted-foreground">{description}</p>
              <div className="mt-5 flex flex-wrap gap-2">{tags.map(tag => <span key={tag} className="rounded border border-border px-2 py-1 font-mono text-[10px]">{tag}</span>)}</div>
              <a className="mt-6 inline-flex items-center gap-2 text-sm text-primary hover:underline" href={href} target="_blank" rel="noopener noreferrer">View GitHub repository <ArrowUpRight className="size-4" /></a>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
