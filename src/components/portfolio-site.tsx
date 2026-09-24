import { useState } from "react";
import {
  ArrowDown,
  ArrowUpRight,
  Atom,
  Braces,
  Check,
  Cpu,
  Github,
  Linkedin,
  Menu,
  Network,
  Orbit,
  ShieldCheck,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { portfolio } from "@/data/portfolio";

const projectIcons = [ShieldCheck, Network, Orbit];
const researchIcons = [Orbit, Atom, Braces, Cpu];

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
      className={`inline-flex cursor-not-allowed items-center gap-2 border border-border bg-surface px-3 font-mono text-muted-foreground ${compact ? "h-8 text-[10px] uppercase" : "h-11 text-xs"}`}
    >
      {icon}
      {label}
    </span>
  );
}

function SectionHeading({ index, title, copy }: { index: string; title: string; copy?: string }) {
  return (
    <div className="mb-10 grid gap-4 border-b border-border pb-6 md:grid-cols-[minmax(0,1fr)_minmax(18rem,0.8fr)] md:items-end">
      <div className="min-w-0">
        <span className="font-mono text-xs text-primary">{index} /</span>
        <h2 className="mt-2 text-3xl font-semibold tracking-normal text-foreground sm:text-4xl">{title}</h2>
      </div>
      {copy ? <p className="max-w-xl text-sm leading-7 text-muted-foreground md:justify-self-end">{copy}</p> : null}
    </div>
  );
}

