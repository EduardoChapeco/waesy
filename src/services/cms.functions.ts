/**
 * CMS server functions Commerce
 *
 * BFF boundary for Pages and Sections management.
 */

import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/start-server-core";
import { z } from "zod";

import { getServerClient, SupabaseUnconfiguredError } from "@/lib/supabase";
import { applyServerFnEdgeCache, CACHE_TAGS } from "@/lib/cache/edge-cache";

// ---------------------------------------------------------------------------
// Admin CRUD
// ---------------------------------------------------------------------------

async function _listAdminPages() {
  const { authorizeBuilderStoreContext } = await import("@/lib/server-access");
  const authCtx = await authorizeBuilderStoreContext({ allowPlatformRootForGlobalAdmin: true });

  const db = getServerClient();
  const { data, error } = await db
    .from("pages")
    .select("id, title, slug, status, created_at, updated_at")
    .eq("store_id", authCtx.storeId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export const listAdminPages = createServerFn({ method: "GET" }).handler(async () => {
 try {
 const data = await _listAdminPages();
 return data;
 } catch (e) {
 if (e instanceof SupabaseUnconfiguredError) throw e;
 console.error("[cms.functions] listAdminPages error:", e);
 throw new Error(e instanceof Error ? e.message : "Erro ao listar páginas.");
 }
});

export const getAdminPageDetails = createServerFn({ method: "GET" })
 .validator(z.object({ id: z.string().uuid() }))
 .handler(async ({ data: input }) => {
 try {
 const { authorizeBuilderStoreContext } = await import("@/lib/server-access");
 const authCtx = await authorizeBuilderStoreContext({ allowPlatformRootForGlobalAdmin: true });

 const db = getServerClient();

 const { data: page, error: pageError } = await db
 .from("pages")
 .select("*")
 .eq("id", input.id)
 .eq("store_id", authCtx.storeId)
 .single();

 if (pageError) throw pageError;

 const { data: sections, error: sectionsError } = await db
 .from("page_sections")
 .select("*")
 .eq("page_id", input.id)
 .order("sort_order", { ascending: true });

 if (sectionsError) throw sectionsError;

 return { status: "ok" as const, data: { ...page, sections } };
 } catch (e) {
 if (e instanceof SupabaseUnconfiguredError) throw e;
 console.error("[cms.functions] getAdminPageDetails error:", e);
 throw new Error(e instanceof Error ? e.message : "Erro ao carregar detalhes da página.");
 }
 });

export const createPage = createServerFn({ method: "POST" })
 .validator(
 z.object({
 title: z.string().min(1).max(200),
 slug: z.string().regex(/^[a-z0-9-]+$/),
 status: z.enum(["draft", "published", "archived"]).default("draft"),
 seo_title: z.string().optional().nullable(),
 seo_description: z.string().optional().nullable(),
 }),
 )
 .handler(async ({ data: input }) => {
 try {
 const db = getServerClient();
 const { authorizeBuilderStoreContext } = await import("@/lib/server-access");
 const authCtx = await authorizeBuilderStoreContext({ allowPlatformRootForGlobalAdmin: true });

 const { data, error } = await db
 .from("pages")
 .insert({
 store_id: authCtx.storeId,
 title: input.title,
 slug: input.slug,
 status: input.status,
 seo_title: input.seo_title,
 seo_description: input.seo_description,
 })
 .select()
 .single();

 if (error) throw error;
 return data;
 } catch (e: unknown) {
 console.error("[cms.functions] createPage error:", e);
 throw new Error(e instanceof Error ? e.message : "Erro.");
 }
 });

export const deletePage = createServerFn({ method: "POST" })
 .validator(z.object({ id: z.string().uuid() }))
 .handler(async ({ data: input }) => {
 try {
 const db = getServerClient();
 const { authorizeBuilderStoreContext } = await import("@/lib/server-access");
 const authCtx = await authorizeBuilderStoreContext({ allowPlatformRootForGlobalAdmin: true });

 const { data: existingPage, error: pageLookupErr } = await db
 .from("pages")
 .select("id, store_id")
 .eq("id", input.id)
 .eq("store_id", authCtx.storeId)
 .maybeSingle();

 if (pageLookupErr) throw pageLookupErr;
 if (!existingPage) {
 throw new Error("Forbidden: Página não encontrada ou pertence a outra empresa.");
 }

 // First delete associated sections
 await db.from("page_sections").delete().eq("page_id", existingPage.id);

 // Then delete page
 const { error } = await db
 .from("pages")
 .delete()
 .eq("id", existingPage.id)
 .eq("store_id", authCtx.storeId);
 if (error) throw error;

 return { status: "success" as const };
 } catch (e: unknown) {
 console.error("[cms.functions] deletePage error:", e);
 throw new Error(e instanceof Error ? e.message : "Erro ao excluir página.");
 }
 });

export const savePageSections = createServerFn({ method: "POST" })
 .validator(
 z.object({
 pageId: z.string().uuid(),
 sections: z.array(
 z.object({
 id: z.string().uuid().optional(),
 section_type: z.string(),
 content: z.record(z.unknown()),
 sort_order: z.number().int(),
 }),
 ),
 }),
 )
 .handler(async ({ data: input }) => {
 try {
 const db = getServerClient();
 const { authorizeBuilderStoreContext } = await import("@/lib/server-access");
 const authCtx = await authorizeBuilderStoreContext({ allowPlatformRootForGlobalAdmin: true });

 const { data: ownerPage, error: ownerErr } = await db
 .from("pages")
 .select("id, store_id")
 .eq("id", input.pageId)
 .eq("store_id", authCtx.storeId)
 .maybeSingle();

 if (ownerErr) throw ownerErr;
 if (!ownerPage) {
 throw new Error("Forbidden: Página não encontrada ou pertence a outra empresa.");
 }

 // Delete existing sections not in the payload
 const sectionIds = input.sections.map((s) => s.id).filter(Boolean);
 let deleteQuery = db.from("page_sections").delete().eq("page_id", ownerPage.id);
 if (sectionIds.length > 0) {
 deleteQuery = deleteQuery.not("id", "in", `(${sectionIds.join(",")})`);
 }
 await deleteQuery;

 // Upsert sections
 for (const section of input.sections) {
 const payload = {
 page_id: ownerPage.id,
 section_type: section.section_type,
 content: section.content,
 sort_order: section.sort_order,
 };

 if (section.id) {
 await db
 .from("page_sections")
 .update(payload)
 .eq("id", section.id)
 .eq("page_id", ownerPage.id);
 } else {
 await db.from("page_sections").insert(payload);
 }
 }

 return { status: "success" as const };
 } catch (e: unknown) {
 console.error("[cms.functions] savePageSections error:", e);
 throw new Error(e instanceof Error ? e.message : "Erro ao salvar seções.");
 }
 });

// ---------------------------------------------------------------------------
// Storefront Read (Public)
// ---------------------------------------------------------------------------

export const getPublicPageBySlug = createServerFn({ method: "GET" })
 .validator(z.object({ slug: z.string() }))
 .handler(async ({ data: input }) => {
 try {
 const db = getServerClient();

 const { resolveTenantStoreId } = await import("@/lib/tenant.server");
 const storeId = await resolveTenantStoreId();
 const storeData = storeId ? { id: storeId } : null;
 if (!storeData) return { status: "unconfigured" as const, reason: "Sem loja configurada" };

 const { data: page, error: pageError } = await db
 .from("pages")
 .select("id, title, seo_title, seo_description")
 .eq("store_id", storeData.id)
 .eq("slug", input.slug)
 .eq("status", "published")
 .single();

 if (pageError || !page) return { status: "not_found" as const };

 const { data: sections, error: sectionsError } = await db
 .from("page_sections")
 .select("id, section_type, content, sort_order")
 .eq("page_id", page.id)
 .order("sort_order", { ascending: true });

 if (sectionsError) throw sectionsError;

 return { status: "ok" as const, data: { ...page, sections } };
 } catch (e) {
 if (e instanceof SupabaseUnconfiguredError)
 return {
 status: "unconfigured" as const,
 reason: "Este conteúdo institucional está sendo atualizado.",
 };
 console.error("[cms.functions] getPublicPageBySlug error:", e);
 throw new Error("Erro inesperado ao carregar página.");
 }
 });

export const getPublicStoreSettings = createServerFn({ method: "GET" }).handler(async () => {
 try {
 const { resolveTenantStoreId } = await import("@/lib/tenant.server");
 const storeId = await resolveTenantStoreId();
 const db = getServerClient();

 let store: any = null;

 if (storeId) {
 const { data, error } = await db
 .from("stores")
 .select(
 "id, name, slug, email, phone, cnpj, address, city, state, zip_code, description, seo_title, seo_description, seo_keywords, logo_url, banner_url, settings",
 )
 .eq("id", storeId)
 .maybeSingle();

 if (!error && data) {
 const stSettings = (data.settings as Record<string, any>) || {};
 store = {
 ...data,
 type: stSettings.type || stSettings.segment || stSettings.niche || "general",
 };
 }
 }

 // Se não há store de tenant (ex: navegando na Home/SuperApp), resolve a loja matriz da plataforma
 if (!store) {
 const { resolvePlatformRootStore } = await import("@/services/master.functions");
 store = await resolvePlatformRootStore(db);
 }

 if (!store) return { status: "not_found" as const };

 const settings = (store.settings as Record<string, any>) || {};
 const logoUrl = settings.logoUrl || settings.logo_url || null;
 const faviconUrl = settings.faviconUrl || settings.favicon_url || null;

 applyServerFnEdgeCache(
 setResponseHeader,
 "PUBLIC_STATIC",
 [CACHE_TAGS.store(store.id), CACHE_TAGS.theme(store.id)],
 );

 return { status: "ok" as const, data: { ...store, logoUrl, faviconUrl } };
 } catch (err) {
 console.error("[cms.functions] getPublicStoreSettings error:", err);
 throw new Error("Erro ao carregar dados da loja.");
 }
});

// ---------------------------------------------------------------------------
// Theme Settings
// ---------------------------------------------------------------------------

export const getThemeSettings = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const db = getServerClient();

    const { resolveTenantStoreId } = await import("@/lib/tenant.server");
    let storeId = await resolveTenantStoreId();

    if (!storeId) {
      const { resolvePlatformRootStore } = await import("@/services/master.functions");
      const rootStore = await resolvePlatformRootStore(db);
      storeId = rootStore?.id || null;
    }

    if (!storeId) return null;

    const { data, error } = await db
      .from("theme_settings")
      .select("*")
      .eq("store_id", storeId)
      .maybeSingle();

    if (error && error.code !== "PGRST116") throw error; // PGRST116 is not found

    if (!data) {
      // Sem efeito colateral de INSERT em GET público não autenticado
      return {
        store_id: storeId,
        // design-lint-ignore DL-01 reason:"Valores de fallback do schema de branding para loja virgem" expiry:"2027-12-31"
        primary_color: "#2563EB",
        // design-lint-ignore DL-01 reason:"Valores de fallback do schema de branding para loja virgem" expiry:"2027-12-31"
        background_color: "#FFFFFF",
        // design-lint-ignore DL-01 reason:"Valores de fallback do schema de branding para loja virgem" expiry:"2027-12-31"
        text_color: "#09090B",
        font_heading: "Plus Jakarta Sans",
        font_body: "Inter",
        border_radius: "0.75rem",
        logo_url: null,
        favicon_url: null,
      };
    }

    return data;
  } catch (e) {
    if (e instanceof SupabaseUnconfiguredError) return null;
    console.warn("[cms.functions] getThemeSettings fallback:", e instanceof Error ? e.message : e);
    return null;
  }
});

