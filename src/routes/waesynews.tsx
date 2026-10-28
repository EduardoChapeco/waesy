import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/waesynews")({
  beforeLoad: () => {
    throw redirect({
      to: "/noticias",
    });
  },
  component: () => null,
});
