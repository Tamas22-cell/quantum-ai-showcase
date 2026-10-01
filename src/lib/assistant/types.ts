export type AssistantMode = "explain-algorithm" | "explain-results" | "draft-circuit" | "research";

export type ChatTurn = { role: "user" | "assistant"; content: string };

export type AssistantSource = { title: string; url: string };

/** Shape returned by the live AI path and the scripted demo path. */
export type AssistantReply =
  | {
      ok: true;
      source: "ai" | "demo";
      answer: string;
      circuitRaw: string | null;
      research?: boolean;
      sources?: AssistantSource[];
    }
  | { ok: false; error: string; status?: number };

export const MODE_LABEL: Record<AssistantMode, string> = {
  "explain-algorithm": "Explain algorithm",
  "explain-results": "Explain experiment results",
  "draft-circuit": "Draft quantum circuit",
  research: "Research mode",
};
