import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient } from "@/lib/supabase";
import { assertStoreAccess, getSSRClient, getServerIdentity, STAFF_ROLES } from "@/lib/server-access";

export const sendCustomerMessageSchema = z.object({
  threadId: z.string().uuid(),
  message: z.string().min(1),
  message_type: z
    .enum([
      "text",
      "order_card",
      "rma_ticket",
      "system_event",
      "image_attachment",
      "structured_blocks",
      "sticker",
      "image",
      "video",
      "audio",
      "document",
      "internal_note",
    ])
    .default("text"),
  attachments: z.array(z.string()).default([]),
  payload: z.record(z.any()).default({}),
});

export const createRmaTicketSchema = z.object({
  threadId: z.string().uuid(),
  store_id: z.string().uuid(),
  order_id: z.string().uuid().optional(),
  ticket_type: z.enum([
    "return_exchange",
    "missing_item",
    "defect_complaint",
    "delivery_issue",
    "billing_pix",
    "other",
  ]),
  title: z.string().min(3, "Título do chamado muito curto"),
  description: z.string().min(10, "Descreva o problema detalhadamente"),
  photo_urls: z.array(z.string().url()).default([]),
});

export const updateTicketStatusSchema = z.object({
  ticketId: z.string().uuid(),
  status: z.enum(["open", "under_review", "action_required", "refunded", "resolved", "rejected"]),
  resolution_notes: z.string().optional(),
  refund_amount_cents: z.number().int().nonnegative().optional(),
});

/**
 * Cliente envia mensagem segura
 */
export const sendCustomerChatMessage = createServerFn({ method: "POST" })
  .validator(sendCustomerMessageSchema)
  .handler(async ({ data: input }): Promise<Record<string, any>> => {
    try {
      const ssrClient = await getSSRClient();
      const {
        data: { user },
      } = await ssrClient.auth.getUser();

      const db = getServerClient();

      const { data: thread } = await db
        .from("chat_threads")
        .select("id, customer_id")
        .eq("id", input.threadId)
        .single();

      if (!thread) throw new Error("Conversa não encontrada.");
      if (!user || !thread.customer_id || thread.customer_id !== user.id) {
        throw new Error("Acesso não autorizado.");
      }

      const { data: msg, error } = await db
        .from("chat_messages")
        .insert({
          thread_id: input.threadId,
          message: input.message,
          message_type: input.message_type,
          attachments: input.attachments,
          payload: input.payload,
          is_staff_reply: false,
          sender_id: user ? user.id : null,
          sender_profile_id: user ? user.id : null,
        })
        .select()
        .single();

      if (error) throw error;

      await db
        .from("chat_threads")
        .update({
          last_message_text: input.message,
          last_message_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          status: "open",
        })
        .eq("id", input.threadId);

      return msg;
    } catch (e: any) {
      console.error("[chat] sendCustomerChatMessage error:", e);
      throw new Error(e.message || "Erro ao enviar mensagem.");
    }
  });

/**
 * Busca unificada de contatos (membros da rede e lojas/negócios locais) para iniciar nova conversa
 */
