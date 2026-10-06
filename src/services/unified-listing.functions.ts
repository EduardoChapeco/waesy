/**
 * unified-listing.functions.ts — Camada BFF do Motor Unificado de Anúncios (F07 a F14)
 *
 * Regras:
 * - BFF Server Functions com validação rigorosa Zod
 * - Sem importações de UI ou manipulação de DOM
 * - Um único modelo, um único motor para Classificados e Workspace (R02, R03)
 * - RLS Deny-by-Default e autorização em nível de servidor
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { getServerIdentity } from "@/lib/server-access";
import {
  createListingInputSchema,
  updateListingInputSchema,
  listingFacetedSearchSchema,
  moderationActionSchema,
} from "@/lib/ad-engine/listing-schemas";
import {
  transitionListingState,
  shouldExpireClassified,
} from "@/lib/ad-engine/listing-state-machine";
import { validateListingNicheTaxonomy } from "@/lib/ad-engine/niche-taxonomy-manifest";
import { buildListingSeoMetadata, serializeForWebMcp } from "@/lib/ad-engine/seo-engine";
import type { UnifiedListing, ListingStatus, ModerationStatus } from "@/types/unified-ad-engine";

export const PUBLIC_SPEC_ALLOWLIST = new Set([
  "brand",
  "marca",
  "model",
  "modelo",
  "version",
  "versao",
  "condition",
  "condicao",
  "year",
  "ano_fabricacao",
  "ano_modelo",
  "mileage",
  "quilometragem",
  "km",
  "transmission",
  "cambio",
  "fuel_type",
  "combustivel",
  "fuel",
  "color",
  "cor",
  "doors",
  "portas",
  "license_plate_end",
  "final_placa",
  "usable_area",
  "area_util",
  "area_privativa",
  "total_area",
  "area_total",
  "bedrooms",
  "quartos",
  "suites",
  "suites_count",
  "bathrooms",
  "banheiros",
  "parking_spaces",
  "vagas",
  "garage_spots",
  "service_duration",
  "duracao_estimada",
  "duracao",
  "service_modality",
  "regime_atendimento",
  "modalidade",
  "service_warranty",
  "garantia_servico",
  "warranty",
  "garantia",
  "servings",
  "rendimento",
  "serve_pessoas",
  "prep_time",
  "tempo_preparo",
  "weight_kg",
  "peso_kg",
  "weight",
  "peso",
  "dimensions",
  "dimensoes",
  "width_cm",
  "height_cm",
  "length_cm",
  "material",
  "composicao",
  "voltage",
  "voltagem",
  "tensao",
  "power",
  "potencia",
  "niche",
  "segment",
  "is_featured",
  "highlights",
  "amenities",
  "included_items",
]);

export function sanitizePublicProductAttributes(
  raw: Record<string, any> | null | undefined,
): Record<string, any> {
  if (!raw || typeof raw !== "object") return {};
  const clean: Record<string, any> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (
      PUBLIC_SPEC_ALLOWLIST.has(key.toLowerCase()) &&
      typeof value !== "object" &&
      value !== null &&
      value !== undefined
    ) {
      clean[key] = value;
    }
  }
  return clean;
}

/**
 * Converte registro do banco (tabela classifieds ou products) para UnifiedListing canônica
 */