export const updateThemeSettings = createServerFn({ method: "POST" })
 .validator(
 z.object({
 primary_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
 background_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
 text_color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
 font_heading: z.string().min(1),
 font_body: z.string().min(1),
 border_radius: z.string().min(1),
 logo_url: z.string().url().optional().nullable(),
 favicon_url: z.string().url().optional().nullable(),
 }),
 )
 .handler(async ({ data: input }) => {
 try {
 const db = getServerClient();
 const { authorizeBuilderStoreContext } = await import("@/lib/server-access");
 const authCtx = await authorizeBuilderStoreContext({ allowPlatformRootForGlobalAdmin: true });

 const { data: existing } = await db
 .from("theme_settings")
 .select("id")
 .eq("store_id", authCtx.storeId)
 .maybeSingle();

 const result = existing?.id
 ? await db
 .from("theme_settings")
 .update(input)
 .eq("store_id", authCtx.storeId)
 .select()
 .single()
 : await db
 .from("theme_settings")
 .insert({ store_id: authCtx.storeId, ...input })
 .select()
 .single();

 if (result.error) throw result.error;
 return result.data;
 } catch (e: unknown) {
 console.error("[cms.functions] updateThemeSettings error:", e);
 throw new Error(e instanceof Error ? e.message : "Erro ao atualizar tema.");
 }
 });

