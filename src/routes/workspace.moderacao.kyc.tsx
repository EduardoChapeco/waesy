import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/workspace/moderacao/kyc")({
  head: () => ({ meta: [{ title: "Auditoria KYC | Admin Master" }] }),
  beforeLoad: async () => {
    throw redirect({ to: "/admin-master/kyc" });
  },
  component: () => null,
});
