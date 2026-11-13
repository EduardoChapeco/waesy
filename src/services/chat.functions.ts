/**
 * chat.functions.ts — BFF Server Functions para o Chat Omnichannel, Conversational Commerce & SAC/RMA
 * Mensageria Segura Server-Side, Roteamento por Setor, RBAC Staff/Supervisor, Cards de Pedido e Customer 360.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient, getAnonServerClient, SupabaseUnconfiguredError } from "@/lib/supabase";
import { getSSRClient, getServerIdentity, assertStoreAccess, STAFF_ROLES, MANAGER_ROLES } from "@/lib/server-access";
import { getAllActiveKeysForProvider } from "@/services/api-orchestrator.functions";

export interface StaffOutboxDispatchInput {
  message?: string | null;
  message_type?: string | null;
  attachments?: string[] | null;
  payload?: Record<string, unknown> | null;
}

/** Normaliza payload de saida WhatsApp preservando midia, PTT e metadados reais. */
export function buildOutboxDispatchSpecFromStaffMessage(
  input: StaffOutboxDispatchInput,
  messageId: string,
): { messageType: string; payload: Record<string, unknown> } {
  const firstAttachment =
    Array.isArray(input.attachments) && input.attachments.length > 0
      ? String(input.attachments[0] || "").trim()
      : "";
  const rawType = String(input.message_type || "text").trim() || "text";
  const text = typeof input.message === "string" ? input.message : "";
  const extraPayload = input.payload && typeof input.payload === "object" ? input.payload : {};
  const mediaUrlFromPayload =
    typeof extraPayload.media_url === "string" ? extraPayload.media_url.trim() : "";
  const resolvedMediaUrl = firstAttachment || mediaUrlFromPayload;

  if (rawType === "audio" && resolvedMediaUrl) {
    return {
      messageType: "audio",
      payload: {
        media_url: resolvedMediaUrl,
        voice_note: true,
        encoding: true,
        mime_type:
          typeof extraPayload.mime_type === "string" && extraPayload.mime_type.trim()
            ? extraPayload.mime_type.trim()
            : "audio/ogg; codecs=opus",
        chat_message_id: messageId,
      },
    };
  }

  if (
    (rawType === "image" ||
      rawType === "image_attachment" ||
      rawType === "video" ||
      rawType === "document" ||
      rawType === "sticker") &&
    resolvedMediaUrl
  ) {
    const normalizedType = rawType === "image_attachment" ? "image" : rawType;
    return {
      messageType: normalizedType,
      payload: {
        media_url: resolvedMediaUrl,
        caption:
          text || (typeof extraPayload.caption === "string" ? extraPayload.caption : undefined),
        text: text || undefined,
        file_name: typeof extraPayload.file_name === "string" ? extraPayload.file_name : undefined,
        mime_type: typeof extraPayload.mime_type === "string" ? extraPayload.mime_type : undefined,
        chat_message_id: messageId,
      },
    };
  }

  return {
    messageType: "text",
    payload: {
      text,
      chat_message_id: messageId,
    },
  };
}

// ============================================================
// Schemas
// ============================================================

export const listStaffThreadsSchema = z.object({
 department: z.string().optional(),
 assigned_to: z.string().optional(),
 status: z.enum(["open", "closed", "archived", "all"]).default("all"),
 store_id: z.string().uuid().optional(),
 storeId: z.string().uuid().optional(),
});

export const sendStaffMessageSchema = z.object({
  threadId: z.string().uuid(),
  message: z.string().min(1),
  message_type: z
    .enum(["text", "order_card", "rma_ticket", "system_event", "image_attachment", "pix_payment", "structured_blocks", "sticker", "image", "video", "audio", "document", "internal_note"])
    .default("text"),
  attachments: z.array(z.string()).default([]),
  payload: z.record(z.any()).default({}),
  is_internal: z.boolean().default(false),
});

export const sendCustomerMessageSchema = z.object({
 threadId: z.string().uuid(),
 message: z.string().min(1),
 message_type: z
 .enum(["text", "order_card", "rma_ticket", "system_event", "image_attachment", "structured_blocks", "sticker", "image", "video", "audio", "document", "internal_note"])
 .default("text"),
 attachments: z.array(z.string()).default([]),
 payload: z.record(z.any()).default({}),
});