// ---------------------------------------------------------------------------
// Navigation Menus
// ---------------------------------------------------------------------------

export const CANONICAL_PLATFORM_MENUS = [
  {
    id: "canonical-menu-bottom_nav",
    handle: "bottom_nav",
    name: "Menu Mobile Inferior (5 Abas Principais)",
    items: [
      { id: "nav-mob-1", label: "Chat", url: "/conta/conversas", icon: "MessageCircle", image_url: "", badge_text: "", bg_color: "", text_color: "", is_active: true },
      { id: "nav-mob-2", label: "Feed", url: "/feed", icon: "Flame", image_url: "", badge_text: "", bg_color: "", text_color: "", is_active: true },
      { id: "nav-mob-3", label: "Explorar", url: "/explorar", icon: "Compass", image_url: "", badge_text: "", bg_color: "", text_color: "", is_active: true },
      { id: "nav-mob-4", label: "Compras", url: "/conta/pedidos", icon: "ShoppingBag", image_url: "", badge_text: "", bg_color: "", text_color: "", is_active: true },
      { id: "nav-mob-5", label: "Perfil", url: "/conta/perfil", action: "profile", icon: "User", image_url: "", badge_text: "", bg_color: "", text_color: "", is_active: true },
    ],
  },
  {
    id: "canonical-menu-header_nav",
    handle: "header_nav",
    name: "Menu Cabeçalho Global (Topo & Sub-Header)",
    items: [
      { id: "nav-hdr-1", label: "Início", url: "/", icon: "Home", image_url: "", badge_text: "", is_active: true },
      { id: "nav-hdr-2", label: "Gastronomia", url: "/gastronomia", icon: "Utensils", image_url: "", badge_text: "", is_active: true },
      { id: "nav-hdr-3", label: "Mercados", url: "/mercado", icon: "ShoppingCart", image_url: "", badge_text: "", is_active: true },
      { id: "nav-hdr-4", label: "Turismo", url: "/turismo", icon: "Plane", image_url: "", badge_text: "", is_active: true },
      { id: "nav-hdr-5", label: "Classificados", url: "/classificados", icon: "Tag", image_url: "", badge_text: "", is_active: true },
      { id: "nav-hdr-6", label: "Lugares", url: "/diretorio", icon: "MapPin", image_url: "", badge_text: "", is_active: true },
    ],
  },
  {
    id: "canonical-menu-explore_menu",
    handle: "explore_menu",
    name: "Menu de Atalhos da Página Explorar (/explorar)",
    items: [
      { id: "nav-exp-1", label: "Ofertas Relâmpago", url: "/ofertas", icon: "Zap", image_url: "", badge_text: "OFERTAS", is_active: true },
      { id: "nav-exp-2", label: "Mobilidade MotoLink", url: "/mobilidade", icon: "Car", image_url: "", badge_text: "R$ 0,99", is_active: true },
      { id: "nav-exp-3", label: "Eventos & Ingressos", url: "/eventos", icon: "Calendar", image_url: "", badge_text: "", is_active: true },
      { id: "nav-exp-4", label: "Vagas de Emprego", url: "/empregos", icon: "Briefcase", image_url: "", badge_text: "", is_active: true },
    ],
  },
];

