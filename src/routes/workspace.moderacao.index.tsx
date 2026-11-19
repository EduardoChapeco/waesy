import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/workspace/moderacao/")({
  head: () => ({ meta: [{ title: "Moderação | Admin Master" }] }),
  beforeLoad: async () => {
    throw redirect({ to: "/admin-master/denuncias" });
  },
  component: () => null,
});
