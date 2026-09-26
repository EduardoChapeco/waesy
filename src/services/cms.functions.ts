/**
 * CMS server functions Commerce
 *
 * BFF boundary for Pages and Sections management.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { getServerClient, SupabaseUnconfiguredError } from "@/lib/supabase";

// ---------------------------------------------------------------------------
// Admin CRUD
// ---------------------------------------------------------------------------

async function _listAdminPages() {
  const { getServerIdentity, getSSRClient } = await import("@/lib/server-access");
  const { store_id } = await getServerIdentity();
  if (!store_id) throw new Error("Loja não encontrada");

  const db = await getSSRClient();
  const { data, error } = await db
    .from("pages")
    .select("id, title, slug, status, created_at, updated_at")
    .eq("store_id", store_id)
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
 throw new Error("Erro ao listar páginas.");
 }
});

export const getAdminPageDetails = createServerFn({ method: "GET" })
 .validator(z.object({ id: z.string().uuid() }))
 .handler(async ({ data: input }) => {
 try {
 const { getServerIdentity } = await import("@/lib/server-access");
 const { store_id } = await getServerIdentity();
 if (!store_id) throw new Error("Loja não encontrada");

 const db = getServerClient();

 const { data: page, error: pageError } = await db
 .from("pages")
 .select("*")
 .eq("id", input.id)
 .eq("store_id", store_id)
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
 throw new Error("Erro ao carregar detalhes da página.");
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

 const { getServerIdentity } = await import("@/lib/server-access");
 const { store_id } = await getServerIdentity();
 if (!store_id) throw new Error("No store found");
 const storeData = { id: store_id };
 if (!storeData) throw new Error("No store found");

 const { data, error } = await db
 .from("pages")
 .insert({
 store_id: storeData.id,
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
 throw new Error(e instanceof Error ? (e instanceof Error ? e.message : String(e)) : "Erro.");
 }
 });

export const deletePage = createServerFn({ method: "POST" })
 .validator(z.object({ id: z.string().uuid() }))
 .handler(async ({ data: input }) => {
 try {
 const db = getServerClient();

 // First delete associated sections
 await db.from("page_sections").delete().eq("page_id", input.id);

 // Then delete page
 const { error } = await db.from("pages").delete().eq("id", input.id);
 if (error) throw error;

 return { status: "success" as const };
 } catch (e: unknown) {
 console.error("[cms.functions] deletePage error:", e);
 throw new Error("Erro ao excluir página.");
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

 // Delete existing sections not in the payload
 const sectionIds = input.sections.map((s) => s.id).filter(Boolean);
 let deleteQuery = db.from("page_sections").delete().eq("page_id", input.pageId);
 if (sectionIds.length > 0) {
 deleteQuery = deleteQuery.not("id", "in", `(${sectionIds.join(",")})`);
 }
 await deleteQuery;

 // Upsert sections
 for (const section of input.sections) {
 const payload = {
 page_id: input.pageId,
 section_type: section.section_type,
 content: section.content,
 sort_order: section.sort_order,
 };

 if (section.id) {
 await db.from("page_sections").update(payload).eq("id", section.id);
 } else {
 await db.from("page_sections").insert(payload);
 }
 }

 return { status: "success" as const };
 } catch (e: unknown) {
 console.error("[cms.functions] savePageSections error:", e);
 throw new Error("Erro ao salvar seções.");
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
 "id, name, slug, type, email, phone, cnpj, address, city, state, zip_code, description, seo_title, seo_description, seo_keywords, settings",
 )
 .eq("id", storeId)
 .maybeSingle();

 if (!error && data) store = data;
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
      // Create default if it doesn't exist
      const { data: newData, error: insertError } = await db
        .from("theme_settings")
        .insert({ store_id: storeId })
        .select()
        .maybeSingle();

      if (insertError) {
        console.warn("[cms.functions] getThemeSettings insert error:", insertError);
        return null;
      }
      return newData || null;
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

 const { getServerIdentity } = await import("@/lib/server-access");
 const { store_id } = await getServerIdentity();
 if (!store_id) throw new Error("No store found");
 const storeData = { id: store_id };
 if (!storeData) throw new Error("No store found");

 const { data, error } = await db
 .from("theme_settings")
 .update(input)
 .eq("store_id", storeData.id)
 .select()
 .single();

 if (error) throw error;
 return data;
 } catch (e: unknown) {
 console.error("[cms.functions] updateThemeSettings error:", e);
 throw new Error("Erro ao atualizar tema.");
 }
 });

// ---------------------------------------------------------------------------
// Navigation Menus
// ---------------------------------------------------------------------------

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

    if (!storeId) return [];

    const { data, error } = await db
      .from("navigation_menus")
      .select("*")
      .eq("store_id", storeId)
      .order("handle", { ascending: true });

    if (error) {
      console.warn("[cms.functions] getNavigationMenus query error:", error);
      return [];
    }
    return data || [];
  } catch (e) {
    if (e instanceof SupabaseUnconfiguredError) return [];
    console.warn("[cms.functions] getNavigationMenus fallback:", e instanceof Error ? e.message : e);
    return [];
  }
});

export const upsertNavigationMenu = createServerFn({ method: "POST" })
 .validator(
 z.object({
 id: z.string().uuid().optional(),
 handle: z.string().regex(/^[a-z0-9-]+$/),
 name: z.string().min(1),
 items: z.array(z.any()), // array of link objects
 }),
 )
 .handler(async ({ data: input }) => {
 try {
 const db = getServerClient();

 const { getServerIdentity } = await import("@/lib/server-access");
 const { store_id } = await getServerIdentity();
 if (!store_id) throw new Error("No store found");
 const storeData = { id: store_id };
 if (!storeData) throw new Error("No store found");

 const payload = {
 store_id: storeData.id,
 handle: input.handle,
 name: input.name,
 items: input.items,
 };

 const query = db.from("navigation_menus");
 let result;

 if (input.id) {
 result = await query.update(payload).eq("id", input.id).select().single();
 } else {
 result = await query.insert(payload).select().single();
 }

 if (result.error) throw result.error;
 return result.data;
 } catch (e: unknown) {
 console.error("[cms.functions] upsertNavigationMenu error:", e);
 throw new Error("Erro ao salvar menu de navegação.");
 }
 });

// ---------------------------------------------------------------------------
// Reviews (Avaliações)
// ---------------------------------------------------------------------------

export const listReviews = createServerFn({ method: "GET" }).handler(async () => {
 try {
 const db = getServerClient();

 const { getServerIdentity } = await import("@/lib/server-access");
 const identity = await getServerIdentity();
 if (!identity.store_id) throw new Error("Loja não identificada.");

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
 .eq("store_id", identity.store_id)
 .order("created_at", { ascending: false });

 if (error) throw error;
 return data;
 } catch (e) {
 if (e instanceof SupabaseUnconfiguredError) throw e;
 console.error("[cms.functions] listReviews error:", e);
 throw new Error("Erro ao listar avaliações.");
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

 const { getServerIdentity } = await import("@/lib/server-access");
 const identity = await getServerIdentity();
 if (!identity.store_id) throw new Error("Loja não identificada.");

 const { data, error } = await db
 .from("reviews")
 .update({ status: input.status })
 .eq("id", input.id)
 .eq("store_id", identity.store_id)
 .select()
 .single();

 if (error) throw error;
 return data;
 } catch (e: unknown) {
 console.error("[cms.functions] updateReviewStatus error:", e);
 throw new Error("Erro ao atualizar avaliação.");
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
 const {
 data: { user },
 error: authError,
 } = await db.auth.getUser();
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
        // Create default if it doesn't exist
        const { data: newData, error: insertError } = await db
          .from("link_in_bio")
          .insert({ store_id: storeId })
          .select()
          .maybeSingle();

        if (insertError) {
          console.warn("[cms.functions] getLinkInBio insert error:", insertError);
          return null;
        }
        return newData || null;
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

 const { getServerIdentity } = await import("@/lib/server-access");
 const { store_id } = await getServerIdentity();
 if (!store_id) throw new Error("No store found");
 const storeData = { id: store_id };
 if (!storeData) throw new Error("No store found");

 const { data, error } = await db
 .from("link_in_bio")
 .update(input)
 .eq("store_id", storeData.id)
 .select()
 .single();

 if (error) throw error;
 return data;
 } catch (e: unknown) {
 console.error("[cms.functions] upsertLinkInBio error:", e);
 throw new Error("Erro ao atualizar Link da Bio.");
 }
 });

// ---------------------------------------------------------------------------
// Stories
// ---------------------------------------------------------------------------

export const listAdminStories = createServerFn({ method: "GET" }).handler(async () => {
 try {
 const db = getServerClient();

 const { getServerIdentity } = await import("@/lib/server-access");
 const { store_id } = await getServerIdentity();
 if (!store_id) throw new Error("No store found");
 const storeData = { id: store_id };
 if (!storeData) throw new Error("No store found");

 const { data, error } = await db
 .from("stories")
 .select("*")
 .eq("store_id", storeData.id)
 .order("sort_order", { ascending: true });

 if (error) throw error;
 return data;
 } catch (e) {
 if (e instanceof SupabaseUnconfiguredError) throw e;
 console.error("[cms.functions] listAdminStories error:", e);
 throw new Error("Erro ao listar stories.");
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

 const { getServerIdentity } = await import("@/lib/server-access");
 const { store_id } = await getServerIdentity();
 if (!store_id) throw new Error("No store found");
 const storeData = { id: store_id };
 if (!storeData) throw new Error("No store found");

 const payload = {
 store_id: storeData.id,
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
 .eq("store_id", storeData.id)
 .select()
 .single();
 } else {
 result = await query.insert(payload).select().single();
 }

 if (result.error) throw result.error;
 return result.data;
 } catch (e: unknown) {
 console.error("[cms.functions] upsertStory error:", e);
 throw new Error("Erro ao salvar story.");
 }
 });

export const deleteStory = createServerFn({ method: "POST" })
 .validator(z.object({ id: z.string().uuid() }))
 .handler(async ({ data: { id } }) => {
 try {
 const db = getServerClient();

 const { getServerIdentity } = await import("@/lib/server-access");
 const { store_id } = await getServerIdentity();
 if (!store_id) throw new Error("No store found");
 const storeData = { id: store_id };

 const { error } = await db.from("stories").delete().eq("id", id).eq("store_id", storeData.id);

 if (error) throw error;

 return { status: "success" as const };
 } catch (e: unknown) {
 console.error("[cms.functions] deleteStory error:", e);
 throw new Error("Erro ao excluir story.");
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
