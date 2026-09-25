/**
 * Admin Catalog server functions Commerce
 *
 * BFF boundary for the Admin Panel. Handles CRUD operations for ProductTypes,
 * Categories, Products, and Variants.
 * Relies on RLS for authorization (user must be staff).
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireAdmin, getServerIdentity } from "@/lib/server-access";
import { getServerClient, SupabaseUnconfiguredError } from "@/lib/supabase";

// ---------------------------------------------------------------------------
// Product Types (Formulário Adaptativo)
// ---------------------------------------------------------------------------

export async function _listProductTypes() {
 const db = getServerClient();

 // RLS will enforce store isolation
 const { data, error } = await db
 .from("product_types")
 .select("id, name, slug, field_schema, created_at")
 .order("created_at", { ascending: false });

 if (error) throw error;
 return data;
}

export const listProductTypes = createServerFn({ method: "GET" }).handler(async () => {
 try {
 await requireAdmin(); // SECURITY FIX
 const data = await _listProductTypes();
 return data;
 } catch (e) {
 if (e instanceof SupabaseUnconfiguredError) throw e;
 console.error("[admin-catalog] listProductTypes error:", e);
 throw new Error("Erro ao listar tipos de produto.");
 }
});

export async function _createProductType(input: {
 name: string;
 slug: string;
 field_schema: any[];
}) {
 const db = getServerClient();
 const { getServerIdentity } = await import("@/lib/server-access");
 const { store_id } = await getServerIdentity();
 if (!store_id) throw new Error("Nenhuma loja ativa selecionada.");

 const { data: storeData } = await db
 .from("stores")
 .select("organization_id")
 .eq("id", store_id)
 .maybeSingle();

 const { data, error } = await db
 .from("product_types")
 .insert({
 organization_id: storeData?.organization_id || null,
 store_id: store_id,
 name: input.name,
 slug: input.slug,
 field_schema: input.field_schema,
 })
 .select()
 .single();

 if (error) throw error;
 return data;
}

export const createProductType = createServerFn({ method: "POST" })
 .validator(
 z.object({
 name: z.string().min(1).max(100),
 slug: z.string().regex(/^[a-z0-9-]+$/),
 field_schema: z.array(z.unknown()), // JSON representation of fields
 }),
 )
 .handler(async ({ data: input }) => {
 try {
 await requireAdmin(); // SECURITY FIX
 const data = await _createProductType(input);
 return data;
 } catch (e: unknown) {
 console.error("[admin-catalog] createProductType error:", e);
 throw new Error(
 e instanceof Error
 ? e instanceof Error
 ? e.message
 : String(e)
 : "Erro ao criar tipo de produto.",
 );
 }
 });

export async function _updateProductType(input: {
 id: string;
 name: string;
 slug: string;
 field_schema: any[];
}) {
 const db = getServerClient();
 const { getServerIdentity } = await import("@/lib/server-access");
 const { store_id } = await getServerIdentity();
 if (!store_id) throw new Error("Acesso não autorizado.");

 const { data, error } = await db
 .from("product_types")
 .update({
 name: input.name,
 slug: input.slug,
 field_schema: input.field_schema,
 })
 .eq("id", input.id)
 .eq("store_id", store_id)
 .select()
 .single();

 if (error) throw error;
 return data;
}

export const updateProductType = createServerFn({ method: "POST" })
 .validator(
 z.object({
 id: z.string().uuid(),
 name: z.string().min(1).max(100),
 slug: z.string().regex(/^[a-z0-9-]+$/),
 field_schema: z.array(z.unknown()),
 }),
 )
 .handler(async ({ data: input }) => {
 try {
 await requireAdmin(); // SECURITY FIX
 const data = await _updateProductType(input);
 return data;
 } catch (e: unknown) {
 console.error("[admin-catalog] updateProductType error:", e);
 throw new Error(
 e instanceof Error
 ? e instanceof Error
 ? e.message
 : String(e)
 : "Erro ao atualizar tipo de produto.",
 );
 }
 });

export async function _deleteProductType(id: string) {
 const db = getServerClient();
 const { getServerIdentity } = await import("@/lib/server-access");
 const { store_id } = await getServerIdentity();
 if (!store_id) throw new Error("Acesso não autorizado.");

 const { error } = await db
 .from("product_types")
 .delete()
 .eq("id", id)
 .eq("store_id", store_id);
 if (error) throw error;
 return true;
}

export const deleteProductType = createServerFn({ method: "POST" })
 .validator(z.object({ id: z.string().uuid() }))
 .handler(async ({ data: { id } }) => {
 try {
 await requireAdmin(); // SECURITY FIX
 await _deleteProductType(id);
 return { status: "success" as const };
 } catch (e: unknown) {
 console.error("[admin-catalog] deleteProductType error:", e);
 throw new Error(
 "Não foi possível excluir o tipo. Verifique se existem produtos cadastrados usando este tipo.",
 );
 }
 });

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

export async function _listAdminProducts() {
 const db = getServerClient();
 const { getServerIdentity } = await import("@/lib/server-access");
 const { store_id } = await getServerIdentity();
 if (!store_id) throw new Error("Acesso não autorizado.");

 const { data, error } = await db
 .from("products")
 .select(
 `
 id, title, slug, status, price_cents, compare_at_cents, brand,
 product_types (id, name),
 product_media (url, alt, sort_order),
 product_variants (id, sku, price_override_cents, stock_on_hand, allow_backorder, backorder_lead_time_days, requires_payment_for_backorder, attributes)
 `,
 )
 .eq("store_id", store_id)
 .order("created_at", { ascending: false });

 if (error) throw error;
 return data;
}

export const listAdminProducts = createServerFn({ method: "GET" }).handler(async () => {
 try {
 await requireAdmin(); // SECURITY FIX
 const data = await _listAdminProducts();
 return data || [];
 } catch (e) {
 if (e instanceof SupabaseUnconfiguredError) throw e;
 console.error("[admin-catalog] listAdminProducts error:", e);
 return [];
 }
});

export async function _createProduct(input: {
 type_id?: string | null;
 title: string;
 slug: string;
 description?: string | null;
 short_description?: string | null;
 manufacturer?: string | null;
 ean?: string | null;
 meta_title?: string | null;
 meta_description?: string | null;
 status: "draft" | "published" | "archived";
 brand?: string | null;
 price_cents: number;
 compare_at_cents?: number | null;
 cost_cents?: number | null;
 attributes: Record<string, any>;
 is_physical?: boolean;
 weight_kg?: number | null;
 width_cm?: number | null;
 height_cm?: number | null;
 length_cm?: number | null;
 preparation_time_days?: number | null;
 show_stock_publicly?: boolean;
 media_urls?: string[];
 category_ids?: string[];
 option_group_ids?: string[];
 options?: any;

 variants?: {
 sku: string;
 attributes: Record<string, any>;
 price_override_cents?: number | null;
 stock: number;
 image_url?: string | null;
 allow_backorder?: boolean;
 backorder_lead_time_days?: number;
 requires_payment_for_backorder?: boolean;
 }[];
}) {
 const db = getServerClient();
 const { getServerIdentity } = await import("@/lib/server-access");
 const { store_id } = await getServerIdentity();
 const effectiveStoreId = store_id;
 if (!effectiveStoreId) throw new Error("Nenhuma loja ativa selecionada.");

 // 1. Tenta RPC atômico primeiro se existir
 try {
 const { data, error } = await db.rpc("create_product_transaction_v1", {
 payload: {
 store_id: effectiveStoreId,
 ...input,
 },
 });

 if (!error && data) {
 return data;
 }
 } catch (rpcErr) {
 console.warn("[admin-catalog] RPC create_product_transaction_v1 falhou ou não existe, usando fallback direto:", rpcErr);
 }

 // 2. Fallback resiliente direto nas tabelas relacionais
 let organizationId = "00000000-0000-0000-0000-000000000001";
 try {
 const { data: storeData } = await db
 .from("stores")
 .select("id, organization_id")
 .eq("id", effectiveStoreId)
 .single();
 if (storeData?.organization_id) {
 organizationId = storeData.organization_id;
 }
 } catch {
 // Utiliza organizationId padrão
 }

 const { data: insertedProduct, error: insertError } = await db
 .from("products")
 .insert({
 organization_id: organizationId,
 store_id: effectiveStoreId,
 type_id: input.type_id || null,
 title: input.title,
 slug: input.slug,
 description: input.description || null,
 short_description: input.short_description || null,
 status: input.status || "draft",
 brand: input.brand || null,
 price_cents: input.price_cents,
 compare_at_cents: input.compare_at_cents || null,
 cost_cents: input.cost_cents || null,
 attributes: input.attributes || {},
 options: input.options || null,
 is_physical: input.is_physical ?? true,
 weight_kg: input.weight_kg || null,
 width_cm: input.width_cm || null,
 height_cm: input.height_cm || null,
 length_cm: input.length_cm || null,
 preparation_time_days: input.preparation_time_days || null,
 show_stock_publicly: input.show_stock_publicly ?? false,
 })
 .select()
 .single();

 if (insertError || !insertedProduct) {
 console.error("[admin-catalog] insert product fallback error:", insertError);
 throw new Error(insertError?.message || "Erro ao salvar produto no catálogo.");
 }

 const productId = insertedProduct.id;

 // Insere imagens na product_media se houver
 if (input.media_urls && input.media_urls.length > 0) {
 try {
 const mediaRows = input.media_urls.map((url, idx) => ({
 product_id: productId,
 url,
 position: idx,
 is_cover: idx === 0,
 }));
 await db.from("product_media").insert(mediaRows);
 } catch {
 // Ignora erro de mídia no fallback
 }
 }

 // Insere categorias se houver
 if (input.category_ids && input.category_ids.length > 0) {
 try {
 const catRows = input.category_ids.map((catId) => ({
 product_id: productId,
 category_id: catId,
 }));
 await db.from("product_categories").insert(catRows);
 } catch (catErr) {
 console.warn("[admin-catalog] Erro ao associar categorias:", catErr);
 }
 }

 // Insere grupos de opções / adicionais se houver
 if (input.option_group_ids && input.option_group_ids.length > 0) {
 try {
 const optRows = input.option_group_ids.map((groupId, idx) => ({
 product_id: productId,
 option_group_id: groupId,
 sort_order: idx,
 }));
 await db.from("product_option_groups").insert(optRows);
 } catch (err) {
 console.warn("[admin-catalog] Erro ao associar option_groups:", err);
 }
 }

 // Insere variantes ou variante default (Integridade Canônica de Schema: stock_on_hand)
	if (input.variants && input.variants.length > 0) {
		try {
			const variantRows = input.variants.map((v) => ({
				product_id: productId,
				sku: v.sku,
				attributes: v.attributes || {},
				price_override_cents: v.price_override_cents || null,
				stock_on_hand: v.stock || 0,
				image_url: v.image_url || null,
			}));
			const { error: varErr } = await db.from("product_variants").insert(variantRows);
			if (varErr) {
				console.error("[admin-catalog] Erro ao inserir variantes de produto:", varErr);
			}
		} catch (err) {
			console.error("[admin-catalog] Exceção ao processar variantes:", err);
		}
	} else {
		try {
			const { error: defaultVarErr } = await db.from("product_variants").insert({
				product_id: productId,
				sku: `${input.slug}-default`,
				attributes: {},
				stock_on_hand: 10,
				price_override_cents: null,
			});
			if (defaultVarErr) {
				console.error("[admin-catalog] Erro ao inserir variante default:", defaultVarErr);
			}
		} catch (err) {
			console.error("[admin-catalog] Exceção ao inserir variante default:", err);
		}
	}

	return insertedProduct;
}

export const createProduct = createServerFn({ method: "POST" })
 .validator(
 z.object({
 type_id: z.string().uuid().optional().nullable(),
 title: z.string().min(1).max(300),
 slug: z.string().regex(/^[a-z0-9-]+$/),
 description: z.string().optional().nullable(),
 short_description: z.string().optional().nullable(),
 manufacturer: z.string().optional().nullable(),
 ean: z.string().optional().nullable(),
 meta_title: z.string().optional().nullable(),
 meta_description: z.string().optional().nullable(),
 status: z.enum(["draft", "published", "archived"]).default("draft"),
 brand: z.string().optional().nullable(),
 price_cents: z.number().int().min(0),
 compare_at_cents: z.number().int().min(0).optional().nullable(),
 cost_cents: z.number().int().min(0).optional().nullable(),
 attributes: z.record(z.unknown()).default({}), // Dynamic fields based on type
 options: z.unknown().optional(),
 is_physical: z.boolean().default(true).optional(),
 weight_kg: z.number().min(0).optional().nullable(),
 width_cm: z.number().min(0).optional().nullable(),
 height_cm: z.number().min(0).optional().nullable(),
 length_cm: z.number().min(0).optional().nullable(),
 preparation_time_days: z.number().int().min(0).optional().nullable(),
 show_stock_publicly: z.boolean().default(false).optional(),
 media_urls: z.array(z.string().url()).optional(),
 category_ids: z.array(z.string().uuid()).optional(),
 option_group_ids: z.array(z.string().uuid()).optional(),
 variants: z
 .array(
 z.object({
 sku: z.string().min(1),
 attributes: z.record(z.unknown()).default({}),
 price_override_cents: z.number().int().min(0).optional().nullable(),
 stock: z.number().int().min(0).default(0),
 image_url: z.string().optional().nullable(),
 allow_backorder: z.boolean().optional(),
 backorder_lead_time_days: z.number().int().min(0).optional(),
 requires_payment_for_backorder: z.boolean().optional(),
 }),
 )
 .optional(),
 }),
 )
 .handler(async ({ data: input }) => {
 try {
 await requireAdmin(); // SECURITY FIX
 const data = await _createProduct(input);
 return data;
 } catch (e: unknown) {
 console.error("[admin-catalog] createProduct error:", e);
 throw new Error(
 e instanceof Error
 ? e instanceof Error
 ? e.message
 : String(e)
 : "Erro ao criar produto.",
 );
 }
 });

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export async function _listCategories(store_id?: string) {
 const db = getServerClient();

 let query = db
 .from("categories")
 .select("id, name, slug, status, sort_order, parent_id")
 .order("sort_order", { ascending: true });

 if (store_id) {
 query = query.eq("store_id", store_id);
 }

 const { data, error } = await query;
 if (error) throw error;
 return data;
}

export const listCategories = createServerFn({ method: "GET" }).handler(async () => {
 try {
 await requireAdmin(); // SECURITY FIX
 const { getServerIdentity } = await import("@/lib/server-access");
 const { store_id } = await getServerIdentity().catch(() => ({ store_id: null }));
 const data = await _listCategories(store_id || undefined);
 return data;
 } catch (e) {
 if (e instanceof SupabaseUnconfiguredError) throw e;
 console.error("[admin-catalog] listCategories error:", e);
 throw new Error("Erro ao listar categorias.");
 }
});

export async function _createCategory(input: {
 name: string;
 slug: string;
 parent_id?: string | null;
 status: "active" | "inactive";
 cover_url?: string | null;
 custom_icon_url?: string | null;
 icon_url?: string | null;
 icon_name?: string | null;
}) {
 const db = getServerClient();

 const { getServerIdentity } = await import("@/lib/server-access");
 const { store_id } = await getServerIdentity();
 if (!store_id) throw new Error("No store found");
 const storeData = { id: store_id };
 if (!storeData) throw new Error("No store found");

 const { data, error } = await db
 .from("categories")
 .insert({
 store_id: storeData.id,
 ...input,
 })
 .select()
 .single();

 if (error) throw error;
 return data;
}

export const createCategory = createServerFn({ method: "POST" })
 .validator(
 z.object({
 name: z.string().min(1).max(100),
 slug: z.string().regex(/^[a-z0-9-]+$/),
 parent_id: z.string().uuid().optional().nullable(),
 status: z.enum(["active", "inactive"]).default("active"),
 cover_url: z.string().optional().nullable(),
 custom_icon_url: z.string().optional().nullable(),
 icon_url: z.string().optional().nullable(),
 icon_name: z.string().optional().nullable(),
 }),
 )
 .handler(async ({ data: input }) => {
 try {
 await requireAdmin(); // SECURITY FIX
 const data = await _createCategory(input);
 return data;
 } catch (e: unknown) {
 console.error("[admin-catalog] createCategory error:", e);
 throw new Error(
 e instanceof Error
 ? e instanceof Error
 ? e.message
 : String(e)
 : "Erro ao criar categoria.",
 );
 }
 });

export async function _getCategoryById(id: string) {
 const db = getServerClient();
 const { data, error } = await db.from("categories").select("*").eq("id", id).single();
 if (error) throw error;
 return data;
}

export const getCategoryById = createServerFn({ method: "GET" })
 .validator(z.object({ id: z.string().uuid() }))
 .handler(async ({ data: { id } }) => {
 try {
 await requireAdmin(); // SECURITY FIX
 const data = await _getCategoryById(id);
 return data;
 } catch (e) {
 if (e instanceof SupabaseUnconfiguredError) throw e;
 console.error("[admin-catalog] getCategoryById error:", e);
 throw new Error("Erro ao buscar categoria.");
 }
 });

export async function _updateCategory(input: {
 id: string;
 name?: string;
 slug?: string;
 parent_id?: string | null;
 status?: "active" | "inactive" | "archived";
 cover_url?: string | null;
}) {
 const db = getServerClient();
 const { id, ...updates } = input;
 const { data, error } = await db
 .from("categories")
 .update(updates)
 .eq("id", id)
 .select()
 .single();
 if (error) throw error;
 return data;
}

export const updateCategory = createServerFn({ method: "POST" })
 .validator(
 z.object({
 id: z.string().uuid(),
 name: z.string().min(1).max(100).optional(),
 slug: z
 .string()
 .regex(/^[a-z0-9-]+$/)
 .optional(),
 parent_id: z.string().uuid().optional().nullable(),
 status: z.enum(["active", "inactive", "archived"]).optional(),
 cover_url: z.string().url().optional().nullable(),
 }),
 )
 .handler(async ({ data: input }) => {
 try {
 await requireAdmin(); // SECURITY FIX
 const data = await _updateCategory(input);
 return data;
 } catch (e: unknown) {
 console.error("[admin-catalog] updateCategory error:", e);
 throw new Error(
 e instanceof Error
 ? e instanceof Error
 ? e.message
 : String(e)
 : "Erro ao atualizar categoria.",
 );
 }
 });

// ---------------------------------------------------------------------------
// Collections
// ---------------------------------------------------------------------------

export async function _listCollections(store_id?: string) {
 const db = getServerClient();

 let query = db
 .from("collections")
 .select("id, name, slug, status, sort_order")
 .order("sort_order", { ascending: true });

 if (store_id) {
 query = query.eq("store_id", store_id);
 }

 const { data, error } = await query;
 if (error) throw error;
 return data;
}

export const listCollections = createServerFn({ method: "GET" }).handler(async () => {
 try {
 await requireAdmin(); // SECURITY FIX
 const { getServerIdentity } = await import("@/lib/server-access");
 const { store_id } = await getServerIdentity().catch(() => ({ store_id: null }));
 const data = await _listCollections(store_id || undefined);
 return data;
 } catch (e) {
 if (e instanceof SupabaseUnconfiguredError) throw e;
 console.error("[admin-catalog] listCollections error:", e);
 throw new Error("Erro ao listar coleções.");
 }
});

export async function _createCollection(input: {
 name: string;
 slug: string;
 status: "active" | "inactive";
 description?: string | null;
 cover_url?: string | null;
 rules?: Record<string, any> | null;
}) {
 const db = getServerClient();

 const { getServerIdentity } = await import("@/lib/server-access");
 const { store_id } = await getServerIdentity();
 if (!store_id) throw new Error("No store found");
 const storeData = { id: store_id };

 const { rules, ...collectionPayload } = input;

 const { data, error } = await db
 .from("collections")
 .insert({
 store_id: storeData.id,
 ...collectionPayload,
 })
 .select()
 .single();

 if (error) throw error;
 return data;
}

export const createCollection = createServerFn({ method: "POST" })
 .validator(
 z.object({
 name: z.string().min(1).max(100),
 slug: z.string().regex(/^[a-z0-9-]+$/),
 status: z.enum(["active", "inactive"]).default("active"),
 description: z.string().optional().nullable(),
 cover_url: z.string().optional().nullable(),
 rules: z.record(z.any()).optional().nullable(),
 }),
 )
 .handler(async ({ data: input }) => {
 try {
 await requireAdmin(); // SECURITY FIX
 const data = await _createCollection(input);
 return data;
 } catch (e: unknown) {
 console.error("[admin-catalog] createCollection error:", e);
 throw new Error(
 e instanceof Error
 ? e instanceof Error
 ? e.message
 : String(e)
 : "Erro ao criar coleção.",
 );
 }
 });

export async function _getCollectionById(id: string) {
 const db = getServerClient();
 const { data, error } = await db.from("collections").select("*").eq("id", id).single();
 if (error) throw error;
 return data;
}

export const getCollectionById = createServerFn({ method: "GET" })
 .validator(z.object({ id: z.string().uuid() }))
 .handler(async ({ data: { id } }) => {
 try {
 await requireAdmin(); // SECURITY FIX
 const data = await _getCollectionById(id);
 return data;
 } catch (e) {
 if (e instanceof SupabaseUnconfiguredError) throw e;
 console.error("[admin-catalog] getCollectionById error:", e);
 throw new Error("Erro ao buscar coleção.");
 }
 });

export async function _updateCollection(input: {
 id: string;
 name?: string;
 slug?: string;
 status?: "active" | "inactive" | "archived";
 description?: string | null;
 cover_url?: string | null;
 rules?: any;
}) {
 const db = getServerClient();
 const { id, rules, ...rawUpdates } = input;
 const updates: Record<string, any> = { ...rawUpdates };
 if (updates.status === "archived") {
 updates.status = "inactive";
 }
 const { data, error } = await db
 .from("collections")
 .update(updates)
 .eq("id", id)
 .select()
 .single();
 if (error) throw error;
 return data;
}

export const updateCollection = createServerFn({ method: "POST" })
 .validator(
 z.object({
 id: z.string().uuid(),
 name: z.string().min(1).max(100).optional(),
 slug: z
 .string()
 .regex(/^[a-z0-9-]+$/)
 .optional(),
 status: z.enum(["active", "inactive", "archived"]).optional(),
 description: z.string().optional().nullable(),
 cover_url: z.string().optional().nullable(),
 rules: z.record(z.any()).optional().nullable(),
 }),
 )
 .handler(async ({ data: input }) => {
 try {
 await requireAdmin(); // SECURITY FIX
 const data = await _updateCollection(input);
 return data;
 } catch (e: unknown) {
 console.error("[admin-catalog] updateCollection error:", e);
 throw new Error(
 e instanceof Error
 ? e instanceof Error
 ? e.message
 : String(e)
 : "Erro ao atualizar coleção.",
 );
 }
 });

// ---------------------------------------------------------------------------
// Product Edit & Variants
// ---------------------------------------------------------------------------

export async function _getProductById(id: string) {
 const db = getServerClient();

 const { data, error } = await db
 .from("products")
 .select(
 `
 *,
 product_variants (*),
 product_media (*),
 product_categories (category_id),
 product_option_groups (option_group_id, sort_order, option_groups (*)),
 product_types (id, name, field_schema)
 `,
 )
 .eq("id", id)
 .single();

 if (error) throw error;
 return data;
}

export const getProductById = createServerFn({ method: "POST" })
 .validator(z.object({ id: z.string().uuid() }))
 .handler(async ({ data: { id } }) => {
 try {
 await requireAdmin(); // SECURITY FIX
 const data = await _getProductById(id);
 return data;
 } catch (e) {
 if (e instanceof SupabaseUnconfiguredError) throw e;
 console.error("[admin-catalog] getProductById error:", e);
 throw new Error("Erro ao buscar produto.");
 }
 });

export async function _updateProduct(input: {
 id: string;
 title?: string;
 description?: string | null;
 short_description?: string | null;
 manufacturer?: string | null;
 ean?: string | null;
 meta_title?: string | null;
 meta_description?: string | null;
 status?: "draft" | "published" | "archived";
 brand?: string | null;
 price_cents?: number;
 compare_at_cents?: number | null;
 cost_cents?: number | null;
 attributes?: Record<string, any>;
 is_physical?: boolean;
 weight_kg?: number | null;
 width_cm?: number | null;
 height_cm?: number | null;
 length_cm?: number | null;
 preparation_time_days?: number | null;
 preparation_time_minutes?: number | null;
 type_id?: string | null;
 show_stock_publicly?: boolean;
 category_ids?: string[];
 option_group_ids?: string[];
 options?: any;
 variants?: {
 id?: string;
 sku?: string;
 attributes: Record<string, any>;
 price_cents?: number | null;
 price_override_cents?: number | null;
 stock: number;
 image_url?: string | null;
 }[];
}) {
 const db = getServerClient();
 const { getServerIdentity } = await import("@/lib/server-access");
 const { store_id } = await getServerIdentity();
 if (!store_id) throw new Error("Acesso não autorizado.");

 const { id, category_ids, option_group_ids, variants, ...updates } = input;

 // Garantir que a atualização só ocorre no tenant correto
 const { data, error } = await db
 .from("products")
 .update(updates)
 .eq("id", id)
 .eq("store_id", store_id)
 .select()
 .single();

 if (error) throw error;

 if (category_ids !== undefined) {
 await db.from("product_categories").delete().eq("product_id", id);
 if (category_ids.length > 0) {
 const catRecords = category_ids.map((cid) => ({
 product_id: id,
 category_id: cid,
 }));
 await db.from("product_categories").insert(catRecords);
 }
 }

 // Sincroniza grupos de opções / adicionais se fornecidos
 if (input.option_group_ids !== undefined) {
 try {
 await db.from("product_option_groups").delete().eq("product_id", id);
 if (input.option_group_ids.length > 0) {
 const optRows = input.option_group_ids.map((groupId, idx) => ({
 product_id: id,
 option_group_id: groupId,
 sort_order: idx,
 }));
 await db.from("product_option_groups").insert(optRows);
 }
 } catch (err) {
 console.warn("[admin-catalog] Erro ao sincronizar option_groups:", err);
 }
 }

 // Sincroniza a matriz de variantes se fornecida
 if (variants && variants.length > 0) {
 const matrix = variants.map((v) => ({
 attributes: v.attributes,
 stock: v.stock,
 // price_override_cents null = herança canônica do preço base do produto
 // nunca usar price_cents como fallback — isso quebraria a herança dinâmica
 price_override_cents: v.price_override_cents ?? null,
 }));
 await _batchUpsertVariantMatrix({
 product_id: id,
 matrix,
 });
 }

 return data;
}

export const updateProduct = createServerFn({ method: "POST" })
 .validator(
 z.object({
 id: z.string().uuid(),
 title: z.string().min(1).max(300).optional(),
 slug: z.string().optional(),
 description: z.string().optional().nullable(),
 short_description: z.string().optional().nullable(),
 manufacturer: z.string().optional().nullable(),
 ean: z.string().optional().nullable(),
 meta_title: z.string().optional().nullable(),
 meta_description: z.string().optional().nullable(),
 status: z.enum(["draft", "published", "archived"]).optional(),
 brand: z.string().optional().nullable(),
 price_cents: z.number().int().min(0).optional(),
 compare_at_cents: z.number().int().min(0).optional().nullable(),
 cost_cents: z.number().int().min(0).optional().nullable(),
 attributes: z.record(z.unknown()).optional(),
 is_physical: z.boolean().optional(),
 weight_kg: z.number().min(0).optional().nullable(),
 width_cm: z.number().min(0).optional().nullable(),
 height_cm: z.number().min(0).optional().nullable(),
 length_cm: z.number().min(0).optional().nullable(),
 preparation_time_days: z.number().int().min(0).optional().nullable(),
 preparation_time_minutes: z.number().int().min(0).optional().nullable(),
 type_id: z.string().uuid().optional().nullable(),
 show_stock_publicly: z.boolean().optional(),
 category_ids: z.array(z.string().uuid()).optional(),
 option_group_ids: z.array(z.string().uuid()).optional(),
 options: z.unknown().optional(),
 variants: z
 .array(
 z.object({
 id: z.string().uuid().optional(),
 sku: z.string().optional(),
 attributes: z.record(z.unknown()).default({}),
 price_cents: z.number().int().min(0).optional().nullable(),
 price_override_cents: z.number().int().min(0).optional().nullable(),
 stock: z.number().int().min(0).default(0),
 image_url: z.string().url().optional().nullable(),
 }),
 )
 .optional(),
 }),
 )
 .handler(async ({ data: input }) => {
 try {
 await requireAdmin(); // SECURITY FIX
 const data = await _updateProduct(input);
 return data;
 } catch (e: unknown) {
 console.error("[admin-catalog] updateProduct error:", e);
 throw new Error(
 e instanceof Error
 ? e instanceof Error
 ? e.message
 : String(e)
 : "Erro ao atualizar produto.",
 );
 }
 });

export async function _upsertProductVariant(input: {
 id?: string;
 product_id: string;
 sku: string;
 barcode?: string | null;
 status: "active" | "inactive" | "archived";
 price_override_cents?: number | null;
 cost_cents?: number | null;
 stock_alert_qty?: number | null;
 ean?: string | null;
 weight_kg?: number | null;
 width_cm?: number | null;
 height_cm?: number | null;
 length_cm?: number | null;
 display_name?: string | null;
 attributes: Record<string, any>;
}) {
 const db = getServerClient();
 const { id, product_id, ...payload } = input;

 const query = db.from("product_variants");

 // -- CONTRACT SHIELD START --
 // Clean attributes
 const cleanAttrs: Record<string, string> = {};
 for (const [k, v] of Object.entries(payload.attributes || {})) {
 cleanAttrs[k.trim()] = String(v).trim();
 }
 payload.attributes = cleanAttrs;

 // Get existing variants
 const { data: existingVariants, error: fetchError } = await db
 .from("product_variants")
 .select("id, attributes")
 .eq("product_id", product_id);

 if (fetchError) throw fetchError;

 const otherVariants = existingVariants.filter((v: any) => v.id !== id);

 if (otherVariants.length > 0) {
 // We intentionally allow incoming variants to have different keys than existing variants.
 // This allows the store owner to add a new option (e.g. "Material") without breaking the system.
 // Obsolete variants that lack the new dimension will be archived by batchUpsertVariantMatrix.

 const incomingComboStr = Object.keys(cleanAttrs)
 .sort()
 .map((k) => `${k}=${cleanAttrs[k]}`)
 .join("|");

 for (const ov of otherVariants) {
 const ovComboStr = Object.keys(ov.attributes || {})
 .sort()
 .map((k) => `${k}=${ov.attributes[k]}`)
 .join("|");
 if (ovComboStr === incomingComboStr) {
 throw new Error(
 "Conflito de Matriz: Já existe outra variante neste produto com esta mesma combinação exata de atributos.",
 );
 }
 }
 }
 // -- CONTRACT SHIELD END --

 let result;

 if (id) {
 result = await query.update(payload).eq("id", id).select().single();
 } else {
 result = await query
 .insert({ product_id, ...payload })
 .select()
 .single();
 }

 if (result.error) throw result.error;
 return result.data;
}

export const upsertProductVariant = createServerFn({ method: "POST" })
 .validator(
 z.object({
 id: z.string().uuid().optional(),
 product_id: z.string().uuid(),
 sku: z.string().min(1),
 barcode: z.string().optional().nullable(),
 status: z.enum(["active", "inactive", "archived"]).default("active"),
 price_override_cents: z.number().int().min(0).optional().nullable(),
 cost_cents: z.number().int().min(0).optional().nullable(),
 stock_alert_qty: z.number().int().min(0).optional().nullable(),
 ean: z.string().optional().nullable(),
 weight_kg: z.number().min(0).optional().nullable(),
 width_cm: z.number().min(0).optional().nullable(),
 height_cm: z.number().min(0).optional().nullable(),
 length_cm: z.number().min(0).optional().nullable(),
 display_name: z.string().optional().nullable(),
 attributes: z.record(z.unknown()).default({}),
 }),
 )
 .handler(async ({ data: input }) => {
 try {
 await requireAdmin(); // SECURITY FIX
 const data = await _upsertProductVariant(input);
 return data;
 } catch (e: unknown) {
 console.error("[admin-catalog] upsertProductVariant error:", e);
 throw new Error(
 e instanceof Error
 ? e instanceof Error
 ? e.message
 : String(e)
 : "Erro ao salvar variante.",
 );
 }
 });
export async function _batchUpsertVariantMatrix(input: {
 product_id: string;
 matrix: {
 id?: string;
 sku?: string;
 ean?: string | null;
 attributes: Record<string, string>;
 price_override_cents?: number | null;
 cost_cents?: number | null;
 weight_kg?: number | null;
 stock: number;
 original_stock?: number;
 image_url?: string | null;
 status?: string;
 allow_backorder?: boolean;
 backorder_lead_time_days?: number;
 requires_payment_for_backorder?: boolean;
 }[];
}) {
 const db = getServerClient();
 const { getServerIdentity } = await import("@/lib/server-access");

 // FIX: Multi-tenant security check enforcement
 const { store_id } = await getServerIdentity();
 if (!store_id) throw new Error("Acesso não autorizado.");

 const { data, error } = await db.rpc("batch_upsert_variant_matrix_v5", {
 store_id_param: store_id,
 product_id_param: input.product_id,
 matrix: input.matrix,
 });

 if (error) {
 console.error("[admin-catalog] batchUpsertVariantMatrix RPC error:", error);
 throw new Error(
 (error instanceof Error ? error.message : String(error)) ||
 "Erro atômico ao atualizar matriz.",
 );
 }

 return data;
}

export const batchUpsertVariantMatrix = createServerFn({ method: "POST" })
 .validator(
 z.object({
 product_id: z.string().uuid(),
 matrix: z.array(
 z.object({
 id: z.string().uuid().optional(),
 sku: z.string().optional(),
 attributes: z.record(z.string()),
 price_override_cents: z.number().int().min(0).optional().nullable(),
 stock: z.number().int().min(0).default(0),
 original_stock: z.number().int().min(0).optional(),
 cost_cents: z.number().int().min(0).optional().nullable(),
 weight_kg: z.number().min(0).optional().nullable(),
 ean: z.string().optional().nullable(),
 image_url: z.string().nullable().optional(),
 status: z.enum(["active", "inactive", "archived"]).optional(),
 allow_backorder: z.boolean().optional(),
 backorder_lead_time_days: z.number().int().min(0).optional(),
 requires_payment_for_backorder: z.boolean().optional(),
 }),
 ),
 }),
 )
 .handler(async ({ data: input }) => {
 try {
 await requireAdmin(); // SECURITY FIX
 return await _batchUpsertVariantMatrix(input);
 } catch (e: unknown) {
 console.error("[admin-catalog] batchUpsertVariantMatrix error:", e);
 throw new Error(
 e instanceof Error
 ? e instanceof Error
 ? e.message
 : String(e)
 : "Erro ao salvar matriz de variações.",
 );
 }
 });

export const updateProductMediaMetadata = createServerFn({ method: "POST" })
 .validator(
 z.object({
 id: z.string().uuid(),
 alt: z.string().optional().nullable(),
 variant_id: z.string().uuid().optional().nullable(),
 media_type: z.enum(["image", "video"]).default("image"),
 sort_order: z.number().int().optional(),
 }),
 )
 .handler(async ({ data }) => {
 try {
 await requireAdmin(); // SECURITY FIX
 const db = getServerClient();
 const { id, ...updates } = data;
 const { error } = await db.from("product_media").update(updates).eq("id", id);
 if (error) throw error;
 return { status: "success" as const };
 } catch (e: unknown) {
 console.error(
 "[admin-catalog] updateProductMediaMetadata error:",
 e instanceof Error ? e.message : String(e),
 );
 throw new Error(
 (e instanceof Error ? e.message : String(e)) || "Erro ao atualizar metadados da mídia.",
 );
 }
 });

export const reorderProductMedia = createServerFn({ method: "POST" })
 .validator(
 z.object({
 mediaOrders: z.array(
 z.object({
 id: z.string().uuid(),
 sort_order: z.number().int(),
 }),
 ),
 }),
 )
 .handler(async ({ data: { mediaOrders } }) => {
 try {
 await requireAdmin(); // SECURITY FIX
 const db = getServerClient();

 for (const item of mediaOrders) {
 const { error } = await db
 .from("product_media")
 .update({ sort_order: item.sort_order })
 .eq("id", item.id);
 if (error) throw error;
 }

 return { status: "success" as const };
 } catch (e: unknown) {
 console.error(
 "[admin-catalog] reorderProductMedia error:",
 e instanceof Error ? e.message : String(e),
 );
 throw new Error((e instanceof Error ? e.message : String(e)) || "Erro ao reordenar mídias.");
 }
 });

export async function _getOnboardingProgress() {
 const db = getServerClient();

 // Fetch store
 const { data: store } = await db
 .from("stores")
 .select("id, name, settings")
 .limit(1)
 .maybeSingle();

 // Step 1: Store data config (is settings empty?)
 const storeDone = store ? Object.keys(store.settings ?? {}).length > 0 : false;

 // Step 2: Theme Settings / Identidade visual
 const { count: themeCount } = await db
 .from("theme_settings")
 .select("*", { count: "exact", head: true });
 const themeDone = (themeCount ?? 0) > 0;

 // Step 3: Products
 const { count: productsCount } = await db
 .from("products")
 .select("*", { count: "exact", head: true });
 const productsDone = (productsCount ?? 0) > 0;

 // Step 4: Shipping table
 const { count: shippingCount } = await db
 .from("shipping_rates")
 .select("*", { count: "exact", head: true });
 const shippingDone = (shippingCount ?? 0) > 0;

 // Step 5: Payments (Integration credentials for payment providers)
 const { count: paymentCount } = await db
 .from("integration_credentials")
 .select("*", { count: "exact", head: true })
 .in("provider", ["mercado_pago", "asaas", "custom_pix"]);
 const paymentsDone = (paymentCount ?? 0) > 0;

 // Step 6: CMS pages
 const { count: pagesCount } = await db.from("pages").select("*", { count: "exact", head: true });
 const cmsDone = (pagesCount ?? 0) > 0;

 return {
 storeDone,
 themeDone,
 productsDone,
 shippingDone,
 paymentsDone,
 cmsDone,
 };
}

export const getOnboardingProgress = createServerFn({ method: "GET" }).handler(async () => {
 try {
 await requireAdmin(); // SECURITY FIX
 const data = await _getOnboardingProgress();
 return {
 status: "ok" as const,
 data,
 };
 } catch (e: unknown) {
 if (
 (e as any).code === "supabase_unconfigured" ||
 (e instanceof Error ? e.message : String(e))?.includes("unconfigured")
 ) {
 return { status: "unconfigured" as const };
 }
 console.error("[admin-catalog] getOnboardingProgress error:", e);
 throw new Error(
 (e instanceof Error ? e.message : String(e)) || "Erro ao carregar progresso de onboarding.",
 );
 }
});

export async function _deleteProductMedia(input: { id: string; url: string }) {
 const db = getServerClient();
 const { id, url } = input;

 const { error: dbError } = await db.from("product_media").delete().eq("id", id);
 if (dbError) throw dbError;

 const pathMatches = url.match(/product-media\/(.*)$/);
 if (pathMatches && pathMatches[1]) {
 const { error: storageError } = await db.storage.from("product-media").remove([pathMatches[1]]);
 if (storageError) console.error("Storage delete error:", storageError);
 }

 return { status: "success" as const };
}

export const deleteProductMedia = createServerFn({ method: "POST" })
 .validator(z.object({ id: z.string().uuid(), url: z.string().url() }))
 .handler(async ({ data: input }) => {
 try {
 await requireAdmin(); // SECURITY FIX
 return await _deleteProductMedia(input);
 } catch (e: unknown) {
 throw new Error((e instanceof Error ? e.message : String(e)) || "Erro ao deletar mídia.");
 }
 });

export async function _addProductMediaLink(input: {
 product_id: string;
 url: string;
 variant_id?: string | null;
}) {
 const db = getServerClient();
 const { product_id, url, variant_id } = input;

 const { data, error } = await db
 .from("product_media")
 .insert({
 product_id,
 url,
 variant_id: variant_id || null,
 sort_order: 99,
 })
 .select()
 .single();

 if (error) throw error;
 return data;
}

export const addProductMediaLink = createServerFn({ method: "POST" })
 .validator(
 z.object({
 product_id: z.string().uuid(),
 url: z.string().url(),
 variant_id: z.string().uuid().optional().nullable(),
 }),
 )
 .handler(async ({ data: input }) => {
 try {
 await requireAdmin(); // SECURITY FIX
 const data = await _addProductMediaLink(input);
 return data;
 } catch (e: unknown) {
 throw new Error((e instanceof Error ? e.message : String(e)) || "Erro ao vincular mídia");
 }
 });

export async function _toggleProductCollection(input: {
 productId: string;
 collectionId?: string;
 collectionSlug?: string;
 add?: boolean;
}) {
 const db = getServerClient();
 const { productId, collectionId, collectionSlug, add = true } = input;

 let targetCollectionId = collectionId;

 if (!targetCollectionId && collectionSlug) {
 const { data: col, error: colErr } = await db
 .from("collections")
 .select("id")
 .eq("slug", collectionSlug)
 .single();

 if (colErr || !col) {
 throw new Error("Coleção não encontrada com o slug fornecido");
 }
 targetCollectionId = col.id;
 }

 if (!targetCollectionId) {
 throw new Error("Identificador de coleção (id ou slug) é obrigatório");
 }

 if (add) {
 const { error } = await db.from("product_collections").upsert(
 {
 product_id: productId,
 collection_id: targetCollectionId,
 },
 { onConflict: "product_id,collection_id" },
 );
 if (error) throw error;
 } else {
 const { error } = await db
 .from("product_collections")
 .delete()
 .eq("product_id", productId)
 .eq("collection_id", targetCollectionId);
 if (error) throw error;
 }

 return { status: "success" as const };
}

export const toggleProductCollection = createServerFn({ method: "POST" })
 .validator(
 z.object({
 productId: z.string().uuid(),
 collectionId: z.string().uuid().optional(),
 collectionSlug: z.string().optional(),
 add: z.boolean().optional(),
 }),
 )
 .handler(
 async ({
 data: input,
 }): Promise<{ status: "success" } | { status: "error"; message: string }> => {
 try {
 await requireAdmin(); // SECURITY FIX
 return await _toggleProductCollection(input);
 } catch (e: unknown) {
 console.error("[admin-catalog] toggleProductCollection error:", e);
 return {
 status: "error" as const,
 message: (e instanceof Error ? e.message : String(e)) || "Erro ao vincular coleção",
 };
 }
 },
 );

// ---------------------------------------------------------------------------
// Ações de Gestão em Lote e Duplicação de Produtos
// ---------------------------------------------------------------------------

export async function _duplicateProduct(productId: string) {
 const db = getServerClient();
 const { getServerIdentity } = await import("@/lib/server-access");
 const { store_id } = await getServerIdentity();
 if (!store_id) throw new Error("Acesso não autorizado.");

 const { data: original, error } = await db
 .from("products")
 .select(
 `
 *,
 product_variants (*),
 product_media (*),
 product_categories (category_id)
 `,
 )
 .eq("id", productId)
 .eq("store_id", store_id)
 .single();

 if (error || !original) throw new Error("Produto original não encontrado para duplicação");

 const timestamp = Date.now();
 const newTitle = `${original.title} (Cópia)`;
 const newSlug = `${original.slug}-copia-${timestamp}`;

 const {
 id: _,
 created_at: __,
 updated_at: ___,
 product_variants,
 product_media,
 product_categories,
 ...restProduct
 } = original;

 const { data: duplicate, error: dupError } = await db
 .from("products")
 .insert({
 ...restProduct,
 title: newTitle,
 slug: newSlug,
 status: "draft",
 })
 .select()
 .single();

 if (dupError) throw dupError;

 if (original.product_categories && original.product_categories.length > 0) {
 const catRecords = original.product_categories.map((c: any) => ({
 product_id: duplicate.id,
 category_id: c.category_id,
 }));
 await db.from("product_categories").insert(catRecords);
 }

 if (original.product_media && original.product_media.length > 0) {
 const mediaRecords = original.product_media.map((m: any) => ({
 product_id: duplicate.id,
 url: m.url,
 alt: m.alt,
 sort_order: m.sort_order,
 }));
 await db.from("product_media").insert(mediaRecords);
 }

 if (original.product_variants && original.product_variants.length > 0) {
 for (const v of original.product_variants) {
 await db.from("product_variants").insert({
 product_id: duplicate.id,
 sku: `${v.sku}-CP${timestamp.toString().slice(-4)}`,
 price_override_cents: v.price_override_cents,
 attributes: v.attributes,
 stock_on_hand: 0,
 });
 }
 }

 return duplicate;
}

export const duplicateProduct = createServerFn({ method: "POST" })
 .validator(z.object({ productId: z.string().uuid() }))
 .handler(async ({ data: { productId } }) => {
 try {
 await requireAdmin(); // SECURITY FIX
 const data = await _duplicateProduct(productId);
 return data;
 } catch (e: unknown) {
 console.error("[admin-catalog] duplicateProduct error:", e);
 throw new Error(
 e instanceof Error
 ? e instanceof Error
 ? e.message
 : String(e)
 : "Erro ao duplicar produto.",
 );
 }
 });

export async function _toggleProductStatus(input: {
 productId: string;
 status: "draft" | "published" | "archived";
}) {
 const db = getServerClient();
 const { getServerIdentity } = await import("@/lib/server-access");
 const { store_id } = await getServerIdentity();
 if (!store_id) throw new Error("Acesso não autorizado.");

 const { data, error } = await db
 .from("products")
 .update({ status: input.status, updated_at: new Date().toISOString() })
 .eq("id", input.productId)
 .eq("store_id", store_id)
 .select()
 .single();

 if (error) throw error;
 return data;
}

export const toggleProductStatus = createServerFn({ method: "POST" })
 .validator(
 z.object({
 productId: z.string().uuid(),
 status: z.enum(["draft", "published", "archived"]),
 }),
 )
 .handler(async ({ data: input }) => {
 try {
 await requireAdmin(); // SECURITY FIX
 const data = await _toggleProductStatus(input);
 return data;
 } catch (e: unknown) {
 console.error("[admin-catalog] toggleProductStatus error:", e);
 throw new Error(
 e instanceof Error
 ? e instanceof Error
 ? e.message
 : String(e)
 : "Erro ao alterar status.",
 );
 }
 });

export async function _bulkUpdateProductStatus(input: {
 productIds: string[];
 action: "draft" | "published" | "archived" | "delete";
}) {
 const db = getServerClient();
 if (!input.productIds || input.productIds.length === 0) {
 return { count: 0 };
 }

 if (input.action === "delete") {
 const { error } = await db.from("products").delete().in("id", input.productIds);
 if (error) throw error;
 return { count: input.productIds.length };
 }

 const { error } = await db
 .from("products")
 .update({ status: input.action })
 .in("id", input.productIds);

 if (error) throw error;
 return { count: input.productIds.length };
}

export const bulkUpdateProductStatus = createServerFn({ method: "POST" })
 .validator(
 z.object({
 productIds: z.array(z.string().uuid()),
 action: z.enum(["draft", "published", "archived", "delete"]),
 }),
 )
 .handler(async ({ data: input }) => {
 try {
 await requireAdmin(); // SECURITY FIX
 const res = await _bulkUpdateProductStatus(input);
 return res;
 } catch (e: unknown) {
 console.error("[admin-catalog] bulkUpdateProductStatus error:", e);
 throw new Error(
 e instanceof Error
 ? e instanceof Error
 ? e.message
 : String(e)
 : "Erro ao executar ação em lote.",
 );
 }
 });

// ---------------------------------------------------------------------------
// Destaques (Vitrine)
// ---------------------------------------------------------------------------

export const getAdminDestaques = createServerFn({ method: "GET" }).handler(async () => {
 try {
 const { getServerIdentity } = await import("@/lib/server-access");
 const { store_id } = await getServerIdentity();
 if (!store_id) return { status: "unconfigured" as const };

 const db = getServerClient();

 // Get all published products and also their product_collections to see if they are in 'destaques'
 const { data, error } = await db
 .from("products")
 .select(
 `
 id, title, slug, price_cents, status,
 product_media(url, alt),
 product_collections(
 collections!inner(slug)
 )
 `,
 )
 .eq("store_id", store_id)
 .eq("status", "published")
 .eq("product_collections.collections.slug", "destaques")
 .order("created_at", { ascending: false });

 if (error) {
 console.error("[getAdminDestaques] Erro ao buscar destaques:", error);
 return { status: "error" as const, message: error.message };
 }

 if (!data || data.length === 0) {
 return { status: "empty" as const, data: [] };
 }

 return { status: "ok" as const, data: data || [] };
 } catch (e: unknown) {
 if (e instanceof SupabaseUnconfiguredError) throw e;
 console.error("[admin-catalog] getAdminDestaques error:", e);
 return { status: "error" as const, message: "Erro ao carregar destaques." };
 }
});

// ---------------------------------------------------------------------------
// Product Option Groups (Grupos de Opções / Adicionais)
// Tabelas: product_options + product_option_values
// Migration: 20260723150000_product_options_schema.sql
// ---------------------------------------------------------------------------

const optionGroupSchema = z.object({
 id: z.string().uuid().optional(),
 product_id: z.string().uuid(),
 internal_name: z.string().min(1, "Nome interno é obrigatório"),
 display_name: z.string().min(1, "Nome de exibição é obrigatório"),
 selection_type: z.enum(["single", "multiple"]).default("single"),
 min_selections: z.number().int().min(0).default(0),
 max_selections: z.number().int().min(1).default(1),
 is_required: z.boolean().default(false),
 sort_order: z.number().int().default(0),
});

const optionValueSchema = z.object({
 id: z.string().uuid().optional(),
 group_id: z.string().uuid(),
 label: z.string().min(1, "Rótulo é obrigatório"),
 price_modifier_cents: z.number().int().default(0),
 is_default: z.boolean().default(false),
 is_active: z.boolean().default(true),
 sort_order: z.number().int().default(0),
});

/** Lista todos os grupos de opções de um produto com seus valores */
export const listProductOptionGroups = createServerFn({ method: "GET" })
 .validator(z.object({ product_id: z.string().uuid() }))
 .handler(async ({ data: { product_id } }) => {
 try {
 await requireAdmin();
 const db = getServerClient();
 const { data, error } = await db
 .from("product_option_groups")
 .select(
 `
 product_id, option_group_id, sort_order,
 option_groups (
 id, tenant_id, internal_name, display_name, selection_type,
 min_selections, max_selections, is_required, created_at,
 option_values(
 id, group_id, label, price_modifier_cents, is_default, is_active, sort_order
 )
 )
 `,
 )
 .eq("product_id", product_id)
 .order("sort_order", { ascending: true });

 if (error) throw error;
 return data || [];
 } catch (e: unknown) {
 console.error("[admin-catalog] listProductOptionGroups error:", e);
 throw new Error("Erro ao carregar grupos de opções.");
 }
 });

