import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/workspace/pedidos/gestor")({
  head: () => ({ meta: [{ title: "Gestor de Pedidos Omnichannel | Workspace Waesy" }] }),
  beforeLoad: () => {
    throw redirect({ to: "/workspace/pedidos" });
  },
  component: () => null,
});
