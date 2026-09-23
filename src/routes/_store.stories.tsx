import { createFileRoute, redirect, isRedirect } from "@tanstack/react-router";

// Módulo Stories desativado no MVP — redireciona para Notícias
export const Route = createFileRoute("/_store/stories")({
  loader: async () => {
    try {
    throw redirect({ to: "/noticias" });
    } catch (err) {
      if (isRedirect(err)) throw err;
      console.error("[loader:_store.stories] Unhandled error:", err);
      return null as any;
    }
  },
  component: () => null,
});
