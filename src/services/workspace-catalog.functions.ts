/**
 * Workspace Catalog Server Functions (BFF Boundary)
 *
 * Transações canônicas para o Catálogo de Produtos do Workspace Pro.
 * Todo acesso a dados é mediado por `assertStoreAccess` e queries reais no Supabase (M01: Zero Mocks).
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerIdentity, assertStoreAccess, STAFF_ROLES } from "@/lib/server-access";
import { getServerClient } from "@/lib/supabase";
import { withDataPayload } from "./cart-helpers";
import { purgeEdgeCacheTags, CACHE_TAGS } from "@/lib/cache/edge-cache";

// ---------------------------------------------------------------------------
// Schemas Zod de Validação
// ---------------------------------------------------------------------------

export const createWorkspaceProductInputSchema = z.object({
  storeId: z.string().uuid().optional(),
  title: z.string().min(2, "Título deve ter pelo menos 2 caracteres").max(200),
  slug: z
    .string()
    .min(2)
    .max(200)
    .regex(/^[a-z0-9-]+$/, "Slug deve conter apenas letras minúsculas, números e hifens"),
  description: z.string().max(5000).optional().nullable(),
  priceCents: z.number().int().min(0, "Preço deve ser positivo"),
  compareAtCents: z.number().int().min(0).optional().nullable(),
  costCents: z.number().int().min(0).optional().nullable(),
  categoryId: z.string().uuid().optional().nullable(),
  status: z.enum(["draft", "published", "archived"]).default("draft"),
  mediaUrls: z.array(z.string().url()).default([]),
  variants: z
    .array(
      z.object({
        sku: z.string().min(1).max(100),
        attributes: z.record(z.any()).default({}),
        priceOverrideCents: z.number().int().min(0).optional().nullable(),
        stockOnHand: z.number().int().min(0).default(0),
        allowBackorder: z.boolean().default(false),
      })
    )
    .default([]),
});

export const updateWorkspaceProductInputSchema = z.object({
  productId: z.string().uuid(),
  storeId: z.string().uuid().optional(),
  title: z.string().min(2).max(200).optional(),
  slug: z.string().min(2).max(200).regex(/^[a-z0-9-]+$/).optional(),
  description: z.string().max(5000).optional().nullable(),
  priceCents: z.number().int().min(0).optional(),
  compareAtCents: z.number().int().min(0).optional().nullable(),
  costCents: z.number().int().min(0).optional().nullable(),
  categoryId: z.string().uuid().optional().nullable(),
  status: z.enum(["draft", "published", "archived"]).optional(),
  mediaUrls: z.array(z.string().url()).optional(),
});

export const archiveWorkspaceProductInputSchema = z.object({
  productId: z.string().uuid(),
  storeId: z.string().uuid().optional(),
});

export const listWorkspaceProductsInputSchema = z.object({
  storeId: z.string().uuid().optional(),
  status: z.enum(["all", "draft", "published", "archived"]).default("all"),
  searchQuery: z.string().max(100).optional(),
  limit: z.number().int().min(1).max(100).default(20),
  cursor: z.string().optional().nullable(),
});

export const getWorkspaceProductDetailInputSchema = z.object({
  productId: z.string().uuid(),
  storeId: z.string().uuid().optional(),
});

// ---------------------------------------------------------------------------
// Server Functions Canônicas
// ---------------------------------------------------------------------------

/**
 * Lista produtos do Workspace com paginação keyset e filtros de status/busca.
 */
