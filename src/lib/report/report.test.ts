import { describe, expect, it } from "vitest";
import {
  buildReport,
  runSource,
  validateSettings,
  SOURCES,
  CORE_DISCLAIMER,
  NO_ADVANTAGE,
  NO_QML_CLAIM,
  NO_FIN_ADVICE,
  NO_LIVE_DATA,
  ReportInputError,
  type ReportModuleId,
  type Snapshot,
} from "./index";
import { renderReportPdf, pdfSafe } from "./pdf";

const AT = "2026-09-24T12:00:00.000Z";
// Fast settings so the whole matrix runs in seconds.
const FAST: Record<ReportModuleId, Record<string, string | number>> = {
  circuit: SOURCES.circuit.defaults,
  entanglement: SOURCES.entanglement.defaults,
  qaoa: { ...SOURCES.qaoa.defaults, restarts: 1, maxIter: 40 },
  vqe: { ...SOURCES.vqe.defaults, restarts: 1, maxIter: 60 },
  portfolio: { ...SOURCES.portfolio.defaults, assets: 4, p: 1 },
  qml: { ...SOURCES.qml.defaults, n: 24, maxIter: 20 },
  arena: { ...SOURCES.arena.defaults, presetId: "square", p: 1 },
  finance: { ...SOURCES.finance.defaults, assets: 4, p: 1 },
};
const IDS = Object.keys(SOURCES) as ReportModuleId[];
const snaps = new Map<ReportModuleId, Snapshot>();
const snap = async (id: ReportModuleId) => {
  if (!snaps.has(id)) snaps.set(id, await runSource(id, FAST[id]));
  return snaps.get(id)!;
};
const allText = (d: ReturnType<typeof buildReport>) => JSON.stringify(d);

describe("report generator", () => {
  it.each(IDS)(
    "builds a complete report for %s",
    async (id) => {
      const d = buildReport(await snap(id), AT);
      expect(d.moduleId).toBe(id);
      expect(d.generatedAt).toBe(AT);
      const heads = d.sections.map((s) => s.heading);
      for (const h of [
        "Experiment setup",
        "Methodology",
        "Results",
        "Interpretation",
        "Limitations",
        "Reproducibility",
      ])
        expect(heads).toContain(h);
      expect(d.summary.length).toBeGreaterThan(0);
      expect(allText(d)).not.toMatch(/NaN|undefined/);
    },
    30_000,
  );

  it("includes the core disclaimer plus module-specific integrity notes", async () => {
    for (const id of IDS) {
      const d = buildReport(await snap(id), AT);
      expect(d.disclaimers[0]).toBe(CORE_DISCLAIMER);
      expect(d.disclaimers).toContain(NO_ADVANTAGE);
    }
    expect(buildReport(await snap("qml"), AT).disclaimers).toContain(NO_QML_CLAIM);
    const pf = buildReport(await snap("portfolio"), AT).disclaimers;
    expect(pf).toContain(NO_FIN_ADVICE);
    expect(pf).toContain(NO_LIVE_DATA);
  }, 30_000);

  it("is deterministic: same settings + seed → identical report and seed is recorded", async () => {
    for (const id of ["circuit", "qaoa", "qml"] as const) {
      const a = buildReport(await runSource(id, FAST[id]), AT),
        b = buildReport(await runSource(id, FAST[id]), AT);
      const strip = (x: unknown) => JSON.stringify(x).replace(/"Time \(ms\)".*?\]/g, "");
      expect(strip(a)).toBe(strip(b));
      const repro = a.sections.find((s) => s.heading === "Reproducibility")!;
      expect(JSON.stringify(repro)).toContain(String(FAST[id]["seed"]));
    }
  }, 30_000);

  it("handles missing optional data gracefully", async () => {
    const q = structuredClone(await snap("qaoa")) as Extract<Snapshot, { kind: "qaoa" }>;
    q.result.history = [];
    q.result.top = [];
    const d = buildReport(q, AT);
    expect(allText(d)).toContain("Convergence history not provided");
    const c = structuredClone(await snap("circuit")) as Extract<Snapshot, { kind: "circuit" }>;
    c.counts = [];
    expect(allText(buildReport(c, AT))).toContain("Shot counts were not provided");
    const e = structuredClone(await snap("entanglement")) as Extract<
      Snapshot,
      { kind: "entanglement" }
    >;
    e.zzProbs = [];
    e.correlations = [];
    expect(() => buildReport(e, AT)).not.toThrow();
  });

  it("rejects invalid or incomplete experiment input cleanly", async () => {
    expect(() => buildReport(null, AT)).toThrow(ReportInputError);
    expect(() => buildReport({ kind: "nope" } as unknown as Snapshot, AT)).toThrow(/Unsupported/);
    const v = structuredClone(await snap("vqe")) as Extract<Snapshot, { kind: "vqe" }>;
    v.result.energy = NaN;
    expect(() => buildReport(v, AT)).toThrow(ReportInputError);
    const q = structuredClone(await snap("qaoa")) as Extract<Snapshot, { kind: "qaoa" }>;
    q.result.gammas = [];
    expect(() => buildReport(q, AT)).toThrow(/angles/);
    expect(() =>
      buildReport(
        { kind: "arena", presetId: "x", result: { results: [] } } as unknown as Snapshot,
        AT,
      ),
    ).toThrow(ReportInputError);
    expect(validateSettings("qaoa", { ...FAST.qaoa, p: 9 })).not.toHaveLength(0);
    expect(validateSettings("portfolio", { ...FAST.portfolio, k: 4 })).toContain(
      "Select K must be smaller than the number of assets.",
    );
    expect(validateSettings("circuit", { ...FAST.circuit, exampleId: "evil" })).not.toHaveLength(0);
    await expect(runSource("qml", { ...FAST.qml, n: 3 })).rejects.toThrow(RangeError);
  });

  it("creates a valid PDF for every module, fully client-side", async () => {
    for (const id of IDS) {
      const pdf = renderReportPdf(buildReport(await snap(id), AT));
      const bytes = new Uint8Array(pdf.output("arraybuffer"));
      expect(new TextDecoder().decode(bytes.slice(0, 5))).toBe("%PDF-");
      expect(pdf.getNumberOfPages()).toBeGreaterThanOrEqual(2);
      expect(bytes.length).toBeGreaterThan(3000);
    }
  }, 30_000);

  it("transliterates symbols unsupported by built-in PDF fonts", () => {
    expect(pdfSafe("⟨C⟩ ≤ 2√2, γ β")).toBe("<C> <= 2sqrt2, gamma beta");
    expect(pdfSafe("Ideal — ok")).toBe("Ideal — ok");
  });
});