/**
 * Salva toda a matriz de grupos + valores em batch (substitui e reinsere).
 * Estratégia idempotente: remove grupos antigos e reinsere todos de uma vez.
 */
export const batchSaveOptionGroups = createServerFn({ method: "POST" })
 .validator(
 z.object({
 product_id: z.string().uuid(),
 groups: z.array(
 optionGroupSchema.extend({
 values: z.array(
 z.object({
 id: z.string().uuid().optional(),
 label: z.string().min(1),
 price_modifier_cents: z.number().int().default(0),
 is_default: z.boolean().default(false),
 is_active: z.boolean().default(true),
 sort_order: z.number().int().default(0),
 }),
 ),
 }),
 ),
 }),
 )
 .handler(async ({ data: { product_id, groups } }) => {
 try {
 await requireAdmin();
 const db = getServerClient();

 // Aqui, assumimos que a UI já enviou os IDs dos option_groups globais.
 // Se não enviou, criamos o grupo global primeiro.

 await db.from("product_option_groups").delete().eq("product_id", product_id);

 for (let i = 0; i < groups.length; i++) {
 const { id, values, ...groupData } = groups[i];
 let groupId = id;

 // Se for um novo grupo (sem UUID)
 if (!groupId || groupId.length < 32) {
 const { data: newGroup, error: gErr } = await db
 .from("option_groups")
 .insert({ ...groupData })
 .select()
 .single();

 if (gErr || !newGroup) throw gErr || new Error("Erro ao criar Option Group.");
 groupId = newGroup.id;

 if (values.length > 0) {
 const { error: vErr } = await db.from("option_values").insert(
 values.map((v, vi) => ({
 group_id: groupId,
 label: v.label,
 price_modifier_cents: v.price_modifier_cents ?? 0,
 is_default: v.is_default ?? false,
 is_active: v.is_active ?? true,
 sort_order: vi,
 })),
 );
 if (vErr) throw vErr;
 }
 } else {
 // Grupo já existe. (Nesta versão simplificada não atualizamos grupos globais pela tela de produto, apenas linkamos)
 }

 // Link group to product
 await db.from("product_option_groups").insert({
 product_id,
 option_group_id: groupId,
 sort_order: i,
 });
 }

 return { success: true };
 } catch (e: unknown) {
 console.error("[admin-catalog] batchSaveOptionGroups error:", e);
 throw new Error(
 (e instanceof Error ? e.message : String(e)) || "Erro ao salvar opções do produto.",
 );
 }
 });

