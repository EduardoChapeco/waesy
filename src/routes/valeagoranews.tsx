import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/valeagoranews")({
  beforeLoad: () => {
    throw redirect({
      to: "/waesynews",
    });
  },
  component: () => null,
});
