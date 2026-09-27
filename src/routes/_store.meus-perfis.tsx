import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_store/meus-perfis")({
  beforeLoad: () => {
    throw redirect({ to: "/conta/criadores" });
  },
});
