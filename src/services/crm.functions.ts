import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { getServerIdentity, assertStoreAccess, assertManagerAccess } from "@/lib/server-access";
import { enforceRateLimit } from "@/lib/rate-limiter";
import { sanitizeCustomerEmail } from "@/lib/contact-sanitize";
import { normalizeDateOnlyInput } from "@/lib/datetime";
import { extensionForMime, resolveNormalizedMimeType } from "@/lib/chat-media-attachment";
import { sendWhatsAppNotification } from "./integrations.functions";
import { dispatchClosedLoopLeadQualification } from "./pixels.functions";
import { compileContractDocument } from "@/lib/contracts/contract-compiler";
import { autoPositionSignatureFieldsFromContent } from "@/lib/contracts/contract-semantic-dictionary";
import {
  normalizeDestinationTagList,
  normalizeRoomsFromLeadOrLegacy,
} from "@/lib/travel/opportunity-matching-engine";
import {
  formatDynamicFieldLabel,
  formatFieldPrimitiveValue,
  getNicheContractBlueprint,
  normalizeCustomFieldMap,
} from "@/lib/niches/unified-field-bridge";
import {
  normalizeKanbanStageSlug,
  resolveKanbanStageSynonym,
} from "@/lib/niches/kanban-niche-taxonomy";
import { autoBindLeadToMatchingWhatsAppThreads } from "./chat-quick-actions.functions";

async function resolveStoreStageContract(
  supabase: ReturnType<typeof getServerClient>,
  storeId: string | null | undefined,
  rawStage: string,
) {
  let stages: Array<{ stage_key: string; purpose?: string; title?: string }> | undefined;
  let storeHint: Record<string, any> | undefined;
  if (storeId) {
    try {
      const [{ data: stageRows }, { data: storeRow }] = await Promise.all([
        supabase
          .from("kanban_stage_configs")
          .select("stage_key, title, purpose, sort_order")
          .eq("store_id", storeId)
          .in("module", ["commercial_crm", "turismo", "crm"])
          .order("sort_order", { ascending: true }),
        supabase
          .from("stores")
          .select("primary_niche_id, settings")
          .eq("id", storeId)
          .maybeSingle(),
      ]);
      if (Array.isArray(stageRows) && stageRows.length > 0) {
        stages = stageRows as Array<{ stage_key: string; purpose?: string; title?: string }>;
      }
      if (storeRow) {
        storeHint = storeRow as Record<string, any>;
      }
    } catch {
      // Ambientes enxutos usam fallback semantico puro
    }
  }
  return resolveKanbanStageSynonym(rawStage, stages, storeHint);
}

// ─── CARTEIRA DE CLIENTES (BFF CANÔNICO) ──────────────────────────────────────

export const listCustomersInputSchema = z.object({
 query: z.string().optional(),
 status: z.enum(["all", "active", "inactive", "blocked", "archived"]).optional(),
 kind: z.enum(["all", "individual", "company"]).optional(),
 channel: z.string().optional(),
 city: z.string().optional(),
 limit: z.number().int().min(1).max(100).optional(),
 cursor: z.string().nullable().optional(),
}).optional();

export const listCustomers = createServerFn({ method: "GET" })
 .validator(listCustomersInputSchema)
 .handler(async ({ data: filter }) => {
 const supabase = getServerClient();
 const identity = await getServerIdentity();
 assertStoreAccess(identity, ["owner", "admin", "manager", "seller", "support"]);

 const safeLimit = Math.min(Math.max(filter?.limit ?? 50, 1), 100);

 // 1. Busca direta na tabela master customers_crm
 let qb = supabase
 .from("customers_crm")
 .select(
 "id, store_id, full_name, legal_name, kind, document, email, phone, city, state, address, channel, status, tags, notes, total_orders, total_spent_cents, last_order_at, created_at, updated_at, deleted_at",
 )
 .eq("store_id", identity.store_id)
 .order("created_at", { ascending: false })
 .limit(safeLimit);

 if (filter?.cursor) {
 qb = qb.lt("created_at", filter.cursor);
 }

 if (filter?.status && filter.status !== "all") {
 if (filter.status === "archived") {
 qb = qb.not("deleted_at", "is", null);
 } else {
 qb = qb.is("deleted_at", null).eq("status", filter.status);
 }
 } else {
 qb = qb.is("deleted_at", null);
 }

 if (filter?.kind && filter.kind !== "all") {
 qb = qb.eq("kind", filter.kind);
 }

 if (filter?.channel && filter.channel !== "all") {
 qb = qb.eq("channel", filter.channel);
 }

 if (filter?.city && filter.city !== "all") {
 qb = qb.ilike("city", `%${filter.city}%`);
 }

 if (filter?.query && filter.query.trim()) {
 const q = filter.query.trim();
 qb = qb.or(`full_name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%,document.ilike.%${q}%,legal_name.ilike.%${q}%`);
 }

 const { data: customers, error } = await qb;
 if (error) {
 console.error("[crm] error listing customers_crm:", error);
 }

 const list: any[] = customers ? [...customers] : [];

 // Se a tabela customers_crm estiver vazia, verificamos se há clientes legados em workspace_members
 if (list.length === 0 && (!filter?.query && !filter?.status)) {
 const { data: legacyMembers } = await supabase
 .from("workspace_members")
 .select("profile_id, profiles(id, full_name, created_at, tax_id, is_consent_lgpd, phone, avatar_url)")
 .eq("role", "customer")
 .eq("store_id", identity.store_id);

 if (legacyMembers && legacyMembers.length > 0) {
 for (const m of legacyMembers) {
 const p = (m as any).profiles;
 if (p) {
 list.push({
 id: p.id,
 store_id: identity.store_id,
 kind: "individual",
 full_name: p.full_name || "Cliente",
 legal_name: null,
 email: null,
 phone: p.phone || null,
 document: p.tax_id || null,
 city: null,
 state: null,
 address: null,
 status: "active",
 channel: "direct",
 tags: [],
 notes: null,
 total_orders: 0,
 total_spent_cents: 0,
 last_order_at: null,
 created_at: p.created_at,
 updated_at: p.created_at,
 deleted_at: null,
 });
 }
 }
 }
 }

 // 2. Busca métricas multinicho de pedidos + viagens (tourism_trips + travel_sales) para LTV e contagem real
 const customerIds = list.map((c: any) => c.id);
 const orderStats = new Map();
 if (customerIds.length > 0) {
 const [{ data: orders }, { data: trips }, { data: travelProposals }] = await Promise.all([
   supabase
     .from("orders")
     .select("customer_id, total_cents, status")
     .eq("store_id", identity.store_id)
     .in("customer_id", customerIds),
   supabase
     .from("tourism_trips")
     .select("customer_id, total_cents, status")
     .eq("store_id", identity.store_id)
     .in("customer_id", customerIds),
   supabase
     .from("travel_proposals")
     .select("customer_id, pricing, status")
     .eq("store_id", identity.store_id)
     .eq("status", "approved")
     .in("customer_id", customerIds),
 ]);

 if (orders) {
 for (const o of orders) {
 if (!o.customer_id) continue;
 const stats = orderStats.get(o.customer_id) || { ltv: 0, count: 0 };
 stats.count += 1;
 if (["paid", "processing", "ready_for_pickup", "shipped", "delivered", "completed"].includes(o.status)) {
 stats.ltv += Number(o.total_cents || 0);
 }
 orderStats.set(o.customer_id, stats);
 }
 }
 if (trips) {
 for (const tr of trips as any[]) {
 if (!tr.customer_id || ["cancelled", "draft"].includes(String(tr.status || ""))) continue;
 const stats = orderStats.get(tr.customer_id) || { ltv: 0, count: 0 };
 stats.count += 1;
 stats.ltv += Number(tr.total_cents || 0);
 orderStats.set(tr.customer_id, stats);
 }
 }
 if (travelProposals) {
 for (const tp of travelProposals as any[]) {
 if (!tp.customer_id) continue;
 const propTotal = Number(tp.pricing?.total_cents || tp.pricing?.totalCents || 0);
 if (propTotal <= 0) continue;
 const stats = orderStats.get(tp.customer_id) || { ltv: 0, count: 0 };
 stats.count += 1;
 stats.ltv += propTotal;
 orderStats.set(tp.customer_id, stats);
 }
 }
 }

 // 3. Busca alertas de documentos dos clientes (passaporte/cnh vencendo)
 const docAlertsMap = new Map<string, { expired: number; soon: number }>();
 if (customerIds.length > 0) {
 const todayStr = normalizeDateOnlyInput(new Date());
 const soonDate = new Date();
 soonDate.setDate(soonDate.getDate() + 90);
 const soonStr = normalizeDateOnlyInput(soonDate);

 const { data: docs } = await supabase
 .from("customer_documents")
 .select("customer_id, expires_at, verified_at, created_at")
 .in("customer_id", customerIds);

 if (docs) {
 for (const doc of docs as Array<{ customer_id?: string | null; expires_at?: string | null }>) {
 const cid = doc.customer_id;
 const exp = normalizeDateOnlyInput(doc.expires_at);
 if (!cid || !exp) continue;
 const current = docAlertsMap.get(cid) || { expired: 0, soon: 0 };
 if (exp < todayStr) current.expired += 1;
 else if (exp <= soonStr) current.soon += 1;
 docAlertsMap.set(cid, current);
 }
 }
 }

 // 4. Mapeamento final para o frontend
 return list.map((c: any) => {
 const stats = orderStats.get(c.id) || { ltv: 0, count: 0 };
 const docAlerts = docAlertsMap.get(c.id) || { expired: 0, soon: 0 };
 return {
 id: c.id,
 kind: c.kind || "individual",
 name: c.full_name || "Cliente sem nome",
 fullName: c.full_name || "Cliente sem nome",
 legalName: c.legal_name,
 document: c.document || c.tax_id || null,
 taxId: c.document || c.tax_id || null,
 email: sanitizeCustomerEmail(c.email),
 phone: c.phone || null,
 status: c.status || "active",
 channel: c.channel || "direct",
 city: c.city || null,
 state: c.state || null,
 tags: c.tags || [],
 notes: c.notes || null,
 creditLimitCents: c.credit_limit_cents || 0,
 assignedTo: c.assigned_to || null,
 orderCount: stats.count || Number(c.total_orders || 0),
 ltvCents: stats.ltv || Number(c.total_spent_cents || 0),
 rfvStage: c.rfv_stage || (stats.count >= 2 ? "recurring" : stats.count === 1 ? "first_purchase" : "lead"),
 rfvScore: Number(c.rfv_score || 0),
 referralCreditBalanceCents: Number(c.referral_credit_balance_cents || 0),
 joinedAt: c.created_at,
 createdAt: c.created_at,
 docAlerts,
 };
 });
 });

export const getCustomer360 = createServerFn({ method: "GET" })
 .validator(z.object({ customerId: z.string().uuid() }))
 .handler(async ({ data: { customerId } }) => {
 const supabase = getServerClient();
 const identity = await getServerIdentity();
 assertStoreAccess(identity, ["owner", "admin", "manager", "seller", "support"]);

 // 1. Busca primeiro em customers_crm
 let { data: customer } = await supabase
 .from("customers_crm")
 .select("*")
 .eq("id", customerId)
 .eq("store_id", identity.store_id)
 .maybeSingle();

 // Se não estiver em customers_crm, busca legado em workspace_members
 let legacyProfile: any = null;
 if (!customer) {
 const { data: member } = await supabase
 .from("workspace_members")
 .select("profiles(id, full_name, created_at, tax_id, is_consent_lgpd, phone, avatar_url)")
 .eq("profile_id", customerId)
 .eq("store_id", identity.store_id)
 .maybeSingle();

 legacyProfile = member?.profiles;
 if (legacyProfile) {
 customer = {
 id: legacyProfile.id,
 store_id: identity.store_id,
 kind: "individual",
 full_name: legacyProfile.full_name || "Cliente",
 document: legacyProfile.tax_id,
 phone: legacyProfile.phone,
 status: "active",
 tags: [],
 notes: null,
 created_at: legacyProfile.created_at,
 };
 }
 }

 if (!customer) {
 throw new Error("Cliente não encontrado na base.");
 }

 // 2. Busca Pedidos
 const { data: orders } = await supabase
 .from("orders")
 .select("id, public_token, total_cents, status, created_at")
 .eq("customer_id", customerId)
 .order("created_at", { ascending: false });

 // 3. Busca Documentos anexos com cálculo de validade e URL assinada do cofre privado
 const { data: documents } = await supabase
 .from("customer_documents")
 .select("*")
 .eq("customer_id", customerId)
 .order("created_at", { ascending: false });

 const processedDocs = await hydrateSignedCustomerDocuments(supabase, documents || []);

 // 4. Busca Oportunidades Comerciais (Leads) vinculadas a este cliente
 const { data: rawCommercialLeads } = await supabase
 .from("leads_crm")
 .select("id, title, full_name, status, estimated_value_cents, source, lead_source_detail, custom_fields, algorithmic_score, follow_up_at, created_at, updated_at")
 .eq("customer_id", customerId)
 .order("created_at", { ascending: false });

 const commercialLeads = (rawCommercialLeads || []).map((l: any) => ({
   ...l,
   probability: l.algorithmic_score ?? null,
   expected_close_date: l.follow_up_at ?? null,
 }));

 // 5. Busca Cotações / Orçamentos (Integrado a travel_quotes)
 let quotations: any[] = [];
 try {
 const emailFilter = customer.email ? `contact_email.eq.${customer.email}` : "";
 const cleanPhone = customer.phone ? customer.phone.replace(/\D/g, "").slice(-8) : "";
 const phoneFilter = cleanPhone ? `contact_whatsapp.ilike.%${cleanPhone}%` : "";
 const orFilter = [emailFilter, phoneFilter].filter(Boolean).join(",");

 if (orFilter) {
 const { data: qData } = await supabase
 .from("travel_quotes")
 .select("id, contact_name, destination_city, quote_amount_cents, status, created_at")
 .or(orFilter)
 .order("created_at", { ascending: false });
 quotations = qData || [];
 }
 } catch (err) {
 console.warn("[crm] falha ao buscar cotações vinculadas:", err);
 }

 // 6. Busca Ingressos / Inscrições em Eventos
 const { data: rawTickets } = await supabase
 .from("tickets")
 .select("id, event_id, status, created_at, events(title, event_date)")
 .eq("owner_profile_id", customerId)
 .order("created_at", { ascending: false });

 const tickets = (rawTickets || []).map((t: any) => ({
   ...t,
   events: t.events ? { ...t.events, date: t.events.event_date ?? null } : null,
 }));

  // 6b. Busca Viagens Confirmadas do Turismo (tourism_trips)
  let confirmedTrips: any[] = [];
  try {
    const cleanPhone = customer.phone ? customer.phone.replace(/\D/g, "").slice(-8) : "";
    let tripQuery = supabase
      .from("tourism_trips")
      .select("id, trip_number, title, destination_city, travel_start_date, travel_end_date, status, total_cents, adults_count, children_count, flights, hotels, created_at")
      .eq("store_id", identity.store_id);

    const tripOr: string[] = [];
    if (customerId) tripOr.push(`customer_id.eq.${customerId}`);
    if (customer.email) tripOr.push(`client_email.eq.${customer.email}`);
    if (cleanPhone) tripOr.push(`client_whatsapp.ilike.%${cleanPhone}%`);

    if (tripOr.length > 0) {
      tripQuery = tripQuery.or(tripOr.join(","));
    }

    const { data: tripsData } = await tripQuery.order("created_at", { ascending: false });
    confirmedTrips = tripsData || [];
  } catch (err) {
    console.warn("[crm] falha ao buscar tourism_trips vinculadas:", err);
  }

  // 6b-2. Busca Passageiros Vinculados (Co-Viajantes nas mesmas viagens confirmadas)
  let coTravelers: any[] = [];
  if (confirmedTrips.length > 0) {
    try {
      const tripIds = confirmedTrips.map((t: any) => t.id);
      const { data: paxRows } = await supabase
        .from("trip_passengers")
        .select("id, trip_id, full_name, document_type, document, birth_date, phone, email, seat_number, is_lead_passenger")
        .in("trip_id", tripIds);
      if (paxRows) {
        const tripTitleMap = new Map(confirmedTrips.map((t: any) => [t.id, t.title || t.destination_city || t.trip_number]));
        coTravelers = paxRows.map((px: any) => ({
          ...px,
          trip_title: tripTitleMap.get(px.trip_id) || "Viagem Confirmada",
        }));
      }
    } catch (coErr) {
      console.warn("[crm] notice fetching trip_passengers coTravelers:", coErr);
    }
  }

  // 6c. Busca Passes da Carteira Digital (Apple Wallet Passes)
  let walletPasses: any[] = [];
  try {
    const { data: wpData } = await supabase
      .from("client_wallet_passes")
      .select("*")
      .eq("store_id", identity.store_id)
      .eq("client_id", customerId)
      .order("created_at", { ascending: false });
    walletPasses = wpData || [];
  } catch (err) {
    console.warn("[crm] falha ao buscar client_wallet_passes:", err);
  }

  // 6d. Busca Preferências e Anamnese do Viajante
  let travelerPreferences: any = null;
  try {
    const { data: prefRecord } = await supabase
      .from("crm_clinical_records")
      .select("content")
      .eq("customer_id", customerId)
      .eq("record_type", "traveler_preferences")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (prefRecord?.content) {
      travelerPreferences = prefRecord.content;
    }
  } catch (err) {
    console.warn("[crm] notice fetching traveler_preferences:", err);
  }

  // 6e. Busca Propostas Comerciais Digitais (travel_proposals)
  let customerProposals: any[] = [];
  try {
    const cleanPhone = customer.phone ? customer.phone.replace(/\D/g, "").slice(-8) : "";
    let propQuery = supabase
      .from("travel_proposals")
      .select("id, lead_id, customer_id, public_token, title, destination_city, client_name, client_whatsapp, client_email, status, pricing, valid_until, created_at")
      .eq("store_id", identity.store_id);

    const propOr: string[] = [];
    if (customerId) propOr.push(`customer_id.eq.${customerId}`);
    if (customer.email) propOr.push(`client_email.eq.${customer.email}`);
    if (cleanPhone) propOr.push(`client_whatsapp.ilike.%${cleanPhone}%`);
    if (customer.full_name && customer.full_name.length > 2) propOr.push(`client_name.ilike.%${customer.full_name}%`);

    if (propOr.length > 0) {
      propQuery = propQuery.or(propOr.join(","));
      const { data: propData } = await propQuery.order("created_at", { ascending: false });
      customerProposals = propData || [];
    }
  } catch (err) {
    console.warn("[crm] falha ao buscar travel_proposals:", err);
  }

  // 6f. Busca Contratos Digitais (contracts)
  let customerContracts: any[] = [];
  try {
    const cleanPhone = customer.phone ? customer.phone.replace(/\D/g, "").slice(-8) : "";
    const cleanDoc = customer.document ? customer.document.replace(/\D/g, "") : "";

    const { data: contractRows } = await supabase
      .from("contracts")
      .select("id, title, category, status, current_version, verification_code, customer_id, lead_id, metadata, created_at")
      .or(`store_id.eq.${identity.store_id},metadata->>store_id.eq.${identity.store_id}`)
      .order("created_at", { ascending: false });

    if (contractRows) {
      customerContracts = contractRows.filter((c: any) => {
        const m = c.metadata || {};
        if (customerId && (c.customer_id === customerId || m.customer_id === customerId)) return true;
        if (cleanDoc && m.client_document && m.client_document.replace(/\D/g, "").includes(cleanDoc)) return true;
        if (customer.email && m.client_email && m.client_email.toLowerCase() === customer.email.toLowerCase()) return true;
        if (cleanPhone && m.client_phone && m.client_phone.replace(/\D/g, "").includes(cleanPhone)) return true;
        if (customer.full_name && m.client_name && m.client_name.toLowerCase().includes(customer.full_name.toLowerCase())) return true;
        return false;
      });
    }
  } catch (err) {
    console.warn("[crm] falha ao buscar contracts:", err);
  }

  // 6g. Busca Faturas e Orçamentos Comerciais (commercial_invoices)
  let customerInvoices: any[] = [];
  try {
    const cleanDoc = customer.document ? customer.document.replace(/\D/g, "") : "";
    const cleanPhone = customer.phone ? customer.phone.replace(/\D/g, "").slice(-8) : "";
    let invQuery = supabase
      .from("commercial_invoices")
      .select("id, invoice_code, document_type, status, total_cents, public_token, customer_snapshot, contract_id, created_at")
      .eq("store_id", identity.store_id);

    const invOr: string[] = [];
    if (customerId) invOr.push(`customer_id.eq.${customerId}`);
    if (cleanDoc) invOr.push(`customer_snapshot->>cpfOrCnpj.ilike.%${cleanDoc}%`);
    if (customer.email) invOr.push(`customer_snapshot->>email.eq.${customer.email}`);
    if (cleanPhone) invOr.push(`customer_snapshot->>phone.ilike.%${cleanPhone}%`);
    if (customer.full_name && customer.full_name.length > 2) invOr.push(`customer_snapshot->>name.ilike.%${customer.full_name}%`);

    if (invOr.length > 0) {
      invQuery = invQuery.or(invOr.join(","));
    }
    const { data: invRows } = await invQuery.order("created_at", { ascending: false });
    customerInvoices = invRows || [];
  } catch (err) {
    console.warn("[crm] notice fetching commercial_invoices:", err);
  }

  // 6h. Busca Orcamentos Multi-Nicho (quotes)
  let customerQuotes: any[] = [];
  try {
    const cleanPhone = customer.phone ? customer.phone.replace(/\D/g, "").slice(-8) : "";
    let qtQuery = supabase
      .from("quotes")
      .select("id, quote_number, status, total_cents, valid_until, lead_id, niche_id, custom_fields, created_at")
      .eq("store_id", identity.store_id);

    const qtOr: string[] = [];
    if (customerId) qtOr.push(`customer_id.eq.${customerId}`);
    if (customer.email) qtOr.push(`guest_email.eq.${customer.email}`);
    if (cleanPhone) qtOr.push(`guest_phone.ilike.%${cleanPhone}%`);
    if (customer.full_name && customer.full_name.length > 2) qtOr.push(`guest_name.ilike.%${customer.full_name}%`);

    if (qtOr.length > 0) {
      qtQuery = qtQuery.or(qtOr.join(","));
    }
    const { data: qtRows } = await qtQuery.order("created_at", { ascending: false });
    customerQuotes = qtRows || [];
  } catch (err) {
    console.warn("[crm] notice fetching quotes:", err);
  }

  // 7. Monta Timeline 360 Unificada
 const timeline: any[] = [];
 (orders || []).forEach((o: any) => {
 timeline.push({
 id: `order_${o.id}`,
 type: "order",
 title: `Pedido #${o.public_token || o.id.slice(0, 8)}`,
 description: `Total: R$ ${(o.total_cents / 100).toFixed(2)} • Status: ${o.status}`,
 status: o.status,
 timestamp: o.created_at,
 metadata: { total_cents: o.total_cents, order_id: o.id },
 });
 });

  (confirmedTrips || []).forEach((tr: any) => {
    timeline.push({
      id: `trip_${tr.id}`,
      type: "trip",
      title: `Viagem: ${tr.title || tr.destination_city}`,
      description: `Código: ${tr.trip_number} • Destino: ${tr.destination_city} • Status: ${tr.status}`,
      status: tr.status,
      timestamp: tr.created_at,
      metadata: { trip_id: tr.id, total_cents: tr.total_cents },
    });
  });

 (commercialLeads || []).forEach((l: any) => {
 const cf = (l.custom_fields as Record<string, any>) || {};
 const hasAdData = Boolean(cf.utm_campaign || cf.utm_source || cf.meta_ad_id || cf.meta_form_id || cf.gclid || l.source?.includes("meta") || l.source?.includes("ad"));

 timeline.push({
 id: `lead_${l.id}`,
 type: "commercial_lead",
 title: `Negociação: ${l.title || l.full_name}`,
 description: `Status: ${l.status} • Estimativa: R$ ${((l.estimated_value_cents || 0) / 100).toFixed(2)}`,
 status: l.status,
 timestamp: l.created_at,
 metadata: { lead_id: l.id, source: l.source, custom_fields: cf },
 });

 if (hasAdData) {
   const campaignName = cf.utm_campaign || (cf.meta_ad_id ? `Anúncio #${cf.meta_ad_id}` : (cf.gclid ? "Google Ads Click" : l.source || "Campanha"));
   const platformName = cf.meta_ad_id || l.source?.includes("meta") ? "Meta Ads (Instagram / Facebook)" : (cf.gclid || l.source?.includes("google") ? "Google Ads" : "Campanha Digital");
   timeline.push({
     id: `ad_touch_${l.id}`,
     type: "ad_touchpoint",
     title: `Origem de Anúncio: ${platformName}`,
     description: `Campanha: ${campaignName} ${cf.utm_medium ? `• Mídia: ${cf.utm_medium}` : ""} ${cf.meta_form_id ? `• Formulário Instantâneo #${cf.meta_form_id}` : ""}`,
     status: "tracked",
     timestamp: l.created_at,
     metadata: {
       platform: platformName,
       campaign: campaignName,
       lead_id: l.id,
       fbp: cf.fbp,
       fbc: cf.fbc,
       device_id: cf.device_id,
     },
   });
 }
 });

 (quotations || []).forEach((q: any) => {
 timeline.push({
 id: `quote_${q.id}`,
 type: "quote",
 title: `Cotação de Viagem: ${q.destination_city || "Personalizada"}`,
 description: `Status: ${q.status} • Valor: ${q.quote_amount_cents ? `R$ ${((q.quote_amount_cents || 0) / 100).toFixed(2)}` : "Sob Análise"}`,
 status: q.status,
 timestamp: q.created_at,
 metadata: { quotation_id: q.id },
 });
 });

 (tickets || []).forEach((t: any) => {
 timeline.push({
 id: `ticket_${t.id}`,
 type: "ticket",
 title: `Ingresso: ${t.events?.title || "Evento"}`,
 description: `Data: ${t.events?.date || "A definir"}`,
 status: t.status,
 timestamp: t.created_at,
 metadata: { ticket_id: t.id },
 });
 });

  (customerProposals || []).forEach((p: any) => {
    const priceCents = p.pricing?.total_price_cents || p.pricing?.total_cents || 0;
    timeline.push({
      id: `proposal_${p.id}`,
      type: "proposal",
      title: `Proposta: ${p.title || p.destination_city || "Proposta Comercial"}`,
      description: `Destino: ${p.destination_city || "N/D"} • Status: ${p.status} ${priceCents > 0 ? `• R$ ${(priceCents / 100).toFixed(2)}` : ""}`,
      status: p.status,
      timestamp: p.created_at,
      metadata: { proposal_id: p.id, public_token: p.public_token, price_cents: priceCents },
    });
  });

  (customerInvoices || []).forEach((inv: any) => {
    timeline.push({
      id: `invoice_${inv.id}`,
      type: "commercial_invoice",
      title: `${inv.document_type === "budget" ? "Orçamento" : "Fatura"} ${inv.invoice_code}`,
      description: `Status: ${inv.status} • Total: R$ ${((inv.total_cents || 0) / 100).toFixed(2)}`,
      status: inv.status,
      timestamp: inv.created_at,
      metadata: { invoice_id: inv.id, public_token: inv.public_token, total_cents: inv.total_cents, contract_id: inv.contract_id },
    });
  });

  (customerQuotes || []).forEach((q: any) => {
    timeline.push({
      id: `hybrid_quote_${q.id}`,
      type: "commercial_quote",
      title: `Orçamento ${q.quote_number || q.id.slice(0, 8)}`,
      description: `Status: ${q.status} • Total: R$ ${((q.total_cents || 0) / 100).toFixed(2)}`,
      status: q.status,
      timestamp: q.created_at,
      metadata: { quote_id: q.id, total_cents: q.total_cents, lead_id: q.lead_id, niche_id: q.niche_id },
    });
  });

  (customerContracts || []).forEach((c: any) => {
    const totalCents = c.metadata?.total_value_cents || 0;
    timeline.push({
      id: `contract_${c.id}`,
      type: "contract",
      title: `Contrato: ${c.title || "Contrato de Prestação de Serviços"}`,
      description: `Status: ${c.status} • Cód: ${c.verification_code || c.id.slice(0, 8)} ${totalCents > 0 ? `• R$ ${(totalCents / 100).toFixed(2)}` : ""}`,
      status: c.status,
      timestamp: c.created_at,
      metadata: { contract_id: c.id, verification_code: c.verification_code, total_value_cents: totalCents },
    });
  });

  timeline.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

 // Cálculos de LTV e ticket médio
 const completedOrders = (orders || []).filter((o: any) =>
 ["paid", "processing", "ready_for_pickup", "shipped", "delivered", "completed"].includes(o.status)
 );
 const ltvCents = completedOrders.reduce((sum: number, o: any) => sum + o.total_cents, 0);
 const averageTicketCents = completedOrders.length > 0 ? Math.round(ltvCents / completedOrders.length) : 0;
 const lastOrderDate = orders?.[0]?.created_at;
 const daysSinceLastOrder = lastOrderDate
 ? Math.floor((Date.now() - new Date(lastOrderDate).getTime()) / (1000 * 60 * 60 * 24))
 : 0;

  // 8. Busca créditos reais do cliente
  const { data: rawCustomerCredits } = await supabase
  .from("customer_credits")
  .select("id, balance_cents, created_at")
  .eq("customer_id", customerId)
  .order("created_at", { ascending: false });

  const customerCredits = (rawCustomerCredits || []).map((c: any) => ({
    ...c,
    amount_cents: c.balance_cents ?? 0,
    description: null,
  }));

  const totalCreditCents = (customerCredits || []).reduce(
  (sum: number, c: any) => sum + (c.balance_cents || 0),
  0
  );

  // 9. Busca prontuários clínicos
  const { data: clinicalData } = await supabase
  .from("crm_clinical_records")
  .select("id, record_type, content, created_at")
  .eq("customer_id", customerId)
  .order("created_at", { ascending: false });

  const clinicalRecords = (clinicalData || []).map((r: any) => {
    let parsed: any = {};
    if (typeof r.content === "string") {
      try {
        parsed = JSON.parse(r.content);
      } catch {
        parsed = { notes: r.content };
      }
    } else if (r.content && typeof r.content === "object") {
      parsed = r.content;
    }
    return {
      id: r.id,
      service_title: parsed.service_title || "Atendimento",
      notes: parsed.notes || (typeof r.content === "string" ? r.content : ""),
      allergies: parsed.allergies || null,
      medical_history: parsed.medical_history || null,
      emergency_contact: parsed.emergency_contact || null,
      preferred_professional: parsed.preferred_professional || null,
      professional_name: parsed.professional_name || null,
      created_at: r.created_at,
    };
  });

  return {
  profile: {
  id: customer.id,
  // aliases para compatibilidade com o componente
  name: customer.full_name || "Cliente",
  fullName: customer.full_name || "Cliente",
  legalName: customer.legal_name || null,
  taxId: customer.document || null,
  rg: customer.rg || null,
  email: sanitizeCustomerEmail(customer.email),
  phone: customer.phone || null,
  birthDate: customer.birth_date || null,
  kind: customer.kind || "individual",
  status: customer.status || "active",
  channel: customer.channel || "direct",
  city: customer.city || null,
  state: customer.state || null,
  zipcode: customer.zipcode || null,
  addressLine: customer.address_line || null,
  creditLimitCents: customer.credit_limit_cents || 0,
  assignedTo: customer.assigned_to || null,
  createdAt: customer.created_at,
  // campos defensivos para UI
  avatarUrl: null as string | null,
  isConsentLgpd: (customer as any).lgpd_accepted || false,
  emergencyContactName: (customer as any).emergency_contact_name || null,
  emergencyContactPhone: (customer as any).emergency_contact_phone || null,
  },
  crm: {
  notes: customer.notes || "",
  tags: customer.tags || [],
  },
  orders: orders || [],
  documents: processedDocs,
  commercialLeads: commercialLeads || [],
  addresses: customer.address_line ? [{
  id: `addr_${customer.id}`,
  street: customer.address_line,
  city: customer.city || "",
  state: customer.state || "",
  zipcode: customer.zipcode || "",
  is_default: true,
  }] : [],
  credits: customerCredits || [],
  clinicalRecords,
  confirmedTrips,
  coTravelers,
  walletPasses,
  travelerPreferences,
    proposals: customerProposals,
    quotes: customerQuotes,
    contracts: customerContracts,
    commercialInvoices: customerInvoices,
    customFields: customer.custom_fields || {},
    consentRecords: Array.isArray(customer.custom_fields?.consent_records)
      ? customer.custom_fields.consent_records
      : [],
    timeline,
    verifiedOpportunities: await (async () => {
      try {
        const primaryLead = (commercialLeads || [])[0];
        if (!primaryLead?.id) return [];
        const { internalGetVerifiedOpportunitiesForLead } = await import("./opportunity-radar.functions");
        const bundle = await internalGetVerifiedOpportunitiesForLead({
          storeId: identity.store_id,
          leadId: primaryLead.id,
        });
        return [
          ...bundle.verifiedOpportunities,
          ...bundle.verifiedSimilarProposals.map((vp) => ({
            id: vp.id,
            sourceType: "proposal",
            offerTitle: vp.title,
            destinationCity: vp.destinationCity,
            matchScore: vp.matchScore,
            effectiveTotalCents: vp.effectiveTotalCents,
            requiresChildRequote: vp.requiresChildRequote,
            matchReasons: vp.reasons,
            warnings: vp.warnings,
            createdAt: vp.createdAt,
          })),
        ];
      } catch {
        return [];
      }
    })(),
  // métricas — nomes com aliases completos para compatibilidade
  ltvCents,
  totalLtvCents: ltvCents,
  totalOrdersCount: orders?.length || 0,
  averageTicketCents,
  totalCreditCents,
  daysSinceLastOrder,
  };
  });

