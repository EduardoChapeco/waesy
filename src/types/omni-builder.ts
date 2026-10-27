/**
 * @fileoverview Contratos, Schemas Zod e Operações Puras para o Omni-Builder (Waesy BigTech).
 * Agnóstico de UI/DOM para consumo tanto por services de backend quanto componentes de renderização.
 */

import { z } from "zod";
import { BuilderAssetRefSchema } from "@/lib/builder/asset-contract";

export const CANONICAL_BUILDER_BLOCK_IDS = [
  "hero_minimal_split",
  "hero_interactive_carousel",
  "bento_asymmetric_grid",
  "pricing_tables_clean",
  "media_gallery_mosaic",
  "testimonials_social_proof",
  "contact_form_direct",
  "faq_clean_accordion",
  "interactive_quote_calculator",
  "infinite_marquee_ribbon",
  "interactive_comparison_slider",
  "interactive_lead_quiz_flow",
  "news_promethee_portal",
  "news_promethee_header",
  "news_promethee_nav",
  "news_promethee_breaking",
  "news_promethee_feed",
  "news_promethee_ad_slot",
  "news_promethee_article_reader",
  "news_promethee_footer",
  "vitrine_metamorphic_banner",
  "vitrine_bento_tetris",
  "vitrine_coupon_strip",
  "vitrine_buttons_dock",
  "vitrine_vertical_carousel",
  "vitrine_product_shelf",
  "vitrine_classifieds_rail",
  "vitrine_social_stream",
  "vitrine_ecosystem_rail",
  "vitrine_lateral_drawer",
  "ifood_feature_cards_rail",
  "ifood_recent_stores_shelf",
  "ifood_category_grid_custom",
  "ifood_showcase_store_rail",
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
  | "cta_footer"
  | "commerce"
  | "gastronomy"
  | "media"
  | "services"
  | "tourism"
  | "biolink"
  | "vitrine_app";

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
  scrollAnimation: z.enum(["none", "fade", "slide-up", "zoom-in", "stagger"]).optional(),
  animationDelayMs: z.number().int().min(0).max(2000).optional(),
  mobilePaddingY: z.enum(["none", "sm", "md", "lg", "xl"]).optional(),
  deviceVisibility: z.enum(["all", "mobile_only", "desktop_only"]).optional(),
  surfacePreset: z.enum(["default", "muted", "card", "accent"]).optional(),
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
  /** Valor mensal em centavos de BRL no plano com ciclo de cobrança anual. */
  priceAnnualCents: z.number().int().nonnegative().optional(),
  description: z.string(),
  features: z.array(z.string()),
  ctaLabel: z.string(),
  ctaHref: z.string().trim().max(2048).optional(),
  /** @deprecated Use ctaHref; mantido para leitura de documentos antigos. */
  href: z.string().trim().max(2048).optional(),
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
  imageAlt: z.string().max(500).optional(),
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
  imageAlt: z.string().max(500).optional(),
  rating: z.number().min(1).max(5).default(5),
  comment: z.string(),
  verified: z.boolean().default(false),
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

// Interactive Quote Calculator Block
export const CalculatorOptionItemSchema = z.object({
  id: z.string(),
  label: z.string(),
  description: z.string().optional(),
  priceCents: z.number().int().nonnegative().default(0),
  isDefault: z.boolean().optional(),
});
export type CalculatorOptionItem = z.infer<typeof CalculatorOptionItemSchema>;

export const InteractiveCalculatorBlockDataSchema = z.object({
  title: z.string().default("Calculadora de Cotação em Tempo Real"),
  subtitle: z.string().optional(),
  basePriceCents: z.number().int().nonnegative().default(0),
  unitLabel: z.string().default("Item"),
  unitPluralLabel: z.string().default("Itens"),
  minUnits: z.number().int().min(1).default(1),
  maxUnits: z.number().int().max(1000).default(50),
  defaultUnits: z.number().int().default(5),
  unitPriceCents: z.number().int().nonnegative().default(5000),
  options: z.array(CalculatorOptionItemSchema).default([]),
  whatsappNumber: z.string().optional(),
  submitButtonText: z.string().default("Solicitar Proposta Oficial"),
  successMessage: z.string().default("Cotação enviada com sucesso! Entraremos em contato."),
  disclaimer: z.string().default("Os valores calculados são estimativas e podem variar conforme especificações finais."),
});
export type InteractiveCalculatorBlockData = z.infer<typeof InteractiveCalculatorBlockDataSchema>;

// Infinite Marquee Ribbon Block (Inspirado no Magic UI Marquee)
export const MarqueeItemSchema = z.object({
  id: z.string(),
  text: z.string().min(1),
  badgeText: z.string().optional(),
  iconName: z.string().optional(),
  linkHref: z.string().optional(),
});
export type MarqueeItem = z.infer<typeof MarqueeItemSchema>;

export const InfiniteMarqueeBlockDataSchema = z.object({
  title: z.string().optional(),
  direction: z.enum(["left", "right"]).default("left"),
  speedSeconds: z.number().int().min(5).max(120).default(25),
  pauseOnHover: z.boolean().default(true),
  items: z.array(MarqueeItemSchema).default([]),
});
export type InfiniteMarqueeBlockData = z.infer<typeof InfiniteMarqueeBlockDataSchema>;

// Interactive Comparison Slider Block (Antes & Depois)
export const ComparisonSliderBlockDataSchema = z.object({
  title: z.string().default("Antes & Depois"),
  subtitle: z.string().optional(),
  beforeImageUrl: z.string().default(""),
  afterImageUrl: z.string().default(""),
  beforeLabel: z.string().default("Antes"),
  afterLabel: z.string().default("Depois"),
  defaultSplitPercentage: z.number().int().min(10).max(90).default(50),
});
export type ComparisonSliderBlockData = z.infer<typeof ComparisonSliderBlockDataSchema>;

// Interactive Lead Quiz Flow Block (Quiz de Qualificação de Leads para CRM)
export const QuizOptionSchema = z.object({
  id: z.string(),
  label: z.string(),
  description: z.string().optional(),
  tag: z.string().optional(),
});
export type QuizOption = z.infer<typeof QuizOptionSchema>;

export const QuizStepSchema = z.object({
  id: z.string(),
  question: z.string(),
  subtitle: z.string().optional(),
  options: z.array(QuizOptionSchema).default([]),
});
export type QuizStep = z.infer<typeof QuizStepSchema>;

export const LeadQuizBlockDataSchema = z.object({
  title: z.string().default("Descubra a Solução Sob Medida"),
  subtitle: z.string().optional(),
  steps: z.array(QuizStepSchema).default([]),
  formTitle: z.string().default("Receba sua Proposta Personalizada"),
  formSubtitle: z.string().default("Informe seus dados para enviarmos a recomendação detalhada."),
  submitButtonText: z.string().default("Concluir e Receber Diagnóstico"),
  whatsappNumber: z.string().optional(),
  successMessage: z.string().default("Diagnóstico enviado com sucesso! Nossa equipe entrará em contato."),
});
export type LeadQuizBlockData = z.infer<typeof LeadQuizBlockDataSchema>;

// Prométhée Editorial News Portal Block
export const PrometheeNewsArticleItemSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  lead: z.string().default(""),
  body: z.string().default(""),
  category: z.string().default("Para você"),
  city: z.string().default("Notícias do Vale"),
  publishedAgo: z.string().default("15min"),
  readingTime: z.string().default("4 min"),
  author: z.string().default("Redação Regional"),
  imageUrl: z.string().default(""),
  imageAlt: z.string().default(""),
  isBreaking: z.boolean().default(false),
  likesCount: z.number().int().nonnegative().default(24),
  commentsCount: z.number().int().nonnegative().default(6),
});
export type PrometheeNewsArticleItem = z.infer<typeof PrometheeNewsArticleItemSchema>;

