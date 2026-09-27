import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/workspace/turismo/propostas/novo")({
  beforeLoad: () => {
    throw redirect({
      to: "/workspace/turismo/propostas",
      search: { new: true },
    });
  },
  component: () => null,
});