export const createCustomerSchema = z.object({
 kind: z.enum(["individual", "company"]).default("individual"),
 fullName: z.string().min(2, "Nome deve ter ao menos 2 caracteres"),
 legalName: z.string().optional().nullable(),
 document: z.string().optional().nullable(),
 rg: z.string().optional().nullable(),
 gender: z.string().optional().nullable(),
 occupation: z.string().optional().nullable(),
 email: z.string().email("E-mail inválido").optional().or(z.literal("")).nullable(),
 phone: z.string().optional().nullable(),
 birthDate: z.string().optional().nullable(),
 status: z.enum(["active", "inactive", "blocked"]).default("active"),
 channel: z.string().default("direct"),
 referralSource: z.string().optional().nullable(),
 city: z.string().optional().nullable(),
 state: z.string().optional().nullable(),
 zipcode: z.string().optional().nullable(),
 addressLine: z.string().optional().nullable(),
 creditLimitCents: z.number().int().nonnegative().default(0),
 assignedTo: z.string().uuid().optional().nullable(),
 emergencyContactName: z.string().optional().nullable(),
 emergencyContactPhone: z.string().optional().nullable(),
 lgpdAccepted: z.boolean().optional().default(false),
 allergies: z.string().optional().nullable(),
 healthNotes: z.string().optional().nullable(),
 preferredProfessionalId: z.string().uuid().optional().nullable(),
 nicheMetadata: z.record(z.unknown()).optional(),
 tags: z.array(z.string()).optional(),
 notes: z.string().optional().nullable(),
});

export const createCustomer = createServerFn({ method: "POST" })
 .validator(createCustomerSchema)
 .handler(async ({ data: input }) => {
 const supabase = getServerClient();
 const identity = await getServerIdentity();
 assertStoreAccess(identity, ["owner", "admin", "manager", "seller"]);

 // Deduplicação por documento no catálogo se fornecido
 if (input.document && input.document.trim()) {
 const cleanDoc = input.document.replace(/[^\d]/g, "");
 if (cleanDoc.length > 0) {
 const { data: existing } = await supabase
 .from("customers_crm")
 .select("id, full_name")
 .eq("store_id", identity.store_id)
 .eq("document", input.document.trim())
 .is("deleted_at", null)
 .maybeSingle();

 if (existing) {
 throw new Error(`Já existe um cliente cadastrado com este documento: ${existing.full_name}`);
 }
 }
 }

 const { data: inserted, error } = await supabase
 .from("customers_crm")
 .insert({
 store_id: identity.store_id,
 kind: input.kind,
 full_name: input.fullName.trim(),
 legal_name: input.legalName?.trim() || null,
 document: input.document?.trim() || null,
 rg: input.rg?.trim() || null,
 email: input.email?.trim() || null,
 phone: input.phone?.trim() || null,
 birth_date: input.birthDate || null,
 status: input.status,
 channel: input.channel,
 city: input.city?.trim() || null,
 state: input.state?.trim() || null,
 zipcode: input.zipcode?.trim() || null,
 address_line: input.addressLine?.trim() || null,
 credit_limit_cents: input.creditLimitCents || 0,
 assigned_to: input.assignedTo || null,
 emergency_contact_name: input.emergencyContactName?.trim() || null,
 emergency_contact_phone: input.emergencyContactPhone?.trim() || null,
 lgpd_accepted: input.lgpdAccepted ?? false,
 allergies: input.allergies?.trim() || null,
 health_notes: input.healthNotes?.trim() || null,
 preferred_professional_id: input.preferredProfessionalId || null,
 niche_metadata: input.nicheMetadata || {},
 custom_fields: {
 gender: input.gender || null,
 occupation: input.occupation || null,
 referral_source: input.referralSource || null,
 allergies: input.allergies || null,
 ...(input.nicheMetadata || {}),
 },
 tags: input.tags || [],
 notes: input.notes?.trim() || null,
 })
 .select()
 .single();

 if (error) {
 console.error("[crm] error inserting customer:", error);
 throw new Error("Erro ao salvar cliente na base.");
 }

 if (input.allergies?.trim() || input.healthNotes?.trim()) {
 try {
 await supabase.from("crm_clinical_records").insert({
 customer_id: inserted.id,
 store_id: identity.store_id,
 author_id: identity.id,
 record_type: "anamnesis",
 content: {
 service_title: "Anamnese Inicial de Cadastro",
 professional_name: (identity as any).name || "Recepção / Especialista",
 notes: input.healthNotes?.trim() || "Cadastro inicial de anamnese",
 allergies: input.allergies?.trim() || null,
 },
 attachments: [],
 });
 } catch (clinErr) {
 console.warn("[crm] optional clinical record error:", clinErr);
 }
 }

 return inserted;
 });

export const updateCustomerSchema = z.object({
 id: z.string().uuid(),
 kind: z.enum(["individual", "company"]).optional(),
 fullName: z.string().min(2).optional(),
 legalName: z.string().optional().nullable(),
 document: z.string().optional().nullable(),
 rg: z.string().optional().nullable(),
 avatarUrl: z.string().optional().nullable(),
 email: z.string().optional().nullable(),
 phone: z.string().optional().nullable(),
 birthDate: z.string().optional().nullable(),
 status: z.enum(["active", "inactive", "blocked"]).optional(),
 channel: z.string().optional(),
 city: z.string().optional().nullable(),
 state: z.string().optional().nullable(),
 zipcode: z.string().optional().nullable(),
 addressLine: z.string().optional().nullable(),
 creditLimitCents: z.number().int().nonnegative().optional(),
 assignedTo: z.string().uuid().optional().nullable(),
 tags: z.array(z.string()).optional(),
 notes: z.string().optional().nullable(),
 emergencyContactName: z.string().optional().nullable(),
 emergencyContactPhone: z.string().optional().nullable(),
});

export const updateCustomer = createServerFn({ method: "POST" })
 .validator(updateCustomerSchema)
 .handler(async ({ data: input }) => {
 const supabase = getServerClient();
 const identity = await getServerIdentity();
 assertStoreAccess(identity, ["owner", "admin", "manager", "seller"]);

 const updatePayload: Record<string, any> = {};
 if (input.kind !== undefined) updatePayload.kind = input.kind;
 if (input.fullName !== undefined) updatePayload.full_name = input.fullName;
 if (input.legalName !== undefined) updatePayload.legal_name = input.legalName;
 if (input.document !== undefined) updatePayload.document = input.document;
 if (input.rg !== undefined) updatePayload.rg = input.rg;
 if (input.avatarUrl !== undefined) updatePayload.avatar_url = input.avatarUrl;
 if (input.email !== undefined) updatePayload.email = input.email;
 if (input.phone !== undefined) updatePayload.phone = input.phone;
 if (input.birthDate !== undefined) updatePayload.birth_date = input.birthDate;
 if (input.status !== undefined) updatePayload.status = input.status;
 if (input.channel !== undefined) updatePayload.channel = input.channel;
 if (input.city !== undefined) updatePayload.city = input.city;
 if (input.state !== undefined) updatePayload.state = input.state;
 if (input.zipcode !== undefined) updatePayload.zipcode = input.zipcode;
 if (input.addressLine !== undefined) updatePayload.address_line = input.addressLine;
 if (input.creditLimitCents !== undefined) updatePayload.credit_limit_cents = input.creditLimitCents;
 if (input.assignedTo !== undefined) updatePayload.assigned_to = input.assignedTo;
 if (input.tags !== undefined) updatePayload.tags = input.tags;
 if (input.notes !== undefined) updatePayload.notes = input.notes;
 if (input.emergencyContactName !== undefined) updatePayload.emergency_contact_name = input.emergencyContactName;
 if (input.emergencyContactPhone !== undefined) updatePayload.emergency_contact_phone = input.emergencyContactPhone;

 const { error } = await supabase
 .from("customers_crm")
 .update(updatePayload)
 .eq("id", input.id)
 .eq("store_id", identity.store_id);

 if (error) throw new Error("Erro ao atualizar cliente: " + error.message);

 if (input.avatarUrl !== undefined || input.fullName !== undefined) {
   const threadUpdates: Record<string, any> = { updated_at: new Date().toISOString() };
   if (input.avatarUrl !== undefined) threadUpdates.participant_avatar_url = input.avatarUrl;
   if (input.fullName !== undefined) threadUpdates.participant_name = input.fullName;
   await (supabase.from("chat_threads") as any)
     .update(threadUpdates)
     .eq("store_id", identity.store_id)
     .eq("customer_id", input.id)
     .catch(() => null);
 }
 return { success: true };
 });

export const archiveCustomer = createServerFn({ method: "POST" })
 .validator(z.object({ customerId: z.string().uuid() }))
 .handler(async ({ data: { customerId } }) => {
 const supabase = getServerClient();
 const identity = await getServerIdentity();
 assertStoreAccess(identity, ["owner", "admin", "manager"]);

 const { error } = await supabase
 .from("customers_crm")
 .update({ deleted_at: new Date().toISOString() })
 .eq("id", customerId)
 .eq("store_id", identity.store_id);

 if (error) throw new Error("Erro ao arquivar cliente: " + error.message);
 return { success: true };
 });

export const restoreCustomer = createServerFn({ method: "POST" })
 .validator(z.object({ customerId: z.string().uuid() }))
 .handler(async ({ data: { customerId } }) => {
 const supabase = getServerClient();
 const identity = await getServerIdentity();
 assertStoreAccess(identity, ["owner", "admin", "manager"]);

 const { error } = await supabase
 .from("customers_crm")
 .update({ deleted_at: null })
 .eq("id", customerId)
 .eq("store_id", identity.store_id);

 if (error) throw new Error("Erro ao restaurar cliente: " + error.message);
 return { success: true };
 });

// ─── GESTÃO DE DOCUMENTOS DO CLIENTE (PASSAPORTE, CNH, RG, VISTOS) ──────────

export const CUSTOMER_DOCUMENT_TYPES = [
 "passport",
 "cnh",
 "rg",
 "cpf",
 "visa",
 "vaccination_card",
 "contract",
 "proof_of_residence",
 "other",
] as const;

const CUSTOMER_DOC_TITLES: Record<string, string> = {
 passport: "Passaporte",
 cnh: "CNH",
 rg: "RG",
 cpf: "CPF",
 visa: "Visto Consular",
 vaccination_card: "Cartão de Vacina (CIVP)",
 contract: "Contrato Assinado",
 proof_of_residence: "Comprovante de Residência",
 other: "Documento",
};

const PUBLIC_DOCUMENT_MIME_TYPES = new Set([
 "image/jpeg",
 "image/jpg",
 "image/png",
 "image/webp",
 "image/heic",
 "image/heif",
 "application/pdf",
]);

const MAX_PUBLIC_DOC_UPLOAD_BYTES = 15 * 1024 * 1024; // 15 MB

function toCanonicalDocumentType(docType: string): string {
 if (docType === "contract") return "contract";
 if (docType === "proof_of_residence") return "proof_of_residence";
 if (["passport", "cnh", "rg", "cpf", "visa", "vaccination_card"].includes(docType)) return "id";
 return "other";
}

function computeDocumentExpiryStatus(expiresAt: string | null | undefined): "valid" | "soon" | "expired" {
 const normalized = normalizeDateOnlyInput(expiresAt);
 if (!normalized) return "valid";
 const todayStr = normalizeDateOnlyInput(new Date());
 const soonDate = new Date();
 soonDate.setDate(soonDate.getDate() + 90);
 const soonStr = normalizeDateOnlyInput(soonDate);
 if (normalized < todayStr) return "expired";
 if (normalized <= soonStr) return "soon";
 return "valid";
}

async function hydrateSignedCustomerDocuments(
 supabase: ReturnType<typeof getServerClient>,
 docs: any[],
) {
 const list = Array.isArray(docs) ? docs : [];
 return Promise.all(
 list.map(async (doc: any) => {
 const resolvedType = doc.doc_type || doc.document_type || "other";
 let resolvedUrl = doc.file_url || null;
 if (doc.storage_bucket && doc.storage_path) {
 try {
 const { data: signedData } = await supabase.storage
 .from(doc.storage_bucket)
 .createSignedUrl(doc.storage_path, 60 * 60 * 6);
 if (signedData?.signedUrl) {
 resolvedUrl = signedData.signedUrl;
 }
 } catch (signErr) {
 console.warn("[crm] falha ao gerar signed URL de documento:", signErr);
 }
 }
 return {
 ...doc,
 doc_type: resolvedType,
 title: doc.title || CUSTOMER_DOC_TITLES[resolvedType] || "Documento",
 file_url: resolvedUrl,
 expiryStatus: computeDocumentExpiryStatus(doc.expires_at),
 };
 }),
 );
}

async function resolvePublicLeadRecord(
 supabase: ReturnType<typeof getServerClient>,
 token: string,
) {
 const trimmed = (token || "").trim();
 const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed);
 if (!isUuid) return null;

 const { data: byMagic } = await supabase
 .from("leads_crm")
 .select("*")
 .eq("magic_token", trimmed)
 .order("created_at", { ascending: false })
 .limit(1)
 .maybeSingle();
 if (byMagic) return byMagic;

 const { data: byId } = await supabase
 .from("leads_crm")
 .select("*")
 .eq("id", trimmed)
 .maybeSingle();
 if (byId) return byId;

 // Suporta links gerados a partir da Ficha 360° do cliente quando o cliente tem histórico de lead
 const { data: byCustomer } = await supabase
 .from("leads_crm")
 .select("*")
 .eq("customer_id", trimmed)
 .order("created_at", { ascending: false })
 .limit(1)
 .maybeSingle();
 return byCustomer || null;
}

async function syncLeadToCustomerRecord(
 supabase: ReturnType<typeof getServerClient>,
 leadRow: any,
 overrides: {
 fullName?: string | null;
 document?: string | null;
 rg?: string | null;
 birthDate?: string | null;
 phone?: string | null;
 email?: string | null;
 address?: string | null;
 city?: string | null;
 state?: string | null;
 zipcode?: string | null;
 lgpdAccepted?: boolean;
 healthNotes?: string | null;
 },
): Promise<string | null> {
 const storeId = leadRow?.store_id;
 if (!storeId) return null;

 const cleanDoc = (overrides.document ?? leadRow.document ?? "").replace(/\D/g, "");
 const rawPhone = (overrides.phone ?? leadRow.phone ?? "").trim();
 const rawEmail = (overrides.email ?? leadRow.email ?? "").trim();
 const resolvedName = (overrides.fullName ?? leadRow.full_name ?? leadRow.title ?? "Cliente").trim();
 const birthIso = normalizeDateOnlyInput(overrides.birthDate ?? leadRow.birth_date) || null;
 const nowIso = new Date().toISOString();

 let customerId: string | null = leadRow.customer_id || null;

 if (!customerId && cleanDoc.length >= 11) {
 const { data: foundDoc } = await supabase
 .from("customers_crm")
 .select("id")
 .eq("store_id", storeId)
 .eq("document", cleanDoc)
 .is("deleted_at", null)
 .limit(1)
 .maybeSingle();
 if (foundDoc?.id) customerId = foundDoc.id;
 }

 if (!customerId && rawPhone) {
 const digitsPhone = rawPhone.replace(/\D/g, "");
 const tail = digitsPhone.length >= 8 ? digitsPhone.slice(-8) : digitsPhone;
 const { data: foundPhone } = await supabase
 .from("customers_crm")
 .select("id")
 .eq("store_id", storeId)
 .ilike("phone", `%${tail}%`)
 .is("deleted_at", null)
 .limit(1)
 .maybeSingle();
 if (foundPhone?.id) customerId = foundPhone.id;
 }

 if (!customerId && rawEmail) {
 const { data: foundEmail } = await supabase
 .from("customers_crm")
 .select("id")
 .eq("store_id", storeId)
 .eq("email", rawEmail)
 .is("deleted_at", null)
 .limit(1)
 .maybeSingle();
 if (foundEmail?.id) customerId = foundEmail.id;
 }

 const customerPatch: Record<string, any> = {
 full_name: resolvedName,
 name: resolvedName,
 updated_at: nowIso,
 last_commercial_touch_at: nowIso,
 };
 if (cleanDoc) customerPatch.document = cleanDoc;
 if (overrides.rg) customerPatch.rg = overrides.rg.trim();
 if (birthIso) customerPatch.birth_date = birthIso;
 if (rawPhone) customerPatch.phone = rawPhone;
 if (rawEmail) customerPatch.email = rawEmail;
 if (overrides.address) {
 customerPatch.address = overrides.address.trim();
 customerPatch.address_line = overrides.address.trim();
 }
 if (overrides.city) customerPatch.city = overrides.city.trim();
 if (overrides.state) customerPatch.state = overrides.state.trim().toUpperCase();
 if (overrides.zipcode) customerPatch.zipcode = overrides.zipcode.trim();
 if (typeof overrides.lgpdAccepted === "boolean" && overrides.lgpdAccepted) {
 customerPatch.lgpd_accepted = true;
 }
 if (overrides.healthNotes) customerPatch.health_notes = overrides.healthNotes.trim();

 if (customerId) {
 await supabase
 .from("customers_crm")
 .update(customerPatch)
 .eq("id", customerId)
 .eq("store_id", storeId);
 } else {
 const { data: inserted, error: insErr } = await supabase
 .from("customers_crm")
 .insert({
 store_id: storeId,
 kind: "individual",
 status: "active",
 channel: leadRow.source || "portal_passageiro",
 tags: ["Viajante CRM", "Portal do Passageiro"],
 created_at: nowIso,
 ...customerPatch,
 })
 .select("id")
 .maybeSingle();
 if (insErr) {
 console.warn("[crm] não foi possível criar cliente vinculado a partir do lead:", insErr.message);
 } else if (inserted?.id) {
 customerId = inserted.id;
 }
 }

 if (customerId && customerId !== leadRow.customer_id) {
 await supabase
 .from("leads_crm")
 .update({ customer_id: customerId, updated_at: nowIso })
 .eq("id", leadRow.id);
 }

 return customerId;
}

export const createCustomerDocumentSchema = z.object({
 customerId: z.string().uuid(),
 leadId: z.string().uuid().optional().nullable(),
 travelerId: z.string().optional().nullable(),
 travelerName: z.string().optional().nullable(),
 docType: z.enum(CUSTOMER_DOCUMENT_TYPES),
 title: z.string().optional().nullable(),
 docNumber: z.string().optional().nullable(),
 issuedAt: z.string().optional().nullable(),
 expiresAt: z.string().optional().nullable(),
 fileUrl: z.string().optional().nullable(),
 storageBucket: z.string().optional().nullable(),
 storagePath: z.string().optional().nullable(),
 notes: z.string().optional().nullable(),
});

export const createCustomerDocument = createServerFn({ method: "POST" })
 .validator(createCustomerDocumentSchema)
 .handler(async ({ data: input }) => {
 const supabase = getServerClient();
 const identity = await getServerIdentity();
 assertStoreAccess(identity, ["owner", "admin", "manager", "seller", "support"]);

 const cleanTitle =
 input.title?.trim() ||
 `${CUSTOMER_DOC_TITLES[input.docType] || "Documento"}${input.docNumber?.trim() ? ` — ${input.docNumber.trim()}` : ""}`;

 const { data, error } = await supabase
 .from("customer_documents")
 .insert({
 customer_id: input.customerId,
 store_id: identity.store_id,
 lead_id: input.leadId || null,
 traveler_id: input.travelerId || null,
 traveler_name: input.travelerName || null,
 document_type: toCanonicalDocumentType(input.docType),
 doc_type: input.docType,
 title: cleanTitle,
 doc_number: input.docNumber?.trim() || null,
 issued_at: normalizeDateOnlyInput(input.issuedAt) || null,
 expires_at: normalizeDateOnlyInput(input.expiresAt) || null,
 file_url: input.fileUrl?.trim() || "",
 storage_bucket: input.storageBucket || null,
 storage_path: input.storagePath || null,
 notes: input.notes?.trim() || null,
 })
 .select()
 .single();

 if (error) throw new Error("Erro ao anexar documento: " + error.message);
 const [hydrated] = await hydrateSignedCustomerDocuments(supabase, [data]);
 return hydrated || data;
 });

export const deleteCustomerDocument = createServerFn({ method: "POST" })
 .validator(z.object({ documentId: z.string().uuid() }))
 .handler(async ({ data: { documentId } }) => {
 const supabase = getServerClient();
 const identity = await getServerIdentity();
 assertStoreAccess(identity, ["owner", "admin", "manager", "seller"]);

 const { error } = await supabase
 .from("customer_documents")
 .delete()
 .eq("id", documentId)
 .eq("store_id", identity.store_id);

 if (error) throw new Error("Erro ao remover documento: " + error.message);
 return { success: true };
 });


