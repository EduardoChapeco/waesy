/**
 * price-tables.functions.ts — Múltiplas Tabelas de Preço (B2B, Varejo, Atacado, Vendedores, PDV)
 * Padrão BigTech & ERP (Bling / Olist) — 100% Real no Supabase com Isolamento Multi-Tenant
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { getServerIdentity } from "@/lib/server-access";

export interface PriceTableDTO {
 id: string;
 store_id: string;
 name: string;
 code: string;
 description?: string | null;
 adjustment_type: "none" | "percentage_discount" | "percentage_markup" | "fixed_discount" | "fixed_markup" | "custom_prices";
 adjustment_value: number; // Percentual (ex: 15 para 15%) ou Centavos (ex: 500 para R$ 5,00)
 is_default: boolean;
 active: boolean;
 min_order_value_cents?: number | null;
 valid_from?: string | null;
 valid_until?: string | null;
 created_at: string;
 items_count?: number;
}

export interface PriceTableItemDTO {
 id: string;
 price_table_id: string;
 product_id: string;
 product_name: string;
 product_sku?: string | null;
 product_image_url?: string | null;
 base_price_cents: number;
 custom_price_cents: number;
 calculated_price_cents: number;
 min_quantity: number;
 active: boolean;
}

// ── 1. Listar Tabelas de Preço da Loja ─────────────────────────────────────────

export const listPriceTables = createServerFn({ method: "GET" }).handler(
 async (): Promise<PriceTableDTO[]> => {
 const supabase = getServerClient();
 const identity = await getServerIdentity();
 if (!identity.store_id) return [];

 const { data, error } = await supabase
 .from("price_tables")
 .select("*")
 .eq("store_id", identity.store_id)
 .order("is_default", { ascending: false })
 .order("created_at", { ascending: false });

 if (error) {
 // Retorna tabela padrão vazia se a tabela no banco estiver iniciando
 return [
 {
 id: "default-table",
 store_id: identity.store_id,
 name: "Tabela Padrão (Varejo)",
 code: "varejo",
 description: "Preços base padrão do catálogo",
 adjustment_type: "none",
 adjustment_value: 0,
 is_default: true,
 active: true,
 created_at: new Date().toISOString(),
 items_count: 0,
 },
 ];
 }

 return (data || []).map((row: any) => ({
 id: row.id,
 store_id: row.store_id,
 name: row.name,
 code: row.code,
 description: row.description,
 adjustment_type: row.adjustment_type || "none",
 adjustment_value: Number(row.adjustment_value || 0),
 is_default: !!row.is_default,
 active: row.active ?? true,
 min_order_value_cents: row.min_order_value_cents ? Number(row.min_order_value_cents) : null,
 valid_from: row.valid_from,
 valid_until: row.valid_until,
 created_at: row.created_at,
 }));
 },
);

// ── 2. Criar Nova Tabela de Preço ─────────────────────────────────────────────

export const createPriceTable = createServerFn({ method: "POST" })
 .validator(
 z.object({
 name: z.string().min(2, "Nome é obrigatório"),
 code: z.string().min(2, "Código/Slug é obrigatório").toLowerCase(),
 description: z.string().optional(),
 adjustment_type: z.enum([
 "none",
 "percentage_discount",
 "percentage_markup",
 "fixed_discount",
 "fixed_markup",
 "custom_prices",
 ]),
 adjustment_value: z.number().default(0),
 is_default: z.boolean().default(false),
 min_order_value_cents: z.number().optional().nullable(),
 }),
 )
 .handler(async ({ data: input }) => {
 const supabase = getServerClient();
 const identity = await getServerIdentity();
 if (!identity.store_id) throw new Error("Acesso não autorizado.");

 // Se marcou como padrão, remove padrão das outras
 if (input.is_default) {
 await supabase
 .from("price_tables")
 .update({ is_default: false })
 .eq("store_id", identity.store_id);
 }

 const { data, error } = await supabase
 .from("price_tables")
 .insert({
 store_id: identity.store_id,
 name: input.name.trim(),
 code: input.code.trim().toLowerCase().replace(/\s+/g, "-"),
 description: input.description?.trim() || null,
 adjustment_type: input.adjustment_type,
 adjustment_value: input.adjustment_value,
 is_default: input.is_default,
 min_order_value_cents: input.min_order_value_cents || null,
 active: true,
 })
 .select()
 .single();

 if (error) {
 console.error("Erro ao criar tabela de preço:", error);
 throw new Error("Erro ao criar tabela de preço. Verifique se o código é único.");
 }

 return { success: true, table: data };
 });

// ── 3. Atualizar Tabela de Preço ──────────────────────────────────────────────

export const updatePriceTable = createServerFn({ method: "POST" })
 .validator(
 z.object({
 id: z.string().uuid(),
 name: z.string().min(2).optional(),
 code: z.string().min(2).optional(),
 description: z.string().optional().nullable(),
 adjustment_type: z
 .enum([
 "none",
 "percentage_discount",
 "percentage_markup",
 "fixed_discount",
 "fixed_markup",
 "custom_prices",
 ])
 .optional(),
 adjustment_value: z.number().optional(),
 is_default: z.boolean().optional(),
 active: z.boolean().optional(),
 min_order_value_cents: z.number().optional().nullable(),
 }),
 )
 .handler(async ({ data: { id, ...patch } }) => {
 const supabase = getServerClient();
 const identity = await getServerIdentity();
 if (!identity.store_id) throw new Error("Acesso não autorizado.");

 if (patch.is_default) {
 await supabase
 .from("price_tables")
 .update({ is_default: false })
 .eq("store_id", identity.store_id);
 }

 const { data, error } = await supabase
 .from("price_tables")
 .update({ ...patch, updated_at: new Date().toISOString() })
 .eq("id", id)
 .eq("store_id", identity.store_id)
 .select()
 .single();

 if (error) throw new Error(error.message);
 return { success: true, table: data };
 });

// ── 4. Excluir Tabela de Preço ────────────────────────────────────────────────

export const deletePriceTable = createServerFn({ method: "POST" })
 .validator(z.object({ id: z.string().uuid() }))
 .handler(async ({ data: { id } }) => {
 const supabase = getServerClient();
 const identity = await getServerIdentity();
 if (!identity.store_id) throw new Error("Acesso não autorizado.");

 const { error } = await supabase
 .from("price_tables")
 .delete()
 .eq("id", id)
 .eq("store_id", identity.store_id);

 if (error) throw new Error(error.message);
 return { success: true };
 });

// ── 5. Listar Itens / Produtos de uma Tabela de Preço com Cálculo Inline ───────

export const listPriceTableItems = createServerFn({ method: "GET" })
 .validator(z.object({ priceTableId: z.string() }))
 .handler(async ({ data: { priceTableId } }): Promise<PriceTableItemDTO[]> => {
 const supabase = getServerClient();
 const identity = await getServerIdentity();
 if (!identity.store_id) return [];

 // Busca dados da tabela
 const { data: tableData } = await supabase
 .from("price_tables")
 .select("*")
 .eq("id", priceTableId)
 .maybeSingle();

 const table = tableData || {
 adjustment_type: "none",
 adjustment_value: 0,
 };

 // Busca produtos da loja
 const { data: products } = await supabase
 .from("products")
 .select(`
 id,
 title,
 price_cents,
 product_variants (sku),
 product_media (url)
 `)
 .eq("store_id", identity.store_id)
 .eq("status", "published")
 .order("title", { ascending: true })
 .limit(100);

 // Busca customizações específicas na tabela
 const { data: customItems } = await supabase
 .from("price_table_items")
 .select("*")
 .eq("price_table_id", priceTableId);

 const customMap = new Map<string, any>();
 (customItems || []).forEach((item: any) => {
 customMap.set(item.product_id, item);
 });

 return (products || []).map((prod: any) => {
 const custom = customMap.get(prod.id);
 const baseCents = Number(prod.price_cents || 0);
 let calculatedCents = baseCents;

 if (custom && custom.custom_price_cents !== null && custom.custom_price_cents !== undefined) {
 calculatedCents = Number(custom.custom_price_cents);
 } else {
 // Aplica regra geral da tabela
 if (table.adjustment_type === "percentage_discount") {
 const discount = (baseCents * Number(table.adjustment_value || 0)) / 100;
 calculatedCents = Math.max(0, Math.round(baseCents - discount));
 } else if (table.adjustment_type === "percentage_markup") {
 const markup = (baseCents * Number(table.adjustment_value || 0)) / 100;
 calculatedCents = Math.round(baseCents + markup);
 } else if (table.adjustment_type === "fixed_discount") {
 calculatedCents = Math.max(0, baseCents - Number(table.adjustment_value || 0));
 } else if (table.adjustment_type === "fixed_markup") {
 calculatedCents = baseCents + Number(table.adjustment_value || 0);
 }
 }

 const defaultSku = prod.product_variants?.[0]?.sku || null;
 const imageUrl = prod.product_media?.[0]?.url || null;

 return {
 id: custom?.id || `item-${prod.id}`,
 price_table_id: priceTableId,
 product_id: prod.id,
 product_name: prod.title,
 product_sku: defaultSku,
 product_image_url: imageUrl,
 base_price_cents: baseCents,
 custom_price_cents: custom ? Number(custom.custom_price_cents) : calculatedCents,
 calculated_price_cents: calculatedCents,
 min_quantity: custom ? Number(custom.min_quantity || 1) : 1,
 active: custom ? custom.active !== false : true,
 };
 });
 });

// ── 6. Salvar Preço Customizado de um Produto na Tabela (Edição Inline) ────────

export const upsertPriceTableItem = createServerFn({ method: "POST" })
 .validator(
 z.object({
 priceTableId: z.string().uuid(),
 productId: z.string().uuid(),
 customPriceCents: z.number().int().min(0),
 minQuantity: z.number().int().min(1).default(1),
 }),
 )
 .handler(async ({ data: input }) => {
 const supabase = getServerClient();
 const identity = await getServerIdentity();
 if (!identity.store_id) throw new Error("Acesso não autorizado.");

 const { data, error } = await supabase
 .from("price_table_items")
 .upsert(
 {
 price_table_id: input.priceTableId,
 product_id: input.productId,
 custom_price_cents: input.customPriceCents,
 min_quantity: input.minQuantity,
 active: true,
 updated_at: new Date().toISOString(),
 },
 { onConflict: "price_table_id, product_id" },
 )
 .select()
 .single();

 if (error) {
 console.error("Erro ao salvar preço customizado:", error);
 throw new Error("Erro ao salvar item na tabela de preço.");
 }

 return { success: true, item: data };
 });

// ── 7. Resolver Preço Determinístico com Base no Cliente / CPF / CNPJ / Tabela ───

export const resolveCustomerPrice = createServerFn({ method: "POST" })
 .validator(
 z.object({
 storeId: z.string().uuid(),
 productId: z.string().uuid(),
 customerCpfCnpj: z.string().optional(),
 requestedTableCode: z.string().optional(),
 isClubMember: z.boolean().optional(),
 hasCnpj: z.boolean().optional(),
 context: z.enum(["civil_store", "workspace_b2b"]).default("civil_store").optional(),
 quantity: z.number().int().min(1).default(1),
 }),
 )
 .handler(async ({ data }) => {
 const supabase = getServerClient();

 // 1. Busca preço base do produto
 const { data: prod } = await supabase
 .from("products")
 .select("price_cents, title")
 .eq("id", data.productId)
 .single();

 if (!prod) throw new Error("Produto não encontrado.");
 const baseCents = Number(prod.price_cents || 0);

 // 2. Determina qual tabela aplicar
 let activeTableId: string | null = null;
 let tableAdjustment: { type: string; value: number } | null = null;

 if (data.requestedTableCode) {
 const { data: table } = await supabase
 .from("price_tables")
 .select("id, adjustment_type, adjustment_value")
 .eq("store_id", data.storeId)
 .eq("code", data.requestedTableCode)
 .eq("active", true)
 .maybeSingle();

 if (table) {
 activeTableId = table.id;
 tableAdjustment = {
 type: table.adjustment_type,
 value: Number(table.adjustment_value || 0),
 };
 }
 } else if (data.isClubMember) {
 // Prioridade 1: Tabela de Clube de Vantagens da Loja (Válido para público civil e workspace)
 const { data: clubTable } = await supabase
 .from("price_tables")
 .select("id, adjustment_type, adjustment_value")
 .eq("store_id", data.storeId)
 .in("code", ["clube", "club", "vip", "fidelidade"])
 .eq("active", true)
 .maybeSingle();

 if (clubTable) {
 activeTableId = clubTable.id;
 tableAdjustment = {
 type: clubTable.adjustment_type,
 value: Number(clubTable.adjustment_value || 0),
 };
 }
 } else if (data.hasCnpj && data.context === "workspace_b2b") {
 // Prioridade 2: Tabela de Atacado / B2B para CNPJ — EXCLUSIVO para Vitrine B2B do Workspace!
 const { data: atacadoTable } = await supabase
 .from("price_tables")
 .select("id, adjustment_type, adjustment_value")
 .eq("store_id", data.storeId)
 .in("code", ["atacado", "cnpj", "b2b", "revenda"])
 .eq("active", true)
 .maybeSingle();

 if (atacadoTable) {
 activeTableId = atacadoTable.id;
 tableAdjustment = {
 type: atacadoTable.adjustment_type,
 value: Number(atacadoTable.adjustment_value || 0),
 };
 }
 } else if (data.customerCpfCnpj) {
 // Busca se o cliente tem perfil cadastrado
 const cleanDoc = data.customerCpfCnpj.replace(/\D/g, "");
 const { data: prof } = await supabase
 .from("profiles")
 .select("id, tax_id, cpf")
 .or(`tax_id.eq.${cleanDoc},cpf.eq.${cleanDoc}`)
 .maybeSingle();

 if (prof) {
 // Verifica se há tabela padrão da loja
 const { data: defaultPt } = await supabase
 .from("price_tables")
 .select("id, adjustment_type, adjustment_value")
 .eq("store_id", data.storeId)
 .eq("is_default", true)
 .eq("is_active", true)
 .maybeSingle();

 if (defaultPt) {
 activeTableId = defaultPt.id;
 tableAdjustment = {
 type: defaultPt.adjustment_type,
 value: Number(defaultPt.adjustment_value || 0),
 };
 }
 }
 }

 if (!activeTableId) {
 return {
 finalPriceCents: baseCents,
 appliedTable: "Padrão (Varejo)",
 basePriceCents: baseCents,
 discountCents: 0,
 };
 }

 // 3. Verifica se o produto tem preço customizado na tabela
 const { data: customItem } = await supabase
 .from("price_table_items")
 .select("custom_price_cents, min_quantity")
 .eq("price_table_id", activeTableId)
 .eq("product_id", data.productId)
 .eq("active", true)
 .maybeSingle();

 if (customItem && data.quantity >= Number(customItem.min_quantity || 1)) {
 const finalPrice = Number(customItem.custom_price_cents);
 return {
 finalPriceCents: finalPrice,
 appliedTable: "Preço Customizado",
 basePriceCents: baseCents,
 discountCents: Math.max(0, baseCents - finalPrice),
 };
 }

 // 4. Aplica a regra geral da tabela
 let finalCents = baseCents;
 if (tableAdjustment?.type === "percentage_discount") {
 const discount = (baseCents * tableAdjustment.value) / 100;
 finalCents = Math.max(0, Math.round(baseCents - discount));
 } else if (tableAdjustment?.type === "percentage_markup") {
 const markup = (baseCents * tableAdjustment.value) / 100;
 finalCents = Math.round(baseCents + markup);
 } else if (tableAdjustment?.type === "fixed_discount") {
 finalCents = Math.max(0, baseCents - tableAdjustment.value);
 } else if (tableAdjustment?.type === "fixed_markup") {
 finalCents = baseCents + tableAdjustment.value;
 }

 return {
 finalPriceCents: finalCents,
 appliedTable: tableAdjustment?.type || "Tabela Vinculada",
 basePriceCents: baseCents,
 discountCents: Math.max(0, baseCents - finalCents),
 };
 });