export function mapDatabaseRowToUnifiedListing(
  row: any,
  origin: "classified" | "workspace",
  isPublic = true,
): UnifiedListing {
  const isClassified = origin === "classified";
  const rawAttrs = row.attributes && typeof row.attributes === "object" ? row.attributes : {};
  const attrs = isPublic ? sanitizePublicProductAttributes(rawAttrs) : rawAttrs;
  const nicheId =
    row.niche_id || row.niche || rawAttrs.niche || (isClassified ? "varejo" : "varejo");

  const baseListing: UnifiedListing = {
    id: row.id,
    origin,
    item_type:
      row.item_type || rawAttrs.item_type || (nicheId === "turismo" ? "package" : "product"),
    niche_id: nicheId,
    category_id: row.category_id || row.category || "geral",
    sub_category_id: row.sub_category_id,

    author_id: row.author_profile_id || row.author_id || row.created_by || "system",
    organization_id: row.organization_id || null,
    store_id: row.store_id || null,
    store_name: row.store_name || row.stores?.name || null,
    store_slug: row.store_slug || row.stores?.slug || null,

    title: row.title || "Sem título",
    slug: row.slug || `${row.id}`,
    description: row.description || row.content || "",
    short_description: row.short_description || undefined,
    brand: row.brand || undefined,

    pricing_type: row.pricing_type || (row.price_cents === 0 ? "free" : "fixed"),
    price_cents: Number(row.price_cents || 0),
    price_max_cents: row.price_max_cents ? Number(row.price_max_cents) : undefined,
    compare_at_cents: row.compare_at_cents ? Number(row.compare_at_cents) : null,
    cost_cents: isPublic ? undefined : row.cost_cents ? Number(row.cost_cents) : null,
    margin_percent: isPublic ? undefined : row.margin_percent ? Number(row.margin_percent) : null,
    markup_percent: isPublic ? undefined : row.markup_percent ? Number(row.markup_percent) : null,
    selling_unit: row.selling_unit || "un",

    payment_config: {
      accepts_pix: row.accepts_pix ?? rawAttrs.accepts_pix ?? true,
      pix_discount_percent: Number(row.pix_discount_percent ?? rawAttrs.pix_discount_percent ?? 0),
      accepts_card: row.accepts_card ?? rawAttrs.accepts_card ?? true,
      max_installments: Number(row.max_installments ?? rawAttrs.max_installments ?? 12),
      fee_free_installments: Number(
        row.fee_free_installments ?? rawAttrs.fee_free_installments ?? 6,
      ),
      accepts_cash: row.accepts_cash ?? rawAttrs.accepts_cash ?? false,
      accepts_trade: row.accepts_trade ?? rawAttrs.accepts_trade ?? false,
      deposit_percent: rawAttrs.deposit_percent ? Number(rawAttrs.deposit_percent) : undefined,
      balance_due_days: rawAttrs.balance_due_days ? Number(rawAttrs.balance_due_days) : undefined,
    },

    inclusions: Array.isArray(row.inclusions)
      ? row.inclusions
      : Array.isArray(rawAttrs.inclusions)
        ? rawAttrs.inclusions
        : [],
    exclusions: Array.isArray(row.exclusions)
      ? row.exclusions
      : Array.isArray(rawAttrs.exclusions)
        ? rawAttrs.exclusions
        : [],
    cancellation_policy: row.cancellation_policy || rawAttrs.cancellation_policy,
    terms_and_conditions: row.terms_and_conditions || rawAttrs.terms_and_conditions,

    cover_url: row.cover_url || (Array.isArray(row.images) ? row.images[0] : null),
    media_urls: Array.isArray(row.media_urls)
      ? row.media_urls
      : Array.isArray(row.images)
        ? row.images
        : [],
    video_url: row.video_url || rawAttrs.video_url || null,

    location:
      row.location ||
      rawAttrs.location ||
      (row.location_name ? { city: row.location_name, state: "SC" } : undefined),
    shipping_mode: row.shipping_mode || rawAttrs.shipping_mode || "both",
    free_shipping_local: row.free_shipping_local ?? rawAttrs.free_shipping_local ?? false,
    stock_quantity: row.stock !== undefined ? Number(row.stock) : Number(row.stock_quantity ?? 1),
    capacity_limit: rawAttrs.capacity_limit ? Number(rawAttrs.capacity_limit) : undefined,
    is_unlimited_stock: Boolean(row.is_unlimited_stock ?? rawAttrs.is_unlimited_stock ?? false),

    departure_options: Array.isArray(rawAttrs.departure_options) ? rawAttrs.departure_options : [],
    fiscal_profile: isPublic
      ? undefined
      : row.fiscal_profile || rawAttrs.fiscal_profile || undefined,

    status: (row.status === "active" ? "published" : row.status || "draft") as ListingStatus,
    moderation_status: (rawAttrs.moderation_status || "approved") as ModerationStatus,
    moderation_history: Array.isArray(rawAttrs.moderation_history)
      ? rawAttrs.moderation_history
      : [],
    is_featured: Boolean(row.is_featured ?? rawAttrs.is_featured ?? false),
    views_count: Number(row.views_count ?? row.clicks_count ?? 0),
    clicks_count: Number(row.clicks_count ?? 0),
    leads_count: Number(row.whatsapp_clicks_count ?? row.leads_count ?? 0),

    created_at: row.created_at || new Date().toISOString(),
    updated_at: row.updated_at || new Date().toISOString(),
    published_at:
      row.published_at ||
      (row.status === "active" || row.status === "published" ? row.created_at : null),
    expires_at: row.expires_at || null,

    attributes: attrs,
    seo_metadata: buildListingSeoMetadata({
      title: row.title || "",
      description: row.description || row.content || "",
      short_description: row.short_description,
      slug: row.slug || `${row.id}`,
      niche_id: nicheId,
      item_type: row.item_type || "product",
      cover_url: row.cover_url || (Array.isArray(row.images) ? row.images[0] : null),
      brand: row.brand,
    }),
  };

  return baseListing;
}

