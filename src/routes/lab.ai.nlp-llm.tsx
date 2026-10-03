import { createFileRoute } from "@tanstack/react-router";
import { NlpLlmLab } from "@/components/lab/applied-ai-labs";
import { LabShell } from "@/components/lab/lab-shell";
export const Route = createFileRoute("/lab/ai/nlp-llm")({ component: Page });
function Page(){return <LabShell crumb="NLP & LLM"><div className="mb-8 max-w-3xl"><span className="font-mono text-xs text-primary">AI LAB / 03</span><h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">NLP & LLM Lab</h1><p className="mt-3 text-sm leading-7 text-muted-foreground">Prompt structure, token-budget and evaluation diagnostics in a transparent browser-local sandbox.</p></div><NlpLlmLab /></LabShell>}
