import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { getServerIdentity, assertStoreAccess } from "@/lib/server-access";

// ---------------------------------------------------------------------------
// Types & Schemas
// ---------------------------------------------------------------------------

export type TicketCategory = "finance" | "system_bug" | "integration" | "tourism" | "account" | "other";
export type TicketPriority = "low" | "normal" | "high" | "urgent";
export type TicketStatus = "open" | "in_progress" | "resolved" | "closed";

export interface SupportTicketItem {
 id: string;
 store_id: string;
 ticket_number: number;
 ticket_code?: string;
 subject: string;
 category: TicketCategory;
 priority: TicketPriority;
 status: TicketStatus;
 customer_id?: string | null;
 customer_name?: string | null;
 customer_avatar_url?: string | null;
 customer_phone?: string | null;
 trace_hash?: string | null;
 entity_trace_hash?: string | null;
 sac_function_role?: string | null;
 assigned_to_name?: string | null;
 thread_id?: string | null;
 source_origin?: "operator_ticket" | "chat_sac" | "tourism_incident";
 order_id?: string | null;
 booking_id?: string | null;
 tour_id?: string | null;
 attachment_urls?: string[];
 sla_due_at?: string | null;
 sla_minutes?: number;
 timer_spent_seconds?: number;
 created_at: string;
 updated_at: string;
}

export interface CustomerSuccessSheetRowDTO {
 id: string;
 entity_type: "trip" | "order" | "contract" | "dossier";
 entity_id: string;
 entity_code: string;
 entity_trace_hash: string;
 title: string;
 subtitle: string;
 service_date?: string | null;
 total_cents: number;
 status: string;
 customer_id?: string | null;
 customer_name: string;
 customer_phone?: string | null;
 customer_avatar_url?: string | null;
 customer_trace_hash: string;
 thread_id?: string | null;
 trip_id?: string | null;
 pnr_locator?: string | null;
 operator_name?: string | null;
 assigned_agent_name?: string | null;
 steps: {
   docs_received: boolean;
   contract_signed: boolean;
   payment_verified: boolean;
   issuance_completed: boolean;
   vouchers_sent: boolean;
   onboarding_ready: boolean;
   cs_completed: boolean;
 };
 completed_steps_count: number;
 progress_percent: number;
 linked_tasks_count: number;
 open_tickets_count: number;
}

export interface SupportMessageItem {
 id: string;
 ticket_id: string;
 sender_profile_id?: string | null;
 is_staff_reply: boolean;
 message: string;
 attachment_url?: string | null;
 created_at: string;
}

export const CreateSupportTicketSchema = z.object({
 store_id: z.string().uuid(),
 subject: z.string().min(4, "Assunto deve ter pelo menos 4 caracteres"),
 category: z.enum(["finance", "system_bug", "integration", "tourism", "account", "other"]),
 priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
 initial_message: z.string().min(5, "Descreva o problema em detalhes"),
 attachment_url: z.string().optional().nullable(),
 attachment_urls: z.array(z.string()).default([]),
 customer_id: z.string().uuid().optional().nullable(),
 customer_name: z.string().optional().nullable(),
 order_id: z.string().uuid().optional().nullable(),
 booking_id: z.string().uuid().optional().nullable(),
 tour_id: z.string().uuid().optional().nullable(),
 sla_minutes: z.number().int().min(15).default(1440),
});

export const AddTicketMessageSchema = z.object({
 ticket_id: z.string().uuid(),
 message: z.string().min(2, "Mensagem não pode ser vazia"),
 attachment_url: z.string().optional().nullable(),
});

// ---------------------------------------------------------------------------
// Server Functions
// ---------------------------------------------------------------------------