export const searchChatContacts = createServerFn({ method: "GET" })
  .validator(
    z.object({
      query: z.string().default(""),
      limit: z.number().int().min(1).max(30).default(15),
    }),
  )
  .handler(
    async ({
      data,
    }): Promise<{
      contacts: Array<{
        id: string;
        name: string;
        type: "person";
        avatar_url?: string | null;
        subtitle?: string;
      }>;
      stores: Array<{
        id: string;
        name: string;
        type: "store";
        avatar_url?: string | null;
        subtitle?: string;
        slug?: string;
      }>;
    }> => {
      try {
        const q = data.query.trim();
      const db = getServerClient();
      const ssrClient = await getSSRClient();
      const {
        data: { user },
      } = await ssrClient.auth.getUser();

      let profilesQuery = db.from("profiles").select("id, full_name, avatar_url, bio, city").limit(data.limit);

      if (user) {
        profilesQuery = profilesQuery.neq("id", user.id);
      }

      if (q.length > 0) {
        profilesQuery = profilesQuery.ilike("full_name", `%${q}%`);
      }

      let storesQuery = db.from("stores").select("id, name, slug, settings, city").eq("is_active", true).limit(data.limit);

      if (q.length > 0) {
        storesQuery = storesQuery.or(`name.ilike.%${q}%,city.ilike.%${q}%`);
      }

      const [profilesRes, storesRes] = await Promise.all([profilesQuery, storesQuery]);

      const contacts = (profilesRes.data || []).map((p: any) => ({
        id: p.id,
        name: p.full_name || "Membro da Comunidade",
        type: "person" as const,
        avatar_url: p.avatar_url,
        subtitle: p.city ? `Membro em ${p.city}` : "Membro da Comunidade",
      }));

      const stores = (storesRes.data || []).map((s: any) => {
        const settings = s.settings || {};
        return {
          id: s.id,
          name: s.name,
          type: "store" as const,
          avatar_url: settings.logoUrl || settings.logo_url || null,
          subtitle: settings.category || settings.segment || "Loja & Negócio Local",
          slug: s.slug,
        };
      });

      return {
        contacts,
        stores,
      };
    } catch (err) {
      console.error("[chat] searchChatContacts error:", err);
      return { contacts: [], stores: [] };
    }
  });

/**
 * Lista todas as conversas do cliente (lojas e membros P2P)
 */
export const listCustomerChatThreads = createServerFn({ method: "GET" }).handler(
  async (): Promise<Array<Record<string, any>>> => {
  try {
    const ssrClient = await getSSRClient();
    const {
      data: { user },
    } = await ssrClient.auth.getUser();
    if (!user) throw new Error("Não autenticado");

    const db = getServerClient();
    const { data, error } = await db
      .from("chat_threads")
      .select(
        `
        id, store_id, status, subject, department, updated_at, created_at, order_id, thread_type, context_type, metadata, customer_id, recipient_profile_id,
        store:stores(id, name, slug, settings),
        chat_messages(id, message, created_at, is_staff_reply)
      `,
      )
      .or(`customer_id.eq.${user.id},recipient_profile_id.eq.${user.id}`)
      .not("thread_type", "in", "(ai_assistant,copilot,project)")
      .order("updated_at", { ascending: false });

    if (error) throw error;

    // ISOLAMENTO ZERO-TRUST: Garantir que nenhuma thread de IA apareça no inbox humano/comercial
    const sanitizedData = (data || []).filter((t: any) => {
      if (t.thread_type === "ai_assistant" || t.thread_type === "copilot" || t.thread_type === "project") return false;
      if (t.context_type === "ai_assistant" || t.context_type === "copilot" || t.context_type === "project") return false;
      if (t.metadata?.is_copilot || t.metadata?.is_civil || t.metadata?.agent_mode) return false;
      return true;
    });

    // Se houver conversas P2P, busca perfis participantes
    const p2pProfileIds = new Set<string>();
    for (const t of sanitizedData) {
      if (t.thread_type === "direct_p2p" || t.recipient_profile_id) {
        const otherId = t.customer_id === user.id ? t.recipient_profile_id : t.customer_id;
        if (otherId) p2pProfileIds.add(otherId);
      }
    }

    const profilesMap = new Map<string, any>();
    if (p2pProfileIds.size > 0) {
      const { data: profilesList } = await db
        .from("profiles")
        .select("id, full_name, avatar_url, city")
        .in("id", Array.from(p2pProfileIds));
      for (const p of profilesList || []) {
        profilesMap.set(p.id, p);
      }
    }

    return sanitizedData.map((thread: any) => {
      const messages = thread.chat_messages || [];
      messages.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      const lastMsg = messages[0];
      const storeSettings = (thread.store?.settings as any) || {};
      const mappedStore = thread.store
        ? {
            ...thread.store,
            logo_url: storeSettings.logoUrl || storeSettings.logo_url || null,
          }
        : null;

      const isP2P = thread.thread_type === "direct_p2p" || (!thread.store_id && thread.recipient_profile_id);
      let peerProfile: any = null;
      if (isP2P) {
        const otherId = thread.customer_id === user.id ? thread.recipient_profile_id : thread.customer_id;
        peerProfile = profilesMap.get(otherId) || { full_name: "Membro", avatar_url: null };
      }

      return {
        ...thread,
        is_p2p: isP2P,
        peer_profile: peerProfile,
        store: mappedStore,
        last_message: lastMsg ? lastMsg.message : "Conversa iniciada",
        last_message_at: lastMsg ? lastMsg.created_at : thread.created_at,
        unread_count: messages.filter((m: any) => m.is_staff_reply).length,
        is_last_reply_staff: lastMsg ? lastMsg.is_staff_reply : false,
      };
    });
  } catch (e: any) {
    console.error("[chat] listCustomerChatThreads error:", e);
    throw new Error(e.message || "Erro ao listar conversas.");
  }
});

