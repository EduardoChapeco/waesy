import { z } from "zod";
import {
  BentoBlockDataSchema,
  CANONICAL_BUILDER_BLOCK_IDS,
  ContactFormBlockDataSchema,
  FaqBlockDataSchema,
  HeroBlockDataSchema,
  HeroCarouselBlockDataSchema,
  MediaGalleryBlockDataSchema,
  MediaGalleryItemSchema,
  OmniBlockStylingSchema,
  PricingBlockDataSchema,
  TestimonialItemSchema,
  TestimonialsBlockDataSchema,
  CarouselSlideItemSchema,
} from "@/types/omni-builder";

export const STUDIO_MANIFEST_SCHEMA_VERSION = 1 as const;
export const STUDIO_TEMPLATE_PROMPT_VERSION = "1.0.0";

const SLUG_PATTERN = /^[a-z0-9]+(?:[-_][a-z0-9]+)*$/;
const SlugSchema = z.string().min(2).max(96).regex(SLUG_PATTERN);
const SemVerSchema = z.string().regex(/^\d+\.\d+\.\d+$/);
const EMPTY_IMAGE = z.literal("").optional();

function isSafeTemplateHref(value: string): boolean {
  if (value === "#" || /^#[A-Za-z0-9_-]{1,128}$/.test(value)) return true;
  if (value.startsWith("/") && !value.startsWith("//")) return true;
  if (/^(?:mailto|tel):/i.test(value)) return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password;
  } catch {
    return false;
  }
}

export const StudioTemplateHrefSchema = z
  .string()
  .trim()
  .min(1)
  .max(2048)
  .refine(isSafeTemplateHref, "Link deve ser âncora, rota local ou URL segura HTTPS.");

const StudioTemplateCtaSchema = z.object({
  label: z.string().trim().min(1).max(80),
  href: StudioTemplateHrefSchema,
}).strict();

const StudioHeroConfigSchema = HeroBlockDataSchema.extend({
  primaryCta: StudioTemplateCtaSchema,
  secondaryCta: StudioTemplateCtaSchema.optional(),
  imageUrl: EMPTY_IMAGE,
}).strict();

const StudioCarouselSlideSchema = CarouselSlideItemSchema.extend({
  primaryCta: StudioTemplateCtaSchema,
  secondaryCta: StudioTemplateCtaSchema.optional(),
  imageUrl: EMPTY_IMAGE,
}).strict();

const StudioCarouselConfigSchema = HeroCarouselBlockDataSchema.extend({
  slides: z.array(StudioCarouselSlideSchema).min(1).max(8),
}).strict();

const StudioGalleryItemSchema = MediaGalleryItemSchema.extend({
  imageUrl: z.literal(""),
  imageAlt: z.string().max(500).optional(),
}).strict();

const StudioGalleryConfigSchema = MediaGalleryBlockDataSchema.extend({
  items: z.array(StudioGalleryItemSchema).max(24),
}).strict();

const StudioTestimonialItemSchema = TestimonialItemSchema.extend({
  avatarUrl: EMPTY_IMAGE,
  imageAlt: z.string().max(500).optional(),
}).strict();

const StudioTestimonialsConfigSchema = TestimonialsBlockDataSchema.extend({
  testimonials: z.array(StudioTestimonialItemSchema).max(12),
}).strict();

const StudioContactFormConfigSchema = ContactFormBlockDataSchema.extend({
  whatsappRedirect: z.boolean().optional(),
}).strict();

const STUDIO_BLOCK_TYPES = [
  ...CANONICAL_BUILDER_BLOCK_IDS,
  "bento_asymmetric_4",
  "pricing_three_tiers",
] as const;

