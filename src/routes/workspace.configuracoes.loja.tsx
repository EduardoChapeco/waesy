import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/workspace/configuracoes/loja")({
  beforeLoad: () => {
    throw redirect({ to: "/workspace/configuracoes" });
  },
});
