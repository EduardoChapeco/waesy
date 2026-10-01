/**
 * unified-ad-engine.ts — Tipagem Canônica do Motor Unificado de Anúncios
 * 
 * Regras Fundacionais (R01 a R12):
 * - Um modelo canônico único para Classificados e Workspace (R02, R03)
 * - Um campo, um dono único (R01, R09)
 * - Estados de ciclo de vida formais e auditados (F08)
 */

import type { DepartureOption } from "@/lib/classifieds/canonical-airports";

export type ListingOrigin = "classified" | "workspace";

export type ListingItemType =
  | "product"
  | "service"
  | "package"
  | "stay"
  | "property"
  | "vehicle"
  | "job"
  | "quote"
  | "subscription";

export type ListingPricingType =
  | "fixed"
  | "range"
  | "starting_at"
  | "on_quote"
  | "free"
  | "exchange_only";

export type ListingStatus =
  | "draft"
  | "review"
  | "published"
  | "paused"
  | "hidden"
  | "expired"
  | "sold"
  | "archived";

export type ModerationStatus =
  | "approved"
  | "pending"
  | "flagged"
  | "rejected";

export interface ListingPaymentConfig {
  accepts_pix: boolean;
  pix_discount_percent: number;
  accepts_card: boolean;
  max_installments: number;
  fee_free_installments: number;
  accepts_cash: boolean;
  accepts_trade: boolean;
  deposit_percent?: number;
  balance_due_days?: number;
}

export interface ListingLocation {
  city: string;
  state: string;
  neighborhood?: string;
  address?: string;
  postal_code?: string;
  latitude?: number;
  longitude?: number;
  service_radius_km?: number;
}

export interface ListingFiscalProfile {
  ncm?: string;
  cest?: string;
  cfop?: string;
  tax_regime?: "simples_nacional" | "lucro_presumido" | "lucro_real" | "mei";
  tax_origin?: number;
  icms_cst_csosn?: string;
  ibs_cbs_code?: string;
}

export interface ListingModerationEvent {
  id: string;
  timestamp: string;
  actor_id: string;
  actor_role: string;
  action: "flag" | "approve" | "reject" | "hide" | "unhide";
  reason: string;
  notes?: string;
}

export interface ListingSeoMetadata {
  title: string;
  description: string;
  canonical_url: string;
  keywords: string[];
  og_image_url?: string;
  schema_type: "Product" | "TouristTrip" | "LodgingBusiness" | "RealEstateListing" | "Vehicle" | "JobPosting" | "Service";
}

/**
 * Entidade Canônica Única da Listagem (Anúncio / Produto)
 */
export interface UnifiedListing {
  id: string;
  origin: ListingOrigin;
  item_type: ListingItemType;
  niche_id: string;
  category_id: string;
  sub_category_id?: string;
  
  // Relações e Autor
  author_id: string;
  organization_id?: string | null;
  store_id?: string | null;
  
  // Identificação e Conteúdo
  title: string;
  slug: string;
  description: string;
  short_description?: string;
  brand?: string;
  
  // Comercial Canônico (Dono Único)
  pricing_type: ListingPricingType;
  price_cents: number;
  price_max_cents?: number;
  compare_at_cents?: number | null;
  cost_cents?: number | null;
  margin_percent?: number | null;
  markup_percent?: number | null;
  selling_unit: string;
  payment_config: ListingPaymentConfig;
  
  // Escopo e Condições (Dono Único)
  inclusions: string[];
  exclusions: string[];
  cancellation_policy?: string;
  terms_and_conditions?: string;
  
  // Mídia
  cover_url?: string | null;
  media_urls: string[];
  video_url?: string | null;
  
  // Logística e Estoque
  location?: ListingLocation;
  shipping_mode?: "pickup" | "local_delivery" | "shipping" | "both" | "not_applicable";
  free_shipping_local?: boolean;
  stock_quantity?: number;
  capacity_limit?: number;
  is_unlimited_stock?: boolean;
  
  // Turismo / Eventos Especializados
  departure_options?: DepartureOption[];
  
  // Fiscal
  fiscal_profile?: ListingFiscalProfile;
  
  // Ciclo de Vida e Telemetria
  status: ListingStatus;
  moderation_status: ModerationStatus;
  moderation_history: ListingModerationEvent[];
  is_featured: boolean;
  views_count: number;
  clicks_count: number;
  leads_count: number;
  
  // Temporalidade
  created_at: string;
  updated_at: string;
  published_at?: string | null;
  expires_at?: string | null; // Classificados expira; Workspace manual
  
  // Dinâmico por Nicho e SEO
  attributes: Record<string, any>;
  seo_metadata: ListingSeoMetadata;
}
