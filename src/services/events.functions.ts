import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { getServerIdentity, assertStoreAccess } from "@/lib/server-access";
import { eventSchema, ticketLotSchema } from "@/types/community";
import { generateTicketQRHash } from "@/lib/tokens";
import { logAuditAction } from "./audit.functions";

// ---------------------------------------------------------------------------
// EVENTS
// ---------------------------------------------------------------------------

async function _listAdminEvents() {
 const supabase = getServerClient();
 const identity = await getServerIdentity();

 if (!identity.store_id) return [];

 // Check if they are at least staff
 assertStoreAccess(identity, ["owner", "admin", "manager", "content", "seller"]);

 const { data: events, error } = await supabase
 .from("events")
 .select("*")
 .eq("store_id", identity.store_id)
 .order("created_at", { ascending: false });

 if (error) throw new Error(error.message);
 return events || [];
}

export const listAdminEvents = createServerFn({ method: "GET" }).handler(_listAdminEvents);

async function _getAdminEventById(eventId: string) {
 const supabase = getServerClient();
 const identity = await getServerIdentity();
 assertStoreAccess(identity, ["owner", "admin", "manager", "content", "seller"]);

 const { data: event, error } = await supabase
 .from("events")
 .select("*")
 .eq("id", eventId)
 .eq("store_id", identity.store_id)
 .single();

 if (error) throw new Error(error.message);
 return event;
}

export const getAdminEventById = createServerFn({ method: "GET" })
 .validator(z.string().uuid())
 .handler(async ({ data: eventId }) => _getAdminEventById(eventId));

async function _upsertEvent(data: any) {
 const supabase = getServerClient();
 const identity = await getServerIdentity();
 assertStoreAccess(identity, ["owner", "admin", "manager", "content"]);

 const { search_vector: _sv, ...safeData } = data || {};

 const payload: any = {
 ...safeData,
 store_id: identity.store_id,
 category: safeData.category || "shows",
 status: safeData.status || "published",
 updated_at: new Date().toISOString(),
 };

 if (!payload.id) {
 payload.created_at = new Date().toISOString();
 }

 const { data: event, error } = await supabase.from("events").upsert(payload).select().single();

 if (error) {
 console.error("[events.functions] Erro ao salvar evento:", error);
 throw new Error("Falha ao salvar evento: " + error.message);
 }

 // Provisiona lote padrão de ingressos se for novo evento
 if (!data.id) {
 try {
 await supabase.from("ticket_lots").insert({
 event_id: event.id,
 name: "1º Lote Geral",
 price_cents: 0,
 capacity: safeData.capacity || 100,
 status: "active",
 });
 } catch (lotErr) {
 console.warn("[events.functions] Aviso ao criar lote inicial:", lotErr);
 }
 }

 await logAuditAction(identity, data.id ? "UPDATE" : "INSERT", "events", event.id, event);

 return event;
}

export const upsertEvent = createServerFn({ method: "POST" })
  .validator(
  z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1, "O título é obrigatório"),
  description: z.string().optional().nullable(),
  event_date: z.string().min(1, "Data do evento é obrigatória"),
  end_date: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  cover_image: z.string().optional().nullable(),
  category: z.string().default("shows"),
  status: z.enum(["draft", "published", "cancelled"]).default("published"),
  is_free: z.boolean().default(false),
  is_external_ticket: z.boolean().default(false),
  external_ticket_url: z.string().url().optional().nullable(),
  capacity: z.number().int().min(0).optional().nullable(),
  organizer_name: z.string().optional().nullable(),
  organizer_phone: z.string().optional().nullable(),
  age_rating: z.string().optional().nullable(),
  tags: z.array(z.string()).optional().nullable(),
  featured_until: z.string().optional().nullable(),
  })
  )
  .handler(async ({ data }) => _upsertEvent(data));

// ---------------------------------------------------------------------------
// TICKET LOTS
// ---------------------------------------------------------------------------

async function _listEventLots(eventId: string) {
 const supabase = getServerClient();
 const identity = await getServerIdentity();
 assertStoreAccess(identity, ["owner", "admin", "manager", "content", "seller"]);

 // Double check that event belongs to the store
 const { data: evt } = await supabase
 .from("events")
 .select("id")
 .eq("id", eventId)
 .eq("store_id", identity.store_id)
 .single();
 if (!evt) throw new Error("Acesso negado");

 const { data: lots, error } = await supabase
 .from("ticket_lots")
 .select("*")
 .eq("event_id", eventId)
 .order("price_cents", { ascending: true });

 if (error) throw new Error(error.message);
 return lots || [];
}

export const listEventLots = createServerFn({ method: "GET" })
 .validator(z.string().uuid())
 .handler(async ({ data: eventId }) => _listEventLots(eventId));

async function _upsertEventLot(data: Partial<z.infer<typeof ticketLotSchema>>) {
 const supabase = getServerClient();
 const identity = await getServerIdentity();
 assertStoreAccess(identity, ["owner", "admin", "manager"]);

 if (!data.event_id) throw new Error("ID do evento obrigatório");

 // Ensure event ownership
 const { data: evt } = await supabase
 .from("events")
 .select("id")
 .eq("id", data.event_id)
 .eq("store_id", identity.store_id)
 .single();
 if (!evt) throw new Error("Acesso negado");

 // We DO NOT let frontend send `sold_count` or `reserved_count` during updates.
 // We only allow setting capacity.
 const payload = {
 id: data.id,
 event_id: data.event_id,
 name: data.name,
 price_cents: data.price_cents,
 capacity: data.capacity,
 start_time: data.start_time,
 end_time: data.end_time,
 status: data.status,
 };

 const { data: lot, error } = await supabase.from("ticket_lots").upsert(payload).select().single();

 if (error) throw new Error(error.message);

 await logAuditAction(identity, data.id ? "UPDATE" : "INSERT", "ticket_lots", lot.id, lot);

 return lot;
}

export const upsertEventLot = createServerFn({ method: "POST" })
 .validator(ticketLotSchema.partial().extend({ event_id: z.string().uuid(), name: z.string() }))
 .handler(async ({ data }) => _upsertEventLot(data));