export const STUDIO_TEMPLATE_BLOCK_CONFIG_SCHEMAS = {
  hero_minimal_split: StudioHeroConfigSchema,
  hero_interactive_carousel: StudioCarouselConfigSchema,
  bento_asymmetric_grid: BentoBlockDataSchema.strict(),
  bento_asymmetric_4: BentoBlockDataSchema.strict(),
  pricing_tables_clean: PricingBlockDataSchema.strict(),
  pricing_three_tiers: PricingBlockDataSchema.strict(),
  media_gallery_mosaic: StudioGalleryConfigSchema,
  testimonials_social_proof: StudioTestimonialsConfigSchema,
  contact_form_direct: StudioContactFormConfigSchema,
  faq_clean_accordion: FaqBlockDataSchema.strict(),
} as const;

export const StudioAssetSlotSchema = z.object({
  id: SlugSchema,
  purpose: z.enum([
    "hero",
    "product",
    "menu_item",
    "team",
    "portrait",
    "location",
    "gallery",
    "cover",
    "logo",
    "decorative",
  ]),
  required: z.boolean().default(false),
  allowedProviders: z.array(z.enum(["unsplash", "upload", "generated", "user", "stock"])).min(1),
  allowUnsplash: z.boolean().default(false),
  subjectPolicy: z.enum(["decorative-only", "must-match-real-subject"]).default("must-match-real-subject"),
  aspectRatio: z.enum(["1:1", "4:3", "3:2", "16:9", "9:16"]).optional(),
  searchHints: z.array(z.string().trim().min(1).max(80)).max(8).default([]),
  altGuidance: z.string().trim().min(1).max(300),
}).strict().superRefine((slot, ctx) => {
  if (slot.allowUnsplash && !slot.allowedProviders.includes("unsplash")) {
    ctx.addIssue({ code: "custom", path: ["allowedProviders"], message: "allowUnsplash exige Unsplash em allowedProviders." });
  }
  if (slot.allowUnsplash && slot.subjectPolicy !== "decorative-only") {
    ctx.addIssue({ code: "custom", path: ["subjectPolicy"], message: "Unsplash só pode alimentar slots decorativos genéricos, nunca representar um sujeito real específico." });
  }
});

export type StudioAssetSlot = z.infer<typeof StudioAssetSlotSchema>;

export const StudioTemplateBlockSchema = z.object({
  sectionKey: SlugSchema.optional(),
  type: z.enum(STUDIO_BLOCK_TYPES),
  // O serializer TanStack não aceita `unknown`; cada tipo abaixo continua sujeito à validação Zod estrita em superRefine.
  config: z.record(z.any()),
  styling: OmniBlockStylingSchema.optional(),
  isHidden: z.boolean().optional(),
  sectionAnchorId: z.string().regex(/^[a-z][a-z0-9_-]{0,63}$/).optional(),
}).strict().superRefine((block, ctx) => {
  const blockSchema = STUDIO_TEMPLATE_BLOCK_CONFIG_SCHEMAS[block.type];
  const parsedConfig = blockSchema.safeParse(block.config);
  if (!parsedConfig.success) {
    for (const issue of parsedConfig.error.issues) {
      ctx.addIssue({
        code: "custom",
        path: ["config", ...issue.path],
        message: issue.message,
      });
    }
  }

  const inspectLinks = (value: unknown, path: Array<string | number>) => {
    if (Array.isArray(value)) {
      value.forEach((item, index) => inspectLinks(item, [...path, index]));
      return;
    }
    if (!value || typeof value !== "object") return;
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      const childPath = [...path, key];
      if (key.toLowerCase() === "href" && typeof child === "string" && !isSafeTemplateHref(child)) {
        ctx.addIssue({ code: "custom", path: ["config", ...childPath], message: "Link de template inseguro ou não permitido." });
      } else {
        inspectLinks(child, childPath);
      }
    }
  };
  inspectLinks(block.config, []);
});

