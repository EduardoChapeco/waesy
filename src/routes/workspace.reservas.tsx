import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/workspace/reservas")({
  head: () => ({ meta: [{ title: "Reservas | Workspace Waesy" }] }),
  beforeLoad: () => {
    throw redirect({ to: "/workspace/pdv/comandas" });
  },
  component: () => null,
});
