/**
 * @fileoverview Helpers puros para coalescing de Realtime e patching incremental da fila de conversas.
 * Evita tempestades de re-fetch (`reloadThreads`) durante sincronizacoes e rajadas de mensagens.
 */

import { computeThreadSlaStatus } from "./sla-metrics";

export interface CoalescedController {
  schedule: (delayMs?: number) => void;
  flushNow: () => void;
  cancel: () => void;
}

/**
 * Agrupa multiplos gatilhos em uma janela minima (`minDelayMs`) sem descartar o ultimo disparo.
 */
export function createCoalescedController(
  task: () => void | Promise<void>,
  defaultDelayMs = 1500,
): CoalescedController {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let running = false;
  let pendingWhileRunning = false;

  const run = async () => {
    timer = null;
    if (running) {
      pendingWhileRunning = true;
      return;
    }
    running = true;
    try {
      await task();
    } finally {
      running = false;
      if (pendingWhileRunning) {
        pendingWhileRunning = false;
        schedule(defaultDelayMs);
      }
    }
  };

  const schedule = (delayMs = defaultDelayMs) => {
    if (timer) return;
    timer = setTimeout(() => {
      void run();
    }, Math.max(250, delayMs));
  };

  const flushNow = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    void run();
  };

  const cancel = () => {
    pendingWhileRunning = false;
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  };

  return { schedule, flushNow, cancel };
}

function resolveMediaPreviewLabel(messageType?: string | null, fallback = "Nova mensagem"): string {
  switch (String(messageType || "").toLowerCase()) {
    case "image":
      return "[Imagem]";
    case "video":
      return "[Vídeo]";
    case "audio":
      return "[Áudio]";
    case "document":
      return "[Documento]";
    case "sticker":
      return "[Figurinha]";
    default:
      return fallback;
  }
}

export function patchThreadListOnMessageInsert<T extends Record<string, any>>(
  prev: T[],
  newMsg: Record<string, any>,
  isInternalMsg: boolean,
): T[] {
  const target = prev.find((t) => t.id === newMsg.thread_id);
  if (!target) return prev;

  const msgIso = String(newMsg.created_at || new Date().toISOString());
  if (isInternalMsg) {
    return [
      { ...target, updated_at: msgIso },
      ...prev.filter((t) => t.id !== newMsg.thread_id),
    ];
  }

  const cleanPreview =
    typeof newMsg.message === "string" && newMsg.message.trim() && !newMsg.message.startsWith("waesy-msg:")
      ? newMsg.message
      : resolveMediaPreviewLabel(newMsg.message_type, target.last_message || "Nova mensagem");

  const nextCustomerAt = !newMsg.is_staff_reply ? msgIso : target.last_customer_message_at;
  const nextStaffAt = newMsg.is_staff_reply ? msgIso : target.last_staff_reply_at;
  const nextSla = computeThreadSlaStatus({
    status: target.status,
    lastCustomerMessageAt: nextCustomerAt,
    lastStaffReplyAt: nextStaffAt,
    lastMessageAt: msgIso,
    isLastReplyStaff: newMsg.is_staff_reply,
    departmentSlaMinutes: target.sla_minutes || 15,
  });

  const updated: T = {
    ...target,
    last_message: cleanPreview,
    last_message_at: msgIso,
    is_last_reply_staff: Boolean(newMsg.is_staff_reply),
    last_customer_message_at: nextCustomerAt,
    last_staff_reply_at: nextStaffAt,
    waiting_for_reply: nextSla.waitingForReply,
    waiting_minutes: nextSla.waitingMinutes,
    sla_status: nextSla.slaStatus,
    is_forgotten_today: nextSla.isForgottenToday,
    updated_at: msgIso,
  };

  return [updated, ...prev.filter((t) => t.id !== newMsg.thread_id)];
}

export function patchThreadListOnThreadUpdate<T extends Record<string, any>>(
  prev: T[],
  updatedRow: Record<string, any>,
): T[] {
  const mapped = prev.map((t) => {
    if (t.id !== updatedRow.id) return t;
    const nextMeta =
      updatedRow.metadata && typeof updatedRow.metadata === "object"
        ? updatedRow.metadata
        : t.metadata;
    const rawPreview = typeof updatedRow.last_message_text === "string" ? updatedRow.last_message_text.trim() : "";
    const nextPreview = rawPreview && !rawPreview.startsWith("waesy-msg:") ? rawPreview : t.last_message;
    const nextName =
      t.is_group || updatedRow.thread_type === "group"
        ? (updatedRow.group_subject || nextMeta?.group_subject || updatedRow.guest_name || t.customer?.full_name)
        : (updatedRow.guest_name || t.customer?.full_name);

    return {
      ...t,
      status: updatedRow.status ?? t.status,
      department: updatedRow.department ?? t.department,
      priority: updatedRow.priority ?? t.priority,
      assigned_to_profile_id: updatedRow.assigned_to_profile_id ?? t.assigned_to_profile_id,
      tags: Array.isArray(updatedRow.tags) ? updatedRow.tags : t.tags,
      internal_notes: updatedRow.internal_notes ?? t.internal_notes,
      lead_id: updatedRow.lead_id ?? t.lead_id,
      last_message: nextPreview,
      last_message_at: updatedRow.last_message_at ?? t.last_message_at,
      updated_at: updatedRow.last_message_at ?? updatedRow.updated_at ?? t.updated_at,
      metadata: nextMeta,
      avatar_url: nextMeta?.avatar_url || t.avatar_url,
      customer: {
        ...(t.customer || {}),
        ...(nextName ? { full_name: nextName } : {}),
        ...(nextMeta?.avatar_url ? { avatar_url: nextMeta.avatar_url } : {}),
      },
    };
  });

  if (!updatedRow.last_message_at) return mapped;
  return [...mapped].sort((a, b) => {
    const aTs = Date.parse(String(a.last_message_at || a.updated_at || "")) || 0;
    const bTs = Date.parse(String(b.last_message_at || b.updated_at || "")) || 0;
    return bTs - aTs;
  });
}
