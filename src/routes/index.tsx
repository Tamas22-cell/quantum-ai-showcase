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
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PortfolioSite,
});
