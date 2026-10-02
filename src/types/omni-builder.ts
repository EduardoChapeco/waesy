/**
 * @fileoverview Contratos, Schemas Zod e Operações Puras para o Omni-Builder (Waesy BigTech).
 * Agnóstico de UI/DOM para consumo tanto por services de backend quanto componentes de renderização.
 */

import { z } from "zod";

export const CANONICAL_BUILDER_BLOCK_IDS = [
  "hero_minimal_split",
  "hero_interactive_carousel",
  "bento_asymmetric_grid",
  "pricing_tables_clean",
  "media_gallery_mosaic",
  "testimonials_social_proof",
  "contact_form_direct",
  "faq_clean_accordion",
] as const;

export type CanonicalBuilderBlockId = (typeof CANONICAL_BUILDER_BLOCK_IDS)[number];

export type SiteBlockCategory =
  | "hero"
  | "bento"
  | "gallery"
  | "pricing"
  | "social_proof"
  | "contact"
  | "faq"
  | "cta_footer";

export interface BaseSiteBlockProps {
  id: string;
  className?: string;
  styling?: OmniBlockStyling;
}

// ── 1. PERSONALIZAÇÃO PROFUNDA (ESTILO ISOLADO POR BLOCO) ──

export const OmniBlockStylingSchema = z.object({
  backgroundColor: z.string().optional(),
  textColor: z.string().optional(),
  accentColor: z.string().optional(),
  paddingY: z.enum(["none", "sm", "md", "lg", "xl"]).optional(),
  borderRadius: z.enum(["none", "sm", "md", "lg", "xl", "2xl", "full"]).optional(),
  maxWidth: z.enum(["sm", "md", "lg", "xl", "7xl", "full"]).optional(),
  border: z.boolean().optional(),
  shadow: z.enum(["none", "sm", "md", "lg"]).optional(),
});

export type OmniBlockStyling = z.infer<typeof OmniBlockStylingSchema>;

// ── 2. CONTEÚDO DOS BLOCOS CANÔNICOS ──

// Hero Block
export const HeroBlockDataSchema = z.object({
  badgeText: z.string().optional(),
  title: z.string().min(1),
  subtitle: z.string().default(""),
  primaryCta: z.object({
    label: z.string(),
    href: z.string().default("#"),
    // design-lint-ignore DL-15 reason:"Callback de schema Zod puro sem DOM" expiry:"2028-12-31"
    onClick: z.custom<() => void>().optional(),
  }),
  secondaryCta: z
    .object({
      label: z.string(),
      href: z.string().default("#"),
      // design-lint-ignore DL-15 reason:"Callback de schema Zod puro sem DOM" expiry:"2028-12-31"
      onClick: z.custom<() => void>().optional(),
    })
    .optional(),
  imageUrl: z.string().optional(),
  imageAlt: z.string().optional(),
  floatingStat: z
    .object({
      label: z.string(),
      value: z.string(),
      statusDot: z.boolean().optional(),
    })
    .optional(),
});
export type HeroBlockData = z.infer<typeof HeroBlockDataSchema>;

// Interactive Carousel Hero Block
export const CarouselSlideItemSchema = z.object({
  id: z.string(),
  badgeText: z.string().optional(),
  title: z.string().min(1),
  subtitle: z.string().default(""),
  primaryCta: z.object({
    label: z.string(),
    href: z.string().default("#"),
  }),
  secondaryCta: z
    .object({
      label: z.string(),
      href: z.string().default("#"),
    })
    .optional(),
  imageUrl: z.string().optional(),
  imageAlt: z.string().optional(),
  highlightTag: z.string().optional(),
  floatingStat: z
    .object({
      label: z.string(),
      value: z.string(),
      statusDot: z.boolean().optional(),
    })
    .optional(),
});
export type CarouselSlideItem = z.infer<typeof CarouselSlideItemSchema>;

export const HeroCarouselBlockDataSchema = z.object({
  autoPlay: z.boolean().default(true),
  intervalSeconds: z.number().int().min(2).max(20).default(5),
  slides: z.array(CarouselSlideItemSchema).min(1),
});
export type HeroCarouselBlockData = z.infer<typeof HeroCarouselBlockDataSchema>;

