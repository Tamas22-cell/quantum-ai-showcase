import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Camera, Check, Clipboard, Download, ExternalLink } from "lucide-react";

import { LabShell } from "@/components/lab/lab-shell";
import { Button } from "@/components/ui/button";
import { getExperimentHistory, type ExperimentSnapshot } from "@/lib/experiment-history";

export const Route = createFileRoute("/lab/snapshot")({
  head: () => ({
    meta: [
      { title: "Generate Research Snapshot — Quantum AI Lab" },
      {
        name: "description",
        content: "Turn a saved quantum experiment into a shareable research snapshot image.",
      },
      { property: "og:title", content: "Generate Research Snapshot — Quantum AI Lab" },
      {
        property: "og:description",
        content:
          "Create a client-side PNG research card from a saved QAOA, VQE or portfolio experiment.",
      },
      { property: "og:type", content: "website" },
    ],
  }),
  component: Page,
});

const W = 1400;
const H = 900;

function truncate(value: string, max = 74) {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

function snapshotText(item: ExperimentSnapshot) {
  const fields = Object.entries(item.fields)
    .slice(0, 10)
    .map(([k, v]) => `${k}: ${String(v)}`)
    .join("\n");
  return [
    "Quantum AI Lab — Research Snapshot",
    `Module: ${item.module}`,
    `Captured: ${new Date(item.createdAt).toLocaleString()}`,
    fields,
    item.summary ? `Summary: ${item.summary}` : "",
    "Generated client-side. Educational research simulation; not investment advice.",
  ]
    .filter(Boolean)
    .join("\n");
}

function drawCard(canvas: HTMLCanvasElement, item: ExperimentSnapshot) {
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const gradient = ctx.createLinearGradient(0, 0, W, H);
  gradient.addColorStop(0, "#07111f");
  gradient.addColorStop(0.55, "#0b1628");
  gradient.addColorStop(1, "#08101b");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = "rgba(62, 210, 255, 0.32)";
  ctx.lineWidth = 2;
  ctx.strokeRect(52, 52, W - 104, H - 104);

  ctx.fillStyle = "#62ddff";
  ctx.font = "600 24px ui-monospace, SFMono-Regular, Menlo, monospace";
  ctx.fillText("QUANTUM AI LAB / RESEARCH SNAPSHOT", 92, 112);

  ctx.fillStyle = "#f4f8ff";
  ctx.font = "700 50px Inter, ui-sans-serif, system-ui, sans-serif";
  ctx.fillText(truncate(item.module, 44), 92, 185);

  ctx.fillStyle = "#9fb2c8";
  ctx.font = "500 21px Inter, ui-sans-serif, system-ui, sans-serif";
  ctx.fillText(new Date(item.createdAt).toLocaleString(), 92, 226);

  const entries = Object.entries(item.fields).slice(0, 10);
  const cardW = 380;
  const cardH = 104;
  const gapX = 24;
  const gapY = 22;
  entries.forEach(([key, value], index) => {
    const col = index % 3;
    const row = Math.floor(index / 3);
    const x = 92 + col * (cardW + gapX);
    const y = 282 + row * (cardH + gapY);
    ctx.fillStyle = "rgba(255,255,255,0.035)";
    ctx.fillRect(x, y, cardW, cardH);
    ctx.strokeStyle = "rgba(255,255,255,0.10)";
    ctx.strokeRect(x, y, cardW, cardH);
    ctx.fillStyle = "#7f93a9";
    ctx.font = "600 15px ui-monospace, SFMono-Regular, Menlo, monospace";
    ctx.fillText(truncate(key.toUpperCase(), 33), x + 18, y + 30);
    ctx.fillStyle = "#e9f2ff";
    ctx.font = "600 20px ui-monospace, SFMono-Regular, Menlo, monospace";
    ctx.fillText(truncate(String(value), 29), x + 18, y + 68);
  });

  const summaryY = 282 + Math.ceil(Math.max(entries.length, 1) / 3) * (cardH + gapY) + 10;
  ctx.fillStyle = "#7f93a9";
  ctx.font = "600 15px ui-monospace, SFMono-Regular, Menlo, monospace";
  ctx.fillText("CAPTURED PAGE SUMMARY", 92, summaryY);
  ctx.fillStyle = "#d6e1ef";
  ctx.font = "500 19px Inter, ui-sans-serif, system-ui, sans-serif";
  const words = item.summary.replace(/\s+/g, " ").trim().split(" ");
  let line = "";
  let y = summaryY + 36;
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > 1160) {
      ctx.fillText(truncate(line, 120), 92, y);
      y += 30;
      line = word;
      if (y > 790) break;
    } else line = next;
  }
  if (line && y <= 790) ctx.fillText(truncate(line, 120), 92, y);

  ctx.fillStyle = "#62ddff";
  ctx.font = "600 16px ui-monospace, SFMono-Regular, Menlo, monospace";
  ctx.fillText("quantum-ai-showcase.vercel.app", 92, 838);
  ctx.fillStyle = "#73879d";
  ctx.textAlign = "right";
  ctx.fillText(
    "Client-side research simulation · reproducible from saved experiment data",
    W - 92,
    838,
  );
  ctx.textAlign = "left";
}