export const PrometheeNewsAdSlotSchema = z.object({
  id: z.string(),
  format: z.enum(["banner", "card", "inline"]).default("banner"),
  sponsorName: z.string().default("Anunciante Regional"),
  headline: z.string().default("Anuncie sua marca no portal líder de audiência qualificada"),
  description: z.string().default("Formatos nativos, banners e patrocínio de editorias com alta taxa de leitura."),
  ctaLabel: z.string().default("Anunciar Agora"),
  ctaHref: z.string().default("#"),
  imageUrl: z.string().default(""),
});
export type PrometheeNewsAdSlot = z.infer<typeof PrometheeNewsAdSlotSchema>;

export const PrometheeNewsPortalBlockDataSchema = z.object({
  mastheadTitle: z.string().default("Prométhée"),
  mastheadSubtitle: z.string().default("Jornalismo Regional & Curadoria Editorial"),
  logoStyle: z.enum(["promethee_dome", "editorial_serif", "custom_image"]).default("promethee_dome"),
  logoUrl: z.string().default(""),
  dataSource: z
    .enum(["approved_mined_AND_custom", "approved_mined_only", "custom_editorial"])
    .default("approved_mined_AND_custom"),
  showCityFilter: z.boolean().default(true),
  showSearch: z.boolean().default(true),
  allowCitizenPosts: z.boolean().default(true),
  showBreakingCarousel: z.boolean().default(true),
  breakingSectionTitle: z.string().default("Plantão & Destaques em Tempo Real"),
  showAds: z.boolean().default(true),
  cities: z
    .array(z.string())
    .default([
      "Notícias do Vale",
      "São José dos Campos",
      "Taubaté",
      "Jacareí",
      "Pindamonhangaba",
      "Guaratinguetá",
      "Caraguatatuba",
      "Campos do Jordão",
    ]),
  categories: z
    .array(z.string())
    .default([
      "Para você",
      "Urgente",
      "Segurança",
      "Economia",
      "Esportes",
      "Tecnologia",
      "Cultura",
    ]),
  articles: z.array(PrometheeNewsArticleItemSchema).default([]),
  adSlots: z.array(PrometheeNewsAdSlotSchema).default([]),
});
export type PrometheeNewsPortalBlockData = z.infer<typeof PrometheeNewsPortalBlockDataSchema>;

