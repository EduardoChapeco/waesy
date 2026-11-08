import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000, // 1 minuto de frescor padrão (SPEC-20261104)
        gcTime: 1000 * 60 * 10, // 10 minutos de cache garbage collection
        refetchOnWindowFocus: false, // Previne tempestade de requests ao alternar abas
        retry: 1,
      },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreload: "intent",
    defaultPreloadDelay: 300, // 300ms de intenção real de clique (previne disparos em hover acidental)
    defaultPreloadStaleTime: 60_000,
    defaultStaleTime: 30_000,
    trailingSlash: "never",
  });

  return router;
};
