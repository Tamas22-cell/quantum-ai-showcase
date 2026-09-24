/**
 * Client-side PDF renderer (jsPDF). Converts a ReportDoc into a styled A4 PDF entirely in the browser —
 * no network calls, no upload. Charts are redrawn as vector graphics from the same experiment data.
 */
import { jsPDF } from "jspdf";
import type { Block, ReportDoc } from "./types";

// Brand palette (RGB) — dark navy cover, cyan/emerald accents, clean white body for print.
const NAVY: [number, number, number] = [8, 17, 36];
const CYAN: [number, number, number] = [34, 190, 220];
const EMERALD: [number, number, number] = [30, 180, 130];
const AMBER: [number, number, number] = [220, 150, 40];
const INK: [number, number, number] = [22, 30, 46];
const MUTED: [number, number, number] = [96, 108, 128];
const RULE: [number, number, number] = [214, 222, 232];
const SERIES: [number, number, number][] = [CYAN, EMERALD, AMBER, [150, 110, 220], [220, 90, 110], [90, 130, 220]];

const MAP: Record<string, string> = {
  "⟨": "<", "⟩": ">", "γ": "gamma", "β": "beta", "θ": "theta", "ψ": "psi", "Ψ": "Psi", "Φ": "Phi", "π": "pi", "μ": "mu", "Σ": "Sum", "Π": "Prod",
  "√": "sqrt", "≤": "<=", "≥": ">=", "≈": "~", "−": "-", "⊗": "(x)", "₀": "0", "₂": "2", "ᵀ": "^T", "′": "'", "†": "^dag", "→": "->", "∈": " in ", "≥0": ">=0", "½": "1/2", "⁺": "+", "⁻": "-", "ψ⁺": "psi+",
};
/** Built-in PDF fonts only cover WinAnsi; transliterate scientific symbols so nothing renders as garbage. */
export function pdfSafe(t: string): string {
  let out = "";
  for (const ch of t) {
    if (MAP[ch] !== undefined) out += MAP[ch];
    else if (ch.charCodeAt(0) <= 0xff || "–—•…’“”".includes(ch)) out += ch;
    else out += "?";
  }
  return out;
}

export type PdfOptions = { onProgress?: (f: number) => void };

