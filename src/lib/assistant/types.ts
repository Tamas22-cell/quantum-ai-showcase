export type AssistantMode = "explain-algorithm" | "explain-results" | "draft-circuit";
export type ChatTurn = { role: "user" | "assistant"; content: string };

/** Shape returned by both the live AI path and the scripted demo path. */
export type AssistantReply =
  | { ok: true; source: "ai" | "demo"; answer: string; circuitRaw: string | null }
  | { ok: false; error: string; status?: number };

export const MODE_LABEL: Record<AssistantMode, string> = {
  "explain-algorithm": "Explain algorithm",
  "explain-results": "Explain experiment results",
  "draft-circuit": "Draft quantum circuit",
};