/**
 * Inicia ou localiza thread unificada (cliente-loja ou direta P2P)
 */
export const startCustomerChatThread = createServerFn({ method: "POST" })
  .validator(
    z.object({
      storeId: z.string().uuid().optional(),
      recipientProfileId: z.string().uuid().optional(),
      orderId: z.string().uuid().optional(),
      subject: z.string().min(1).default("Conversa"),
      initialMessage: z.string().min(1),
      department: z.string().default("geral"),
    }),
  )
  .handler(async ({ data: input }): Promise<{ threadId: string }> => {
    try {
      const ssrClient = await getSSRClient();
      const {
        data: { user },
      } = await ssrClient.auth.getUser();
      const db = getServerClient();

      if (!input.storeId && !input.recipientProfileId) {
        throw new Error("Selecione uma loja ou membro para conversar.");
      }

      let profile: any = null;
      if (user) {
        const { data: p } = await db.from("profiles").select("full_name, avatar_url").eq("id", user.id).maybeSingle();
        profile = p ? { ...p, email: user.email } : null;
      }

      let threadId: string | undefined;

      if (input.recipientProfileId) {
        if (!user) throw new Error("Faça login para conversar com membros.");
        const { data: existingP2P } = await db
          .from("chat_threads")
          .select("id")
          .or(
            `and(customer_id.eq.${user.id},recipient_profile_id.eq.${input.recipientProfileId}),and(customer_id.eq.${input.recipientProfileId},recipient_profile_id.eq.${user.id})`,
          )
          .maybeSingle();

        if (existingP2P) {
          threadId = existingP2P.id;
        } else {
          const { data: newP2P, error: p2pErr } = await db
            .from("chat_threads")
            .insert({
              store_id: null,
              customer_id: user.id,
              recipient_profile_id: input.recipientProfileId,
              thread_type: "direct_p2p",
              guest_name: profile?.full_name || "Membro",
              guest_email: profile?.email || null,
              subject: input.subject,
              status: "open",
            })
            .select()
            .single();

          if (p2pErr) throw p2pErr;
          threadId = newP2P.id;
        }
      } else if (input.storeId) {
        let query = db.from("chat_threads").select("id").eq("store_id", input.storeId).eq("status", "open");

        if (user) {
          query = query.eq("customer_id", user.id);
        }

        if (input.orderId) {
          query = query.eq("order_id", input.orderId);
        }

        const { data: existing } = await query.maybeSingle();

        if (existing) {
          threadId = existing.id;
        } else {
          const { data: newThread, error: threadErr } = await db
            .from("chat_threads")
            .insert({
              store_id: input.storeId,
              customer_id: user ? user.id : null,
              guest_name: profile?.full_name || "Cliente",
              guest_email: profile?.email || null,
              subject: input.subject,
              order_id: input.orderId || null,
              department: input.department,
              thread_type: "store",
              status: "open",
            })
            .select()
            .single();

          if (threadErr) throw threadErr;
          threadId = newThread.id;
        }
      }

      if (!threadId) throw new Error("Não foi possível criar a conversa.");

      await db.from("chat_messages").insert({
        thread_id: threadId,
        message: input.initialMessage,
        message_type: input.orderId ? "order_card" : "text",
        payload: input.orderId ? { order_id: input.orderId } : {},
        is_staff_reply: false,
        sender_id: user ? user.id : null,
      });

      return { threadId };
    } catch (e: any) {
      console.error("[chat] startCustomerChatThread error:", e);
      throw new Error(e.message || "Erro ao iniciar conversa.");
    }
  });