// ---------------------------------------------------------------------------
// Option Groups (Library / Global)
// ---------------------------------------------------------------------------

export const listOptionGroups = createServerFn({ method: "GET" }).handler(async () => {
 try {
 await requireAdmin();
 const db = getServerClient();
 const { getServerIdentity } = await import("@/lib/server-access");
 const { store_id } = await getServerIdentity();

 const { data, error } = await db
 .from("option_groups")
 .select(
 `
 id, internal_name, display_name, description, selection_type,
 min_selections, max_selections, is_required,
 created_at, updated_at,
 values:option_values(
 id, label, description, image_url, price_modifier_cents, max_quantity_per_item, is_default, is_active, sort_order
 )
 `,
 )
 .eq("store_id", store_id)
 .order("created_at", { ascending: false });

 if (error) throw error;

 // Sort values inside each group
 if (data) {
 data.forEach((group) => {
 if (group.values) {
 group.values.sort((a: any, b: any) => a.sort_order - b.sort_order);
 }
 });
 }

 return data || [];
 } catch (e) {
 console.error("[admin-catalog] listOptionGroups error:", e);
 return [];
 }
});

export const upsertOptionGroup = createServerFn({ method: "POST" })
 .validator(
 z.object({
 id: z.string().uuid().optional(),
 internal_name: z.string().min(1),
 display_name: z.string().min(1),
 description: z.string().optional().nullable(),
 selection_type: z.enum(["single", "multiple"]),
 min_selections: z.number().int().min(0),
 max_selections: z.number().int().min(1),
 is_required: z.boolean(),
 values: z.array(
 z.object({
 id: z.string().uuid().optional(),
 label: z.string().min(1),
 description: z.string().optional().nullable(),
 image_url: z.string().optional().nullable(),
 price_modifier_cents: z.number().int().default(0),
 max_quantity_per_item: z.number().int().min(1).default(1).optional(),
 is_default: z.boolean().default(false),
 is_active: z.boolean().default(true),
 sort_order: z.number().int().default(0),
 }),
 ),
 }),
 )
 .handler(async ({ data: input }) => {
 try {
 await requireAdmin();
 const db = getServerClient();
 const { getServerIdentity } = await import("@/lib/server-access");
 const { store_id } = await getServerIdentity();

 let groupId = input.id;

 const groupPayload = {
 store_id,
 internal_name: input.internal_name,
 display_name: input.display_name,
 description: input.description || null,
 selection_type: input.selection_type,
 min_selections: input.min_selections,
 max_selections: input.max_selections,
 is_required: input.is_required,
 };

 if (!groupId) {
 const { data, error } = await db
 .from("option_groups")
 .insert(groupPayload)
 .select("id")
 .single();
 if (error) throw error;
 groupId = data.id;
 } else {
 const { error } = await db
 .from("option_groups")
 .update(groupPayload)
 .eq("id", groupId)
 .eq("store_id", store_id);
 if (error) throw error;
 }

 // Sync Values
 if (input.values && input.values.length > 0) {
 const valuesToUpsert = input.values.map((v, index) => ({
 ...(v.id ? { id: v.id } : {}),
 group_id: groupId,
 label: v.label,
 description: v.description || null,
 image_url: v.image_url || null,
 price_modifier_cents: v.price_modifier_cents,
 max_quantity_per_item: v.max_quantity_per_item ?? 1,
 is_default: v.is_default,
 is_active: v.is_active,
 sort_order: v.sort_order ?? index,
 }));

 // Remove values that are not in the payload anymore
 const keepIds = input.values.map((v) => v.id).filter(Boolean) as string[];
 if (keepIds.length > 0) {
 await db
 .from("option_values")
 .delete()
 .eq("group_id", groupId)
 .not("id", "in", `(${keepIds.join(",")})`);
 } else {
 await db.from("option_values").delete().eq("group_id", groupId);
 }

 const { error: upsertErr } = await db
 .from("option_values")
 .upsert(valuesToUpsert, { onConflict: "id" });
 if (upsertErr) throw upsertErr;
 } else {
 await db.from("option_values").delete().eq("group_id", groupId);
 }

 // Busca o grupo completo para retorno atômico
 const { data: fullGroup } = await db
 .from("option_groups")
 .select(
 `
 id, internal_name, display_name, description, selection_type,
 min_selections, max_selections, is_required,
 created_at, updated_at,
 values:option_values(
 id, label, description, image_url, price_modifier_cents, max_quantity_per_item, is_default, is_active, sort_order
 )
 `,
 )
 .eq("id", groupId)
 .single();

 if (fullGroup?.values) {
 fullGroup.values.sort((a: any, b: any) => a.sort_order - b.sort_order);
 }

 return { success: true, group: fullGroup };
 } catch (e: unknown) {
 console.error("[admin-catalog] upsertOptionGroup error:", e);
 throw new Error(
 (e instanceof Error ? e.message : String(e)) || "Erro ao salvar Option Group.",
 );
 }
 });

