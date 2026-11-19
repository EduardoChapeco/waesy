/**
 * chat.functions.ts — BFF Server Functions para o Chat Omnichannel, Conversational Commerce & SAC/RMA
 * Mensageria Segura Server-Side, Roteamento por Setor, RBAC Staff/Supervisor, Cards de Pedido e Customer 360.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getServerClient, getAnonServerClient, SupabaseUnconfiguredError } from "@/lib/supabase";
import { getSSRClient, getServerIdentity, assertStoreAccess, STAFF_ROLES, MANAGER_ROLES } from "@/lib/server-access";
import { getAllActiveKeysForProvider } from "@/services/api-orchestrator.functions";
import { isSyntheticMetaLid, isRawLidOrSyntheticName } from "@/lib/chat-media-attachment";
import { buildBrandedAppBaseUrl, buildBrandedClientPortalUrl } from "@/lib/branded-app-links";
import { buildBrazilPhoneVariants } from "@/lib/phone-match";
import {
  isBrokenOrMissingMediaUri,
  normalizeMediaDataUri,
  resolveDefaultMimeByMessageType,
} from "@/lib/whatsapp-media-utils";

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
  const text = typeof input.message === "string" ? input.message.trim() : "";
  const extraPayload = input.payload && typeof input.payload === "object" ? input.payload : {};
  const mediaUrlFromPayload =
    typeof extraPayload.media_url === "string" ? extraPayload.media_url.trim() : "";
  const resolvedMediaUrl = firstAttachment || mediaUrlFromPayload;
  const resolvedMime =
    typeof extraPayload.mime_type === "string" && extraPayload.mime_type.trim()
      ? extraPayload.mime_type.trim()
      : undefined;
  const resolvedFileName =
    typeof extraPayload.file_name === "string" && extraPayload.file_name.trim()
      ? extraPayload.file_name.trim()
      : undefined;

  if (rawType === "audio" && resolvedMediaUrl) {
    const isVoiceNote =
      extraPayload.voice_note === true ||
      extraPayload.is_ptt === true ||
      (!resolvedFileName && extraPayload.voice_note !== false);
    if (isVoiceNote) {
      return {
        messageType: "audio",
        payload: {
          media_url: resolvedMediaUrl,
          voice_note: true,
          encoding: true,
          mime_type: resolvedMime || "audio/ogg; codecs=opus",
          chat_message_id: messageId,
        },
      };
    }
    return {
      messageType: "audio",
      payload: {
        media_url: resolvedMediaUrl,
        caption: typeof extraPayload.caption === "string" ? extraPayload.caption.trim() || undefined : undefined,
        file_name: resolvedFileName,
        mime_type: resolvedMime || "audio/mpeg",
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
    const explicitCaption = typeof extraPayload.caption === "string" ? extraPayload.caption.trim() : "";
    const effectiveCaption =
      explicitCaption ||
      (text && (!resolvedFileName || text !== resolvedFileName) && !/^\[(Imagem|Vídeo|Áudio|Documento|Figurinha|GIF)\]/.test(text)
        ? text
        : undefined);
    return {
      messageType: normalizedType,
      payload: {
        media_url: resolvedMediaUrl,
        caption: effectiveCaption || undefined,
        text: effectiveCaption || undefined,
        file_name: resolvedFileName,
        mime_type: resolvedMime,
        chat_message_id: messageId,
      },
    };
  }

  return {
    messageType: "text",
    payload: {
      text: text || "[Mensagem]",
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
 channel_instance_id: z.string().uuid().optional(),
 channelInstanceId: z.string().uuid().optional(),
 status: z.enum(["open", "closed", "archived", "waiting", "forgotten", "pending", "all"]).default("all"),
 store_id: z.string().uuid().optional(),
 storeId: z.string().uuid().optional(),
});

export const sendStaffMessageSchema = z
  .object({
    threadId: z.string().uuid(),
    message: z.string().default(""),
    message_type: z
      .enum(["text", "order_card", "rma_ticket", "system_event", "image_attachment", "pix_payment", "structured_blocks", "sticker", "image", "video", "audio", "document", "internal_note"])
      .default("text"),
    attachments: z.array(z.string()).default([]),
    payload: z.record(z.any()).default({}),
    is_internal: z.boolean().default(false),
  })
  .refine(
    (data) => data.message.trim().length > 0 || data.attachments.length > 0 || typeof data.payload?.media_url === "string",
    { message: "Informe o texto da mensagem ou anexe um arquivo.", path: ["message"] },
  );

export {
  sendCustomerMessageSchema,
  createRmaTicketSchema,
  updateTicketStatusSchema,
  sendCustomerChatMessage,
  searchChatContacts,
  listCustomerChatThreads,
  startCustomerChatThread,
  createSupportRmaTicket,
  updateTicketStatus,
  createLinkedCustomerTaskSchema,
  createLinkedCustomerTask,
  toggleCustomerOnboardingStepSchema,
  toggleCustomerOnboardingStep,
  generateOmnichannelCopilotInsight,
  autoFillLeadDossierFromChatAi,
} from "./chat/customer-tasks-and-portal.functions";

export const assignThreadSchema = z.object({
 threadId: z.string().uuid(),
 department: z.string().optional(),
 assigned_to_profile_id: z.string().uuid().nullable().optional(),
 priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
 internal_notes: z.string().optional(),
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

 const baseSelectColumns = `
 id, store_id, customer_id, guest_name, guest_email, status, subject,
 department, assigned_to_profile_id, channel_instance_id, order_id, priority, satisfaction_rating,
 internal_notes, first_response_at, closed_at, updated_at, created_at, thread_type, context_type, entity_id, metadata, tags,
 group_subject, primary_phone_e164, lead_id, attribution,
 last_message_text, last_message_at, last_customer_message_at, last_staff_reply_at
 `;
 const legacySelectColumns = `
 id, store_id, customer_id, guest_name, guest_email, status, subject,
 department, assigned_to_profile_id, channel_instance_id, order_id, priority, satisfaction_rating,
 internal_notes, first_response_at, closed_at, updated_at, created_at, thread_type, context_type, entity_id, metadata, tags,
 group_subject, primary_phone_e164, lead_id, attribution,
 last_message_text, last_message_at
 `;

 const applyListThreadFilters = (q: any) => {
   let built = q
     .eq("store_id", effectiveStoreId)
     .not("thread_type", "in", "(ai_assistant,copilot,project)")
     .order("last_message_at", { ascending: false, nullsFirst: false })
     .order("updated_at", { ascending: false })
     .limit(150);

   // Filtro de status canônico + aguardando resposta / esquecidos hoje
   const canonicalStatuses = new Set(["open", "closed", "archived", "pending"]);
   if (data?.status === "archived") {
     built = built.eq("status", "archived");
   } else if (data?.status === "waiting" || data?.status === "forgotten") {
     built = built.in("status", ["open", "pending"]);
   } else if (data?.status && canonicalStatuses.has(data.status)) {
     built = built.eq("status", data.status);
   } else {
     built = built.neq("status", "archived");
   }

   if (data?.department && data.department !== "all") {
     built = built.eq("department", data.department);
   }

   const channelInstanceFilter = data?.channel_instance_id || data?.channelInstanceId;
   if (channelInstanceFilter) {
     built = built.eq("channel_instance_id", channelInstanceFilter);
   }
   return built;
 };

 let query = applyListThreadFilters(db.from("chat_threads").select(baseSelectColumns));

  // Se não for supervisor/gerente, visualiza apenas seus setores atribuídos ou threads atribuídas ao perfil
  const deniedInstanceIds = new Set<string>();
  const restrictedByInstanceOnly = new Set<string>();
  if (!isSupervisor) {
    const [{ data: storeRow }, { data: memberRow }, { data: deptRows }, { data: instPermRows }] = await Promise.all([
      db.from("stores").select("settings").eq("id", effectiveStoreId).maybeSingle(),
      db
        .from("workspace_members")
        .select("department_id, default_department_slug, only_assigned_or_sector")
        .eq("store_id", effectiveStoreId)
        .eq("profile_id", identity.id)
        .maybeSingle(),
      db
        .from("chat_departments")
        .select("id, slug, assigned_agent_ids")
        .eq("store_id", effectiveStoreId)
        .eq("is_active", true),
      db
        .from("whatsapp_instance_member_permissions")
        .select("instance_id, can_view, only_assigned_or_sector")
        .eq("store_id", effectiveStoreId)
        .eq("profile_id", identity.id),
    ]);

    for (const perm of instPermRows || []) {
      if ((perm as any).can_view === false && (perm as any).instance_id) {
        deniedInstanceIds.add(String((perm as any).instance_id));
      }
      if ((perm as any).only_assigned_or_sector === true && (perm as any).instance_id) {
        restrictedByInstanceOnly.add(String((perm as any).instance_id));
      }
    }

    const governance = (storeRow?.settings as any)?.whatsapp_governance || {};
    const govDepts = Array.isArray(governance.departments) ? governance.departments : [];
    const assignedDepts = new Set<string>(
      govDepts
        .filter((d: any) => Array.isArray(d.assignedAgentIds) && d.assignedAgentIds.includes(identity.id))
        .map((d: any) => d.slug || d.id || d.name)
        .filter(Boolean),
    );
    for (const dept of deptRows || []) {
      const hasAgent = Array.isArray((dept as any).assigned_agent_ids) && (dept as any).assigned_agent_ids.includes(identity.id);
      if (hasAgent || (memberRow?.department_id && memberRow.department_id === (dept as any).id)) {
        if ((dept as any).slug) assignedDepts.add(String((dept as any).slug));
      }
    }
    if (memberRow?.default_department_slug) {
      assignedDepts.add(String(memberRow.default_department_slug));
    }

    const allowedClauses = [`assigned_to_profile_id.eq.${identity.id}`];
    for (const d of assignedDepts) {
      allowedClauses.push(`department.eq.${d}`);
    }
    if (assignedDepts.size === 0 && !memberRow?.only_assigned_or_sector) {
      allowedClauses.push("department.eq.geral", "department.is.null");
    }

    query = query.or(allowedClauses.join(","));
  }

 let { data: rawThreads, error } = await query;
 if (error && (String(error.code || "") === "42703" || String(error.message || "").includes("last_customer_message_at"))) {
   const fallbackQuery = applyListThreadFilters(db.from("chat_threads").select(legacySelectColumns));
   const retryRes = await fallbackQuery;
   rawThreads = retryRes.data;
   error = retryRes.error;
 }
 if (error) {
 console.warn("[chat.functions] Erro ao consultar chat_threads:", error.message);
 return {
 threads: [],
 metrics: { total: 0, open: 0, closed: 0, avg_rating: null, sla_first_response_min: null },
 slaAlerts: { waitingCount: 0, atRiskCount: 0, breachedCount: 0, forgottenTodayCount: 0, forgottenLeadsCount: 0, forgottenThreads: [] },
 };
 }

 const threadsList = (rawThreads || []).filter((t: any) => {
    if (t.thread_type === 'ai_assistant' || t.thread_type === 'copilot' || t.thread_type === 'project') return false;
    if (t.context_type === 'ai_assistant' || t.context_type === 'copilot' || t.context_type === 'project') return false;
    if (t.metadata?.is_copilot || t.metadata?.is_civil || t.metadata?.agent_mode) return false;
    if (!isSupervisor && t.metadata?.hidden_from_staff === true) return false;
    if (!isSupervisor && t.channel_instance_id && deniedInstanceIds.has(String(t.channel_instance_id))) return false;
    if (
      !isSupervisor &&
      t.channel_instance_id &&
      restrictedByInstanceOnly.has(String(t.channel_instance_id)) &&
      t.assigned_to_profile_id &&
      String(t.assigned_to_profile_id) !== identity.id
    ) {
      return false;
    }
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

 const messagesByThreadMap = new Map<string, any[]>();
 const threadSummaryByRpc = new Map<string, { message: string | null; message_type: string | null; created_at: string | null; is_staff_reply: boolean; total_messages: number }>();
 const threadIds = threadsList.map((t: any) => t.id).filter(Boolean);
 if (threadIds.length > 0) {
  let usedRpc = false;
  try {
    const rpcRes = await (db as any).rpc("get_threads_latest_public_messages", { p_thread_ids: threadIds });
    if (!rpcRes?.error && Array.isArray(rpcRes?.data)) {
      usedRpc = true;
      for (const row of rpcRes.data) {
        if (row?.thread_id) {
          threadSummaryByRpc.set(String(row.thread_id), {
            message: row.message ?? null,
            message_type: row.message_type ?? "text",
            created_at: row.created_at ?? null,
            is_staff_reply: Boolean(row.is_staff_reply),
            total_messages: Number(row.total_messages || 0),
          });
        }
      }
    }
  } catch {
    usedRpc = false;
  }

  if (!usedRpc) {
    // Fallback em fatias pequenas (20 threads/fatia) para impedir que 1 thread ruidosa esgote o limite das demais
    for (let i = 0; i < threadIds.length; i += 20) {
      const batchIds = threadIds.slice(i, i + 20);
      const { data: recentMessages } = await db
        .from("chat_messages")
        .select("id, thread_id, message, message_type, created_at, is_staff_reply, payload")
        .in("thread_id", batchIds)
        .order("created_at", { ascending: false })
        .limit(200);

      for (const msg of recentMessages || []) {
        const arr = messagesByThreadMap.get(msg.thread_id) || [];
        arr.push(msg);
        messagesByThreadMap.set(msg.thread_id, arr);
      }
    }
  }
 }

  const [deptSlaRes, forgottenLeadsRes] = await Promise.all([
    db
      .from("chat_departments")
      .select("slug, sla_minutes")
      .eq("store_id", effectiveStoreId)
      .eq("is_active", true),
    (async () => {
      try {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const { count } = await db
          .from("leads_crm")
          .select("id", { count: "exact", head: true })
          .eq("store_id", effectiveStoreId)
          .gte("created_at", startOfDay.toISOString())
          .is("last_contacted_at", null)
          .not("status", "in", "(won,ganho,lost,perdido,archived,arquivado,closed,fechado)");
        return Number(count || 0);
      } catch {
        return 0;
      }
    })(),
  ]);

  const deptSlaMinutesMap = new Map<string, number>();
  for (const d of (deptSlaRes?.data as any[]) || []) {
    if (d?.slug && typeof d.sla_minutes === "number" && d.sla_minutes > 0) {
      deptSlaMinutesMap.set(String(d.slug), d.sla_minutes);
    }
  }

  const [{ computeThreadSlaStatus, computeSlaAlertsSummary }, { sanitizeCustomerEmail }] = await Promise.all([
    import("@/lib/sla-metrics"),
    import("@/lib/contact-sanitize"),
  ]);
  const nowSlaMs = Date.now();

  // Mapeamento, SLA real e extração da última mensagem
  const formattedThreads = threadsList.map((thread: any) => {
  const rpcSummary = threadSummaryByRpc.get(thread.id);
  const messages = messagesByThreadMap.get(thread.id) || [];
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
  const overrideProfile = (threadMeta.customer_profile_override && typeof threadMeta.customer_profile_override === "object" ? threadMeta.customer_profile_override : null) as Record<string, any> | null;
  const rawEntityDigits = String(thread.entity_id || "").replace(/\D/g, "");
  const threadIsGroup = Boolean(
    thread.thread_type === "group" ||
    threadMeta.is_group ||
    String(thread.entity_id || "").includes("@g.us") ||
    /^120363\d{10,}$/.test(rawEntityDigits)
  );
  const threadIsChannel = Boolean(thread.thread_type === "channel" || threadMeta.is_channel || String(thread.entity_id || "").includes("@newsletter"));
  const threadAvatar = overrideProfile?.avatar_url || threadMeta.avatar_url || customerProfile?.avatar_url || null;
  const rawEmail = String(overrideProfile?.email || customerProfile?.email || thread.guest_email || "").trim();
  const cleanEmail = sanitizeCustomerEmail(rawEmail) || "";
  const resolvedCandidatePhone = overrideProfile?.phone || customerProfile?.phone || thread.primary_phone_e164 || thread.entity_id || "";
  const isMetaLidWithoutPhone = !threadIsGroup && !threadIsChannel && isSyntheticMetaLid(thread.entity_id, resolvedCandidatePhone, threadMeta);
  const directPhone = threadIsGroup || threadIsChannel || isMetaLidWithoutPhone ? "" : resolvedCandidatePhone;
  const groupSubject = overrideProfile?.full_name || thread.group_subject || threadMeta.group_subject || null;
  const safeCustomerName = !isRawLidOrSyntheticName(customerProfile?.full_name, thread.entity_id, threadMeta) ? customerProfile?.full_name : null;
  const safeGuestName = !isRawLidOrSyntheticName(thread.guest_name, thread.entity_id, threadMeta) ? thread.guest_name : null;
  const safePushName = !isRawLidOrSyntheticName(threadMeta.push_name, thread.entity_id, threadMeta) ? threadMeta.push_name : null;
  const resolvedDisplayName =
    overrideProfile?.full_name ||
    (threadIsGroup ? groupSubject : null) ||
    safeCustomerName ||
    safeGuestName ||
    safePushName ||
    (threadIsGroup
      ? "Grupo WhatsApp"
      : threadIsChannel
        ? "Canal WhatsApp"
        : thread.context_type === "whatsapp"
          ? isMetaLidWithoutPhone
            ? `Contato WhatsApp #${rawEntityDigits.slice(-4) || "LID"}`
            : `WhatsApp ${directPhone || thread.entity_id || ""}`
          : "Cliente");
  const threadAttribution =
    (thread.attribution && typeof thread.attribution === "object" && Object.keys(thread.attribution).length > 0
      ? thread.attribution
      : threadMeta.attribution && typeof threadMeta.attribution === "object"
        ? threadMeta.attribution
        : null);

  const isLastReplyStaff = lastPublicMsg ? Boolean(lastPublicMsg.is_staff_reply) : Boolean(rpcSummary?.is_staff_reply);
  const effectiveLastAt = thread.last_message_at || rpcSummary?.created_at || thread.updated_at || null;
  const deptSlug = String(thread.department || "geral");
  const deptSlaMinutes = deptSlaMinutesMap.get(deptSlug) ?? 15;
  const slaEval = computeThreadSlaStatus({
    status: thread.status,
    lastCustomerMessageAt: thread.last_customer_message_at || null,
    lastStaffReplyAt: thread.last_staff_reply_at || null,
    lastMessageAt: effectiveLastAt,
    isLastReplyStaff,
    departmentSlaMinutes: deptSlaMinutes,
    nowMs: nowSlaMs,
  });

  return {
  id: thread.id,
  status: thread.status,
  subject: thread.subject,
  department: deptSlug,
  priority: thread.priority || "normal",
  satisfaction_rating: thread.satisfaction_rating,
  assigned_agent: agentProfile,
  thread_type: threadIsGroup ? "group" : threadIsChannel ? "channel" : thread.thread_type,
  is_group: threadIsGroup,
  is_channel: threadIsChannel,
  is_lid: isMetaLidWithoutPhone,
  group_subject: groupSubject,
  group_jid: threadIsGroup ? (threadMeta.whatsapp_jid || threadMeta.remote_jid || thread.entity_id || null) : null,
  participants_count: Array.isArray(threadMeta.participants) ? threadMeta.participants.length : 0,
  lead_id: thread.lead_id || threadMeta.active_lead_id || null,
  attribution: threadAttribution,
  avatar_url: threadAvatar,
  metadata: threadMeta,
 			context_type: thread.context_type,
 			channel: thread.context_type === "whatsapp" ? "whatsapp" : "web",
 			customer: {
 				...(customerProfile || {}),
 				full_name: resolvedDisplayName,
 				email: cleanEmail,
 				phone: directPhone,
 				avatar_url: threadAvatar,
 			},
  order_id: thread.order_id,
  internal_notes: thread.internal_notes,
         tags: thread.tags || [],
  last_message_at: thread.last_message_at || rpcSummary?.created_at || null,
  last_customer_message_at: thread.last_customer_message_at || null,
  last_staff_reply_at: thread.last_staff_reply_at || null,
  waiting_for_reply: slaEval.waitingForReply,
  waiting_minutes: slaEval.waitingMinutes,
  sla_minutes: slaEval.slaMinutes,
  sla_status: slaEval.slaStatus,
  is_forgotten_today: slaEval.isForgottenToday,
  updated_at: thread.last_message_at || rpcSummary?.created_at || thread.updated_at,
  created_at: thread.created_at,
  last_message: (() => {
    const resolvedMsg = lastPublicMsg || (
      rpcSummary && (Boolean(rpcSummary.message) || Number(rpcSummary.total_messages || 0) > 0)
        ? { message: rpcSummary.message || "", message_type: rpcSummary.message_type || "text" }
        : null
    );
    if (resolvedMsg) {
      if (typeof resolvedMsg.message === "string" && resolvedMsg.message.trim() && !resolvedMsg.message.startsWith("waesy-msg:")) {
        return resolvedMsg.message;
      }
      return resolvedMsg.message_type === "image" ? "[Imagem]"
        : resolvedMsg.message_type === "video" ? "[Vídeo]"
        : resolvedMsg.message_type === "audio" ? "[Áudio]"
        : resolvedMsg.message_type === "document" ? "[Documento]"
        : resolvedMsg.message_type === "sticker" ? "[Figurinha]"
        : "[Mensagem]";
    }
    const persistedPreview = typeof thread.last_message_text === "string" ? thread.last_message_text.trim() : "";
    if (persistedPreview) {
      return persistedPreview.startsWith("waesy-msg:") ? "[Mensagem]" : persistedPreview;
    }
    const hasInternalNotes = messages.some(isInternalMsg) || Boolean(thread.internal_notes && thread.internal_notes.trim());
    if (hasInternalNotes) {
      return "(Apenas anotações internas da equipe)";
    }
    return "";
  })(),
  last_message_type: lastPublicMsg ? lastPublicMsg.message_type : (rpcSummary?.message_type || (lastMsg ? lastMsg.message_type : "text")),
  is_last_reply_staff: isLastReplyStaff,
  total_messages: rpcSummary ? rpcSummary.total_messages : messages.length,
  };
  });

  const slaAlerts = computeSlaAlertsSummary(formattedThreads, forgottenLeadsRes);

  let visibleThreads = formattedThreads;
  if (data?.status === "waiting") {
    visibleThreads = formattedThreads
      .filter((t: any) => t.waiting_for_reply === true)
      .sort((a: any, b: any) => (b.waiting_minutes || 0) - (a.waiting_minutes || 0));
  } else if (data?.status === "forgotten") {
    visibleThreads = formattedThreads
      .filter((t: any) => t.is_forgotten_today === true)
      .sort((a: any, b: any) => (b.waiting_minutes || 0) - (a.waiting_minutes || 0));
  }

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
  open: threadsList.filter((t: any) => t.status === "open").length,
  closed: threadsList.filter((t: any) => t.status === "closed" || t.status === "resolved").length,
  avg_rating,
  sla_first_response_min: null,
  };

  return {
  threads: visibleThreads,
  metrics,
  isSupervisor,
  slaAlerts,
  };
  } catch (error: any) {
  console.warn("[chat.functions] Falha inesperada ao listar threads:", error?.message || error);
  return {
  threads: [],
  metrics: { total: 0, open: 0, closed: 0, avg_rating: null, sla_first_response_min: null },
  slaAlerts: { waitingCount: 0, atRiskCount: 0, breachedCount: 0, forgottenTodayCount: 0, forgottenLeadsCount: 0, forgottenThreads: [] },
  };
  }
 });

/**
 * Mensagens da thread com metadados ricos (DB-first + suporte incremental `afterCreatedAt`)
 */
