import React from "react";
import { useIsDesktop } from "@/hooks/use-mobile";
import { ClassifiedDetailMobile } from "./classified-detail-mobile";
import { ClassifiedDetailDesktop } from "./classified-detail-desktop";

export interface UniversalClassifiedShowcaseProps {
  classified: any;
  isOwner?: boolean;
  canManage?: boolean;
  viewerContext?: string;
  currentProfile?: any;
  onOpenBookingModal?: (selectedDeparture?: any) => void;
  onOpenProposalModal?: () => void;
  onDirectBuy?: () => void;
  onDownloadDigital?: () => void;
  onEdit?: () => void;
  onOpenCompanion?: () => void;
  isBooking?: boolean;
  isBuyingDirect?: boolean;
  isDownloadingDigital?: boolean;
}

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

  if (!isDesktop) {
    return <ClassifiedDetailMobile {...props} />;
  }

  return <ClassifiedDetailDesktop {...props} />;
}