export const deleteOptionGroup = createServerFn({ method: "POST" })
 .validator(z.object({ id: z.string().uuid() }))
 .handler(async ({ data: { id } }) => {
 try {
 await requireAdmin();
 const db = getServerClient();
 const { getServerIdentity } = await import("@/lib/server-access");
 const { store_id } = await getServerIdentity();

 const { error } = await db
 .from("option_groups")
 .delete()
 .eq("id", id)
 .eq("store_id", store_id);

 if (error) throw error;
 return { success: true };
 } catch (e: unknown) {
 console.error("[admin-catalog] deleteOptionGroup error:", e);
 throw new Error(
 (e instanceof Error ? e.message : String(e)) || "Erro ao remover Option Group.",
 );
 }
 });

export const quickUpdateOptionValue = createServerFn({ method: "POST" })
 .validator(
 z.object({
 id: z.string().uuid(),
 label: z.string().min(1).optional(),
 description: z.string().nullable().optional(),
 image_url: z.string().nullable().optional(),
 price_modifier_cents: z.number().int().optional(),
 max_quantity_per_item: z.number().int().min(1).optional(),
 is_active: z.boolean().optional(),
 }),
 )
 .handler(async ({ data: input }) => {
 try {
 await requireAdmin();
 const db = getServerClient();
 const { getServerIdentity } = await import("@/lib/server-access");
 const { store_id } = await getServerIdentity();

 // Ensure the option value belongs to an option_group of the current tenant
 const { data: optVal, error: findErr } = await db
 .from("option_values")
 .select("id, group_id, option_groups!inner(store_id)")
 .eq("id", input.id)
 .eq("option_groups.store_id", store_id)
 .single();

 if (findErr || !optVal) {
 throw new Error("Opção não encontrada ou não pertence à sua loja.");
 }

 const updateData: Record<string, any> = {};
 if (input.label !== undefined) updateData.label = input.label;
 if (input.description !== undefined) updateData.description = input.description;
 if (input.image_url !== undefined) updateData.image_url = input.image_url;
 if (input.price_modifier_cents !== undefined)
 updateData.price_modifier_cents = input.price_modifier_cents;
 if (input.max_quantity_per_item !== undefined)
 updateData.max_quantity_per_item = input.max_quantity_per_item;
 if (input.is_active !== undefined) updateData.is_active = input.is_active;

 const { error: updErr } = await db
 .from("option_values")
 .update(updateData)
 .eq("id", input.id);

 if (updErr) throw updErr;
 return { success: true };
 } catch (e: unknown) {
 console.error("[admin-catalog] quickUpdateOptionValue error:", e);
 throw new Error(
 (e instanceof Error ? e.message : String(e)) || "Erro ao atualizar valor de opção.",
 );
 }
 });