export const listWorkspaceProductsFn = createServerFn({ method: "POST" })
  .validator(withDataPayload(listWorkspaceProductsInputSchema))
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    const targetStoreId = data.storeId || identity.store_id;

    if (typeof targetStoreId !== "string" || targetStoreId.length === 0) {
      throw new Error("Nenhuma loja ativa selecionada.");
    }

    assertStoreAccess(identity, STAFF_ROLES, targetStoreId);

    const db = getServerClient();
    let query = db
      .from("products")
      .select(
        `
        id,
        title,
        slug,
        price_cents,
        compare_at_cents,
        cost_cents,
        status,
        created_at,
        category_id,
        product_media (url, alt, sort_order),
        product_variants (id, sku, price_override_cents, stock_on_hand, allow_backorder)
      `
      )
      .eq("store_id", targetStoreId);

    if (data.status !== "all") {
      query = query.eq("status", data.status);
    } else {
      query = query.neq("status", "archived");
    }

    if (data.searchQuery && data.searchQuery.trim().length > 0) {
      query = query.ilike("title", `%${data.searchQuery.trim()}%`);
    }

    if (data.cursor) {
      query = query.lt("created_at", data.cursor);
    }

    query = query.order("created_at", { ascending: false }).limit(data.limit + 1);

    const { data: rows, error } = await query;

    if (error) {
      console.error("[workspace-catalog] listWorkspaceProductsFn error:", error);
      throw new Error("Falha ao listar produtos do catálogo.");
    }

    const items = rows || [];
    const hasMore = items.length > data.limit;
    const returnItems = hasMore ? items.slice(0, data.limit) : items;
    const nextCursor = hasMore && returnItems.length > 0 ? returnItems[returnItems.length - 1].created_at : null;

    return {
      products: returnItems.map((p: any) => {
        const media = Array.isArray(p.product_media)
          ? [...p.product_media].sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0))
          : [];
        const variants = Array.isArray(p.product_variants) ? p.product_variants : [];
        const totalStock = variants.reduce((acc: number, v: any) => acc + (Number(v.stock_on_hand) || 0), 0);

        return {
          id: p.id,
          title: p.title,
          slug: p.slug,
          priceCents: Number(p.price_cents || 0),
          compareAtCents: p.compare_at_cents ? Number(p.compare_at_cents) : null,
          costCents: p.cost_cents ? Number(p.cost_cents) : null,
          status: p.status,
          createdAt: p.created_at,
          coverUrl: media[0]?.url || null,
          variantsCount: variants.length,
          totalStock: totalStock,
          isOutOfStock: totalStock <= 0,
        };
      }),
      nextCursor,
      hasMore,
    };
  });

/**
 * Cria produto com validação Zod, mídia e variantes de estoque.
 */
export const createWorkspaceProductFn = createServerFn({ method: "POST" })
  .validator(withDataPayload(createWorkspaceProductInputSchema))
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    const targetStoreId = data.storeId || identity.store_id;

    if (typeof targetStoreId !== "string" || targetStoreId.length === 0) {
      throw new Error("Nenhuma loja ativa selecionada.");
    }

    assertStoreAccess(identity, STAFF_ROLES, targetStoreId);

    const db = getServerClient();

    // 1. Inserir produto principal
    const { data: newProduct, error: productError } = await db
      .from("products")
      .insert({
        store_id: targetStoreId,
        title: data.title,
        slug: data.slug,
        description: data.description || null,
        price_cents: data.priceCents,
        compare_at_cents: data.compareAtCents || null,
        cost_cents: data.costCents || null,
        category_id: data.categoryId || null,
        status: data.status,
      })
      .select("id, slug, title, status, price_cents, created_at")
      .single();

    if (productError || Boolean(newProduct) === false) {
      console.error("[workspace-catalog] createProduct error:", productError);
      throw new Error("Falha ao registrar novo produto.");
    }

    const productId = newProduct.id;

    // 2. Inserir mídias se fornecidas
    if (data.mediaUrls.length > 0) {
      const mediaInserts = data.mediaUrls.map((url, idx) => ({
        product_id: productId,
        url,
        sort_order: idx,
      }));
      await db.from("product_media").insert(mediaInserts);
    }

    // 3. Inserir variantes se fornecidas
    if (data.variants.length > 0) {
      const variantInserts = data.variants.map((v) => ({
        product_id: productId,
        sku: v.sku,
        attributes: v.attributes,
        price_override_cents: v.priceOverrideCents || null,
        stock_on_hand: v.stockOnHand,
        allow_backorder: v.allowBackorder,
        status: "active",
      }));
      await db.from("product_variants").insert(variantInserts);
    }

    purgeEdgeCacheTags([CACHE_TAGS.catalog(targetStoreId)]);

    return {
      success: true,
      productId: newProduct.id,
      productSlug: newProduct.slug,
    };
  });

/**
 * Atualiza produto do catálogo com garantia de tenant.
 */
