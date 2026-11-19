/**
 * branded-app.ts — Fonte Única da Verdade (SSOT) para o App Padronizado da Empresa,
 * Catálogo Digital, Templates Engessados por Nicho, Seções Configuráveis e Portal do Cliente.
 */

export type BrandedAppTemplateId =
  | "standard_catalog"
  | "tourism_cvc"
  | "delivery_ifood"
  | "events_sympla"
  | "services_agenda"
  | "ecommerce_retail";

export type AppSectionLayoutMode = "carousel" | "grid" | "list" | "bento" | "infinite";

export type AppSectionSourceType =
  | "all"
  | "category"
  | "collection"
  | "featured"
  | "offers"
  | "tourism"
  | "events"
  | "services"
  | "classifieds"
  | "form"
  | "custom"
  | "api_quoter"
  | "corporate_cta"
  | "omni"
  | "jobs"
  | "reviews";

export type BrandedAppSectionType =
  | "banner_carousel"
  | "highlight_cards"
  | "featured_services"
  | "custom_text_block"
  | "infinite_feed"
  | "contact_hours"
  | "coupons_grid"
  | "product_rail"
  | "category_items"
  | "collection_items"
  | "promotional_flyers"
  | "lead_form"
  | "survey_form"
  | "travel_api_quoter"
  | "corporate_travel_cta"
  | "tourism_cvc_dock"
  | "events_rail"
  | "delivery_menu"
  | "brand_story"
  | "hotpages"
  | "omni_block"
  | "omni_document"
  | "custom_domain_cta"
  | "jobs_board"
  | "reviews_showcase";

export type AppEntryAnimation = "none" | "pulse" | "bounce" | "fade" | "slide_up";

export type AppNavTabKind =
  | "home"
  | "catalog"
  | "quoter"
  | "corporate"
  | "forms"
  | "client_portal"
  | "about"
  | "field_rep"
  | "omni_match"
  | "custom_section"
  | "external_url";

export interface AppNavTabConfig {
  id: string;
  label: string;
  icon: string;
  kind: AppNavTabKind;
  enabled: boolean;
  order: number;
  target_form_id?: string | null;
  target_category_id?: string | null;
  target_url?: string | null;
  show_in_bottom_nav?: boolean;
}

export interface BrandedAppCustomCard {
  id: string;
  title: string;
  subtitle?: string | null;
  imageUrl?: string | null;
  tag?: string | null;
  linkUrl?: string | null;
}

export interface BrandedAppSectionDTO {
  id: string;
  store_id: string;
  section_type: BrandedAppSectionType;
  section_order: number;
  title: string | null;
  is_active: boolean;
  layout_mode: AppSectionLayoutMode;
  source_type: AppSectionSourceType;
  source_id?: string | null;
  tab_id: string;
  city_filter?: string | null;
  items_limit: number;
  config: {
    subtitle?: string | null;
    cards?: BrandedAppCustomCard[];
    ctaLabel?: string | null;
    ctaUrl?: string | null;
    formSlug?: string | null;
    showSearch?: boolean;
    [key: string]: any;
  };
}

export interface BrandedAppNicheFeatures {
  // Turismo
  enablePackages?: boolean;
  enableFlights?: boolean;
  enableHotels?: boolean;
  enableBus?: boolean;
  enableCars?: boolean;
  enableCruises?: boolean;
  enableApiQuoter?: boolean;
  enableCorporateTravel?: boolean;
  corporateAppLabel?: string | null;
  corporateAppUrl?: string | null;
  // Delivery / Gastronomia
  enableDelivery?: boolean;
  enablePickup?: boolean;
  enableTableOrder?: boolean;
  // Eventos
  enableTicketing?: boolean;
  enableSurveys?: boolean;
  // Serviços / Agendamento
  enableScheduling?: boolean;
  // Portal do Cliente
  enableClientPortal?: boolean;
  enableInstallPrompt?: boolean;
}

export interface BrandedAppConfigDTO {
  id?: string;
  store_id: string;
  app_name: string;
  short_name: string;
  description?: string | null;
  template_id: BrandedAppTemplateId;
  is_app_enabled: boolean;
  is_published: boolean;
  theme_color: string;
  background_color: string;
  logo_square_url?: string | null;
  icon_192_url?: string | null;
  icon_512_url?: string | null;
  maskable_icon_512_url?: string | null;
  cover_url?: string | null;
  splash_image_url?: string | null;
  entry_animation: AppEntryAnimation;
  display_mode: "standalone" | "fullscreen" | "minimal-ui" | "browser";
  orientation: "portrait" | "landscape" | "any";
  start_url: string;
  custom_domain?: string | null;
  custom_domain_status?: string | null;
  omni_page_id?: string | null;
  allow_customer_self_signup?: boolean;
  city_targeting_enabled?: boolean;
  cache_version: number;
  navigation_tabs: AppNavTabConfig[];
  niche_features: BrandedAppNicheFeatures;
  settings: Record<string, any>;
  updated_at?: string | null;
}