// ---------------------------------------------------------------------------
// Multi-Store Catalog / Menu Replication Engine (Franquias & Filiais)
// ---------------------------------------------------------------------------

export const replicateCatalogToStores = createServerFn({ method: "POST" })
 .validator(
 z.object({
 target_store_ids: z.array(z.string().uuid()).min(1),
 product_ids: z.array(z.string().uuid()).optional(),
 replicate_categories: z.boolean().default(true),
 replicate_option_groups: z.boolean().default(true),
 }),
 )
 .handler(async ({ data: input }) => {
 try {
 await requireAdmin();
 const db = getServerClient();
 const { getServerIdentity } = await import("@/lib/server-access");
 const { store_id } = await getServerIdentity();

 if (!store_id) throw new Error("Nenhuma loja ativa selecionada.");

 // Verify that source store and target stores share the same organization_id
 const { data: sourceStore, error: sourceErr } = await db
 .from("stores")
 .select("id, organization_id, name")
 .eq("id", store_id)
 .single();

 if (sourceErr || !sourceStore) {
 throw new Error("Loja de origem não encontrada.");
 }

 const { data: targetStores, error: targetErr } = await db
 .from("stores")
 .select("id, organization_id, name")
 .in("id", input.target_store_ids)
 .eq("organization_id", sourceStore.organization_id);

 if (targetErr || !targetStores || targetStores.length === 0) {
 throw new Error("Nenhuma loja de destino válida encontrada dentro da mesma organização.");
 }

 // Fetch products to replicate
 let prodQuery = db
 .from("products")
 .select("id, name, slug, description, price_cents, compare_at_price_cents, category_id, sku, is_active, status, image_url")
 .eq("store_id", store_id);

 if (input.product_ids && input.product_ids.length > 0) {
 prodQuery = prodQuery.in("id", input.product_ids);
 }

 const { data: sourceProducts, error: prodErr } = await prodQuery;
 if (prodErr) throw prodErr;

 let replicatedCount = 0;

 for (const target of targetStores) {
 for (const prod of sourceProducts || []) {
 // Check if product with same slug exists in target store
 const { data: existingProd } = await db
 .from("products")
 .select("id")
 .eq("store_id", target.id)
 .eq("slug", prod.slug)
 .maybeSingle();

 if (existingProd) {
 // Update existing product
 await db
 .from("products")
 .update({
 name: prod.name,
 description: prod.description,
 price_cents: prod.price_cents,
 compare_at_price_cents: prod.compare_at_price_cents,
 image_url: prod.image_url,
 status: prod.status,
 is_active: prod.is_active,
 updated_at: new Date().toISOString(),
 })
 .eq("id", existingProd.id);
 } else {
 // Insert product in target store
 await db.from("products").insert({
 organization_id: sourceStore.organization_id,
 store_id: target.id,
 name: prod.name,
 slug: prod.slug,
 description: prod.description,
 price_cents: prod.price_cents,
 compare_at_price_cents: prod.compare_at_price_cents,
 image_url: prod.image_url,
 status: prod.status,
 is_active: prod.is_active,
 });
 }
 replicatedCount++;
 }
 }

 return {
 success: true,
 batch_id: `batch_${Date.now()}`,
 replicated_products_count: replicatedCount,
 target_stores_count: targetStores.length,
 timestamp: new Date().toISOString(),
 };
 } catch (e: unknown) {
 console.error("[admin-catalog] replicateCatalogToStores error:", e);
 throw new Error(
 (e instanceof Error ? e.message : String(e)) || "Erro ao replicar cardápio/catálogo entre lojas.",
 );
 }
 });

