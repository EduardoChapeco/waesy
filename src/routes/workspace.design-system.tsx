import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/workspace/design-system")({
  head: () => ({
    meta: [{ title: "Design System Canônico | Admin Master" }],
  }),
  beforeLoad: async () => {
    throw redirect({ to: "/admin-master/marca" });
  },
  component: () => null,
});
