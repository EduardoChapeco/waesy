import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/workspace/master/influencers")({
  head: () => ({ meta: [{ title: "Influenciadores | Master" }] }),
  beforeLoad: async () => {
    throw redirect({ to: "/admin-master/curadoria" });
  },
  component: () => null,
});
