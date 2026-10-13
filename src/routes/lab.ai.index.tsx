import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

const labCopy = {
  en: ["AI Research", "AI Research Lab", "A dedicated artificial-intelligence research area for machine learning, deep learning, language models, RAG, multi-agent systems, time-series modelling, explainability and production AI engineering. Quantum research remains in its own separate lab modules."],
  hu: ["AI-kutatás", "AI-kutatólabor", "Mesterségesintelligencia-kutatási terület gépi tanulással, mélytanulással, nyelvi modellekkel, RAG-gel, többügynökös rendszerekkel, idősormodellezéssel, magyarázhatósággal és éles AI-fejlesztéssel. A kvantumkutatás külön laborokban található."],
  de: ["KI-Forschung", "KI-Forschungslabor", "Forschungsbereich für künstliche Intelligenz mit maschinellem Lernen, Deep Learning, Sprachmodellen, RAG, Multi-Agenten-Systemen, Zeitreihenmodellierung, Erklärbarkeit und produktiver KI-Entwicklung. Die Quantenforschung bleibt in eigenen Laboren."],
  fr: ["Recherche IA", "Laboratoire de recherche IA", "Espace de recherche en intelligence artificielle consacré à l’apprentissage automatique, au deep learning, aux modèles de langage, au RAG, aux systèmes multi-agents, aux séries temporelles, à l’explicabilité et à l’ingénierie IA. La recherche quantique dispose de laboratoires distincts."],
  it: ["Ricerca IA", "Laboratorio di ricerca IA", "Area di ricerca sull’intelligenza artificiale dedicata a machine learning, deep learning, modelli linguistici, RAG, sistemi multi-agente, serie temporali, spiegabilità e ingegneria IA in produzione. La ricerca quantistica rimane in laboratori separati."]
} as const;
type LabLanguage = keyof typeof labCopy;


import { AiResearchHub } from "@/components/lab/ai-research-hub";
import { LabShell } from "@/components/lab/lab-shell";

export const Route = createFileRoute("/lab/ai/")({
  head: () => ({
    meta: [
      { title: "AI Research Lab — Quantum AI Lab" },
      {
        name: "description",
        content:
          "Dedicated AI research area covering machine learning, deep learning, LLMs, RAG, multi-agent systems, computer vision, reinforcement learning, forecasting, explainability and MLOps.",
      },
      { property: "og:title", content: "AI Research Lab — Quantum AI Lab" },
      {
        property: "og:description",
        content:
          "Machine learning, LLMs, agents and applied AI research in a dedicated lab separated from the quantum research modules.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

function Page() {
  const [language, setLanguage] = useState<LabLanguage>("en");
  useEffect(() => {
    const read = () => {
      const code = document.documentElement.lang;
      setLanguage(code in labCopy ? code as LabLanguage : "en");
    };
    read();
    const observer = new MutationObserver(read);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
    return () => observer.disconnect();
  }, []);
  const copy = labCopy[language];
  return (
    <LabShell crumb={copy[0]}>
      <div className="mb-8 max-w-3xl">
        <span className="font-mono text-xs text-primary">LAB / AI</span>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">{copy[1]}</h1>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          {copy[2]}
        </p>
      </div>
      <AiResearchHub />
    </LabShell>
  );
}