export const StudioCopyPolicySchema = z.object({
  framework: z.enum([
    "problem-solution",
    "authority-proof",
    "offer-urgency",
    "editorial",
    "catalog-discovery",
  ]),
  factualClaims: z.literal("user-provided-or-human-reviewed"),
  socialProof: z.literal("real-consented-only"),
  pricing: z.literal("user-provided-only"),
  urgency: z.literal("truthful-only"),
  requiredFacts: z.array(z.string().trim().min(1).max(160)).max(24).default([]),
  forbiddenClaims: z.array(z.string().trim().min(1).max(160)).max(24).default([]),
  tone: z.array(z.string().trim().min(1).max(40)).max(8).default([]),
}).strict();

export const StudioTemplateManifestSchema = z.object({
  manifestSchemaVersion: z.literal(STUDIO_MANIFEST_SCHEMA_VERSION),
  id: SlugSchema,
  sourceTemplateId: SlugSchema,
  version: SemVerSchema,
  name: z.string().trim().min(2).max(100),
  niche: SlugSchema,
  goal: z.enum(["lead_capture", "catalog", "booking", "authority", "content", "purchase"]),
  funnelStage: z.enum(["awareness", "consideration", "conversion", "retention"]),
  audience: z.string().trim().min(2).max(300),
  description: z.string().trim().min(10).max(500),
  badge: z.string().trim().min(2).max(80),
  tags: z.array(SlugSchema).max(24),
  copyFramework: StudioCopyPolicySchema.shape.framework,
  copyPolicy: StudioCopyPolicySchema,
  assetSlots: z.array(StudioAssetSlotSchema).max(40),
  blocks: z.array(StudioTemplateBlockSchema).min(1).max(24),
  status: z.enum(["ready", "review_required"]),
  isPilot: z.boolean().default(false),
  provenance: z.object({
    origin: z.enum(["legacy-catalog", "human-curated", "ai-assisted", "mixed"]),
    humanReviewed: z.boolean(),
    reviewedAt: z.string().datetime().optional(),
    promptVersion: z.string().max(40).optional(),
  }).strict(),
}).strict().superRefine((manifest, ctx) => {
  const slotIds = new Set<string>();
  for (const [index, slot] of manifest.assetSlots.entries()) {
    if (slotIds.has(slot.id)) {
      ctx.addIssue({ code: "custom", path: ["assetSlots", index, "id"], message: `Asset slot duplicado: ${slot.id}.` });
    }
    slotIds.add(slot.id);
  }

  const anchors = new Set<string>();
  for (const [index, block] of manifest.blocks.entries()) {
    if (block.sectionAnchorId) {
      if (anchors.has(block.sectionAnchorId)) {
        ctx.addIssue({ code: "custom", path: ["blocks", index, "sectionAnchorId"], message: `Âncora duplicada: ${block.sectionAnchorId}.` });
      }
      anchors.add(block.sectionAnchorId);
    }
  }

  if (anchors.size > 0) {
    const inspectAnchors = (value: unknown, path: Array<string | number>) => {
      if (Array.isArray(value)) {
        value.forEach((item, index) => inspectAnchors(item, [...path, index]));
        return;
      }
      if (!value || typeof value !== "object") return;
      for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
        if (key.toLowerCase() === "href" && typeof child === "string" && child.startsWith("#") && child !== "#") {
          if (!anchors.has(child.slice(1))) {
            ctx.addIssue({ code: "custom", path: ["blocks", ...path, key], message: `CTA aponta para a âncora inexistente ${child}.` });
          }
        } else {
          inspectAnchors(child, [...path, key]);
        }
      }
    };
    manifest.blocks.forEach((block, index) => inspectAnchors(block.config, [index, "config"]));
  }
});

export type StudioTemplateManifest = z.infer<typeof StudioTemplateManifestSchema>;
export type StudioTemplateBlock = z.infer<typeof StudioTemplateBlockSchema>;

