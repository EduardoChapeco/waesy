/**
 * types.ts — Tipos Canônicos para o Motor de Templates Sociais (Social Engine)
 * Padrão Ultra HD para Instagram Story (9:16), Feed (4:5) e Quadrado (1:1)
 */

import React from "react";

export type SocialAspectRatio = "9:16" | "4:5" | "1:1";

export type SocialNiche = "turismo" | "imoveis" | "varejo" | "gastronomia" | "veiculos" | "geral";

export interface SocialFlyerData {
  // Identificação e Textos
  title: string;
  subtitle?: string | null;
  destinationOrLocation?: string | null;
  datesOrAvailability?: string | null;
  
  // Financeiro
  priceCents?: number | null;
  originalPriceCents?: number | null;
  maxInstallments?: number;
  installmentCents?: number | null;
  pricingMode?: "per_person" | "total_package" | "unit" | "monthly";
  paymentMethodsLabel?: string;

  // Destaques e Atributos (Chips)
  highlights?: string[];
  promoBadge?: string | null;
  
  // Mídia e Identidade
  backgroundImageUrl: string;
  logoUrl?: string | null;
  storeName?: string;
  verifiedPartner?: boolean;

  // Estilização & Ação
  aspectRatio: SocialAspectRatio;
  themeGradient?: string;
  niche?: SocialNiche;
  ctaLabel?: string;
}

export interface SocialTemplateProps {
  data: SocialFlyerData;
  scale?: number;
  className?: string;
}

export interface SocialTemplateDefinition {
  id: string;
  name: string;
  niche: SocialNiche;
  description: string;
  supportedRatios: SocialAspectRatio[];
  component: React.ComponentType<SocialTemplateProps>;
}
