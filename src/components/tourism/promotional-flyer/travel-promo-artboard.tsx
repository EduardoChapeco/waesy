/**
 * travel-promo-artboard.tsx — Motor de Canvas e Renderização de Templates Sociais & StoryDocument (1080×1920)
 * Padrão Story 9:16 / Feed 4:5 / Quadrado 1:1 | Suporte ao Liquid Glass Engine e Edição Estruturada
 */

import React, { useMemo } from "react";
import { getSocialTemplateById } from "@/components/social-templates";
import type { SocialAspectRatio } from "@/components/social-templates/types";
import type { GlassMaterial } from "@/lib/travel/liquid-glass-engine";

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
  priceBasisLabel?: string;
  occupancySummaryLabel?: string;
  backgroundImageUrl: string;
  paymentMethodsLabel?: string;
  aspectRatio?: PromoAspectRatio;
  themeGradient?:
    | "ocean_blue"
    | "sunset_amber"
    | "emerald_nature"
    | "midnight_luxury"
    | "caribbean_turquoise"
    | "nordic_snow";
  promoBadge?: string;
  storeName?: string;
  templateId?: string;
  ctaLabel?: string;
  glassMaterial?: Partial<GlassMaterial>;
  titleFontSizeOverride?: number;
  titleOffsetX?: number;
  titleOffsetY?: number;
  priceCardOffsetX?: number;
  priceCardOffsetY?: number;
  priceCardScale?: number;
  photoObjectPositionY?: number;
}

interface TravelPromoArtboardProps {
  data: TravelPromoData;
  artboardRef?: React.Ref<HTMLDivElement>;
  scale?: number;
  className?: string;
  isAnimated?: boolean;
}

export function TravelPromoArtboard({
  data,
  artboardRef,
  scale = 1,
  className = "",
  isAnimated = false,
}: TravelPromoArtboardProps) {
  const { aspectRatio = "9:16", templateId = "travel_editorial" } = data;

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

  const templateDefinition = useMemo(() => {
    return getSocialTemplateById(templateId);
  }, [templateId]);

  const TemplateComponent = templateDefinition.component;

  const content = (
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
        priceBasisLabel: data.priceBasisLabel,
        occupancySummaryLabel: data.occupancySummaryLabel,
        paymentMethodsLabel: data.paymentMethodsLabel,
        backgroundImageUrl: data.backgroundImageUrl,
        aspectRatio,
        themeGradient: data.themeGradient,
        promoBadge: data.promoBadge,
        storeName: data.storeName,
        ctaLabel: data.ctaLabel,
        glassMaterial: data.glassMaterial,
        titleFontSizeOverride: data.titleFontSizeOverride,
        titleOffsetX: data.titleOffsetX,
        titleOffsetY: data.titleOffsetY,
        priceCardOffsetX: data.priceCardOffsetX,
        priceCardOffsetY: data.priceCardOffsetY,
        priceCardScale: data.priceCardScale,
        photoObjectPositionY: data.photoObjectPositionY,
      }}
    />
  );

  return (
    <div
      ref={artboardRef}
      id="travel-promo-canvas-artboard"
      style={{
        width: `${dimensions.width}px`,
        height: `${dimensions.height}px`,
        transform: scale !== 1 ? `scale(${scale})` : undefined,
        transformOrigin: "top left",
        backgroundColor: "rgb(10, 25, 47)",
      }}
      className={`relative overflow-hidden text-white select-none ${className}`}
    >
      {isAnimated ? (
        <div
          key={`${templateId}-${aspectRatio}`}
          className="w-full h-full transition-transform duration-300 ease-out animate-in fade-in zoom-in-95"
        >
          {content}
        </div>
      ) : (
        content
      )}
    </div>
  );
}
