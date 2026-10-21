import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/start-server-core";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { getServerIdentity, assertStoreAccess } from "@/lib/server-access";
import { applyServerFnEdgeCache } from "@/lib/cache/edge-cache";
import { eventSchema, ticketLotSchema } from "@/types/community";
import { generateTicketQRHash } from "@/lib/tokens";
import { signTicketPayload, verifyTicketPayload } from "@/lib/ticket-crypto";
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
  if (!events || events.length === 0) return [];

  const eventIds = events.map((e: any) => e.id);

  // Agrega lotes/ingressos, pedidos de subpainéis e pontos operacionais para o Cockpit Master da Produtora
  const [{ data: lots }, { data: subpanelOrders }, { data: subpanels }] = await Promise.all([
    supabase
      .from("ticket_lots")
      .select("event_id, price_cents, sold_count")
      .in("event_id", eventIds)
      .then((r) => r, () => ({ data: [] as any[] })),
    supabase
      .from("event_subpanel_orders")
      .select("event_id, total_cents, concession_fee_cents, status")
      .in("event_id", eventIds)
      .neq("status", "cancelled")
      .then((r) => r, () => ({ data: [] as any[] })),
    supabase
      .from("event_subpanels")
      .select("id, event_id, is_active")
      .in("event_id", eventIds)
      .then((r) => r, () => ({ data: [] as any[] })),
  ]);

  const lotsByEvent = new Map<string, { sold: number; revCents: number }>();
  for (const l of lots || []) {
    const cur = lotsByEvent.get(l.event_id) || { sold: 0, revCents: 0 };
    const sold = Number(l.sold_count || 0);
    cur.sold += sold;
    cur.revCents += sold * Number(l.price_cents || 0);
    lotsByEvent.set(l.event_id, cur);
  }

  const ordersByEvent = new Map<string, { grossCents: number; feeCents: number; count: number }>();
  for (const o of subpanelOrders || []) {
    const cur = ordersByEvent.get(o.event_id) || { grossCents: 0, feeCents: 0, count: 0 };
    cur.grossCents += Number(o.total_cents || 0);
    cur.feeCents += Number(o.concession_fee_cents || 0);
    cur.count += 1;
    ordersByEvent.set(o.event_id, cur);
  }

  const subpanelsByEvent = new Map<string, number>();
  for (const sp of subpanels || []) {
    if (sp.is_active !== false) {
      subpanelsByEvent.set(sp.event_id, (subpanelsByEvent.get(sp.event_id) || 0) + 1);
    }
  }

  return events.map((ev: any) => {
    const lotStat = lotsByEvent.get(ev.id) || { sold: 0, revCents: 0 };
    const ordStat = ordersByEvent.get(ev.id) || { grossCents: 0, feeCents: 0, count: 0 };
    const spCount = subpanelsByEvent.get(ev.id) || 0;

    return {
      ...ev,
      tickets_sold: lotStat.sold,
      ticket_revenue_cents: lotStat.revCents,
      concession_gross_cents: ordStat.grossCents,
      concession_fee_cents: ordStat.feeCents,
      concession_orders_count: ordStat.count,
      subpanels_count: spCount,
      total_ecosystem_revenue_cents: lotStat.revCents + ordStat.grossCents,
      producer_net_revenue_cents: lotStat.revCents + ordStat.feeCents,
    };
  });
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
 human_code,
 recipient_name,
 recipient_email,
 recipient_tax_id,
 checkin_at,
 created_at,
 ticket_lots(id, name, price_cents),
 profiles!tickets_owner_profile_id_fkey(id, full_name, tax_id, phone, email)
 `)
 .eq("event_id", eventId)
 .order("created_at", { ascending: false });

 if (error) {
   // Fallback caso a constraint tenha nome distinto no ambiente
   const { data: fallbackTickets, error: fbErr } = await supabase
     .from("tickets")
     .select(`
       id,
       status,
       qr_hash,
       human_code,
       recipient_name,
       recipient_email,
       recipient_tax_id,
       checkin_at,
       created_at,
       ticket_lots(id, name, price_cents),
       profiles(id, full_name, tax_id, phone, email)
     `)
     .eq("event_id", eventId)
     .order("created_at", { ascending: false });
   if (fbErr) throw new Error(fbErr.message);
   return fallbackTickets || [];
 }
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

 const ticketId = crypto.randomUUID();
 const signed = signTicketPayload({
   ticketId,
   eventId: params.eventId,
   lotId: params.lotId,
   ownerProfileId: identity.id,
 });

 const { data: ticket, error } = await supabase
 .from("tickets")
 .insert({
 id: ticketId,
 event_id: params.eventId,
 lot_id: params.lotId,
 owner_profile_id: identity.id,
 qr_hash: signed.qrPayload,
 human_code: signed.humanCode,
 hmac_signature: signed.signature,
 issued_at_epoch: signed.issuedAt,
 recipient_name: params.recipientName,
 recipient_email: params.recipientEmail || null,
 recipient_tax_id: params.recipientTaxId || null,
 status: "valid",
 })
 .select()
 .single();

 if (error) throw new Error(error.message);

  // Increment sold_count in the lot and check automatic rollover
  try {
    await supabase.rpc("increment_lot_sold_count", { p_lot_id: params.lotId });
    await checkAndRolloverEventLots(params.eventId, params.lotId);
  } catch (lotError) {
    console.error("[events] Falha ao atualizar lote após emissão de ingresso cortesia:", lotError);
  }

  await logAuditAction(identity, "INSERT", "tickets", ticket.id, {
    type: "complimentary",
    recipient: params.recipientName,
    humanCode: signed.humanCode,
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

/**
 * Verifica e executa a virada automática de lotes quando o lote atual atinge a capacidade máxima.
 * Se o lote ativo atingiu o teto (sold_count >= capacity), encerra-o (sold_out) e ativa o próximo lote na fila.
 */
export async function checkAndRolloverEventLots(eventId: string, currentLotId?: string) {
  const supabase = getServerClient();

  const { data: lots, error } = await supabase
    .from("ticket_lots")
    .select("id, name, price_cents, capacity, sold_count, status")
    .eq("event_id", eventId)
    .order("price_cents", { ascending: true });

  if (error || !lots || lots.length <= 1) return { rolledOver: false };

  const targetLot = currentLotId
    ? lots.find((l) => l.id === currentLotId)
    : lots.find((l) => l.status === "active");

  if (!targetLot) return { rolledOver: false };

  const isExhausted =
    targetLot.capacity > 0 && (targetLot.sold_count || 0) >= targetLot.capacity;

  if (isExhausted && targetLot.status === "active") {
    // 1. Marca lote atual como esgotado
    await supabase
      .from("ticket_lots")
      .update({ status: "sold_out", updated_at: new Date().toISOString() })
      .eq("id", targetLot.id);

    // 2. Encontra o próximo lote elegível
    const nextLot = lots.find(
      (l) => l.id !== targetLot.id && l.status !== "sold_out" && (l.sold_count || 0) < l.capacity
    );

    if (nextLot) {
      await supabase
        .from("ticket_lots")
        .update({ status: "active", updated_at: new Date().toISOString() })
        .eq("id", nextLot.id);

      return {
        rolledOver: true,
        previousLotId: targetLot.id,
        previousLotName: targetLot.name,
        activatedLotId: nextLot.id,
        activatedLotName: nextLot.name,
      };
    }

    return {
      rolledOver: true,
      previousLotId: targetLot.id,
      previousLotName: targetLot.name,
      allSoldOut: true,
    };
  }

  return { rolledOver: false };
}

export const triggerLotRolloverCheck = createServerFn({ method: "POST" })
  .validator(z.object({ eventId: z.string().uuid(), lotId: z.string().uuid().optional() }))
  .handler(async ({ data }) => {
    return checkAndRolloverEventLots(data.eventId, data.lotId);
  });


// ---------------------------------------------------------------------------
// TICKETS / CHECK-IN (WCTS-1 CRYPTOGRAPHIC VALIDATION)
// ---------------------------------------------------------------------------

async function _validateTicketCheckin(
  eventId: string,
  ticketCode: string,
  latitude?: number,
  longitude?: number
) {
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

  const cleanInput = ticketCode.trim();

  // 1. Pré-validação sintática e de checksum/assinatura WCTS-1
  const preliminaryCheck = verifyTicketPayload(cleanInput);
  if (!preliminaryCheck.isValid) {
    throw new Error(
      preliminaryCheck.errorMessage || "Código ou assinatura criptográfica do ingresso inválida."
    );
  }

  // 2. Localizar o registro do ingresso no banco
  let query = supabase
    .from("tickets")
    .select(
      "id, event_id, lot_id, owner_profile_id, status, qr_hash, human_code, hmac_signature, issued_at_epoch, recipient_name, checkin_at, updated_at, profiles(full_name, tax_id, phone), ticket_lots(name)"
    )
    .eq("event_id", eventId);

  const isUuid =
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(
      preliminaryCheck.ticketId || cleanInput
    );

  if (cleanInput.startsWith("v1:TKT:") && preliminaryCheck.ticketId) {
    query = query.eq("id", preliminaryCheck.ticketId);
  } else if (cleanInput.startsWith("W-TKT-")) {
    query = query.eq("human_code", cleanInput);
  } else if (isUuid) {
    query = query.eq("id", cleanInput);
  } else if (cleanInput.startsWith("TKT-") || cleanInput.length >= 8) {
    query = query.or(`qr_hash.eq.${cleanInput},human_code.eq.${cleanInput}`);
  } else {
    query = query.or(
      `qr_hash.eq.${cleanInput},human_code.eq.${cleanInput},recipient_tax_id.eq.${cleanInput},recipient_name.ilike.%${cleanInput}%`
    );
  }

  const { data: ticket, error } = await query.maybeSingle();

  if (error || !ticket) {
    throw new Error("Ingresso não localizado para este evento. Verifique o código, QR ou CPF.");
  }

  // 3. Se o ingresso possui assinatura HMAC ou o input veio como QR WCTS-1, validar assinatura criptográfica completa
  if (cleanInput.startsWith("v1:TKT:")) {
    const fullCryptoVerify = verifyTicketPayload(cleanInput, {
      eventId: ticket.event_id,
      lotId: ticket.lot_id,
      ownerProfileId: ticket.owner_profile_id,
    });
    if (!fullCryptoVerify.isValid) {
      throw new Error(
        fullCryptoVerify.errorMessage ||
          "Assinatura digital HMAC-SHA256 divergente! Tentativa de fraude bloqueada."
      );
    }
  }

  if (ticket.status === "used") {
    const usedTimestamp = ticket.checkin_at || ticket.updated_at;
    const usedTime = usedTimestamp
      ? new Date(usedTimestamp).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
      : "anteriormente";
    throw new Error(`Ingresso já utilizado às ${usedTime}. Entrada duplicada bloqueada.`);
  }

  if (ticket.status === "revoked") {
    throw new Error("Ingresso cancelado ou revogado pela organização.");
  }

  const nowIso = new Date().toISOString();

  // Atomically update the status to 'used' with timestamp and telemetry
  const { error: updateErr } = await supabase
    .from("tickets")
    .update({
      status: "used",
      checkin_at: nowIso,
      checkin_operator_id: identity.id,
      checkin_latitude: latitude ?? null,
      checkin_longitude: longitude ?? null,
      updated_at: nowIso,
    })
    .eq("id", ticket.id)
    .eq("status", "valid");

  if (updateErr) {
    throw new Error("Falha ao registrar check-in.");
  }

  await logAuditAction(identity, "UPDATE", "tickets", ticket.id, {
    action: "checkin",
    cryptoVerified: cleanInput.startsWith("v1:TKT:"),
    latitude,
    longitude,
  });

  const holderName =
    ticket.recipient_name || (ticket.profiles as any)?.full_name || "Participante";

  return {
    status: "success" as const,
    message: "Ingresso Validado com Criptografia!",
    name: holderName,
    lotName: (ticket.ticket_lots as any)?.name || "Lote Padrão",
    humanCode: ticket.human_code || undefined,
  };
}

export const validateTicketCheckin = createServerFn({ method: "POST" })
  .validator(
    z.object({
      eventId: z.string().uuid(),
      ticketCode: z.string(),
      latitude: z.number().optional(),
      longitude: z.number().optional(),
    })
  )
  .handler(async ({ data }) =>
    _validateTicketCheckin(data.eventId, data.ticketCode, data.latitude, data.longitude)
  );

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
      const [{ data: lots }, { data: relations }, { data: partners }, { data: subpanels }, { data: products }, { data: surveys }] = await Promise.all([
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
        supabase
          .from("eventos_parceiros")
          .select("*")
          .eq("evento_id", eventId)
          .order("ordem", { ascending: true })
          .then(
            (res) => res,
            () => ({ data: [] })
          ),
        supabase
          .from("event_subpanels")
          .select("id, name, panel_type, allow_online_orders")
          .eq("event_id", eventId)
          .eq("is_active", true)
          .eq("allow_online_orders", true)
          .then((res) => res, () => ({ data: [] })),
        supabase
          .from("event_store_products")
          .select("id, subpanel_id, nome, descricao, price_cents, imagem_url, estoque_atual")
          .eq("event_id", eventId)
          .eq("ativo", true)
          .then((res) => res, () => ({ data: [] })),
        supabase
          .from("event_surveys")
          .select("id, title, description, form_schema, require_geofence, venue_latitude, venue_longitude, geo_radius_meters")
          .eq("event_id", eventId)
          .eq("is_active", true)
          .eq("target_audience", "attendees")
          .then((res) => res, () => ({ data: [] })),
      ]);

      const linkedNews = relations?.[0]?.news_articles || null;

      return {
        event,
        classifiedEvent: null as any,
        lots: lots || [],
        linkedNews,
        partners: partners || [],
        concessions: subpanels || [],
        products: products || [],
        surveys: surveys || [],
      };
    }

    // Fallback bidirecional: Eventos Civis / Luma criados em classifieds (category = 'event')
    const { data: classifiedRow } = await supabase
      .from("classifieds")
      .select("*, profiles:profile_id(id, full_name, avatar_url, phone), stores:store_id(id, name, slug, logo_url)")
      .eq("id", eventId)
      .maybeSingle();

    if (
      classifiedRow &&
      (classifiedRow.category === "event" ||
        (classifiedRow.attributes as any)?.niche === "evento")
    ) {
      const attrs = (classifiedRow.attributes || {}) as Record<string, any>;
      const rawDate = attrs.event_date
        ? String(attrs.event_date).includes("T")
          ? String(attrs.event_date)
          : String(attrs.event_date) + "T" + (attrs.start_time || "19:00") + ":00"
        : classifiedRow.created_at;
      const tiers = Array.isArray(attrs.ticket_tiers) ? attrs.ticket_tiers : [];
      const mappedLots = tiers.map((t: any, idx: number) => ({
        id: t.id || "tier-" + idx,
        event_id: classifiedRow.id,
        title: t.name || t.title || "Lote " + (idx + 1),
        description: t.description || "",
        price_cents: Number(t.price_cents ?? t.price ?? 0),
        quantity_total: Number(t.quantity ?? 100),
        quantity_sold: Number(t.sold ?? 0),
        status: "active",
      }));

      const mappedEvent = {
        id: classifiedRow.id,
        store_id: classifiedRow.store_id || null,
        title: classifiedRow.title,
        description: classifiedRow.content || "",
        event_date: rawDate,
        end_date: attrs.end_date || null,
        location: attrs.venue_address || classifiedRow.location_name || attrs.city || "",
        venue: attrs.venue_name || classifiedRow.location_name || "",
        city: attrs.city || classifiedRow.location_name || "",
        state: attrs.state || "",
        cover_image:
          attrs.banner_image_url ||
          (Array.isArray(classifiedRow.images) && classifiedRow.images[0]) ||
          null,
        status: "published",
        category: attrs.event_category || classifiedRow.sub_category || "shows",
        is_free:
          classifiedRow.price_cents === 0 ||
          (mappedLots.length > 0 && mappedLots.every((l: any) => l.price_cents === 0)),
        is_external: false,
        external_source: null,
        is_external_ticket: false,
        external_ticket_url: null,
        organizer_name:
          attrs.host_name ||
          (classifiedRow as any).stores?.name ||
          (classifiedRow as any).profiles?.full_name ||
          "Organizador Verificado",
        price_min_cents:
          mappedLots.length > 0
            ? Math.min(...mappedLots.map((l: any) => l.price_cents))
            : classifiedRow.price_cents ?? 0,
        price_max_cents:
          mappedLots.length > 0
            ? Math.max(...mappedLots.map((l: any) => l.price_cents))
            : classifiedRow.price_cents ?? 0,
        rsvp_going_count: Number(attrs.rsvp_going_count || 0),
        rsvp_interested_count: Number(attrs.rsvp_interested_count || 0),
        rsvp_not_going_count: Number(attrs.rsvp_not_going_count || 0),
        created_at: classifiedRow.created_at,
      };

      return {
        event: mappedEvent as any,
        classifiedEvent: classifiedRow as any,
        lots: mappedLots as any[],
        linkedNews: null,
        partners: [],
        concessions: [],
        products: [],
        surveys: Array.isArray(attrs.surveys) ? attrs.surveys : [],
      };
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
  cursor?: string;
  category?: string;
  dateFrom?: string;
  dateTo?: string;
  city?: string;
  state?: string;
  searchQuery?: string;
} = {}) {
  const supabase = getServerClient();
  const limit = Math.min(Math.max(opts.limit ?? 50, 1), 100);

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

    if (opts.cursor) {
      query = query.gt("event_date", opts.cursor);
    }

    if (opts.category && opts.category !== "todos") {
      query = query.eq("category", opts.category);
    }

    if (opts.dateFrom) {
      query = query.gte("event_date", opts.dateFrom + "T00:00:00");
    }

    if (opts.dateTo) {
      query = query.lte("event_date", opts.dateTo + "T23:59:59");
    }

    if (opts.city && opts.city !== "todos" && opts.city !== "Todas" && opts.city !== "Global" && opts.city !== "all" && opts.city !== "Todas as Cidades") {
      query = query.ilike("city", `%${opts.city.trim()}%`);
    }

    if (opts.state) {
      query = query.eq("state", opts.state);
    }

    if (opts.searchQuery) {
      query = query.or(
        `title.ilike.%${opts.searchQuery}%,description.ilike.%${opts.searchQuery}%,location.ilike.%${opts.searchQuery}%,organizer_name.ilike.%${opts.searchQuery}%`,
      );
    }

    let classifiedsQuery = supabase
      .from("classifieds")
      .select(
        "id, store_id, profile_id, title, content, price_cents, location_name, sub_category, images, attributes, status, visibility, created_at",
      )
      .eq("category", "event")
      .eq("status", "active")
      .eq("visibility", "public")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (opts.searchQuery) {
      const q = opts.searchQuery;
      classifiedsQuery = classifiedsQuery.or(
        "title.ilike.%" + q + "%,content.ilike.%" + q + "%,location_name.ilike.%" + q + "%",
      );
    }

    const [{ data: events, error }, { data: classifiedEvents }] = await Promise.all([
      query,
      classifiedsQuery.then((res) => res, () => ({ data: [] as any[] })),
    ]);

    const baseEvents = !error && Array.isArray(events) ? [...events] : [];
    const todayKey = new Date().toISOString().split("T")[0];

    const mappedClassifieds = (Array.isArray(classifiedEvents) ? classifiedEvents : [])
      .map((c: any) => {
        const attrs = (c.attributes || {}) as Record<string, any>;
        const rawDateStr = attrs.event_date ? String(attrs.event_date) : "";
        const datePart = rawDateStr ? rawDateStr.split("T")[0] : "";
        const isoEventDate = rawDateStr
          ? rawDateStr.includes("T")
            ? rawDateStr
            : rawDateStr + "T" + (attrs.start_time || "19:00") + ":00"
          : c.created_at;

        const tiers = Array.isArray(attrs.ticket_tiers) ? attrs.ticket_tiers : [];
        const tierPrices = tiers
          .map((t: any) => Number(t.price_cents ?? t.price ?? 0))
          .filter((n: number) => !Number.isNaN(n) && n >= 0);

        const minPrice =
          tierPrices.length > 0
            ? Math.min(...tierPrices)
            : c.price_cents !== null && c.price_cents !== undefined
            ? Number(c.price_cents)
            : 0;
        const maxPrice =
          tierPrices.length > 0
            ? Math.max(...tierPrices)
            : minPrice;

        return {
          id: c.id,
          store_id: c.store_id || null,
          title: c.title,
          description: c.content || "",
          event_date: isoEventDate,
          end_date: attrs.end_date || null,
          location: attrs.venue_address || c.location_name || attrs.city || "",
          venue: attrs.venue_name || c.location_name || "",
          city: attrs.city || c.location_name || "",
          state: attrs.state || "",
          cover_image:
            attrs.banner_image_url ||
            (Array.isArray(c.images) && c.images[0]) ||
            null,
          status: "published",
          category: attrs.event_category || c.sub_category || "shows",
          is_free: minPrice === 0 && maxPrice === 0,
          is_external: false,
          external_source: null,
          is_external_ticket: false,
          external_ticket_url: null,
          organizer_name: attrs.host_name || "Organizador da Comunidade",
          price_min_cents: minPrice,
          price_max_cents: maxPrice,
          rsvp_going_count: Number(attrs.rsvp_going_count || 0),
          rsvp_interested_count: Number(attrs.rsvp_interested_count || 0),
          rsvp_not_going_count: Number(attrs.rsvp_not_going_count || 0),
          created_at: c.created_at,
          _datePart: datePart,
        };
      })
      .filter((ev: any) => {
        if (ev._datePart && ev._datePart < todayKey) return false;
        if (opts.dateFrom && ev._datePart && ev._datePart < opts.dateFrom) return false;
        if (opts.dateTo && ev._datePart && ev._datePart > opts.dateTo) return false;
        if (opts.category && opts.category !== "todos") {
          if (opts.category === "gratis" && !ev.is_free) return false;
          if (opts.category !== "gratis" && ev.category !== opts.category) return false;
        }
        if (
          opts.city &&
          opts.city !== "todos" &&
          opts.city !== "Todas" &&
          opts.city !== "Global" &&
          opts.city !== "all" &&
          opts.city !== "Todas as Cidades"
        ) {
          const needle = opts.city.trim().toLowerCase();
          const hay = ((ev.city || "") + " " + (ev.location || "")).toLowerCase();
          if (hay.trim() && !hay.includes(needle)) return false;
        }
        return true;
      });

    const seenIds = new Set(baseEvents.map((e: any) => e.id));
    for (const ce of mappedClassifieds) {
      if (!seenIds.has(ce.id)) {
        const { _datePart, ...cleanEv } = ce;
        baseEvents.push(cleanEv as any);
      }
    }

    baseEvents.sort((a: any, b: any) =>
      String(a.event_date || "").localeCompare(String(b.event_date || "")),
    );

    return baseEvents.slice(0, limit);
  } catch (err) {
    console.warn("[events] Erro ao listar eventos:", err);
  }

  return [];
}

export const getPublicEvents = createServerFn({ method: "GET" })
  .validator(
    z
      .object({
        limit: z.number().int().min(1).max(100).optional(),
        cursor: z.string().optional(),
        category: z.string().optional(),
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        searchQuery: z.string().optional(),
      })
      .optional(),
  )
  .handler(async ({ data }) => {
    applyServerFnEdgeCache(setResponseHeader, "PUBLIC_DYNAMIC", ["events:public"]);
    return _getPublicEvents(data || {});
  });

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

export const createEventSubpanelSchema = z.object({
  eventId: z.string().uuid(),
  name: z.string().min(2),
  panelType: z.enum(["bar", "foodtruck", "restaurant", "merchandise", "ticketing_box", "vip_lounge", "security_checkpoint", "other"]).default("bar"),
  templateTipo: z.enum(["bar_simples", "bar_comanda", "buffet_kg", "foodtruck", "bilheteria", "loja_merch"]).default("bar_simples"),
  managerName: z.string().optional(),
  managerContact: z.string().optional(),
  concessionPercentage: z.number().min(0).max(100).default(10),
  concessionFixedCents: z.number().int().min(0).default(0),
  allowOnlineOrders: z.boolean().default(true),
  allowCustomPrice: z.boolean().default(false),
  partnerId: z.string().uuid().optional().nullable(),
  config: z.record(z.unknown()).default({}),
  expireDays: z.number().int().min(1).default(30),
});

export const createEventSubpanel = createServerFn({ method: "POST" })
  .validator(createEventSubpanelSchema)
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager", "content"]);

    const generatedToken = `spk_${crypto.randomUUID().replace(/-/g, "")}`;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + data.expireDays);

    // 1. Inserir Subpainel
    const { data: subpanel, error } = await supabase
      .from("event_subpanels")
      .insert({
        store_id: identity.store_id,
        event_id: data.eventId,
        name: data.name,
        panel_type: data.panelType,
        template_tipo: data.templateTipo,
        manager_name: data.managerName,
        manager_contact: data.managerContact,
        concession_percentage: data.concessionPercentage,
        concession_fixed_cents: data.concessionFixedCents,
        allow_online_orders: data.allowOnlineOrders,
        allow_custom_price: data.allowCustomPrice,
        partner_id: data.partnerId,
        access_token: generatedToken,
        token_expires_at: expiresAt.toISOString(),
        config: data.config,
        is_active: true,
      })
      .select()
      .single();

    if (error || !subpanel) {
      throw new Error("Erro ao criar subpainel: " + (error?.message || "Registro não criado"));
    }

    // 2. Tentar RPC se houver
    try {
      const { data: token, error: tokenErr } = await supabase.rpc("generate_event_subpanel_token", {
        p_subpanel_id: subpanel.id,
        p_expire_days: data.expireDays,
      });
      if (!tokenErr && token) {
        subpanel.access_token = token;
      }
    } catch {
      // Mantém generatedToken
    }

    return { status: "success", subpanel };
  });

export const toggleEventSubpanelStatus = createServerFn({ method: "POST" })
  .validator(z.object({ subpanelId: z.string().uuid(), isActive: z.boolean() }))
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager"]);

    const { data: updated, error } = await supabase
      .from("event_subpanels")
      .update({ is_active: data.isActive, updated_at: new Date().toISOString() })
      .eq("id", data.subpanelId)
      .eq("store_id", identity.store_id)
      .select()
      .single();

    if (error) throw new Error("Erro ao alterar status do subpainel: " + error.message);
    return { status: "success", subpanel: updated };
  });

export const regenerateEventSubpanelToken = createServerFn({ method: "POST" })
  .validator(z.object({ subpanelId: z.string().uuid(), expireDays: z.number().int().min(1).default(30) }))
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager"]);

    const newToken = `spk_${crypto.randomUUID().replace(/-/g, "")}`;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + data.expireDays);

    const { data: updated, error } = await supabase
      .from("event_subpanels")
      .update({
        access_token: newToken,
        token_expires_at: expiresAt.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.subpanelId)
      .eq("store_id", identity.store_id)
      .select()
      .single();

    if (error) throw new Error("Erro ao regenerar token do subpainel: " + error.message);
    return { status: "success", subpanel: updated };
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

/**
 * Valida que o evento especificado pertence à loja ativa do usuário autenticado.
 */
async function assertEventAccess(supabase: any, eventId: string, storeId: string) {
  const { data: event } = await supabase
    .from("events")
    .select("id")
    .eq("id", eventId)
    .eq("store_id", storeId)
    .maybeSingle();

  if (!event) {
    throw new Error("Acesso negado: o evento não pertence a esta organização.");
  }
}

export const deleteEventTask = createServerFn({ method: "POST" })
  .validator(z.object({ taskId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager"]);

    // Valida pertencimento via eventos_tarefas_view
    const { data: task } = await supabase
      .from("eventos_tarefas_view")
      .select("id, evento_id")
      .eq("id", data.taskId)
      .maybeSingle();

    if (!task) throw new Error("Tarefa não encontrada.");
    await assertEventAccess(supabase, task.evento_id, identity.store_id);

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

    const { data: budget } = await supabase
      .from("eventos_orcamentos")
      .select("id, evento_id")
      .eq("id", data.budgetId)
      .maybeSingle();

    if (!budget) throw new Error("Orçamento não encontrado.");
    await assertEventAccess(supabase, budget.evento_id, identity.store_id);

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

    const { data: sector } = await supabase
      .from("eventos_setores")
      .select("id, evento_id")
      .eq("id", data.sectorId)
      .maybeSingle();

    if (!sector) throw new Error("Setor não encontrado.");
    await assertEventAccess(supabase, sector.evento_id, identity.store_id);

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

    const { data: partner } = await supabase
      .from("eventos_parceiros")
      .select("id, evento_id")
      .eq("id", data.partnerId)
      .maybeSingle();

    if (!partner) throw new Error("Parceiro não encontrado.");
    await assertEventAccess(supabase, partner.evento_id, identity.store_id);

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

    const { data: lineup } = await supabase
      .from("eventos_lineup")
      .select("id, evento_id")
      .eq("id", data.lineupId)
      .maybeSingle();

    if (!lineup) throw new Error("Item do lineup não encontrado.");
    await assertEventAccess(supabase, lineup.evento_id, identity.store_id);

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

    const { data: doc } = await supabase
      .from("eventos_documentos")
      .select("id, evento_id")
      .eq("id", data.documentId)
      .maybeSingle();

    if (!doc) throw new Error("Documento não encontrado.");
    await assertEventAccess(supabase, doc.evento_id, identity.store_id);

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
// CUSTOMER TICKETS — Área Pessoal /conta/ingressos & Ciclo de Vida WCTS-1
// ---------------------------------------------------------------------------

export {
  listCustomerEventTickets,
  getEventTicketDetails,
  purchaseEventTicketsInstant,
  transferEventTicket,
  cancelEventTicket,
  type CustomerEventTicketDTO,
} from "./event-tickets.functions";

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

// ---------------------------------------------------------------------------
// SUBPANEL ORDERS & CONCESSION REVENUE (ONDA 2 & INVARIANTE B.41)
export const createSubpanelOrderSchema = z.object({
  token: z.string().optional(),
  subpanelId: z.string().uuid().optional(),
  orderType: z.enum(["counter_pos", "mobile_attendee", "table_service"]).default("counter_pos"),
  tableOrLocation: z.string().optional().nullable(),
  customerName: z.string().optional().nullable(),
  customerPhone: z.string().optional().nullable(),
  paymentMethod: z.enum(["pix", "credit_card", "debit_card", "cash", "cashless_token"]).default("pix"),
  items: z.array(
    z.object({
      productId: z.string().uuid().optional().nullable(),
      productName: z.string().min(1),
      quantity: z.number().int().min(1).default(1),
      unitPriceCents: z.number().int().min(0),
      notes: z.string().optional().nullable(),
    })
  ).min(1),
});

export interface VerifiedSubpanelOrderItem {
  productId: string | null;
  productName: string;
  quantity: number;
  unitPriceCents: number;
  totalPriceCents: number;
  notes: string | null;
}

/**
 * Resolve e sela os preços unitários dos itens de pedido do subpainel contra o catálogo do banco.
 * Cumpre estritamente a Invariante B.41:
 * - Em pedidos `mobile_attendee`, exige `productId` válido no banco e ignora `unitPriceCents` do cliente.
 * - Em pedidos `counter_pos` / `table_service`, se `productId` existir no banco, usa o preço oficial salvo se `allowCustomPrice` estiver habilitado.
 * - Itens avulsos sem `productId` só são aceitos se `allowCustomPrice === true` e não forem de `mobile_attendee`.
 */
export function resolveVerifiedSubpanelOrderItems(
  clientItems: z.infer<typeof createSubpanelOrderSchema>["items"],
  dbProductsMap: Map<string, { id: string; nome: string; price_cents: number; ativo?: boolean }>,
  orderType: "counter_pos" | "mobile_attendee" | "table_service",
  allowCustomPrice: boolean
): VerifiedSubpanelOrderItem[] {
  return clientItems.map((item) => {
    const dbProd = item.productId ? dbProductsMap.get(item.productId) : undefined;

    if (orderType === "mobile_attendee") {
      if (!item.productId || !dbProd) {
        throw new Error(
          `Produto "${item.productName}" inválido ou indisponível para pedido mobile.`
        );
      }
      if (dbProd.ativo === false) {
        throw new Error(`O item "${dbProd.nome}" está esgotado no momento.`);
      }
      const officialPrice = Math.max(0, Number(dbProd.price_cents || 0));
      return {
        productId: dbProd.id,
        productName: dbProd.nome || item.productName,
        quantity: item.quantity,
        unitPriceCents: officialPrice,
        totalPriceCents: officialPrice * item.quantity,
        notes: item.notes || null,
      };
    }

    // Operação de balcão (counter_pos) ou mesa (table_service)
    if (dbProd) {
      const effectivePrice = allowCustomPrice
        ? Math.max(0, item.unitPriceCents)
        : Math.max(0, Number(dbProd.price_cents || 0));
      return {
        productId: dbProd.id,
        productName: dbProd.nome || item.productName,
        quantity: item.quantity,
        unitPriceCents: effectivePrice,
        totalPriceCents: effectivePrice * item.quantity,
        notes: item.notes || null,
      };
    }

    if (!allowCustomPrice) {
      throw new Error(
        `Item avulso "${item.productName}" bloqueado: este subpainel exige produtos cadastrados no catálogo oficial.`
      );
    }

    const customPrice = Math.max(0, item.unitPriceCents);
    return {
      productId: null,
      productName: item.productName,
      quantity: item.quantity,
      unitPriceCents: customPrice,
      totalPriceCents: customPrice * item.quantity,
      notes: item.notes || null,
    };
  });
}

export const createSubpanelOrder = createServerFn({ method: "POST" })
  .validator(createSubpanelOrderSchema)
  .handler(async ({ data }) => {
    const supabase = getServerClient();

    let subpanel: any = null;
    if (data.token) {
      const { data: sp, error: spErr } = await supabase
        .from("event_subpanels")
        .select("id, store_id, event_id, name, panel_type, concession_percentage, concession_fixed_cents, allow_online_orders, allow_custom_price, token_expires_at, config, is_active")
        .eq("access_token", data.token)
        .single();
      if (spErr || !sp) throw new Error("Subpainel inválido ou token expirado.");
      if (!sp.is_active) throw new Error("Este subpainel operacional está desativado.");
      if (sp.token_expires_at && new Date(sp.token_expires_at) < new Date()) {
        throw new Error("O token de operação deste subpainel expirou.");
      }
      subpanel = sp;
    } else if (data.subpanelId) {
      const { data: sp, error: spErr } = await supabase
        .from("event_subpanels")
        .select("id, store_id, event_id, name, panel_type, concession_percentage, concession_fixed_cents, allow_online_orders, allow_custom_price, token_expires_at, config, is_active")
        .eq("id", data.subpanelId)
        .single();
      if (spErr || !sp) throw new Error("Subpainel não encontrado.");
      if (!sp.is_active) throw new Error("Este subpainel operacional está desativado.");
      subpanel = sp;
    } else {
      throw new Error("Identificador do subpainel (token ou subpanelId) obrigatório.");
    }

    if (data.orderType === "mobile_attendee" && subpanel.allow_online_orders === false) {
      throw new Error("Este ponto de venda não está recebendo pedidos online no momento.");
    }

    // Buscar preços oficiais no banco para todos os produtos referenciados
    const productIds = Array.from(
      new Set(data.items.map((i) => i.productId).filter((id): id is string => Boolean(id)))
    );

    const dbProductsMap = new Map<
      string,
      { id: string; nome: string; price_cents: number; ativo?: boolean }
    >();

    if (productIds.length > 0) {
      const { data: dbProds } = await supabase
        .from("event_store_products")
        .select("id, nome, price_cents, ativo")
        .in("id", productIds)
        .eq("event_id", subpanel.event_id);

      for (const p of dbProds || []) {
        dbProductsMap.set(p.id, p);
      }
    }

    const allowCustomPrice = Boolean(
      subpanel.allow_custom_price || (subpanel.config as any)?.allow_custom_price
    );

    const verifiedItems = resolveVerifiedSubpanelOrderItems(
      data.items,
      dbProductsMap,
      data.orderType,
      allowCustomPrice
    );

    const subtotalCents = verifiedItems.reduce((acc, item) => acc + item.totalPriceCents, 0);

    const concessionPercentage = Number(subpanel.concession_percentage ?? 10);
    const concessionFixedCents = Number(subpanel.concession_fixed_cents ?? 0);
    const concessionFeeCents =
      Math.round((subtotalCents * concessionPercentage) / 100) + concessionFixedCents;
    const totalCents = subtotalCents;

    const prefix = subpanel.panel_type ? subpanel.panel_type.slice(0, 3).toUpperCase() : "PED";
    const randomBytes = new Uint32Array(1);
    crypto.getRandomValues(randomBytes);
    const randomSuffix = 1000 + (randomBytes[0] % 9000);
    const orderNumber = `${prefix}-${randomSuffix}`;

    const { data: order, error: orderErr } = await supabase
      .from("event_subpanel_orders")
      .insert({
        subpanel_id: subpanel.id,
        event_id: subpanel.event_id,
        store_id: subpanel.store_id,
        order_number: orderNumber,
        customer_name: data.customerName,
        customer_phone: data.customerPhone,
        order_type: data.orderType,
        table_or_location: data.tableOrLocation,
        status: data.orderType === "mobile_attendee" ? "pending" : "completed",
        payment_method: data.paymentMethod,
        subtotal_cents: subtotalCents,
        concession_fee_cents: concessionFeeCents,
        total_cents: totalCents,
      })
      .select()
      .single();

    if (orderErr || !order) {
      throw new Error(
        "Erro ao criar pedido do subpainel: " + (orderErr?.message || "Registro falhou")
      );
    }

    const orderItems = verifiedItems.map((i) => ({
      order_id: order.id,
      product_id: i.productId,
      product_name: i.productName,
      quantity: i.quantity,
      unit_price_cents: i.unitPriceCents,
      total_price_cents: i.totalPriceCents,
      notes: i.notes,
    }));

    const { error: itemsErr } = await supabase
      .from("event_subpanel_order_items")
      .insert(orderItems);

    if (itemsErr) {
      console.warn("Aviso ao salvar itens do pedido:", itemsErr);
    }

    return {
      success: true,
      order: {
        ...order,
        items: orderItems,
      },
    };
  });

export const listSubpanelOrders = createServerFn({ method: "GET" })
  .validator(
    z.object({
      token: z.string().optional(),
      subpanelId: z.string().uuid().optional(),
      eventId: z.string().uuid().optional(),
    })
  )
  .handler(async ({ data }) => {
    const supabase = getServerClient();

    let query = supabase
      .from("event_subpanel_orders")
      .select("*, items:event_subpanel_order_items(*)")
      .order("created_at", { ascending: false });

    if (data.token) {
      const { data: sp } = await supabase
        .from("event_subpanels")
        .select("id")
        .eq("access_token", data.token)
        .single();
      if (!sp) return [];
      query = query.eq("subpanel_id", sp.id);
    } else if (data.subpanelId) {
      query = query.eq("subpanel_id", data.subpanelId);
    } else if (data.eventId) {
      query = query.eq("event_id", data.eventId);
    }

    const { data: orders, error } = await query;
    if (error) throw new Error("Erro ao listar pedidos: " + error.message);
    return orders || [];
  });

export const listEventConcessionRevenue = createServerFn({ method: "GET" })
  .validator(z.object({ eventId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const supabase = getServerClient();

    const { data: orders, error } = await supabase
      .from("event_subpanel_orders")
      .select("id, subpanel_id, subtotal_cents, concession_fee_cents, total_cents, status, created_at, subpanel:event_subpanels(id, name, panel_type)")
      .eq("event_id", data.eventId)
      .neq("status", "cancelled");

    if (error) {
      console.warn("Aviso ao buscar faturamento de concessão:", error);
      return {
        totalOrders: 0,
        grossRevenueCents: 0,
        concessionFeeCents: 0,
        netPartnerRevenueCents: 0,
        bySubpanel: [],
      };
    }

    const list = orders || [];
    const totalOrders = list.length;
    const grossRevenueCents = list.reduce((acc, o) => acc + (o.total_cents || 0), 0);
    const concessionFeeCents = list.reduce((acc, o) => acc + (o.concession_fee_cents || 0), 0);
    const netPartnerRevenueCents = grossRevenueCents - concessionFeeCents;

    const map = new Map<string, { subpanelId: string; name: string; panelType: string; ordersCount: number; grossCents: number; feeCents: number }>();
    for (const o of list) {
      const spId = o.subpanel_id;
      const sp = (o as any).subpanel || { id: spId, name: "Ponto Operacional", panel_type: "geral" };
      if (!map.has(spId)) {
        map.set(spId, {
          subpanelId: spId,
          name: sp.name,
          panelType: sp.panel_type,
          ordersCount: 0,
          grossCents: 0,
          feeCents: 0,
        });
      }
      const item = map.get(spId)!;
      item.ordersCount += 1;
      item.grossCents += (o.total_cents || 0);
      item.feeCents += (o.concession_fee_cents || 0);
    }

    return {
      totalOrders,
      grossRevenueCents,
      concessionFeeCents,
      netPartnerRevenueCents,
      bySubpanel: Array.from(map.values()),
    };
  });

export const listSubpanelProducts = createServerFn({ method: "GET" })
  .validator(
    z.object({
      token: z.string().optional(),
      subpanelId: z.string().uuid().optional(),
      eventId: z.string().uuid().optional(),
    })
  )
  .handler(async ({ data }) => {
    const supabase = getServerClient();

    let targetSubpanelId = data.subpanelId;
    let targetEventId = data.eventId;

    if (data.token) {
      const { data: sp } = await supabase
        .from("event_subpanels")
        .select("id, event_id")
        .eq("access_token", data.token)
        .single();
      if (!sp) return [];
      targetSubpanelId = sp.id;
      targetEventId = sp.event_id;
    }

    let query = supabase
      .from("event_store_products")
      .select("*")
      .eq("ativo", true)
      .order("price_cents", { ascending: true });

    if (targetSubpanelId) {
      query = query.eq("subpanel_id", targetSubpanelId);
    } else if (targetEventId) {
      query = query.eq("event_id", targetEventId);
    }

    const { data: products, error } = await query;
    if (error) {
      console.warn("Aviso ao carregar produtos:", error);
      return [];
    }
    return products || [];
  });

// ---------------------------------------------------------------------------
// EVENT SURVEYS & SMART FORMS (ONDA 2 & ONDA 6)
// ---------------------------------------------------------------------------

export const listEventSurveys = createServerFn({ method: "GET" })
  .validator(z.object({ eventId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const supabase = getServerClient();

    const { data: surveys, error } = await supabase
      .from("event_surveys")
      .select("*, responses:event_survey_responses(count)")
      .eq("event_id", data.eventId)
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("Aviso ao listar pesquisas do evento:", error);
      return [];
    }
    return surveys || [];
  });

export const upsertEventSurveySchema = z.object({
  id: z.string().uuid().optional(),
  eventId: z.string().uuid(),
  title: z.string().min(3),
  description: z.string().optional().nullable(),
  targetAudience: z.enum(["attendees", "sponsors", "vendors", "staff"]).default("attendees"),
  formSchema: z.record(z.unknown()).default({}),
  startsAt: z.string().optional().nullable(),
  endsAt: z.string().optional().nullable(),
  requireGeofence: z.boolean().default(false),
  venueLatitude: z.number().optional().nullable(),
  venueLongitude: z.number().optional().nullable(),
  geoRadiusMeters: z.number().int().min(50).default(500),
  isActive: z.boolean().default(true),
});

export const upsertEventSurvey = createServerFn({ method: "POST" })
  .validator(upsertEventSurveySchema)
  .handler(async ({ data }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "manager"]);

    const payload = {
      event_id: data.eventId,
      store_id: identity.store_id,
      title: data.title,
      description: data.description,
      target_audience: data.targetAudience,
      form_schema: data.formSchema,
      starts_at: data.startsAt,
      ends_at: data.endsAt,
      require_geofence: data.requireGeofence,
      venue_latitude: data.venueLatitude,
      venue_longitude: data.venueLongitude,
      geo_radius_meters: data.geoRadiusMeters,
      is_active: data.isActive,
      updated_at: new Date().toISOString(),
    };

    if (data.id) {
      const { data: updated, error } = await supabase
        .from("event_surveys")
        .update(payload)
        .eq("id", data.id)
        .eq("store_id", identity.store_id)
        .select()
        .single();
      if (error) throw new Error("Erro ao atualizar pesquisa: " + error.message);
      return updated;
    } else {
      const { data: created, error } = await supabase
        .from("event_surveys")
        .insert(payload)
        .select()
        .single();
      if (error) throw new Error("Erro ao criar pesquisa: " + error.message);
      return created;
    }
  });

export const submitSurveyResponseSchema = z.object({
  surveyId: z.string().uuid(),
  eventId: z.string().uuid(),
  respondentName: z.string().optional().nullable(),
  respondentEmail: z.string().optional().nullable(),
  answers: z.record(z.unknown()),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
});

export const submitSurveyResponse = createServerFn({ method: "POST" })
  .validator(submitSurveyResponseSchema)
  .handler(async ({ data }) => {
    const supabase = getServerClient();

    const { data: survey, error: survErr } = await supabase
      .from("event_surveys")
      .select("*")
      .eq("id", data.surveyId)
      .eq("is_active", true)
      .single();

    if (survErr || !survey) throw new Error("Pesquisa não encontrada ou inativa.");

    const now = new Date();
    if (survey.starts_at && new Date(survey.starts_at) > now) {
      throw new Error("Esta pesquisa ainda não está aberta para respostas.");
    }
    if (survey.ends_at && new Date(survey.ends_at) < now) {
      throw new Error("Esta pesquisa já foi encerrada.");
    }

    let verifiedLocation = false;
    if (survey.require_geofence && survey.venue_latitude && survey.venue_longitude) {
      if (data.latitude != null && data.longitude != null) {
        const R = 6371e3;
        const phi1 = (survey.venue_latitude * Math.PI) / 180;
        const phi2 = (data.latitude * Math.PI) / 180;
        const deltaPhi = ((data.latitude - survey.venue_latitude) * Math.PI) / 180;
        const deltaLambda = ((data.longitude - survey.venue_longitude) * Math.PI) / 180;
        const a =
          Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
          Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c;

        const maxDist = survey.geo_radius_meters || 500;
        if (distance <= maxDist) {
          verifiedLocation = true;
        } else {
          throw new Error("Você precisa estar presente no local do evento para responder a esta pesquisa.");
        }
      } else {
        throw new Error("Localização necessária para responder a esta pesquisa.");
      }
    }

    const { data: response, error: respErr } = await supabase
      .from("event_survey_responses")
      .insert({
        survey_id: data.surveyId,
        event_id: data.eventId,
        respondent_name: data.respondentName,
        respondent_email: data.respondentEmail,
        answers: data.answers,
        verified_location: verifiedLocation,
      })
      .select()
      .single();

    if (respErr || !response) {
      throw new Error("Erro ao salvar resposta da pesquisa: " + (respErr?.message || "Erro desconhecido"));
    }

    await supabase
      .from("event_surveys")
      .update({ responses_count: (survey.responses_count || 0) + 1 })
      .eq("id", survey.id);

    return { success: true, responseId: response.id };
  });

export const getSurveyAnalytics = createServerFn({ method: "GET" })
  .validator(z.object({ surveyId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const supabase = getServerClient();

    const { data: responses, error } = await supabase
      .from("event_survey_responses")
      .select("answers, verified_location, submitted_at")
      .eq("survey_id", data.surveyId);

    if (error) throw new Error("Erro ao carregar métricas da pesquisa: " + error.message);

    const list = responses || [];
    const totalResponses = list.length;
    const verifiedLocationCount = list.filter((r) => r.verified_location).length;

    const fieldSummaries: Record<string, Record<string, number>> = {};
    for (const r of list) {
      const answers = (r.answers || {}) as Record<string, any>;
      for (const [key, value] of Object.entries(answers)) {
        if (!fieldSummaries[key]) fieldSummaries[key] = {};
        const strVal = String(value);
        fieldSummaries[key][strVal] = (fieldSummaries[key][strVal] || 0) + 1;
      }
    }

    return {
      totalResponses,
      verifiedLocationCount,
      fieldSummaries,
    };
  });