async function _deleteEventLot(lotId: string) {
 const supabase = getServerClient();
 const identity = await getServerIdentity();
 assertStoreAccess(identity, ["owner", "admin", "manager"]);

 const { data: lot } = await supabase
 .from("ticket_lots")
 .select("id, event_id, sold_count, events!inner(store_id)")
 .eq("id", lotId)
 .single();

 if (!lot || (lot.events as any)?.store_id !== identity.store_id) {
 throw new Error("Acesso negado ou lote inexistente");
 }

 if ((lot.sold_count || 0) > 0) {
 throw new Error("Não é possível excluir um lote que já possui ingressos vendidos. Pause o lote.");
 }

 const { error } = await supabase.from("ticket_lots").delete().eq("id", lotId);
 if (error) throw new Error(error.message);

 await logAuditAction(identity, "DELETE", "ticket_lots", lotId, { event_id: lot.event_id });
 return { success: true };
}

export const deleteEventLot = createServerFn({ method: "POST" })
 .validator(z.object({ lotId: z.string().uuid() }))
 .handler(async ({ data }) => _deleteEventLot(data.lotId));

async function _listEventTickets(eventId: string) {
 const supabase = getServerClient();
 const identity = await getServerIdentity();
 assertStoreAccess(identity, ["owner", "admin", "manager", "seller"]);

 const { data: evt } = await supabase
 .from("events")
 .select("id")
 .eq("id", eventId)
 .eq("store_id", identity.store_id)
 .single();
 if (!evt) throw new Error("Acesso negado");

 const { data: tickets, error } = await supabase
 .from("tickets")
 .select(`
 id,
 status,
 qr_hash,
 created_at,
 ticket_lots(id, name, price_cents),
 profiles(id, full_name, tax_id, phone, email)
 `)
 .eq("event_id", eventId)
 .order("created_at", { ascending: false });

 if (error) throw new Error(error.message);
 return tickets || [];
}

export const listEventTickets = createServerFn({ method: "GET" })
 .validator(z.string().uuid())
 .handler(async ({ data: eventId }) => _listEventTickets(eventId));

async function _issueComplimentaryTicket(params: {
 eventId: string;
 lotId: string;
 recipientName: string;
 recipientEmail?: string;
 recipientTaxId?: string;
}) {
 const supabase = getServerClient();
 const identity = await getServerIdentity();
 assertStoreAccess(identity, ["owner", "admin", "manager"]);

 // Ensure event ownership
 const { data: evt } = await supabase
 .from("events")
 .select("id")
 .eq("id", params.eventId)
 .eq("store_id", identity.store_id)
 .single();
 if (!evt) throw new Error("Acesso negado");

 const qrHash = generateTicketQRHash();

 const { data: ticket, error } = await supabase
 .from("tickets")
 .insert({
 event_id: params.eventId,
 lot_id: params.lotId,
 user_id: identity.id, // issuer or holder profile
 qr_hash: qrHash,
 status: "valid",
 })
 .select()
 .single();

 if (error) throw new Error(error.message);

 // Increment sold_count in the lot
 try {
 await supabase.rpc("increment_lot_sold_count", { p_lot_id: params.lotId });
 } catch {}

 await logAuditAction(identity, "INSERT", "tickets", ticket.id, {
 type: "complimentary",
 recipient: params.recipientName,
 });

 return ticket;
}

export const issueComplimentaryTicket = createServerFn({ method: "POST" })
 .validator(
 z.object({
 eventId: z.string().uuid(),
 lotId: z.string().uuid(),
 recipientName: z.string().min(2),
 recipientEmail: z.string().email().optional(),
 recipientTaxId: z.string().optional(),
 }),
 )
 .handler(async ({ data }) => _issueComplimentaryTicket(data));

// ---------------------------------------------------------------------------
// TICKETS / CHECK-IN
// ---------------------------------------------------------------------------