export const getNavigationMenus = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const db = getServerClient();

    const { resolveTenantStoreId } = await import("@/lib/tenant.server");
    let storeId = await resolveTenantStoreId();

    if (!storeId) {
      const { resolvePlatformRootStore } = await import("@/services/master.functions");
      const rootStore = await resolvePlatformRootStore(db);
      storeId = rootStore?.id || null;
    }

    if (!storeId) return CANONICAL_PLATFORM_MENUS;

    const { data, error } = await db
      .from("navigation_menus")
      .select("*")
      .eq("store_id", storeId)
      .order("handle", { ascending: true });

    if (error) {
      console.warn("[cms.functions] getNavigationMenus query error:", error);
      return CANONICAL_PLATFORM_MENUS;
    }

    const dbMenus = Array.isArray(data) ? [...data] : [];
    for (const canonical of CANONICAL_PLATFORM_MENUS) {
      if (!dbMenus.some((m: any) => m.handle === canonical.handle)) {
        dbMenus.push({
          ...canonical,
          store_id: storeId,
        });
      }
    }
    return dbMenus;
  } catch (e) {
    if (e instanceof SupabaseUnconfiguredError) return CANONICAL_PLATFORM_MENUS;
    console.warn("[cms.functions] getNavigationMenus fallback:", e instanceof Error ? e.message : e);
    return CANONICAL_PLATFORM_MENUS;
  }
});

export const upsertNavigationMenu = createServerFn({ method: "POST" })
 .validator(
 z.object({
 id: z.string().optional(),
 handle: z.string().regex(/^[a-z0-9_-]+$/i),
 name: z.string().min(1),
 items: z.array(z.any()), // array of link objects
 }),
 )
 .handler(async ({ data: input }) => {
 try {
 const db = getServerClient();
 const { authorizeBuilderStoreContext } = await import("@/lib/server-access");
 const authCtx = await authorizeBuilderStoreContext({ allowPlatformRootForGlobalAdmin: true });
 const storeId = authCtx.storeId;

 const normalizedHandle = input.handle.trim().toLowerCase();
 const payload = {
 store_id: storeId,
 handle: normalizedHandle,
 name: input.name,
 items: input.items,
 };

 const query = db.from("navigation_menus");
 let result;

 if (input.id && !input.id.startsWith("canonical-")) {
 result = await query
 .update(payload)
 .eq("id", input.id)
 .eq("store_id", storeId)
 .select()
 .single();
 } else {
 const { data: existingMenu } = await db
  .from("navigation_menus")
  .select("id")
  .eq("store_id", storeId)
  .eq("handle", normalizedHandle)
  .maybeSingle();

 if (existingMenu?.id) {
  result = await query
  .update(payload)
  .eq("id", existingMenu.id)
  .eq("store_id", storeId)
  .select()
  .single();
 } else {
  result = await query.insert(payload).select().single();
 }
 }

 if (result.error) throw result.error;
 return result.data;
 } catch (e: unknown) {
 console.error("[cms.functions] upsertNavigationMenu error:", e);
 throw new Error(e instanceof Error ? e.message : "Erro ao salvar menu de navegação.");
 }
 });

// ---------------------------------------------------------------------------
// Reviews (Avaliações)
// ---------------------------------------------------------------------------

