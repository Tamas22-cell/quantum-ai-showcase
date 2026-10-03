import { Outlet, createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/lab/ai")({
  component: AiLayout,
});

function AiLayout() {
  return <Outlet />;
}
