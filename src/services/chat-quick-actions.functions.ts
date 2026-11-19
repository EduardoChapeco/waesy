/**
 * chat-quick-actions.functions.ts — BFF Unificado para Vinculacao Bidirecional Lead <-> WhatsApp
 * e Catalogo Real do Painel de Acoes Rapidas (Propostas, Faturas PIX, Contratos, Formularios, Produtos).
 * Zero Mocks | Multi-Tenant estrito | EARS-LW-01..03 / EARS-QA-01
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { getServerIdentity, assertStoreAccess, STAFF_ROLES } from "@/lib/server-access";
import { buildBrazilPhoneVariants, sanitizePhoneDigits } from "@/lib/phone-match";
import { normalizePhoneE164 } from "@/services/omnichannel-attribution.server";

function resolveTargetStoreId(identity: any, explicitStoreId?: string | null): string {
  const requestedStoreId = explicitStoreId?.trim() || null;
  const scopedIdentity = identity ? { ...identity } : identity;
  if (!scopedIdentity?.id) {
    throw new Error("Autenticacao obrigatoria.");
  }

  const isPlatformAdmin =
    scopedIdentity.role === "platform_admin" ||
    scopedIdentity.role === "master" ||
    scopedIdentity.isPlatformAdmin === true;

  if (requestedStoreId && !isPlatformAdmin) {
    const hasMembership = Array.isArray(scopedIdentity.memberships)
      ? scopedIdentity.memberships.some((m: any) => m.store_id === requestedStoreId)
      : scopedIdentity.store_id === requestedStoreId;
    if (!hasMembership) {
      throw new Error(`Unauthorized: Insufficient permissions for store ${requestedStoreId}.`);
    }
  }

  assertStoreAccess(scopedIdentity, STAFF_ROLES, requestedStoreId);
  const resolved = requestedStoreId || scopedIdentity.store_id || scopedIdentity.memberships?.[0]?.store_id;
  if (!resolved) {
    throw new Error("Contexto de loja obrigatorio.");
  }
  return resolved;
}

function sanitizePostgrestSearchTerm(raw?: string | null): string {
  return String(raw || "")
    .replace(/[%_,()'"\\]/g, " ")
    .trim()
    .slice(0, 80);
}

/**
 * Helper compartilhado: vincula `chat_threads.lead_id` automaticamente em threads WhatsApp
 * compativeis por telefone normalizado BR, customer_id ou threadId explicita quando `lead_id IS NULL`.
 */
export async function autoBindLeadToMatchingWhatsAppThreads(
  db: ReturnType<typeof getServerClient>,
  params: {
    storeId: string;
    leadId: string;
    phone?: string | null;
    customerId?: string | null;
    threadId?: string | null;
  },
): Promise<{ linkedThreadIds: string[] }> {
  const { storeId, leadId, phone, customerId, threadId } = params;
  const variants = buildBrazilPhoneVariants(phone);
  const candidateRows = new Map<string, any>();

  if (threadId) {
    const { data: byThread } = await db
      .from("chat_threads")
      .select("id, lead_id, customer_id, metadata")
      .eq("id", threadId)
      .eq("store_id", storeId)
      .maybeSingle();
    if (byThread?.id) candidateRows.set(byThread.id, byThread);
  }

  if (variants.length > 0) {
    const orParts = [
      ...variants.map((v) => `primary_phone_e164.eq.${v}`),
      ...variants.map((v) => `entity_id.eq.${v}`),
    ];
    const { data: byPhone } = await db
      .from("chat_threads")
      .select("id, lead_id, customer_id, metadata")
      .eq("store_id", storeId)
      .eq("context_type", "whatsapp")
      .is("lead_id", null)
      .or(orParts.join(","))
      .limit(10);
    for (const row of byPhone || []) {
      if (row?.id) candidateRows.set(row.id, row);
    }
  }

  if (customerId && candidateRows.size === 0) {
    const { data: byCust } = await db
      .from("chat_threads")
      .select("id, lead_id, customer_id, metadata")
      .eq("store_id", storeId)
      .eq("context_type", "whatsapp")
      .eq("customer_id", customerId)
      .is("lead_id", null)
      .order("last_message_at", { ascending: false })
      .limit(5);
    for (const row of byCust || []) {
      if (row?.id) candidateRows.set(row.id, row);
    }
  }

  const linkedThreadIds: string[] = [];
  const nowIso = new Date().toISOString();
  for (const row of candidateRows.values()) {
    if (row.lead_id && row.lead_id !== leadId) continue;
    const prevMeta = (row.metadata && typeof row.metadata === "object" ? row.metadata : {}) as Record<string, unknown>;
    await db
      .from("chat_threads")
      .update({
        lead_id: leadId,
        ...(customerId && !row.customer_id ? { customer_id: customerId } : {}),
        metadata: {
          ...prevMeta,
          active_lead_id: leadId,
          lead_linked_at: nowIso,
        },
        updated_at: nowIso,
      })
      .eq("id", row.id)
      .eq("store_id", storeId);
    linkedThreadIds.push(row.id);
  }

  return { linkedThreadIds };
}