// ---------------------------------------------------------------------------
// 1. CRIAR ANÚNCIO (F07 / F15 / F16)
// ---------------------------------------------------------------------------
export const createUnifiedListing = createServerFn({ method: "POST" })
  .validator(createListingInputSchema)
  .handler(async ({ data }) => {
    const db = getServerClient();
    const identity = await getServerIdentity();
    if (!identity?.id) throw new Error("Autenticação necessária para criar um anúncio.");

    const isClassified = data.origin === "classified";
    const authorId = identity.user_id || identity.id;
    const storeId = data.store_id || identity.store_id || null;
    if (data.store_id && data.store_id !== identity.store_id && !identity.isPlatformAdmin) {
      throw new Error("Acesso não autorizado à loja informada.");
    }
    const organizationId =
      data.organization_id || (identity as any)?.organization_id || identity.store_id || null;

    // Calcular expiração se classificado
    let expiresAt: string | null = null;
    if (isClassified) {
      const expDate = new Date();
      expDate.setDate(expDate.getDate() + 30);
      expiresAt = expDate.toISOString();
    }

    const slug = `${data.title
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .slice(0, 80)}-${Date.now().toString(36)}`;

    const attributesPayload = {
      ...data.attributes,
      inclusions: data.inclusions,
      exclusions: data.exclusions,
      departure_options: data.departure_options,
      payment_config: data.payment_config,
      template_id: data.template_id,
      moderation_status: "pending",
      moderation_history: [
        { action: "created", actor_id: identity.id, created_at: new Date().toISOString() },
      ],
    };

    if (isClassified) {
      // Inserção na tabela classifieds com adapter
      const { data: inserted, error } = await db
        .from("classifieds")
        .insert({
          author_profile_id: authorId,
          store_id: storeId,
          category: data.niche_id === "turismo" ? "travel" : "sale",
          title: data.title,
          content: data.description,
          price_cents: data.price_cents,
          images:
            data.media_urls.length > 0 ? data.media_urls : data.cover_url ? [data.cover_url] : [],
          status: "draft",
          expires_at: expiresAt,
          attributes: attributesPayload,
        })
        .select()
        .single();

      if (error) {
        console.error("[unified-listing] Erro ao criar classificado:", error);
        throw new Error(`Falha ao salvar anúncio: ${error.message}`);
      }

      return mapDatabaseRowToUnifiedListing(inserted, "classified");
    } else {
      // Inserção no catálogo do Workspace
      const { data: inserted, error } = await db
        .from("products")
        .insert({
          store_id: storeId,
          title: data.title,
          slug,
          description: data.description,
          price_cents: data.price_cents,
          compare_at_cents: data.compare_at_cents,
          cost_cents: data.cost_cents,
          stock: data.stock_quantity,
          status: "draft",
          metadata: attributesPayload,
        })
        .select()
        .single();

      if (error) {
        console.error("[unified-listing] Erro ao criar produto no catálogo:", error);
        throw new Error(`Falha ao cadastrar item no Workspace: ${error.message}`);
      }

      return mapDatabaseRowToUnifiedListing(inserted, "workspace");
    }
  });

