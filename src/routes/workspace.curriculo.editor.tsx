import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/workspace/curriculo/editor")({
  loader: async () => {
    throw redirect({ to: "/conta/curriculo" });
  },
  component: () => null,
});