export const updateWorkspaceProductFn = createServerFn({ method: "POST" })
  .validator(withDataPayload(updateWorkspaceProductInputSchema))
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    const targetStoreId = data.storeId || identity.store_id;

    if (typeof targetStoreId !== "string" || targetStoreId.length === 0) {
      throw new Error("Nenhuma loja ativa selecionada.");
    }

    assertStoreAccess(identity, STAFF_ROLES, targetStoreId);

    const db = getServerClient();

    // 1. Garantir que o produto pertence à loja
    const { data: existing, error: verifyError } = await db
      .from("products")
      .select("id, store_id")
      .eq("id", data.productId)
      .eq("store_id", targetStoreId)
      .maybeSingle();

    if (verifyError || Boolean(existing) === false) {
      throw new Error("Produto não encontrado ou acesso não autorizado à loja.");
    }

    // 2. Montar carga de atualização parcial
    const updatePayload: Record<string, any> = {};
    if (data.title !== undefined) updatePayload.title = data.title;
    if (data.slug !== undefined) updatePayload.slug = data.slug;
    if (data.description !== undefined) updatePayload.description = data.description;
    if (data.priceCents !== undefined) updatePayload.price_cents = data.priceCents;
    if (data.compareAtCents !== undefined) updatePayload.compare_at_cents = data.compareAtCents;
    if (data.costCents !== undefined) updatePayload.cost_cents = data.costCents;
    if (data.categoryId !== undefined) updatePayload.category_id = data.categoryId;
    if (data.status !== undefined) updatePayload.status = data.status;

    if (Object.keys(updatePayload).length > 0) {
      const { error: updateError } = await db
        .from("products")
        .update(updatePayload)
        .eq("id", data.productId)
        .eq("store_id", targetStoreId);

      if (updateError) {
        console.error("[workspace-catalog] updateProduct error:", updateError);
        throw new Error("Falha ao atualizar dados do produto.");
      }
    }

    // 3. Atualizar mídias se fornecidas
    if (data.mediaUrls !== undefined) {
      await db.from("product_media").delete().eq("product_id", data.productId);
      if (data.mediaUrls.length > 0) {
        const mediaInserts = data.mediaUrls.map((url, idx) => ({
          product_id: data.productId,
          url,
          sort_order: idx,
        }));
        await db.from("product_media").insert(mediaInserts);
      }
    }

    purgeEdgeCacheTags([CACHE_TAGS.catalog(targetStoreId)]);

    return { success: true, productId: data.productId };
  });

/**
 * Arquivamento de produto (soft delete: status = 'archived').
 */
export const archiveWorkspaceProductFn = createServerFn({ method: "POST" })
  .validator(withDataPayload(archiveWorkspaceProductInputSchema))
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    const targetStoreId = data.storeId || identity.store_id;

    if (typeof targetStoreId !== "string" || targetStoreId.length === 0) {
      throw new Error("Nenhuma loja ativa selecionada.");
    }

    assertStoreAccess(identity, STAFF_ROLES, targetStoreId);

    const db = getServerClient();

    const { error } = await db
      .from("products")
      .update({ status: "archived" })
      .eq("id", data.productId)
      .eq("store_id", targetStoreId);

    if (error) {
      console.error("[workspace-catalog] archiveProduct error:", error);
      throw new Error("Falha ao arquivar produto.");
    }

    purgeEdgeCacheTags([CACHE_TAGS.catalog(targetStoreId)]);

    return { success: true, archived: true };
  });

/**
 * Obtém detalhe completo do produto para o formulário de edição do Workspace.
 */
export const getWorkspaceProductDetailFn = createServerFn({ method: "POST" })
  .validator(withDataPayload(getWorkspaceProductDetailInputSchema))
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    const targetStoreId = data.storeId || identity.store_id;

    if (typeof targetStoreId !== "string" || targetStoreId.length === 0) {
      throw new Error("Nenhuma loja ativa selecionada.");
    }

    assertStoreAccess(identity, STAFF_ROLES, targetStoreId);

    const db = getServerClient();

    const { data: row, error } = await db
      .from("products")
      .select(
        `
        id,
        title,
        slug,
        description,
        price_cents,
        compare_at_cents,
        cost_cents,
        status,
        category_id,
        created_at,
        product_media (id, url, sort_order),
        product_variants (id, sku, price_override_cents, stock_on_hand, allow_backorder, attributes)
      `
      )
      .eq("id", data.productId)
      .eq("store_id", targetStoreId)
      .maybeSingle();

    if (error || row === null || row === undefined) {
      return null;
    }

    const rowData: any = row;
    const media = Array.isArray(rowData.product_media)
      ? [...rowData.product_media].sort((a: any, b: any) => (a.sort_order || 0) - (b.sort_order || 0))
      : [];

    return {
      id: rowData.id,
      title: rowData.title,
      slug: rowData.slug,
      description: rowData.description,
      priceCents: Number(rowData.price_cents || 0),
      compareAtCents: rowData.compare_at_cents ? Number(rowData.compare_at_cents) : null,
      costCents: rowData.cost_cents ? Number(rowData.cost_cents) : null,
      status: rowData.status,
      categoryId: rowData.category_id,
      createdAt: rowData.created_at,
      mediaUrls: media.map((m: any) => m.url),
      variants: (Array.isArray(rowData.product_variants) ? rowData.product_variants : []).map((v: any) => ({
        id: v.id,
        sku: v.sku,
        attributes: v.attributes || {},
        priceOverrideCents: v.price_override_cents ? Number(v.price_override_cents) : null,
        stockOnHand: Number(v.stock_on_hand || 0),
        allowBackorder: Boolean(v.allow_backorder),
      })),
    };
  });