export const PrometheeNewsHeaderBlockDataSchema = z.object({
  brandName: z.string().default("Waesynews"),
  brandTagline: z.string().default("Jornalismo Regional"),
  logoUrl: z.string().optional(),
  logoStyle: z.enum(["promethee_dome", "editorial_serif", "custom_image"]).default("promethee_dome"),
  showGpsSelector: z.boolean().default(true),
  showLiveBadge: z.boolean().default(true),
  showSearch: z.boolean().default(true),
  showCitizenPublishButton: z.boolean().default(true),
  defaultCity: z.string().default("Todas as Cidades"),
});
export type PrometheeNewsHeaderBlockData = z.infer<typeof PrometheeNewsHeaderBlockDataSchema>;

export const PrometheeNewsNavBlockDataSchema = z.object({
  categories: z
    .array(z.string())
    .default([
      "Para você",
      "Urgente",
      "Segurança",
      "Economia",
      "Esportes",
      "Tecnologia",
      "Cultura",
    ]),
  defaultSelected: z.string().default("Para você"),
  stickyNav: z.boolean().default(true),
  showTrendingPills: z.boolean().default(true),
});
export type PrometheeNewsNavBlockData = z.infer<typeof PrometheeNewsNavBlockDataSchema>;

export const PrometheeNewsBreakingBlockDataSchema = z.object({
  headline: z.string().default("Plantão Regional em Tempo Real"),
  limit: z.number().int().min(1).max(20).default(6),
  autoScroll: z.boolean().default(true),
  filterCityOnly: z.boolean().default(false),
});
export type PrometheeNewsBreakingBlockData = z.infer<typeof PrometheeNewsBreakingBlockDataSchema>;

export const PrometheeNewsFeedBlockDataSchema = z.object({
  layoutMode: z.enum(["editorial_stream", "masonry_clean", "dense_cards"]).default("editorial_stream"),
  pageSize: z.number().int().min(4).max(50).default(16),
  injectAdEveryNArticles: z.number().int().min(2).max(10).default(4),
  showShareActions: z.boolean().default(true),
  showStudioPngButton: z.boolean().default(true),
  showEngagementMetrics: z.boolean().default(true),
});
export type PrometheeNewsFeedBlockData = z.infer<typeof PrometheeNewsFeedBlockDataSchema>;

