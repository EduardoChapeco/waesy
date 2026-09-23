import { createFileRoute, redirect, isRedirect } from "@tanstack/react-router";

export const Route = createFileRoute("/assinatura/$token")({
 loader: async ({ params }) => {
   try {
 throw redirect({
 to: "/assinar/$token",
 params: { token: params.token },
 });
   } catch (err) {
      if (isRedirect(err)) throw err;
     console.error("[loader:assinatura.$token] Unhandled error:", err);
     return null as any;
    }
 },
 component: () => null,
});