export const listReviews = createServerFn({ method: "GET" }).handler(async () => {
 try {
 const db = getServerClient();

 const { authorizeBuilderStoreContext } = await import("@/lib/server-access");
 const authCtx = await authorizeBuilderStoreContext();

 // Join with products and users to get display names
 const { data, error } = await db
 .from("reviews")
 .select(
 `
 id, rating, comment, status, created_at,
 products (title),
 users:user_id (id)
 `,
 )
 .eq("store_id", authCtx.storeId)
 .order("created_at", { ascending: false });

 if (error) throw error;
 return data;
 } catch (e) {
 if (e instanceof SupabaseUnconfiguredError) throw e;
 console.error("[cms.functions] listReviews error:", e);
 throw new Error(e instanceof Error ? e.message : "Erro ao listar avaliações.");
 }
});

export const updateReviewStatus = createServerFn({ method: "POST" })
 .validator(
 z.object({
 id: z.string().uuid(),
 status: z.enum(["pending", "approved", "rejected"]),
 }),
 )
 .handler(async ({ data: input }) => {
 try {
 const db = getServerClient();

 const { authorizeBuilderStoreContext } = await import("@/lib/server-access");
 const authCtx = await authorizeBuilderStoreContext();

 const { data, error } = await db
 .from("reviews")
 .update({ status: input.status })
 .eq("id", input.id)
 .eq("store_id", authCtx.storeId)
 .select()
 .single();

 if (error) throw error;
 return data;
 } catch (e: unknown) {
 console.error("[cms.functions] updateReviewStatus error:", e);
 throw new Error(e instanceof Error ? e.message : "Erro ao atualizar avaliação.");
 }
 });

export const createProductReview = createServerFn({ method: "POST" })
 .validator(
 z.object({
 productId: z.string().uuid(),
 rating: z.number().int().min(1).max(5),
 comment: z.string().min(2).max(1000),
 }),
 )
 .handler(async ({ data: input }) => {
 try {
 const db = getServerClient();
 const { getSSRClient } = await import("@/lib/server-access");
 const ssrClient = await getSSRClient();
 const {
 data: { user },
 error: authError,
 } = await ssrClient.auth.getUser();
 if (authError || !user) {
 throw new Error("Você precisa estar logado para fazer uma avaliação.");
 }

 const { data: prod, error: prodError } = await db
 .from("products")
 .select("store_id")
 .eq("id", input.productId)
 .single();
 if (prodError || !prod) throw new Error("Produto não encontrado.");

 const { data, error } = await db
 .from("reviews")
 .insert({
 store_id: prod.store_id,
 product_id: input.productId,
 user_id: user.id,
 rating: input.rating,
 comment: input.comment,
 status: "approved",
 })
 .select()
 .single();

 if (error) throw error;
 return data;
 } catch (e: unknown) {
 console.error(
 "[cms.functions] createProductReview error:",
 (e instanceof Error ? e.message : String(e)) || e,
 );
 throw new Error((e instanceof Error ? e.message : String(e)) || "Erro ao enviar avaliação.");
 }
 });

// ---------------------------------------------------------------------------
// Link-in-Bio
// ---------------------------------------------------------------------------

export const getLinkInBio = createServerFn({ method: "GET" })
  .validator((d: { slug?: string } | undefined) => d)
  .handler(async ({ data }) => {
    try {
      const db = getServerClient();
      let storeId: string | null = null;

      if (data?.slug) {
        const { data: storeRow } = await db
          .from("stores")
          .select("id")
          .eq("slug", data.slug)
          .maybeSingle();
        if (storeRow?.id) {
          storeId = storeRow.id;
        }
      }

      if (!storeId) {
        const { resolveTenantStoreId } = await import("@/lib/tenant.server");
        storeId = await resolveTenantStoreId();
      }

      if (!storeId) {
        const { resolvePlatformRootStore } = await import("@/services/master.functions");
        const rootStore = await resolvePlatformRootStore(db);
        storeId = rootStore?.id || null;
      }

      if (!storeId) return null;

      const { data: bioData, error } = await db
        .from("link_in_bio")
        .select("*")
        .eq("store_id", storeId)
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error; // PGRST116 is not found

      if (!bioData) {
        // Sem INSERT em GET público não autenticado
        return {
          store_id: storeId,
          title: "",
          description: null,
          avatar_url: null,
          links: [],
          theme: "default",
          socials: {},
        };
      }

      return bioData;
    } catch (e) {
      if (e instanceof SupabaseUnconfiguredError) return null;
      console.warn("[cms.functions] getLinkInBio fallback:", e instanceof Error ? e.message : e);
      return null;
    }
  });