async function _validateTicketCheckin(eventId: string, ticketCode: string) {
 const supabase = getServerClient();
 const identity = await getServerIdentity();
 assertStoreAccess(identity, ["owner", "admin", "manager", "seller"]); // sellers can check-in

 // Ensure event ownership
 const { data: evt } = await supabase
 .from("events")
 .select("id")
 .eq("id", eventId)
 .eq("store_id", identity.store_id)
 .single();
 if (!evt) throw new Error("Acesso negado ao evento");

 // Find the ticket by ID (uuid), QR Hash, or participant name/document
 let query = supabase
 .from("tickets")
 .select("id, status, qr_hash, updated_at, profiles!inner(full_name, tax_id, phone), ticket_lots!inner(name)")
 .eq("event_id", eventId);

 const cleanInput = ticketCode.trim();
 const isUuid =
 /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(
 cleanInput,
 );

 if (isUuid) {
 query = query.eq("id", cleanInput);
 } else if (cleanInput.startsWith("TKT-") || cleanInput.length >= 8) {
 query = query.or(`qr_hash.eq.${cleanInput},id.ilike.%${cleanInput}%`);
 } else {
 // Busca por CPF ou nome do titular
 query = query.or(`qr_hash.eq.${cleanInput},profiles.tax_id.eq.${cleanInput},profiles.full_name.ilike.%${cleanInput}%`);
 }

 const { data: ticket, error } = await query.maybeSingle();

 if (error || !ticket) {
 throw new Error("Ingresso não localizado para este evento. Verifique o código, QR ou CPF.");
 }

 if (ticket.status === "used") {
 const usedTime = ticket.updated_at
 ? new Date(ticket.updated_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
 : "anteriormente";
 throw new Error(`Ingresso já utilizado às ${usedTime}. Entrada duplicada bloqueada.`);
 }

 if (ticket.status === "revoked") {
 throw new Error("Ingresso cancelado ou revogado pela organização.");
 }

 // Atomically update the status to 'used' with timestamp
 const { error: updateErr } = await supabase
 .from("tickets")
 .update({ status: "used", updated_at: new Date().toISOString() })
 .eq("id", ticket.id)
 .eq("status", "valid"); // extra concurrency safety

 if (updateErr) {
 throw new Error("Falha ao registrar check-in.");
 }

 await logAuditAction(identity, "UPDATE", "tickets", ticket.id, { action: "checkin" });

 return {
 status: "success" as const,
 message: "Ingresso Validado!",
 name: (ticket.profiles as any)?.full_name || "Participante",
 lotName: (ticket.ticket_lots as any)?.name || "Lote Padrão",
 };
}

export const validateTicketCheckin = createServerFn({ method: "POST" })
 .validator(z.object({ eventId: z.string().uuid(), ticketCode: z.string() }))
 .handler(async ({ data }) => _validateTicketCheckin(data.eventId, data.ticketCode));

// ---------------------------------------------------------------------------
// PUBLIC EVENTS API
// ---------------------------------------------------------------------------

async function _getEventWithLots(eventId: string) {
 const supabase = getServerClient();

 try {
 const { data: event, error: eventError } = await supabase
 .from("events")
 .select("*")
 .eq("id", eventId)
 .eq("status", "published")
 .single();

    if (!eventError && event) {
      const [{ data: lots }, { data: relations }] = await Promise.all([
        supabase
          .from("ticket_lots")
          .select("*")
          .eq("event_id", eventId)
          .order("price_cents", { ascending: true }),
        supabase
          .from("event_news_relations")
          .select("news_articles(id, title, slug, cover_media_url, kicker, subtitle, published_at)")
          .eq("event_id", eventId)
          .limit(1),
      ]);

      const linkedNews = relations?.[0]?.news_articles || null;

      return { event, lots: lots || [], linkedNews };
    }
 } catch (err) {
 console.warn("[events] Erro ao buscar evento no banco:", err);
 }

 throw new Error("Evento não encontrado");
}

export const getEventWithLots = createServerFn({ method: "GET" })
 .validator(z.object({ eventId: z.string().uuid() }))
 .handler(async ({ data }) => _getEventWithLots(data.eventId));

// ---------------------------------------------------------------------------
// PUBLIC EVENTS LISTING (no auth required) — 100% Real no Supabase
// ---------------------------------------------------------------------------

async function _getPublicEvents(opts: {
  limit?: number;
  category?: string;
  dateFrom?: string;
  dateTo?: string;
  city?: string;
  state?: string;
  searchQuery?: string;
} = {}) {
  const supabase = getServerClient();
  const limit = opts.limit ?? 50;

  try {
    let query = supabase
      .from("events")
      .select(
        "id, store_id, title, description, event_date, end_date, location, venue, city, state, cover_image, status, category, is_free, is_external, external_source, is_external_ticket, external_ticket_url, organizer_name, price_min_cents, price_max_cents, rsvp_going_count, rsvp_interested_count, rsvp_not_going_count, created_at",
      )
      .eq("status", "published")
      .gte("event_date", new Date().toISOString()) // só eventos futuros
      .order("event_date", { ascending: true })
      .limit(limit);

    if (opts.category && opts.category !== "todos") {
      query = query.eq("category", opts.category);
    }

    if (opts.dateFrom) {
      query = query.gte("event_date", opts.dateFrom + "T00:00:00");
    }

    if (opts.dateTo) {
      query = query.lte("event_date", opts.dateTo + "T23:59:59");
    }

    if (opts.city) {
      query = query.ilike("city", `%${opts.city}%`);
    }

    if (opts.state) {
      query = query.eq("state", opts.state);
    }

    if (opts.searchQuery) {
      query = query.or(
        `title.ilike.%${opts.searchQuery}%,description.ilike.%${opts.searchQuery}%,location.ilike.%${opts.searchQuery}%,organizer_name.ilike.%${opts.searchQuery}%`,
      );
    }

    const { data: events, error } = await query;

    if (!error && events) {
      return events;
    }
  } catch (err) {
    console.warn("[events] Erro ao listar eventos:", err);
  }

  return [];
}

export const getPublicEvents = createServerFn({ method: "GET" })
  .validator(
    z
      .object({
        limit: z.number().int().min(1).max(200).optional(),
        category: z.string().optional(),
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        searchQuery: z.string().optional(),
      })
      .optional(),
  )
  .handler(async ({ data }) => _getPublicEvents(data || {}));

// ---------------------------------------------------------------------------
// SUBPAINÉIS DE EVENTOS & LOGÍSTICA RECURSIVA (PERSONA NEXUS TRANSFUSION)
// ---------------------------------------------------------------------------

export const listEventSubpanels = createServerFn({ method: "GET" })
 .validator(z.object({ eventId: z.string().uuid() }))
 .handler(async ({ data }) => {
 const supabase = getServerClient();
 const identity = await getServerIdentity();

 const { data: subpanels, error } = await supabase
 .from("event_subpanels")
 .select("*, staff:event_staff_allocations(*)")
 .eq("event_id", data.eventId)
 .eq("store_id", identity.store_id)
 .order("created_at", { ascending: true });

 if (error) throw new Error("Erro ao listar subpainéis do evento: " + error.message);
 return subpanels || [];
 });

export const createEventSubpanel = createServerFn({ method: "POST" })
 .validator(
 z.object({
 eventId: z.string().uuid(),
 name: z.string().min(2),
 panelType: z.enum(["bar", "foodtruck", "restaurant", "merchandise", "ticketing_box", "vip_lounge", "security_checkpoint", "other"]).default("bar"),
 managerName: z.string().optional(),
 managerContact: z.string().optional(),
 config: z.record(z.unknown()).default({}),
 expireDays: z.number().int().min(1).default(30),
 }),
 )
 .handler(async ({ data }) => {
 const supabase = getServerClient();
 const identity = await getServerIdentity();
 assertStoreAccess(identity, ["owner", "admin", "manager", "content"]);

 // 1. Inserir Subpainel
 const { data: subpanel, error } = await supabase
 .from("event_subpanels")
 .insert({
 store_id: identity.store_id,
 event_id: data.eventId,
 name: data.name,
 panel_type: data.panelType,
 manager_name: data.managerName,
 manager_contact: data.managerContact,
 config: data.config,
 is_active: true,
 })
 .select()
 .single();

 if (error || !subpanel) {
 throw new Error("Erro ao criar subpainel: " + (error?.message || "Registro não criado"));
 }

 // 2. Gerar Token Seguro de Acesso Externo
 const { data: token, error: tokenErr } = await supabase.rpc("generate_event_subpanel_token", {
 p_subpanel_id: subpanel.id,
 p_expire_days: data.expireDays,
 });

 if (tokenErr) {
 console.warn("Aviso: falha ao chamar RPC generate_event_subpanel_token:", tokenErr);
 }

 return { status: "success", subpanel: { ...subpanel, access_token: token } };
 });

export const getEventSubpanelByToken = createServerFn({ method: "GET" })
 .validator(z.object({ token: z.string() }))
 .handler(async ({ data }) => {
 const supabase = getServerClient();

 const { data: subpanel, error } = await supabase
 .from("event_subpanels")
 .select(`
 *,
 event:events(id, title, event_date, location, address)
 `)
 .eq("access_token", data.token)
 .single();

 if (error || !subpanel) {
 throw new Error("Subpainel não encontrado ou token inválido.");
 }

 if (subpanel.token_expires_at && new Date(subpanel.token_expires_at) < new Date()) {
 throw new Error("O link de acesso deste subpainel expirou.");
 }

 return subpanel;
 });

export const listEventStaffAllocations = createServerFn({ method: "GET" })
 .validator(z.object({ eventId: z.string().uuid() }))
 .handler(async ({ data }) => {
 const supabase = getServerClient();
 const identity = await getServerIdentity();

 const { data: staff, error } = await supabase
 .from("event_staff_allocations")
 .select(`
 *,
 employee:employees(id, full_name, job_title),
 contractor:event_contractors(id, name, service_category, contact_phone),
 subpanel:event_subpanels(id, name, panel_type)
 `)
 .eq("event_id", data.eventId)
 .eq("store_id", identity.store_id)
 .order("created_at", { ascending: true });

 if (error) throw new Error("Erro ao listar equipe do evento: " + error.message);
 return staff || [];
 });

export const saveEventStaffAllocation = createServerFn({ method: "POST" })
 .validator(
 z.object({
 id: z.string().uuid().optional(),
 eventId: z.string().uuid(),
 subpanelId: z.string().uuid().optional().nullable(),
 employeeId: z.string().uuid().optional().nullable(),
 contractorId: z.string().uuid().optional().nullable(),
 roleTitle: z.string().min(2),
 shiftName: z.string().default("Geral"),
 remunerationCents: z.number().int().min(0).default(0),
 isConfirmed: z.boolean().default(false),
 notes: z.string().optional(),
 }),
 )
 .handler(async ({ data }) => {
 const supabase = getServerClient();
 const identity = await getServerIdentity();
 assertStoreAccess(identity, ["owner", "admin", "manager"]);

 const payload = {
 store_id: identity.store_id,
 event_id: data.eventId,
 subpanel_id: data.subpanelId,
 employee_id: data.employeeId,
 contractor_id: data.contractorId,
 role_title: data.roleTitle,
 shift_name: data.shiftName,
 remuneration_cents: data.remunerationCents,
 is_confirmed: data.isConfirmed,
 notes: data.notes,
 updated_at: new Date().toISOString(),
 };

 let result;
 if (data.id) {
 const { data: updated, error } = await supabase
 .from("event_staff_allocations")
 .update(payload)
 .eq("id", data.id)
 .eq("store_id", identity.store_id)
 .select()
 .single();
 if (error) throw new Error("Erro ao atualizar escala: " + error.message);
 result = updated;
 } else {
 const { data: created, error } = await supabase
 .from("event_staff_allocations")
 .insert(payload)
 .select()
 .single();
 if (error) throw new Error("Erro ao criar alocação de equipe: " + error.message);
 result = created;
 }

 return { status: "success", allocation: result };
 });

export const predictEventAttendanceAI = createServerFn({ method: "POST" })
 .validator(z.object({ eventId: z.string().uuid() }))
 .handler(async ({ data }) => {
 const supabase = getServerClient();
 const identity = await getServerIdentity();

 // 1. Obter dados do evento e ingressos vendidos
 const { data: event, error: eventErr } = await supabase
 .from("events")
 .select("*, ticket_lots(*)")
 .eq("id", data.eventId)
 .eq("store_id", identity.store_id)
 .single();

 if (eventErr || !event) {
 throw new Error("Evento não encontrado.");
 }

 const totalCapacity = event.capacity || 1000;
 const lots = event.ticket_lots || [];
 const soldTickets = lots.reduce((acc: number, l: any) => acc + (l.quantity_sold || 0), 0);
 const confirmedRatio = soldTickets / Math.max(1, totalCapacity);

 // 2. Projeção baseada em heurística estocástica calibrada
 const predictedAttendance = Math.round(soldTickets * 0.88); // ~12% no-show médio de eventos
 const estimatedBeerLiters = Math.round(predictedAttendance * 2.2); // 2.2L por pessoa
 const estimatedWaterLiters = Math.round(predictedAttendance * 0.8); // 800ml por pessoa
 const estimatedSnackPortions = Math.round(predictedAttendance * 1.4); // 1.4 porções
 const estimatedTotalRevenueCents = soldTickets * 8500 + predictedAttendance * 4500; // Ingressos + consumo médio

 return {
 status: "success",
 eventId: data.eventId,
 totalCapacity,
 soldTickets,
 predictedAttendance,
 estimatedNoShowRatePct: 12,
 projections: {
 beerLiters: estimatedBeerLiters,
 waterLiters: estimatedWaterLiters,
 snackPortions: estimatedSnackPortions,
 estimatedTotalRevenueCents,
 },
 insights: [
 `Lotação estimada em ${Math.round(confirmedRatio * 100)}% da capacidade máxima.`,
 `Recomenda-se abastecer no mínimo ${estimatedBeerLiters}L de chopp e ${estimatedWaterLiters}L de água mineral.`,
 `Considere reforçar a equipe de bar no horário de pico (22h - 01h).`,
 ],
 };
 });

// ---------------------------------------------------------------------------
// EVENT PROJECT MANAGEMENT & KANBAN (PERSONA NEXUS FUSION)
// ---------------------------------------------------------------------------

export const getEventKanbanBoard = createServerFn({ method: "GET" })
  .validator(z.object({ eventId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager", "content", "seller"]);

    // 1. Busca ou inicializa o quadro via RPC
    let { data: quadro } = await supabase
      .from("eventos_quadros")
      .select("*")
      .eq("evento_id", data.eventId)
      .maybeSingle();

    if (!quadro) {
      const { data: newBoardId, error: initErr } = await supabase.rpc("init_evento_kanban", {
        p_evento_id: data.eventId,
      });
      if (initErr) {
        console.warn("Aviso ao inicializar kanban:", initErr);
      }
      const { data: fetched } = await supabase
        .from("eventos_quadros")
        .select("*")
        .eq("id", newBoardId)
        .single();
      quadro = fetched;
    }

    if (!quadro) {
      throw new Error("Não foi possível carregar o quadro do evento.");
    }

    // 2. Busca colunas
    const { data: colunas, error: colErr } = await supabase
      .from("eventos_quadros_colunas")
      .select("*")
      .eq("quadro_id", quadro.id)
      .order("ordem", { ascending: true });

    if (colErr) throw new Error("Erro ao buscar colunas: " + colErr.message);

    return { quadro, colunas: colunas || [] };
  });

export const listEventTasks = createServerFn({ method: "GET" })
  .validator(z.object({ quadroId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager", "content", "seller"]);

    const { data: tarefas, error } = await supabase
      .from("eventos_tarefas_view")
      .select("*")
      .eq("quadro_id", data.quadroId)
      .order("ordem", { ascending: true });

    if (error) throw new Error("Erro ao listar tarefas: " + error.message);
    return tarefas || [];
  });

export const createEventTask = createServerFn({ method: "POST" })
  .validator(
    z.object({
      colunaId: z.string().uuid(),
      titulo: z.string().min(2),
      descricao: z.string().optional(),
      responsavelId: z.string().uuid().optional().nullable(),
      responsavelNome: z.string().optional().nullable(),
      dataInicio: z.string().optional().nullable(),
      dataFim: z.string().optional().nullable(),
      prioridade: z.enum(["baixa", "media", "alta", "urgente"]).default("media"),
      ordem: z.number().int().default(0),
      checklist: z.array(z.any()).default([]),
    }),
  )
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager", "content"]);

    const { data: task, error } = await supabase
      .from("eventos_tarefas")
      .insert({
        coluna_id: data.colunaId,
        titulo: data.titulo,
        descricao: data.descricao,
        responsavel_id: data.responsavelId,
        responsavel_nome: data.responsavelNome,
        data_inicio: data.dataInicio,
        data_fim: data.dataFim,
        prioridade: data.prioridade,
        ordem: data.ordem,
        checklist: data.checklist,
      })
      .select()
      .single();

    if (error) throw new Error("Erro ao criar tarefa: " + error.message);
    return task;
  });

export const updateEventTask = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string().uuid(),
      updates: z.object({
        coluna_id: z.string().uuid().optional(),
        titulo: z.string().optional(),
        descricao: z.string().optional().nullable(),
        responsavel_id: z.string().uuid().optional().nullable(),
        responsavel_nome: z.string().optional().nullable(),
        data_inicio: z.string().optional().nullable(),
        data_fim: z.string().optional().nullable(),
        prioridade: z.enum(["baixa", "media", "alta", "urgente"]).optional(),
        ordem: z.number().int().optional(),
        checklist: z.array(z.any()).optional(),
        tags: z.array(z.string()).optional(),
      }),
    }),
  )
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager", "content"]);

    const { data: task, error } = await supabase
      .from("eventos_tarefas")
      .update({
        ...data.updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.id)
      .select()
      .single();

    if (error) throw new Error("Erro ao atualizar tarefa: " + error.message);
    return task;
  });

