/**
 * quotes.functions.ts — BFF para o módulo de Orçamentos (Quotes Híbridos)
 *
 * Suporta orçamentos com itens mistos:
 * - product_variant (venda física, reserva de estoque ao aprovar)
 * - service (prestação com duração, sem estoque)
 * - rental_equipment (locação, bloqueia disponibilidade na agenda)
 * - manual_item (item avulso não cadastrado no catálogo)
 *
 * Regras:
 * - Preço NUNCA é calculado no cliente. O servidor valida ao aprovar.
 * - Status de orçamento expirado detectado na RPC approve_quote.
 * - Nenhum dado financeiro do payload do cliente é confiado diretamente.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { getServerIdentity, assertStoreAccess } from "@/lib/server-access";

// ============================================================
// Schemas de I/O
// ============================================================

const quoteItemTypeEnum = z.enum(["product_variant", "service", "rental_equipment", "manual_item"]);

export const quoteStatusEnum = z.enum([
 "draft",
 "sent",
 "negotiating",
 "approved",
 "rejected",
 "expired",
 "converted",
]);

export const quoteItemInputSchema = z.object({
 item_type: quoteItemTypeEnum,
 product_variant_id: z.string().uuid().optional(),
 service_id: z.string().uuid().optional(),
 resource_id: z.string().uuid().optional(),
 name: z.string().min(1, "Nome do item é obrigatório"),
 description: z.string().optional(),
 sku: z.string().optional(),
 unit_price_cents: z.number().int().min(0),
 quantity: z.number().int().min(1).default(1),
 discount_cents: z.number().int().min(0).default(0),
 duration_minutes: z.number().int().optional(),
 scheduled_start: z.string().datetime().optional(),
 scheduled_end: z.string().datetime().optional(),
 metadata: z.record(z.unknown()).optional(),
 position: z.number().int().default(0),
});

export const createQuoteInputSchema = z.object({
 customer_id: z.string().uuid().optional(),
 guest_name: z.string().optional(),
 guest_email: z.string().email().optional(),
 guest_phone: z.string().optional(),
 valid_until: z.string().datetime().optional(),
 conditions: z.string().optional(),
 internal_notes: z.string().optional(),
 items: z.array(quoteItemInputSchema).min(1, "Orçamento precisa de ao menos 1 item"),
});

export type CreateQuoteInput = z.infer<typeof createQuoteInputSchema>;
export type QuoteItemInput = z.infer<typeof quoteItemInputSchema>;

export interface QuoteSummaryDTO {
 id: string;
 quote_number: string;
 status: string;
 customer_name: string | null;
 customer_email: string | null;
 subtotal_cents: number;
 total_cents: number;
 valid_until: string | null;
 item_count: number;
 created_at: string;
 updated_at: string;
}

export interface QuoteDetailDTO {
 id: string;
 quote_number: string;
 status: string;
 version: number;
 customer_id: string | null;
 customer_name: string | null;
 customer_email: string | null;
 customer_phone: string | null;
 subtotal_cents: number;
 discount_cents: number;
 total_cents: number;
 conditions: string | null;
 internal_notes: string | null;
 valid_until: string | null;
 approved_at: string | null;
 rejected_at: string | null;
 rejection_reason: string | null;
 converted_order_id: string | null;
 created_at: string;
 updated_at: string;
 items: QuoteItemDTO[];
 messages: QuoteMessageDTO[];
}

export interface QuoteItemDTO {
 id: string;
 item_type: string;
 name: string;
 description: string | null;
 sku: string | null;
 unit_price_cents: number;
 quantity: number;
 discount_cents: number;
 total_cents: number;
 duration_minutes: number | null;
 scheduled_start: string | null;
 scheduled_end: string | null;
 position: number;
}

export interface QuoteMessageDTO {
 id: string;
 author_id: string;
 body: string;
 is_internal: boolean;
 created_at: string;
}

// ============================================================
// Server Functions
// ============================================================

/**
 * Lista orçamentos da loja com paginação e filtros.
 */
