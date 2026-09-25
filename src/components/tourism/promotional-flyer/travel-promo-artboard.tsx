/**
 * travel-promo-artboard.tsx — Motor de Canvas e Renderização de Templates Sociais
 * Padrão Story 9:16 / Feed 4:5 / Quadrado 1:1 | Suporte a Centenas de Templates por Nicho
 */

import React, { useMemo } from "react";
import { getSocialTemplateById } from "@/components/social-templates";
import type { SocialAspectRatio } from "@/components/social-templates/types";

export type PromoAspectRatio = SocialAspectRatio;

export interface TravelPromoData {
  title: string;
  destination: string;
  datesText?: string | null;
  inclusions: string[];
  priceCents?: number | null;
  originalPriceCents?: number | null;
  maxInstallments?: number;
  installmentCents?: number | null;
  pricingMode?: "per_person" | "total_package" | "unit" | "monthly";
  backgroundImageUrl: string;
  paymentMethodsLabel?: string;
  aspectRatio?: PromoAspectRatio;
  themeGradient?: "ocean_blue" | "sunset_amber" | "emerald_nature" | "midnight_luxury" | "caribbean_turquoise" | "nordic_snow";
  promoBadge?: string;
  storeName?: string;
  templateId?: string;
  ctaLabel?: string;
}

interface TravelPromoArtboardProps {
  data: TravelPromoData;
  artboardRef?: React.Ref<HTMLDivElement>;
  scale?: number;
  className?: string;
}

export function TravelPromoArtboard({
  data,
  artboardRef,
  scale = 1,
  className = "",
}: TravelPromoArtboardProps) {
  const { aspectRatio = "9:16", templateId = "travel_editorial" } = data;

  // Dimensões base canônicas de exportação em alta resolução (renderizadas no DOM para html2canvas)
  const dimensions = useMemo(() => {
    switch (aspectRatio) {
      case "4:5":
        return { width: 1080, height: 1350 };
      case "1:1":
        return { width: 1080, height: 1080 };
      case "9:16":
      default:
        return { width: 1080, height: 1920 };
    }
  }, [aspectRatio]);

  // Recupera o componente do template selecionado no registro modular
  const templateDefinition = useMemo(() => {
    return getSocialTemplateById(templateId);
  }, [templateId]);

  const TemplateComponent = templateDefinition.component;

  return (
    <div
      ref={artboardRef}
      id="travel-promo-canvas-artboard"
      style={{
        width: `${dimensions.width}px`,
        height: `${dimensions.height}px`,
        transform: scale !== 1 ? `scale(${scale})` : undefined,
        transformOrigin: "top left",
      }}
      className={`relative overflow-hidden bg-[#0a192f] text-white select-none ${className}`}
    >
      <TemplateComponent
        data={{
          title: data.title,
          subtitle: data.datesText,
          destinationOrLocation: data.destination,
          datesOrAvailability: data.datesText,
          highlights: data.inclusions,
          priceCents: data.priceCents,
          originalPriceCents: data.originalPriceCents,
          maxInstallments: data.maxInstallments,
          installmentCents: data.installmentCents,
          pricingMode: data.pricingMode,
          paymentMethodsLabel: data.paymentMethodsLabel,
          backgroundImageUrl: data.backgroundImageUrl,
          aspectRatio,
          themeGradient: data.themeGradient,
          promoBadge: data.promoBadge,
          storeName: data.storeName,
          ctaLabel: data.ctaLabel,
        }}
      />
    </div>
  );
}
