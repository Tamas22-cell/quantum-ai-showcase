import { createFileRoute } from "@tanstack/react-router";
import { LabShell } from "@/components/lab/lab-shell";
import { DwaveFinanceDashboard } from "@/components/lab/dwave-finance-dashboard";

export const Route = createFileRoute("/lab/finance/dwave")({
  head: () => ({ meta: [
    { title: "D-Wave Quantum Finance Research Engine — Quantum AI Lab" },
    { name: "description", content: "Interactive comparison of user-provided illustrative quantum finance backtest figures, annual returns and partial asset weights. Not live D-Wave output." },
    { property: "og:title", content: "D-Wave Quantum Finance Research Engine — Quantum AI Lab" },
    { property: "og:description", content: "Explore illustrative simulated annealing, exact solver and equal-weight figures with transparent methodology. No live hardware or market data." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: Page,
});

function Page() {
  return <LabShell crumb="D-Wave Finance"><DwaveFinanceDashboard /></LabShell>;
}