export const upsertLinkInBio = createServerFn({ method: "POST" })
 .validator(
 z.object({
 title: z.string().min(1).max(200),
 description: z.string().optional().nullable(),
 avatar_url: z.string().optional().nullable(),
 links: z.array(z.any()), // array of link objects
 theme: z.string().optional().nullable(),
 socials: z.record(z.string()).optional().nullable(),
 }),
 )
 .handler(async ({ data: input }) => {
 try {
 const db = getServerClient();

 const { authorizeBuilderStoreContext } = await import("@/lib/server-access");
 const authCtx = await authorizeBuilderStoreContext({ allowPlatformRootForGlobalAdmin: true });

 const { data: existing } = await db
 .from("link_in_bio")
 .select("id")
 .eq("store_id", authCtx.storeId)
 .maybeSingle();

 const result = existing?.id
 ? await db
 .from("link_in_bio")
 .update(input)
 .eq("store_id", authCtx.storeId)
 .select()
 .single()
 : await db
 .from("link_in_bio")
 .insert({ store_id: authCtx.storeId, ...input })
 .select()
 .single();

 if (result.error) throw result.error;
 return result.data;
 } catch (e: unknown) {
 console.error("[cms.functions] upsertLinkInBio error:", e);
 throw new Error(e instanceof Error ? e.message : "Erro ao atualizar Link da Bio.");
 }
 });

// ---------------------------------------------------------------------------
// Stories
// ---------------------------------------------------------------------------

export const listAdminStories = createServerFn({ method: "GET" }).handler(async () => {
 try {
 const db = getServerClient();

 const { authorizeBuilderStoreContext } = await import("@/lib/server-access");
 const authCtx = await authorizeBuilderStoreContext({ allowPlatformRootForGlobalAdmin: true });

 const { data, error } = await db
 .from("stories")
 .select("*")
 .eq("store_id", authCtx.storeId)
 .order("sort_order", { ascending: true });

 if (error) throw error;
 return data;
 } catch (e) {
 if (e instanceof SupabaseUnconfiguredError) throw e;
 console.error("[cms.functions] listAdminStories error:", e);
 throw new Error(e instanceof Error ? e.message : "Erro ao listar stories.");
 }
});

export const upsertStory = createServerFn({ method: "POST" })
 .validator(
 z.object({
 id: z.string().uuid().optional(),
 media_url: z.string().url(),
 link_url: z.string().optional().nullable(),
 status: z.enum(["active", "inactive", "archived"]).default("active"),
 sort_order: z.number().int().default(0),
 }),
 )
 .handler(async ({ data: input }) => {
 try {
 const db = getServerClient();

 const { authorizeBuilderStoreContext } = await import("@/lib/server-access");
 const authCtx = await authorizeBuilderStoreContext({ allowPlatformRootForGlobalAdmin: true });

 const payload = {
 store_id: authCtx.storeId,
 media_url: input.media_url,
 link_url: input.link_url,
 status: input.status,
 sort_order: input.sort_order,
 };

 const query = db.from("stories");
 let result;

 if (input.id) {
 result = await query
 .update(payload)
 .eq("id", input.id)
 .eq("store_id", authCtx.storeId)
 .select()
 .single();
 } else {
 result = await query.insert(payload).select().single();
 }

 if (result.error) throw result.error;
 return result.data;
 } catch (e: unknown) {
 console.error("[cms.functions] upsertStory error:", e);
 throw new Error(e instanceof Error ? e.message : "Erro ao salvar story.");
 }
 });

export const deleteStory = createServerFn({ method: "POST" })
 .validator(z.object({ id: z.string().uuid() }))
 .handler(async ({ data: { id } }) => {
 try {
 const db = getServerClient();

 const { authorizeBuilderStoreContext } = await import("@/lib/server-access");
 const authCtx = await authorizeBuilderStoreContext({ allowPlatformRootForGlobalAdmin: true });

 const { error } = await db.from("stories").delete().eq("id", id).eq("store_id", authCtx.storeId);

 if (error) throw error;

 return { status: "success" as const };
 } catch (e: unknown) {
 console.error("[cms.functions] deleteStory error:", e);
 throw new Error(e instanceof Error ? e.message : "Erro ao excluir story.");
 }
 });

export const listPublicStories = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const db = getServerClient();

    const { resolveTenantStoreId } = await import("@/lib/tenant.server");
    let storeId = await resolveTenantStoreId();

    if (!storeId) {
      const { resolvePlatformRootStore } = await import("@/services/master.functions");
      const rootStore = await resolvePlatformRootStore(db);
      storeId = rootStore?.id || null;
    }

    if (!storeId) return [];

    const { data, error } = await db
      .from("stories")
      .select("*")
      .eq("store_id", storeId)
      .eq("status", "active")
      .order("sort_order", { ascending: true });

    if (error) {
      console.warn("[cms.functions] listPublicStories query error:", error);
      return [];
    }
    return data || [];
  } catch (e) {
    if (e instanceof SupabaseUnconfiguredError) return [];
    console.warn("[cms.functions] listPublicStories fallback:", e instanceof Error ? e.message : e);
    return [];
  }
});

