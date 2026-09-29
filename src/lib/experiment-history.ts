export type ExperimentSnapshot = {
  id: string;
  module: string;
  route: string;
  createdAt: string;
  fields: Record<string, string | boolean>;
  summary: string;
};

const KEY = "quantum-ai-lab:experiment-history:v1";
const LIMIT = 100;

function safeParse(raw: string | null): ExperimentSnapshot[] {
  if (!raw) return [];
  try {
    const value = JSON.parse(raw);
    return Array.isArray(value) ? value.filter((x) => x && typeof x === "object") as ExperimentSnapshot[] : [];
  } catch {
    return [];
  }
}

export function getExperimentHistory(): ExperimentSnapshot[] {
  if (typeof window === "undefined") return [];
  return safeParse(window.localStorage.getItem(KEY));
}

export function saveExperimentSnapshot(snapshot: Omit<ExperimentSnapshot, "id" | "createdAt">): ExperimentSnapshot {
  const record: ExperimentSnapshot = {
    ...snapshot,
    id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    createdAt: new Date().toISOString(),
  };
  const next = [record, ...getExperimentHistory()].slice(0, LIMIT);
  window.localStorage.setItem(KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent("experiment-history-changed"));
  return record;
}

export function deleteExperimentSnapshot(id: string) {
  const next = getExperimentHistory().filter((x) => x.id !== id);
  window.localStorage.setItem(KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent("experiment-history-changed"));
}

export function clearExperimentHistory() {
  window.localStorage.removeItem(KEY);
  window.dispatchEvent(new CustomEvent("experiment-history-changed"));
}

export function downloadText(filename: string, text: string, type = "application/json") {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