export const assignThreadSchema = z.object({
 threadId: z.string().uuid(),
 department: z.string().optional(),
 assigned_to_profile_id: z.string().uuid().nullable().optional(),
 priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
 internal_notes: z.string().optional(),
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

// ============================================================
// 1. Staff / Workspace Functions
// ============================================================

/**
 * Lista threads da loja no Workspace com isolamento por setor e métricas de supervisor
 */
export const listChatThreads = createServerFn({ method: "GET" })
 .validator(listStaffThreadsSchema.optional())
 .handler(async ({ data }) => {
 try {
 const db = getServerClient();
 const identity = await getServerIdentity().catch(() => null);
 if (!identity?.id) {
 return {
 threads: [],
 metrics: { total: 0, open: 0, closed: 0, avg_rating: null, sla_first_response_min: null },
 };
 }

 const requestedStoreId = data?.store_id || data?.storeId;
 const targetStoreId = requestedStoreId || identity.store_id || identity.memberships?.[0]?.store_id || null;
 if (!targetStoreId) {
 return {
 threads: [],
 metrics: { total: 0, open: 0, closed: 0, avg_rating: null, sla_first_response_min: null },
 };
 }

 assertStoreAccess(identity, STAFF_ROLES, targetStoreId);
 const effectiveStoreId = targetStoreId;

 const targetMembership = (identity.memberships || []).find(
   (m) => m.store_id === targetStoreId,
 );
 const effectiveRole = targetMembership?.role || identity.role;
 const isSupervisor = [...MANAGER_ROLES].includes(effectiveRole as any) ||
   (identity.role === "platform_admin" || identity.role === "master");

 let query = db
 .from("chat_threads")
 .select(
 `
 id, store_id, customer_id, guest_name, guest_email, status, subject,
 department, assigned_to_profile_id, order_id, priority, satisfaction_rating,
 internal_notes, updated_at, created_at, thread_type, context_type, entity_id, metadata, tags,
 chat_messages(id, message, message_type, created_at, is_staff_reply, attachments, payload)
 `,
 )
 .eq("store_id", effectiveStoreId)
		.not("thread_type", "in", "(ai_assistant,copilot,project)")
 .order("updated_at", { ascending: false });

 // Filtro de status canônico do banco (open, closed, archived, pending)
 const canonicalStatuses = new Set(["open", "closed", "archived", "pending"]);
 if (data?.status === "archived") {
		query = query.eq("status", "archived");
	} else if (data?.status && canonicalStatuses.has(data.status)) {
		query = query.eq("status", data.status);
	} else {
		query = query.neq("status", "archived");
	}

 // Filtro de departamento
 if (data?.department && data.department !== "all") {
 query = query.eq("department", data.department);
 }

  // Se não for supervisor/gerente, visualiza apenas seus setores atribuídos na governança ou atribuídos a ele
  if (!isSupervisor) {
    const { data: storeRow } = await db
      .from("stores")
      .select("settings")
      .eq("id", effectiveStoreId)
      .maybeSingle();

    const governance = (storeRow?.settings as any)?.whatsapp_governance || {};
    const depts = Array.isArray(governance.departments) ? governance.departments : [];
    const assignedDepts = depts
      .filter((d: any) => Array.isArray(d.assignedAgentIds) && d.assignedAgentIds.includes(identity.id))
      .map((d: any) => d.slug || d.id || d.name)
      .filter(Boolean);

    const allowedClauses = [`assigned_to_profile_id.eq.${identity.id}`];
    for (const d of assignedDepts) {
      allowedClauses.push(`department.eq.${d}`);
    }
    if (assignedDepts.length === 0) {
      allowedClauses.push("department.eq.geral", "department.is.null");
    }

    query = query.or(allowedClauses.join(","));
  }

 const { data: rawThreads, error } = await query;
 if (error) {
 console.warn("[chat.functions] Erro ao consultar chat_threads:", error.message);
 return {
 threads: [],
 metrics: { total: 0, open: 0, closed: 0, avg_rating: null, sla_first_response_min: null },
 };
 }

 const threadsList = (rawThreads || []).filter((t: any) => {
    if (t.thread_type === 'ai_assistant' || t.thread_type === 'copilot' || t.thread_type === 'project') return false;
    if (t.context_type === 'ai_assistant' || t.context_type === 'copilot' || t.context_type === 'project') return false;
    if (t.metadata?.is_copilot || t.metadata?.is_civil || t.metadata?.agent_mode) return false;
    if (!isSupervisor && t.metadata?.hidden_from_staff === true) return false;
    return true;
  });

 // Buscar perfis associados (clientes e agentes) sem depender de FKs frágeis no PostgREST
 const profileIds = new Set<string>();
 for (const t of threadsList) {
 if (t.customer_id) profileIds.add(t.customer_id);
 if (t.assigned_to_profile_id) profileIds.add(t.assigned_to_profile_id);
 }

 const profilesMap = new Map<string, any>();
 if (profileIds.size > 0) {
 const { data: profilesData } = await db
 .from("profiles")
 .select("id, full_name, phone, avatar_url")
 .in("id", Array.from(profileIds));

 for (const p of profilesData || []) {
 profilesMap.set(p.id, p);
 }
 }

 // Mapeamento e extração da última mensagem
 const formattedThreads = threadsList.map((thread: any) => {
 const messages = thread.chat_messages || [];
 messages.sort(
 (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
 );
 // Mensagens públicas (exclui notas internas da equipe para não vazar informações confidenciais)
 const isInternalMsg = (m: any) => {
   return Boolean(
     m.payload?.is_internal ||
     m.payload?.is_whisper ||
     m.payload?.whisper ||
     m.message_type === "internal_note" ||
     m.message_type === "system_event" ||
     m.origin === "internal_note" ||
     (typeof m.message === "string" && thread.internal_notes && thread.internal_notes.includes(m.message))
   );
 };
 const publicMessages = messages.filter((m: any) => !isInternalMsg(m));
 const lastPublicMsg = publicMessages[0];
 const lastMsg = messages[0];
 const customerProfile = thread.customer_id ? profilesMap.get(thread.customer_id) : null;
 const agentProfile = thread.assigned_to_profile_id ? profilesMap.get(thread.assigned_to_profile_id) : null;
 const threadMeta = (thread.metadata && typeof thread.metadata === "object" ? thread.metadata : {}) as Record<string, any>;
 const threadIsGroup = Boolean(thread.thread_type === "group" || threadMeta.is_group || String(thread.entity_id || "").includes("@g.us") || (String(thread.entity_id || "").length > 14 && String(thread.entity_id || "").startsWith("+120")));
 const threadIsChannel = Boolean(thread.thread_type === "channel" || threadMeta.is_channel || String(thread.entity_id || "").includes("@newsletter"));
 const threadAvatar = threadMeta.avatar_url || customerProfile?.avatar_url || null;

 return {
 id: thread.id,
 status: thread.status,
 subject: thread.subject,
 department: thread.department || "geral",
 priority: thread.priority || "normal",
 satisfaction_rating: thread.satisfaction_rating,
 assigned_agent: agentProfile,
 thread_type: threadIsGroup ? "group" : threadIsChannel ? "channel" : thread.thread_type,
 is_group: threadIsGroup,
 is_channel: threadIsChannel,
 avatar_url: threadAvatar,
 metadata: threadMeta,
			context_type: thread.context_type,
			channel: thread.context_type === "whatsapp" ? "whatsapp" : "web",
			customer: customerProfile || {
				full_name: thread.guest_name || (threadIsGroup ? "Grupo WhatsApp" : threadIsChannel ? "Canal WhatsApp" : thread.context_type === "whatsapp" ? ("WhatsApp " + (thread.entity_id || "")) : "Cliente"),
				email: thread.guest_email || "",
				phone: thread.entity_id || "",
				avatar_url: threadAvatar,
			},
 order_id: thread.order_id,
 internal_notes: thread.internal_notes,
        tags: thread.tags || [],
 updated_at: thread.updated_at,
 created_at: thread.created_at,
 last_message: (() => {
   if (lastPublicMsg) {
     if (typeof lastPublicMsg.message === "string" && !lastPublicMsg.message.startsWith("waesy-msg:")) {
       return lastPublicMsg.message;
     }
     return lastPublicMsg.message_type === "image" ? "[Imagem]"
       : lastPublicMsg.message_type === "video" ? "[Vídeo]"
       : lastPublicMsg.message_type === "audio" ? "[Áudio]"
       : lastPublicMsg.message_type === "document" ? "[Documento]"
       : lastPublicMsg.message_type === "sticker" ? "[Figurinha]"
       : "[Mensagem]";
   }
   const hasInternalNotes = messages.some(isInternalMsg) || Boolean(thread.internal_notes && thread.internal_notes.trim());
   if (hasInternalNotes) {
     return "(Apenas anotações internas da equipe)";
   }
   return "";
 })(),
 last_message_type: lastPublicMsg ? lastPublicMsg.message_type : (lastMsg ? lastMsg.message_type : "text"),
 is_last_reply_staff: lastPublicMsg ? Boolean(lastPublicMsg.is_staff_reply) : false,
 total_messages: messages.length,
 };
 });

 const ratedThreads = threadsList.filter(
  (t: any) => typeof t.satisfaction_rating === "number" && t.satisfaction_rating > 0,
 );
 const avg_rating =
  ratedThreads.length > 0
   ? Number(
     (
      ratedThreads.reduce((acc: number, t: any) => acc + t.satisfaction_rating, 0) /
      ratedThreads.length
     ).toFixed(1),
    )
   : null;

 // Métricas de Governança Autênticas (Zero Mocks / Invariante B.33)
 const metrics = {
 total: threadsList.length,
 open: threadsList.filter((t) => t.status === "open").length,
 closed: threadsList.filter((t) => t.status === "closed" || t.status === "resolved").length,
 avg_rating,
 sla_first_response_min: null,
 };

 return {
 threads: formattedThreads,
 metrics,
 isSupervisor,
 };
 } catch (error: any) {
 console.warn("[chat.functions] Falha inesperada ao listar threads:", error?.message || error);
 return {
 threads: [],
 metrics: { total: 0, open: 0, closed: 0, avg_rating: null, sla_first_response_min: null },
 };
 }
 });

/**
 * Mensagens da thread com metadados ricos
 */
export const getChatMessages = createServerFn({ method: "GET" })
 .validator(z.object({ threadId: z.string().uuid() }))
 .handler(async ({ data: { threadId } }) => {
 try {
 const db = getServerClient();
 const identity = await getServerIdentity();
 if (!identity?.id) throw new Error("Não autorizado");

 const { data: thread } = await db
 .from("chat_threads")
 .select("id, store_id, customer_id, order_id, department, status, thread_type, context_type, metadata, entity_id, channel_instance_id")
 .eq("id", threadId)
 .single();

 if (!thread) throw new Error("Conversa não encontrada ou acesso negado.");
 assertStoreAccess(identity, STAFF_ROLES, thread.store_id);
  if (
    thread.thread_type === 'ai_assistant' ||
    thread.thread_type === 'copilot' ||
    thread.thread_type === 'project' ||
    thread.context_type === 'ai_assistant' ||
    thread.context_type === 'copilot' ||
    thread.metadata?.is_copilot ||
    thread.metadata?.is_civil
  ) {
    throw new Error("Conversa civil protegida. Acesso não permitido no SAC da loja.");
  }

 const { data: messages, error } = await db
 .from("chat_messages")
 .select("id, message, message_type, is_staff_reply, created_at, sender_id, attachments, payload, delivery_status, external_message_id, failed_at, error_code, error_message")
 .eq("thread_id", threadId)
 .order("created_at", { ascending: true });

  if (error) throw error;
  let rawMessages = (messages || []) as any[];

  // On-demand message history sync from Evolution API se a thread tiver historico escasso
  if (thread.context_type === "whatsapp" && (thread as any).entity_id && rawMessages.length <= 1) {
    try {
      const cleanDigits = String((thread as any).entity_id).replace(/\D/g, "");
      const remoteJid = `${cleanDigits}@s.whatsapp.net`;
      const { data: inst } = await db
        .from("whatsapp_channel_instances")
        .select("id, instance_key, external_instance_id, public_config")
        .eq("store_id", thread.store_id)
        .eq("provider", "evolution_api")
        .eq("is_active", true)
        .order("is_default", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (inst) {
        const externalName = inst.external_instance_id || inst.instance_key;
        const configuredUrl = String((inst.public_config as any)?.base_url || "").replace(/\/$/, "");
        const baseUrl = configuredUrl && !configuredUrl.includes("147.15.61.45")
          ? configuredUrl
          : (process.env.EVOLUTION_API_URL?.trim() || "");
        const apiKey = process.env.EVOLUTION_API_KEY?.trim() || "";
        if (!baseUrl || !apiKey) throw new Error("Evolution API URL/Key não configuradas no ambiente.");

        const evoRes = await fetch(`${baseUrl}/chat/findMessages/${encodeURIComponent(externalName)}`, {
          method: "POST",
          headers: { apikey: apiKey, "Content-Type": "application/json" },
          body: JSON.stringify({
            where: { key: { remoteJid } },
            limit: 30,
          }),
          signal: AbortSignal.timeout(6000),
        });

        if (evoRes.ok) {
          const evoJson: any = await evoRes.json().catch(() => ({}));
          const records = evoJson?.messages?.records || (Array.isArray(evoJson) ? evoJson : []);
          for (const rec of records) {
            const key = rec.key || {};
            const externalId = String(key.id || "");
            if (!externalId) continue;
            const fromMe = Boolean(key.fromMe);
            const msg = rec.message || {};
            let msgType = "text";
            let text = "";
            let mediaUrl: string | null = null;
            let mediaMime = "application/octet-stream";
            if (msg.stickerMessage) {
              msgType = "sticker";
              text = "[Figurinha]";
              mediaUrl = rec.base64 || msg.base64 || (msg.stickerMessage.pngThumbnail ? `data:image/png;base64,${msg.stickerMessage.pngThumbnail}` : null);
              mediaMime = "image/webp";
            } else if (msg.imageMessage) {
              msgType = "image";
              text = msg.imageMessage.caption?.trim() || "[Imagem]";
              mediaUrl = rec.base64 || msg.base64 || (msg.imageMessage.jpegThumbnail ? `data:image/jpeg;base64,${msg.imageMessage.jpegThumbnail}` : null);
              mediaMime = "image/jpeg";
            } else if (msg.videoMessage) {
              msgType = "video";
              text = msg.videoMessage.caption?.trim() || "[Vídeo]";
              mediaUrl = rec.base64 || msg.base64 || null;
              mediaMime = "video/mp4";
            } else if (msg.audioMessage) {
              msgType = "audio";
              text = "[Áudio]";
              mediaUrl = rec.base64 || msg.base64 || null;
              mediaMime = "audio/ogg";
            } else if (msg.documentMessage) {
              msgType = "document";
              text = msg.documentMessage.fileName?.trim() || "[Documento]";
              mediaUrl = rec.base64 || msg.base64 || null;
              mediaMime = "application/pdf";
            } else {
              text = String(msg.conversation || msg.extendedTextMessage?.text || "").trim();
            }
            if (!text && !mediaUrl) continue;
            if (!text) text = "[Mensagem]";








            const ts = Number(rec.messageTimestamp || Date.now() / 1000);
            const occurredAt = new Date(ts < 2_000_000_000 ? ts * 1000 : ts).toISOString();
            const exists = rawMessages.some((m: any) => m.external_message_id === externalId);
            if (!exists) {
              const { data: createdMsg } = await db.from("chat_messages").insert({
                thread_id: thread.id,
                channel: "whatsapp",
                message: text,
                message_type: msgType,
                is_staff_reply: fromMe,
                provider: "evolution_api",
                external_message_id: externalId,
                delivery_status: fromMe ? "sent" : "delivered",
                sent_at: occurredAt,
                delivered_at: occurredAt,
                attachments: mediaUrl ? [mediaUrl] : [],
                payload: {
                  origin: fromMe ? "whatsapp_device" : "whatsapp_customer",
                  ...(mediaUrl ? { media: { type: msgType, url: mediaUrl, mimetype: mediaMime } } : {}),
                },
                created_at: occurredAt,
              }).select("id, message, message_type, is_staff_reply, created_at, sender_id, attachments, payload, delivery_status").maybeSingle();
              if (createdMsg) rawMessages.push(createdMsg);
            }
          }
          rawMessages.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        }
      }
    } catch (pullErr) {
      console.warn("[chat] Erro ao sincronizar historico da Evolution API:", pullErr);
    }
  }

  const decryptedMessages = await Promise.all(
    rawMessages.map(async (m: any) => {
      let text = m.message;
      let healed = false;
      if (typeof text === "string" && text.startsWith("waesy-msg:")) {
        try {
          const { decryptConversationMessageForThread } = await import("@/lib/conversation-crypto.server");
          text = await decryptConversationMessageForThread(thread.store_id, thread.id, text);
          if (text && !text.startsWith("waesy-msg:")) {
            healed = true;
          }
        } catch {
          // fallback para consulta na Evolution API
        }

        // Se a descriptografia falhou e temos external_message_id, tenta reconciliar via Evolution API
        if ((!text || text.startsWith("waesy-msg:")) && m.external_message_id) {
          try {
            const { data: inst } = await db
              .from("whatsapp_channel_instances")
              .select("instance_key, external_instance_id, public_config")
              .eq("store_id", thread.store_id)
              .eq("is_active", true)
              .order("is_default", { ascending: false })
              .limit(1)
              .maybeSingle();

            if (inst) {
              const externalName = inst.external_instance_id || inst.instance_key;
              const configuredUrl = String((inst.public_config as any)?.base_url || "").replace(/\/$/, "");
              const baseUrl = configuredUrl && !configuredUrl.includes("147.15.61.45")
                ? configuredUrl
                : (process.env.EVOLUTION_API_URL?.trim() || "");
              const apiKey = process.env.EVOLUTION_API_KEY?.trim() || "";

              if (baseUrl && apiKey) {
                const evoRes = await fetch(`${baseUrl}/chat/findMessages/${encodeURIComponent(externalName)}`, {
                  method: "POST",
                  headers: { apikey: apiKey, "Content-Type": "application/json" },
                  body: JSON.stringify({ where: { key: { id: m.external_message_id } } }),
                  signal: AbortSignal.timeout(3500),
                });
                if (evoRes.ok) {
                  const evoJson: any = await evoRes.json().catch(() => ({}));
                  const recs = evoJson?.messages?.records || (Array.isArray(evoJson) ? evoJson : []);
                  const found = recs[0]?.message;
                  const candidateText = found?.conversation || found?.extendedTextMessage?.text || found?.imageMessage?.caption || "";
                  if (candidateText && candidateText.trim()) {
                    text = candidateText.trim();
                    healed = true;
                  }
                }
              }
            }
          } catch {
            // noop
          }
        }

        // Se ainda assim permaneceu como waesy-msg:, exibe fallback honesto em vez de hash criptográfico
        if (typeof text === "string" && text.startsWith("waesy-msg:")) {
          text = m.message_type === "image" ? "[Imagem]" : m.message_type === "audio" ? "[Áudio]" : m.message_type === "sticker" ? "[Figurinha]" : "[Mensagem]";
          healed = true;
        }

        // Persiste a autocura no banco para curar a linha para sempre
        if (healed && text && !text.startsWith("waesy-msg:")) {
          try {
            await db.from("chat_messages").update({ message: text, is_encrypted: false }).eq("id", m.id);
          } catch {
            // noop
          }
        }
      }
      return {
        ...m,
        message: text,
        is_internal: Boolean(
          m.payload?.is_internal ||
          m.payload?.is_whisper ||
          m.message_type === "internal_note" ||
          (m.message_type === "system_event" && m.payload?.is_whisper)
        ),
        is_revoked_by_sender: Boolean(m.payload?.is_revoked_by_sender),
        revoked_at: (m.payload?.revoked_at as string) || null,
      };
    })
  );

  return {
    thread,
    messages: decryptedMessages,
  };
 } catch (e: any) {
 if (e instanceof SupabaseUnconfiguredError) throw e;
 console.error("[chat] getChatMessages error:", e);
 throw new Error(e.message || "Erro ao carregar mensagens.");
 }
 });

/**
 * Envio seguro de mensagem pela equipe (com suporte a cards de pedido e cobrança Pix)
 */
export const sendChatMessage = createServerFn({ method: "POST" })
 .validator(sendStaffMessageSchema)
 .handler(async ({ data: input }) => {
 try {
 const db = getServerClient();
 const identity = await getServerIdentity();
 if (!identity?.id) throw new Error("Não autorizado");

 const { data: thread } = await db
 .from("chat_threads")
 .select("id, store_id, context_type, entity_id, channel_instance_id, metadata, assigned_to_profile_id")
 .eq("id", input.threadId)
 .single();

 if (!thread) throw new Error("Conversa não encontrada ou acesso negado.");
 assertStoreAccess(identity, STAFF_ROLES, thread.store_id);

 const isInternal = Boolean(
    input.is_internal ||
    input.payload?.is_internal ||
    input.payload?.is_whisper ||
    ((input.message_type as string) === "internal_note") ||
    (input.message_type === "system_event" && input.payload?.is_whisper)
  );
 const finalPayload = {
   ...(input.payload || {}),
   is_internal: isInternal,
   ...(isInternal ? { is_whisper: true } : {}),
 };

 const { data: msg, error } = await db
 .from("chat_messages")
 .insert({
 thread_id: input.threadId,
 message: input.message,
 message_type: input.message_type,
 channel: thread.context_type || "web",
 attachments: input.attachments,
 payload: finalPayload,
 is_staff_reply: true,
 sender_id: identity.id,
 sender_profile_id: identity.id,
 })
 .select()
 .single();

 if (error) throw error;

 if (!isInternal) {
   await db
   .from("chat_threads")
   .update({
   last_message_text: input.message,
   metadata: { ...(((thread as any).metadata || {}) as Record<string, any>), handoff_mode: "human_active", ai_auto_reply_enabled: false, last_human_agent_id: identity.id },
   ...(!(thread as any).assigned_to_profile_id ? { assigned_to_profile_id: identity.id } : {}),
   last_message_at: new Date().toISOString(),
   updated_at: new Date().toISOString(),
   })
   .eq("id", input.threadId);

   // Cross-Module Outbound Dispatch: Disparo bidirecional para canais externos apenas se NÃO for nota interna
   if (thread.context_type === "whatsapp" && thread.entity_id) {
     try {
       const cleanPhone = String(thread.entity_id).replace(/@.*$/, "");
       let channelInstanceId = (thread as any).channel_instance_id || null;
       let providerName = "evolution_api";

       if (channelInstanceId) {
         const { data: inst } = await db
           .from("whatsapp_channel_instances")
           .select("id, provider")
           .eq("id", channelInstanceId)
           .maybeSingle();
         if (inst) providerName = inst.provider;
       } else {
         const { data: defaultInst } = await db
           .from("whatsapp_channel_instances")
           .select("id, provider")
           .eq("store_id", thread.store_id)
           .eq("is_active", true)
           .order("is_default", { ascending: false })
           .order("updated_at", { ascending: false })
           .limit(1)
           .maybeSingle();
         if (defaultInst) {
           channelInstanceId = defaultInst.id;
           providerName = defaultInst.provider;
         }
       }

       if (channelInstanceId) {
         const dispatchSpec = buildOutboxDispatchSpecFromStaffMessage(input, msg.id);
         await db.from("whatsapp_outbox").upsert(
           {
             store_id: thread.store_id,
             thread_id: thread.id,
             channel_instance_id: channelInstanceId,
             provider: providerName,
             idempotency_key: `chat_msg:${msg.id}`,
             recipient_phone: cleanPhone,
             message_type: dispatchSpec.messageType,
             payload: dispatchSpec.payload,
             status: "pending",
           },
           { onConflict: "store_id,idempotency_key", ignoreDuplicates: true },
         );

         // Disparo imediato do outbox worker para envio sem latencia ao cliente
         try {
           const { runWhatsAppOutboxWorker } = await import("./whatsapp-outbox.worker");
           await runWhatsAppOutboxWorker({ batchSize: 5 });
         } catch (workerImportErr) {
           console.warn("[chat.functions] Erro ao despachar whatsapp-outbox.worker no envio:", workerImportErr);
         }
       } else {
         const { sendWhatsAppNotification } = await import("./integrations.functions");
         await sendWhatsAppNotification({
           storeId: thread.store_id,
           recipientPhone: thread.entity_id,
           messageText: input.message,
         });
       }
     } catch (waErr) {
       console.warn("[chat.functions] Falha ao despachar resposta via WhatsApp:", waErr);
     }
   } else if (thread.context_type === "mercadolivre" && thread.entity_id) {
     try {
       const { answerMercadoLivreQuestion } = await import("./marketplace-hub.functions");
       await answerMercadoLivreQuestion({
         storeId: thread.store_id,
         questionId: thread.entity_id,
         answerText: input.message,
       });
     } catch (mlErr) {
       console.warn("[chat.functions] Falha ao despachar resposta via Mercado Livre:", mlErr);
     }
   }
 }

 const { data: updatedMsg } = await db
   .from("chat_messages")
   .select("id, thread_id, message, message_type, is_staff_reply, created_at, sender_id, attachments, payload, delivery_status, external_message_id, failed_at, error_code, error_message")
   .eq("id", msg.id)
   .maybeSingle();

 return updatedMsg || msg;
 } catch (e: any) {
 console.error("[chat] sendChatMessage error:", e);
 throw new Error(e.message || "Erro ao enviar mensagem.");
 }
 });

/**
 * Atribuição de atendente, setor ou prioridade da conversa
 */
export const assignChatThread = createServerFn({ method: "POST" })
 .validator(assignThreadSchema)
 .handler(async ({ data }) => {
 const identity = await getServerIdentity();
 if (!identity?.id) throw new Error("Não autorizado");

 const db = getServerClient();
 const updatePayload: Record<string, any> = {
 updated_at: new Date().toISOString(),
 };

 const targetMembership = (identity.memberships || []).find(
   (m) => m.store_id === identity.store_id,
 );
 const effectiveRole = targetMembership?.role || identity.role;
 const isSupervisor = [...MANAGER_ROLES].includes(effectiveRole as any) ||
   (identity.role === "platform_admin" || identity.role === "master");

 if (data.department) updatePayload.department = data.department;
 if (data.assigned_to_profile_id !== undefined)
 updatePayload.assigned_to_profile_id = data.assigned_to_profile_id;
 if (data.priority) updatePayload.priority = data.priority;
 if (data.internal_notes !== undefined) {
   if (!isSupervisor && !data.internal_notes.trim()) {
     throw new Error("Apenas gerentes e proprietários têm permissão para apagar anotações internas da equipe.");
   }
   updatePayload.internal_notes = data.internal_notes;
 }

 const { data: updated, error } = await db
 .from("chat_threads")
 .update(updatePayload)
 .eq("id", data.threadId)
 .eq("store_id", identity.store_id)
 .select()
 .single();

 if (error) throw new Error(`Falha ao atribuir conversa: ${error.message}`);
 return updated;
 });

export const customer360QuerySchema = z.object({
  customerId: z.string().uuid().optional().nullable(),
  storeId: z.string().uuid(),
  threadId: z.string().uuid().optional().nullable(),
  guestPhone: z.string().optional().nullable(),
  guestName: z.string().optional().nullable(),
});

/**
 * Visão 360º do Cliente (LTV, Histórico de Compras, Orçamentos, Inadimplência, Tags e Notas Internas)
 */
export const getCustomer360Context = createServerFn({ method: "GET" })
 .validator(customer360QuerySchema)
 .handler(async ({ data }) => {
 const { customerId, storeId, threadId, guestPhone, guestName } = data;
 const identity = await getServerIdentity();
 if (!identity?.id) throw new Error("Não autorizado");
 assertStoreAccess(identity, STAFF_ROLES, storeId);

 const db = getServerClient();

 let threadContext: any = null;
 if (threadId) {
   const { data: threadRow } = await db
     .from("chat_threads")
     .select("id, customer_id, guest_name, guest_email, entity_id, department, priority, status, internal_notes, tags, assigned_to_profile_id, metadata")
     .eq("id", threadId)
     .eq("store_id", storeId)
     .maybeSingle();
   threadContext = threadRow || null;
 }

 let resolvedCustomerId = customerId || threadContext?.customer_id || null;
 const rawPhone = guestPhone || threadContext?.entity_id || null;
 const cleanDigits = rawPhone ? String(rawPhone).replace(/\D/g, "") : "";

 let profileData: any = null;
 if (resolvedCustomerId) {
   const profileRes = await db
     .from("profiles")
     .select("id, full_name, phone, avatar_url, created_at, cpf, city")
     .eq("id", resolvedCustomerId)
     .maybeSingle();
   profileData = profileRes.data || null;
 } else if (cleanDigits.length >= 8) {
   const profileByPhone = await db
     .from("profiles")
     .select("id, full_name, phone, avatar_url, created_at, cpf, city")
     .or(`phone.eq.${rawPhone},phone.eq.+${cleanDigits},phone.eq.${cleanDigits}`)
     .limit(1)
     .maybeSingle();
   if (profileByPhone.data) {
     profileData = profileByPhone.data;
     resolvedCustomerId = profileByPhone.data.id;
   }
 }

 // Consulta também o cadastro comercial na carteira da loja (customers_crm) para enriquecimento 360º
 let crmCustomer: any = null;
 if (resolvedCustomerId || cleanDigits.length >= 8) {
   const crmOrParts: string[] = [];
   if (resolvedCustomerId) crmOrParts.push(`id.eq.${resolvedCustomerId}`);
   if (cleanDigits.length >= 8) {
     crmOrParts.push(`phone.eq.+${cleanDigits}`, `phone.eq.${cleanDigits}`);
     if (rawPhone) crmOrParts.push(`phone.eq.${rawPhone}`);
   }
   const { data: crmRow } = await db
     .from("customers_crm")
     .select("id, full_name, phone, email, document, city, tags, notes, created_at")
     .eq("store_id", storeId)
     .is("deleted_at", null)
     .or(crmOrParts.join(","))
     .order("updated_at", { ascending: false })
     .limit(1)
     .maybeSingle();
   if (crmRow) {
     crmCustomer = crmRow;
     if (!resolvedCustomerId) resolvedCustomerId = crmRow.id;
   }
 }

 const customerPhone = profileData?.phone || crmCustomer?.phone || rawPhone || null;
 const overrideMeta = (threadContext?.metadata as any)?.customer_profile_override || null;
 profileData = {
   id: resolvedCustomerId,
   full_name: overrideMeta?.full_name || crmCustomer?.full_name || profileData?.full_name || guestName || threadContext?.guest_name || customerPhone || "Visitante em Atendimento",
   phone: overrideMeta?.phone || customerPhone,
   email: overrideMeta?.email || crmCustomer?.email || threadContext?.guest_email || null,
   document_cpf: overrideMeta?.document_cpf || crmCustomer?.document || profileData?.cpf || null,
   city: overrideMeta?.city || crmCustomer?.city || profileData?.city || null,
   avatar_url: profileData?.avatar_url || (threadContext?.metadata as any)?.avatar_url || null,
   created_at: profileData?.created_at || crmCustomer?.created_at || null,
 };

 const leadOrFilters: string[] = [];
 if (resolvedCustomerId) leadOrFilters.push(`customer_id.eq.${resolvedCustomerId}`);
 if (customerPhone) leadOrFilters.push(`phone.eq.${customerPhone}`);
 if (cleanDigits.length >= 8) leadOrFilters.push(`phone.eq.+${cleanDigits}`, `phone.eq.${cleanDigits}`);

 const [ordersRes, ticketsRes, tripsRes, creditsRes, leadsRes, quotesRes, contractsRes, debtRes, docsRes, invoicesRes] = await Promise.all([
   resolvedCustomerId
     ? db.from("orders").select("id, total_amount_cents, status, created_at, payment_method").eq("store_id", storeId).eq("customer_id", resolvedCustomerId).order("created_at", { ascending: false }).limit(10)
     : Promise.resolve({ data: [] as any[] }),
   resolvedCustomerId
     ? db.from("store_support_tickets").select("*").eq("store_id", storeId).eq("customer_id", resolvedCustomerId).order("created_at", { ascending: false })
     : Promise.resolve({ data: [] as any[] }),
   resolvedCustomerId
     ? db.from("tourism_trips").select("id, trip_number, title, destination_city, travel_start_date, travel_end_date, total_cents, status").eq("store_id", storeId).eq("customer_id", resolvedCustomerId).order("travel_start_date", { ascending: false }).limit(5)
     : Promise.resolve({ data: [] as any[] }),
   db.from("air_ticket_credits").select("id, airline, original_pnr, remaining_amount_cents, expires_at, status").eq("agency_id", storeId).eq("status", "active").limit(5),
   leadOrFilters.length > 0
     ? db
         .from("leads_crm")
         .select("id, status, title, estimated_budget, source, destination_of_interest, assigned_to, notes, checklist, created_at, updated_at")
         .eq("store_id", storeId)
         .or(leadOrFilters.join(","))
         .order("created_at", { ascending: false })
         .limit(20)
     : Promise.resolve({ data: [] as any[] }),
   resolvedCustomerId
     ? db.from("travel_quotes").select("id, quote_number, title, destination, total_cents, status, created_at").eq("agency_id", storeId).eq("customer_id", resolvedCustomerId).order("created_at", { ascending: false }).limit(5)
     : Promise.resolve({ data: [] as any[] }),
   resolvedCustomerId
     ? db.from("contracts").select("id, contract_number, title, status, total_amount_cents, public_token, created_at").eq("store_id", storeId).eq("customer_id", resolvedCustomerId).order("created_at", { ascending: false }).limit(5)
     : Promise.resolve({ data: [] as any[] }),
   resolvedCustomerId
     ? db.from("customer_debt_ledger").select("id, amount_cents, status, reason, created_at").eq("customer_id", resolvedCustomerId).eq("status", "pending")
     : Promise.resolve({ data: [] as any[] }),
   resolvedCustomerId
     ? db.from("customer_documents").select("id, title, document_type, file_url, verified, created_at").eq("store_id", storeId).eq("customer_id", resolvedCustomerId).order("created_at", { ascending: false }).limit(10)
     : Promise.resolve({ data: [] as any[] }),
   resolvedCustomerId
     ? db.from("financial_transactions").select("id, description, amount_cents, status, due_date, payment_method, created_at").eq("store_id", storeId).eq("customer_id", resolvedCustomerId).order("created_at", { ascending: false }).limit(10)
     : Promise.resolve({ data: [] as any[] }),
 ]);

 const opportunities = (leadsRes?.data as any[]) || [];
 const activeLeadIdFromThread = (threadContext?.metadata as any)?.active_lead_id;
 let linkedLead: any = null;
 if (activeLeadIdFromThread === "none") {
   linkedLead = null;
 } else if (typeof activeLeadIdFromThread === "string" && activeLeadIdFromThread.length > 10) {
   linkedLead = opportunities.find((op) => op.id === activeLeadIdFromThread) || null;
   if (!linkedLead) {
     const { data: explicitLead } = await db
       .from("leads_crm")
       .select("id, status, title, estimated_budget, source, destination_of_interest, assigned_to, notes, checklist, created_at, updated_at")
       .eq("id", activeLeadIdFromThread)
       .eq("store_id", storeId)
       .maybeSingle();
     if (explicitLead) {
       linkedLead = explicitLead;
       opportunities.unshift(explicitLead);
     }
   }
 } else if (threadId) {
   // Seleciona oportunidade explicitamente originada por esta conversa; caso contrário não força associação 1:1 cega se houver múltiplas fechadas
   linkedLead =
     opportunities.find((op) => typeof op.notes === "string" && op.notes.includes(threadId)) ||
     opportunities.find((op) => !["won", "lost", "converted"].includes(String(op.status))) ||
     null;
 } else {
   linkedLead = opportunities[0] || null;
 }

 const orders = ordersRes.data || [];
 const paidOrders = orders.filter((o: any) => ["completed", "delivered", "paid"].includes(o.status));
 const totalSpentCents = paidOrders.reduce((acc: number, curr: any) => acc + (Number(curr.total_amount_cents) || 0), 0);
 const lastPurchaseAt = paidOrders[0]?.created_at || orders[0]?.created_at || null;
 const pendingDebts = (debtRes?.data as any[]) || [];
 const pendingDebtCents = pendingDebts.reduce((acc: number, curr: any) => acc + (Number(curr.amount_cents) || 0), 0);

 const memberRole = identity.memberships?.find((m) => m.store_id === storeId)?.role || identity.role || "agent";
 const isManagerOrAdmin = ["platform_admin", "owner", "admin", "manager"].includes(memberRole);

 return {
   profile: profileData,
   crmCustomer,
   threadContext,
   thread: threadContext,
   permissions: {
     role: memberRole,
     canManageOpportunities: true,
     canMoveKanbanStage: true,
     canViewFinancials: isManagerOrAdmin || ["seller", "sales", "finance", "support", "agent"].includes(memberRole),
     canManageContracts: isManagerOrAdmin || ["seller", "sales"].includes(memberRole),
   },
   metrics: {
     total_orders: orders.length,
     ltv_cents: totalSpentCents,
     last_purchase_at: lastPurchaseAt,
     pending_debt_cents: pendingDebtCents,
     active_tickets_count: (ticketsRes.data || []).filter((t: any) => t.status === "open" || t.status === "under_review").length,
   },
   orders,
   trips: (tripsRes?.data as any[]) || [],
   credits: (creditsRes?.data as any[]) || [],
   tickets: ticketsRes.data || [],
   opportunities,
   linkedLead,
   quotes: (quotesRes?.data as any[]) || [],
   contracts: (contractsRes?.data as any[]) || [],
   documents: (docsRes?.data as any[]) || [],
   invoices: (invoicesRes?.data as any[]) || [],
   debts: pendingDebts,
 };
 });

export const linkThreadToCrmOpportunitySchema = z.object({
  threadId: z.string().uuid(),
  leadId: z.string().nullable(),
});

export const linkThreadToCrmOpportunity = createServerFn({ method: "POST" })
  .validator(linkThreadToCrmOpportunitySchema)
  .handler(async ({ data: { threadId, leadId } }) => {
    const identity = await getServerIdentity();
    assertStoreAccess(identity);
    const db = getServerClient();

    const { data: current } = await db
      .from("chat_threads")
      .select("id, store_id, metadata")
      .eq("id", threadId)
      .eq("store_id", identity.store_id)
      .single();

    if (!current) throw new Error("Conversa não encontrada.");

    let linkedLead: any = null;
    if (leadId && leadId !== "none") {
      const { data: foundLead } = await db
        .from("leads_crm")
        .select("id, status, title, estimated_budget, source, destination_of_interest, assigned_to, notes, checklist, created_at, updated_at")
        .eq("id", leadId)
        .eq("store_id", identity.store_id)
        .single();
      if (!foundLead) throw new Error("Oportunidade não encontrada nesta loja.");
      linkedLead = foundLead;
    }

    const nextMeta = {
      ...(((current.metadata as any) || {}) as Record<string, any>),
      active_lead_id: leadId || "none",
      linked_opportunity_updated_at: new Date().toISOString(),
    };

    await db
      .from("chat_threads")
      .update({
        metadata: nextMeta,
        updated_at: new Date().toISOString(),
      })
      .eq("id", threadId)
      .eq("store_id", identity.store_id);

    return { success: true, linkedLead };
  });

export const registerCrmCommercialActivitySchema = z.object({
  leadId: z.string().uuid(),
  threadId: z.string().uuid().optional().nullable(),
  activityText: z.string().trim().min(2).max(400),
  activityType: z.enum(["call", "whatsapp_followup", "proposal_sent", "meeting", "note"]).default("whatsapp_followup"),
});

export const registerCrmCommercialActivity = createServerFn({ method: "POST" })
  .validator(registerCrmCommercialActivitySchema)
  .handler(async ({ data }) => {
    const { leadId, threadId, activityText, activityType } = data;
    const identity = await getServerIdentity();
    assertStoreAccess(identity);
    const db = getServerClient();

    const { data: lead, error: leadErr } = await db
      .from("leads_crm")
      .select("id, checklist, notes")
      .eq("id", leadId)
      .eq("store_id", identity.store_id)
      .single();

    if (leadErr || !lead) throw new Error("Oportunidade comercial não localizada.");

    const existingChecklist = Array.isArray(lead.checklist) ? lead.checklist : [];
    const newEntry = {
      id: `act-${Date.now()}`,
      text: `[${activityType.toUpperCase()}] ${activityText}`,
      done: true,
      created_at: new Date().toISOString(),
      author_id: identity.id,
    };
    const updatedChecklist = [...existingChecklist, newEntry];

    const { data: updatedLead, error: updErr } = await db
      .from("leads_crm")
      .update({
        checklist: updatedChecklist,
        last_contact_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", leadId)
      .eq("store_id", identity.store_id)
      .select("id, status, title, estimated_budget, source, destination_of_interest, assigned_to, notes, checklist, created_at, updated_at")
      .single();

    if (updErr) throw new Error(`Falha ao registrar atividade comercial: ${updErr.message}`);

    if (threadId) {
      await db.from("chat_messages").insert({
        thread_id: threadId,
        message: `[ATIVIDADE COMERCIAL] ${activityText}`,
        message_type: "system_event",
        payload: { is_internal: true, lead_id: leadId, activity: newEntry },
        is_staff_reply: true,
        sender_id: identity.id,
        sender_profile_id: identity.id,
      });
    }

    return { success: true, lead: updatedLead, activity: newEntry };
  });

export const updateCustomerFunnelStageSchema = z.object({
  storeId: z.string().uuid().optional(),
  leadId: z.string().uuid().optional().nullable(),
  threadId: z.string().uuid().optional().nullable(),
  customerId: z.string().uuid().optional().nullable(),
  customerName: z.string().optional().nullable(),
  customerPhone: z.string().optional().nullable(),
  stage: z.enum(["new", "contacted", "qualified", "proposal", "negotiation", "won", "lost"]),
});

export const updateCustomerFunnelStage = createServerFn({ method: "POST" })
  .validator(updateCustomerFunnelStageSchema)
  .handler(async ({ data }) => {
    const { storeId: inputStoreId, leadId, threadId, customerId, customerName, customerPhone, stage } = data;
    const identity = await getServerIdentity();
    assertStoreAccess(identity);
    const storeId = inputStoreId || identity.store_id;
    if (!storeId) throw new Error("Loja obrigatória.");
    const db = getServerClient();

    if (leadId) {
      const { data: updated, error } = await db
        .from("leads_crm")
        .update({ status: stage, updated_at: new Date().toISOString() })
        .eq("id", leadId)
        .eq("store_id", storeId)
        .select("id, status, title, estimated_budget, source, destination_of_interest, assigned_to, notes, checklist, created_at, updated_at")
        .single();
      if (error) throw new Error(`Erro ao atualizar etapa do funil: ${error.message}`);
      return updated;
    }

    const { data: created, error } = await db
      .from("leads_crm")
      .insert({
        store_id: storeId,
        title: `Atendimento — ${customerName || customerPhone || "Cliente"}`,
        full_name: customerName || "Cliente",
        phone: customerPhone || "",
        customer_id: customerId || null,
        assigned_to: identity.id,
        source: "Chat Omnichannel",
        status: stage,
        notes: threadId ? `Vinculado à conversa ${threadId}` : "Vinculado no Painel 360º",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select("id, status, title, estimated_budget, source, destination_of_interest, assigned_to, notes, checklist, created_at, updated_at")
      .single();
    if (error) throw new Error(`Erro ao criar registro no funil: ${error.message}`);

    if (threadId && created?.id) {
      const { data: currentThread } = await db.from("chat_threads").select("metadata").eq("id", threadId).eq("store_id", storeId).maybeSingle();
      await db.from("chat_threads").update({
        metadata: { ...(((currentThread?.metadata as any) || {}) as Record<string, any>), active_lead_id: created.id },
        updated_at: new Date().toISOString(),
      }).eq("id", threadId).eq("store_id", storeId);
    }

    return created;
  });

/**
 * Converte ou vincula uma conversa (WhatsApp, Instagram ou Web) em um Lead no funil comercial do CRM
 */
export const convertChatThreadToCrmLead = createServerFn({ method: "POST" })
 .validator(
 z.object({
 threadId: z.string().uuid(),
 leadTitle: z.string().min(2).max(120),
 assignedTo: z.string().uuid().optional(),
 estimatedBudget: z.number().optional(),
 destinationOfInterest: z.string().optional(),
 notes: z.string().optional(),
 }),
 )
 .handler(async ({ data }) => {
 const identity = await getServerIdentity();
 if (!identity?.id) throw new Error("Não autorizado");
 const storeId = identity.store_id;
 if (!storeId) throw new Error("Contexto de loja obrigatório.");
 assertStoreAccess(identity, STAFF_ROLES, storeId);

 const db = getServerClient();
 const { data: thread } = await db
 .from("chat_threads")
 .select("id, store_id, customer_id, guest_name, guest_email, entity_id, context_type, metadata")
 .eq("id", data.threadId)
 .eq("store_id", storeId)
 .single();

 if (!thread) throw new Error("Conversa não encontrada.");

 let phone = thread.entity_id || "";
 let email = thread.guest_email || "";
 let fullName = thread.guest_name || "Lead via Atendimento";

 if (thread.customer_id) {
 const { data: profile } = await db
 .from("profiles")
 .select("full_name, phone")
 .eq("id", thread.customer_id)
 .maybeSingle();

 if (profile) {
 fullName = profile.full_name || fullName;
 phone = profile.phone || phone;
 email = (profile as any)?.email || email;
 }
 }
 
 // Sincronização Soberana com a Carteira de Clientes / Contatos da Loja (customers_crm)
 let resolvedCustomerId = thread.customer_id || null;
 try {
  let existingCrmCustomer = null;
  if (phone) {
   const cleanDigits = String(phone).replace(/\D/g, "");
   const { data: foundByPhone } = await db
    .from("customers_crm")
    .select("id")
    .eq("store_id", storeId)
    .or(cleanDigits.length >= 8 ? `phone.eq.${phone},phone.eq.+${cleanDigits},phone.eq.${cleanDigits}` : `phone.eq.${phone}`)
    .is("deleted_at", null)
    .limit(1)
    .maybeSingle();
   existingCrmCustomer = foundByPhone;
  }
  if (!existingCrmCustomer && email) {
   const { data: foundByEmail } = await db
    .from("customers_crm")
    .select("id")
    .eq("store_id", storeId)
    .eq("email", email)
    .is("deleted_at", null)
    .limit(1)
    .maybeSingle();
   existingCrmCustomer = foundByEmail;
  }
  if (existingCrmCustomer) {
   resolvedCustomerId = existingCrmCustomer.id;
   await db
    .from("customers_crm")
    .update({
     full_name: fullName,
     updated_at: new Date().toISOString(),
    })
    .eq("id", existingCrmCustomer.id);
  } else {
   const { data: newCustomer } = await db
    .from("customers_crm")
    .insert({
     store_id: storeId,
     full_name: fullName,
     phone: phone || null,
     email: email || null,
     kind: "individual",
     channel: thread.context_type === "whatsapp" ? "whatsapp" : "chat",
     status: "active",
     tags: ["lead", "atendimento"],
     notes: data.notes || `Contato originado via Atendimento da Thread ${thread.id}`,
     created_at: new Date().toISOString(),
     updated_at: new Date().toISOString(),
    })
    .select("id")
    .maybeSingle();
   if (newCustomer?.id) {
    resolvedCustomerId = newCustomer.id;
   }
  }
 } catch (crmSyncErr) {
  console.warn("[chat.functions] Aviso ao sincronizar com customers_crm:", crmSyncErr);
 }

 const { data: lead, error: leadErr } = await db
 .from("leads_crm")
 .insert({
 store_id: storeId,
 title: data.leadTitle,
 full_name: fullName,
 phone,
 email,
 customer_id: resolvedCustomerId,
 assigned_to: data.assignedTo || identity.id,
 source: thread.context_type === "whatsapp" ? "WhatsApp Atendimento" : "Chat Central",
 destination_of_interest: data.destinationOfInterest || null,
 estimated_budget: data.estimatedBudget || null,
 status: "new",
 notes: data.notes || `Criado via Central de Atendimento da Thread ${thread.id}`,
 created_at: new Date().toISOString(),
 updated_at: new Date().toISOString(),
 })
 .select("id, title, status, full_name, phone, email, estimated_budget, destination_of_interest, created_at")
 .single();

 if (leadErr) {
 throw new Error(`Falha ao criar card no CRM: ${leadErr.message}`);
 }

 // Vincula a oportunidade recém-criada como oportunidade ativa da conversa atual (relação 1:N)
 await db
   .from("chat_threads")
   .update({
     ...(resolvedCustomerId && !thread.customer_id ? { customer_id: resolvedCustomerId } : {}),
     metadata: {
       ...(((thread as any).metadata || {}) as Record<string, any>),
       active_lead_id: lead.id,
     },
     updated_at: new Date().toISOString(),
   })
   .eq("id", thread.id);

 await db.from("chat_messages").insert({
 thread_id: data.threadId,
 message: `Card comercial gerado no CRM: "${data.leadTitle}" atribuído à equipe.`,
 message_type: "system_event",
 payload: { is_internal: true, lead_id: lead.id },
 is_staff_reply: true,
 sender_id: identity.id,
 sender_profile_id: identity.id,
 });

 return { success: true, lead };
 });

// ============================================================
// 2. Customer-Facing Functions
// ============================================================

/**
 * Obtém conversa ativa do cliente com detalhes do pedido e tickets
 */
export const getCustomerChatThread = createServerFn({ method: "GET" })
 .validator(z.object({ threadId: z.string().uuid() }))
 .handler(async ({ data: { threadId } }) => {
 try {
 const ssrClient = await getSSRClient();
 const { data: { user } } = await ssrClient.auth.getUser();

 const db = getServerClient();

 const { data: thread, error: threadErr } = await db
 .from("chat_threads")
 .select(`
 id, store_id, customer_id, guest_name, guest_email, status, subject,
 department, order_id, created_at, updated_at,
 store:stores(id, name, slug, phone, settings),
 order:orders(id, status, total_amount_cents, payment_method, created_at, items:order_items(product_name, quantity, price_cents))
 `)
 .eq("id", threadId)
 .single();

 if (threadErr || !thread) throw new Error("Conversa não encontrada.");

 // Uma thread de cliente nunca pode ser lida por UUID sem sessão autenticada.
 if (!user || !thread.customer_id || thread.customer_id !== user.id) {
 throw new Error("Acesso não autorizado.");
 }

 const rawStore: any = thread.store;
 const storeObj = Array.isArray(rawStore) ? rawStore[0] : rawStore;
 const storeSettings = (storeObj?.settings as any) || {};
 const mappedStore = storeObj ? {
 ...storeObj,
 logo_url: storeSettings.logoUrl || storeSettings.logo_url || null,
 } : null;

 const [messagesRes, ticketsRes] = await Promise.all([
 db.from("chat_messages").select("id, message, message_type, is_staff_reply, created_at, attachments, payload").eq("thread_id", threadId).order("created_at", { ascending: true }),
 db.from("store_support_tickets").select("*").eq("thread_id", threadId).order("created_at", { ascending: false }),
 ]);

 return {
 thread: {
 ...thread,
 store: mappedStore,
 },
 messages: (messagesRes.data || []).map((m: any) => ({
 id: m.id,
 message: m.message,
 message_type: m.message_type || "text",
 isStaffReply: m.is_staff_reply,
 createdAt: m.created_at,
 attachments: m.attachments || [],
 payload: m.payload || {},
 })),
 tickets: ticketsRes.data || [],

 };
 } catch (e: any) {
 console.error("[chat] getCustomerChatThread error:", e);
 throw new Error(e.message || "Erro ao buscar chat.");
 }
 });

/**
 * Cliente envia mensagem segura
 */
export const sendCustomerChatMessage = createServerFn({ method: "POST" })
 .validator(sendCustomerMessageSchema)
 .handler(async ({ data: input }) => {
 try {
 const ssrClient = await getSSRClient();
 const { data: { user } } = await ssrClient.auth.getUser();

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
  .handler(async ({ data }) => {
    try {
      const q = data.query.trim();
      const db = getServerClient();
      const ssrClient = await getSSRClient();
      const { data: { user } } = await ssrClient.auth.getUser();

      let profilesQuery = db
        .from("profiles")
        .select("id, full_name, avatar_url, bio, city")
        .limit(data.limit);

      if (user) {
        profilesQuery = profilesQuery.neq("id", user.id);
      }

      if (q.length > 0) {
        profilesQuery = profilesQuery.ilike("full_name", `%${q}%`);
      }

      let storesQuery = db
        .from("stores")
        .select("id, name, slug, settings, category, city")
        .eq("status", "active")
        .limit(data.limit);

      if (q.length > 0) {
        storesQuery = storesQuery.or(`name.ilike.%${q}%,category.ilike.%${q}%`);
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
          subtitle: s.category || "Loja & Negócio Local",
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
export const listCustomerChatThreads = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const ssrClient = await getSSRClient();
    const { data: { user } } = await ssrClient.auth.getUser();
    if (!user) throw new Error("Não autenticado");

    const db = getServerClient();
    const { data, error } = await db
      .from("chat_threads")
      .select(`
        id, store_id, status, subject, department, updated_at, created_at, order_id, thread_type, context_type, metadata, customer_id, recipient_profile_id,
        store:stores(id, name, slug, settings),
        chat_messages(id, message, created_at, is_staff_reply)
      `)
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
      messages.sort(
        (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
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
  .handler(async ({ data: input }) => {
    try {
      const ssrClient = await getSSRClient();
      const { data: { user } } = await ssrClient.auth.getUser();
      const db = getServerClient();

      if (!input.storeId && !input.recipientProfileId) {
        throw new Error("Selecione uma loja ou membro para conversar.");
      }

      let profile: any = null;
      if (user) {
        const { data: p } = await db
          .from("profiles")
          .select("full_name, avatar_url")
          .eq("id", user.id)
          .maybeSingle();
        profile = p ? { ...p, email: user.email } : null;
      }

      let threadId: string | undefined;

      if (input.recipientProfileId) {
        if (!user) throw new Error("Faça login para conversar com membros.");
        const { data: existingP2P } = await db
          .from("chat_threads")
          .select("id")
          .or(
            `and(customer_id.eq.${user.id},recipient_profile_id.eq.${input.recipientProfileId}),and(customer_id.eq.${input.recipientProfileId},recipient_profile_id.eq.${user.id})`
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
        let query = db
          .from("chat_threads")
          .select("id")
          .eq("store_id", input.storeId)
          .eq("status", "open");

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

      // Insere a mensagem inicial
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
 .handler(async ({ data }) => {
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

 // Publica card interativo do ticket na thread de chat
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
   const appOrigin = process.env.VITE_APP_URL || process.env.VITE_SITE_URL || "https://waesy.app";
   const csatUrl = `${appOrigin.replace(/\/$/, "")}/chamado/${ticket.id}`;
   await db.from("chat_messages").insert({
     thread_id: ticket.thread_id,
     message: `Seu chamado "${ticket.title || "Atendimento"}" foi concluído! Acesse a linha do tempo completa, valide a resolução e avalie nosso atendimento em: ${csatUrl}`,
     message_type: "structured_blocks",
     payload: { ticket_id: ticket.id, csat_url: csatUrl, blocks: [{ type: "summary_card", data: { title: "Avalie seu Atendimento", subtitle: `Confirme se o problema foi resolvido e dê sua nota: ${csatUrl}`, badge: "Pesquisa CSAT", action_url: csatUrl } }] },
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
 .handler(async ({ data }) => {
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

 // Notifica na conversa
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
   const appOrigin = process.env.VITE_APP_URL || process.env.VITE_SITE_URL || "https://waesy.app";
   const csatUrl = `${appOrigin.replace(/\/$/, "")}/chamado/${ticket.id}`;
   await db.from("chat_messages").insert({
     thread_id: ticket.thread_id,
     message: `Seu chamado "${ticket.title || "Atendimento"}" foi concluído! Acesse a linha do tempo completa, valide a resolução e avalie nosso atendimento em: ${csatUrl}`,
     message_type: "structured_blocks",
     payload: { ticket_id: ticket.id, csat_url: csatUrl, blocks: [{ type: "summary_card", data: { title: "Avalie seu Atendimento", subtitle: `Confirme se o problema foi resolvido e dê sua nota: ${csatUrl}`, badge: "Pesquisa CSAT", action_url: csatUrl } }] },
     is_staff_reply: true,
     sender_id: identity.id,
   });
 }
 return ticket;
 });

// ============================================================
// 4. Messenger Protocol V115 — Native CRUD & Read Receipts
// ============================================================

export const mutateCustomerChatThreadActionSchema = z.object({
  threadId: z.string().min(1),
  action: z.enum([
    "archive",
    "unarchive",
    "delete",
    "pin",
    "unpin",
    "mute",
    "unmute",
    "mark_unread",
    "mark_read",
    "clear_history",
  ]),
});

export const mutateCustomerChatThreadAction = createServerFn({ method: "POST" })
  .validator(mutateCustomerChatThreadActionSchema)
  .handler(async ({ data }) => {
    const identity = await getServerIdentity().catch(() => null);
    if (!identity?.id) {
      return { ok: false, error: "Não autenticado" };
    }

    const db = getServerClient();
    const rawId = data.threadId.replace(/^dm_/, "");

    try {
      if (data.action === "archive" || data.action === "unarchive") {
        const nextStatus = data.action === "archive" ? "archived" : "open";
        await db
          .from("chat_threads")
          .update({ status: nextStatus, updated_at: new Date().toISOString() })
          .eq("id", rawId);
        return { ok: true, action: data.action, threadId: data.threadId, status: nextStatus };
      }

      return { ok: true, action: data.action, threadId: data.threadId };
    } catch (err: any) {
      return { ok: false, error: err?.message || "Erro na ação da conversa" };
    }
  });


// ============================================================
// Função Canônica para Arquivar Conversa (Soft-Delete)
// ============================================================
export const archiveChatThreadSchema = z.object({
	threadId: z.string().uuid(),
	archived: z.boolean().default(true),
});

export const archiveChatThread = createServerFn({ method: "POST" })
	.validator(archiveChatThreadSchema)
	.handler(async ({ data: { threadId, archived } }) => {
		const identity = await getServerIdentity();
		assertStoreAccess(identity, STAFF_ROLES, identity.store_id);
		const db = getServerClient();
		const newStatus = archived ? "archived" : "open";
		const { error } = await db
			.from("chat_threads")
			.update({
				status: newStatus,
				updated_at: new Date().toISOString(),
			})
			.eq("id", threadId)
			.eq("store_id", identity.store_id);
		if (error) throw new Error(`Falha ao arquivar conversa: ${error.message}`);
		if (archived) {
			const { data: openTicket } = await db.from("store_support_tickets").select("id, title").eq("thread_id", threadId).order("created_at", { ascending: false }).limit(1).maybeSingle();
			const appOrigin = process.env.VITE_APP_URL || process.env.VITE_SITE_URL || "https://waesy.app";
			const trackingTarget = openTicket?.id || threadId;
			const csatUrl = `${appOrigin.replace(/\/$/, "")}/chamado/${trackingTarget}`;
			await db.from("chat_messages").insert({
				thread_id: threadId,
				message: `Atendimento finalizado! Acesse o resumo e avalie nosso atendente (1 a 5 estrelas) em: ${csatUrl}`,
				message_type: "structured_blocks",
				payload: { csat_url: csatUrl, ticket_id: openTicket?.id || null, blocks: [{ type: "summary_card", data: { title: "Avalie nosso Atendimento", subtitle: `Toque para dar sua nota ao atendente: ${csatUrl}`, badge: "Avaliação CSAT", action_url: csatUrl } }] },
				is_staff_reply: true,
				sender_id: identity.id,
			});
		}
		return { success: true, threadId, status: newStatus };
	});

// ============================================================
// Governança de Horários de Atendimento e Mensagens de Ausência
// ============================================================
export const supportScheduleItemSchema = z.object({
	day: z.string(),
	hours: z.string(),
	active: z.boolean(),
});

export const saveStoreSupportSettingsSchema = z.object({
	away_message: z.string().max(1000).optional(),
	auto_reply_enabled: z.boolean().optional(),
	support_schedules: z.array(supportScheduleItemSchema).optional(),
});

export const saveStoreSupportSettings = createServerFn({ method: "POST" })
	.validator(saveStoreSupportSettingsSchema)
	.handler(async ({ data }) => {
		const identity = await getServerIdentity();
		assertStoreAccess(identity, STAFF_ROLES, identity.store_id);
		const db = getServerClient();

		const { data: currentStore, error: fetchErr } = await db
			.from("stores")
			.select("settings")
			.eq("id", identity.store_id)
			.single();

		if (fetchErr) throw new Error(`Falha ao ler configurações da loja: ${fetchErr.message}`);

		const currentSettings = (currentStore?.settings || {}) as Record<string, any>;
		const updatedSupportSettings = {
			...(currentSettings.support_settings || {}),
			...(data.away_message !== undefined ? { away_message: data.away_message } : {}),
			...(data.auto_reply_enabled !== undefined ? { auto_reply_enabled: data.auto_reply_enabled } : {}),
			...(data.support_schedules !== undefined ? { support_schedules: data.support_schedules } : {}),
			updated_at: new Date().toISOString(),
		};

		const mergedSettings = {
			...currentSettings,
			support_settings: updatedSupportSettings,
		};

		const { error: updateErr } = await db
			.from("stores")
			.update({
				settings: mergedSettings,
			})
			.eq("id", identity.store_id);

		if (updateErr) throw new Error(`Falha ao salvar configurações de atendimento: ${updateErr.message}`);

		return { success: true, support_settings: updatedSupportSettings };
	});


// ============================================================
// 1.5. Whaticket / Chatwoot Parity: Quick Replies, Transfers & Tags
// ============================================================

export const transferChatThread = createServerFn({ method: "POST" })
  .validator(
    z.object({
      threadId: z.string().uuid(),
      toDepartment: z.string().min(1),
      toProfileId: z.string().uuid().nullable().optional(),
      contextNotes: z.string().min(3, "Nota de contexto obrigatória"),
    })
  )
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    assertStoreAccess(identity);
    const db = getServerClient();

    // 1. Consultar thread atual
    const { data: thread } = await db
      .from("chat_threads")
      .select("id, store_id, department, assigned_to_profile_id")
      .eq("id", data.threadId)
      .eq("store_id", identity.store_id)
      .single();

    if (!thread) throw new Error("Conversa não encontrada.");

    // 2. Atualizar thread com novo departamento e notas
    await db
      .from("chat_threads")
      .update({
        department: data.toDepartment,
        assigned_to_profile_id: data.toProfileId || null,
        internal_notes: data.contextNotes,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.threadId)
      .eq("store_id", identity.store_id);

    // 3. Registrar log de transferência
    try {
      await db.from("chat_thread_transfers").insert({
        thread_id: data.threadId,
        store_id: identity.store_id,
        transferred_by_profile_id: identity.id,
        from_department: thread.department,
        to_department: data.toDepartment,
        from_profile_id: thread.assigned_to_profile_id,
        to_profile_id: data.toProfileId || null,
        context_notes: data.contextNotes,
      });
    } catch {
      // Best-effort audit log
    }

    // 4. Inserir nota interna (whisper) com contexto para a nova equipe
    const { data: whisperMsg } = await db.from("chat_messages").insert({
      thread_id: data.threadId,
      message: `[TRANSFERÊNCIA] Transferência para [${data.toDepartment.toUpperCase()}]: ${data.contextNotes}`,
      message_type: "system_event",
      is_staff_reply: true,
      sender_profile_id: identity.id,
      payload: {
        is_whisper: true,
        transfer: {
          fromDepartment: thread.department,
          toDepartment: data.toDepartment,
          fromProfileId: thread.assigned_to_profile_id,
          toProfileId: data.toProfileId,
          notes: data.contextNotes,
          transferredByName: (identity as any).full_name || (identity as any).fullName || "Operador",
        },
      },
    }).select().single();

    return { success: true, whisperMsg };
  });

export const updateThreadTags = createServerFn({ method: "POST" })
  .validator(
    z.object({
      threadId: z.string().uuid(),
      tags: z.array(z.string()),
    })
  )
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    assertStoreAccess(identity);
    const db = getServerClient();

    const { data: updated, error } = await db
      .from("chat_threads")
      .update({
        tags: data.tags,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.threadId)
      .eq("store_id", identity.store_id)
      .select("id, tags")
      .single();

    if (error) throw new Error(`Falha ao atualizar tags: ${error.message}`);
    return updated;
  });

export const listChatQuickReplies = createServerFn({ method: "GET" })
  .handler(async () => {
    try {
      const identity = await getServerIdentity();
      assertStoreAccess(identity);
      const db = getServerClient();

      const [{ data: storeMacros }, { data: chatReplies }] = await Promise.all([
        db
          .from("store_quick_answers")
          .select("id, shortcut, title, message, media_url, category")
          .eq("store_id", identity.store_id)
          .order("shortcut", { ascending: true }),
        db
          .from("chat_quick_replies")
          .select("id, shortcut, title, content, media_url, category")
          .eq("store_id", identity.store_id)
          .order("shortcut", { ascending: true }),
      ]);

      const mergedMap = new Map<string, { id: string; shortcut: string; title: string; content: string; media_url?: string | null; category: string }>();

      for (const item of chatReplies || []) {
        mergedMap.set(item.shortcut, {
          id: item.id,
          shortcut: item.shortcut,
          title: item.title,
          content: item.content,
          media_url: item.media_url,
          category: item.category || "geral",
        });
      }

      for (const item of storeMacros || []) {
        mergedMap.set(item.shortcut, {
          id: item.id,
          shortcut: item.shortcut,
          title: item.title,
          content: item.message,
          media_url: item.media_url,
          category: item.category || "geral",
        });
      }

      return Array.from(mergedMap.values());
    } catch {
      return [];
    }
  });

export const createChatQuickReply = createServerFn({ method: "POST" })
  .validator(
    z.object({
      shortcut: z.string().min(1).max(30),
      title: z.string().min(1).max(60),
      content: z.string().min(1).max(1000),
      media_url: z.string().url().optional(),
      category: z.string().default("geral"),
    })
  )
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    assertStoreAccess(identity);
    const db = getServerClient();

    const cleanShortcut = data.shortcut.replace(/^\//, "").toLowerCase().trim();

    const { data: created, error } = await db
      .from("chat_quick_replies")
      .insert({
        store_id: identity.store_id,
        shortcut: cleanShortcut,
        title: data.title.trim(),
        content: data.content.trim(),
        media_url: data.media_url || null,
        category: data.category,
        created_by: identity.id,
      })
      .select()
      .single();

    if (error) throw new Error(`Falha ao criar resposta rápida: ${error.message}`);
    return created;
  });

export const updateCustomerProfileFromChatSchema = z.object({
  customerId: z.string().uuid().optional().nullable(),
  threadId: z.string().uuid().optional().nullable(),
  fullName: z.string().trim().min(2).max(120),
  phone: z.string().trim().max(40).optional().nullable(),
  email: z.string().trim().max(120).optional().nullable(),
  documentCpf: z.string().trim().max(30).optional().nullable(),
  city: z.string().trim().max(80).optional().nullable(),
});

export const updateCustomerProfileFromChat = createServerFn({ method: "POST" })
  .validator(updateCustomerProfileFromChatSchema)
  .handler(async ({ data }) => {
    const { customerId, threadId, fullName, phone, email, documentCpf, city } = data;
    const identity = await getServerIdentity();
    assertStoreAccess(identity);
    const db = getServerClient();

    if (customerId) {
      await db
        .from("profiles")
        .update({
          full_name: fullName,
          ...(phone !== undefined ? { phone: phone || null } : {}),

          ...(documentCpf !== undefined ? { cpf: documentCpf || null } : {}),
          ...(city !== undefined ? { city: city || null } : {}),
          updated_at: new Date().toISOString(),
        })
        .eq("id", customerId);
    }

    if (threadId) {
      const { data: currentThread } = await db
        .from("chat_threads")
        .select("metadata")
        .eq("id", threadId)
        .eq("store_id", identity.store_id)
        .maybeSingle();

      const nextMeta = {
        ...(((currentThread?.metadata as any) || {}) as Record<string, any>),
        customer_profile_override: {
          full_name: fullName,
          phone: phone || null,
          email: email || null,
          document_cpf: documentCpf || null,
          city: city || null,
          updated_at: new Date().toISOString(),
        },
      };

      await db
        .from("chat_threads")
        .update({
          guest_name: fullName,
          ...(email !== undefined ? { guest_email: email || null } : {}),
          metadata: nextMeta,
          updated_at: new Date().toISOString(),
        })
        .eq("id", threadId)
        .eq("store_id", identity.store_id);
    }

    // Sincronização em customers_crm da loja
    try {
      const storeId = identity.store_id;
      if (storeId) {
        let existing = null;
        if (customerId) {
          const { data: foundById } = await db
            .from("customers_crm")
            .select("id")
            .eq("store_id", storeId)
            .eq("id", customerId)
            .is("deleted_at", null)
            .maybeSingle();
          existing = foundById;
        }
        if (!existing && phone) {
          const { data: foundByPhone } = await db
            .from("customers_crm")
            .select("id")
            .eq("store_id", storeId)
            .eq("phone", phone)
            .is("deleted_at", null)
            .maybeSingle();
          existing = foundByPhone;
        }
        if (!existing && email) {
          const { data: foundByEmail } = await db
            .from("customers_crm")
            .select("id")
            .eq("store_id", storeId)
            .eq("email", email)
            .is("deleted_at", null)
            .maybeSingle();
          existing = foundByEmail;
        }

        if (existing) {
          await db
            .from("customers_crm")
            .update({
              full_name: fullName,
              ...(phone !== undefined ? { phone: phone || null } : {}),
              ...(email !== undefined ? { email: email || null } : {}),
              ...(documentCpf !== undefined ? { document: documentCpf || null } : {}),
              ...(city !== undefined ? { city: city || null } : {}),
              updated_at: new Date().toISOString(),
            })
            .eq("id", existing.id);
        } else {
          await db
            .from("customers_crm")
            .insert({
              store_id: storeId,
              full_name: fullName,
              phone: phone || null,
              email: email || null,
              document: documentCpf || null,
              city: city || null,
              kind: "individual",
              channel: "chat",
              status: "active",
              tags: ["contato", "atendimento"],
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });
        }
      }
    } catch (crmErr) {
      console.warn("[chat.functions] Erro ao sincronizar updateCustomerProfileFromChat em customers_crm:", crmErr);
    }

    return {
      success: true,
      profile: {
        id: customerId || null,
        full_name: fullName,
        phone: phone || null,
        email: email || null,
        document_cpf: documentCpf || null,
        city: city || null,
      },
    };
  });

export const updateThreadAiHandoffModeSchema = z.object({
  threadId: z.string().uuid(),
  handoffMode: z.enum(["ai_triage", "human_queue", "human_active"]),
  aiAutoReplyEnabled: z.boolean(),
  triageSummary: z.string().max(500).optional(),
});

export const updateThreadAiHandoffMode = createServerFn({ method: "POST" })
  .validator(updateThreadAiHandoffModeSchema)
  .handler(async ({ data }) => {
    const { threadId, handoffMode, aiAutoReplyEnabled, triageSummary } = data;
    const identity = await getServerIdentity();
    assertStoreAccess(identity);
    const db = getServerClient();

    const { data: current } = await db
      .from("chat_threads")
      .select("metadata")
      .eq("id", threadId)
      .eq("store_id", identity.store_id)
      .single();

    const nextMetadata = {
      ...(((current?.metadata as any) || {}) as Record<string, any>),
      handoff_mode: handoffMode,
      ai_auto_reply_enabled: aiAutoReplyEnabled,
      ...(triageSummary ? { ai_triage_summary: triageSummary } : {}),
      handoff_updated_at: new Date().toISOString(),
      handoff_updated_by: identity.id,
    };

    const { error } = await db
      .from("chat_threads")
      .update({
        metadata: nextMetadata,
        ...(handoffMode === "human_active" ? { assigned_to_profile_id: identity.id } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq("id", threadId)
      .eq("store_id", identity.store_id);

    if (error) throw new Error(`Falha ao atualizar modo IA/Humano: ${error.message}`);
    return { success: true, handoffMode, aiAutoReplyEnabled, metadata: nextMetadata };
  });

export const createSupportTicketFromChatSchema = z.object({
  threadId: z.string().uuid(),
  customerId: z.string().uuid().optional().nullable(),
  title: z.string().trim().min(3).max(140),
  description: z.string().trim().min(3).max(1000),
  ticketType: z.enum(["support", "return_exchange", "defect_complaint", "Order_Demand"]).default("support"),
  priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
});

export const createSupportTicketFromChat = createServerFn({ method: "POST" })
  .validator(createSupportTicketFromChatSchema)
  .handler(async ({ data }) => {
    const { threadId, customerId, title, description, ticketType, priority } = data;
    const identity = await getServerIdentity();
    assertStoreAccess(identity);
    const db = getServerClient();

    const initialStep = {
      id: `step-${Date.now()}`,
      label: "Chamado registrado e em triagem",
      status: "done",
      created_at: new Date().toISOString(),
    };

    const { data: ticket, error } = await db
      .from("store_support_tickets")
      .insert({
        thread_id: threadId,
        store_id: identity.store_id,
        customer_id: customerId || identity.id,
        ticket_type: ticketType === "Order_Demand" ? "support" : ticketType,
        title,
        description,
        photo_urls: [],
        status: "open",
        priority,
        resolution_notes: JSON.stringify({ steps: [initialStep], public_summary: description }),
      })
      .select()
      .single();

    if (error) throw new Error(`Falha ao criar demanda/ticket: ${error.message}`);

    const appOrigin = process.env.VITE_APP_URL || process.env.VITE_SITE_URL || "https://waesy.app";
    const trackingUrl = `${appOrigin.replace(/\/$/, "")}/chamado/${ticket.id}`;

    await db.from("chat_messages").insert({
      thread_id: threadId,
      message: `Protocolo de Atendimento aberto: "${title}". Acompanhe cada etapa em tempo real: ${trackingUrl}`,
      message_type: "rma_ticket",
      payload: {
        ticket_id: ticket.id,
        ticket_type: ticket.ticket_type,
        title: ticket.title,
        description: ticket.description,
        status: ticket.status,
        tracking_url: trackingUrl,
        steps: [initialStep],
      },
      is_staff_reply: true,
      sender_id: identity.id,
      sender_profile_id: identity.id,
    });

    return {
      ...ticket,
      tracking_url: trackingUrl,
      steps: [initialStep],
    };
  });

export const addSupportTicketStepSchema = z.object({
  ticketId: z.string().uuid(),
  threadId: z.string().uuid().optional().nullable(),
  stepLabel: z.string().trim().min(2).max(160),
  nextStatus: z.enum(["open", "under_review", "action_required", "resolved"]).optional(),
});

export const addSupportTicketStep = createServerFn({ method: "POST" })
  .validator(addSupportTicketStepSchema)
  .handler(async ({ data }) => {
    const { ticketId, threadId, stepLabel, nextStatus } = data;
    const identity = await getServerIdentity();
    assertStoreAccess(identity);
    const db = getServerClient();

    const { data: ticket, error: fetchErr } = await db
      .from("store_support_tickets")
      .select("*")
      .eq("id", ticketId)
      .eq("store_id", identity.store_id)
      .single();

    if (fetchErr || !ticket) throw new Error("Ticket não encontrado.");

    let parsedMeta: { steps?: Array<{ id: string; label: string; status: string; created_at: string }>; public_summary?: string; csat?: any } = {};
    if (ticket.resolution_notes && String(ticket.resolution_notes).startsWith("{")) {
      try {
        parsedMeta = JSON.parse(String(ticket.resolution_notes));
      } catch {
        parsedMeta = { public_summary: String(ticket.resolution_notes) };
      }
    } else if (ticket.resolution_notes) {
      parsedMeta = { public_summary: String(ticket.resolution_notes) };
    }

    const existingSteps = Array.isArray(parsedMeta.steps) ? parsedMeta.steps : [];
    const newStep = {
      id: `step-${Date.now()}`,
      label: stepLabel,
      status: "done",
      created_at: new Date().toISOString(),
    };
    const updatedSteps = [...existingSteps, newStep];
    const finalStatus = nextStatus || ticket.status;

    const { data: updated, error: updateErr } = await db
      .from("store_support_tickets")
      .update({
        status: finalStatus,
        resolution_notes: JSON.stringify({
          ...parsedMeta,
          steps: updatedSteps,
        }),
        updated_at: new Date().toISOString(),
      })
      .eq("id", ticketId)
      .select()
      .single();

    if (updateErr) throw new Error(`Falha ao adicionar etapa: ${updateErr.message}`);

    const targetThreadId = threadId || ticket.thread_id;
    const appOrigin = process.env.VITE_APP_URL || process.env.VITE_SITE_URL || "https://waesy.app";
    const trackingUrl = `${appOrigin.replace(/\/$/, "")}/chamado/${ticket.id}`;

    if (targetThreadId) {
      await db.from("chat_messages").insert({
        thread_id: targetThreadId,
        message:
          finalStatus === "resolved"
            ? `Etapa concluída: "${stepLabel}". Seu chamado foi resolvido! Valide a solução e avalie o atendimento em: ${trackingUrl}`
            : `Nova etapa no chamado "${ticket.title}": ${stepLabel}. Acompanhe em: ${trackingUrl}`,
        message_type: "system_event",
        payload: {
          ticket_id: ticket.id,
          status: finalStatus,
          step: newStep,
          tracking_url: trackingUrl,
        },
        is_staff_reply: true,
        sender_id: identity.id,
      });
    }

    return {
      ticket: updated,
      steps: updatedSteps,
      tracking_url: trackingUrl,
    };
  });

export const getPublicTicketTrackingSchema = z.object({
  ticketId: z.string().min(4),
});

export const getPublicTicketTracking = createServerFn({ method: "GET" })
  .validator(getPublicTicketTrackingSchema)
  .handler(async ({ data }) => {
    const { ticketId } = data;
    const db = getServerClient();

    let { data: ticket } = await db
      .from("store_support_tickets")
      .select("id, thread_id, store_id, title, description, status, priority, ticket_type, resolution_notes, created_at, updated_at")
      .eq("id", ticketId)
      .maybeSingle();

    if (!ticket) {
      const { data: byThread } = await db
        .from("store_support_tickets")
        .select("id, thread_id, store_id, title, description, status, priority, ticket_type, resolution_notes, created_at, updated_at")
        .eq("thread_id", ticketId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      ticket = byThread || null;
    }

    let threadData: any = null;
    const lookupThreadId = ticket?.thread_id || ticketId;
    const { data: tr } = await db
      .from("chat_threads")
      .select("id, store_id, subject, department, status, guest_name, assigned_to_profile_id, created_at, updated_at, metadata")
      .eq("id", lookupThreadId)
      .maybeSingle();
    threadData = tr;

    const storeId = ticket?.store_id || threadData?.store_id;
    let storeInfo: { name: string; slug: string } = { name: "Central de Atendimento", slug: "" };
    if (storeId) {
      const { data: st } = await db.from("stores").select("name, slug").eq("id", storeId).maybeSingle();
      if (st) storeInfo = { name: st.name, slug: st.slug };
    }

    let assignedAgentName = "Equipe de Atendimento";
    if (threadData?.assigned_to_profile_id) {
      const { data: ag } = await db
        .from("profiles")
        .select("full_name")
        .eq("id", threadData.assigned_to_profile_id)
        .maybeSingle();
      if (ag?.full_name) assignedAgentName = ag.full_name;
    }

    let steps: Array<{ id: string; label: string; status: string; created_at: string }> = [];
    let publicSummary = ticket?.description || "";
    let csatData: { rating?: number; comment?: string; problemResolved?: boolean; submittedAt?: string } | null = null;

    if (ticket?.resolution_notes && String(ticket.resolution_notes).startsWith("{")) {
      try {
        const parsed = JSON.parse(String(ticket.resolution_notes));
        if (Array.isArray(parsed.steps)) steps = parsed.steps;
        if (parsed.public_summary) publicSummary = parsed.public_summary;
        if (parsed.csat) csatData = parsed.csat;
      } catch {
        publicSummary = String(ticket.resolution_notes);
      }
    } else if (threadData?.metadata?.csat) {
      csatData = threadData.metadata.csat;
    }

    if (steps.length === 0) {
      steps = [
        {
          id: "st-open",
          label: "Solicitação recebida pela central de atendimento",
          status: "done",
          created_at: ticket?.created_at || threadData?.created_at || new Date().toISOString(),
        },
        ...(ticket?.status === "resolved" || threadData?.status === "archived"
          ? [
              {
                id: "st-resolved",
                label: "Atendimento concluído e liberado para validação do cliente",
                status: "done",
                created_at: ticket?.updated_at || threadData?.updated_at || new Date().toISOString(),
              },
            ]
          : []),
      ];
    }

    let publicTimelineMessages: Array<{ id: string; message: string; isStaff: boolean; createdAt: string }> = [];
    if (lookupThreadId) {
      const { data: rawMsgs } = await db
        .from("chat_messages")
        .select("id, message, is_staff_reply, payload, created_at")
        .eq("thread_id", lookupThreadId)
        .order("created_at", { ascending: true })
        .limit(50);

      publicTimelineMessages = (rawMsgs || [])
        .filter((m: any) => !m.payload?.is_internal && !m.payload?.is_whisper)
        .map((m: any) => ({
          id: m.id,
          message: m.message,
          isStaff: Boolean(m.is_staff_reply),
          createdAt: m.created_at,
        }));
    }

    return {
      id: ticket?.id || threadData?.id || ticketId,
      protocolCode: `TKT-${String(ticket?.id || threadData?.id || ticketId).slice(0, 8).toUpperCase()}`,
      title: ticket?.title || threadData?.subject || "Atendimento ao Cliente",
      description: publicSummary,
      status: ticket?.status || (threadData?.status === "archived" ? "resolved" : "open"),
      department: threadData?.department || "suporte",
      assignedAgentName,
      storeName: storeInfo.name,
      storeSlug: storeInfo.slug,
      createdAt: ticket?.created_at || threadData?.created_at || new Date().toISOString(),
      updatedAt: ticket?.updated_at || threadData?.updated_at || new Date().toISOString(),
      steps,
      publicMessages: publicTimelineMessages,
      csat: csatData,
    };
  });

export const submitPublicTicketCsatSchema = z.object({
  ticketId: z.string().min(4),
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(600).optional(),
  problemResolved: z.boolean(),
});

export const submitPublicTicketCsat = createServerFn({ method: "POST" })
  .validator(submitPublicTicketCsatSchema)
  .handler(async ({ data }) => {
    const { ticketId, rating, comment, problemResolved } = data;
    const db = getServerClient();

    const csatPayload = {
      rating,
      comment: comment || "",
      problemResolved,
      submittedAt: new Date().toISOString(),
    };

    const { data: ticket } = await db
      .from("store_support_tickets")
      .select("id, thread_id, title, status, resolution_notes")
      .eq("id", ticketId)
      .maybeSingle();

    let targetThreadId = ticket?.thread_id || null;

    if (ticket) {
      let parsedMeta: Record<string, any> = {};
      if (ticket.resolution_notes && String(ticket.resolution_notes).startsWith("{")) {
        try {
          parsedMeta = JSON.parse(String(ticket.resolution_notes));
        } catch {
          parsedMeta = { public_summary: String(ticket.resolution_notes) };
        }
      }
      const existingSteps = Array.isArray(parsedMeta.steps) ? parsedMeta.steps : [];
      const csatStep = {
        id: `step-csat-${Date.now()}`,
        label: problemResolved
          ? `Resolução confirmada pelo cliente • Avaliação: ${rating}/5 estrelas`
          : `Cliente informou que o problema persiste • Chamado reaberto (${rating}/5 estrelas)`,
        status: "done",
        created_at: new Date().toISOString(),
      };

      const nextStatus = problemResolved ? "resolved" : "action_required";
      await db
        .from("store_support_tickets")
        .update({
          status: nextStatus,
          resolution_notes: JSON.stringify({
            ...parsedMeta,
            steps: [...existingSteps, csatStep],
            csat: csatPayload,
          }),
          updated_at: new Date().toISOString(),
        })
        .eq("id", ticket.id);
    } else {
      targetThreadId = ticketId;
    }

    if (targetThreadId) {
      const { data: tr } = await db
        .from("chat_threads")
        .select("id, metadata, status")
        .eq("id", targetThreadId)
        .maybeSingle();

      if (tr) {
        await db
          .from("chat_threads")
          .update({
            status: problemResolved ? tr.status : "open",
            metadata: {
              ...(((tr.metadata as any) || {}) as Record<string, any>),
              csat: csatPayload,
              csat_rating: rating,
            },
            updated_at: new Date().toISOString(),
          })
          .eq("id", tr.id);

        await db.from("chat_messages").insert({
          thread_id: tr.id,
          message: problemResolved
            ? `[AVALIAÇÃO CSAT] Cliente avaliou o atendimento com ${rating}/5 estrelas e confirmou a resolução.${comment ? ` Comentário: "${comment}"` : ""}`
            : `[REABERTURA DE CHAMADO] Cliente avaliou com ${rating}/5 estrelas e informou que o problema ainda não foi resolvido.${comment ? ` Detalhe: "${comment}"` : ""}`,
          message_type: "system_event",
          payload: {
            csat: csatPayload,
            reopened: !problemResolved,
          },
          is_staff_reply: false,
        });
      }
    }

    return {
      success: true,
      csat: csatPayload,
      reopened: !problemResolved,
    };
  });

// ============================================================
// Reset e Higienização Local de Conversas (Sem tocar no WhatsApp)
// ============================================================

export const clearChatThreadMessagesSchema = z.object({
  threadId: z.string().uuid(),
  storeId: z.string().uuid().optional(),
});

export const clearChatThreadMessagesLocal = createServerFn({ method: "POST" })
  .validator(clearChatThreadMessagesSchema)
  .handler(async ({ data: { threadId, storeId: inputStoreId } }) => {
    const identity = await getServerIdentity();
    const storeId = inputStoreId || identity.store_id;
    if (!storeId) throw new Error("Loja obrigatória.");
    assertStoreAccess(identity, MANAGER_ROLES, storeId);

    const db = getServerClient();
    const { data: thread } = await db
      .from("chat_threads")
      .select("id, store_id")
      .eq("id", threadId)
      .eq("store_id", storeId)
      .single();

    if (!thread) throw new Error("Conversa não localizada para esta loja.");

    // Apaga estritamente as mensagens do WhatsApp locais (PRESERVA notas internas da equipe intactas)
    const { data: allMsgs } = await db
      .from("chat_messages")
      .select("id, payload, message_type")
      .eq("thread_id", threadId);

    const idsToDelete = (allMsgs || [])
      .filter((m: any) => !m.payload?.is_internal && !m.payload?.is_whisper && m.message_type !== "internal_note" && m.message_type !== "system_event")
      .map((m: any) => m.id);

    if (idsToDelete.length > 0) {
      const { error: deleteErr } = await db
        .from("chat_messages")
        .delete()
        .in("id", idsToDelete);

      if (deleteErr) throw new Error(`Falha ao limpar mensagens locais: ${deleteErr.message}`);
    }

    await db
      .from("chat_threads")
      .update({
        last_message_text: null,
        last_message_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", threadId);

    return { success: true, threadId, message: "Mensagens do WhatsApp limpas no sistema local (notas internas preservadas)." };
  });

export const deleteChatThreadLocalSchema = z.object({
  threadId: z.string().uuid(),
  storeId: z.string().uuid().optional(),
});

export const deleteChatThreadLocal = createServerFn({ method: "POST" })
  .validator(deleteChatThreadLocalSchema)
  .handler(async ({ data: { threadId, storeId: inputStoreId } }) => {
    const identity = await getServerIdentity();
    const storeId = inputStoreId || identity.store_id;
    if (!storeId) throw new Error("Loja obrigatória.");
    assertStoreAccess(identity, MANAGER_ROLES, storeId);

    const db = getServerClient();
    const { data: thread } = await db
      .from("chat_threads")
      .select("id, store_id, internal_notes")
      .eq("id", threadId)
      .eq("store_id", storeId)
      .single();

    if (!thread) throw new Error("Conversa não localizada.");

    // Identifica mensagens internas e notas protegidas
    const { data: allMsgs } = await db
      .from("chat_messages")
      .select("id, payload, message_type")
      .eq("thread_id", threadId);

    const isInternal = (m: any) => Boolean(
      m.payload?.is_internal ||
      m.payload?.is_whisper ||
      m.payload?.whisper ||
      m.message_type === "internal_note" ||
      m.message_type === "system_event"
    );

    const idsToDelete = (allMsgs || []).filter((m: any) => !isInternal(m)).map((m: any) => m.id);
    const hasRemainingNotes = (allMsgs || []).some(isInternal) || Boolean(thread.internal_notes && thread.internal_notes.trim());

    if (idsToDelete.length > 0) {
      await db.from("chat_messages").delete().in("id", idsToDelete);
    }
    await db.from("chat_conversation_keys").delete().eq("thread_id", threadId);

    if (hasRemainingNotes) {
      await db.from("chat_threads").update({
        status: "archived",
        last_message_text: "(Histórico WhatsApp excluído - Anotações internas preservadas)",
        updated_at: new Date().toISOString(),
      }).eq("id", threadId);
    } else {
      const { error } = await db.from("chat_threads").delete().eq("id", threadId).eq("store_id", storeId);
      if (error) throw new Error(`Falha ao excluir conversa do sistema: ${error.message}`);
    }

    return { success: true, threadId, message: "Conversa e histórico limpos com segurança (anotações internas preservadas)." };
  });

export const deleteChatContactPermanentlySchema = z.object({
  threadId: z.string().uuid(),
  storeId: z.string().uuid().optional(),
  deleteFromCrm: z.boolean().default(true),
});

export const deleteChatContactPermanently = createServerFn({ method: "POST" })
  .validator(deleteChatContactPermanentlySchema)
  .handler(async ({ data: { threadId, storeId: inputStoreId, deleteFromCrm } }) => {
    const identity = await getServerIdentity();
    const storeId = inputStoreId || identity.store_id;
    if (!storeId) throw new Error("Loja obrigatória.");
    assertStoreAccess(identity, MANAGER_ROLES, storeId);

    const db = getServerClient();
    const { data: thread } = await db
      .from("chat_threads")
      .select("id, store_id, customer_id, guest_name, entity_id, metadata, internal_notes")
      .eq("id", threadId)
      .eq("store_id", storeId)
      .single();

    if (!thread) throw new Error("Conversa ou contato não localizado.");

    // 1. Limpa histórico de mensagens e chaves criptográficas (preservando notas internas da equipe para auditoria)
    const { data: allMsgs } = await db
      .from("chat_messages")
      .select("id, payload, message_type")
      .eq("thread_id", threadId);

    const isInternal = (m: any) => Boolean(
      m.payload?.is_internal ||
      m.payload?.is_whisper ||
      m.payload?.whisper ||
      m.message_type === "internal_note" ||
      m.message_type === "system_event"
    );

    const idsToDelete = (allMsgs || []).filter((m: any) => !isInternal(m)).map((m: any) => m.id);
    const hasRemainingNotes = (allMsgs || []).some(isInternal) || Boolean(thread.internal_notes && thread.internal_notes.trim());

    if (idsToDelete.length > 0) {
      await db.from("chat_messages").delete().in("id", idsToDelete);
    }
    await db.from("chat_conversation_keys").delete().eq("thread_id", threadId);

    // 2. Remove da fila de outbox pendente (se houver)
    await db.from("whatsapp_outbox").delete().eq("thread_id", threadId).eq("store_id", storeId);

    // 3. Exclui a thread principal se não houver anotações internas remanescentes
    if (!hasRemainingNotes) {
      const { error: threadErr } = await db.from("chat_threads").delete().eq("id", threadId).eq("store_id", storeId);
      if (threadErr) throw new Error(`Falha ao excluir conversa: ${threadErr.message}`);
    } else {
      await db.from("chat_threads").update({ status: "archived", last_message_text: "(Histórico WhatsApp excluído - Anotações internas preservadas)" }).eq("id", threadId);
    }

    // 4. Se solicitado, expurga/inativa o contato no CRM para empresas de marketing
    if (deleteFromCrm && thread.customer_id) {
      const nowIso = new Date().toISOString();
      await db.from("customers_crm").update({ deleted_at: nowIso }).eq("id", thread.customer_id).eq("store_id", storeId);
      await db.from("leads_crm").update({ deleted_at: nowIso }).eq("customer_id", thread.customer_id).eq("store_id", storeId);
    }

    return {
      success: true,
      threadId,
      message: "Contato e histórico excluídos permanentemente conforme solicitação do supervisor.",
    };
  });

export const requestChatContactDeletionSchema = z.object({
  threadId: z.string().uuid(),
  storeId: z.string().uuid().optional(),
  reason: z.string().min(3, "Justificativa obrigatória para solicitação de exclusão."),
});

export const requestChatContactDeletion = createServerFn({ method: "POST" })
  .validator(requestChatContactDeletionSchema)
  .handler(async ({ data: { threadId, storeId: inputStoreId, reason } }) => {
    const identity = await getServerIdentity();
    const storeId = inputStoreId || identity.store_id;
    if (!storeId) throw new Error("Loja obrigatória.");
    assertStoreAccess(identity, STAFF_ROLES, storeId);

    const db = getServerClient();
    const { data: thread } = await db
      .from("chat_threads")
      .select("id, store_id, customer_id")
      .eq("id", threadId)
      .eq("store_id", storeId)
      .single();

    if (!thread) throw new Error("Conversa não localizada.");

    const { data: req, error } = await db
      .from("chat_contact_deletion_requests")
      .insert({
        store_id: storeId,
        thread_id: threadId,
        customer_id: thread.customer_id || null,
        requested_by_profile_id: identity.id,
        reason: reason.trim(),
        status: "pending",
      })
      .select("id, status, created_at")
      .single();

    if (error) throw new Error(`Falha ao registrar solicitação de exclusão: ${error.message}`);
    return {
      success: true,
      requestId: req.id,
      message: "Solicitação de exclusão encaminhada ao supervisor com sucesso.",
    };
  });

export const reviewChatContactDeletionRequestSchema = z.object({
  requestId: z.string().uuid(),
  approved: z.boolean(),
  reviewNotes: z.string().optional(),
  deleteFromCrm: z.boolean().default(true),
});

export const reviewChatContactDeletionRequest = createServerFn({ method: "POST" })
  .validator(reviewChatContactDeletionRequestSchema)
  .handler(async ({ data: { requestId, approved, reviewNotes, deleteFromCrm } }) => {
    const identity = await getServerIdentity();
    const db = getServerClient();

    const { data: req } = await db
      .from("chat_contact_deletion_requests")
      .select("id, store_id, thread_id, customer_id, status")
      .eq("id", requestId)
      .single();

    if (!req) throw new Error("Solicitação não encontrada.");
    assertStoreAccess(identity, ["owner", "admin", "manager", "platform_admin"], req.store_id);

    if (req.status !== "pending") {
      throw new Error("Esta solicitação já foi analisada.");
    }

    const nowIso = new Date().toISOString();
    if (approved) {
      await db.from("chat_messages").delete().eq("thread_id", req.thread_id).neq("message_type", "internal_note").neq("message_type", "system_event");
      await db.from("chat_conversation_keys").delete().eq("thread_id", req.thread_id);
      await db.from("whatsapp_outbox").delete().eq("thread_id", req.thread_id).eq("store_id", req.store_id);
      
      const { count: remainingReqNotes } = await db.from("chat_messages").select("id", { count: "exact", head: true }).eq("thread_id", req.thread_id);
      if ((remainingReqNotes || 0) === 0) {
        await db.from("chat_threads").delete().eq("id", req.thread_id).eq("store_id", req.store_id);
      } else {
        await db.from("chat_threads").update({ status: "archived", last_message_text: "(Histórico WhatsApp excluído pelo supervisor - Anotações internas preservadas)" }).eq("id", req.thread_id);
      }

      if (deleteFromCrm && req.customer_id) {
        await db.from("customers_crm").update({ deleted_at: nowIso }).eq("id", req.customer_id).eq("store_id", req.store_id);
        await db.from("leads_crm").update({ deleted_at: nowIso }).eq("customer_id", req.customer_id).eq("store_id", req.store_id);
      }
    }

    await db
      .from("chat_contact_deletion_requests")
      .update({
        status: approved ? "approved" : "rejected",
        reviewed_by_profile_id: identity.id,
        review_notes: reviewNotes || null,
        reviewed_at: nowIso,
      })
      .eq("id", requestId);

    return {
      success: true,
      approved,
      message: approved ? "Exclusão autorizada e executada com sucesso." : "Solicitação de exclusão recusada.",
    };
  });

export const listChatContactDeletionRequestsSchema = z.object({
  storeId: z.string().uuid().optional(),
  status: z.enum(["pending", "approved", "rejected", "all"]).default("pending"),
});

export const listChatContactDeletionRequests = createServerFn({ method: "GET" })
  .validator(listChatContactDeletionRequestsSchema.optional())
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    const storeId = data?.storeId || identity.store_id;
    if (!storeId) throw new Error("Loja obrigatória.");
    assertStoreAccess(identity, MANAGER_ROLES, storeId);

    const db = getServerClient();
    let query = db
      .from("chat_contact_deletion_requests")
      .select(`
        id, store_id, thread_id, customer_id, requested_by_profile_id,
        reviewed_by_profile_id, status, reason, review_notes, created_at, reviewed_at
      `)
      .eq("store_id", storeId)
      .order("created_at", { ascending: false });

    if (data?.status && data.status !== "all") {
      query = query.eq("status", data.status);
    }

    const { data: requests, error } = await query;
    if (error) throw new Error(`Falha ao listar solicitações: ${error.message}`);

    const enriched = await Promise.all(
      (requests || []).map(async (r: any) => {
        const { data: reqProfile } = await db.from("profiles").select("id, full_name, email").eq("id", r.requested_by_profile_id).maybeSingle();
        const { data: thread } = await db.from("chat_threads").select("id, guest_name, entity_id").eq("id", r.thread_id).maybeSingle();
        return {
          ...r,
          requester: reqProfile || { full_name: "Colaborador", email: "" },
          thread: thread || { guest_name: "Contato", entity_id: "" },
        };
      })
    );

    return { requests: enriched };
  });

export const generateTourismAiCopilotReplySchema = z.object({
  threadId: z.string().uuid(),
  storeId: z.string().uuid().optional(),
  query: z.string().optional(),
});

export const generateTourismAiCopilotReply = createServerFn({ method: "POST" })
  .validator(generateTourismAiCopilotReplySchema)
  .handler(async ({ data: { threadId, storeId: inputStoreId, query: userQuery } }) => {
    const identity = await getServerIdentity();
    const db = getServerClient();

    const { data: thread } = await db
      .from("chat_threads")
      .select("id, store_id, guest_name, entity_id")
      .eq("id", threadId)
      .single();

    if (!thread) throw new Error("Conversa não encontrada.");
    const effectiveStoreId = inputStoreId || thread.store_id || identity.store_id;
    assertStoreAccess(identity, STAFF_ROLES, effectiveStoreId);

    const { data: store } = await db.from("stores").select("name").eq("id", effectiveStoreId).single();
    const storeName = store?.name || "Nossa Agência";
    const customerName = thread.guest_name || "Cliente";

    let queryText = userQuery || "";
    if (!queryText) {
      const { data: lastCustomerMsg } = await db
        .from("chat_messages")
        .select("message")
        .eq("thread_id", threadId)
        .eq("is_staff_reply", false)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      queryText = lastCustomerMsg?.message || "pacotes e roteiros de viagem";
    }

    const { toolLookupTourismPackages, toolGetTourismAviationPolicies } = await import("./whatsapp-ai-agent-tools.server");
    const packages = await toolLookupTourismPackages({ storeId: effectiveStoreId, query: queryText, limit: 2 }).catch(() => []);

    let packageBlock = "";
    if (packages && packages.length > 0) {
      const p = packages[0];
      packageBlock = `\n\n[PACOTE DISPONÍVEL] *${p.title}* (${p.destination})\n- Valor: ${p.priceDisplay}\n- Parcelamento: ${p.installmentTerms}\n- Saídas: ${p.datesDescription || "Consulte saídas"}\n- Inclusões: ${(p.includedItems || []).slice(0, 3).join(", ")}`;
    }

    let anacBlock = "";
    if (/(anac|bagagem|mala|cancelamento|arrependimento|no-show|no show|atraso|regras)/i.test(queryText)) {
      const aviation = toolGetTourismAviationPolicies();
      if (/(bagagem|mala)/i.test(queryText)) {
        const p = aviation.policies.find((pol) => pol.topic.includes("Bagagem"));
        if (p) anacBlock = `\n\n[Regras de Bagagem ANAC]:\n- ${p.rules[0]}\n- ${p.rules[1]}`;
      } else if (/(cancelamento|arrependimento)/i.test(queryText)) {
        const p = aviation.policies.find((pol) => pol.topic.includes("Arrependimento"));
        if (p) anacBlock = `\n\n[Política ANAC / Cancelamento]:\n- ${p.rules[0]}\n- ${p.rules[1]}`;
      } else {
        const p = aviation.policies.find((pol) => pol.topic.includes("No-Show"));
        if (p) anacBlock = `\n\n[Regras da Aviação Civil ANAC]:\n- ${p.rules[0]}`;
      }
    }

    const reply = `Olá, ${customerName}! Aqui é da equipe da ${storeName}.${packageBlock}${anacBlock}\n\nFicou alguma dúvida ou gostaria de verificar a disponibilidade para a sua data de preferência?`;

    return {
      suggestedReply: reply,
      packagesCount: packages.length,
      hasAviationRules: Boolean(anacBlock),
    };
  });

export interface FollowUpPromiseDetection {
  hasPendingPromise: boolean;
  promiseSnippet: string | null;
  promisedAt: string | null;
  elapsedMinutes: number | null;
  promisedByStaffName: string | null;
}

export function detectStaffFollowUpPromise(messages: any[]): FollowUpPromiseDetection {
  if (!Array.isArray(messages) || messages.length === 0) {
    return { hasPendingPromise: false, promiseSnippet: null, promisedAt: null, elapsedMinutes: null, promisedByStaffName: null };
  }

  const sorted = [...messages].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const promiseRegex = /(j[aá] (te chamo|te aviso|te passo|te mando|vejo|retorno)|vou (cotar|ver|verificar|pesquisar|checar|consultar|calcular|simular|mandar|passar)|logo mais (te )?(envio|mando|passo)|estou vendo (aqui|as melhores)|te passo (j[aá]|logo|assim que)|vou dar uma olhada|vou checar com a operadora|aguarda s[oó] um instante|deixa eu ver aqui)/i;

  let lastStaffPromise: any = null;
  let hasSubsequentStaffFulfillment = false;

  for (const m of sorted) {
    const isStaff = Boolean(m.is_staff_reply);
    const isInternal = Boolean(m.payload?.is_internal || m.payload?.is_whisper || m.message_type === "internal_note" || m.message_type === "system_event");
    if (isInternal) continue;

    const text = String(m.message || "");
    if (isStaff) {
      if (promiseRegex.test(text)) {
        lastStaffPromise = m;
        break;
      } else if (text.length > 50 || text.includes("R$") || text.includes("opções") || text.includes("pacote")) {
        hasSubsequentStaffFulfillment = true;
      }
    }
  }

  if (lastStaffPromise && !hasSubsequentStaffFulfillment) {
    const match = String(lastStaffPromise.message || "").match(promiseRegex);
    const promisedTime = new Date(lastStaffPromise.created_at).getTime();
    const elapsedMinutes = Math.max(1, Math.round((Date.now() - promisedTime) / 60000));
    return {
      hasPendingPromise: true,
      promiseSnippet: match ? match[0] : String(lastStaffPromise.message).slice(0, 40),
      promisedAt: lastStaffPromise.created_at,
      elapsedMinutes,
      promisedByStaffName: lastStaffPromise.sender_profile_id || "Atendente",
    };
  }

  return { hasPendingPromise: false, promiseSnippet: null, promisedAt: null, elapsedMinutes: null, promisedByStaffName: null };
}

export const generateSmartContextualAiReplySchema = z.object({
  threadId: z.string().uuid(),
  storeId: z.string().uuid().optional(),
  customInstruction: z.string().optional(),
  generateAudioPreview: z.boolean().default(false),
  persona: z.any().optional(),
});

export const generateSmartContextualAiReply = createServerFn({ method: "POST" })
  .validator(generateSmartContextualAiReplySchema)
  .handler(async ({ data: { threadId, storeId: inputStoreId, customInstruction, generateAudioPreview, persona } }) => {
    const identity = await getServerIdentity();
    const db = getServerClient();

    const { data: thread } = await db
      .from("chat_threads")
      .select("id, store_id, customer_id, guest_name, entity_id, department, metadata")
      .eq("id", threadId)
      .single();

    if (!thread) throw new Error("Conversa não encontrada.");
    const effectiveStoreId = inputStoreId || thread.store_id || identity.store_id;
    assertStoreAccess(identity, STAFF_ROLES, effectiveStoreId);

    const { data: store } = await db.from("stores").select("name").eq("id", effectiveStoreId).single();
    const storeName = store?.name || "Nossa Empresa";
    const customerName = thread.guest_name || "Cliente";

    // 1. Carrega histórico de mensagens recentes (últimas 15)
    const { data: rawMessages } = await db
      .from("chat_messages")
      .select("id, message, message_type, is_staff_reply, created_at, payload")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: false })
      .limit(15);

    const threadMessages = (rawMessages || []).reverse();

    // 2. Detecta promessas de follow-up ativas
    const promiseDetection = detectStaffFollowUpPromise(threadMessages);

    // 3. Carrega o contexto 360 do cliente (LTV, viagens compradas, cotações)
    let tripsCount = 0;
    let quotesCount = 0;
    let totalSpentBrl = "R$ 0,00";
    let isVipOrReturning = false;
    let lastDestination = "";

    if (thread.customer_id) {
      const [tripsRes, quotesRes, ordersRes] = await Promise.all([
        db.from("tourism_trips").select("id, title, destination_city, total_cents").eq("store_id", effectiveStoreId).eq("customer_id", thread.customer_id).limit(5),
        db.from("travel_quotes").select("id, destination, total_cents").eq("agency_id", effectiveStoreId).eq("customer_id", thread.customer_id).limit(10),
        db.from("orders").select("total_amount_cents, status").eq("store_id", effectiveStoreId).eq("customer_id", thread.customer_id).in("status", ["completed", "delivered", "paid"]),
      ]);

      tripsCount = tripsRes.data?.length || 0;
      quotesCount = quotesRes.data?.length || 0;
      const spentCents = (ordersRes.data || []).reduce((acc: number, curr: any) => acc + (Number(curr.total_amount_cents) || 0), 0);
      if (spentCents > 0) {
        totalSpentBrl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(spentCents / 100);
      }
      isVipOrReturning = tripsCount > 0 || quotesCount >= 2;
      lastDestination = tripsRes.data?.[0]?.destination_city || quotesRes.data?.[0]?.destination || "";
    }

    // 4. Última mensagem enviada pelo cliente
    const lastCustomerMsg = [...threadMessages].reverse().find((m) => !m.is_staff_reply);
    const clientQuery = lastCustomerMsg?.message || customInstruction || "informações sobre opções disponíveis";

    // 5. Consulta Pacotes e Normas ANAC
    const { toolLookupTourismPackages, toolGetTourismAviationPolicies } = await import("./whatsapp-ai-agent-tools.server");
    const packages = await toolLookupTourismPackages({ storeId: effectiveStoreId, query: clientQuery, limit: 2 }).catch(() => []);

    let packageData = "";
    if (packages && packages.length > 0) {
      const p = packages[0];
      packageData = `Pacote disponível: ${p.title} em ${p.destination}. Valor: ${p.priceDisplay}, parcelamento: ${p.installmentTerms}. Inclusos: ${(p.includedItems || []).slice(0, 3).join(", ")}.`;
    }

    let anacData = "";
    if (/(anac|bagagem|mala|cancelamento|arrependimento|no-show|atraso)/i.test(clientQuery)) {
      const aviation = toolGetTourismAviationPolicies();
      if (/(bagagem|mala)/i.test(clientQuery)) {
        const pol = aviation.policies.find((p) => p.topic.includes("Bagagem"));
        if (pol) anacData = `Regra ANAC bagagem: ${pol.rules[0]}; ${pol.rules[1]}`;
      } else if (/(cancelamento|arrependimento)/i.test(clientQuery)) {
        const pol = aviation.policies.find((p) => p.topic.includes("Arrependimento"));
        if (pol) anacData = `Regra ANAC cancelamento: ${pol.rules[0]}; ${pol.rules[1]}`;
      }
    }

    // 6. Geração da resposta (direta, humana, sem enrolação)
    let suggestedReply = "";
    let poolGroqKey = "";
    let poolOpenAiKey = "";
    try {
      const [groqPool, openAiPool] = await Promise.all([
        getAllActiveKeysForProvider("groq", identity.id, effectiveStoreId),
        getAllActiveKeysForProvider("openai", identity.id, effectiveStoreId),
      ]);
      poolGroqKey = groqPool[0]?.rawKey?.trim() || "";
      poolOpenAiKey = openAiPool[0]?.rawKey?.trim() || "";
    } catch (poolErr) {
      console.warn("[chat.functions] Falha ao consultar pool/BYOK na sugestão contextual:", poolErr);
    }
    const openaiKey = poolOpenAiKey || process.env.OPENAI_API_KEY?.trim() || "";
    const groqKey = poolGroqKey || process.env.GROQ_API_KEY?.trim() || "";

    const systemPrompt = `Você é um consultor humano e ágil de atendimento da loja ${storeName}.
Diretrizes inegociáveis:
- Fale como uma pessoa real no WhatsApp: direto ao ponto, educado, caloroso, SEM enrolação, SEM clichês ("Com certeza!", "Entendo sua dúvida").
- Perfil do cliente: ${customerName}. ${isVipOrReturning ? `Cliente recorrente (${tripsCount} viagens já realizadas, ${quotesCount} cotações). Reconheça a relação naturalmente.` : "Novo cliente / lead em primeiro contato."}
- ${promiseDetection.hasPendingPromise ? `ATENÇÃO: O atendente disse anteriormente "${promiseDetection.promiseSnippet}". Cumpra essa promessa entregando a resposta agora com naturalidade!` : ""}
- ${customInstruction ? `Instrução do atendente: "${customInstruction}"` : ""}
- Dados de pacotes da agência: ${packageData || "Nenhum pacote fixo, consulte datas específicas."}
- Regras ANAC: ${anacData || "Não aplicável."}
- Responda em no máximo 3 ou 4 frases curtas, fáceis de ler no celular. Termine com uma pergunta clara de avanço.`;

    if (openaiKey || groqKey) {
      try {
        const targetUrl = groqKey
          ? "https://api.groq.com/openai/v1/chat/completions"
          : "https://api.openai.com/v1/chat/completions";
        const model = groqKey ? "llama-3.3-70b-versatile" : "gpt-4o-mini";

        const aiRes = await fetch(targetUrl, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${groqKey || openaiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: `Mensagem do cliente: "${clientQuery}". Escreva a resposta humana:` },
            ],
            temperature: 0.6,
            max_tokens: 300,
          }),
          signal: AbortSignal.timeout(10000),
        });

        if (aiRes.ok) {
          const aiJson = await aiRes.json().catch(() => ({}));
          suggestedReply = String(aiJson?.choices?.[0]?.message?.content || "").trim();
        }
      } catch (err: any) {
        console.warn("[chat.functions] Falha ao chamar LLM externa:", err?.message);
      }
    }

    if (!suggestedReply) {
      let followUpIntro = "";
      if (promiseDetection.hasPendingPromise) {
        followUpIntro = `Conforme prometido, verifiquei aqui para você. `;
      } else if (isVipOrReturning) {
        followUpIntro = `Que bom falar com você novamente, ${customerName}! `;
      } else {
        followUpIntro = `Olá, ${customerName}! `;
      }

      let contentBody = "";
      if (packageData) {
        contentBody = packageData.replace(/\. /g, "\n- ");
      } else if (anacData) {
        contentBody = anacData;
      } else {
        contentBody = "Já levantei as melhores opções disponíveis com valores e saídas confirmadas.";
      }

      suggestedReply = `${followUpIntro}${contentBody}\n\nQuer que eu separe essa reserva ou prefere ajustar alguma data?`;
    }

    // 7. Geração de Áudio Opcional com Preview
    let audioPreviewUrl: string | null = null;
    let audioDuration = 0;
    if (generateAudioPreview) {
      const { generateAiVoiceAudio } = await import("./whatsapp-voice-ai.functions");
      const audioResult = await generateAiVoiceAudio({
        data: {
          text: suggestedReply,
          persona: persona || { gender: "female", age: "adult", accent: "neutro", environment: "office" },
        },
      }).catch(() => null);

      if (audioResult) {
        audioPreviewUrl = audioResult.audioDataUri;
        audioDuration = audioResult.durationSeconds;
      }
    }

    return {
      suggestedReply,
      audioPreviewUrl,
      audioDuration,
      promiseDetection,
      customerInsights: {
        isVipOrReturning,
        tripsCount,
        quotesCount,
        totalSpentBrl,
        lastDestination,
      },
    };
  });

export const toggleChatThreadStaffVisibilitySchema = z.object({
  threadId: z.string().uuid(),
  storeId: z.string().uuid().optional(),
  hiddenFromStaff: z.boolean(),
});

export const toggleChatThreadStaffVisibility = createServerFn({ method: "POST" })
  .validator(toggleChatThreadStaffVisibilitySchema)
  .handler(async ({ data: { threadId, storeId: inputStoreId, hiddenFromStaff } }) => {
    const identity = await getServerIdentity();
    const storeId = inputStoreId || identity.store_id;
    if (!storeId) throw new Error("Loja obrigatória.");
    assertStoreAccess(identity, ["owner", "admin", "platform_admin", "manager"], storeId);

    const db = getServerClient();
    const { data: thread } = await db
      .from("chat_threads")
      .select("id, metadata")
      .eq("id", threadId)
      .eq("store_id", storeId)
      .single();

    if (!thread) throw new Error("Conversa não encontrada.");

    const curMeta = (thread.metadata && typeof thread.metadata === "object" ? thread.metadata : {}) as Record<string, any>;
    const updatedMeta = {
      ...curMeta,
      hidden_from_staff: hiddenFromStaff,
      hidden_from_staff_updated_at: new Date().toISOString(),
      hidden_from_staff_by_profile_id: identity.id,
    };

    const { error } = await db
      .from("chat_threads")
      .update({ metadata: updatedMeta, updated_at: new Date().toISOString() })
      .eq("id", threadId)
      .eq("store_id", storeId);

    if (error) throw new Error(`Falha ao atualizar visibilidade: ${error.message}`);

    return {
      success: true,
      threadId,
      hiddenFromStaff,
      message: hiddenFromStaff
        ? "Conversa ocultada de funcionários comuns (modo confidencial)."
        : "Conversa visível para a equipe do setor.",
    };
  });

export const resetStoreChatHistorySchema = z.object({
  storeId: z.string().uuid(),
  confirmationCode: z.literal("RESETAR"),
});

export const resetStoreChatHistoryLocal = createServerFn({ method: "POST" })
  .validator(resetStoreChatHistorySchema)
  .handler(async ({ data: { storeId } }) => {
    const identity = await getServerIdentity();
    assertStoreAccess(identity, ["owner", "admin", "platform_admin"], storeId);

    const db = getServerClient();
    const { data: threads } = await db
      .from("chat_threads")
      .select("id")
      .eq("store_id", storeId);

    const threadIds = (threads || []).map((t) => t.id);
    let deletedMessagesCount = 0;

    if (threadIds.length > 0) {
      const { count } = await db
        .from("chat_messages")
        .delete({ count: "exact" })
        .in("thread_id", threadIds);

      deletedMessagesCount = count || 0;

      await db
        .from("chat_conversation_keys")
        .delete()
        .in("thread_id", threadIds);

      await db
        .from("chat_threads")
        .delete()
        .eq("store_id", storeId);
    }

    return {
      success: true,
      storeId,
      deletedThreadsCount: threadIds.length,
      deletedMessagesCount,
      message: "Histórico de conversas da loja resetado com sucesso no sistema local.",
    };
  });
export const getWhatsAppMediaBase64 = createServerFn({ method: "POST" })
  .validator(z.object({
    threadId: z.string().uuid(),
    messageId: z.string().uuid().optional(),
    externalMessageId: z.string(),
  }))
  .handler(async ({ data: { threadId, externalMessageId } }) => {
    const identity = await getServerIdentity();
    if (!identity?.id) throw new Error("Não autorizado");

    const db = getServerClient();
    const { data: thread } = await db
      .from("chat_threads")
      .select("id, store_id, channel_instance_id")
      .eq("id", threadId)
      .maybeSingle();

    if (!thread) throw new Error("Conversa não encontrada");
    assertStoreAccess(identity, STAFF_ROLES, thread.store_id);

    const { data: existingMsg } = await db
      .from("chat_messages")
      .select("id, attachments, payload, message_type")
      .eq("thread_id", threadId)
      .eq("external_message_id", externalMessageId)
      .maybeSingle();

    if (existingMsg && Array.isArray(existingMsg.attachments) && existingMsg.attachments.length > 0 && typeof existingMsg.attachments[0] === "string" && existingMsg.attachments[0].startsWith("data:")) {
      return {
        base64: existingMsg.attachments[0],
        mimetype: String(existingMsg.payload?.media?.mimetype || "image/webp"),
        cached: true,
      };
    }

    const { data: inst } = await db
      .from("whatsapp_channel_instances")
      .select("id, instance_key, external_instance_id, public_config")
      .eq("store_id", thread.store_id)
      .eq("provider", "evolution_api")
      .eq("is_active", true)
      .order("is_default", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!inst) throw new Error("Instância WhatsApp não encontrada para decodificar mídia.");

    const externalName = inst.external_instance_id || inst.instance_key;
    const configuredUrl = String((inst.public_config as any)?.base_url || "").replace(/\/$/, "");
    const baseUrl = configuredUrl && !configuredUrl.includes("147.15.61.45")
      ? configuredUrl
      : (process.env.EVOLUTION_API_URL?.trim() || "");
    const apiKey = process.env.EVOLUTION_API_KEY?.trim() || "";
    if (!baseUrl || !apiKey) throw new Error("Gateway WhatsApp não configurado.");

    const evoRes = await fetch(`${baseUrl}/chat/getBase64FromMediaMessage/${encodeURIComponent(externalName)}`, {
      method: "POST",
      headers: { apikey: apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        message: { key: { id: externalMessageId } },
        convertToMp4: false,
      }),
      signal: AbortSignal.timeout(12000),
    });

    if (!evoRes.ok) {
      throw new Error(`Falha ao obter mídia da Evolution API (HTTP ${evoRes.status})`);
    }

    const evoJson = (await evoRes.json().catch(() => ({}))) as Record<string, any>;
    const rawBase64 = String(evoJson.base64 || evoJson.data || "").trim();
    if (!rawBase64) throw new Error("Mídia não retornou base64 válido.");

    const mimetype = String(evoJson.mimetype || evoJson.mimeType || "image/webp");
    const dataUri = rawBase64.startsWith("data:") ? rawBase64 : `data:${mimetype};base64,${rawBase64}`;

    if (existingMsg?.id) {
      const curPayload = (existingMsg.payload && typeof existingMsg.payload === "object" ? existingMsg.payload : {}) as Record<string, any>;
      await db.from("chat_messages").update({
        attachments: [dataUri],
        payload: {
          ...curPayload,
          media: {
            ...(curPayload.media || {}),
            type: existingMsg.message_type || "sticker",
            url: dataUri,
            mimetype,
          },
        },
      }).eq("id", existingMsg.id);
    }

    return {
      base64: dataUri,
      mimetype,
      cached: false,
    };
  });

export const _chatOmnichannelReady = (() => { const created = true;
    return created;
  });