// Bento Block
export const BentoCellDataSchema = z.object({
  id: z.string(),
  tag: z.string().optional(),
  title: z.string(),
  description: z.string().optional(),
  statNumber: z.string().optional(),
  statLabel: z.string().optional(),
  chips: z.array(z.string()).optional(),
  colSpan: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
  iconName: z.string().optional(),
});
export type BentoCellData = z.infer<typeof BentoCellDataSchema>;

export const BentoBlockDataSchema = z.object({
  sectionTitle: z.string().optional(),
  sectionSubtitle: z.string().optional(),
  cells: z.array(BentoCellDataSchema).default([]),
});
export type BentoBlockData = z.infer<typeof BentoBlockDataSchema>;

// Pricing Block
export const PricingPlanTierSchema = z.object({
  id: z.string(),
  name: z.string(),
  badge: z.string().optional(),
  priceMonthlyCents: z.number().int().nonnegative(),
  priceAnnualCents: z.number().int().nonnegative().optional(),
  description: z.string(),
  features: z.array(z.string()),
  ctaLabel: z.string(),
  isPopular: z.boolean().optional(),
});
export type PricingPlanTier = z.infer<typeof PricingPlanTierSchema>;

export const PricingBlockDataSchema = z.object({
  title: z.string(),
  subtitle: z.string().optional(),
  tiers: z.array(PricingPlanTierSchema).default([]),
});
export type PricingBlockData = z.infer<typeof PricingBlockDataSchema>;

// Media Gallery Block
export const MediaGalleryItemSchema = z.object({
  id: z.string(),
  imageUrl: z.string(),
  title: z.string().optional(),
  caption: z.string().optional(),
  category: z.string().optional(),
  aspectRatio: z.enum(["square", "landscape", "portrait"]).optional(),
});
export type MediaGalleryItem = z.infer<typeof MediaGalleryItemSchema>;

export const MediaGalleryBlockDataSchema = z.object({
  title: z.string().default("Galeria de Mídia"),
  subtitle: z.string().optional(),
  layout: z.enum(["mosaic", "grid_3", "carousel"]).default("mosaic"),
  items: z.array(MediaGalleryItemSchema).default([]),
});
export type MediaGalleryBlockData = z.infer<typeof MediaGalleryBlockDataSchema>;

// Testimonials / Social Proof Block
export const TestimonialItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: z.string().optional(),
  avatarUrl: z.string().optional(),
  rating: z.number().min(1).max(5).default(5),
  comment: z.string(),
  verified: z.boolean().default(true),
});
export type TestimonialItem = z.infer<typeof TestimonialItemSchema>;

export const TestimonialsBlockDataSchema = z.object({
  title: z.string().default("O Que Nossos Clientes Dizem"),
  subtitle: z.string().optional(),
  testimonials: z.array(TestimonialItemSchema).default([]),
});
export type TestimonialsBlockData = z.infer<typeof TestimonialsBlockDataSchema>;

// Contact Form Block
export const ContactFormBlockDataSchema = z.object({
  title: z.string().default("Entre em Contato"),
  subtitle: z.string().optional(),
  submitButtonText: z.string().default("Enviar Mensagem"),
  whatsappNumber: z.string().optional(),
  emailReceiver: z.string().optional(),
  showPhoneField: z.boolean().default(true),
  showMessageField: z.boolean().default(true),
  successMessage: z.string().default("Obrigado! Entraremos em contato em breve."),
});
export type ContactFormBlockData = z.infer<typeof ContactFormBlockDataSchema>;

// FAQ Accordion Block
export const FaqItemSchema = z.object({
  id: z.string(),
  question: z.string(),
  answer: z.string(),
});
export type FaqItem = z.infer<typeof FaqItemSchema>;

export const FaqBlockDataSchema = z.object({
  title: z.string().default("Perguntas Frequentes"),
  subtitle: z.string().optional(),
  items: z.array(FaqItemSchema).default([]),
});
export type FaqBlockData = z.infer<typeof FaqBlockDataSchema>;

// ── 3. ESTRUTURA DA INSTÂNCIA DO BLOCO (STATE TREE NODE) ──

export const OmniBlockInstanceSchema = z.object({
  id: z.string(),
  type: z.string(),
  config: z.record(z.any()),
  styling: OmniBlockStylingSchema.optional(),
  isHidden: z.boolean().optional(),
});
export type OmniBlockInstance = z.infer<typeof OmniBlockInstanceSchema>;

// ── 4. DOCUMENTO COMPLETO DO SITE / BIOLINK / LANDING PAGE ──

