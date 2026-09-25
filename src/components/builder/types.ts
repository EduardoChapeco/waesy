/**
 * types.ts — Contratos e Tipagens para o Omni-Builder (Construtor de Vitrines & Landing Pages)
 */

import React from "react";

export type SiteBlockCategory = "hero" | "bento" | "gallery" | "pricing" | "social_proof" | "cta_footer";

export interface BaseSiteBlockProps {
  id: string;
  className?: string;
}

export interface HeroBlockData {
  badgeText?: string;
  title: string;
  subtitle: string;
  primaryCta: {
    label: string;
    href: string;
    onClick?: () => void;
  };
  secondaryCta?: {
    label: string;
    href: string;
    onClick?: () => void;
  };
  imageUrl?: string;
  imageAlt?: string;
  floatingStat?: {
    label: string;
    value: string;
    statusDot?: boolean;
  };
}

export interface BentoCellData {
  id: string;
  tag?: string;
  title: string;
  description?: string;
  statNumber?: string;
  statLabel?: string;
  chips?: string[];
  colSpan?: 1 | 2 | 3;
  iconName?: string;
}

export interface BentoBlockData {
  sectionTitle?: string;
  sectionSubtitle?: string;
  cells: BentoCellData[];
}

export interface PricingPlanTier {
  id: string;
  name: string;
  badge?: string;
  priceMonthlyCents: number;
  priceAnnualCents?: number;
  description: string;
  features: string[];
  ctaLabel: string;
  isPopular?: boolean;
}

export interface PricingBlockData {
  title: string;
  subtitle?: string;
  tiers: PricingPlanTier[];
}

export interface SiteBuilderBlockDefinition<T = any> {
  id: string;
  name: string;
  category: SiteBlockCategory;
  description: string;
  component: React.ComponentType<T>;
  defaultProps: T;
}