export const deleteEventTask = createServerFn({ method: "POST" })
  .validator(z.object({ taskId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager"]);

    const { error } = await supabase.from("eventos_tarefas").delete().eq("id", data.taskId);
    if (error) throw new Error("Erro ao excluir tarefa: " + error.message);
    return { success: true };
  });

export const moveEventTask = createServerFn({ method: "POST" })
  .validator(
    z.object({
      taskId: z.string().uuid(),
      newColunaId: z.string().uuid(),
      newOrdem: z.number().int(),
    }),
  )
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager", "content"]);

    const { data: task, error } = await supabase
      .from("eventos_tarefas")
      .update({
        coluna_id: data.newColunaId,
        ordem: data.newOrdem,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.taskId)
      .select()
      .single();

    if (error) throw new Error("Erro ao mover tarefa: " + error.message);
    return task;
  });

// ---------------------------------------------------------------------------
// EVENT BUDGETS & SUPPLIERS (PERSONA NEXUS FUSION)
// ---------------------------------------------------------------------------

export const listEventBudgets = createServerFn({ method: "GET" })
  .validator(z.object({ eventId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager", "content"]);

    const { data: orcamentos, error } = await supabase
      .from("eventos_orcamentos")
      .select("*")
      .eq("evento_id", data.eventId)
      .order("versao", { ascending: false });

    if (error) throw new Error("Erro ao listar orçamentos: " + error.message);
    return orcamentos || [];
  });

export const upsertEventBudget = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string().uuid().optional(),
      eventId: z.string().uuid(),
      versao: z.number().int().default(1),
      status: z.enum(["rascunho", "aprovado", "arquivado"]).default("rascunho"),
      totalReceitas: z.number().default(0),
      totalDespesas: z.number().default(0),
      margemLucro: z.number().default(0),
      itens: z.array(z.any()).default([]),
      observacoes: z.string().optional().nullable(),
    }),
  )
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager"]);

    const payload = {
      evento_id: data.eventId,
      versao: data.versao,
      status: data.status,
      total_receitas: data.totalReceitas,
      total_despesas: data.totalDespesas,
      margem_lucro: data.margemLucro,
      itens: data.itens,
      observacoes: data.observacoes,
      updated_at: new Date().toISOString(),
    };

    let result;
    if (data.id) {
      const { data: updated, error } = await supabase
        .from("eventos_orcamentos")
        .update(payload)
        .eq("id", data.id)
        .select()
        .single();
      if (error) throw new Error("Erro ao atualizar orçamento: " + error.message);
      result = updated;
    } else {
      const { data: created, error } = await supabase
        .from("eventos_orcamentos")
        .insert(payload)
        .select()
        .single();
      if (error) throw new Error("Erro ao criar orçamento: " + error.message);
      result = created;
    }

    return result;
  });

