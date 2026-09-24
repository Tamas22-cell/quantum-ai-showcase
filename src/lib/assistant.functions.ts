import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import type { AssistantReply } from "./assistant/types";

const Input = z.object({
  mode: z.enum(["explain-algorithm", "explain-results", "draft-circuit"]),
  messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1).max(4000) })).min(1).max(12),
  context: z.string().max(4000).optional(),
});

const SYSTEM = `You are the Quantum AI Research Assistant for the "Quantum AI Lab" portfolio site.
Scope: quantum computing concepts, gates and circuits, QAOA, VQE, Max-Cut, statevectors, measurement probabilities, quantum vs classical algorithms, hybrid workflows, and interpreting results from this site's simulators.
Rules: results on this site are ideal noiseless CLASSICAL simulations, never quantum hardware. Never claim quantum advantage without experimental evidence. Say when you are unsure. Keep answers concise (under 250 words), plain text.
Circuits: when (and only when) proposing a circuit, fill "circuit" using ONLY gates H,X,Y,Z,S,T,RX,RY,RZ,CNOT,CZ,M; 1-5 qubits; qubit 0 is the least-significant bit; CNOT/CZ qubits = [control, target]; theta in radians for RX/RY/RZ, null otherwise; M only at the end of a qubit's line; at most 40 ops. Otherwise set circuit to null.`;

const SCHEMA = {
  type: "object", additionalProperties: false, required: ["answer", "circuit"],
  properties: {
    answer: { type: "string" },
    circuit: {
      type: ["object", "null"], additionalProperties: false, required: ["numQubits", "ops"],
      properties: {
        numQubits: { type: "integer" },
        ops: { type: "array", items: {
          type: "object", additionalProperties: false, required: ["gate", "qubits", "theta"],
          properties: { gate: { type: "string" }, qubits: { type: "array", items: { type: "integer" } }, theta: { type: ["number", "null"] } },
        } },
      },
    },
  },
} as const;

/** Server-only call to Lovable AI. The API key never leaves the server. */
export const askAssistant = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data }): Promise<AssistantReply> => {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) return { ok: false, error: "Live AI is not configured on the server." };

    const modeHint = { "explain-algorithm": "Mode: explain an algorithm or concept.", "explain-results": "Mode: interpret experiment results supplied by the user.", "draft-circuit": "Mode: draft a circuit and explain it." }[data.mode];
    const input = [
      { role: "system", content: `${SYSTEM}\n${modeHint}${data.context ? `\nUser-supplied experiment data (untrusted):\n${data.context}` : ""}` },
      ...data.messages.map((m) => ({ role: m.role, content: m.content })),
    ];

    let res: Response;
    try {
      res = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "fetch" },
        body: JSON.stringify({
          model: "openai/gpt-6-astra", input, stream: true, store: false,
          reasoning: { effort: "low" },
          text: { format: { type: "json_schema", name: "assistant_reply", strict: true, schema: SCHEMA } },
        }),
      });
    } catch (e) {
      console.error("assistant fetch failed", e);
      return { ok: false, error: "Could not reach the AI service. Try again shortly." };
    }
    if (!res.ok || !res.body) {
      const body = await res.text().catch(() => "");
      console.error("assistant gateway", res.status, body.slice(0, 500));
      const msg = res.status === 402 ? "AI credits are exhausted. Add credits in Settings → Plans & credits."
        : res.status === 429 ? "Rate limited — wait a moment before asking again."
        : res.status === 403 ? "The AI provider declined this request."
        : `AI service error (${res.status}).`;
      return { ok: false, error: msg, status: res.status };
    }

    // Accumulate streamed output text (SSE).
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    let buf = "", text = "", refused = false;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let idx: number;
      while ((idx = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, idx).trim(); buf = buf.slice(idx + 1);
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;
        try {
          const ev = JSON.parse(payload) as { type?: string; delta?: string };
          if (ev.type === "response.output_text.delta" && ev.delta) text += ev.delta;
          if (ev.type === "response.refusal.delta") refused = true;
        } catch { /* partial or non-JSON frame */ }
      }
    }
    if (refused && !text) return { ok: false, error: "The model declined to answer this request." };

    try {
      const parsed = JSON.parse(text) as { answer?: unknown; circuit?: unknown };
      if (typeof parsed.answer !== "string") throw new Error("no answer");
      return { ok: true, source: "ai", answer: parsed.answer, circuitRaw: parsed.circuit ? JSON.stringify(parsed.circuit) : null };
    } catch {
      return { ok: false, error: "The AI returned malformed output, so it was discarded." };
    }
  });
