import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/workspace/crm")({
  beforeLoad: () => {
    throw redirect({ to: "/workspace/comercial" });
  },
});
