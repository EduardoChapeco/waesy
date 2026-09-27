import React from "react";
import { VitrineHome } from "@/routes/_store.index";

/**
 * app/page.tsx — Rota Raiz (V62 Root Route Purge)
 *
 * A Landing Page de captação foi movida fisicamente para /cadastroantecipado.
 * A raiz renderiza exclusivamente a Vitrine de Classificados & Explorar.
 */
export default function Page() {
  return <VitrineHome />;
}
