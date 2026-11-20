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
 * - Demais Classificados Mobile (< 840px ou `previewViewport === "mobile"`): <ClassifiedDetailMobile />
 * - Demais Classificados Desktop (>= 840px ou `previewViewport === "desktop"`): <ClassifiedDetailDesktop />
 */
export function UniversalClassifiedShowcase(props: UniversalClassifiedShowcaseProps) {
  const isDesktop = useIsDesktop(840);
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
        accepts_pix: attrs.accepts_pix ?? classified.accepts_pix,
        pix_discount_percent: attrs.pix_discount_percent ?? classified.pix_discount_percent,
        accepts_card: attrs.accepts_card ?? classified.accepts_card,
        max_installments: attrs.max_installments ?? classified.max_installments,
        accepts_boleto: attrs.accepts_boleto ?? classified.accepts_boleto,
        accepts_boleto_installments: attrs.accepts_boleto_installments ?? classified.accepts_boleto_installments,
        max_boleto_installments: attrs.max_boleto_installments ?? classified.max_boleto_installments,
        accepts_carne: attrs.accepts_carne ?? classified.accepts_carne,
        max_carne_installments: attrs.max_carne_installments ?? classified.max_carne_installments,
        carne_grace_days: attrs.carne_grace_days ?? classified.carne_grace_days,
        accepts_cash: attrs.accepts_cash ?? classified.accepts_cash,
        accepts_trade: attrs.accepts_trade ?? classified.accepts_trade,
        accepts_financing: attrs.accepts_financing ?? classified.accepts_financing,
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

  const seedParams = attrs.infotravel_seed_params;
  const customizeHref = seedParams?.dynamic_customizable
    ? `/turismo?destination=${encodeURIComponent(String(seedParams.destination || attrs.destination_city || classified.title || ""))}&departureDate=${encodeURIComponent(String(seedParams.checkIn || attrs.departure_date || ""))}&returnDate=${encodeURIComponent(String(seedParams.checkOut || attrs.return_date || ""))}&adults=${encodeURIComponent(String(seedParams.adults || 2))}`
    : null;

  const dynamicBanner = customizeHref ? (
    <div className="mx-auto max-w-7xl px-4 pt-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border border-primary/20 bg-primary/5">
        <div className="text-xs">
          <strong className="font-bold text-foreground block">Pacote Dinâmico InfoTravel</strong>
          <span className="text-muted-foreground">
            Altere datas de embarque, número de quartos ou ocupação com recálculo em tempo real na operadora.
          </span>
        </div>
        <a
          href={customizeHref}
          className="inline-flex items-center justify-center h-11 min-h-11 px-4 rounded-lg bg-primary text-primary-foreground text-xs font-bold shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Personalizar Datas
        </a>
      </div>
    </div>
  ) : null;

  if (isTravelEditorial) {
    return (
      <>
        {dynamicBanner}
        <EditorialShowcaseView
          classified={normalizedClassified}
          isOwner={props.isOwner}
          onOpenBookingModal={props.onOpenBookingModal as any}
          onOpenProposalModal={props.onOpenProposalModal}
          onEditClassified={props.onEdit}
          onOpenCompanionCard={props.onOpenCompanion}
          previewViewport={props.previewViewport === "auto" ? undefined : props.previewViewport}
        />
      </>
    );
  }

  if (!effectiveIsDesktop) {
    return (
      <>
        {dynamicBanner}
        <ClassifiedDetailMobile {...props} classified={normalizedClassified} />
      </>
    );
  }

  return (
    <>
      {dynamicBanner}
      <ClassifiedDetailDesktop {...props} classified={normalizedClassified} />
    </>
  );
}
