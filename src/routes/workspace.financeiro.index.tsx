import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/workspace/financeiro/")({
  beforeLoad: () => {
    throw redirect({ to: "/workspace/financeiro/caixa" });
  },
  component: () => null,
});
