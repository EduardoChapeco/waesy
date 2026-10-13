import React from "react";
import { useIsDesktop } from "@/hooks/use-mobile";
import { ClassifiedDetailMobile } from "./classified-detail-mobile";
import { ClassifiedDetailDesktop } from "./classified-detail-desktop";

import type { UniversalClassifiedShowcaseProps } from "@/types/unified-ad-engine";
export type { UniversalClassifiedShowcaseProps };

/**
 * UniversalClassifiedShowcase — Native-First Bifurcation Wrapper (MASTER PROMPT V40)
 *
 * Erradica o "CSS Preguiçoso" (hidden md:block / lg:hidden) para layouts estruturais.
 * Realiza a renderização condicional verdadeira via JavaScript:
 * - Mobile (< 1024px): <ClassifiedDetailMobile /> com sensação 100% nativa de App (iOS/Android),
 *   imagem edge-to-edge tocando no topo, botão circular flutuante de Voltar e Sticky Bottom CTA Bar.
 * - Desktop (>= 1024px): <ClassifiedDetailDesktop /> com Split-Screen de 2 colunas (7/5),
 *   breadcrumbs visíveis, bento media gallery 16:10 e card sticky lateral.
 */
export function UniversalClassifiedShowcase(props: UniversalClassifiedShowcaseProps) {
  const isDesktop = useIsDesktop(1024);
  const effectiveIsDesktop =
    props.previewViewport === "mobile"
      ? false
      : props.previewViewport === "desktop"
      ? true
      : isDesktop;

  if (!effectiveIsDesktop) {
    return <ClassifiedDetailMobile {...props} />;
  }

  return <ClassifiedDetailDesktop {...props} />;
}