function Page() {
  const [items, setItems] = useState<ExperimentSnapshot[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const refresh = () => {
      const next = getExperimentHistory();
      setItems(next);
      setSelectedId((current) =>
        current && next.some((x) => x.id === current) ? current : (next[0]?.id ?? ""),
      );
    };
    refresh();
    window.addEventListener("experiment-history-changed", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("experiment-history-changed", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const selected = useMemo(
    () => items.find((x) => x.id === selectedId) ?? null,
    [items, selectedId],
  );

  useEffect(() => {
    if (selected && canvasRef.current) drawCard(canvasRef.current, selected);
  }, [selected]);

  const downloadPng = () => {
    if (!selected || !canvasRef.current) return;
    drawCard(canvasRef.current, selected);
    const link = document.createElement("a");
    const safeModule = selected.module
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    link.download = `quantum-ai-research-snapshot-${safeModule || "experiment"}.png`;
    link.href = canvasRef.current.toDataURL("image/png");
    link.click();
  };

  const copyText = async () => {
    if (!selected) return;
    await navigator.clipboard.writeText(snapshotText(selected));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <LabShell crumb="Snapshot">
      <div className="mb-8 max-w-3xl">
        <span className="font-mono text-xs text-primary">COMMAND CENTER / C8</span>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
          Generate Research Snapshot
        </h1>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          Select a saved experiment and generate a branded PNG research card entirely in your
          browser. No upload, API key or paid service is required.
        </p>
      </div>

      {!items.length ? (
        <div className="rounded-md border border-dashed border-border-strong bg-card/50 p-8 text-sm text-muted-foreground">
          No saved experiments yet. Run QAOA, VQE or Portfolio Lab first, save the experiment, then
          return here.{" "}
          <Link to="/lab/history" className="ml-1 text-primary underline underline-offset-4">
            Open Experiment History
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
          <section className="rounded-md border border-border bg-card p-5">
            <label
              className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground"
              htmlFor="snapshot-run"
            >
              Saved experiment
            </label>
            <select
              id="snapshot-run"
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="mt-2 w-full rounded-sm border border-border bg-surface px-3 py-2 text-sm text-foreground"
            >
              {items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.module} — {new Date(item.createdAt).toLocaleString()}
                </option>
              ))}
            </select>

            {selected && (
              <div className="mt-5 space-y-3">
                <div className="rounded-sm border border-border bg-surface p-3">
                  <div className="font-mono text-[9px] uppercase text-muted-foreground">Module</div>
                  <div className="mt-1 text-sm font-medium text-foreground">{selected.module}</div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(selected.fields)
                    .slice(0, 6)
                    .map(([k, v]) => (
                      <div key={k} className="rounded-sm border border-border bg-surface p-2">
                        <div className="truncate font-mono text-[9px] uppercase text-muted-foreground">
                          {k}
                        </div>
                        <div
                          className="mt-1 truncate font-mono text-xs text-foreground"
                          title={String(v)}
                        >
                          {String(v)}
                        </div>
                      </div>
                    ))}
                </div>
                <div className="flex flex-wrap gap-2 pt-2">
                  <Button type="button" onClick={downloadPng}>
                    <Download className="size-4" />
                    Download PNG
                  </Button>
                  <Button type="button" variant="outline" onClick={copyText}>
                    {copied ? <Check className="size-4" /> : <Clipboard className="size-4" />}
                    {copied ? "Copied" : "Copy summary"}
                  </Button>
                </div>
                <Link
                  to={selected.route as never}
                  className="inline-flex items-center gap-1 font-mono text-xs text-primary hover:underline"
                >
                  Open source lab <ExternalLink className="size-3.5" />
                </Link>
              </div>
            )}
          </section>

          <section className="rounded-md border border-border bg-card p-4 sm:p-5">
            <div className="mb-3 flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
              <Camera className="size-4" />
              PNG preview · 1400 × 900
            </div>
            <div className="overflow-hidden rounded-sm border border-border bg-black/20">
              <canvas
                ref={canvasRef}
                className="block h-auto w-full"
                aria-label="Research snapshot preview"
              />
            </div>
            <p className="mt-3 text-xs leading-5 text-muted-foreground">
              The image is generated locally from the experiment data already stored in your
              browser. It does not claim quantum advantage and does not upload results anywhere.
            </p>
          </section>
        </div>
      )}
    </LabShell>
  );
}
