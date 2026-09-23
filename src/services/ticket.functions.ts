import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { getServerIdentity, assertStoreAccess } from "@/lib/server-access";
import { logAuditAction } from "./audit.functions";

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

    // Derivar store_id
    const targetStoreId = storeId || identity.store_id;
    if (!targetStoreId) {
      // Se não especificado, buscar a primeira loja disponível ou loja ativa
      const { data: anyStore } = await supabase.from("stores").select("id").limit(1).single();
      if (!anyStore) throw new Error("Loja de destino não encontrada.");
    }

    const effectiveStoreId = targetStoreId || (await supabase.from("stores").select("id").limit(1).single()).data?.id;

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
