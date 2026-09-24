/** Renderer-agnostic report document model. Builders produce it; the PDF renderer consumes it. */
export type ReportModuleId = "circuit" | "entanglement" | "qaoa" | "vqe" | "portfolio" | "qml" | "arena";

export type Block =
  | { type: "paragraph"; text: string }
  | { type: "bullets"; items: string[] }
  | { type: "kv"; rows: [string, string][] }
  | { type: "table"; caption?: string; head: string[]; rows: string[][] }
  | { type: "bar"; caption: string; labels: string[]; values: number[]; highlight?: number[] }
  | { type: "line"; caption: string; xLabel: string; yLabel: string; series: { name: string; points: [number, number][] }[]; reference?: { label: string; y: number } }
  | { type: "notice"; text: string };

export type Section = { heading: string; blocks: Block[] };

export type ReportDoc = {
  title: string;
  moduleId: ReportModuleId;
  moduleName: string;
  generatedAt: string; // ISO timestamp
  disclaimers: string[];
  summary: string[];
  sections: Section[];
};

export const CORE_DISCLAIMER = "Ideal noiseless classical statevector simulation — not quantum hardware.";
export const NO_ADVANTAGE = "No claim of quantum advantage is made or implied.";
export const NO_QML_CLAIM = "No claim that the quantum ML model outperforms classical machine learning.";
export const NO_FIN_ADVICE = "Not financial advice. Educational demonstration only.";
export const NO_LIVE_DATA = "No live market data: inputs are synthetic (seeded) — no market-data provider is connected.";

/** Thrown when an experiment snapshot is incomplete or malformed. */
export class ReportInputError extends Error {
  constructor(message: string) { super(message); this.name = "ReportInputError"; }
}
