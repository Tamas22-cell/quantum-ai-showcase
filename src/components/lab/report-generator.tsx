import { useEffect, useRef, useState } from "react";
import { Download, FileText, Loader2, X } from "lucide-react";

import { SOURCES, buildReport, runSource, validateSettings, type ReportDoc, type ReportModuleId, type Settings } from "@/lib/report";

type Phase = { kind: "idle" } | { kind: "running"; label: string; frac: number } | { kind: "done"; doc: ReportDoc; url: string; filename: string; pages: number; bytes: number } | { kind: "error"; message: string };

const IDS = Object.keys(SOURCES) as ReportModuleId[];
const field = "mt-1 w-full rounded-sm border border-border bg-surface px-2 py-1.5 font-mono text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function ReportGenerator() {
  const [module, setModule] = useState<ReportModuleId>("qaoa");
  const [settings, setSettings] = useState<Record<ReportModuleId, Settings>>(() => Object.fromEntries(IDS.map((id) => [id, { ...SOURCES[id].defaults }])) as Record<ReportModuleId, Settings>);
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const abortRef = useRef<AbortController | null>(null);
  const src = SOURCES[module], cur = settings[module];
  const errors = validateSettings(module, cur);

  // Revoke object URLs to avoid leaking memory.
  useEffect(() => () => { if (phase.kind === "done") URL.revokeObjectURL(phase.url); }, [phase]);

  const setField = (k: string, v: string | number) => { setSettings((s) => ({ ...s, [module]: { ...s[module], [k]: v } })); if (phase.kind !== "running") setPhase({ kind: "idle" }); };

  async function generate() {
    if (errors.length) return;
    const ctrl = new AbortController(); abortRef.current = ctrl;
    try {
      setPhase({ kind: "running", label: "Running experiment locally…", frac: 0 });
      const snap = await runSource(module, cur, { signal: ctrl.signal, onProgress: (f) => setPhase({ kind: "running", label: "Running experiment locally…", frac: Math.min(0.85, f * 0.85) }) });
      if (ctrl.signal.aborted) throw new DOMException("Aborted", "AbortError");
      setPhase({ kind: "running", label: "Composing report…", frac: 0.88 });
      const doc = buildReport(snap);
      setPhase({ kind: "running", label: "Rendering PDF in your browser…", frac: 0.92 });
      await new Promise((r) => setTimeout(r, 0));
      const { renderReportPdf, reportFilename } = await import("@/lib/report/pdf"); // lazy: PDF library only loads on demand
      const pdf = renderReportPdf(doc);
      const blob = pdf.output("blob");
      setPhase({ kind: "done", doc, url: URL.createObjectURL(blob), filename: reportFilename(doc), pages: pdf.getNumberOfPages(), bytes: blob.size });
    } catch (e) {
      const aborted = e instanceof DOMException && e.name === "AbortError" || ctrl.signal.aborted;
      setPhase(aborted ? { kind: "idle" } : { kind: "error", message: e instanceof Error ? e.message : "Report generation failed." });
    } finally { abortRef.current = null; }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
      <section className="rounded-md border border-border bg-card p-5" aria-label="Report configuration">
        <h2 className="font-mono text-xs uppercase tracking-wider text-primary">1 · Source experiment</h2>
        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2" role="radiogroup" aria-label="Lab module">
          {IDS.map((id) => (
            <button key={id} type="button" role="radio" aria-checked={module === id} disabled={phase.kind === "running"}
              onClick={() => { setModule(id); setPhase({ kind: "idle" }); }}
              className={`rounded-sm border px-3 py-2 text-left text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${module === id ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground hover:border-border-strong"}`}>
              {SOURCES[id].name}
            </button>
          ))}
        </div>

        <h2 className="mt-6 font-mono text-xs uppercase tracking-wider text-primary">2 · Experiment settings</h2>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {src.fields.map((fd) => (
            <label key={fd.key} className="text-[10px] uppercase text-muted-foreground">
              {fd.label}{fd.kind !== "select" ? ` (${fd.min}–${fd.max})` : ""}
              {fd.kind === "select" ? (
                <select className={field} value={String(cur[fd.key])} onChange={(e) => setField(fd.key, e.target.value)}>
                  {fd.options!.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              ) : (
                <input type="number" className={field} value={cur[fd.key]} min={fd.min} max={fd.max} step={fd.step ?? 1} onChange={(e) => setField(fd.key, e.target.value === "" ? "" : Number(e.target.value))} />
              )}
            </label>
          ))}
        </div>
        {errors.length ? <ul className="mt-3 space-y-1 text-xs text-destructive" role="alert">{errors.map((e) => <li key={e}>{e}</li>)}</ul> : null}
        <p className="mt-4 text-[11px] leading-5 text-muted-foreground">
          The experiment is executed with the same tested engine as the lab, using exactly these seeded settings, then written into a PDF — all locally in your browser. No data is uploaded.
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          <button type="button" onClick={generate} disabled={!!errors.length || phase.kind === "running"}
            className="inline-flex items-center gap-2 rounded-sm bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            {phase.kind === "running" ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <FileText className="size-4" aria-hidden="true" />}Generate Report
          </button>
          {phase.kind === "running" ? (
            <button type="button" onClick={() => abortRef.current?.abort()} className="inline-flex items-center gap-1 rounded-sm border border-border px-3 py-2 text-xs text-muted-foreground hover:text-foreground"><X className="size-4" aria-hidden="true" />Cancel</button>
          ) : null}
          {phase.kind === "done" ? (
            <a href={phase.url} download={phase.filename} className="inline-flex items-center gap-2 rounded-sm border border-emerald/60 px-4 py-2 text-xs font-semibold text-emerald hover:bg-emerald/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <Download className="size-4" aria-hidden="true" />Download PDF
            </a>
          ) : null}
        </div>

        <div className="mt-4" aria-live="polite">
          {phase.kind === "running" ? (
            <div>
              <p className="font-mono text-[11px] text-muted-foreground">{phase.label} {Math.round(phase.frac * 100)}%</p>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface"><div className="h-full bg-primary transition-all" style={{ width: `${phase.frac * 100}%` }} /></div>
            </div>
          ) : null}
          {phase.kind === "error" ? <p className="rounded-sm border border-destructive/50 p-3 text-xs text-destructive" role="alert">Report could not be generated: {phase.message}</p> : null}
          {phase.kind === "done" ? <p className="font-mono text-[11px] text-emerald">PDF ready · {phase.pages} pages · {(phase.bytes / 1024).toFixed(0)} KB · {phase.filename}</p> : null}
        </div>
      </section>

      <section className="rounded-md border border-border bg-card p-5" aria-label="Report preview">
        <h2 className="font-mono text-xs uppercase tracking-wider text-primary">3 · Report outline</h2>
        {phase.kind === "done" ? (
          <div className="mt-4 space-y-4">
            <div>
              <p className="text-lg font-semibold">{phase.doc.title}</p>
              <p className="font-mono text-[11px] text-muted-foreground">Generated {phase.doc.generatedAt}</p>
            </div>
            <div className="rounded-sm border border-amber/50 bg-amber/5 p-3">
              <p className="font-mono text-[10px] uppercase text-amber">Scientific integrity notice</p>
              <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-foreground">{phase.doc.disclaimers.map((d) => <li key={d}>{d}</li>)}</ul>
            </div>
            <div>
              <p className="font-mono text-[10px] uppercase text-muted-foreground">Executive summary</p>
              <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-muted-foreground">{phase.doc.summary.map((d) => <li key={d}>{d}</li>)}</ul>
            </div>
            <ol className="grid grid-cols-2 gap-1 font-mono text-[11px] text-muted-foreground">
              {phase.doc.sections.map((s, i) => <li key={s.heading}>{String(i + 1).padStart(2, "0")} · {s.heading} <span className="opacity-60">({s.blocks.length})</span></li>)}
            </ol>
          </div>
        ) : (
          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            Each report contains a cover, integrity notice, executive summary, experiment setup, methodology, results with tables and charts
            (distributions, convergence, exact/classical reference), interpretation, limitations, reproducibility settings and a raw-settings appendix where useful.
          </p>
        )}
      </section>
    </div>
  );
}
