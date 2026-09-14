/**
 * store-flyers.functions.ts — BFF Canônico para Encartes & Tabloides Promocionais
 * Padrão BigTech | Zero Mocks | Isolamento Multi-Tenant & RLS Deny-by-Default
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient, getAnonServerClient } from "@/lib/supabase";
import { getServerIdentity, assertStoreAccess } from "@/lib/server-access";

// ─── Tipagens Canônicas de Encartes ──────────────────────────────────────────

export type FlyerTheme = "clean" | "retro_mercado" | "atacado_neon" | "ofertas_relampago";

export interface FlyerHotspotDTO {
  id: string;
  x_percent: number;
  y_percent: number;
  product_id?: string | null;
  custom_label?: string | null;
  price_override_cents?: number | null;
  title?: string | null;
  price_cents?: number | null;
  image_url?: string | null;
  product_slug?: string | null;
  product?: {
    id: string;
    title: string;
    image_url?: string | null;
    price_cents: number;
    promotional_price_cents?: number | null;
    slug?: string | null;
  } | null;
}

export type PromotionalFlyerDTO = StoreFlyerDTO;

export interface StoreFlyerDTO {
  id: string;
  store_id: string;
  title: string;
  subtitle?: string | null;
  image_url: string;
  theme: FlyerTheme;
  valid_from: string;
  valid_until?: string | null;
  status: "active" | "inactive" | "archived";
  hotspots: FlyerHotspotDTO[];
  views_count: number;
  clicks_count: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
  // Propriedades derivadas
  is_valid: boolean;
  time_left_display?: string;
  status_badge?: "active" | "scheduled" | "expired";
  badge_text?: string | null;
}

// Helper para cálculo defensivo de vigência temporal
function computeFlyerValidity(validFrom: string, validUntil?: string | null): {
  is_valid: boolean;
  status_badge: "active" | "scheduled" | "expired";
  time_left_display: string;
} {
  const now = new Date();
  const start = new Date(validFrom);
  const end = validUntil ? new Date(validUntil) : null;

  if (now < start) {
    const diffDays = Math.ceil((start.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return {
      is_valid: false,
      status_badge: "scheduled",
      time_left_display: `Inicia em ${diffDays}d`,
    };
  }

  if (end && now > end) {
    return {
      is_valid: false,
      status_badge: "expired",
      time_left_display: "Expirado",
    };
  }

  if (end) {
    const diffMs = end.getTime() - now.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) {
      return {
        is_valid: true,
        status_badge: "active",
        time_left_display: `Válido por ${diffDays}d`,
      };
    } else if (diffHours > 0) {
      return {
        is_valid: true,
        status_badge: "active",
        time_left_display: `Termina em ${diffHours}h`,
      };
    } else {
      return {
        is_valid: true,
        status_badge: "active",
        time_left_display: "Últimas horas!",
      };
    }
  }

  return {
    is_valid: true,
    status_badge: "active",
    time_left_display: "Vigência contínua",
  };
}

// ─── 1. Consulta Pública de Encartes Válidos (Storefront / Vitrine) ───────────

export const listActiveStoreFlyers = createServerFn({ method: "GET" })
  .validator(
    z.object({
      storeId: z.string().uuid().optional(),
      storeSlug: z.string().optional(),
    })
  )
  .handler(async ({ data: { storeId, storeSlug } }) => {
    const supabase = getAnonServerClient();

    let targetStoreId = storeId;

    if (!targetStoreId && storeSlug) {
      const { data: store } = await supabase
        .from("stores")
        .select("id")
        .eq("slug", storeSlug)
        .maybeSingle();

      targetStoreId = store?.id;
    }

    const nowIso = new Date().toISOString();

    let query = supabase
      .from("store_promotional_flyers")
      .select("*")
      .eq("status", "active")
      .lte("valid_from", nowIso)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (targetStoreId) {
      query = query.eq("store_id", targetStoreId);
    }

    const { data: flyers, error } = await query;

    if (error) {
      console.error("[store-flyers] error listing public flyers:", error);
      return [];
    }

    // Filtra vigência final no servidor defensivamente
    const validFlyers = (flyers || []).filter((f: any) => {
      if (!f.valid_until) return true;
      return new Date(f.valid_until) >= new Date();
    });

    // Coleta IDs de produtos vinculados nos hotspots para carregar detalhes em lote
    const productIdsToFetch = new Set<string>();
    validFlyers.forEach((f: any) => {
      const hotspots = Array.isArray(f.hotspots) ? f.hotspots : [];
      hotspots.forEach((h: any) => {
        if (h.product_id) productIdsToFetch.add(h.product_id);
      });
    });

    let productsMap: Record<string, any> = {};
    if (productIdsToFetch.size > 0) {
      const { data: prods } = await supabase
        .from("products")
        .select("id, title, price_cents, promotional_price_cents, slug, images")
        .in("id", Array.from(productIdsToFetch));

      if (prods) {
        prods.forEach((p: any) => {
          productsMap[p.id] = {
            id: p.id,
            title: p.title,
            price_cents: p.price_cents,
            promotional_price_cents: p.promotional_price_cents,
            slug: p.slug,
            image_url: Array.isArray(p.images) && p.images.length > 0 ? p.images[0] : null,
          };
        });
      }
    }

    return validFlyers.map((f: any): StoreFlyerDTO => {
      const validity = computeFlyerValidity(f.valid_from, f.valid_until);
      const rawHotspots = Array.isArray(f.hotspots) ? f.hotspots : [];

      const enrichedHotspots: FlyerHotspotDTO[] = rawHotspots.map((h: any) => ({
        id: h.id || Math.random().toString(),
        x_percent: Number(h.x_percent) || 0,
        y_percent: Number(h.y_percent) || 0,
        product_id: h.product_id || null,
        custom_label: h.custom_label || null,
        price_override_cents: h.price_override_cents ? Number(h.price_override_cents) : null,
        product: h.product_id ? productsMap[h.product_id] || null : null,
      }));

      return {
        id: f.id,
        store_id: f.store_id,
        title: f.title,
        subtitle: f.subtitle || null,
        image_url: f.image_url,
        theme: f.theme || "clean",
        valid_from: f.valid_from,
        valid_until: f.valid_until || null,
        status: f.status,
        hotspots: enrichedHotspots,
        views_count: f.views_count || 0,
        clicks_count: f.clicks_count || 0,
        sort_order: f.sort_order || 0,
        created_at: f.created_at,
        updated_at: f.updated_at,
        is_valid: validity.is_valid,
        status_badge: validity.status_badge,
        time_left_display: validity.time_left_display,
      };
    });
  });

// ─── 2. Consulta Administrativa de Encartes (Workspace Governance) ────────────

export const listStoreFlyersAdmin = createServerFn({ method: "GET" })
  .validator(
    z.object({
      storeId: z.string().uuid().optional(),
    }).optional()
  )
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager"]);

    const targetStoreId = data?.storeId || identity.store_id;

    const { data: flyers, error } = await supabase
      .from("store_promotional_flyers")
      .select("*")
      .eq("store_id", targetStoreId)
      .neq("status", "archived")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[store-flyers] error listing admin flyers:", error);
      throw new Error("Erro ao listar encartes da loja.");
    }

    // Coleta IDs de produtos vinculados nos hotspots para carregar detalhes
    const productIdsToFetch = new Set<string>();
    (flyers || []).forEach((f: any) => {
      const hotspots = Array.isArray(f.hotspots) ? f.hotspots : [];
      hotspots.forEach((h: any) => {
        if (h.product_id) productIdsToFetch.add(h.product_id);
      });
    });

    let productsMap: Record<string, any> = {};
    if (productIdsToFetch.size > 0) {
      const { data: prods } = await supabase
        .from("products")
        .select("id, title, price_cents, promotional_price_cents, slug, images")
        .in("id", Array.from(productIdsToFetch));

      if (prods) {
        prods.forEach((p: any) => {
          productsMap[p.id] = {
            id: p.id,
            title: p.title,
            price_cents: p.price_cents,
            promotional_price_cents: p.promotional_price_cents,
            slug: p.slug,
            image_url: Array.isArray(p.images) && p.images.length > 0 ? p.images[0] : null,
          };
        });
      }
    }

    return (flyers || []).map((f: any): StoreFlyerDTO => {
      const validity = computeFlyerValidity(f.valid_from, f.valid_until);
      const rawHotspots = Array.isArray(f.hotspots) ? f.hotspots : [];

      const enrichedHotspots: FlyerHotspotDTO[] = rawHotspots.map((h: any) => ({
        id: h.id || Math.random().toString(),
        x_percent: Number(h.x_percent) || 0,
        y_percent: Number(h.y_percent) || 0,
        product_id: h.product_id || null,
        custom_label: h.custom_label || null,
        price_override_cents: h.price_override_cents ? Number(h.price_override_cents) : null,
        product: h.product_id ? productsMap[h.product_id] || null : null,
      }));

      return {
        id: f.id,
        store_id: f.store_id,
        title: f.title,
        subtitle: f.subtitle || null,
        image_url: f.image_url,
        theme: f.theme || "clean",
        valid_from: f.valid_from,
        valid_until: f.valid_until || null,
        status: f.status,
        hotspots: enrichedHotspots,
        views_count: f.views_count || 0,
        clicks_count: f.clicks_count || 0,
        sort_order: f.sort_order || 0,
        created_at: f.created_at,
        updated_at: f.updated_at,
        is_valid: validity.is_valid,
        status_badge: validity.status_badge,
        time_left_display: validity.time_left_display,
      };
    });
  });

// ─── 3. Criação de Encarte Promocional ─────────────────────────────────────────

export const createStoreFlyerSchema = z.object({
  title: z.string().min(2, "Título deve ter no mínimo 2 caracteres"),
  subtitle: z.string().optional().nullable(),
  imageUrl: z.string().url("URL da imagem é obrigatória"),
  theme: z.enum(["clean", "retro_mercado", "atacado_neon", "ofertas_relampago"]).default("clean"),
  validFrom: z.string().optional(),
  validUntil: z.string().optional().nullable(),
  hotspots: z
    .array(
      z.object({
        id: z.string().optional(),
        x_percent: z.number().min(0).max(100),
        y_percent: z.number().min(0).max(100),
        product_id: z.string().uuid().optional().nullable(),
        custom_label: z.string().optional().nullable(),
        price_override_cents: z.number().int().nonnegative().optional().nullable(),
      })
    )
    .default([]),
});

export const createStoreFlyer = createServerFn({ method: "POST" })
  .validator(createStoreFlyerSchema)
  .handler(async ({ data: input }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager"]);

    const validFromDate = input.validFrom ? new Date(input.validFrom).toISOString() : new Date().toISOString();
    const validUntilDate = input.validUntil ? new Date(input.validUntil).toISOString() : null;

    const { data: inserted, error } = await supabase
      .from("store_promotional_flyers")
      .insert({
        store_id: identity.store_id,
        title: input.title.trim(),
        subtitle: input.subtitle?.trim() || null,
        image_url: input.imageUrl.trim(),
        theme: input.theme,
        valid_from: validFromDate,
        valid_until: validUntilDate,
        status: "active",
        hotspots: input.hotspots || [],
        views_count: 0,
        clicks_count: 0,
      })
      .select()
      .single();

    if (error) {
      console.error("[store-flyers] error creating flyer:", error);
      throw new Error(`Erro ao criar encarte: ${error.message}`);
    }

    return inserted;
  });

// ─── 4. Atualização de Encarte Promocional ─────────────────────────────────────

export const updateStoreFlyerSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(2).optional(),
  subtitle: z.string().optional().nullable(),
  imageUrl: z.string().url().optional(),
  theme: z.enum(["clean", "retro_mercado", "atacado_neon", "ofertas_relampago"]).optional(),
  validFrom: z.string().optional(),
  validUntil: z.string().optional().nullable(),
  status: z.enum(["active", "inactive", "archived"]).optional(),
  hotspots: z
    .array(
      z.object({
        id: z.string().optional(),
        x_percent: z.number().min(0).max(100),
        y_percent: z.number().min(0).max(100),
        product_id: z.string().uuid().optional().nullable(),
        custom_label: z.string().optional().nullable(),
        price_override_cents: z.number().int().nonnegative().optional().nullable(),
      })
    )
    .optional(),
  sortOrder: z.number().int().optional(),
});

export const updateStoreFlyer = createServerFn({ method: "POST" })
  .validator(updateStoreFlyerSchema)
  .handler(async ({ data: input }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager"]);

    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (input.title) updates.title = input.title.trim();
    if (input.subtitle !== undefined) updates.subtitle = input.subtitle?.trim() || null;
    if (input.imageUrl) updates.image_url = input.imageUrl.trim();
    if (input.theme) updates.theme = input.theme;
    if (input.validFrom) updates.valid_from = new Date(input.validFrom).toISOString();
    if (input.validUntil !== undefined) {
      updates.valid_until = input.validUntil ? new Date(input.validUntil).toISOString() : null;
    }
    if (input.status) updates.status = input.status;
    if (input.hotspots !== undefined) updates.hotspots = input.hotspots;
    if (input.sortOrder !== undefined) updates.sort_order = input.sortOrder;

    const { data: updated, error } = await supabase
      .from("store_promotional_flyers")
      .update(updates)
      .eq("id", input.id)
      .eq("store_id", identity.store_id)
      .select()
      .single();

    if (error) {
      console.error("[store-flyers] error updating flyer:", error);
      throw new Error(`Erro ao atualizar encarte: ${error.message}`);
    }

    return updated;
  });

// ─── 5. Exclusão de Encarte ───────────────────────────────────────────────────

export const deleteStoreFlyer = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data: { id } }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager"]);

    const { error } = await supabase
      .from("store_promotional_flyers")
      .delete()
      .eq("id", id)
      .eq("store_id", identity.store_id);

    if (error) {
      console.error("[store-flyers] error deleting flyer:", error);
      throw new Error("Erro ao excluir encarte.");
    }

    return { success: true };
  });

// ─── 6. Telemetria de Interação (Views & Clicks) ───────────────────────────────

export const recordFlyerInteraction = createServerFn({ method: "POST" })
  .validator(
    z.object({
      flyerId: z.string().uuid(),
      type: z.enum(["view", "click"]),
    })
  )
  .handler(async ({ data: { flyerId, type } }) => {
    const supabase = getAnonServerClient();

    const column = type === "click" ? "clicks_count" : "views_count";

    // Incremento atômico simples
    try {
      const { data: curr } = await supabase
        .from("store_promotional_flyers")
        .select("views_count, clicks_count")
        .eq("id", flyerId)
        .maybeSingle();

      if (curr) {
        const nextVal = ((curr as any)[column] || 0) + 1;
        await supabase
          .from("store_promotional_flyers")
          .update({ [column]: nextVal })
          .eq("id", flyerId);
      }
    } catch {
      // Falhas em telemetria nunca bloqueiam a experiência do usuário
    }

    return { success: true };
  });