export const StudioTemplateAiDraftSchema = z.object({
  name: z.string().trim().min(2).max(100),
  description: z.string().trim().min(10).max(500),
  badge: z.string().trim().min(2).max(80),
  tags: z.array(SlugSchema).max(24),
  audience: z.string().trim().min(2).max(300),
  copyFramework: StudioCopyPolicySchema.shape.framework,
  assetSlots: z.array(StudioAssetSlotSchema).max(40),
  blocks: z.array(StudioTemplateBlockSchema).min(1).max(24),
}).strict();

export interface AiStudioManifestContext {
  id: string;
  niche: string;
  goal: StudioTemplateManifest["goal"];
  userFacts: string[];
  promptVersion?: string;
  createdAt?: string;
}

export function createAiStudioTemplateManifest(
  aiOutput: unknown,
  context: AiStudioManifestContext,
): StudioTemplateManifest {
  const draft = StudioTemplateAiDraftSchema.parse(aiOutput);
  const createdAt = context.createdAt ?? new Date().toISOString();
  const funnelStage = context.goal === "authority"
    ? "consideration"
    : context.goal === "content"
      ? "awareness"
      : context.goal === "lead_capture" || context.goal === "booking" || context.goal === "purchase"
        ? "conversion"
        : "consideration";

  return StudioTemplateManifestSchema.parse({
    manifestSchemaVersion: STUDIO_MANIFEST_SCHEMA_VERSION,
    id: context.id,
    sourceTemplateId: context.id,
    version: "0.1.0",
    name: draft.name,
    niche: context.niche,
    goal: context.goal,
    funnelStage,
    audience: draft.audience,
    description: draft.description,
    badge: draft.badge,
    tags: draft.tags,
    copyFramework: draft.copyFramework,
    copyPolicy: {
      framework: draft.copyFramework,
      factualClaims: "user-provided-or-human-reviewed",
      socialProof: "real-consented-only",
      pricing: "user-provided-only",
      urgency: "truthful-only",
      requiredFacts: context.userFacts,
      forbiddenClaims: [
        "Depoimentos, avaliações, credenciais, números, preços, prazos, garantias ou resultados não fornecidos pelo negócio.",
        "Escassez ou urgência sem condição real e verificável.",
      ],
      tone: ["claro", "específico", "sem promessas não comprovadas"],
    },
    assetSlots: draft.assetSlots,
    blocks: draft.blocks,
    status: "review_required",
    isPilot: false,
    provenance: {
      origin: "ai-assisted",
      humanReviewed: false,
      promptVersion: context.promptVersion ?? STUDIO_TEMPLATE_PROMPT_VERSION,
    },
  });
}

export const STUDIO_AI_BLOCK_CONTRACT_EXAMPLES = [
  { sectionAnchorId: "topo", type: "hero_minimal_split", config: { title: "[[HEADLINE]]", subtitle: "[[SUPPORTING_COPY]]", primaryCta: { label: "[[CTA_LABEL]]", href: "#contato" }, imageUrl: "", imageAlt: "" } },
  { sectionAnchorId: "beneficios", type: "bento_asymmetric_4", config: { sectionTitle: "[[SECTION_TITLE]]", sectionSubtitle: "[[SECTION_INTRO]]", cells: [{ id: "item-1", title: "[[ITEM_TITLE]]", description: "[[ITEM_DESCRIPTION]]", colSpan: 1 }] } },
  { sectionAnchorId: "galeria", type: "media_gallery_mosaic", config: { title: "[[GALLERY_TITLE]]", layout: "mosaic", items: [{ id: "image-1", imageUrl: "", imageAlt: "", title: "[[IMAGE_TITLE]]" }] } },
  { sectionAnchorId: "duvidas", type: "faq_clean_accordion", config: { title: "[[FAQ_TITLE]]", items: [{ id: "faq-1", question: "[[QUESTION]]", answer: "[[ANSWER_OR_REQUIRED_BUSINESS_FACT]]" }] } },
  { sectionAnchorId: "contato", type: "contact_form_direct", config: { title: "[[CONTACT_TITLE]]", submitButtonText: "[[CTA_LABEL]]", showPhoneField: true, showMessageField: true } },
];
