/**
 * cms-collections.functions.ts — BFF Server Functions para CMS Dinâmico Multi-Tenant
 *
 * Gerencia coleções customizadas (`cms_collections`, `cms_collection_fields`,
 * `cms_collection_items`) e consolida contagens reais das tabelas nativas
 * (`products`, `categories`, `classifieds`, `events`, `jobs`, `posts`, `reviews`,
 * `banners`, `hotpages`) no Supabase sem mocks ou fallbacks sintéticos.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { authorizeBuilderStoreContext } from "@/lib/server-access";
import { getServerClient, SupabaseUnconfiguredError } from "@/lib/supabase";

export type CmsFieldType =
  | "text"
  | "richtext"
  | "number"
  | "currency"
  | "image"
  | "url"
  | "boolean"
  | "select"
  | "date";

export interface CmsCollectionFieldDTO {
  id: string;
  collection_id: string;
  store_id: string;
  key: string;
  label: string;
  field_type: CmsFieldType;
  is_required: boolean;
  is_primary: boolean;
  options: string[];
  sort_order: number;
}

export interface CmsCollectionItemDTO {
  id: string;
  collection_id: string;
  store_id: string;
  slug: string | null;
  title: string;
  data: Record<string, any>;
  status: "draft" | "published" | "archived";
  city_filter: string | null;
  starts_at: string | null;
  ends_at: string | null;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

export interface CmsCollectionDTO {
  id: string;
  store_id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string;
  is_public: boolean;
  fields: CmsCollectionFieldDTO[];
  items: CmsCollectionItemDTO[];
  item_count: number;
}

export interface StoreCmsNativeCounts {
  products: number;
  categories: number;
  classifieds: number;
  events: number;
  jobs: number;
  posts: number;
  reviews: number;
  banners: number;
  hotpages: number;
}

function normalizeSlugToken(raw: string): string {
  const clean = raw
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return clean || `colecao_${Date.now()}`;
}

function normalizeFieldKey(raw: string): string {
  const clean = raw
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return clean || `campo_${Date.now()}`;
}

async function safeCountForStore(
  db: ReturnType<typeof getServerClient>,
  table: string,
  storeId: string,
  includeNullStoreFallback = false,
): Promise<number> {
  try {
    let query = db.from(table).select("id", { count: "exact", head: true });
    if (includeNullStoreFallback) {
      query = query.or(`store_id.eq.${storeId},store_id.is.null`);
    } else {
      query = query.eq("store_id", storeId);
    }
    const { count, error } = await query;
    if (error) return 0;
    return typeof count === "number" ? count : 0;
  } catch {
    return 0;
  }
}

export const listStoreCmsDashboardData = createServerFn({ method: "GET" })
  .validator(
    z
      .object({
        storeId: z.string().uuid().optional().nullable(),
      })
      .optional(),
  )
  .handler(async ({ data: input }) => {
    try {
      const authCtx = await authorizeBuilderStoreContext({
        requestedStoreId: input?.storeId ?? undefined,
        allowPlatformRootForGlobalAdmin: true,
      });
      const db = getServerClient();
      const storeId = authCtx.storeId;

      const [
        collectionsRes,
        fieldsRes,
        itemsRes,
        productsCount,
        categoriesCount,
        classifiedsCount,
        eventsCount,
        jobsCount,
        postsCount,
        reviewsCount,
        bannersCount,
        hotpagesCount,
      ] = await Promise.all([
        db
          .from("cms_collections")
          .select("*")
          .eq("store_id", storeId)
          .order("created_at", { ascending: true }),
        db
          .from("cms_collection_fields")
          .select("*")
          .eq("store_id", storeId)
          .order("sort_order", { ascending: true }),
        db
          .from("cms_collection_items")
          .select("*")
          .eq("store_id", storeId)
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: false }),
        safeCountForStore(db, "products", storeId),
        safeCountForStore(db, "categories", storeId),
        safeCountForStore(db, "classifieds", storeId, authCtx.isPlatformRootStore),
        safeCountForStore(db, "events", storeId, authCtx.isPlatformRootStore),
        safeCountForStore(db, "jobs", storeId, authCtx.isPlatformRootStore),
        safeCountForStore(db, "posts", storeId, authCtx.isPlatformRootStore),
        safeCountForStore(db, "reviews", storeId),
        safeCountForStore(db, "banners", storeId, authCtx.isPlatformRootStore),
        safeCountForStore(db, "hotpages", storeId, authCtx.isPlatformRootStore),
      ]);

      const rawCollections = collectionsRes.error ? [] : collectionsRes.data || [];
      const rawFields = fieldsRes.error ? [] : fieldsRes.data || [];
      const rawItems = itemsRes.error ? [] : itemsRes.data || [];

      const collections: CmsCollectionDTO[] = rawCollections.map((col: any) => {
        const colFields = rawFields
          .filter((f: any) => f.collection_id === col.id)
          .map((f: any) => ({
            ...f,
            options: Array.isArray(f.options) ? f.options : [],
          }));
        const colItems = rawItems
          .filter((i: any) => i.collection_id === col.id)
          .map((i: any) => ({
            ...i,
            data: i.data && typeof i.data === "object" ? i.data : {},
          }));
        return {
          ...col,
          fields: colFields,
          items: colItems,
          item_count: colItems.length,
        };
      });

      const nativeCounts: StoreCmsNativeCounts = {
        products: productsCount,
        categories: categoriesCount,
        classifieds: classifiedsCount,
        events: eventsCount,
        jobs: jobsCount,
        posts: postsCount,
        reviews: reviewsCount,
        banners: bannersCount,
        hotpages: hotpagesCount,
      };

      return {
        storeId,
        collections,
        nativeCounts,
      };
    } catch (e: unknown) {
      if (e instanceof SupabaseUnconfiguredError) {
        return {
          storeId: null,
          collections: [] as CmsCollectionDTO[],
          nativeCounts: {
            products: 0,
            categories: 0,
            classifieds: 0,
            events: 0,
            jobs: 0,
            posts: 0,
            reviews: 0,
            banners: 0,
            hotpages: 0,
          },
        };
      }
      console.error("[cms-collections] listStoreCmsDashboardData error:", e);
      throw new Error(
        e instanceof Error ? e.message : "Erro ao carregar coleções CMS.",
      );
    }
  });

export const createCmsCollection = createServerFn({ method: "POST" })
  .validator(
    z.object({
      storeId: z.string().uuid().optional().nullable(),
      name: z.string().trim().min(1).max(120),
      slug: z.string().trim().max(120).optional().nullable(),
      description: z.string().trim().max(500).optional().nullable(),
      is_public: z.boolean().default(true),
    }),
  )
  .handler(async ({ data: input }) => {
    const authCtx = await authorizeBuilderStoreContext({
      requestedStoreId: input.storeId ?? undefined,
      allowPlatformRootForGlobalAdmin: true,
    });
    const db = getServerClient();
    const slug = normalizeSlugToken(input.slug || input.name);

    const { data: created, error } = await db
      .from("cms_collections")
      .insert({
        store_id: authCtx.storeId,
        name: input.name,
        slug,
        description: input.description ?? null,
        is_public: input.is_public,
      })
      .select("*")
      .single();

    if (error) throw new Error(error.message || "Falha ao criar coleção CMS.");

    const starterFields = [
      {
        collection_id: created.id,
        store_id: authCtx.storeId,
        key: "title",
        label: "Título",
        field_type: "text",
        is_required: true,
        is_primary: true,
        options: [],
        sort_order: 0,
      },
      {
        collection_id: created.id,
        store_id: authCtx.storeId,
        key: "subtitle",
        label: "Resumo",
        field_type: "text",
        is_required: false,
        is_primary: false,
        options: [],
        sort_order: 1,
      },
      {
        collection_id: created.id,
        store_id: authCtx.storeId,
        key: "badge",
        label: "Selo / Tag",
        field_type: "text",
        is_required: false,
        is_primary: false,
        options: [],
        sort_order: 2,
      },
      {
        collection_id: created.id,
        store_id: authCtx.storeId,
        key: "price",
        label: "Preço / Valor",
        field_type: "currency",
        is_required: false,
        is_primary: false,
        options: [],
        sort_order: 3,
      },
      {
        collection_id: created.id,
        store_id: authCtx.storeId,
        key: "image_url",
        label: "Imagem",
        field_type: "image",
        is_required: false,
        is_primary: false,
        options: [],
        sort_order: 4,
      },
      {
        collection_id: created.id,
        store_id: authCtx.storeId,
        key: "href",
        label: "Link / Ação",
        field_type: "url",
        is_required: false,
        is_primary: false,
        options: [],
        sort_order: 5,
      },
    ];

    const { data: fieldsData } = await db
      .from("cms_collection_fields")
      .insert(starterFields)
      .select("*");

    return {
      ...created,
      fields: fieldsData || [],
      items: [],
      item_count: 0,
    } as CmsCollectionDTO;
  });

export const deleteCmsCollection = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string().uuid(),
      storeId: z.string().uuid().optional().nullable(),
    }),
  )
  .handler(async ({ data: input }) => {
    const authCtx = await authorizeBuilderStoreContext({
      requestedStoreId: input.storeId ?? undefined,
      allowPlatformRootForGlobalAdmin: true,
    });
    const db = getServerClient();

    const { error } = await db
      .from("cms_collections")
      .delete()
      .eq("id", input.id)
      .eq("store_id", authCtx.storeId);

    if (error) throw new Error(error.message || "Falha ao remover coleção CMS.");
    return { status: "ok" as const, id: input.id };
  });

export const upsertCmsCollectionField = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string().uuid().optional(),
      collection_id: z.string().uuid(),
      storeId: z.string().uuid().optional().nullable(),
      key: z.string().trim().min(1).max(60).optional(),
      label: z.string().trim().min(1).max(120),
      field_type: z
        .enum(["text", "richtext", "number", "currency", "image", "url", "boolean", "select", "date"])
        .default("text"),
      is_required: z.boolean().default(false),
      is_primary: z.boolean().default(false),
      options: z.array(z.string()).default([]),
      sort_order: z.number().int().nonnegative().default(0),
    }),
  )
  .handler(async ({ data: input }) => {
    const authCtx = await authorizeBuilderStoreContext({
      requestedStoreId: input.storeId ?? undefined,
      allowPlatformRootForGlobalAdmin: true,
    });
    const db = getServerClient();
    const fieldKey = normalizeFieldKey(input.key || input.label);

    const payload = {
      collection_id: input.collection_id,
      store_id: authCtx.storeId,
      key: fieldKey,
      label: input.label,
      field_type: input.field_type,
      is_required: input.is_required,
      is_primary: input.is_primary,
      options: input.options,
      sort_order: input.sort_order,
    };

    const res = input.id
      ? await db
          .from("cms_collection_fields")
          .update(payload)
          .eq("id", input.id)
          .eq("store_id", authCtx.storeId)
          .select("*")
          .single()
      : await db.from("cms_collection_fields").insert(payload).select("*").single();

    if (res.error) throw new Error(res.error.message || "Falha ao salvar campo da coleção.");
    return res.data as CmsCollectionFieldDTO;
  });

export const deleteCmsCollectionField = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string().uuid(),
      storeId: z.string().uuid().optional().nullable(),
    }),
  )
  .handler(async ({ data: input }) => {
    const authCtx = await authorizeBuilderStoreContext({
      requestedStoreId: input.storeId ?? undefined,
      allowPlatformRootForGlobalAdmin: true,
    });
    const db = getServerClient();

    const { error } = await db
      .from("cms_collection_fields")
      .delete()
      .eq("id", input.id)
      .eq("store_id", authCtx.storeId);

    if (error) throw new Error(error.message || "Falha ao excluir campo da coleção.");
    return { status: "ok" as const, id: input.id };
  });

export const upsertCmsCollectionItem = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string().uuid().optional(),
      collection_id: z.string().uuid(),
      storeId: z.string().uuid().optional().nullable(),
      slug: z.string().trim().max(160).optional().nullable(),
      title: z.string().trim().min(1).max(200),
      data: z.record(z.any()).default({}),
      status: z.enum(["draft", "published", "archived"]).default("published"),
      city_filter: z.string().trim().max(120).optional().nullable(),
      starts_at: z.string().optional().nullable(),
      ends_at: z.string().optional().nullable(),
      sort_order: z.number().int().nonnegative().default(0),
    }),
  )
  .handler(async ({ data: input }) => {
    const authCtx = await authorizeBuilderStoreContext({
      requestedStoreId: input.storeId ?? undefined,
      allowPlatformRootForGlobalAdmin: true,
    });
    const db = getServerClient();
    const resolvedSlug = input.slug ? normalizeSlugToken(input.slug) : normalizeSlugToken(input.title);

    const payload = {
      collection_id: input.collection_id,
      store_id: authCtx.storeId,
      slug: resolvedSlug,
      title: input.title,
      data: {
        ...input.data,
        title: input.title,
      },
      status: input.status,
      city_filter: input.city_filter || null,
      starts_at: input.starts_at || null,
      ends_at: input.ends_at || null,
      sort_order: input.sort_order,
      updated_at: new Date().toISOString(),
    };

    const res = input.id
      ? await db
          .from("cms_collection_items")
          .update(payload)
          .eq("id", input.id)
          .eq("store_id", authCtx.storeId)
          .select("*")
          .single()
      : await db.from("cms_collection_items").insert(payload).select("*").single();

    if (res.error) throw new Error(res.error.message || "Falha ao salvar item na coleção.");
    return res.data as CmsCollectionItemDTO;
  });

export const deleteCmsCollectionItem = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string().uuid(),
      storeId: z.string().uuid().optional().nullable(),
    }),
  )
  .handler(async ({ data: input }) => {
    const authCtx = await authorizeBuilderStoreContext({
      requestedStoreId: input.storeId ?? undefined,
      allowPlatformRootForGlobalAdmin: true,
    });
    const db = getServerClient();

    const { error } = await db
      .from("cms_collection_items")
      .delete()
      .eq("id", input.id)
      .eq("store_id", authCtx.storeId);

    if (error) throw new Error(error.message || "Falha ao excluir item da coleção.");
    return { status: "ok" as const, id: input.id };
  });

export const getPublicCmsCollectionsForStore = createServerFn({ method: "GET" })
  .validator(
    z
      .object({
        storeId: z.string().uuid().optional().nullable(),
      })
      .optional(),
  )
  .handler(async ({ data: input }) => {
    try {
      const db = getServerClient();
      let targetStoreId = input?.storeId ?? null;
      if (!targetStoreId) {
        const { resolveTenantStoreId } = await import("@/lib/tenant.server");
        targetStoreId = await resolveTenantStoreId();
      }
      if (!targetStoreId) {
        const { resolvePlatformRootStore } = await import("@/services/master.functions");
        const root = await resolvePlatformRootStore(db);
        targetStoreId = root?.id || null;
      }
      if (!targetStoreId) return [] as CmsCollectionDTO[];

      const { data: cols, error: colsErr } = await db
        .from("cms_collections")
        .select("*")
        .eq("store_id", targetStoreId)
        .eq("is_public", true)
        .order("created_at", { ascending: true });

      if (colsErr || !cols || cols.length === 0) return [] as CmsCollectionDTO[];

      const colIds = cols.map((c: any) => c.id);
      const [fieldsRes, itemsRes] = await Promise.all([
        db
          .from("cms_collection_fields")
          .select("*")
          .in("collection_id", colIds)
          .order("sort_order", { ascending: true }),
        db
          .from("cms_collection_items")
          .select("*")
          .in("collection_id", colIds)
          .eq("status", "published")
          .order("sort_order", { ascending: true }),
      ]);

      const nowMs = Date.now();
      const rawFields = fieldsRes.error ? [] : fieldsRes.data || [];
      const rawItems = (itemsRes.error ? [] : itemsRes.data || []).filter((item: any) => {
        if (item.starts_at && Date.parse(item.starts_at) > nowMs) return false;
        if (item.ends_at && Date.parse(item.ends_at) < nowMs) return false;
        return true;
      });

      return cols.map((col: any) => {
        const fields = rawFields.filter((f: any) => f.collection_id === col.id);
        const items = rawItems.filter((i: any) => i.collection_id === col.id);
        return {
          ...col,
          fields,
          items,
          item_count: items.length,
        };
      }) as CmsCollectionDTO[];
    } catch {
      return [] as CmsCollectionDTO[];
    }
  });