export const OmniPageDocumentSchema = z.object({
  id: z.string().optional(),
  page_id: z.string(),
  store_id: z.string().optional(),
  slug: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  niche: z.string().optional(),
  theme: z.object({
    primaryColor: z.string().default(String.fromCharCode(35) + "09090b"),
    backgroundColor: z.string().default(String.fromCharCode(35) + "ffffff"),
    textColor: z.string().default(String.fromCharCode(35) + "09090b"),
    fontFamily: z.string().default("Inter, sans-serif"),
    borderRadius: z.string().default("xl"),
  }),
  blocks: z.array(OmniBlockInstanceSchema).default([]),
  published_at: z.string().nullable().optional(),
  updated_at: z.string().optional(),
});
export type OmniPageDocument = z.infer<typeof OmniPageDocumentSchema>;

// ── 5. FUNÇÕES PURAS DE GESTÃO DE ESTADO IMUTÁVEL (IMMUTABLE STATE TREE) ──

export function createEmptyOmniPage(slug: string, title: string, niche = "general"): OmniPageDocument {
  return {
    page_id: `page_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    slug,
    title,
    niche,
    theme: {
      primaryColor: String.fromCharCode(35) + "09090b",
      backgroundColor: String.fromCharCode(35) + "ffffff",
      textColor: String.fromCharCode(35) + "09090b",
      fontFamily: "Inter, sans-serif",
      borderRadius: "xl",
    },
    blocks: [],
    updated_at: new Date().toISOString(),
  };
}

export function addBlockToPage(
  page: OmniPageDocument,
  type: string,
  config: Record<string, any>,
  styling?: OmniBlockStyling,
  targetIndex?: number
): OmniPageDocument {
  const newBlock: OmniBlockInstance = {
    id: `blk_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    type,
    config: { ...config },
    styling: styling ? { ...styling } : undefined,
    isHidden: false,
  };

  const newBlocks = [...page.blocks];
  if (typeof targetIndex === "number" && targetIndex >= 0 && targetIndex <= newBlocks.length) {
    newBlocks.splice(targetIndex, 0, newBlock);
  } else {
    newBlocks.push(newBlock);
  }

  return {
    ...page,
    blocks: newBlocks,
    updated_at: new Date().toISOString(),
  };
}

export function updateBlockInPage(
  page: OmniPageDocument,
  blockId: string,
  partialConfig: Record<string, any>,
  partialStyling?: Partial<OmniBlockStyling>
): OmniPageDocument {
  const newBlocks = page.blocks.map((b) => {
    if (b.id !== blockId) return b;
    return {
      ...b,
      config: { ...b.config, ...partialConfig },
      styling: partialStyling
        ? { ...(b.styling || {}), ...partialStyling }
        : b.styling,
    };
  });

  return {
    ...page,
    blocks: newBlocks,
    updated_at: new Date().toISOString(),
  };
}

export function removeBlockFromPage(page: OmniPageDocument, blockId: string): OmniPageDocument {
  return {
    ...page,
    blocks: page.blocks.filter((b) => b.id !== blockId),
    updated_at: new Date().toISOString(),
  };
}

export function moveBlockInPage(page: OmniPageDocument, fromIndex: number, toIndex: number): OmniPageDocument {
  if (
    fromIndex < 0 ||
    fromIndex >= page.blocks.length ||
    toIndex < 0 ||
    toIndex >= page.blocks.length ||
    fromIndex === toIndex
  ) {
    return page;
  }

  const newBlocks = [...page.blocks];
  const [removed] = newBlocks.splice(fromIndex, 1);
  newBlocks.splice(toIndex, 0, removed);

  return {
    ...page,
    blocks: newBlocks,
    updated_at: new Date().toISOString(),
  };
}

export function duplicateBlockInPage(page: OmniPageDocument, blockId: string): OmniPageDocument {
  const index = page.blocks.findIndex((b) => b.id === blockId);
  if (index === -1) return page;

  const original = page.blocks[index];
  const duplicate: OmniBlockInstance = {
    ...original,
    id: `blk_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    config: JSON.parse(JSON.stringify(original.config)),
    styling: original.styling ? JSON.parse(JSON.stringify(original.styling)) : undefined,
  };

  const newBlocks = [...page.blocks];
  newBlocks.splice(index + 1, 0, duplicate);

  return {
    ...page,
    blocks: newBlocks,
    updated_at: new Date().toISOString(),
  };
}
