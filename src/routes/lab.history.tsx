import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Download, ExternalLink, Trash2 } from "lucide-react";

import { LabShell } from "@/components/lab/lab-shell";
import { Button } from "@/components/ui/button";
import {
  clearExperimentHistory,
  deleteExperimentSnapshot,
  downloadText,
  getExperimentHistory,
  type ExperimentSnapshot,
} from "@/lib/experiment-history";

export const Route = createFileRoute("/lab/history")({
  head: () => ({
    meta: [
      { title: "Experiment History — Quantum AI Lab" },
      {
        name: "description",
        content: "Local browser history for saved QAOA, VQE and portfolio experiments.",
      },
      { property: "og:title", content: "Experiment History — Quantum AI Lab" },
      {
        property: "og:description",
        content: "Review and export locally saved quantum simulation snapshots.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: Page,
});

function Page() {
  const [items, setItems] = useState<ExperimentSnapshot[]>([]);

  useEffect(() => {
    const refresh = () => setItems(getExperimentHistory());
    refresh();
    window.addEventListener("experiment-history-changed", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("experiment-history-changed", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const exportJson = () =>
    downloadText(
      `quantum-ai-experiment-history-${new Date().toISOString().slice(0, 10)}.json`,
      JSON.stringify(items, null, 2),
    );

  const exportCsv = () => {
    const esc = (v: unknown) => `"${String(v ?? "").replaceAll('"', '""')}"`;
    const rows = items.map((x) => [
      x.createdAt,
      x.module,
      x.route,
      JSON.stringify(x.fields),
      x.summary,
    ]);
    const csv = [["createdAt", "module", "route", "fields", "summary"], ...rows]
      .map((r) => r.map(esc).join(","))
      .join("\n");
    downloadText(
      `quantum-ai-experiment-history-${new Date().toISOString().slice(0, 10)}.csv`,
      csv,
      "text/csv;charset=utf-8",
    );
  };

  const modules = useMemo(() => Array.from(new Set(items.map((x) => x.module))), [items]);

  return (
    <LabShell crumb="History">
      <div className="mb-8 max-w-3xl">
        <span className="font-mono text-xs text-primary">COMMAND CENTER / C7</span>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
          Experiment History
        </h1>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          Saved experiment snapshots are stored only in this browser on this device. They are not
          uploaded to a server and can be exported as JSON or CSV.
        </p>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" onClick={exportJson} disabled={!items.length}>
          <Download className="size-4" />
          Export JSON
        </Button>
        <Button type="button" variant="outline" onClick={exportCsv} disabled={!items.length}>
          <Download className="size-4" />
          Export CSV
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            clearExperimentHistory();
            setItems([]);
          }}
          disabled={!items.length}
        >
          <Trash2 className="size-4" />
          Clear history
        </Button>
        <span className="ml-auto font-mono text-xs text-muted-foreground">
          {items.length} saved · {modules.length} module{modules.length === 1 ? "" : "s"}
        </span>
      </div>

      {!items.length ? (
        <div className="rounded-md border border-dashed border-border-strong bg-card/50 p-8 text-sm text-muted-foreground">
          No saved experiments yet. Open QAOA, VQE or Portfolio Lab and press{" "}
          <strong className="text-foreground">Save experiment</strong> after a run.
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <article key={item.id} className="rounded-md border border-border bg-card p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-wider text-primary">
                    {item.module}
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {new Date(item.createdAt).toLocaleString()}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link
                    to={item.route as never}
                    className="inline-flex min-h-9 items-center gap-1 rounded-sm border border-border px-3 font-mono text-xs text-primary hover:bg-surface"
                  >
                    Open lab <ExternalLink className="size-3.5" />
                  </Link>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    aria-label="Delete snapshot"
                    onClick={() => {
                      deleteExperimentSnapshot(item.id);
                      setItems(getExperimentHistory());
                    }}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {Object.entries(item.fields)
                  .slice(0, 12)
                  .map(([k, v]) => (
                    <div key={k} className="rounded-sm border border-border bg-surface p-2">
                      <div
                        className="truncate font-mono text-[9px] uppercase text-muted-foreground"
                        title={k}
                      >
                        {k}
                      </div>
                      <div className="mt-1 break-words font-mono text-xs text-foreground">
                        {String(v)}
                      </div>
                    </div>
                  ))}
              </div>
              <details className="mt-4">
                <summary className="cursor-pointer font-mono text-xs text-primary">
                  Captured page summary
                </summary>
                <p className="mt-2 whitespace-pre-wrap text-xs leading-6 text-muted-foreground">
                  {item.summary}
                </p>
              </details>
            </article>
          ))}
        </div>
      )}
    </LabShell>
  );
}