/**
 * Abertura de chamado SAC / RMA (Troca, Devolução ou Defeito)
 */
export const createSupportRmaTicket = createServerFn({ method: "POST" })
  .validator(createRmaTicketSchema)
  .handler(async ({ data }): Promise<Record<string, any>> => {
    const identity = await getServerIdentity();
    if (!identity.id) throw new Error("Não autenticado");

    const db = getServerClient();

    const { data: ticket, error } = await db
      .from("store_support_tickets")
      .insert({
        thread_id: data.threadId,
        store_id: data.store_id,
        order_id: data.order_id || null,
        customer_id: identity.id,
        ticket_type: data.ticket_type,
        title: data.title,
        description: data.description,
        photo_urls: data.photo_urls,
        status: "open",
        priority: "high",
      })
      .select()
      .single();

    if (error) throw new Error(`Falha ao abrir chamado: ${error.message}`);

    await db.from("chat_messages").insert({
      thread_id: data.threadId,
      message: `[CHAMADO] Solicitação de ${data.ticket_type === "return_exchange" ? "Troca/Devolução" : "Suporte"}: "${data.title}"`,
      message_type: "rma_ticket",
      payload: {
        ticket_id: ticket.id,
        ticket_type: ticket.ticket_type,
        title: ticket.title,
        description: ticket.description,
        photo_urls: ticket.photo_urls,
        status: ticket.status,
      },
      is_staff_reply: false,
      sender_id: identity.id,
    });

    if (ticket.thread_id && (data as any).status === "resolved") {
      const appOrigin = process.env.VITE_APP_URL || process.env.VITE_SITE_URL || "https://waesy.com.br";
      const csatUrl = `${appOrigin.replace(/\/$/, "")}/chamado/${ticket.id}`;
      await db.from("chat_messages").insert({
        thread_id: ticket.thread_id,
        message: `Seu chamado "${ticket.title || "Atendimento"}" foi concluído! Acesse a linha do tempo completa, valide a resolução e avalie nosso atendimento em: ${csatUrl}`,
        message_type: "structured_blocks",
        payload: {
          ticket_id: ticket.id,
          csat_url: csatUrl,
          blocks: [
            {
              type: "summary_card",
              data: {
                title: "Avalie seu Atendimento",
                subtitle: `Confirme se o problema foi resolvido e dê sua nota: ${csatUrl}`,
                badge: "Pesquisa CSAT",
                action_url: csatUrl,
              },
            },
          ],
        },
        is_staff_reply: true,
        sender_id: identity.id,
      });
    }
    return ticket;
  });

/**
 * Atualiza status do ticket pela equipe da loja
 */