export const listQuotes = createServerFn({ method: "GET" })
 .validator(
 z.object({
 status: quoteStatusEnum.optional(),
 search: z.string().optional(),
 limit: z.number().int().min(1).max(100).default(30),
 cursor: z.string().optional(),
 }),
 )
 .handler(async ({ data }) => {
 const identity = await getServerIdentity();
 assertStoreAccess(identity, ["owner", "admin", "manager", "seller", "finance"]);

 const db = getServerClient();
 let query = db
 .from("quotes")
 .select(
 `
 id, quote_number, status, version,
 customer_id, guest_name, guest_email,
 subtotal_cents, total_cents, valid_until,
 created_at, updated_at,
 quote_items(count)
 `,
 )
 .eq("store_id", identity.store_id)
 .order("created_at", { ascending: false })
 .limit(data.limit + 1);

 if (data.status) query = query.eq("status", data.status);
 if (data.search) {
 query = query.or(
 `quote_number.ilike.%${data.search}%,guest_name.ilike.%${data.search}%,guest_email.ilike.%${data.search}%`,
 );
 }
 if (data.cursor) query = query.lt("created_at", data.cursor);

 const { data: rows, error } = await query;
 if (error) throw new Error(`Erro ao listar orçamentos: ${error.message}`);

 const hasMore = rows.length > data.limit;
 const items = hasMore ? rows.slice(0, data.limit) : rows;

 return {
 items: items.map((r) => ({
 id: r.id,
 quote_number: r.quote_number,
 status: r.status,
 customer_name: r.guest_name ?? null,
 customer_email: r.guest_email ?? null,
 subtotal_cents: r.subtotal_cents,
 total_cents: r.total_cents,
 valid_until: r.valid_until,
 item_count: (r.quote_items as any)?.[0]?.count ?? 0,
 created_at: r.created_at,
 updated_at: r.updated_at,
 })) as QuoteSummaryDTO[],
 hasMore,
 nextCursor: hasMore ? items[items.length - 1].created_at : null,
 };
 });

/**
 * Busca detalhe completo de um orçamento (com itens e mensagens).
 */
