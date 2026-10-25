import { createFileRoute } from "@tanstack/react-router";

import { PortfolioSite } from "@/components/portfolio-site";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Quantum AI Lab — Tamás Németh" },
      {
        name: "description",
        content:
          "The research portfolio of Tamás Németh, exploring AI agents, quantitative finance, blockchain, and quantum computing.",
      },
      { property: "og:title", content: "Quantum AI Lab — Tamás Németh" },
      {
        property: "og:description",
        content:
          "Research at the intersection of AI agents, quantitative finance, blockchain, and quantum computing.",
      },
      { property: "og:type", content: "website" },
      { property: "og:image", content: "/quantum-ai-lab-social.jpg" },
      { property: "og:image:alt", content: "Quantum AI research portfolio preview" },
      { name: "twitter:image", content: "/quantum-ai-lab-social.jpg" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PortfolioSite,
});
