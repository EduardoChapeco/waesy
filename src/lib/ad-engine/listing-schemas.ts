/**
 * listing-schemas.ts — Schemas Zod Canônicos do Motor de Anúncios (F10, F11, F12)
 * 
 * Regras:
 * - Validações semânticas rígidas
 * - Paridade com contratos TS e DTOs
 */

import { z } from "zod";

export const listingOriginSchema = z.enum(["classified", "workspace"]);

export const listingItemTypeSchema = z.enum([
  "product",
  "service",
  "package",
  "stay",
  "property",
  "vehicle",
  "job",
  "quote",
  "subscription",
]);

export const listingPricingTypeSchema = z.enum([
  "fixed",
  "range",
  "starting_at",
  "on_quote",
  "free",
  "exchange_only",
]);

export const listingStatusSchema = z.enum([
  "draft",
  "review",
  "published",
  "paused",
  "hidden",
  "expired",
  "sold",
  "archived",
]);

export const paymentConfigSchema = z.object({
  accepts_pix: z.boolean().default(true),
  pix_discount_percent: z.number().min(0).max(50).default(0),
  accepts_card: z.boolean().default(true),
  max_installments: z.number().int().min(1).max(24).default(12),
  fee_free_installments: z.number().int().min(1).max(24).default(6),
  accepts_cash: z.boolean().default(false),
  accepts_trade: z.boolean().default(false),
  deposit_percent: z.number().min(0).max(100).optional(),
  balance_due_days: z.number().int().min(0).max(180).optional(),
});

export const locationSchema = z.object({
  city: z.string().min(1),
  state: z.string().min(2).max(2),
  neighborhood: z.string().optional(),
  address: z.string().optional(),
  postal_code: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  service_radius_km: z.number().optional(),
});

export const fiscalProfileSchema = z.object({
  ncm: z.string().optional(),
  cest: z.string().optional(),
  cfop: z.string().optional(),
  tax_regime: z.enum(["simples_nacional", "lucro_presumido", "lucro_real", "mei"]).optional(),
  tax_origin: z.number().int().min(0).max(8).optional(),
  icms_cst_csosn: z.string().optional(),
  ibs_cbs_code: z.string().optional(),
});

/**
 * Schema de Criação de Listagem (Rápido e Completo)
 */
export const createListingInputSchema = z.object({
  origin: listingOriginSchema,
  item_type: listingItemTypeSchema.default("product"),
  niche_id: z.string().min(1, "Nicho é obrigatório"),
  category_id: z.string().min(1, "Categoria é obrigatória"),
  sub_category_id: z.string().optional(),
  store_id: z.string().uuid().optional().nullable(),
  organization_id: z.string().uuid().optional().nullable(),
  
  title: z.string().min(3, "Título deve ter no mínimo 3 caracteres").max(140),
  description: z.string().default(""),
  short_description: z.string().max(250).optional(),
  brand: z.string().optional(),
  
  pricing_type: listingPricingTypeSchema.default("fixed"),
  price_cents: z.number().int().nonnegative("Preço deve ser maior ou igual a zero"),
  price_max_cents: z.number().int().optional(),
  compare_at_cents: z.number().int().optional().nullable(),
  cost_cents: z.number().int().optional().nullable(),
  selling_unit: z.string().default("un"),
  payment_config: paymentConfigSchema.optional().default({
    accepts_pix: true,
    pix_discount_percent: 0,
    accepts_card: true,
    max_installments: 12,
    fee_free_installments: 6,
    accepts_cash: false,
    accepts_trade: false,
  }),
  
  inclusions: z.array(z.string()).default([]),
  exclusions: z.array(z.string()).default([]),
  cancellation_policy: z.string().optional(),
  terms_and_conditions: z.string().optional(),
  
  cover_url: z.string().url().optional().nullable(),
  media_urls: z.array(z.string().url()).default([]),
  video_url: z.string().url().optional().nullable(),
  
  location: locationSchema.optional(),
  shipping_mode: z.enum(["pickup", "local_delivery", "shipping", "both", "not_applicable"]).default("both"),
  free_shipping_local: z.boolean().default(false),
  stock_quantity: z.number().int().min(0).default(1),
  capacity_limit: z.number().int().min(0).optional(),
  is_unlimited_stock: z.boolean().default(false),
  
  departure_options: z.array(z.any()).default([]),
  fiscal_profile: fiscalProfileSchema.optional(),
  
  attributes: z.record(z.any()).default({}),
  template_id: z.string().optional(),
});

export type CreateListingInput = z.infer<typeof createListingInputSchema>;
export const listingCreationSchema = createListingInputSchema;

/**
 * Schema de Atualização de Listagem
 */
export const updateListingInputSchema = createListingInputSchema.partial().extend({
  id: z.string().uuid("ID inválido"),
});

export type UpdateListingInput = z.infer<typeof updateListingInputSchema>;

/**
 * Schema para Busca Facetada e Descoberta na Vitrine (F11)
 */
export const listingFacetedSearchSchema = z.object({
  q: z.string().optional(),
  niche_id: z.string().optional(),
  category_id: z.string().optional(),
  origin: listingOriginSchema.optional(),
  min_price_cents: z.number().int().optional(),
  max_price_cents: z.number().int().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  shipping_mode: z.string().optional(),
  has_inclusions: z.boolean().optional(),
  sort_by: z.enum(["relevance", "price_asc", "price_desc", "newest", "featured"]).default("newest"),
  limit: z.number().int().min(1).max(100).default(24),
  offset: z.number().int().min(0).default(0),
});

export type ListingFacetedSearchQuery = z.infer<typeof listingFacetedSearchSchema>;

/**
 * Schema de Moderação (F12)
 */
export const moderationActionSchema = z.object({
  listing_id: z.string().uuid(),
  action: z.enum(["flag", "approve", "reject", "hide", "unhide"]),
  reason: z.string().min(3, "O motivo da moderação é obrigatório"),
  notes: z.string().optional(),
});

export type ModerationActionInput = z.infer<typeof moderationActionSchema>;
