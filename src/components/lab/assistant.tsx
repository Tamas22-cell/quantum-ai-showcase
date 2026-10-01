import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { AlertTriangle, Bot, CheckCircle2, FileText, Loader2, Send, Sparkles, Trash2, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { askAIResearchAssistant } from "@/lib/assistant.functions";
import { exportAssistantResearchReport } from "@/lib/assistant/pdf";
import { parseProposal } from "@/lib/assistant/proposal";
import { writeTransfer } from "@/lib/assistant/transfer";
import { MODE_LABEL, type AssistantMode, type ChatTurn } from "@/lib/assistant/types";
import { marginal, measuredQubits, probabilities, simulate, toBitstring } from "@/lib/quantum";
import { CircuitDiagram } from "./circuit-diagram";
import { Panel, ProbabilityRow } from "./charts";

type Msg = ChatTurn & {
  id: number;
  mode: AssistantMode;
  source?: "ai" | "demo";
  circuitRaw?: string | null;
  sources?: Array<{ title: string; url: string }>;
  research?: boolean;
  question?: string;
  error?: boolean;
};

const MEMORY_KEY = "quantum-ai-research-assistant-memory-v1";

const EXAMPLES: Record<AssistantMode, string[]> = {
  "explain-algorithm": [
    "How does QAOA approach Max-Cut?",
    "Explain VQE and the variational principle.",
    "Why does H·Z·H equal X?",
  ],
  "explain-results": [
    "My Bell circuit gave 00: 514, 11: 510 out of 1024 shots. Is that consistent?",
    "Why is QAOA p=1 below the exhaustive optimum in the Arena?",
  ],
  "draft-circuit": [
    "Draft a Bell state circuit.",
    "Draft a 3-qubit GHZ circuit.",
    "Draft one QAOA layer for a single Max-Cut edge.",
  ],
  research: [
    "What are the latest practical approaches to quantum portfolio optimization?",
    "Find recent research connecting QAOA and financial portfolio optimisation.",
    "What are the current limitations of QML for financial data?",
  ],
};

function loadMemory(): Msg[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.sessionStorage.getItem(MEMORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Msg[];
    return Array.isArray(parsed) ? parsed.slice(-12) : [];
  } catch {
    return [];
  }
}

export function ResearchAssistant() {
  const [mode, setMode] = useState<AssistantMode>("explain-algorithm");
  const [input, setInput] = useState("");
  const [context, setContext] = useState("");
  const [messages, setMessages] = useState<Msg[]>(loadMemory);
  const [busy, setBusy] = useState(false);
  const nextId = useRef(1);
  const conversationHistory = useMemo<ChatTurn[]>(
    () => messages.filter((m) => !m.error).slice(-10).map(({ role, content }) => ({ role, content })),
    [messages],
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.sessionStorage.setItem(MEMORY_KEY, JSON.stringify(messages.slice(-12)));
    } catch {
      // Session memory is best-effort only.
    }
  }, [messages]);

  const send = async (text: string) => {
    const q = text.trim();
    if (!q || busy) return;

    const history = conversationHistory;
    const userMsg: Msg = { id: nextId.current++, role: "user", content: q, mode };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setBusy(true);

    try {
      const reply = await askAIResearchAssistant({
        data: {
          mode,
          question: q,
          context: mode === "explain-results" ? context : undefined,
          history,
        },
      });

      setMessages((m) => [
        ...m,
        {
          id: nextId.current++,
          role: "assistant",
          mode: reply.research ? "research" : mode,
          content: reply.answer,
          source: "ai",
          sources: reply.sources ?? [],
          research: reply.research ?? mode === "research",
          question: q,
          circuitRaw: reply.circuitRaw ?? null,
        },
      ]);
    } catch (e) {
      setMessages((m) => [
        ...m,
        {
          id: nextId.current++,
          role: "assistant",
          mode,
          error: true,
          content: e instanceof Error ? e.message : "Request failed.",
        },
      ]);
    } finally {
      setBusy(false);
    }
  };

  const clearConversation = () => {
    setMessages([]);
    if (typeof window !== "undefined") window.sessionStorage.removeItem(MEMORY_KEY);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="min-w-0 space-y-4">
        <div role="tablist" aria-label="Assistant mode" className="flex flex-wrap gap-2">
          {(Object.keys(MODE_LABEL) as AssistantMode[]).map((m) => (
            <button
              key={m}
              role="tab"
              aria-selected={mode === m}
              onClick={() => setMode(m)}
              className={`rounded-sm border px-3 py-2 font-mono text-[11px] uppercase focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${mode === m ? "border-primary bg-signal-soft text-primary" : "border-border text-muted-foreground hover:text-foreground"}`}
            >
              {MODE_LABEL[m]}
            </button>
          ))}
        </div>

        <div aria-live="polite" className="min-h-72 space-y-4 rounded-md border border-border bg-card p-4 sm:p-5">
          {messages.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Ask a question or choose Research mode for current sources. Conversation context is remembered during this browser session.
            </p>
          ) : (
            messages.map((m) => <MessageView key={m.id} m={m} />)
          )}
          {busy ? (
            <p className="flex items-center gap-2 font-mono text-xs text-primary">
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              {mode === "research" ? "Researching current sources…" : "Generating AI response…"}
            </p>
          ) : null}
        </div>

        {mode === "explain-results" ? (
          <label className="block text-xs text-muted-foreground">
            Experiment data (optional — paste counts, probabilities or Arena output)
            <textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              maxLength={4000}
              rows={3}
              className="mt-1 w-full rounded-sm border border-border bg-surface p-2 font-mono text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>
        ) : null}

        <form onSubmit={(e) => { e.preventDefault(); void send(input); }} className="flex gap-2">
          <label htmlFor="assistant-q" className="sr-only">Research question</label>
          <input
            id="assistant-q"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            maxLength={2000}
            placeholder={`${MODE_LABEL[mode]}…`}
            className="min-w-0 flex-1 rounded-sm border border-border bg-surface px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <Button type="submit" variant="signal" disabled={busy || !input.trim()}>
            <Send aria-hidden="true" />Ask
          </Button>
        </form>
      </div>

      <aside className="space-y-4">
        <Panel title="Response engine">
          <p className="text-xs text-muted-foreground">
            <strong className="text-foreground">Live AI</strong> — OpenAI-powered responses.
            Research mode additionally uses current web sources and returns a Sources section.
          </p>
        </Panel>

        <Panel title="Example prompts">
          <ul className="space-y-2">
            {EXAMPLES[mode].map((ex) => (
              <li key={ex}>
                <button
                  onClick={() => void send(ex)}
                  disabled={busy}
                  className="w-full rounded-sm border border-border px-3 py-2 text-left text-xs text-muted-foreground hover:border-primary/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                >
                  {ex}
                </button>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Session memory">
          <p className="text-xs text-muted-foreground">
            The last 12 messages are kept in this browser session and sent as context for follow-up questions. Clearing the conversation removes the session memory.
          </p>
        </Panel>

        <Panel title="Provenance legend">
          <ul className="space-y-1.5 text-[11px] text-muted-foreground">
            <li><span className="text-primary">AI explanation</span> — generated text, unverified.</li>
            <li><span className="text-amber">Research mode</span> — current web research with cited sources.</li>
            <li><span className="text-emerald">Quantum simulation</span> — exact classical statevector simulation.</li>
            <li><span className="text-foreground">Hardware results</span> — none; no quantum hardware is connected.</li>
          </ul>
        </Panel>

        {messages.length ? (
          <Button variant="signalOutline" size="sm" onClick={clearConversation}>
            <Trash2 aria-hidden="true" />Clear conversation
          </Button>
        ) : null}
      </aside>
    </div>
  );
}

function MessageView({ m }: { m: Msg }) {
  const visibleSources = useMemo(() => {
    if (!m.research) return [];
    const direct = m.sources ?? [];
    if (direct.length) return direct;
    const urls = m.content.match(/https?:\/\/[^\s)<>]+/g) ?? [];
    return Array.from(new Set(urls))
      .map((url) => ({ title: url.replace(/[.,;]+$/, ""), url: url.replace(/[.,;]+$/, "") }))
      .slice(0, 4);
  }, [m.research, m.sources, m.content]);

  const exportReport = () => {
    if (!m.research) return;
    exportAssistantResearchReport({
      topic: m.question?.trim() || "Quantum AI Research Report",
      answer: m.content,
      sources: visibleSources,
      generatedAt: new Date().toISOString(),
    });
  };

  if (m.role === "user") {
    return (
      <div className="ml-auto max-w-[85%] rounded-md border border-border bg-surface px-3 py-2 text-sm">
        <span className="mb-1 block font-mono text-[9px] uppercase text-muted-foreground">
          You · {MODE_LABEL[m.mode]}
        </span>
        {m.content}
      </div>
    );
  }

  if (m.error) {
    return (
      <div role="alert" className="flex max-w-[92%] gap-2 rounded-md border border-rose/50 px-3 py-2 text-sm text-rose">
        <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />{m.content}
      </div>
    );
  }

  return (
    <div className="max-w-[95%] space-y-3">
      <div className="rounded-md border border-border px-3 py-2 text-sm leading-6">
        <span className={`mb-1 flex items-center gap-1 font-mono text-[9px] uppercase ${m.mode === "research" ? "text-primary" : "text-amber"}`}>
          {m.mode === "research" ? (
            <><Sparkles className="size-3" aria-hidden="true" />Research response · current sources</>
          ) : (
            <><Bot className="size-3" aria-hidden="true" />AI response</>
          )}
        </span>
        <p className="whitespace-pre-wrap">{m.content}</p>
      </div>

      {m.mode === "research" && visibleSources.length ? (
        <div className="rounded-md border border-primary/30 bg-surface px-3 py-3">
          <p className="mb-2 font-mono text-[10px] uppercase tracking-wide text-primary">Sources</p>
          <ol className="space-y-2 text-xs">
            {visibleSources.map((source, index) => (
              <li key={source.url} className="flex gap-2">
                <span className="shrink-0 font-mono text-muted-foreground">{index + 1}.</span>
                <a
                  href={source.url}
                  target="_blank"
                  rel="noreferrer"
                  className="min-w-0 break-all text-primary underline-offset-2 hover:underline"
                >
                  {source.title}
                </a>
              </li>
            ))}
          </ol>
          <Button
            type="button"
            variant="signalOutline"
            size="sm"
            className="mt-3"
            onClick={exportReport}
          >
            <FileText aria-hidden="true" />Export Research Report
          </Button>
        </div>
      ) : null}

      {m.mode === "research" && !visibleSources.length ? (
        <div className="rounded-md border border-amber/30 px-3 py-2 text-xs text-muted-foreground">
          <p>No web sources were returned for this research response.</p>
          <Button
            type="button"
            variant="signalOutline"
            size="sm"
            className="mt-3"
            onClick={exportReport}
          >
            <FileText aria-hidden="true" />Export Research Report
          </Button>
        </div>
      ) : null}

      {m.circuitRaw ? <ProposalCard raw={m.circuitRaw} /> : null}
    </div>
  );
}

