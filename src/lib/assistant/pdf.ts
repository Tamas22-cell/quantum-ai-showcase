import { jsPDF } from "jspdf";

export type AssistantResearchReport = {
  topic: string;
  answer: string;
  sources: Array<{ title: string; url: string }>;
  generatedAt: string;
};

const NAVY: [number, number, number] = [8, 17, 36];
const CYAN: [number, number, number] = [34, 190, 220];
const INK: [number, number, number] = [22, 30, 46];
const MUTED: [number, number, number] = [96, 108, 128];
const RULE: [number, number, number] = [214, 222, 232];

const MAP: Record<string, string> = {
  "⟨": "<", "⟩": ">", "γ": "gamma", "β": "beta", "θ": "theta", "ψ": "psi",
  "Ψ": "Psi", "Φ": "Phi", "π": "pi", "μ": "mu", "Σ": "Sum", "Π": "Prod",
  "√": "sqrt", "≤": "<=", "≥": ">=", "≈": "~", "−": "-", "⊗": "(x)",
  "₀": "0", "₂": "2", "ᵀ": "^T", "′": "'", "†": "^dag", "→": "->",
  "∈": " in ", "½": "1/2", "⁺": "+", "⁻": "-", "ψ⁺": "psi+",
};

function pdfSafe(text: string): string {
  let out = "";
  for (const ch of text) {
    if (MAP[ch] !== undefined) out += MAP[ch];
    else if (ch.charCodeAt(0) <= 0xff || "–—•…’“”".includes(ch)) out += ch;
    else out += "?";
  }
  return out;
}

function safeFilename(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70)
    .toLowerCase() || "research-report";
}

function addWrappedText(
  pdf: jsPDF,
  text: string,
  x: number,
  y: number,
  width: number,
  fontSize: number,
  lineHeight: number,
  bottom: number,
  newPage: () => number,
): number {
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(fontSize);
  pdf.setTextColor(...INK);

  const lines = pdf.splitTextToSize(pdfSafe(text), width) as string[];
  for (const line of lines) {
    if (y + lineHeight > bottom) y = newPage();
    pdf.text(line, x, y);
    y += lineHeight;
  }
  return y;
}

export function exportAssistantResearchReport(report: AssistantResearchReport): void {
  const pdf = new jsPDF({ unit: "pt", format: "a4", compress: true });
  const W = pdf.internal.pageSize.getWidth();
  const H = pdf.internal.pageSize.getHeight();
  const M = 50;
  const CW = W - 2 * M;
  const BOTTOM = H - 58;
  let y = 0;

  const newPage = () => {
    pdf.addPage();
    y = M + 8;
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7);
    pdf.setTextColor(...MUTED);
    pdf.text("Quantum AI Lab — Research Report", M, 30);
    pdf.setDrawColor(...RULE);
    pdf.setLineWidth(0.3);
    pdf.line(M, 36, W - M, 36);
    return y;
  };

  // Cover/header
  pdf.setFillColor(...NAVY);
  pdf.rect(0, 0, W, 180, "F");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  pdf.setTextColor(...CYAN);
  pdf.text("QUANTUM AI LAB  /  RESEARCH REPORT", M, 58);

  pdf.setFontSize(23);
  pdf.setTextColor(240, 246, 252);
  const titleLines = pdf.splitTextToSize(pdfSafe(report.topic), CW - 30) as string[];
  let titleY = 98;
  for (const line of titleLines.slice(0, 4)) {
    pdf.text(line, M, titleY);
    titleY += 29;
  }

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(170, 190, 210);
  pdf.text(
    `Generated ${report.generatedAt.replace("T", " ").replace(/\.\d+Z$/, " UTC").replace(/Z$/, " UTC")}`,
    M,
    154,
  );

  y = 215;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(13);
  pdf.setTextColor(...NAVY);
  pdf.text("Research question", M, y);
  y += 18;
  y = addWrappedText(pdf, report.topic, M, y, CW, 10, 14, BOTTOM, newPage);
  y += 18;

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(13);
  pdf.setTextColor(...NAVY);
  pdf.text("Research findings", M, y);
  y += 18;

  const paragraphs = report.answer
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter(Boolean);

  for (const paragraph of paragraphs) {
    y = addWrappedText(pdf, paragraph, M, y, CW, 9.5, 13.5, BOTTOM, newPage);
    y += 7;
  }

  if (report.sources.length) {
    if (y + 70 > BOTTOM) y = newPage();
    y += 8;
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(13);
    pdf.setTextColor(...NAVY);
    pdf.text("Sources", M, y);
    y += 20;

    report.sources.forEach((source, index) => {
      const title = `${index + 1}. ${pdfSafe(source.title)}`;
      const lines = pdf.splitTextToSize(title, CW - 12) as string[];
      const blockHeight = Math.max(18, lines.length * 12 + 6);
      if (y + blockHeight > BOTTOM) y = newPage();

      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8.5);
      pdf.setTextColor(...CYAN);
      pdf.text(lines, M, y);
      pdf.link(M, y - 9, Math.min(CW, Math.max(100, pdf.getTextWidth(lines[0]) + 8)), blockHeight, { url: source.url });
      y += blockHeight;
    });
  }

  const pages = pdf.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    pdf.setPage(page);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(7);
    pdf.setTextColor(...MUTED);
    pdf.text("Quantum AI Lab — AI Research Assistant", M, H - 28);
    pdf.text(`${page} / ${pages}`, W - M, H - 28, { align: "right" });
  }

  const filename = `quantum-ai-lab_${safeFilename(report.topic)}_${report.generatedAt.slice(0, 10)}.pdf`;
  pdf.save(filename);
}