// ---------------------------------------------------------------------------
// 2. BUSCA FACETADA E DESCOBERTA NA VITRINE (F11)
// ---------------------------------------------------------------------------
export const listUnifiedListings = createServerFn({ method: "GET" })
  .validator(listingFacetedSearchSchema)
  .handler(async ({ data }) => {
    const db = getServerClient();
    const limit = data.limit || 24;
    const offset = data.offset || 0;

    const shouldFetchProducts = !data.origin || data.origin === "workspace";
    const shouldFetchClassifieds = !data.origin || data.origin === "classified";

    // 1. Buscar produtos do catálogo Workspace Pro
    let productsQuery = shouldFetchProducts
      ? db
          .from("products")
          .select(
            `
            id, title, slug, description, short_description, price_cents, compare_at_cents,
            status, store_id, attributes, is_physical, created_at, updated_at,
            stores (id, name, slug, settings),
            product_media (url, sort_order)
          `,
          )
          .in("status", ["published", "active"])
          .order("created_at", { ascending: false })
          .range(offset, offset + limit - 1)
      : null;

    if (productsQuery && data.q && data.q.trim()) {
      const term = `%${data.q.trim()}%`;
      productsQuery = productsQuery.or(`title.ilike.${term},description.ilike.${term}`);
    }

    // 2. Buscar classificados ativos
    let classifiedsQuery = shouldFetchClassifieds
      ? db
          .from("classifieds")
          .select(
            `
            id, title, content, price_cents, status, attributes, images, created_at, updated_at,
            store_id, contact_name,
            stores (id, name, slug, settings)
          `,
          )
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .range(offset, offset + limit - 1)
      : null;

    if (classifiedsQuery && data.q && data.q.trim()) {
      const term = `%${data.q.trim()}%`;
      classifiedsQuery = classifiedsQuery.or(`title.ilike.${term},content.ilike.${term}`);
    }

    if (data.min_price_cents !== undefined) {
      if (productsQuery) productsQuery = productsQuery.gte("price_cents", data.min_price_cents);
      if (classifiedsQuery)
        classifiedsQuery = classifiedsQuery.gte("price_cents", data.min_price_cents);
    }
    if (data.max_price_cents !== undefined) {
      if (productsQuery) productsQuery = productsQuery.lte("price_cents", data.max_price_cents);
      if (classifiedsQuery)
        classifiedsQuery = classifiedsQuery.lte("price_cents", data.max_price_cents);
    }

    const [prodRes, classRes] = await Promise.all([
      productsQuery ? productsQuery : Promise.resolve({ data: [] }),
      classifiedsQuery ? classifiedsQuery : Promise.resolve({ data: [] }),
    ]);

    const productRows = prodRes.data || [];
    const classifiedRows = classRes.data || [];

    const productListings = productRows.map((p: any) => {
      const store = Array.isArray(p.stores) ? p.stores[0] : p.stores;
      const sortedMedia = Array.isArray(p.product_media)
        ? [...p.product_media].sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0))
        : [];
      const primaryMedia = sortedMedia[0];
      return mapDatabaseRowToUnifiedListing(
        {
          ...p,
          store_name: store?.name || null,
          store_slug: store?.slug || null,
          cover_url: primaryMedia?.url || null,
          media_urls: sortedMedia.map((m: any) => m.url),
          niche_id:
            store?.settings?.niche || store?.settings?.segment || p.attributes?.niche || "varejo",
        },
        "workspace",
      );
    });

    const classifiedListings = classifiedRows.map((c: any) => {
      const store = Array.isArray(c.stores) ? c.stores[0] : c.stores;
      return mapDatabaseRowToUnifiedListing(
        {
          ...c,
          store_name: store?.name || c.contact_name || null,
          store_slug: store?.slug || null,
          niche_id: c.attributes?.niche || store?.settings?.niche || "desapego",
        },
        "classified",
      );
    });

    const combined = [...productListings, ...classifiedListings];

    // Filtragem em memória para campos JSONB dinâmicos caso necessário
    if (data.niche_id) {
      return combined.filter((l) => l.niche_id === data.niche_id);
    }

    return combined.slice(0, limit);
  });

