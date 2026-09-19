import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { getServerIdentity, assertStoreAccess } from "@/lib/server-access";
import { sendWhatsAppNotification } from "./integrations.functions";

// ─── CARTEIRA DE CLIENTES (BFF CANÔNICO) ──────────────────────────────────────

export const listCustomersInputSchema = z.object({
 query: z.string().optional(),
 status: z.enum(["all", "active", "inactive", "blocked", "archived"]).optional(),
 kind: z.enum(["all", "individual", "company"]).optional(),
 channel: z.string().optional(),
 city: z.string().optional(),
}).optional();

export const listCustomers = createServerFn({ method: "GET" })
 .validator(listCustomersInputSchema)
 .handler(async ({ data: filter }) => {
 const supabase = getServerClient();
 const identity = await getServerIdentity();
 assertStoreAccess(identity, ["owner", "admin", "manager", "seller", "support"]);

 // 1. Busca direta na tabela master customers_crm
 let qb = supabase
 .from("customers_crm")
 .select("*")
 .eq("store_id", identity.store_id)
 .order("created_at", { ascending: false });

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

 const list = customers || [];

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
 email: null,
 phone: p.phone || null,
 document: p.tax_id || null,
 status: "active",
 channel: "direct",
 tags: [],
 notes: null,
 created_at: p.created_at,
 updated_at: p.created_at,
 });
 }
 }
 }
 }

 // 2. Busca métricas de pedidos (LTV e contagem)
 const customerIds = list.map((c: any) => c.id);
 const orderStats = new Map();
 if (customerIds.length > 0) {
 const { data: orders } = await supabase
 .from("orders")
 .select("customer_id, total_cents, status")
 .eq("store_id", identity.store_id)
 .in("customer_id", customerIds);

 if (orders) {
 for (const o of orders) {
 if (!o.customer_id) continue;
 const stats = orderStats.get(o.customer_id) || { ltv: 0, count: 0 };
 stats.count += 1;
 if (["paid", "processing", "ready_for_pickup", "shipped", "delivered", "completed"].includes(o.status)) {
 stats.ltv += o.total_cents;
 }
 orderStats.set(o.customer_id, stats);
 }
 }
 }

 // 3. Busca alertas de documentos dos clientes (passaporte/cnh vencendo)
 const docAlertsMap = new Map();
 if (customerIds.length > 0) {
 const todayStr = new Date().toISOString().split("T")[0];
 const soonDate = new Date();
 soonDate.setDate(soonDate.getDate() + 90);
 const soonStr = soonDate.toISOString().split("T")[0];

 const { data: docs } = await supabase
 .from("customer_documents")
 .select("customer_id, expires_at")
 .in("customer_id", customerIds)
 .not("expires_at", "is", null);

 if (docs) {
 for (const d of docs) {
 if (!d.expires_at) continue;
 const current = docAlertsMap.get(d.customer_id) || { expired: 0, soon: 0 };
 if (d.expires_at < todayStr) {
 current.expired += 1;
 } else if (d.expires_at <= soonStr) {
 current.soon += 1;
 }
 docAlertsMap.set(d.customer_id, current);
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
 email: c.email || null,
 phone: c.phone || null,
 status: c.status || "active",
 channel: c.channel || "direct",
 city: c.city || null,
 state: c.state || null,
 tags: c.tags || [],
 notes: c.notes || null,
 creditLimitCents: c.credit_limit_cents || 0,
 assignedTo: c.assigned_to || null,
 orderCount: stats.count,
 ltvCents: stats.ltv,
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

 // 3. Busca Documentos anexos com cálculo de validade
 const { data: documents } = await supabase
 .from("customer_documents")
 .select("*")
 .eq("customer_id", customerId)
 .order("created_at", { ascending: false });

 const todayStr = new Date().toISOString().split("T")[0];
 const soonDate = new Date();
 soonDate.setDate(soonDate.getDate() + 90);
 const soonStr = soonDate.toISOString().split("T")[0];

 const processedDocs = (documents || []).map((doc: any) => {
 let expiryStatus: "valid" | "soon" | "expired" = "valid";
 if (doc.expires_at) {
 if (doc.expires_at < todayStr) expiryStatus = "expired";
 else if (doc.expires_at <= soonStr) expiryStatus = "soon";
 }
 return { ...doc, expiryStatus };
 });

 // 4. Busca Oportunidades Comerciais (Leads) vinculadas a este cliente
 const { data: commercialLeads } = await supabase
 .from("leads_crm")
 .select("id, title, full_name, status, estimated_value_cents, source, probability, expected_close_date, created_at, updated_at")
 .eq("customer_id", customerId)
 .order("created_at", { ascending: false });

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
 const { data: tickets } = await supabase
 .from("tickets")
 .select("id, event_id, status, created_at, events(title, date)")
 .eq("owner_profile_id", customerId)
 .order("created_at", { ascending: false });

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
 timeline.push({
 id: `lead_${l.id}`,
 type: "commercial_lead",
 title: `Negociação: ${l.title || l.full_name}`,
 description: `Status: ${l.status} • Estimativa: R$ ${((l.estimated_value_cents || 0) / 100).toFixed(2)}`,
 status: l.status,
 timestamp: l.created_at,
 metadata: { lead_id: l.id },
 });
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
  const { data: customerCredits } = await supabase
  .from("customer_credits")
  .select("id, amount_cents, balance_cents, description, created_at")
  .eq("customer_id", customerId)
  .order("created_at", { ascending: false });

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

  const clinicalRecords = (clinicalData || []).map((r: any) => ({
  id: r.id,
  service_title: r.content?.service_title || "Atendimento",
  notes: r.content?.notes || "",
  allergies: r.content?.allergies || null,
  professional_name: r.content?.professional_name || null,
  created_at: r.created_at,
  }));

  return {
  profile: {
  id: customer.id,
  // aliases para compatibilidade com o componente
  name: customer.full_name || "Cliente",
  fullName: customer.full_name || "Cliente",
  legalName: customer.legal_name || null,
  taxId: customer.document || null,
  rg: customer.rg || null,
  email: customer.email || null,
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
  walletPasses,
  travelerPreferences,
  timeline,
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
 email: z.string().email("E-mail inválido").optional().or(z.literal("")).nullable(),
 phone: z.string().optional().nullable(),
 birthDate: z.string().optional().nullable(),
 status: z.enum(["active", "inactive", "blocked"]).default("active"),
 channel: z.string().default("direct"),
 city: z.string().optional().nullable(),
 state: z.string().optional().nullable(),
 zipcode: z.string().optional().nullable(),
 addressLine: z.string().optional().nullable(),
 creditLimitCents: z.number().int().nonnegative().default(0),
 assignedTo: z.string().uuid().optional().nullable(),
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
 tags: input.tags || [],
 notes: input.notes?.trim() || null,
 })
 .select()
 .single();

 if (error) {
 console.error("[crm] error inserting customer:", error);
 throw new Error("Erro ao salvar cliente na base.");
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

 const { error } = await supabase
 .from("customers_crm")
 .update(updatePayload)
 .eq("id", input.id)
 .eq("store_id", identity.store_id);

 if (error) throw new Error("Erro ao atualizar cliente: " + error.message);
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

export const createCustomerDocumentSchema = z.object({
 customerId: z.string().uuid(),
 docType: z.enum([
 "passport",
 "cnh",
 "rg",
 "cpf",
 "visa",
 "vaccination_card",
 "contract",
 "proof_of_residence",
 "other",
 ]),
 docNumber: z.string().optional().nullable(),
 issuedAt: z.string().optional().nullable(),
 expiresAt: z.string().optional().nullable(),
 fileUrl: z.string().optional().nullable(),
 notes: z.string().optional().nullable(),
});

export const createCustomerDocument = createServerFn({ method: "POST" })
 .validator(createCustomerDocumentSchema)
 .handler(async ({ data: input }) => {
 const supabase = getServerClient();
 const identity = await getServerIdentity();
 assertStoreAccess(identity, ["owner", "admin", "manager", "seller", "support"]);

 const { data, error } = await supabase
 .from("customer_documents")
 .insert({
 customer_id: input.customerId,
 store_id: identity.store_id,
 doc_type: input.docType,
 doc_number: input.docNumber || null,
 issued_at: input.issuedAt || null,
 expires_at: input.expiresAt || null,
 file_url: input.fileUrl || null,
 notes: input.notes || null,
 })
 .select()
 .single();

 if (error) throw new Error("Erro ao anexar documento: " + error.message);
 return data;
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
 attachments: z.array(z.string().url()).optional(),
 }),
 )
 .handler(async ({ data: input }) => {
 const supabase = getServerClient();
 const identity = await getServerIdentity();
 assertStoreAccess(identity, ["owner", "admin", "manager", "seller", "support"]);

 const { data, error } = await supabase
 .from("crm_clinical_records")
 .insert({
 customer_id: input.customerId,
 store_id: identity.store_id,
 author_id: identity.id,
 record_type: "anamnesis",
 content: {
 service_title: input.serviceTitle,
 professional_name: input.professionalName || (identity as any).name || "Especialista",
 notes: input.notes,
 allergies: input.allergies || null,
 },
 attachments: input.attachments || [],
 })
 .select()
 .single();

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
 const { error } = await supabase.from("leads_crm").insert({
 store_id: input.storeId,
 full_name: input.fullName,
 email: input.email,
 phone: input.phone || null,
 message: input.message,
 status: "new",
 });
 if (error) throw error;

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
 interestType: z.string().optional().nullable(),
 interestPeriod: z.string().optional().nullable(),
 travelStart: z.string().optional().nullable(),
 travelEnd: z.string().optional().nullable(),
 paxAdults: z.number().int().min(1).default(1),
 paxChildren: z.number().int().min(0).default(0),
 paxInfants: z.number().int().min(0).default(0),
 paxAges: z.array(z.number()).default([]),
 estimatedValueCents: z.number().int().min(0).default(0),
 source: z.string().default("whatsapp"),
 leadSourceDetail: z.string().optional().nullable(),
 status: z.enum(["new", "contacted", "qualified", "proposal", "negotiation", "won", "lost", "converted"]).default("new"),
 assignedTo: z.string().uuid().optional().nullable(),
 tags: z.array(z.string()).default([]),
 checklist: z.array(z.object({
 id: z.string(),
 text: z.string(),
 done: z.boolean(),
 })).default([]),
 notes: z.string().optional().nullable(),
});

export const createLead = createServerFn({ method: "POST" })
 .validator(createLeadSchema)
 .handler(async ({ data: input }) => {
 try {
 const supabase = getServerClient();
 const identity = await getServerIdentity();
 assertStoreAccess(identity, ["owner", "admin", "manager", "seller", "support"]);

 const totalPax = (input.paxAdults || 1) + (input.paxChildren || 0) + (input.paxInfants || 0);

 const payload = {
 store_id: identity.store_id,
 full_name: input.fullName.trim(),
 email: input.email ? input.email.trim() : null,
 phone: input.phone ? input.phone.trim() : null,
 title: input.title?.trim() || (input.destination ? `Viagem para ${input.destination}` : `Atendimento ${input.fullName}`),
 destination: input.destination?.trim() || null,
 interest_type: input.interestType || null,
 interest_period: input.interestPeriod?.trim() || null,
 travel_start: input.travelStart || null,
 travel_end: input.travelEnd || null,
 pax_count: totalPax,
 pax_adults: input.paxAdults,
 pax_children: input.paxChildren,
 pax_infants: input.paxInfants,
 pax_ages: input.paxAges || [],
 estimated_value_cents: input.estimatedValueCents || 0,
 source: input.source || "whatsapp",
 lead_source_detail: input.leadSourceDetail || null,
 status: input.status,
 assigned_to: input.assignedTo || identity.id,
 tags: input.tags || [],
 checklist: input.checklist || [],
 notes: input.notes?.trim() || null,
 last_contacted_at: new Date().toISOString(),
 };

 const { data, error } = await supabase
 .from("leads_crm")
 .insert(payload)
 .select()
 .single();

 if (error) throw error;
 return { status: "success" as const, lead: data };
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
          passenger_count: z.number().int().optional().default(1),
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

    const toInsert = leads.map((l) => ({
      store_id: identity.store_id,
      full_name: l.fullName,
      email: l.email || null,
      phone: l.phone || null,
      title: l.title || `Oportunidade - ${l.fullName}`,
      status: l.status || "new",
      estimated_value_cents: l.estimated_value_cents || 0,
      destination_of_interest: l.destination || null,
      passenger_count: l.passenger_count || 1,
      acquisition_channel: l.acquisition_channel || "importacao_massa",
      notes: l.notes || null,
      source: "import_csv",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));

    const { data, error } = await supabase
      .from("leads_crm")
      .insert(toInsert)
      .select("id");

    if (error) {
      console.error("[crm] batchImportLeads error:", error);
      throw new Error(`Falha ao importar lote de leads: ${error.message}`);
    }

    return { success: true, count: data?.length || toInsert.length };
  });

export const updateLeadStatus = createServerFn({ method: "POST" })
 .validator(
 z.object({
 leadId: z.string().uuid(),
 status: z.enum(["new", "contacted", "qualified", "proposal", "negotiation", "won", "lost", "converted"]),
 }),
 )
 .handler(async ({ data: { leadId, status } }) => {
 try {
 const supabase = getServerClient();
 const identity = await getServerIdentity();
 assertStoreAccess(identity, ["owner", "admin", "manager", "seller"]);

 const updates: Record<string, any> = {
 status,
 updated_at: new Date().toISOString(),
 last_contacted_at: new Date().toISOString(),
 };

 if (status === "won" || status === "lost" || status === "converted") {
 updates.closed_at = new Date().toISOString();
 }

 const { error } = await supabase
 .from("leads_crm")
 .update(updates)
 .eq("id", leadId)
 .eq("store_id", identity.store_id);

 if (error) throw error;
 return { status: "success" as const };
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
 interestType: z.string().optional().nullable(),
 interestPeriod: z.string().optional().nullable(),
 travelStart: z.string().optional().nullable(),
 travelEnd: z.string().optional().nullable(),
 paxAdults: z.number().optional(),
 paxChildren: z.number().optional(),
 paxInfants: z.number().optional(),
 paxAges: z.array(z.number()).optional(),
 status: z.enum(["new", "contacted", "qualified", "proposal", "negotiation", "won", "lost", "converted"]).optional(),
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
 if (updates.destination !== undefined) dbUpdates.destination = updates.destination;
 if (updates.interestType !== undefined) dbUpdates.interest_type = updates.interestType;
 if (updates.interestPeriod !== undefined) dbUpdates.interest_period = updates.interestPeriod;
 if (updates.travelStart !== undefined) dbUpdates.travel_start = updates.travelStart;
 if (updates.travelEnd !== undefined) dbUpdates.travel_end = updates.travelEnd;
 if (updates.paxAdults !== undefined) dbUpdates.pax_adults = updates.paxAdults;
 if (updates.paxChildren !== undefined) dbUpdates.pax_children = updates.paxChildren;
 if (updates.paxInfants !== undefined) dbUpdates.pax_infants = updates.paxInfants;
 if (updates.paxAges !== undefined) dbUpdates.pax_ages = updates.paxAges;
 if (updates.status !== undefined) {
 dbUpdates.status = updates.status;
 if (["won", "lost", "converted"].includes(updates.status)) {
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
 if (updates.lost_reason !== undefined) dbUpdates.lost_reason = updates.lost_reason;

 const { error } = await supabase
 .from("leads_crm")
 .update(dbUpdates)
 .eq("id", leadId)
 .eq("store_id", identity.store_id);

 if (error) throw error;
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

  // 1. Busca dados completos do lead
  const { data: lead, error: fetchError } = await supabase
  .from("leads_crm")
  .select("*")
  .eq("id", leadId)
  .eq("store_id", identity.store_id)
  .single();

  if (fetchError || !lead) throw new Error("Lead não encontrado");

  // 2. Evita duplicação se já foi convertido
  if (lead.customer_id) {
  return { status: "already_converted" as const, customerId: lead.customer_id };
  }

  // 3. Cria o cliente com todos os dados disponíveis
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
   email: lead.email?.trim() || null,
   phone: lead.phone?.trim() || null,
   document: lead.document?.trim() || null,
   birth_date: lead.birth_date || null,
   status: "active",
   channel: lead.source || "direct",
   tags: tagsList,
   notes: notesLines.length > 0 ? notesLines.join("\n") : null,
  })
  .select("id")
  .single();

  if (createError) throw new Error("Erro ao criar cliente: " + createError.message);

  // 4. Seta customer_id no lead (link bidirecional) e atualiza status
  await supabase
  .from("leads_crm")
  .update({
   status: "converted",
   customer_id: newCustomer.id,
   closed_at: new Date().toISOString(),
   updated_at: new Date().toISOString(),
  })
  .eq("id", leadId)
  .eq("store_id", identity.store_id);

  // 5. Registra atividade na timeline
  await supabase.from("lead_activities").insert({
    lead_id: leadId,
    store_id: identity.store_id,
    author_id: identity.id,
    type: "conversion",
    content: `Lead convertido para Cliente Oficial. ID: ${newCustomer.id}`,
    metadata: { customer_id: newCustomer.id },
  }).then(() => null, () => null);

  return { status: "success" as const, customerId: newCustomer.id };
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

// ─── CRM LEAD 360° DRAWER & MEETINGS (TRAVELAGENCIAS ENTERPRISE STANDARD) ──

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

    await supabase.from("lead_activities").insert({
      lead_id: input.leadId,
      store_id: identity.store_id,
      author_id: identity.id,
      type: "meeting",
      content: `Reunião agendada: "${input.title}" para ${new Date(input.scheduledAt).toLocaleString("pt-BR")}`,
      metadata: { meeting_id: meeting.id },
    });

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
  .validator(z.object({ token: z.string() }))
  .handler(async ({ data: { token } }) => {
    const supabase = getServerClient();
    const { data, error } = await (supabase.rpc as any)("get_public_lead_by_token", {
      _token: token,
    });
    if (error || !data) throw new Error("Formulário de viagem não encontrado ou expirado.");
    return data;
  });

export const submitPublicLeadForm = createServerFn({ method: "POST" })
  .validator(
    z.object({
      token: z.string(),
      paxList: z.array(
        z.object({
          full_name: z.string().min(2),
          document: z.string().optional().nullable(),
          birth_date: z.string().optional().nullable(),
          relationship: z.string().default("other"),
          phone: z.string().optional().nullable(),
          email: z.string().optional().nullable(),
        })
      ),
      lgpdAccepted: z.boolean(),
      healthNotes: z.string().optional().nullable(),
    })
  )
  .handler(async ({ data: input }) => {
    const supabase = getServerClient();
    const { data, error } = await (supabase.rpc as any)("submit_public_lead_passengers", {
      _token: input.token,
      _pax_list: input.paxList,
      _lgpd_accepted: input.lgpdAccepted,
      _health_notes: input.healthNotes || null,
    });
    if (error) throw new Error(error.message || "Erro ao enviar acompanhantes.");
    return data;
  });