export function renderReportPdf(doc: ReportDoc, opts: PdfOptions = {}): jsPDF {
  const pdf = new jsPDF({ unit: "pt", format: "a4", compress: true });
  pdf.setProperties({ title: pdfSafe(doc.title), subject: pdfSafe(doc.moduleName), creator: "Quantum AI Lab — Research Report Generator", author: "Quantum AI Lab" });
  const W = pdf.internal.pageSize.getWidth(), H = pdf.internal.pageSize.getHeight();
  const M = 50, CW = W - 2 * M, BOTTOM = H - 56;
  let y = 0;

  const color = (c: [number, number, number], kind: "text" | "fill" | "draw" = "text") => (kind === "text" ? pdf.setTextColor(...c) : kind === "fill" ? pdf.setFillColor(...c) : pdf.setDrawColor(...c));
  const font = (size: number, style: "normal" | "bold" | "italic" = "normal", family: "helvetica" | "courier" = "helvetica") => { pdf.setFont(family, style); pdf.setFontSize(size); };
  const newPage = () => { pdf.addPage(); y = M; };
  const ensure = (h: number) => { if (y + h > BOTTOM) newPage(); };
  const lines = (t: string, w: number) => pdf.splitTextToSize(pdfSafe(t), w) as string[];
  const para = (t: string, size = 9.5, c = INK, style: "normal" | "bold" | "italic" = "normal", indent = 0) => {
    font(size, style); color(c);
    const ls = lines(t, CW - indent), lh = size * 1.4;
    for (const l of ls) { ensure(lh); pdf.text(l, M + indent, y + size); y += lh; }
  };

  // ---------------- Cover
  color(NAVY, "fill"); pdf.rect(0, 0, W, 300, "F");
  color(CYAN, "draw"); pdf.setLineWidth(0.4);
  for (let i = 0; i < 14; i++) { const x = W - 40 - i * 17; pdf.circle(x, 60 + ((i * 37) % 180), 1.6, "S"); if (i) pdf.line(x, 60 + ((i * 37) % 180), x + 17, 60 + (((i - 1) * 37) % 180)); }
  font(9, "bold"); color(CYAN); pdf.text("QUANTUM AI LAB  /  RESEARCH REPORT", M, 70);
  font(24, "bold"); pdf.setTextColor(240, 246, 252);
  let cy = 120; for (const l of lines(doc.moduleName, CW - 60)) { pdf.text(l, M, cy); cy += 30; }
  font(11); pdf.setTextColor(170, 190, 210); pdf.text("Experiment report", M, cy + 4);
  font(9); pdf.text(`Generated ${pdfSafe(doc.generatedAt.replace("T", " ").replace(/\.\d+Z$/, " UTC").replace(/Z$/, " UTC"))}`, M, 262);
  pdf.text(`Module ID: ${doc.moduleId}`, M, 276);
  y = 330;
  // Disclaimer box
  const dl = doc.disclaimers.flatMap((d) => lines(`• ${d}`, CW - 24));
  const boxH = 30 + dl.length * 13;
  color([255, 247, 232], "fill"); color(AMBER, "draw"); pdf.setLineWidth(0.8); pdf.roundedRect(M, y, CW, boxH, 4, 4, "FD");
  font(9, "bold"); color([150, 90, 10]); pdf.text("SCIENTIFIC INTEGRITY NOTICE", M + 12, y + 18);
  font(9); color(INK); dl.forEach((l, i) => pdf.text(l, M + 12, y + 34 + i * 13));
  y += boxH + 26;
  // Executive summary
  font(13, "bold"); color(NAVY); pdf.text("Executive summary", M, y); y += 8; color(CYAN, "fill"); pdf.rect(M, y, 34, 2, "F"); y += 14;
  for (const s of doc.summary) para(`• ${s}`, 10);

  // ---------------- Blocks
  const kv = (rows: [string, string][]) => {
    for (const [k, v] of rows) {
      font(9, "bold"); const kl = lines(k, 150); font(9); const vl = lines(v, CW - 165);
      const h = Math.max(kl.length, vl.length) * 12.5 + 4; ensure(h);
      font(9, "bold"); color(MUTED); pdf.text(kl, M, y + 9);
      font(9); color(INK); pdf.text(vl, M + 160, y + 9);
      color(RULE, "draw"); pdf.setLineWidth(0.3); pdf.line(M, y + h - 1, M + CW, y + h - 1); y += h;
    }
    y += 6;
  };
  const table = (b: Extract<Block, { type: "table" }>) => {
    if (b.caption) { ensure(30); para(b.caption, 8.5, MUTED, "italic"); }
    const cols = b.head.length, cw = CW / cols;
    const row = (cells: string[], head: boolean) => {
      font(8.5, head ? "bold" : "normal");
      const cl = cells.map((c) => lines(c, cw - 8));
      const h = Math.max(...cl.map((l) => l.length)) * 11 + 6;
      ensure(h);
      if (head) { color([232, 246, 250], "fill"); pdf.rect(M, y, CW, h, "F"); }
      color(head ? NAVY : INK); cl.forEach((l, i) => pdf.text(l, M + i * cw + 4, y + 11));
      color(RULE, "draw"); pdf.setLineWidth(0.3); pdf.line(M, y + h, M + CW, y + h); y += h;
    };
    row(b.head, true); b.rows.forEach((r) => row(r, false)); y += 10;
  };
  const bar = (b: Extract<Block, { type: "bar" }>) => {
    const vals = b.values.filter(Number.isFinite);
    if (!vals.length) { para("(chart omitted — no finite values)", 8.5, MUTED, "italic"); return; }
    const h = 150; ensure(h + 40); para(b.caption, 8.5, MUTED, "italic");
    const x0 = M + 36, w = CW - 40, top = y + 6, base = top + h - 30, max = Math.max(...vals, 1e-12);
    color(RULE, "draw"); pdf.setLineWidth(0.4); pdf.line(x0, base, x0 + w, base); pdf.line(x0, top, x0, base);
    font(7); color(MUTED); pdf.text(max.toPrecision(3), x0 - 4, top + 6, { align: "right" }); pdf.text("0", x0 - 4, base, { align: "right" });
    const n = b.values.length, slot = w / n, bw = Math.min(28, slot * 0.7);
    b.values.forEach((v, i) => {
      const bh = Number.isFinite(v) ? ((base - top) * Math.max(0, v)) / max : 0, bx = x0 + i * slot + (slot - bw) / 2;
      color(b.highlight?.includes(i) ? EMERALD : CYAN, "fill"); pdf.rect(bx, base - bh, bw, bh, "F");
      font(6.5); color(INK); const lbl = pdfSafe(b.labels[i] ?? ""); const short = lbl.length > 14 ? `${lbl.slice(0, 13)}…` : lbl;
      if (n > 8) pdf.text(short, bx + bw / 2, base + 6, { angle: -45 }); else pdf.text(short, bx + bw / 2, base + 10, { align: "center" });
    });
    y = top + h + 8;
  };
  const line = (b: Extract<Block, { type: "line" }>) => {
    const pts = b.series.flatMap((s) => s.points).filter(([a, c]) => Number.isFinite(a) && Number.isFinite(c));
    if (pts.length < 2) { para("(chart omitted — insufficient data)", 8.5, MUTED, "italic"); return; }
    const h = 170; ensure(h + 30); para(b.caption, 8.5, MUTED, "italic");
    const x0 = M + 44, w = CW - 50, top = y + 6, base = top + h - 36;
    let ys = pts.map((p) => p[1]); if (b.reference && Number.isFinite(b.reference.y)) ys = [...ys, b.reference.y];
    const xmin = Math.min(...pts.map((p) => p[0])), xmax = Math.max(...pts.map((p) => p[0])) || 1;
    let ymin = Math.min(...ys), ymax = Math.max(...ys); if (ymax - ymin < 1e-12) { ymin -= 0.5; ymax += 0.5; }
    const X = (v: number) => x0 + ((v - xmin) / (xmax - xmin || 1)) * w, Y = (v: number) => base - ((v - ymin) / (ymax - ymin)) * (base - top);
    color(RULE, "draw"); pdf.setLineWidth(0.4); pdf.line(x0, base, x0 + w, base); pdf.line(x0, top, x0, base);
    font(7); color(MUTED);
    pdf.text(ymax.toPrecision(4), x0 - 4, top + 4, { align: "right" }); pdf.text(ymin.toPrecision(4), x0 - 4, base, { align: "right" });
    pdf.text(String(xmin), x0, base + 10); pdf.text(String(xmax), x0 + w, base + 10, { align: "right" });
    pdf.text(pdfSafe(b.xLabel), x0 + w / 2, base + 10, { align: "center" });
    if (b.reference && Number.isFinite(b.reference.y)) {
      color(AMBER, "draw"); pdf.setLineDashPattern([3, 2], 0); pdf.line(x0, Y(b.reference.y), x0 + w, Y(b.reference.y)); pdf.setLineDashPattern([], 0);
      color(AMBER); pdf.text(pdfSafe(b.reference.label), x0 + w - 2, Y(b.reference.y) - 3, { align: "right" });
    }
    b.series.forEach((s, si) => {
      const c = SERIES[si % SERIES.length]!; color(c, "draw"); pdf.setLineWidth(1.1);
      const ps = s.points.filter(([a, v]) => Number.isFinite(a) && Number.isFinite(v));
      // Downsample very long histories to keep the PDF small.
      const step = Math.max(1, Math.floor(ps.length / 400));
      for (let i = step; i < ps.length; i += step) pdf.line(X(ps[i - step]![0]), Y(ps[i - step]![1]), X(ps[i]![0]), Y(ps[i]![1]));
      color(c); pdf.text(pdfSafe(s.name), x0 + 6 + si * 110, base + 24);
      color(c, "fill"); pdf.rect(x0 + si * 110, base + 20, 4, 4, "F");
    });
    y = top + h + 6;
  };

  const total = doc.sections.length;
  doc.sections.forEach((sec, si) => {
    ensure(140); y += 12;
    font(13, "bold"); color(NAVY); pdf.text(pdfSafe(sec.heading), M, y + 4); y += 12; color(CYAN, "fill"); pdf.rect(M, y, 34, 2, "F"); y += 14;
    for (const b of sec.blocks) {
      switch (b.type) {
        case "paragraph": para(b.text, 9.5); y += 4; break;
        case "bullets": b.items.forEach((it) => para(`• ${it}`, 9.5, INK, "normal", 6)); y += 4; break;
        case "kv": kv(b.rows); break;
        case "table": table(b); break;
        case "bar": bar(b); break;
        case "line": line(b); break;
        case "notice": para(b.text, 9, MUTED, "italic"); y += 4; break;
      }
    }
    opts.onProgress?.((si + 1) / total);
  });

  // ---------------- Header/footer on every page after the cover
  const pages = pdf.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    pdf.setPage(p);
    font(7); color(MUTED);
    pdf.text(pdfSafe("Ideal noiseless classical statevector simulation — not quantum hardware."), M, H - 28);
    pdf.text(`${p} / ${pages}`, W - M, H - 28, { align: "right" });
    if (p > 1) { pdf.text(pdfSafe(doc.moduleName), M, 30); color(RULE, "draw"); pdf.setLineWidth(0.3); pdf.line(M, 36, W - M, 36); }
  }
  return pdf;
}

/** Render and return a Blob (for download). */
export function reportToBlob(doc: ReportDoc, opts?: PdfOptions): Blob {
  return renderReportPdf(doc, opts).output("blob");
}

export function reportFilename(doc: ReportDoc) {
  return `quantum-ai-lab_${doc.moduleId}_${doc.generatedAt.replace(/[:.]/g, "-").slice(0, 19)}.pdf`;
}