export const deleteEventBudget = createServerFn({ method: "POST" })
  .validator(z.object({ budgetId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager"]);

    const { error } = await supabase.from("eventos_orcamentos").delete().eq("id", data.budgetId);
    if (error) throw new Error("Erro ao excluir orçamento: " + error.message);
    return { success: true };
  });

// ---------------------------------------------------------------------------
// EVENT SECTORS, PARTNERS, LINEUP & DOCUMENTS
// ---------------------------------------------------------------------------

export const listEventSectors = createServerFn({ method: "GET" })
  .validator(z.object({ eventId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const { data: setores, error } = await supabase
      .from("eventos_setores")
      .select("*")
      .eq("evento_id", data.eventId)
      .order("created_at", { ascending: true });
    if (error) throw new Error("Erro ao listar setores: " + error.message);
    return setores || [];
  });

export const upsertEventSector = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string().uuid().optional(),
      eventId: z.string().uuid(),
      nome: z.string().min(1),
      capacidade: z.number().int().optional().nullable(),
      corHex: z.string().default("#6366f1"),
      coordenadas: z.record(z.any()).default({}),
      descricao: z.string().optional().nullable(),
    }),
  )
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager"]);

    const payload = {
      evento_id: data.eventId,
      nome: data.nome,
      capacidade: data.capacidade,
      cor_hex: data.corHex,
      coordenadas: data.coordenadas,
      descricao: data.descricao,
    };

    if (data.id) {
      const { data: updated, error } = await supabase
        .from("eventos_setores")
        .update(payload)
        .eq("id", data.id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return updated;
    } else {
      const { data: created, error } = await supabase
        .from("eventos_setores")
        .insert(payload)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return created;
    }
  });

