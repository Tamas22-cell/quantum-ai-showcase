import { useMemo, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { AlertTriangle, Bot, CheckCircle2, Loader2, Send, Sparkles, Trash2, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { demoReply } from "@/lib/assistant/demo";
import { parseProposal } from "@/lib/assistant/proposal";
import { writeTransfer } from "@/lib/assistant/transfer";
import { MODE_LABEL, type AssistantMode, type ChatTurn } from "@/lib/assistant/types";
import { marginal, measuredQubits, probabilities, simulate, toBitstring } from "@/lib/quantum";
import { CircuitDiagram } from "./circuit-diagram";
import { Panel, ProbabilityRow } from "./charts";

type Msg = ChatTurn & { id: number; mode: AssistantMode; source?: "ai" | "demo"; circuitRaw?: string | null; error?: boolean };

const EXAMPLES: Record<AssistantMode, string[]> = {
  "explain-algorithm": ["How does QAOA approach Max-Cut?", "Explain VQE and the variational principle.", "Why does H·Z·H equal X?"],
  "explain-results": ["My Bell circuit gave 00: 514, 11: 510 out of 1024 shots. Is that consistent?", "Why is QAOA p=1 below the exhaustive optimum in the Arena?"],
  "draft-circuit": ["Draft a Bell state circuit.", "Draft a 3-qubit GHZ circuit.", "Draft one QAOA layer for a single Max-Cut edge.", "Draft an invalid Toffoli circuit (validation example)."],
};

export function ResearchAssistant() {
  const [mode, setMode] = useState<AssistantMode>("explain-algorithm");
  const [input, setInput] = useState("");
  const [context, setContext] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [busy, setBusy] = useState(false);
  const nextId = useRef(1);

  const send = async (text: string) => {
    const q = text.trim();
    if (!q || busy) return;
    const userMsg: Msg = { id: nextId.current++, role: "user", content: q, mode };
    const history = [...messages.filter((m) => !m.error), userMsg].slice(-12);
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setBusy(true);
    try {
      const reply = demoReply(mode, q);
      setMessages((m) => [...m, reply.ok
        ? { id: nextId.current++, role: "assistant", mode, content: reply.answer, source: reply.source, circuitRaw: reply.circuitRaw }
        : { id: nextId.current++, role: "assistant", mode, content: reply.error, error: true }]);
    } catch (e) {
      setMessages((m) => [...m, { id: nextId.current++, role: "assistant", mode, error: true, content: e instanceof Error ? e.message : "Request failed." }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="min-w-0 space-y-4">
        <div role="tablist" aria-label="Assistant mode" className="flex flex-wrap gap-2">
          {(Object.keys(MODE_LABEL) as AssistantMode[]).map((m) => (
            <button key={m} role="tab" aria-selected={mode === m} onClick={() => setMode(m)}
              className={`rounded-sm border px-3 py-2 font-mono text-[11px] uppercase focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${mode === m ? "border-primary bg-signal-soft text-primary" : "border-border text-muted-foreground hover:text-foreground"}`}>
              {MODE_LABEL[m]}
            </button>
          ))}
        </div>

        <div aria-live="polite" className="min-h-72 space-y-4 rounded-md border border-border bg-card p-4 sm:p-5">
          {messages.length === 0 ? (
            <p className="text-sm text-muted-foreground">Ask a question or pick an example. Circuits proposed by the assistant are validated by the simulation engine before they can be loaded.</p>
          ) : messages.map((m) => <MessageView key={m.id} m={m} />)}
          {busy ? <p className="flex items-center gap-2 font-mono text-xs text-primary"><Loader2 className="size-4 animate-spin" aria-hidden="true" />Generating scripted reply…</p> : null}
        </div>

        {mode === "explain-results" ? (
          <label className="block text-xs text-muted-foreground">
            Experiment data (optional — paste counts, probabilities or Arena output)
            <textarea value={context} onChange={(e) => setContext(e.target.value)} maxLength={4000} rows={3}
              className="mt-1 w-full rounded-sm border border-border bg-surface p-2 font-mono text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
          </label>
        ) : null}

        <form onSubmit={(e) => { e.preventDefault(); void send(input); }} className="flex gap-2">
          <label htmlFor="assistant-q" className="sr-only">Research question</label>
          <input id="assistant-q" value={input} onChange={(e) => setInput(e.target.value)} maxLength={2000} placeholder={`${MODE_LABEL[mode]}…`}
            className="min-w-0 flex-1 rounded-sm border border-border bg-surface px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
          <Button type="submit" variant="signal" disabled={busy || !input.trim()}><Send aria-hidden="true" />Ask</Button>
        </form>
      </div>

      <aside className="space-y-4">
        <Panel title="Response engine">
          <p className="text-xs text-muted-foreground"><strong className="text-foreground">Scripted mode</strong> — local scripted research replies, no external AI service and no usage cost.</p>
        </Panel>
        <Panel title="Example prompts">
          <ul className="space-y-2">
            {EXAMPLES[mode].map((ex) => (
              <li key={ex}><button onClick={() => void send(ex)} disabled={busy}
                className="w-full rounded-sm border border-border px-3 py-2 text-left text-xs text-muted-foreground hover:border-primary/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50">{ex}</button></li>
            ))}
          </ul>
        </Panel>
        <Panel title="Provenance legend">
          <ul className="space-y-1.5 text-[11px] text-muted-foreground">
            <li><span className="text-primary">AI explanation</span> — generated text, unverified.</li>
            <li><span className="text-amber">Scripted</span> — scripted, not AI.</li>
            <li><span className="text-emerald">Quantum simulation</span> — exact classical statevector simulation.</li>
            <li><span className="text-foreground">Hardware results</span> — none; no quantum hardware is connected.</li>
          </ul>
        </Panel>
        {messages.length ? <Button variant="signalOutline" size="sm" onClick={() => setMessages([])}><Trash2 aria-hidden="true" />Clear conversation</Button> : null}
      </aside>
    </div>
  );
}

function MessageView({ m }: { m: Msg }) {
  if (m.role === "user") return (
    <div className="ml-auto max-w-[85%] rounded-md border border-border bg-surface px-3 py-2 text-sm">
      <span className="mb-1 block font-mono text-[9px] uppercase text-muted-foreground">You · {MODE_LABEL[m.mode]}</span>{m.content}
    </div>
  );
  if (m.error) return (
    <div role="alert" className="flex max-w-[92%] gap-2 rounded-md border border-rose/50 px-3 py-2 text-sm text-rose"><AlertTriangle className="size-4 shrink-0" aria-hidden="true" />{m.content}</div>
  );
  return (
    <div className="max-w-[95%] space-y-3">
      <div className="rounded-md border border-border px-3 py-2 text-sm leading-6">
        <span className={`mb-1 flex items-center gap-1 font-mono text-[9px] uppercase ${m.source === "ai" ? "text-primary" : "text-amber"}`}>
          {m.source === "ai" ? <><Sparkles className="size-3" aria-hidden="true" />AI-generated explanation · not experimentally verified</> : <><Bot className="size-3" aria-hidden="true" />Scripted response · not AI</>}
        </span>
        <p className="whitespace-pre-wrap">{m.content}</p>
      </div>
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

  if (!result.ok) return (
    <div className="rounded-md border border-rose/50 p-3 text-xs">
      <p className="flex items-center gap-1.5 font-mono uppercase text-rose"><XCircle className="size-4" aria-hidden="true" />Proposal rejected by validator — cannot be loaded</p>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">{result.errors.map((e) => <li key={e}>{e}</li>)}</ul>
    </div>
  );

  const load = () => {
    if (writeTransfer(result.circuit, window.sessionStorage)) void navigate({ to: "/lab/circuit-builder" });
    else setLoadError("Transfer failed validation.");
  };

  return (
    <div className="space-y-3 rounded-md border border-emerald/50 p-3">
      <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase text-emerald"><CheckCircle2 className="size-4" aria-hidden="true" />
        Validated · {result.circuit.numQubits} qubit(s) · {result.circuit.ops.length} ops · depth {result.depth}</p>
      <div className="overflow-x-auto"><CircuitDiagram circuit={result.circuit} selected={null} onSelect={() => {}} /></div>
      {sim ? (
        <div>
          <p className="mb-2 font-mono text-[9px] uppercase text-muted-foreground">Quantum simulation · exact ideal statevector (classical computer, not hardware)</p>
          <div className="space-y-1">
            {Array.from(sim.marg).map((p, i) => p > 1e-9 ? <ProbabilityRow key={i} label={toBitstring(i, sim.mq.length)} p={p} /> : null)}
          </div>
        </div>
      ) : null}
      <Button variant="signal" size="sm" onClick={load}>Load in Circuit Builder</Button>
      {loadError ? <p role="alert" className="text-xs text-rose">{loadError}</p> : null}
    </div>
  );
}
