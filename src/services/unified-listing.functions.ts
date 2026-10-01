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
import type {
  UnifiedListing,
  ListingStatus,
  ModerationStatus,
} from "@/types/unified-ad-engine";

/**
 * Converte registro do banco (tabela classifieds ou products) para UnifiedListing canônica
 */
export function mapDatabaseRowToUnifiedListing(row: any, origin: "classified" | "workspace"): UnifiedListing {
  const isClassified = origin === "classified";
  const attrs = row.attributes || {};
  const nicheId = row.niche_id || row.niche || attrs.niche || (isClassified ? "varejo" : "varejo");

  const baseListing: UnifiedListing = {
    id: row.id,
    origin,
    item_type: row.item_type || attrs.item_type || (nicheId === "turismo" ? "package" : "product"),
    niche_id: nicheId,
    category_id: row.category_id || row.category || "geral",
    sub_category_id: row.sub_category_id,
    
    author_id: row.author_profile_id || row.author_id || row.created_by || "system",
    organization_id: row.organization_id || null,
    store_id: row.store_id || null,
    
    title: row.title || "Sem título",
    slug: row.slug || `${row.id}`,
    description: row.description || row.content || "",
    short_description: row.short_description || undefined,
    brand: row.brand || undefined,
    
    pricing_type: row.pricing_type || (row.price_cents === 0 ? "free" : "fixed"),
    price_cents: Number(row.price_cents || 0),
    price_max_cents: row.price_max_cents ? Number(row.price_max_cents) : undefined,
    compare_at_cents: row.compare_at_cents ? Number(row.compare_at_cents) : null,
    cost_cents: row.cost_cents ? Number(row.cost_cents) : null,
    margin_percent: row.margin_percent ? Number(row.margin_percent) : null,
    markup_percent: row.markup_percent ? Number(row.markup_percent) : null,
    selling_unit: row.selling_unit || "un",
    
    payment_config: {
      accepts_pix: row.accepts_pix ?? attrs.accepts_pix ?? true,
      pix_discount_percent: Number(row.pix_discount_percent ?? attrs.pix_discount_percent ?? 0),
      accepts_card: row.accepts_card ?? attrs.accepts_card ?? true,
      max_installments: Number(row.max_installments ?? attrs.max_installments ?? 12),
      fee_free_installments: Number(row.fee_free_installments ?? attrs.fee_free_installments ?? 6),
      accepts_cash: row.accepts_cash ?? attrs.accepts_cash ?? false,
      accepts_trade: row.accepts_trade ?? attrs.accepts_trade ?? false,
      deposit_percent: attrs.deposit_percent ? Number(attrs.deposit_percent) : undefined,
      balance_due_days: attrs.balance_due_days ? Number(attrs.balance_due_days) : undefined,
    },
    
    inclusions: Array.isArray(row.inclusions) ? row.inclusions : Array.isArray(attrs.inclusions) ? attrs.inclusions : [],
    exclusions: Array.isArray(row.exclusions) ? row.exclusions : Array.isArray(attrs.exclusions) ? attrs.exclusions : [],
    cancellation_policy: row.cancellation_policy || attrs.cancellation_policy,
    terms_and_conditions: row.terms_and_conditions || attrs.terms_and_conditions,
    
    cover_url: row.cover_url || (Array.isArray(row.images) ? row.images[0] : null),
    media_urls: Array.isArray(row.media_urls) ? row.media_urls : Array.isArray(row.images) ? row.images : [],
    video_url: row.video_url || attrs.video_url || null,
    
    location: row.location || attrs.location || (row.location_name ? { city: row.location_name, state: "SC" } : undefined),
    shipping_mode: row.shipping_mode || attrs.shipping_mode || "both",
    free_shipping_local: row.free_shipping_local ?? attrs.free_shipping_local ?? false,
    stock_quantity: row.stock !== undefined ? Number(row.stock) : Number(row.stock_quantity ?? 1),
    capacity_limit: attrs.capacity_limit ? Number(attrs.capacity_limit) : undefined,
    is_unlimited_stock: Boolean(row.is_unlimited_stock ?? attrs.is_unlimited_stock ?? false),
    
    departure_options: Array.isArray(attrs.departure_options) ? attrs.departure_options : [],
    fiscal_profile: row.fiscal_profile || attrs.fiscal_profile,
    
    status: (row.status === "active" ? "published" : row.status || "draft") as ListingStatus,
    moderation_status: (attrs.moderation_status || "approved") as ModerationStatus,
    moderation_history: Array.isArray(attrs.moderation_history) ? attrs.moderation_history : [],
    is_featured: Boolean(row.is_featured ?? attrs.is_featured ?? false),
    views_count: Number(row.views_count ?? row.clicks_count ?? 0),
    clicks_count: Number(row.clicks_count ?? 0),
    leads_count: Number(row.whatsapp_clicks_count ?? row.leads_count ?? 0),
    
    created_at: row.created_at || new Date().toISOString(),
    updated_at: row.updated_at || new Date().toISOString(),
    published_at: row.published_at || (row.status === "active" || row.status === "published" ? row.created_at : null),
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
    const identity = await getServerIdentity().catch(() => null);

    const isClassified = data.origin === "classified";
    const authorId = identity?.user_id || "00000000-0000-0000-0000-000000000000";
    const storeId = data.store_id || identity?.store_id || null;
    const organizationId = data.organization_id || identity?.organization_id || null;

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
      moderation_status: "approved",
      moderation_history: [],
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
          images: data.media_urls.length > 0 ? data.media_urls : data.cover_url ? [data.cover_url] : [],
          status: "active",
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
          status: "published",
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

    // Buscar anúncios ativos na tabela classifieds
    let query = db
      .from("classifieds")
      .select("*")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (data.q && data.q.trim()) {
      const term = `%${data.q.trim()}%`;
      query = query.or(`title.ilike.${term},content.ilike.${term}`);
    }

    if (data.min_price_cents !== undefined) {
      query = query.gte("price_cents", data.min_price_cents);
    }
    if (data.max_price_cents !== undefined) {
      query = query.lte("price_cents", data.max_price_cents);
    }

    const { data: rows, error } = await query;
    if (error) {
      console.error("[unified-listing] Erro ao buscar anúncios facetados:", error);
      return [];
    }

    const listings = (rows || []).map((r) => mapDatabaseRowToUnifiedListing(r, "classified"));

    // Filtragem em memória para campos JSONB dinâmicos caso necessário
    if (data.niche_id) {
      return listings.filter((l) => l.niche_id === data.niche_id);
    }

    return listings;
  });

