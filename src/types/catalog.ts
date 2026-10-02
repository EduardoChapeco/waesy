/**
 * Catalog DTOs Commerce
 *
 * These are transport contracts returned by the BFF (server functions) to
 * the storefront. The client never:
 * - accesses Supabase directly
 * - computes prices, discounts, or availability
 * - trusts frontend stock counts
 *
 * RULES:
 * - Money = integer amountCents + currency "BRL". Never float.
 * - All values are server-authoritative.
 * - `CatalogResult<T>` discriminates between ok / empty / unconfigured states.
 */

// ---------------------------------------------------------------------------
// Money
// ---------------------------------------------------------------------------

export interface MoneyDTO {
 /** Integer cents. Never a float. Always BRL for this project. */
 amountCents: number;
 currency: "BRL";
}

// ---------------------------------------------------------------------------
// Category
// ---------------------------------------------------------------------------

export interface CategoryDTO {
 id: string;
 slug: string;
 name: string;
 coverUrl?: string | null;
 /** Number of published products in this category (server-computed). */
 productCount?: number;
}

export interface CategoryDetailDTO extends CategoryDTO {
 description?: string | null;
 children: CategoryDTO[];
 seoTitle?: string | null;
 seoDescription?: string | null;
}

// ---------------------------------------------------------------------------
// ProductCard (list / grid view)
// ---------------------------------------------------------------------------

/**
 * Canonical DTO for product cards.
 * Consumed by ProductCard component, SectionRenderer and search results.
 * All commercial values are server-computed before reaching the client.
 */
export interface ProductCardDTO {
 id: string;
 slug: string;
 title: string;
 brand?: string | null;
 /** Server-computed display price. Client only formats it via formatMoney(). */
 priceCents: number;
 /** Optional strikethrough price when on sale (server-decided). */
 compareAtCents?: number | null;
 coverUrl?: string | null;
 coverAlt?: string | null;
 /** Second image URL — shown on hover (if product has ≥2 media). */
 hoverUrl?: string | null;
 /** True when all active variants are out of stock (server-computed). */
 isOutOfStock?: boolean;
 /** True when product is out of stock but accepts backorder (encomenda). */
 isBackorderAvailable?: boolean;
 /** Number of business days for backorder lead time (when isBackorderAvailable). */
 backorderLeadTimeDays?: number;
 /** ISO timestamp — used to derive "Novo" badge (< 7 days). */
 publishedAt?: string | null;
 /** Specific variant ID if this card represents an exploded variant. */
 variantId?: string;
 /** Sub-title/variation name (e.g. "Azul") if exploded. */
 variantName?: string;
 /** JSONB dynamic fields (e.g. tipo, data_evento, local) for unified rendering */
 attributes?: Record<string, any>;
 /** Indicates if the product is highlighted by an active ad campaign */
 isBoosted?: boolean;
}

// ---------------------------------------------------------------------------
// Product Detail (PDP)
// ---------------------------------------------------------------------------

export interface ProductMediaDTO {
 id: string;
 url: string;
 alt?: string | null;
 mediaType: "image" | "video";
 sortOrder: number;
 focalPoint?: { x: number; y: number } | null;
 /** If set, this media belongs to a specific variant (for gallery switching). */
 variantId?: string | null;
}
export interface OptionValueDTO {
 id: string;
 label: string;
 priceModifierCents: number;
 isDefault: boolean;
}

export interface OptionGroupDTO {
 id: string;
 internalName: string;
 displayName: string;
 selectionType: "single" | "multiple";
 minSelections: number;
 maxSelections: number;
 isRequired: boolean;
 values: OptionValueDTO[];
}

export interface VariantDTO {
 id: string;
 sku: string;
 /** Human-readable display name (e.g. "Azul Bebê — Nº 38"). */
 displayName?: string | null;
 /** EAN/GTIN for this specific SKU. */
 ean?: string | null;
 /** Effective price cents (override or product default — server-computed). */
 effectivePriceCents: number;
 compareAtCents?: number | null;
 /** Server-computed. Never trust a client-side stock value. */
 availableQty: number;
 /** Attribute key-value pairs. Only string values (e.g. color name, size). */
 attributes: Record<string, string>;
 /** Variant-specific media; empty means use product-level gallery. */
 media: ProductMediaDTO[];
 /** Logistics — cascades from variant → product (server-resolved). */
 weightKg?: number | null;
 widthCm?: number | null;
 heightCm?: number | null;
 lengthCm?: number | null;
 /** Backorder Settings */
 allowBackorder?: boolean;
 backorderLeadTimeDays?: number;
 requiresPaymentForBackorder?: boolean;
}