export const PrometheeNewsAdSlotBlockDataSchema = z.object({
  placementZone: z.string().default("feed_in_stream"),
  sponsorName: z.string().default("Publicidade Regional"),
  headline: z.string().default("Destaque sua marca para leitores qualificados"),
  description: z.string().default("Formatos nativos com filtro geográfico por município."),
  ctaLabel: z.string().default("Anunciar"),
  ctaHref: z.string().default("/paginas/anuncie"),
  imageUrl: z.string().optional(),
  targetCity: z.string().optional(),
});
export type PrometheeNewsAdSlotBlockData = z.infer<typeof PrometheeNewsAdSlotBlockDataSchema>;

export const PrometheeNewsArticleReaderBlockDataSchema = z.object({
  showBackAction: z.boolean().default(true),
  showShareBar: z.boolean().default(true),
  showAiSummaryToggle: z.boolean().default(true),
  showInArticleAd: z.boolean().default(true),
  showComments: z.boolean().default(true),
  showRelatedArticles: z.boolean().default(true),
});
export type PrometheeNewsArticleReaderBlockData = z.infer<typeof PrometheeNewsArticleReaderBlockDataSchema>;

export const PrometheeNewsFooterBlockDataSchema = z.object({
  brandName: z.string().default("Waesynews"),
  coverageDescription: z.string().default("Jornalismo regional em tempo real"),
  showProposalAction: z.boolean().default(true),
  showFeitoComWaesy: z.boolean().default(true),
  copyrightYear: z.number().int().default(2026),
});
export type PrometheeNewsFooterBlockData = z.infer<typeof PrometheeNewsFooterBlockDataSchema>;

// ── 2B. BLOCOS CANÔNICOS DE VITRINE & PARIDADE DO APP WAESY ──

export const VitrineBannerAspectEnum = z.enum([
  "slim",
  "ultrawide",
  "ifood",
  "cinema",
  "duo",
  "classic",
  "square",
  "vertical",
  "moment",
]);
export type VitrineBannerAspect = z.infer<typeof VitrineBannerAspectEnum>;

export const VitrineBannerSlideSchema = z.object({
  id: z.string(),
  title: z.string().optional(),
  subtitle: z.string().optional(),
  badge: z.string().optional(),
  ctaLabel: z.string().optional(),
  href: z.string().optional(),
  imageDesktopUrl: z.string().optional(),
  imageMobileUrl: z.string().optional(),
  imageUrl: z.string().optional(),
  videoUrl: z.string().optional(),
  mediaType: z.enum(["image", "video"]).optional(),
  imageAlt: z.string().optional(),
  showOverlay: z.boolean().optional(),
});
export type VitrineBannerSlide = z.infer<typeof VitrineBannerSlideSchema>;

export const VitrineMetamorphicBannerBlockDataSchema = z.object({
  sectionTitle: z.string().default(""),
  sectionSubtitle: z.string().default(""),
  dataSource: z.enum(["manual", "store_banners"]).default("manual"),
  desktopAspectRatio: VitrineBannerAspectEnum.default("slim"),
  mobileAspectRatio: VitrineBannerAspectEnum.default("cinema"),
  autoPlay: z.boolean().default(true),
  intervalSeconds: z.number().min(3).max(20).default(5),
  showArrows: z.boolean().default(true),
  showDots: z.boolean().default(true),
  rounded: z.enum(["none", "md", "lg"]).default("lg"),
  slides: z.array(VitrineBannerSlideSchema).default([]),
});
export type VitrineMetamorphicBannerBlockData = z.infer<typeof VitrineMetamorphicBannerBlockDataSchema>;

export const VitrineBentoTileSchema = z.object({
  id: z.string(),
  title: z.string(),
  subtitle: z.string().optional(),
  badge: z.string().optional(),
  ctaLabel: z.string().optional(),
  href: z.string().optional(),
  colSpanDesktop: z.number().min(1).max(3).default(1),
  rowSpanDesktop: z.number().min(1).max(2).default(1),
  imageDesktopUrl: z.string().optional(),
  imageMobileUrl: z.string().optional(),
  imageUrl: z.string().optional(),
  videoUrl: z.string().optional(),
  mediaType: z.enum(["image", "video"]).optional(),
  imageAlt: z.string().optional(),
  surfacePreset: z.enum(["default", "muted", "card", "accent"]).optional(),
});
export type VitrineBentoTile = z.infer<typeof VitrineBentoTileSchema>;

