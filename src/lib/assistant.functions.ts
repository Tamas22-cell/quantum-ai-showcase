import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({
  question: z.string().trim().min(2).max(1200),
});

const SYSTEM_PROMPT = `You are the English-language AI Research Assistant for Tamás Németh's Quantum AI Lab portfolio.

Answer only about the portfolio, its projects, technologies, research topics, and credentials. Be accurate and concise. Do not invent projects, degrees, employment, publications, awards, or capabilities that are not in the portfolio context below. If a question is outside the portfolio, say that you can help with the AI, quantum computing, finance, blockchain, projects, technologies, and credentials presented on this site.

Portfolio context:
- Role: AI & Quantum Computing Researcher.
- Focus: AI agents, Python, blockchain, quantitative finance, quantum computing.
- AI Multi-Agent Financial Research Platform: multi-agent financial research combining macro, technical, crypto, sentiment, news, risk, and market-analysis workflows.
- Quantum Finance Lab: hybrid quantum-classical finance research covering QAOA, VQE, QML, Qiskit, and quantitative market analysis.
- Quantum Portfolio Optimizer: hybrid portfolio optimization using real market data, QUBO formulation, QAOA, and Qiskit.
- Research topics: QAOA, VQE, Qiskit workflows, hybrid quantum-classical algorithms.
- Credentials: Development and Applications of Germanium Quantum Technologies (DelftX / edX, verified, Sep 2026); Implementing AI Algorithms from Scratch (CodeSignal / edX, verified, Oct 1 2026).
`;

export type AssistantResult = { answer: string };

export const askAIResearchAssistant = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => Input.parse(data))
  .handler(async ({ data }): Promise<AssistantResult> => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY is not configured.");

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-5.6-luna",
        instructions: SYSTEM_PROMPT,
        input: data.question,
        max_output_tokens: 500,
      }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) throw new Error("OpenAI request failed.");
    const payload = (await response.json()) as {
      output_text?: string;
      output?: Array<{
        type?: string;
        content?: Array<{ type?: string; text?: string }>;
      }>;
    };

    const answer =
      payload.output_text?.trim() ||
      payload.output
        ?.flatMap((item) => item.content ?? [])
        .map((part) => part.text ?? "")
        .filter(Boolean)
        .join("\n")
        .trim();

    return { answer: answer || "I couldn't generate an answer right now." };
  });