export const SearchStoreCrmLeadsSchema = z.object({
  storeId: z.string().uuid().optional(),
  query: z.string().max(120).optional(),
  limit: z.number().int().min(1).max(50).optional(),
});

export async function _searchStoreCrmLeads(
  input: z.infer<typeof SearchStoreCrmLeadsSchema>,
  deps?: { db?: ReturnType<typeof getServerClient>; identity?: any },
) {
  const db = deps?.db ?? getServerClient();
  const identity = deps?.identity ?? (await getServerIdentity());
  if (!identity?.id) throw new Error("Autenticacao obrigatoria.");
  const storeId = resolveTargetStoreId(identity, input.storeId);
  assertStoreAccess(identity, STAFF_ROLES, storeId);

  const term = sanitizePostgrestSearchTerm(input.query);
  let q = db
    .from("leads_crm")
    .select("id, full_name, title, phone, email, destination, status, estimated_value_cents, customer_id, created_at")
    .eq("store_id", storeId)
    .order("updated_at", { ascending: false })
    .limit(input.limit || 25);

  if (term) {
    q = q.or(
      `full_name.ilike.%${term}%,title.ilike.%${term}%,phone.ilike.%${term}%,email.ilike.%${term}%,destination.ilike.%${term}%`,
    );
  }

  const { data, error } = await q;
  if (error) throw new Error(`Falha ao buscar leads do CRM: ${error.message}`);

  return (data || []).map((row: any) => ({
    ...row,
    estimated_budget: row.estimated_value_cents ?? 0,
  }));
}

export const searchStoreCrmLeads = createServerFn({ method: "GET" })
  .validator(SearchStoreCrmLeadsSchema.optional())
  .handler(async ({ data }) => _searchStoreCrmLeads(data || {}));

export const ListWhatsAppThreadsPickerSchema = z.object({
  storeId: z.string().uuid().optional(),
  query: z.string().max(120).optional(),
  limit: z.number().int().min(1).max(50).optional(),
});

export async function _listWhatsAppThreadsForLeadPicker(
  input: z.infer<typeof ListWhatsAppThreadsPickerSchema>,
  deps?: { db?: ReturnType<typeof getServerClient>; identity?: any },
) {
  const db = deps?.db ?? getServerClient();
  const identity = deps?.identity ?? (await getServerIdentity());
  if (!identity?.id) throw new Error("Autenticacao obrigatoria.");
  const storeId = resolveTargetStoreId(identity, input.storeId);
  assertStoreAccess(identity, STAFF_ROLES, storeId);

  const term = sanitizePostgrestSearchTerm(input.query);
  let q = db
    .from("chat_threads")
    .select("id, guest_name, group_subject, primary_phone_e164, entity_id, lead_id, status, last_message_text, last_message_at, channel_instance_id")
    .eq("store_id", storeId)
    .eq("context_type", "whatsapp")
    .order("last_message_at", { ascending: false })
    .limit(input.limit || 25);

  if (term) {
    q = q.or(
      `guest_name.ilike.%${term}%,group_subject.ilike.%${term}%,primary_phone_e164.ilike.%${term}%,entity_id.ilike.%${term}%,last_message_text.ilike.%${term}%`,
    );
  }

  const { data, error } = await q;
  if (error) throw new Error(`Falha ao listar conversas WhatsApp: ${error.message}`);
  return data || [];
}

export const listWhatsAppThreadsForLeadPicker = createServerFn({ method: "GET" })
  .validator(ListWhatsAppThreadsPickerSchema.optional())
  .handler(async ({ data }) => _listWhatsAppThreadsForLeadPicker(data || {}));

export const OpenOrCreateWhatsAppThreadForLeadSchema = z.object({
  storeId: z.string().uuid().optional(),
  leadId: z.string().uuid(),
  threadId: z.string().uuid().optional(),
  channelInstanceId: z.string().uuid().optional(),
});

