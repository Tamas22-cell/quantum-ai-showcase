/**
 * Browser-only Pyodide runner. Python executes inside a dedicated Web Worker so
 * the UI stays responsive and a runaway script can be terminated (Stop / timeout).
 * The runtime (~10 MB) is fetched from the public jsDelivr CDN only when this
 * module is used, i.e. only on /lab/python. No server, no paid service.
 */
export const PYODIDE_VERSION = "0.26.4";
const INDEX_URL = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;

export type RunResult = { ok: boolean; stdout: string; stderr: string; result: string | null; durationMs: number };

// Worker source kept inline (Blob URL) so no extra build config is required.
const WORKER_SOURCE = `
importScripts("${INDEX_URL}pyodide.js");
let py = null;
const ready = (async () => {
  py = await loadPyodide({ indexURL: "${INDEX_URL}" });
  // Defence in depth: this is still a sandboxed browser worker, but block the
  // most obvious escape hatches so presets & user code stay self-contained.
  await py.runPythonAsync("import sys\\nsys.modules['js'] = None\\nsys.modules['pyodide.http'] = None");
})();
self.onmessage = async (e) => {
  const { id, code } = e.data;
  try { await ready; } catch (err) { self.postMessage({ id, type: "init-error", error: String(err) }); return; }
  if (code === null) { self.postMessage({ id, type: "ready" }); return; }
  const out = []; const errs = [];
  py.setStdout({ batched: (s) => out.push(s) });
  py.setStderr({ batched: (s) => errs.push(s) });
  const t0 = performance.now();
  try {
    const value = await py.runPythonAsync(code);
    let result = null;
    if (value !== undefined && value !== null) { result = String(value); if (value && value.destroy) value.destroy(); }
    self.postMessage({ id, type: "done", ok: true, stdout: out.join("\\n"), stderr: errs.join("\\n"), result, durationMs: performance.now() - t0 });
  } catch (err) {
    errs.push(String(err && err.message ? err.message : err));
    self.postMessage({ id, type: "done", ok: false, stdout: out.join("\\n"), stderr: errs.join("\\n"), result: null, durationMs: performance.now() - t0 });
  }
};
`;

export class PyodideRunner {
  private worker: Worker | null = null;
  private seq = 0;
  private pending = new Map<number, { resolve: (v: RunResult) => void; reject: (e: Error) => void }>();
  private readyPromise: Promise<void> | null = null;

  /** Start (or reuse) the worker and resolve once Pyodide has booted. */
  init(): Promise<void> {
    if (this.readyPromise) return this.readyPromise;
    const url = URL.createObjectURL(new Blob([WORKER_SOURCE], { type: "text/javascript" }));
    const worker = new Worker(url);
    URL.revokeObjectURL(url);
    this.worker = worker;
    this.readyPromise = new Promise<void>((resolve, reject) => {
      const id = ++this.seq;
      const onMsg = (e: MessageEvent) => {
        if (e.data?.id !== id) return;
        worker.removeEventListener("message", onMsg);
        if (e.data.type === "ready") resolve();
        else reject(new Error(e.data.error ?? "Python runtime failed to load"));
      };
      worker.addEventListener("message", onMsg);
      worker.addEventListener("error", (e) => reject(new Error(e.message || "Python runtime failed to load (network blocked?)")));
      worker.postMessage({ id, code: null });
    });
    worker.addEventListener("message", (e) => {
      const p = this.pending.get(e.data?.id);
      if (!p || e.data.type !== "done") return;
      this.pending.delete(e.data.id);
      const { ok, stdout, stderr, result, durationMs } = e.data;
      p.resolve({ ok, stdout, stderr, result, durationMs });
    });
    return this.readyPromise;
  }

  async run(code: string, timeoutMs = 15000): Promise<RunResult> {
    await this.init();
    const id = ++this.seq;
    return new Promise<RunResult>((resolve, reject) => {
      const timer = window.setTimeout(() => {
        this.pending.delete(id);
        this.terminate();
        reject(new Error(`Execution exceeded ${timeoutMs / 1000}s and was stopped. The runtime will reload.`));
      }, timeoutMs);
      this.pending.set(id, {
        resolve: (v) => { window.clearTimeout(timer); resolve(v); },
        reject: (e) => { window.clearTimeout(timer); reject(e); },
      });
      this.worker!.postMessage({ id, code });
    });
  }

  /** Kill the worker (stops any running code). Next init() boots a fresh runtime. */
  terminate() {
    this.worker?.terminate();
    this.worker = null;
    this.readyPromise = null;
    this.pending.forEach((p) => p.reject(new Error("Execution stopped.")));
    this.pending.clear();
  }
}
