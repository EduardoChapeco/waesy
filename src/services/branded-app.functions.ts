/**
 * branded-app.functions.ts — Motor Unificado do App Padronizado da Empresa (/app/:slug),
 * Catálogo Digital por Nicho, Seções Configuráveis, Scroll Infinito e Portal do Cliente Escopado.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient, getAnonServerClient } from "@/lib/supabase";
import { getSSRClient, getServerIdentity, assertStoreAccess, MANAGER_ROLES } from "@/lib/server-access";
import { TOKEN_HEX } from "@/lib/design-tokens";
import {
  buildBrandedAppBaseUrl,
  buildBrandedClientPortalUrl,
  normalizeClientAccessCode,
} from "@/lib/branded-app-links";
import { buildBrazilPhoneVariants, sanitizePhoneDigits } from "@/lib/phone-match";
import type {
  AppEntryAnimation,
  AppNavTabConfig,
  BrandedAppBrandKitSummaryDTO,
  BrandedAppCollectionDTO,
  BrandedAppConfigDTO,
  BrandedAppNicheFeatures,
  BrandedAppRuntimeBundleDTO,
  BrandedAppSectionDTO,
  BrandedAppTemplateId,
  ClientStorePortalSummaryDTO,
  CustomerAppMagicAccessDTO,
  PublishedOmniDocumentDTO,
} from "@/types/branded-app";

const STAFF_PORTAL_ROLES = [
  "platform_admin",
  "owner",
  "admin",
  "manager",
  "seller",
  "support",
  "attendant",
  "agent",
];

function createCryptoMagicToken(): string {
  const bytes = new Uint8Array(20);
  if (typeof globalThis !== "undefined" && globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `wca_${hex}`;
}

function sanitizeRealCustomerEmail(raw?: string | null): string | null {
  const clean = String(raw || "").trim().toLowerCase();
  if (!clean || !clean.includes("@") || /@(grupo\.)?whatsap/i.test(clean)) {
    return null;
  }
  return clean;
}

async function loadStoreOmniDocuments(
  db: ReturnType<typeof getServerClient>,
  storeId: string,
  onlyPublished: boolean,
): Promise<PublishedOmniDocumentDTO[]> {
  try {
    let query = db
      .from("experience_documents")
      .select("id, slug, title, document_type, is_active, settings")
      .eq("store_id", storeId)
      .order("updated_at", { ascending: false })
      .limit(20);
    if (onlyPublished) {
      query = query.eq("is_active", true);
    }
    const { data: docs } = await query;
    const rows = Array.isArray(docs) ? docs : [];
    if (rows.length === 0) return [];

    const docIds = rows.map((d: any) => d.id).filter(Boolean);
    let versionQuery = db
      .from("experience_versions")
      .select("document_id, version_number, status, document_snapshot")
      .in("document_id", docIds)
      .order("version_number", { ascending: false })
      .limit(40);
    if (onlyPublished) {
      versionQuery = versionQuery.eq("status", "published");
    }
    const { data: versions } = await versionQuery;
    const verRows = Array.isArray(versions) ? versions : [];
    const latestPublishedByDoc = new Map<string, any>();
    const latestAnyByDoc = new Map<string, any>();
    for (const v of verRows) {
      if (!v?.document_id || !v?.document_snapshot) continue;
      if (v.status === "published" && !latestPublishedByDoc.has(v.document_id)) {
        latestPublishedByDoc.set(v.document_id, v.document_snapshot);
      }
      if (!latestAnyByDoc.has(v.document_id)) {
        latestAnyByDoc.set(v.document_id, v.document_snapshot);
      }
    }

    const result: PublishedOmniDocumentDTO[] = [];
    for (const d of rows) {
      const settings =
        typeof d.settings === "string"
          ? (() => {
              try {
                return JSON.parse(d.settings);
              } catch {
                return {};
              }
            })()
          : (d.settings || {});
      const fallbackSnapshot = onlyPublished
        ? settings.omni_page_published ?? settings.omni_page ?? null
        : settings.omni_page_draft ?? settings.omni_page_published ?? settings.omni_page ?? null;
      const snapshot = onlyPublished
        ? latestPublishedByDoc.get(d.id) ?? fallbackSnapshot
        : latestPublishedByDoc.get(d.id) ?? latestAnyByDoc.get(d.id) ?? fallbackSnapshot;
      if (onlyPublished && !snapshot) continue;
      result.push({
        id: String(d.id),
        slug: String(d.slug || ""),
        title: String(d.title || "Página Omni"),
        document_type: String(d.document_type || "general"),
        is_active: d.is_active !== false,
        snapshot: snapshot && typeof snapshot === "object" ? snapshot : null,
      });
    }
    return result;
  } catch {
    return [];
  }
}

function sanitizeRealPhoneDigits(raw?: string | null): string | null {
  const digits = sanitizePhoneDigits(raw);
  if (!digits || digits.length < 8 || digits.length > 14) {
    return null;
  }
  return digits;
}

function deriveBaseClientCode(params: {
  clientCode?: string | null;
  customerId?: string | null;
  crmCustomerId?: string | null;
  phoneDigits?: string | null;
  leadId?: string | null;
  threadId?: string | null;
}): string {
  const explicit = normalizeClientAccessCode(params.clientCode);
  if (explicit && explicit !== "CLI-SYNC") return explicit;
  const seed =
    params.customerId ||
    params.crmCustomerId ||
    params.phoneDigits ||
    params.leadId ||
    params.threadId ||
    "0000";
  const suffix =
    String(seed)
      .replace(/[^a-zA-Z0-9]/g, "")
      .toUpperCase()
      .slice(-4) || "0000";
  return `CLI-${suffix}`;
}

export async function resolveScopedClientPortalToken(
  db: any,
  storeId: string,
  accessToken?: string | null,
): Promise<any | null> {
  const cleanToken = String(accessToken || "").trim();
  if (!cleanToken || cleanToken.length < 8) return null;

  const { data: row, error } = await db
    .from("store_app_client_tokens")
    .select(
      "id, store_id, customer_id, crm_customer_id, lead_id, thread_id, customer_name, customer_phone, customer_phone_digits, customer_document, customer_email, client_code, magic_token, is_active, expires_at, revoked_at, last_accessed_at, access_count",
    )
    .eq("magic_token", cleanToken)
    .eq("store_id", storeId)
    .eq("is_active", true)
    .is("revoked_at", null)
    .maybeSingle();

  if (error || !row) return null;
  if (row.expires_at && new Date(row.expires_at).getTime() <= Date.now()) {
    return null;
  }
  return row;
}

function parseSafeJson<T>(val: unknown, fallback: T): T {
  if (!val) return fallback;
  if (typeof val === "object") return val as T;
  if (typeof val === "string") {
    try {
      const parsed = JSON.parse(val);
      return (parsed || fallback) as T;
    } catch {
      return fallback;
    }
  }
  return fallback;
}

function buildBrandKitSummary(
  dnaRow: any,
  legacyKitRow: any,
): BrandedAppBrandKitSummaryDTO | null {
  if (!dnaRow && !legacyKitRow) return null;
  const dnaColors = parseSafeJson<Record<string, any>>(dnaRow?.color_palette, {});
  const kitColors = parseSafeJson<Record<string, any>>(legacyKitRow?.colors, {});
  const dnaLogos = parseSafeJson<Record<string, any>>(dnaRow?.logos, {});
  const kitLogos = parseSafeJson<Record<string, any>>(legacyKitRow?.logos, {});
  const dnaFonts = parseSafeJson<Record<string, any>>(dnaRow?.typography, {});
  const kitFonts = parseSafeJson<Record<string, any>>(legacyKitRow?.fonts, {});

  return {
    archetype: dnaRow?.archetype || legacyKitRow?.archetype || null,
    toneOfVoice: dnaRow?.tone_of_voice || legacyKitRow?.voice?.tone || null,
    primaryColor: dnaColors?.primary || kitColors?.primary || null,
    secondaryColor: dnaColors?.secondary || kitColors?.secondary || null,
    accentColor: dnaColors?.accent || kitColors?.accent || null,
    backgroundColor: dnaColors?.background || kitColors?.background || null,
    textColor: dnaColors?.text || kitColors?.text || null,
    palette: Array.isArray(dnaColors?.palette)
      ? dnaColors.palette
      : Array.isArray(kitColors?.palette)
        ? kitColors.palette
        : [],
    headingFont: dnaFonts?.heading || kitFonts?.heading || null,
    bodyFont: dnaFonts?.body || kitFonts?.body || null,
    mainLogoUrl: dnaLogos?.main_url || kitLogos?.main_url || null,
    iconUrl: dnaLogos?.icon_url || kitLogos?.icon_url || null,
    coverUrl: dnaLogos?.cover_url || kitLogos?.cover_url || null,
    contentPillars: Array.isArray(dnaRow?.content_pillars) ? dnaRow.content_pillars : [],
  };
}

export function resolveBrandedAppTemplateForNiche(nicheOrCategory?: string | null): BrandedAppTemplateId {
  const norm = String(nicheOrCategory || "").trim().toLowerCase();
  if (
    norm.includes("turis") ||
    norm.includes("travel") ||
    norm.includes("viag") ||
    norm.includes("hosped") ||
    norm.includes("hotel") ||
    norm.includes("pousada")
  ) {
    return "tourism_cvc";
  }
  if (
    norm.includes("gastro") ||
    norm.includes("food") ||
    norm.includes("restaur") ||
    norm.includes("delivery") ||
    norm.includes("lanch") ||
    norm.includes("pizz") ||
    norm.includes("mercad") ||
    norm.includes("supermarket") ||
    norm.includes("bebida") ||
    norm.includes("acoug")
  ) {
    return "delivery_ifood";
  }
  if (norm.includes("event") || norm.includes("show") || norm.includes("passhub") || norm.includes("ingresso")) {
    return "events_sympla";
  }
  if (
    norm.includes("servic") ||
    norm.includes("salao") ||
    norm.includes("beauty") ||
    norm.includes("barbear") ||
    norm.includes("clinic") ||
    norm.includes("health") ||
    norm.includes("agend") ||
    norm.includes("wowbook")
  ) {
    return "services_agenda";
  }
  if (norm.includes("retail") || norm.includes("comerc") || norm.includes("moda") || norm.includes("ecomm")) {
    return "ecommerce_retail";
  }
  return "standard_catalog";
}

export function buildDefaultTabsForTemplate(
  templateId: BrandedAppTemplateId,
  nicheFeatures: BrandedAppNicheFeatures = {},
): AppNavTabConfig[] {
  const catalogLabel =
    templateId === "tourism_cvc"
      ? "Pacotes"
      : templateId === "delivery_ifood"
        ? "Cardápio"
        : templateId === "events_sympla"
          ? "Eventos"
          : templateId === "services_agenda"
            ? "Serviços"
            : "Catálogo";

  const tabs: AppNavTabConfig[] = [
    { id: "home", label: "Início", icon: "Home", kind: "home", enabled: true, order: 0, show_in_bottom_nav: true },
    { id: "catalogo", label: catalogLabel, icon: "LayoutGrid", kind: "catalog", enabled: true, order: 1, show_in_bottom_nav: true },
  ];

  if (templateId === "tourism_cvc") {
    tabs.push({
      id: "cotar",
      label: "Cotar API",
      icon: "Search",
      kind: "quoter",
      enabled: nicheFeatures.enableApiQuoter !== false,
      order: 2,
      show_in_bottom_nav: true,
    });
    if (nicheFeatures.enableCorporateTravel !== false) {
      tabs.push({
        id: "corporativo",
        label: nicheFeatures.corporateAppLabel || "Corporativo",
        icon: "Briefcase",
        kind: "corporate",
        enabled: true,
        order: 3,
        show_in_bottom_nav: false,
      });
    }
  }

  if (nicheFeatures.enableClientPortal !== false) {
    tabs.push({
      id: "conta",
      label: "Minha Área",
      icon: "User",
      kind: "client_portal",
      enabled: true,
      order: 4,
      show_in_bottom_nav: true,
    });
  }

  tabs.push({
    id: "empresa",
    label: "Empresa",
    icon: "Building2",
    kind: "about",
    enabled: true,
    order: 5,
    show_in_bottom_nav: true,
  });

  return tabs;
}

export function buildDefaultSectionsForTemplate(
  storeId: string,
  templateId: BrandedAppTemplateId,
  nicheFeatures: BrandedAppNicheFeatures = {},
): BrandedAppSectionDTO[] {
  const baseSections: BrandedAppSectionDTO[] = [
    {
      id: `default-banners-${storeId.slice(0, 8)}`,
      store_id: storeId,
      section_type: "banner_carousel",
      section_order: 0,
      title: "Destaques",
      is_active: true,
      layout_mode: "carousel",
      source_type: "all",
      source_id: null,
      tab_id: "home",
      city_filter: null,
      items_limit: 8,
      config: {},
    },
  ];

  if (templateId === "tourism_cvc") {
    baseSections.push(
      {
        id: `default-tourism-dock-${storeId.slice(0, 8)}`,
        store_id: storeId,
        section_type: "tourism_cvc_dock",
        section_order: 1,
        title: "Canais de Viagem",
        is_active: true,
        layout_mode: "carousel",
        source_type: "tourism",
        source_id: null,
        tab_id: "home",
        city_filter: null,
        items_limit: 10,
        config: {},
      },
      {
        id: `default-tourism-quoter-${storeId.slice(0, 8)}`,
        store_id: storeId,
        section_type: "travel_api_quoter",
        section_order: 2,
        title: "Cotação Online",
        is_active: nicheFeatures.enableApiQuoter !== false,
        layout_mode: "list",
        source_type: "api_quoter",
        source_id: null,
        tab_id: "home",
        city_filter: null,
        items_limit: 12,
        config: {},
      },
      {
        id: `default-tourism-corp-${storeId.slice(0, 8)}`,
        store_id: storeId,
        section_type: "corporate_travel_cta",
        section_order: 3,
        title: nicheFeatures.corporateAppLabel || "Viagens Corporativas",
        is_active: nicheFeatures.enableCorporateTravel !== false,
        layout_mode: "list",
        source_type: "corporate_cta",
        source_id: null,
        tab_id: "home",
        city_filter: null,
        items_limit: 1,
        config: {
          ctaLabel: nicheFeatures.corporateAppLabel || "Acessar Viagens Corporativas",
          ctaUrl: nicheFeatures.corporateAppUrl || null,
        },
      },
    );
  } else if (templateId === "delivery_ifood") {
    baseSections.push(
      {
        id: `default-delivery-flyers-${storeId.slice(0, 8)}`,
        store_id: storeId,
        section_type: "promotional_flyers",
        section_order: 1,
        title: "Ofertas & Encartes",
        is_active: true,
        layout_mode: "carousel",
        source_type: "offers",
        source_id: null,
        tab_id: "home",
        city_filter: null,
        items_limit: 8,
        config: {},
      },
      {
        id: `default-delivery-menu-${storeId.slice(0, 8)}`,
        store_id: storeId,
        section_type: "delivery_menu",
        section_order: 2,
        title: "Mais Pedidos",
        is_active: true,
        layout_mode: "grid",
        source_type: "all",
        source_id: null,
        tab_id: "home",
        city_filter: null,
        items_limit: 12,
        config: {},
      },
    );
  } else if (templateId === "events_sympla") {
    baseSections.push({
      id: `default-events-rail-${storeId.slice(0, 8)}`,
      store_id: storeId,
      section_type: "events_rail",
      section_order: 1,
      title: "Próximos Eventos",
      is_active: true,
      layout_mode: "grid",
      source_type: "events",
      source_id: null,
      tab_id: "home",
      city_filter: null,
      items_limit: 12,
      config: {},
    });
  } else if (templateId === "services_agenda") {
    baseSections.push({
      id: `default-services-agenda-${storeId.slice(0, 8)}`,
      store_id: storeId,
      section_type: "featured_services",
      section_order: 1,
      title: "Serviços & Horários",
      is_active: true,
      layout_mode: "grid",
      source_type: "services",
      source_id: null,
      tab_id: "home",
      city_filter: null,
      items_limit: 12,
      config: {},
    });
  } else {
    baseSections.push({
      id: `default-product-rail-${storeId.slice(0, 8)}`,
      store_id: storeId,
      section_type: "product_rail",
      section_order: 1,
      title: "Destaques do Catálogo",
      is_active: true,
      layout_mode: "carousel",
      source_type: "featured",
      source_id: null,
      tab_id: "home",
      city_filter: null,
      items_limit: 10,
      config: {},
    });
  }

  baseSections.push({
    id: `default-infinite-${storeId.slice(0, 8)}`,
    store_id: storeId,
    section_type: "infinite_feed",
    section_order: baseSections.length,
    title:
      templateId === "tourism_cvc"
        ? "Todos os Roteiros & Ofertas"
        : templateId === "services_agenda"
          ? "Explorar Serviços & Produtos"
          : "Explorar Tudo",
    is_active: true,
    layout_mode: "infinite",
    source_type:
      templateId === "tourism_cvc"
        ? "tourism"
        : templateId === "events_sympla"
          ? "events"
          : templateId === "services_agenda"
            ? "services"
            : "all",
    source_id: null,
    tab_id: "home",
    city_filter: null,
    items_limit: 12,
    config: {},
  });

  return baseSections;
}

export async function provisionDefaultBrandedAppForStore(params: {
  storeId: string;
  storeName: string;
  storeSlug: string;
  nicheOrCategory?: string | null;
  logoUrl?: string | null;
  bannerUrl?: string | null;
  templateId?: BrandedAppTemplateId;
  isAppEnabled?: boolean;
  nicheFeatures?: BrandedAppNicheFeatures;
}) {
  const db = getServerClient();
  const templateId = params.templateId || resolveBrandedAppTemplateForNiche(params.nicheOrCategory);
  const nicheFeatures: BrandedAppNicheFeatures = {
    enablePackages: true,
    enableFlights: true,
    enableHotels: true,
    enableBus: true,
    enableCars: true,
    enableApiQuoter: templateId === "tourism_cvc",
    enableCorporateTravel: templateId === "tourism_cvc",
    enableDelivery: templateId === "delivery_ifood",
    enablePickup: true,
    enableTicketing: templateId === "events_sympla",
    enableClientPortal: true,
    enableInstallPrompt: true,
    ...(params.nicheFeatures || {}),
  };

  const defaultTabs = buildDefaultTabsForTemplate(templateId, nicheFeatures);
  const shortName = params.storeName.trim().slice(0, 24) || "App";

  const [{ data: existingPwa }, { data: dnaRow }, { data: kitRow }] = await Promise.all([
    db.from("store_pwa_configs").select("id").eq("store_id", params.storeId).maybeSingle(),
    db.from("brand_dna_profiles").select("color_palette, logos").eq("store_id", params.storeId).maybeSingle(),
    db.from("brand_kits").select("colors, logos").eq("store_id", params.storeId).maybeSingle(),
  ]);

  const brandSummary = buildBrandKitSummary(dnaRow, kitRow);
  const resolvedLogoUrl = params.logoUrl || brandSummary?.iconUrl || brandSummary?.mainLogoUrl || null;
  const resolvedCoverUrl = params.bannerUrl || brandSummary?.coverUrl || null;

  if (!existingPwa) {
    await db.from("store_pwa_configs").insert({
      store_id: params.storeId,
      app_name: params.storeName.trim().slice(0, 90) || "Meu App Oficial",
      short_name: shortName,
      theme_color: brandSummary?.primaryColor || TOKEN_HEX.neutral900,
      background_color: brandSummary?.backgroundColor || TOKEN_HEX.white,
      icon_192_url: resolvedLogoUrl,
      icon_512_url: resolvedLogoUrl,
      maskable_icon_512_url: resolvedLogoUrl,
      logo_square_url: resolvedLogoUrl,
      cover_url: resolvedCoverUrl,
      start_url: `/app/${params.storeSlug}?source=pwa`,
      display_mode: "standalone",
      orientation: "portrait",
      template_id: templateId,
      is_app_enabled: params.isAppEnabled !== false,
      is_published: params.isAppEnabled !== false,
      published_at: params.isAppEnabled !== false ? new Date().toISOString() : null,
      entry_animation: "pulse",
      navigation_tabs: defaultTabs as any,
      niche_features: nicheFeatures as any,
      cache_version: 1,
      settings: { provisionedBy: "auto_onboarding" },
    });
  }

  const { count: existingSectionsCount } = await db
    .from("store_page_sections")
    .select("id", { count: "exact", head: true })
    .eq("store_id", params.storeId);

  if (!existingSectionsCount || existingSectionsCount === 0) {
    const defaultSections = buildDefaultSectionsForTemplate(params.storeId, templateId, nicheFeatures);
    await db.from("store_page_sections").insert(
      defaultSections.map((sec, idx) => ({
        store_id: params.storeId,
        section_type: sec.section_type,
        section_order: idx,
        title: sec.title,
        is_active: sec.is_active,
        layout_mode: sec.layout_mode,
        source_type: sec.source_type,
        source_id: sec.source_id || null,
        tab_id: sec.tab_id || "home",
        city_filter: sec.city_filter || null,
        items_limit: sec.items_limit || 12,
        config: sec.config as any,
      })),
    );
  }

  return {
    templateId,
    isAppEnabled: params.isAppEnabled !== false,
    appUrl: `/app/${params.storeSlug}`,
  };
}

function normalizeSectionRow(row: any): BrandedAppSectionDTO {
  return {
    id: String(row.id),
    store_id: String(row.store_id),
    section_type: (row.section_type || "product_rail") as BrandedAppSectionDTO["section_type"],
    section_order: Number(row.section_order ?? 0),
    title: row.title ?? null,
    is_active: row.is_active !== false,
    layout_mode: (row.layout_mode || "carousel") as BrandedAppSectionDTO["layout_mode"],
    source_type: (row.source_type || "all") as BrandedAppSectionDTO["source_type"],
    source_id: row.source_id ?? null,
    tab_id: row.tab_id || "home",
    city_filter: row.city_filter ?? null,
    items_limit: Number(row.items_limit ?? 12),
    config: (row.config || {}) as BrandedAppSectionDTO["config"],
  };
}

export const getPublicBrandedAppBySlugFn = createServerFn({ method: "GET" })
  .validator(z.object({ slug: z.string().min(1) }))
  .handler(async ({ data }): Promise<BrandedAppRuntimeBundleDTO | null> => {
    const db = getAnonServerClient();
    const target = data.slug.trim().replace(/^@/, "");
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(target);

    let storeQuery = db
      .from("stores")
      .select(
        "id, name, slug, description, phone, email, address, city, state, cnpj, logo_url, banner_url, primary_niche_id, waesy_marketplace_enabled, publish_to_marketplace, custom_domain, ai_knowledge_base, ai_sales_agent_enabled, payment_instructions, pix_key, settings",
      );

    if (isUuid) {
      storeQuery = storeQuery.eq("id", target);
    } else {
      storeQuery = storeQuery.eq("slug", target);
    }

    const { data: storeRow, error: storeErr } = await storeQuery.maybeSingle();
    if (storeErr || !storeRow) {
      return null;
    }

    const storeId = storeRow.id;
    const settings = (storeRow.settings || {}) as Record<string, any>;
    const inferredNiche =
      storeRow.primary_niche_id ||
      settings.primary_niche_id ||
      settings.niche ||
      settings.segment ||
      settings.category ||
      "standard_catalog";
    const defaultTemplate = resolveBrandedAppTemplateForNiche(inferredNiche);

    const [
      pwaRes,
      sectionsRes,
      categoriesRes,
      collectionsRes,
      productsRes,
      tourismRes,
      eventsRes,
      bannersRes,
      flyersRes,
      jobsRes,
      reviewsRes,
      postsRes,
      formsRes,
      brandDnaRes,
      brandKitRes,
      servicesRes,
      resourcesRes,
      classifiedsRes,
      storiesRes,
      hotOffersRes,
    ] = await Promise.all([
      db.from("store_pwa_configs").select("*").eq("store_id", storeId).maybeSingle(),
      db
        .from("store_page_sections")
        .select("*")
        .eq("store_id", storeId)
        .eq("is_active", true)
        .order("section_order", { ascending: true }),
      db
        .from("categories")
        .select("id, name, slug, cover_url")
        .eq("store_id", storeId)
        .eq("status", "active")
        .order("name", { ascending: true }),
      db
        .from("collections")
        .select("id, name, slug, description, cover_url, product_collections(product_id)")
        .eq("store_id", storeId)
        .eq("status", "active")
        .order("name", { ascending: true }),
      db
        .from("products")
        .select(
          `
          id, title, slug, description, price_cents, compare_at_cents, status, category_id, is_featured, attributes,
          product_media(url, alt, sort_order),
          product_variants(id, sku, price_override_cents, stock_on_hand, attributes),
          product_collections(collection_id),
          product_option_groups(
            sort_order,
            option_groups(
              id, display_name, internal_name, description, selection_type, min_selections, max_selections, is_required,
              option_values(id, label, description, price_modifier_cents, image_url, is_active, is_default)
            )
          ),
          product_modifier_groups(
            id, title, description, min_selections, max_selections, is_required, sort_order,
            product_modifiers(id, title, price_delta_cents, is_default, is_available, sort_order)
          )
          `,
        )
        .eq("store_id", storeId)
        .in("status", ["published", "active"])
        .order("created_at", { ascending: false })
        .limit(60),
      db
        .from("tourism_experiences")
        .select("*")
        .eq("store_id", storeId)
        .eq("status", "active")
        .order("is_featured", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(40),
      db
        .from("events")
        .select(
          "id, store_id, title, description, event_date, end_date, location, venue, city, state, cover_image, status, category, is_free, price_min_cents, price_max_cents",
        )
        .eq("store_id", storeId)
        .eq("status", "published")
        .is("deleted_at", null)
        .order("event_date", { ascending: true })
        .limit(30),
      db
        .from("banners")
        .select("*")
        .eq("store_id", storeId)
        .eq("is_active", true)
        .order("sort_order", { ascending: true }),
      db
        .from("store_promotional_flyers")
        .select("*")
        .eq("store_id", storeId)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(12),
      db
        .from("jobs")
        .select("id, title, description, contract_type, workplace_type, category, location, salary_display, salary_min_cents, status, created_at")
        .eq("store_id", storeId)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(20),
      db
        .from("reviews")
        .select("id, rating, comment, reviewer_name, verified_purchase, source_channel, created_at, products(title)")
        .eq("store_id", storeId)
        .eq("status", "approved")
        .order("created_at", { ascending: false })
        .limit(30),
      db
        .from("posts")
        .select("*")
        .eq("store_id", storeId)
        .order("created_at", { ascending: false })
        .limit(20),
      db
        .from("lead_forms")
        .select(
          "id, store_id, title, slug, description, niche_id, headline, subheadline, submit_button_text, after_submit_action, whatsapp_target_phone, whatsapp_message_template, success_message, redirect_url, trigger_mode, quick_signup_enabled, status, views_count, submissions_count, created_at, updated_at, fields:lead_form_fields(*)",
        )
        .eq("store_id", storeId)
        .eq("status", "active")
        .order("created_at", { ascending: false }),
      db.from("brand_dna_profiles").select("*").eq("store_id", storeId).maybeSingle(),
      db.from("brand_kits").select("*").eq("store_id", storeId).maybeSingle(),
      db
        .from("booking_services")
        .select("*")
        .eq("store_id", storeId)
        .eq("status", "active")
        .order("title", { ascending: true })
        .limit(40),
      db
        .from("booking_resources")
        .select("id, name, resource_type, capacity, status")
        .eq("store_id", storeId)
        .eq("status", "active")
        .order("name", { ascending: true }),
      db
        .from("classifieds")
        .select(
          "id, category, deal_type, title, content, price_cents, images, contact_whatsapp, location_name, city, state, condition, negotiable, attributes, status, created_at",
        )
        .eq("store_id", storeId)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(40),
      db
        .from("stories")
        .select(
          "id, store_id, author_profile_id, creator_id, media_url, media_type, caption, link_url, link_label, story_kind, hot_offer_id, source_proposal_id, offer_badge_label, offer_price_cents, flame_style, duration_seconds, is_long_format, expires_at, created_at",
        )
        .eq("store_id", storeId)
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
        .order("created_at", { ascending: false })
        .limit(20),
      db
        .from("hot_offers")
        .select("*")
        .eq("store_id", storeId)
        .eq("status", "active")
        .eq("is_published_in_app", true)
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

    const brandKit = buildBrandKitSummary(brandDnaRes.data, brandKitRes.data);
    const eventRows = (eventsRes.data || []) as any[];
    const eventIds = eventRows.map((ev) => ev.id).filter(Boolean);
    const lotsByEventId = new Map<string, any[]>();
    if (eventIds.length > 0) {
      const { data: lotRows } = await db
        .from("ticket_lots")
        .select("id, event_id, name, price_cents, capacity, sold_count, status")
        .in("event_id", eventIds);
      for (const lot of lotRows || []) {
        const key = String(lot.event_id);
        const list = lotsByEventId.get(key) || [];
        list.push(lot);
        lotsByEventId.set(key, list);
      }
    }
    const events = eventRows.map((ev) => ({
      ...ev,
      ticket_lots: lotsByEventId.get(String(ev.id)) || [],
    }));

    const pwaRow = pwaRes.data as any;
    const resolvedTemplateId: BrandedAppTemplateId =
      (pwaRow?.template_id as BrandedAppTemplateId) || defaultTemplate;
    const nicheFeatures: BrandedAppNicheFeatures = {
      enableApiQuoter: resolvedTemplateId === "tourism_cvc",
      enableCorporateTravel: resolvedTemplateId === "tourism_cvc",
      enableClientPortal: true,
      enableInstallPrompt: true,
      ...((pwaRow?.niche_features || {}) as BrandedAppNicheFeatures),
    };

    const resolvedTabs: AppNavTabConfig[] =
      Array.isArray(pwaRow?.navigation_tabs) && pwaRow.navigation_tabs.length > 0
        ? pwaRow.navigation_tabs
        : buildDefaultTabsForTemplate(resolvedTemplateId, nicheFeatures);

    const resolvedSections: BrandedAppSectionDTO[] =
      Array.isArray(sectionsRes.data) && sectionsRes.data.length > 0
        ? sectionsRes.data.map(normalizeSectionRow)
        : buildDefaultSectionsForTemplate(storeId, resolvedTemplateId, nicheFeatures);

    const resolvedLogo =
      pwaRow?.logo_square_url ||
      brandKit?.iconUrl ||
      brandKit?.mainLogoUrl ||
      storeRow.logo_url ||
      settings.avatar_url ||
      settings.logoUrl ||
      settings.logo_url ||
      null;
    const resolvedBanner =
      pwaRow?.cover_url ||
      brandKit?.coverUrl ||
      storeRow.banner_url ||
      settings.cover_url ||
      settings.bannerUrl ||
      null;

    const appConfig: BrandedAppConfigDTO = {
      id: pwaRow?.id,
      store_id: storeId,
      app_name: pwaRow?.app_name || storeRow.name,
      short_name: pwaRow?.short_name || storeRow.name.slice(0, 16),
      description: pwaRow?.description || storeRow.description || null,
      template_id: resolvedTemplateId,
      is_app_enabled: pwaRow?.is_app_enabled !== false,
      is_published: pwaRow?.is_published !== false,
      theme_color:
        pwaRow?.theme_color || brandKit?.primaryColor || settings.primaryColor || TOKEN_HEX.neutral900,
      background_color:
        pwaRow?.background_color || brandKit?.backgroundColor || TOKEN_HEX.white,
      logo_square_url: resolvedLogo,
      icon_192_url: pwaRow?.icon_192_url || resolvedLogo,
      icon_512_url: pwaRow?.icon_512_url || resolvedLogo,
      maskable_icon_512_url: pwaRow?.maskable_icon_512_url || pwaRow?.icon_512_url || resolvedLogo,
      cover_url: resolvedBanner,
      splash_image_url: pwaRow?.splash_image_url || resolvedLogo,
      entry_animation: (pwaRow?.entry_animation || "pulse") as AppEntryAnimation,
      display_mode: (pwaRow?.display_mode || "standalone") as BrandedAppConfigDTO["display_mode"],
      orientation: (pwaRow?.orientation || "portrait") as BrandedAppConfigDTO["orientation"],
      start_url: `/app/${storeRow.slug}?source=pwa`,
      custom_domain: pwaRow?.custom_domain || storeRow.custom_domain || null,
      custom_domain_status: pwaRow?.custom_domain_status || settings.custom_domain_status || null,
      omni_page_id: pwaRow?.omni_page_id || null,
      allow_customer_self_signup: pwaRow?.allow_customer_self_signup !== false,
      city_targeting_enabled: Boolean(pwaRow?.city_targeting_enabled),
      cache_version: Number(pwaRow?.cache_version || 1),
      navigation_tabs: resolvedTabs,
      niche_features: nicheFeatures,
      settings: (pwaRow?.settings || {}) as Record<string, unknown>,
      updated_at: pwaRow?.updated_at || null,
    };

    const collections: BrandedAppCollectionDTO[] = (collectionsRes.data || []).map((c: any) => ({
      id: String(c.id),
      name: c.name,
      slug: c.slug,
      description: c.description || null,
      cover_url: c.cover_url || null,
      product_ids: Array.isArray(c.product_collections)
        ? c.product_collections.map((pc: any) => String(pc.product_id)).filter(Boolean)
        : [],
    }));

    const products = (productsRes.data || []).map((p: any) => {
      const media = Array.isArray(p.product_media)
        ? [...p.product_media].sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0))
        : [];
      const optionGroups = (p.product_option_groups || []).map((pog: any) => pog.option_groups).filter(Boolean);
      const modifierGroups = (p.product_modifier_groups || [])
        .filter(Boolean)
        .sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0));
      const variants = Array.isArray(p.product_variants) ? p.product_variants : [];
      const mediaUrls = media.map((m: any) => m.url).filter(Boolean);
      const collectionIds = (p.product_collections || []).map((pc: any) => pc.collection_id).filter(Boolean);

      return {
        id: p.id,
        title: p.title,
        slug: p.slug,
        description: p.description,
        category_id: p.category_id || null,
        is_featured: Boolean(p.is_featured),
        collectionIds,
        priceCents: p.price_cents,
        price_cents: p.price_cents,
        compareAtCents: p.compare_at_cents,
        compare_at_cents: p.compare_at_cents,
        coverUrl: mediaUrls[0] || (p.attributes as any)?.cover_url || null,
        image_url: mediaUrls[0] || (p.attributes as any)?.cover_url || null,
        mediaUrls,
        variants,
        optionGroups,
        modifierGroups,
        hasModifiers: optionGroups.length > 0 || modifierGroups.length > 0,
      };
    });

    const omniDocuments = await loadStoreOmniDocuments(db, storeId, true);

    return {
      store: {
        id: storeRow.id,
        name: storeRow.name,
        slug: storeRow.slug,
        description: storeRow.description || settings.bio || null,
        phone: storeRow.phone || settings.phone || null,
        whatsapp: settings.whatsapp_phone || settings.contact_whatsapp || storeRow.phone || null,
        email: storeRow.email || null,
        address: storeRow.address || settings.address || null,
        city: storeRow.city || settings.city || null,
        state: storeRow.state || settings.state || null,
        latitude: typeof settings.latitude === "number" ? settings.latitude : null,
        longitude: typeof settings.longitude === "number" ? settings.longitude : null,
        logo_url: resolvedLogo,
        banner_url: resolvedBanner,
        category: settings.category || inferredNiche,
        primary_niche_id: storeRow.primary_niche_id || inferredNiche,
        is_verified: Boolean(settings.is_verified ?? true),
        waesy_marketplace_enabled: storeRow.waesy_marketplace_enabled !== false,
        publish_to_marketplace: storeRow.publish_to_marketplace !== false,
        custom_domain: storeRow.custom_domain || null,
        cnpj: storeRow.cnpj || null,
        website: settings.website || null,
        instagram: settings.instagram || null,
        ai_knowledge_base: null,
        ai_sales_agent_enabled: storeRow.ai_sales_agent_enabled !== false,
        payment_instructions: storeRow.payment_instructions || null,
        has_pix_key: Boolean(storeRow.pix_key),
        settings: {},
      },
      brandKit,
      appConfig,
      sections: resolvedSections,
      categories: (categoriesRes.data || []).map((c: any) => ({
        id: String(c.id),
        name: c.name,
        slug: c.slug,
        image_url: c.cover_url || null,
      })),
      collections,
      products,
      services: servicesRes.data || [],
      bookingResources: resourcesRes.data || [],
      classifieds: classifiedsRes.data || [],
      tourismItems: tourismRes.data || [],
      events,
      banners: bannersRes.data || [],
      flyers: flyersRes.data || [],
      jobs: jobsRes.data || [],
      reviews: reviewsRes.data || [],
      posts: postsRes.data || [],
      leadForms: (formsRes.data || []).map((f: any) => ({
        ...f,
        fields: Array.isArray(f.fields)
          ? [...f.fields].sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0))
          : [],
      })),
      stories: storiesRes.data || [],
      hotOffers: hotOffersRes.data || [],
      omniDocuments,
    };
  });

export const getBrandedAppInfiniteCatalogFn = createServerFn({ method: "GET" })
  .validator(
    z.object({
      storeId: z.string().uuid(),
      offset: z.number().int().min(0).default(0),
      limit: z.number().int().min(1).max(40).default(12),
      categoryId: z.string().optional().nullable(),
      collectionId: z.string().optional().nullable(),
      search: z.string().optional().nullable(),
      itemKind: z
        .enum(["products", "tourism", "events", "services", "classifieds"])
        .default("products"),
    }),
  )
  .handler(async ({ data }) => {
    const db = getAnonServerClient();
    const { storeId, offset, limit, categoryId, collectionId, search, itemKind } = data;

    if (itemKind === "services") {
      let query = db
        .from("booking_services")
        .select("*", { count: "exact" })
        .eq("store_id", storeId)
        .eq("status", "active")
        .order("title", { ascending: true })
        .range(offset, offset + limit - 1);

      if (categoryId && categoryId !== "todas" && categoryId !== "todos") {
        query = query.eq("category", categoryId);
      }
      if (search && search.trim()) {
        const q = `%${search.trim()}%`;
        query = query.or(`title.ilike.${q},description.ilike.${q}`);
      }
      const { data: rows, count } = await query;
      const items = rows || [];
      return {
        items,
        total: count || items.length,
        hasMore: offset + items.length < (count || 0),
        nextOffset: offset + items.length,
      };
    }

    if (itemKind === "classifieds") {
      let query = db
        .from("classifieds")
        .select(
          "id, category, deal_type, title, content, price_cents, images, contact_whatsapp, location_name, city, state, condition, negotiable, attributes, status, created_at",
          { count: "exact" },
        )
        .eq("store_id", storeId)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (search && search.trim()) {
        const q = `%${search.trim()}%`;
        query = query.or(`title.ilike.${q},content.ilike.${q}`);
      }
      const { data: rows, count } = await query;
      const items = rows || [];
      return {
        items,
        total: count || items.length,
        hasMore: offset + items.length < (count || 0),
        nextOffset: offset + items.length,
      };
    }

    if (itemKind === "tourism") {
      let query = db
        .from("tourism_experiences")
        .select("*", { count: "exact" })
        .eq("store_id", storeId)
        .eq("status", "active")
        .order("is_featured", { ascending: false })
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (categoryId && categoryId !== "todas" && categoryId !== "todos") {
        query = query.eq("category", categoryId);
      }
      if (search && search.trim()) {
        const q = `%${search.trim()}%`;
        query = query.or(`title.ilike.${q},destination.ilike.${q},location.ilike.${q}`);
      }
      const { data: rows, count } = await query;
      const items = rows || [];
      return {
        items,
        total: count || items.length,
        hasMore: offset + items.length < (count || 0),
        nextOffset: offset + items.length,
      };
    }

    if (itemKind === "events") {
      let query = db
        .from("events")
        .select(
          "id, store_id, title, description, event_date, end_date, location, venue, city, state, cover_image, status, category, is_free, price_min_cents, price_max_cents",
          { count: "exact" },
        )
        .eq("store_id", storeId)
        .eq("status", "published")
        .is("deleted_at", null)
        .order("event_date", { ascending: true })
        .range(offset, offset + limit - 1);

      if (categoryId && categoryId !== "todas" && categoryId !== "todos") {
        query = query.eq("category", categoryId);
      }
      if (search && search.trim()) {
        const q = `%${search.trim()}%`;
        query = query.or(`title.ilike.${q},description.ilike.${q},location.ilike.${q}`);
      }
      const { data: rows, count } = await query;
      const evRows = rows || [];
      const evIds = evRows.map((ev: any) => ev.id).filter(Boolean);
      const lotsByEventId = new Map<string, any[]>();
      if (evIds.length > 0) {
        const { data: lotRows } = await db
          .from("ticket_lots")
          .select("id, event_id, name, price_cents, capacity, sold_count, status")
          .in("event_id", evIds);
        for (const lot of lotRows || []) {
          const key = String(lot.event_id);
          const list = lotsByEventId.get(key) || [];
          list.push(lot);
          lotsByEventId.set(key, list);
        }
      }
      const items = evRows.map((ev: any) => ({
        ...ev,
        ticket_lots: lotsByEventId.get(String(ev.id)) || [],
      }));
      return {
        items,
        total: count || items.length,
        hasMore: offset + items.length < (count || 0),
        nextOffset: offset + items.length,
      };
    }

    let collectionProductIds: string[] | null = null;
    if (collectionId) {
      const { data: links } = await db
        .from("product_collections")
        .select("product_id")
        .eq("collection_id", collectionId);
      collectionProductIds = (links || []).map((l: any) => String(l.product_id)).filter(Boolean);
      if (collectionProductIds.length === 0) {
        return { items: [], total: 0, hasMore: false, nextOffset: offset };
      }
    }

    let query = db
      .from("products")
      .select(
        `
        id, title, slug, description, price_cents, compare_at_cents, status, category_id, is_featured, attributes,
        product_media(url, alt, sort_order),
        product_variants(id, sku, price_override_cents, stock_on_hand, attributes),
        product_option_groups(sort_order, option_groups(id, display_name, selection_type, is_required, option_values(id, label, price_modifier_cents, is_active))),
        product_modifier_groups(id, title, min_selections, max_selections, is_required, product_modifiers(id, title, price_delta_cents, is_available))
        `,
        { count: "exact" },
      )
      .eq("store_id", storeId)
      .in("status", ["published", "active"])
      .order("is_featured", { ascending: false })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (categoryId && categoryId !== "todas" && categoryId !== "todos") {
      query = query.eq("category_id", categoryId);
    }
    if (collectionProductIds) {
      query = query.in("id", collectionProductIds);
    }
    if (search && search.trim()) {
      const q = `%${search.trim()}%`;
      query = query.or(`title.ilike.${q},description.ilike.${q}`);
    }

    const { data: rows, count } = await query;
    const items = (rows || []).map((p: any) => {
      const media = Array.isArray(p.product_media)
        ? [...p.product_media].sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0))
        : [];
      const mediaUrls = media.map((m: any) => m.url).filter(Boolean);
      const variants = Array.isArray(p.product_variants) ? p.product_variants : [];
      const optionGroups = (p.product_option_groups || []).map((pog: any) => pog.option_groups).filter(Boolean);
      const modifierGroups = (p.product_modifier_groups || []).filter(Boolean);
      return {
        id: p.id,
        title: p.title,
        slug: p.slug,
        description: p.description,
        category_id: p.category_id || null,
        priceCents: p.price_cents,
        price_cents: p.price_cents,
        compareAtCents: p.compare_at_cents,
        compare_at_cents: p.compare_at_cents,
        coverUrl: mediaUrls[0] || (p.attributes as any)?.cover_url || null,
        image_url: mediaUrls[0] || (p.attributes as any)?.cover_url || null,
        mediaUrls,
        variants,
        optionGroups,
        modifierGroups,
        hasModifiers: optionGroups.length > 0 || modifierGroups.length > 0,
      };
    });

    return {
      items,
      total: count || items.length,
      hasMore: offset + items.length < (count || 0),
      nextOffset: offset + items.length,
    };
  });

export const getClientStorePortalSummaryFn = createServerFn({ method: "GET" })
  .validator(
    z.object({
      storeId: z.string().uuid(),
      accessToken: z.string().trim().max(240).optional().nullable(),
    }),
  )
  .handler(async ({ data }): Promise<ClientStorePortalSummaryDTO> => {
      const emptyResponse = (
        authenticated: boolean,
        extra?: Partial<ClientStorePortalSummaryDTO>,
      ): ClientStorePortalSummaryDTO => ({
        authenticated,
        storeId: data.storeId,
        orders: [],
        appointments: [],
        trips: [],
        proposals: [],
        tickets: [],
        contracts: [],
        receivables: [],
        ...extra,
      });

    try {
      const db = getServerClient();
      const storeId = data.storeId;
      const rawAccessToken = String(data.accessToken || "").trim();

      let authMode: "account" | "magic_link" = "account";
      let resolvedUserId: string | null = null;
      let resolvedCrmCustomerId: string | null = null;
      let resolvedLeadId: string | null = null;
      let resolvedUserEmail: string | null = null;
      let resolvedUserName: string | null = null;
      let resolvedPhoneDigits: string | null = null;
      let resolvedClientCode: string | null = null;

      if (rawAccessToken) {
        const tokenRow = await resolveScopedClientPortalToken(db, storeId, rawAccessToken);
        if (tokenRow) {
          authMode = "magic_link";
          resolvedUserId = tokenRow.customer_id || null;
          resolvedCrmCustomerId = tokenRow.crm_customer_id || null;
          resolvedLeadId = tokenRow.lead_id || null;
          resolvedUserEmail = sanitizeRealCustomerEmail(tokenRow.customer_email);
          resolvedUserName = tokenRow.customer_name || null;
          resolvedPhoneDigits = sanitizeRealPhoneDigits(
            tokenRow.customer_phone_digits || tokenRow.customer_phone,
          );
          resolvedClientCode = tokenRow.client_code || null;

          // Se token não tiver profile_id vinculado, tenta associar perfil civil pelo telefone/email verificado
          if (!resolvedUserId && (resolvedPhoneDigits || resolvedUserEmail)) {
            const profileOr: string[] = [];
            for (const v of buildBrazilPhoneVariants(resolvedPhoneDigits)) {
              profileOr.push(`phone.eq.${v}`);
            }
            if (profileOr.length > 0) {
              const { data: profRows } = await db
                .from("profiles")
                .select("id, full_name")
                .or(profileOr.join(","))
                .limit(1);
              const profByPhone = Array.isArray(profRows) ? profRows[0] : profRows;
              if (profByPhone?.id) {
                resolvedUserId = profByPhone.id;
                if (!resolvedUserName && profByPhone.full_name) {
                  resolvedUserName = profByPhone.full_name;
                }
              }
            }
          }
        }
      }

      if (authMode !== "magic_link") {
        const ssr = await getSSRClient();
        const {
          data: { user },
        } = await ssr.auth.getUser();

        if (!user) {
          return emptyResponse(false, rawAccessToken ? { tokenInvalid: true } : undefined);
        }

        resolvedUserId = user.id;
        resolvedUserEmail = user.email ? String(user.email).trim() : null;
      }

      const candidateCustomerIds = Array.from(
        new Set([resolvedUserId, resolvedCrmCustomerId].filter(Boolean) as string[]),
      );
      const phoneSuffix8 =
        resolvedPhoneDigits && resolvedPhoneDigits.length >= 8
          ? resolvedPhoneDigits.slice(-8)
          : null;

      const tripOrParts: string[] = [];
      for (const cid of candidateCustomerIds) {
        tripOrParts.push(`customer_id.eq.${cid}`);
      }
      if (resolvedUserEmail) {
        tripOrParts.push(`client_email.eq.${resolvedUserEmail}`);
      }
      for (const v of buildBrazilPhoneVariants(resolvedPhoneDigits)) {
        tripOrParts.push(`client_whatsapp.eq.${v}`);
      }
      const scopedTripsQuery =
        tripOrParts.length > 0
          ? db
              .from("tourism_trips")
              .select(
                "id, trip_number, title, destination_city, travel_start_date, travel_end_date, total_cents, status, tourism_vouchers(public_token)",
              )
              .eq("store_id", storeId)
              .or(tripOrParts.join(","))
              .order("created_at", { ascending: false })
              .limit(30)
          : null;

      const ticketOrParts: string[] = [];
      if (resolvedUserId) ticketOrParts.push(`owner_profile_id.eq.${resolvedUserId}`);
      if (resolvedUserEmail) ticketOrParts.push(`recipient_email.eq.${resolvedUserEmail}`);
      const scopedTicketsQuery =
        ticketOrParts.length > 0
          ? db
              .from("tickets")
              .select(
                "id, event_id, status, qr_hash, human_code, event:events!tickets_event_id_fkey!inner(id, store_id, title, event_date, location), lot:ticket_lots!tickets_lot_id_fkey(name)",
              )
              .eq("event.store_id", storeId)
              .or(ticketOrParts.join(","))
              .order("created_at", { ascending: false })
              .limit(30)
          : null;

      const contractOrParts: string[] = [];
      for (const cid of candidateCustomerIds) {
        contractOrParts.push(`customer_id.eq.${cid}`);
      }
      if (resolvedLeadId) {
        contractOrParts.push(`lead_id.eq.${resolvedLeadId}`);
      }

      const appointmentOrParts: string[] = [];
      for (const cid of candidateCustomerIds) {
        appointmentOrParts.push(`customer_id.eq.${cid}`);
      }
      for (const v of buildBrazilPhoneVariants(resolvedPhoneDigits)) {
        appointmentOrParts.push(`guest_phone.eq.${v}`);
      }

      const envelopeOrParts: string[] = [];
      if (resolvedUserId) envelopeOrParts.push(`signer_profile_id.eq.${resolvedUserId}`);
      if (resolvedUserEmail) envelopeOrParts.push(`signer_email.eq.${resolvedUserEmail}`);
      for (const v of buildBrazilPhoneVariants(resolvedPhoneDigits)) {
        envelopeOrParts.push(`signer_phone.eq.${v}`);
      }

      const proposalOrParts: string[] = [];
      for (const cid of candidateCustomerIds) {
        proposalOrParts.push(`customer_id.eq.${cid}`);
      }
      if (resolvedLeadId) proposalOrParts.push(`lead_id.eq.${resolvedLeadId}`);
      if (resolvedUserEmail) proposalOrParts.push(`client_email.eq.${resolvedUserEmail}`);
      for (const v of buildBrazilPhoneVariants(resolvedPhoneDigits)) {
        proposalOrParts.push(`client_whatsapp.eq.${v}`);
      }

      const [
        profileRes,
        ordersRes,
        fallbackOrdersRes,
        appointmentsRes,
        tripsRes,
        inquiriesRes,
        ticketsRes,
        envelopesRes,
        storeContractsRes,
        receivablesRes,
        proposalsRes,
      ] = await Promise.all([
        resolvedUserId
          ? db.from("profiles").select("full_name").eq("id", resolvedUserId).maybeSingle()
          : Promise.resolve({ data: null }),
        candidateCustomerIds.length > 0
          ? db
              .from("orders")
              .select(
                "id, order_number, public_token, status, total_cents, shipping_method, created_at, order_items(id, product_title, item_type)",
              )
              .eq("store_id", storeId)
              .in("customer_id", candidateCustomerIds)
              .order("created_at", { ascending: false })
              .limit(30)
          : Promise.resolve({ data: [] }),
        authMode === "magic_link" && (phoneSuffix8 || resolvedUserEmail)
          ? db
              .from("orders")
              .select(
                "id, order_number, public_token, status, total_cents, shipping_method, customer_snapshot, created_at, order_items(id, product_title, item_type)",
              )
              .eq("store_id", storeId)
              .order("created_at", { ascending: false })
              .limit(40)
          : Promise.resolve({ data: [] }),
        appointmentOrParts.length > 0
          ? db
              .from("booking_appointments")
              .select(
                "id, scheduled_at, status, notes, booking_services(title, price_cents)",
              )
              .eq("store_id", storeId)
              .or(appointmentOrParts.join(","))
              .order("scheduled_at", { ascending: false })
              .limit(30)
          : Promise.resolve({ data: [] }),
        scopedTripsQuery || Promise.resolve({ data: [] }),
        resolvedUserId
          ? db
              .from("tourism_inquiries")
              .select(
                "id, voucher_code, desired_date, total_price_cents, status, tourism_experiences!inner(id, store_id, title, location)",
              )
              .eq("profile_id", resolvedUserId)
              .eq("tourism_experiences.store_id", storeId)
              .order("created_at", { ascending: false })
              .limit(20)
          : Promise.resolve({ data: [] }),
        scopedTicketsQuery || Promise.resolve({ data: [] }),
        envelopeOrParts.length > 0
          ? db
              .from("signature_envelopes")
              .select(
                "id, status, signing_token, signed_at, created_at, contract_version:contract_version_id(contract:contract_id!inner(id, store_id, title, verification_code))",
              )
              .or(envelopeOrParts.join(","))
              .order("created_at", { ascending: false })
              .limit(30)
          : Promise.resolve({ data: [] }),
        contractOrParts.length > 0
          ? db
              .from("contracts")
              .select("id, title, status, verification_code, updated_at, created_at")
              .eq("store_id", storeId)
              .or(contractOrParts.join(","))
              .order("created_at", { ascending: false })
              .limit(20)
          : Promise.resolve({ data: [] }),
        candidateCustomerIds.length > 0
          ? db
              .from("receivables")
              .select(
                "id, title, total_amount_cents, status, created_at, installments:receivable_installments(id, installment_number, due_date, original_amount_cents, amount_cents, final_amount_cents, status, pix_copy_paste)",
              )
              .eq("store_id", storeId)
              .in("debtor_id", candidateCustomerIds)
              .order("created_at", { ascending: false })
              .limit(30)
          : Promise.resolve({ data: [] }),
        proposalOrParts.length > 0
          ? db
              .from("travel_proposals")
              .select("id, title, destination_city, public_token, pricing, status, created_at")
              .eq("store_id", storeId)
              .eq("is_hidden", false)
              .or(proposalOrParts.join(","))
              .order("updated_at", { ascending: false })
              .limit(20)
          : Promise.resolve({ data: [] }),
      ]);

      const orderMap = new Map<string, any>();
      for (const o of ordersRes.data || []) {
        if (o?.id) orderMap.set(String(o.id), o);
      }
      for (const o of fallbackOrdersRes.data || []) {
        if (!o?.id || orderMap.has(String(o.id))) continue;
        const snap = (o.customer_snapshot && typeof o.customer_snapshot === "object" ? o.customer_snapshot : {}) as Record<string, any>;
        const snapDigits = sanitizePhoneDigits(snap.phone || snap.whatsapp || snap.telefone);
        const snapEmail = sanitizeRealCustomerEmail(snap.email);
        const phoneMatches = Boolean(phoneSuffix8 && snapDigits && snapDigits.endsWith(phoneSuffix8));
        const emailMatches = Boolean(resolvedUserEmail && snapEmail && snapEmail === resolvedUserEmail);
        if (phoneMatches || emailMatches) {
          orderMap.set(String(o.id), o);
        }
      }

      const orders = Array.from(orderMap.values()).map((o: any) => {
        const items = Array.isArray(o.order_items) ? o.order_items : [];
        return {
          id: String(o.id),
          order_number: o.order_number || null,
          public_token: o.public_token || null,
          status: o.status || "pending",
          total_cents: Number(o.total_cents || 0),
          created_at: o.created_at,
          shipping_method: o.shipping_method || null,
          items_count: items.length,
          first_item_title: items[0]?.product_title || null,
          is_rental: items.some((it: any) => it.item_type === "rental"),
          items: items.map((it: any) => ({
            id: String(it.id || Math.random()),
            product_title: String(it.product_title || "Item"),
            item_type: it.item_type || null,
          })),
        };
      });

      const appointments = (appointmentsRes.data || []).map((a: any) => ({
        id: String(a.id),
        service_title: a.booking_services?.title || "Agendamento",
        scheduled_at: a.scheduled_at,
        status: a.status || "pending",
        price_cents: a.booking_services?.price_cents ?? null,
        notes: a.notes || null,
      }));

      const trips = [
        ...(tripsRes.data || []).map((t: any) => ({
          id: String(t.id),
          title: t.title || t.destination_city || "Viagem",
          destination: t.destination_city || null,
          locator_code: t.trip_number || null,
          departure_date: t.travel_start_date || null,
          return_date: t.travel_end_date || null,
          status: t.status || "active",
          voucher_url: t.tourism_vouchers?.[0]?.public_token
            ? `/voucher/${t.tourism_vouchers[0].public_token}`
            : null,
          total_cents: t.total_cents ?? null,
        })),
        ...(inquiriesRes.data || []).map((inq: any) => ({
          id: String(inq.id),
          title: inq.tourism_experiences?.title || "Reserva Turística",
          destination: inq.tourism_experiences?.location || null,
          locator_code: inq.voucher_code || null,
          departure_date: inq.desired_date || null,
          return_date: null,
          status: inq.status || "pending",
          voucher_url: inq.voucher_code ? `/voucher/${inq.voucher_code}` : null,
          total_cents: inq.total_price_cents ?? null,
        })),
      ];

      const tickets = (ticketsRes.data || []).map((tk: any) => ({
        id: String(tk.id),
        event_id: String(tk.event_id),
        event_title: tk.event?.title || "Evento",
        event_date: tk.event?.event_date || null,
        location: tk.event?.location || null,
        lot_name: tk.lot?.name || null,
        qr_code_token: tk.human_code || tk.qr_hash || null,
        status: tk.status || "valid",
      }));

      const contractMap = new Map<string, any>();
      for (const env of envelopesRes.data || []) {
        const cv = Array.isArray((env as any).contract_version)
          ? (env as any).contract_version[0]
          : (env as any).contract_version;
        const ct = Array.isArray(cv?.contract) ? cv.contract[0] : cv?.contract;
        if (ct?.store_id !== storeId) continue;
        const key = String(ct?.id || env.id);
        contractMap.set(key, {
          id: String(env.id),
          title: ct?.title || "Contrato",
          status: env.status || "pending",
          public_token: env.signing_token || null,
          signed_at: env.signed_at || null,
          created_at: env.created_at,
          verification_code: ct?.verification_code || null,
        });
      }
      for (const ct of storeContractsRes.data || []) {
        const key = String(ct.id);
        if (!contractMap.has(key)) {
          contractMap.set(key, {
            id: key,
            title: ct.title || "Contrato",
            status: ct.status || "pending",
            public_token: null,
            signed_at: ct.status === "signed" ? ct.updated_at || null : null,
            created_at: ct.created_at,
            verification_code: ct.verification_code || null,
          });
        }
      }
      const contracts = Array.from(contractMap.values());

      const receivables = (receivablesRes.data || []).map((r: any) => {
        const insts = Array.isArray(r.installments) ? r.installments : [];
        const remainingCents = insts
          .filter((inst: any) => inst.status !== "paid")
          .reduce(
            (sum: number, inst: any) =>
              sum + Number(inst.final_amount_cents || inst.original_amount_cents || inst.amount_cents || 0),
            0,
          );
        return {
          id: String(r.id),
          title: r.title || "Parcelamento",
          total_amount_cents: Number(r.total_amount_cents || 0),
          remaining_cents: remainingCents,
          status: r.status || "active",
          created_at: r.created_at,
          installments: insts.map((inst: any) => ({
            id: String(inst.id),
            installment_number: Number(inst.installment_number || 1),
            due_date: inst.due_date,
            amount_cents: Number(inst.final_amount_cents || inst.original_amount_cents || inst.amount_cents || 0),
            status: inst.status || "pending",
            pix_copy_paste: inst.pix_copy_paste || null,
          })),
        };
      });

      const proposals = (proposalsRes.data || []).map((p: any) => {
        const pr = (p.pricing && typeof p.pricing === "object" ? p.pricing : {}) as Record<string, any>;
        const totalCents = Number(pr.total_price_cents ?? pr.total_cents ?? 0) || 0;
        return {
          id: String(p.id),
          title: p.title || p.destination_city || "Proposta",
          destination: p.destination_city || null,
          total_cents: totalCents,
          status: p.status || "draft",
          public_token: typeof p.public_token === "string" && p.public_token.trim() ? p.public_token.trim() : null,
          created_at: p.created_at,
        };
      });

      let staffRole: string | null = null;
      let assignedPriceTable: { id: string; name: string; base_discount_percentage: number } | null = null;

      if (resolvedUserId) {
        const { data: memberRow } = await db
          .from("store_members")
          .select("role")
          .eq("store_id", storeId)
          .eq("user_id", resolvedUserId)
          .eq("status", "active")
          .maybeSingle();
        if (memberRow?.role) {
          staffRole = memberRow.role;
        }

        const { data: assignment } = await db
          .from("customer_price_table_assignments")
          .select("price_table_id, price_tables(id, name, base_discount_percentage, active, valid_until)")
          .eq("customer_id", resolvedUserId)
          .eq("store_id", storeId)
          .maybeSingle();
        const table = assignment?.price_tables as any;
        if (table && table.active && (!table.valid_until || new Date(table.valid_until) >= new Date())) {
          assignedPriceTable = {
            id: table.id,
            name: table.name,
            base_discount_percentage: Number(table.base_discount_percentage || 0),
          };
        }
      }

      return {
        authenticated: true,
        authMode,
        clientCode: resolvedClientCode,
        userId: resolvedUserId,
        userEmail: resolvedUserEmail,
        userName: resolvedUserName || profileRes.data?.full_name || null,
        staffRole,
        assignedPriceTable,
        storeId,
        orders,
        appointments,
        trips,
        proposals,
        tickets,
        contracts,
        receivables,
      };
    } catch (err) {
      console.error("[branded-app.functions] getClientStorePortalSummaryFn error:", err);
      return emptyResponse(false);
    }
  });

export interface IssueCustomerAppTokenInput {
  storeId: string;
  customerId?: string | null;
  crmCustomerId?: string | null;
  leadId?: string | null;
  threadId?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  customerDocument?: string | null;
  customerEmail?: string | null;
  clientCode?: string | null;
  originHint?: string | null;
  regenerate?: boolean;
  createdBy?: string | null;
}

export async function issueOrReuseCustomerAppTokenInternal(
  db: any,
  input: IssueCustomerAppTokenInput,
): Promise<(CustomerAppMagicAccessDTO & { success: boolean }) | null> {
  const { data: storeRow, error: storeErr } = await db
    .from("stores")
    .select("id, slug, custom_domain, settings")
    .eq("id", input.storeId)
    .maybeSingle();

  if (storeErr || !storeRow?.slug) {
    return null;
  }

  const cleanPhoneDigits = sanitizeRealPhoneDigits(input.customerPhone);
  const cleanEmail = sanitizeRealCustomerEmail(input.customerEmail);
  const cleanDocumentDigits = sanitizePhoneDigits(input.customerDocument) || null;
  const crmCustomerId = input.crmCustomerId || null;
  const customerId =
    input.customerId && input.customerId !== crmCustomerId ? input.customerId : null;
  const leadId = input.leadId || null;
  const threadId = input.threadId || null;
  const customerName = input.customerName?.trim() || null;

  const insertPayload = {
    store_id: input.storeId,
    customer_id: customerId,
    crm_customer_id: crmCustomerId,
    lead_id: leadId,
    thread_id: threadId,
    customer_name: customerName,
    customer_phone: cleanPhoneDigits ? `+${cleanPhoneDigits}` : null,
    customer_phone_digits: cleanPhoneDigits,
    customer_document: cleanDocumentDigits,
    customer_email: cleanEmail,
    client_code: "",
    magic_token: "",
    is_active: true,
    expires_at: "",
    created_by: input.createdBy || null,
  };

  const matchOrParts: string[] = [];
  if (customerId) matchOrParts.push(`customer_id.eq.${customerId}`);
  if (crmCustomerId) matchOrParts.push(`crm_customer_id.eq.${crmCustomerId}`);
  if (leadId) matchOrParts.push(`lead_id.eq.${leadId}`);
  if (cleanPhoneDigits) {
    matchOrParts.push(`customer_phone_digits.eq.${cleanPhoneDigits}`);
  }
  if (threadId && matchOrParts.length === 0) {
    matchOrParts.push(`thread_id.eq.${threadId}`);
  }

  const nowIso = new Date().toISOString();
  const storeSettings = (storeRow.settings || {}) as Record<string, any>;
  const hostInput = {
    slug: storeRow.slug,
    customDomain: storeRow.custom_domain || null,
    customDomainStatus: storeSettings.custom_domain_status || null,
    fallbackOrigin: input.originHint || "https://waesy.com.br",
  };

  if (!input.regenerate && matchOrParts.length > 0) {
    const { data: existingToken } = await db
      .from("store_app_client_tokens")
      .select(
        "id, client_code, magic_token, expires_at, last_accessed_at, access_count, customer_name, customer_phone_digits, customer_email",
      )
      .eq("store_id", input.storeId)
      .eq("is_active", true)
      .is("revoked_at", null)
      .gt("expires_at", nowIso)
      .or(matchOrParts.join(","))
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingToken?.magic_token) {
      return {
        success: true,
        app_url: buildBrandedAppBaseUrl(hostInput),
        portal_url: buildBrandedClientPortalUrl({
          ...hostInput,
          magicToken: existingToken.magic_token,
          clientCode: existingToken.client_code,
        }),
        client_code: existingToken.client_code,
        magic_token: existingToken.magic_token,
        expires_at: existingToken.expires_at,
        last_accessed_at: existingToken.last_accessed_at || null,
        access_count: Number(existingToken.access_count || 0),
        has_active_token: true,
      };
    }
  }

  if (input.regenerate && matchOrParts.length > 0) {
    await db
      .from("store_app_client_tokens")
      .update({
        is_active: false,
        revoked_at: nowIso,
        updated_at: nowIso,
      })
      .eq("store_id", input.storeId)
      .eq("is_active", true)
      .is("revoked_at", null)
      .or(matchOrParts.join(","));
  }

  let candidateCode = deriveBaseClientCode({
    clientCode: input.clientCode,
    customerId,
    crmCustomerId,
    phoneDigits: cleanPhoneDigits,
    leadId,
    threadId,
  });

  const { data: conflictingCode } = await db
    .from("store_app_client_tokens")
    .select("id, customer_id, crm_customer_id, lead_id, customer_phone_digits")
    .eq("store_id", input.storeId)
    .eq("client_code", candidateCode)
    .eq("is_active", true)
    .is("revoked_at", null)
    .limit(1)
    .maybeSingle();

  const isDifferentCustomer =
    conflictingCode &&
    !(
      (customerId && conflictingCode.customer_id === customerId) ||
      (crmCustomerId && conflictingCode.crm_customer_id === crmCustomerId) ||
      (leadId && conflictingCode.lead_id === leadId) ||
      (cleanPhoneDigits && conflictingCode.customer_phone_digits === cleanPhoneDigits)
    );

  if (isDifferentCustomer) {
    const randSuffix = createCryptoMagicToken().slice(-4).toUpperCase();
    candidateCode = `${candidateCode}-${randSuffix}`;
  }

  const magicToken = createCryptoMagicToken();
  const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();

  const finalInsertPayload = {
    ...insertPayload,
    client_code: candidateCode,
    magic_token: magicToken,
    expires_at: expiresAt,
  };

  let { data: created, error: insErr } = await db
    .from("store_app_client_tokens")
    .insert(finalInsertPayload)
    .select("client_code, magic_token, expires_at")
    .single();

  // Recuperação resiliente caso UUID de perfil/crm/lead/thread não exista na tabela referenciada (23503)
  if (insErr && String(insErr.code || "") === "23503") {
    const retryRes = await db
      .from("store_app_client_tokens")
      .insert({
        ...finalInsertPayload,
        customer_id: null,
        crm_customer_id: null,
        lead_id: null,
        thread_id: null,
        created_by: null,
      })
      .select("client_code, magic_token, expires_at")
      .single();
    created = retryRes.data;
    insErr = retryRes.error;
  }

  if (insErr || !created) {
    return null;
  }

  return {
    success: true,
    app_url: buildBrandedAppBaseUrl(hostInput),
    portal_url: buildBrandedClientPortalUrl({
      ...hostInput,
      magicToken: created.magic_token,
      clientCode: created.client_code,
    }),
    client_code: created.client_code,
    magic_token: created.magic_token,
    expires_at: created.expires_at,
    last_accessed_at: null,
    access_count: 0,
    has_active_token: true,
  };
}

export const generateCustomerAppMagicAccessFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      storeId: z.string().uuid().optional().nullable(),
      customerId: z.string().uuid().optional().nullable(),
      crmCustomerId: z.string().uuid().optional().nullable(),
      leadId: z.string().uuid().optional().nullable(),
      threadId: z.string().uuid().optional().nullable(),
      customerName: z.string().max(180).optional().nullable(),
      customerPhone: z.string().max(40).optional().nullable(),
      customerDocument: z.string().max(40).optional().nullable(),
      customerEmail: z.string().max(180).optional().nullable(),
      clientCode: z.string().max(40).optional().nullable(),
      originHint: z.string().max(200).optional().nullable(),
      regenerate: z.boolean().optional().default(false),
    }),
  )
  .handler(async ({ data }): Promise<CustomerAppMagicAccessDTO & { success: boolean }> => {
    const identity = await getServerIdentity();
    const resolvedStoreId = data.storeId || identity?.store_id;
    assertStoreAccess(identity, STAFF_PORTAL_ROLES, resolvedStoreId || undefined);
    if (!resolvedStoreId) {
      throw new Error("Loja não identificada para gerar o acesso do cliente.");
    }

    const db = getServerClient();
    const issued = await issueOrReuseCustomerAppTokenInternal(db, {
      storeId: resolvedStoreId,
      customerId: data.customerId || null,
      crmCustomerId: data.crmCustomerId || null,
      leadId: data.leadId || null,
      threadId: data.threadId || null,
      customerName: data.customerName || null,
      customerPhone: data.customerPhone || null,
      customerDocument: data.customerDocument || null,
      customerEmail: data.customerEmail || null,
      clientCode: data.clientCode || null,
      originHint: data.originHint || null,
      regenerate: Boolean(data.regenerate),
      createdBy: identity?.id || null,
    });

    if (!issued) {
      throw new Error("Não foi possível gerar o código e link mágico de acesso ao App Oficial.");
    }
    return issued;
  });

export const revokeCustomerAppMagicAccessFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      storeId: z.string().uuid().optional().nullable(),
      customerId: z.string().uuid().optional().nullable(),
      crmCustomerId: z.string().uuid().optional().nullable(),
      leadId: z.string().uuid().optional().nullable(),
      threadId: z.string().uuid().optional().nullable(),
      customerPhone: z.string().max(40).optional().nullable(),
    }),
  )
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    const resolvedStoreId = data.storeId || identity?.store_id;
    assertStoreAccess(identity, STAFF_PORTAL_ROLES, resolvedStoreId || undefined);
    if (!resolvedStoreId) {
      throw new Error("Loja não identificada para revogar acesso.");
    }

    const cleanPhoneDigits = sanitizeRealPhoneDigits(data.customerPhone);
    const matchOrParts: string[] = [];
    if (data.customerId) matchOrParts.push(`customer_id.eq.${data.customerId}`);
    if (data.crmCustomerId) matchOrParts.push(`crm_customer_id.eq.${data.crmCustomerId}`);
    if (data.leadId) matchOrParts.push(`lead_id.eq.${data.leadId}`);
    if (cleanPhoneDigits) matchOrParts.push(`customer_phone_digits.eq.${cleanPhoneDigits}`);
    if (data.threadId && matchOrParts.length === 0) matchOrParts.push(`thread_id.eq.${data.threadId}`);

    if (matchOrParts.length === 0) {
      throw new Error("Identificador do cliente obrigatório para revogar acesso.");
    }

    const db = getServerClient();
    const nowIso = new Date().toISOString();
    await db
      .from("store_app_client_tokens")
      .update({
        is_active: false,
        revoked_at: nowIso,
        updated_at: nowIso,
      })
      .eq("store_id", resolvedStoreId)
      .eq("is_active", true)
      .is("revoked_at", null)
      .or(matchOrParts.join(","));

    return { success: true };
  });

export const unlockClientStorePortalByCodeFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      storeId: z.string().uuid(),
      clientCodeOrToken: z.string().trim().min(4).max(240),
      verificationFactor: z.string().trim().max(120).optional().nullable(),
    }),
  )
  .handler(async ({ data }) => {
    const db = getServerClient();
    const rawCode = data.clientCodeOrToken.trim();
    const verificationRaw = String(data.verificationFactor || "").trim();
    const nowIso = new Date().toISOString();

    // 1. Token mágico completo (wca_...) -> autentica direto no tenant
    if (rawCode.startsWith("wca_") || rawCode.length >= 28) {
      const tokenRow = await resolveScopedClientPortalToken(db, data.storeId, rawCode);
      if (!tokenRow) {
        throw new Error("Link mágico inválido ou expirado para esta empresa.");
      }

      await db
        .from("store_app_client_tokens")
        .update({
          last_accessed_at: nowIso,
          access_count: Number(tokenRow.access_count || 0) + 1,
          updated_at: nowIso,
        })
        .eq("id", tokenRow.id);

      return {
        success: true,
        magicToken: tokenRow.magic_token,
        clientCode: tokenRow.client_code,
        customerName: tokenRow.customer_name || null,
      };
    }

    // 2. Código curto (#CLI-XXXX) -> exige segundo fator (WhatsApp, CPF ou E-mail) anti-enumeração
    const normalizedCode = normalizeClientAccessCode(rawCode);
    const verificationDigits = sanitizePhoneDigits(verificationRaw);
    const verificationEmail = sanitizeRealCustomerEmail(verificationRaw);

    if (
      !normalizedCode ||
      (verificationDigits.length < 4 && !verificationEmail)
    ) {
      throw new Error(
        "Informe o Código do Cliente e os 4 últimos dígitos do seu WhatsApp, CPF ou e-mail cadastrado.",
      );
    }

    const { data: candidates } = await db
      .from("store_app_client_tokens")
      .select(
        "id, store_id, customer_id, crm_customer_id, customer_name, customer_phone_digits, customer_document, customer_email, client_code, magic_token, access_count",
      )
      .eq("store_id", data.storeId)
      .eq("client_code", normalizedCode)
      .eq("is_active", true)
      .is("revoked_at", null)
      .gt("expires_at", nowIso)
      .limit(10);

    let matchedRow: any = null;
    for (const row of candidates || []) {
      const phoneDigits = sanitizePhoneDigits(row.customer_phone_digits);
      const docDigits = sanitizePhoneDigits(row.customer_document);
      const rowEmail = sanitizeRealCustomerEmail(row.customer_email);

      const phoneMatch =
        verificationDigits.length >= 4 &&
        phoneDigits.length >= 4 &&
        (phoneDigits.endsWith(verificationDigits) ||
          verificationDigits.endsWith(phoneDigits.slice(-8)));
      const docMatch =
        verificationDigits.length >= 4 &&
        docDigits.length >= 4 &&
        (docDigits.endsWith(verificationDigits) || docDigits === verificationDigits);
      const emailMatch = Boolean(verificationEmail && rowEmail && rowEmail === verificationEmail);

      if (phoneMatch || docMatch || emailMatch) {
        matchedRow = row;
        break;
      }

      // Enriquecimento defensivo se CRM / profile tiver telefone/CPF/email não copiado no token
      if (!matchedRow && (row.customer_id || row.crm_customer_id)) {
        const lookupId = row.customer_id || row.crm_customer_id;
        const { data: crmRow } = await db
          .from("customers_crm")
          .select("phone, document, email")
          .eq("store_id", data.storeId)
          .eq("id", lookupId)
          .maybeSingle();
        if (crmRow) {
          const crmPhone = sanitizePhoneDigits(crmRow.phone);
          const crmDoc = sanitizePhoneDigits(crmRow.document);
          const crmEmail = sanitizeRealCustomerEmail(crmRow.email);
          if (
            (verificationDigits.length >= 4 &&
              crmPhone.length >= 4 &&
              crmPhone.endsWith(verificationDigits)) ||
            (verificationDigits.length >= 4 &&
              crmDoc.length >= 4 &&
              crmDoc.endsWith(verificationDigits)) ||
            (verificationEmail && crmEmail === verificationEmail)
          ) {
            matchedRow = row;
            break;
          }
        }
      }
    }

    if (!matchedRow) {
      throw new Error("Código do cliente ou dado de confirmação inválido/expirado para esta empresa.");
    }

    await db
      .from("store_app_client_tokens")
      .update({
        last_accessed_at: nowIso,
        access_count: Number(matchedRow.access_count || 0) + 1,
        updated_at: nowIso,
      })
      .eq("id", matchedRow.id);

    return {
      success: true,
      magicToken: matchedRow.magic_token,
      clientCode: matchedRow.client_code,
      customerName: matchedRow.customer_name || null,
    };
  });

export const getWorkspaceBrandedAppSetupFn = createServerFn({ method: "GET" })
  .validator(z.object({ storeId: z.string().uuid().optional() }).optional())
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    const resolvedStoreId = data?.storeId || identity.store_id;
    assertStoreAccess(identity, MANAGER_ROLES, resolvedStoreId);
    if (!resolvedStoreId) {
      throw new Error("Loja não identificada para configuração do App.");
    }
    const storeId: string = resolvedStoreId;

    const db = getServerClient();
    const [
      storeRes,
      pwaRes,
      sectionsRes,
      categoriesRes,
      collectionsRes,
      formsRes,
      brandDnaRes,
      brandKitRes,
      productsPreviewRes,
      servicesPreviewRes,
      tourismPreviewRes,
      eventsPreviewRes,
      classifiedsPreviewRes,
      bannersPreviewRes,
      storiesPreviewRes,
      hotOffersPreviewRes,
    ] = await Promise.all([
      db
        .from("stores")
        .select(
          "id, name, slug, description, phone, email, city, state, logo_url, banner_url, primary_niche_id, waesy_marketplace_enabled, publish_to_marketplace, custom_domain, ai_knowledge_base, ai_sales_agent_enabled, payment_instructions, pix_key, settings",
        )
        .eq("id", storeId)
        .single(),
      db.from("store_pwa_configs").select("*").eq("store_id", storeId).maybeSingle(),
      db
        .from("store_page_sections")
        .select("*")
        .eq("store_id", storeId)
        .order("section_order", { ascending: true }),
      db.from("categories").select("id, name, slug, cover_url").eq("store_id", storeId).eq("status", "active").order("name", { ascending: true }),
      db.from("collections").select("id, name, slug").eq("store_id", storeId).order("name", { ascending: true }),
      db.from("lead_forms").select("id, title, slug, status").eq("store_id", storeId).eq("status", "active"),
      db.from("brand_dna_profiles").select("*").eq("store_id", storeId).maybeSingle(),
      db.from("brand_kits").select("*").eq("store_id", storeId).maybeSingle(),
      db
        .from("products")
        .select("id, title, slug, description, price_cents, compare_at_cents, category_id, is_featured, product_media(url, sort_order)", { count: "exact" })
        .eq("store_id", storeId)
        .in("status", ["published", "active"])
        .order("created_at", { ascending: false })
        .limit(8),
      db
        .from("booking_services")
        .select("id, title, description, duration_minutes, price_cents, image_url, category", { count: "exact" })
        .eq("store_id", storeId)
        .eq("status", "active")
        .limit(8),
      db
        .from("tourism_experiences")
        .select("id, title, category, destination, location, price_cents, cover_url, image_url", { count: "exact" })
        .eq("store_id", storeId)
        .eq("status", "active")
        .limit(8),
      db
        .from("events")
        .select("id, title, event_date, location, cover_image, is_free, price_min_cents", { count: "exact" })
        .eq("store_id", storeId)
        .eq("status", "published")
        .is("deleted_at", null)
        .limit(8),
      db
        .from("classifieds")
        .select("id, title, category, deal_type, price_cents, images, city", { count: "exact" })
        .eq("store_id", storeId)
        .eq("status", "active")
        .limit(8),
      db
        .from("banners")
        .select("*")
        .eq("store_id", storeId)
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .limit(4),
      db
        .from("stories")
        .select(
          "id, store_id, author_profile_id, creator_id, media_url, media_type, caption, link_url, link_label, story_kind, hot_offer_id, source_proposal_id, offer_badge_label, offer_price_cents, flame_style, duration_seconds, is_long_format, expires_at, created_at",
        )
        .eq("store_id", storeId)
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
        .order("created_at", { ascending: false })
        .limit(10),
      db
        .from("hot_offers")
        .select("*")
        .eq("store_id", storeId)
        .eq("status", "active")
        .eq("is_published_in_app", true)
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

    const brandKit = buildBrandKitSummary(brandDnaRes.data, brandKitRes.data);

    const store = storeRes.data as any;
    const settings = (store?.settings || {}) as Record<string, any>;
    const inferredNiche =
      store?.primary_niche_id || settings.primary_niche_id || settings.niche || settings.category || "standard_catalog";
    const defaultTemplate = resolveBrandedAppTemplateForNiche(inferredNiche);
    const pwa = pwaRes.data as any;

    const templateId: BrandedAppTemplateId = (pwa?.template_id as BrandedAppTemplateId) || defaultTemplate;
    const nicheFeatures: BrandedAppNicheFeatures = {
      enableApiQuoter: templateId === "tourism_cvc",
      enableCorporateTravel: templateId === "tourism_cvc",
      enableClientPortal: true,
      enableInstallPrompt: true,
      ...((pwa?.niche_features || {}) as BrandedAppNicheFeatures),
    };

    const appConfig: BrandedAppConfigDTO = {
      id: pwa?.id,
      store_id: storeId,
      app_name: pwa?.app_name || store?.name || "Meu App Oficial",
      short_name: pwa?.short_name || (store?.name || "App").slice(0, 16),
      description: pwa?.description || store?.description || null,
      template_id: templateId,
      is_app_enabled: pwa?.is_app_enabled !== false,
      is_published: pwa?.is_published !== false,
      theme_color:
        pwa?.theme_color || brandKit?.primaryColor || settings.primaryColor || TOKEN_HEX.neutral900,
      background_color:
        pwa?.background_color || brandKit?.backgroundColor || TOKEN_HEX.white,
      logo_square_url:
        pwa?.logo_square_url || brandKit?.iconUrl || brandKit?.mainLogoUrl || store?.logo_url || null,
      icon_192_url:
        pwa?.icon_192_url || brandKit?.iconUrl || brandKit?.mainLogoUrl || store?.logo_url || null,
      icon_512_url:
        pwa?.icon_512_url || brandKit?.iconUrl || brandKit?.mainLogoUrl || store?.logo_url || null,
      maskable_icon_512_url:
        pwa?.maskable_icon_512_url ||
        pwa?.icon_512_url ||
        brandKit?.iconUrl ||
        store?.logo_url ||
        null,
      cover_url: pwa?.cover_url || brandKit?.coverUrl || store?.banner_url || null,
      splash_image_url:
        pwa?.splash_image_url || brandKit?.iconUrl || brandKit?.mainLogoUrl || store?.logo_url || null,
      entry_animation: (pwa?.entry_animation || "pulse") as AppEntryAnimation,
      display_mode: pwa?.display_mode || "standalone",
      orientation: pwa?.orientation || "portrait",
      start_url: `/app/${store?.slug || storeId}?source=pwa`,
      custom_domain: pwa?.custom_domain || store?.custom_domain || null,
      custom_domain_status: pwa?.custom_domain_status || settings.custom_domain_status || null,
      omni_page_id: pwa?.omni_page_id || null,
      allow_customer_self_signup: pwa?.allow_customer_self_signup !== false,
      city_targeting_enabled: Boolean(pwa?.city_targeting_enabled),
      cache_version: Number(pwa?.cache_version || 1),
      navigation_tabs:
        Array.isArray(pwa?.navigation_tabs) && pwa.navigation_tabs.length > 0
          ? pwa.navigation_tabs
          : buildDefaultTabsForTemplate(templateId, nicheFeatures),
      niche_features: nicheFeatures,
      settings: (pwa?.settings || {}) as Record<string, any>,
      updated_at: pwa?.updated_at || null,
    };

    const sections: BrandedAppSectionDTO[] =
      Array.isArray(sectionsRes.data) && sectionsRes.data.length > 0
        ? sectionsRes.data.map(normalizeSectionRow)
        : buildDefaultSectionsForTemplate(storeId, templateId, nicheFeatures);

    const previewProducts = (productsPreviewRes.data || []).map((p: any) => {
      const media = Array.isArray(p.product_media)
        ? [...p.product_media].sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0))
        : [];
      return {
        id: p.id,
        title: p.title,
        slug: p.slug,
        description: p.description,
        category_id: p.category_id || null,
        is_featured: Boolean(p.is_featured),
        priceCents: p.price_cents,
        price_cents: p.price_cents,
        compareAtCents: p.compare_at_cents,
        compare_at_cents: p.compare_at_cents,
        coverUrl: media[0]?.url || null,
        image_url: media[0]?.url || null,
      };
    });

    const omniDocuments = await loadStoreOmniDocuments(db, storeId, false);

    return {
      store,
      brandKit,
      knowledgeBaseChars: String(store?.ai_knowledge_base || "").trim().length,
      appConfig,
      sections,
      categories: (categoriesRes.data || []).map((c: any) => ({
        id: String(c.id),
        name: c.name,
        slug: c.slug,
        image_url: c.cover_url || null,
      })),
      collections: collectionsRes.data || [],
      forms: formsRes.data || [],
      counts: {
        products: productsPreviewRes.count ?? previewProducts.length,
        services: servicesPreviewRes.count ?? (servicesPreviewRes.data || []).length,
        tourism: tourismPreviewRes.count ?? (tourismPreviewRes.data || []).length,
        events: eventsPreviewRes.count ?? (eventsPreviewRes.data || []).length,
        classifieds: classifiedsPreviewRes.count ?? (classifiedsPreviewRes.data || []).length,
        categories: (categoriesRes.data || []).length,
        collections: (collectionsRes.data || []).length,
        forms: (formsRes.data || []).length,
      },
      previewData: {
        products: previewProducts,
        services: servicesPreviewRes.data || [],
        tourismItems: tourismPreviewRes.data || [],
        events: eventsPreviewRes.data || [],
        classifieds: classifiedsPreviewRes.data || [],
        banners: bannersPreviewRes.data || [],
        stories: storiesPreviewRes.data || [],
        hotOffers: hotOffersPreviewRes.data || [],
      },
      omniDocuments,
    };
  });

const SaveAppSectionSchema = z.object({
  id: z.string().optional(),
  section_type: z.enum([
    "banner_carousel",
    "highlight_cards",
    "featured_services",
    "custom_text_block",
    "infinite_feed",
    "contact_hours",
    "coupons_grid",
    "product_rail",
    "category_items",
    "collection_items",
    "promotional_flyers",
    "lead_form",
    "survey_form",
    "travel_api_quoter",
    "corporate_travel_cta",
    "tourism_cvc_dock",
    "events_rail",
    "delivery_menu",
    "brand_story",
    "hotpages",
    "omni_block",
    "omni_document",
    "custom_domain_cta",
    "jobs_board",
    "reviews_showcase",
  ]),
  title: z.string().nullable().optional(),
  is_active: z.boolean().default(true),
  layout_mode: z.enum(["carousel", "grid", "list", "bento", "infinite"]).default("carousel"),
  source_type: z
    .enum([
      "all",
      "category",
      "collection",
      "featured",
      "offers",
      "tourism",
      "events",
      "services",
      "classifieds",
      "form",
      "custom",
      "api_quoter",
      "corporate_cta",
      "omni",
      "jobs",
      "reviews",
    ])
    .default("all"),
  source_id: z.string().nullable().optional(),
  tab_id: z.string().default("home"),
  city_filter: z.string().nullable().optional(),
  items_limit: z.number().int().min(1).max(60).default(12),
  config: z.record(z.any()).default({}),
});

export const saveBrandedAppConfigAndSectionsFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      storeId: z.string().uuid().optional(),
      appName: z.string().min(2).max(100),
      shortName: z.string().min(1).max(30),
      description: z.string().nullable().optional(),
      templateId: z.enum([
        "standard_catalog",
        "tourism_cvc",
        "delivery_ifood",
        "events_sympla",
        "services_agenda",
        "ecommerce_retail",
      ]),
      isAppEnabled: z.boolean().default(true),
      isPublished: z.boolean().default(true),
      publishToMarketplace: z.boolean().optional(),
      themeColor: z.string().default(TOKEN_HEX.neutral900),
      backgroundColor: z.string().default(TOKEN_HEX.white),
      logoSquareUrl: z.string().nullable().optional(),
      icon192Url: z.string().nullable().optional(),
      icon512Url: z.string().nullable().optional(),
      maskableIcon512Url: z.string().nullable().optional(),
      coverUrl: z.string().nullable().optional(),
      splashImageUrl: z.string().nullable().optional(),
      entryAnimation: z.enum(["none", "pulse", "bounce", "fade", "slide_up"]).default("pulse"),
      displayMode: z.enum(["standalone", "fullscreen", "minimal-ui", "browser"]).default("standalone"),
      orientation: z.enum(["portrait", "landscape", "any"]).default("portrait"),
      customDomain: z.string().nullable().optional(),
      customDomainStatus: z.string().nullable().optional(),
      omniPageId: z.string().uuid().nullable().optional(),
      allowCustomerSelfSignup: z.boolean().optional(),
      cityTargetingEnabled: z.boolean().optional(),
      navigationTabs: z.array(z.any()).default([]),
      nicheFeatures: z.record(z.any()).default({}),
      settings: z.record(z.any()).default({}),
      syncBrandKit: z.boolean().optional(),
      sections: z.array(SaveAppSectionSchema).optional(),
    }),
  )
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    const storeId = data.storeId || identity.store_id;
    assertStoreAccess(identity, MANAGER_ROLES, storeId);

    const db = getServerClient();

    const [{ data: storeRow }, { data: existingPwa }] = await Promise.all([
      db.from("stores").select("id, slug, settings").eq("id", storeId).single(),
      db.from("store_pwa_configs").select("cache_version").eq("store_id", storeId).maybeSingle(),
    ]);

    const nextCacheVersion = Number(existingPwa?.cache_version || 0) + 1;
    const startUrl = `/app/${storeRow?.slug || storeId}?source=pwa`;

    const { data: savedPwa, error: pwaErr } = await db
      .from("store_pwa_configs")
      .upsert(
        {
          store_id: storeId,
          app_name: data.appName,
          short_name: data.shortName,
          description: data.description ?? null,
          template_id: data.templateId,
          is_app_enabled: data.isAppEnabled,
          is_published: data.isPublished,
          theme_color: data.themeColor,
          background_color: data.backgroundColor,
          logo_square_url: data.logoSquareUrl ?? null,
          icon_192_url: data.icon192Url ?? null,
          icon_512_url: data.icon512Url ?? null,
          maskable_icon_512_url: data.maskableIcon512Url ?? null,
          cover_url: data.coverUrl ?? null,
          splash_image_url: data.splashImageUrl ?? null,
          entry_animation: data.entryAnimation,
          display_mode: data.displayMode,
          orientation: data.orientation,
          start_url: startUrl,
          custom_domain: data.customDomain ?? null,
          custom_domain_status: data.customDomainStatus ?? null,
          omni_page_id: data.omniPageId ?? null,
          allow_customer_self_signup: data.allowCustomerSelfSignup ?? true,
          city_targeting_enabled: data.cityTargetingEnabled ?? false,
          navigation_tabs: data.navigationTabs as any,
          niche_features: data.nicheFeatures as any,
          settings: data.settings as any,
          cache_version: nextCacheVersion,
          published_at: data.isPublished ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "store_id" },
      )
      .select()
      .single();

    if (pwaErr) {
      throw new Error("Erro ao salvar configurações do App: " + pwaErr.message);
    }

    // Sincroniza logo, capa, domínio e opt-in do Marketplace Waesy na tabela stores
    const storeUpdates: Record<string, any> = { updated_at: new Date().toISOString() };
    if (data.logoSquareUrl) {
      storeUpdates.logo_url = data.logoSquareUrl;
    }
    if (data.coverUrl !== undefined) {
      storeUpdates.banner_url = data.coverUrl;
    }
    if (data.customDomain !== undefined) {
      storeUpdates.custom_domain = data.customDomain || null;
    }
    if (data.customDomainStatus !== undefined) {
      const existingSettings = parseSafeJson<Record<string, any>>(storeRow?.settings, {});
      storeUpdates.settings = {
        ...existingSettings,
        custom_domain_status: data.customDomainStatus,
      };
    }
    if (typeof data.publishToMarketplace === "boolean") {
      storeUpdates.waesy_marketplace_enabled = data.publishToMarketplace;
      storeUpdates.publish_to_marketplace = data.publishToMarketplace;
    }

    await db.from("stores").update(storeUpdates).eq("id", storeId);

    // Sincronia bidirecional opcional com Brand Kit / Brand DNA
    if (data.syncBrandKit) {
      try {
        const [{ data: bkRow }, { data: dnaRow }] = await Promise.all([
          db.from("brand_kits").select("id, colors, logos").eq("store_id", storeId).maybeSingle(),
          db.from("brand_dna_profiles").select("id, color_palette, logos").eq("store_id", storeId).maybeSingle(),
        ]);

        if (bkRow) {
          const nextColors = {
            ...parseSafeJson<Record<string, any>>(bkRow.colors, {}),
            primary: data.themeColor,
            background: data.backgroundColor,
          };
          const nextLogos = {
            ...parseSafeJson<Record<string, any>>(bkRow.logos, {}),
            ...(data.logoSquareUrl ? { main_url: data.logoSquareUrl, icon_url: data.logoSquareUrl } : {}),
            ...(data.coverUrl !== undefined ? { cover_url: data.coverUrl } : {}),
          };
          await db
            .from("brand_kits")
            .update({ colors: nextColors, logos: nextLogos, updated_at: new Date().toISOString() })
            .eq("id", bkRow.id);
        }

        if (dnaRow) {
          const nextDnaColors = {
            ...parseSafeJson<Record<string, any>>(dnaRow.color_palette, {}),
            primary: data.themeColor,
            background: data.backgroundColor,
          };
          const nextDnaLogos = {
            ...parseSafeJson<Record<string, any>>(dnaRow.logos, {}),
            ...(data.logoSquareUrl ? { main_url: data.logoSquareUrl, icon_url: data.logoSquareUrl } : {}),
            ...(data.coverUrl !== undefined ? { cover_url: data.coverUrl } : {}),
          };
          await db
            .from("brand_dna_profiles")
            .update({
              color_palette: nextDnaColors,
              logos: nextDnaLogos,
              edited_by_human: true,
              updated_at: new Date().toISOString(),
            })
            .eq("id", dnaRow.id);
        }
      } catch (bkErr) {
        console.warn("[branded-app.functions] syncBrandKit aviso:", bkErr);
      }
    }

    // Sincroniza seções de forma atômica se fornecidas
    let savedSections: BrandedAppSectionDTO[] = [];
    if (Array.isArray(data.sections)) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      const keepIds = data.sections
        .map((s) => s.id)
        .filter((id): id is string => Boolean(id && uuidRegex.test(id)));

      if (keepIds.length > 0) {
        await db
          .from("store_page_sections")
          .delete()
          .eq("store_id", storeId)
          .not("id", "in", `(${keepIds.join(",")})`);
      } else {
        await db.from("store_page_sections").delete().eq("store_id", storeId);
      }

      for (let i = 0; i < data.sections.length; i++) {
        const sec = data.sections[i];
        const rowPayload = {
          store_id: storeId,
          section_type: sec.section_type,
          section_order: i,
          title: sec.title ?? null,
          is_active: sec.is_active,
          layout_mode: sec.layout_mode,
          source_type: sec.source_type,
          source_id: sec.source_id ?? null,
          tab_id: sec.tab_id || "home",
          city_filter: sec.city_filter ?? null,
          items_limit: sec.items_limit || 12,
          config: sec.config as any,
          updated_at: new Date().toISOString(),
        };

        if (sec.id && uuidRegex.test(sec.id)) {
          const { data: up } = await db
            .from("store_page_sections")
            .update(rowPayload)
            .eq("id", sec.id)
            .eq("store_id", storeId)
            .select()
            .single();
          if (up) savedSections.push(normalizeSectionRow(up));
        } else {
          const { data: ins } = await db
            .from("store_page_sections")
            .insert(rowPayload)
            .select()
            .single();
          if (ins) savedSections.push(normalizeSectionRow(ins));
        }
      }
    }

    return {
      status: "ok" as const,
      appConfig: savedPwa,
      sections: savedSections,
      cacheVersion: nextCacheVersion,
    };
  });