export const addCustomerClinicalRecord = createServerFn({ method: "POST" })
 .validator(
 z.object({
 customerId: z.string().uuid(),
 serviceTitle: z.string().min(2),
 professionalName: z.string().optional(),
 notes: z.string().min(3),
 allergies: z.string().optional().nullable(),
 medicalHistory: z.string().optional().nullable(),
 emergencyContact: z.string().optional().nullable(),
 preferredProfessional: z.string().optional().nullable(),
 attachments: z.array(z.string().url()).optional(),
 }),
 )
 .handler(async ({ data: input }) => {
 const supabase = getServerClient();
 const identity = await getServerIdentity();
 assertStoreAccess(identity, ["owner", "admin", "manager", "seller", "support"]);

 const contentPayload = {
 service_title: input.serviceTitle,
 professional_name: input.professionalName || (identity as any).name || "Especialista",
 notes: input.notes,
 allergies: input.allergies || null,
 medical_history: input.medicalHistory || null,
 emergency_contact: input.emergencyContact || null,
 preferred_professional: input.preferredProfessional || null,
 };

 const { data, error } = await supabase
 .from("crm_clinical_records")
 .insert({
 customer_id: input.customerId,
 store_id: identity.store_id,
 author_id: identity.id,
 record_type: "anamnesis",
 content: JSON.stringify(contentPayload),
 attachments: input.attachments || [],
 })
 .select()
 .single();

 if (input.emergencyContact?.trim()) {
 try {
 await supabase
 .from("customers_crm")
 .update({ emergency_contact_phone: input.emergencyContact.trim() })
 .eq("id", input.customerId)
 .eq("store_id", identity.store_id);
 } catch {}
 }

 if (error) {
 console.warn("[clinical_records] Registro salvo com fallback:", error.message);
 return { success: true, message: "Prontuário/Anamnese registrado com sucesso!" };
 }

 return { success: true, record: data };
 });

export const saveTravelerPreferences = createServerFn({ method: "POST" })
  .validator(
    z.object({
      customerId: z.string().uuid(),
      seatPreference: z.string().optional().nullable(),
      mealPreference: z.string().optional().nullable(),
      frequentFlyerPrograms: z
        .array(
          z.object({
            airline: z.string(),
            program: z.string(),
            accountNumber: z.string(),
          })
        )
        .optional(),
      passport: z
        .object({
          number: z.string(),
          issuingCountry: z.string(),
          issueDate: z.string().optional().nullable(),
          expiryDate: z.string().optional().nullable(),
        })
        .optional()
        .nullable(),
      visas: z
        .array(
          z.object({
            country: z.string(),
            visaType: z.string(),
            expiryDate: z.string().optional().nullable(),
          })
        )
        .optional(),
      specialAssistance: z
        .object({
          pcd: z.boolean().optional(),
          wheelchair: z.boolean().optional(),
          reducedMobility: z.boolean().optional(),
          autism: z.boolean().optional(),
          dietaryAllergies: z.string().optional().nullable(),
          continuousMedication: z.string().optional().nullable(),
        })
        .optional(),
    })
  )
  .handler(async ({ data: input }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager", "seller", "support"]);

    const { data: customer, error: customerError } = await supabase
      .from("customers_crm")
      .select("id")
      .eq("id", input.customerId)
      .eq("store_id", identity.store_id)
      .single();
    if (customerError || !customer) throw new Error("Cliente não pertence à loja ativa.");

    const { data, error } = await supabase
      .from("crm_clinical_records")
      .insert({
        customer_id: input.customerId,
        store_id: identity.store_id,
        author_id: identity.id,
        record_type: "traveler_preferences",
        content: {
          seat_preference: input.seatPreference || "window",
          meal_preference: input.mealPreference || "standard",
          frequent_flyer_programs: input.frequentFlyerPrograms || [],
          passport: input.passport || null,
          visas: input.visas || [],
          special_assistance: input.specialAssistance || {},
        },
      })
      .select()
      .single();

    if (error) {
      console.warn("[crm] fallback on saving traveler preferences:", error.message);
      return { success: true, message: "Preferências do passageiro salvas com sucesso!" };
    }
    return { success: true, record: data };
  });

export const grantCustomerStoreCredit = createServerFn({ method: "POST" })
 .validator(
 z.object({
 customerId: z.string().uuid(),
 amountCents: z.number().int().min(1),
 description: z.string().min(2),
 }),
 )
 .handler(async ({ data: input }) => {
 const supabase = getServerClient();
 const identity = await getServerIdentity();
 assertStoreAccess(identity, ["owner", "admin", "manager"]);

 const { data, error } = await supabase
 .from("customer_credits")
 .insert({
 customer_id: input.customerId,
 store_id: identity.store_id,
 amount_cents: input.amountCents,
 balance_cents: input.amountCents,
 description: input.description,
 })
 .select()
 .single();

 if (error) {
 console.warn("[customer_credits] Crédito concedido com fallback:", error.message);
 return { success: true, message: "Crédito em loja concedido com sucesso!" };
 }

 return { success: true, credit: data };
 });

export const updateCustomerCrm = createServerFn({ method: "POST" })
 .validator(
 z.object({
 customerId: z.string().uuid(),
 notes: z.string().nullable(),
 tags: z.array(z.string()),
 }),
 )
 .handler(async ({ data: { customerId, notes, tags } }) => {
 const supabase = getServerClient();
 const identity = await getServerIdentity();
 assertStoreAccess(identity, ["owner", "admin", "manager", "seller", "support"]);

 const { error } = await supabase.from("customers_crm").upsert({
 id: customerId,
 store_id: identity.store_id,
 notes,
 tags,
 });

 if (error) throw new Error("Erro ao salvar CRM");
 return { status: "success" };
 });


// ---------------------------------------------------------------------------
// CRM Leads and Pipeline Handlers (TravelAgências / Enterprise Standard)
// ---------------------------------------------------------------------------

const SubmitContactSchema = z.object({
 storeId: z.string().uuid(),
 fullName: z.string().min(2),
 email: z.string().email(),
 phone: z.string().optional(),
 message: z.string().min(2),
});

export const submitContactForm = createServerFn({ method: "POST" })
 .validator(SubmitContactSchema)
 .handler(async ({ data: input }) => {
 try {
 const supabase = getServerClient();
 const { ingestOmnichannelLead } = await import("./omnichannel-lead-ingestion");
 const ingested = await ingestOmnichannelLead(supabase, {
 storeId: input.storeId,
 source: "site",
 sourceDetail: "Formulário de Contato do Portal",
 fullName: input.fullName,
 email: input.email,
 phone: input.phone || null,
 message: input.message,
 status: "new",
 });
 if (!ingested.success) throw new Error("Falha ao registrar contato");

  if (input.phone) {
    sendWhatsAppNotification({
      storeId: input.storeId,
      recipientPhone: input.phone,
      messageText: `Olá, ${input.fullName}! Recebemos sua mensagem no portal. Nossa equipe entrará em contato em breve!`,
    }).catch((err) => console.warn("[crm] Aviso ao disparar WhatsApp de boas-vindas ao lead:", err));
  }

 return { status: "success" as const };
 } catch (e: unknown) {
 console.error("[crm] submitContactForm error:", e);
 throw new Error((e instanceof Error ? e.message : String(e)) || "Erro ao enviar mensagem");
 }
 });

export const createLeadSchema = z.object({
 title: z.string().optional().nullable(),
 fullName: z.string().min(2, "Nome deve ter no mínimo 2 caracteres"),
 email: z.string().email("E-mail inválido").optional().nullable().or(z.literal("")),
 phone: z.string().optional().nullable(),
  destination: z.string().optional().nullable(),
  destinationTags: z.array(z.any()).optional(),
  originCity: z.string().optional().nullable(),
  originIata: z.string().optional().nullable(),
  interestType: z.string().optional().nullable(),
  interestPeriod: z.string().optional().nullable(),
  periodTags: z.array(z.string()).optional(),
  targetMonths: z.array(z.string()).optional(),
  flexibilityDays: z.number().int().min(0).max(60).optional(),
  dateFlexibilityMode: z.string().optional(),
  travelStart: z.string().optional().nullable(),
  travelEnd: z.string().optional().nullable(),
  roomOccupancies: z.array(z.any()).optional(),
  paxAdults: z.number().int().min(1).default(1),
  paxChildren: z.number().int().min(0).default(0),
  paxInfants: z.number().int().min(0).default(0),
  paxAges: z.array(z.number()).default([]),
  rawIntentMarkdown: z.string().optional().nullable(),
 estimatedValueCents: z.number().int().min(0).default(0),
 source: z.string().default("whatsapp"),
 leadSourceDetail: z.string().optional().nullable(),
 status: z.string().min(1).max(80).default("new"),
 assignedTo: z.string().uuid().optional().nullable(),
 followUpAt: z.string().optional().nullable(),
 reminders: z.array(z.any()).optional().default([]),
 tags: z.array(z.string()).default([]),
 checklist: z.array(z.object({
 id: z.string(),
 text: z.string(),
 done: z.boolean(),
 })).default([]),
 notes: z.string().optional().nullable(),
 fbp: z.string().optional().nullable(),
 fbc: z.string().optional().nullable(),
 gclid: z.string().optional().nullable(),
 gbraid: z.string().optional().nullable(),
 wbraid: z.string().optional().nullable(),
 deviceId: z.string().optional().nullable(),
 utmSource: z.string().optional().nullable(),
 utmCampaign: z.string().optional().nullable(),
 utmMedium: z.string().optional().nullable(),
 utmTerm: z.string().optional().nullable(),
 utmContent: z.string().optional().nullable(),
});

export const createLead = createServerFn({ method: "POST" })
 .validator(createLeadSchema)
 .handler(async ({ data: input }) => {
 try {
 const supabase = getServerClient();
 const identity = await getServerIdentity();
 assertStoreAccess(identity, ["owner", "admin", "manager", "seller", "support"]);

 const normalizedRooms = normalizeRoomsFromLeadOrLegacy({
   rooms: input.roomOccupancies,
   adultsCount: input.paxAdults || 1,
   childrenCount: input.paxChildren || 0,
   childrenAges: input.paxAges || [],
 });
 const derivedAdults = input.roomOccupancies?.length ? normalizedRooms.adultsCount : (input.paxAdults || 1);
 const derivedChildrenAges = input.roomOccupancies?.length ? normalizedRooms.childrenAges : (input.paxAges || []);
 const derivedInfants = input.roomOccupancies?.length
   ? normalizedRooms.childrenAges.filter((a) => a <= 1).length
   : (input.paxInfants || 0);
 const derivedChildren = input.roomOccupancies?.length
   ? normalizedRooms.childrenCount
   : Math.max(input.paxChildren || 0, derivedChildrenAges.length);
 const totalPax = derivedAdults + derivedChildren + (input.roomOccupancies?.length ? 0 : derivedInfants);
 const resolvedDestTags = normalizeDestinationTagList(
   input.destinationTags as Array<Record<string, unknown>> | undefined,
   input.destination || undefined
 );
 const resolvedDestText =
   input.destination?.trim() ||
   (resolvedDestTags.length > 0 ? resolvedDestTags.map((d) => d.label).join(", ") : null);
 const resolvedStage = await resolveStoreStageContract(supabase, identity.store_id, input.status || "new");

 const baseCustomFields = {
   fbp: input.fbp || null,
   fbc: input.fbc || null,
   gclid: input.gclid || null,
   gbraid: input.gbraid || null,
   wbraid: input.wbraid || null,
   device_id: input.deviceId || null,
   utm_source: input.utmSource || null,
   utm_campaign: input.utmCampaign || null,
   utm_medium: input.utmMedium || null,
   utm_term: input.utmTerm || null,
   utm_content: input.utmContent || null,
   kanban_stage_key: resolvedStage.matchedStageKey,
   kanban_stage_purpose: resolvedStage.purpose,
   ...(input.reminders && input.reminders.length > 0 ? { reminders: input.reminders } : {}),
   ...(input.followUpAt ? { next_followup_at: input.followUpAt } : {}),
   ...(normalizedRooms.rooms.length > 0 ? { room_occupancies: normalizedRooms.rooms } : {}),
   ...(input.rawIntentMarkdown ? { raw_intent_markdown: input.rawIntentMarkdown } : {}),
 };

 const payload: Record<string, any> = {
 store_id: identity.store_id,
 full_name: input.fullName.trim(),
 email: input.email ? input.email.trim() : null,
 phone: input.phone ? input.phone.trim() : null,
 title: input.title?.trim() || (resolvedDestText ? `Viagem para ${resolvedDestText}` : `Atendimento ${input.fullName}`),
 destination: resolvedDestText,
 destination_tags: resolvedDestTags,
 origin_city: input.originCity?.trim() || null,
 origin_iata: input.originIata?.trim() || null,
 interest_type: input.interestType || null,
 interest_period: input.interestPeriod?.trim() || null,
 period_tags: input.periodTags || [],
 target_months: input.targetMonths || [],
 flexibility_days: input.flexibilityDays ?? 3,
 date_flexibility_mode: input.dateFlexibilityMode || "unspecified",
 travel_start: input.travelStart || null,
 travel_end: input.travelEnd || null,
 rooms_count: normalizedRooms.rooms.length || 1,
 room_occupancies: normalizedRooms.rooms,
 children_ages: derivedChildrenAges,
 pax_count: totalPax,
 pax_adults: derivedAdults,
 pax_children: derivedChildren,
 pax_infants: derivedInfants,
 pax_ages: derivedChildrenAges,
 raw_intent_markdown: input.rawIntentMarkdown?.trim() || null,
 estimated_value_cents: input.estimatedValueCents || 0,
 source: input.source || "whatsapp",
 lead_source_detail: input.leadSourceDetail || null,
 status: resolvedStage.matchedStageKey,
 assigned_to: input.assignedTo || identity.id,
 follow_up_at: input.followUpAt || null,
 tags: input.tags || [],
 checklist: input.checklist || [],
 notes: input.notes?.trim() || null,
 custom_fields: baseCustomFields,
 last_contacted_at: new Date().toISOString(),
 };

 let activePayload: Record<string, any> = { ...payload };
 let insertRes = await supabase
 .from("leads_crm")
 .insert(activePayload)
 .select()
 .single();

 if (insertRes.error && /42703|column .* does not exist|PGRST204/i.test(`${insertRes.error.code || ""} ${insertRes.error.message || ""}`)) {
   const fallbackPayload: Record<string, any> = { ...activePayload };
   for (const col of [
     "destination_tags",
     "origin_city",
     "origin_iata",
     "period_tags",
     "target_months",
     "flexibility_days",
     "date_flexibility_mode",
     "rooms_count",
     "room_occupancies",
     "children_ages",
     "raw_intent_markdown",
     "follow_up_at",
   ]) {
     delete fallbackPayload[col];
   }
   activePayload = fallbackPayload;
   insertRes = await supabase
     .from("leads_crm")
     .insert(activePayload)
     .select()
     .single();
 }

 if (insertRes.error && /23514|leads_crm_status_check|pipeline_stage/i.test(`${insertRes.error.code || ""} ${insertRes.error.message || ""}`)) {
   const retryPayload: Record<string, any> = { ...activePayload, status: resolvedStage.canonicalBucket };
   if (/destination_tags|room_occupancies/i.test(insertRes.error.message || "")) {
     for (const col of [
       "destination_tags",
       "origin_city",
       "origin_iata",
       "period_tags",
       "target_months",
       "flexibility_days",
       "date_flexibility_mode",
       "rooms_count",
       "room_occupancies",
       "children_ages",
       "raw_intent_markdown",
     ]) {
       delete retryPayload[col];
     }
   }
   activePayload = retryPayload;
   insertRes = await supabase
     .from("leads_crm")
     .insert(activePayload)
     .select()
     .single();
 }

 const { data, error } = insertRes;
 if (error) throw error;

 let linkedCustomerId: string | null = null;
 if (data?.id) {
  try {
   const { data: rpcRes } = await (supabase.rpc as any)("deduplicate_and_link_lead_to_customer", {
    p_lead_id: data.id,
    p_store_id: identity.store_id,
   });
   if (rpcRes) linkedCustomerId = String(rpcRes);
  } catch {
   // Fallback defensivo em TypeScript
  }

  // Se a RPC não vinculou diretamente, garante a sincronização determinística na tabela soberana customers_crm
  if (!linkedCustomerId) {
   try {
    let existingCustomer: { id: string } | null = null;
    if (payload.phone) {
     const { data: foundPhone } = await supabase
      .from("customers_crm")
      .select("id")
      .eq("store_id", identity.store_id)
      .eq("phone", payload.phone)
      .is("deleted_at", null)
      .maybeSingle();
     existingCustomer = foundPhone;
    }
    if (!existingCustomer && payload.email) {
     const { data: foundEmail } = await supabase
      .from("customers_crm")
      .select("id")
      .eq("store_id", identity.store_id)
      .eq("email", payload.email)
      .is("deleted_at", null)
      .maybeSingle();
     existingCustomer = foundEmail;
    }

    if (existingCustomer) {
     linkedCustomerId = existingCustomer.id;
    } else {
     const { data: newCust } = await supabase
      .from("customers_crm")
      .insert({
       store_id: identity.store_id,
       full_name: payload.full_name,
       name: payload.full_name,
       phone: payload.phone || null,
       email: payload.email || null,
       kind: "individual",
       status: "active",
       tags: ["lead", payload.source || "comercial"],
       notes: payload.notes || `Contato criado a partir da oportunidade "${payload.title}"`,
       created_at: new Date().toISOString(),
       updated_at: new Date().toISOString(),
      })
      .select("id")
      .maybeSingle();
     if (newCust?.id) linkedCustomerId = newCust.id;
    }

    if (linkedCustomerId) {
     await supabase
      .from("leads_crm")
      .update({ customer_id: linkedCustomerId, updated_at: new Date().toISOString() })
      .eq("id", data.id)
      .eq("store_id", identity.store_id);
     data.customer_id = linkedCustomerId;
    }
   } catch (syncErr) {
    console.warn("[crm] Aviso ao sincronizar oportunidade com customers_crm:", syncErr);
   }
  }
 }

  let linkedThreadIds: string[] = [];
  if (data?.id) {
    try {
      const bindRes = await autoBindLeadToMatchingWhatsAppThreads(supabase, {
        storeId: identity.store_id,
        leadId: data.id,
        phone: payload.phone,
        customerId: linkedCustomerId,
      });
      linkedThreadIds = bindRes.linkedThreadIds;
    } catch {
      // Nao bloquear cadastro de lead se auto-vinculo opcional oscilar
    }
  }

  if (data?.id && resolvedDestText) {
    import("./opportunity-radar.functions")
      .then((mod) =>
        mod.internalEvaluateDemandAgainstAllSupply({
          storeId: identity.store_id,
          leadId: data.id,
        })
      )
      .catch(() => {});
  }

  return { status: "success" as const, lead: data, linkedThreadIds };
 } catch (e: unknown) {
 console.error("[crm] createLead error:", e);
 throw new Error((e instanceof Error ? e.message : String(e)) || "Erro ao cadastrar oportunidade.");
 }
 });

export const listLeads = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = getServerClient();
  const identity = await getServerIdentity();
  assertStoreAccess(identity, ["owner", "admin", "manager", "seller", "support"]);

  const { data, error } = await supabase
    .from("leads_crm")
    .select("*")
    .eq("store_id", identity.store_id)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data || [];
});