export const VitrineBentoTetrisBlockDataSchema = z.object({
  sectionTitle: z.string().default(""),
  sectionSubtitle: z.string().default(""),
  mobileLayout: z.enum(["carousel_snap", "stacked", "grid_2col"]).default("carousel_snap"),
  tiles: z.array(VitrineBentoTileSchema).default([]),
});
export type VitrineBentoTetrisBlockData = z.infer<typeof VitrineBentoTetrisBlockDataSchema>;

export const VitrineCouponStripBlockDataSchema = z.object({
  variant: z.enum(["coupon", "slim_strip", "highlight_bar"]).default("coupon"),
  title: z.string().default(""),
  description: z.string().default(""),
  couponCode: z.string().optional(),
  discountBadge: z.string().optional(),
  ctaLabel: z.string().optional(),
  href: z.string().optional(),
  expiryText: z.string().optional(),
});
export type VitrineCouponStripBlockData = z.infer<typeof VitrineCouponStripBlockDataSchema>;

export const VitrineButtonItemSchema = z.object({
  id: z.string(),
  label: z.string(),
  sublabel: z.string().optional(),
  badge: z.string().optional(),
  href: z.string().optional(),
  icon: z.string().optional(),
  imageMobileUrl: z.string().optional(),
  imageDesktopUrl: z.string().optional(),
  highlight: z.boolean().optional(),
});
export type VitrineButtonItem = z.infer<typeof VitrineButtonItemSchema>;

export const VitrineButtonsDockBlockDataSchema = z.object({
  sectionTitle: z.string().default(""),
  sectionSubtitle: z.string().default(""),
  desktopLayout: z.enum(["noor_dock", "squircle_pills", "dual_filter_pills", "action_cards"]).default("noor_dock"),
  mobileLayout: z.enum(["noor_dock", "ifood_grid", "squircle_pills", "dual_filter_pills", "action_cards"]).default("noor_dock"),
  buttons: z.array(VitrineButtonItemSchema).default([]),
});
export type VitrineButtonsDockBlockData = z.infer<typeof VitrineButtonsDockBlockDataSchema>;

export const VitrineLateralDrawerItemSchema = z.object({
  id: z.string(),
  label: z.string(),
  sublabel: z.string().optional(),
  badge: z.string().optional(),
  badgeColor: z.string().optional(),
  href: z.string().optional(),
  icon: z.string().optional(),
  imageUrl: z.string().optional(),
  cardVariant: z.enum(["wide", "squircle", "full_width"]).default("squircle"),
  isActive: z.boolean().default(true),
});
export type VitrineLateralDrawerItem = z.infer<typeof VitrineLateralDrawerItemSchema>;

export const VitrineLateralDrawerSectionSchema = z.object({
  id: z.string(),
  title: z.string(),
  items: z.array(VitrineLateralDrawerItemSchema).default([]),
});
export type VitrineLateralDrawerSection = z.infer<typeof VitrineLateralDrawerSectionSchema>;

export const VitrineLateralDrawerBlockDataSchema = z.object({
  greetingTitle: z.string().default("Aproveite o nosso App!"),
  greetingSubtitle: z.string().default("Explore categorias e atalhos rápidos"),
  showViewModeToggle: z.boolean().default(true),
  defaultViewMode: z.enum(["grid", "list"]).default("grid"),
  sections: z.array(VitrineLateralDrawerSectionSchema).default([]),
});
export type VitrineLateralDrawerBlockData = z.infer<typeof VitrineLateralDrawerBlockDataSchema>;

export const VitrineVerticalCarouselItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  subtitle: z.string().optional(),
  badge: z.string().optional(),
  href: z.string().optional(),
  imageDesktopUrl: z.string().optional(),
  imageMobileUrl: z.string().optional(),
  imageUrl: z.string().optional(),
  videoUrl: z.string().optional(),
  mediaType: z.enum(["image", "video"]).optional(),
  imageAlt: z.string().optional(),
  caption: z.string().optional(),
});
export type VitrineVerticalCarouselItem = z.infer<typeof VitrineVerticalCarouselItemSchema>;