export const deleteEventSector = createServerFn({ method: "POST" })
  .validator(z.object({ sectorId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager"]);

    const { error } = await supabase.from("eventos_setores").delete().eq("id", data.sectorId);
    if (error) throw new Error(error.message);
    return { success: true };
  });

export const listEventPartners = createServerFn({ method: "GET" })
  .validator(z.object({ eventId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const { data: parceiros, error } = await supabase
      .from("eventos_parceiros")
      .select("*")
      .eq("evento_id", data.eventId)
      .order("ordem", { ascending: true });
    if (error) throw new Error("Erro ao listar parceiros: " + error.message);
    return parceiros || [];
  });

export const upsertEventPartner = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string().uuid().optional(),
      eventId: z.string().uuid(),
      nome: z.string().min(1),
      tipo: z.string().default("apoio"),
      nivel: z.string().default("prata"),
      logoUrl: z.string().optional().nullable(),
      siteUrl: z.string().optional().nullable(),
      ordem: z.number().int().default(0),
    }),
  )
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager"]);

    const payload = {
      evento_id: data.eventId,
      nome: data.nome,
      tipo: data.tipo,
      nivel: data.nivel,
      logo_url: data.logoUrl,
      site_url: data.siteUrl,
      ordem: data.ordem,
    };

    if (data.id) {
      const { data: updated, error } = await supabase
        .from("eventos_parceiros")
        .update(payload)
        .eq("id", data.id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return updated;
    } else {
      const { data: created, error } = await supabase
        .from("eventos_parceiros")
        .insert(payload)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return created;
    }
  });

export const deleteEventPartner = createServerFn({ method: "POST" })
  .validator(z.object({ partnerId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager"]);

    const { error } = await supabase.from("eventos_parceiros").delete().eq("id", data.partnerId);
    if (error) throw new Error(error.message);
    return { success: true };
  });

export const listEventLineup = createServerFn({ method: "GET" })
  .validator(z.object({ eventId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const { data: lineup, error } = await supabase
      .from("eventos_lineup")
      .select("*")
      .eq("evento_id", data.eventId)
      .order("ordem", { ascending: true });
    if (error) throw new Error("Erro ao listar lineup: " + error.message);
    return lineup || [];
  });

export const upsertEventLineup = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string().uuid().optional(),
      eventId: z.string().uuid(),
      nomeArtista: z.string().min(1),
      ordem: z.number().int().default(0),
      horarioInicio: z.string().optional().nullable(),
      horarioFim: z.string().optional().nullable(),
      palco: z.string().optional().nullable(),
      bio: z.string().optional().nullable(),
      imagemUrl: z.string().optional().nullable(),
      redesSociais: z.record(z.any()).default({}),
    }),
  )
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager"]);

    const payload = {
      evento_id: data.eventId,
      nome_artista: data.nomeArtista,
      ordem: data.ordem,
      horario_inicio: data.horarioInicio,
      horario_fim: data.horarioFim,
      palco: data.palco,
      bio: data.bio,
      imagem_url: data.imagemUrl,
      redes_sociais: data.redesSociais,
      updated_at: new Date().toISOString(),
    };

    if (data.id) {
      const { data: updated, error } = await supabase
        .from("eventos_lineup")
        .update(payload)
        .eq("id", data.id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return updated;
    } else {
      const { data: created, error } = await supabase
        .from("eventos_lineup")
        .insert(payload)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return created;
    }
  });