export const listStoreComplementGroups = createServerFn({ method: "GET" }).handler(async () => {
 const identity = await getServerIdentity().catch(() => null);
 const targetStoreId = identity?.store_id || null;
 if (!targetStoreId) return [];

 const db = getServerClient();
 const { data, error } = await db
 .from("store_complement_groups")
 .select("*")
 .eq("store_id", targetStoreId)
 .order("created_at", { ascending: true });

 if (error) {
 console.error("[admin-catalog] Erro ao listar grupos de complementos:", error);
 return [];
 }
 return data || [];
});

export const saveStoreComplementGroup = createServerFn({ method: "POST" })
 .validator(
 z.object({
 id: z.string().uuid().optional(),
 title: z.string().min(1, "Título obrigatório"),
 description: z.string().optional().nullable(),
 min_selection: z.number().int().nonnegative().default(0),
 max_selection: z.number().int().positive().default(1),
 is_required: z.boolean().default(false),
 options: z.array(
 z.object({
 id: z.string().optional(),
 name: z.string().min(1),
 price_cents: z.number().int().nonnegative().default(0),
 is_active: z.boolean().default(true),
 }),
 ),
 is_active: z.boolean().default(true),
 }),
 )
 .handler(async ({ data }) => {
 const identity = await getServerIdentity();
 if (!identity?.store_id) throw new Error("Não autenticado em loja");

 const db = getServerClient();
 const payload = {
 store_id: identity.store_id,
 title: data.title,
 description: data.description,
 min_selection: data.min_selection,
 max_selection: data.max_selection,
 is_required: data.is_required,
 options: data.options.map((opt, idx) => ({
 ...opt,
 id: opt.id || `opt_${Date.now()}_${idx}`,
 })),
 is_active: data.is_active,
 updated_at: new Date().toISOString(),
 };

 if (data.id) {
 const { data: updated, error } = await db
 .from("store_complement_groups")
 .update(payload)
 .eq("id", data.id)
 .select()
 .single();
 if (error) throw new Error(error.message);
 return updated;
 } else {
 const { data: created, error } = await db
 .from("store_complement_groups")
 .insert(payload)
 .select()
 .single();
 if (error) throw new Error(error.message);
 return created;
 }
 });