export const VitrineVerticalCarouselBlockDataSchema = z.object({
  sectionTitle: z.string().default(""),
  sectionSubtitle: z.string().default(""),
  viewAllLabel: z.string().optional(),
  viewAllHref: z.string().optional(),
  cardRatio: z.enum(["stories_9_16", "vertical_4_5", "flyer_3_4", "stories_ring"]).default("stories_9_16"),
  desktopLayout: z.enum(["horizontal_rail", "grid_4col", "curated_2x2"]).default("horizontal_rail"),
  mobileLayout: z.enum(["horizontal_rail", "grid_2col"]).default("horizontal_rail"),
  items: z.array(VitrineVerticalCarouselItemSchema).default([]),
});
export type VitrineVerticalCarouselBlockData = z.infer<typeof VitrineVerticalCarouselBlockDataSchema>;

export const VitrineProductItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  priceCents: z.number().int().nonnegative(),
  originalPriceCents: z.number().int().nonnegative().optional(),
  badge: z.string().optional(),
  unit: z.string().optional(),
  imageUrl: z.string().optional(),
  imageAlt: z.string().optional(),
  href: z.string().optional(),
  slug: z.string().optional(),
  ctaLabel: z.string().optional(),
});
export type VitrineProductItem = z.infer<typeof VitrineProductItemSchema>;

export const VitrineProductShelfBlockDataSchema = z.object({
  sectionTitle: z.string().default("Ofertas & Destaques"),
  sectionSubtitle: z.string().default(""),
  viewAllLabel: z.string().optional(),
  viewAllHref: z.string().optional(),
  dataSource: z.enum(["store_catalog", "store_products", "manual"]).default("store_catalog"),
  ctaLabel: z.string().default("Ver Oferta"),
  desktopLayout: z.enum(["horizontal_rail", "grid_4col", "bento_3", "split_2col"]).default("horizontal_rail"),
  mobileLayout: z.enum(["horizontal_rail", "grid_2col", "list_compact"]).default("horizontal_rail"),
  leadCard: z
    .object({
      enabled: z.boolean().default(false),
      title: z.string().optional(),
      subtitle: z.string().optional(),
      badge: z.string().optional(),
      ctaLabel: z.string().optional(),
      href: z.string().optional(),
      imageDesktopUrl: z.string().optional(),
      imageMobileUrl: z.string().optional(),
      imageAlt: z.string().optional(),
    })
    .optional(),
  products: z.array(VitrineProductItemSchema).default([]),
});
export type VitrineProductShelfBlockData = z.infer<typeof VitrineProductShelfBlockDataSchema>;

export const VitrineClassifiedItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  priceCents: z.number().int().nonnegative().optional(),
  priceLabel: z.string().optional(),
  location: z.string().optional(),
  niche: z.enum(["vehicles", "real_estate", "services", "tourism", "general"]).optional(),
  badge: z.string().optional(),
  specs: z.array(z.string()).optional(),
  imageUrl: z.string().optional(),
  imageAlt: z.string().optional(),
  href: z.string().optional(),
  ctaLabel: z.string().optional(),
});
export type VitrineClassifiedItem = z.infer<typeof VitrineClassifiedItemSchema>;

export const VitrineClassifiedsRailBlockDataSchema = z.object({
  sectionTitle: z.string().default("Anúncios & Oportunidades"),
  sectionSubtitle: z.string().default(""),
  viewAllLabel: z.string().optional(),
  viewAllHref: z.string().optional(),
  dataSource: z.enum(["store_classifieds", "manual"]).default("store_classifieds"),
  nicheFilter: z.enum(["all", "vehicles", "real_estate", "services", "tourism", "general"]).default("all"),
  maxItems: z.number().int().min(2).max(24).default(8),
  ctaLabel: z.string().default("Ver Anúncio"),
  desktopLayout: z.enum(["horizontal_rail", "grid_3col", "grid_4col"]).default("horizontal_rail"),
  mobileLayout: z.enum(["horizontal_rail", "grid_1col", "grid_2col"]).default("horizontal_rail"),
  items: z.array(VitrineClassifiedItemSchema).default([]),
});
export type VitrineClassifiedsRailBlockData = z.infer<typeof VitrineClassifiedsRailBlockDataSchema>;

export const VitrineSocialPostItemSchema = z.object({
  id: z.string(),
  authorName: z.string(),
  authorUsername: z.string().optional(),
  authorAvatarUrl: z.string().optional(),
  badge: z.string().optional(),
  publishedAgo: z.string().optional(),
  body: z.string(),
  imageUrl: z.string().optional(),
  videoUrl: z.string().optional(),
  mediaType: z.enum(["image", "video"]).optional(),
  likesCount: z.number().int().nonnegative().optional(),
  commentsCount: z.number().int().nonnegative().optional(),
  href: z.string().optional(),
});
export type VitrineSocialPostItem = z.infer<typeof VitrineSocialPostItemSchema>;

