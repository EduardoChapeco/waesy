/**
 * Rota Canônica /busca -> Redirecionamento transparente para /buscar
 *
 * Fase F14 do Plano Mestre de Estabilização dos 4 Pilares.
 * Garante paridade semântica de busca pública sem duplicar componentes de UI.
 */

import { createFileRoute, redirect } from "@tanstack/react-router";
import { z } from "zod";

const searchSchema = z.object({
  q: z.string().optional(),
  tipo: z.enum(["product", "event", "classified", "store", "recipe"]).optional(),
});

export const Route = createFileRoute("/_store/busca")({
  validateSearch: searchSchema,
  beforeLoad: ({ search }) => {
    throw redirect({
      to: "/buscar",
      search: {
        q: search.q,
        tipo: search.tipo,
      },
    });
  },
  component: () => null,
});