export const deleteStoreComplementGroup = createServerFn({ method: "POST" })
 .validator(z.object({ id: z.string().uuid() }))
 .handler(async ({ data }) => {
 const identity = await getServerIdentity();
 if (!identity?.store_id) throw new Error("Não autenticado");

 const db = getServerClient();
 const { error } = await db
 .from("store_complement_groups")
 .delete()
 .eq("id", data.id);

 if (error) throw new Error(error.message);
 return { success: true };
 });

export const batchCreateCatalogMenu = createServerFn({ method: "POST" })
 .validator(
 z.object({
 categories: z.array(
 z.object({
 name: z.string().min(1),
 description: z.string().optional().nullable(),
 products: z.array(
 z.object({
 title: z.string().min(1),
 description: z.string().optional().nullable(),
 price_cents: z.number().int().min(0),
 image_url: z.string().optional().nullable(),
 selling_unit: z.string().default("un"),
 }),
 ),
 }),
 ),
 }),
 )
 .handler(async ({ data: input }) => {
 await requireAdmin();
 const { getServerIdentity } = await import("@/lib/server-access");
 const identity = await getServerIdentity();
 const db = getServerClient();

 let createdCategoriesCount = 0;
 let createdProductsCount = 0;

 for (const cat of input.categories) {
 const cleanCatName = cat.name.trim();
 const catSlug =
 cleanCatName
 .toLowerCase()
 .normalize("NFD")
 .replace(/[\u0300-\u036f]/g, "")
 .replace(/[^a-z0-9]+/g, "-")
 .replace(/^-+|-+$/g, "") || "categoria";

 // 1. Busca se categoria já existe no store
 let categoryId: string | null = null;
 const { data: existingCat } = await db
 .from("categories")
 .select("id")
 .eq("store_id", identity.store_id)
 .eq("name", cleanCatName)
 .maybeSingle();

 if (existingCat) {
 categoryId = existingCat.id;
 } else {
 const { data: newCat, error: catErr } = await db
 .from("categories")
 .insert({
 store_id: identity.store_id,
 name: cleanCatName,
 slug: `${catSlug}-${Date.now().toString(36).slice(-4)}`,
 status: "active",
 })
 .select("id")
 .single();

 if (!catErr && newCat) {
 categoryId = newCat.id;
 createdCategoriesCount++;
 }
 }

 // 2. Insere os produtos dessa categoria
 for (const prod of cat.products) {
 const cleanTitle = prod.title.trim();
 const prodSlug =
 cleanTitle
 .toLowerCase()
 .normalize("NFD")
 .replace(/[\u0300-\u036f]/g, "")
 .replace(/[^a-z0-9]+/g, "-")
 .replace(/^-+|-+$/g, "")
 .slice(0, 50) + `-${Math.random().toString(36).slice(2, 6)}`;

 try {
 const insertedProduct = await _createProduct({
 title: cleanTitle,
 slug: prodSlug,
 description: prod.description || null,
 status: "published",
 price_cents: prod.price_cents || 0,
 category_ids: categoryId ? [categoryId] : [],
 media_urls: prod.image_url ? [prod.image_url] : [],
 attributes: {},
 });

 if (insertedProduct?.id) {
 createdProductsCount++;
 }
 } catch (err) {
 console.warn("[admin-catalog] Erro ao criar produto importado:", err);
 }
 }
 }

 return {
 success: true,
 categoriesCount: createdCategoriesCount,
 productsCount: createdProductsCount,
 };
 });



