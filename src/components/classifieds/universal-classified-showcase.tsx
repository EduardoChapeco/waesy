import React from "react";
import { useIsDesktop } from "@/hooks/use-mobile";
import { ClassifiedDetailMobile } from "./classified-detail-mobile";
import { ClassifiedDetailDesktop } from "./classified-detail-desktop";
import { EditorialShowcaseView } from "./editorial-showcase-view";

import type { UniversalClassifiedShowcaseProps } from "@/types/unified-ad-engine";
export type { UniversalClassifiedShowcaseProps };

/**
 * UniversalClassifiedShowcase — Native-First Bifurcation Wrapper
 *
 * - Pacotes de Viagem, Turismo, Roteiros e Template Editorial: <EditorialShowcaseView />
 *   (Grid 7+5 colunas com galeria 16:10 + miniaturas, Abas Dinâmicas Infos do Pacote / Fotos / Roteiro / Condições,
 *   Malha Aérea Google Flights, Hospedagens com Galeria e Coluna Comercial Sticky).
 * - Demais Classificados Mobile (< 1024px): <ClassifiedDetailMobile />
 * - Demais Classificados Desktop (>= 1024px): <ClassifiedDetailDesktop />
 */
export function UniversalClassifiedShowcase(props: UniversalClassifiedShowcaseProps) {
  const isDesktop = useIsDesktop(1024);
  const effectiveIsDesktop =
    props.previewViewport === "mobile"
      ? false
      : props.previewViewport === "desktop"
      ? true
      : isDesktop;

  const classified = props.classified || {};
  const attrs = classified.attributes || {};
  const rawCat = String(
    classified.category_slug ||
      classified.category_name ||
      classified.category ||
      attrs.niche ||
      attrs.vertical ||
      ""
  ).toLowerCase();

  const isTravelOrEditorial = Boolean(
    classified.template_style === "editorial" ||
      attrs.template_style === "editorial" ||
      rawCat.includes("viag") ||
      rawCat.includes("turism") ||
      rawCat.includes("tour") ||
      rawCat.includes("roteir") ||
      rawCat.includes("excurs") ||
      attrs.destination_city ||
      attrs.itinerary_days?.length ||
      attrs.lodgings?.length ||
      attrs.departure_options?.length ||
      attrs.flight_details
  );

  if (isTravelOrEditorial) {
    return (
      <EditorialShowcaseView
        classified={classified}
        isOwner={props.isOwner}
        onOpenBookingModal={props.onOpenBookingModal as any}
        onOpenProposalModal={props.onOpenProposalModal}
        onEditClassified={props.onEdit}
        onOpenCompanionCard={props.onOpenCompanion}
      />
    );
  }

  if (!effectiveIsDesktop) {
    return <ClassifiedDetailMobile {...props} />;
  }

  return <ClassifiedDetailDesktop {...props} />;
}
