import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/workspace/lojas/")({
  beforeLoad: () => {
    throw redirect({ to: "/auth/portal-selector" });
  },
});

export default function WorkspaceLojasRedirect() {
  return null;
}