export const getPageBySlug = createServerFn({ method: "GET" })
 .validator(z.object({ slug: z.string() }))
 .handler(async ({ data: { slug } }) => {
 try {
 const db = getServerClient();

 // Get the first store id
 const { resolveTenantStoreId } = await import("@/lib/tenant.server");
 const storeId = await resolveTenantStoreId();
 const store = storeId ? { id: storeId } : null;
 if (!store) throw new Error("Loja não encontrada.");

 const { data: page, error } = await db
 .from("pages")
 .select(
 `
 id, title, slug, seo_title, seo_description, updated_at,
 sections:page_sections(
 id, section_type, content, sort_order
 )
 `,
 )
 .eq("store_id", store.id)
 .eq("slug", slug)
 .eq("status", "published")
 .single();

 if (error) {
 if (error.code === "PGRST116") return { status: "not_found" as const };
 throw error;
 }

 return page;
 } catch (e: unknown) {
 console.error("[cms.functions] getPageBySlug error:", e);
 throw new Error("Erro ao carregar página.");
 }
 });
export const createReview = createServerFn({ method: "POST" })
 .validator(
 z.object({
 productId: z.string().uuid(),
 orderId: z.string().uuid().optional(),
 rating: z.number().min(1).max(5),
 comment: z.string().max(1000).optional(),
 }),
 )
  .handler(async ({ data: { productId, orderId, rating, comment } }) => {
    try {
      const { getSSRClient } = await import("@/lib/server-access");
      const ssrClient = await getSSRClient();
 const {
 data: { user },
 } = await ssrClient.auth.getUser();
 if (!user) throw new Error("Você precisa estar autenticado como cliente para avaliar.");

 const { data: product } = await ssrClient
 .from("products")
 .select("id, store_id, title")
 .eq("id", productId)
 .single();
 if (!product) throw new Error("Produto não encontrado.");

 // 1. Valida se o cliente possui pedido entregue contendo este produto
 let deliveredQuery = ssrClient
 .from("order_items")
 .select("id, orders!inner(id, status, customer_id), product_variants!inner(product_id)")
 .eq("product_variants.product_id", productId)
 .eq("orders.status", "delivered")
 .eq("orders.customer_id", user.id);

 if (orderId) {
 deliveredQuery = deliveredQuery.eq("orders.id", orderId);
 }

 const { data: purchaseItems, error: purchaseError } = await deliveredQuery;

 if (purchaseError || !purchaseItems || purchaseItems.length === 0) {
 throw new Error(
 "Você só pode avaliar produtos que já comprou e teve o pedido entregue com sucesso.",
 );
 }

 // 2. Limite estrito de 1 avaliação por compra realizada (pedidos entregues)
 const { data: allPurchases } = await ssrClient
 .from("order_items")
 .select("orders!inner(id)")
 .eq("product_variants.product_id", productId)
 .eq("orders.status", "delivered")
 .eq("orders.customer_id", user.id);

 const totalDeliveredOrders = new Set(allPurchases?.map((p: any) => Array.isArray(p.orders) ? p.orders[0]?.id : p.orders?.id)).size || 1;

 const { count: existingReviewsCount } = await ssrClient
 .from("reviews")
 .select("id", { count: "exact", head: true })
 .eq("product_id", productId)
 .eq("user_id", user.id);

 if ((existingReviewsCount || 0) >= totalDeliveredOrders) {
 throw new Error(
 "Você já avaliou este produto para todas as suas compras entregues. Realize uma nova compra para avaliar novamente.",
 );
 }

 // 3. Obtém nome do cliente para enriquecer a exibição pública de compra verificada
 const { data: profile } = await ssrClient
 .from("profiles")
 .select("full_name")
 .eq("id", user.id)
 .maybeSingle();

 const reviewerName = profile?.full_name || "Comprador Verificado";

 const { error: insertError } = await ssrClient.from("reviews").insert({
 store_id: product.store_id,
 product_id: productId,
 user_id: user.id,
 rating,
 comment: comment?.trim() || null,
 status: "approved",
 reviewer_name: reviewerName,
 });

 if (insertError) {
 console.error("[cms.functions] insert review error:", insertError);
 throw new Error("Falha ao registrar avaliação: " + insertError.message);
 }

 return { status: "success" as const };
 } catch (e) {
 console.error("[cms.functions] createReview error:", e);
 throw new Error((e instanceof Error ? e.message : String(e)) || "Erro ao enviar avaliação.");
 }
 });