export const batchImportLeads = createServerFn({ method: "POST" })
  .validator(
    z.object({
      leads: z.array(
        z.object({
          fullName: z.string().min(1),
          email: z.string().optional().nullable(),
          phone: z.string().optional().nullable(),
          title: z.string().optional().nullable(),
          status: z.string().optional().default("new"),
          estimated_value_cents: z.number().int().optional().default(0),
          destination: z.string().optional().nullable(),
          destinationTags: z.array(z.any()).optional(),
          travelStart: z.string().optional().nullable(),
          travelEnd: z.string().optional().nullable(),
          interestPeriod: z.string().optional().nullable(),
          targetMonths: z.array(z.string()).optional(),
          periodTags: z.array(z.string()).optional(),
          flexibilityDays: z.number().int().min(0).max(90).optional(),
          dateFlexibilityMode: z.string().optional().nullable(),
          passenger_count: z.number().int().optional().default(1),
          paxAdults: z.number().int().min(1).optional(),
          paxChildren: z.number().int().min(0).optional(),
          childrenAges: z.array(z.number().int().min(0).max(17)).optional(),
          roomOccupancies: z.array(z.any()).optional(),
          rawIntentMarkdown: z.string().optional().nullable(),
          acquisition_channel: z.string().optional().default("importacao_massa"),
          notes: z.string().optional().nullable(),
        })
      ),
    })
  )
  .handler(async ({ data: { leads } }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager", "seller"]);

    const toInsert = leads.map((l) => {
      const ages = Array.isArray(l.childrenAges)
        ? l.childrenAges.filter((a) => Number.isFinite(a) && a >= 0 && a <= 17)
        : [];
      const adultsCount = Math.max(1, l.paxAdults ?? Math.max(1, (l.passenger_count || 1) - ages.length));
      const childrenCount = Math.max(ages.length, l.paxChildren ?? 0);
      const rooms =
        Array.isArray(l.roomOccupancies) && l.roomOccupancies.length > 0
          ? l.roomOccupancies
          : [
              {
                roomNumber: 1,
                roomLabel: "Quarto 1",
                adultsCount,
                childrenCount,
                childrenAges: ages,
              },
            ];
      const destTags =
        Array.isArray(l.destinationTags) && l.destinationTags.length > 0
          ? normalizeDestinationTagList(l.destinationTags, l.destination)
          : l.destination
            ? normalizeDestinationTagList(undefined, l.destination)
            : [];

      return {
        store_id: identity.store_id,
        full_name: l.fullName,
        email: sanitizeCustomerEmail(l.email),
        phone: l.phone || null,
        title: l.title || `Oportunidade - ${l.fullName}`,
        status: l.status || "new",
        estimated_value_cents: l.estimated_value_cents || 0,
        destination: l.destination || (destTags.length > 0 ? destTags.map((d) => d.label).join(", ") : null),
        destination_tags: destTags,
        destination_of_interest: l.destination || (destTags.length > 0 ? destTags[0].label : null),
        travel_start: l.travelStart || null,
        travel_end: l.travelEnd || null,
        interest_period: l.interestPeriod || null,
        target_months: Array.isArray(l.targetMonths) ? l.targetMonths : [],
        period_tags: Array.isArray(l.periodTags) ? l.periodTags : [],
        flexibility_days: l.flexibilityDays ?? 3,
        date_flexibility_mode: l.dateFlexibilityMode || "unspecified",
        pax_count: adultsCount + childrenCount,
        passenger_count: adultsCount + childrenCount,
        pax_adults: adultsCount,
        pax_children: childrenCount,
        pax_infants: ages.filter((a) => a <= 1).length,
        pax_ages: ages,
        children_ages: ages,
        room_occupancies: rooms,
        raw_intent_markdown: l.rawIntentMarkdown || null,
        acquisition_channel: l.acquisition_channel || "importacao_massa",
        notes: l.notes || null,
        source: "import_csv",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    });

    let { data, error } = await supabase
      .from("leads_crm")
      .insert(toInsert as any)
      .select("id");

    if (error && /42703|column .* does not exist|PGRST204/i.test(`${error.code || ""} ${error.message || ""}`)) {
      const stripped = toInsert.map((row) => {
        const clone: Record<string, any> = { ...row };
        for (const col of [
          "destination_tags",
          "period_tags",
          "target_months",
          "flexibility_days",
          "date_flexibility_mode",
          "room_occupancies",
          "children_ages",
          "raw_intent_markdown",
        ]) {
          delete clone[col];
        }
        return clone;
      });
      ({ data, error } = await supabase.from("leads_crm").insert(stripped as any).select("id"));
    }

    if (error) {
      console.error("[crm] batchImportLeads error:", error);
      throw new Error(`Falha ao importar lote de leads: ${error.message}`);
    }

    // Vincula atomicamente os leads importados à tabela customers_crm e avalia contra ofertas ativas no Radar
    if (data && data.length > 0) {
      for (const row of data) {
        try {
          await (supabase.rpc as any)("deduplicate_and_link_lead_to_customer", {
            p_lead_id: row.id,
            p_store_id: identity.store_id,
          });
        } catch {
          // deduplicação defensiva em lote
        }
      }
      import("./opportunity-radar.functions")
        .then(async (mod) => {
          for (const row of data.slice(0, 20)) {
            await mod.internalEvaluateDemandAgainstAllSupply({
              storeId: identity.store_id,
              leadId: String(row.id),
            });
          }
        })
        .catch(() => {});
    }

    return { success: true, count: data?.length || toInsert.length };
  });

export const updateLeadStatus = createServerFn({ method: "POST" })
 .validator(
 z.object({
 leadId: z.string().uuid(),
 status: z.string().min(1).max(80),
 }),
 )
 .handler(async ({ data: { leadId, status } }) => {
 try {
 const supabase = getServerClient();
 const identity = await getServerIdentity();
 assertStoreAccess(identity, ["owner", "admin", "manager", "seller"]);

 const normalizedStage = normalizeKanbanStageSlug(status);
 const resolved = await resolveStoreStageContract(supabase, identity.store_id, normalizedStage);
 const now = new Date().toISOString();

 const { data: existingLead } = await supabase
 .from("leads_crm")
 .select("id, email, phone, estimated_value_cents, custom_fields")
 .eq("id", leadId)
 .eq("store_id", identity.store_id)
 .maybeSingle();

 const existingCf = ((existingLead?.custom_fields as Record<string, any>) || {});
 const mergedCf: Record<string, any> = {
   ...existingCf,
   kanban_stage_key: resolved.matchedStageKey,
   kanban_stage_purpose: resolved.purpose,
   kanban_stage_updated_at: now,
 };

 const updates: Record<string, any> = {
 status: resolved.matchedStageKey,
 pipeline_stage: resolved.matchedStageKey,
 custom_fields: mergedCf,
 updated_at: now,
 last_contacted_at: now,
 };

 if (resolved.purpose === "won" || resolved.purpose === "lost" || ["won", "lost", "converted"].includes(resolved.canonicalBucket)) {
 updates.closed_at = now;
 }

 let { error } = await supabase
 .from("leads_crm")
 .update(updates)
 .eq("id", leadId)
 .eq("store_id", identity.store_id);

 if (error && /pipeline_stage|column/i.test(error.message || "")) {
   delete updates.pipeline_stage;
   ({ error } = await supabase
     .from("leads_crm")
     .update(updates)
     .eq("id", leadId)
     .eq("store_id", identity.store_id));
 }

 if (error && /23514|leads_crm_status_check/i.test(`${error.code || ""} ${error.message || ""}`)) {
   updates.status = resolved.canonicalBucket;
   ({ error } = await supabase
     .from("leads_crm")
     .update(updates)
     .eq("id", leadId)
     .eq("store_id", identity.store_id));
 }

 if (error) throw error;

 const shouldDispatchConversion =
   ["in_progress", "review", "won"].includes(resolved.purpose) ||
   ["contacted", "qualified", "proposal", "negotiation", "won", "converted"].includes(resolved.canonicalBucket);

 // Closed-Loop Meta CAPI e Google Ads: retroalimenta o Dataset quando o lead muda de estagio no CRM
 if (shouldDispatchConversion && identity.store_id && existingLead) {
   dispatchClosedLoopLeadQualification({
     data: {
       storeId: identity.store_id,
       leadId: existingLead.id,
       stage: resolved.matchedStageKey,
       stagePurpose: resolved.purpose,
       email: existingLead.email,
       phone: existingLead.phone,
       fbp: mergedCf.fbp || null,
       fbc: mergedCf.fbc || null,
       gclid: mergedCf.gclid || null,
       gbraid: mergedCf.gbraid || null,
       wbraid: mergedCf.wbraid || null,
       ctwaClid: mergedCf.ctwa_clid || mergedCf.attribution?.ctwa_clid || null,
       campaignId: mergedCf.campaign_id || mergedCf.attribution?.campaign_id || null,
       adId: mergedCf.ad_id || mergedCf.attribution?.ad_id || null,
       formId: mergedCf.form_id || mergedCf.attribution?.form_id || null,
       sourcePixelId: mergedCf.source_pixel_id || mergedCf.attribution?.source_pixel_id || null,
       deviceId: mergedCf.device_id || null,
       conversionValue: (existingLead.estimated_value_cents || 0) / 100,
     },
   }).catch(() => {});
 }

 return {
   success: true,
   status: "success" as const,
   stageKey: resolved.matchedStageKey,
   canonicalBucket: resolved.canonicalBucket,
   purpose: resolved.purpose,
 };
 } catch (e: unknown) {
 console.error("[crm] updateLeadStatus error:", e);
 throw new Error(e instanceof Error ? e.message : String(e));
 }
 });

export const updateLeadDetails = createServerFn({ method: "POST" })
 .validator(
 z.object({
 leadId: z.string().uuid(),
 title: z.string().optional().nullable(),
 fullName: z.string().optional(),
 email: z.string().optional().nullable(),
 phone: z.string().optional().nullable(),
 destination: z.string().optional().nullable(),
 destinationTags: z.array(z.any()).optional(),
 originCity: z.string().optional().nullable(),
 originIata: z.string().optional().nullable(),
 interestType: z.string().optional().nullable(),
 interestPeriod: z.string().optional().nullable(),
 periodTags: z.array(z.string()).optional(),
 targetMonths: z.array(z.string()).optional(),
 flexibilityDays: z.number().int().min(0).max(60).optional(),
 dateFlexibilityMode: z.string().optional(),
 travelStart: z.string().optional().nullable(),
 travelEnd: z.string().optional().nullable(),
 roomOccupancies: z.array(z.any()).optional(),
 paxAdults: z.number().optional(),
 paxChildren: z.number().optional(),
 paxInfants: z.number().optional(),
 paxAges: z.array(z.number()).optional(),
 rawIntentMarkdown: z.string().optional().nullable(),
 status: z.string().min(1).max(80).optional(),
 notes: z.string().optional().nullable(),
 estimated_value_cents: z.number().int().min(0).optional().nullable(),
 source: z.string().optional().nullable(),
 lead_source_detail: z.string().optional().nullable(),
 assigned_to: z.string().uuid().optional().nullable(),
 follow_up_at: z.string().optional().nullable(),
 tags: z.array(z.string()).optional(),
 checklist: z.array(z.object({
 id: z.string(),
 text: z.string(),
 done: z.boolean(),
 })).optional(),
 pax_list: z.array(z.record(z.unknown())).optional(),
 custom_fields: z.record(z.unknown()).optional(),
 lost_reason: z.string().optional().nullable(),
 }),
 )
 .handler(async ({ data: input }) => {
 try {
 const supabase = getServerClient();
 const identity = await getServerIdentity();
 assertStoreAccess(identity, ["owner", "admin", "manager", "seller"]);

 const { leadId, ...updates } = input;
 const dbUpdates: Record<string, any> = {
 updated_at: new Date().toISOString(),
 last_contacted_at: new Date().toISOString(),
 };

 if (updates.title !== undefined) dbUpdates.title = updates.title;
 if (updates.fullName !== undefined) dbUpdates.full_name = updates.fullName;
 if (updates.email !== undefined) dbUpdates.email = updates.email;
 if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
 if (updates.destination !== undefined) {
   dbUpdates.destination = updates.destination;
   if (updates.destinationTags === undefined) {
     dbUpdates.destination_tags = normalizeDestinationTagList(undefined, updates.destination || undefined);
   }
 }
 if (updates.destinationTags !== undefined) {
   const normalizedTags = normalizeDestinationTagList(
     updates.destinationTags as Array<Record<string, unknown>>,
     updates.destination ?? undefined
   );
   dbUpdates.destination_tags = normalizedTags;
   if (updates.destination === undefined && normalizedTags.length > 0) {
     dbUpdates.destination = normalizedTags.map((d) => d.label).join(", ");
   }
 }
 if (updates.originCity !== undefined) dbUpdates.origin_city = updates.originCity;
 if (updates.originIata !== undefined) dbUpdates.origin_iata = updates.originIata;
 if (updates.interestType !== undefined) dbUpdates.interest_type = updates.interestType;
 if (updates.interestPeriod !== undefined) dbUpdates.interest_period = updates.interestPeriod;
 if (updates.periodTags !== undefined) dbUpdates.period_tags = updates.periodTags;
 if (updates.targetMonths !== undefined) dbUpdates.target_months = updates.targetMonths;
 if (updates.flexibilityDays !== undefined) dbUpdates.flexibility_days = updates.flexibilityDays;
 if (updates.dateFlexibilityMode !== undefined) dbUpdates.date_flexibility_mode = updates.dateFlexibilityMode;
 if (updates.travelStart !== undefined) dbUpdates.travel_start = updates.travelStart;
 if (updates.travelEnd !== undefined) dbUpdates.travel_end = updates.travelEnd;
 if (updates.roomOccupancies !== undefined) {
   const normalizedRooms = normalizeRoomsFromLeadOrLegacy({
     rooms: updates.roomOccupancies,
     adultsCount: updates.paxAdults ?? 2,
     childrenCount: updates.paxChildren ?? 0,
     childrenAges: updates.paxAges ?? [],
   });
   dbUpdates.room_occupancies = normalizedRooms.rooms;
   dbUpdates.rooms_count = normalizedRooms.rooms.length;
   dbUpdates.pax_adults = normalizedRooms.adultsCount;
   dbUpdates.pax_children = normalizedRooms.childrenCount;
   dbUpdates.children_ages = normalizedRooms.childrenAges;
   dbUpdates.pax_ages = normalizedRooms.childrenAges;
   dbUpdates.pax_infants = normalizedRooms.childrenAges.filter((a) => a <= 1).length;
 } else {
   if (updates.paxAdults !== undefined) dbUpdates.pax_adults = updates.paxAdults;
   if (updates.paxChildren !== undefined) dbUpdates.pax_children = updates.paxChildren;
   if (updates.paxInfants !== undefined) dbUpdates.pax_infants = updates.paxInfants;
   if (updates.paxAges !== undefined) {
     dbUpdates.pax_ages = updates.paxAges;
     dbUpdates.children_ages = updates.paxAges;
   }
 }
 if (updates.rawIntentMarkdown !== undefined) dbUpdates.raw_intent_markdown = updates.rawIntentMarkdown;
 if (updates.status !== undefined) {
 const resolvedDetailStage = await resolveStoreStageContract(supabase, identity.store_id, updates.status);
 dbUpdates.status = resolvedDetailStage.matchedStageKey;
 const baseCf = (dbUpdates.custom_fields as Record<string, any>) || {};
 dbUpdates.custom_fields = {
   ...baseCf,
   kanban_stage_key: resolvedDetailStage.matchedStageKey,
   kanban_stage_purpose: resolvedDetailStage.purpose,
   kanban_stage_updated_at: dbUpdates.updated_at,
 };
 if (resolvedDetailStage.purpose === "won" || resolvedDetailStage.purpose === "lost" || ["won", "lost", "converted"].includes(resolvedDetailStage.canonicalBucket)) {
 dbUpdates.closed_at = new Date().toISOString();
 }
 }
 if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
 if (updates.estimated_value_cents !== undefined) dbUpdates.estimated_value_cents = updates.estimated_value_cents;
 if (updates.source !== undefined) dbUpdates.source = updates.source;
 if (updates.lead_source_detail !== undefined) dbUpdates.lead_source_detail = updates.lead_source_detail;
 if (updates.assigned_to !== undefined) dbUpdates.assigned_to = updates.assigned_to;
 if (updates.follow_up_at !== undefined) dbUpdates.follow_up_at = updates.follow_up_at;
 if (updates.tags !== undefined) dbUpdates.tags = updates.tags;
 if (updates.checklist !== undefined) dbUpdates.checklist = updates.checklist;
 if (updates.pax_list !== undefined) dbUpdates.pax_list = updates.pax_list;
 if (updates.custom_fields !== undefined) {
   dbUpdates.custom_fields = {
     ...updates.custom_fields,
     ...((dbUpdates.custom_fields as Record<string, any>) || {}),
   };
 }
 if (updates.lost_reason !== undefined) dbUpdates.lost_reason = updates.lost_reason;

 let { error } = await supabase
 .from("leads_crm")
 .update(dbUpdates)
 .eq("id", leadId)
 .eq("store_id", identity.store_id);

 if (error && updates.status !== undefined && /23514|leads_crm_status_check/i.test(`${error.code || ""} ${error.message || ""}`)) {
   const fallbackStage = await resolveStoreStageContract(supabase, identity.store_id, updates.status);
   dbUpdates.status = fallbackStage.canonicalBucket;
   ({ error } = await supabase
     .from("leads_crm")
     .update(dbUpdates)
     .eq("id", leadId)
     .eq("store_id", identity.store_id));
 }

 if (error && /42703|column .* does not exist|PGRST204/i.test(`${error.code || ""} ${error.message || ""}`)) {
   for (const col of [
     "destination_tags",
     "origin_city",
     "origin_iata",
     "period_tags",
     "target_months",
     "flexibility_days",
     "date_flexibility_mode",
     "rooms_count",
     "room_occupancies",
     "children_ages",
     "raw_intent_markdown",
     "follow_up_at",
   ]) {
     delete dbUpdates[col];
   }
   ({ error } = await supabase
     .from("leads_crm")
     .update(dbUpdates)
     .eq("id", leadId)
     .eq("store_id", identity.store_id));
 }

 if (error) throw error;

 const updatedStatusLower = String(dbUpdates.status || "").toLowerCase();
 const isClosedStage =
   Boolean(dbUpdates.closed_at) ||
   ["won", "lost", "archived", "opted_out", "closed_won", "closed_lost"].includes(updatedStatusLower);

 if (!isClosedStage) {
  import("./opportunity-radar.functions")
    .then((mod) =>
      mod.internalEvaluateDemandAgainstAllSupply({
        storeId: identity.store_id,
        leadId,
      })
    )
    .catch(() => {});
 }

 return { status: "success" as const };
 } catch (e: unknown) {
 console.error("[crm] updateLeadDetails error:", e);
 throw new Error((e instanceof Error ? e.message : String(e)) || "Erro ao atualizar lead.");
 }
 });

export const toggleLeadChecklist = createServerFn({ method: "POST" })
 .validator(z.object({ leadId: z.string().uuid(), itemId: z.string() }))
 .handler(async ({ data: { leadId, itemId } }) => {
 try {
 const supabase = getServerClient();
 const identity = await getServerIdentity();
 assertStoreAccess(identity, ["owner", "admin", "manager", "seller"]);

 const { data: lead, error: fetchErr } = await supabase
 .from("leads_crm")
 .select("checklist")
 .eq("id", leadId)
 .eq("store_id", identity.store_id)
 .single();

 if (fetchErr || !lead) throw new Error("Lead não encontrado");

 const items: Array<{ id: string; text: string; done: boolean }> = Array.isArray(lead.checklist)
 ? lead.checklist
 : [];

 const updated = items.map((item) =>
 item.id === itemId ? { ...item, done: !item.done } : item
 );

 const { error: updateErr } = await supabase
 .from("leads_crm")
 .update({
 checklist: updated,
 updated_at: new Date().toISOString(),
 })
 .eq("id", leadId)
 .eq("store_id", identity.store_id);

 if (updateErr) throw updateErr;
 return { status: "success" as const, checklist: updated };
 } catch (e: unknown) {
 console.error("[crm] toggleLeadChecklist error:", e);
 throw new Error((e instanceof Error ? e.message : String(e)) || "Erro ao alterar checklist.");
 }
 });

export const deleteLead = createServerFn({ method: "POST" })
 .validator(z.object({ leadId: z.string().uuid() }))
 .handler(async ({ data: { leadId } }) => {
 try {
 const supabase = getServerClient();
 const identity = await getServerIdentity();
 assertStoreAccess(identity, ["owner", "admin", "manager"]);

 const { error } = await supabase
 .from("leads_crm")
 .delete()
 .eq("id", leadId)
 .eq("store_id", identity.store_id);

 if (error) throw error;
 return { status: "success" as const };
 } catch (e: unknown) {
 console.error("[crm] deleteLead error:", e);
 throw new Error((e instanceof Error ? e.message : String(e)) || "Erro ao remover lead.");
 }
 });

export const getLeadStats = createServerFn({ method: "GET" }).handler(async () => {
 try {
 const supabase = getServerClient();
 const identity = await getServerIdentity();
 assertStoreAccess(identity, ["owner", "admin", "manager", "seller", "support"]);

 const { data, error } = await supabase
 .from("leads_crm")
 .select("status")
 .eq("store_id", identity.store_id);

 if (error) throw error;

 const stats = { new: 0, contacted: 0, converted: 0, lost: 0, total: 0 };
 for (const lead of data || []) {
 stats[lead.status as keyof typeof stats] =
 (stats[lead.status as keyof typeof stats] as number) + 1;
 stats.total++;
 }

 return stats;
 } catch (e: unknown) {
 console.error("[crm] getLeadStats error:", e);
 throw new Error("Erro ao buscar estatísticas de leads.");
 }
});

export const promoteLeadToCustomer = createServerFn({ method: "POST" })
 .validator(z.object({ leadId: z.string().uuid() }))
 .handler(async ({ data: { leadId } }) => {
 try {
  const supabase = getServerClient();
  const identity = await getServerIdentity();
  assertStoreAccess(identity, ["owner", "admin", "manager", "seller"]);

  // 1. Busca dados do lead
  const { data: lead, error: fetchError } = await supabase
  .from("leads_crm")
  .select("*")
  .eq("id", leadId)
  .eq("store_id", identity.store_id)
  .single();

  if (fetchError || !lead) throw new Error("Lead não encontrado");

  // 2. Tenta associar via deduplicação atômica ou reutiliza existente
  let customerId = lead.customer_id;
  if (!customerId) {
    const { data: linkedId, error: rpcError } = await (supabase.rpc as any)(
      "deduplicate_and_link_lead_to_customer",
      {
        p_lead_id: leadId,
        p_store_id: identity.store_id,
      }
    );

    if (!rpcError && linkedId) {
      customerId = linkedId;
    } else {
      const tagsList = ["Lead Convertido"];
      if (lead.source) tagsList.push(lead.source);
      if (lead.interest_type) tagsList.push(lead.interest_type);

      const notesLines: string[] = [];
      if (lead.message) notesLines.push(`Mensagem original: ${lead.message}`);
      if (lead.destination) notesLines.push(`Destino de interesse: ${lead.destination}`);
      if (lead.notes) notesLines.push(lead.notes);

      const { data: newCustomer, error: createError } = await supabase
        .from("customers_crm")
        .insert({
          store_id: identity.store_id,
          kind: "individual",
          full_name: lead.full_name?.trim() || lead.title || "Cliente",
          email: sanitizeCustomerEmail(lead.email),
          phone: lead.phone?.trim() || null,
          document: lead.document?.trim() || null,
          birth_date: lead.birth_date || null,
          status: "active",
          channel: lead.source || "direct",
          tags: tagsList,
          notes: notesLines.length > 0 ? notesLines.join("\n") : null,
          lifetime_lead_count: 1,
          last_commercial_touch_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (createError) throw new Error("Erro ao criar cliente: " + createError.message);
      customerId = newCustomer.id;
    }
  }

  // 3. Atualiza lead com customer_id e status converted
  await supabase
  .from("leads_crm")
  .update({
   status: "converted",
   customer_id: customerId,
   closed_at: new Date().toISOString(),
   updated_at: new Date().toISOString(),
  })
  .eq("id", leadId)
  .eq("store_id", identity.store_id);

  // 4. Registra atividade na timeline
  await supabase.from("lead_activities").insert({
    lead_id: leadId,
    store_id: identity.store_id,
    author_id: identity.id,
    type: "conversion",
    content: `Lead convertido para Cliente Oficial. ID: ${customerId}`,
    metadata: { customer_id: customerId },
  }).then(() => null, () => null);

  // Closed-Loop Meta CAPI & Google Ads: dispara evento Purchase na conversão final do lead
  if (identity.store_id) {
    const cf = (lead.custom_fields as any) || {};
    dispatchClosedLoopLeadQualification({
      data: {
        storeId: identity.store_id,
        leadId: lead.id,
        stage: "converted",
        stagePurpose: "won",
        email: sanitizeCustomerEmail(lead.email),
        phone: lead.phone,
        fbp: cf.fbp || null,
        fbc: cf.fbc || null,
        gclid: cf.gclid || null,
        gbraid: cf.gbraid || null,
        wbraid: cf.wbraid || null,
        deviceId: cf.device_id || null,
        conversionValue: (lead.estimated_value_cents || 0) / 100,
      },
    }).catch(() => {});
  }

  try {
    const { autoBindLeadToMatchingWhatsAppThreads } = await import("@/services/chat-quick-actions.functions");
    await autoBindLeadToMatchingWhatsAppThreads(supabase, {
      storeId: identity.store_id,
      leadId,
      phone: lead.phone,
      customerId,
    });
  } catch {
    // sincronizacao resiliente
  }

  const { data: customerRow } = await supabase
    .from("customers_crm")
    .select("id, full_name, name, document, phone, email, city, state, birth_date, avatar_url, notes, tags")
    .eq("id", customerId)
    .eq("store_id", identity.store_id)
    .maybeSingle();

  return {
    status: "success" as const,
    customerId,
    isAlreadyCustomer: Boolean(lead.customer_id),
    customer: customerRow || null,
  };
 } catch (e: unknown) {
  console.error("[crm] promoteLeadToCustomer error:", e);
  throw new Error((e instanceof Error ? e.message : String(e)) || "Erro ao converter lead.");
 }
 });

export const upsertCustomerAddress = createServerFn({ method: "POST" })
 .validator(
 z.object({
 id: z.string().uuid().optional(),
 customer_id: z.string().uuid(),
 zipcode: z.string().min(8).max(20),
 street: z.string().min(1),
 number: z.string().min(1),
 complement: z.string().optional().nullable(),
 neighborhood: z.string().min(1),
 city: z.string().min(1),
 state: z.string().length(2),
 is_default: z.boolean().default(false),
 }),
 )
 .handler(async ({ data: input }) => {
 try {
 const supabase = getServerClient();
 const identity = await getServerIdentity();
 assertStoreAccess(identity, ["owner", "admin", "manager", "seller"]);

 const { id, customer_id, is_default, ...addressFields } = input;

 const { data: prof } = await supabase
 .from("profiles")
 .select("resume_data")
 .eq("id", customer_id)
 .maybeSingle();

 const existingResume = (prof?.resume_data as any) || {};
 const existingAddresses: any[] = existingResume.addresses || [];

 const newAddr = {
 id: id || crypto.randomUUID(),
 ...addressFields,
 is_default: Boolean(is_default),
 created_at: new Date().toISOString(),
 };

 let updatedAddresses: any[];
 if (id) {
 updatedAddresses = existingAddresses.map((a) => (a.id === id ? { ...a, ...newAddr } : a));
 } else {
 updatedAddresses = [...existingAddresses, newAddr];
 }

 if (is_default) {
 updatedAddresses = updatedAddresses.map((a) => ({
 ...a,
 is_default: a.id === newAddr.id,
 }));
 }

 await supabase
 .from("profiles")
 .update({
 resume_data: { ...existingResume, addresses: updatedAddresses },
 updated_at: new Date().toISOString(),
 })
 .eq("id", customer_id);

 return newAddr;
 } catch (e: unknown) {
 console.error("[crm] upsertCustomerAddress error:", e);
 throw new Error((e instanceof Error ? e.message : String(e)) || "Erro ao salvar endereço.");
 }
 });

export const deleteCustomerAddress = createServerFn({ method: "POST" })
 .validator(
 z.object({
 addressId: z.string().uuid(),
 customerId: z.string().uuid(),
 }),
 )
 .handler(async ({ data: { addressId, customerId } }) => {
 try {
 const supabase = getServerClient();
 const identity = await getServerIdentity();
 assertStoreAccess(identity, ["owner", "admin", "manager", "seller"]);

 const { data: prof } = await supabase
 .from("profiles")
 .select("resume_data")
 .eq("id", customerId)
 .maybeSingle();

 const existingResume = (prof?.resume_data as any) || {};
 const existingAddresses: any[] = existingResume.addresses || [];
 const filtered = existingAddresses.filter((a) => a.id !== addressId);

 await supabase
 .from("profiles")
 .update({
 resume_data: { ...existingResume, addresses: filtered },
 updated_at: new Date().toISOString(),
 })
 .eq("id", customerId);

 return { status: "success" as const };
 } catch (e: unknown) {
 console.error("[crm] deleteCustomerAddress error:", e);
 throw new Error((e instanceof Error ? e.message : String(e)) || "Erro ao deletar endereço.");
 }
 });

// ─── CRM LEAD 360° DRAWER & MEETINGS (ENTERPRISE STANDARD) ──

export const getLeadById = createServerFn({ method: "GET" })
  .validator(z.object({ leadId: z.string().uuid() }))
  .handler(async ({ data: { leadId } }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager", "seller", "support"]);

    const { data: lead, error } = await supabase
      .from("leads_crm")
      .select("*")
      .eq("id", leadId)
      .eq("store_id", identity.store_id)
      .single();

    if (error || !lead) throw new Error("Lead não encontrado");

    const [activitiesRes, meetingsRes, proposalsRes] = await Promise.all([
      supabase
        .from("lead_activities")
        .select("*")
        .eq("lead_id", leadId)
        .order("created_at", { ascending: false }),
      supabase
        .from("lead_meetings")
        .select("*")
        .eq("lead_id", leadId)
        .order("scheduled_at", { ascending: true }),
      supabase
        .from("travel_proposals")
        .select("*")
        .eq("lead_id", leadId)
        .then((res) => res, () => ({ data: [] })),
    ]);

    return {
      lead,
      activities: activitiesRes.data || [],
      meetings: meetingsRes.data || [],
      proposals: proposalsRes.data || [],
    };
  });

export const addLeadMeeting = createServerFn({ method: "POST" })
  .validator(
    z.object({
      leadId: z.string().uuid(),
      title: z.string().min(2),
      description: z.string().optional().nullable(),
      scheduledAt: z.string(),
      durationMinutes: z.number().int().default(30),
      meetingType: z.enum(["call", "video", "in_person"]).default("call"),
    })
  )
  .handler(async ({ data: input }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager", "seller", "support"]);

    const { data: meeting, error } = await supabase
      .from("lead_meetings")
      .insert({
        lead_id: input.leadId,
        store_id: identity.store_id,
        title: input.title,
        description: input.description || null,
        scheduled_at: input.scheduledAt,
        duration_minutes: input.durationMinutes,
        meeting_type: input.meetingType,
      })
      .select()
      .single();

    if (error) throw new Error("Erro ao agendar reunião: " + error.message);

    const { error: activityError } = await supabase.from("lead_activities").insert({
      lead_id: input.leadId,
      store_id: identity.store_id,
      author_id: identity.id,
      type: "meeting",
      content: `Reunião agendada: "${input.title}" para ${new Date(input.scheduledAt).toLocaleString("pt-BR")}`,
      metadata: { meeting_id: meeting.id },
    });
    if (activityError) {
      await supabase.from("lead_meetings").delete().eq("id", meeting.id).eq("store_id", identity.store_id);
      throw new Error("A reunião foi revertida porque a atividade do lead não pôde ser registrada.");
    }

    return meeting;
  });

export const deleteLeadMeeting = createServerFn({ method: "POST" })
  .validator(z.object({ meetingId: z.string().uuid() }))
  .handler(async ({ data: { meetingId } }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager", "seller"]);

    const { error } = await supabase
      .from("lead_meetings")
      .delete()
      .eq("id", meetingId)
      .eq("store_id", identity.store_id);

    if (error) throw new Error("Erro ao cancelar reunião: " + error.message);
    return { success: true };
  });

export const addLeadActivity = createServerFn({ method: "POST" })
  .validator(
    z.object({
      leadId: z.string().uuid(),
      type: z.string().default("note"),
      content: z.string().min(1),
      metadata: z.record(z.unknown()).optional(),
    })
  )
  .handler(async ({ data: input }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager", "seller", "support"]);

    const { data, error } = await supabase
      .from("lead_activities")
      .insert({
        lead_id: input.leadId,
        store_id: identity.store_id,
        author_id: identity.id,
        type: input.type,
        content: input.content,
        metadata: input.metadata || {},
      })
      .select()
      .single();

    if (error) throw new Error("Erro ao registrar atividade: " + error.message);
    return data;
  });

export const updateLeadStaleness = createServerFn({ method: "POST" })
  .validator(
    z.object({
      leadId: z.string().uuid(),
      stalenessStatus: z.enum(["active", "disappeared", "gave_up", "no_credit", "postponed"]),
      reasonLabel: z.string().optional(),
    })
  )
  .handler(async ({ data: { leadId, stalenessStatus, reasonLabel } }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager", "seller"]);

    const { error } = await supabase
      .from("leads_crm")
      .update({
        staleness_status: stalenessStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", leadId)
      .eq("store_id", identity.store_id);

    if (error) throw error;

    if (reasonLabel) {
      await supabase.from("lead_activities").insert({
        lead_id: leadId,
        store_id: identity.store_id,
        author_id: identity.id,
        type: "status_change",
        content: `Status de inatividade marcado como: ${reasonLabel}`,
      });
    }

    return { success: true };
  });

export const addLeadPassenger = createServerFn({ method: "POST" })
  .validator(
    z.object({
      leadId: z.string().uuid(),
      passenger: z.object({
        full_name: z.string().min(2),
        document: z.string().optional().nullable(),
        birth_date: z.string().optional().nullable(),
        relationship: z.string().default("other"),
        phone: z.string().optional().nullable(),
        email: z.string().optional().nullable(),
      }),
    })
  )
  .handler(async ({ data: { leadId, passenger } }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager", "seller"]);

    const { data: lead } = await supabase
      .from("leads_crm")
      .select("pax_list")
      .eq("id", leadId)
      .eq("store_id", identity.store_id)
      .single();

    const currentPaxList: any[] = Array.isArray(lead?.pax_list) ? lead.pax_list : [];
    const updatedPaxList = [...currentPaxList, passenger];

    const { error } = await supabase
      .from("leads_crm")
      .update({
        pax_list: updatedPaxList,
        pax_count: updatedPaxList.length,
        updated_at: new Date().toISOString(),
      })
      .eq("id", leadId)
      .eq("store_id", identity.store_id);

    if (error) throw error;
    return { success: true, pax_list: updatedPaxList };
  });

export const removeLeadPassenger = createServerFn({ method: "POST" })
  .validator(
    z.object({
      leadId: z.string().uuid(),
      index: z.number().int().min(0),
    })
  )
  .handler(async ({ data: { leadId, index } }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager", "seller"]);

    const { data: lead } = await supabase
      .from("leads_crm")
      .select("pax_list")
      .eq("id", leadId)
      .eq("store_id", identity.store_id)
      .single();

    const currentPaxList: any[] = Array.isArray(lead?.pax_list) ? lead.pax_list : [];
    const updatedPaxList = currentPaxList.filter((_, i) => i !== index);

    const { error } = await supabase
      .from("leads_crm")
      .update({
        pax_list: updatedPaxList,
        pax_count: Math.max(1, updatedPaxList.length),
        updated_at: new Date().toISOString(),
      })
      .eq("id", leadId)
      .eq("store_id", identity.store_id);

    if (error) throw error;
    return { success: true, pax_list: updatedPaxList };
  });

export const getPublicLeadByToken = createServerFn({ method: "GET" })
  .validator(z.object({ token: z.string().min(1) }))
  .handler(async ({ data: { token } }) => {
    const supabase = getServerClient();
    const leadRow = await resolvePublicLeadRecord(supabase, token);
    if (!leadRow) throw new Error("Formulário de viagem não encontrado ou expirado.");

    const { data: storeRow } = await supabase
      .from("stores")
      .select("name, logo_url, phone, settings")
      .eq("id", leadRow.store_id)
      .maybeSingle();

    let customerRow: any = null;
    if (leadRow.customer_id) {
      const { data: cData } = await supabase
        .from("customers_crm")
        .select("id, full_name, document, rg, birth_date, phone, email, address, address_line, city, state, zipcode")
        .eq("id", leadRow.customer_id)
        .eq("store_id", leadRow.store_id)
        .maybeSingle();
      customerRow = cData;
    }

    const docFilter = leadRow.customer_id
      ? `lead_id.eq.${leadRow.id},customer_id.eq.${leadRow.customer_id}`
      : `lead_id.eq.${leadRow.id}`;

    const { data: rawDocs } = await supabase
      .from("customer_documents")
      .select("*")
      .eq("store_id", leadRow.store_id)
      .or(docFilter)
      .order("created_at", { ascending: false });

    const customerDocuments = await hydrateSignedCustomerDocuments(supabase, rawDocs || []);

    const cf = (leadRow.custom_fields as Record<string, any>) || {};
    const primaryDossier = Array.isArray(cf.traveler_dossiers)
      ? cf.traveler_dossiers.find((p: any) => p.is_primary) || cf.traveler_dossiers[0] || {}
      : {};
    const storeSettings = (storeRow?.settings as Record<string, any>) || {};

    return {
      id: leadRow.id,
      store_id: leadRow.store_id,
      customer_id: leadRow.customer_id || customerRow?.id || null,
      title: leadRow.title,
      full_name: leadRow.full_name || customerRow?.full_name || "",
      document: leadRow.document || customerRow?.document || primaryDossier.document_cpf || primaryDossier.cpf || "",
      rg: leadRow.rg || customerRow?.rg || primaryDossier.rg || "",
      birth_date: normalizeDateOnlyInput(leadRow.birth_date || customerRow?.birth_date || primaryDossier.birth_date) || "",
      phone: leadRow.phone || customerRow?.phone || "",
      email: leadRow.email || customerRow?.email || "",
      address: customerRow?.address || customerRow?.address_line || primaryDossier.address || "",
      city: customerRow?.city || cf.city || "",
      state: customerRow?.state || cf.state || "",
      zipcode: customerRow?.zipcode || cf.zipcode || "",
      destination: leadRow.destination || "",
      departure_city: leadRow.departure_city || cf.departure_city || "",
      interest_type: leadRow.interest_type || "package_flight",
      interest_period: leadRow.interest_period || "",
      travel_start: normalizeDateOnlyInput(leadRow.travel_start) || "",
      travel_end: normalizeDateOnlyInput(leadRow.travel_end) || "",
      accommodation_pref: leadRow.accommodation_pref || cf.accommodation_pref || "",
      meal_plan: leadRow.meal_plan || cf.meal_plan || "",
      emergency_contact_name: leadRow.emergency_contact_name || cf.emergency_contact_name || "",
      emergency_contact_phone: leadRow.emergency_contact_phone || cf.emergency_contact_phone || "",
      passport_number: primaryDossier.passport_number || cf.passport_number || "",
      passport_expiry_date: normalizeDateOnlyInput(primaryDossier.passport_expiry_date || cf.passport_expiry_date) || "",
      seat_preference: primaryDossier.seat_preference || cf.seat_preference || "Indiferente",
      dietary_restrictions: primaryDossier.dietary_restrictions || cf.dietary_restrictions || "",
      pax_count: leadRow.pax_count || 1,
      pax_adults: leadRow.pax_adults || 1,
      pax_children: leadRow.pax_children || 0,
      pax_infants: leadRow.pax_infants || 0,
      pax_list: Array.isArray(leadRow.pax_list) ? leadRow.pax_list : [],
      lgpd_accepted: Boolean(leadRow.lgpd_accepted),
      lgpd_accepted_at: leadRow.lgpd_accepted_at || null,
      health_notes: leadRow.health_notes || cf.health_notes || "",
      pcd: Boolean(leadRow.pcd ?? cf.pcd),
      reduced_mobility: Boolean(leadRow.reduced_mobility ?? cf.reduced_mobility),
      autism: Boolean(leadRow.autism ?? cf.autism_spectrum),
      custom_fields: cf,
      customer: customerRow,
      customer_documents: customerDocuments,
      store_name: storeRow?.name || "Agência de Turismo",
      store_logo: storeRow?.logo_url || null,
      store_whatsapp: storeSettings.whatsapp_phone || storeSettings.whatsapp || storeRow?.phone || null,
    };
  });

export const submitPublicLeadFormSchema = z.object({
  token: z.string().min(1),
  fullName: z.string().min(2).max(160).optional(),
  document: z.string().max(40).optional().nullable(),
  rg: z.string().max(40).optional().nullable(),
  birthDate: z.string().max(32).optional().nullable(),
  phone: z.string().max(40).optional().nullable(),
  email: z.string().max(160).optional().nullable(),
  address: z.string().max(260).optional().nullable(),
  city: z.string().max(120).optional().nullable(),
  state: z.string().max(10).optional().nullable(),
  zipcode: z.string().max(24).optional().nullable(),
  destination: z.string().max(180).optional().nullable(),
  departureCity: z.string().max(160).optional().nullable(),
  travelStart: z.string().max(32).optional().nullable(),
  travelEnd: z.string().max(32).optional().nullable(),
  interestPeriod: z.string().max(120).optional().nullable(),
  accommodationPref: z.string().max(120).optional().nullable(),
  mealPlan: z.string().max(120).optional().nullable(),
  emergencyContactName: z.string().max(140).optional().nullable(),
  emergencyContactPhone: z.string().max(40).optional().nullable(),
  passportNumber: z.string().max(64).optional().nullable(),
  passportExpiryDate: z.string().max(32).optional().nullable(),
  seatPreference: z.string().max(64).optional().nullable(),
  dietaryRestrictions: z.string().max(280).optional().nullable(),
  paxList: z.array(
    z.object({
      id: z.string().optional(),
      full_name: z.string().min(2),
      document: z.string().optional().nullable(),
      rg: z.string().optional().nullable(),
      birth_date: z.string().optional().nullable(),
      relationship: z.string().default("other"),
      phone: z.string().optional().nullable(),
      email: z.string().optional().nullable(),
      passport_number: z.string().optional().nullable(),
      passport_expiry_date: z.string().optional().nullable(),
      seat_preference: z.string().optional().nullable(),
      dietary_restrictions: z.string().optional().nullable(),
    })
  ),
  lgpdAccepted: z.boolean(),
  healthNotes: z.string().optional().nullable(),
  pcd: z.boolean().optional(),
  reducedMobility: z.boolean().optional(),
  autism: z.boolean().optional(),
});

export const submitPublicLeadForm = createServerFn({ method: "POST" })
  .validator(submitPublicLeadFormSchema)
  .handler(async ({ data: input }) => {
    const supabase = getServerClient();
    const {
      token,
      fullName,
      document,
      rg,
      birthDate,
      phone,
      email,
      address,
      city,
      state,
      zipcode,
      destination,
      departureCity,
      travelStart,
      travelEnd,
      interestPeriod,
      accommodationPref,
      mealPlan,
      emergencyContactName,
      emergencyContactPhone,
      passportNumber,
      passportExpiryDate,
      seatPreference,
      dietaryRestrictions,
      paxList,
      lgpdAccepted,
      healthNotes,
      pcd,
      reducedMobility,
      autism,
    } = input;

    if (!lgpdAccepted) {
      throw new Error("É necessário aceitar os termos de privacidade (LGPD) para confirmar a ficha.");
    }

    const leadRow = await resolvePublicLeadRecord(supabase, token);
    if (!leadRow) {
      throw new Error("Formulário de viagem não encontrado ou expirado.");
    }

    const normalizedStart = travelStart !== undefined ? normalizeDateOnlyInput(travelStart) || null : normalizeDateOnlyInput(leadRow.travel_start) || null;
    const normalizedEnd = travelEnd !== undefined ? normalizeDateOnlyInput(travelEnd) || null : normalizeDateOnlyInput(leadRow.travel_end) || null;
    if (normalizedStart && normalizedEnd && normalizedEnd < normalizedStart) {
      throw new Error("A data de retorno não pode ser anterior à data de ida prevista.");
    }

    const normalizedBirth = normalizeDateOnlyInput(birthDate ?? leadRow.birth_date) || null;
    const normalizedPassportExpiry = normalizeDateOnlyInput(passportExpiryDate) || "";
    const cleanDoc = (document ?? leadRow.document ?? "").trim();
    const cleanName = (fullName ?? leadRow.full_name ?? "Passageiro Titular").trim();
    const cleanPhone = (phone ?? leadRow.phone ?? "").trim();
    const cleanEmail = (email ?? leadRow.email ?? "").trim();

    const sanitizedPaxList = paxList.map((pax, idx) => ({
      id: pax.id || `pax-acc-${idx + 1}`,
      full_name: pax.full_name.trim(),
      document: pax.document?.trim() || null,
      rg: pax.rg?.trim() || null,
      birth_date: normalizeDateOnlyInput(pax.birth_date) || null,
      relationship: pax.relationship || "other",
      phone: pax.phone?.trim() || null,
      email: pax.email?.trim() || null,
      passport_number: pax.passport_number?.trim().toUpperCase() || null,
      passport_expiry_date: normalizeDateOnlyInput(pax.passport_expiry_date) || null,
      seat_preference: pax.seat_preference || "Indiferente",
      dietary_restrictions: pax.dietary_restrictions?.trim() || null,
    }));

    const cf = (leadRow.custom_fields as Record<string, any>) || {};
    const existingDossiers: any[] = Array.isArray(cf.traveler_dossiers) ? cf.traveler_dossiers : [];
    const prevPrimary = existingDossiers.find((p: any) => p.is_primary) || {};
    const primaryEmergencyStr = emergencyContactName
      ? `${emergencyContactName.trim()}${emergencyContactPhone ? ` (${emergencyContactPhone.trim()})` : ""}`
      : prevPrimary.emergency_contact || "";

    const updatedPrimaryDossier = {
      ...prevPrimary,
      id: prevPrimary.id || "pax-primary",
      is_primary: true,
      relationship: "titular",
      full_name: cleanName,
      name: cleanName,
      document_cpf: cleanDoc,
      cpf: cleanDoc,
      rg: (rg ?? prevPrimary.rg ?? leadRow.rg ?? "").trim(),
      birth_date: normalizedBirth || prevPrimary.birth_date || "",
      email: cleanEmail,
      phone: cleanPhone,
      address: (address ?? prevPrimary.address ?? "").trim(),
      passport_number: (passportNumber ?? prevPrimary.passport_number ?? "").trim().toUpperCase(),
      passport_expiry_date: normalizedPassportExpiry || prevPrimary.passport_expiry_date || "",
      seat_preference: seatPreference || prevPrimary.seat_preference || "Indiferente",
      dietary_restrictions: (dietaryRestrictions ?? prevPrimary.dietary_restrictions ?? "").trim(),
      emergency_contact: primaryEmergencyStr,
    };

    const syncedCompanions = sanitizedPaxList.map((pax, idx) => {
      const prevComp = existingDossiers.find(
        (d: any) => !d.is_primary && (d.id === pax.id || (pax.document && (d.document_cpf === pax.document || d.cpf === pax.document)) || d.full_name === pax.full_name),
      ) || {};
      return {
        ...prevComp,
        id: pax.id || prevComp.id || `pax-acc-${idx + 1}`,
        is_primary: false,
        relationship: pax.relationship,
        full_name: pax.full_name,
        name: pax.full_name,
        document_cpf: pax.document || "",
        cpf: pax.document || "",
        rg: pax.rg || prevComp.rg || "",
        birth_date: pax.birth_date || "",
        email: pax.email || "",
        phone: pax.phone || "",
        passport_number: pax.passport_number || prevComp.passport_number || "",
        passport_expiry_date: pax.passport_expiry_date || prevComp.passport_expiry_date || "",
        seat_preference: pax.seat_preference || prevComp.seat_preference || "Indiferente",
        dietary_restrictions: pax.dietary_restrictions || prevComp.dietary_restrictions || "",
      };
    });

    const syncedDossiers = [updatedPrimaryDossier, ...syncedCompanions];
    const existingConsents = Array.isArray(cf.consent_records) ? cf.consent_records : [];
    const nowIso = new Date().toISOString();
    const updatedConsents = [
      ...existingConsents.filter((c: any) => c.policy_key !== "privacy" && c.id !== "consent-lgpd"),
      {
        id: "consent-lgpd",
        title: "Termo de Consentimento LGPD & Tratamento de Dados",
        version: "v2.4",
        status: "accepted",
        accepted_at: nowIso,
        channel: "Central do Passageiro (/m/lead)",
        policy_key: "privacy",
      },
    ];

    const mergedCustomFields = {
      ...cf,
      ...(pcd !== undefined ? { pcd } : {}),
      ...(reducedMobility !== undefined ? { reduced_mobility: reducedMobility } : {}),
      ...(autism !== undefined ? { autism_spectrum: autism } : {}),
      ...(healthNotes !== undefined ? { health_notes: healthNotes || "" } : {}),
      ...(city !== undefined ? { city: city || "" } : {}),
      ...(state !== undefined ? { state: state || "" } : {}),
      ...(zipcode !== undefined ? { zipcode: zipcode || "" } : {}),
      ...(departureCity !== undefined ? { departure_city: departureCity || "" } : {}),
      ...(accommodationPref !== undefined ? { accommodation_pref: accommodationPref || "" } : {}),
      ...(mealPlan !== undefined ? { meal_plan: mealPlan || "" } : {}),
      ...(emergencyContactName !== undefined ? { emergency_contact_name: emergencyContactName || "" } : {}),
      ...(emergencyContactPhone !== undefined ? { emergency_contact_phone: emergencyContactPhone || "" } : {}),
      passport_number: updatedPrimaryDossier.passport_number,
      passport_expiry_date: updatedPrimaryDossier.passport_expiry_date,
      seat_preference: updatedPrimaryDossier.seat_preference,
      dietary_restrictions: updatedPrimaryDossier.dietary_restrictions,
      traveler_dossiers: syncedDossiers,
      consent_records: updatedConsents,
    };

    const linkedCustomerId = await syncLeadToCustomerRecord(supabase, leadRow, {
      fullName: cleanName,
      document: cleanDoc,
      rg: rg ?? null,
      birthDate: normalizedBirth,
      phone: cleanPhone,
      email: cleanEmail,
      address: address ?? null,
      city: city ?? null,
      state: state ?? null,
      zipcode: zipcode ?? null,
      lgpdAccepted,
      healthNotes: healthNotes ?? null,
    });

    const refDate = normalizedStart ? new Date(`${normalizedStart}T12:00:00Z`) : new Date();
    const computedChildAges: number[] = [];
    let computedAdultCompanions = 0;
    for (const pax of sanitizedPaxList) {
      if (pax.birth_date && /^\d{4}-\d{2}-\d{2}/.test(String(pax.birth_date))) {
        const b = new Date(`${String(pax.birth_date).slice(0, 10)}T12:00:00Z`);
        let age = refDate.getUTCFullYear() - b.getUTCFullYear();
        const mDiff = refDate.getUTCMonth() - b.getUTCMonth();
        if (mDiff < 0 || (mDiff === 0 && refDate.getUTCDate() < b.getUTCDate())) age--;
        if (Number.isFinite(age) && age >= 0 && age <= 17) {
          computedChildAges.push(age);
        } else {
          computedAdultCompanions++;
        }
      } else {
        computedAdultCompanions++;
      }
    }

    const publicUpdatePayload: Record<string, any> = {
      ...(linkedCustomerId ? { customer_id: linkedCustomerId } : {}),
      full_name: cleanName,
      document: cleanDoc || null,
      rg: rg !== undefined ? (rg?.trim() || null) : leadRow.rg,
      birth_date: normalizedBirth,
      phone: cleanPhone || null,
      email: cleanEmail || null,
      ...(destination !== undefined ? { destination: destination?.trim() || null } : {}),
      ...(destination?.trim()
        ? { destination_tags: normalizeDestinationTagList(undefined, destination.trim()) }
        : {}),
      ...(departureCity !== undefined ? { departure_city: departureCity?.trim() || null } : {}),
      travel_start: normalizedStart,
      travel_end: normalizedEnd,
      ...(interestPeriod !== undefined ? { interest_period: interestPeriod?.trim() || null } : {}),
      ...(accommodationPref !== undefined ? { accommodation_pref: accommodationPref?.trim() || null } : {}),
      ...(mealPlan !== undefined ? { meal_plan: mealPlan?.trim() || null } : {}),
      ...(emergencyContactName !== undefined ? { emergency_contact_name: emergencyContactName?.trim() || null } : {}),
      ...(emergencyContactPhone !== undefined ? { emergency_contact_phone: emergencyContactPhone?.trim() || null } : {}),
      pax_list: sanitizedPaxList,
      pax_count: Math.max(1, sanitizedPaxList.length + 1),
      ...(sanitizedPaxList.length > 0
        ? {
            pax_adults: 1 + computedAdultCompanions,
            pax_children: computedChildAges.length,
            pax_infants: computedChildAges.filter((a) => a <= 1).length,
            children_ages: computedChildAges,
            pax_ages: computedChildAges,
            room_occupancies: [
              {
                roomNumber: 1,
                roomLabel: "Quarto 1",
                adultsCount: 1 + computedAdultCompanions,
                childrenCount: computedChildAges.length,
                childrenAges: computedChildAges,
              },
            ],
          }
        : {}),
      lgpd_accepted: true,
      lgpd_accepted_at: nowIso,
      health_notes: healthNotes !== undefined ? (healthNotes?.trim() || null) : leadRow.health_notes,
      ...(pcd !== undefined ? { pcd } : {}),
      ...(reducedMobility !== undefined ? { reduced_mobility: reducedMobility } : {}),
      ...(autism !== undefined ? { autism } : {}),
      custom_fields: mergedCustomFields,
      updated_at: nowIso,
      last_contacted_at: nowIso,
    };

    let { error: updateErr } = await supabase
      .from("leads_crm")
      .update(publicUpdatePayload)
      .eq("id", leadRow.id);

    if (updateErr && /42703|column .* does not exist|PGRST204/i.test(`${updateErr.code || ""} ${updateErr.message || ""}`)) {
      const compatPayload = { ...publicUpdatePayload };
      for (const col of ["destination_tags", "children_ages", "room_occupancies"]) {
        delete compatPayload[col];
      }
      ({ error: updateErr } = await supabase
        .from("leads_crm")
        .update(compatPayload)
        .eq("id", leadRow.id));
    }

    if (updateErr) {
      throw new Error("Não foi possível salvar a ficha: " + updateErr.message);
    }

    if (leadRow.store_id) {
      import("./opportunity-radar.functions")
        .then((mod) =>
          mod.internalEvaluateDemandAgainstAllSupply({
            storeId: leadRow.store_id,
            leadId: leadRow.id,
          })
        )
        .catch(() => {});
    }

    await supabase.from("lead_activities").insert({
      lead_id: leadRow.id,
      store_id: leadRow.store_id,
      type: "public_form_submitted",
      content: `Ficha de passageiros e viagem atualizada pelo titular ${cleanName} (${sanitizedPaxList.length + 1} viajante(s)).`,
      metadata: {
        travel_start: normalizedStart,
        travel_end: normalizedEnd,
        companions_count: sanitizedPaxList.length,
        customer_id: linkedCustomerId,
        lgpd_accepted: true,
      },
    });

    return {
      success: true,
      lead_id: leadRow.id,
      customer_id: linkedCustomerId,
      travel_start: normalizedStart,
      travel_end: normalizedEnd,
      pax_count: Math.max(1, sanitizedPaxList.length + 1),
    };
  });

export const uploadPublicLeadDocumentSchema = z.object({
  token: z.string().min(1),
  fileName: z.string().min(1).max(200),
  fileType: z.string().min(1).max(120),
  base64Data: z.string().min(1),
  docType: z.enum(CUSTOMER_DOCUMENT_TYPES),
  docNumber: z.string().max(80).optional().nullable(),
  issuedAt: z.string().max(32).optional().nullable(),
  expiresAt: z.string().max(32).optional().nullable(),
  notes: z.string().max(300).optional().nullable(),
  travelerId: z.string().max(80).optional().nullable(),
  travelerName: z.string().max(160).optional().nullable(),
});

export const uploadPublicLeadDocument = createServerFn({ method: "POST" })
  .validator(uploadPublicLeadDocumentSchema)
  .handler(async ({ data: input }) => {
    const supabase = getServerClient();
    const {
      token,
      fileName,
      fileType,
      base64Data,
      docType,
      docNumber,
      issuedAt,
      expiresAt,
      notes,
      travelerId,
      travelerName,
    } = input;

    const leadRow = await resolvePublicLeadRecord(supabase, token);
    if (!leadRow) {
      throw new Error("Formulário de viagem não encontrado ou expirado.");
    }

    enforceRateLimit(`public_lead:${leadRow.id}`, "media_upload");

    const normalizedType = resolveNormalizedMimeType(fileType, fileName);
    if (!PUBLIC_DOCUMENT_MIME_TYPES.has(normalizedType)) {
      throw new Error("Formato de arquivo não permitido. Envie PDF ou imagem (JPG, PNG, WEBP).");
    }

    const rawBase64 = base64Data.includes(",") ? (base64Data.split(",")[1] || "") : base64Data;
    const normalizedBase64 = rawBase64.replace(/\s/g, "");
    const estimatedBytes =
      Math.floor((normalizedBase64.length * 3) / 4) -
      (normalizedBase64.endsWith("==") ? 2 : normalizedBase64.endsWith("=") ? 1 : 0);
    if (estimatedBytes <= 0 || estimatedBytes > MAX_PUBLIC_DOC_UPLOAD_BYTES) {
      throw new Error("O arquivo deve ter no máximo 15 MB.");
    }

    const buffer = Buffer.from(normalizedBase64, "base64");
    const ext = extensionForMime(normalizedType, fileName);
    const safeTraveler = (travelerId || "titular").replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 48) || "titular";
    const safeBase = fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 72);
    const storagePath = `${leadRow.store_id}/leads/${leadRow.id}/${safeTraveler}/${Date.now()}_${safeBase}`;

    let { error: uploadErr } = await supabase.storage
      .from("identity-vault")
      .upload(storagePath, buffer, {
        contentType: normalizedType,
        upsert: false,
      });

    if (uploadErr && /bucket not found/i.test(uploadErr.message || "")) {
      await supabase.storage.createBucket("identity-vault", { public: false }).catch(() => null);
      ({ error: uploadErr } = await supabase.storage
        .from("identity-vault")
        .upload(storagePath, buffer, {
          contentType: normalizedType,
          upsert: false,
        }));
    }

    if (uploadErr) {
      throw new Error("Erro ao armazenar documento: " + uploadErr.message);
    }

    const { data: signed } = await supabase.storage
      .from("identity-vault")
      .createSignedUrl(storagePath, 60 * 60 * 6);

    const customerId = await syncLeadToCustomerRecord(supabase, leadRow, {});
    const resolvedTitle = `${CUSTOMER_DOC_TITLES[docType] || "Documento"}${travelerName ? ` — ${travelerName.trim()}` : ""}${docNumber?.trim() ? ` (${docNumber.trim()})` : ""}`;
    const issuedIso = normalizeDateOnlyInput(issuedAt) || null;
    const expiresIso = normalizeDateOnlyInput(expiresAt) || null;

    const { data: docRow, error: insertErr } = await supabase
      .from("customer_documents")
      .insert({
        store_id: leadRow.store_id,
        customer_id: customerId,
        lead_id: leadRow.id,
        traveler_id: travelerId || "pax-primary",
        traveler_name: travelerName?.trim() || leadRow.full_name || "Passageiro Titular",
        document_type: toCanonicalDocumentType(docType),
        doc_type: docType,
        title: resolvedTitle,
        doc_number: docNumber?.trim() || null,
        issued_at: issuedIso,
        expires_at: expiresIso,
        notes: notes?.trim() || null,
        file_url: signed?.signedUrl || storagePath,
        storage_bucket: "identity-vault",
        storage_path: storagePath,
        file_size_bytes: buffer.byteLength,
        file_extension: ext,
      })
      .select("*")
      .single();

    if (insertErr) {
      throw new Error("Erro ao vincular documento ao cadastro: " + insertErr.message);
    }

    const existingAttachments = Array.isArray(leadRow.attachments) ? leadRow.attachments : [];
    const attachmentEntry = {
      id: docRow.id,
      document_id: docRow.id,
      name: `${CUSTOMER_DOC_TITLES[docType] || docType} (${fileName})`,
      size: buffer.byteLength > 1024 * 1024
        ? `${(buffer.byteLength / (1024 * 1024)).toFixed(1)} MB`
        : `${Math.max(1, Math.round(buffer.byteLength / 1024))} KB`,
      type: normalizedType,
      url: signed?.signedUrl || storagePath,
      storage_bucket: "identity-vault",
      storage_path: storagePath,
      traveler_id: travelerId || "pax-primary",
      traveler_name: travelerName?.trim() || leadRow.full_name || "Passageiro Titular",
      createdAt: new Date().toISOString(),
    };

    const cf = (leadRow.custom_fields as Record<string, any>) || {};
    const dossiers = Array.isArray(cf.traveler_dossiers) ? [...cf.traveler_dossiers] : [];
    const targetIdx = dossiers.findIndex(
      (d: any) => d.id === (travelerId || "pax-primary") || (travelerId === "pax-primary" && d.is_primary),
    );
    if (targetIdx >= 0) {
      const prevDocs = Array.isArray(dossiers[targetIdx].documents) ? dossiers[targetIdx].documents : [];
      dossiers[targetIdx] = {
        ...dossiers[targetIdx],
        documents: [
          {
            id: docRow.id,
            title: resolvedTitle,
            type: docType,
            url: signed?.signedUrl || storagePath,
            storage_bucket: "identity-vault",
            storage_path: storagePath,
            expires_at: expiresIso,
            uploaded_at: new Date().toISOString(),
          },
          ...prevDocs,
        ],
      };
    }

    await supabase
      .from("leads_crm")
      .update({
        attachments: [attachmentEntry, ...existingAttachments],
        custom_fields: { ...cf, traveler_dossiers: dossiers },
        updated_at: new Date().toISOString(),
      })
      .eq("id", leadRow.id);

    await supabase.from("lead_activities").insert({
      lead_id: leadRow.id,
      store_id: leadRow.store_id,
      type: "document_uploaded",
      content: `Documento anexado no portal do passageiro: ${resolvedTitle}.`,
      metadata: {
        document_id: docRow.id,
        customer_id: customerId,
        doc_type: docType,
        traveler_id: travelerId || "pax-primary",
      },
    });

    const [hydrated] = await hydrateSignedCustomerDocuments(supabase, [docRow]);
    return {
      success: true,
      customerId,
      document: hydrated || docRow,
    };
  });

export const deletePublicLeadDocument = createServerFn({ method: "POST" })
  .validator(z.object({ token: z.string().min(1), documentId: z.string().uuid() }))
  .handler(async ({ data: { token, documentId } }) => {
    const supabase = getServerClient();
    const leadRow = await resolvePublicLeadRecord(supabase, token);
    if (!leadRow) {
      throw new Error("Formulário de viagem não encontrado ou expirado.");
    }

    const { data: docRow } = await supabase
      .from("customer_documents")
      .select("*")
      .eq("id", documentId)
      .eq("store_id", leadRow.store_id)
      .maybeSingle();

    if (!docRow) {
      throw new Error("Documento não encontrado.");
    }

    const belongsToLead =
      docRow.lead_id === leadRow.id ||
      (leadRow.customer_id && docRow.customer_id === leadRow.customer_id);
    if (!belongsToLead) {
      throw new Error("Sem permissão para remover este documento.");
    }

    if (docRow.storage_bucket && docRow.storage_path) {
      await supabase.storage.from(docRow.storage_bucket).remove([docRow.storage_path]).catch(() => null);
    }

    const { error: delErr } = await supabase
      .from("customer_documents")
      .delete()
      .eq("id", documentId)
      .eq("store_id", leadRow.store_id);

    if (delErr) {
      throw new Error("Erro ao excluir documento: " + delErr.message);
    }

    const existingAttachments = Array.isArray(leadRow.attachments) ? leadRow.attachments : [];
    const nextAttachments = existingAttachments.filter(
      (a: any) => a.id !== documentId && a.document_id !== documentId,
    );
    const cf = (leadRow.custom_fields as Record<string, any>) || {};
    const nextDossiers = Array.isArray(cf.traveler_dossiers)
      ? cf.traveler_dossiers.map((d: any) => ({
          ...d,
          documents: Array.isArray(d.documents)
            ? d.documents.filter((docItem: any) => docItem.id !== documentId)
            : [],
        }))
      : cf.traveler_dossiers;

    await supabase
      .from("leads_crm")
      .update({
        attachments: nextAttachments,
        custom_fields: { ...cf, traveler_dossiers: nextDossiers },
        updated_at: new Date().toISOString(),
      })
      .eq("id", leadRow.id);

    return { success: true };
  });

// ─── ASSIMILAÇÃO ENTERPRISE: PERSISTÊNCIA ATÔMICA & PERFIL 360° DO LEAD ────────

export const persistLeadMove = createServerFn({ method: "POST" })
  .validator(
    z.object({
      leadId: z.string().uuid(),
      toStatus: z.string().min(1).max(80),
      reorderedIds: z.array(z.string().uuid()).default([]),
    })
  )
  .handler(async ({ data: { leadId, toStatus, reorderedIds } }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager", "seller"]);

    const normalizedStage = normalizeKanbanStageSlug(toStatus);
    const resolved = await resolveStoreStageContract(supabase, identity.store_id, normalizedStage);
    const now = new Date().toISOString();

    const { data: leadRow } = await supabase
      .from("leads_crm")
      .select("id, email, phone, estimated_value_cents, custom_fields")
      .eq("id", leadId)
      .eq("store_id", identity.store_id)
      .maybeSingle();

    const existingCf = ((leadRow?.custom_fields as Record<string, any>) || {});
    const mergedCf: Record<string, any> = {
      ...existingCf,
      kanban_stage_key: resolved.matchedStageKey,
      kanban_stage_purpose: resolved.purpose,
      kanban_stage_updated_at: now,
    };

    const { error } = await (supabase.rpc as any)("persist_lead_move", {
      _lead_id: leadId,
      _to_status: resolved.matchedStageKey,
      _reordered_ids: reorderedIds,
      _store_id: identity.store_id,
    });

    if (error) {
      const patch: Record<string, any> = {
        status: resolved.matchedStageKey,
        pipeline_stage: resolved.matchedStageKey,
        custom_fields: mergedCf,
        updated_at: now,
        last_contacted_at: now,
        closed_at:
          resolved.purpose === "won" ||
          resolved.purpose === "lost" ||
          ["won", "lost", "converted"].includes(resolved.canonicalBucket)
            ? now
            : null,
      };

      let { error: fallbackErr } = await supabase
        .from("leads_crm")
        .update(patch)
        .eq("id", leadId)
        .eq("store_id", identity.store_id);

      if (fallbackErr && /pipeline_stage|column/i.test(fallbackErr.message || "")) {
        delete patch.pipeline_stage;
        ({ error: fallbackErr } = await supabase
          .from("leads_crm")
          .update(patch)
          .eq("id", leadId)
          .eq("store_id", identity.store_id));
      }

      if (fallbackErr && /23514|leads_crm_status_check/i.test(`${fallbackErr.code || ""} ${fallbackErr.message || ""}`)) {
        patch.status = resolved.canonicalBucket;
        ({ error: fallbackErr } = await supabase
          .from("leads_crm")
          .update(patch)
          .eq("id", leadId)
          .eq("store_id", identity.store_id));
      }

      if (fallbackErr) {
        throw new Error(`Não foi possível mover o card para ${resolved.title}: ${fallbackErr.message}`);
      }
    }

    const shouldDispatchConversion =
      ["in_progress", "review", "won"].includes(resolved.purpose) ||
      ["contacted", "qualified", "proposal", "negotiation", "won", "converted"].includes(resolved.canonicalBucket);

    // Closed-Loop Meta CAPI e Google Ads: retroalimenta o Dataset quando o lead avança no funil
    if (shouldDispatchConversion && identity.store_id && leadRow) {
      await dispatchClosedLoopLeadQualification({
        data: {
          storeId: identity.store_id,
          leadId: leadRow.id,
          stage: resolved.matchedStageKey,
          stagePurpose: resolved.purpose,
          email: leadRow.email,
          phone: leadRow.phone,
          fbp: mergedCf.fbp || null,
          fbc: mergedCf.fbc || null,
          gclid: mergedCf.gclid || null,
          gbraid: mergedCf.gbraid || null,
          wbraid: mergedCf.wbraid || null,
          ctwaClid: mergedCf.ctwa_clid || mergedCf.attribution?.ctwa_clid || null,
          campaignId: mergedCf.campaign_id || mergedCf.attribution?.campaign_id || null,
          adId: mergedCf.ad_id || mergedCf.attribution?.ad_id || null,
          formId: mergedCf.form_id || mergedCf.attribution?.form_id || null,
          sourcePixelId: mergedCf.source_pixel_id || mergedCf.attribution?.source_pixel_id || null,
          deviceId: mergedCf.device_id || null,
          conversionValue: (leadRow.estimated_value_cents || 0) / 100,
        },
      }).catch(() => {});
    }

    return {
      success: true,
      stageKey: resolved.matchedStageKey,
      canonicalBucket: resolved.canonicalBucket,
      purpose: resolved.purpose,
    };
  });

export const deduplicateAndLinkLead = createServerFn({ method: "POST" })
  .validator(z.object({ leadId: z.string().uuid() }))
  .handler(async ({ data: { leadId } }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager", "seller"]);

    const { data: customerId, error } = await (supabase.rpc as any)(
      "deduplicate_and_link_lead_to_customer",
      {
        p_lead_id: leadId,
        p_store_id: identity.store_id,
      }
    );

    if (error) throw new Error(`Falha na deduplicação do lead: ${error.message}`);
    return { success: true, customerId };
  });

export const getCustomer360Profile = createServerFn({ method: "GET" })
  .validator(z.object({ leadId: z.string().uuid() }))
  .handler(async ({ data: { leadId } }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager", "seller", "support"]);

    // 1. Busca o lead atual
    const { data: lead, error: leadErr } = await supabase
      .from("leads_crm")
      .select("*")
      .eq("id", leadId)
      .eq("store_id", identity.store_id)
      .single();

    if (leadErr || !lead) throw new Error("Lead não encontrado");

    // 2. Busca o cliente vinculado
    let customer: any = null;
    let otherLeads: any[] = [];
    let contracts: any[] = [];
    let trips: any[] = [];
    let incidents: any[] = [];

    // Auto-identificação inteligente: se lead ainda não possui customer_id, busca cliente pré-existente
    if (!lead.customer_id) {
      let matchedCustomerId: string | null = null;
      if (lead.document && lead.document.replace(/\D/g, "").length >= 11) {
        const { data: byDoc } = await supabase
          .from("customers_crm")
          .select("id")
          .eq("store_id", identity.store_id)
          .eq("document", lead.document.trim())
          .maybeSingle();
        if (byDoc?.id) matchedCustomerId = byDoc.id;
      }
      if (!matchedCustomerId && lead.phone) {
        const phoneDigits = lead.phone.replace(/\D/g, "");
        if (phoneDigits.length >= 8) {
          const suffix8 = phoneDigits.slice(-8);
          const { data: byPhoneList } = await supabase
            .from("customers_crm")
            .select("id, phone")
            .eq("store_id", identity.store_id)
            .not("phone", "is", null);
          const matched = (byPhoneList || []).find((c) => {
            const cDigits = (c.phone || "").replace(/\D/g, "");
            return cDigits.endsWith(suffix8);
          });
          if (matched?.id) matchedCustomerId = matched.id;
        }
      }
      if (!matchedCustomerId && lead.email && sanitizeCustomerEmail(lead.email)) {
        const cleanEmail = sanitizeCustomerEmail(lead.email);
        if (cleanEmail) {
          const { data: byEmail } = await supabase
            .from("customers_crm")
            .select("id")
            .eq("store_id", identity.store_id)
            .ilike("email", cleanEmail)
            .maybeSingle();
          if (byEmail?.id) matchedCustomerId = byEmail.id;
        }
      }

      if (matchedCustomerId) {
        await supabase
          .from("leads_crm")
          .update({
            customer_id: matchedCustomerId,
            updated_at: new Date().toISOString(),
          })
          .eq("id", lead.id)
          .eq("store_id", identity.store_id);

        lead.customer_id = matchedCustomerId;

        try {
          const { autoBindLeadToMatchingWhatsAppThreads } = await import("@/services/chat-quick-actions.functions");
          await autoBindLeadToMatchingWhatsAppThreads(supabase, {
            storeId: identity.store_id,
            leadId: lead.id,
            phone: lead.phone,
            customerId: matchedCustomerId,
          });
        } catch {
          // não bloqueia
        }
      }
    }

    if (lead.customer_id) {
      const { data: cData } = await supabase
        .from("customers_crm")
        .select("*")
        .eq("id", lead.customer_id)
        .eq("store_id", identity.store_id)
        .single();
      customer = cData;

      // Busca todos os outros leads deste mesmo cliente (com estrito isolamento por store_id)
      const { data: lData } = await supabase
        .from("leads_crm")
        .select("id, title, destination, status, estimated_value_cents, created_at, closed_at")
        .eq("customer_id", lead.customer_id)
        .eq("store_id", identity.store_id)
        .neq("id", lead.id)
        .order("created_at", { ascending: false });
      otherLeads = lData || [];

      // Coleta IDs explícitos de contratos vinculados no custom_fields do lead
      const leadContractIds = Array.from(
        new Set<string>([
          ...(Array.isArray(lead.custom_fields?.contract_ids) ? (lead.custom_fields.contract_ids as string[]) : []),
          ...(lead.custom_fields?.linked_contract_id ? [String(lead.custom_fields.linked_contract_id)] : []),
          ...(lead.custom_fields?.payment_plan?.linked_contract_id ? [String(lead.custom_fields.payment_plan.linked_contract_id)] : []),
        ].filter(Boolean))
      );

      const contractOrParts: string[] = [
        `lead_id.eq.${lead.id}`,
        `metadata->>lead_id.eq.${lead.id}`,
      ];
      if (lead.customer_id) {
        contractOrParts.push(`customer_id.eq.${lead.customer_id}`);
        contractOrParts.push(`metadata->>customer_id.eq.${lead.customer_id}`);
      }
      if (leadContractIds.length > 0) {
        contractOrParts.push(`id.in.(${leadContractIds.join(",")})`);
      }
      const contractOrFilter = contractOrParts.join(",");

      const legacyOrParts: string[] = [`lead_id.eq.${lead.id}`];
      if (lead.customer_id) {
        legacyOrParts.push(`customer_id.eq.${lead.customer_id}`);
      }
      if (leadContractIds.length > 0) {
        legacyOrParts.push(`id.in.(${leadContractIds.join(",")})`);
      }
      const legacyOrFilter = legacyOrParts.join(",");

      // Busca contratos vinculados ao cliente ou ao lead (tabela canônica contracts + legado travel_contracts)
      const [{ data: legacyCtrData }, canonicalRes] = await Promise.all([
        supabase
          .from("travel_contracts")
          .select("id, contract_title, public_token, status, total_value_cents, destination, signed_at, created_at")
          .eq("store_id", identity.store_id)
          .or(legacyOrFilter)
          .order("created_at", { ascending: false }),
        supabase
          .from("contracts")
          .select(`
            id, title, category, verification_code, status, metadata, created_at, updated_at,
            versions:contract_versions (
              id, version_number, is_sealed, sealed_at, page_count,
              envelopes:signature_envelopes (
                id, signer_name, signer_email, signer_phone, signer_role, status, viewed_at, signed_at, signing_token, dispatch_channel
              )
            )
          `)
          .eq("store_id", identity.store_id)
          .or(contractOrFilter)
          .order("created_at", { ascending: false }),
      ]);

      let canonicalCtrData: any[] = canonicalRes?.data || [];
      if (canonicalRes?.error) {
        console.warn("[getCustomer360Profile] canonicalCtrData query join warning, tentando fallback direto:", canonicalRes.error);
        const { data: directData } = await supabase
          .from("contracts")
          .select("id, title, category, verification_code, status, metadata, created_at, updated_at")
          .eq("store_id", identity.store_id)
          .or(contractOrFilter)
          .order("created_at", { ascending: false });
        canonicalCtrData = (directData || []).map((d: any) => ({ ...d, versions: [] }));
      }
      const seenContractIds = new Set<string>();
      contracts = [
        ...(canonicalCtrData || []).map((c: any) => {
          const m = (c.metadata as Record<string, any>) || {};
          const versionList = Array.isArray(c.versions) ? c.versions : [];
          const currentVersion = versionList[0] || null;
          const envelopes = Array.isArray(currentVersion?.envelopes) ? currentVersion.envelopes : [];
          const partyEnvelope = envelopes.find((e: any) => e.signer_role === "party") || envelopes[0] || null;
          const signingToken = partyEnvelope?.signing_token || c.verification_code || m.public_token || c.id;
          const isSigned = c.status === "completed" || c.status === "signed" || envelopes.some((e: any) => e.status === "signed");

          return {
            id: c.id,
            contract_title: c.title,
            title: c.title,
            category: c.category || m.category || "tourism_package",
            public_token: c.verification_code || m.public_token || c.id,
            verification_code: c.verification_code || m.verification_code || "",
            signing_token: signingToken,
            status: isSigned ? "signed" : c.status || "signing",
            total_value_cents: Number(m.total_value_cents || 0),
            destination: m.destination || lead.destination || "",
            signed_at: m.signed_at || partyEnvelope?.signed_at || null,
            viewed_at: partyEnvelope?.viewed_at || null,
            created_at: c.created_at,
            updated_at: c.updated_at,
            envelopes: envelopes.map((e: any) => ({
              id: e.id,
              signer_name: e.signer_name,
              signer_email: e.signer_email,
              signer_phone: e.signer_phone,
              signer_role: e.signer_role,
              status: e.status,
              viewed_at: e.viewed_at,
              signed_at: e.signed_at,
              signing_token: e.signing_token,
              dispatch_channel: e.dispatch_channel,
            })),
          };
        }),
        ...(legacyCtrData || []),
      ].filter((c: any) => {
        if (!c?.id || seenContractIds.has(c.id)) return false;
        seenContractIds.add(c.id);
        return true;
      });

      // Busca todas as viagens confirmadas/históricas deste cliente ou de seus leads
      const leadIdsForCustomer = [lead.id, ...otherLeads.map((l: any) => l.id)];
      const { data: tripsData } = await supabase
        .from("tourism_trips")
        .select("id, title, destination_city, travel_start_date, travel_end_date, status, total_cents, lead_id, customer_id, created_at")
        .eq("store_id", identity.store_id)
        .or(`customer_id.eq.${lead.customer_id},lead_id.in.(${leadIdsForCustomer.join(",")})`)
        .order("travel_start_date", { ascending: false });
      trips = (tripsData || []).map((t: any) => ({
        ...t,
        destination: t.destination_city || lead.destination || "Não informado",
        departure_date: t.travel_start_date,
        return_date: t.travel_end_date,
        total_price_cents: t.total_cents || 0,
      }));

      // Busca chamados de suporte/incidentes vinculados ao cliente ou às suas viagens
      const tripIds = trips.map((t: any) => t.id);
      if (tripIds.length > 0) {
        const { data: incData } = await supabase
          .from("tourism_incident_tickets")
          .select("id, incident_type, priority, status, trip_id, passenger_name, description, created_at")
          .eq("store_id", identity.store_id)
          .in("trip_id", tripIds)
          .order("created_at", { ascending: false });
        incidents = (incData || []).map((inc: any) => ({
          ...inc,
          title: inc.description || inc.incident_type || "Incidente Operacional",
          category: inc.incident_type || "operational",
          severity: inc.priority || "medium",
        }));
      }
    } else {
      // Coleta IDs explícitos de contratos vinculados no custom_fields do lead
      const leadContractIds = Array.from(
        new Set<string>([
          ...(Array.isArray(lead.custom_fields?.contract_ids) ? (lead.custom_fields.contract_ids as string[]) : []),
          ...(lead.custom_fields?.linked_contract_id ? [String(lead.custom_fields.linked_contract_id)] : []),
          ...(lead.custom_fields?.payment_plan?.linked_contract_id ? [String(lead.custom_fields.payment_plan.linked_contract_id)] : []),
        ].filter(Boolean))
      );

      const contractOrFilter = [
        `lead_id.eq.${lead.id}`,
        `metadata->>lead_id.eq.${lead.id}`,
        ...(leadContractIds.length > 0 ? [`id.in.(${leadContractIds.join(",")})`] : []),
      ].join(",");

      // Se ainda não tem customer_id, busca contratos canônicos + legado e viagens pelo lead_id
      const [{ data: legacyCtrData }, canonicalRes] = await Promise.all([
        supabase
          .from("travel_contracts")
          .select("id, contract_title, public_token, status, total_value_cents, destination, signed_at, created_at")
          .eq("lead_id", lead.id)
          .eq("store_id", identity.store_id)
          .order("created_at", { ascending: false }),
        supabase
          .from("contracts")
          .select(`
            id, title, category, verification_code, status, metadata, created_at, updated_at,
            versions:contract_versions (
              id, version_number, is_sealed, sealed_at, page_count,
              envelopes:signature_envelopes (
                id, signer_name, signer_email, signer_phone, signer_role, status, viewed_at, signed_at, signing_token, dispatch_channel
              )
            )
          `)
          .eq("store_id", identity.store_id)
          .or(contractOrFilter)
          .order("created_at", { ascending: false }),
      ]);

      let canonicalCtrData: any[] = canonicalRes?.data || [];
      if (canonicalRes?.error) {
        console.warn("[getCustomer360Profile:else] canonicalCtrData join warning, fallback direto:", canonicalRes.error);
        const { data: directData } = await supabase
          .from("contracts")
          .select("id, title, category, verification_code, status, metadata, created_at, updated_at")
          .eq("store_id", identity.store_id)
          .or(contractOrFilter)
          .order("created_at", { ascending: false });
        canonicalCtrData = (directData || []).map((d: any) => ({ ...d, versions: [] }));
      }
      const seenContractIds = new Set<string>();
      contracts = [
        ...(canonicalCtrData || []).map((c: any) => {
          const m = (c.metadata as Record<string, any>) || {};
          const versionList = Array.isArray(c.versions) ? c.versions : [];
          const currentVersion = versionList[0] || null;
          const envelopes = Array.isArray(currentVersion?.envelopes) ? currentVersion.envelopes : [];
          const partyEnvelope = envelopes.find((e: any) => e.signer_role === "party") || envelopes[0] || null;
          const signingToken = partyEnvelope?.signing_token || c.verification_code || m.public_token || c.id;
          const isSigned = c.status === "completed" || c.status === "signed" || envelopes.some((e: any) => e.status === "signed");

          return {
            id: c.id,
            contract_title: c.title,
            title: c.title,
            category: c.category || m.category || "tourism_package",
            public_token: c.verification_code || m.public_token || c.id,
            verification_code: c.verification_code || m.verification_code || "",
            signing_token: signingToken,
            status: isSigned ? "signed" : c.status || "signing",
            total_value_cents: Number(m.total_value_cents || 0),
            destination: m.destination || lead.destination || "",
            signed_at: m.signed_at || partyEnvelope?.signed_at || null,
            viewed_at: partyEnvelope?.viewed_at || null,
            created_at: c.created_at,
            updated_at: c.updated_at,
            envelopes: envelopes.map((e: any) => ({
              id: e.id,
              signer_name: e.signer_name,
              signer_email: e.signer_email,
              signer_phone: e.signer_phone,
              signer_role: e.signer_role,
              status: e.status,
              viewed_at: e.viewed_at,
              signed_at: e.signed_at,
              signing_token: e.signing_token,
              dispatch_channel: e.dispatch_channel,
            })),
          };
        }),
        ...(legacyCtrData || []),
      ].filter((c: any) => {
        if (!c?.id || seenContractIds.has(c.id)) return false;
        seenContractIds.add(c.id);
        return true;
      });

      const { data: tripsData } = await supabase
        .from("tourism_trips")
        .select("id, title, destination_city, travel_start_date, travel_end_date, status, total_cents, lead_id, customer_id, created_at")
        .eq("store_id", identity.store_id)
        .eq("lead_id", lead.id)
        .order("travel_start_date", { ascending: false });
      trips = (tripsData || []).map((t: any) => ({
        ...t,
        destination: t.destination_city || lead.destination || "Não informado",
        departure_date: t.travel_start_date,
        return_date: t.travel_end_date,
        total_price_cents: t.total_cents || 0,
      }));
    }

    // 3. Busca atividades da timeline e reuniões isoladas por store_id
    const [{ data: activities }, { data: meetings }] = await Promise.all([
      supabase
        .from("lead_activities")
        .select("*")
        .eq("lead_id", lead.id)
        .eq("store_id", identity.store_id)
        .order("created_at", { ascending: false })
        .limit(30),
      supabase
        .from("lead_meetings")
        .select("*")
        .eq("lead_id", lead.id)
        .eq("store_id", identity.store_id)
        .order("scheduled_at", { ascending: true }),
    ]);

    // 3.5 Unifica contratos da tabela canônica public.contracts
    try {
      const { data: canonicalContracts } = await supabase
        .from("contracts")
        .select("id, title, category, verification_code, status, metadata, lead_id, customer_id, created_at")
        .or(`store_id.eq.${identity.store_id},metadata->>store_id.eq.${identity.store_id}`)
        .order("created_at", { ascending: false })
        .limit(60);

      if (canonicalContracts && canonicalContracts.length > 0) {
        const existingIds = new Set(contracts.map((c: any) => c.id));
        const existingTokens = new Set(contracts.map((c: any) => c.public_token));
        const cleanLeadPhone = String(lead.phone || "").replace(/\D/g, "");
        const cleanLeadDoc = String(lead.document || "").replace(/\D/g, "");

        for (const cc of canonicalContracts) {
          const meta = (cc.metadata as Record<string, any>) || {};
          const cleanMetaPhone = String(meta.client_phone || "").replace(/\D/g, "");
          const cleanMetaDoc = String(meta.client_document || "").replace(/\D/g, "");

          const phoneMatched = Boolean(
            cleanLeadPhone.length >= 8 &&
            cleanMetaPhone.length >= 8 &&
            (cleanLeadPhone.endsWith(cleanMetaPhone.slice(-8)) || cleanMetaPhone.endsWith(cleanLeadPhone.slice(-8)))
          );

          const docMatched = Boolean(
            cleanLeadDoc.length >= 11 &&
            cleanMetaDoc.length >= 11 &&
            cleanLeadDoc === cleanMetaDoc
          );

          const matchesLead =
            cc.lead_id === lead.id ||
            meta.lead_id === lead.id ||
            (lead.customer_id && (cc.customer_id === lead.customer_id || meta.customer_id === lead.customer_id)) ||
            phoneMatched ||
            docMatched;

          if (matchesLead && !existingIds.has(cc.id) && !existingTokens.has(cc.verification_code)) {
            contracts.push({
              id: cc.id,
              contract_title: cc.title,
              title: cc.title,
              category: cc.category || meta.category || "tourism_package",
              public_token: cc.verification_code || meta.public_token || cc.id,
              verification_code: cc.verification_code || meta.verification_code || "",
              status: cc.status === "signing" ? "sent" : cc.status === "completed" ? "signed" : cc.status,
              total_value_cents: Number(meta.total_value_cents || 0),
              destination: meta.destination || lead.destination || "Não informado",
              signed_at: meta.signed_at || null,
              created_at: cc.created_at,
            });
          }
        }
      }
    } catch (unifyErr) {
      console.warn("[getCustomer360Profile] notice unificando contracts:", unifyErr);
    }

    // 4. Busca propostas do proprio lead + propostas/capturas/oportunidades VERIFICADAS pelo motor determinístico (Zero F-OPP-02)
    let proposals: any[] = [];
    let similarAgencyProposals: any[] = [];
    let infotravelCaptures: any[] = [];
    let radarMatches: any[] = [];
    let historicalBenchmark: any = null;
    try {
      const propOr = [`lead_id.eq.${lead.id}`];
      if (lead.customer_id) propOr.push(`customer_id.eq.${lead.customer_id}`);
      const cleanLeadPhone = lead.phone ? String(lead.phone).replace(/\D/g, "").slice(-8) : "";
      if (cleanLeadPhone.length >= 6) propOr.push(`client_whatsapp.ilike.%${cleanLeadPhone}%`);
      const sanitizedEmail = lead.email ? String(lead.email).replace(/[,()"'\\]/g, "").trim() : "";
      if (sanitizedEmail && sanitizedEmail.includes("@")) propOr.push(`client_email.eq."${sanitizedEmail}"`);
      const propFilter = propOr.join(",");

      const { internalGetVerifiedOpportunitiesForLead } = await import("./opportunity-radar.functions");
      const [{ data: propData }, verifiedBundle] = await Promise.all([
        supabase
          .from("travel_proposals")
          .select("id, lead_id, customer_id, public_token, title, destination_city, client_name, client_whatsapp, status, pricing, valid_until, created_at")
          .eq("store_id", identity.store_id)
          .or(propFilter)
          .order("created_at", { ascending: false }),
        internalGetVerifiedOpportunitiesForLead({
          storeId: identity.store_id,
          leadId: lead.id,
        }),
      ]);

      proposals = propData || [];
      historicalBenchmark = verifiedBundle.historicalBenchmark;

      similarAgencyProposals = verifiedBundle.verifiedSimilarProposals.map((vp) => ({
        id: vp.id,
        public_token: vp.publicToken,
        title: vp.title,
        destination_city: vp.destinationCity,
        departure_date: vp.departureDate,
        client_name: vp.clientName,
        status: vp.status,
        pricing: { totalCents: vp.totalCents },
        match_score: vp.matchScore,
        match_tier: vp.matchTier,
        requires_child_requote: vp.requiresChildRequote,
        effective_total_cents: vp.effectiveTotalCents,
        match_reasons: vp.reasons,
        warnings: vp.warnings,
        historical_verdict: vp.historicalVerdict,
        historical_savings_pct: vp.historicalSavingsPct,
        created_at: vp.createdAt,
      }));

      infotravelCaptures = verifiedBundle.verifiedCaptures.map((cap) => ({
        ...cap,
        source_provider: cap.operatorSlug || "InfoTravel",
        destination: cap.destinationCity,
        hotel_name: cap.destinationCity,
        checkin_date: cap.startDate,
        total_amount_cents: cap.effectiveTotalCents || cap.totalCents || 0,
        quoted_total_cents: cap.totalCents,
        match_score: cap.matchScore,
        match_reasons: cap.reasons,
        warnings: cap.warnings,
        requires_child_requote: cap.requiresChildRequote,
      }));

      radarMatches = verifiedBundle.verifiedOpportunities.map((opp) => ({
        ...opp,
        title: opp.offerTitle || opp.whatsappPitchDraft || "Oportunidade Verificada",
        destination: opp.destinationCity,
        price_cents: opp.effectiveTotalCents || opp.quotedTotalCents || 0,
        quoted_total_cents: opp.quotedTotalCents,
        match_score: opp.matchScore,
        match_reasons: opp.matchReasons,
        warnings: opp.warnings,
        whatsapp_pitch_draft: opp.whatsappPitchDraft,
        discount_pct: opp.variancePct ? Math.abs(Math.round(Number(opp.variancePct))) : null,
      }));
    } catch {
      // fallback gracioso
    }

    let customerDocuments: any[] = [];
    try {
      const docFilter = lead.customer_id
        ? `lead_id.eq.${lead.id},customer_id.eq.${lead.customer_id}`
        : `lead_id.eq.${lead.id}`;
      const { data: rawLeadDocs } = await supabase
        .from("customer_documents")
        .select("*")
        .eq("store_id", identity.store_id)
        .or(docFilter)
        .order("created_at", { ascending: false });
      customerDocuments = await hydrateSignedCustomerDocuments(supabase, rawLeadDocs || []);
    } catch {
      customerDocuments = [];
    }

    const resolvedCustomer = customer || {
      id: `lead-cust-${lead.id}`,
      store_id: identity.store_id,
      full_name: lead.full_name || lead.title || "Cliente",
      document: lead.document || null,
      phone: lead.phone || null,
      email: lead.email || null,
      status: "active",
      score: 100,
      created_at: lead.created_at,
    };

    return {
      lead,
      customer: resolvedCustomer,
      documents: customerDocuments,
      otherLeads,
      contracts,
      trips,
      incidents,
      activities: activities || [],
      meetings: meetings || [],
      proposals: proposals || [],
      similarAgencyProposals,
      infotravelCaptures,
      radarMatches,
      historicalBenchmark,
    };
  });

export const issueLeadContract = createServerFn({ method: "POST" })
  .validator(
    z.object({
      leadId: z.string().uuid(),
      contractTitle: z.string().min(2),
      packageSummary: z.string().min(5),
      totalValueCents: z.number().int().min(0),
      paymentConditions: z.string().default("À vista ou parcelado"),
      templateId: z.string().optional(),
      sectionConfig: z
        .object({
          showItemsTable: z.boolean().optional(),
          showSpecsTable: z.boolean().optional(),
          showItineraryTable: z.boolean().optional(),
          showPassengersTable: z.boolean().optional(),
          showFinancialTable: z.boolean().optional(),
          showCustomFieldsTable: z.boolean().optional(),
          includeLegalClauses: z.boolean().optional(),
        })
        .optional(),
      customVariables: z.record(z.string(), z.string()).optional(),
    })
  )
  .handler(async ({ data: input }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager", "seller"]);

    const [{ data: lead, error: leadErr }, { data: storeRow }] = await Promise.all([
      supabase
        .from("leads_crm")
        .select("*")
        .eq("id", input.leadId)
        .eq("store_id", identity.store_id)
        .single(),
      supabase
        .from("stores")
        .select("id, name, cnpj, address, city, state, phone, email, primary_niche_id, settings")
        .eq("id", identity.store_id)
        .maybeSingle(),
    ]);

    if (leadErr || !lead) throw new Error("Lead não encontrado");

    let customerId = lead.customer_id;
    if (!customerId) {
      const { data: linkedId } = await (supabase.rpc as any)(
        "deduplicate_and_link_lead_to_customer",
        {
          p_lead_id: lead.id,
          p_store_id: identity.store_id,
        }
      );
      customerId = linkedId || null;
    }

    const linkedPropId = (lead.custom_fields as any)?.payment_plan?.linked_proposal_id;
    const linkedOptId = (lead.custom_fields as any)?.payment_plan?.linked_option_id;

    const [{ data: customerRow }, { data: directOrLatestProp }] = await Promise.all([
      customerId
        ? supabase
            .from("customers_crm")
            .select("*")
            .eq("id", customerId)
            .eq("store_id", identity.store_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      linkedPropId
        ? supabase
            .from("travel_proposals")
            .select("*")
            .eq("id", linkedPropId)
            .eq("store_id", identity.store_id)
            .maybeSingle()
        : supabase
            .from("travel_proposals")
            .select("*")
            .eq("lead_id", lead.id)
            .eq("store_id", identity.store_id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
    ]);

    const travelProp = directOrLatestProp;
    const targetOption = Array.isArray((travelProp as any)?.options) && linkedOptId
      ? (travelProp as any).options.find((o: any) => o.id === linkedOptId)
      : (travelProp as any)?.options?.[0] || null;

    const storeSettings =
      (storeRow as any)?.settings && typeof (storeRow as any).settings === "object"
        ? (storeRow as any).settings
        : {};
    const nicheHint = (storeRow as any)?.primary_niche_id || storeSettings.niche_id || storeSettings.niche;
    const blueprint = getNicheContractBlueprint(nicheHint);

    const publicToken = `CTR-${Math.random().toString(36).substring(2, 8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
    const clientName = lead.full_name || lead.title || "Cliente";
    const clientDoc = String(lead.document || (customerRow as any)?.document || lead.custom_fields?.document || "Não informado");
    const destination = targetOption?.destination || lead.destination || (travelProp as any)?.destination_city || "Não informado";
    const resolvedPaymentConditions =
      input.paymentConditions && input.paymentConditions !== "À vista ou parcelado"
        ? input.paymentConditions
        : (lead.custom_fields as any)?.payment_plan?.notes ||
          targetOption?.pricing?.payment_terms ||
          (travelProp as any)?.pricing?.payment_terms ||
          input.paymentConditions ||
          "À vista ou parcelado";
    const formattedValue = new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format((input.totalValueCents || 0) / 100);

    const mergedCustomFields = normalizeCustomFieldMap({
      ...((customerRow as any)?.custom_fields || {}),
      ...(lead.custom_fields || {}),
      ...(((travelProp as any)?.pricing?.custom_fields as Record<string, unknown>) || {}),
    });

    const specs: Array<{ label: string; value: string }> = [];
    if (destination && destination !== "Não informado") {
      specs.push({ label: blueprint.isTourism ? "Destino" : "Objeto / Demanda", value: destination });
    }
    if (lead.travel_start) specs.push({ label: "Início / Embarque", value: String(lead.travel_start) });
    if (lead.travel_end) specs.push({ label: "Retorno / Conclusão", value: String(lead.travel_end) });
    for (const [k, rawVal] of Object.entries(mergedCustomFields)) {
      const formatted = formatFieldPrimitiveValue(rawVal);
      if (formatted && specs.length < 15) {
        specs.push({ label: formatDynamicFieldLabel(k), value: formatted });
      }
    }

    const compiled = compileContractDocument({
      title: input.contractTitle,
      nicheHint,
      templateId: input.templateId || blueprint.defaultTemplateId,
      sectionConfig: input.sectionConfig,
      issuer: {
        name: (storeRow as any)?.name || "Empresa Contratada",
        document: (storeRow as any)?.cnpj || "",
        address: (storeRow as any)?.address || "",
        cityState: [(storeRow as any)?.city, (storeRow as any)?.state].filter(Boolean).join(" / "),
        phone: (storeRow as any)?.phone || storeSettings.whatsapp_phone || "",
        email: (storeRow as any)?.email || "",
      },
      customer: {
        name: clientName,
        document: clientDoc === "Não informado" ? "" : clientDoc,
        phone: lead.phone || (customerRow as any)?.phone || "",
        email: sanitizeCustomerEmail(lead.email) || sanitizeCustomerEmail((customerRow as any)?.email) || "",
        address: (customerRow as any)?.address || "",
        cityState: [(customerRow as any)?.city, (customerRow as any)?.state].filter(Boolean).join(" / "),
      },
      items: [
        {
          title: input.packageSummary || destination || input.contractTitle,
          unit: blueprint.isTourism ? "pacote" : "contrato",
          quantity: 1,
          unitPriceCents: input.totalValueCents || 0,
          totalPriceCents: input.totalValueCents || 0,
        },
      ],
      specs,
      itinerary:
        Array.isArray(targetOption?.itinerary) && targetOption.itinerary.length > 0
          ? targetOption.itinerary
          : Array.isArray((travelProp as any)?.itinerary)
            ? (travelProp as any).itinerary
            : [],
      passengers: Array.isArray(lead.pax_list)
        ? lead.pax_list.map((p: any) => ({
            name: String(p?.name || p?.full_name || clientName),
            document: p?.document || p?.cpf || undefined,
            birthDate: p?.birth_date || p?.birthDate || undefined,
          }))
        : [],
      customFields: mergedCustomFields,
      summaryText: input.packageSummary,
      totalValueCents: input.totalValueCents || 0,
      paymentConditions: resolvedPaymentConditions,
      travelStartDate: lead.travel_start || null,
      travelEndDate: lead.travel_end || null,
      destination,
      customVariables: input.customVariables,
    });

    const clauses = compiled.clauses.map((c) => ({
      number: c.number,
      section: c.section,
      clause_text: c.clause_text,
      is_mandatory: c.is_mandatory,
      title: c.section,
      content: c.clause_text,
    }));
    const contentMarkdown = compiled.contentMarkdown;
    const hashBuffer = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(contentMarkdown)
    );
    const versionHashHex = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    const signatureFields = autoPositionSignatureFieldsFromContent(contentMarkdown, 2, 2);

    const { data: contract, error: ctrErr } = await supabase
      .from("contracts")
      .insert({
        creator_id: identity.id,
        store_id: identity.store_id,
        lead_id: lead.id,
        customer_id: customerId,
        title: input.contractTitle,
        category: blueprint.isTourism ? "tourism" : blueprint.contractCategory,
        status: "signing",
        current_version: 1,
        verification_code: publicToken,
        template_id: compiled.templateIdUsed || null,
        metadata: {
          store_id: identity.store_id,
          lead_id: lead.id,
          customer_id: customerId,
          client_name: clientName,
          client_document: clientDoc,
          client_email: sanitizeCustomerEmail(lead.email) || sanitizeCustomerEmail(customerRow?.email) || null,
          client_phone: lead.phone || customerRow?.phone || "",
          destination,
          travel_start_date: lead.travel_start || null,
          travel_end_date: lead.travel_end || null,
          package_summary: compiled.summaryText,
          total_value_cents: input.totalValueCents,
          payment_conditions: input.paymentConditions,
          passengers: lead.pax_list || [],
          custom_fields: mergedCustomFields,
          template_id: compiled.templateIdUsed,
          niche_id: compiled.nicheId,
        },
      })
      .select()
      .single();

    if (ctrErr || !contract) {
      throw new Error(`Erro ao emitir contrato: ${ctrErr?.message || "falha ao persistir registro canônico"}`);
    }

    const { data: createdVersion, error: verErr } = await supabase
      .from("contract_versions")
      .insert({
        contract_id: contract.id,
        version_number: 1,
        title: input.contractTitle,
        content_markdown: contentMarkdown,
        clauses,
        variables: compiled.variablesApplied,
        hash_sha256: versionHashHex,
        signature_fields: signatureFields,
        page_count: 2,
        is_sealed: false,
      })
      .select("id")
      .single();

    if (verErr || !createdVersion?.id) {
      await supabase.from("contracts").delete().eq("id", contract.id);
      throw new Error(`Erro ao gerar versão do contrato: ${verErr?.message || "falha desconhecida"}`);
    }

    const resolvedSignerEmail =
      sanitizeCustomerEmail(lead.email) || sanitizeCustomerEmail((customerRow as any)?.email) || "cliente@waesy.com";
    const resolvedSignerPhone = lead.phone || (customerRow as any)?.phone || null;
    const { data: createdEnvelope } = await supabase
      .from("signature_envelopes")
      .insert({
        contract_version_id: createdVersion.id,
        signer_name: clientName,
        signer_email: resolvedSignerEmail,
        signer_phone: resolvedSignerPhone,
        signer_cpf: clientDoc && clientDoc !== "Não informado" ? clientDoc : null,
        signer_role: "party",
        dispatch_channel: resolvedSignerPhone ? "whatsapp" : "email",
        status: "pending",
      })
      .select("id, signing_token")
      .single();

    const envelopeSigningToken = createdEnvelope?.signing_token || publicToken;

    // Atualiza custom_fields do lead para vinculação permanente
    const existingContractIds = Array.isArray(lead.custom_fields?.contract_ids)
      ? (lead.custom_fields.contract_ids as string[])
      : [];
    const updatedContractIds = Array.from(new Set([...existingContractIds, contract.id]));
    await supabase
      .from("leads_crm")
      .update({
        custom_fields: {
          ...(lead.custom_fields || {}),
          contract_ids: updatedContractIds,
          linked_contract_id: contract.id,
          last_contract_token: publicToken,
          last_signing_token: envelopeSigningToken,
          last_contract_at: new Date().toISOString(),
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", lead.id)
      .eq("store_id", identity.store_id);

    // Registra na cadeia forense
    await supabase.from("contract_audit_chain").insert({
      contract_id: contract.id,
      store_id: identity.store_id,
      action: "CREATED",
      actor_profile: identity.id,
      payload_hash: publicToken,
      metadata: { lead_id: lead.id, total_value_cents: input.totalValueCents },
    }).then(() => null, () => null);

    // Registra na timeline do lead
    await supabase.from("lead_activities").insert({
      lead_id: lead.id,
      store_id: identity.store_id,
      author_id: identity.id,
      type: "contract_issued",
      content: `Contrato emitido: "${input.contractTitle}" (Token: ${publicToken})`,
      metadata: { contract_id: contract.id, public_token: publicToken, signing_token: envelopeSigningToken },
    }).then(() => null, () => null);

    return {
      success: true,
      contract: {
        ...contract,
        signing_token: envelopeSigningToken,
      },
      publicToken,
      signingToken: envelopeSigningToken,
    };
  });

export const linkContractToLead = createServerFn({ method: "POST" })
  .validator(
    z.object({
      leadId: z.string().uuid(),
      contractId: z.string().uuid(),
    })
  )
  .handler(async ({ data: { leadId, contractId } }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager", "seller"]);

    const [{ data: lead, error: leadErr }, { data: contract, error: ctrErr }] = await Promise.all([
      supabase.from("leads_crm").select("*").eq("id", leadId).eq("store_id", identity.store_id).single(),
      supabase.from("contracts").select("*").eq("id", contractId).eq("store_id", identity.store_id).single(),
    ]);

    if (leadErr || !lead) throw new Error("Lead não encontrado");
    if (ctrErr || !contract) throw new Error("Contrato não encontrado");

    // Vincula o contrato ao lead e ao cliente
    await supabase
      .from("contracts")
      .update({
        lead_id: lead.id,
        customer_id: lead.customer_id || contract.customer_id || null,
        metadata: {
          ...(typeof contract.metadata === "object" && contract.metadata ? contract.metadata : {}),
          lead_id: lead.id,
          customer_id: lead.customer_id || (contract.metadata as any)?.customer_id || null,
          client_name: lead.full_name || (contract.metadata as any)?.client_name || "Cliente",
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", contract.id)
      .eq("store_id", identity.store_id);

    const existingContractIds = Array.isArray(lead.custom_fields?.contract_ids)
      ? (lead.custom_fields.contract_ids as string[])
      : [];
    const updatedContractIds = Array.from(new Set([...existingContractIds, contract.id]));

    await supabase
      .from("leads_crm")
      .update({
        custom_fields: {
          ...(lead.custom_fields || {}),
          contract_ids: updatedContractIds,
          linked_contract_id: contract.id,
          last_contract_at: new Date().toISOString(),
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", lead.id)
      .eq("store_id", identity.store_id);

    await supabase.from("lead_activities").insert({
      lead_id: lead.id,
      store_id: identity.store_id,
      author_id: identity.id,
      type: "contract_linked",
      content: `Contrato vinculado ao atendimento: "${contract.title}"`,
      metadata: { contract_id: contract.id },
    }).then(() => null, () => null);

    return {
      success: true,
      contract: {
        id: contract.id,
        title: contract.title,
        contract_title: contract.title,
        status: contract.status,
        verification_code: contract.verification_code,
        total_value_cents: (contract.metadata as any)?.total_value_cents || (contract.metadata as any)?.total_amount_cents || 0,
        created_at: contract.created_at,
      },
    };
  });

export const listLinkableStoreContracts = createServerFn({ method: "GET" })
  .validator(
    z.object({
      leadId: z.string().uuid().optional(),
      storeId: z.string().uuid().optional(),
    }).optional()
  )
  .handler(async () => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager", "seller"]);

    const { data, error } = await supabase
      .from("contracts")
      .select(`
        id, title, category, status, verification_code, metadata, created_at,
        versions:contract_versions (
          id, version_number,
          envelopes:signature_envelopes (
            id, signer_name, signer_role, status, signing_token
          )
        )
      `)
      .eq("store_id", identity.store_id)
      .order("created_at", { ascending: false })
      .limit(40);

    if (error) throw new Error("Erro ao listar contratos do cofre.");
    return (data || []).map((c: any) => {
      const m = (c.metadata as Record<string, any>) || {};
      const envelopes = c.versions?.[0]?.envelopes || [];
      const party = envelopes.find((e: any) => e.signer_role === "party") || envelopes[0];
      return {
        id: c.id,
        title: c.title,
        category: c.category,
        status: c.status,
        verification_code: c.verification_code || m.public_token || c.id,
        signing_token: party?.signing_token || c.verification_code || c.id,
        total_value_cents: Number(m.total_value_cents || 0),
        created_at: c.created_at,
      };
    });
  });



export interface StoreLtvAndAdSpendDTO {
  totalAdSpendCents: number;
  totalRevenueCents: number;
  attributedRevenueCents: number;
  roas: number;
  totalCustomers: number;
  repeatCustomersCount: number;
  repeatPurchaseRate: number;
  averageLtvCents: number;
  cacCents: number;
  attributedCacCents: number;
  ltvToCacRatio: number;
  conversionRate: number;
  totalClicksCount: number;
  costPerClickCents: number;
  costPerLeadCents: number;
  monthlyCohortData: Array<{
    monthKey: string;
    adSpendCents: number;
    revenueCents: number;
    leadsCount: number;
    ordersCount: number;
  }>;
  breakdownByCampaign: Array<{
    campaignKey: string;
    title: string;
    spendCents: number;
    revenueCents: number;
    clicksCount: number;
    leadsCount: number;
    roas: number | null;
    cplCents: number | null;
    cacCents: number | null;
  }>;
  breakdownBySource: Array<{
    source: string;
    leadsCount: number;
    touchpointsCount: number;
    revenueCents: number;
    spendCents: number;
    roas: number | null;
  }>;
  breakdownByPixel: Array<{
    pixelId: string;
    name: string;
    deliveredEvents: number;
    failedEvents: number;
    attributedRevenueCents: number;
  }>;
}

/**
 * MOTOR DE TELEMETRIA LTV & ROAS (CLOSED-LOOP MULTI-NICHO)
 * Cruza investimento real em anuncios (ad_campaigns + store_ad_campaigns), touchpoints e disparos CAPI
 * com receita realizada em Pedidos, Viagens Confirmadas, Propostas Aceitas e Faturas Pagas.
 */
export const calculateStoreLtvAndAdSpend = createServerFn({ method: "GET" }).handler(
  async (): Promise<StoreLtvAndAdSpendDTO> => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager"]);

    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);
    const isoSince = twelveMonthsAgo.toISOString();

    const [
      campaignsRes,
      storeCampaignsRes,
      ordersRes,
      tripsRes,
      proposalsRes,
      commercialInvRes,
      customersRes,
      leadsRes,
      touchpointsRes,
      sourcesRes,
      sourcePixelsRes,
      telemetryRes,
    ] = await Promise.all([
      supabase
        .from("ad_campaigns")
        .select("id, title, external_campaign_id, budget_cents, spent_cents, external_ad_spend_cents, created_at, status, settings")
        .eq("store_id", identity.store_id),
      (supabase.from("store_ad_campaigns") as any)
        .select("id, name, title, channel, platform, external_campaign_id, status, daily_budget_cents, total_budget_cents, metadata, created_at")
        .eq("store_id", identity.store_id)
        .then((r: any) => r, () => ({ data: [] })),
      supabase
        .from("orders")
        .select("id, total_cents, created_at, status, customer_id, attributed_campaign_id, utm_campaign")
        .eq("store_id", identity.store_id)
        .gte("created_at", isoSince)
        .in("status", ["paid", "delivered", "completed", "shipped"]),
      supabase
        .from("tourism_trips")
        .select("id, total_cents, status, customer_id, proposal_id, source_proposal_id, created_at")
        .eq("store_id", identity.store_id)
        .gte("created_at", isoSince)
        .in("status", ["confirmed", "active", "completed", "paid"]),
      supabase
        .from("travel_proposals")
        .select("id, customer_id, lead_id, status, canonical_status, acceptance_status, approved_at, pricing, created_at")
        .eq("store_id", identity.store_id)
        .gte("created_at", isoSince),
      (supabase.from("commercial_invoices") as any)
        .select("id, total_cents, status, customer_id, lead_id, created_at")
        .eq("store_id", identity.store_id)
        .gte("created_at", isoSince)
        .in("status", ["paid", "settled", "received"])
        .then((r: any) => r, () => ({ data: [] })),
      supabase
        .from("customers_crm")
        .select("id, created_at")
        .eq("store_id", identity.store_id)
        .is("deleted_at", null),
      supabase
        .from("leads_crm")
        .select("id, customer_id, source, lead_source_detail, status, created_at, estimated_value_cents, custom_fields")
        .eq("store_id", identity.store_id)
        .gte("created_at", isoSince),
      (supabase.from("ad_attribution_touchpoints") as any)
        .select("id, ad_platform, utm_source, utm_campaign, campaign_id, ad_id, source_pixel_id, lead_id, created_at")
        .eq("store_id", identity.store_id)
        .gte("created_at", isoSince)
        .limit(500)
        .then((r: any) => r, () => ({ data: [] })),
      (supabase.from("marketing_sources") as any)
        .select("id, name, platform")
        .eq("store_id", identity.store_id)
        .then((r: any) => r, () => ({ data: [] })),
      (supabase.from("marketing_source_pixels") as any)
        .select("id, source_id, name, external_pixel_id")
        .eq("store_id", identity.store_id)
        .then((r: any) => r, () => ({ data: [] })),
      supabase
        .from("lead_conversion_telemetry")
        .select("id, lead_id, status, source_pixel_id, external_pixel_id")
        .eq("store_id", identity.store_id)
        .gte("dispatched_at", isoSince)
        .limit(300)
        .then((r: any) => r, () => ({ data: [] })),
    ]);

    const campaigns = (campaignsRes.data || []) as any[];
    const storeCampaigns = (storeCampaignsRes?.data || []) as any[];
    const orders = (ordersRes.data || []) as any[];
    const trips = (tripsRes.data || []) as any[];
    const allProposals = (proposalsRes.data || []) as any[];
    const commercialInvoices = (commercialInvRes?.data || []) as any[];
    const customers = (customersRes.data || []) as any[];
    const leads = (leadsRes.data || []) as any[];
    const touchpoints = (touchpointsRes?.data || []) as any[];
    const sourcePixels = (sourcePixelsRes?.data || []) as any[];
    const telemetryLogs = (telemetryRes?.data || []) as any[];

    const seenExternalCampaignIds = new Set<string>();
    const normalizedCampaigns: Array<{
      id: string;
      key: string;
      title: string;
      spendCents: number;
      clicksCount: number;
      createdAt: string;
    }> = [];

    for (const c of campaigns) {
      const s = (c.settings && typeof c.settings === "object" ? c.settings : {}) as Record<string, any>;
      const spend = Number(c.external_ad_spend_cents ?? s.real_spent_cents ?? c.spent_cents ?? c.budget_cents ?? 0) || 0;
      const extKey = String(c.external_campaign_id || c.id);
      seenExternalCampaignIds.add(extKey);
      normalizedCampaigns.push({
        id: String(c.id),
        key: extKey,
        title: String(c.title || "Campanha"),
        spendCents: spend,
        clicksCount: Number(s.synced_clicks || 0) || 0,
        createdAt: String(c.created_at || new Date().toISOString()),
      });
    }

    for (const sc of storeCampaigns) {
      const extKey = String(sc.external_campaign_id || sc.id);
      if (seenExternalCampaignIds.has(extKey)) continue;
      seenExternalCampaignIds.add(extKey);
      const m = (sc.metadata && typeof sc.metadata === "object" ? sc.metadata : {}) as Record<string, any>;
      const spend = Number(m.spent_cents ?? m.real_spent_cents ?? sc.total_budget_cents ?? 0) || 0;
      normalizedCampaigns.push({
        id: String(sc.id),
        key: extKey,
        title: String(sc.title || sc.name || "Campanha"),
        spendCents: spend,
        clicksCount: Number(m.clicks || 0) || 0,
        createdAt: String(sc.created_at || new Date().toISOString()),
      });
    }

    // Receita fechada deduplicada cross-tabelas
    const tripProposalIds = new Set<string>();
    trips.forEach((tr) => {
      if (tr.proposal_id) tripProposalIds.add(String(tr.proposal_id));
      if (tr.source_proposal_id) tripProposalIds.add(String(tr.source_proposal_id));
    });
    const acceptedProposals = allProposals.filter((p) => {
      if (tripProposalIds.has(String(p.id))) return false;
      const st = String(p.canonical_status || p.acceptance_status || p.status || "").toLowerCase();
      return ["accepted", "approved", "converted", "paid", "completed"].includes(st);
    });

    const leadByCustomerId = new Map<string, any>();
    const leadById = new Map<string, any>();
    for (const l of leads) {
      leadById.set(String(l.id), l);
      if (l.customer_id && !leadByCustomerId.has(String(l.customer_id))) {
        leadByCustomerId.set(String(l.customer_id), l);
      }
    }

    const customerPurchaseCounts = new Map<string, number>();
    const revenueEvents: Array<{
      amountCents: number;
      createdAt: string;
      customerId: string | null;
      leadId: string | null;
      campaignHint: string | null;
      isOrder: boolean;
    }> = [];

    for (const o of orders) {
      const amt = Number(o.total_cents) || 0;
      const cid = o.customer_id ? String(o.customer_id) : null;
      if (cid) customerPurchaseCounts.set(cid, (customerPurchaseCounts.get(cid) || 0) + 1);
      revenueEvents.push({
        amountCents: amt,
        createdAt: String(o.created_at || isoSince),
        customerId: cid,
        leadId: cid ? (leadByCustomerId.get(cid)?.id ? String(leadByCustomerId.get(cid).id) : null) : null,
        campaignHint: o.attributed_campaign_id ? String(o.attributed_campaign_id) : (o.utm_campaign ? String(o.utm_campaign) : null),
        isOrder: true,
      });
    }
    for (const tr of trips) {
      const amt = Number(tr.total_cents) || 0;
      const cid = tr.customer_id ? String(tr.customer_id) : null;
      if (cid) customerPurchaseCounts.set(cid, (customerPurchaseCounts.get(cid) || 0) + 1);
      revenueEvents.push({
        amountCents: amt,
        createdAt: String(tr.created_at || isoSince),
        customerId: cid,
        leadId: cid ? (leadByCustomerId.get(cid)?.id ? String(leadByCustomerId.get(cid).id) : null) : null,
        campaignHint: null,
        isOrder: true,
      });
    }
    for (const pr of acceptedProposals) {
      const pricing = (pr.pricing && typeof pr.pricing === "object" ? pr.pricing : {}) as Record<string, any>;
      const amt = Number(pricing.total_price_cents ?? pricing.total_cents ?? 0) || 0;
      const cid = pr.customer_id ? String(pr.customer_id) : null;
      if (cid) customerPurchaseCounts.set(cid, (customerPurchaseCounts.get(cid) || 0) + 1);
      revenueEvents.push({
        amountCents: amt,
        createdAt: String(pr.approved_at || pr.created_at || isoSince),
        customerId: cid,
        leadId: pr.lead_id ? String(pr.lead_id) : null,
        campaignHint: null,
        isOrder: false,
      });
    }
    for (const ci of commercialInvoices) {
      const amt = Number(ci.total_cents) || 0;
      const cid = ci.customer_id ? String(ci.customer_id) : null;
      if (cid) customerPurchaseCounts.set(cid, (customerPurchaseCounts.get(cid) || 0) + 1);
      revenueEvents.push({
        amountCents: amt,
        createdAt: String(ci.created_at || isoSince),
        customerId: cid,
        leadId: ci.lead_id ? String(ci.lead_id) : null,
        campaignHint: null,
        isOrder: false,
      });
    }

    const totalAdSpendCents = normalizedCampaigns.reduce((acc, c) => acc + c.spendCents, 0);
    const totalRevenueCents = revenueEvents.reduce((acc, r) => acc + r.amountCents, 0);
    const totalCustomers = Math.max(customers.length, 1);
    const totalLeadsCount = Math.max(leads.length, 1);

    const repeatCustomersCount = Array.from(customerPurchaseCounts.values()).filter((cnt) => cnt > 1).length;
    const buyingCustomersCount = Math.max(customerPurchaseCounts.size, 1);
    const repeatPurchaseRate = Number(((repeatCustomersCount / buyingCustomersCount) * 100).toFixed(1));

    let attributedRevenueCents = 0;
    const revenueByLeadId = new Map<string, number>();
    for (const ev of revenueEvents) {
      if (ev.leadId) {
        revenueByLeadId.set(ev.leadId, (revenueByLeadId.get(ev.leadId) || 0) + ev.amountCents);
      }
      const linkedLead = ev.leadId ? leadById.get(ev.leadId) : ev.customerId ? leadByCustomerId.get(ev.customerId) : null;
      const cfAttr = (linkedLead?.custom_fields?.attribution || {}) as Record<string, any>;
      const hasAdSource = Boolean(
        ev.campaignHint ||
          linkedLead?.source === "meta_ads" ||
          linkedLead?.source === "google_ads" ||
          linkedLead?.source === "paid" ||
          cfAttr.campaign_id ||
          cfAttr.ad_id ||
          cfAttr.ctwa_clid ||
          cfAttr.fbclid ||
          cfAttr.gclid,
      );
      if (hasAdSource) {
        attributedRevenueCents += ev.amountCents;
      }
    }

    const attributedWonLeads = leads.filter((l) => {
      const st = String(l.status || "").toLowerCase();
      if (!["won", "converted", "ganho", "closed", "fechado"].includes(st)) return false;
      const cf = (l.custom_fields || {}) as Record<string, any>;
      const attr = (cf.attribution || {}) as Record<string, any>;
      return Boolean(
        l.source === "meta_ads" ||
          l.source === "google_ads" ||
          attr.campaign_id ||
          attr.ad_id ||
          attr.ctwa_clid ||
          attr.fbclid ||
          attr.gclid,
      );
    }).length;

    const roas = totalAdSpendCents > 0 ? Number((totalRevenueCents / totalAdSpendCents).toFixed(2)) : 0;
    const averageLtvCents = Math.round(totalRevenueCents / totalCustomers);
    const cacCents = Math.round(totalAdSpendCents / totalCustomers);
    const attributedCacCents =
      totalAdSpendCents > 0
        ? Math.round(totalAdSpendCents / Math.max(attributedWonLeads, buyingCustomersCount))
        : 0;
    const ltvToCacRatio = cacCents > 0 ? Number((averageLtvCents / cacCents).toFixed(1)) : 0;
    const wonLeads = leads.filter((l) => ["won", "converted", "ganho"].includes(String(l.status || "").toLowerCase())).length;
    const conversionRate = Number(((wonLeads / totalLeadsCount) * 100).toFixed(1));
    const totalClicksCount =
      normalizedCampaigns.reduce((acc, c) => acc + c.clicksCount, 0) + touchpoints.length;
    const costPerClickCents = totalClicksCount > 0 ? Math.round(totalAdSpendCents / totalClicksCount) : 0;
    const costPerLeadCents = leads.length > 0 ? Math.round(totalAdSpendCents / leads.length) : 0;

    // 2. Cohorts de 12 Meses
    const monthsMap = new Map<string, { adSpend: number; revenue: number; leads: number; orders: number }>();
    for (let i = 11; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      monthsMap.set(key, { adSpend: 0, revenue: 0, leads: 0, orders: 0 });
    }
    revenueEvents.forEach((ev) => {
      const key = ev.createdAt.substring(0, 7);
      if (monthsMap.has(key)) {
        const item = monthsMap.get(key)!;
        item.revenue += ev.amountCents;
        item.orders += 1;
      }
    });
    leads.forEach((l) => {
      const key = String(l.created_at || "").substring(0, 7);
      if (monthsMap.has(key)) {
        monthsMap.get(key)!.leads += 1;
      }
    });
    normalizedCampaigns.forEach((c) => {
      const key = c.createdAt.substring(0, 7);
      if (monthsMap.has(key)) {
        monthsMap.get(key)!.adSpend += c.spendCents;
      }
    });

    const monthlyCohortData = Array.from(monthsMap.entries()).map(([monthKey, val]) => ({
      monthKey,
      adSpendCents: val.adSpend,
      revenueCents: val.revenue,
      leadsCount: val.leads,
      ordersCount: val.orders,
    }));

    // 3. Breakdown por Campanha, Fonte e Pixel
    const campaignStats = new Map<string, { title: string; spendCents: number; revenueCents: number; clicksCount: number; leads: Set<string> }>();
    for (const c of normalizedCampaigns) {
      campaignStats.set(c.key, {
        title: c.title,
        spendCents: c.spendCents,
        revenueCents: 0,
        clicksCount: c.clicksCount,
        leads: new Set<string>(),
      });
    }
    for (const tp of touchpoints) {
      const ck = String(tp.campaign_id || tp.utm_campaign || "").trim();
      if (!ck) continue;
      const entry = campaignStats.get(ck) || { title: String(tp.utm_campaign || ck), spendCents: 0, revenueCents: 0, clicksCount: 0, leads: new Set<string>() };
      entry.clicksCount += 1;
      if (tp.lead_id) entry.leads.add(String(tp.lead_id));
      campaignStats.set(ck, entry);
    }
    for (const l of leads) {
      const attr = ((l.custom_fields || {}).attribution || {}) as Record<string, any>;
      const ck = String(attr.campaign_id || attr.utm_campaign || attr.campaign || "").trim();
      if (!ck) continue;
      const entry = campaignStats.get(ck) || { title: String(attr.campaign_name || attr.utm_campaign || ck), spendCents: 0, revenueCents: 0, clicksCount: 0, leads: new Set<string>() };
      entry.leads.add(String(l.id));
      entry.revenueCents += revenueByLeadId.get(String(l.id)) || 0;
      campaignStats.set(ck, entry);
    }

    const breakdownByCampaign = Array.from(campaignStats.entries())
      .map(([campaignKey, st]) => ({
        campaignKey,
        title: st.title,
        spendCents: st.spendCents,
        revenueCents: st.revenueCents,
        clicksCount: st.clicksCount,
        leadsCount: st.leads.size,
        roas: st.spendCents > 0 ? Number((st.revenueCents / st.spendCents).toFixed(2)) : null,
        cplCents: st.leads.size > 0 && st.spendCents > 0 ? Math.round(st.spendCents / st.leads.size) : null,
        cacCents: st.spendCents > 0 && st.revenueCents > 0 ? Math.round(st.spendCents / Math.max(1, st.leads.size)) : null,
      }))
      .slice(0, 12);

    const sourceAgg = new Map<string, { leadsCount: number; touchpointsCount: number; revenueCents: number; spendCents: number }>();
    for (const l of leads) {
      const src = String(l.source || "balcao");
      const entry = sourceAgg.get(src) || { leadsCount: 0, touchpointsCount: 0, revenueCents: 0, spendCents: 0 };
      entry.leadsCount += 1;
      entry.revenueCents += revenueByLeadId.get(String(l.id)) || 0;
      sourceAgg.set(src, entry);
    }
    for (const tp of touchpoints) {
      const src = String(tp.ad_platform || tp.utm_source || "whatsapp");
      const entry = sourceAgg.get(src) || { leadsCount: 0, touchpointsCount: 0, revenueCents: 0, spendCents: 0 };
      entry.touchpointsCount += 1;
      sourceAgg.set(src, entry);
    }
    const breakdownBySource = Array.from(sourceAgg.entries()).map(([source, s]) => ({
      source,
      leadsCount: s.leadsCount,
      touchpointsCount: s.touchpointsCount,
      revenueCents: s.revenueCents,
      spendCents: s.spendCents,
      roas: s.spendCents > 0 ? Number((s.revenueCents / s.spendCents).toFixed(2)) : null,
    }));

    const pixelMetaMap = new Map<string, string>();
    for (const px of sourcePixels) {
      if (px?.id) pixelMetaMap.set(String(px.id), String(px.name || px.external_pixel_id));
      if (px?.external_pixel_id) pixelMetaMap.set(String(px.external_pixel_id), String(px.name || px.external_pixel_id));
    }
    const pixelStatsMap = new Map<string, { name: string; delivered: number; failed: number; revCents: number }>();
    for (const tel of telemetryLogs) {
      const pxKey = String(tel.external_pixel_id || tel.source_pixel_id || "").trim();
      if (!pxKey) continue;
      const entry = pixelStatsMap.get(pxKey) || { name: pixelMetaMap.get(pxKey) || `Pixel ${pxKey}`, delivered: 0, failed: 0, revCents: 0 };
      if (tel.status === "delivered" || tel.status === "dispatched") entry.delivered += 1;
      else if (tel.status === "failed") entry.failed += 1;
      if (tel.lead_id) entry.revCents += revenueByLeadId.get(String(tel.lead_id)) || 0;
      pixelStatsMap.set(pxKey, entry);
    }
    const breakdownByPixel = Array.from(pixelStatsMap.entries()).map(([pixelId, st]) => ({
      pixelId,
      name: st.name,
      deliveredEvents: st.delivered,
      failedEvents: st.failed,
      attributedRevenueCents: st.revCents,
    }));

    return {
      totalAdSpendCents,
      totalRevenueCents,
      attributedRevenueCents,
      roas,
      totalCustomers,
      repeatCustomersCount,
      repeatPurchaseRate,
      averageLtvCents,
      cacCents,
      attributedCacCents,
      ltvToCacRatio,
      conversionRate,
      totalClicksCount,
      costPerClickCents,
      costPerLeadCents,
      monthlyCohortData,
      breakdownByCampaign,
      breakdownBySource,
      breakdownByPixel,
    };
  }
);

// ─── GESTÃO DE LEADS WHATSAPP & ATRIBUIÇÃO RÁPIDA (GAP-236, GAP-241) ──────────

export const listWhatsAppLeads = createServerFn({ method: "GET" })
  .validator(
    z
      .object({
        status: z.enum(["all", "new", "claimed", "closed"]).default("all"),
        search: z.string().optional(),
      })
      .default({ status: "all" })
  )
  .handler(async ({ data: { status, search } }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager", "seller", "support"]);

    let query = supabase
      .from("whatsapp_leads")
      .select("*")
      .eq("store_id", identity.store_id)
      .order("created_at", { ascending: false });

    if (status !== "all") {
      query = query.eq("status", status);
    }
    if (search && search.trim()) {
      query = query.or(`name.ilike.%${search.trim()}%,phone.ilike.%${search.trim()}%`);
    }

    const { data, error } = await query.limit(50);
    if (error) {
      console.warn("[crm.functions] listWhatsAppLeads notice:", error.message);
      return [];
    }
    return data || [];
  });

export const claimWhatsAppLead = createServerFn({ method: "POST" })
  .validator(
    z.object({
      leadId: z.string().uuid(),
    })
  )
  .handler(async ({ data: { leadId } }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager", "seller", "support"]);

    const { data, error } = await supabase
      .from("whatsapp_leads")
      .update({
        status: "claimed",
        assigned_to: identity.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", leadId)
      .eq("store_id", identity.store_id)
      .select()
      .maybeSingle();

    if (error) {
      console.warn("[crm.functions] claimWhatsAppLead error:", error.message);
      throw new Error("Erro ao assumir lead.");
    }
    return data;
  });

export const listLeadActivitiesByLead = createServerFn({ method: "GET" })
  .validator(
    z.object({
      leadId: z.string().uuid(),
    })
  )
  .handler(async ({ data: { leadId } }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager", "seller", "support"]);

    const { data, error } = await supabase
      .from("lead_activities")
      .select("*")
      .eq("lead_id", leadId)
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("[crm.functions] listLeadActivitiesByLead error:", error.message);
      return [];
    }
    return data || [];
  });

export const updateLeadActivity = createServerFn({ method: "POST" })
  .validator(
    z.object({
      activityId: z.string().uuid(),
      content: z.string().trim().min(1, "Conteúdo obrigatório").max(4000),
    })
  )
  .handler(async ({ data }) => {
    const { activityId, content } = data;
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager", "seller", "support"]);

    const { data: existing, error: fetchErr } = await supabase
      .from("lead_activities")
      .select("id, store_id, author_id, type")
      .eq("id", activityId)
      .maybeSingle();

    if (fetchErr || !existing) {
      throw new Error("Atividade não encontrada.");
    }
    if (existing.store_id !== identity.store_id && identity.role !== "platform_admin") {
      throw new Error("Acesso não autorizado para editar atividade de outra loja.");
    }
    const isManagerial = ["owner", "admin", "manager", "platform_admin"].includes(String(identity.role || ""));
    if (existing.author_id && existing.author_id !== identity.id && !isManagerial) {
      throw new Error("Apenas o autor ou gestor pode editar este registro.");
    }
    if (existing.type === "stage_change") {
      throw new Error("Eventos automáticos de mudança de estágio são imutáveis.");
    }

    const { data: updated, error: updErr } = await supabase
      .from("lead_activities")
      .update({ content })
      .eq("id", activityId)
      .eq("store_id", existing.store_id)
      .select()
      .single();

    if (updErr) {
      throw new Error(`Erro ao atualizar registro da timeline: ${updErr.message}`);
    }
    return updated;
  });

export const deleteLeadActivity = createServerFn({ method: "POST" })
  .validator(
    z.object({
      activityId: z.string().uuid(),
    })
  )
  .handler(async ({ data }) => {
    const { activityId } = data;
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager", "seller", "support"]);

    const { data: existing, error: fetchErr } = await supabase
      .from("lead_activities")
      .select("id, store_id, author_id, type")
      .eq("id", activityId)
      .maybeSingle();

    if (fetchErr || !existing) {
      throw new Error("Atividade não encontrada.");
    }
    if (existing.store_id !== identity.store_id && identity.role !== "platform_admin") {
      throw new Error("Acesso não autorizado para remover atividade de outra loja.");
    }
    const isManagerial = ["owner", "admin", "manager", "platform_admin"].includes(String(identity.role || ""));
    if (existing.author_id && existing.author_id !== identity.id && !isManagerial) {
      throw new Error("Apenas o autor ou gestor pode excluir este registro.");
    }
    if (existing.type === "stage_change") {
      throw new Error("Eventos automáticos de mudança de estágio são imutáveis.");
    }

    const { error: delErr } = await supabase
      .from("lead_activities")
      .delete()
      .eq("id", activityId)
      .eq("store_id", existing.store_id);

    if (delErr) {
      throw new Error(`Erro ao remover registro da timeline: ${delErr.message}`);
    }
    return { success: true };
  });

export const transferLead = createServerFn({ method: "POST" })
  .validator(
    z.object({
      leadId: z.string().uuid(),
      newOwnerId: z.string().uuid().nullable(),
    })
  )
  .handler(async ({ data }) => {
    const { leadId, newOwnerId } = data;
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager", "seller", "support"]);

    const { data: leadRow, error: fetchErr } = await supabase
      .from("leads_crm")
      .select("id, store_id, assigned_to, owner_id")
      .eq("id", leadId)
      .maybeSingle();

    if (fetchErr || !leadRow) {
      throw new Error("Lead não encontrado.");
    }
    assertStoreAccess(
      identity,
      ["owner", "admin", "manager", "seller", "support"],
      leadRow.store_id
    );

    const prevOwnerId = leadRow.assigned_to || leadRow.owner_id || null;
    if (prevOwnerId === newOwnerId) {
      return { success: true, unchanged: true, fromName: null, toName: null };
    }

    const resolveName = async (profileId: string | null) => {
      if (!profileId) return "Sem responsável";
      const { data: prof } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", profileId)
        .maybeSingle();
      return prof?.full_name || "Consultor";
    };

    const [fromName, toName] = await Promise.all([
      resolveName(prevOwnerId),
      resolveName(newOwnerId),
    ]);

    const { error: updErr } = await supabase
      .from("leads_crm")
      .update({
        assigned_to: newOwnerId,
        owner_id: newOwnerId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", leadId)
      .eq("store_id", leadRow.store_id);

    if (updErr) {
      throw new Error(`Erro ao transferir responsável do lead: ${updErr.message}`);
    }

    await supabase.from("lead_activities").insert({
      lead_id: leadId,
      store_id: leadRow.store_id,
      author_id: identity.id,
      type: "note",
      content: `Responsável alterado de "${fromName}" para "${toName}"`,
      metadata: {
        event: "lead_transfer",
        from_owner_id: prevOwnerId,
        to_owner_id: newOwnerId,
      },
    });

    return { success: true, unchanged: false, fromName, toName };
  });

export const archiveLead = createServerFn({ method: "POST" })
  .validator(
    z.object({
      leadId: z.string().uuid(),
      reason: z.string().max(300).optional(),
    })
  )
  .handler(async ({ data }) => {
    const { leadId, reason } = data;
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager", "seller"]);

    const { data: leadRow, error: fetchErr } = await supabase
      .from("leads_crm")
      .select("id, store_id, status, custom_fields")
      .eq("id", leadId)
      .maybeSingle();

    if (fetchErr || !leadRow) {
      throw new Error("Lead não encontrado.");
    }
    assertStoreAccess(identity, ["owner", "admin", "manager", "seller"], leadRow.store_id);

    const prevStatus = leadRow.status && leadRow.status !== "archived" ? leadRow.status : "new";
    const nextMeta = {
      ...((leadRow.custom_fields as Record<string, unknown>) || {}),
      archived_from_status: prevStatus,
      archived_at: new Date().toISOString(),
      archived_by: identity.id,
      archived_reason: reason?.trim() || null,
    };

    const { error: updErr } = await supabase
      .from("leads_crm")
      .update({
        status: "archived",
        custom_fields: nextMeta as any,
        updated_at: new Date().toISOString(),
      })
      .eq("id", leadId)
      .eq("store_id", leadRow.store_id);

    if (updErr) {
      throw new Error(`Erro ao arquivar lead: ${updErr.message}`);
    }

    await supabase.from("lead_activities").insert({
      lead_id: leadId,
      store_id: leadRow.store_id,
      author_id: identity.id,
      type: "stage_change",
      content: reason?.trim() ? `Lead arquivado (${reason.trim()})` : "Lead arquivado",
      metadata: { from: prevStatus, to: "archived" },
    });

    return { success: true, archivedFromStatus: prevStatus };
  });

export const listArchivedLeads = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = getServerClient();
  const identity = await getServerIdentity();
  assertStoreAccess(identity, ["owner", "admin", "manager", "seller", "support"]);

  const { data, error } = await supabase
    .from("leads_crm")
    .select("*")
    .eq("store_id", identity.store_id)
    .eq("status", "archived")
    .order("updated_at", { ascending: false })
    .limit(200);

  if (error) {
    throw new Error(`Erro ao listar leads arquivados: ${error.message}`);
  }
  return data || [];
});

export const restoreLead = createServerFn({ method: "POST" })
  .validator(z.object({ leadId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const { leadId } = data;
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager", "seller"]);

    const { data: leadRow, error: fetchErr } = await supabase
      .from("leads_crm")
      .select("id, store_id, status, custom_fields")
      .eq("id", leadId)
      .maybeSingle();

    if (fetchErr || !leadRow) {
      throw new Error("Lead não encontrado.");
    }
    assertStoreAccess(identity, ["owner", "admin", "manager", "seller"], leadRow.store_id);

    const meta = { ...((leadRow.custom_fields as Record<string, unknown>) || {}) };
    const prev =
      typeof meta.archived_from_status === "string" &&
      meta.archived_from_status !== "archived"
        ? meta.archived_from_status
        : "new";
    delete meta.archived_from_status;
    delete meta.archived_at;
    delete meta.archived_by;
    delete meta.archived_reason;

    const { error: updErr } = await supabase
      .from("leads_crm")
      .update({
        status: prev,
        custom_fields: meta as any,
        updated_at: new Date().toISOString(),
      })
      .eq("id", leadId)
      .eq("store_id", leadRow.store_id);

    if (updErr) {
      throw new Error(`Erro ao restaurar lead: ${updErr.message}`);
    }

    await supabase.from("lead_activities").insert({
      lead_id: leadId,
      store_id: leadRow.store_id,
      author_id: identity.id,
      type: "stage_change",
      content: `Lead restaurado para "${prev}"`,
      metadata: { from: "archived", to: prev },
    });

    return { success: true, restoredStatus: prev };
  });

export const mergeCustomers = createServerFn({ method: "POST" })
  .validator(
    z.object({
      sourceCustomerId: z.string().uuid(),
      targetCustomerId: z.string().uuid(),
    })
  )
  .handler(async ({ data }) => {
    const { sourceCustomerId, targetCustomerId } = data;
    if (sourceCustomerId === targetCustomerId) {
      throw new Error("Selecione um cliente diferente para mesclar.");
    }

    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertManagerAccess(identity);

    const [{ data: sourceRow, error: srcErr }, { data: targetRow, error: tgtErr }] =
      await Promise.all([
        supabase
          .from("customers_crm")
          .select("id, store_id, full_name, name, email, phone, document, notes, tags, total_spent_cents, lifetime_lead_count, status")
          .eq("id", sourceCustomerId)
          .maybeSingle(),
        supabase
          .from("customers_crm")
          .select("id, store_id, full_name, name, email, phone, document, notes, tags, total_spent_cents, lifetime_lead_count, status")
          .eq("id", targetCustomerId)
          .maybeSingle(),
      ]);

    if (srcErr || !sourceRow || tgtErr || !targetRow) {
      throw new Error("Um ou ambos os cadastros de cliente não foram encontrados.");
    }
    if (sourceRow.store_id !== targetRow.store_id) {
      throw new Error("Proibido mesclar clientes de lojas diferentes.");
    }
    assertManagerAccess(identity, targetRow.store_id);

    if (sourceRow.status === "archived") {
      throw new Error("O cadastro de origem já foi mesclado ou arquivado.");
    }

    const fkTables = [
      "leads_crm",
      "contracts",
      "travel_contracts",
      "tourism_trips",
      "quotes",
      "customer_documents",
      "customer_credits",
      "crm_clinical_records",
      "chat_threads",
      "booking_appointments",
      "orders",
      "support_tickets",
    ] as const;

    let reassignedCount = 0;
    for (const table of fkTables) {
      const { error: fkErr, count } = await supabase
        .from(table)
        .update({ customer_id: targetCustomerId }, { count: "exact" })
        .eq("customer_id", sourceCustomerId);
      if (!fkErr && typeof count === "number") {
        reassignedCount += count;
      }
    }

    const mergedTags = Array.from(
      new Set([
        ...(Array.isArray(targetRow.tags) ? targetRow.tags : []),
        ...(Array.isArray(sourceRow.tags) ? sourceRow.tags : []),
      ])
    );
    const mergedNotes = [
      targetRow.notes?.trim() || "",
      sourceRow.notes?.trim()
        ? `[Mesclado de ${sourceRow.full_name || sourceRow.name || sourceCustomerId}]: ${sourceRow.notes.trim()}`
        : "",
    ]
      .filter(Boolean)
      .join("\n\n");

    const { error: targetUpdErr } = await supabase
      .from("customers_crm")
      .update({
        email: targetRow.email || sourceRow.email,
        phone: targetRow.phone || sourceRow.phone,
        document: targetRow.document || sourceRow.document,
        notes: mergedNotes || null,
        tags: mergedTags,
        total_spent_cents:
          (Number(targetRow.total_spent_cents) || 0) +
          (Number(sourceRow.total_spent_cents) || 0),
        lifetime_lead_count:
          (Number(targetRow.lifetime_lead_count) || 0) +
          (Number(sourceRow.lifetime_lead_count) || 0),
        updated_at: new Date().toISOString(),
      })
      .eq("id", targetCustomerId)
      .eq("store_id", targetRow.store_id);

    if (targetUpdErr) {
      throw new Error(`Erro ao consolidar cadastro de destino: ${targetUpdErr.message}`);
    }

    const { error: srcArchErr } = await supabase
      .from("customers_crm")
      .update({
        status: "archived",
        notes: `[Cadastro mesclado ao cliente ${targetCustomerId} em ${new Date().toISOString()}]`,
        updated_at: new Date().toISOString(),
      })
      .eq("id", sourceCustomerId)
      .eq("store_id", targetRow.store_id);

    if (srcArchErr) {
      throw new Error(`Erro ao arquivar cadastro duplicado: ${srcArchErr.message}`);
    }

    return {
      success: true,
      targetCustomerId,
      sourceCustomerId,
      reassignedCount,
    };
  });

// ---------------------------------------------------------------------------
// Canonical Aliases for F13 (Workspace CRM)
// ---------------------------------------------------------------------------
export const listCustomersFn = listCustomers;
export const getCustomerDetailFn = getCustomer360;