export function PortfolioSite() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-foreground">
      <a
        href="#main"
        className="fixed left-4 top-4 z-[60] -translate-y-24 bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground focus:translate-y-0"
      >
        Skip to content
      </a>

      <header className="fixed inset-x-0 top-0 z-50 border-b border-border/80 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto grid h-16 max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-5 sm:px-8">
          <a href="#top" className="flex min-w-0 items-center gap-3" aria-label="Quantum AI Lab home">
            <span className="grid size-8 shrink-0 place-items-center border border-primary/50 bg-signal-soft text-primary">
              <Atom className="size-4" aria-hidden="true" />
            </span>
            <span className="truncate font-mono text-xs font-medium uppercase text-foreground sm:text-sm">Quantum AI Lab</span>
          </a>
          <nav className="hidden items-center gap-7 lg:flex" aria-label="Primary navigation">
            {portfolio.navigation.map((item) => (
              <a key={item.href} href={item.href} className="font-mono text-[11px] uppercase text-muted-foreground transition-colors hover:text-primary">
                {item.label}
              </a>
            ))}
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
          <nav id="mobile-navigation" className="border-t border-border bg-surface px-5 py-4 lg:hidden" aria-label="Mobile navigation">
            <div className="mx-auto grid max-w-7xl gap-1">
              {portfolio.navigation.map((item) => (
                <a key={item.href} href={item.href} onClick={() => setMenuOpen(false)} className="border-b border-border/60 py-3 font-mono text-xs uppercase text-muted-foreground last:border-0 hover:text-primary">
                  {item.label}
                </a>
              ))}
            </div>
          </nav>
        ) : null}
      </header>

      <main id="main">
        <section id="top" className="lab-grid relative flex min-h-[92svh] items-center border-b border-border px-5 pb-16 pt-28 sm:px-8">
          <div className="absolute inset-0 bg-[linear-gradient(90deg,var(--color-background)_0%,transparent_52%,var(--color-background)_100%)]" aria-hidden="true" />
          <div className="relative mx-auto w-full max-w-7xl">
            <div className="mb-10 flex items-center gap-3 font-mono text-[10px] uppercase text-primary reveal-up">
              <span className="size-1.5 bg-primary signal-pulse" />
              Independent research portfolio
            </div>
            <div className="max-w-5xl reveal-up [animation-delay:100ms]">
              <p className="mb-4 font-mono text-sm text-muted-foreground">{portfolio.name} / Researcher</p>
              <h1 className="text-5xl font-semibold leading-[1.04] tracking-normal text-foreground sm:text-7xl lg:text-8xl">
                AI & Quantum
                <span className="block text-primary">Computing Researcher</span>
              </h1>
              <p className="mt-8 max-w-2xl text-base leading-8 text-muted-foreground sm:text-lg">{portfolio.intro}</p>
              <div className="mt-10 flex flex-wrap gap-3">
                <Button asChild variant="signal" size="lg">
                  <a href="#projects">Explore research <ArrowDown aria-hidden="true" /></a>
                </Button>
                <Button asChild variant="signalOutline" size="lg">
                  <a href="#contact">Connect <ArrowUpRight aria-hidden="true" /></a>
                </Button>
              </div>
            </div>
            <div className="mt-16 grid max-w-4xl grid-cols-2 border-l border-t border-border sm:grid-cols-3 lg:grid-cols-5 reveal-up [animation-delay:200ms]">
              {portfolio.disciplines.map((item, index) => (
                <div key={item} className="min-w-0 border-b border-r border-border bg-background/60 px-4 py-4">
                  <span className="font-mono text-[9px] text-primary">0{index + 1}</span>
                  <p className="mt-2 text-xs text-muted-foreground">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="about" className="border-b border-border px-5 py-24 sm:px-8 lg:py-32">
          <div className="mx-auto max-w-7xl">
            <SectionHeading index="01" title="About" copy="Cross-disciplinary research spanning intelligent systems, financial computation, and emerging quantum methods." />
            <div className="grid gap-10 lg:grid-cols-[0.7fr_1.3fr]">
              <div className="font-mono text-xs leading-6 text-primary">RESEARCH PROFILE<br />BUDAPEST, HUNGARY</div>
              <div className="max-w-3xl space-y-6 text-xl leading-9 text-foreground sm:text-2xl sm:leading-10">
                {portfolio.about.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
              </div>
            </div>
          </div>
        </section>

        <section id="projects" className="bg-surface px-5 py-24 sm:px-8 lg:py-32">
          <div className="mx-auto max-w-7xl">
            <SectionHeading index="02" title="Selected projects" copy="Research concepts and works in progress. Repository links will be added after their destinations are verified." />
            <div className="grid gap-px bg-border lg:grid-cols-3">
              {portfolio.projects.map((project, index) => {
                const Icon = projectIcons[index];
                return (
                  <article key={project.title} className="group flex min-h-[25rem] flex-col bg-card p-6 transition-colors hover:bg-surface-raised sm:p-8">
                    <div className="flex items-start justify-between">
                      <span className="font-mono text-xs text-muted-foreground">PRJ / {project.index}</span>
                      <span className="grid size-11 place-items-center border border-border text-primary transition-colors group-hover:border-primary/60"><Icon className="size-5" aria-hidden="true" /></span>
                    </div>
                    <h3 className="mt-16 text-2xl font-semibold tracking-normal">{project.title}</h3>
                    <p className="mt-4 text-sm leading-7 text-muted-foreground">{project.description}</p>
                    <div className="mt-auto pt-8">
                      <div className="mb-5 flex flex-wrap gap-2">
                        {project.tags.map((tag) => <span key={tag} className="border border-border px-2 py-1 font-mono text-[9px] uppercase text-muted-foreground">{tag}</span>)}
                      </div>
                      <PlaceholderLink label={project.link.label} compact />
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section id="research" className="border-y border-border px-5 py-24 sm:px-8 lg:py-32">
          <div className="mx-auto max-w-7xl">
            <SectionHeading index="03" title="Research vectors" copy="Current areas of study across variational methods, quantum software, and hybrid computation." />
            <div className="divide-y divide-border border-y border-border">
              {portfolio.research.map((item, index) => {
                const Icon = researchIcons[index];
                return (
                  <article key={item.code} className="grid gap-5 py-7 md:grid-cols-[6rem_minmax(0,0.8fr)_minmax(0,1fr)] md:items-center">
                    <div className="flex items-center gap-3 text-primary"><Icon className="size-4" aria-hidden="true" /><span className="font-mono text-xs">{item.code}</span></div>
                    <h3 className="text-lg font-semibold">{item.title}</h3>
                    <p className="text-sm leading-7 text-muted-foreground">{item.description}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section id="certifications" className="bg-surface px-5 py-24 sm:px-8 lg:py-32">
          <div className="mx-auto max-w-7xl">
            <SectionHeading index="04" title="Certifications" copy="This section is reserved for verified credentials. No certification claims are displayed until details are supplied." />
            <div className="grid gap-4 md:grid-cols-2">
              {portfolio.certifications.map((item, index) => (
                <div key={index} className="grid min-h-36 grid-cols-[auto_minmax(0,1fr)] gap-5 border border-dashed border-border-strong bg-card p-6">
                  <span className="grid size-9 place-items-center border border-border font-mono text-xs text-muted-foreground">—</span>
                  <div className="min-w-0"><h3 className="font-medium text-muted-foreground">{item.title}</h3><p className="mt-2 font-mono text-[10px] uppercase leading-5 text-muted-foreground">{item.detail}</p></div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="contact" className="lab-grid relative px-5 py-24 sm:px-8 lg:py-36">
          <div className="absolute inset-x-0 top-0 h-px signal-line" aria-hidden="true" />
          <div className="relative mx-auto grid max-w-7xl gap-12 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
            <div>
              <span className="font-mono text-xs text-primary">05 / CONTACT</span>
              <h2 className="mt-5 max-w-3xl text-4xl font-semibold leading-tight tracking-normal sm:text-6xl">Interested in the intersection of intelligence, markets, and quantum systems?</h2>
            </div>
            <div className="lg:justify-self-end">
              <p className="max-w-md text-sm leading-7 text-muted-foreground">Verified contact destinations will be connected here. Until then, the buttons remain intentionally inactive.</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <PlaceholderLink label="LinkedIn pending" icon={<Linkedin className="size-4" aria-hidden="true" />} />
                <PlaceholderLink label="GitHub pending" icon={<Github className="size-4" aria-hidden="true" />} />
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border px-5 py-6 sm:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 font-mono text-[10px] uppercase text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <span>© 2026 {portfolio.name}</span>
          <span className="flex items-center gap-2"><Check className="size-3 text-primary" aria-hidden="true" /> Portfolio content awaiting final verification</span>
        </div>
      </footer>
    </div>
  );
}