// ---------------------------------------------------------------------------
// 3. OBTER ANÚNCIO POR ID (COM SERIALIZAÇÃO WEBMCP) (F14)
// ---------------------------------------------------------------------------
export const getUnifiedListingById = createServerFn({ method: "GET" })
  .validator(
    z.object({ id: z.string().uuid(), format: z.enum(["json", "webmcp"]).default("json") }),
  )
  .handler(async ({ data }) => {
    const db = getServerClient();

    // Tenta primeiro em classifieds
    const { data: classRow } = await db
      .from("classifieds")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();

    if (classRow) {
      const listing = mapDatabaseRowToUnifiedListing(classRow, "classified");
      if (data.format === "webmcp") return serializeForWebMcp(listing);
      return listing;
    }

    // Se não encontrar, tenta em products
    const { data: prodRow } = await db.from("products").select("*").eq("id", data.id).maybeSingle();

    if (prodRow) {
      const listing = mapDatabaseRowToUnifiedListing(prodRow, "workspace");
      if (data.format === "webmcp") return serializeForWebMcp(listing);
      return listing;
    }

    throw new Error(`Anúncio ${data.id} não foi encontrado.`);
  });

async function assertListingMutationAccess(
  db: any,
  listing: UnifiedListing,
  identity: any,
  requireModerator = false,
): Promise<void> {
  if (!identity?.id) throw new Error("Autenticação necessária para alterar este anúncio.");
  const role = String(identity.role || "user");
  const admin =
    Boolean(identity.isPlatformAdmin) ||
    ["admin", "master", "platform_admin", "superadmin"].includes(role);
  if (requireModerator && !admin)
    throw new Error("Apenas moderadores autorizados podem executar esta ação.");
  if (admin || listing.author_id === identity.id || listing.author_id === identity.user_id) return;
  if (
    listing.store_id &&
    (identity.store_id === listing.store_id ||
      identity.memberships?.some((m: any) => m.store_id === listing.store_id))
  )
    return;
  if (listing.store_id) {
    const { data: membership } = await db
      .from("workspace_members")
      .select("id")
      .eq("store_id", listing.store_id)
      .eq("profile_id", identity.id)
      .maybeSingle();
    if (membership) return;
  }
  throw new Error("Você não tem permissão para alterar este anúncio.");
}

// ---------------------------------------------------------------------------
// 4. PUBLICAÇÃO COM VALIDAÇÃO TAXONÔMICA RÍGIDA (F10 / F23)
// ---------------------------------------------------------------------------
export const publishUnifiedListing = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const db = getServerClient();
    const identity = await getServerIdentity();
    if (!identity.id) throw new Error("Autenticação necessária para publicar este anúncio.");
    const listing = await getUnifiedListingById({ data: { id: data.id, format: "json" } });
    await assertListingMutationAccess(db, listing as UnifiedListing, identity);

    // F10: Validação de taxonomia por nicho antes de publicar
    const validation = validateListingNicheTaxonomy(listing.niche_id, {
      title: listing.title,
      price_cents: listing.price_cents,
      selling_unit: listing.selling_unit,
      cover_url: listing.cover_url,
      inclusions: listing.inclusions,
      location: listing.location,
      attributes: listing.attributes,
    });

    if (!validation.isValid) {
      return {
        success: false,
        errors: validation.errors,
      };
    }

    // Transição de estado via máquina canônica (F08)
    const transition = transitionListingState(
      listing as UnifiedListing,
      "published",
      { id: identity.id, role: identity.role || "user" },
      "Publicação formal aprovada após checagem de taxonomia",
    );

    if (!transition.success) {
      throw new Error(transition.error);
    }

    // Grava atualização no banco
    if (listing.origin === "classified") {
      await db
        .from("classifieds")
        .update({
          status: "active",
          expires_at: transition.updatedExpiresAt,
        })
        .eq("id", data.id);
    } else {
      await db.from("products").update({ status: "published" }).eq("id", data.id);
    }

    return {
      success: true,
      listingId: data.id,
      newStatus: "published",
    };
  });