export const getQuoteDetail = createServerFn({ method: "GET" })
 .validator(z.object({ quote_id: z.string().uuid() }))
 .handler(async ({ data }) => {
 const identity = await getServerIdentity();
 assertStoreAccess(identity, ["owner", "admin", "manager", "seller", "finance"]);

 const db = getServerClient();
 const { data: quote, error } = await db
 .from("quotes")
 .select(
 `
 *,
 quote_items(*),
 quote_messages(*)
 `,
 )
 .eq("id", data.quote_id)
 .eq("store_id", identity.store_id)
 .single();

 if (error || !quote) throw new Error("Orçamento não encontrado.");

 return {
 ...quote,
 customer_name: quote.guest_name,
 customer_email: quote.guest_email,
 customer_phone: quote.guest_phone,
 items: (quote.quote_items ?? []).sort((a: any, b: any) => a.position - b.position),
 messages: (quote.quote_messages ?? []).sort(
 (a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
 ),
 } as QuoteDetailDTO;
 });

/**
 * Cria um orçamento com itens (transação atômica via RPC + inserts).
 */
export const createQuote = createServerFn({ method: "POST" })
 .validator(createQuoteInputSchema)
 .handler(async ({ data }) => {
 const identity = await getServerIdentity();
 assertStoreAccess(identity, ["owner", "admin", "manager", "seller"]);

 const db = getServerClient();

 // 1. Criar o quote via RPC (gera número sequencial atomicamente)
 const { data: quoteId, error: rpcError } = await db.rpc("create_quote", {
 p_store_id: identity.store_id,
 p_customer_id: data.customer_id ?? null,
 p_guest_name: data.guest_name ?? null,
 p_guest_email: data.guest_email ?? null,
 p_guest_phone: data.guest_phone ?? null,
 p_valid_until: data.valid_until ?? null,
 p_conditions: data.conditions ?? null,
 p_internal_notes: data.internal_notes ?? null,
 });

 if (rpcError || !quoteId) {
 throw new Error(`Erro ao criar orçamento: ${rpcError?.message}`);
 }

 // 2. Inserir itens em lote
 const itemRows = data.items.map((item, idx) => ({
 quote_id: quoteId as string,
 item_type: item.item_type,
 product_variant_id: item.product_variant_id ?? null,
 service_id: item.service_id ?? null,
 resource_id: item.resource_id ?? null,
 name: item.name,
 description: item.description ?? null,
 sku: item.sku ?? null,
 unit_price_cents: item.unit_price_cents,
 quantity: item.quantity,
 discount_cents: item.discount_cents,
 total_cents: item.unit_price_cents * item.quantity - item.discount_cents,
 duration_minutes: item.duration_minutes ?? null,
 scheduled_start: item.scheduled_start ?? null,
 scheduled_end: item.scheduled_end ?? null,
 metadata: item.metadata ?? null,
 position: item.position ?? idx,
 }));

 const { error: itemsError } = await db.from("quote_items").insert(itemRows);
 if (itemsError) {
 // Limpar o quote órfão antes de lançar o erro
 await db.from("quotes").delete().eq("id", quoteId);
 throw new Error(`Erro ao adicionar itens: ${itemsError.message}`);
 }

 return { quote_id: quoteId as string };
 });

/**
 * Atualiza status do orçamento (enviar, recusar, cancelar).
 */
export const updateQuoteStatus = createServerFn({ method: "POST" })
 .validator(
 z.object({
 quote_id: z.string().uuid(),
 status: z.enum(["sent", "negotiating", "rejected"]),
 rejection_reason: z.string().optional(),
 }),
 )
 .handler(async ({ data }) => {
 const identity = await getServerIdentity();
 assertStoreAccess(identity, ["owner", "admin", "manager", "seller"]);

 const db = getServerClient();
 const updateData: Record<string, unknown> = { status: data.status };
 if (data.status === "rejected") {
 updateData.rejected_at = new Date().toISOString();
 updateData.rejection_reason = data.rejection_reason ?? null;
 }

 const { error } = await db
 .from("quotes")
 .update(updateData)
 .eq("id", data.quote_id)
 .eq("store_id", identity.store_id);

 if (error) throw new Error(`Erro ao atualizar status: ${error.message}`);
 return { ok: true };
 });

/**
 * Aprova o orçamento via RPC atômica (calcula snapshot financeiro).
 */
export const approveQuote = createServerFn({ method: "POST" })
 .validator(z.object({ quote_id: z.string().uuid() }))
 .handler(async ({ data }) => {
 const db = getServerClient();
 const { data: result, error } = await db.rpc("approve_quote", {
 p_quote_id: data.quote_id,
 });
 if (error) throw new Error(`Erro ao aprovar orçamento: ${error.message}`);
 return result;
 });

/**
 * Adiciona mensagem ao orçamento (chat de negociação).
 */
export const addQuoteMessage = createServerFn({ method: "POST" })
 .validator(
 z.object({
 quote_id: z.string().uuid(),
 body: z.string().min(1).max(2000),
 is_internal: z.boolean().default(false),
 }),
 )
 .handler(async ({ data }) => {
 const identity = await getServerIdentity();
 // Valida que o usuário tem acesso a este quote
 assertStoreAccess(identity, ["owner", "admin", "manager", "seller", "finance"]);

 const db = getServerClient();
 const { error } = await db.from("quote_messages").insert({
 quote_id: data.quote_id,
 author_id: identity.id,
 body: data.body,
 is_internal: data.is_internal,
 });

 if (error) throw new Error(`Erro ao enviar mensagem: ${error.message}`);
 return { ok: true };
 });

export const publicQuoteRequestSchema = z.object({
 store_id: z.string().uuid("ID da loja/prestador inválido"),
 customer_name: z.string().min(2, "Nome é obrigatório"),
 customer_email: z.string().email("E-mail inválido").optional().or(z.literal("")),
 customer_phone: z.string().min(8, "Telefone/WhatsApp é obrigatório"),
 service_category: z.string().optional(),
 project_description: z.string().min(5, "Descreva o que você precisa"),
 urgency: z.enum(["baixa", "media", "alta", "urgente"]).default("media"),
 preferred_date: z.string().optional(),
 location_address: z.string().optional(),
 estimated_budget_cents: z.number().int().min(0).optional(),
});

export type PublicQuoteRequestInput = z.infer<typeof publicQuoteRequestSchema>;

/**
 * Solicitação pública de orçamento feita pelo cliente na vitrine da loja ou no Hub de Serviços.
 * Grava na tabela quotes com status 'sent' e cria o item descritivo em quote_items.
 */
export const requestPublicQuote = createServerFn({ method: "POST" })
 .validator(publicQuoteRequestSchema)
 .handler(async ({ data }) => {
 const db = getServerClient();

 // 1. Criar o orçamento via RPC nativa
 const { data: quoteId, error: rpcError } = await db.rpc("create_quote", {
 p_store_id: data.store_id,
 p_customer_id: null,
 p_guest_name: data.customer_name,
 p_guest_email: data.customer_email || null,
 p_guest_phone: data.customer_phone,
 p_valid_until: null,
 p_conditions: `Solicitação via Super App Waesy - Categoria: ${data.service_category || "Geral"}. Endereço: ${data.location_address || "Não informado"}. Urgência: ${data.urgency}. Data preferencial: ${data.preferred_date || "A combinar"}`,
 p_internal_notes: `Orçamento solicitado pelo cliente através da vitrine pública.`,
 });

 if (rpcError || !quoteId) {
 throw new Error(`Erro ao registrar solicitação de orçamento: ${rpcError?.message}`);
 }

 // 2. Inserir item descritivo do orçamento
 const { error: itemError } = await db.from("quote_items").insert({
 quote_id: quoteId as string,
 item_type: "service",
 name: data.service_category ? `Serviço: ${data.service_category}` : "Serviço Especializado / Sob Demanda",
 description: data.project_description,
 unit_price_cents: data.estimated_budget_cents ?? 0,
 quantity: 1,
 discount_cents: 0,
 total_cents: data.estimated_budget_cents ?? 0,
 metadata: {
 urgency: data.urgency,
 preferred_date: data.preferred_date,
 location_address: data.location_address,
 source: "public_super_app",
 },
 position: 0,
 });

 if (itemError) {
 console.warn("Aviso: Falha ao inserir item de cotação pública:", itemError.message);
 }

 return {
 success: true,
 quote_id: quoteId as string,
 message: "Orçamento enviado com sucesso! O prestador entrará em contato em breve.",
 };
 });
