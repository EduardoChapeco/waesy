import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_store/marketplace/checkout")({
  beforeLoad: () => {
    throw redirect({ to: "/checkout" });
  },
  component: () => null,
});