export const deleteEventLineup = createServerFn({ method: "POST" })
  .validator(z.object({ lineupId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager"]);

    const { error } = await supabase.from("eventos_lineup").delete().eq("id", data.lineupId);
    if (error) throw new Error(error.message);
    return { success: true };
  });

export const listEventDocuments = createServerFn({ method: "GET" })
  .validator(z.object({ eventId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const { data: docs, error } = await supabase
      .from("eventos_documentos")
      .select("*")
      .eq("evento_id", data.eventId)
      .order("created_at", { ascending: false });
    if (error) throw new Error("Erro ao listar documentos: " + error.message);
    return docs || [];
  });

export const upsertEventDocument = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string().uuid().optional(),
      eventId: z.string().uuid(),
      titulo: z.string().min(1),
      tipo: z.string().default("outro"),
      arquivoUrl: z.string().min(1),
      dataValidade: z.string().optional().nullable(),
      observacoes: z.string().optional().nullable(),
    }),
  )
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager"]);

    const payload = {
      evento_id: data.eventId,
      titulo: data.titulo,
      tipo: data.tipo,
      arquivo_url: data.arquivoUrl,
      data_validade: data.dataValidade,
      observacoes: data.observacoes,
      updated_at: new Date().toISOString(),
    };

    if (data.id) {
      const { data: updated, error } = await supabase
        .from("eventos_documentos")
        .update(payload)
        .eq("id", data.id)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return updated;
    } else {
      const { data: created, error } = await supabase
        .from("eventos_documentos")
        .insert(payload)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return created;
    }
  });

export const deleteEventDocument = createServerFn({ method: "POST" })
  .validator(z.object({ documentId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager"]);

    const { error } = await supabase.from("eventos_documentos").delete().eq("id", data.documentId);
    if (error) throw new Error(error.message);
    return { success: true };
  });

// ---------------------------------------------------------------------------
// EVENT STORE & MERCHANDISE (LOJA DO EVENTO / PERSONA NEXUS FUSION)
// ---------------------------------------------------------------------------

export const listEventStoreProducts = createServerFn({ method: "GET" })
  .validator(z.object({ eventId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();

    const { data: prods, error } = await supabase
      .from("event_store_products")
      .select("*")
      .eq("event_id", data.eventId)
      .eq("store_id", identity.store_id)
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("Aviso ao buscar produtos do evento:", error.message);
      return [];
    }
    return prods || [];
  });

export const upsertEventStoreProduct = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string().uuid().optional(),
      eventId: z.string().uuid(),
      subpanelId: z.string().uuid().optional().nullable(),
      nome: z.string().min(2),
      descricao: z.string().optional().nullable(),
      priceCents: z.number().int().min(0).default(0),
      estoqueAtual: z.number().int().min(0).default(0),
      imagemUrl: z.string().optional().nullable(),
      isBundle: z.boolean().default(false),
      bundleItems: z.array(z.any()).default([]),
      ativo: z.boolean().default(true),
    }),
  )
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager"]);

    const payload = {
      store_id: identity.store_id,
      event_id: data.eventId,
      subpanel_id: data.subpanelId,
      nome: data.nome,
      descricao: data.descricao,
      price_cents: data.priceCents,
      estoque_atual: data.estoqueAtual,
      imagem_url: data.imagemUrl,
      is_bundle: data.isBundle,
      bundle_items: data.bundleItems,
      ativo: data.ativo,
      updated_at: new Date().toISOString(),
    };

    let result;
    if (data.id) {
      const { data: updated, error } = await supabase
        .from("event_store_products")
        .update(payload)
        .eq("id", data.id)
        .eq("store_id", identity.store_id)
        .select()
        .single();
      if (error) throw new Error("Erro ao atualizar produto do evento: " + error.message);
      result = updated;
    } else {
      const { data: created, error } = await supabase
        .from("event_store_products")
        .insert(payload)
        .select()
        .single();
      if (error) throw new Error("Erro ao criar produto do evento: " + error.message);
      result = created;
    }

    await logAuditAction(
      identity,
      data.id ? "UPDATE" : "INSERT",
      "event_store_products",
      result.id,
      result,
    );

    return result;
  });

export const deleteEventStoreProduct = createServerFn({ method: "POST" })
  .validator(z.object({ productId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager"]);

    const { error } = await supabase
      .from("event_store_products")
      .delete()
      .eq("id", data.productId)
      .eq("store_id", identity.store_id);

    if (error) throw new Error("Erro ao excluir produto: " + error.message);

    await logAuditAction(identity, "DELETE", "event_store_products", data.productId, {});

    return { success: true };
  });

// ---------------------------------------------------------------------------
// EVENT AUDIT LOGS (GOVERNANÇA & TRILHA IMUTÁVEL / PERSONA NEXUS FUSION)
// ---------------------------------------------------------------------------

export const getEventAuditLogs = createServerFn({ method: "GET" })
  .validator(z.object({ eventId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager"]);

    const { data: logs, error } = await supabase
      .from("audit_logs")
      .select("*, profiles!audit_logs_user_id_fkey(full_name)")
      .eq("store_id", identity.store_id)
      .or(`entity_id.eq.${data.eventId},entity_type.in.(events,tickets,ticket_lots,event_store_products,event_staff_allocations)`)
      .order("created_at", { ascending: false })
      .limit(60);

    if (error) {
      console.warn("Aviso ao buscar logs de auditoria do evento:", error.message);
      return [];
    }

    return logs || [];
  });

// ---------------------------------------------------------------------------
// CUSTOMER TICKETS — Área Pessoal /conta/ingressos
// ---------------------------------------------------------------------------

/**
 * Lista os ingressos de eventos comprados pelo usuário autenticado.
 * Usa fallback defensivo para compatibilidade com diferentes schemas.
 */
export const listCustomerEventTickets = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const { getSSRClient } = await import("@/lib/server-access");
    const ssrClient = await getSSRClient();
    const {
      data: { user },
    } = await ssrClient.auth.getUser();

    if (!user) return [];

    // Busca pedidos com itens de ingresso
    const { data: orders, error } = await ssrClient
      .from("orders")
      .select(
        `id, status, created_at, total_cents,
        order_items(id, item_type, product_title, quantity, unit_price_cents, metadata)`
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("[events.functions] listCustomerEventTickets error:", error.message);
      return [];
    }

    const ticketOrders = (orders || []).filter((o: any) =>
      o.order_items?.some(
        (i: any) =>
          i.item_type === "ticket" ||
          i.item_type === "event" ||
          i.product_title?.toLowerCase().includes("ingresso")
      )
    );

    return ticketOrders.map((order: any) => {
      const ticketItem = order.order_items?.find(
        (i: any) =>
          i.item_type === "ticket" ||
          i.item_type === "event" ||
          i.product_title?.toLowerCase().includes("ingresso")
      );
      const meta = ticketItem?.metadata || {};
      return {
        id: ticketItem?.id || order.id,
        orderId: order.id,
        eventTitle: ticketItem?.product_title || meta.event_title || "Ingresso",
        eventDate: meta.event_date || null,
        eventLocation: meta.event_location || meta.venue || null,
        lotName: meta.lot_name || meta.batch || null,
        quantity: ticketItem?.quantity || 1,
        priceCents: order.total_cents,
        status: order.status as string,
        qrHash: meta.qr_hash || meta.qr_code || `W${order.id.slice(0, 8).toUpperCase()}`,
        coverUrl: meta.event_cover_url || null,
        isUsed: meta.is_used === true || order.status === "delivered",
        accessCode: meta.access_code || order.id.slice(0, 8).toUpperCase(),
        createdAt: order.created_at,
      };
    });
  } catch (e) {
    console.warn("[events.functions] listCustomerEventTickets fallback:", e);
    return [];
  }
});

