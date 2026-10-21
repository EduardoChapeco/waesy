import React from "react";
import { useIsDesktop } from "@/hooks/use-mobile";
import { ClassifiedDetailMobile } from "./classified-detail-mobile";
import { ClassifiedDetailDesktop } from "./classified-detail-desktop";
import { EditorialShowcaseView } from "./editorial-showcase-view";
import { EventClassifiedShowcaseView } from "./event-classified-showcase-view";
import { ConvenienceShowcaseView } from "./convenience-showcase-view";
import {
  normalizeClassifiedNicheId,
  resolveCompatibleClassifiedTemplate,
} from "@/lib/classifieds/canonical-taxonomy";

import type { UniversalClassifiedShowcaseProps } from "@/types/unified-ad-engine";
export type { UniversalClassifiedShowcaseProps };

/**
 * UniversalClassifiedShowcase — Native-First Bifurcation Wrapper
 *
 * Resolve de forma determinística o nicho e o template canônico (`resolveCompatibleClassifiedTemplate`):
 * - Eventos, Shows, Congressos e Ingressos: <EventClassifiedShowcaseView />
 * - Varejo / Conveniência / Delivery Rápido (`template_style === "conveniencia"`): <ConvenienceShowcaseView />
 * - Pacotes de Viagem & Turismo no template Editorial (`niche === "viagem" && template === "editorial"`): <EditorialShowcaseView />
 * - Demais Classificados Mobile (< 1024px ou `previewViewport === "mobile"`): <ClassifiedDetailMobile />
 * - Demais Classificados Desktop (>= 1024px ou `previewViewport === "desktop"`): <ClassifiedDetailDesktop />
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
    attrs.niche ||
      classified.category_slug ||
      classified.category_name ||
      classified.category ||
      attrs.vertical ||
      ""
  ).toLowerCase();

  const normalizedNiche = normalizeClassifiedNicheId(
    rawCat ||
      (attrs.event_date || (Array.isArray(attrs.ticket_tiers) && attrs.ticket_tiers.length > 0)
        ? "evento"
        : attrs.destination_city || (Array.isArray(attrs.itinerary_days) && attrs.itinerary_days.length > 0)
        ? "viagem"
        : "desapego")
  );

  const requestedTemplate = String(
    classified.template_style ||
      attrs.template_style ||
      attrs.template_id ||
      classified.template ||
      ""
  ).toLowerCase();

  const resolvedTemplate = resolveCompatibleClassifiedTemplate(
    normalizedNiche,
    requestedTemplate || undefined
  );

  const normalizedClassified = React.useMemo(
    () => ({
      ...classified,
      template_style: resolvedTemplate,
      attributes: {
        ...attrs,
        niche: attrs.niche || normalizedNiche,
        template_style: resolvedTemplate,
      },
    }),
    [classified, attrs, normalizedNiche, resolvedTemplate]
  );

  const isEventShowcase = normalizedNiche === "evento";

  if (isEventShowcase) {
    return (
      <EventClassifiedShowcaseView
        classified={normalizedClassified}
        isOwner={props.isOwner}
        onEditClassified={props.onEdit}
        previewViewport={props.previewViewport}
        templateStyle={resolvedTemplate === "standard" ? "standard" : "editorial"}
        displayMode={attrs.display_mode === "continuous_list" ? "continuous_list" : "tabs"}
      />
    );
  }

  if (resolvedTemplate === "conveniencia") {
    return (
      <ConvenienceShowcaseView
        classified={normalizedClassified}
        isOwner={props.isOwner}
        onEdit={props.onEdit}
        onOpenBookingModal={props.onOpenBookingModal}
        onOpenProposalModal={props.onOpenProposalModal}
        previewDevice={props.previewViewport === "auto" ? undefined : props.previewViewport}
        compact={!effectiveIsDesktop}
      />
    );
  }

  const isTravelEditorial =
    normalizedNiche === "viagem" && resolvedTemplate === "editorial";

  if (isTravelEditorial) {
    return (
      <EditorialShowcaseView
        classified={normalizedClassified}
        isOwner={props.isOwner}
        onOpenBookingModal={props.onOpenBookingModal as any}
        onOpenProposalModal={props.onOpenProposalModal}
        onEditClassified={props.onEdit}
        onOpenCompanionCard={props.onOpenCompanion}
        previewViewport={props.previewViewport === "auto" ? undefined : props.previewViewport}
      />
    );
  }

  if (!effectiveIsDesktop) {
    return <ClassifiedDetailMobile {...props} classified={normalizedClassified} />;
  }

  return <ClassifiedDetailDesktop {...props} classified={normalizedClassified} />;
}
