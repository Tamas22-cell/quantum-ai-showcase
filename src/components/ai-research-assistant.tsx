import { useState } from "react";
import { ArrowUpRight, BrainCircuit, Loader2, Send, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { askAIResearchAssistant } from "@/lib/assistant.functions";

const suggestions = [
  "What AI algorithms has Tamás implemented?",
  "How does the Quantum Portfolio Optimizer work?",
  "What is the Quantum Finance Lab?",
];

export function AIResearchAssistant() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([
    {
      role: "assistant",
      content:
        "Hi! I'm the AI Research Assistant for Tamás Németh's Quantum AI Lab. Ask me about the AI, quantum computing, financial research projects, technologies, or credentials featured in this portfolio.",
    },
  ]);
  const [loading, setLoading] = useState(false);

  async function sendMessage(text = input) {
    const question = text.trim();
    if (!question || loading) return;
    setInput("");
    setMessages((current) => [...current, { role: "user", content: question }]);
    setLoading(true);
    try {
      const result = await askAIResearchAssistant({ data: { question } });
      setMessages((current) => [...current, { role: "assistant", content: result.answer }]);
    } catch {
      setMessages((current) => [
        ...current,
        { role: "assistant", content: "I couldn't reach the research assistant right now. Please try again in a moment." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {!open ? (
        <Button
          variant="signal"
          size="lg"
          className="fixed bottom-5 right-5 z-40 shadow-2xl"
          onClick={() => setOpen(true)}
        >
          <BrainCircuit className="size-5" />
          Ask AI Research Assistant
          <ArrowUpRight className="size-4" />
        </Button>
      ) : null}

      {open ? (
        <div className="fixed bottom-5 right-5 z-50 flex w-[min(92vw,430px)] flex-col overflow-hidden rounded-xl border border-primary/30 bg-background/95 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="grid size-9 place-items-center rounded-lg border border-primary/40 bg-signal-soft text-primary">
                <BrainCircuit className="size-5" />
              </span>
              <div>
                <p className="text-sm font-semibold">AI Research Assistant</p>
                <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Quantum AI Lab</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="Close assistant">
              <X />
            </Button>
          </div>

          <div className="max-h-[55vh] space-y-3 overflow-y-auto p-4">
            {messages.map((message, index) => (
              <div key={index} className={message.role === "user" ? "ml-8 rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground" : "mr-8 rounded-lg border border-border bg-card px-3 py-2 text-sm leading-6"}>
                {message.content}
              </div>
            ))}
            {messages.length === 1 ? (
              <div className="space-y-2 pt-1">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => void sendMessage(suggestion)}
                    className="block w-full rounded-lg border border-border px-3 py-2 text-left text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:bg-signal-soft hover:text-foreground"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            ) : null}
            {loading ? (
              <div className="mr-8 flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> Thinking...
              </div>
            ) : null}
          </div>

          <form
            className="flex gap-2 border-t border-border p-3"
            onSubmit={(event) => {
              event.preventDefault();
              void sendMessage();
            }}
          >
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask about the research..."
              className="min-w-0 flex-1 rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary"
              aria-label="Ask the AI Research Assistant"
            />
            <Button type="submit" variant="signal" size="icon" disabled={!input.trim() || loading} aria-label="Send question">
              <Send className="size-4" />
            </Button>
          </form>
        </div>
      ) : null}
    </>
  );
}
