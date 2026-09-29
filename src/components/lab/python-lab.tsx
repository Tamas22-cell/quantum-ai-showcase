import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, Check, Loader2, Play, RotateCcw, Save, Square, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { saveExperimentSnapshot } from "@/lib/experiment-history";
import { PYODIDE_VERSION, PyodideRunner, type RunResult } from "@/lib/python/pyodide-runner";
import { PYTHON_PRESETS } from "@/lib/python/presets";

type RuntimeState = "loading" | "ready" | "error";

export function PythonLab() {
  const runnerRef = useRef<PyodideRunner | null>(null);
  const [runtime, setRuntime] = useState<RuntimeState>("loading");
  const [runtimeError, setRuntimeError] = useState<string | null>(null);
  const [presetId, setPresetId] = useState(PYTHON_PRESETS[0]!.id);
  const [code, setCode] = useState(PYTHON_PRESETS[0]!.code);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<RunResult | null>(null);
  const [runError, setRunError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const boot = useCallback(() => {
    setRuntime("loading");
    setRuntimeError(null);
    runnerRef.current ??= new PyodideRunner();
    runnerRef.current.init().then(
      () => setRuntime("ready"),
      (e: Error) => { setRuntime("error"); setRuntimeError(e.message); },
    );
  }, []);

  // Boot the runtime only after this route mounts (keeps the rest of the site light).
  useEffect(() => {
    boot();
    return () => runnerRef.current?.terminate();
  }, [boot]);

  async function run() {
    if (!runnerRef.current || running) return;
    setRunning(true);
    setRunError(null);
    setResult(null);
    try {
      setResult(await runnerRef.current.run(code));
    } catch (e) {
      setRunError((e as Error).message);
      boot(); // worker was terminated (timeout/stop) – reload it
    } finally {
      setRunning(false);
    }
  }

  function stop() {
    runnerRef.current?.terminate();
  }

  function loadPreset(id: string) {
    const p = PYTHON_PRESETS.find((x) => x.id === id);
    if (!p) return;
    setPresetId(id);
    setCode(p.code);
    setResult(null);
    setRunError(null);
  }

  function save() {
    if (!result) return;
    const preset = PYTHON_PRESETS.find((p) => p.id === presetId);
    const presetUnchanged = preset?.code === code;
    saveExperimentSnapshot({
      module: "Python Research Lab",
      route: "/lab/python",
      fields: {
        preset: presetUnchanged ? preset!.label : "Custom code",
        status: result.ok ? "success" : "error",
        durationMs: result.durationMs.toFixed(0),
        runtime: `Pyodide ${PYODIDE_VERSION} (browser)`,
        code: code.slice(0, 4000),
      },
      summary: [result.stdout, result.result ? `Result: ${result.result}` : "", result.stderr].filter(Boolean).join("\n").slice(0, 8000),
    });
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  }

  function onEditorKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      void run();
    }
  }

  const activePreset = PYTHON_PRESETS.find((p) => p.id === presetId);
  const hasOutput = result && (result.stdout || result.stderr || result.result);

  return (
    <div className="space-y-6">
      {/* Runtime status */}
      <div role="status" aria-live="polite" className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-card px-4 py-3 font-mono text-xs">
        {runtime === "loading" && <><Loader2 className="size-4 animate-spin text-primary" aria-hidden="true" /><span>Python runtime loading…</span><span className="text-muted-foreground">first load downloads ~10 MB, then cached</span></>}
        {runtime === "ready" && <><span className="size-2 rounded-full bg-primary shadow-[var(--shadow-signal)]" aria-hidden="true" /><span className="text-primary">Python runtime ready</span><span className="text-muted-foreground">Pyodide {PYODIDE_VERSION} · CPython in WebAssembly</span></>}
        {runtime === "error" && <><AlertTriangle className="size-4 text-destructive" aria-hidden="true" /><span className="text-destructive">Python runtime failed to load: {runtimeError}</span><Button size="sm" variant="outline" onClick={boot}>Retry</Button></>}
      </div>

      {/* Presets */}
      <fieldset>
        <legend className="mb-3 font-mono text-xs uppercase tracking-wider text-primary">Presets</legend>
        <div className="grid gap-3 md:grid-cols-3">
          {PYTHON_PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              aria-pressed={presetId === p.id}
              onClick={() => loadPreset(p.id)}
              className={`rounded-md border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${presetId === p.id ? "border-primary/60 bg-signal-soft" : "border-border bg-card hover:border-primary/40"}`}
            >
              <span className="block text-sm font-medium">{p.label}</span>
              <span className="mt-1 block text-xs leading-5 text-muted-foreground">{p.description}</span>
            </button>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Editor */}
        <div className="flex flex-col rounded-md border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-4 py-2">
            <label htmlFor="python-code" className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
              editor · {activePreset && activePreset.code === code ? activePreset.label : "custom"}
            </label>
            <button type="button" onClick={() => loadPreset(presetId)} className="inline-flex items-center gap-1 rounded-sm font-mono text-[10px] uppercase text-muted-foreground hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <RotateCcw className="size-3" aria-hidden="true" /> Reset
            </button>
          </div>
          <textarea
            id="python-code"
            name="code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={onEditorKeyDown}
            spellCheck={false}
            aria-describedby="python-editor-hint"
            className="min-h-[26rem] flex-1 resize-y bg-background/60 p-4 font-mono text-[13px] leading-6 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
          />
          <div className="flex flex-wrap items-center gap-2 border-t border-border px-4 py-3">
            {running ? (
              <Button type="button" variant="outline" onClick={stop}><Square className="size-4" aria-hidden="true" /> Stop</Button>
            ) : (
              <Button type="button" onClick={run} disabled={runtime !== "ready"}><Play className="size-4" aria-hidden="true" /> Run</Button>
            )}
            <Button type="button" variant="ghost" onClick={() => { setResult(null); setRunError(null); }} disabled={!result && !runError}>
              <Trash2 className="size-4" aria-hidden="true" /> Clear output
            </Button>
            <span id="python-editor-hint" className="ml-auto font-mono text-[10px] uppercase text-muted-foreground">Ctrl/⌘ + Enter to run · 15s limit</span>
          </div>
        </div>

        {/* Output */}
        <div className="flex flex-col rounded-md border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border px-4 py-2">
            <h2 className="font-mono text-xs uppercase tracking-wider text-muted-foreground">output</h2>
            {result && <span className={`font-mono text-[10px] uppercase ${result.ok ? "text-primary" : "text-destructive"}`}>{result.ok ? "ok" : "error"} · {result.durationMs.toFixed(0)} ms</span>}
          </div>
          <div aria-live="polite" aria-busy={running} className="min-h-[26rem] flex-1 overflow-auto p-4 font-mono text-[13px] leading-6">
            {running && <p className="flex items-center gap-2 text-muted-foreground"><Loader2 className="size-4 animate-spin" aria-hidden="true" /> Running…</p>}
            {runError && <p role="alert" className="text-destructive">{runError}</p>}
            {!running && !runError && !result && <p className="text-muted-foreground">Run the code to see stdout here.</p>}
            {result && !hasOutput && <p className="text-muted-foreground">Finished with no output.</p>}
            {result?.stdout && <pre data-testid="python-stdout" className="whitespace-pre-wrap text-foreground">{result.stdout}</pre>}
            {result?.result && <pre className="mt-2 whitespace-pre-wrap text-primary">→ {result.result}</pre>}
            {result?.stderr && <pre role={result.ok ? undefined : "alert"} className="mt-2 whitespace-pre-wrap text-destructive">{result.stderr}</pre>}
          </div>
          <div className="flex items-center gap-2 border-t border-border px-4 py-3">
            <Button type="button" variant="outline" size="sm" onClick={save} disabled={!result}>
              {saved ? <Check className="size-4" aria-hidden="true" /> : <Save className="size-4" aria-hidden="true" />}
              {saved ? "Saved to history" : "Save to Experiment History"}
            </Button>
          </div>
        </div>
      </div>

      {/* Honest limitations */}
      <aside aria-label="Limitations" className="rounded-md border border-dashed border-border-strong bg-surface p-4 text-xs leading-6 text-muted-foreground">
        <p className="font-mono uppercase tracking-wider text-foreground">Limitations</p>
        <p className="mt-1">
          Code runs in a browser Pyodide runtime (CPython compiled to WebAssembly) inside an isolated Web Worker — not a server notebook.
          There is no unrestricted file, network or system access, only the Python standard library is loaded, execution is capped at 15 seconds,
          and state resets when the runtime reloads. Preset data is synthetic and seeded for reproducibility; it is not market data or investment advice.
        </p>
      </aside>
    </div>
  );
}