export const updateTicketStatus = createServerFn({ method: "POST" })
  .validator(updateTicketStatusSchema)
  .handler(async ({ data }): Promise<Record<string, any>> => {
    const identity = await getServerIdentity();
    if (!identity?.id) throw new Error("Não autorizado");

    const db = getServerClient();

    const { data: ticket, error } = await db
      .from("store_support_tickets")
      .update({
        status: data.status,
        resolution_notes: data.resolution_notes || null,
        refund_amount_cents: data.refund_amount_cents || 0,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.ticketId)
      .eq("store_id", identity.store_id)
      .select()
      .single();

    if (error) throw new Error(`Falha ao atualizar chamado: ${error.message}`);

    if (ticket.thread_id) {
      await db.from("chat_messages").insert({
        thread_id: ticket.thread_id,
        message: `[STATUS] Status do Chamado atualizado para: ${data.status.toUpperCase()}. ${data.resolution_notes || ""}`,
        message_type: "system_event",
        payload: {
          ticket_id: ticket.id,
          status: ticket.status,
          resolution_notes: data.resolution_notes,
        },
        is_staff_reply: true,
        sender_id: identity.id,
      });
    }

    if (ticket.thread_id && (data as any).status === "resolved") {
      const appOrigin = process.env.VITE_APP_URL || process.env.VITE_SITE_URL || "https://waesy.com.br";
      const csatUrl = `${appOrigin.replace(/\/$/, "")}/chamado/${ticket.id}`;
      await db.from("chat_messages").insert({
        thread_id: ticket.thread_id,
        message: `Seu chamado "${ticket.title || "Atendimento"}" foi concluído! Acesse a linha do tempo completa, valide a resolução e avalie nosso atendimento em: ${csatUrl}`,
        message_type: "structured_blocks",
        payload: {
          ticket_id: ticket.id,
          csat_url: csatUrl,
          blocks: [
            {
              type: "summary_card",
              data: {
                title: "Avalie seu Atendimento",
                subtitle: `Confirme se o problema foi resolvido e dê sua nota: ${csatUrl}`,
                badge: "Pesquisa CSAT",
                action_url: csatUrl,
              },
            },
          ],
        },
        is_staff_reply: true,
        sender_id: identity.id,
      });
    }
    return ticket;
  });

export const createLinkedCustomerTaskSchema = z.object({
  storeId: z.string().uuid().optional(),
  threadId: z.string().uuid().optional().nullable(),
  customerId: z.string().optional().nullable(),
  customerName: z.string().trim().min(1).max(120),
  customerPhone: z.string().optional().nullable(),
  customerAvatarUrl: z.string().optional().nullable(),
  title: z.string().trim().min(2).max(200),
  description: z.string().optional().nullable(),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  dueDate: z.string().optional().nullable(),
  assignedSector: z
    .enum(["sac_pepinos", "customer_success", "operadora_cia", "reembolso_financeiro", "documentacao", "comercial"])
    .default("customer_success"),
  assignedToProfileId: z.string().uuid().optional().nullable(),
  entityType: z.enum(["customer", "trip", "order", "booking", "contract", "ticket", "general"]).default("customer"),
  entityId: z.string().optional().nullable(),
  entityCode: z.string().optional().nullable(),
  pnrLocator: z.string().optional().nullable(),
  isMyDay: z.boolean().default(true),
});

export const createLinkedCustomerTask = createServerFn({ method: "POST" })
  .validator(createLinkedCustomerTaskSchema)
  .handler(async ({ data }): Promise<Record<string, any>> => {
    const {
      storeId: inputStoreId,
      threadId,
      customerId,
      customerName,
      customerPhone,
      customerAvatarUrl,
      title,
      description,
      priority,
      dueDate,
      assignedSector,
      assignedToProfileId,
      entityType,
      entityId,
      entityCode,
      pnrLocator,
      isMyDay,
    } = data;

    const identity = await getServerIdentity();
    const storeId = inputStoreId || identity.store_id;
    if (!storeId) throw new Error("Loja obrigatória para criar tarefa vinculada.");
    assertStoreAccess(identity);
    const db = getServerClient();

    const taskCode = `TSK-${Math.floor(1000 + Math.random() * 9000)}`;
    const custSeed =
      String(customerId || customerPhone || customerName)
        .replace(/[^a-zA-Z0-9]/g, "")
        .toUpperCase()
        .slice(-4) || "0000";
    const customerTraceHash = `#CLI-${custSeed}`;

    const entityPrefixMap: Record<string, string> = {
      trip: "TRP",
      order: "PED",
      booking: "AGD",
      contract: "CTR",
      ticket: "SAC",
      customer: "CLI",
      general: "WZY",
    };
    const entPrefix = entityPrefixMap[entityType] || "WZY";
    const entSeed = String(entityCode || entityId || "")
      .replace(/[^a-zA-Z0-9]/g, "")
      .toUpperCase()
      .slice(-4);
    const entityTraceHash = entSeed ? `#${entPrefix}-${entSeed}` : null;

    const compositeTraceHash = [customerTraceHash, entityTraceHash, pnrLocator ? `#PNR-${pnrLocator.trim().toUpperCase()}` : null]
      .filter(Boolean)
      .join(" · ");

    const mappedContextType =
      entityType === "trip"
        ? "group_tour"
        : entityType === "order"
          ? "order"
          : entityType === "contract"
            ? "contract"
            : entityType === "booking"
              ? "service"
              : "customer";

    const tags = Array.from(
      new Set(
        [
          customerTraceHash,
          entityTraceHash,
          pnrLocator ? `PNR:${pnrLocator.trim().toUpperCase()}` : null,
          assignedSector === "sac_pepinos"
            ? "Pepino / SAC"
            : assignedSector === "customer_success"
              ? "Customer Success"
              : assignedSector === "operadora_cia"
                ? "Operadora / PNR"
                : assignedSector === "documentacao"
                  ? "Documentação"
                  : "Pós-Venda",
        ].filter(Boolean) as string[],
      ),
    );

    const customFields = {
      customer_id: customerId || null,
      customer_name: customerName,
      customer_phone: customerPhone || null,
      customer_avatar_url: customerAvatarUrl || null,
      thread_id: threadId || null,
      customer_trace_hash: customerTraceHash,
      entity_trace_hash: entityTraceHash,
      trace_hash: compositeTraceHash,
      assigned_sector: assignedSector,
      entity_type: entityType,
      entity_id: entityId || null,
      entity_code: entityCode || null,
      pnr_locator: pnrLocator || null,
    };

    const { data: created, error } = await db
      .from("workspace_tasks")
      .insert({
        store_id: storeId,
        task_code: taskCode,
        created_by_profile_id: identity.id,
        assigned_to_profile_id: assignedToProfileId || identity.id,
        title: title.trim(),
        description: description?.trim() || `Vínculo automático: ${customerName} (${compositeTraceHash})`,
        priority,
        status: "todo",
        due_date: dueDate ? new Date(dueDate).toISOString() : null,
        context_type: mappedContextType,
        context_id: customerId || entityId || null,
        context_label: `${customerName} · ${compositeTraceHash}`,
        tags,
        is_my_day: isMyDay,
        custom_fields: customFields,
        kanban_column_id: "todo",
      })
      .select()
      .single();

    if (error) throw new Error(`Falha ao criar tarefa vinculada: ${error.message}`);
    return created;
  });

export const toggleCustomerOnboardingStepSchema = z.object({
  storeId: z.string().uuid().optional(),
  threadId: z.string().uuid().optional().nullable(),
  tripId: z.string().uuid().optional().nullable(),
  stepKey: z.enum([
    "docs_received",
    "contract_signed",
    "payment_verified",
    "issuance_completed",
    "vouchers_sent",
    "onboarding_ready",
    "cs_completed",
  ]),
  completed: z.boolean(),
});

export const toggleCustomerOnboardingStep = createServerFn({ method: "POST" })
  .validator(toggleCustomerOnboardingStepSchema)
  .handler(
    async ({
      data,
    }): Promise<{
      success: boolean;
      stepKey: string;
      completed: boolean;
      onboardingSteps: Record<string, any>;
    }> => {
    const { storeId: inputStoreId, threadId, tripId, stepKey, completed } = data;
    const identity = await getServerIdentity();
    const storeId = inputStoreId || identity.store_id;
    if (!storeId) throw new Error("Loja obrigatória.");
    assertStoreAccess(identity);
    const db = getServerClient();

    let updatedSteps: Record<string, boolean> = {};

    if (threadId) {
      const { data: threadRow } = await db
        .from("chat_threads")
        .select("metadata")
        .eq("id", threadId)
        .eq("store_id", storeId)
        .maybeSingle();

      const currentMeta = ((threadRow?.metadata as any) || {}) as Record<string, any>;
      const existingSteps = (currentMeta.cs_onboarding_steps || {}) as Record<string, boolean>;
      updatedSteps = {
        ...existingSteps,
        [stepKey]: completed,
      };
      await db
        .from("chat_threads")
        .update({
          metadata: {
            ...currentMeta,
            cs_onboarding_steps: updatedSteps,
            cs_onboarding_updated_at: new Date().toISOString(),
            cs_onboarding_updated_by: identity.id,
          },
        })
        .eq("id", threadId)
        .eq("store_id", storeId);
    }

    if (tripId) {
      const { data: tripRow } = await db
        .from("tourism_trips")
        .select("financial_details")
        .eq("id", tripId)
        .eq("store_id", storeId)
        .maybeSingle();

      const currentFin = ((tripRow?.financial_details as any) || {}) as Record<string, any>;
      const existingSteps = (currentFin.cs_onboarding_steps || {}) as Record<string, boolean>;
      updatedSteps = {
        ...existingSteps,
        ...updatedSteps,
        [stepKey]: completed,
      };
      await db
        .from("tourism_trips")
        .update({
          financial_details: {
            ...currentFin,
            cs_onboarding_steps: updatedSteps,
            cs_onboarding_updated_at: new Date().toISOString(),
          },
        } as any)
        .eq("id", tripId)
        .eq("store_id", storeId);
    }

    return {
      success: true,
      stepKey,
      completed,
      onboardingSteps: updatedSteps,
    };
  });

export const generateOmnichannelCopilotInsight = createServerFn({ method: "POST" })
  .validator(
    z.object({
      threadId: z.string().uuid(),
      storeId: z.string().uuid().optional().nullable(),
      customInstruction: z.string().max(600).optional().nullable(),
    }),
  )
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    if (!identity?.id) throw new Error("Não autorizado");

    const db = getServerClient();
    const { data: thread } = await db
      .from("chat_threads")
      .select("id, store_id")
      .eq("id", data.threadId)
      .maybeSingle();

    if (!thread) throw new Error("Conversa não encontrada.");
    const storeId = data.storeId || thread.store_id;
    assertStoreAccess(identity, STAFF_ROLES, storeId);

    const { buildMultiNicheCopilotContextAndReply } = await import("../omnichannel-ai-copilot.server");
    return buildMultiNicheCopilotContextAndReply({
      db,
      storeId,
      threadId: thread.id,
      ownerId: identity.id,
      customInstruction: data.customInstruction ?? undefined,
      persistToThread: true,
    });
  });

