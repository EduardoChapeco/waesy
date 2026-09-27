import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_store/personas")({
  beforeLoad: () => {
    throw redirect({ to: "/conta/criadores" });
  },
});