export interface ProductDetailDTO {
 id: string;
 slug: string;
 title: string;
 storeId?: string;
 store_id?: string;
 store?: any;
 description?: string | null;
 /** Brief summary for cards and structured data. */
 shortDescription?: string | null;
 brand?: string | null;
 /** Manufacturer name for NF-e/compliance. */
 manufacturer?: string | null;
 /** EAN/GTIN at product level (fallback for variants without their own). */
 ean?: string | null;
 priceCents: number;
 compareAtCents?: number | null;
 /** All product-level media (general gallery + per-variant if variant_id set). */
 media: ProductMediaDTO[];
 variants: VariantDTO[];
 /** Configurable option groups (e.g. Add-ons, Extra Cheese). */
 optionGroups?: OptionGroupDTO[];
 /** Canonical SEO title (server resolves: meta_title → seo_title → title). */
 seoTitle?: string | null;
 /** Canonical SEO description. */
 seoDescription?: string | null;
 /** Product-level logistics (variants may override per-SKU). */
 weightKg?: number | null;
 widthCm?: number | null;
 heightCm?: number | null;
 lengthCm?: number | null;
 isPhysical?: boolean;
 /** Days required to prepare the order before dispatch. */
 preparationTimeDays?: number;
 reviews?:
 | {
 id: string;
 rating: number;
 comment: string | null;
 created_at: string;
 reviewer_name?: string | null;
 }[]
 | null;
 categories?: { id: string; name: string; slug: string }[];
 /** Flexible product options configuration for dynamic variant generation */
 options?: { name: string; values: string[] }[];
 /** Optional reference to a product type schema */
 type_id?: string | null;
 /** Custom dynamic attributes defined by the product type schema */
 attributes?: Record<string, any>;
 /**
 * Quando TRUE, exibe o indicador de estoque na vitrine pública do produto.
 * Controlado pela loja no painel de gestão. FALSE por padrão.
 */
 showStockPublicly?: boolean;
}

// ---------------------------------------------------------------------------
// Store Config (dynamic — from stores.settings column)
// ---------------------------------------------------------------------------

export interface AnnouncementDTO {
 id: string;
 text: string;
 link?: string | null;
 isActive: boolean;
}

export interface BenefitDTO {
 id: string;
 icon: string; // lucide icon name
 title: string;
 description: string;
}

export interface HeroBannerDTO {
 id: string;
 imageUrl?: string | null;
 imageAlt?: string | null;
 headline?: string | null;
 subheadline?: string | null;
 ctaLabel?: string | null;
 ctaLink?: string | null;
}

export interface StoreConfigDTO {
 storeId: string;
 name: string;
 logoUrl?: string | null;
 faviconUrl?: string | null;
 announcements: AnnouncementDTO[];
 heroBanners: HeroBannerDTO[];
 benefits: BenefitDTO[];
 contactPhone?: string | null;
 contactEmail?: string | null;
 contactAddress?: string | null;
 businessHours?: string | null;
 instagramHandle?: string | null;
}

// ---------------------------------------------------------------------------
// Discriminated result type (for all catalog reads)
// ---------------------------------------------------------------------------

/**
 * Canonical result type for any catalog or config read.
 *
 * `unconfigured` = Supabase not set up yet — show UnconfiguredState (admin)
 * or a graceful empty storefront (public)
 * `empty` = configured but no data yet
 * `ok` = real data returned
 * `error` = unexpected server error (show ErrorState + retry)
 */
export type CatalogResult<T> =
 | { status: "ok"; data: T }
 | { status: "empty" }
 | { status: "unconfigured"; reason: string }
 | { status: "error"; message: string };

export type ProductListResult = CatalogResult<ProductCardDTO[]>;
export type CategoryListResult = CatalogResult<CategoryDTO[]>;
export type ProductDetailResult = CatalogResult<ProductDetailDTO> | { status: "not_found" };
export type StoreConfigResult = CatalogResult<StoreConfigDTO>;

// ---------------------------------------------------------------------------
// Admin-side raw shapes (Supabase join shapes, not storefront DTOs)
// ---------------------------------------------------------------------------

/**
 * Raw shape returned by listAdminProducts server function.
 * Contains Supabase join fields and is only used in the admin panel table.
 * Commercial formatting must use formatMoney() from lib/money.
 */
export interface AdminProductRow {
 id: string;
 title: string;
 slug: string;
 status: "draft" | "published" | "archived";
 brand?: string | null;
 /** Integer cents. Format via formatMoney() — never divide inline. */
 price_cents: number;
 compare_at_cents?: number | null;
 cost_cents?: number | null;
 product_types: any;
 product_media: { url: string; alt?: string | null }[];
 options?: { name: string; values: string[] }[];
}

export type RawVariant = {
  id?: string;
  sku?: string;
  ean?: string | null;
  attributes: Record<string, string>;
  stock: number;
  original_stock?: number;
  price_override_cents?: number | null;
  cost_cents?: number | null;
  weight_kg?: number | null;
  image_url?: string | null;
  status?: "active" | "archived" | "inactive";
  allow_backorder?: boolean;
  backorder_lead_time_days?: number;
  requires_payment_for_backorder?: boolean;
};