export interface BrandedAppCollectionDTO {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  cover_url?: string | null;
  product_ids: string[];
}

export interface BrandedAppBrandKitSummaryDTO {
  archetype?: string | null;
  toneOfVoice?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  accentColor?: string | null;
  backgroundColor?: string | null;
  textColor?: string | null;
  palette?: string[];
  headingFont?: string | null;
  bodyFont?: string | null;
  mainLogoUrl?: string | null;
  iconUrl?: string | null;
  coverUrl?: string | null;
  contentPillars?: string[];
}

export interface PublishedOmniDocumentDTO {
  id: string;
  slug: string;
  title: string;
  document_type: string;
  is_active: boolean;
  snapshot: Record<string, any> | null;
}

export interface BrandedAppRuntimeBundleDTO {
  store: {
    id: string;
    name: string;
    slug: string;
    description?: string | null;
    phone?: string | null;
    whatsapp?: string | null;
    email?: string | null;
    address?: string | null;
    city?: string | null;
    state?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    logo_url?: string | null;
    banner_url?: string | null;
    category?: string | null;
    primary_niche_id?: string | null;
    is_verified?: boolean;
    waesy_marketplace_enabled?: boolean;
    publish_to_marketplace?: boolean;
    custom_domain?: string | null;
    cnpj?: string | null;
    website?: string | null;
    instagram?: string | null;
    ai_knowledge_base?: string | null;
    ai_sales_agent_enabled?: boolean;
    payment_instructions?: string | null;
    has_pix_key?: boolean;
    settings?: Record<string, any>;
  };
  brandKit?: BrandedAppBrandKitSummaryDTO | null;
  appConfig: BrandedAppConfigDTO;
  sections: BrandedAppSectionDTO[];
  categories: Array<{ id: string; name: string; slug: string; image_url?: string | null }>;
  collections: BrandedAppCollectionDTO[];
  products: any[];
  services: any[];
  bookingResources: any[];
  classifieds: any[];
  tourismItems: any[];
  events: any[];
  banners: any[];
  flyers: any[];
  jobs: any[];
  reviews: any[];
  posts: any[];
  leadForms: any[];
  stories?: any[];
  hotOffers?: any[];
  omniDocuments?: PublishedOmniDocumentDTO[];
}

export interface CustomerAppMagicAccessDTO {
  app_url: string;
  portal_url: string;
  client_code: string | null;
  magic_token: string | null;
  expires_at: string | null;
  has_active_token: boolean;
  last_accessed_at?: string | null;
  access_count?: number;
}

export interface ClientStorePortalSummaryDTO {
  authenticated: boolean;
  authMode?: "account" | "magic_link";
  tokenInvalid?: boolean;
  clientCode?: string | null;
  userId?: string | null;
  userEmail?: string | null;
  userName?: string | null;
  staffRole?: string | null;
  assignedPriceTable?: {
    id: string;
    name: string;
    base_discount_percentage: number;
  } | null;
  storeId: string;
  orders: Array<{
    id: string;
    order_number?: string | null;
    public_token?: string | null;
    status: string;
    total_cents: number;
    created_at: string;
    shipping_method?: string | null;
    items_count: number;
    first_item_title?: string | null;
    is_rental?: boolean;
    items?: Array<{ id: string; product_title: string; item_type?: string | null }>;
  }>;
  appointments: Array<{
    id: string;
    service_title: string;
    professional_name?: string | null;
    scheduled_at: string;
    status: string;
    price_cents?: number | null;
    notes?: string | null;
  }>;
  trips: Array<{
    id: string;
    title: string;
    destination?: string | null;
    locator_code?: string | null;
    departure_date?: string | null;
    return_date?: string | null;
    status: string;
    voucher_url?: string | null;
    total_cents?: number | null;
  }>;
  proposals?: Array<{
    id: string;
    title: string;
    destination?: string | null;
    total_cents: number;
    status: string;
    public_token?: string | null;
    created_at: string;
  }>;
  tickets: Array<{
    id: string;
    event_id: string;
    event_title: string;
    event_date?: string | null;
    location?: string | null;
    lot_name?: string | null;
    qr_code_token?: string | null;
    status: string;
  }>;
  contracts: Array<{
    id: string;
    title: string;
    status: string;
    public_token?: string | null;
    signed_at?: string | null;
    created_at: string;
    verification_code?: string | null;
  }>;
  receivables: Array<{
    id: string;
    title: string;
    total_amount_cents: number;
    remaining_cents: number;
    status: string;
    created_at: string;
    installments: Array<{
      id: string;
      installment_number: number;
      due_date: string;
      amount_cents: number;
      status: string;
      pix_copy_paste?: string | null;
    }>;
  }>;
}