export type CustomerEventTicketDTO = {
  id: string;
  orderId: string;
  eventTitle: string;
  eventDate: string | null;
  eventLocation: string | null;
  lotName: string | null;
  quantity: number;
  priceCents: number;
  status: string;
  qrHash: string;
  coverUrl: string | null;
  isUsed: boolean;
  accessCode: string;
  createdAt: string;
};

// ---------------------------------------------------------------------------
// EVENT CREDENTIALS (Crachás com QR Code & Acesso de Staff/VIP/Imprensa)
// ---------------------------------------------------------------------------

export const listEventCredentials = createServerFn({ method: "GET" })
  .validator(z.object({ eventId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager", "seller"]);

    const { data: credentials, error } = await supabase
      .from("eventos_credenciais")
      .select("*")
      .eq("evento_id", data.eventId)
      .eq("store_id", identity.store_id)
      .order("created_at", { ascending: false });

    if (error) throw new Error("Erro ao listar credenciais: " + error.message);
    return credentials || [];
  });

export const upsertEventCredential = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string().uuid().optional(),
      eventId: z.string().uuid(),
      tipo: z.enum(["equipe", "terceiro", "patrocinador", "imprensa", "autoridade", "vip", "staff"]).default("staff"),
      nome: z.string().min(2, "Nome é obrigatório"),
      documento: z.string().optional().nullable(),
      email: z.string().optional().nullable(),
      telefone: z.string().optional().nullable(),
      cargo: z.string().optional().nullable(),
      empresaOrigem: z.string().optional().nullable(),
      fotoUrl: z.string().optional().nullable(),
      nivelAcesso: z.enum(["basico", "restrito", "vip", "total"]).default("basico"),
      validoDe: z.string().optional().nullable(),
      validoAte: z.string().optional().nullable(),
    })
  )
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager"]);

    const qrCode = data.id ? undefined : `CRED-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    const payload: any = {
      evento_id: data.eventId,
      store_id: identity.store_id,
      tipo: data.tipo,
      nome: data.nome.trim(),
      documento: data.documento?.trim() || null,
      email: data.email?.trim() || null,
      telefone: data.telefone?.trim() || null,
      cargo: data.cargo?.trim() || null,
      empresa_origem: data.empresaOrigem?.trim() || null,
      foto_url: data.fotoUrl?.trim() || null,
      nivel_acesso: data.nivelAcesso,
      valido_de: data.validoDe || null,
      valido_ate: data.validoAte || null,
      updated_at: new Date().toISOString(),
    };

    if (qrCode) {
      payload.qr_code = qrCode;
    }

    if (data.id) {
      const { data: updated, error } = await supabase
        .from("eventos_credenciais")
        .update(payload)
        .eq("id", data.id)
        .eq("store_id", identity.store_id)
        .select()
        .single();
      if (error) throw new Error("Erro ao atualizar credencial: " + error.message);
      return updated;
    } else {
      const { data: created, error } = await supabase
        .from("eventos_credenciais")
        .insert(payload)
        .select()
        .single();
      if (error) throw new Error("Erro ao emitir credencial: " + error.message);
      return created;
    }
  });

export const deleteEventCredential = createServerFn({ method: "POST" })
  .validator(z.object({ credentialId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager"]);

    const { error } = await supabase
      .from("eventos_credenciais")
      .delete()
      .eq("id", data.credentialId)
      .eq("store_id", identity.store_id);

    if (error) throw new Error("Erro ao revogar credencial: " + error.message);
    return { success: true };
  });

export const validateCredentialCheckin = createServerFn({ method: "POST" })
  .validator(
    z.object({
      eventId: z.string().uuid(),
      qrCode: z.string().min(1),
    })
  )
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager", "seller"]);

    const { data: credential, error: findError } = await supabase
      .from("eventos_credenciais")
      .select("*")
      .eq("evento_id", data.eventId)
      .eq("qr_code", data.qrCode.trim())
      .single();

    if (findError || !credential) {
      throw new Error("Credencial não encontrada ou código inválido.");
    }

    if (credential.status === "revogado" || credential.status === "suspenso") {
      throw new Error(`Credencial ${credential.status.toUpperCase()}! Entrada negada.`);
    }

    if (credential.checkin_realizado) {
      return {
        alreadyCheckedIn: true,
        credential,
        message: `Check-in já realizado em ${new Date(credential.checkin_em).toLocaleTimeString("pt-BR")}`,
      };
    }

    const { data: updated, error: updateError } = await supabase
      .from("eventos_credenciais")
      .update({
        checkin_realizado: true,
        checkin_em: new Date().toISOString(),
        checkin_por: identity.id,
      })
      .eq("id", credential.id)
      .select()
      .single();

    if (updateError) throw new Error("Falha ao registrar check-in: " + updateError.message);

    return {
      alreadyCheckedIn: false,
      credential: updated,
      message: `Acesso Liberado: ${updated.nome} [${updated.tipo.toUpperCase()}]`,
    };
  });