export const getChatMessages = createServerFn({ method: "GET" })
 .validator(
   z.object({
     threadId: z.string().uuid(),
     afterCreatedAt: z.string().optional(),
     limit: z.number().int().min(1).max(500).optional(),
     forceSync: z.boolean().optional(),
   }),
 )
 .handler(async ({ data: { threadId, afterCreatedAt, limit, forceSync } }) => {
 try {
 const db = getServerClient();
 const identity = await getServerIdentity();
 if (!identity?.id) throw new Error("Não autorizado");

 const { data: thread } = await db
 .from("chat_threads")
 .select("id, store_id, customer_id, order_id, department, status, thread_type, context_type, metadata, entity_id, channel_instance_id, last_message_at, last_message_text")
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

  const effectiveLimit = limit || 200;
  let msgQuery = db
    .from("chat_messages")
    .select("id, message, message_type, is_staff_reply, created_at, sender_id, attachments, payload, delivery_status, external_message_id, failed_at, error_code, error_message")
    .eq("thread_id", threadId);

  if (afterCreatedAt) {
    msgQuery = msgQuery
      .gte("created_at", afterCreatedAt)
      .order("created_at", { ascending: true })
      .limit(effectiveLimit);
  } else {
    msgQuery = msgQuery
      .order("created_at", { ascending: false })
      .limit(effectiveLimit);
  }

  const { data: messages, error } = await msgQuery;
  if (error) throw error;
  let rawMessages = afterCreatedAt
    ? ((messages || []) as any[])
    : ([...(messages || [])].reverse() as any[]);

  // Bootstrap unico da Evolution API apenas se:
  // (a) forceSync=true explicitamente, OU
  // (b) thread WhatsApp ainda nao possui bootstrap concluido E esta sem mensagens no banco (respeitando cooldown de 120s)
  const threadMetaForSync = ((thread as any).metadata && typeof (thread as any).metadata === "object"
    ? (thread as any).metadata
    : {}) as Record<string, any>;
  const lastEvoMsgSyncMs = threadMetaForSync.last_evo_msg_sync_at
    ? new Date(String(threadMetaForSync.last_evo_msg_sync_at)).getTime()
    : 0;
  const hasBootstrapped = Boolean(threadMetaForSync.history_bootstrap_done);
  const shouldBootstrapFromEvolution =
    !afterCreatedAt &&
    thread.context_type === "whatsapp" &&
    Boolean((thread as any).entity_id) &&
    (Boolean(forceSync) ||
      (!hasBootstrapped &&
        rawMessages.length === 0 &&
        (!lastEvoMsgSyncMs || Date.now() - lastEvoMsgSyncMs > 120_000)));

  if (shouldBootstrapFromEvolution) {
    try {
      const rawEntityId = String((thread as any).entity_id || "").trim();
      const threadMeta = threadMetaForSync;
      const threadMetaJid = String(threadMeta.whatsapp_jid || threadMeta.remote_jid || "").trim();
      const threadMetaAltJid = String(threadMeta.whatsapp_jid_alt || "").trim();
      const cleanDigits = rawEntityId.replace(/\D/g, "");
      const candidateJids = Array.from(
        new Set(
          [
            threadMetaJid.includes("@") ? threadMetaJid : "",
            threadMetaAltJid.includes("@") ? threadMetaAltJid : "",
            rawEntityId.includes("@") ? rawEntityId : "",
            cleanDigits.length >= 14 ? `${cleanDigits}@lid` : "",
            cleanDigits ? `${cleanDigits}@s.whatsapp.net` : "",
          ].filter(Boolean),
        ),
      );
      const primaryInstId = (thread as any).channel_instance_id || null;
      const { data: inst } = primaryInstId
        ? await db
            .from("whatsapp_channel_instances")
            .select("id, instance_key, external_instance_id, public_config, secret_payload_encrypted")
            .eq("id", primaryInstId)
            .eq("store_id", thread.store_id)
            .eq("provider", "evolution_api")
            .eq("is_active", true)
            .maybeSingle()
        : await db
            .from("whatsapp_channel_instances")
            .select("id, instance_key, external_instance_id, public_config, secret_payload_encrypted")
            .eq("store_id", thread.store_id)
            .eq("provider", "evolution_api")
            .eq("is_active", true)
            .order("is_default", { ascending: false })
            .limit(1)
            .maybeSingle();

      const fallbackInst =
        inst ||
        (
          await db
            .from("whatsapp_channel_instances")
            .select("id, instance_key, external_instance_id, public_config, secret_payload_encrypted")
            .eq("store_id", thread.store_id)
            .eq("provider", "evolution_api")
            .eq("is_active", true)
            .order("is_default", { ascending: false })
            .limit(1)
            .maybeSingle()
        ).data;

      if (fallbackInst && candidateJids.length > 0) {
        const { resolveEvolutionGatewayAccess } = await import("./whatsapp-evolution-config.server");
        const { baseUrl, apiKey, externalName } = resolveEvolutionGatewayAccess(fallbackInst as any);
        if (!baseUrl || !apiKey) throw new Error("Evolution API URL/Key não configuradas no ambiente.");

        let records: any[] = [];
        let syncedRemoteJid = "";
        const fetchLimit = rawMessages.length === 0 ? 30 : 20;
        for (const candidateJid of candidateJids.slice(0, 2)) {
          const evoRes = await fetch(`${baseUrl}/chat/findMessages/${encodeURIComponent(externalName)}`, {
            method: "POST",
            headers: { apikey: apiKey, "Content-Type": "application/json" },
            body: JSON.stringify({
              where: { key: { remoteJid: candidateJid } },
              limit: fetchLimit,
            }),
            signal: AbortSignal.timeout(3000),
          });
          if (!evoRes.ok) continue;
          const evoJson: any = await evoRes.json().catch(() => ({}));
          const foundRecs = evoJson?.messages?.records || (Array.isArray(evoJson) ? evoJson : []);
          if (Array.isArray(foundRecs) && foundRecs.length > 0) {
            records = foundRecs;
            syncedRemoteJid = candidateJid;
            break;
          }
        }
        const rowsToInsert: Array<Record<string, any>> = [];
        const existingLocalExtIds = new Set(
          rawMessages.map((m: any) => String(m?.external_message_id || "")).filter(Boolean),
        );
        if (records.length > 0) {
          const { extractWhatsAppGroupContext } = await import("@/services/omnichannel-attribution.server");
          for (const rec of records) {
            const key = rec.key || {};
            const externalId = String(key.id || "").trim();
            if (!externalId || existingLocalExtIds.has(externalId)) continue;
            existingLocalExtIds.add(externalId);
            const fromMe = Boolean(key.fromMe);
            const msg = rec.message || {};
            let msgType = "text";
            let text = "";
            let mediaUrl: string | null = null;
            let mediaMime = "application/octet-stream";
            if (msg.stickerMessage) {
              msgType = "sticker";
              text = "[Figurinha]";
              const rawB64 = rec.base64 || msg.base64 || null;
              mediaMime = msg.stickerMessage.mimetype || "image/webp";
              mediaUrl = rawB64
                ? normalizeMediaDataUri(rawB64, mediaMime, "sticker")
                : (msg.stickerMessage.pngThumbnail ? `data:image/png;base64,${msg.stickerMessage.pngThumbnail}` : null);
            } else if (msg.imageMessage) {
              msgType = "image";
              text = msg.imageMessage.caption?.trim() || "[Imagem]";
              const rawB64 = rec.base64 || msg.base64 || null;
              mediaMime = msg.imageMessage.mimetype || "image/jpeg";
              mediaUrl = rawB64
                ? normalizeMediaDataUri(rawB64, mediaMime, "image")
                : (msg.imageMessage.jpegThumbnail ? `data:image/jpeg;base64,${msg.imageMessage.jpegThumbnail}` : null);
            } else if (msg.videoMessage) {
              msgType = "video";
              text = msg.videoMessage.caption?.trim() || "[Vídeo]";
              const rawB64 = rec.base64 || msg.base64 || null;
              mediaMime = msg.videoMessage.mimetype || "video/mp4";
              mediaUrl = rawB64 ? normalizeMediaDataUri(rawB64, mediaMime, "video") : null;
            } else if (msg.audioMessage) {
              msgType = "audio";
              text = "[Áudio]";
              const rawB64 = rec.base64 || msg.base64 || null;
              mediaMime = msg.audioMessage.mimetype || "audio/ogg";
              mediaUrl = rawB64 ? normalizeMediaDataUri(rawB64, mediaMime, "audio") : null;
              if (isBrokenOrMissingMediaUri(mediaUrl, "audio")) {
                try {
                  const { hydrateMediaFromEvolution } = await import("./whatsapp-media.server");
                  const hydrated = await hydrateMediaFromEvolution({
                    db,
                    storeId: thread.store_id,
                    instance: fallbackInst as any,
                    channelInstanceId: fallbackInst.id,
                    externalMessageId: externalId,
                    remoteJid: String(key.remoteJid || syncedRemoteJid || ""),
                    fromMe,
                    messageType: "audio",
                    preferredMime: mediaMime,
                    persistToMessage: false,
                  });
                  if (hydrated?.dataUri) {
                    mediaUrl = hydrated.dataUri;
                    mediaMime = hydrated.mimetype;
                  }
                } catch {
                  // Mantem fallback sob demanda
                }
              }
            } else if (msg.documentMessage || msg.documentWithCaptionMessage?.message?.documentMessage) {
              const docMsg = msg.documentMessage || msg.documentWithCaptionMessage?.message?.documentMessage;
              msgType = "document";
              text = docMsg?.caption?.trim() || docMsg?.fileName?.trim() || "[Documento]";
              const rawB64 = rec.base64 || msg.base64 || null;
              mediaMime = docMsg?.mimetype || "application/pdf";
              mediaUrl = rawB64 ? normalizeMediaDataUri(rawB64, mediaMime, "document") : null;
            } else {
              text = String(msg.conversation || msg.extendedTextMessage?.text || "").trim();
            }
            if (!text && !mediaUrl) continue;
            if (!text) text = "[Mensagem]";

            const ts = Number(rec.messageTimestamp || Date.now() / 1000);
            const occurredAt = new Date(ts < 2_000_000_000 ? ts * 1000 : ts).toISOString();
            const grp = extractWhatsAppGroupContext(rec, rec);
            const msgMetadata =
              grp.isGroup || grp.senderPhone || grp.senderName
                ? {
                    sender_jid: grp.senderJid || null,
                    sender_phone: grp.senderPhone || null,
                    sender_name: grp.senderName || null,
                    is_group: grp.isGroup,
                  }
                : {};
            rowsToInsert.push({
              thread_id: thread.id,
              channel: "whatsapp",
              message: text,
              message_type: msgType,
              is_staff_reply: fromMe,
              provider: "evolution_api",
              provider_name: "evolution_api",
              external_message_id: externalId,
              provider_message_id: externalId,
              delivery_status: fromMe ? "sent" : "delivered",
              sent_at: occurredAt,
              delivered_at: occurredAt,
              is_encrypted: false,
              encryption_version: 1,
              attachments: mediaUrl ? [mediaUrl] : [],
              payload: {
                ...msgMetadata,
                origin: fromMe ? "whatsapp_device" : "whatsapp_customer",
                ...(mediaUrl ? { media: { type: msgType, url: mediaUrl, mimetype: mediaMime } } : {}),
              },
              created_at: occurredAt,
            });
          }

          if (rowsToInsert.length > 0) {
            const { persistWhatsAppMessagesIdempotently } = await import("./whatsapp-message-persistence.server");
            const persistRes = await persistWhatsAppMessagesIdempotently(db, rowsToInsert, {
              selectFields:
                "id, message, message_type, is_staff_reply, created_at, sender_id, attachments, payload, delivery_status, external_message_id, failed_at, error_code, error_message",
            });
            if (persistRes.insertedRows.length > 0) {
              rawMessages.push(...persistRes.insertedRows);
            } else if (rawMessages.length === 0 && persistRes.skippedDuplicates > 0) {
              const { data: racedRows } = await db
                .from("chat_messages")
                .select("id, message, message_type, is_staff_reply, created_at, sender_id, attachments, payload, delivery_status, external_message_id, failed_at, error_code, error_message")
                .eq("thread_id", threadId)
                .order("created_at", { ascending: false })
                .limit(effectiveLimit);
              if (Array.isArray(racedRows) && racedRows.length > 0) {
                rawMessages.push(...[...racedRows].reverse());
              }
            }
          }
          rawMessages.sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        }

        const latestSynced = rawMessages[rawMessages.length - 1];
        const latestSyncedMs = latestSynced?.created_at ? new Date(latestSynced.created_at).getTime() : 0;
        const prevCursorMs = Number(threadMetaForSync.sync_cursor_ms || 0);
        const nowSyncIso = new Date().toISOString();
        const nextSyncMeta = {
          ...threadMetaForSync,
          history_bootstrap_done: true,
          last_evo_msg_sync_at: nowSyncIso,
          ...(latestSyncedMs > prevCursorMs ? { sync_cursor_ms: latestSyncedMs } : {}),
          ...(syncedRemoteJid && !threadMetaForSync.whatsapp_jid ? { whatsapp_jid: syncedRemoteJid } : {}),
        };
        const threadSyncPatch: Record<string, any> = { metadata: nextSyncMeta };
        if (latestSynced) {
          const prevLastMs = (thread as any).last_message_at ? new Date(String((thread as any).last_message_at)).getTime() : 0;
          if (latestSyncedMs > prevLastMs || !(thread as any).last_message_text) {
            threadSyncPatch.last_message_text = String(latestSynced.message || "").slice(0, 200);
            threadSyncPatch.last_message_at = latestSynced.created_at;
          }
        }
        await db
          .from("chat_threads")
          .update(threadSyncPatch)
          .eq("id", thread.id)
          .eq("store_id", thread.store_id);
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
            const healInstId = (thread as any).channel_instance_id || null;
            const { data: inst } = healInstId
              ? await db
                  .from("whatsapp_channel_instances")
                  .select("instance_key, external_instance_id, public_config")
                  .eq("id", healInstId)
                  .eq("store_id", thread.store_id)
                  .eq("is_active", true)
                  .maybeSingle()
              : await db
                  .from("whatsapp_channel_instances")
                  .select("instance_key, external_instance_id, public_config, secret_payload_encrypted")
                  .eq("store_id", thread.store_id)
                  .eq("is_active", true)
                  .order("is_default", { ascending: false })
                  .limit(1)
                  .maybeSingle();

            if (inst) {
              const { resolveEvolutionGatewayAccess } = await import("./whatsapp-evolution-config.server");
              const { baseUrl, apiKey, externalName } = resolveEvolutionGatewayAccess(inst as any);

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
        metadata: m.payload || {},
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

  // Renova Signed URLs expiradas do bucket privado `chat-media-private` e hidrata mídias pendentes
  const storageRowsToRefresh: number[] = [];
  for (let i = 0; i < decryptedMessages.length; i++) {
    const m = decryptedMessages[i];
    const mediaMeta = m?.payload?.media;
    if (mediaMeta?.storage_bucket && mediaMeta?.storage_path) {
      const att = Array.isArray(m.attachments) && m.attachments.length > 0 ? String(m.attachments[0] || "") : "";
      const hydratedAtMs = mediaMeta.hydrated_at ? Date.parse(String(mediaMeta.hydrated_at)) : 0;
      const isSignedExpired = !att || !/^https?:\/\//i.test(att) || (hydratedAtMs > 0 && Date.now() - hydratedAtMs > 40 * 60_000);
      if (isSignedExpired) {
        storageRowsToRefresh.push(i);
      }
    }
  }
  if (storageRowsToRefresh.length > 0) {
    const { refreshSignedChatMediaUrl } = await import("./whatsapp-media.server");
    await Promise.all(
      storageRowsToRefresh.slice(-20).map(async (idx) => {
        const msgRow = decryptedMessages[idx];
        const mediaMeta = msgRow.payload.media;
        const freshUrl = await refreshSignedChatMediaUrl(
          db,
          mediaMeta.storage_bucket,
          mediaMeta.storage_path,
          3600,
        );
        if (freshUrl) {
          decryptedMessages[idx] = {
            ...msgRow,
            attachments: [freshUrl],
            payload: {
              ...(msgRow.payload || {}),
              media: {
                ...mediaMeta,
                url: freshUrl,
              },
            },
          };
        }
      }),
    );
  }

  // Hidrata proativamente mídias recentes (áudio, imagem, vídeo, documento e figurinha) sem URI persistida (máx. 2 por chamada; não bloqueia deltas)
  if (!afterCreatedAt && thread.context_type === "whatsapp" && decryptedMessages.length > 0) {
    const missingMediaIndices: number[] = [];
    const autoHydrateTypes = new Set(["audio", "image", "sticker", "video", "document"]);
    for (let i = decryptedMessages.length - 1; i >= 0 && missingMediaIndices.length < 2; i--) {
      const m = decryptedMessages[i];
      const msgType = typeof m.message_type === "string" ? m.message_type : "";
      const att = Array.isArray(m.attachments) && m.attachments.length > 0 ? m.attachments[0] : m.payload?.media?.url;
      if (
        autoHydrateTypes.has(msgType) &&
        m.external_message_id &&
        !m.payload?.media?.storage_path &&
        !m.payload?.media?.media_size_guard &&
        isBrokenOrMissingMediaUri(att, msgType)
      ) {
        missingMediaIndices.push(i);
      }
    }
    if (missingMediaIndices.length > 0) {
      const threadMeta = (thread.metadata && typeof thread.metadata === "object" ? thread.metadata : {}) as Record<string, any>;
      const remoteJid =
        typeof threadMeta.whatsapp_jid === "string" && threadMeta.whatsapp_jid.trim()
          ? threadMeta.whatsapp_jid.trim()
          : typeof thread.entity_id === "string" && thread.entity_id.trim()
            ? thread.entity_id.trim()
            : null;
      const { hydrateMediaFromEvolution } = await import("./whatsapp-media.server");
      await Promise.all(
        missingMediaIndices.map(async (idx) => {
          const msgRow = decryptedMessages[idx];
          const msgType = typeof msgRow.message_type === "string" ? msgRow.message_type : "audio";
          const hydrated = await hydrateMediaFromEvolution({
            db,
            storeId: thread.store_id,
            channelInstanceId: (thread as any).channel_instance_id || null,
            threadId: thread.id,
            messageId: msgRow.id,
            externalMessageId: String(msgRow.external_message_id),
            remoteJid,
            fromMe: Boolean(msgRow.is_staff_reply),
            messageType: msgType,
            preferredMime:
              typeof msgRow.payload?.media?.mimetype === "string"
                ? msgRow.payload.media.mimetype
                : resolveDefaultMimeByMessageType(msgType),
            persistToMessage: true,
          }).catch(() => null);
          const effectiveUrl = hydrated?.signedUrl || hydrated?.dataUri;
          if (effectiveUrl) {
            decryptedMessages[idx] = {
              ...msgRow,
              attachments: [effectiveUrl],
              payload: {
                ...(msgRow.payload || {}),
                media: {
                  ...((msgRow.payload && msgRow.payload.media) || {}),
                  type: msgRow.payload?.media?.type || msgType,
                  url: effectiveUrl,
                  mimetype: hydrated.mimetype,
                  ...(hydrated.storageBucket ? { storage_bucket: hydrated.storageBucket } : {}),
                  ...(hydrated.storagePath ? { storage_path: hydrated.storagePath } : {}),
                },
              },
            };
          }
        }),
      );
    }
  }

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

export async function resolveOutboundWhatsAppInstanceForThread(
  db: any,
  params: {
    storeId: string;
    threadChannelInstanceId?: string | null;
    agentProfileId?: string | null;
    departmentSlug?: string | null;
  },
): Promise<{
  channelInstanceId: string | null;
  provider: string;
  source: "thread" | "agent" | "department" | "store_default" | "none";
}> {
  const isUsable = (inst: any) =>
    Boolean(inst && inst.id && inst.is_active !== false && inst.status !== "revoked" && inst.status !== "disabled");

  if (params.threadChannelInstanceId) {
    const { data: inst } = await db
      .from("whatsapp_channel_instances")
      .select("id, provider, is_active, status")
      .eq("id", params.threadChannelInstanceId)
      .eq("store_id", params.storeId)
      .maybeSingle();
    if (isUsable(inst)) {
      return { channelInstanceId: inst.id, provider: inst.provider || "evolution_api", source: "thread" };
    }
  }

  if (params.agentProfileId) {
    const { data: member } = await db
      .from("workspace_members")
      .select("whatsapp_instance_id")
      .eq("store_id", params.storeId)
      .eq("profile_id", params.agentProfileId)
      .maybeSingle();
    if (member?.whatsapp_instance_id) {
      const { data: agentInst } = await db
        .from("whatsapp_channel_instances")
        .select("id, provider, is_active, status")
        .eq("id", member.whatsapp_instance_id)
        .eq("store_id", params.storeId)
        .maybeSingle();
      if (isUsable(agentInst)) {
        return { channelInstanceId: agentInst.id, provider: agentInst.provider || "evolution_api", source: "agent" };
      }
    }
  }

  if (params.departmentSlug) {
    const { data: dept } = await db
      .from("chat_departments")
      .select("whatsapp_instance_id")
      .eq("store_id", params.storeId)
      .eq("slug", params.departmentSlug)
      .maybeSingle();
    if (dept?.whatsapp_instance_id) {
      const { data: deptInst } = await db
        .from("whatsapp_channel_instances")
        .select("id, provider, is_active, status")
        .eq("id", dept.whatsapp_instance_id)
        .eq("store_id", params.storeId)
        .maybeSingle();
      if (isUsable(deptInst)) {
        return { channelInstanceId: deptInst.id, provider: deptInst.provider || "evolution_api", source: "department" };
      }
    }
  }

  const { data: defaultInst } = await db
    .from("whatsapp_channel_instances")
    .select("id, provider, is_active, status")
    .eq("store_id", params.storeId)
    .eq("is_active", true)
    .neq("status", "revoked")
    .neq("status", "disabled")
    .order("is_default", { ascending: false })
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (isUsable(defaultInst)) {
    return { channelInstanceId: defaultInst.id, provider: defaultInst.provider || "evolution_api", source: "store_default" };
  }

  return { channelInstanceId: null, provider: "evolution_api", source: "none" };
}

export async function _sendChatMessage(
  input: z.infer<typeof sendStaffMessageSchema>,
  deps?: { db?: any; identity?: any },
) {
  const db = deps?.db ?? getServerClient();
  const identity = deps?.identity ?? (await getServerIdentity());
  if (!identity?.id) throw new Error("Não autorizado");

  const { data: thread } = await db
    .from("chat_threads")
    .select("id, store_id, context_type, entity_id, channel_instance_id, department, first_response_at, metadata, assigned_to_profile_id")
    .eq("id", input.threadId)
    .single();

  if (!thread) throw new Error("Conversa não encontrada ou acesso negado.");
  assertStoreAccess(identity, STAFF_ROLES, thread.store_id);

  const isInternal = Boolean(
    input.is_internal ||
    input.payload?.is_internal ||
    input.payload?.is_whisper ||
    ((input.message_type as string) === "internal_note") ||
    (input.message_type === "system_event" && input.payload?.is_whisper),
  );

  // Enforce per-channel RBAC (`can_reply`) for non-supervisor staff on WhatsApp threads
  if (!isInternal && thread.context_type === "whatsapp") {
    const targetMembership = (identity.memberships || []).find((m: any) => m.store_id === thread.store_id);
    const effectiveRole = targetMembership?.role || identity.role;
    const isSupervisor =
      [...MANAGER_ROLES].includes(effectiveRole as any) ||
      identity.role === "platform_admin" ||
      identity.role === "master";
    if (!isSupervisor) {
      const boundInstanceId = (thread as any).channel_instance_id || null;
      if (boundInstanceId) {
        const { data: instPerm } = await db
          .from("whatsapp_instance_member_permissions")
          .select("can_view, can_reply")
          .eq("store_id", thread.store_id)
          .eq("instance_id", boundInstanceId)
          .eq("profile_id", identity.id)
          .maybeSingle();
        if (instPerm && (instPerm.can_view === false || instPerm.can_reply === false)) {
          throw new Error("Você não tem permissão para responder mensagens neste canal WhatsApp.");
        }
      }
    }
  }
  const finalPayload = {
    ...(input.payload || {}),
    is_internal: isInternal,
    ...(isInternal ? { is_whisper: true } : {}),
  };

  const normalizedInputText =
    input.message.trim() ||
    (typeof input.payload?.file_name === "string" && input.payload.file_name.trim()
      ? input.payload.file_name.trim()
      : input.attachments.length > 0
        ? "[Anexo]"
        : "");
  const normalizedDispatchInput = {
    ...input,
    message: input.message.trim(),
  };

  const { data: msg, error } = await db
    .from("chat_messages")
    .insert({
      thread_id: input.threadId,
      message: normalizedInputText,
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
    const nowIso = new Date().toISOString();
    let resolvedChannelInstanceId: string | null = (thread as any).channel_instance_id || null;
    let resolvedProvider = "evolution_api";

    if (thread.context_type === "whatsapp" && thread.entity_id) {
      const routing = await resolveOutboundWhatsAppInstanceForThread(db, {
        storeId: thread.store_id,
        threadChannelInstanceId: (thread as any).channel_instance_id || null,
        agentProfileId: identity.id,
        departmentSlug: (thread as any).department || null,
      });
      resolvedChannelInstanceId = routing.channelInstanceId;
      resolvedProvider = routing.provider;
    }

    const prevSendMeta = (((thread as any).metadata || {}) as Record<string, any>);
    const prevSendCursor = Number(prevSendMeta.sync_cursor_ms || 0);
    const sentAtMs = Date.parse(nowIso) || Date.now();
    const threadStaffPatch = {
      last_message_text: normalizedInputText.slice(0, 200),
      metadata: {
        ...prevSendMeta,
        handoff_mode: "human_active",
        ai_auto_reply_enabled: false,
        last_human_agent_id: identity.id,
        history_bootstrap_done: true,
        sync_cursor_ms: Math.max(prevSendCursor, sentAtMs),
      },
      ...(!(thread as any).assigned_to_profile_id ? { assigned_to_profile_id: identity.id } : {}),
      ...(!(thread as any).first_response_at ? { first_response_at: nowIso } : {}),
      ...(!(thread as any).channel_instance_id && resolvedChannelInstanceId
        ? { channel_instance_id: resolvedChannelInstanceId }
        : {}),
      last_message_at: nowIso,
      last_staff_reply_at: nowIso,
      updated_at: nowIso,
    };
    const { error: patchErr } = await db
      .from("chat_threads")
      .update(threadStaffPatch)
      .eq("id", input.threadId);
    if (patchErr && (String(patchErr.code || "") === "42703" || String(patchErr.message || "").includes("last_staff_reply_at"))) {
      const { last_staff_reply_at: _omit, ...legacyPatch } = threadStaffPatch;
      await db.from("chat_threads").update(legacyPatch).eq("id", input.threadId);
    }

    // Cross-Module Outbound Dispatch: Disparo bidirecional para canais externos apenas se NÃO for nota interna
    if (thread.context_type === "whatsapp" && thread.entity_id) {
      try {
        const threadMeta = (((thread as any).metadata || {}) as Record<string, any>);
        const waAlt = typeof threadMeta.whatsapp_jid_alt === "string" ? threadMeta.whatsapp_jid_alt.trim() : "";
        const waJid = typeof threadMeta.whatsapp_jid === "string" ? threadMeta.whatsapp_jid.trim() : "";
        const rawEntity = String(thread.entity_id).trim();
        const isMetaLid = isSyntheticMetaLid(rawEntity, rawEntity, threadMeta);
        const cleanPhone =
          waAlt && !waAlt.endsWith("@lid")
            ? waAlt.replace(/@.*$/, "")
            : isMetaLid
              ? (waJid.endsWith("@lid") ? waJid : `${rawEntity.replace(/\D/g, "")}@lid`)
              : rawEntity.endsWith("@g.us") || rawEntity.endsWith("@lid")
                ? rawEntity
                : rawEntity.replace(/@.*$/, "");

        if (resolvedChannelInstanceId) {
          const dispatchSpec = buildOutboxDispatchSpecFromStaffMessage(normalizedDispatchInput, msg.id);
          await db.from("whatsapp_outbox").upsert(
            {
              store_id: thread.store_id,
              thread_id: thread.id,
              channel_instance_id: resolvedChannelInstanceId,
              provider: resolvedProvider,
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
            recipientPhone: cleanPhone,
            messageText: normalizedInputText,
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
}

/**
 * Envio seguro de mensagem pela equipe (com suporte a cards de pedido e cobrança Pix)
 */
export const sendChatMessage = createServerFn({ method: "POST" })
  .validator(sendStaffMessageSchema)
  .handler(async ({ data: input }) => {
    try {
      return await _sendChatMessage(input);
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
     .select("id, customer_id, channel_identity_id, lead_id, guest_name, guest_email, group_subject, primary_phone_e164, entity_id, thread_type, department, priority, status, internal_notes, tags, assigned_to_profile_id, metadata, attribution")
     .eq("id", threadId)
     .eq("store_id", storeId)
     .maybeSingle();
   threadContext = threadRow || null;
 }

 const threadMeta = ((threadContext?.metadata as any) || {}) as Record<string, any>;
 const entityDigits = String(threadContext?.entity_id || "").replace(/\D/g, "");
 const isGroupThread = Boolean(
   threadContext?.thread_type === "group" ||
     threadMeta.is_group ||
     String(threadContext?.entity_id || "").includes("@g.us") ||
     /^120363\d{10,}$/.test(entityDigits),
 );
 let resolvedCustomerId = isGroupThread ? null : (customerId || threadContext?.customer_id || null);
 const rawPhone = isGroupThread
   ? null
   : (guestPhone || threadContext?.primary_phone_e164 || threadContext?.entity_id || null);
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

 const { sanitizeCustomerEmail } = await import("@/lib/contact-sanitize");
 const isMetaLidThread = !isGroupThread && isSyntheticMetaLid(threadContext?.entity_id, rawPhone, threadMeta);
 const customerPhone = profileData?.phone || crmCustomer?.phone || (isMetaLidThread ? null : rawPhone) || null;
 const overrideMeta = (threadContext?.metadata as any)?.customer_profile_override || null;
 const rawCandidateEmail = String(overrideMeta?.email || crmCustomer?.email || threadContext?.guest_email || "").trim();
 const sanitizedCustomerEmail = sanitizeCustomerEmail(rawCandidateEmail);
 const resolvedAvatarUrl =
   overrideMeta?.avatar_url ||
   profileData?.avatar_url ||
   (threadContext?.metadata as any)?.avatar_url ||
   null;

 const safeContextGuestName = !isRawLidOrSyntheticName(guestName, threadContext?.entity_id, threadMeta) ? guestName : null;
 const safeThreadGuestName = !isRawLidOrSyntheticName(threadContext?.guest_name, threadContext?.entity_id, threadMeta) ? threadContext?.guest_name : null;
 const safeThreadPushName = !isRawLidOrSyntheticName(threadMeta?.push_name, threadContext?.entity_id, threadMeta) ? threadMeta?.push_name : null;
 profileData = {
   id: resolvedCustomerId,
   full_name: isGroupThread
     ? (threadContext?.group_subject ||
         overrideMeta?.full_name ||
         threadMeta.group_subject ||
         safeContextGuestName ||
         safeThreadGuestName ||
         "Grupo WhatsApp")
     : (overrideMeta?.full_name ||
         crmCustomer?.full_name ||
         profileData?.full_name ||
         safeContextGuestName ||
         safeThreadGuestName ||
         safeThreadPushName ||
         customerPhone ||
         (isMetaLidThread ? `Contato WhatsApp #${entityDigits.slice(-4) || "LID"}` : "Visitante em Atendimento")),
   phone: isGroupThread ? null : (overrideMeta?.phone || customerPhone),
   email: isGroupThread ? null : sanitizedCustomerEmail,
   document_cpf: isGroupThread ? null : (overrideMeta?.document_cpf || crmCustomer?.document || profileData?.cpf || null),
   city: isGroupThread ? null : (overrideMeta?.city || crmCustomer?.city || profileData?.city || null),
   avatar_url: resolvedAvatarUrl,
   created_at: profileData?.created_at || crmCustomer?.created_at || null,
 };

 const leadOrFilters: string[] = [];
 if (threadContext?.lead_id) leadOrFilters.push(`id.eq.${threadContext.lead_id}`);
 if (resolvedCustomerId) leadOrFilters.push(`customer_id.eq.${resolvedCustomerId}`);
 if (!isGroupThread) {
   for (const variant of buildBrazilPhoneVariants(overrideMeta?.phone || customerPhone)) {
     leadOrFilters.push(`phone.eq.${variant}`);
   }
 }

 const [ordersRes, ticketsRes, opTicketsRes, tasksRes, tripsRes, creditsRes, leadsRes, quotesRes, contractsRes, debtRes, docsRes, proposalsRes] = await Promise.all([
   resolvedCustomerId
     ? db.from("orders").select("id, total_cents, status, created_at, payments(method)").eq("store_id", storeId).eq("customer_id", resolvedCustomerId).order("created_at", { ascending: false }).limit(10)
     : Promise.resolve({ data: [] as any[] }),
   resolvedCustomerId
     ? db.from("store_support_tickets").select("*").eq("store_id", storeId).eq("customer_id", resolvedCustomerId).order("created_at", { ascending: false })
     : threadId
       ? db.from("store_support_tickets").select("*").eq("store_id", storeId).eq("thread_id", threadId).order("created_at", { ascending: false })
       : Promise.resolve({ data: [] as any[] }),
   resolvedCustomerId
     ? db.from("operator_support_tickets").select("*").eq("store_id", storeId).eq("customer_id", resolvedCustomerId).order("created_at", { ascending: false }).limit(10)
     : Promise.resolve({ data: [] as any[] }),
   db
     .from("workspace_tasks")
     .select("id, task_code, title, description, priority, status, due_date, context_type, context_id, context_label, tags, is_my_day, custom_fields, created_at")
     .eq("store_id", storeId)
     .neq("status", "archived")
     .order("created_at", { ascending: false })
     .limit(40),
   resolvedCustomerId
     ? db.from("tourism_trips").select("id, trip_number, title, destination_city, travel_start_date, travel_end_date, total_cents, status, financial_details").eq("store_id", storeId).eq("customer_id", resolvedCustomerId).order("travel_start_date", { ascending: false }).limit(5)
     : Promise.resolve({ data: [] as any[] }),
   db.from("air_ticket_credits").select("id, airline, original_pnr, remaining_amount_cents, expires_at, status").eq("agency_id", storeId).eq("status", "active").limit(5),
   leadOrFilters.length > 0
     ? db
         .from("leads_crm")
         .select("id, status, title, estimated_value_cents, source, destination_of_interest, assigned_to, notes, checklist, custom_fields, created_at, updated_at")
         .eq("store_id", storeId)
         .or(leadOrFilters.join(","))
         .order("created_at", { ascending: false })
         .limit(20)
     : Promise.resolve({ data: [] as any[] }),
   (() => {
     const quoteOrParts: string[] = [];
     if (profileData?.email) quoteOrParts.push(`contact_email.eq.${profileData.email}`);
     if (customerPhone) quoteOrParts.push(`contact_whatsapp.eq.${customerPhone}`);
     if (cleanDigits.length >= 8) quoteOrParts.push(`contact_whatsapp.eq.+${cleanDigits}`, `contact_whatsapp.eq.${cleanDigits}`);
     if (quoteOrParts.length === 0) return Promise.resolve({ data: [] as any[] });
     return db
       .from("travel_quotes")
       .select("id, protocol_number, destination_city, quote_amount_cents, status, created_at")
       .eq("store_id", storeId)
       .or(quoteOrParts.join(","))
       .order("created_at", { ascending: false })
       .limit(5);
   })(),
   (resolvedCustomerId || threadContext?.lead_id)
     ? db
         .from("contracts")
         .select("id, verification_code, title, status, metadata, created_at")
         .eq("store_id", storeId)
         .or(
           [
             ...(resolvedCustomerId ? [`customer_id.eq.${resolvedCustomerId}`] : []),
             ...(threadContext?.lead_id ? [`lead_id.eq.${threadContext.lead_id}`] : []),
           ].join(","),
         )
         .order("created_at", { ascending: false })
         .limit(8)
     : Promise.resolve({ data: [] as any[] }),
   resolvedCustomerId
     ? db.from("customer_debt_ledger").select("id, amount_cents, status, reason, created_at").eq("customer_id", resolvedCustomerId).eq("status", "pending")
     : Promise.resolve({ data: [] as any[] }),
   resolvedCustomerId
     ? db.from("customer_documents").select("*").eq("store_id", storeId).eq("customer_id", resolvedCustomerId).order("created_at", { ascending: false }).limit(20)
     : Promise.resolve({ data: [] as any[] }),
   (() => {
     const propOrParts: string[] = [];
     const activeLeadHint =
       typeof (threadContext?.metadata as any)?.active_lead_id === "string" &&
       (threadContext?.metadata as any).active_lead_id !== "none"
         ? (threadContext?.metadata as any).active_lead_id
         : threadContext?.lead_id || null;
     if (resolvedCustomerId) propOrParts.push(`customer_id.eq.${resolvedCustomerId}`);
     if (activeLeadHint) propOrParts.push(`lead_id.eq.${activeLeadHint}`);
     if (profileData?.email) propOrParts.push(`client_email.eq.${profileData.email}`);
     if (!isGroupThread) {
       for (const variant of buildBrazilPhoneVariants(overrideMeta?.phone || customerPhone)) {
         propOrParts.push(`client_whatsapp.eq.${variant}`);
       }
     }
     if (propOrParts.length === 0) return Promise.resolve({ data: [] as any[] });
     return db
       .from("travel_proposals")
       .select("id, quote_id, title, destination_city, public_token, pricing, status, visibility_mode, created_at")
       .eq("store_id", storeId)
       .eq("is_hidden", false)
       .or(propOrParts.join(","))
       .order("updated_at", { ascending: false })
       .limit(8);
   })(),
 ]);

 const customerOrderIds = ((ordersRes?.data as any[]) || []).map((o) => o.id).filter(Boolean);
 const customerQuoteIds = ((quotesRes?.data as any[]) || []).map((q) => q.id).filter(Boolean);
 const [invoicesRes, commercialInvoicesRes, linkedPropsByQuoteRes, storeInfoRes, formSubmissionsRes, customerCreditsRes, installmentPlansRes, clinicalRecordsRes, appointmentsRes] = await Promise.all([
   customerOrderIds.length > 0
     ? db
         .from("financial_transactions")
         .select("id, type, description, amount_cents, category, reference_date, created_at, order_id")
         .eq("store_id", storeId)
         .in("order_id", customerOrderIds)
         .order("created_at", { ascending: false })
         .limit(10)
     : Promise.resolve({ data: [] as any[] }),
   db
     .from("commercial_invoices")
     .select("id, invoice_code, document_type, status, customer_id, lead_id, customer_snapshot, total_cents, public_token, valid_until, created_at")
     .eq("store_id", storeId)
     .order("created_at", { ascending: false })
     .limit(25),
   customerQuoteIds.length > 0
     ? db
         .from("travel_proposals")
         .select("id, quote_id, title, destination_city, public_token, pricing, status, visibility_mode, created_at")
         .eq("store_id", storeId)
         .eq("is_hidden", false)
         .in("quote_id", customerQuoteIds)
         .order("updated_at", { ascending: false })
     : Promise.resolve({ data: [] as any[] }),
   db
     .from("stores")
     .select("id, name, slug, custom_domain, niche, settings")
     .eq("id", storeId)
     .maybeSingle(),
   resolvedCustomerId
     ? db
         .from("user_form_submissions_log")
         .select("id, form_type, form_name, route, route_path, metadata, created_at")
         .eq("store_id", storeId)
         .eq("user_id", resolvedCustomerId)
         .order("created_at", { ascending: false })
         .limit(25)
     : db
         .from("user_form_submissions_log")
         .select("id, form_type, form_name, route, route_path, metadata, created_at")
         .eq("store_id", storeId)
         .order("created_at", { ascending: false })
         .limit(40),
   resolvedCustomerId
     ? db
         .from("customer_credits")
         .select("id, balance_cents, created_at")
         .eq("customer_id", resolvedCustomerId)
         .order("created_at", { ascending: false })
         .limit(10)
     : Promise.resolve({ data: [] as any[] }),
   resolvedCustomerId
     ? db
         .from("installment_plans")
         .select("id, order_id, total_cents, status, created_at, installments(id, amount_cents, due_date, status, paid_at)")
         .eq("customer_id", resolvedCustomerId)
         .order("created_at", { ascending: false })
         .limit(10)
     : Promise.resolve({ data: [] as any[] }),
   resolvedCustomerId
     ? db
         .from("crm_clinical_records")
         .select("id, record_type, content, appointment_id, created_at")
         .eq("store_id", storeId)
         .eq("customer_id", resolvedCustomerId)
         .order("created_at", { ascending: false })
         .limit(20)
     : Promise.resolve({ data: [] as any[] }),
   resolvedCustomerId
     ? db
         .from("booking_appointments")
         .select("id, start_time, end_time, status, notes, service_id, created_at")
         .eq("store_id", storeId)
         .eq("customer_id", resolvedCustomerId)
         .order("start_time", { ascending: false })
         .limit(10)
     : Promise.resolve({ data: [] as any[] }),
 ]);

 const matchedCommercialInvoices = ((commercialInvoicesRes?.data as any[]) || []).filter((ci: any) => {
   if (resolvedCustomerId && ci.customer_id === resolvedCustomerId) return true;
   if (threadContext?.lead_id && ci.lead_id === threadContext.lead_id) return true;
   const snap = (ci.customer_snapshot && typeof ci.customer_snapshot === "object" ? ci.customer_snapshot : {}) as Record<string, any>;
   const snapDigits = String(snap.phone || snap.whatsapp || "").replace(/\D/g, "");
   if (!isGroupThread && cleanDigits.length >= 8 && snapDigits && snapDigits.endsWith(cleanDigits.slice(-8))) return true;
   if (!isGroupThread && sanitizedCustomerEmail && String(snap.email || "").trim().toLowerCase() === sanitizedCustomerEmail.toLowerCase()) return true;
   return false;
 });

 const opportunities = ((leadsRes?.data as any[]) || []).map((op: any) => ({
   ...op,
   estimated_budget: op.estimated_value_cents ?? 0,
 }));
 const activeLeadIdFromThread = (threadContext?.metadata as any)?.active_lead_id || threadContext?.lead_id;
 let linkedLead: any = null;
 if (activeLeadIdFromThread === "none") {
   linkedLead = null;
 } else if (typeof activeLeadIdFromThread === "string" && activeLeadIdFromThread.length > 10) {
   linkedLead = opportunities.find((op) => op.id === activeLeadIdFromThread) || null;
   if (!linkedLead) {
     const { data: explicitLead } = await db
       .from("leads_crm")
       .select("id, status, title, estimated_value_cents, source, destination_of_interest, assigned_to, notes, checklist, custom_fields, created_at, updated_at")
       .eq("id", activeLeadIdFromThread)
       .eq("store_id", storeId)
       .maybeSingle();
     if (explicitLead) {
       linkedLead = {
         ...explicitLead,
         estimated_budget: (explicitLead as any).estimated_value_cents ?? 0,
       };
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

 const orders = (ordersRes.data || []).map((o: any) => ({
   ...o,
   total_amount_cents: o.total_cents ?? 0,
   payment_method: Array.isArray(o.payments) ? o.payments[0]?.method || null : o.payments?.method || null,
 }));
 const paidOrders = orders.filter((o: any) => ["completed", "delivered", "paid"].includes(o.status));
 const totalSpentCents = paidOrders.reduce((acc: number, curr: any) => acc + (Number(curr.total_amount_cents) || 0), 0);
 const lastPurchaseAt = paidOrders[0]?.created_at || orders[0]?.created_at || null;
 const pendingDebts = (debtRes?.data as any[]) || [];
 const pendingDebtCents = pendingDebts.reduce((acc: number, curr: any) => acc + (Number(curr.amount_cents) || 0), 0);

 const proposalsById = new Map<string, any>();
 [
   ...((proposalsRes?.data as any[]) || []),
   ...((linkedPropsByQuoteRes?.data as any[]) || []),
 ].forEach((p: any) => {
   if (p?.id && !proposalsById.has(p.id)) {
     proposalsById.set(p.id, p);
   }
 });

 const proposalByQuoteId = new Map<string, any>();
 proposalsById.forEach((p) => {
   if (p.quote_id && !proposalByQuoteId.has(p.quote_id)) {
     proposalByQuoteId.set(p.quote_id, p);
   }
 });

 const proposalEntries = Array.from(proposalsById.values()).map((p: any) => {
   const pr = (p.pricing && typeof p.pricing === "object" ? p.pricing : {}) as Record<string, any>;
   const totalCents = Number(pr.total_price_cents ?? pr.total_cents ?? 0) || 0;
   return {
     id: p.id,
     proposal_id: p.id,
     quote_id: p.quote_id || null,
     quote_number: typeof p.public_token === "string" ? p.public_token.slice(-6).toUpperCase() : null,
     title: p.title || p.destination_city || "Proposta",
     destination: p.destination_city || null,
     total_cents: totalCents,
     status: p.status || "draft",
     visibility_mode: p.visibility_mode || "public",
     public_token: typeof p.public_token === "string" && p.public_token.trim() ? p.public_token.trim() : null,
     source_type: "proposal" as const,
     created_at: p.created_at,
   };
 });

 const unlinkedQuoteEntries = ((quotesRes?.data as any[]) || [])
   .filter((q: any) => !proposalByQuoteId.has(q.id))
   .map((q: any) => ({
     ...q,
     proposal_id: null,
     public_token: null,
     source_type: "quote" as const,
     quote_number: q.protocol_number || null,
     title: q.destination_city || "Cotação",
     destination: q.destination_city || null,
     total_cents: q.quote_amount_cents ?? 0,
   }));

 const normalizedQuotes = [...proposalEntries, ...unlinkedQuoteEntries];
 const normalizedContracts = ((contractsRes?.data as any[]) || []).map((c: any) => ({
   ...c,
   contract_number: c.verification_code || c.metadata?.contract_number || null,
   total_amount_cents: Number(c.metadata?.total_amount_cents || 0),
   public_token: c.verification_code || null,
 }));
 const normalizedFinancialTx = ((invoicesRes?.data as any[]) || []).map((inv: any) => ({
   ...inv,
   status: inv.type || null,
   due_date: inv.reference_date || inv.created_at || null,
   payment_method: inv.category || null,
 }));
 const normalizedCommercialInvoices = matchedCommercialInvoices.map((ci: any) => ({
   id: ci.id,
   description: `${ci.invoice_code || (ci.document_type === "invoice" ? "Fatura" : "Orçamento")} • ${ci.customer_snapshot?.name || "Cliente"}`,
   amount_cents: Number(ci.total_cents || 0),
   status: ci.status || "draft",
   due_date: ci.valid_until || ci.created_at || null,
   public_token: ci.public_token || null,
   invoice_code: ci.invoice_code || null,
   document_type: ci.document_type || "budget",
 }));
 const normalizedInvoices = [...normalizedCommercialInvoices, ...normalizedFinancialTx];

 const memberRole = identity.memberships?.find((m) => m.store_id === storeId)?.role || identity.role || "agent";
 const isManagerOrAdmin = ["platform_admin", "owner", "admin", "manager"].includes(memberRole);

 const rawTravelDossiers = Array.isArray((threadContext?.metadata as any)?.travel_dossiers)
   ? ((threadContext?.metadata as any).travel_dossiers as any[])
   : [];
 const rawLinkedEmails = Array.isArray((threadContext?.metadata as any)?.linked_emails)
   ? ((threadContext?.metadata as any).linked_emails as any[])
   : [];
 const aiAgentConfig = {
   aiAgentId: String((threadContext?.metadata as any)?.ai_agent_id || "general_copilot"),
   handoffMode: String((threadContext?.metadata as any)?.handoff_mode || "ai_triage") as "ai_triage" | "human_queue" | "human_active",
   aiAutoReplyEnabled: (threadContext?.metadata as any)?.ai_auto_reply_enabled !== false,
 };

 const customerSeed = resolvedCustomerId || cleanDigits || threadId || "0000";
 const shortSeed = String(customerSeed).replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(-4) || "0000";
 const customerTraceHash = `#CLI-${shortSeed}`;

 const allStoreTasks = ((tasksRes?.data as any[]) || []);
 const customerTasks = allStoreTasks.filter((t: any) => {
   const cf = (t.custom_fields || {}) as Record<string, any>;
   if (resolvedCustomerId && (t.context_id === resolvedCustomerId || cf.customer_id === resolvedCustomerId)) return true;
   if (threadId && cf.thread_id === threadId) return true;
   if (cleanDigits.length >= 8 && cf.customer_phone && String(cf.customer_phone).replace(/\D/g, "") === cleanDigits) return true;
   if (Array.isArray(t.tags) && t.tags.some((tg: string) => tg.toUpperCase().includes(customerTraceHash))) return true;
   if (profileData?.full_name && profileData.full_name !== "Visitante em Atendimento" && t.context_label && String(t.context_label).toLowerCase().includes(String(profileData.full_name).toLowerCase())) return true;
   return false;
 });

 const tripsList = (tripsRes?.data as any[]) || [];
 const primaryTripSteps = (tripsList[0]?.financial_details as any)?.cs_onboarding_steps || {};
 const threadOnboardingSteps = ((threadContext?.metadata as any)?.cs_onboarding_steps || {}) as Record<string, boolean>;
 const onboardingSteps: Record<string, boolean> = {
   docs_received: Boolean(threadOnboardingSteps.docs_received ?? primaryTripSteps.docs_received ?? ((docsRes?.data as any[])?.length > 0)),
   contract_signed: Boolean(threadOnboardingSteps.contract_signed ?? primaryTripSteps.contract_signed ?? normalizedContracts.some((c: any) => c.status === "signed" || c.status === "active")),
   payment_verified: Boolean(threadOnboardingSteps.payment_verified ?? primaryTripSteps.payment_verified ?? paidOrders.length > 0),
   issuance_completed: Boolean(threadOnboardingSteps.issuance_completed ?? primaryTripSteps.issuance_completed ?? (rawTravelDossiers.some((d: any) => Boolean(d.pnr_locator || d.pnrLocator)) || tripsList.some((tr: any) => tr.status === "confirmed"))),
   vouchers_sent: Boolean(threadOnboardingSteps.vouchers_sent ?? primaryTripSteps.vouchers_sent ?? false),
   onboarding_ready: Boolean(threadOnboardingSteps.onboarding_ready ?? primaryTripSteps.onboarding_ready ?? false),
   cs_completed: Boolean(threadOnboardingSteps.cs_completed ?? primaryTripSteps.cs_completed ?? false),
 };

 const storeTicketsList = (ticketsRes.data || []) as any[];
 const operatorTicketsList = ((opTicketsRes?.data as any[]) || []).map((ot: any) => ({
   id: ot.id,
   title: ot.subject,
   description: ot.ticket_code ? `${ot.ticket_code} · ${ot.category}` : ot.category,
   status: ot.status === "in_progress" ? "under_review" : ot.status,
   priority: ot.priority || "normal",
   ticket_type: ot.category || "support",
   ticket_code: ot.ticket_code,
   created_at: ot.created_at,
   source_table: "operator_support_tickets",
 }));
 const mergedTickets = [
   ...storeTicketsList,
   ...operatorTicketsList.filter((ot) => !storeTicketsList.some((st) => st.title === ot.title)),
 ];

 const { mergeAttributionPayloads, normalizePhoneE164 } = await import("@/services/omnichannel-attribution.server");

 const attrOrFilters: string[] = [];
 if (threadId) attrOrFilters.push(`thread_id.eq.${threadId}`);
 if (linkedLead?.id) attrOrFilters.push(`lead_id.eq.${linkedLead.id}`);
 if (!isGroupThread && cleanDigits.length >= 8) {
   attrOrFilters.push(`phone_digits.eq.${cleanDigits}`);
   if (cleanDigits.length >= 10) attrOrFilters.push(`phone_digits.ilike.%${cleanDigits.slice(-8)}`);
 }

 const telemetryOrFilters: string[] = [];
 if (threadId) telemetryOrFilters.push(`thread_id.eq.${threadId}`);
 if (linkedLead?.id) telemetryOrFilters.push(`lead_id.eq.${linkedLead.id}`);

 const [identityRes, touchpointsRes, telemetryRes, groupMsgsRes] = await Promise.all([
   threadContext?.channel_identity_id
     ? db
         .from("whatsapp_contact_identities")
         .select("id, provider, external_user_id, phone_e164, display_name, profile_name, consent_status, contact_scope, suppress_lead_capture, internal_role_label, metadata, last_seen_at")
         .eq("id", threadContext.channel_identity_id)
         .eq("store_id", storeId)
         .maybeSingle()
         .then(async (res: any) =>
           res?.error && /contact_scope|suppress_lead_capture|column/i.test(res.error.message || "")
             ? db
                 .from("whatsapp_contact_identities")
                 .select("id, provider, external_user_id, phone_e164, display_name, profile_name, consent_status, metadata, last_seen_at")
                 .eq("id", threadContext.channel_identity_id)
                 .eq("store_id", storeId)
                 .maybeSingle()
             : res,
         )
     : !isGroupThread && cleanDigits.length >= 8
       ? db
           .from("whatsapp_contact_identities")
           .select("id, provider, external_user_id, phone_e164, display_name, profile_name, consent_status, contact_scope, suppress_lead_capture, internal_role_label, metadata, last_seen_at")
           .eq("store_id", storeId)
           .or(`phone_e164.eq.+${cleanDigits},phone_e164.eq.${cleanDigits}`)
           .order("last_seen_at", { ascending: false })
           .limit(1)
           .maybeSingle()
           .then(async (res: any) =>
             res?.error && /contact_scope|suppress_lead_capture|column/i.test(res.error.message || "")
               ? db
                   .from("whatsapp_contact_identities")
                   .select("id, provider, external_user_id, phone_e164, display_name, profile_name, consent_status, metadata, last_seen_at")
                   .eq("store_id", storeId)
                   .or(`phone_e164.eq.+${cleanDigits},phone_e164.eq.${cleanDigits}`)
                   .order("last_seen_at", { ascending: false })
                   .limit(1)
                   .maybeSingle()
               : res,
           )
       : Promise.resolve({ data: null as any }),
   attrOrFilters.length > 0
     ? (db.from("ad_attribution_touchpoints") as any)
         .select("id, ad_platform, utm_source, utm_medium, utm_campaign, utm_content, utm_term, ad_id, adset_id, campaign_id, form_id, source_pixel_id, ad_headline, ad_body, source_url, landing_url, referrer, ctwa_clid, fbclid, fbp, fbc, gclid, ttclid, lead_code, entity_type, entity_id, entity_title, captured_via, metadata, created_at")
         .eq("store_id", storeId)
         .or(attrOrFilters.join(","))
         .order("created_at", { ascending: false })
         .limit(50)
     : Promise.resolve({ data: [] as any[] }),
   telemetryOrFilters.length > 0
     ? db
         .from("lead_conversion_telemetry")
         .select("id, event_name, event_id, event_source, channel, status, response_data, dispatched_at")
         .eq("store_id", storeId)
         .or(telemetryOrFilters.join(","))
         .order("dispatched_at", { ascending: false })
         .limit(10)
     : Promise.resolve({ data: [] as any[] }),
   isGroupThread && threadId
     ? db
         .from("chat_messages")
         .select("metadata, created_at")
         .eq("thread_id", threadId)
         .order("created_at", { ascending: false })
         .limit(60)
     : Promise.resolve({ data: [] as any[] }),
 ]);

 const participantMap = new Map<string, { jid: string; phone: string | null; name: string | null; admin: boolean }>();
 if (isGroupThread) {
   const metaParticipants = Array.isArray(threadMeta.participants) ? threadMeta.participants : [];
   for (const p of metaParticipants) {
     const pPhone = normalizePhoneE164(p?.phone || p?.jid);
     const pKey = String(pPhone || p?.jid || "").trim();
     if (!pKey) continue;
     participantMap.set(pKey, {
       jid: String(p?.jid || pPhone || pKey),
       phone: pPhone,
       name: p?.name ? String(p.name) : null,
       admin: Boolean(p?.admin),
     });
   }
   for (const msgRow of ((groupMsgsRes?.data as any[]) || [])) {
     const m = (msgRow?.metadata || {}) as Record<string, any>;
     const sPhone = normalizePhoneE164(m.sender_phone || m.sender_jid);
     const sJid = String(m.sender_jid || sPhone || "").trim();
     const sKey = sPhone || sJid;
     if (!sKey || sKey.endsWith("@g.us")) continue;
     const existingPart = participantMap.get(sKey);
     const sName = typeof m.sender_name === "string" && m.sender_name.trim() ? m.sender_name.trim() : null;
     if (!existingPart) {
       participantMap.set(sKey, { jid: sJid || sKey, phone: sPhone, name: sName, admin: false });
     } else {
       if (!existingPart.name && sName) existingPart.name = sName;
       if (!existingPart.phone && sPhone) existingPart.phone = sPhone;
     }
   }
 }
 const groupParticipants = Array.from(participantMap.values()).slice(0, 50);

 const touchpoints = (touchpointsRes?.data as any[]) || [];
 const latestTouchpoint = touchpoints[0] || null;
 const leadCustomFields = (linkedLead?.custom_fields || null) as Record<string, any> | null;
 const tpAttribution = latestTouchpoint
   ? {
       platform: latestTouchpoint.ad_platform,
       source: latestTouchpoint.utm_source || latestTouchpoint.ad_platform,
       medium: latestTouchpoint.utm_medium,
       campaign: latestTouchpoint.utm_campaign,
       campaign_id: latestTouchpoint.campaign_id,
       ad_id: latestTouchpoint.ad_id,
       adset_id: latestTouchpoint.adset_id,
       form_id: latestTouchpoint.form_id,
       ad_headline: latestTouchpoint.ad_headline,
       ad_body: latestTouchpoint.ad_body,
       source_url: latestTouchpoint.source_url,
       landing_url: latestTouchpoint.landing_url,
       referrer: latestTouchpoint.referrer,
       listing_id: latestTouchpoint.entity_id,
       listing_origin: latestTouchpoint.entity_type,
       listing_title: latestTouchpoint.entity_title,
       ctwa_clid: latestTouchpoint.ctwa_clid,
       fbclid: latestTouchpoint.fbclid,
       fbp: latestTouchpoint.fbp,
       fbc: latestTouchpoint.fbc,
       gclid: latestTouchpoint.gclid,
       ttclid: latestTouchpoint.ttclid,
       utm_source: latestTouchpoint.utm_source,
       utm_medium: latestTouchpoint.utm_medium,
       utm_campaign: latestTouchpoint.utm_campaign,
       utm_content: latestTouchpoint.utm_content,
       utm_term: latestTouchpoint.utm_term,
       lead_code: latestTouchpoint.lead_code,
       captured_via: latestTouchpoint.captured_via,
       detected_at: latestTouchpoint.created_at,
     }
   : null;

 const resolvedAttribution = mergeAttributionPayloads(
   mergeAttributionPayloads(leadCustomFields, tpAttribution),
   threadContext?.attribution || threadMeta?.attribution || null,
 );

 const storeRow = (storeInfoRes?.data as any) || null;
 const storeSettings = (storeRow?.settings && typeof storeRow.settings === "object" ? storeRow.settings : {}) as Record<string, any>;
 let activeAppTokenRow: any = null;
 if (!isGroupThread && storeRow?.slug) {
   try {
     const tokenMatchOr: string[] = [];
     if (resolvedCustomerId) tokenMatchOr.push(`customer_id.eq.${resolvedCustomerId}`, `crm_customer_id.eq.${resolvedCustomerId}`);
     if (linkedLead?.id) tokenMatchOr.push(`lead_id.eq.${linkedLead.id}`);
     if (cleanDigits.length >= 8) {
       tokenMatchOr.push(`customer_phone_digits.eq.${cleanDigits}`);
     }
     if (threadId && tokenMatchOr.length === 0) {
       tokenMatchOr.push(`thread_id.eq.${threadId}`);
     }
     if (tokenMatchOr.length > 0) {
       const { data: tokenCandidate } = await db
         .from("store_app_client_tokens")
         .select("id, client_code, magic_token, expires_at, last_accessed_at, access_count")
         .eq("store_id", storeId)
         .eq("is_active", true)
         .is("revoked_at", null)
         .gt("expires_at", new Date().toISOString())
         .or(tokenMatchOr.join(","))
         .order("created_at", { ascending: false })
         .limit(1)
         .maybeSingle();
       if (tokenCandidate?.magic_token) {
         activeAppTokenRow = tokenCandidate;
       }
     }
   } catch {
     // Tabela opcional antes da migração: mantém geração sob demanda via POST
   }
 }

 const brandedAppHostInput = {
   slug: storeRow?.slug || null,
   customDomain: storeRow?.custom_domain || null,
   customDomainStatus: storeSettings?.custom_domain_status || null,
   fallbackOrigin: "https://waesy.com.br",
 };
 const baseCompanyAppUrl = buildBrandedAppBaseUrl(brandedAppHostInput);
 const resolvedClientCode = activeAppTokenRow?.client_code || customerTraceHash.replace(/^#/, "");
 const storePortalUrl = storeRow?.slug
   ? buildBrandedClientPortalUrl({
       ...brandedAppHostInput,
       magicToken: activeAppTokenRow?.magic_token || null,
       clientCode: resolvedClientCode,
     })
   : "";

 const rawFormSubs = (formSubmissionsRes?.data as any[]) || [];
 const matchedFormSubmissions = resolvedCustomerId
   ? rawFormSubs
   : rawFormSubs.filter((sub: any) => {
       const meta = (sub.metadata && typeof sub.metadata === "object" ? sub.metadata : {}) as Record<string, any>;
       const metaDigits = String(meta.phone || meta.whatsapp || meta.telefone || "").replace(/\D/g, "");
       if (!isGroupThread && cleanDigits.length >= 8 && metaDigits && metaDigits.endsWith(cleanDigits.slice(-8))) return true;
       if (!isGroupThread && sanitizedCustomerEmail && String(meta.email || "").trim().toLowerCase() === sanitizedCustomerEmail.toLowerCase()) return true;
       return false;
     });

 const customerCreditsList = (customerCreditsRes?.data as any[]) || [];
 const customerCreditBalanceCents = customerCreditsList.reduce((sum: number, item: any) => sum + (Number(item.balance_cents) || 0), 0);
 const installmentPlansList = (installmentPlansRes?.data as any[]) || [];
 const clinicalRecordsList = (clinicalRecordsRes?.data as any[]) || [];
 const appointmentsList = (appointmentsRes?.data as any[]) || [];

  const { computeCustomerTouchpointJourney } = await import("@/lib/attribution-journey");
  const jsonTouchpoints = Array.isArray(leadCustomFields?.ad_attribution_touchpoints)
    ? (leadCustomFields.ad_attribution_touchpoints as any[])
    : [];
  const mergedRawTouchpoints = touchpoints.length > 0 ? touchpoints : jsonTouchpoints;
  const journeySummary = computeCustomerTouchpointJourney(
    mergedRawTouchpoints,
    Object.keys(resolvedAttribution).length > 0 ? resolvedAttribution : null,
  );
  const confirmedTrips = tripsList.filter((tr: any) =>
    ["confirmed", "active", "completed", "paid"].includes(String(tr?.status || "").toLowerCase()),
  );
  const tripsRevenueCents = confirmedTrips.reduce((sum: number, tr: any) => sum + (Number(tr.total_cents) || 0), 0);
  const paidCommercialCents = matchedCommercialInvoices
    .filter((ci: any) => ["paid", "settled", "received"].includes(String(ci?.status || "").toLowerCase()))
    .reduce((sum: number, ci: any) => sum + (Number(ci.total_cents) || 0), 0);
  const combinedCustomerLtvCents =
    totalSpentCents + (totalSpentCents === 0 ? Math.max(tripsRevenueCents, paidCommercialCents) : 0);
  const purchaseEventsCount = Math.max(paidOrders.length, confirmedTrips.length);

 return {
   storeInfo: {
     id: storeRow?.id || storeId,
     name: storeRow?.name || null,
     slug: storeRow?.slug || null,
     custom_domain: storeRow?.custom_domain || null,
     custom_domain_status: storeSettings?.custom_domain_status || null,
     niche: storeRow?.niche || null,
     app_url: baseCompanyAppUrl || null,
     portal_url: storePortalUrl || null,
     client_app_access: storeRow?.slug
       ? {
           app_url: baseCompanyAppUrl,
           portal_url: storePortalUrl,
           client_code: resolvedClientCode,
           magic_token: activeAppTokenRow?.magic_token || null,
           expires_at: activeAppTokenRow?.expires_at || null,
           last_accessed_at: activeAppTokenRow?.last_accessed_at || null,
           access_count: Number(activeAppTokenRow?.access_count || 0),
           has_active_token: Boolean(activeAppTokenRow?.magic_token),
         }
       : null,
   },
   profile: {
     ...profileData,
     trace_hash: customerTraceHash,
   },
   customerTraceHash,
   crmCustomer,
   threadContext,
   thread: threadContext,
   isGroup: isGroupThread,
   groupSubject: isGroupThread ? (threadContext?.group_subject || threadMeta.group_subject || threadContext?.guest_name || null) : null,
   groupJid: isGroupThread ? (threadMeta.whatsapp_jid || threadContext?.entity_id || null) : null,
   groupParticipants,
   whatsappIdentity: identityRes?.data || null,
   attribution: Object.keys(resolvedAttribution).length > 0 ? resolvedAttribution : null,
   touchpoints,
   journeySummary,
   pixelConversions: (telemetryRes?.data as any[]) || [],
   permissions: {
     role: memberRole,
     canManageOpportunities: true,
     canMoveKanbanStage: true,
     canViewFinancials: isManagerOrAdmin || ["seller", "sales", "finance", "support", "agent"].includes(memberRole),
     canManageContracts: isManagerOrAdmin || ["seller", "sales"].includes(memberRole),
   },
   metrics: {
     total_orders: orders.length,
     repeat_purchases: Math.max(0, purchaseEventsCount - 1),
     ltv_cents: combinedCustomerLtvCents,
     total_touchpoints: journeySummary.totalClicksCount,
     last_purchase_at: lastPurchaseAt,
     pending_debt_cents: pendingDebtCents,
     active_tickets_count: mergedTickets.filter((t: any) => t.status === "open" || t.status === "under_review").length,
   },
   orders,
   trips: tripsList,
   travelDossiers: rawTravelDossiers,
   linkedEmails: rawLinkedEmails,
   aiAgentConfig,
   onboardingSteps,
   tasks: customerTasks,
   credits: (creditsRes?.data as any[]) || [],
   tickets: mergedTickets,
   opportunities,
   linkedLead,
   quotes: normalizedQuotes,
   contracts: normalizedContracts,
   documents: (docsRes?.data as any[]) || [],
   invoices: normalizedInvoices,
   debts: pendingDebts,
   formSubmissions: matchedFormSubmissions,
   customerCredits: customerCreditsList,
   customerCreditBalanceCents,
   installmentPlans: installmentPlansList,
   clinicalRecords: clinicalRecordsList,
   appointments: appointmentsList,
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
      .select("id, store_id, customer_id, metadata")
      .eq("id", threadId)
      .eq("store_id", identity.store_id)
      .single();

    if (!current) throw new Error("Conversa não encontrada.");

    let linkedLead: any = null;
    const normalizedLeadId = leadId && leadId !== "none" ? leadId : null;
    if (normalizedLeadId) {
      const { data: foundLead } = await db
        .from("leads_crm")
        .select("id, status, title, full_name, phone, email, customer_id, estimated_value_cents, source, destination, destination_of_interest, assigned_to, notes, checklist, created_at, updated_at")
        .eq("id", normalizedLeadId)
        .eq("store_id", identity.store_id)
        .single();
      if (!foundLead) throw new Error("Oportunidade não encontrada nesta loja.");
      linkedLead = {
        ...foundLead,
        estimated_budget: (foundLead as any).estimated_value_cents ?? 0,
      };
    }

    const nowIso = new Date().toISOString();
    const nextMeta = {
      ...(((current.metadata as any) || {}) as Record<string, any>),
      active_lead_id: normalizedLeadId || "none",
      linked_opportunity_updated_at: nowIso,
    };

    await db
      .from("chat_threads")
      .update({
        lead_id: normalizedLeadId,
        ...(linkedLead?.customer_id && !(current as any).customer_id
          ? { customer_id: linkedLead.customer_id }
          : {}),
        metadata: nextMeta,
        updated_at: nowIso,
      })
      .eq("id", threadId)
      .eq("store_id", identity.store_id);

    await db.from("chat_messages").insert({
      thread_id: threadId,
      message: linkedLead
        ? `Conversa vinculada ao lead "${linkedLead.title || linkedLead.full_name || normalizedLeadId}" no CRM.`
        : "Vínculo com oportunidade do CRM removido desta conversa.",
      message_type: "system_event",
      payload: {
        is_internal: true,
        ...(normalizedLeadId ? { lead_id: normalizedLeadId } : {}),
      },
      is_staff_reply: true,
      sender_id: identity.id,
      sender_profile_id: identity.id,
    });

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
 leadTitle: z.string().min(2).max(120).optional(),
 title: z.string().min(2).max(120).optional(),
 assignedTo: z.string().uuid().optional(),
 estimatedBudget: z.number().optional(),
 estimatedValue: z.number().optional(),
 destinationOfInterest: z.string().optional(),
 destinationTags: z.array(z.any()).optional(),
 travelStart: z.string().optional().nullable(),
 travelEnd: z.string().optional().nullable(),
 interestPeriod: z.string().optional().nullable(),
 targetMonths: z.array(z.string()).optional(),
 dateFlexibilityMode: z.string().optional().nullable(),
 paxAdults: z.number().int().min(1).optional(),
 childrenAges: z.array(z.number().int().min(0).max(17)).optional(),
 roomOccupancies: z.array(z.any()).optional(),
 rawIntentMarkdown: z.string().optional().nullable(),
 notes: z.string().optional(),
 }),
 )
 .handler(async ({ data }) => {
 const resolvedLeadTitle = (data.leadTitle || data.title || "Oportunidade via Atendimento").trim();
 const resolvedEstimatedBudget = data.estimatedBudget ?? data.estimatedValue;
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

 let phone = thread.entity_id || (thread as any).primary_phone_e164 || "";
 let email = thread.guest_email || "";
 let fullName = thread.guest_name || (thread as any).participant_2_name || "Lead via Atendimento";

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

  let resolvedAttribution: Record<string, any> = {
    ...(((thread as any).metadata?.attribution as Record<string, any>) || {}),
    ...(((thread as any).attribution as Record<string, any>) || {}),
  };

  if (phone && !resolvedAttribution.fbp && !resolvedAttribution.gclid && !resolvedAttribution.ctwa_clid) {
    try {
      const cleanDigits = String(phone).replace(/\D/g, "");
      if (cleanDigits.length >= 8) {
        const { data: tp } = await (db.from("ad_attribution_touchpoints") as any)
          .select("ctwa_clid, fbclid, fbp, fbc, gclid, ttclid, utm_source, utm_medium, utm_campaign, ad_id, campaign_id, device_id")
          .eq("store_id", storeId)
          .ilike("phone_digits", `%${cleanDigits.slice(-8)}`)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (tp) resolvedAttribution = { ...tp, ...resolvedAttribution };
      }
    } catch {}
  }

  const { normalizeDestinationTagList } = await import("@/lib/travel/opportunity-matching-engine");
  const normalizedDestTags = normalizeDestinationTagList(
    data.destinationTags as any,
    data.destinationOfInterest || null,
  );
  const childAges = Array.isArray(data.childrenAges)
    ? data.childrenAges.filter((a) => Number.isFinite(a) && a >= 0 && a <= 17)
    : [];
  const effectiveDestLabel =
    data.destinationOfInterest ||
    (normalizedDestTags.length > 0 ? normalizedDestTags.map((d) => d.label).join(", ") : null);

  const nowIso = new Date().toISOString();
  const { ingestOmnichannelLead } = await import("./omnichannel-lead-ingestion");
  const ingestedLeadRes = await ingestOmnichannelLead(db, {
    storeId,
    leadId: (thread as any).lead_id || null,
    source: thread.context_type === "whatsapp" ? "whatsapp" : "site",
    sourceDetail: thread.context_type === "whatsapp" ? "WhatsApp Atendimento" : "Chat Central",
    fullName,
    phone: phone || null,
    email: email || null,
    title: resolvedLeadTitle,
    destination: effectiveDestLabel || null,
    travelStart: data.travelStart || null,
    travelEnd: data.travelEnd || null,
    paxAdults: data.paxAdults ?? null,
    paxChildren: childAges.length > 0 ? childAges.length : null,
    paxInfants: childAges.length > 0 ? childAges.filter((a) => a <= 1).length : null,
    estimatedValueCents: resolvedEstimatedBudget ? Math.round(Number(resolvedEstimatedBudget) * 100) : 0,
    notes: data.notes || `Criado via Central de Atendimento da Thread ${thread.id}`,
    customFields: {
      ...resolvedAttribution,
      source_thread_id: thread.id,
      ...(normalizedDestTags.length > 0 ? { destination_tags: normalizedDestTags } : {}),
      ...(data.interestPeriod ? { interest_period: data.interestPeriod } : {}),
      ...(Array.isArray(data.targetMonths) && data.targetMonths.length > 0 ? { target_months: data.targetMonths } : {}),
      ...(data.dateFlexibilityMode ? { date_flexibility_mode: data.dateFlexibilityMode } : {}),
      ...(childAges.length > 0 ? { children_ages: childAges, pax_ages: childAges } : {}),
      ...(Array.isArray(data.roomOccupancies) && data.roomOccupancies.length > 0 ? { room_occupancies: data.roomOccupancies } : {}),
      ...(data.rawIntentMarkdown ? { raw_intent_markdown: data.rawIntentMarkdown } : {}),
    },
  });

  if (!ingestedLeadRes.success || !ingestedLeadRes.leadId) {
    throw new Error(`Falha ao criar card no CRM: ${ingestedLeadRes.reason || "Erro desconhecido"}`);
  }

  // Enriquecimento opcional de colunas estruturadas estendidas (tolerante caso colunas nao existam no schema)
  const extendedLeadPatch: Record<string, any> = {
    assigned_to: data.assignedTo || identity.id,
    ...(normalizedDestTags.length > 0 ? { destination_tags: normalizedDestTags } : {}),
    ...(effectiveDestLabel ? { destination_of_interest: effectiveDestLabel } : {}),
    ...(data.interestPeriod ? { interest_period: data.interestPeriod } : {}),
    ...(Array.isArray(data.targetMonths) && data.targetMonths.length > 0 ? { target_months: data.targetMonths } : {}),
    ...(data.dateFlexibilityMode ? { date_flexibility_mode: data.dateFlexibilityMode } : {}),
    ...(childAges.length > 0 ? { pax_ages: childAges, children_ages: childAges } : {}),
    ...(Array.isArray(data.roomOccupancies) && data.roomOccupancies.length > 0 ? { room_occupancies: data.roomOccupancies } : {}),
    ...(data.rawIntentMarkdown ? { raw_intent_markdown: data.rawIntentMarkdown } : {}),
  };
  await db
    .from("leads_crm")
    .update(extendedLeadPatch as any)
    .eq("id", ingestedLeadRes.leadId)
    .eq("store_id", storeId)
    .then(() => null, () => null);

  const { data: loadedLead } = await db
    .from("leads_crm")
    .select("id, title, status, full_name, phone, email, estimated_value_cents, destination, custom_fields, created_at")
    .eq("id", ingestedLeadRes.leadId)
    .maybeSingle();

  const lead = loadedLead || {
    id: ingestedLeadRes.leadId,
    title: resolvedLeadTitle,
    status: "new",
    full_name: fullName,
    phone,
    email,
    estimated_value_cents: resolvedEstimatedBudget ? Math.round(Number(resolvedEstimatedBudget) * 100) : 0,
    destination: effectiveDestLabel,
    custom_fields: {},
    created_at: nowIso,
  };
  if (ingestedLeadRes.customerId && !resolvedCustomerId) {
    resolvedCustomerId = ingestedLeadRes.customerId;
  }

  // Closed-Loop Pixels: dispara qualificacao inicial quando lead nasce no Atendimento com contexto comercial/ads
  try {
    const { dispatchClosedLoopLeadQualification } = await import("./pixels.functions");
    await dispatchClosedLoopLeadQualification({
      data: {
        storeId,
        leadId: lead.id,
        stage: "new",
        stagePurpose: "inbox",
        email: lead.email || null,
        phone: lead.phone || null,
        fbp: resolvedAttribution.fbp || null,
        fbc: resolvedAttribution.fbc || null,
        gclid: resolvedAttribution.gclid || null,
        gbraid: resolvedAttribution.gbraid || null,
        wbraid: resolvedAttribution.wbraid || null,
        deviceId: resolvedAttribution.device_id || null,
        conversionValue: (lead.estimated_value_cents || 0) / 100,
      },
    }).catch(() => {});
  } catch {}

 // Vincula a oportunidade recém-criada como oportunidade ativa da conversa atual (coluna lead_id + metadata 1:N)
 await db
   .from("chat_threads")
   .update({
     lead_id: lead.id,
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
 message: `Card comercial gerado no CRM: "${resolvedLeadTitle}" atribuído à equipe.`,
 message_type: "system_event",
 payload: { is_internal: true, lead_id: lead.id },
 is_staff_reply: true,
 sender_id: identity.id,
 sender_profile_id: identity.id,
 });

 if (effectiveDestLabel) {
   import("./opportunity-radar.functions")
     .then((mod) =>
       mod.internalEvaluateDemandAgainstAllSupply({
         storeId,
         leadId: String(lead.id),
       })
     )
     .catch(() => {});
 }

 return { success: true, ok: true, leadId: lead.id, lead };
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
 order:orders(id, status, total_cents, shipping_method, created_at, payments(method, status), items:order_items(id, product_title, qty, unit_price_cents, total_cents))
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

 const rawOrder: any = Array.isArray(thread.order) ? thread.order[0] : thread.order;
 const mappedOrder = rawOrder
 ? {
 id: rawOrder.id,
 status: rawOrder.status,
 total_amount_cents: rawOrder.total_cents ?? 0,
 payment_method: Array.isArray(rawOrder.payments)
 ? rawOrder.payments[0]?.method || rawOrder.shipping_method || undefined
 : rawOrder.payments?.method || rawOrder.shipping_method || undefined,
 created_at: rawOrder.created_at,
 items: (rawOrder.items || []).map((it: any) => ({
 product_name: it.product_title || "Item",
 quantity: it.qty ?? 1,
 price_cents: it.unit_price_cents ?? 0,
 })),
 }
 : null;

 return {
 thread: {
 ...thread,
 store: mappedStore,
 order: mappedOrder,
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
	storeId: z.string().uuid().optional(),
	away_message: z.string().max(1000).optional(),
	auto_reply_enabled: z.boolean().optional(),
	support_schedules: z.array(supportScheduleItemSchema).optional(),
});

export const saveStoreSupportSettings = createServerFn({ method: "POST" })
	.validator(saveStoreSupportSettingsSchema)
	.handler(async ({ data }) => {
		const identity = await getServerIdentity();
		const targetStoreId =
			identity.role === "platform_admin" && data.storeId
				? data.storeId
				: identity.store_id || identity.memberships?.[0]?.store_id;
		if (!targetStoreId) throw new Error("Loja obrigatória.");
		assertStoreAccess(identity, STAFF_ROLES, targetStoreId);
		const db = getServerClient();

		const { data: currentStore, error: fetchErr } = await db
			.from("stores")
			.select("settings")
			.eq("id", targetStoreId)
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
			.eq("id", targetStoreId);

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
  avatarUrl: z.string().trim().max(2000).optional().nullable(),
  isGroup: z.boolean().optional(),
  attributionUpdate: z
    .object({
      platform: z.string().trim().max(60).optional().nullable(),
      source: z.string().trim().max(60).optional().nullable(),
      campaign: z.string().trim().max(160).optional().nullable(),
      ad_id: z.string().trim().max(80).optional().nullable(),
      ad_headline: z.string().trim().max(200).optional().nullable(),
      utm_source: z.string().trim().max(100).optional().nullable(),
      utm_medium: z.string().trim().max(100).optional().nullable(),
      utm_campaign: z.string().trim().max(160).optional().nullable(),
      utm_content: z.string().trim().max(160).optional().nullable(),
      listing_title: z.string().trim().max(200).optional().nullable(),
    })
    .optional()
    .nullable(),
});

export const updateCustomerProfileFromChat = createServerFn({ method: "POST" })
  .validator(updateCustomerProfileFromChatSchema)
  .handler(async ({ data }) => {
    const { customerId, threadId, fullName, phone, email, documentCpf, city, avatarUrl, isGroup, attributionUpdate } = data;
    const identity = await getServerIdentity();
    assertStoreAccess(identity);
    const db = getServerClient();
    const { normalizePhoneE164, cleanAttributionObject, mergeAttributionPayloads } = await import("./omnichannel-attribution.server");
    const { createHash } = await import("node:crypto");

    const normalizedPhone = !isGroup && phone ? (normalizePhoneE164(phone) || phone.trim()) : (phone || null);
    let resolvedThreadMeta: Record<string, any> = {};
    let resolvedAttribution: Record<string, any> | null = null;
    let linkedChannelIdentityId: string | null = null;
    let linkedLeadId: string | null = null;
    let detectedGroup = Boolean(isGroup);

    if (customerId && !detectedGroup) {
      await db
        .from("profiles")
        .update({
          full_name: fullName,
          ...(phone !== undefined ? { phone: normalizedPhone } : {}),
          ...(avatarUrl !== undefined ? { avatar_url: avatarUrl || null } : {}),
          ...(documentCpf !== undefined ? { cpf: documentCpf || null } : {}),
          ...(city !== undefined ? { city: city || null } : {}),
          updated_at: new Date().toISOString(),
        })
        .eq("id", customerId);
    }

    if (threadId) {
      const { data: currentThread } = await db
        .from("chat_threads")
        .select("metadata, thread_type, entity_id, channel_identity_id, lead_id, attribution")
        .eq("id", threadId)
        .eq("store_id", identity.store_id)
        .maybeSingle();

      const existingMeta = (((currentThread?.metadata as any) || {}) as Record<string, any>);
      detectedGroup = Boolean(
        detectedGroup ||
          currentThread?.thread_type === "group" ||
          existingMeta.is_group ||
          String(currentThread?.entity_id || "").includes("@g.us"),
      );
      linkedChannelIdentityId = currentThread?.channel_identity_id || null;
      linkedLeadId = (currentThread as any)?.lead_id || existingMeta.active_lead_id || null;

      if (attributionUpdate) {
        resolvedAttribution = mergeAttributionPayloads(
          (currentThread as any)?.attribution || existingMeta.attribution || null,
          cleanAttributionObject({
            ...attributionUpdate,
            captured_via: "operator_manual_edit",
            detected_at: new Date().toISOString(),
          }),
        );
      }

      const nextMeta = {
        ...existingMeta,
        ...(avatarUrl !== undefined ? { avatar_url: avatarUrl || existingMeta.avatar_url || null } : {}),
        ...(detectedGroup ? { group_subject: fullName } : {}),
        ...(resolvedAttribution ? { attribution: resolvedAttribution } : {}),
        customer_profile_override: {
          ...(existingMeta.customer_profile_override || {}),
          full_name: fullName,
          phone: detectedGroup ? null : normalizedPhone,
          email: email || null,
          document_cpf: documentCpf || null,
          city: city || null,
          ...(avatarUrl !== undefined ? { avatar_url: avatarUrl || null } : {}),
          updated_at: new Date().toISOString(),
        },
      };
      resolvedThreadMeta = nextMeta;

      await db
        .from("chat_threads")
        .update({
          guest_name: fullName,
          ...(detectedGroup
            ? { group_subject: fullName, subject: `Grupo ${fullName}` }
            : {
                ...(normalizedPhone ? { primary_phone_e164: normalizedPhone, subject: `WhatsApp ${normalizedPhone}` } : {}),
              }),
          ...(email !== undefined ? { guest_email: email || null } : {}),
          ...(resolvedAttribution ? { attribution: resolvedAttribution } : {}),
          metadata: nextMeta,
          updated_at: new Date().toISOString(),
        })
        .eq("id", threadId)
        .eq("store_id", identity.store_id);
    }

    // Sincronizar whatsapp_contact_identities ligada à conversa
    if (identity.store_id && (linkedChannelIdentityId || (!detectedGroup && normalizedPhone))) {
      try {
        const phoneHash = !detectedGroup && normalizedPhone ? createHash("sha256").update(normalizedPhone).digest("hex") : null;
        if (linkedChannelIdentityId) {
          await db
            .from("whatsapp_contact_identities")
            .update({
              display_name: fullName,
              ...(!detectedGroup && normalizedPhone ? { phone_e164: normalizedPhone, phone_hash: phoneHash } : {}),
              ...(resolvedAttribution ? { metadata: { attribution: resolvedAttribution } } : {}),
              updated_at: new Date().toISOString(),
            })
            .eq("id", linkedChannelIdentityId)
            .eq("store_id", identity.store_id);
        }
      } catch {}
    }

    // Sincronizar leads_crm ligado à conversa/cliente
    if (identity.store_id && !detectedGroup && (linkedLeadId || customerId)) {
      try {
        const targetLeadFilter = linkedLeadId
          ? db.from("leads_crm").select("id, custom_fields").eq("id", linkedLeadId).eq("store_id", identity.store_id).maybeSingle()
          : db.from("leads_crm").select("id, custom_fields").eq("customer_id", customerId!).eq("store_id", identity.store_id).order("updated_at", { ascending: false }).limit(1).maybeSingle();
        const { data: leadRow } = await targetLeadFilter;
        if (leadRow?.id) {
          const mergedCf = resolvedAttribution
            ? { ...((leadRow.custom_fields as Record<string, any>) || {}), ...resolvedAttribution }
            : leadRow.custom_fields;
          await db
            .from("leads_crm")
            .update({
              full_name: fullName,
              ...(normalizedPhone ? { phone: normalizedPhone } : {}),
              ...(email !== undefined && email ? { email } : {}),
              ...(resolvedAttribution ? {
                custom_fields: mergedCf,
                ...(resolvedAttribution.source ? { source: String(resolvedAttribution.source) } : {}),
                ...(resolvedAttribution.campaign || resolvedAttribution.ad_headline ? { lead_source_detail: String(resolvedAttribution.campaign || resolvedAttribution.ad_headline) } : {}),
              } : {}),
              updated_at: new Date().toISOString(),
            })
            .eq("id", leadRow.id)
            .eq("store_id", identity.store_id);
        }
      } catch {}
    }

    // Sincronização em customers_crm da loja
    try {
      const storeId = identity.store_id;
      if (storeId && !detectedGroup) {
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
        if (!existing && normalizedPhone) {
          const suffix = normalizedPhone.replace(/\D/g, "").slice(-8);
          const { data: foundByPhone } = await db
            .from("customers_crm")
            .select("id")
            .eq("store_id", storeId)
            .or(`phone.eq.${normalizedPhone},phone.ilike.%${suffix}%`)
            .is("deleted_at", null)
            .limit(1)
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
              ...(phone !== undefined ? { phone: normalizedPhone } : {}),
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
              phone: normalizedPhone,
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
        phone: detectedGroup ? null : normalizedPhone,
        email: email || null,
        document_cpf: documentCpf || null,
        city: city || null,
        avatar_url: avatarUrl || resolvedThreadMeta?.avatar_url || null,
      },
      attribution: resolvedAttribution,
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
  sacFunctionRole: z.enum(["sac_pepinos", "customer_success", "operadora_cia", "reembolso_financeiro", "documentacao", "comercial"]).default("sac_pepinos"),
  linkedEntityType: z.enum(["none", "trip", "order", "booking", "contract", "customer"]).default("none"),
  linkedEntityId: z.string().optional().nullable(),
  linkedEntityCode: z.string().optional().nullable(),
  customerName: z.string().optional().nullable(),
  customerAvatarUrl: z.string().optional().nullable(),
  traceHash: z.string().optional().nullable(),
});

export const createSupportTicketFromChat = createServerFn({ method: "POST" })
  .validator(createSupportTicketFromChatSchema)
  .handler(async ({ data }) => {
    const {
      threadId,
      customerId,
      title,
      description,
      ticketType,
      priority,
      sacFunctionRole,
      linkedEntityType,
      linkedEntityId,
      linkedEntityCode,
      customerName,
      customerAvatarUrl,
      traceHash,
    } = data;
    const identity = await getServerIdentity();
    assertStoreAccess(identity);
    const db = getServerClient();

    const initialStep = {
      id: `step-${Date.now()}`,
      label: "Chamado registrado e em triagem",
      status: "done",
      created_at: new Date().toISOString(),
    };

    const resolutionPayload = {
      steps: [initialStep],
      public_summary: description,
      sac_function_role: sacFunctionRole,
      linked_entity_type: linkedEntityType,
      linked_entity_id: linkedEntityId || null,
      linked_entity_code: linkedEntityCode || null,
      customer_name: customerName || null,
      customer_avatar_url: customerAvatarUrl || null,
      trace_hash: traceHash || null,
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
        resolution_notes: JSON.stringify(resolutionPayload),
      })
      .select()
      .single();

    if (error) throw new Error(`Falha ao criar demanda/ticket: ${error.message}`);

    // Espelha também em operator_support_tickets para visibilidade unificada em /workspace/suporte
    try {
      const ticketCode = `SAC-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      const mappedCategory =
        sacFunctionRole === "reembolso_financeiro"
          ? "finance"
          : sacFunctionRole === "operadora_cia" || linkedEntityType === "trip"
            ? "tourism"
            : "other";
      const isUuid = (v?: string | null) => Boolean(v && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v));
      await db.from("operator_support_tickets").insert({
        store_id: identity.store_id,
        created_by_profile_id: identity.id,
        ticket_code: ticketCode,
        subject: `${traceHash ? `${traceHash} · ` : ""}${title}`,
        category: mappedCategory,
        priority,
        status: "open",
        customer_id: isUuid(customerId) ? customerId : null,
        customer_name: customerName || null,
        order_id: linkedEntityType === "order" && isUuid(linkedEntityId) ? linkedEntityId : null,
        tour_id: linkedEntityType === "trip" && isUuid(linkedEntityId) ? linkedEntityId : null,
        sla_due_at: new Date(Date.now() + (priority === "urgent" ? 120 : priority === "high" ? 240 : 1440) * 60 * 1000).toISOString(),
        sla_minutes: priority === "urgent" ? 120 : priority === "high" ? 240 : 1440,
      });
    } catch {
      // Best-effort mirror to operator_support_tickets
    }

    const appOrigin = process.env.VITE_APP_URL || process.env.VITE_SITE_URL || "https://waesy.com.br";
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
    const appOrigin = process.env.VITE_APP_URL || process.env.VITE_SITE_URL || "https://waesy.com.br";
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
        const { data: reqProfile } = await db.from("profiles").select("id, full_name").eq("id", r.requested_by_profile_id).maybeSingle();
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

    // 3. Carrega o contexto 360 do cliente (LTV, viagens compradas, cotações/faturas reais)
    let tripsCount = 0;
    let quotesCount = 0;
    let totalSpentBrl = "R$ 0,00";
    let isVipOrReturning = false;
    let lastDestination = "";

    if (thread.customer_id) {
      const [tripsRes, invoicesRes, ordersRes] = await Promise.all([
        db.from("tourism_trips").select("id, title, destination_city, total_cents").eq("store_id", effectiveStoreId).eq("customer_id", thread.customer_id).limit(5),
        db
          .from("commercial_invoices")
          .select("id, invoice_code, document_type, status, total_cents, notes")
          .eq("store_id", effectiveStoreId)
          .eq("customer_id", thread.customer_id)
          .order("created_at", { ascending: false })
          .limit(5),
        db.from("orders").select("total_cents, status").eq("store_id", effectiveStoreId).eq("customer_id", thread.customer_id).in("status", ["completed", "delivered", "paid"]),
      ]);

      tripsCount = tripsRes.data?.length || 0;
      quotesCount = (invoicesRes.data || []).filter((inv: any) => inv.document_type === "budget" || inv.document_type === "invoice").length;
      const spentCents = (ordersRes.data || []).reduce((acc: number, curr: any) => acc + (Number(curr.total_cents) || 0), 0);
      if (spentCents > 0) {
        totalSpentBrl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(spentCents / 100);
      }
      isVipOrReturning = tripsCount > 0 || quotesCount >= 2 || spentCents > 0;
      lastDestination = tripsRes.data?.[0]?.destination_city || "";
    }

    // 4. Geração unificada multi-nicho (lê áudios transcritos, prints/OCR, atribuição e catálogo real)
    const { buildMultiNicheCopilotContextAndReply } = await import("./omnichannel-ai-copilot.server");
    const promiseDirective = promiseDetection.hasPendingPromise
      ? `Cumprir promessa anterior "${promiseDetection.promiseSnippet}"${customInstruction ? ` | ${customInstruction}` : ""}`
      : customInstruction;
    const copilotInsight = await buildMultiNicheCopilotContextAndReply({
      db,
      storeId: effectiveStoreId,
      threadId,
      ownerId: identity.id,
      customInstruction: promiseDirective,
      persistToThread: true,
    });
    const suggestedReply = copilotInsight.suggestedReply;

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
      copilotInsight,
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
  .handler(async ({ data: { threadId, messageId, externalMessageId } }) => {
    const identity = await getServerIdentity();
    if (!identity?.id) throw new Error("Não autorizado");

    const db = getServerClient();
    const { data: thread } = await db
      .from("chat_threads")
      .select("id, store_id, channel_instance_id, entity_id, metadata")
      .eq("id", threadId)
      .maybeSingle();

    if (!thread) throw new Error("Conversa não encontrada");
    assertStoreAccess(identity, STAFF_ROLES, thread.store_id);

    const msgQuery = db
      .from("chat_messages")
      .select("id, attachments, payload, message_type, is_staff_reply")
      .eq("thread_id", threadId);

    const { data: existingMsg } = await (
      messageId ? msgQuery.eq("id", messageId) : msgQuery.eq("external_message_id", externalMessageId)
    ).maybeSingle();

    const cachedAttachment =
      existingMsg &&
      Array.isArray(existingMsg.attachments) &&
      existingMsg.attachments.length > 0 &&
      typeof existingMsg.attachments[0] === "string"
        ? existingMsg.attachments[0]
        : null;

    if (existingMsg?.payload?.media?.storage_bucket && existingMsg?.payload?.media?.storage_path) {
      const { refreshSignedChatMediaUrl } = await import("./whatsapp-media.server");
      const freshUrl = await refreshSignedChatMediaUrl(
        db,
        existingMsg.payload.media.storage_bucket,
        existingMsg.payload.media.storage_path,
        3600,
      );
      if (freshUrl) {
        return {
          base64: freshUrl,
          mimetype: String(
            existingMsg?.payload?.media?.mimetype || resolveDefaultMimeByMessageType(existingMsg?.message_type),
          ),
          cached: true,
        };
      }
    }

    if (
      cachedAttachment &&
      cachedAttachment.startsWith("data:") &&
      !isBrokenOrMissingMediaUri(cachedAttachment, existingMsg?.message_type)
    ) {
      return {
        base64: cachedAttachment,
        mimetype: String(
          existingMsg?.payload?.media?.mimetype || resolveDefaultMimeByMessageType(existingMsg?.message_type),
        ),
        cached: true,
      };
    }

    const threadMeta = (thread.metadata && typeof thread.metadata === "object" ? thread.metadata : {}) as Record<string, any>;
    const remoteJid =
      typeof threadMeta.whatsapp_jid === "string" && threadMeta.whatsapp_jid.trim()
        ? threadMeta.whatsapp_jid.trim()
        : typeof thread.entity_id === "string" && thread.entity_id.trim()
          ? thread.entity_id.trim()
          : null;

    const { hydrateMediaFromEvolution } = await import("./whatsapp-media.server");
    const hydrated = await hydrateMediaFromEvolution({
      db,
      storeId: thread.store_id,
      channelInstanceId: thread.channel_instance_id,
      threadId: thread.id,
      messageId: existingMsg?.id || messageId || null,
      externalMessageId,
      remoteJid,
      fromMe: Boolean(existingMsg?.is_staff_reply),
      messageType: existingMsg?.message_type || null,
      preferredMime:
        typeof existingMsg?.payload?.media?.mimetype === "string"
          ? existingMsg.payload.media.mimetype
          : resolveDefaultMimeByMessageType(existingMsg?.message_type),
      persistToMessage: true,
    });

    if (!hydrated) {
      throw new Error("Falha ao decodificar mídia na Evolution API para este canal WhatsApp.");
    }

    return {
      base64: hydrated.signedUrl || hydrated.dataUri,
      mimetype: hydrated.mimetype,
      cached: false,
    };
  });

export const startStaffWhatsAppThreadSchema = z.object({
  storeId: z.string().uuid().optional(),
  phone: z.string().trim().min(8).max(32),
  contactName: z.string().trim().max(120).optional(),
  channelInstanceId: z.string().uuid().optional(),
  initialMessage: z.string().trim().max(4000).optional(),
});

export const startStaffWhatsAppThread = createServerFn({ method: "POST" })
  .validator(startStaffWhatsAppThreadSchema)
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    if (!identity?.id) throw new Error("Não autorizado");

    const storeId = data.storeId || identity.store_id || identity.memberships?.[0]?.store_id;
    if (!storeId) throw new Error("Loja obrigatória para iniciar conversa.");
    assertStoreAccess(identity, STAFF_ROLES, storeId);

    const { normalizeWhatsAppPhoneInput } = await import("@/lib/phone-links");
    const normalized = normalizeWhatsAppPhoneInput(data.phone);
    if (!normalized) {
      throw new Error("Número de telefone WhatsApp inválido. Informe DDD + número (ex: 49999998888).");
    }

    const db = getServerClient();
    const targetMembership = (identity.memberships || []).find((m) => m.store_id === storeId);
    const effectiveRole = targetMembership?.role || identity.role;
    const isSupervisor =
      [...MANAGER_ROLES].includes(effectiveRole as any) ||
      identity.role === "platform_admin" ||
      identity.role === "master";

    let resolvedInstId = data.channelInstanceId || null;
    if (resolvedInstId) {
      if (!isSupervisor) {
        const { data: perm } = await db
          .from("whatsapp_instance_member_permissions")
          .select("can_view, can_reply")
          .eq("store_id", storeId)
          .eq("instance_id", resolvedInstId)
          .eq("profile_id", identity.id)
          .maybeSingle();
        if (perm && (perm.can_view === false || perm.can_reply === false)) {
          throw new Error("Você não tem permissão para iniciar ou responder conversas por este canal WhatsApp.");
        }
      }
    } else {
      const { data: defaultInst } = await db
        .from("whatsapp_channel_instances")
        .select("id")
        .eq("store_id", storeId)
        .eq("is_active", true)
        .order("is_default", { ascending: false })
        .limit(1)
        .maybeSingle();
      resolvedInstId = defaultInst?.id || null;
    }

    if (!resolvedInstId) {
      throw new Error("Nenhum canal WhatsApp ativo conectado nesta loja.");
    }

    const { resolveWhatsAppIdentity } = await import("./whatsapp-automation-runtime.server");
    const identityRec = await resolveWhatsAppIdentity({
      storeId,
      instanceId: resolvedInstId,
      provider: "evolution_api",
      externalUserId: `${normalized.digits}@s.whatsapp.net`,
      phone: normalized.e164,
      displayName: data.contactName?.trim() || null,
    });

    const { data: existingThread } = await db
      .from("chat_threads")
      .select("id, channel_instance_id, guest_name, status")
      .eq("store_id", storeId)
      .or(`primary_phone_e164.eq.${normalized.e164},entity_id.eq.${normalized.e164},entity_id.eq.${normalized.digits}`)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let threadId = existingThread?.id || null;
    if (threadId) {
      await db
        .from("chat_threads")
        .update({
          channel_instance_id: resolvedInstId,
          status: "open",
          ...(data.contactName?.trim() && (!existingThread?.guest_name || /^\+?\d+$/.test(existingThread.guest_name))
            ? { guest_name: data.contactName.trim() }
            : {}),
          updated_at: new Date().toISOString(),
        })
        .eq("id", threadId);
    } else {
      const displayTitle = data.contactName?.trim() || normalized.e164;
      const { data: createdThread, error: createErr } = await db
        .from("chat_threads")
        .insert({
          store_id: storeId,
          channel_instance_id: resolvedInstId,
          channel_identity_id: identityRec?.id || null,
          guest_name: displayTitle,
          guest_email: `${normalized.digits}@whatsapp.waesy`,
          primary_phone_e164: normalized.e164,
          status: "open",
          subject: `WhatsApp ${normalized.e164}`,
          context_type: "whatsapp",
          entity_id: normalized.e164,
          department: "geral",
          priority: "normal",
          thread_type: "store",
          assigned_to_profile_id: identity.id,
          metadata: {
            whatsapp_jid: `${normalized.digits}@s.whatsapp.net`,
            initiated_by_staff: identity.id,
          },
        })
        .select("id")
        .single();
      if (createErr || !createdThread) {
        throw new Error(`Falha ao abrir conversa WhatsApp: ${createErr?.message}`);
      }
      threadId = createdThread.id;
    }

    if (data.initialMessage?.trim() && threadId) {
      await _sendChatMessage({
        threadId,
        message: data.initialMessage.trim(),
        message_type: "text",
        is_internal: false,
        attachments: [],
        payload: { origin: "waesy_manual_start" },
      });
    }

    return {
      threadId,
      phone: normalized.e164,
      channelInstanceId: resolvedInstId,
    };
  });

// ============================================================
// 5. Catálogo de Tags e Pastas (Grupos) Editáveis — Paridade uTalk / Whaticket / Monday
// ============================================================

export interface StoreTagGroupItem {
  id: string;
  name: string;
  order: number;
}

export interface StoreTagCatalogItem {
  id: string;
  label: string;
  colorKey: "violet" | "emerald" | "warning" | "rose" | "sky" | "indigo" | "slate";
  groupId: string;
  description?: string | null;
}

const DEFAULT_TAG_GROUPS: StoreTagGroupItem[] = [
  { id: "funil", name: "Funil Comercial & Temperatura", order: 1 },
  { id: "financeiro", name: "Financeiro, PIX & Boletos", order: 2 },
  { id: "viagens", name: "Viagens, PNR & Operadora", order: 3 },
  { id: "suporte", name: "Pós-Venda & SAC", order: 4 },
];

const DEFAULT_TAG_ITEMS: StoreTagCatalogItem[] = [
  { id: "vip", label: "VIP", colorKey: "violet", groupId: "funil" },
  { id: "lead-quente", label: "Lead Quente", colorKey: "emerald", groupId: "funil" },
  { id: "cotacao-enviada", label: "Cotação Enviada", colorKey: "sky", groupId: "funil" },
  { id: "aguardando-pix", label: "Aguardando PIX", colorKey: "warning", groupId: "financeiro" },
  { id: "boleto-emitido", label: "Boleto Emitido", colorKey: "warning", groupId: "financeiro" },
  { id: "pago-confirmado", label: "Pago / Confirmado", colorKey: "emerald", groupId: "financeiro" },
  { id: "voo-pnr-emitido", label: "Voo / PNR Emitido", colorKey: "emerald", groupId: "viagens" },
  { id: "alerta-voo-cia", label: "Alerta Voo / Cia", colorKey: "rose", groupId: "viagens" },
  { id: "pacote-operadora", label: "Pacote Operadora", colorKey: "violet", groupId: "viagens" },
  { id: "reclamacao", label: "Reclamação", colorKey: "rose", groupId: "suporte" },
  { id: "pos-venda", label: "Pós-Venda", colorKey: "sky", groupId: "suporte" },
  { id: "suporte-tecnico", label: "Suporte Técnico", colorKey: "indigo", groupId: "suporte" },
];

export const listStoreTagCatalogSchema = z.object({
  storeId: z.string().uuid().optional(),
});

export const listStoreTagCatalog = createServerFn({ method: "GET" })
  .validator(listStoreTagCatalogSchema.optional())
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    const storeId = data?.storeId || identity.store_id;
    if (!storeId) {
      return { groups: DEFAULT_TAG_GROUPS, tags: DEFAULT_TAG_ITEMS };
    }
    assertStoreAccess(identity, STAFF_ROLES, storeId);
    const db = getServerClient();

    const { data: storeRow } = await db
      .from("stores")
      .select("settings")
      .eq("id", storeId)
      .maybeSingle();

    const settings = ((storeRow?.settings as any) || {}) as Record<string, any>;
    const catalog = (settings.crm_tag_catalog || {}) as {
      groups?: StoreTagGroupItem[];
      tags?: StoreTagCatalogItem[];
    };

    const groups = Array.isArray(catalog.groups) && catalog.groups.length > 0
      ? catalog.groups
      : DEFAULT_TAG_GROUPS;
    const tags = Array.isArray(catalog.tags) && catalog.tags.length > 0
      ? catalog.tags
      : DEFAULT_TAG_ITEMS;

    return { groups, tags };
  });

export const upsertStoreTagCatalogItemSchema = z.object({
  storeId: z.string().uuid().optional(),
  id: z.string().optional(),
  label: z.string().trim().min(1).max(40),
  colorKey: z.enum(["violet", "emerald", "warning", "rose", "sky", "indigo", "slate"]).default("sky"),
  groupId: z.string().trim().min(1).default("funil"),
  description: z.string().trim().max(140).optional().nullable(),
  previousLabel: z.string().trim().optional().nullable(),
});

export const upsertStoreTagCatalogItem = createServerFn({ method: "POST" })
  .validator(upsertStoreTagCatalogItemSchema)
  .handler(async ({ data }) => {
    const { storeId: inputStoreId, id, label, colorKey, groupId, description, previousLabel } = data;
    const identity = await getServerIdentity();
    const storeId = inputStoreId || identity.store_id;
    if (!storeId) throw new Error("Loja obrigatória.");
    assertStoreAccess(identity, STAFF_ROLES, storeId);
    const db = getServerClient();

    const { data: storeRow } = await db
      .from("stores")
      .select("settings")
      .eq("id", storeId)
      .maybeSingle();

    const settings = ((storeRow?.settings as any) || {}) as Record<string, any>;
    const catalog = (settings.crm_tag_catalog || {}) as {
      groups?: StoreTagGroupItem[];
      tags?: StoreTagCatalogItem[];
    };

    const groups = Array.isArray(catalog.groups) && catalog.groups.length > 0
      ? [...catalog.groups]
      : [...DEFAULT_TAG_GROUPS];
    const tags = Array.isArray(catalog.tags) && catalog.tags.length > 0
      ? [...catalog.tags]
      : [...DEFAULT_TAG_ITEMS];

    const slugId = id || label.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || `tag-${Date.now()}`;
    const existingIdx = tags.findIndex((t) => t.id === slugId || (previousLabel && t.label.toLowerCase() === previousLabel.toLowerCase()) || t.label.toLowerCase() === label.toLowerCase());

    const item: StoreTagCatalogItem = {
      id: existingIdx >= 0 ? tags[existingIdx].id : slugId,
      label,
      colorKey,
      groupId,
      description: description || null,
    };

    if (existingIdx >= 0) {
      tags[existingIdx] = item;
    } else {
      tags.push(item);
    }

    const updatedCatalog = { groups, tags, updated_at: new Date().toISOString() };
    await db
      .from("stores")
      .update({
        settings: {
          ...settings,
          crm_tag_catalog: updatedCatalog,
        },
      })
      .eq("id", storeId);

    if (previousLabel && previousLabel !== label) {
      const { data: matchingThreads } = await db
        .from("chat_threads")
        .select("id, tags")
        .eq("store_id", storeId)
        .contains("tags", [previousLabel]);

      for (const th of matchingThreads || []) {
        const nextTags = (Array.isArray(th.tags) ? th.tags : []).map((t: string) => (t === previousLabel ? label : t));
        await db.from("chat_threads").update({ tags: Array.from(new Set(nextTags)) }).eq("id", th.id);
      }
    }

    return { success: true, item, groups, tags };
  });

export const deleteStoreTagCatalogItemSchema = z.object({
  storeId: z.string().uuid().optional(),
  tagId: z.string().min(1),
  tagLabel: z.string().optional(),
});

export const deleteStoreTagCatalogItem = createServerFn({ method: "POST" })
  .validator(deleteStoreTagCatalogItemSchema)
  .handler(async ({ data }) => {
    const { storeId: inputStoreId, tagId, tagLabel } = data;
    const identity = await getServerIdentity();
    const storeId = inputStoreId || identity.store_id;
    if (!storeId) throw new Error("Loja obrigatória.");
    assertStoreAccess(identity, STAFF_ROLES, storeId);
    const db = getServerClient();

    const { data: storeRow } = await db
      .from("stores")
      .select("settings")
      .eq("id", storeId)
      .maybeSingle();

    const settings = ((storeRow?.settings as any) || {}) as Record<string, any>;
    const catalog = (settings.crm_tag_catalog || {}) as {
      groups?: StoreTagGroupItem[];
      tags?: StoreTagCatalogItem[];
    };

    const groups = Array.isArray(catalog.groups) && catalog.groups.length > 0
      ? [...catalog.groups]
      : [...DEFAULT_TAG_GROUPS];
    const currentTags = Array.isArray(catalog.tags) && catalog.tags.length > 0
      ? [...catalog.tags]
      : [...DEFAULT_TAG_ITEMS];

    const targetItem = currentTags.find((t) => t.id === tagId || (tagLabel && t.label === tagLabel));
    const nextTags = currentTags.filter((t) => t.id !== tagId && (!tagLabel || t.label !== tagLabel));

    await db
      .from("stores")
      .update({
        settings: {
          ...settings,
          crm_tag_catalog: { groups, tags: nextTags, updated_at: new Date().toISOString() },
        },
      })
      .eq("id", storeId);

    const labelToRemove = tagLabel || targetItem?.label;
    if (labelToRemove) {
      const { data: matchingThreads } = await db
        .from("chat_threads")
        .select("id, tags")
        .eq("store_id", storeId)
        .contains("tags", [labelToRemove]);

      for (const th of matchingThreads || []) {
        const cleaned = (Array.isArray(th.tags) ? th.tags : []).filter((t: string) => t !== labelToRemove);
        await db.from("chat_threads").update({ tags: cleaned }).eq("id", th.id);
      }
    }

    return { success: true, groups, tags: nextTags };
  });

export const upsertStoreTagGroupSchema = z.object({
  storeId: z.string().uuid().optional(),
  id: z.string().optional(),
  name: z.string().trim().min(2).max(50),
});

export const upsertStoreTagGroup = createServerFn({ method: "POST" })
  .validator(upsertStoreTagGroupSchema)
  .handler(async ({ data }) => {
    const { storeId: inputStoreId, id, name } = data;
    const identity = await getServerIdentity();
    const storeId = inputStoreId || identity.store_id;
    if (!storeId) throw new Error("Loja obrigatória.");
    assertStoreAccess(identity, STAFF_ROLES, storeId);
    const db = getServerClient();

    const { data: storeRow } = await db
      .from("stores")
      .select("settings")
      .eq("id", storeId)
      .maybeSingle();

    const settings = ((storeRow?.settings as any) || {}) as Record<string, any>;
    const catalog = (settings.crm_tag_catalog || {}) as {
      groups?: StoreTagGroupItem[];
      tags?: StoreTagCatalogItem[];
    };

    const groups = Array.isArray(catalog.groups) && catalog.groups.length > 0
      ? [...catalog.groups]
      : [...DEFAULT_TAG_GROUPS];
    const tags = Array.isArray(catalog.tags) && catalog.tags.length > 0
      ? [...catalog.tags]
      : [...DEFAULT_TAG_ITEMS];

    const slugId = id || name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || `grp-${Date.now()}`;
    const existingIdx = groups.findIndex((g) => g.id === slugId);
    if (existingIdx >= 0) {
      groups[existingIdx] = { ...groups[existingIdx], name };
    } else {
      groups.push({ id: slugId, name, order: groups.length + 1 });
    }

    await db
      .from("stores")
      .update({
        settings: {
          ...settings,
          crm_tag_catalog: { groups, tags, updated_at: new Date().toISOString() },
        },
      })
      .eq("id", storeId);

    return { success: true, groups, tags };
  });

export const deleteStoreTagGroupSchema = z.object({
  storeId: z.string().uuid().optional(),
  groupId: z.string().min(1),
});

export const deleteStoreTagGroup = createServerFn({ method: "POST" })
  .validator(deleteStoreTagGroupSchema)
  .handler(async ({ data }) => {
    const { storeId: inputStoreId, groupId } = data;
    const identity = await getServerIdentity();
    const storeId = inputStoreId || identity.store_id;
    if (!storeId) throw new Error("Loja obrigatória.");
    assertStoreAccess(identity, STAFF_ROLES, storeId);
    const db = getServerClient();

    const { data: storeRow } = await db
      .from("stores")
      .select("settings")
      .eq("id", storeId)
      .maybeSingle();

    const settings = ((storeRow?.settings as any) || {}) as Record<string, any>;
    const catalog = (settings.crm_tag_catalog || {}) as {
      groups?: StoreTagGroupItem[];
      tags?: StoreTagCatalogItem[];
    };

    const currentGroups = Array.isArray(catalog.groups) && catalog.groups.length > 0
      ? [...catalog.groups]
      : [...DEFAULT_TAG_GROUPS];
    const currentTags = Array.isArray(catalog.tags) && catalog.tags.length > 0
      ? [...catalog.tags]
      : [...DEFAULT_TAG_ITEMS];

    const nextGroups = currentGroups.filter((g) => g.id !== groupId);
    const fallbackGroupId = nextGroups[0]?.id || "funil";
    const nextTags = currentTags.map((t) => (t.groupId === groupId ? { ...t, groupId: fallbackGroupId } : t));

    await db
      .from("stores")
      .update({
        settings: {
          ...settings,
          crm_tag_catalog: { groups: nextGroups, tags: nextTags, updated_at: new Date().toISOString() },
        },
      })
      .eq("id", storeId);

    return { success: true, groups: nextGroups, tags: nextTags };
  });

// ============================================================
// 6. Sincronização Ativa de Foto e Identidade do Contato WhatsApp
// ============================================================

export const syncContactProfileFromWhatsAppSchema = z.object({
  threadId: z.string().uuid(),
  storeId: z.string().uuid().optional(),
});

export const syncContactProfileFromWhatsApp = createServerFn({ method: "POST" })
  .validator(syncContactProfileFromWhatsAppSchema)
  .handler(async ({ data }) => {
    const { threadId, storeId: inputStoreId } = data;
    const identity = await getServerIdentity();
    const storeId = inputStoreId || identity.store_id;
    if (!storeId) throw new Error("Loja obrigatória.");
    assertStoreAccess(identity, STAFF_ROLES, storeId);
    const db = getServerClient();

    const { data: thread } = await db
      .from("chat_threads")
      .select("id, store_id, customer_id, guest_name, entity_id, channel_instance_id, metadata")
      .eq("id", threadId)
      .eq("store_id", storeId)
      .maybeSingle();

    if (!thread) throw new Error("Conversa não localizada.");

    let inst: { id: string; instance_key: string; external_instance_id: string | null; public_config: any; secret_payload_encrypted?: string | null } | null = null;
    if (thread.channel_instance_id) {
      const { data: linkedInst } = await db
        .from("whatsapp_channel_instances")
        .select("id, instance_key, external_instance_id, public_config, secret_payload_encrypted")
        .eq("id", thread.channel_instance_id)
        .eq("provider", "evolution_api")
        .eq("is_active", true)
        .maybeSingle();
      if (linkedInst) inst = linkedInst;
    }
    if (!inst) {
      const { data: defaultInst } = await db
        .from("whatsapp_channel_instances")
        .select("id, instance_key, external_instance_id, public_config, secret_payload_encrypted")
        .eq("store_id", storeId)
        .eq("provider", "evolution_api")
        .eq("is_active", true)
        .order("is_default", { ascending: false })
        .limit(1)
        .maybeSingle();
      inst = defaultInst || null;
    }

    if (!inst) throw new Error("Nenhuma instância WhatsApp ativa encontrada.");

    const { resolveEvolutionGatewayAccess } = await import("./whatsapp-evolution-config.server");
    const { baseUrl, apiKey, externalName } = resolveEvolutionGatewayAccess(inst as any);
    if (!baseUrl || !apiKey) throw new Error("Gateway WhatsApp não configurado.");

    const { extractParticipantPhone, isGroupJidOrSyntheticPhone, normalizePhoneE164 } = await import("@/services/omnichannel-attribution.server");
    const meta = ((thread.metadata as any) || {}) as Record<string, any>;
    const rawTarget = String(meta.whatsapp_jid_alt || meta.whatsapp_jid || thread.entity_id || "").trim();
    const digits = rawTarget.replace(/@.*$/, "").replace(/\D/g, "");
    const isGroup = isGroupJidOrSyntheticPhone(rawTarget, thread.entity_id) || Boolean(meta.is_group);
    const groupJid = isGroup ? (rawTarget.includes("@g.us") ? rawTarget : `${digits}@g.us`) : null;
    const targetQuery = groupJid || rawTarget || digits;

    let fetchedAvatarUrl: string | null = meta.avatar_url || null;
    let fetchedName: string | null = null;
    let fetchedParticipants: Array<{ jid: string; phone: string | null; name: string | null; admin: boolean }> = Array.isArray(meta.participants)
      ? meta.participants
      : [];

    if (isGroup && groupJid) {
      try {
        const grpRes = await fetch(
          `${baseUrl}/group/findGroupInfos/${encodeURIComponent(externalName)}?groupJid=${encodeURIComponent(groupJid)}`,
          {
            method: "GET",
            headers: { apikey: apiKey },
            signal: AbortSignal.timeout(5000),
          },
        );
        if (grpRes.ok) {
          const grpJson = (await grpRes.json().catch(() => ({}))) as Record<string, any>;
          const subj = String(grpJson.subject || grpJson.groupMetadata?.subject || grpJson.name || "").trim();
          if (subj) fetchedName = subj;
          const grpPic = grpJson.pictureUrl || grpJson.profilePicUrl || grpJson.picture || null;
          if (!fetchedAvatarUrl && typeof grpPic === "string" && grpPic.startsWith("http")) {
            fetchedAvatarUrl = grpPic;
          }
          const rawParts = Array.isArray(grpJson.participants)
            ? grpJson.participants
            : Array.isArray(grpJson.groupMetadata?.participants)
              ? grpJson.groupMetadata.participants
              : [];
          if (rawParts.length > 0) {
            fetchedParticipants = rawParts.slice(0, 50).map((p: any) => ({
              jid: String(p?.id || p?.jid || ""),
              phone: extractParticipantPhone(p?.phoneNumber || p?.pn || p?.id || p?.jid),
              name: typeof (p?.pushName || p?.name) === "string" ? String(p.pushName || p.name).trim() || null : null,
              admin: Boolean(p?.admin),
            }));
          }
        }
      } catch {
        // Best-effort group lookup
      }
    }

    try {
      const picRes = await fetch(`${baseUrl}/chat/fetchProfilePictureUrl/${encodeURIComponent(externalName)}`, {
        method: "POST",
        headers: { apikey: apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({ number: targetQuery }),
        signal: AbortSignal.timeout(5000),
      });
      if (picRes.ok) {
        const picJson = (await picRes.json().catch(() => ({}))) as Record<string, any>;
        const candidatePic = picJson.profilePictureUrl || picJson.profilePicUrl || picJson.picture || null;
        if (typeof candidatePic === "string" && candidatePic.startsWith("http")) {
          fetchedAvatarUrl = candidatePic;
        }
      }
    } catch {
      // Best-effort profile picture fetch
    }

    if (!isGroup) {
      try {
        const contactsRes = await fetch(`${baseUrl}/chat/findContacts/${encodeURIComponent(externalName)}`, {
          method: "POST",
          headers: { apikey: apiKey, "Content-Type": "application/json" },
          body: JSON.stringify({ where: { id: rawTarget.includes("@") ? rawTarget : `${digits}@s.whatsapp.net` } }),
          signal: AbortSignal.timeout(5000),
        });
        if (contactsRes.ok) {
          const contactsJson = await contactsRes.json().catch(() => []);
          const list = Array.isArray(contactsJson) ? contactsJson : Array.isArray(contactsJson?.data) ? contactsJson.data : [];
          const match = list[0];
          if (match) {
            if (!fetchedAvatarUrl && typeof match.profilePicUrl === "string" && match.profilePicUrl.startsWith("http")) {
              fetchedAvatarUrl = match.profilePicUrl;
            }
            const candidateName = String(match.pushName || match.name || "").trim();
            if (candidateName && !["você", "voce", "you", "eu"].includes(candidateName.toLowerCase())) {
              fetchedName = candidateName;
            }
          }
        }
      } catch {
        // Best-effort contact lookup
      }
    }

    const currentGuestName = String(thread.guest_name || "").trim();
    const isSyntheticName =
      !currentGuestName ||
      /^\+?\d+$/.test(currentGuestName) ||
      currentGuestName.startsWith("WhatsApp ") ||
      currentGuestName.startsWith("Contato Meta") ||
      currentGuestName === "Grupo WhatsApp";
    const isLidOnly = !isGroup && isSyntheticMetaLid(rawTarget || thread.entity_id, digits, meta);
    const normalizedDirectPhone = !isGroup && !isLidOnly ? normalizePhoneE164(rawTarget || thread.entity_id || digits) : null;
    const lidSuffix = digits ? digits.slice(-4) : "";
    const resolvedName = (isSyntheticName && fetchedName)
      ? fetchedName
      : (currentGuestName && !isSyntheticName
          ? currentGuestName
          : fetchedName || (isGroup ? "Grupo WhatsApp" : isLidOnly ? (lidSuffix ? `Contato Meta #${lidSuffix}` : "Contato Meta") : normalizedDirectPhone || `+${digits}`));

    const updatedMeta = {
      ...meta,
      ...(isGroup ? { is_group: true } : {}),
      ...(isLidOnly ? { is_lid: true } : {}),
      ...(isGroup && resolvedName && resolvedName !== "Grupo WhatsApp" ? { group_subject: resolvedName } : {}),
      ...(isGroup && fetchedParticipants.length > 0 ? { participants: fetchedParticipants, participants_count: fetchedParticipants.length } : {}),
      ...(fetchedAvatarUrl ? { avatar_url: fetchedAvatarUrl } : {}),
      ...(!isGroup && fetchedName ? { push_name: fetchedName } : {}),
      last_whatsapp_profile_sync_at: new Date().toISOString(),
    };

    const threadSyncPatch: Record<string, any> = {
      guest_name: resolvedName,
      metadata: updatedMeta,
      updated_at: new Date().toISOString(),
    };
    if (isGroup && resolvedName !== "Grupo WhatsApp") {
      threadSyncPatch.group_subject = resolvedName;
      threadSyncPatch.subject = `Grupo: ${resolvedName}`;
    } else if (!isGroup && normalizedDirectPhone) {
      threadSyncPatch.primary_phone_e164 = normalizedDirectPhone;
    }

    await db
      .from("chat_threads")
      .update(threadSyncPatch)
      .eq("id", thread.id);

    if (!isGroup && thread.customer_id && fetchedAvatarUrl) {
      await db
        .from("profiles")
        .update({ avatar_url: fetchedAvatarUrl, updated_at: new Date().toISOString() })
        .eq("id", thread.customer_id);
    }

    if (externalName && !isGroup && normalizedDirectPhone) {
      await db
        .from("whatsapp_contact_identities")
        .update({
          profile_name: fetchedName || resolvedName,
          phone_e164: normalizedDirectPhone,
          updated_at: new Date().toISOString(),
        })
        .eq("store_id", storeId)
        .eq("phone_e164", normalizedDirectPhone);
    }

    return {
      success: true,
      isGroup,
      avatarUrl: fetchedAvatarUrl,
      fullName: resolvedName,
      phone: isGroup || isLidOnly ? null : (normalizedDirectPhone || thread.entity_id || (digits ? `+${digits}` : null)),
      participantsCount: fetchedParticipants.length,
    };
  });

// ============================================================
// 7. Notas Rápidas, Seleção de IA Especialista, Dossiê PNR/Viagem e E-mail Vinculado
// ============================================================

export const updateThreadInternalNotesSchema = z.object({
  threadId: z.string().uuid(),
  storeId: z.string().uuid().optional(),
  internalNotes: z.string().max(4000),
});

export const updateThreadInternalNotes = createServerFn({ method: "POST" })
  .validator(updateThreadInternalNotesSchema)
  .handler(async ({ data }) => {
    const { threadId, storeId: inputStoreId, internalNotes } = data;
    const identity = await getServerIdentity();
    const storeId = inputStoreId || identity.store_id;
    if (!storeId) throw new Error("Loja obrigatória.");
    assertStoreAccess(identity, STAFF_ROLES, storeId);
    const db = getServerClient();

    const { error } = await db
      .from("chat_threads")
      .update({
        internal_notes: internalNotes.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", threadId)
      .eq("store_id", storeId);

    if (error) throw new Error(`Falha ao salvar observações: ${error.message}`);
    return { success: true, internalNotes: internalNotes.trim() };
  });

export const updateThreadAiAgentConfigSchema = z.object({
  threadId: z.string().uuid(),
  storeId: z.string().uuid().optional(),
  aiAgentId: z.enum([
    "general_copilot",
    "tourism_concierge",
    "commercial_closer",
    "financial_billing",
    "sac_triage",
  ]),
  handoffMode: z.enum(["ai_triage", "human_queue", "human_active"]).optional(),
  aiAutoReplyEnabled: z.boolean().optional(),
});

export const updateThreadAiAgentConfig = createServerFn({ method: "POST" })
  .validator(updateThreadAiAgentConfigSchema)
  .handler(async ({ data }) => {
    const { threadId, storeId: inputStoreId, aiAgentId, handoffMode, aiAutoReplyEnabled } = data;
    const identity = await getServerIdentity();
    const storeId = inputStoreId || identity.store_id;
    if (!storeId) throw new Error("Loja obrigatória.");
    assertStoreAccess(identity, STAFF_ROLES, storeId);
    const db = getServerClient();

    const { data: current } = await db
      .from("chat_threads")
      .select("metadata")
      .eq("id", threadId)
      .eq("store_id", storeId)
      .maybeSingle();

    const curMeta = (((current?.metadata as any) || {}) as Record<string, any>);
    const nextMeta = {
      ...curMeta,
      ai_agent_id: aiAgentId,
      ...(handoffMode !== undefined ? { handoff_mode: handoffMode } : {}),
      ...(aiAutoReplyEnabled !== undefined ? { ai_auto_reply_enabled: aiAutoReplyEnabled } : {}),
      ai_agent_updated_at: new Date().toISOString(),
      ai_agent_updated_by: identity.id,
    };

    const { error } = await db
      .from("chat_threads")
      .update({
        metadata: nextMeta,
        updated_at: new Date().toISOString(),
      })
      .eq("id", threadId)
      .eq("store_id", storeId);

    if (error) throw new Error(`Falha ao atualizar agente IA: ${error.message}`);
    return {
      success: true,
      aiAgentConfig: {
        aiAgentId,
        handoffMode: nextMeta.handoff_mode || "ai_triage",
        aiAutoReplyEnabled: nextMeta.ai_auto_reply_enabled !== false,
      },
    };
  });

export const upsertCustomerTravelDossierSchema = z.object({
  threadId: z.string().uuid(),
  storeId: z.string().uuid().optional(),
  dossierId: z.string().optional(),
  pnrLocator: z.string().trim().max(30).optional().nullable(),
  operatorPackageId: z.string().trim().max(60).optional().nullable(),
  operatorName: z.string().trim().max(80).optional().nullable(),
  airlineName: z.string().trim().max(60).optional().nullable(),
  routeSummary: z.string().trim().max(140).optional().nullable(),
  departureDate: z.string().trim().max(40).optional().nullable(),
  flightStatus: z.enum(["confirmed", "scheduled", "delayed", "cancelled", "reaccommodation"]).default("confirmed"),
  passengerNames: z.string().trim().max(240).optional().nullable(),
  notes: z.string().trim().max(500).optional().nullable(),
});

export const upsertCustomerTravelDossier = createServerFn({ method: "POST" })
  .validator(upsertCustomerTravelDossierSchema)
  .handler(async ({ data }) => {
    const {
      threadId,
      storeId: inputStoreId,
      dossierId,
      pnrLocator,
      operatorPackageId,
      operatorName,
      airlineName,
      routeSummary,
      departureDate,
      flightStatus,
      passengerNames,
      notes,
    } = data;

    const identity = await getServerIdentity();
    const storeId = inputStoreId || identity.store_id;
    if (!storeId) throw new Error("Loja obrigatória.");
    assertStoreAccess(identity, STAFF_ROLES, storeId);
    const db = getServerClient();

    const { data: thread } = await db
      .from("chat_threads")
      .select("id, metadata")
      .eq("id", threadId)
      .eq("store_id", storeId)
      .maybeSingle();

    if (!thread) throw new Error("Conversa não encontrada.");

    const curMeta = (((thread.metadata as any) || {}) as Record<string, any>);
    const existingList = Array.isArray(curMeta.travel_dossiers) ? [...curMeta.travel_dossiers] : [];
    const targetId = dossierId || `pnr-${Date.now()}`;

    const entry = {
      id: targetId,
      pnr_locator: (pnrLocator || "").toUpperCase().trim() || null,
      operator_package_id: (operatorPackageId || "").trim() || null,
      operator_name: (operatorName || "").trim() || null,
      airline_name: (airlineName || "").trim() || null,
      route_summary: (routeSummary || "").trim() || null,
      departure_date: (departureDate || "").trim() || null,
      flight_status: flightStatus,
      passenger_names: (passengerNames || "").trim() || null,
      notes: (notes || "").trim() || null,
      updated_at: new Date().toISOString(),
    };

    const idx = existingList.findIndex((d: any) => d.id === targetId);
    if (idx >= 0) {
      existingList[idx] = entry;
    } else {
      existingList.unshift(entry);
    }

    const nextMeta = {
      ...curMeta,
      travel_dossiers: existingList,
    };

    await db
      .from("chat_threads")
      .update({ metadata: nextMeta, updated_at: new Date().toISOString() })
      .eq("id", threadId)
      .eq("store_id", storeId);

    return { success: true, dossier: entry, travelDossiers: existingList };
  });

export const deleteCustomerTravelDossierSchema = z.object({
  threadId: z.string().uuid(),
  storeId: z.string().uuid().optional(),
  dossierId: z.string().min(1),
});

export const deleteCustomerTravelDossier = createServerFn({ method: "POST" })
  .validator(deleteCustomerTravelDossierSchema)
  .handler(async ({ data }) => {
    const { threadId, storeId: inputStoreId, dossierId } = data;
    const identity = await getServerIdentity();
    const storeId = inputStoreId || identity.store_id;
    if (!storeId) throw new Error("Loja obrigatória.");
    assertStoreAccess(identity, STAFF_ROLES, storeId);
    const db = getServerClient();

    const { data: thread } = await db
      .from("chat_threads")
      .select("id, metadata")
      .eq("id", threadId)
      .eq("store_id", storeId)
      .maybeSingle();

    if (!thread) throw new Error("Conversa não encontrada.");

    const curMeta = (((thread.metadata as any) || {}) as Record<string, any>);
    const existingList = Array.isArray(curMeta.travel_dossiers) ? curMeta.travel_dossiers : [];
    const nextList = existingList.filter((d: any) => d.id !== dossierId);

    await db
      .from("chat_threads")
      .update({
        metadata: { ...curMeta, travel_dossiers: nextList },
        updated_at: new Date().toISOString(),
      })
      .eq("id", threadId)
      .eq("store_id", storeId);

    return { success: true, travelDossiers: nextList };
  });

export const sendClientLinkedEmailSchema = z.object({
  threadId: z.string().uuid(),
  storeId: z.string().uuid().optional(),
  customerId: z.string().uuid().optional().nullable(),
  mailboxAddress: z.string().trim().optional().nullable(),
  recipientEmail: z.string().trim().email("Informe um e-mail destinatário válido"),
  recipientName: z.string().trim().max(120).optional().nullable(),
  recipientType: z.enum(["client", "operator", "airline", "support"]).default("operator"),
  subject: z.string().trim().min(2).max(180),
  bodyText: z.string().trim().min(2).max(5000),
  pnrLocator: z.string().trim().max(30).optional().nullable(),
  operatorPackageId: z.string().trim().max(60).optional().nullable(),
  ticketId: z.string().trim().max(60).optional().nullable(),
  attachmentImageUrl: z.string().trim().max(4000).optional().nullable(),
  notifyInCustomerChat: z.boolean().default(false),
});

export const sendClientLinkedEmail = createServerFn({ method: "POST" })
  .validator(sendClientLinkedEmailSchema)
  .handler(async ({ data }) => {
    const {
      threadId,
      storeId: inputStoreId,
      customerId,
      mailboxAddress,
      recipientEmail,
      recipientName,
      recipientType,
      subject,
      bodyText,
      pnrLocator,
      operatorPackageId,
      ticketId,
      attachmentImageUrl,
      notifyInCustomerChat,
    } = data;

    const identity = await getServerIdentity();
    const storeId = inputStoreId || identity.store_id;
    if (!storeId) throw new Error("Loja obrigatória.");
    assertStoreAccess(identity, STAFF_ROLES, storeId);
    const db = getServerClient();

    const [{ data: thread }, { data: storeRow }] = await Promise.all([
      db.from("chat_threads").select("id, customer_id, guest_name, entity_id, metadata").eq("id", threadId).eq("store_id", storeId).maybeSingle(),
      db.from("stores").select("name, slug, settings").eq("id", storeId).maybeSingle(),
    ]);

    if (!thread) throw new Error("Conversa não encontrada.");

    const storeSettings = (((storeRow?.settings as any) || {}) as Record<string, any>);
    const emailAccounts = Array.isArray(storeSettings.corporate_email_accounts) ? storeSettings.corporate_email_accounts : [];
    const defaultMailbox = emailAccounts[0]?.address || `atendimento@${storeRow?.slug || "waesy"}.com.br`;
    const fromEmail = mailboxAddress || defaultMailbox;

    const shortCid = String(customerId || thread.customer_id || threadId).slice(0, 8).toUpperCase();
    const shortTrd = threadId.slice(0, 8).toUpperCase();
    const correlationTokens = [
      `[CID:${shortCid}]`,
      `[TRD:${shortTrd}]`,
      ...(pnrLocator ? [`[PNR:${pnrLocator.toUpperCase().trim()}]`] : []),
      ...(operatorPackageId ? [`[PKG:${operatorPackageId.toUpperCase().trim()}]`] : []),
      ...(ticketId ? [`[TKT:${ticketId.slice(0, 8).toUpperCase()}]`] : []),
    ].join(" ");

    const trackedSubject = subject.includes("[TRD:") ? subject : `${subject} ${correlationTokens}`;
    let deliveryProvider = "local_tracked";
    let externalId: string | null = null;
    let deliveryError: string | null = null;

    const resendKey = process.env.RESEND_API_KEY?.trim() || "";
    if (!resendKey) {
      deliveryError = "RESEND_API_KEY não configurada — registro salvo localmente.";
    } else {
      try {
        const htmlBody = `
          <div style="font-family: sans-serif; color: black; line-height: 1.6;">
            <p>${bodyText.replace(/\n/g, "<br/>")}</p>
            ${attachmentImageUrl ? `<div style="margin-top: 16px;"><img src="${attachmentImageUrl}" alt="Anexo" style="max-width: 100%; border-radius: 8px;" /></div>` : ""}
            <hr style="margin-top: 24px; border: 0; border-top: 1px solid gainsboro;" />
            <p style="font-size: 11px; color: dimgray;">
              Enviado por ${storeRow?.name || "Central de Atendimento"} (${fromEmail}) • Rastreio Automático: ${correlationTokens}
            </p>
          </div>
        `;
        const resendRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: `${storeRow?.name || "Atendimento"} <${fromEmail.includes("@") ? fromEmail : "onboarding@resend.dev"}>`,
            to: [recipientEmail],
            subject: trackedSubject,
            html: htmlBody,
            headers: {
              "X-Waesy-Thread-Id": threadId,
              "X-Waesy-Customer-Id": String(customerId || thread.customer_id || ""),
              ...(pnrLocator ? { "X-Waesy-PNR": pnrLocator } : {}),
              ...(operatorPackageId ? { "X-Waesy-Operator-Package": operatorPackageId } : {}),
            },
          }),
          signal: AbortSignal.timeout(8000),
        });
        if (resendRes.ok) {
          const resendJson = (await resendRes.json().catch(() => ({}))) as Record<string, any>;
          externalId = resendJson.id || null;
          deliveryProvider = "resend_smtp";
        } else {
          const errJson = (await resendRes.json().catch(() => ({}))) as Record<string, any>;
          deliveryError = String(errJson?.message || errJson?.error || `Falha SMTP (HTTP ${resendRes.status})`).slice(0, 180);
        }
      } catch (err: any) {
        deliveryError = String(err?.message || "Erro de rede ao conectar no provedor SMTP.").slice(0, 180);
      }
    }

    const deliveredExternally = deliveryProvider === "resend_smtp" && Boolean(externalId);
    const emailRecord = {
      id: `eml-${Date.now()}`,
      thread_id: threadId,
      customer_id: customerId || thread.customer_id || null,
      from_address: fromEmail,
      recipient_email: recipientEmail,
      recipient_name: recipientName || recipientEmail,
      recipient_type: recipientType,
      subject: trackedSubject,
      clean_subject: subject,
      body_text: bodyText,
      correlation_tokens: correlationTokens,
      pnr_locator: pnrLocator ? pnrLocator.toUpperCase().trim() : null,
      operator_package_id: operatorPackageId ? operatorPackageId.trim() : null,
      ticket_id: ticketId || null,
      attachment_image_url: attachmentImageUrl || null,
      delivery_provider: deliveryProvider,
      external_id: externalId,
      delivery_error: deliveryError,
      status: deliveredExternally ? "sent" : "logged_pending_smtp",
      sent_by_profile_id: identity.id,
      created_at: new Date().toISOString(),
    };

    const curMeta = (((thread.metadata as any) || {}) as Record<string, any>);
    const existingEmails = Array.isArray(curMeta.linked_emails) ? curMeta.linked_emails : [];
    const nextEmails = [emailRecord, ...existingEmails].slice(0, 50);

    await db
      .from("chat_threads")
      .update({
        metadata: {
          ...curMeta,
          linked_emails: nextEmails,
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", threadId)
      .eq("store_id", storeId);

    const recipientTypeLabel =
      recipientType === "operator"
        ? "Operadora"
        : recipientType === "airline"
          ? "Cia Aérea"
          : recipientType === "support"
            ? "Suporte / Ticket"
            : "Cliente";

    if (notifyInCustomerChat) {
      await _sendChatMessage(
        {
          threadId,
          message: `E-mail enviado para ${recipientEmail} — Assunto: "${subject}"${pnrLocator ? ` (PNR: ${pnrLocator.toUpperCase()})` : ""}`,
          message_type: "text",
          attachments: [],
          is_internal: false,
          payload: {
            is_internal: false,
            is_whisper: false,
            linked_email: emailRecord,
          },
        },
        { db, identity },
      );
    } else {
      await db.from("chat_messages").insert({
        thread_id: threadId,
        message: `[E-MAIL VINCULADO • ${recipientTypeLabel.toUpperCase()}] Para: ${recipientEmail} | Assunto: ${trackedSubject}\n${bodyText}`,
        message_type: "system_event",
        is_staff_reply: true,
        sender_id: identity.id,
        sender_profile_id: identity.id,
        payload: {
          is_internal: true,
          is_whisper: true,
          linked_email: emailRecord,
        },
      });
    }

    return {
      success: true,
      emailRecord,
      linkedEmails: nextEmails,
      deliveredExternally,
      deliveryProvider,
      deliveryWarning: deliveredExternally
        ? null
        : deliveryError || "Salvo na linha do tempo sem disparo SMTP externo.",
    };
  });

// ============================================================
// 8. Cloudwebly / cPanel Hosting & Corporate Email Accounts Management
// ============================================================

export interface CorporateEmailAccountItem {
  id: string;
  address: string;
  localPart: string;
  domain: string;
  displayName: string;
  quotaMb: number;
  usedMb: number;
  departmentSlug: string;
  assignedProfileId: string | null;
  assignedProfileName: string | null;
  status: "active" | "suspended";
  cpanelSynced: boolean;
  createdAt: string;
}

export const getCorporateEmailHostingOverviewSchema = z.object({
  storeId: z.string().uuid().optional(),
});

export const getCorporateEmailHostingOverview = createServerFn({ method: "GET" })
  .validator(getCorporateEmailHostingOverviewSchema.optional())
  .handler(async ({ data }) => {
    const identity = await getServerIdentity();
    const storeId = data?.storeId || identity.store_id;
    if (!storeId) throw new Error("Loja obrigatória.");
    assertStoreAccess(identity, STAFF_ROLES, storeId);
    const db = getServerClient();

    const [{ data: storeRow }, { data: membersRows }, { data: deptsRows }] = await Promise.all([
      db.from("stores").select("id, name, slug, custom_domain, settings").eq("id", storeId).maybeSingle(),
      db.from("store_members").select("user_id, role, profiles:user_id(id, full_name)").eq("store_id", storeId),
      db.from("chat_departments").select("id, name, slug").eq("store_id", storeId).eq("is_active", true),
    ]);

    const settings = (((storeRow?.settings as any) || {}) as Record<string, any>);
    const hostingConfig = (settings.corporate_email_config || {
      provider: "cloudwebly_cpanel",
      cpanelHost: "https://br1.cloudwebly.com:2083",
      cpanelUsername: "",
      primaryDomain: storeRow?.custom_domain || `${storeRow?.slug || "empresa"}.com.br`,
      imapHost: `mail.${storeRow?.custom_domain || `${storeRow?.slug || "empresa"}.com.br`}`,
      imapPort: 993,
      smtpHost: `mail.${storeRow?.custom_domain || `${storeRow?.slug || "empresa"}.com.br`}`,
      smtpPort: 465,
      planName: "Cloudwebly Hospedagem & E-mail Pro",
      planActive: Boolean(settings.corporate_email_config?.planActive ?? true),
      hasApiToken: Boolean(settings.corporate_email_config?.cpanelApiToken),
    }) as Record<string, any>;

    const accounts = (Array.isArray(settings.corporate_email_accounts) ? settings.corporate_email_accounts : []) as CorporateEmailAccountItem[];
    const teamMembers = (membersRows || []).map((m: any) => ({
      id: m.user_id,
      fullName: m.profiles?.full_name || "Colaborador",
      role: m.role,
    }));
    const departments = (deptsRows || []).map((d: any) => ({
      id: d.id,
      name: d.name,
      slug: d.slug,
    }));

    return {
      hostingConfig: {
        provider: (hostingConfig.provider || "cloudwebly_cpanel") as "cloudwebly_cpanel" | "custom_cpanel" | "custom_imap_smtp" | "imap_smtp",
        planStatus: (hostingConfig.planStatus || "active") as "active" | "trial" | "external",
        cpanelHost: hostingConfig.cpanelHost || "https://br1.cloudwebly.com:2083",
        cpanelPort: Number(hostingConfig.cpanelPort || 2083),
        cpanelUsername: hostingConfig.cpanelUsername || "",
        primaryDomain: hostingConfig.primaryDomain || storeRow?.custom_domain || `${storeRow?.slug || "empresa"}.com.br`,
        imapHost: hostingConfig.imapHost || `mail.${hostingConfig.primaryDomain || "seudominio.com.br"}`,
        imapPort: Number(hostingConfig.imapPort || 993),
        smtpHost: hostingConfig.smtpHost || `mail.${hostingConfig.primaryDomain || "seudominio.com.br"}`,
        smtpPort: Number(hostingConfig.smtpPort || 465),
        planName: hostingConfig.planName || "Cloudwebly Hospedagem & E-mail Pro",
        planActive: hostingConfig.planActive !== false,
        hasApiToken: Boolean(hostingConfig.cpanelApiToken),
        autoLinkByCustomerEmail: hostingConfig.autoLinkByCustomerEmail !== false,
        autoLinkByPnrAndTicket: hostingConfig.autoLinkByPnrAndTicket !== false,
      },
      accounts,
      mailboxes: accounts,
      teamMembers,
      departments,
    };
  });

export const saveCorporateEmailHostingConfigSchema = z.object({
  storeId: z.string().uuid().optional(),
  provider: z.enum(["cloudwebly_cpanel", "custom_cpanel", "custom_imap_smtp", "imap_smtp"]).default("cloudwebly_cpanel"),
  planStatus: z.enum(["active", "trial", "external"]).optional(),
  cpanelHost: z.string().trim().max(200).optional().nullable(),
  cpanelPort: z.number().int().optional(),
  cpanelUsername: z.string().trim().max(80).optional().nullable(),
  cpanelApiToken: z.string().trim().max(300).optional().nullable(),
  primaryDomain: z.string().trim().min(3).max(120),
  imapHost: z.string().trim().max(120).optional().nullable(),
  imapPort: z.number().int().default(993),
  smtpHost: z.string().trim().max(120).optional().nullable(),
  smtpPort: z.number().int().default(465),
  planActive: z.boolean().default(true),
  autoLinkByCustomerEmail: z.boolean().optional(),
  autoLinkByPnrAndTicket: z.boolean().optional(),
});

export const saveCorporateEmailHostingConfig = createServerFn({ method: "POST" })
  .validator(saveCorporateEmailHostingConfigSchema)
  .handler(async ({ data }) => {
    const {
      storeId: inputStoreId,
      provider,
      planStatus,
      cpanelHost,
      cpanelPort,
      cpanelUsername,
      cpanelApiToken,
      primaryDomain,
      imapHost,
      imapPort,
      smtpHost,
      smtpPort,
      planActive,
      autoLinkByCustomerEmail,
      autoLinkByPnrAndTicket,
    } = data;

    const identity = await getServerIdentity();
    const storeId = inputStoreId || identity.store_id;
    if (!storeId) throw new Error("Loja obrigatória.");
    assertStoreAccess(identity, MANAGER_ROLES, storeId);
    const db = getServerClient();

    const { data: storeRow } = await db
      .from("stores")
      .select("settings")
      .eq("id", storeId)
      .maybeSingle();

    const settings = (((storeRow?.settings as any) || {}) as Record<string, any>);
    const prevConfig = (settings.corporate_email_config || {}) as Record<string, any>;
    const cleanDomain = primaryDomain.replace(/^https?:\/\//, "").replace(/\/.*$/, "").toLowerCase().trim();

    const nextConfig = {
      ...prevConfig,
      provider,
      planStatus: planStatus || prevConfig.planStatus || "active",
      cpanelHost: (cpanelHost || prevConfig.cpanelHost || `https://cpanel.${cleanDomain}:2083`).replace(/\/$/, ""),
      cpanelPort: cpanelPort || prevConfig.cpanelPort || 2083,
      cpanelUsername: (cpanelUsername || "").trim(),
      cpanelApiToken: cpanelApiToken && cpanelApiToken.trim() ? cpanelApiToken.trim() : (prevConfig.cpanelApiToken || ""),
      primaryDomain: cleanDomain,
      imapHost: (imapHost || "").trim() || `mail.${cleanDomain}`,
      imapPort,
      smtpHost: (smtpHost || "").trim() || `mail.${cleanDomain}`,
      smtpPort,
      planActive,
      autoLinkByCustomerEmail: autoLinkByCustomerEmail ?? prevConfig.autoLinkByCustomerEmail ?? true,
      autoLinkByPnrAndTicket: autoLinkByPnrAndTicket ?? prevConfig.autoLinkByPnrAndTicket ?? true,
      updatedAt: new Date().toISOString(),
    };

    await db
      .from("stores")
      .update({
        settings: {
          ...settings,
          corporate_email_config: nextConfig,
        },
      })
      .eq("id", storeId);

    return {
      success: true,
      hostingConfig: {
        ...nextConfig,
        cpanelApiToken: undefined,
        hasApiToken: Boolean(nextConfig.cpanelApiToken),
      },
    };
  });

export const createCorporateEmailMailboxSchema = z.object({
  storeId: z.string().uuid().optional(),
  localPart: z.string().trim().min(1).max(60),
  domain: z.string().trim().optional(),
  password: z.string().max(100).optional(),
  displayName: z.string().trim().min(1).max(80),
  quotaMb: z.number().int().min(100).max(50000).default(2048),
  departmentSlug: z.string().trim().default("geral"),
  assignedProfileId: z.string().optional().nullable(),
  assignedProfileName: z.string().optional().nullable(),
  autoAssignTicket: z.boolean().optional(),
});

export const createCorporateEmailMailbox = createServerFn({ method: "POST" })
  .validator(createCorporateEmailMailboxSchema)
  .handler(async ({ data }) => {
    const {
      storeId: inputStoreId,
      localPart,
      domain: inputDomain,
      password,
      displayName,
      quotaMb,
      departmentSlug,
      assignedProfileId,
      assignedProfileName: inputProfileName,
      autoAssignTicket,
    } = data;

    const identity = await getServerIdentity();
    const storeId = inputStoreId || identity.store_id;
    if (!storeId) throw new Error("Loja obrigatória.");
    assertStoreAccess(identity, MANAGER_ROLES, storeId);
    const db = getServerClient();

    const { data: storeRow } = await db
      .from("stores")
      .select("slug, custom_domain, settings")
      .eq("id", storeId)
      .maybeSingle();

    const settings = (((storeRow?.settings as any) || {}) as Record<string, any>);
    const hostingConfig = (settings.corporate_email_config || {}) as Record<string, any>;
    const cleanLocal = localPart.replace(/@.*$/, "").toLowerCase().replace(/[^a-z0-9._-]/g, "");
    if (!cleanLocal) throw new Error("Prefixo do e-mail inválido.");

    const effectiveDomain = (inputDomain || hostingConfig.primaryDomain || storeRow?.custom_domain || `${storeRow?.slug || "empresa"}.com.br`).toLowerCase().trim();
    const fullAddress = `${cleanLocal}@${effectiveDomain}`;

    const existingAccounts = (Array.isArray(settings.corporate_email_accounts) ? [...settings.corporate_email_accounts] : []) as CorporateEmailAccountItem[];
    if (existingAccounts.some((acc) => acc.address.toLowerCase() === fullAddress)) {
      throw new Error(`A caixa de e-mail ${fullAddress} já está cadastrada.`);
    }

    let cpanelSynced = false;
    if (hostingConfig.cpanelHost && hostingConfig.cpanelUsername && hostingConfig.cpanelApiToken) {
      try {
        const uapiUrl = `${String(hostingConfig.cpanelHost).replace(/\/$/, "")}/execute/Email/add_pop`;
        const params = new URLSearchParams({
          email: cleanLocal,
          domain: effectiveDomain,
          password: password || `Waesy@${Math.floor(100000 + Math.random() * 900000)}`,
          quota: String(quotaMb),
        });
        const cpRes = await fetch(`${uapiUrl}?${params.toString()}`, {
          method: "GET",
          headers: {
            Authorization: `cpanel ${hostingConfig.cpanelUsername}:${hostingConfig.cpanelApiToken}`,
          },
          signal: AbortSignal.timeout(8000),
        });
        if (cpRes.ok) {
          const cpJson = (await cpRes.json().catch(() => ({}))) as Record<string, any>;
          if (cpJson.status === 1) {
            cpanelSynced = true;
          }
        }
      } catch {
        // Fallback para provisionamento gerenciado local/Cloudwebly
      }
    }

    let assignedProfileName: string | null = inputProfileName || null;
    if (assignedProfileId && !assignedProfileName) {
      const { data: p } = await db.from("profiles").select("full_name").eq("id", assignedProfileId).maybeSingle();
      assignedProfileName = p?.full_name || null;
    }

    const newMailbox: CorporateEmailAccountItem = {
      id: `mbx-${Date.now()}`,
      address: fullAddress,
      localPart: cleanLocal,
      domain: effectiveDomain,
      displayName: displayName || (autoAssignTicket ? `${cleanLocal} (SAC)` : cleanLocal),
      quotaMb,
      usedMb: 0,
      departmentSlug: departmentSlug || "geral",
      assignedProfileId: assignedProfileId || null,
      assignedProfileName,
      status: "active",
      cpanelSynced,
      createdAt: new Date().toISOString(),
    };

    const nextAccounts = [newMailbox, ...existingAccounts];
    await db
      .from("stores")
      .update({
        settings: {
          ...settings,
          corporate_email_accounts: nextAccounts,
        },
      })
      .eq("id", storeId);

    return {
      success: true,
      cpanelProvisioned: cpanelSynced,
      mailbox: newMailbox,
      accounts: nextAccounts,
    };
  });

export const assignCorporateEmailMailboxSchema = z.object({
  storeId: z.string().uuid().optional(),
  mailboxId: z.string().min(1),
  departmentSlug: z.string().trim().default("geral"),
  assignedProfileId: z.string().optional().nullable(),
  assignedProfileName: z.string().optional().nullable(),
  displayName: z.string().trim().max(80).optional(),
});

export const assignCorporateEmailMailbox = createServerFn({ method: "POST" })
  .validator(assignCorporateEmailMailboxSchema)
  .handler(async ({ data }) => {
    const { storeId: inputStoreId, mailboxId, departmentSlug, assignedProfileId, assignedProfileName: inputProfileName, displayName } = data;
    const identity = await getServerIdentity();
    const storeId = inputStoreId || identity.store_id;
    if (!storeId) throw new Error("Loja obrigatória.");
    assertStoreAccess(identity, MANAGER_ROLES, storeId);
    const db = getServerClient();

    const { data: storeRow } = await db
      .from("stores")
      .select("settings")
      .eq("id", storeId)
      .maybeSingle();

    const settings = (((storeRow?.settings as any) || {}) as Record<string, any>);
    const existingAccounts = (Array.isArray(settings.corporate_email_accounts) ? [...settings.corporate_email_accounts] : []) as CorporateEmailAccountItem[];

    let assignedProfileName: string | null = inputProfileName || null;
    if (assignedProfileId && !assignedProfileName) {
      const { data: p } = await db.from("profiles").select("full_name").eq("id", assignedProfileId).maybeSingle();
      assignedProfileName = p?.full_name || null;
    }

    const nextAccounts = existingAccounts.map((acc) =>
      acc.id === mailboxId
        ? {
            ...acc,
            departmentSlug,
            assignedProfileId: assignedProfileId || null,
            assignedProfileName,
            ...(displayName ? { displayName } : {}),
          }
        : acc,
    );

    await db
      .from("stores")
      .update({
        settings: {
          ...settings,
          corporate_email_accounts: nextAccounts,
        },
      })
      .eq("id", storeId);

    return {
      success: true,
      accounts: nextAccounts,
    };
  });

export const deleteCorporateEmailMailboxSchema = z.object({
  storeId: z.string().uuid().optional(),
  mailboxId: z.string().min(1),
  deleteOnCpanel: z.boolean().optional(),
});

export const deleteCorporateEmailMailbox = createServerFn({ method: "POST" })
  .validator(deleteCorporateEmailMailboxSchema)
  .handler(async ({ data }) => {
    const { storeId: inputStoreId, mailboxId, deleteOnCpanel } = data;
    const identity = await getServerIdentity();
    const storeId = inputStoreId || identity.store_id;
    if (!storeId) throw new Error("Loja obrigatória.");
    assertStoreAccess(identity, MANAGER_ROLES, storeId);
    const db = getServerClient();

    const { data: storeRow } = await db
      .from("stores")
      .select("settings")
      .eq("id", storeId)
      .maybeSingle();

    const settings = (((storeRow?.settings as any) || {}) as Record<string, any>);
    const hostingConfig = (settings.corporate_email_config || {}) as Record<string, any>;
    const existingAccounts = (Array.isArray(settings.corporate_email_accounts) ? [...settings.corporate_email_accounts] : []) as CorporateEmailAccountItem[];
    const target = existingAccounts.find((a) => a.id === mailboxId);

    if (target && deleteOnCpanel !== false && hostingConfig.cpanelHost && hostingConfig.cpanelUsername && hostingConfig.cpanelApiToken) {
      try {
        const uapiUrl = `${String(hostingConfig.cpanelHost).replace(/\/$/, "")}/execute/Email/delete_pop`;
        const params = new URLSearchParams({
          email: target.localPart,
          domain: target.domain,
        });
        await fetch(`${uapiUrl}?${params.toString()}`, {
          method: "GET",
          headers: {
            Authorization: `cpanel ${hostingConfig.cpanelUsername}:${hostingConfig.cpanelApiToken}`,
          },
          signal: AbortSignal.timeout(6000),
        });
      } catch {
        // Best-effort cPanel deletion
      }
    }

    const nextAccounts = existingAccounts.filter((a) => a.id !== mailboxId);
    await db
      .from("stores")
      .update({
        settings: {
          ...settings,
          corporate_email_accounts: nextAccounts,
        },
      })
      .eq("id", storeId);

    return {
      success: true,
      accounts: nextAccounts,
    };
  });

export const _chatOmnichannelReady = (() => { const created = true;
    return created;
  });