function ProposalCard({ raw }: { raw: string }) {
  const navigate = useNavigate();
  const result = useMemo(() => parseProposal(raw), [raw]);
  const sim = useMemo(() => {
    if (!result.ok) return null;
    const probs = probabilities(simulate(result.circuit));
    const mq = measuredQubits(result.circuit);
    return { mq, marg: marginal(probs, mq) };
  }, [result]);
  const [loadError, setLoadError] = useState<string | null>(null);

  if (!result.ok) {
    return (
      <div className="rounded-md border border-rose/50 p-3 text-xs">
        <p className="flex items-center gap-1.5 font-mono uppercase text-rose">
          <XCircle className="size-4" aria-hidden="true" />Proposal rejected by validator — cannot be loaded
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
          {result.errors.map((e) => <li key={e}>{e}</li>)}
        </ul>
      </div>
    );
  }

  const load = () => {
    if (writeTransfer(result.circuit, window.sessionStorage)) void navigate({ to: "/lab/circuit-builder" });
    else setLoadError("Transfer failed validation.");
  };

  return (
    <div className="space-y-3 rounded-md border border-emerald/50 p-3">
      <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase text-emerald">
        <CheckCircle2 className="size-4" aria-hidden="true" />
        Validated · {result.circuit.numQubits} qubit(s) · {result.circuit.ops.length} ops · depth {result.depth}
      </p>
      <div className="overflow-x-auto">
        <CircuitDiagram circuit={result.circuit} selected={null} onSelect={() => {}} />
      </div>
      {sim ? (
        <div>
          <p className="mb-2 font-mono text-[9px] uppercase text-muted-foreground">
            Quantum simulation · exact ideal statevector (classical computer, not hardware)
          </p>
          <div className="space-y-1">
            {Array.from(sim.marg).map((p, i) => p > 1e-9 ? (
              <ProbabilityRow key={i} label={toBitstring(i, sim.mq.length)} p={p} />
            ) : null)}
          </div>
        </div>
      ) : null}
      <Button variant="signal" size="sm" onClick={load}>Load in Circuit Builder</Button>
      {loadError ? <p role="alert" className="text-xs text-rose">{loadError}</p> : null}
    </div>
  );
}