// ---------------------------------------------------------------------------
// 5. TRANSIÇÃO DE ESTADO CANÔNICA (F08)
// ---------------------------------------------------------------------------
export const transitionListingStatusAction = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string().uuid(),
      targetStatus: z.enum([
        "draft",
        "review",
        "published",
        "paused",
        "hidden",
        "expired",
        "sold",
        "archived",
      ]),
      reason: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const db = getServerClient();
    const identity = await getServerIdentity();
    if (!identity.id) throw new Error("Autenticação necessária para alterar este anúncio.");
    const listing = await getUnifiedListingById({ data: { id: data.id, format: "json" } });
    await assertListingMutationAccess(db, listing as UnifiedListing, identity);

    const transition = transitionListingState(
      listing as UnifiedListing,
      data.targetStatus,
      { id: identity.id, role: identity.role || "user" },
      data.reason,
    );

    if (!transition.success) {
      throw new Error(transition.error);
    }

    const table = listing.origin === "classified" ? "classifieds" : "products";
    const dbStatus = data.targetStatus === "published" ? "active" : data.targetStatus;

    await db
      .from(table)
      .update({
        status: dbStatus,
        expires_at: transition.updatedExpiresAt,
      })
      .eq("id", data.id);

    return transition;
  });

// ---------------------------------------------------------------------------
// 6. JOB DE EXPIRAÇÃO AUTOMÁTICA DE CLASSIFICADOS (F08)
// ---------------------------------------------------------------------------
export const autoExpireClassifiedsJobAction = createServerFn({ method: "POST" }).handler(
  async () => {
    const db = getServerClient();
    const now = new Date().toISOString();

    // Seleciona anúncios de classificados ativos cuja data limite já passou
    const { data: expiredRows, error } = await db
      .from("classifieds")
      .select("id, status, expires_at")
      .eq("status", "active")
      .lt("expires_at", now);

    if (error || Boolean(expiredRows) === false || expiredRows.length === 0) {
      return { expiredCount: 0 };
    }

    const idsToExpire = expiredRows.map((r) => r.id);

    const { error: updateErr } = await db
      .from("classifieds")
      .update({ status: "expired" })
      .in("id", idsToExpire);

    if (updateErr) {
      console.error("[unified-listing] Erro ao expirar anúncios:", updateErr);
      throw new Error("Falha ao executar rotina de expiração automática.");
    }

    return {
      expiredCount: idsToExpire.length,
      expiredIds: idsToExpire,
    };
  },
);

// ---------------------------------------------------------------------------
// 7. MODERAÇÃO E AUDITORIA (F12)
// ---------------------------------------------------------------------------
export const moderateListingAction = createServerFn({ method: "POST" })
  .validator(moderationActionSchema)
  .handler(async ({ data }) => {
    const db = getServerClient();
    const identity = await getServerIdentity();

    const listing = await getUnifiedListingById({ data: { id: data.listing_id, format: "json" } });
    await assertListingMutationAccess(db, listing as UnifiedListing, identity, true);

    const newModerationStatus =
      data.action === "approve" ? "approved" : data.action === "reject" ? "rejected" : "flagged";
    const auditEvent = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      actor_id: identity.id,
      actor_role: identity.role,
      action: data.action,
      reason: data.reason,
      notes: data.notes,
    };

    const updatedHistory = [...listing.moderation_history, auditEvent];

    if (listing.origin === "classified") {
      await db
        .from("classifieds")
        .update({
          status:
            data.action === "hide" || data.action === "reject"
              ? "banned"
              : listing.status === "published"
                ? "active"
                : listing.status,
          attributes: {
            ...listing.attributes,
            moderation_status: newModerationStatus,
            moderation_history: updatedHistory,
          },
        })
        .eq("id", data.listing_id);
    }

    return {
      success: true,
      listingId: data.listing_id,
      moderationStatus: newModerationStatus,
      auditEvent,
    };
  });