export const listSupportTickets = createServerFn({ method: "GET" })
 .validator(
 z.object({
 store_id: z.string().uuid(),
 status: z.string().optional(),
 })
 )
 .handler(async ({ data }): Promise<SupportTicketItem[]> => {
 const identity = await getServerIdentity();
 assertStoreAccess(identity);

 const db = getServerClient();
 let query = db
 .from("operator_support_tickets")
 .select("*")
 .eq("store_id", data.store_id)
 .order("updated_at", { ascending: false });

 if (data.status && data.status !== "all") {
 query = query.eq("status", data.status);
 }

 const [opRes, chatSacRes, incRes] = await Promise.all([
   query,
   db
     .from("store_support_tickets")
     .select("*")
     .eq("store_id", data.store_id)
     .order("created_at", { ascending: false })
     .limit(50),
   db
     .from("tourism_incident_tickets")
     .select("*")
     .eq("store_id", data.store_id)
     .order("created_at", { ascending: false })
     .limit(50),
 ]);

 if (opRes.error) throw opRes.error;
 const opTickets = (opRes.data || []) as any[];
 const chatTickets = (chatSacRes.data || []) as any[];
 const incidents = (incRes.data || []) as any[];

 const customerIds = Array.from(
   new Set(
     [
       ...opTickets.map((t) => t.customer_id),
       ...chatTickets.map((t) => t.customer_id),
     ].filter((v): v is string => typeof v === "string" && v.length > 10)
   )
 );

 const avatarByCustomerId = new Map<string, { full_name?: string; avatar_url?: string; phone?: string }>();
 if (customerIds.length > 0) {
   const { data: profiles } = await db
     .from("profiles")
     .select("id, full_name, avatar_url, phone")
     .in("id", customerIds);
   for (const p of profiles || []) {
     avatarByCustomerId.set(p.id, p);
   }
 }

 const shortHash = (prefix: string, seed?: string | null) => {
   const cleaned = String(seed || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
   return `#${prefix}-${cleaned.slice(-4) || "0000"}`;
 };

 const enrichedOp: SupportTicketItem[] = opTickets.map((t: any, idx: number) => {
   const prof = t.customer_id ? avatarByCustomerId.get(t.customer_id) : undefined;
   const custName = t.customer_name || prof?.full_name || null;
   const custTrace = custName || t.customer_id ? shortHash("CLI", t.customer_id || custName) : null;
   const entTrace = t.tour_id
     ? shortHash("TRP", t.tour_id)
     : t.order_id
       ? shortHash("PED", t.order_id)
       : t.booking_id
         ? shortHash("AGD", t.booking_id)
         : null;
   const roleKey =
     t.category === "tourism"
       ? "operadora_cia"
       : t.category === "finance"
         ? "reembolso_financeiro"
         : t.priority === "urgent" || t.priority === "high"
           ? "sac_pepinos"
           : "customer_success";
   return {
     ...t,
     ticket_number: t.ticket_number || idx + 100,
     customer_name: custName,
     customer_avatar_url: prof?.avatar_url || null,
     customer_phone: prof?.phone || null,
     trace_hash: custTrace,
     entity_trace_hash: entTrace,
     sac_function_role: roleKey,
     source_origin: "operator_ticket",
   };
 });

 const enrichedChatSac: SupportTicketItem[] = chatTickets
   .filter((ct: any) => !enrichedOp.some((op) => op.subject.includes(ct.title)))
   .map((ct: any, idx: number) => {
     let meta: Record<string, any> = {};
     if (typeof ct.resolution_notes === "string" && ct.resolution_notes.startsWith("{")) {
       try {
         meta = JSON.parse(ct.resolution_notes);
       } catch {
         meta = {};
       }
     }
     const prof = ct.customer_id ? avatarByCustomerId.get(ct.customer_id) : undefined;
     const custName = meta.customer_name || prof?.full_name || "Cliente Chat";
     const custAvatar = meta.customer_avatar_url || prof?.avatar_url || null;
     const mappedStatus: TicketStatus =
       ct.status === "under_review" || ct.status === "action_required"
         ? "in_progress"
         : ct.status === "resolved"
           ? "resolved"
           : "open";
     return {
       id: ct.id,
       store_id: ct.store_id,
       ticket_number: 500 + idx,
       ticket_code: shortHash("SAC", ct.id),
       subject: ct.title,
       category: (meta.linked_entity_type === "trip" ? "tourism" : ct.ticket_type === "return_exchange" ? "finance" : "other") as TicketCategory,
       priority: (ct.priority || "normal") as TicketPriority,
       status: mappedStatus,
       customer_id: ct.customer_id || null,
       customer_name: custName,
       customer_avatar_url: custAvatar,
       trace_hash: meta.trace_hash || shortHash("CLI", ct.customer_id || custName),
       entity_trace_hash: meta.linked_entity_code || (meta.linked_entity_id ? shortHash("TRP", meta.linked_entity_id) : null),
       sac_function_role: meta.sac_function_role || "sac_pepinos",
       thread_id: ct.thread_id || null,
       source_origin: "chat_sac",
       created_at: ct.created_at,
       updated_at: ct.updated_at || ct.created_at,
     };
   });

 const enrichedIncidents: SupportTicketItem[] = incidents.map((inc: any, idx: number) => {
   const mappedStatus: TicketStatus =
     inc.status === "resolved" || inc.status === "closed"
       ? "resolved"
       : inc.status === "open"
         ? "open"
         : "in_progress";
   return {
     id: inc.id,
     store_id: inc.store_id,
     ticket_number: 800 + idx,
     ticket_code: shortHash("INC", inc.id),
     subject: `${inc.airline_code ? `[${inc.airline_code}] ` : ""}${inc.description || "Incidente de Viagem"}`,
     category: "tourism",
     priority: (inc.priority || "high") as TicketPriority,
     status: mappedStatus,
     customer_name: inc.passenger_name || "Passageiro em Viagem",
     customer_phone: inc.passenger_contact || null,
     trace_hash: shortHash("CLI", inc.passenger_name || inc.id),
     entity_trace_hash: inc.booking_reference ? `#PNR-${String(inc.booking_reference).toUpperCase()}` : shortHash("TRP", inc.id),
     sac_function_role: "sac_pepinos",
     source_origin: "tourism_incident",
     created_at: inc.created_at,
     updated_at: inc.updated_at || inc.created_at,
   };
 });

 const allMerged = [...enrichedOp, ...enrichedChatSac, ...enrichedIncidents].sort(
   (a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime()
 );

 if (data.status && data.status !== "all") {
   return allMerged.filter((t) => t.status === data.status);
 }
 return allMerged;
 });

export const getSupportTicketDetails = createServerFn({ method: "GET" })
 .validator(z.object({ ticket_id: z.string().uuid() }))
 .handler(async ({ data }) => {
 const identity = await getServerIdentity();
 assertStoreAccess(identity);

 const db = getServerClient();

 // 1. Ticket
 const { data: ticket, error: tErr } = await db
 .from("operator_support_tickets")
 .select("*")
 .eq("id", data.ticket_id)
 .single();

 if (tErr || !ticket) throw new Error("Chamado não encontrado.");

 // 2. Mensagens da Thread
 const { data: messages, error: mErr } = await db
 .from("operator_support_messages")
 .select("*")
 .eq("ticket_id", data.ticket_id)
 .order("created_at", { ascending: true });

 if (mErr) throw mErr;

 return {
 ticket: ticket as SupportTicketItem,
 messages: (messages || []) as SupportMessageItem[],
 };
 });

export const createSupportTicket = createServerFn({ method: "POST" })
 .validator(CreateSupportTicketSchema)
 .handler(async ({ data }) => {
 const identity = await getServerIdentity();
 assertStoreAccess(identity);
 if (data.store_id !== identity.store_id && !(identity.role === "platform_admin")) {
 throw new Error("Acesso não autorizado para esta organização.");
 }

 const db = getServerClient();

 // 1. Criar Ticket com Código Único e SLA
 const ticketCode = `TKT-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
 const slaDueAt = new Date(Date.now() + (data.sla_minutes || 1440) * 60 * 1000).toISOString();

 const { data: ticket, error: tErr } = await db
 .from("operator_support_tickets")
 .insert({
 store_id: data.store_id,
 created_by_profile_id: identity.id,
 ticket_code: ticketCode,
 subject: data.subject.trim(),
 category: data.category,
 priority: data.priority,
 status: "open",
 customer_id: data.customer_id || null,
 customer_name: data.customer_name?.trim() || null,
 order_id: data.order_id || null,
 booking_id: data.booking_id || null,
 tour_id: data.tour_id || null,
 attachment_urls: data.attachment_urls || (data.attachment_url ? [data.attachment_url] : []),
 sla_due_at: slaDueAt,
 sla_minutes: data.sla_minutes || 1440,
 })
 .select()
 .single();

 if (tErr) throw tErr;

 // 2. Criar Primeira Mensagem
 const { error: mErr } = await db
 .from("operator_support_messages")
 .insert({
 ticket_id: ticket.id,
 sender_profile_id: identity.id,
 is_staff_reply: false,
 message: data.initial_message.trim(),
 attachment_url: data.attachment_url || (data.attachment_urls?.[0] ?? null),
 });

 if (mErr) throw mErr;

 return ticket;
 });

export const addSupportTicketMessage = createServerFn({ method: "POST" })
 .validator(AddTicketMessageSchema)
 .handler(async ({ data }) => {
 const identity = await getServerIdentity();
 assertStoreAccess(identity);

 const db = getServerClient();

 const { data: ticket, error: tErr } = await db
 .from("operator_support_tickets")
 .select("store_id")
 .eq("id", data.ticket_id)
 .single();

 if (tErr || !ticket) throw new Error("Chamado não encontrado.");
 if (ticket.store_id !== identity.store_id && !(identity.role === "platform_admin")) {
 throw new Error("Acesso não autorizado a este chamado.");
 }

 const { data: msg, error: mErr } = await db
 .from("operator_support_messages")
 .insert({
 ticket_id: data.ticket_id,
 sender_profile_id: identity.id,
 is_staff_reply: false,
 message: data.message.trim(),
 attachment_url: data.attachment_url || null,
 })
 .select()
 .single();

 if (mErr) throw mErr;

 // Atualizar updated_at do ticket
 await db
 .from("operator_support_tickets")
 .update({ updated_at: new Date().toISOString() })
 .eq("id", data.ticket_id);

 return msg;
 });

export const updateSupportTicketStatus = createServerFn({ method: "POST" })
 .validator(
 z.object({
 ticket_id: z.string().uuid(),
 status: z.enum(["open", "in_progress", "resolved", "closed"]),
 })
 )
 .handler(async ({ data }) => {
 const identity = await getServerIdentity();
 assertStoreAccess(identity);

 const db = getServerClient();

 const { data: ticket } = await db
 .from("operator_support_tickets")
 .select("store_id")
 .eq("id", data.ticket_id)
 .maybeSingle();

 if (ticket) {
   if (ticket.store_id !== identity.store_id && !(identity.role === "platform_admin")) {
     throw new Error("Acesso não autorizado a este chamado.");
   }
   const { data: updated, error } = await db
     .from("operator_support_tickets")
     .update({
       status: data.status,
       updated_at: new Date().toISOString(),
     })
     .eq("id", data.ticket_id)
     .select()
     .single();
   if (error) throw error;
   return updated;
 }

 // Fallback para store_support_tickets (Chat SAC)
 const { data: chatTicket } = await db
   .from("store_support_tickets")
   .select("id, store_id")
   .eq("id", data.ticket_id)
   .maybeSingle();

 if (chatTicket) {
   const mappedChatStatus = data.status === "in_progress" ? "under_review" : data.status === "closed" ? "resolved" : data.status;
   const { data: updatedChat, error: cErr } = await db
     .from("store_support_tickets")
     .update({ status: mappedChatStatus })
     .eq("id", data.ticket_id)
     .select()
     .single();
   if (cErr) throw cErr;
   return updatedChat;
 }

 // Fallback para tourism_incident_tickets
 const { data: incTicket } = await db
   .from("tourism_incident_tickets")
   .select("id, store_id")
   .eq("id", data.ticket_id)
   .maybeSingle();

 if (incTicket) {
   const mappedIncStatus = data.status === "in_progress" ? "in_analysis" : data.status;
   const { data: updatedInc, error: iErr } = await db
     .from("tourism_incident_tickets")
     .update({ status: mappedIncStatus, updated_at: new Date().toISOString() })
     .eq("id", data.ticket_id)
     .select()
     .single();
   if (iErr) throw iErr;
   return updatedInc;
 }

 throw new Error("Chamado não encontrado.");
 });

// ---------------------------------------------------------------------------
// SUPERVISÃO, HANDOVER & GESTÃO DE SLAS DE SUPORTE
// ---------------------------------------------------------------------------

export const handoverSupportTicket = createServerFn({ method: "POST" })
 .validator(
 z.object({
 ticket_id: z.string().uuid(),
 target_operator_id: z.string().uuid(),
 reason: z.string().min(5, "Motivo da transferência é obrigatório."),
 internal_note: z.string().optional(),
 })
 )
 .handler(async ({ data }) => {
 const identity = await getServerIdentity();
 assertStoreAccess(identity, ["owner", "admin", "manager", "support"]);
 const db = getServerClient();

 const { data: ticket, error: tErr } = await db
 .from("operator_support_tickets")
 .select("store_id")
 .eq("id", data.ticket_id)
 .single();

 if (tErr || !ticket) throw new Error("Chamado não encontrado.");
 if (ticket.store_id !== identity.store_id && !(identity.role === "platform_admin")) {
 throw new Error("Acesso não autorizado a este chamado.");
 }

 // 1. Atualizar operador responsável
 const { data: updated, error } = await db
 .from("operator_support_tickets")
 .update({
 assigned_to: data.target_operator_id,
 updated_at: new Date().toISOString(),
 })
 .eq("id", data.ticket_id)
 .select()
 .single();

 if (error) throw new Error("Erro ao transferir chamado: " + error.message);

 // 2. Registrar mensagem de sistema / nota interna
 await db.from("operator_support_messages").insert({
 ticket_id: data.ticket_id,
 sender_profile_id: identity.id,
 is_staff_reply: true,
 message: `[TRANSFERÊNCIA DE ATENDIMENTO] Transferido por Supervisor. Motivo: ${data.reason}${data.internal_note ? ` | Nota: ${data.internal_note}` : ""}`,
 });

 return { status: "success", ticket: updated };
 });

export const escalateTicketSla = createServerFn({ method: "POST" })
 .validator(
 z.object({
 ticket_id: z.string().uuid(),
 escalation_reason: z.string().min(3),
 })
 )
 .handler(async ({ data }) => {
 const identity = await getServerIdentity();
 assertStoreAccess(identity, ["owner", "admin", "manager", "support"]);
 const db = getServerClient();

 const { data: ticket, error: tErr } = await db
 .from("operator_support_tickets")
 .select("store_id")
 .eq("id", data.ticket_id)
 .single();

 if (tErr || !ticket) throw new Error("Chamado não encontrado.");
 if (ticket.store_id !== identity.store_id && !(identity.role === "platform_admin")) {
 throw new Error("Acesso não autorizado a este chamado.");
 }

 const { data: updated, error } = await db
 .from("operator_support_tickets")
 .update({
 priority: "urgent",
 updated_at: new Date().toISOString(),
 })
 .eq("id", data.ticket_id)
 .select()
 .single();

 if (error) throw new Error("Erro ao escalar SLA do chamado: " + error.message);

 await db.from("operator_support_messages").insert({
 ticket_id: data.ticket_id,
 sender_profile_id: identity.id,
 is_staff_reply: true,
 message: `[ALERTA DE ESCALAÇÃO DE SLA] Prioridade elevada para URGENTE. Motivo: ${data.escalation_reason}`,
 });

 return { status: "success", ticket: updated };
 });

export const listSupervisionDashboardMetrics = createServerFn({ method: "GET" })
 .validator(z.object({ store_id: z.string().uuid() }))
 .handler(async ({ data }) => {
 const identity = await getServerIdentity();
 assertStoreAccess(identity, ["owner", "admin", "manager"]);
 if (data.store_id !== identity.store_id && !(identity.role === "platform_admin")) {
 throw new Error("Acesso não autorizado para esta organização.");
 }
 const db = getServerClient();

 const { data: tickets, error } = await db
 .from("operator_support_tickets")
 .select("id, status, priority, sla_due_at, created_at, updated_at")
 .eq("store_id", data.store_id);

 if (error) throw new Error("Erro ao calcular métricas de supervisão: " + error.message);

 const all = tickets || [];
 const openTickets = all.filter((t: any) => t.status === "open" || t.status === "in_progress");
 const now = Date.now();

 let withinSla = 0;
 let nearBreachSla = 0; // Menos de 60 min para estourar
 let breachedSla = 0;

 for (const t of openTickets as any[]) {
 if (!t.sla_due_at) {
 withinSla++;
 continue;
 }
 const due = new Date(t.sla_due_at).getTime();
 const diffMinutes = Math.floor((due - now) / 60000);

 if (diffMinutes < 0) {
 breachedSla++;
 } else if (diffMinutes <= 60) {
 nearBreachSla++;
 } else {
 withinSla++;
 }
 }

 return {
 totalTickets: all.length,
 activeTicketsCount: openTickets.length,
 resolvedTicketsCount: all.filter((t: any) => t.status === "resolved" || t.status === "closed").length,
 slaStatus: {
 withinSla,
 nearBreachSla,
 breachedSla,
 complianceRatePct: openTickets.length > 0 ? Math.round((withinSla / openTickets.length) * 100) : 100,
 },
 };
 });


// ── OPERAÇÕES CANÔNICAS DE ATENDIMENTO AO CLIENTE (UNIFICADAS) ──
export const listAdminTickets = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = getServerClient();
  const identity = await getServerIdentity();
  assertStoreAccess(identity, ["owner", "admin", "manager", "seller", "support"]);

  const { data: tickets, error } = await supabase
    .from("support_tickets")
    .select(
      "id, customer_id, subject, status, context_type, context_id, created_at, updated_at, profiles:customer_id(full_name, email, phone)",
    )
    .eq("store_id", identity.store_id)
    .order("updated_at", { ascending: false });

  if (error || !tickets) return [];

  return tickets.map((t: any) => ({
    ...t,
    customerName: t.profiles?.full_name || "Cliente",
    customerEmail: t.profiles?.email || "",
  }));
});

export const listCustomerTickets = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = getServerClient();
  const identity = await getServerIdentity();
  if (!identity.id) return [];

  let query = supabase
    .from("support_tickets")
    .select("id, store_id, subject, status, context_type, created_at, updated_at, stores(id, name, slug, logo_url)")
    .eq("customer_id", identity.id)
    .order("updated_at", { ascending: false });

  if (identity.store_id) {
    query = query.eq("store_id", identity.store_id);
  }

  const { data: tickets, error } = await query;
  if (error || !tickets) return [];

  return tickets.map((t: any) => ({
    ...t,
    storeName: t.stores?.name || "Loja",
    storeSlug: t.stores?.slug || "",
  }));
});

export const createCustomerTicket = createServerFn({ method: "POST" })
  .validator(
    z.object({
      storeId: z.string().uuid().optional(),
      subject: z.string().min(3, "Assunto deve ter pelo menos 3 caracteres"),
      message: z.string().min(5, "Descreva seu problema com pelo menos 5 caracteres"),
      contextType: z.enum(["order", "rma", "general"]).default("general"),
      contextId: z.string().uuid().optional().nullable(),
    }),
  )
  .handler(async ({ data: { storeId, subject, message, contextType, contextId } }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();

    if (!identity.id) throw new Error("Você precisa estar autenticado para abrir um chamado.");

    // O tenant precisa vir do payload explícito ou do contexto resolvido.
    // Nunca inferir uma loja arbitrária para um usuário autenticado.
    const effectiveStoreId = storeId || identity.store_id;
    if (!effectiveStoreId) {
      throw new Error("Loja de destino não identificada.");
    }

    // 1. Inserir ticket na tabela canônica support_tickets
    const { data: ticket, error: ticketErr } = await supabase
      .from("support_tickets")
      .insert({
        store_id: effectiveStoreId,
        customer_id: identity.id,
        subject: subject.trim(),
        status: "open",
        context_type: contextType,
        context_id: contextId || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (ticketErr || !ticket) {
      throw new Error("Erro ao criar chamado: " + (ticketErr?.message || "Tente novamente."));
    }

    // 2. Inserir primeira mensagem na tabela ticket_messages
    const { error: msgErr } = await supabase.from("ticket_messages").insert({
      ticket_id: ticket.id,
      sender_id: identity.id,
      content: message.trim(),
      is_internal_note: false,
      created_at: new Date().toISOString(),
    });

    if (msgErr) {
      console.warn("Chamado criado, mas houve aviso na primeira mensagem:", msgErr);
    }

    return ticket;
  });

export const getTicketThread = createServerFn({ method: "GET" })
  .validator(z.object({ ticketId: z.string().uuid() }))
  .handler(async ({ data: { ticketId } }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();

    // 1. Buscar o chamado
    const { data: ticket, error: tErr } = await supabase
      .from("support_tickets")
      .select("id, store_id, customer_id, subject, status, stores(name, logo_url)")
      .eq("id", ticketId)
      .single();

    if (tErr || !ticket) throw new Error("Chamado não encontrado");

    // Validação de acesso
    if (ticket.store_id === identity.store_id) {
      assertStoreAccess(identity, ["owner", "admin", "manager", "seller", "support"]);
    } else {
      if (ticket.customer_id !== identity.id) {
        throw new Error("Acesso negado ao chamado");
      }
    }

    // 2. Buscar mensagens
    const { data: messages, error: mErr } = await supabase
      .from("ticket_messages")
      .select("id, sender_id, content, is_internal_note, created_at, profiles:sender_id(full_name, avatar_url)")
      .eq("ticket_id", ticketId)
      .in("is_internal_note", ticket.store_id === identity.store_id ? [true, false] : [false])
      .order("created_at", { ascending: true });

    if (mErr) throw new Error("Erro ao carregar mensagens: " + mErr.message);

    return {
      ticketStatus: ticket.status,
      subject: ticket.subject,
      storeName: (ticket.stores as any)?.name || "Loja",
      messages: (messages || []).map((m: any) => ({
        id: m.id,
        content: m.content,
        isInternal: m.is_internal_note,
        createdAt: m.created_at,
        isMe: m.sender_id === identity.id,
        senderName: m.profiles?.full_name || (m.sender_id === ticket.customer_id ? "Você" : "Atendimento"),
      })),
    };
  });

export const sendTicketMessage = createServerFn({ method: "POST" })
  .validator(
    z.object({
      ticketId: z.string().uuid(),
      content: z.string().min(1, "Mensagem não pode ser vazia"),
      isInternal: z.boolean().optional().default(false),
    }),
  )
  .handler(async ({ data: { ticketId, content, isInternal } }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();

    if (!identity.id) throw new Error("Usuário não autenticado");

    // Fetch ticket context to update status correctly
    const { data: ticket } = await supabase
      .from("support_tickets")
      .select("id, store_id, customer_id, status")
      .eq("id", ticketId)
      .single();

    if (!ticket) throw new Error("Chamado não encontrado");

    const isCustomer = identity.id === ticket.customer_id;

    // Store employees only can send internal notes
    if (isInternal && isCustomer) {
      throw new Error("Clientes não podem enviar notas internas.");
    }

    const { error: insertErr } = await supabase.from("ticket_messages").insert({
      ticket_id: ticketId,
      sender_id: identity.id,
      content: content.trim(),
      is_internal_note: isInternal,
      created_at: new Date().toISOString(),
    });

    if (insertErr) throw new Error("Erro ao enviar mensagem: " + insertErr.message);

    // Update ticket status automatically based on who replied
    if (!isInternal) {
      const newStatus = isCustomer ? "open" : "pending";
      await supabase
        .from("support_tickets")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", ticketId);
    }

    return { status: "success" };
  });

export const closeCustomerTicket = createServerFn({ method: "POST" })
  .validator(z.object({ ticketId: z.string().uuid() }))
  .handler(async ({ data: { ticketId } }) => {
    const supabase = getServerClient();
    const identity = await getServerIdentity();

    const { data: ticket } = await supabase
      .from("support_tickets")
      .select("id, store_id, customer_id")
      .eq("id", ticketId)
      .single();

    if (!ticket) throw new Error("Chamado não encontrado");

    if (ticket.customer_id !== identity.id && ticket.store_id !== identity.store_id) {
      throw new Error("Acesso não autorizado.");
    }

    const { error } = await supabase
      .from("support_tickets")
      .update({ status: "closed", updated_at: new Date().toISOString() })
      .eq("id", ticketId);

    if (error) throw new Error("Erro ao encerrar chamado: " + error.message);
    return { success: true };
  });

export const listCustomerSuccessOnboardingSheet = createServerFn({ method: "GET" })
  .validator(
    z.object({
      store_id: z.string().uuid(),
      niche_filter: z.enum(["all", "trip", "order", "contract"]).optional(),
    })
  )
  .handler(async ({ data }): Promise<CustomerSuccessSheetRowDTO[]> => {
    const identity = await getServerIdentity();
    assertStoreAccess(identity);
    const db = getServerClient();

    const [tripsRes, ordersRes, contractsRes, threadsRes, tasksRes, ticketsRes] = await Promise.all([
      db
        .from("tourism_trips")
        .select("id, trip_number, title, destination_city, travel_start_date, total_cents, status, customer_id, client_name, client_whatsapp, operator_name, financial_details, created_at")
        .eq("store_id", data.store_id)
        .neq("status", "cancelled")
        .order("created_at", { ascending: false })
        .limit(50),
      db
        .from("orders")
        .select("id, total_cents, status, customer_id, created_at")
        .eq("store_id", data.store_id)
        .order("created_at", { ascending: false })
        .limit(30),
      db
        .from("contracts")
        .select("id, verification_code, title, status, customer_id, metadata, created_at")
        .eq("store_id", data.store_id)
        .order("created_at", { ascending: false })
        .limit(20),
      db
        .from("chat_threads")
        .select("id, customer_id, guest_name, guest_phone, entity_id, assigned_to_profile_id, metadata, updated_at")
        .eq("store_id", data.store_id)
        .order("updated_at", { ascending: false })
        .limit(60),
      db
        .from("workspace_tasks")
        .select("id, status, context_id, custom_fields, tags")
        .eq("store_id", data.store_id)
        .neq("status", "done")
        .neq("status", "archived")
        .limit(100),
      db
        .from("operator_support_tickets")
        .select("id, status, customer_id, tour_id, order_id")
        .eq("store_id", data.store_id)
        .in("status", ["open", "in_progress"])
        .limit(100),
    ]);

    const trips = (tripsRes.data || []) as any[];
    const orders = (ordersRes.data || []) as any[];
    const contracts = (contractsRes.data || []) as any[];
    const threads = (threadsRes.data || []) as any[];
    const activeTasks = (tasksRes.data || []) as any[];
    const openTickets = (ticketsRes.data || []) as any[];

    const customerIds = Array.from(
      new Set(
        [
          ...trips.map((t) => t.customer_id),
          ...orders.map((o) => o.customer_id),
          ...contracts.map((c) => c.customer_id),
          ...threads.map((th) => th.customer_id),
        ].filter((v): v is string => typeof v === "string" && v.length > 10)
      )
    );

    const profileMap = new Map<string, { full_name?: string; avatar_url?: string; phone?: string }>();
    if (customerIds.length > 0) {
      const { data: profiles } = await db
        .from("profiles")
        .select("id, full_name, avatar_url, phone")
        .in("id", customerIds);
      for (const p of profiles || []) {
        profileMap.set(p.id, p);
      }
    }

    const threadByCustomerId = new Map<string, any>();
    const threadByPhone = new Map<string, any>();
    for (const th of threads) {
      if (th.customer_id && !threadByCustomerId.has(th.customer_id)) {
        threadByCustomerId.set(th.customer_id, th);
      }
      const digits = String(th.guest_phone || th.entity_id || "").replace(/\D/g, "");
      if (digits.length >= 8 && !threadByPhone.has(digits)) {
        threadByPhone.set(digits, th);
      }
    }

    const shortHash = (prefix: string, seed?: string | null) => {
      const cleaned = String(seed || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
      return `#${prefix}-${cleaned.slice(-4) || "0000"}`;
    };

    const computeStepMetrics = (rawSteps: Record<string, any>, defaults: Partial<Record<string, boolean>> = {}) => {
      const steps = {
        docs_received: Boolean(rawSteps.docs_received ?? defaults.docs_received ?? false),
        contract_signed: Boolean(rawSteps.contract_signed ?? defaults.contract_signed ?? false),
        payment_verified: Boolean(rawSteps.payment_verified ?? defaults.payment_verified ?? false),
        issuance_completed: Boolean(rawSteps.issuance_completed ?? defaults.issuance_completed ?? false),
        vouchers_sent: Boolean(rawSteps.vouchers_sent ?? defaults.vouchers_sent ?? false),
        onboarding_ready: Boolean(rawSteps.onboarding_ready ?? defaults.onboarding_ready ?? false),
        cs_completed: Boolean(rawSteps.cs_completed ?? defaults.cs_completed ?? false),
      };
      const completedCount = Object.values(steps).filter(Boolean).length;
      const progressPercent = Math.round((completedCount / 7) * 100);
      return { steps, completedCount, progressPercent };
    };

    const rows: CustomerSuccessSheetRowDTO[] = [];

    // 1. Viagens confirmadas / em andamento (tourism_trips)
    for (const tr of trips) {
      const prof = tr.customer_id ? profileMap.get(tr.customer_id) : undefined;
      const digits = String(tr.client_whatsapp || prof?.phone || "").replace(/\D/g, "");
      const linkedThread = (tr.customer_id && threadByCustomerId.get(tr.customer_id)) || (digits ? threadByPhone.get(digits) : null);
      const threadMeta = (linkedThread?.metadata || {}) as Record<string, any>;
      const tripFin = (tr.financial_details || {}) as Record<string, any>;
      const mergedRawSteps = {
        ...(tripFin.cs_onboarding_steps || {}),
        ...(threadMeta.cs_onboarding_steps || {}),
      };
      const dossiers = Array.isArray(threadMeta.travel_dossiers) ? threadMeta.travel_dossiers : [];
      const primaryPnr = dossiers[0]?.pnrLocator || tripFin.pnr_locator || null;

      const { steps, completedCount, progressPercent } = computeStepMetrics(mergedRawSteps, {
        issuance_completed: tr.status === "confirmed" || tr.status === "in_progress" || tr.status === "completed",
        cs_completed: tr.status === "completed",
      });

      const custName = tr.client_name || prof?.full_name || linkedThread?.guest_name || "Passageiro";
      const custAvatar = threadMeta.customer_profile_override?.avatar_url || prof?.avatar_url || threadMeta.avatar_url || null;
      const custTrace = shortHash("CLI", tr.customer_id || digits || custName);
      const entTrace = tr.trip_number ? `#${String(tr.trip_number).toUpperCase()}` : shortHash("TRP", tr.id);

      const tasksCount = activeTasks.filter((tsk) => {
        const cf = (tsk.custom_fields || {}) as Record<string, any>;
        return (
          (tr.customer_id && (tsk.context_id === tr.customer_id || cf.customer_id === tr.customer_id)) ||
          cf.entity_id === tr.id ||
          (Array.isArray(tsk.tags) && tsk.tags.includes(custTrace))
        );
      }).length;

      const ticketsCount = openTickets.filter(
        (tk) => tk.tour_id === tr.id || (tr.customer_id && tk.customer_id === tr.customer_id)
      ).length;

      rows.push({
        id: `trip-${tr.id}`,
        entity_type: "trip",
        entity_id: tr.id,
        entity_code: tr.trip_number || `TRP-${tr.id.slice(0, 4).toUpperCase()}`,
        entity_trace_hash: entTrace,
        title: tr.destination_city || tr.title || "Roteiro de Viagem",
        subtitle: [tr.operator_name, primaryPnr ? `PNR ${primaryPnr}` : null].filter(Boolean).join(" · ") || "Pacote Turístico",
        service_date: tr.travel_start_date || tr.created_at,
        total_cents: Number(tr.total_cents || 0),
        status: tr.status,
        customer_id: tr.customer_id || null,
        customer_name: custName,
        customer_phone: tr.client_whatsapp || prof?.phone || linkedThread?.guest_phone || null,
        customer_avatar_url: custAvatar,
        customer_trace_hash: custTrace,
        thread_id: linkedThread?.id || null,
        trip_id: tr.id,
        pnr_locator: primaryPnr,
        operator_name: tr.operator_name || dossiers[0]?.operatorName || null,
        steps,
        completed_steps_count: completedCount,
        progress_percent: progressPercent,
        linked_tasks_count: tasksCount,
        open_tickets_count: ticketsCount,
      });
    }

    // 2. Dossiês de Viagem / PNR registrados diretamente nas conversas (sem tourism_trips duplicado)
    for (const th of threads) {
      const meta = (th.metadata || {}) as Record<string, any>;
      const dossiers = Array.isArray(meta.travel_dossiers) ? meta.travel_dossiers : [];
      if (dossiers.length === 0) continue;
      if (th.customer_id && rows.some((r) => r.customer_id === th.customer_id && r.entity_type === "trip")) continue;

      const d = dossiers[0];
      const prof = th.customer_id ? profileMap.get(th.customer_id) : undefined;
      const custName = meta.customer_profile_override?.full_name || prof?.full_name || th.guest_name || th.guest_phone || "Cliente em Atendimento";
      const custAvatar = meta.customer_profile_override?.avatar_url || prof?.avatar_url || meta.avatar_url || null;
      const custTrace = shortHash("CLI", th.customer_id || th.guest_phone || th.id);
      const entTrace = d.pnrLocator ? `#PNR-${String(d.pnrLocator).toUpperCase()}` : shortHash("TRP", d.id || th.id);

      const { steps, completedCount, progressPercent } = computeStepMetrics(meta.cs_onboarding_steps || {}, {
        issuance_completed: Boolean(d.pnrLocator || d.operatorPackageId),
      });

      const tasksCount = activeTasks.filter((tsk) => {
        const cf = (tsk.custom_fields || {}) as Record<string, any>;
        return cf.thread_id === th.id || (Array.isArray(tsk.tags) && tsk.tags.includes(custTrace));
      }).length;

      rows.push({
        id: `dossier-${th.id}`,
        entity_type: "dossier",
        entity_id: String(d.id || th.id),
        entity_code: d.pnrLocator || d.operatorPackageId || `PNR-${th.id.slice(0, 4).toUpperCase()}`,
        entity_trace_hash: entTrace,
        title: d.destination || "Viagem / Aéreo em Atendimento",
        subtitle: [d.operatorName, d.airlineName, d.pnrLocator ? `PNR ${d.pnrLocator}` : null].filter(Boolean).join(" · ") || "Dossiê PNR",
        service_date: d.departureDate || th.updated_at,
        total_cents: 0,
        status: d.flightStatus || "confirmed",
        customer_id: th.customer_id || null,
        customer_name: custName,
        customer_phone: th.guest_phone || prof?.phone || null,
        customer_avatar_url: custAvatar,
        customer_trace_hash: custTrace,
        thread_id: th.id,
        trip_id: null,
        pnr_locator: d.pnrLocator || null,
        operator_name: d.operatorName || null,
        steps,
        completed_steps_count: completedCount,
        progress_percent: progressPercent,
        linked_tasks_count: tasksCount,
        open_tickets_count: 0,
      });
    }

    // 3. Pedidos / Compras (Multi-nicho E-commerce & Serviços)
    for (const ord of orders) {
      const prof = ord.customer_id ? profileMap.get(ord.customer_id) : undefined;
      const linkedThread = ord.customer_id ? threadByCustomerId.get(ord.customer_id) : null;
      const threadMeta = (linkedThread?.metadata || {}) as Record<string, any>;
      const custName = prof?.full_name || linkedThread?.guest_name || "Cliente Pedido";
      const custAvatar = threadMeta.customer_profile_override?.avatar_url || prof?.avatar_url || threadMeta.avatar_url || null;
      const custTrace = shortHash("CLI", ord.customer_id || ord.id);
      const entTrace = shortHash("PED", ord.id);
      const isPaid = ["paid", "completed", "delivered"].includes(String(ord.status));
      const isDelivered = ["completed", "delivered"].includes(String(ord.status));

      const { steps, completedCount, progressPercent } = computeStepMetrics(threadMeta.cs_onboarding_steps || {}, {
        docs_received: true,
        contract_signed: true,
        payment_verified: isPaid,
        issuance_completed: isPaid,
        vouchers_sent: isDelivered,
        onboarding_ready: isDelivered,
        cs_completed: ord.status === "completed",
      });

      const tasksCount = activeTasks.filter((tsk) => {
        const cf = (tsk.custom_fields || {}) as Record<string, any>;
        return tsk.context_id === ord.id || cf.entity_id === ord.id || (ord.customer_id && cf.customer_id === ord.customer_id);
      }).length;

      rows.push({
        id: `order-${ord.id}`,
        entity_type: "order",
        entity_id: ord.id,
        entity_code: `PED-${ord.id.slice(0, 6).toUpperCase()}`,
        entity_trace_hash: entTrace,
        title: `Pedido #${ord.id.slice(0, 6).toUpperCase()}`,
        subtitle: `Compra / Pedido · Status: ${ord.status}`,
        service_date: ord.created_at,
        total_cents: Number(ord.total_cents || 0),
        status: ord.status,
        customer_id: ord.customer_id || null,
        customer_name: custName,
        customer_phone: prof?.phone || linkedThread?.guest_phone || null,
        customer_avatar_url: custAvatar,
        customer_trace_hash: custTrace,
        thread_id: linkedThread?.id || null,
        trip_id: null,
        steps,
        completed_steps_count: completedCount,
        progress_percent: progressPercent,
        linked_tasks_count: tasksCount,
        open_tickets_count: openTickets.filter((tk) => tk.order_id === ord.id).length,
      });
    }

    // 4. Contratos / Agendamentos (Multi-nicho)
    for (const ctr of contracts) {
      if (ctr.customer_id && rows.some((r) => r.customer_id === ctr.customer_id && r.entity_type === "trip")) continue;
      const prof = ctr.customer_id ? profileMap.get(ctr.customer_id) : undefined;
      const linkedThread = ctr.customer_id ? threadByCustomerId.get(ctr.customer_id) : null;
      const threadMeta = (linkedThread?.metadata || {}) as Record<string, any>;
      const custName = prof?.full_name || linkedThread?.guest_name || (ctr.metadata as any)?.customer_name || "Cliente Contrato";
      const custAvatar = threadMeta.customer_profile_override?.avatar_url || prof?.avatar_url || threadMeta.avatar_url || null;
      const custTrace = shortHash("CLI", ctr.customer_id || ctr.id);
      const entTrace = ctr.verification_code ? `#CTR-${String(ctr.verification_code).slice(-4).toUpperCase()}` : shortHash("CTR", ctr.id);
      const isSigned = ctr.status === "signed" || ctr.status === "active" || ctr.status === "completed";

      const { steps, completedCount, progressPercent } = computeStepMetrics(threadMeta.cs_onboarding_steps || {}, {
        docs_received: true,
        contract_signed: isSigned,
      });

      rows.push({
        id: `contract-${ctr.id}`,
        entity_type: "contract",
        entity_id: ctr.id,
        entity_code: ctr.verification_code || `CTR-${ctr.id.slice(0, 5).toUpperCase()}`,
        entity_trace_hash: entTrace,
        title: ctr.title || "Contrato de Prestação de Serviço",
        subtitle: `Documento Contratual · ${isSigned ? "Assinado" : "Aguardando Assinatura"}`,
        service_date: ctr.created_at,
        total_cents: Number((ctr.metadata as any)?.total_amount_cents || 0),
        status: ctr.status,
        customer_id: ctr.customer_id || null,
        customer_name: custName,
        customer_phone: prof?.phone || linkedThread?.guest_phone || null,
        customer_avatar_url: custAvatar,
        customer_trace_hash: custTrace,
        thread_id: linkedThread?.id || null,
        trip_id: null,
        steps,
        completed_steps_count: completedCount,
        progress_percent: progressPercent,
        linked_tasks_count: 0,
        open_tickets_count: 0,
      });
    }

    if (data.niche_filter && data.niche_filter !== "all") {
      return rows.filter((r) => (data.niche_filter === "trip" ? r.entity_type === "trip" || r.entity_type === "dossier" : r.entity_type === data.niche_filter));
    }
    return rows;
  });

// ---------------------------------------------------------------------------
// Canonical Aliases (F18)
// ---------------------------------------------------------------------------

export const listSupportTicketsFn = listSupportTickets;
export const getSupportTicketDetailsFn = getSupportTicketDetails;
export const createSupportTicketFn = createSupportTicket;
export const addSupportTicketMessageFn = addSupportTicketMessage;
export const updateSupportTicketStatusFn = updateSupportTicketStatus;