export const autoFillLeadDossierFromChatAi = createServerFn({ method: "POST" })
  .validator(
    z.object({
      threadId: z.string().uuid().optional().nullable(),
      leadId: z.string().uuid().optional().nullable(),
      storeId: z.string().uuid().optional().nullable(),
      apply: z.boolean().optional(),
      overwriteExisting: z.boolean().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    if (!identity?.id) throw new Error("Não autorizado");

    if (!data.threadId && !data.leadId) {
      throw new Error("Informe a conversa ou o lead de origem para auto-preenchimento.");
    }

    const db = getServerClient();
    let storeId = data.storeId || identity.store_id || identity.memberships?.[0]?.store_id || "";
    if (!storeId && data.threadId) {
      const { data: th } = await db.from("chat_threads").select("store_id").eq("id", data.threadId).maybeSingle();
      storeId = th?.store_id || "";
    }
    if (!storeId && data.leadId) {
      const { data: ld } = await db.from("leads_crm").select("store_id").eq("id", data.leadId).maybeSingle();
      storeId = ld?.store_id || "";
    }
    if (!storeId) throw new Error("Loja não identificada.");
    assertStoreAccess(identity, STAFF_ROLES, storeId);

    const { extractLeadDossierFromThreadServer } = await import("../omnichannel-ai-copilot.server");
    return extractLeadDossierFromThreadServer({
      db,
      storeId,
      threadId: data.threadId ?? null,
      leadId: data.leadId ?? null,
      ownerId: identity.id,
      apply: Boolean(data.apply),
      overwriteExisting: Boolean(data.overwriteExisting),
    });
  });