export const listCustomerReviews = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const { getSSRClient } = await import("@/lib/server-access");
    const ssrClient = await getSSRClient();
 const {
 data: { user },
 } = await ssrClient.auth.getUser();
 if (!user) return [];

 const { resolveTenantStoreId } = await import("@/lib/tenant.server");
 const storeId = await resolveTenantStoreId();
 if (!storeId) return [];

 const { data, error } = await ssrClient
 .from("reviews")
 .select(
 "id, rating, comment, status, created_at, products!reviews_product_id_fkey(title, slug)",
 )
 .eq("user_id", user.id)
 .eq("store_id", storeId)
 .order("created_at", { ascending: false });

 if (error) {
 console.warn("[cms.functions] listCustomerReviews query warning:", error);
 return [];
 }

 return (data || []).map((r: any) => ({
 id: r.id as string,
 rating: r.rating as number,
 comment: r.comment as string | null,
 status: r.status as string,
 createdAt: r.created_at as string,
 productName: r.products?.title as string | null,
 productSlug: r.products?.slug as string | null,
 }));
 } catch (e: unknown) {
 console.warn("[cms.functions] listCustomerReviews fallback:", e);
 return [];
 }
});

/**
 * Retorna avaliações aprovadas de uma loja para exibição pública em seu perfil comercial
 */
export const listStorePublicReviews = createServerFn({ method: "GET" })
  .validator(z.object({ storeId: z.string() }))
  .handler(async ({ data: { storeId } }) => {
    try {
      const db = getServerClient();
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(storeId);
      let targetUuid = storeId;

      if (!isUuid) {
        const { data: st } = await db.from("stores").select("id").eq("slug", storeId).maybeSingle();
        if (!st?.id) return [];
        targetUuid = st.id;
      }

      const { data, error } = await db
        .from("reviews")
        .select("id, rating, comment, created_at, products(title)")
        .eq("store_id", targetUuid)
        .eq("status", "approved")
        .order("created_at", { ascending: false })
        .limit(30);

      if (error) {
        console.warn("[cms.functions] listStorePublicReviews error:", error);
        return [];
      }
      return (data || []).map((r: any) => ({
        id: r.id,
        rating: typeof r.rating === "number" ? r.rating : 0,
        comment: r.comment || "",
        created_at: r.created_at,
        product_name: r.products?.title || null,
      }));
    } catch {
      return [];
    }
  });

/**
 * Conecta um domínio personalizado real à vitrine da empresa com verificação de unicidade multi-tenant
 */
export const connectStoreCustomDomain = createServerFn({ method: "POST" })
  .validator(
    z.object({
      domain: z.string().min(4).max(253),
      documentId: z.string().uuid().optional().nullable(),
      requestedStoreId: z.string().uuid().optional().nullable(),
    }),
  )
  .handler(async ({ data: { domain, documentId, requestedStoreId } }) => {
    const { authorizeBuilderStoreContext } = await import("@/lib/server-access");
    const authCtx = await authorizeBuilderStoreContext({
      documentId: documentId || undefined,
      requestedStoreId: requestedStoreId || undefined,
      allowPlatformRootForGlobalAdmin: true,
    });

    const normalizedDomain = domain
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/\/.*$/, "")
      .replace(/:\d+$/, "");

    const domainRegex = /^(?!-)[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/;
    if (!domainRegex.test(normalizedDomain) || normalizedDomain.endsWith(".waesy.com.br") || normalizedDomain.endsWith(".waesy.app")) {
      throw new Error("Informe um domínio próprio válido (ex: www.suaempresa.com.br).");
    }

    const db = getServerClient();

    const { data: conflictingDoc } = await db
      .from("experience_documents")
      .select("id, store_id")
      .eq("custom_domain", normalizedDomain)
      .neq("store_id", authCtx.storeId)
      .limit(1)
      .maybeSingle();

    if (conflictingDoc?.id) {
      throw new Error("Este domínio já está vinculado a outra empresa na plataforma.");
    }

    const { data: storeRow } = await db
      .from("stores")
      .select("id, slug, settings")
      .eq("id", authCtx.storeId)
      .maybeSingle();

    const prevSettings = ((storeRow?.settings as Record<string, any>) || {});
    const updatedStoreSettings = {
      ...prevSettings,
      custom_domain: normalizedDomain,
      custom_domain_status: "pending_dns",
      custom_domain_updated_at: new Date().toISOString(),
    };

    await db
      .from("stores")
      .update({
        settings: updatedStoreSettings,
        updated_at: new Date().toISOString(),
      })
      .eq("id", authCtx.storeId);

    if (documentId) {
      await db
        .from("experience_documents")
        .update({
          custom_domain: normalizedDomain,
          updated_at: new Date().toISOString(),
        })
        .eq("id", documentId)
        .eq("store_id", authCtx.storeId);
    } else {
      await db
        .from("experience_documents")
        .update({
          custom_domain: normalizedDomain,
          updated_at: new Date().toISOString(),
        })
        .eq("store_id", authCtx.storeId)
        .eq("document_type", "storefront")
        .eq("is_active", true);
    }

    return {
      status: "pending_dns" as const,
      domain: normalizedDomain,
      storeSlug: storeRow?.slug || "loja",
      cnameHost: normalizedDomain.startsWith("www.") ? "www" : "@",
      cnameTarget: "cname.waesy.app",
      aRecordTarget: "76.76.21.21",
      verified: false,
    };
  });