// ---------------------------------------------------------------------------
// 3. OBTER ANÚNCIO POR ID (COM SERIALIZAÇÃO WEBMCP) (F14)
// ---------------------------------------------------------------------------
export const getUnifiedListingById = createServerFn({ method: "GET" })
  .validator(z.object({ id: z.string().uuid(), format: z.enum(["json", "webmcp"]).default("json") }))
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
    const { data: prodRow } = await db
      .from("products")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();

    if (prodRow) {
      const listing = mapDatabaseRowToUnifiedListing(prodRow, "workspace");
      if (data.format === "webmcp") return serializeForWebMcp(listing);
      return listing;
    }

    throw new Error(`Anúncio ${data.id} não foi encontrado.`);
  });

// ---------------------------------------------------------------------------
// 4. PUBLICAÇÃO COM VALIDAÇÃO TAXONÔMICA RÍGIDA (F10 / F23)
// ---------------------------------------------------------------------------
export const publishUnifiedListing = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const db = getServerClient();
    const listing = await getUnifiedListingById({ data: { id: data.id, format: "json" } });

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
      listing,
      "published",
      { id: listing.author_id, role: "owner" },
      "Publicação formal aprovada após checagem de taxonomia"
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
      await db
        .from("products")
        .update({ status: "published" })
        .eq("id", data.id);
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
      targetStatus: z.enum(["draft", "review", "published", "paused", "hidden", "expired", "sold", "archived"]),
      reason: z.string().optional(),
    })
  )
  .handler(async ({ data }) => {
    const db = getServerClient();
    const identity = await getServerIdentity().catch(() => null);
    const listing = await getUnifiedListingById({ data: { id: data.id, format: "json" } });

    const transition = transitionListingState(
      listing,
      data.targetStatus,
      { id: identity?.user_id || "actor", role: identity?.role || "user" },
      data.reason
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
export const autoExpireClassifiedsJobAction = createServerFn({ method: "POST" }).handler(async () => {
  const db = getServerClient();
  const now = new Date().toISOString();

  // Seleciona anúncios de classificados ativos cuja data limite já passou
  const { data: expiredRows, error } = await db
    .from("classifieds")
    .select("id, status, expires_at")
    .eq("status", "active")
    .lt("expires_at", now);

  if (error || !expiredRows || expiredRows.length === 0) {
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
});

// ---------------------------------------------------------------------------
// 7. MODERAÇÃO E AUDITORIA (F12)
// ---------------------------------------------------------------------------
export const moderateListingAction = createServerFn({ method: "POST" })
  .validator(moderationActionSchema)
  .handler(async ({ data }) => {
    const db = getServerClient();
    const identity = await getServerIdentity().catch(() => null);

    const listing = await getUnifiedListingById({ data: { id: data.listing_id, format: "json" } });

    const newModerationStatus = data.action === "approve" ? "approved" : data.action === "reject" ? "rejected" : "flagged";
    const auditEvent = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      actor_id: identity?.user_id || "moderator",
      actor_role: identity?.role || "admin",
      action: data.action,
      reason: data.reason,
      notes: data.notes,
    };

    const updatedHistory = [...listing.moderation_history, auditEvent];

    if (listing.origin === "classified") {
      await db
        .from("classifieds")
        .update({
          status: data.action === "hide" || data.action === "reject" ? "banned" : listing.status === "published" ? "active" : listing.status,
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
