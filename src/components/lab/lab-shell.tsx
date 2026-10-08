import { Link } from "@tanstack/react-router";
import { ArrowLeft, Atom } from "lucide-react";

/** Shared chrome for all research-lab pages. */
export function LabShell({ children, crumb }: { children: React.ReactNode; crumb?: string }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <a
        href="#lab-main"
        className="fixed left-4 top-4 z-[60] -translate-y-24 rounded-sm bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground focus:translate-y-0"
      >
        Skip to content
      </a>
      <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-5 sm:px-8">
          <div className="flex min-w-0 items-center gap-3 font-mono text-xs uppercase tracking-wider">
            <Link
              to="/"
              className="flex items-center gap-2 rounded-sm text-muted-foreground hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="grid size-8 place-items-center rounded-sm border border-primary/50 bg-signal-soft text-primary">
                <Atom className="size-4" aria-hidden="true" />
              </span>
              <span className="hidden sm:inline">Quantum AI Lab</span>
            </Link>
            <span className="text-border-strong">/</span>
            <Link
              to="/lab"
              className="truncate text-foreground hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              activeOptions={{ exact: true }}
            >
              Research Lab
            </Link>
            {crumb ? (
              <>
                <span className="text-border-strong">/</span>
                <span className="truncate text-primary">{crumb}</span>
              </>
            ) : null}
          </div>
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-sm font-mono text-[11px] uppercase text-muted-foreground hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ArrowLeft className="size-3.5" aria-hidden="true" /> Portfolio
          </Link>
        </div>
      </header>
      <main id="lab-main" className="px-5 py-10 sm:px-8 lg:py-14">
        <div className="mx-auto max-w-7xl">{children}</div>
      </main>
      <footer className="border-t border-border px-5 py-6 font-mono text-[10px] uppercase text-muted-foreground sm:px-8">
        <div className="mx-auto max-w-7xl">
          Ideal noiseless classical simulation · Not quantum hardware results
        </div>
      </footer>
    </div>
  );
}