export async function _openOrCreateWhatsAppThreadForLead(
  input: z.infer<typeof OpenOrCreateWhatsAppThreadForLeadSchema>,
  deps?: { db?: ReturnType<typeof getServerClient>; identity?: any },
) {
  const db = deps?.db ?? getServerClient();
  const identity = deps?.identity ?? (await getServerIdentity());
  if (!identity?.id) throw new Error("Autenticacao obrigatoria.");
  const storeId = resolveTargetStoreId(identity, input.storeId);
  assertStoreAccess(identity, STAFF_ROLES, storeId);

  const { data: lead, error: leadErr } = await db
    .from("leads_crm")
    .select("id, store_id, full_name, title, phone, email, customer_id, status")
    .eq("id", input.leadId)
    .eq("store_id", storeId)
    .maybeSingle();

  if (leadErr) throw new Error(`Falha ao carregar lead: ${leadErr.message}`);
  if (!lead) throw new Error("Lead nao encontrado nesta loja.");

  const nowIso = new Date().toISOString();
  let matchedThread: any = null;

  // 1. Thread explicitamente selecionada (inclusive @lid sem telefone)
  if (input.threadId) {
    const { data: byExplicit } = await db
      .from("chat_threads")
      .select("id, store_id, channel_instance_id, lead_id, customer_id, guest_name, guest_email, primary_phone_e164, entity_id, context_type, status, metadata, last_message_at")
      .eq("id", input.threadId)
      .eq("store_id", storeId)
      .maybeSingle();
    if (byExplicit) matchedThread = byExplicit;
  }

  // 2. Thread ja vinculada diretamente via lead_id
  if (!matchedThread) {
    const { data: byLeadId } = await db
      .from("chat_threads")
      .select("id, store_id, channel_instance_id, lead_id, customer_id, guest_name, guest_email, primary_phone_e164, entity_id, context_type, status, metadata, last_message_at")
      .eq("store_id", storeId)
      .eq("context_type", "whatsapp")
      .eq("lead_id", lead.id)
      .order("last_message_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (byLeadId) matchedThread = byLeadId;
  }

  // 3. Thread compativel pelas variacoes normalizadas de telefone BR
  const phoneVariants = buildBrazilPhoneVariants(lead.phone);
  if (!matchedThread && phoneVariants.length > 0) {
    const orParts = [
      ...phoneVariants.map((v) => `primary_phone_e164.eq.${v}`),
      ...phoneVariants.map((v) => `entity_id.eq.${v}`),
    ];
    const { data: byPhone } = await db
      .from("chat_threads")
      .select("id, store_id, channel_instance_id, lead_id, customer_id, guest_name, guest_email, primary_phone_e164, entity_id, context_type, status, metadata, last_message_at")
      .eq("store_id", storeId)
      .eq("context_type", "whatsapp")
      .or(orParts.join(","))
      .order("last_message_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (byPhone) matchedThread = byPhone;
  }

  if (matchedThread) {
    const prevMeta = (matchedThread.metadata && typeof matchedThread.metadata === "object"
      ? matchedThread.metadata
      : {}) as Record<string, unknown>;
    const needsUpdate =
      matchedThread.lead_id !== lead.id ||
      prevMeta.active_lead_id !== lead.id ||
      (lead.customer_id && !matchedThread.customer_id);
    if (needsUpdate) {
      await db
        .from("chat_threads")
        .update({
          lead_id: lead.id,
          ...(lead.customer_id && !matchedThread.customer_id ? { customer_id: lead.customer_id } : {}),
          metadata: {
            ...prevMeta,
            active_lead_id: lead.id,
            lead_linked_at: nowIso,
          },
          updated_at: nowIso,
        })
        .eq("id", matchedThread.id)
        .eq("store_id", storeId);
    }
    return {
      success: true,
      created: false,
      threadId: matchedThread.id,
      thread: {
        ...matchedThread,
        lead_id: lead.id,
      },
    };
  }

  // 4. Criar conversa WhatsApp nova vinculada diretamente ao Lead quando houver telefone valido
  const normalizedPhone = normalizePhoneE164(lead.phone) || (sanitizePhoneDigits(lead.phone).length >= 8 ? `+${sanitizePhoneDigits(lead.phone)}` : null);
  if (!normalizedPhone) {
    throw new Error(
      "Este lead ainda nao possui telefone WhatsApp valido. Adicione um WhatsApp ao lead ou vincule manualmente uma conversa existente.",
    );
  }

  let resolvedChannelInstanceId: string | null = input.channelInstanceId || null;
  if (!resolvedChannelInstanceId) {
    const { data: activeInst } = await db
      .from("whatsapp_channel_instances")
      .select("id")
      .eq("store_id", storeId)
      .eq("is_active", true)
      .neq("status", "revoked")
      .neq("status", "disabled")
      .order("is_default", { ascending: false })
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    resolvedChannelInstanceId = activeInst?.id || null;
  }

  const cleanDigits = sanitizePhoneDigits(normalizedPhone);
  const displayName = String(lead.full_name || lead.title || normalizedPhone).trim();
  const insertPayload: Record<string, unknown> = {
    store_id: storeId,
    channel_instance_id: resolvedChannelInstanceId,
    lead_id: lead.id,
    customer_id: lead.customer_id || null,
    guest_name: displayName,
    guest_email: lead.email || `${cleanDigits}@whatsapp.waesy`,
    primary_phone_e164: normalizedPhone,
    status: "open",
    subject: `WhatsApp ${normalizedPhone}`,
    context_type: "whatsapp",
    entity_id: normalizedPhone,
    department: "geral",
    priority: "normal",
    thread_type: "store",
    last_message_at: nowIso,
    metadata: {
      whatsapp_jid: `${cleanDigits}@s.whatsapp.net`,
      active_lead_id: lead.id,
      lead_linked_at: nowIso,
      created_from: "crm_lead",
    },
  };

  const { data: createdThread, error: insErr } = await db
    .from("chat_threads")
    .insert(insertPayload)
    .select("id, store_id, channel_instance_id, lead_id, customer_id, guest_name, guest_email, primary_phone_e164, entity_id, context_type, status, metadata, last_message_at")
    .single();

  if (insErr || !createdThread) {
    throw new Error(insErr?.message || "Nao foi possivel criar conversa WhatsApp para o lead.");
  }

  return {
    success: true,
    created: true,
    threadId: createdThread.id,
    thread: createdThread,
  };
}

export const openOrCreateWhatsAppThreadForLead = createServerFn({ method: "POST" })
  .validator(OpenOrCreateWhatsAppThreadForLeadSchema)
  .handler(async ({ data }) => _openOrCreateWhatsAppThreadForLead(data));

export const ChatQuickActionsCatalogSchema = z.object({
  storeId: z.string().uuid().optional(),
  customerId: z.string().uuid().optional().nullable(),
  leadId: z.string().uuid().optional().nullable(),
});

export interface ChatQuickActionsCatalogDTO {
  store: {
    id: string;
    name: string;
    slug: string | null;
    addressLine: string | null;
    hasPixKey: boolean;
    phone: string | null;
  } | null;
  proposals: Array<{
    id: string;
    title: string;
    destination: string | null;
    publicToken: string;
    status: string;
    leadId: string | null;
    totalCents: number;
    createdAt: string;
  }>;
  invoices: Array<{
    id: string;
    invoiceCode: string;
    documentType: string;
    publicToken: string;
    status: string;
    totalCents: number;
    validUntil: string | null;
    leadId: string | null;
    customerId: string | null;
  }>;
  contracts: Array<{
    id: string;
    title: string;
    status: string;
    publicToken: string;
    leadId: string | null;
    customerId: string | null;
    createdAt: string;
  }>;
  forms: Array<{
    id: string;
    title: string;
    slug: string;
    description: string | null;
    nicheId: string;
  }>;
  products: Array<{
    id: string;
    title: string;
    slug: string;
    priceCents: number;
  }>;
}

export async function _getChatQuickActionsCatalog(
  input: z.infer<typeof ChatQuickActionsCatalogSchema>,
  deps?: { db?: ReturnType<typeof getServerClient>; identity?: any },
): Promise<ChatQuickActionsCatalogDTO> {
  const db = deps?.db ?? getServerClient();
  const identity = deps?.identity ?? (await getServerIdentity());
  if (!identity?.id) throw new Error("Autenticacao obrigatoria.");
  const storeId = resolveTargetStoreId(identity, input.storeId);
  assertStoreAccess(identity, STAFF_ROLES, storeId);

  const [storeRes, formsRes, proposalsRes, invoicesRes, contractsRes, productsRes] = await Promise.all([
    db
      .from("stores")
      .select("id, name, slug, phone, address, city, state, zip_code, pix_key, settings")
      .eq("id", storeId)
      .maybeSingle(),
    db
      .from("lead_forms")
      .select("id, title, slug, description, niche_id, status")
      .eq("store_id", storeId)
      .eq("status", "active")
      .order("updated_at", { ascending: false })
      .limit(15),
    db
      .from("travel_proposals")
      .select("id, title, destination_city, public_token, pricing, status, lead_id, created_at")
      .eq("store_id", storeId)
      .order("created_at", { ascending: false })
      .limit(20),
    db
      .from("commercial_invoices")
      .select("id, invoice_code, document_type, status, public_token, total_cents, lead_id, customer_id, valid_until, created_at")
      .eq("store_id", storeId)
      .order("created_at", { ascending: false })
      .limit(20),
    db
      .from("contracts")
      .select("id, title, category, status, verification_code, lead_id, customer_id, metadata, created_at")
      .eq("store_id", storeId)
      .neq("status", "cancelled")
      .order("created_at", { ascending: false })
      .limit(20),
    db
      .from("products")
      .select("id, title, slug, price_cents, status")
      .eq("store_id", storeId)
      .eq("status", "published")
      .order("updated_at", { ascending: false })
      .limit(25),
  ]);

  const storeRow = storeRes?.data as any;
  const storeSettings = (storeRow?.settings && typeof storeRow.settings === "object" ? storeRow.settings : {}) as Record<string, any>;
  const addressParts = [
    storeRow?.address,
    storeRow?.city && storeRow?.state ? `${storeRow.city}/${storeRow.state}` : storeRow?.city || storeRow?.state,
    storeRow?.zip_code,
  ].filter((p) => typeof p === "string" && p.trim().length > 0);
  const pixKey = String(storeRow?.pix_key || storeSettings.pix_key || "").trim();

  const sortByLeadOrCustomer = <T extends { leadId?: string | null; customerId?: string | null }>(rows: T[]): T[] => {
    return [...rows].sort((a, b) => {
      const aScore = (input.leadId && a.leadId === input.leadId ? 2 : 0) + (input.customerId && a.customerId === input.customerId ? 1 : 0);
      const bScore = (input.leadId && b.leadId === input.leadId ? 2 : 0) + (input.customerId && b.customerId === input.customerId ? 1 : 0);
      return bScore - aScore;
    });
  };

  const proposals = sortByLeadOrCustomer(
    ((proposalsRes?.data as any[]) || [])
      .filter((p) => p?.public_token)
      .map((p) => {
        const pricing = (p.pricing && typeof p.pricing === "object" ? p.pricing : {}) as Record<string, any>;
        return {
          id: p.id,
          title: p.title || p.destination_city || "Proposta Comercial",
          destination: p.destination_city || null,
          publicToken: String(p.public_token),
          status: p.status || "draft",
          leadId: p.lead_id || null,
          customerId: null,
          totalCents: Number(pricing.total_cents || pricing.totalCents || 0),
          createdAt: p.created_at,
        };
      }),
  );

  const invoices = sortByLeadOrCustomer(
    ((invoicesRes?.data as any[]) || [])
      .filter((i) => i?.public_token)
      .map((i) => ({
        id: i.id,
        invoiceCode: i.invoice_code || String(i.id).slice(0, 6).toUpperCase(),
        documentType: i.document_type || "invoice",
        publicToken: String(i.public_token),
        status: i.status || "draft",
        totalCents: Number(i.total_cents || 0),
        validUntil: i.valid_until || null,
        leadId: i.lead_id || null,
        customerId: i.customer_id || null,
      })),
  );

  const contracts = sortByLeadOrCustomer(
    ((contractsRes?.data as any[]) || []).map((c) => ({
      id: c.id,
      title: c.title || "Contrato Digital",
      status: c.status || "draft",
      publicToken: String(c.verification_code || c.id),
      leadId: c.lead_id || null,
      customerId: c.customer_id || null,
      createdAt: c.created_at,
    })),
  );

  const forms = ((formsRes?.data as any[]) || []).map((f) => ({
    id: f.id,
    title: f.title || "Formulario",
    slug: f.slug,
    description: f.description || null,
    nicheId: f.niche_id || "geral",
  }));

  const products = ((productsRes?.data as any[]) || []).map((p) => ({
    id: p.id,
    title: p.title,
    slug: p.slug,
    priceCents: Number(p.price_cents || 0),
  }));

  return {
    store: storeRow
      ? {
          id: storeRow.id,
          name: storeRow.name || "Loja",
          slug: storeRow.slug || null,
          addressLine: addressParts.length > 0 ? addressParts.join(" • ") : null,
          hasPixKey: pixKey.length > 0,
          phone: storeRow.phone || null,
        }
      : null,
    proposals,
    invoices,
    contracts,
    forms,
    products,
  };
}

export const getChatQuickActionsCatalog = createServerFn({ method: "GET" })
  .validator(ChatQuickActionsCatalogSchema.optional())
  .handler(async ({ data }) => _getChatQuickActionsCatalog(data || {}));