export const VitrineSocialStreamBlockDataSchema = z.object({
  sectionTitle: z.string().default("Novidades da Comunidade"),
  sectionSubtitle: z.string().default(""),
  viewAllLabel: z.string().optional(),
  viewAllHref: z.string().optional(),
  dataSource: z.enum(["store_posts", "manual"]).default("store_posts"),
  maxItems: z.number().int().min(2).max(20).default(6),
  desktopLayout: z.enum(["horizontal_rail", "grid_3col", "stream_stacked", "carousel_3col"]).default("horizontal_rail"),
  mobileLayout: z.enum(["horizontal_rail", "stream_stacked", "stream", "carousel"]).default("horizontal_rail"),
  posts: z.array(VitrineSocialPostItemSchema).default([]),
});
export type VitrineSocialStreamBlockData = z.infer<typeof VitrineSocialStreamBlockDataSchema>;

export const VitrineEcosystemItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  subtitle: z.string().optional(),
  badge: z.string().optional(),
  category: z.string().optional(),
  dateLabel: z.string().optional(),
  location: z.string().optional(),
  imageUrl: z.string().optional(),
  imageAlt: z.string().optional(),
  href: z.string().optional(),
  ctaLabel: z.string().optional(),
  verified: z.boolean().optional(),
});
export type VitrineEcosystemItem = z.infer<typeof VitrineEcosystemItemSchema>;

export const VitrineEcosystemRailBlockDataSchema = z.object({
  entityType: z.enum(["events", "jobs", "stores", "hotpages"]).default("events"),
  sectionTitle: z.string().default("Eventos & Acontecimentos"),
  sectionSubtitle: z.string().default(""),
  viewAllLabel: z.string().optional(),
  viewAllHref: z.string().optional(),
  dataSource: z.enum(["live_ecosystem", "live", "manual"]).default("live_ecosystem"),
  maxItems: z.number().int().min(2).max(24).default(8),
  ctaLabel: z.string().optional(),
  desktopLayout: z.enum(["horizontal_rail", "grid_3col", "grid_4col"]).default("horizontal_rail"),
  mobileLayout: z.enum(["horizontal_rail", "grid_1col", "grid_2col"]).default("horizontal_rail"),
  items: z.array(VitrineEcosystemItemSchema).default([]),
});
export type VitrineEcosystemRailBlockData = z.infer<typeof VitrineEcosystemRailBlockDataSchema>;

// ── 3. ESTRUTURA DA INSTÂNCIA DO BLOCO (STATE TREE NODE) ──

export const OmniBlockInstanceSchema = z.object({
  id: z.string(),
  type: z.string(),
  config: z.record(z.any()),
  styling: OmniBlockStylingSchema.optional(),
  assetRefs: z.array(BuilderAssetRefSchema).optional(),
  sectionAnchorId: z.string().regex(/^[a-z][a-z0-9_-]{0,63}$/).optional(),
  isHidden: z.boolean().optional(),
});
export type OmniBlockInstance = z.infer<typeof OmniBlockInstanceSchema>;

// ── 4. DOCUMENTO COMPLETO DO SITE / BIOLINK / LANDING PAGE ──

export const OmniPageDocumentSchema = z.object({
  schemaVersion: z.number().int().positive().default(1),
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
  source_template_id: z.string().optional(),
  source_template_version: z.string().optional(),
  published_at: z.string().nullable().optional(),
  updated_at: z.string().optional(),
});
export type OmniPageDocument = z.infer<typeof OmniPageDocumentSchema>;

// ── 5. FUNÇÕES PURAS DE GESTÃO DE ESTADO IMUTÁVEL (IMMUTABLE STATE TREE) ──

export function createEmptyOmniPage(slug: string, title: string, niche = "general"): OmniPageDocument {
  return {
    schemaVersion: 1,
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
    sectionAnchorId: original.sectionAnchorId
      ? `${original.sectionAnchorId.slice(0, 45)}-copy-${Math.random().toString(36).slice(2, 6)}`
      : undefined,
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
